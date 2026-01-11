/**
 * Player.js - Player representation for RTS game
 *
 * Handles both human and AI players with:
 * - Resource management (Tiberium, power)
 * - Unit/building ownership
 * - Tech tree progress
 * - Team/diplomacy relationships
 * - AI controller reference (for AI players)
 *
 * Human players are controlled via SelectionManager
 * AI players are controlled via AIController (Phase 4)
 */

class Player {
    /**
     * Create a new player
     * @param {object} config - Player configuration
     * @param {number} config.id - Unique player ID
     * @param {string} config.name - Player name
     * @param {boolean} config.isHuman - True for human players
     * @param {string} config.aiPersonality - AI personality type (if AI)
     * @param {number} config.team - Team ID for alliances
     * @param {object} config.color - Team color { r, g, b }
     */
    constructor(config) {
        // Identity
        this.id = config.id || 0;
        this.name = config.name || `Player ${this.id}`;
        this.isHuman = config.isHuman !== false;
        this.team = config.team !== undefined ? config.team : this.id; // Default: each player is own team

        // Faction assignment
        this.faction = config.faction || 'ALLIANCE';
        this.factionData = RTS_FACTIONS?.[this.faction] || RTS_FACTIONS?.ALLIANCE;

        // Color (for unit/building tinting)
        // Use faction color if available, otherwise default or config
        if (!config.color && this.factionData?.colorScheme) {
            this.color = this.factionData.colorScheme.primary;
        } else {
            this.color = config.color || this.getDefaultColor(this.id);
        }
        this.p5Color = null; // Cached p5.js color object

        // AI configuration
        this.aiPersonality = config.aiPersonality || null;
        this.aiDifficulty = config.aiDifficulty || 'NORMAL';
        this.aiController = null; // Set by AIController when initialized

        // Resources
        this.resources = {
            tiberium: RTS_RESOURCES?.STARTING_TIBERIUM || 5000,
            power: 0,          // Current power production
            powerConsumed: 0,  // Current power consumption
            maxStorage: RTS_RESOURCES?.MAX_STORAGE || 10000
        };

        // Owned entities (managed by UnitManager/BuildingManager)
        this.units = [];
        this.buildings = [];
        this.harvesters = []; // Quick access to harvesters

        // Tech tree progress
        this.techLevel = 1;
        // Note: Building unlocks are now handled dynamically by BuildingManager.meetsRequirements()
        // which checks if prerequisite buildings have been constructed.
        // This set tracks buildings that become available as prerequisites are met.
        // Initialize with faction-specific starting unlocks
        this.unlockedBuildings = new Set(this.factionData?.startingBuildings || ['CONSTRUCTION_YARD', 'POWER_PLANT']);
        this.unlockedUnits = new Set(this.factionData?.startingUnits || ['HARVESTER']);

        // Game state
        this.isDefeated = false;
        this.isSpectator = false;
        this.startPosition = null; // { x, y } spawn location

        // Statistics
        this.stats = {
            unitsCreated: 0,
            unitsLost: 0,
            unitsKilled: 0,
            buildingsConstructed: 0,
            buildingsLost: 0,
            buildingsDestroyed: 0,
            tiberiumCollected: 0,
            tiberiumSpent: 0
        };

        // AI Progression tracking (0-100 scale, used for decision-making)
        // Tracks player progress in various strategic areas
        this.progression = {
            base_defence_progress: 0,           // How many defensive buildings (0-100)
            base_expansion_progress: 0,         // Building count and spread (0-100)
            base_technology_progress: 0,        // Tech buildings constructed (0-100)
            map_exploration_progress: 0,        // Fog of war exploration (0-100)
            map_coverage_progress: 0,           // Total explored area (0-100)
            map_tiberium_fields_contained_progress: 0,  // Harvesters on tiberium (0-100)
            enemies_defeated_progress: 0,       // Enemy units killed (0-100)
            unit_army_progress: 0               // Army size/strength (0-100)
        };

        // Vision/fog of war
        this.exploredCells = new Set(); // "r,c" strings
        this.visibleCells = new Set();  // Currently visible

        console.log(`Player: Created ${this.isHuman ? 'human' : 'AI'} player "${this.name}" (ID: ${this.id}, Faction: ${this.faction})`);
    }

    /**
     * Get faction bonus for a specific bonus type
     * @param {string} bonusType - Type of bonus (buildingHealth, armor, speed, damage, resourceEfficiency)
     * @returns {number} Bonus multiplier (0 = no bonus, 0.10 = +10%, etc.)
     */
    getFactionBonus(bonusType) {
        return this.factionData?.bonuses?.[bonusType] || 0;
    }

    /**
     * Get default color for player ID
     * @param {number} id - Player ID
     * @returns {object} { r, g, b }
     */
    getDefaultColor(id) {
        const colors = [
            { r: 0, g: 150, b: 255 },     // Blue (Player 1 / Human)
            { r: 255, g: 50, b: 50 },     // Red (Enemy)
            { r: 50, g: 255, b: 50 },     // Green
            { r: 255, g: 200, b: 0 },     // Yellow
            { r: 200, g: 50, b: 255 },    // Purple
            { r: 255, g: 150, b: 50 },    // Orange
            { r: 50, g: 255, b: 200 },    // Cyan
            { r: 255, g: 100, b: 150 }    // Pink
        ];
        return colors[id % colors.length];
    }

    /**
     * Get p5.js color object for this player
     * @returns {p5.Color}
     */
    getP5Color() {
        if (!this.p5Color && typeof color === 'function') {
            this.p5Color = color(this.color.r, this.color.g, this.color.b);
        }
        return this.p5Color || { levels: [this.color.r, this.color.g, this.color.b, 255] };
    }

    // ========================================
    // RESOURCE MANAGEMENT
    // ========================================

    /**
     * Add resources (from harvester deposit)
     * @param {number} amount - Amount to add
     * @returns {number} Actual amount added (may be capped by storage)
     */
    addTiberium(amount) {
        const maxAdd = this.resources.maxStorage - this.resources.tiberium;
        const added = Math.min(amount, maxAdd);

        this.resources.tiberium += added;
        this.stats.tiberiumCollected += added;

        return added;
    }

    /**
     * Spend resources
     * @param {number} amount - Amount to spend
     * @returns {boolean} True if successful
     */
    spendTiberium(amount) {
        if (this.resources.tiberium >= amount) {
            this.resources.tiberium -= amount;
            this.stats.tiberiumSpent += amount;
            return true;
        }
        return false;
    }

    /**
     * Check if player can afford something
     * @param {number} cost - Cost to check
     * @returns {boolean}
     */
    canAfford(cost) {
        return this.resources.tiberium >= cost;
    }

    /**
     * Update power calculations
     * Called when buildings are added/removed
     */
    updatePower() {
        let production = 0;
        let consumption = 0;

        for (const building of this.buildings) {
            if (building.isDead() || !building.isComplete) continue;

            if (building.config) {
                production += building.config.powerOutput || 0;
                consumption += building.config.powerCost || 0;
            }
        }

        this.resources.power = production;
        this.resources.powerConsumed = consumption;
    }

    /**
     * Check if player has sufficient power
     * @returns {boolean}
     */
    hasPower() {
        return this.resources.power >= this.resources.powerConsumed;
    }

    /**
     * Get power status as ratio
     * @returns {number} 0-1 where 1 = full power
     */
    getPowerRatio() {
        if (this.resources.powerConsumed === 0) return 1;
        return Math.min(1, this.resources.power / this.resources.powerConsumed);
    }

    /**
     * Add power production (from completed power plant)
     * @param {number} amount
     */
    addPower(amount) {
        this.resources.power += amount;
    }

    /**
     * Remove power production (from destroyed power plant)
     * @param {number} amount
     */
    removePower(amount) {
        this.resources.power = Math.max(0, this.resources.power - amount);
    }

    // ========================================
    // UNIT/BUILDING MANAGEMENT
    // ========================================

    /**
     * Register a unit as owned by this player
     * @param {Unit} unit
     */
    addUnit(unit) {
        if (!this.units.includes(unit)) {
            this.units.push(unit);
            unit.owner = this;
            this.stats.unitsCreated++;

            // Track harvesters separately
            if (unit instanceof HarvesterUnit || unit.config?.type === 'harvester') {
                this.harvesters.push(unit);
            }
        }
    }

    /**
     * Remove a unit from this player's ownership
     * @param {Unit} unit
     */
    removeUnit(unit) {
        const index = this.units.indexOf(unit);
        if (index !== -1) {
            this.units.splice(index, 1);
            this.stats.unitsLost++;
        }

        // Remove from harvesters if applicable
        const harvIndex = this.harvesters.indexOf(unit);
        if (harvIndex !== -1) {
            this.harvesters.splice(harvIndex, 1);
        }
    }

    /**
     * Register a building as owned by this player
     * @param {Building} building
     */
    addBuilding(building) {
        if (!this.buildings.includes(building)) {
            this.buildings.push(building);
            building.owner = this;
            this.stats.buildingsConstructed++;
            this.updatePower();
        }
    }

    /**
     * Remove a building from this player's ownership
     * @param {Building} building
     */
    removeBuilding(building) {
        const index = this.buildings.indexOf(building);
        if (index !== -1) {
            this.buildings.splice(index, 1);
            this.stats.buildingsLost++;
            this.updatePower();
        }
    }

    /**
     * Get all combat units (excluding harvesters)
     * @returns {Unit[]}
     */
    getCombatUnits() {
        return this.units.filter(u =>
            !u.isDead() &&
            u.config?.type !== 'harvester' &&
            u.config?.canAttack !== false
        );
    }

    /**
     * Get total army value (sum of unit costs)
     * @returns {number}
     */
    getArmyValue() {
        return this.units.reduce((sum, unit) => {
            return sum + (unit.config?.cost || 0);
        }, 0);
    }

    // ========================================
    // TECH TREE
    // ========================================

    /**
     * Unlock a building type
     * @param {string} buildingType
     */
    unlockBuilding(buildingType) {
        this.unlockedBuildings.add(buildingType);
    }

    /**
     * Unlock a unit type
     * @param {string} unitType
     */
    unlockUnit(unitType) {
        this.unlockedUnits.add(unitType);
    }

    /**
     * Check if player can build a building type
     * @param {string} buildingType
     * @returns {boolean}
     */
    canBuildBuilding(buildingType) {
        return this.unlockedBuildings.has(buildingType);
    }

    /**
     * Check if player can train a unit type
     * @param {string} unitType
     * @returns {boolean}
     */
    canTrainUnit(unitType) {
        return this.unlockedUnits.has(unitType);
    }

    /**
     * Update unlocked buildings and units based on what has been constructed.
     * Called when a building completes construction.
     *
     * Tech Tree:
     * - Power Plant: No requirements (basic building)
     * - Barracks: Requires Power Plant
     * - Refinery: Requires Power Plant
     * - War Factory: Requires Barracks + Power Plant
     * - Guard Tower: Requires Barracks
     * - Tech Center: Requires War Factory
     * - Silo: Requires Refinery
     */
    updateUnlocksFromBuildings() {
        // Get completed building types
        const completedTypes = new Set();
        for (const building of this.buildings) {
            if (building.isComplete && !building.isDead()) {
                completedTypes.add(building.type);
            }
        }

        // Always available with construction yard
        if (completedTypes.has('construction_yard')) {
            this.unlockedBuildings.add('power_plant');
        }

        // Power Plant unlocks Barracks and Refinery
        if (completedTypes.has('power_plant')) {
            this.unlockedBuildings.add('barracks');
            this.unlockedBuildings.add('refinery');
        }

        // Barracks unlocks Guard Tower and infantry units
        if (completedTypes.has('barracks')) {
            this.unlockedBuildings.add('guard_tower');
            this.unlockedUnits.add('infantry');
            this.unlockedUnits.add('rifleman');
            this.unlockedUnits.add('grenadier');
        }

        // Barracks + Power Plant unlocks War Factory
        if (completedTypes.has('barracks') && completedTypes.has('power_plant')) {
            this.unlockedBuildings.add('war_factory');
        }

        // Refinery unlocks Silo
        if (completedTypes.has('refinery')) {
            this.unlockedBuildings.add('silo');
        }

        // War Factory unlocks Tech Center and vehicle units
        if (completedTypes.has('war_factory')) {
            this.unlockedBuildings.add('tech_center');
            this.unlockedUnits.add('tank');
            this.unlockedUnits.add('apc');
        }

        // Tech Center unlocks advanced units
        if (completedTypes.has('tech_center')) {
            this.unlockedUnits.add('mammoth_tank');
            this.unlockedUnits.add('rocket_soldier');
        }
    }

    /**
     * Advance tech level
     */
    advanceTechLevel() {
        this.techLevel++;

        // Unlock new buildings/units based on tech level
        // This would be defined in TechTree.js (Phase 3)
        console.log(`Player ${this.name}: Advanced to Tech Level ${this.techLevel}`);
    }

    // ========================================
    // DIPLOMACY
    // ========================================

    /**
     * Check if another player is an enemy
     * @param {Player} other
     * @returns {boolean}
     */
    isEnemy(other) {
        if (!other) return false;
        return this.team !== other.team;
    }

    /**
     * Check if another player is an ally
     * @param {Player} other
     * @returns {boolean}
     */
    isAlly(other) {
        if (!other) return false;
        return this.team === other.team && this.id !== other.id;
    }

    // ========================================
    // GAME STATE
    // ========================================

    /**
     * Check defeat conditions
     * @returns {boolean} True if player is defeated
     */
    checkDefeat() {
        // Defeated if construction yard is destroyed (can't rebuild anything)
        // OR all buildings are destroyed AND all units are gone

        // Check for construction yard
        const hasConstructionYard = this.buildings.some(b =>
            b.type === 'construction_yard' && !b.isDead()
        );

        // If construction yard is gone, player is defeated
        if (!hasConstructionYard && this.stats.unitsCreated > 0) {
            this.isDefeated = true;
            return true;
        }

        // Fallback: also defeated if no buildings and no units
        const hasBuildings = this.buildings.some(b => !b.isDead());
        const hasUnits = this.units.some(u => !u.isDead());

        if (!hasBuildings && !hasUnits && this.stats.unitsCreated > 0) {
            this.isDefeated = true;
            return true;
        }

        return false;
    }

    /**
     * Get spawn point for new units
     * @param {Building} productionBuilding - The building producing the unit
     * @returns {object} { x, y } spawn position
     */
    getSpawnPoint(productionBuilding) {
        if (productionBuilding && productionBuilding.rallyPoint) {
            return productionBuilding.rallyPoint;
        }

        if (productionBuilding) {
            // Spawn near building
            const offset = 50;
            return {
                x: productionBuilding.x + offset,
                y: productionBuilding.y + offset
            };
        }

        // Fallback to start position
        return this.startPosition || { x: 100, y: 100 };
    }

    // ========================================
    // UPDATE
    // ========================================

    /**
     * Update player progression values based on current game state
     * Used by AI for decision-making
     */
    updateProgression() {
        // Base defence progress - based on defensive buildings
        const defensiveBuildings = this.buildings.filter(b =>
            !b.isDead() && (b.type === 'guard_tower' || b.type === 'sam_site' ||
                           b.type === 'obelisk' || b.type === 'turret' ||
                           b.type === 'wall' || b.type === 'gate')
        ).length;
        this.progression.base_defence_progress = Math.min(100, defensiveBuildings * 10);

        // Base expansion progress - based on total buildings
        const totalBuildings = this.buildings.filter(b => !b.isDead()).length;
        this.progression.base_expansion_progress = Math.min(100, totalBuildings * 8);

        // Base technology progress - based on tech buildings
        const techBuildings = this.buildings.filter(b =>
            !b.isDead() && (b.type === 'tech_center' || b.type === 'silo' ||
                           b.type === 'laboratory' || b.type === 'power_plant')
        ).length;
        this.progression.base_technology_progress = Math.min(100, techBuildings * 15);

        // Map exploration progress - based on explored cells
        const gridSize = 80 * 80; // Assumed grid size
        this.progression.map_exploration_progress = Math.min(100,
            (this.exploredCells.size / gridSize) * 100
        );

        // Map coverage progress - similar to exploration
        this.progression.map_coverage_progress = this.progression.map_exploration_progress;

        // Tiberium fields contained - based on harvesters
        const harvestersOnTiberium = this.harvesters.filter(h => !h.isDead()).length;
        this.progression.map_tiberium_fields_contained_progress = Math.min(100,
            harvestersOnTiberium * 20
        );

        // Enemies defeated - based on units killed
        this.progression.enemies_defeated_progress = Math.min(100,
            this.stats.unitsKilled * 2
        );

        // Unit army progress - based on combat units (not harvesters)
        const combatUnits = this.units.filter(u =>
            !u.isDead() && u.config && u.config.type &&
            u.config.type.toUpperCase() !== 'HARVESTER'
        ).length;
        // 10 combat units = 100% army progress
        this.progression.unit_army_progress = Math.min(100, combatUnits * 10);
    }

    /**
     * Update player state
     * @param {number} deltaTime - Time since last update
     */
    update(deltaTime) {
        // Remove dead units/buildings from lists
        this.units = this.units.filter(u => !u.isDead());
        this.buildings = this.buildings.filter(b => !b.isDead());
        this.harvesters = this.harvesters.filter(h => !h.isDead());

        // Update progression values for AI decision-making
        this.updateProgression();

        // Update AI if applicable
        if (!this.isHuman && this.aiController) {
            this.aiController.update(deltaTime);
        }

        // Check defeat
        this.checkDefeat();
    }

    // ========================================
    // SERIALIZATION
    // ========================================

    /**
     * Export player state for saving
     * @returns {object}
     */
    toJSON() {
        return {
            id: this.id,
            name: this.name,
            isHuman: this.isHuman,
            team: this.team,
            color: this.color,
            aiPersonality: this.aiPersonality,
            aiDifficulty: this.aiDifficulty,
            resources: { ...this.resources },
            techLevel: this.techLevel,
            unlockedBuildings: Array.from(this.unlockedBuildings),
            unlockedUnits: Array.from(this.unlockedUnits),
            stats: { ...this.stats },
            isDefeated: this.isDefeated,
            startPosition: this.startPosition
        };
    }

    /**
     * Load player state from saved data
     * @param {object} data
     */
    fromJSON(data) {
        this.resources = { ...data.resources };
        this.techLevel = data.techLevel;
        this.unlockedBuildings = new Set(data.unlockedBuildings);
        this.unlockedUnits = new Set(data.unlockedUnits);
        this.stats = { ...data.stats };
        this.isDefeated = data.isDefeated;
        this.startPosition = data.startPosition;
    }

    // ========================================
    // STATIC BUILDER CLASS
    // ========================================

    /**
     * Fluent builder for creating Player instances
     *
     * Usage:
     *   const player = Player.Builder.create()
     *       .withId(1)
     *       .withName('Commander')
     *       .asHuman()
     *       .onTeam(0)
     *       .withColor(0, 150, 255)
     *       .withStartingResources(5000)
     *       .build();
     */
    static Builder = class {
        constructor() {
            this._reset();
        }

        _reset() {
            this._id = 0;
            this._name = 'Player';
            this._isHuman = true;
            this._team = 0;
            this._color = { r: 0, g: 150, b: 255 };
            this._aiPersonality = null;
            this._aiDifficulty = 'NORMAL';
            this._startingTiberium = 5000;
            this._startPosition = null;
            this._unlockedBuildings = null;
            this._unlockedUnits = null;
            return this;
        }

        withId(id) {
            this._id = id;
            return this;
        }

        withName(name) {
            this._name = name;
            return this;
        }

        asHuman() {
            this._isHuman = true;
            this._aiPersonality = null;
            return this;
        }

        asAI(personality = 'BALANCED') {
            this._isHuman = false;
            this._aiPersonality = personality.toUpperCase();
            return this;
        }

        withAIDifficulty(difficulty) {
            this._aiDifficulty = difficulty.toUpperCase();
            return this;
        }

        onTeam(team) {
            this._team = team;
            return this;
        }

        withColor(r, g, b) {
            this._color = { r, g, b };
            return this;
        }

        withStartingResources(amount) {
            this._startingTiberium = amount;
            return this;
        }

        atStartPosition(x, y) {
            this._startPosition = { x, y };
            return this;
        }

        withUnlockedBuildings(buildings) {
            this._unlockedBuildings = buildings;
            return this;
        }

        withUnlockedUnits(units) {
            this._unlockedUnits = units;
            return this;
        }

        build() {
            const player = new Player({
                id: this._id,
                name: this._name,
                isHuman: this._isHuman,
                team: this._team,
                color: this._color,
                aiPersonality: this._aiPersonality,
                aiDifficulty: this._aiDifficulty
            });

            player.resources.tiberium = this._startingTiberium;

            if (this._startPosition) {
                player.startPosition = this._startPosition;
            }

            if (this._unlockedBuildings) {
                player.unlockedBuildings = new Set(this._unlockedBuildings);
            }

            if (this._unlockedUnits) {
                player.unlockedUnits = new Set(this._unlockedUnits);
            }

            return player;
        }

        static create() {
            return new Player.Builder();
        }

        static human(id = 0, name = 'Player') {
            return new Player.Builder()
                .withId(id)
                .withName(name)
                .asHuman()
                .onTeam(0)
                .withColor(0, 150, 255)
                .build();
        }

        static ai(id = 1, personality = 'BALANCED') {
            return new Player.Builder()
                .withId(id)
                .withName('AI Commander')
                .asAI(personality)
                .onTeam(1)
                .withColor(255, 50, 50)
                .build();
        }
    };
}

// Make available globally
if (typeof window !== 'undefined') {
    window.Player = Player;
}
