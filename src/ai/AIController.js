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
    DEFENDING: 'DEFENDING'      // Under attack, defending
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
                    { type: 'attack' },
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
        this.attackTimer += deltaTime;

        // Update unit cache periodically
        this.updateUnitCache();

        // Apply resource bonus for harder difficulties
        this.applyResourceBonus(deltaTime);

        // Periodically re-evaluate strategy based on progression (every 5 seconds)
        if (Math.floor(this.gameTime) % 5 === 0 && this.gameTime % deltaTime < deltaTime * 1.5) {
            this.evaluateAndAdjustStrategy();
        }

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
        }

        // Always check for threats
        this.checkForThreats();

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
                    this.currentBuildIndex++;
                }
                break;

            case 'unit':
                if (this.tryProduceUnits(order.name, order.count || 1)) {
                    this.currentBuildIndex++;
                }
                break;

            case 'attack':
                this.state = AI_STATE.ATTACKING;
                this.currentBuildIndex++;
                break;
        }
    }

    /**
     * Evaluate player progression and adjust AI strategy
     * Uses progression values to make tactical decisions
     */
    evaluateAndAdjustStrategy() {
        if (!this.player || !this.player.progression) return;

        const prog = this.player.progression;
        const buildingManager = Game.instance?.buildingManager;

        // Strategy 1: Defense is weak - focus on defensive buildings
        if (prog.base_defence_progress < 30) {
            // Only try to add tower if we have prerequisites
            if (buildingManager && buildingManager.meetsRequirements('guard_tower', this.player)) {
                const hasTower = this.buildQueue.some(o => o.type === 'building' && o.name === 'guard_tower');
                if (!hasTower && this.state !== AI_STATE.DEFENDING && !this.isUnderAttack()) {
                    this.buildQueue.splice(Math.max(0, this.currentBuildIndex + 1), 0,
                        { type: 'building', name: 'guard_tower' }
                    );
                }
            }
        }

        // Strategy 2: Base expansion is weak - focus on economy
        if (prog.base_expansion_progress < 25) {
            this.state = AI_STATE.EXPANDING;
        }

        // Strategy 3: Technology is weak - focus on tech buildings
        if (prog.base_technology_progress < 40 && prog.base_expansion_progress > 40) {
            if (buildingManager && buildingManager.meetsRequirements('tech_center', this.player)) {
                if (!this.buildQueue.some(o => o.type === 'building' && o.name === 'tech_center')) {
                    this.buildQueue.push({ type: 'building', name: 'tech_center' });
                }
            }
        }

        // Strategy 4: Not exploring - queue scouts (represented by idle units)
        // (handled by general unit production)

        // Strategy 5: Weak harvesting - focus on harvesters
        if (prog.map_tiberium_fields_contained_progress < 40) {
            if (!this.buildQueue.some(o => o.type === 'unit' && o.name === 'harvester')) {
                this.buildQueue.push({ type: 'unit', name: 'harvester', count: 2 });
            }
        }

        // Strategy 6: Strong overall - time to mass units
        const overallStrength = (prog.base_expansion_progress + prog.base_technology_progress +
                                prog.map_tiberium_fields_contained_progress) / 3;
        if (overallStrength > 60 && prog.unit_army_progress < 60) {
            this.state = AI_STATE.MASSING;
        }

        // Strategy 7: Army ready - attack!
        // Only attack if we have a decent army (at least 6 combat units = 60% progress)
        if (prog.unit_army_progress >= 60) {
            this.state = AI_STATE.ATTACKING;
        }
        // Also attack if we've killed enemy units successfully
        else if (prog.enemies_defeated_progress > 50 && prog.unit_army_progress >= 40) {
            this.state = AI_STATE.ATTACKING;
        }
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
            console.log(`AI: Cannot afford ${buildingType} (need ${cost}, have ${this.player.resources.tiberium})`);
            return false;
        }

        // Check if building requirements are met
        const buildingManager = Game.instance.buildingManager;
        if (!buildingManager.meetsRequirements(buildingType, this.player)) {
            console.log(`AI: Building requirements not met for ${buildingType}`);
            return false;
        }

        // Find valid placement
        const position = this.findBuildingPlacement(buildingType);
        if (!position) {
            console.log(`AI: Cannot find valid placement for ${buildingType}`);
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

        const spawnLabel = `AI_SPAWN_${count}_${unitType}`;
        console.time(spawnLabel);

        const unitCost = this.getUnitCost(unitType);
        const producerType = this.getProducerBuilding(unitType);

        // Find producer building
        const producer = this.findProducerBuilding(producerType);
        if (!producer) {
            console.timeEnd(spawnLabel);
            return false;
        }

        // Queue units (as many as we can afford)
        let produced = 0;
        for (let i = 0; i < count; i++) {
            if (this.player.resources.tiberium >= unitCost) {
                const queueLabel = `AI_QUEUE_UNIT_${i}`;
                console.time(queueLabel);
                if (this.queueUnit(producer, unitType)) {
                    this.player.resources.tiberium -= unitCost;
                    produced++;
                }
                console.timeEnd(queueLabel);
            }
        }

        console.timeEnd(spawnLabel);
        if (produced > 0) {
            console.log(`[PERF] AI spawned ${produced} ${unitType} units in total`);
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

            console.time(`CREATE_UNIT_${unitType}`);
            Game.instance.unitManager.createUnit(
                unitType,
                rallyPoint.x,
                rallyPoint.y,
                this.player
            );
            console.timeEnd(`CREATE_UNIT_${unitType}`);
            return true;
        }

        return false;
    }

    /**
     * Update during massing phase
     */
    updateMassingPhase(deltaTime) {
        // Keep units on hold position while massing
        this.setUnitStance(RTS_UNIT_STANCES.HOLD_POSITION);

        const armySize = this.getArmySize();

        // Continue building units
        if (this.buildTimer >= this.difficultySettings.buildDelay) {
            this.buildTimer = 0;

            if (armySize < this.difficultySettings.unitCap) {
                // Build more units
                const unitType = this.personality === AI_PERSONALITY.RUSHER ? 'infantry' : 'vehicle';
                this.tryProduceUnits(unitType, 1);
            }
        }

        // Attack when ready
        if (this.attackTimer >= this.difficultySettings.attackDelay) {
            this.state = AI_STATE.ATTACKING;
        }
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
        }

        if (this.attackTarget) {
            this.issueAttackOrders(this.attackTarget);
        }

        // Return to massing if army depleted
        if (this.getArmySize() < 3) {
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
