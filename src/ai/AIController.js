/**
 * AIController.js - AI Controller for RTS game
 *
 * Manages AI player decision making:
 * - Build order execution
 * - Unit production
 * - Resource management
 * - Combat and attack logic
 *
 * Usage:
 *   const ai = AIController.Builder.create()
 *       .forPlayer(aiPlayer)
 *       .withPersonality('RUSHER')
 *       .withDifficulty('HARD')
 *       .build();
 */

// AI Personality types
const AI_PERSONALITY = {
    BALANCED: 'BALANCED',   // Equal focus on economy and military
    RUSHER: 'RUSHER',       // Early aggression, infantry spam
    TURTLE: 'TURTLE',       // Defensive, builds many towers
    ECONOMIST: 'ECONOMIST'  // Focuses on economy first
};

// AI Difficulty settings
const AI_DIFFICULTY = {
    EASY: {
        buildDelay: 3.0,        // Seconds between build decisions
        attackDelay: 300,       // Grace period: 5 minutes before first attack
        unitCap: 10,            // Max units AI will build
        resourceBonus: 0,       // No bonus resources
        reactionTime: 2.0       // Seconds to react to attacks
    },
    NORMAL: {
        buildDelay: 2.0,
        attackDelay: 240,       // Grace period: 4 minutes before first attack
        unitCap: 20,
        resourceBonus: 0,
        reactionTime: 1.0
    },
    HARD: {
        buildDelay: 1.0,
        attackDelay: 180,       // Grace period: 3 minutes before first attack
        unitCap: 30,
        resourceBonus: 0.25,    // 25% bonus to harvesting
        reactionTime: 0.5
    },
    BRUTAL: {
        buildDelay: 0.5,
        attackDelay: 120,       // Grace period: 2 minutes before first attack
        unitCap: 50,
        resourceBonus: 0.5,     // 50% bonus to harvesting
        reactionTime: 0.25
    }
};

// AI States
const AI_STATE = {
    BUILDING: 'BUILDING',       // Constructing base
    EXPANDING: 'EXPANDING',     // Building economy
    MASSING: 'MASSING',         // Building army
    ATTACKING: 'ATTACKING',     // Attacking enemy
    DEFENDING: 'DEFENDING',     // Under attack, defending
    EXPLORING: 'EXPLORING',     // No enemies found, explore map
    PATROL: 'PATROL'            // Patrol with mixed army to unexplored areas
};

class AIController {
    constructor(config = {}) {
        this.player = config.player || null;
        this.personality = config.personality || AI_PERSONALITY.BALANCED;
        this.difficulty = config.difficulty || 'NORMAL';
        this.difficultySettings = AI_DIFFICULTY[this.difficulty] || AI_DIFFICULTY.NORMAL;

        // State
        this.state = AI_STATE.BUILDING;
        this.enabled = true;

        // Timers
        this.buildTimer = 0;
        this.attackTimer = 0;
        this.scoutTimer = 0;
        this.gameTime = 0;

        // Build order queue
        this.buildQueue = [];
        this.currentBuildIndex = 0;

        // Combat
        this.armyRallyPoint = null;
        this.attackTarget = null;
        this.lastAttackTime = 0;

        // Knowledge (what AI knows about enemy)
        this.knownEnemyBuildings = [];
        this.knownEnemyUnits = [];
        this.lastScoutTime = 0;

        // Exploration (when no enemies found)
        this.explorationWaypoints = [];
        this.currentExplorationIndex = 0;
        this.explorationTimer = 0;
        this.generateExplorationWaypoints();

        // Patrol configuration (mixed army exploration)
        this.patrolTimer = 0;
        this.patrolCooldown = 120;          // 2 minutes between patrols
        this.patrolWaitDuration = 30;       // 30 seconds at each waypoint
        this.patrolWaitTimer = 0;
        this.currentPatrolWaypoint = null;
        this.patrolUnits = [];              // Track units on current patrol
        this.patrolArmySize = 8;            // Target patrol army size
        this.patrolWaypoints = [];
        this.generatePatrolWaypoints();

        // Initialize build order based on personality
        this.initializeBuildOrder();

        // Unit cache to avoid filtering every frame
        this._unitCache = {
            army: [],
            harvesters: [],
            lastUpdate: 0,
            cacheInterval: 500 // ms between cache updates
        };
    }

    /**
     * Cleanup method - call when AI is being destroyed
     * Prevents memory leaks and stale references
     */
    destroy() {
        this.enabled = false;
        this.player = null;
        this.buildQueue = [];
        this.attackTarget = null;
        this.knownEnemyBuildings = [];
        this.knownEnemyUnits = [];
        this._unitCache = null;
        console.log('AIController destroyed');
    }

    /**
     * Initialize build order based on personality
     */
    initializeBuildOrder() {
        switch (this.personality) {
            case AI_PERSONALITY.RUSHER:
                this.buildQueue = [
                    { type: 'building', name: 'power_plant' },
                    { type: 'building', name: 'barracks' },
                    { type: 'unit', name: 'infantry', count: 5 },
                    { type: 'building', name: 'refinery' },
                    { type: 'unit', name: 'infantry', count: 5 },
                    { type: 'building', name: 'barracks' },
                    { type: 'unit', name: 'infantry', count: 10 }
                ];
                break;

            case AI_PERSONALITY.TURTLE:
                this.buildQueue = [
                    { type: 'building', name: 'power_plant' },
                    { type: 'building', name: 'refinery' },
                    { type: 'building', name: 'guard_tower' },
                    { type: 'building', name: 'barracks' },
                    { type: 'building', name: 'guard_tower' },
                    { type: 'unit', name: 'infantry', count: 3 },
                    { type: 'building', name: 'power_plant' },
                    { type: 'building', name: 'guard_tower' },
                    { type: 'building', name: 'war_factory' },
                    { type: 'unit', name: 'vehicle', count: 3 }
                ];
                break;

            case AI_PERSONALITY.ECONOMIST:
                this.buildQueue = [
                    { type: 'building', name: 'power_plant' },
                    { type: 'building', name: 'refinery' },
                    { type: 'building', name: 'refinery' },
                    { type: 'building', name: 'silo' },
                    { type: 'building', name: 'power_plant' },
                    { type: 'building', name: 'barracks' },
                    { type: 'building', name: 'war_factory' },
                    { type: 'unit', name: 'vehicle', count: 5 },
                    { type: 'building', name: 'tech_center' }
                ];
                break;

            default: // BALANCED
                this.buildQueue = [
                    { type: 'building', name: 'power_plant' },
                    { type: 'building', name: 'refinery' },
                    { type: 'building', name: 'barracks' },
                    { type: 'unit', name: 'infantry', count: 3 },
                    { type: 'building', name: 'guard_tower' },
                    { type: 'building', name: 'power_plant' },
                    { type: 'building', name: 'war_factory' },
                    { type: 'unit', name: 'vehicle', count: 2 },
                    { type: 'building', name: 'refinery' },
                    { type: 'unit', name: 'infantry', count: 5 },
                    { type: 'attack' }
                ];
        }
    }

    /**
     * Update cached unit lists (called periodically, not every frame)
     */
    updateUnitCache() {
        if (!this._unitCache) return;

        const now = Date.now();
        if (now - this._unitCache.lastUpdate < this._unitCache.cacheInterval) return;
        this._unitCache.lastUpdate = now;

        if (!Game.instance || !Game.instance.unitManager) {
            this._unitCache.army = [];
            this._unitCache.harvesters = [];
            return;
        }

        const playerUnits = Game.instance.unitManager.getUnitsByPlayer(this.player);

        // Cache army units (non-harvesters)
        this._unitCache.army = playerUnits.filter(u =>
            !u.isDead() && u.config?.type?.toUpperCase() !== 'HARVESTER'
        );

        // Cache harvesters
        this._unitCache.harvesters = playerUnits.filter(u =>
            !u.isDead() && u.config?.type?.toUpperCase() === 'HARVESTER'
        );
    }

    /**
     * Main update loop
     * @param {number} deltaTime - Time since last frame in seconds
     */
    update(deltaTime) {
        if (!this.enabled || !this.player) return;

        this.gameTime += deltaTime;
        this.buildTimer += deltaTime;
        // Note: attackTimer and patrolTimer are managed per-state to avoid conflicts

        // Update unit cache periodically
        this.updateUnitCache();

        // Apply resource bonus for harder difficulties
        this.applyResourceBonus(deltaTime);

        // Periodically re-evaluate strategy based on progression (every 5 seconds)
        if (Math.floor(this.gameTime) % 5 === 0 && this.gameTime % deltaTime < deltaTime * 1.5) {
            this.evaluateAndAdjustStrategy();
        }

        // Track previous state for debugging
        const prevState = this.state;

        // Update based on current state
        switch (this.state) {
            case AI_STATE.BUILDING:
            case AI_STATE.EXPANDING:
                this.updateBuildPhase(deltaTime);
                break;

            case AI_STATE.MASSING:
                this.updateMassingPhase(deltaTime);
                break;

            case AI_STATE.ATTACKING:
                this.updateAttackPhase(deltaTime);
                break;

            case AI_STATE.DEFENDING:
                this.updateDefendPhase(deltaTime);
                break;

            case AI_STATE.EXPLORING:
                this.updateExploringPhase(deltaTime);
                break;

            case AI_STATE.PATROL:
                this.updatePatrolPhase(deltaTime);
                break;
        }

        // Log state transitions for debugging
        if (this.state !== prevState) {
            console.log(`[AI] ${this.personality} STATE: ${prevState} → ${this.state}`);
        }

        // Always check for threats (but don't interrupt PATROL or ATTACKING unless base is under attack)
        if (this.state !== AI_STATE.PATROL && this.state !== AI_STATE.ATTACKING) {
            this.checkForThreats();
        }

        // Manage idle harvesters
        this.manageHarvesters();
    }

    /**
     * Apply resource bonus based on difficulty
     */
    applyResourceBonus(deltaTime) {
        if (this.difficultySettings.resourceBonus > 0) {
            const bonus = 50 * this.difficultySettings.resourceBonus * deltaTime;
            this.player.resources.tiberium += bonus;
        }
    }

    /**
     * Update during build phase
     */
    updateBuildPhase(deltaTime) {
        // Keep units on hold position while building
        this.setUnitStance(RTS_UNIT_STANCES.HOLD_POSITION);

        // Check if we should process next build order
        if (this.buildTimer >= this.difficultySettings.buildDelay) {
            this.buildTimer = 0;
            this.processNextBuildOrder();
        }

        // Transition to massing if build queue exhausted
        if (this.currentBuildIndex >= this.buildQueue.length) {
            console.log(`[AI] ${this.personality} completed build queue (${this.currentBuildIndex}/${this.buildQueue.length}), transitioning to MASSING`);
            this.state = AI_STATE.MASSING;
        }
    }

    /**
     * Process next item in build queue
     */
    processNextBuildOrder() {
        if (this.currentBuildIndex >= this.buildQueue.length) return;

        const order = this.buildQueue[this.currentBuildIndex];

        switch (order.type) {
            case 'building':
                if (this.tryBuildBuilding(order.name)) {
                    console.log(`[AI] ${this.personality} placed building: ${order.name}`);
                    this.currentBuildIndex++;
                } else {
                    // Check if requirements will never be met (skip the order)
                    const buildingManager = Game.instance?.buildingManager;
                    if (buildingManager && !buildingManager.meetsRequirements(order.name, this.player)) {
                        // Skip this order - requirements not met yet
                    } else {
                        // Just waiting for resources/space
                    }
                }
                break;

            case 'unit':
                // Check if producer building exists before trying
                const producerType = this.getProducerBuilding(order.name);
                const producer = this.findProducerBuilding(producerType);

                if (!producer) {
                    // Skip this order - no producer building yet
                    console.log(`[AI] ${this.personality} skipping unit order: ${order.name} (no ${producerType})`);
                    this.currentBuildIndex++;
                    break;
                }

                if (this.tryProduceUnits(order.name, order.count || 1)) {
                    console.log(`[AI] ${this.personality} queueing ${order.count || 1} unit(s): ${order.name}`);
                    this.currentBuildIndex++;
                } else {
                    // Just waiting for resources
                }
                break;
        }
    }

    /**
     * Evaluate player progression and adjust AI strategy
     * Uses progression values to make tactical decisions
     *
     * IMPORTANT: This method should NOT override active states like:
     * - PATROL (actively searching for enemies)
     * - ATTACKING (actively engaged in combat)
     * - DEFENDING (responding to base attack)
     *
     * It should only influence "passive" states: BUILDING, EXPANDING, MASSING
     */
    evaluateAndAdjustStrategy() {
        if (!this.player || !this.player.progression) return;

        const prog = this.player.progression;
        const buildingManager = Game.instance?.buildingManager;

        // CRITICAL: Do NOT override active states - let them complete naturally
        const activeStates = [AI_STATE.PATROL, AI_STATE.ATTACKING, AI_STATE.DEFENDING];
        const inActiveState = activeStates.includes(this.state);

        // Strategy 1: Defense is weak - add defensive buildings to queue (doesn't change state)
        if (prog.base_defence_progress < 30) {
            if (buildingManager && buildingManager.meetsRequirements('guard_tower', this.player)) {
                const hasTower = this.buildQueue.some(o => o.type === 'building' && o.name === 'guard_tower');
                if (!hasTower && this.state !== AI_STATE.DEFENDING && !this.isUnderAttack()) {
                    this.buildQueue.splice(Math.max(0, this.currentBuildIndex + 1), 0,
                        { type: 'building', name: 'guard_tower' }
                    );
                }
            }
        }

        // Strategy 2: Base expansion is weak - focus on economy (only if not in active state)
        if (!inActiveState && prog.base_expansion_progress < 25) {
            this.state = AI_STATE.EXPANDING;
        }

        // Strategy 3: Technology is weak - add tech buildings to queue (doesn't change state)
        if (prog.base_technology_progress < 40 && prog.base_expansion_progress > 40) {
            if (buildingManager && buildingManager.meetsRequirements('tech_center', this.player)) {
                if (!this.buildQueue.some(o => o.type === 'building' && o.name === 'tech_center')) {
                    this.buildQueue.push({ type: 'building', name: 'tech_center' });
                }
            }
        }

        // Strategy 4: Not exploring - handled by PATROL state naturally

        // Strategy 5: Weak harvesting - add harvesters to queue (doesn't change state)
        // Only queue harvesters if we have a war factory to produce them
        if (prog.map_tiberium_fields_contained_progress < 40) {
            const hasWarFactory = this.findProducerBuilding('war_factory') !== null;
            if (hasWarFactory && !this.buildQueue.some(o => o.type === 'unit' && o.name === 'harvester')) {
                this.buildQueue.push({ type: 'unit', name: 'harvester', count: 2 });
            } else if (!hasWarFactory && !this.buildQueue.some(o => o.type === 'building' && o.name === 'war_factory')) {
                // Queue war factory first if we don't have one
                if (buildingManager && buildingManager.meetsRequirements('war_factory', this.player)) {
                    this.buildQueue.push({ type: 'building', name: 'war_factory' });
                }
            }
        }

        // Strategy 6 & 7: Only suggest state changes if NOT in an active state
        // Active states (PATROL, ATTACKING, DEFENDING) have their own transition logic
        if (!inActiveState) {
            // Strong overall - time to mass units
            const overallStrength = (prog.base_expansion_progress + prog.base_technology_progress +
                                    prog.map_tiberium_fields_contained_progress) / 3;
            if (overallStrength > 60 && prog.unit_army_progress < 60) {
                this.state = AI_STATE.MASSING;
            }
        }

        // NOTE: Transitions to ATTACKING are now handled by:
        // - updateMassingPhase: when enemies become visible
        // - updatePatrolPhase: when enemies are discovered during patrol
        // This ensures proper state machine flow instead of random interruptions
    }

    /**
     * Try to build a building
     * @param {string} buildingType
     * @returns {boolean} Success
     */
    tryBuildBuilding(buildingType) {
        if (!Game.instance || !Game.instance.buildingManager) return false;

        // Check if we can afford it
        const cost = this.getBuildingCost(buildingType);
        if (this.player.resources.tiberium < cost) {
            return false;
        }

        // Check if building requirements are met
        const buildingManager = Game.instance.buildingManager;
        if (!buildingManager.meetsRequirements(buildingType, this.player)) {
            return false;
        }

        // Find valid placement
        const position = this.findBuildingPlacement(buildingType);
        if (!position) {
            return false;
        }

        // Build it (placeBuilding handles resource deduction and final validation)
        const success = buildingManager.placeBuilding(
            buildingType,
            position.gridX,
            position.gridY,
            this.player
        );

        return success;
    }

    /**
     * Get building cost
     */
    getBuildingCost(buildingType) {
        const costs = {
            power_plant: 300,
            barracks: 400,
            refinery: 500,
            war_factory: 800,
            guard_tower: 250,
            tech_center: 1500,
            silo: 200
        };
        return costs[buildingType] || 500;
    }

    /**
     * Find valid placement for a building
     */
    findBuildingPlacement(buildingType) {
        if (!Game.instance || !Game.instance.grid) return null;

        const grid = Game.instance.grid;
        const startPos = this.player.startPosition || { x: 0, y: 0 };

        // Get building size
        const size = this.getBuildingSize(buildingType);

        // Search in expanding spiral from start position
        const startGridX = Math.floor(startPos.x / grid.cellSize);
        const startGridY = Math.floor(startPos.y / grid.cellSize);

        for (let radius = 1; radius < 15; radius++) {
            for (let dx = -radius; dx <= radius; dx++) {
                for (let dy = -radius; dy <= radius; dy++) {
                    if (Math.abs(dx) !== radius && Math.abs(dy) !== radius) continue;

                    const gx = startGridX + dx;
                    const gy = startGridY + dy;

                    if (this.canPlaceBuilding(gx, gy, size.width, size.height)) {
                        return { gridX: gx, gridY: gy };
                    }
                }
            }
        }

        return null;
    }

    /**
     * Get building size
     */
    getBuildingSize(buildingType) {
        const sizes = {
            power_plant: { width: 2, height: 2 },
            barracks: { width: 2, height: 2 },
            refinery: { width: 3, height: 2 },
            war_factory: { width: 3, height: 2 },
            guard_tower: { width: 1, height: 1 },
            tech_center: { width: 2, height: 2 },
            silo: { width: 1, height: 2 }
        };
        return sizes[buildingType] || { width: 2, height: 2 };
    }

    /**
     * Check if building can be placed
     */
    canPlaceBuilding(gridX, gridY, width, height) {
        if (!Game.instance || !Game.instance.grid) return false;

        const grid = Game.instance.grid;

        for (let dy = 0; dy < height; dy++) {
            for (let dx = 0; dx < width; dx++) {
                const cell = grid.getCell(gridX + dx, gridY + dy);
                if (!cell || !cell.buildable) return false;
            }
        }

        return true;
    }

    /**
     * Try to produce units
     */
    tryProduceUnits(unitType, count) {
        if (!Game.instance || !Game.instance.buildingManager) return false;

        const unitCost = this.getUnitCost(unitType);
        const producerType = this.getProducerBuilding(unitType);

        // Find producer building
        const producer = this.findProducerBuilding(producerType);
        if (!producer) {
            return false;
        }

        // Queue units (as many as we can afford)
        let produced = 0;
        for (let i = 0; i < count; i++) {
            if (this.player.resources.tiberium >= unitCost) {
                if (this.queueUnit(producer, unitType)) {
                    this.player.resources.tiberium -= unitCost;
                    produced++;
                }
            }
        }

        return produced >= count;
    }

    /**
     * Get unit cost
     */
    getUnitCost(unitType) {
        const costs = {
            infantry: 100,
            vehicle: 500,
            harvester: 1000
        };
        return costs[unitType] || 100;
    }

    /**
     * Get producer building type for unit
     */
    getProducerBuilding(unitType) {
        const producers = {
            infantry: 'barracks',
            vehicle: 'war_factory',
            harvester: 'war_factory'
        };
        return producers[unitType] || 'barracks';
    }

    /**
     * Find a producer building
     */
    findProducerBuilding(buildingType) {
        if (!Game.instance || !Game.instance.buildingManager) return null;

        const buildings = Game.instance.buildingManager.getBuildingsByPlayer(this.player);
        return buildings.find(b =>
            b.type === buildingType &&
            b.state === BUILDING_STATES.ACTIVE
        );
    }

    /**
     * Queue unit production
     */
    queueUnit(producer, unitType) {
        if (!producer || !producer.isComplete) return false;

        // Create unit at producer rally point
        if (Game.instance && Game.instance.unitManager) {
            const rallyPoint = producer.rallyPoint || {
                x: producer.x,
                y: producer.y + 50
            };

            Game.instance.unitManager.createUnit(
                unitType,
                rallyPoint.x,
                rallyPoint.y,
                this.player
            );
            return true;
        }

        return false;
    }

    /**
     * Update during massing phase
     * Decision tree:
     * 1. If enemies visible → ATTACKING
     * 2. If army >= patrolArmySize → PATROL (to search for enemies)
     * 3. Keep building units until patrol size reached
     */
    updateMassingPhase(deltaTime) {
        // Keep units on hold position while massing
        this.setUnitStance(RTS_UNIT_STANCES.HOLD_POSITION);

        // Increment patrol timer while massing (so patrol cooldown can expire)
        this.patrolTimer += deltaTime;

        const armySize = this.getArmySize();

        // Continue building units
        if (this.buildTimer >= this.difficultySettings.buildDelay) {
            this.buildTimer = 0;

            if (armySize < this.difficultySettings.unitCap) {
                // Build more units - aim for patrol army size
                const unitType = this.personality === AI_PERSONALITY.RUSHER ? 'infantry' : 'vehicle';
                this.tryProduceUnits(unitType, 1);
            }
        }

        // Priority 1: If we can see enemies AND have enough army, attack them
        // Minimum 3 units required to attack (same threshold as ATTACKING state uses to return to MASSING)
        const visibleTarget = this.findAttackTarget();
        if (visibleTarget && armySize >= 3) {
            console.log(`[AI] ${this.personality} found visible enemy in MASSING, transitioning to ATTACKING (army=${armySize})`);
            this.attackTimer = 0;  // Reset attack timer
            this.state = AI_STATE.ATTACKING;
            return;
        }

        // Priority 2: If army is large enough, start patrolling to find enemies
        if (armySize >= this.patrolArmySize) {
            console.log(`[AI] ${this.personality} army ready (${armySize}/${this.patrolArmySize}), transitioning to PATROL`);
            this.patrolTimer = 0;
            this.currentPatrolWaypoint = null;
            this.state = AI_STATE.PATROL;

            // Emit patrol start event
            if (typeof EVENTS !== 'undefined') {
                EVENTS.emit('AI_PATROL_STARTED', {
                    aiPlayer: this.player,
                    armySize: armySize
                });
            }
            return;
        }

        // Priority 3: If we have some units but not enough for patrol, explore with what we have
        if (armySize >= 3) {
            // Only explore after some delay to allow initial building
            this.attackTimer += deltaTime;
            if (this.attackTimer >= 60) {  // Wait 60 seconds before exploring with small army
                console.log(`[AI] ${this.personality} small army exploring (${armySize}/${this.patrolArmySize})`);
                this.state = AI_STATE.EXPLORING;
                return;
            }
        }

        // Otherwise: keep building (stay in MASSING)
    }

    /**
     * Set stance for all AI units (uses cached units when available)
     * @param {string} stance - The stance to set (AGGRESSIVE, HOLD_POSITION, etc.)
     */
    setUnitStance(stance) {
        let armyUnits = [];

        // Try to use cached units first
        if (this._unitCache && this._unitCache.army && this._unitCache.army.length > 0) {
            armyUnits = this._unitCache.army;
        } else if (Game.instance && Game.instance.unitManager) {
            // Fallback: get all units for this player and filter
            const playerUnits = Game.instance.unitManager.getUnitsByPlayer(this.player);
            armyUnits = playerUnits.filter(u => !u.isDead());
        } else {
            return;
        }

        for (const unit of armyUnits) {
            if (unit && !unit.isDead() && unit.stance !== stance) {
                unit.stance = stance;
            }
        }
    }

    /**
     * Get current army size (uses cached data)
     */
    getArmySize() {
        // Use cache if available
        if (this._unitCache && this._unitCache.army) {
            // Filter out dead units from cache (they might have died since last cache update)
            return this._unitCache.army.filter(u => !u.isDead()).length;
        }

        // Fallback to direct query
        if (!Game.instance || !Game.instance.unitManager) return 0;
        return Game.instance.unitManager.getUnitsByPlayer(this.player)
            .filter(u => !u.isDead() && u.config?.type?.toUpperCase() !== 'HARVESTER')
            .length;
    }

    /**
     * Update during attack phase
     */
    updateAttackPhase(deltaTime) {
        // Switch all units to AGGRESSIVE stance when attacking
        this.setUnitStance(RTS_UNIT_STANCES.AGGRESSIVE);

        // Check if current target is still valid
        if (this.attackTarget && (this.attackTarget.isDead() || !this.attackTarget.active)) {
            this.attackTarget = null;
        }

        // Find attack target
        if (!this.attackTarget) {
            this.attackTarget = this.findAttackTarget();

            if (this.attackTarget) {
                console.log(`[AI] ${this.personality} found attack target: ${this.attackTarget.type}`);
                this.attackTimer = 0; // Reset timer on successful target find
            } else {
                // No target found, track time without target
                this.attackTimer += deltaTime;

                // If we've been searching for too long with no target, switch to PATROL to actively search
                if (this.attackTimer > 20) {
                    const armySize = this.getArmySize();
                    if (armySize >= this.patrolArmySize) {
                        console.log(`[AI] ${this.personality} no attack target found for 20s, transitioning to PATROL to search (army=${armySize})`);
                        this.state = AI_STATE.PATROL;
                        this.patrolTimer = 0;
                        this.currentPatrolWaypoint = null;
                    } else {
                        console.log(`[AI] ${this.personality} no attack target found for 20s, returning to MASSING (army=${armySize}, need ${this.patrolArmySize})`);
                        this.state = AI_STATE.MASSING;
                    }
                    this.attackTimer = 0;
                    this.attackTarget = null;
                    return;
                }
            }
        }

        if (this.attackTarget) {
            this.issueAttackOrders(this.attackTarget);
        }

        // Return to massing if army depleted
        if (this.getArmySize() < 3) {
            console.log(`[AI] ${this.personality} army depleted during ATTACKING (${this.getArmySize()} < 3), returning to MASSING`);
            this.state = AI_STATE.MASSING;
            this.attackTimer = 0;
            this.attackTarget = null;
        }
    }

    /**
     * Find attack target - returns actual building/unit, not just coordinates
     * Used as fallback rally point for the army
     */
    findAttackTarget() {
        if (!Game.instance || !Game.instance.buildingManager) return null;

        // Only consider buildings visible to this AI player
        let visibleEnemyBuildings = [];
        if (Game.instance.visibilityManager) {
            // Get only visible buildings
            visibleEnemyBuildings = Game.instance.visibilityManager.getVisibleBuildings(this.player, Game.instance.buildingManager)
                .filter(b =>
                    b.owner !== this.player &&
                    this.player.isEnemy(b.owner) &&
                    !b.isDead()
                );
        } else {
            // Fallback if visibility manager not available (for backward compatibility)
            visibleEnemyBuildings = Game.instance.buildingManager.buildings.filter(b =>
                b.owner !== this.player &&
                this.player.isEnemy(b.owner) &&
                !b.isDead()
            );
        }

        // Priority: ConYard > Refinery > Other (for main army rally)
        const conYard = visibleEnemyBuildings.find(b => b.type === 'construction_yard');
        if (conYard) return conYard;

        const refinery = visibleEnemyBuildings.find(b => b.type === 'refinery');
        if (refinery) return refinery;

        if (visibleEnemyBuildings.length > 0) {
            return visibleEnemyBuildings[0];
        }

        return null;
    }

    /**
     * Get target priority (lower = higher priority, attack first)
     * Priority order: Defensive buildings > Combat units > Refineries > Other buildings > ConYard
     */
    getTargetPriority(target) {
        // Defensive buildings - highest priority
        if (target.type === 'guard_tower' || target.type === 'obelisk' ||
            target.type === 'sam_site' || target.type === 'turret') {
            return 1;
        }

        // Combat units (non-harvester units that can attack)
        if (target.config && target.config.damage > 0) {
            return 2;
        }

        // Refineries - economy target
        if (target.type === 'refinery') {
            return 3;
        }

        // Harvesters - economy target
        if (target.config && target.config.type?.toUpperCase() === 'HARVESTER') {
            return 4;
        }

        // Other production/utility buildings
        if (target.type === 'barracks' || target.type === 'war_factory' ||
            target.type === 'tech_center' || target.type === 'power_plant' ||
            target.type === 'silo') {
            return 5;
        }

        // Construction Yard - lowest priority (kill last)
        if (target.type === 'construction_yard') {
            return 10;
        }

        // Default for unknown targets
        return 6;
    }

    /**
     * Find best target for a unit based on priority and distance
     * @param {Unit} unit - The unit looking for a target
     * @returns {Building|Unit|null}
     */
    findBestTarget(unit) {
        const targets = [];

        // Gather enemy buildings - only visible ones
        if (Game.instance?.buildingManager) {
            let enemyBuildings = [];
            if (Game.instance.visibilityManager) {
                // Only get visible buildings
                enemyBuildings = Game.instance.visibilityManager.getVisibleBuildings(this.player, Game.instance.buildingManager)
                    .filter(b =>
                        b.owner !== this.player &&
                        this.player.isEnemy(b.owner) &&
                        !b.isDead()
                    );
            } else {
                // Fallback if visibility manager not available
                enemyBuildings = Game.instance.buildingManager.buildings.filter(b =>
                    b.owner !== this.player &&
                    this.player.isEnemy(b.owner) &&
                    !b.isDead()
                );
            }
            targets.push(...enemyBuildings);
        }

        // Gather enemy units - only visible ones
        if (Game.instance?.unitManager) {
            let enemyUnits = [];
            if (Game.instance.visibilityManager) {
                // Only get visible units
                enemyUnits = Game.instance.visibilityManager.getVisibleUnits(this.player, Game.instance.unitManager)
                    .filter(u =>
                        u.owner !== this.player &&
                        this.player.isEnemy(u.owner) &&
                        !u.isDead()
                    );
            } else {
                // Fallback if visibility manager not available
                enemyUnits = Game.instance.unitManager.units.filter(u =>
                    u.owner !== this.player &&
                    this.player.isEnemy(u.owner) &&
                    !u.isDead()
                );
            }
            targets.push(...enemyUnits);
        }

        if (targets.length === 0) return null;

        // Score each target: priority * 1000 + distance
        // Lower score = better target
        let bestTarget = null;
        let bestScore = Infinity;

        for (const target of targets) {
            const priority = this.getTargetPriority(target);
            const dist = Math.hypot(target.x - unit.x, target.y - unit.y);

            // Priority matters most, distance is tiebreaker within same priority
            // Multiply priority by large number so it dominates, but add distance
            // so closer targets of same priority are preferred
            const score = priority * 10000 + dist;

            if (score < bestScore) {
                bestScore = score;
                bestTarget = target;
            }
        }

        return bestTarget;
    }

    /**
     * Issue attack orders to army (uses cached data)
     * Each unit targets based on priority: defenses > combat units > economy > production > ConYard
     * @param {Building|Unit} fallbackTarget - Fallback target if no targets found
     */
    issueAttackOrders(fallbackTarget) {
        // Use cache if available, otherwise fallback
        let units;
        if (this._unitCache && this._unitCache.army) {
            units = this._unitCache.army.filter(u => !u.isDead());
        } else {
            if (!Game.instance || !Game.instance.unitManager) return;
            units = Game.instance.unitManager.getUnitsByPlayer(this.player)
                .filter(u => !u.isDead() && u.config?.type?.toUpperCase() !== 'HARVESTER');
        }

        for (const unit of units) {
            if (!unit.currentCommand || unit.currentCommand.isComplete) {
                // Each unit finds best target by priority, then distance
                const bestTarget = this.findBestTarget(unit) || fallbackTarget;
                if (bestTarget) {
                    const cmd = new AttackCommand(unit, bestTarget, true);
                    unit.issueCommand(cmd);
                }
            }
        }
    }

    /**
     * Update during defend phase (uses cached data)
     */
    updateDefendPhase(deltaTime) {
        // Set units to aggressive when defending
        this.setUnitStance(RTS_UNIT_STANCES.AGGRESSIVE);

        // Rally units to base
        const basePos = this.player.startPosition || { x: 400, y: 400 };

        // Use cache if available, otherwise fallback
        let units;
        if (this._unitCache && this._unitCache.army) {
            units = this._unitCache.army.filter(u => !u.isDead());
        } else {
            if (!Game.instance || !Game.instance.unitManager) return;
            units = Game.instance.unitManager.getUnitsByPlayer(this.player)
                .filter(u => !u.isDead() && u.config?.type?.toUpperCase() !== 'HARVESTER');
        }

        for (const unit of units) {
            if (!unit.currentCommand || unit.currentCommand.isComplete) {
                const cmd = new AttackMoveCommand(unit, basePos.x, basePos.y);
                unit.issueCommand(cmd);
            }
        }

        // Return to previous state if threat cleared
        if (!this.isUnderAttack()) {
            this.state = AI_STATE.MASSING;
        }
    }

    /**
     * Update during exploration phase - send units to discover enemy positions
     * Units will explore waypoints around the map
     */
    updateExploringPhase(deltaTime) {
        // Set units to passive stance while exploring
        this.setUnitStance(RTS_UNIT_STANCES.HOLD);

        // Use cache if available
        let units;
        if (this._unitCache && this._unitCache.army) {
            units = this._unitCache.army.filter(u => !u.isDead());
        } else {
            if (!Game.instance || !Game.instance.unitManager) return;
            units = Game.instance.unitManager.getUnitsByPlayer(this.player)
                .filter(u => !u.isDead() && u.config?.type?.toUpperCase() !== 'HARVESTER');
        }

        if (units.length === 0) return;

        // Cycle through waypoints
        this.explorationTimer += deltaTime;
        if (this.explorationTimer > 2) { // Update exploration every 2 seconds
            this.explorationTimer = 0;

            // Send groups of units to different waypoints
            const unitsPerGroup = Math.max(1, Math.ceil(units.length / this.explorationWaypoints.length));

            for (let i = 0; i < units.length; i++) {
                const unit = units[i];
                if (!unit.currentCommand || unit.currentCommand.isComplete) {
                    // Assign waypoint based on unit index
                    const waypointIndex = Math.floor(i / unitsPerGroup) % this.explorationWaypoints.length;
                    const waypoint = this.explorationWaypoints[waypointIndex];

                    if (waypoint && typeof MoveCommand !== 'undefined') {
                        const cmd = new MoveCommand(unit, waypoint.x, waypoint.y);
                        unit.issueCommand(cmd);
                    }
                }
            }
        }

        // Check if any enemies found - switch to attacking
        const hasVisibleEnemies = this.findAttackTarget() !== null;
        if (hasVisibleEnemies) {
            this.state = AI_STATE.ATTACKING;
            this.explorationTimer = 0;
        }

        // Or return to massing if army gets small
        if (this.getArmySize() < 3) {
            this.state = AI_STATE.MASSING;
        }
    }

    /**
     * Update during patrol phase - send mixed army to unexplored areas
     * Holds position with a cooldown, then moves to next waypoint
     */
    updatePatrolPhase(deltaTime) {
        this.patrolTimer += deltaTime;

        // Get patrol army first (exclude harvesters)
        let patrolUnits;
        if (this._unitCache && this._unitCache.army) {
            patrolUnits = this._unitCache.army.filter(u => !u.isDead());
        } else {
            if (!Game.instance || !Game.instance.unitManager) return;
            patrolUnits = Game.instance.unitManager.getUnitsByPlayer(this.player)
                .filter(u => !u.isDead() && u.config?.type?.toUpperCase() !== 'HARVESTER');
        }

        // Return to massing if army too small (check BEFORE enemy detection to avoid cycling)
        if (patrolUnits.length < 3) {
            console.log(`[AI] ${this.personality} PATROL army depleted (${patrolUnits.length} < 3), returning to MASSING`);
            this.attackTimer = 0;
            this.state = AI_STATE.MASSING;
            this.currentPatrolWaypoint = null;
            return;
        }

        // Check if any enemies found - switch to attacking (army size already validated above)
        const visibleTarget = this.findAttackTarget();
        if (visibleTarget) {
            console.log(`[AI] ${this.personality} found enemies during PATROL: ${visibleTarget.type}, switching to ATTACKING (army=${patrolUnits.length})`);
            this.attackTimer = 0;
            this.state = AI_STATE.ATTACKING;
            this.currentPatrolWaypoint = null;
            return;
        }

        // Set units to aggressive stance (attack on sight)
        this.setUnitStance(RTS_UNIT_STANCES.AGGRESSIVE);

        // Select next patrol waypoint if needed
        if (!this.currentPatrolWaypoint) {
            this.currentPatrolWaypoint = this.selectNextPatrolWaypoint();
            this.patrolWaitTimer = 0;

            if (!this.currentPatrolWaypoint) {
                console.log(`[AI] ${this.personality} PATROL failed to select waypoint!`);
                return;
            }

            // Send all units to waypoint using AttackMoveCommand (or MoveCommand as fallback)
            console.log(`[AI] ${this.personality} PATROL sending ${patrolUnits.length} units to waypoint (${this.currentPatrolWaypoint.x.toFixed(0)}, ${this.currentPatrolWaypoint.y.toFixed(0)})`);

            let commandsIssued = 0;
            for (const unit of patrolUnits) {
                let cmd;
                if (typeof AttackMoveCommand !== 'undefined') {
                    cmd = new AttackMoveCommand(unit, this.currentPatrolWaypoint.x, this.currentPatrolWaypoint.y);
                } else if (typeof MoveCommand !== 'undefined') {
                    cmd = new MoveCommand(unit, this.currentPatrolWaypoint.x, this.currentPatrolWaypoint.y);
                }

                if (cmd) {
                    unit.issueCommand(cmd);
                    commandsIssued++;
                }
            }
            console.log(`[AI] ${this.personality} PATROL issued ${commandsIssued} movement commands`)
        }

        // Check if units have reached waypoint
        if (this.currentPatrolWaypoint) {
            const arrived = this.checkPatrolArrival(patrolUnits, this.currentPatrolWaypoint);

            if (arrived) {
                this.patrolWaitTimer += deltaTime;

                // Wait at waypoint for cooldown duration
                if (this.patrolWaitTimer >= this.patrolWaitDuration) {
                    // Mark waypoint as visited
                    this.currentPatrolWaypoint.visited = true;
                    console.log(`[AI] ${this.personality} completed patrol at waypoint (${this.currentPatrolWaypoint.x.toFixed(0)}, ${this.currentPatrolWaypoint.y.toFixed(0)}) waited ${this.patrolWaitTimer.toFixed(1)}s`);

                    // Emit patrol complete event
                    if (typeof EVENTS !== 'undefined') {
                        EVENTS.emit('AI_PATROL_WAYPOINT_COMPLETE', {
                            aiPlayer: this.player,
                            waypoint: this.currentPatrolWaypoint,
                            unitsOnPatrol: patrolUnits.length
                        });
                    }

                    // Move to next waypoint
                    this.currentPatrolWaypoint = null;
                    this.patrolWaitTimer = 0;
                }
            }
        }
    }

    /**
     * Generate exploration waypoints across the map
     * Creates a grid of waypoints for units to patrol
     */
    generateExplorationWaypoints() {
        const mapWidth = 64 * 32; // 64 cells * 32px = 2048px
        const mapHeight = 64 * 32;
        const spacing = 512; // 16 cells = 512px between waypoints

        this.explorationWaypoints = [];

        for (let x = spacing / 2; x < mapWidth; x += spacing) {
            for (let y = spacing / 2; y < mapHeight; y += spacing) {
                this.explorationWaypoints.push({ x, y });
            }
        }

        // Shuffle waypoints for variety
        for (let i = this.explorationWaypoints.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.explorationWaypoints[i], this.explorationWaypoints[j]] =
            [this.explorationWaypoints[j], this.explorationWaypoints[i]];
        }
    }

    /**
     * Generate patrol waypoints in strategic locations
     * Uses wider spacing than exploration for more deliberate patrol routes
     */
    generatePatrolWaypoints() {
        const mapWidth = 64 * 32;
        const mapHeight = 64 * 32;
        const spacing = 768; // 24 cells = wider spacing than exploration

        this.patrolWaypoints = [];

        for (let x = spacing / 2; x < mapWidth; x += spacing) {
            for (let y = spacing / 2; y < mapHeight; y += spacing) {
                this.patrolWaypoints.push({
                    x,
                    y,
                    visited: false,
                    priority: 0 // Will be set based on unexplored weight
                });
            }
        }

        // Shuffle waypoints for variety
        for (let i = this.patrolWaypoints.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.patrolWaypoints[i], this.patrolWaypoints[j]] =
            [this.patrolWaypoints[j], this.patrolWaypoints[i]];
        }
    }

    /**
     * Select next patrol waypoint prioritizing unexplored areas
     */
    selectNextPatrolWaypoint() {
        if (this.patrolWaypoints.length === 0) {
            this.generatePatrolWaypoints();
        }

        // Weight waypoints by unexplored cells nearby
        for (const waypoint of this.patrolWaypoints) {
            if (waypoint.visited) continue;

            const cellSize = RTS_GRID?.CELL_SIZE || 32;
            const gridX = Math.floor(waypoint.x / cellSize);
            const gridY = Math.floor(waypoint.y / cellSize);

            // Count unexplored cells in 10-cell radius
            let unexploredCount = 0;
            const checkRadius = 10;

            for (let dx = -checkRadius; dx <= checkRadius; dx++) {
                for (let dy = -checkRadius; dy <= checkRadius; dy++) {
                    const checkX = gridX + dx;
                    const checkY = gridY + dy;
                    const cellKey = `${checkX},${checkY}`;

                    if (this.player.exploredCells && !this.player.exploredCells.has(cellKey)) {
                        unexploredCount++;
                    }
                }
            }

            waypoint.priority = unexploredCount;
        }

        // Sort by priority (most unexplored first), then by unvisited
        const candidates = this.patrolWaypoints
            .filter(w => !w.visited)
            .sort((a, b) => b.priority - a.priority);

        // If all visited, reset
        if (candidates.length === 0) {
            for (const waypoint of this.patrolWaypoints) {
                waypoint.visited = false;
            }
            return this.patrolWaypoints[0];
        }

        return candidates[0];
    }

    /**
     * Check if majority of patrol units have arrived at waypoint
     */
    checkPatrolArrival(units, waypoint) {
        if (units.length === 0) return false;

        const arrivalRadius = 100; // 3 cells
        let arrivedCount = 0;

        for (const unit of units) {
            const dx = unit.x - waypoint.x;
            const dy = unit.y - waypoint.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist <= arrivalRadius) {
                arrivedCount++;
            }
        }

        // At least 60% arrived
        return arrivedCount >= units.length * 0.6;
    }

    /**
     * Generate patrol composition based on personality and difficulty
     * @returns {string[]} Array of unit type names
     */
    generatePatrolComposition() {
        const template = this.getPatrolTemplate();
        const composition = [];

        // Randomize within min/max ranges
        for (const [unitType, config] of Object.entries(template)) {
            // Skip if difficulty-gated
            if (config.difficultyGate) {
                const meetGate = this.meetsDifficultyGate(config.difficultyGate);
                if (!meetGate) continue;
            }

            // Random count within range
            const count = Math.floor(Math.random() * (config.max - config.min + 1)) + config.min;

            for (let i = 0; i < count; i++) {
                composition.push(unitType);
            }
        }

        // Ensure target size
        const targetSize = this.patrolArmySize;
        while (composition.length < targetSize) {
            composition.push(this.getBaseUnitType());
        }

        // Trim if over
        while (composition.length > targetSize) {
            const leastImportant = this.findLeastImportantUnit(composition);
            composition.splice(composition.indexOf(leastImportant), 1);
        }

        return composition;
    }

    /**
     * Get patrol template based on personality
     */
    getPatrolTemplate() {
        const templates = {
            RUSHER: {
                RIFLEMAN: { min: 4, max: 6 },
                SCOUT_BUGGY: { min: 1, max: 3 },
                ROCKET_SOLDIER: { min: 1, max: 2 }
            },
            TURTLE: {
                RIFLEMAN: { min: 2, max: 4 },
                TANK: { min: 2, max: 4 },
                ARTILLERY: { min: 0, max: 2 },
                ROCKET_SOLDIER: { min: 1, max: 2 }
            },
            ECONOMIST: {
                RIFLEMAN: { min: 2, max: 4 },
                TANK: { min: 1, max: 3 },
                SCOUT_BUGGY: { min: 1, max: 3 },
                ROCKET_SOLDIER: { min: 1, max: 2 }
            },
            BALANCED: {
                RIFLEMAN: { min: 2, max: 4 },
                TANK: { min: 1, max: 3 },
                SCOUT_BUGGY: { min: 1, max: 3 },
                ROCKET_SOLDIER: { min: 1, max: 2 },
                HEAVY_TANK: { min: 0, max: 1, difficultyGate: 'HARD' },
                STEALTH_TANK: { min: 0, max: 1, difficultyGate: 'BRUTAL' }
            }
        };

        return templates[this.personality] || templates.BALANCED;
    }

    /**
     * Check if difficulty meets gate requirement
     */
    meetsDifficultyGate(gate) {
        const levels = ['EASY', 'NORMAL', 'HARD', 'BRUTAL'];
        const currentLevel = levels.indexOf(this.difficulty);
        const gateLevel = levels.indexOf(gate);
        return currentLevel >= gateLevel;
    }

    /**
     * Get base unit type for personality (used for filling patrol)
     */
    getBaseUnitType() {
        switch (this.personality) {
            case AI_PERSONALITY.RUSHER:
                return 'RIFLEMAN';
            case AI_PERSONALITY.TURTLE:
                return 'TANK';
            case AI_PERSONALITY.ECONOMIST:
                return 'SCOUT_BUGGY';
            default:
                return 'RIFLEMAN';
        }
    }

    /**
     * Find least important unit in composition
     */
    findLeastImportantUnit(composition) {
        // Priority order (remove these first)
        const priority = [
            'STEALTH_TANK', 'HEAVY_TANK', 'ARTILLERY',
            'ROCKET_SOLDIER', 'TANK', 'SCOUT_BUGGY', 'RIFLEMAN'
        ];

        for (const unitType of priority) {
            if (composition.includes(unitType)) {
                return unitType;
            }
        }

        return composition[0]; // Fallback
    }

    /**
     * Calculate total cost of patrol composition
     */
    calculatePatrolCost(composition) {
        const costs = {
            RIFLEMAN: 150,
            ROCKET_SOLDIER: 300,
            ENGINEER: 500,
            COMMANDO: 2000,
            SCOUT_BUGGY: 400,
            TANK: 800,
            ARTILLERY: 1200,
            HEAVY_TANK: 2500,
            STEALTH_TANK: 1800
        };

        return composition.reduce((total, unitType) => total + (costs[unitType] || 0), 0);
    }


    /**
     * Check for threats to base
     */
    checkForThreats() {
        if (this.isUnderAttack() && this.state !== AI_STATE.DEFENDING) {
            this.state = AI_STATE.DEFENDING;
        }
    }

    /**
     * Check if base is under attack (only consider visible enemies)
     */
    isUnderAttack() {
        if (!Game.instance || !Game.instance.unitManager) return false;

        const basePos = this.player.startPosition || { x: 400, y: 400 };
        const threatRange = 300;

        // Only check visible enemies
        let enemies = [];
        if (Game.instance.visibilityManager) {
            enemies = Game.instance.visibilityManager.getVisibleUnits(this.player, Game.instance.unitManager)
                .filter(u =>
                    !u.isDead() &&
                    u.owner !== this.player &&
                    this.player.isEnemy(u.owner)
                );
        } else {
            // Fallback if visibility manager not available
            enemies = Game.instance.unitManager.units.filter(u =>
                !u.isDead() &&
                u.owner !== this.player &&
                this.player.isEnemy(u.owner)
            );
        }

        for (const enemy of enemies) {
            const dist = Math.hypot(enemy.x - basePos.x, enemy.y - basePos.y);
            if (dist < threatRange) return true;
        }

        return false;
    }

    /**
     * Manage harvester units (uses cached data)
     */
    manageHarvesters() {
        // Use cache if available, otherwise fallback
        let harvesters;
        if (this._unitCache && this._unitCache.harvesters) {
            harvesters = this._unitCache.harvesters.filter(u => !u.isDead());
        } else {
            if (!Game.instance || !Game.instance.unitManager) return;
            harvesters = Game.instance.unitManager.getUnitsByPlayer(this.player)
                .filter(u => !u.isDead() && u.config?.type?.toUpperCase() === 'HARVESTER');
        }

        for (const harvester of harvesters) {
            // Issue harvest command if idle
            if (harvester.state === RTS_UNIT_STATES.IDLE && !harvester.currentCommand) {
                const cmd = new HarvestCommand(harvester);
                harvester.issueCommand(cmd);
            }
        }
    }

    /**
     * Enable/disable AI
     */
    setEnabled(enabled) {
        this.enabled = enabled;
    }

    /**
     * Get debug info
     */
    getDebugInfo() {
        return {
            state: this.state,
            personality: this.personality,
            difficulty: this.difficulty,
            gameTime: this.gameTime.toFixed(1),
            buildIndex: `${this.currentBuildIndex}/${this.buildQueue.length}`,
            armySize: this.getArmySize(),
            resources: this.player?.resources?.tiberium || 0
        };
    }

    // ========================================
    // STATIC BUILDER CLASS
    // ========================================

    static Builder = class {
        constructor() {
            this._reset();
        }

        _reset() {
            this._player = null;
            this._personality = AI_PERSONALITY.BALANCED;
            this._difficulty = 'NORMAL';
            return this;
        }

        forPlayer(player) {
            this._player = player;
            return this;
        }

        withPersonality(personality) {
            this._personality = personality.toUpperCase();
            return this;
        }

        withDifficulty(difficulty) {
            this._difficulty = difficulty.toUpperCase();
            return this;
        }

        asRusher() {
            this._personality = AI_PERSONALITY.RUSHER;
            return this;
        }

        asTurtle() {
            this._personality = AI_PERSONALITY.TURTLE;
            return this;
        }

        asEconomist() {
            this._personality = AI_PERSONALITY.ECONOMIST;
            return this;
        }

        asBalanced() {
            this._personality = AI_PERSONALITY.BALANCED;
            return this;
        }

        build() {
            return new AIController({
                player: this._player,
                personality: this._personality,
                difficulty: this._difficulty
            });
        }

        static create() {
            return new AIController.Builder();
        }

        static rusher(player, difficulty = 'NORMAL') {
            return new AIController.Builder()
                .forPlayer(player)
                .asRusher()
                .withDifficulty(difficulty)
                .build();
        }

        static turtle(player, difficulty = 'NORMAL') {
            return new AIController.Builder()
                .forPlayer(player)
                .asTurtle()
                .withDifficulty(difficulty)
                .build();
        }
    };
}

// Export for global access
if (typeof window !== 'undefined') {
    window.AIController = AIController;
    window.AI_PERSONALITY = AI_PERSONALITY;
    window.AI_DIFFICULTY = AI_DIFFICULTY;
    window.AI_STATE = AI_STATE;
}
