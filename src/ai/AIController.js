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

        // Unsubscribe from game events (Task 8)
        this.unsubscribeFromEvents();

        this.player = null;
        this.buildQueue = [];
        this.attackTarget = null;
        this.knownEnemyBuildings = [];
        this.knownEnemyUnits = [];
        this.knownEnemyBases = [];
        this.claimedExpansions = null;
        this._unitCache = null;
        console.log('AIController destroyed');
    }

    /**
     * Initialize event subscriptions (Task 8)
     * Call this once Game.instance is available
     */
    initializeEventSubscriptions() {
        // Delay subscription to ensure Game.instance exists
        if (Game.instance?.eventManager) {
            this.subscribeToEvents();
        } else {
            // Retry after a short delay
            setTimeout(() => {
                if (Game.instance?.eventManager) {
                    this.subscribeToEvents();
                }
            }, 1000);
        }
    }

    /**
     * Initialize build order based on personality
     * Uses RTS_AI_WEIGHTS for data-driven build orders
     */
    initializeBuildOrder() {
        // Use RTS_AI_WEIGHTS if available and personality matches
        const aiWeights = typeof RTS_AI_WEIGHTS !== 'undefined' ? RTS_AI_WEIGHTS : null;

        if (aiWeights && aiWeights[this.personality] && aiWeights[this.personality].buildOrder) {
            // Convert RTS_AI_WEIGHTS build order to internal format
            this.buildQueue = aiWeights[this.personality].buildOrder.map(buildingName => ({
                type: 'building',
                name: buildingName.toLowerCase()
            }));

            // Add unit production after build order
            const preferredUnits = aiWeights[this.personality].preferredUnits || ['infantry'];
            this.buildQueue.push({
                type: 'unit',
                name: 'infantry',  // Generic type, will be translated to faction unit
                count: 5
            });

            console.log(`[AI] ${this.personality} using RTS_AI_WEIGHTS build order`);
        } else {
            // Fallback to hardcoded build orders
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
    }

    /**
     * Translate generic unit type to faction-specific unit
     * @param {string} genericType - 'infantry', 'vehicle', 'harvester', etc.
     * @returns {string} Faction-specific unit name (e.g., 'RIFLEMAN', 'MILITANT', 'SHOCK_TROOPER')
     */
    getFactionUnit(genericType) {
        if (!this.player || !this.player.factionData) {
            console.warn(`[AI] getFactionUnit: No faction data available, using generic type: ${genericType}`);
            return genericType;
        }

        const faction = this.player.faction;
        const factionData = this.player.factionData;

        // Map generic types to faction-specific units
        const unitMappings = {
            'infantry': this.selectInfantryUnit(factionData),
            'vehicle': this.selectVehicleUnit(factionData),
            'harvester': 'HARVESTER',  // All factions have HARVESTER
            'engineer': 'ENGINEER'      // All factions have ENGINEER
        };

        const factionUnit = unitMappings[genericType.toLowerCase()];

        if (!factionUnit) {
            console.warn(`[AI] getFactionUnit: No faction mapping for type: ${genericType}, using generic`);
            return genericType;
        }

        console.log(`[AI] ${faction} translated ${genericType} → ${factionUnit}`);
        return factionUnit;
    }

    /**
     * Select appropriate infantry unit for faction
     * @param {Object} factionData - Player's faction data
     * @returns {string} Infantry unit name
     */
    selectInfantryUnit(factionData) {
        const faction = this.player.faction;

        // Faction-specific infantry mappings
        if (faction === 'ALLIANCE') {
            return 'RIFLEMAN';
        } else if (faction === 'SYNDICATE') {
            return 'MILITANT';
        } else if (faction === 'COLLECTIVE') {
            return 'SHOCK_TROOPER';
        }

        // Fallback: find first infantry unit in faction roster
        if (factionData.units) {
            for (const [unitName, unitData] of Object.entries(factionData.units)) {
                if (unitData.type === RTS_UNIT_TYPES.INFANTRY && unitName !== 'ENGINEER') {
                    return unitName;
                }
            }
        }

        return 'RIFLEMAN';  // Ultimate fallback
    }

    /**
     * Select appropriate vehicle unit for faction
     * @param {Object} factionData - Player's faction data
     * @returns {string} Vehicle unit name
     */
    selectVehicleUnit(factionData) {
        // All factions have TANK as baseline vehicle
        if (factionData.units && factionData.units.TANK) {
            return 'TANK';
        }

        // Fallback: find first vehicle unit in faction roster
        if (factionData.units) {
            for (const [unitName, unitData] of Object.entries(factionData.units)) {
                if (unitData.type === RTS_UNIT_TYPES.VEHICLE && unitName !== 'HARVESTER') {
                    return unitName;
                }
            }
        }

        return 'TANK';  // Ultimate fallback
    }

    /**
     * Translate generic building type to faction-specific building
     * @param {string} genericType - 'barracks', 'war_factory', etc.
     * @returns {string} Faction-specific building name
     */
    getFactionBuilding(genericType) {
        if (!this.player || !this.player.factionData) {
            return genericType.toUpperCase();
        }

        const faction = this.player.faction;

        // Map generic building names to available building types
        const buildingMappings = {
            'barracks': 'barracks',  // Use generic barracks for all factions
            'war_factory': 'war_factory',
            'power_plant': 'power_plant',
            'refinery': 'refinery',
            'guard_tower': 'guard_tower',
            'tech_center': 'tech_center',
            'silo': 'silo',  // BuildingManager uses 'silo' not 'tiberium_silo'
            'construction_yard': 'construction_yard',
            'armory': 'armory',
            'radar': 'radar'
        };

        const factionBuilding = buildingMappings[genericType.toLowerCase()];

        if (!factionBuilding) {
            return genericType.toUpperCase();
        }

        return factionBuilding;
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

        // Try to initialize event subscriptions once (Task 8)
        if (!this._eventsInitialized) {
            this.initializeEventSubscriptions();
            this._eventsInitialized = true;
        }

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

        // Translate generic building type to faction-specific building
        const factionBuilding = this.getFactionBuilding(buildingType);

        // Check if we can afford it
        const cost = this.getBuildingCost(buildingType);
        if (this.player.resources.tiberium < cost) {
            return false;
        }

        // Check if building requirements are met
        const buildingManager = Game.instance.buildingManager;
        if (!buildingManager.meetsRequirements(factionBuilding, this.player)) {
            return false;
        }

        // Find valid placement
        const position = this.findBuildingPlacement(buildingType);
        if (!position) {
            return false;
        }

        // Build it (placeBuilding handles resource deduction and final validation)
        const success = buildingManager.placeBuilding(
            factionBuilding,
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

        // Translate generic unit type to faction-specific unit
        const factionUnit = this.getFactionUnit(unitType);

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
                if (this.queueUnit(producer, factionUnit)) {
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

        // Check for expansion opportunities (Task 2)
        if (this.gameTime >= this.getExpansionTiming()) {
            const expansion = this.evaluateExpansionOpportunities();
            if (expansion) {
                this.captureExpansion(expansion);
            }
        }

        // Continue building units - use counter-unit selection if we know enemies (Task 5)
        if (this.buildTimer >= this.difficultySettings.buildDelay) {
            this.buildTimer = 0;

            if (armySize < this.difficultySettings.unitCap) {
                // Get enemy composition and select counter-units (Task 5, 7)
                const enemyComp = this.getEnemyCompositionForDecision();
                const counters = this.selectCounterUnits(enemyComp);

                // Pick a counter-unit type to build
                const unitType = counters.length > 0
                    ? counters[Math.floor(Math.random() * counters.length)]
                    : (this.personality === AI_PERSONALITY.RUSHER ? 'infantry' : 'vehicle');

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

        // Check for tactical retreats during combat (Task 4)
        this.updateRetreatLogic();

        // Check if current target is still valid
        if (this.attackTarget && (this.attackTarget.isDead() || !this.attackTarget.active)) {
            this.attackTarget = null;
        }

        // Find attack target
        if (!this.attackTarget) {
            // Try to find weakest enemy base first (Task 6 - use scouted intel)
            const weakestBase = this.getWeakestEnemyBase();
            if (weakestBase) {
                // Convert position to a target coordinate
                this.attackTarget = this.findAttackTargetNear(weakestBase.x, weakestBase.y);
            }

            // Fallback to normal target finding
            if (!this.attackTarget) {
                this.attackTarget = this.findAttackTarget();
            }

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
     * Find attack target near a position (for targeting known enemy bases)
     * @param {number} x - X position to search near
     * @param {number} y - Y position to search near
     * @returns {object|null} Enemy building or unit near position
     */
    findAttackTargetNear(x, y) {
        if (!Game.instance?.buildingManager) return null;

        const searchRadius = 300;

        // Look for visible enemy buildings near position
        let enemyBuildings = [];
        if (Game.instance.visibilityManager) {
            enemyBuildings = Game.instance.visibilityManager.getVisibleBuildings(this.player, Game.instance.buildingManager)
                .filter(b => !b.isDead() && b.owner !== this.player && this.player.isEnemy(b.owner));
        } else {
            enemyBuildings = Game.instance.buildingManager.buildings.filter(b =>
                !b.isDead() && b.owner !== this.player && this.player.isEnemy(b.owner));
        }

        // Find nearest to position
        let nearest = null;
        let minDist = searchRadius;

        for (const building of enemyBuildings) {
            const dist = Math.hypot(building.x - x, building.y - y);
            if (dist < minDist) {
                minDist = dist;
                nearest = building;
            }
        }

        return nearest;
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

        // Use choke point defense if available (Task 3 enhancement)
        this.defendBase();

        // Periodically check for tactical retreats (Task 4)
        this.updateRetreatLogic();

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

        // Prioritize scouting expansion zones (Task 6 enhancement)
        this.scoutExpansions();

        // Track enemy expansions discovered by scouts
        this.trackEnemyExpansions();

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
    // EXPANSION ZONE CAPTURE (Task 2)
    // ========================================

    /**
     * Evaluate expansion opportunities and return best expansion zone
     * @returns {object|null} Best expansion zone to capture
     */
    evaluateExpansionOpportunities() {
        if (!Game.instance?.expansionZones || Game.instance.expansionZones.length === 0) {
            return null;
        }

        const myBase = this.player.startPosition || { x: 400, y: 400 };
        const cellSize = RTS_GRID?.CELL_SIZE || 32;

        // Score each expansion zone
        const scored = Game.instance.expansionZones.map(exp => {
            // Get pixel position for distance calculation
            const expPixelX = exp.pixelX || (exp.gridX * cellSize);
            const expPixelY = exp.pixelY || (exp.gridY * cellSize);

            // Calculate distance score (closer is better, but not too close)
            const dist = Math.hypot(expPixelX - myBase.x, expPixelY - myBase.y);
            const optimalRange = 600; // 15-20 cells optimal range
            const distScore = 1 - Math.abs(dist - optimalRange) / 1000;

            // Check if already claimed
            const isClaimed = this.claimedExpansions?.has(exp.expansionId);
            if (isClaimed) return { expansion: exp, score: -1 };

            // Check if contested (enemy units nearby)
            const contested = this.isExpansionContested(exp) ? 0.5 : 1.0;

            // Tiberium value score
            const tiberiumValue = (exp.tiberiumField?.density || 50) / 100;

            return {
                expansion: exp,
                score: distScore * tiberiumValue * contested
            };
        });

        // Filter out invalid and sort by score
        const valid = scored.filter(s => s.score > 0);
        valid.sort((a, b) => b.score - a.score);

        return valid[0]?.expansion || null;
    }

    /**
     * Check if expansion zone is contested by enemy units
     * @param {object} expansion - Expansion zone to check
     * @returns {boolean} True if enemy units nearby
     */
    isExpansionContested(expansion) {
        if (!Game.instance?.unitManager) return false;

        const cellSize = RTS_GRID?.CELL_SIZE || 32;
        const expX = expansion.pixelX || (expansion.gridX * cellSize);
        const expY = expansion.pixelY || (expansion.gridY * cellSize);
        const checkRadius = 300; // 10 cells

        let enemies = [];
        if (Game.instance.visibilityManager) {
            enemies = Game.instance.visibilityManager.getVisibleUnits(this.player, Game.instance.unitManager)
                .filter(u => !u.isDead() && u.owner !== this.player && this.player.isEnemy(u.owner));
        } else {
            enemies = Game.instance.unitManager.units.filter(u =>
                !u.isDead() && u.owner !== this.player && this.player.isEnemy(u.owner));
        }

        for (const enemy of enemies) {
            const dist = Math.hypot(enemy.x - expX, enemy.y - expY);
            if (dist < checkRadius) return true;
        }

        return false;
    }

    /**
     * Initiate capture of an expansion zone
     * @param {object} expansion - Expansion zone to capture
     */
    captureExpansion(expansion) {
        if (!expansion) return;

        const cellSize = RTS_GRID?.CELL_SIZE || 32;
        const expX = expansion.pixelX || (expansion.gridX * cellSize);
        const expY = expansion.pixelY || (expansion.gridY * cellSize);

        console.log(`[AI] ${this.personality} capturing expansion at (${expansion.gridX}, ${expansion.gridY})`);

        // Mark as claimed to prevent re-evaluation
        if (!this.claimedExpansions) this.claimedExpansions = new Set();
        this.claimedExpansions.add(expansion.expansionId);

        // Queue Construction Yard at expansion (if we can afford it)
        const conyardCost = 2500;
        if (this.player.resources.tiberium >= conyardCost) {
            // Try to build construction yard at expansion
            const buildingManager = Game.instance?.buildingManager;
            if (buildingManager) {
                const factionBuilding = this.getFactionBuilding('construction_yard');
                const placed = buildingManager.placeBuilding(
                    factionBuilding,
                    expansion.gridX,
                    expansion.gridY,
                    this.player
                );

                if (placed) {
                    console.log(`[AI] ${this.personality} placed Construction Yard at expansion`);
                }
            }
        }

        // Send guard units to expansion
        this.sendGuardsToLocation(expX, expY, 3);
    }

    /**
     * Send guard units to a location
     * @param {number} x - Target X position
     * @param {number} y - Target Y position
     * @param {number} count - Number of units to send
     */
    sendGuardsToLocation(x, y, count) {
        let army = [];
        if (this._unitCache?.army) {
            army = this._unitCache.army.filter(u => !u.isDead());
        }

        const guards = army.slice(0, count);
        for (const unit of guards) {
            if (typeof AttackMoveCommand !== 'undefined') {
                const cmd = new AttackMoveCommand(unit, x, y);
                unit.issueCommand(cmd);
            } else if (typeof MoveCommand !== 'undefined') {
                const cmd = new MoveCommand(unit, x, y);
                unit.issueCommand(cmd);
            }
        }
    }

    /**
     * Get expansion timing based on difficulty
     * @returns {number} Seconds before AI should attempt expansion
     */
    getExpansionTiming() {
        const timings = {
            'EASY': 600,    // 10 minutes
            'NORMAL': 420,  // 7 minutes
            'HARD': 300,    // 5 minutes
            'BRUTAL': 180   // 3 minutes
        };
        return timings[this.difficulty] || 420;
    }

    // ========================================
    // CHOKE POINT DEFENSE (Task 3)
    // ========================================

    /**
     * Get nearest choke point to a position
     * @param {object} position - Position with x, y coordinates
     * @returns {object|null} Nearest choke point
     */
    getNearestChokePoint(position) {
        if (!Game.instance?.chokePoints || Game.instance.chokePoints.length === 0) {
            return null;
        }

        const cellSize = RTS_GRID?.CELL_SIZE || 32;
        let nearest = null;
        let minDist = Infinity;

        for (const choke of Game.instance.chokePoints) {
            const chokeX = choke.pixelX || (choke.gridX * cellSize);
            const chokeY = choke.pixelY || (choke.gridY * cellSize);
            const dist = Math.hypot(chokeX - position.x, chokeY - position.y);

            if (dist < minDist) {
                minDist = dist;
                nearest = {
                    ...choke,
                    pixelX: chokeX,
                    pixelY: chokeY
                };
            }
        }

        return nearest;
    }

    /**
     * Check if a choke point is adequately defended
     * @param {object} chokePoint - Choke point to check
     * @returns {boolean} True if defended (>= 3 friendly units)
     */
    isChokePointDefended(chokePoint) {
        if (!chokePoint) return false;

        let army = [];
        if (this._unitCache?.army) {
            army = this._unitCache.army.filter(u => !u.isDead());
        }

        const defendRadius = 150;
        let unitsAtChoke = 0;

        for (const unit of army) {
            const dist = Math.hypot(unit.x - chokePoint.pixelX, unit.y - chokePoint.pixelY);
            if (dist < defendRadius) {
                unitsAtChoke++;
            }
        }

        return unitsAtChoke >= 3;
    }

    /**
     * Defend the base using choke points when under attack
     */
    defendBase() {
        const enemyThreat = this.getNearestEnemyThreat();
        if (!enemyThreat) return;

        const myBase = this.player.startPosition || { x: 400, y: 400 };
        const chokePoint = this.getNearestChokePoint(myBase);

        // If choke point exists and is between base and enemy, use it
        if (chokePoint && !this.isChokePointDefended(chokePoint)) {
            const chokeDistToBase = Math.hypot(chokePoint.pixelX - myBase.x, chokePoint.pixelY - myBase.y);
            const enemyDistToBase = Math.hypot(enemyThreat.x - myBase.x, enemyThreat.y - myBase.y);

            // Only use choke if it's between us and enemy (closer to enemy than base)
            if (chokeDistToBase < enemyDistToBase) {
                console.log(`[AI] ${this.personality} defending choke point at (${chokePoint.gridX}, ${chokePoint.gridY})`);
                this.moveDefendersToPosition(chokePoint.pixelX, chokePoint.pixelY);
                return;
            }
        }

        // Fallback: defend at base
        this.moveDefendersToPosition(myBase.x, myBase.y);
    }

    /**
     * Move defensive units to a position
     * @param {number} x - Target X position
     * @param {number} y - Target Y position
     */
    moveDefendersToPosition(x, y) {
        let army = [];
        if (this._unitCache?.army) {
            army = this._unitCache.army.filter(u => !u.isDead());
        }

        for (const unit of army) {
            if (!unit.currentCommand || unit.currentCommand.isComplete) {
                if (typeof AttackMoveCommand !== 'undefined') {
                    const cmd = new AttackMoveCommand(unit, x, y);
                    unit.issueCommand(cmd);
                }
                // Set stance to hold position at defense point
                if (typeof RTS_UNIT_STANCES !== 'undefined') {
                    unit.stance = RTS_UNIT_STANCES.HOLD_POSITION;
                }
            }
        }
    }

    /**
     * Get nearest enemy threat to base
     * @returns {object|null} Nearest enemy unit or building threatening base
     */
    getNearestEnemyThreat() {
        if (!Game.instance?.unitManager) return null;

        const basePos = this.player.startPosition || { x: 400, y: 400 };
        const threatRange = 500;

        let enemies = [];
        if (Game.instance.visibilityManager) {
            enemies = Game.instance.visibilityManager.getVisibleUnits(this.player, Game.instance.unitManager)
                .filter(u => !u.isDead() && u.owner !== this.player && this.player.isEnemy(u.owner));
        } else {
            enemies = Game.instance.unitManager.units.filter(u =>
                !u.isDead() && u.owner !== this.player && this.player.isEnemy(u.owner));
        }

        let nearest = null;
        let minDist = Infinity;

        for (const enemy of enemies) {
            const dist = Math.hypot(enemy.x - basePos.x, enemy.y - basePos.y);
            if (dist < threatRange && dist < minDist) {
                minDist = dist;
                nearest = enemy;
            }
        }

        return nearest;
    }

    // ========================================
    // TACTICAL RETREAT (Task 4)
    // ========================================

    /**
     * Evaluate combat situation for a unit and decide action
     * @param {Unit} unit - Unit to evaluate
     * @returns {string} 'RETREAT', 'HOLD', or 'ADVANCE'
     */
    evaluateCombatSituation(unit) {
        if (!unit || unit.isDead()) return 'HOLD';

        const healthPercent = unit.health / (unit.maxHealth || unit.config?.health || 100);
        const nearbyEnemies = this.getNearbyEnemies(unit, unit.sightRange || 6);
        const nearbyAllies = this.getNearbyAllies(unit, 5);

        const retreatThreshold = this.getRetreatThreshold();

        // Critical health and outnumbered = immediate retreat
        if (healthPercent < 0.3 && nearbyEnemies.length > nearbyAllies.length) {
            return 'RETREAT';
        }

        // Below personality-based threshold and significantly outnumbered
        if (healthPercent < retreatThreshold && nearbyEnemies.length > nearbyAllies.length * 1.5) {
            return 'RETREAT';
        }

        // We outnumber enemy - advance
        if (nearbyAllies.length > nearbyEnemies.length && healthPercent > 0.5) {
            return 'ADVANCE';
        }

        return 'HOLD';
    }

    /**
     * Execute retreat for a unit
     * @param {Unit} unit - Unit to retreat
     */
    executeRetreat(unit) {
        if (!unit || unit.isDead()) return;

        const nearestEnemy = this.getNearestEnemy(unit);
        if (!nearestEnemy) return;

        // Calculate retreat direction (away from enemy)
        const dx = unit.x - nearestEnemy.x;
        const dy = unit.y - nearestEnemy.y;
        const dist = Math.hypot(dx, dy);

        if (dist < 1) return; // Avoid division by zero

        const retreatDist = 200; // Pixels to retreat
        const retreatX = unit.x + (dx / dist) * retreatDist;
        const retreatY = unit.y + (dy / dist) * retreatDist;

        // Clamp to map bounds
        const mapWidth = (RTS_GRID?.DEFAULT_COLS || 64) * (RTS_GRID?.CELL_SIZE || 32);
        const mapHeight = (RTS_GRID?.DEFAULT_ROWS || 64) * (RTS_GRID?.CELL_SIZE || 32);
        const clampedX = Math.max(50, Math.min(mapWidth - 50, retreatX));
        const clampedY = Math.max(50, Math.min(mapHeight - 50, retreatY));

        console.log(`[AI] ${this.personality} retreating unit ${unit.id || 'unknown'} from combat`);

        // Issue retreat command with high priority
        if (typeof MoveCommand !== 'undefined') {
            const retreatCmd = new MoveCommand(unit, clampedX, clampedY);
            unit.issueCommand(retreatCmd);
        }

        // Set defensive stance
        if (typeof RTS_UNIT_STANCES !== 'undefined') {
            unit.stance = RTS_UNIT_STANCES.DEFENSIVE;
        }
    }

    /**
     * Get retreat threshold based on personality
     * @returns {number} Health percentage threshold for retreat (0-1)
     */
    getRetreatThreshold() {
        const thresholds = {
            'RUSHER': 0.20,     // Aggressive - only retreat at 20%
            'BALANCED': 0.40,   // Balanced - retreat at 40%
            'TURTLE': 0.50,     // Cautious - retreat at 50%
            'ECONOMIST': 0.60   // Preserve units - retreat at 60%
        };
        return thresholds[this.personality] || 0.40;
    }

    /**
     * Get nearby enemy units within range
     * @param {Unit} unit - Reference unit
     * @param {number} range - Range in cells
     * @returns {Unit[]} Array of nearby enemies
     */
    getNearbyEnemies(unit, range) {
        if (!Game.instance?.unitManager) return [];

        const cellSize = RTS_GRID?.CELL_SIZE || 32;
        const checkRadius = range * cellSize;

        let enemies = [];
        if (Game.instance.visibilityManager) {
            enemies = Game.instance.visibilityManager.getVisibleUnits(this.player, Game.instance.unitManager)
                .filter(u => !u.isDead() && u.owner !== this.player && this.player.isEnemy(u.owner));
        } else {
            enemies = Game.instance.unitManager.units.filter(u =>
                !u.isDead() && u.owner !== this.player && this.player.isEnemy(u.owner));
        }

        return enemies.filter(enemy => {
            const dist = Math.hypot(enemy.x - unit.x, enemy.y - unit.y);
            return dist <= checkRadius;
        });
    }

    /**
     * Get nearby allied units within range
     * @param {Unit} unit - Reference unit
     * @param {number} range - Range in cells
     * @returns {Unit[]} Array of nearby allies
     */
    getNearbyAllies(unit, range) {
        if (!Game.instance?.unitManager) return [];

        const cellSize = RTS_GRID?.CELL_SIZE || 32;
        const checkRadius = range * cellSize;

        const allies = Game.instance.unitManager.getUnitsByPlayer(this.player)
            .filter(u => !u.isDead() && u !== unit);

        return allies.filter(ally => {
            const dist = Math.hypot(ally.x - unit.x, ally.y - unit.y);
            return dist <= checkRadius;
        });
    }

    /**
     * Get nearest enemy to a unit
     * @param {Unit} unit - Reference unit
     * @returns {Unit|null} Nearest enemy unit
     */
    getNearestEnemy(unit) {
        if (!unit) return null;

        let enemies = [];
        if (Game.instance?.visibilityManager) {
            enemies = Game.instance.visibilityManager.getVisibleUnits(this.player, Game.instance.unitManager)
                .filter(u => !u.isDead() && u.owner !== this.player && this.player.isEnemy(u.owner));
        } else if (Game.instance?.unitManager) {
            enemies = Game.instance.unitManager.units.filter(u =>
                !u.isDead() && u.owner !== this.player && this.player.isEnemy(u.owner));
        }

        let nearest = null;
        let minDist = Infinity;

        for (const enemy of enemies) {
            const dist = Math.hypot(enemy.x - unit.x, enemy.y - unit.y);
            if (dist < minDist) {
                minDist = dist;
                nearest = enemy;
            }
        }

        return nearest;
    }

    /**
     * Update retreat logic for units in combat
     * Called periodically to check if units should retreat
     */
    updateRetreatLogic() {
        let army = [];
        if (this._unitCache?.army) {
            army = this._unitCache.army.filter(u => !u.isDead());
        }

        for (const unit of army) {
            // Only check units that are actively in combat
            if (unit.state === RTS_UNIT_STATES?.ATTACKING || unit.currentCommand?.target) {
                const decision = this.evaluateCombatSituation(unit);
                if (decision === 'RETREAT') {
                    this.executeRetreat(unit);
                }
            }
        }
    }

    // ========================================
    // COUNTER-UNIT SELECTION (Task 5)
    // ========================================

    /**
     * Analyze enemy army composition from known enemies
     * @returns {object|null} Composition analysis { infantry, vehicle, aircraft, total }
     */
    analyzeEnemyComposition() {
        const knownEnemies = this.knownEnemyUnits || [];
        if (knownEnemies.length === 0) return null;

        const composition = {
            infantry: 0,
            vehicle: 0,
            aircraft: 0,
            total: knownEnemies.length
        };

        for (const enemy of knownEnemies) {
            const type = enemy.config?.type?.toUpperCase() || 'INFANTRY';
            if (type === 'INFANTRY' || type.includes('SOLDIER') || type.includes('TROOPER')) {
                composition.infantry++;
            } else if (type === 'VEHICLE' || type.includes('TANK') || type.includes('BUGGY')) {
                composition.vehicle++;
            } else if (type === 'AIRCRAFT' || type.includes('ORCA') || type.includes('VENOM')) {
                composition.aircraft++;
            } else {
                composition.infantry++; // Default to infantry
            }
        }

        return composition;
    }

    /**
     * Select counter-units based on enemy composition
     * @param {object} composition - Enemy composition analysis
     * @returns {string[]} Array of recommended unit types
     */
    selectCounterUnits(composition) {
        if (!composition) return this.getPreferredUnits();

        const counters = [];
        const faction = this.player?.faction || 'ALLIANCE';
        const total = composition.total || 1;

        // Apply decision quality (difficulty-based)
        const decisionQuality = this.getDecisionQuality();
        if (Math.random() > decisionQuality) {
            // Failed quality check - return random units instead of optimal counters
            console.log(`[AI] ${this.personality} made suboptimal counter-unit choice (quality: ${(decisionQuality * 100).toFixed(0)}%)`);
            return this.getRandomFactionUnits();
        }

        // Counter infantry-heavy armies (> 60% infantry)
        if (composition.infantry / total > 0.6) {
            if (faction === 'ALLIANCE') {
                counters.push('GRENADIER', 'ZONE_TROOPER');
            } else if (faction === 'SYNDICATE') {
                counters.push('FLAME_TROOPER', 'FLAME_TANK');
            } else if (faction === 'COLLECTIVE') {
                counters.push('DISINTEGRATOR', 'TRIPOD');
            }
        }

        // Counter vehicle-heavy armies (> 60% vehicles)
        if (composition.vehicle / total > 0.6) {
            if (faction === 'ALLIANCE') {
                counters.push('ZONE_TROOPER', 'ARTILLERY');
            } else if (faction === 'SYNDICATE') {
                counters.push('STEALTH_TANK', 'ATTACK_BUGGY');
            } else if (faction === 'COLLECTIVE') {
                counters.push('DEVOURER_TANK', 'TRIPOD');
            }
        }

        // Counter aircraft (> 30% aircraft)
        if (composition.aircraft / total > 0.3) {
            // All factions need anti-air
            counters.push('SAM_SITE'); // Building defense
        }

        // Mixed composition - use balanced units
        if (counters.length === 0) {
            return this.getPreferredUnits();
        }

        console.log(`[AI] ${this.personality} selected counter-units: ${counters.join(', ')} vs enemy composition`);
        return counters;
    }

    /**
     * Get preferred units based on personality (from RTS_AI_WEIGHTS)
     * @returns {string[]} Array of preferred unit types
     */
    getPreferredUnits() {
        if (typeof RTS_AI_WEIGHTS !== 'undefined' && RTS_AI_WEIGHTS[this.personality]) {
            return RTS_AI_WEIGHTS[this.personality].preferredUnits || ['RIFLEMAN', 'TANK'];
        }
        return ['RIFLEMAN', 'TANK'];
    }

    /**
     * Get random faction units (for suboptimal AI decisions)
     * @returns {string[]} Array of random unit types from faction roster
     */
    getRandomFactionUnits() {
        const factionData = this.player?.factionData;
        if (!factionData?.units) return ['RIFLEMAN'];

        const unitNames = Object.keys(factionData.units)
            .filter(name => name !== 'HARVESTER' && name !== 'ENGINEER');

        // Pick 2-3 random units
        const count = 2 + Math.floor(Math.random() * 2);
        const selected = [];
        for (let i = 0; i < count && unitNames.length > 0; i++) {
            const idx = Math.floor(Math.random() * unitNames.length);
            selected.push(unitNames[idx]);
        }

        return selected.length > 0 ? selected : ['RIFLEMAN'];
    }

    // ========================================
    // ENEMY EXPANSION TRACKING (Task 6)
    // ========================================

    /**
     * Track enemy expansions discovered by scouts
     */
    trackEnemyExpansions() {
        if (!Game.instance?.expansionZones) return;

        // Initialize enemy bases array if needed
        if (!this.knownEnemyBases) this.knownEnemyBases = [];

        for (const expansion of Game.instance.expansionZones) {
            const cellSize = RTS_GRID?.CELL_SIZE || 32;
            const expX = expansion.pixelX || (expansion.gridX * cellSize);
            const expY = expansion.pixelY || (expansion.gridY * cellSize);

            const enemyBuildings = this.findEnemyBuildingsNear(expX, expY, 5);
            if (enemyBuildings.length > 0) {
                // Check if already known
                const alreadyKnown = this.knownEnemyBases.some(b =>
                    Math.abs(b.x - expX) < 100 && Math.abs(b.y - expY) < 100
                );

                if (!alreadyKnown) {
                    console.log(`[AI] ${this.personality} discovered enemy expansion at (${expansion.gridX}, ${expansion.gridY})`);
                    this.knownEnemyBases.push({
                        x: expX,
                        y: expY,
                        isExpansion: true,
                        buildings: enemyBuildings,
                        discoveredAt: this.gameTime
                    });
                }
            }
        }
    }

    /**
     * Find enemy buildings near a position
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {number} cellRange - Range in cells
     * @returns {Building[]} Array of enemy buildings
     */
    findEnemyBuildingsNear(x, y, cellRange) {
        if (!Game.instance?.buildingManager) return [];

        const cellSize = RTS_GRID?.CELL_SIZE || 32;
        const checkRadius = cellRange * cellSize;

        let enemyBuildings = [];
        if (Game.instance.visibilityManager) {
            enemyBuildings = Game.instance.visibilityManager.getVisibleBuildings(this.player, Game.instance.buildingManager)
                .filter(b => !b.isDead() && b.owner !== this.player && this.player.isEnemy(b.owner));
        } else {
            enemyBuildings = Game.instance.buildingManager.buildings.filter(b =>
                !b.isDead() && b.owner !== this.player && this.player.isEnemy(b.owner));
        }

        return enemyBuildings.filter(building => {
            const dist = Math.hypot(building.x - x, building.y - y);
            return dist <= checkRadius;
        });
    }

    /**
     * Check if an expansion zone has been scouted
     * @param {object} expansion - Expansion zone to check
     * @returns {boolean} True if scouted
     */
    isExpansionScouted(expansion) {
        if (!this.player?.exploredCells) return false;

        const cellKey = `${expansion.gridX},${expansion.gridY}`;
        return this.player.exploredCells.has(cellKey);
    }

    /**
     * Enhanced scouting that prioritizes expansion zones
     */
    scoutExpansions() {
        if (!Game.instance?.expansionZones) return;

        // Find unscounted expansion zones
        for (const expansion of Game.instance.expansionZones) {
            if (!this.isExpansionScouted(expansion)) {
                const cellSize = RTS_GRID?.CELL_SIZE || 32;
                const expX = expansion.pixelX || (expansion.gridX * cellSize);
                const expY = expansion.pixelY || (expansion.gridY * cellSize);

                this.sendScoutToLocation(expX, expY);
                return; // Send one scout at a time
            }
        }
    }

    /**
     * Send a scout unit to a location
     * @param {number} x - Target X position
     * @param {number} y - Target Y position
     */
    sendScoutToLocation(x, y) {
        let army = [];
        if (this._unitCache?.army) {
            army = this._unitCache.army.filter(u => !u.isDead());
        }

        // Find fastest unit to use as scout
        const scout = army.find(u => u.config?.speed >= 2.5) || army[0];
        if (!scout) return;

        console.log(`[AI] ${this.personality} sending scout to (${x.toFixed(0)}, ${y.toFixed(0)})`);

        if (typeof MoveCommand !== 'undefined') {
            const cmd = new MoveCommand(scout, x, y);
            scout.issueCommand(cmd);
        }
    }

    /**
     * Get weakest enemy base for attack targeting
     * @returns {object|null} Weakest enemy base (expansion or main)
     */
    getWeakestEnemyBase() {
        if (!this.knownEnemyBases || this.knownEnemyBases.length === 0) {
            return null;
        }

        // Sort by building count (fewest = weakest)
        const sorted = [...this.knownEnemyBases].sort((a, b) =>
            (a.buildings?.length || 0) - (b.buildings?.length || 0)
        );

        // Prefer expansions over main base
        const expansion = sorted.find(b => b.isExpansion);
        return expansion || sorted[0];
    }

    // ========================================
    // DIFFICULTY-SCALED DECISIONS (Task 7)
    // ========================================

    /**
     * Get decision quality based on difficulty
     * @returns {number} Quality factor (0-1) where 1 = always optimal
     */
    getDecisionQuality() {
        const qualities = {
            'EASY': 0.40,    // 40% chance to make optimal choice
            'NORMAL': 0.70,  // 70% chance
            'HARD': 0.90,    // 90% chance
            'BRUTAL': 1.00   // 100% - always optimal
        };
        return qualities[this.difficulty] || 0.70;
    }

    /**
     * Check if AI can "cheat" and see through fog of war (BRUTAL only)
     * @returns {boolean} True if AI has map hacks
     */
    hasMapHacks() {
        return this.difficulty === 'BRUTAL' && this.difficultySettings?.cheats === true;
    }

    /**
     * Get enemy composition (with cheating for BRUTAL)
     * @returns {object|null} Enemy composition
     */
    getEnemyCompositionForDecision() {
        // BRUTAL difficulty can see all enemies
        if (this.hasMapHacks()) {
            return this.analyzeAllEnemyUnits();
        }

        // Other difficulties only know about scouted enemies
        return this.analyzeEnemyComposition();
    }

    /**
     * Analyze ALL enemy units (cheat mode for BRUTAL)
     * @returns {object|null} Full enemy composition
     */
    analyzeAllEnemyUnits() {
        if (!Game.instance?.unitManager) return null;

        const allEnemies = Game.instance.unitManager.units.filter(u =>
            !u.isDead() && u.owner !== this.player && this.player.isEnemy(u.owner)
        );

        if (allEnemies.length === 0) return null;

        const composition = {
            infantry: 0,
            vehicle: 0,
            aircraft: 0,
            total: allEnemies.length
        };

        for (const enemy of allEnemies) {
            const type = enemy.config?.type?.toUpperCase() || 'INFANTRY';
            if (type === 'INFANTRY') composition.infantry++;
            else if (type === 'VEHICLE') composition.vehicle++;
            else if (type === 'AIRCRAFT') composition.aircraft++;
            else composition.infantry++;
        }

        return composition;
    }

    // ========================================
    // EVENT SYSTEM INTEGRATION (Task 8)
    // ========================================

    /**
     * Subscribe to game events for event-driven updates
     * Call this after Game.instance is available
     */
    subscribeToEvents() {
        if (!Game.instance?.eventManager) {
            console.warn('[AI] Event manager not available, using polling fallback');
            return;
        }

        this.eventManager = Game.instance.eventManager;

        // Bind event handlers (preserve 'this' context)
        this._onEnemyRevealed = this.onEnemyRevealed.bind(this);
        this._onBuildingDestroyed = this.onBuildingDestroyed.bind(this);
        this._onUnitCreated = this.onUnitCreated.bind(this);
        this._onTiberiumDepleted = this.onTiberiumDepleted.bind(this);

        // Subscribe to relevant events
        this.eventManager.on('ENEMY_REVEALED', this._onEnemyRevealed);
        this.eventManager.on('BUILDING_DESTROYED', this._onBuildingDestroyed);
        this.eventManager.on('UNIT_CREATED', this._onUnitCreated);
        this.eventManager.on('TIBERIUM_DEPLETED', this._onTiberiumDepleted);

        console.log(`[AI] ${this.personality} subscribed to game events`);
    }

    /**
     * Unsubscribe from events (call in destroy())
     */
    unsubscribeFromEvents() {
        if (!this.eventManager) return;

        this.eventManager.off('ENEMY_REVEALED', this._onEnemyRevealed);
        this.eventManager.off('BUILDING_DESTROYED', this._onBuildingDestroyed);
        this.eventManager.off('UNIT_CREATED', this._onUnitCreated);
        this.eventManager.off('TIBERIUM_DEPLETED', this._onTiberiumDepleted);

        console.log(`[AI] ${this.personality} unsubscribed from game events`);
    }

    /**
     * Event handler: Enemy unit or building revealed
     * @param {object} data - Event data { enemy, discoveredBy }
     */
    onEnemyRevealed(data) {
        if (data.discoveredBy !== this.player) return;

        const enemy = data.enemy;
        if (!enemy) return;

        // Track revealed enemy
        if (enemy.type && typeof enemy.type === 'string') {
            // It's a building
            if (!this.knownEnemyBuildings.includes(enemy)) {
                this.knownEnemyBuildings.push(enemy);
                console.log(`[AI] ${this.personality} discovered enemy building: ${enemy.type}`);
            }
        } else {
            // It's a unit
            if (!this.knownEnemyUnits.includes(enemy)) {
                this.knownEnemyUnits.push(enemy);
            }
        }
    }

    /**
     * Event handler: Building destroyed
     * @param {object} data - Event data { building, destroyer }
     */
    onBuildingDestroyed(data) {
        const building = data.building;
        if (!building) return;

        // Remove from known enemies if it was tracked
        const idx = this.knownEnemyBuildings.indexOf(building);
        if (idx !== -1) {
            this.knownEnemyBuildings.splice(idx, 1);
        }

        // Update known enemy bases
        if (this.knownEnemyBases) {
            for (const base of this.knownEnemyBases) {
                if (base.buildings) {
                    const buildingIdx = base.buildings.indexOf(building);
                    if (buildingIdx !== -1) {
                        base.buildings.splice(buildingIdx, 1);
                    }
                }
            }
        }
    }

    /**
     * Event handler: Unit created
     * @param {object} data - Event data { unit, owner }
     */
    onUnitCreated(data) {
        if (data.owner !== this.player) return;

        // Invalidate unit cache to force refresh
        if (this._unitCache) {
            this._unitCache.lastUpdate = 0;
        }
    }

    /**
     * Event handler: Tiberium field depleted
     * @param {object} data - Event data { field, position }
     */
    onTiberiumDepleted(data) {
        // Signal harvesters to find new tiberium
        // This will be handled by manageHarvesters() on next update
        console.log(`[AI] ${this.personality} tiberium depleted at (${data.position?.x}, ${data.position?.y})`);
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
