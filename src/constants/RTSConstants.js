/**
 * RTSConstants.js - Central configuration for RTS game balance and systems
 *
 * This file defines all tunable values for the C&C3-style RTS game including:
 * - Grid and map settings
 * - Resource (Tiberium) system
 * - Unit stats and costs
 * - Building stats and costs
 * - AI personality weights
 * - Graphics quality settings
 */

// ===========================================
// GAME STATES
// ===========================================
const RTSGameState = {
    LOADING: 'LOADING',
    MENU: 'MENU',
    NEW_GAME: 'NEW_GAME',
    SETTINGS: 'SETTINGS',
    PLAYING: 'PLAYING',
    PAUSED: 'PAUSED',
    VICTORY: 'VICTORY',
    DEFEAT: 'DEFEAT'
};

// ===========================================
// GRID & MAP SETTINGS
// ===========================================
const RTS_GRID = {
    CELL_SIZE: 32,              // Smaller cells for more strategic depth
    DEFAULT_COLS: 64,           // Map width in cells
    DEFAULT_ROWS: 64,           // Map height in cells
    MIN_MAP_SIZE: 32,           // Minimum map dimension
    MAX_MAP_SIZE: 128,          // Maximum map dimension

    // Building placement
    CONSTRUCTION_RADIUS: 5,     // Must build within N cells of existing structure
    STARTING_AREA_SIZE: 8,      // Guaranteed buildable area at spawn

    // Spawn points
    MIN_SPAWN_DISTANCE: 40,     // Minimum cells between player spawns
};

// ===========================================
// RESOURCE SYSTEM (TIBERIUM)
// ===========================================
const RTS_RESOURCES = {
    // Starting resources
    STARTING_TIBERIUM: 5000,
    STARTING_POWER: 0,          // Power is generated, not stored

    // Tiberium fields
    TIBERIUM_PER_CELL: 1000,    // Max tiberium in one field cell
    TIBERIUM_REGEN_RATE: 0.5,   // Units per second regeneration
    FIELD_MIN_SIZE: 3,          // Minimum cells per field
    FIELD_MAX_SIZE: 8,          // Maximum cells per field
    FIELDS_PER_PLAYER: 2,       // Guaranteed fields near each spawn

    // Tiberium types
    GREEN_TIBERIUM_VALUE: 1,    // Multiplier for green tiberium
    BLUE_TIBERIUM_VALUE: 2,     // Multiplier for blue (rare) tiberium
    BLUE_TIBERIUM_CHANCE: 0.15, // Chance for blue tiberium field

    // Harvester settings
    HARVESTER_CAPACITY: 1000,   // Max tiberium a harvester can carry
    HARVEST_RATE: 50,           // Tiberium per second when harvesting
    UNLOAD_TIME: 3,             // Seconds to unload at refinery

    // Storage
    BASE_STORAGE: 5000,         // Default storage without silos
    SILO_STORAGE: 2000,         // Additional storage per silo
};

// ===========================================
// UNIT CONSTANTS
// ===========================================
const RTS_UNIT_STATES = {
    IDLE: 'IDLE',
    MOVING: 'MOVING',
    ATTACKING: 'ATTACKING',
    HARVESTING: 'HARVESTING',
    RETURNING: 'RETURNING',
    UNLOADING: 'UNLOADING',
    CONSTRUCTING: 'CONSTRUCTING',
    DYING: 'DYING'
};

const RTS_UNIT_STANCES = {
    AGGRESSIVE: 'AGGRESSIVE',   // Seeks enemies in sight range
    DEFENSIVE: 'DEFENSIVE',     // Only fights if attacked
    HOLD_POSITION: 'HOLD_POSITION' // No movement, attacks in range
};

// Unit type categories
const RTS_UNIT_TYPES = {
    INFANTRY: 'INFANTRY',
    VEHICLE: 'VEHICLE',
    AIRCRAFT: 'AIRCRAFT',
    HARVESTER: 'HARVESTER'
};

// ===========================================
// UNIT STATS
// ===========================================
const RTS_UNITS = {
    // INFANTRY
    RIFLEMAN: {
        type: RTS_UNIT_TYPES.INFANTRY,
        name: 'Rifleman',
        cost: 150,
        buildTime: 3,           // Seconds
        health: 100,
        armor: 0,
        speed: 1.5,
        sightRange: 6,
        attackRange: 4,
        damage: 15,
        fireRate: 30,           // Frames between shots
        canGarrison: true,
        tier: 1,
        prerequisites: ['BARRACKS']
    },

    ROCKET_SOLDIER: {
        type: RTS_UNIT_TYPES.INFANTRY,
        name: 'Rocket Soldier',
        cost: 300,
        buildTime: 5,
        health: 80,
        armor: 0,
        speed: 1.2,
        sightRange: 7,
        attackRange: 5,
        damage: 50,
        fireRate: 90,
        bonusVsVehicle: 1.5,    // 50% bonus vs vehicles
        bonusVsAir: 2.0,        // 100% bonus vs aircraft
        canGarrison: true,
        tier: 1,
        prerequisites: ['BARRACKS']
    },

    ENGINEER: {
        type: RTS_UNIT_TYPES.INFANTRY,
        name: 'Engineer',
        cost: 500,
        buildTime: 8,
        health: 50,
        armor: 0,
        speed: 1.0,
        sightRange: 4,
        attackRange: 0,         // Cannot attack
        damage: 0,
        canCapture: true,       // Can capture enemy buildings
        canRepair: true,        // Can repair friendly buildings
        tier: 1,
        prerequisites: ['BARRACKS']
    },

    COMMANDO: {
        type: RTS_UNIT_TYPES.INFANTRY,
        name: 'Commando',
        cost: 2000,
        buildTime: 20,
        health: 200,
        armor: 0.2,
        speed: 2.0,
        sightRange: 8,
        attackRange: 5,
        damage: 100,
        fireRate: 45,
        canPlaceC4: true,       // Instant kill buildings
        isHero: true,
        tier: 3,
        prerequisites: ['TECH_CENTER']
    },

    // VEHICLES
    SCOUT_BUGGY: {
        type: RTS_UNIT_TYPES.VEHICLE,
        name: 'Scout Buggy',
        cost: 400,
        buildTime: 6,
        health: 150,
        armor: 0.1,
        speed: 3.5,
        sightRange: 10,
        attackRange: 4,
        damage: 10,
        fireRate: 10,           // Fast firing
        crushesInfantry: false,
        tier: 1,
        prerequisites: ['WAR_FACTORY']
    },

    TANK: {
        type: RTS_UNIT_TYPES.VEHICLE,
        name: 'Battle Tank',
        cost: 800,
        buildTime: 10,
        health: 400,
        armor: 0.4,
        speed: 2.0,
        sightRange: 6,
        attackRange: 5,
        damage: 80,
        fireRate: 60,
        crushesInfantry: true,
        tier: 2,
        prerequisites: ['WAR_FACTORY', 'ARMORY']
    },

    ARTILLERY: {
        type: RTS_UNIT_TYPES.VEHICLE,
        name: 'Artillery',
        cost: 1200,
        buildTime: 15,
        health: 200,
        armor: 0.2,
        speed: 1.2,
        sightRange: 4,
        attackRange: 10,        // Very long range
        damage: 150,
        fireRate: 120,
        splashRadius: 2,        // Area damage
        mustDeploy: true,       // Must stop to fire
        tier: 2,
        prerequisites: ['WAR_FACTORY', 'ARMORY']
    },

    HEAVY_TANK: {
        type: RTS_UNIT_TYPES.VEHICLE,
        name: 'Mammoth Tank',
        cost: 2500,
        buildTime: 25,
        health: 1000,
        armor: 0.6,
        speed: 1.0,
        sightRange: 7,
        attackRange: 6,
        damage: 120,
        fireRate: 75,
        dualWeapon: true,       // Can fire at 2 targets
        crushesInfantry: true,
        selfHeal: 0.5,          // HP per second when damaged < 50%
        tier: 3,
        prerequisites: ['WAR_FACTORY', 'TECH_CENTER']
    },

    // HARVESTERS
    HARVESTER: {
        type: RTS_UNIT_TYPES.HARVESTER,
        name: 'Harvester',
        cost: 1400,
        buildTime: 12,
        health: 600,
        armor: 0.3,
        speed: 2.8,             // Faster movement
        sightRange: 5,
        attackRange: 0,
        damage: 0,
        capacity: 1000,
        harvestRate: 150,       // Faster harvesting
        unloadRate: 200,        // Fast unloading at refinery
        tier: 1,
        prerequisites: ['REFINERY']
    },

    // AIRCRAFT
    ORCA: {
        type: RTS_UNIT_TYPES.AIRCRAFT,
        name: 'Orca Fighter',
        cost: 1100,
        buildTime: 14,
        health: 200,
        armor: 0.1,
        speed: 4.0,
        sightRange: 8,
        attackRange: 6,
        damage: 100,
        fireRate: 90,
        ammo: 4,                // Must return to reload
        tier: 2,
        prerequisites: ['AIRFIELD']
    },

    APACHE: {
        type: RTS_UNIT_TYPES.AIRCRAFT,
        name: 'Apache Gunship',
        cost: 1500,
        buildTime: 18,
        health: 300,
        armor: 0.2,
        speed: 3.5,
        sightRange: 9,
        attackRange: 7,
        damage: 60,
        fireRate: 20,           // Rapid fire chaingun
        ammo: 8,
        tier: 2,
        prerequisites: ['AIRFIELD']
    },

    // SPECIAL VEHICLES
    STEALTH_TANK: {
        type: RTS_UNIT_TYPES.VEHICLE,
        name: 'Stealth Tank',
        cost: 1800,
        buildTime: 18,
        health: 250,
        armor: 0.3,
        speed: 3.0,
        sightRange: 7,
        attackRange: 5,
        damage: 90,
        fireRate: 75,
        canCloak: true,         // Invisible when not attacking
        tier: 3,
        prerequisites: ['WAR_FACTORY', 'TECH_CENTER']
    },
};

// ===========================================
// VETERANCY SYSTEM
// ===========================================
const RTS_VETERANCY = {
    // XP thresholds for each rank
    RANKS: {
        ROOKIE: { xp: 0, name: 'Rookie' },
        VETERAN: { xp: 100, name: 'Veteran' },
        ELITE: { xp: 300, name: 'Elite' },
        HEROIC: { xp: 700, name: 'Heroic' }
    },

    // Stat bonuses per rank
    BONUSES: {
        ROOKIE:  { damage: 1.0, armor: 1.0, speed: 1.0, rof: 1.0, sight: 1.0 },
        VETERAN: { damage: 1.25, armor: 1.1, speed: 1.05, rof: 1.1, sight: 1.1 },
        ELITE:   { damage: 1.5, armor: 1.25, speed: 1.1, rof: 1.2, sight: 1.2 },
        HEROIC:  { damage: 2.0, armor: 1.5, speed: 1.15, rof: 1.3, sight: 1.3, selfHeal: 0.02 }
    },

    // XP awarded per kill (multiplier of victim cost)
    XP_PER_KILL_MULT: 0.25
};

// ===========================================
// BUILDING STATS
// ===========================================
const RTS_BUILDINGS = {
    // CORE BUILDINGS
    CONSTRUCTION_YARD: {
        name: 'Construction Yard',
        cost: 0,                // Starting building
        buildTime: 0,
        health: 3000,
        armor: 0.5,
        power: 0,               // No power consumption
        footprint: { w: 3, h: 3 },
        isCore: true,           // Loss = defeat
        tier: 0,
        prerequisites: [],
        visionRange: 200        // Moderate vision (6 cells)
    },

    POWER_PLANT: {
        name: 'Power Plant',
        cost: 300,
        buildTime: 8,
        health: 500,
        armor: 0.2,
        power: 100,             // Positive = generates power
        footprint: { w: 2, h: 2 },
        tier: 1,
        prerequisites: []
    },

    REFINERY: {
        name: 'Refinery',
        cost: 2000,
        buildTime: 15,
        health: 1000,
        armor: 0.3,
        power: -20,             // Consumes power
        footprint: { w: 3, h: 2 },
        spawnsHarvester: true,
        storage: 1000,
        tier: 1,
        prerequisites: ['POWER_PLANT']
    },

    TIBERIUM_SILO: {
        name: 'Tiberium Silo',
        cost: 500,
        buildTime: 6,
        health: 300,
        armor: 0.1,
        power: -5,
        footprint: { w: 1, h: 1 },
        storage: 2000,
        tier: 1,
        prerequisites: ['REFINERY']
    },

    // PRODUCTION BUILDINGS
    BARRACKS: {
        name: 'Barracks',
        cost: 500,
        buildTime: 10,
        health: 800,
        armor: 0.3,
        power: -10,
        footprint: { w: 2, h: 2 },
        produces: [RTS_UNIT_TYPES.INFANTRY],
        tier: 1,
        prerequisites: ['POWER_PLANT']
    },

    WAR_FACTORY: {
        name: 'War Factory',
        cost: 2000,
        buildTime: 20,
        health: 1500,
        armor: 0.4,
        power: -30,
        footprint: { w: 3, h: 3 },
        produces: [RTS_UNIT_TYPES.VEHICLE, RTS_UNIT_TYPES.HARVESTER],
        tier: 1,
        prerequisites: ['POWER_PLANT', 'REFINERY']
    },

    AIRFIELD: {
        name: 'Airfield',
        cost: 1500,
        buildTime: 18,
        health: 1000,
        armor: 0.2,
        power: -25,
        footprint: { w: 3, h: 2 },
        produces: [RTS_UNIT_TYPES.AIRCRAFT],
        aircraftPads: 4,
        tier: 2,
        prerequisites: ['WAR_FACTORY']
    },

    // TECH BUILDINGS
    ARMORY: {
        name: 'Armory',
        cost: 1000,
        buildTime: 15,
        health: 600,
        armor: 0.3,
        power: -15,
        footprint: { w: 2, h: 2 },
        unlocksTier: 2,
        tier: 2,
        prerequisites: ['BARRACKS']
    },

    TECH_CENTER: {
        name: 'Tech Center',
        cost: 3000,
        buildTime: 30,
        health: 800,
        armor: 0.3,
        power: -50,
        footprint: { w: 2, h: 2 },
        unlocksTier: 3,
        tier: 3,
        prerequisites: ['ARMORY', 'WAR_FACTORY']
    },

    RADAR: {
        name: 'Radar Station',
        cost: 800,
        buildTime: 12,
        health: 500,
        armor: 0.2,
        power: -30,
        footprint: { w: 2, h: 2 },
        enablesMinimap: true,
        revealsShroud: 3,       // Cells revealed around all units
        tier: 1,
        prerequisites: ['REFINERY']
    },

    // DEFENSIVE BUILDINGS
    GUARD_TOWER: {
        name: 'Guard Tower',
        cost: 500,
        buildTime: 8,
        health: 400,
        armor: 0.4,
        power: -10,
        footprint: { w: 1, h: 1 },
        attackRange: 5,
        damage: 20,
        fireRate: 20,
        tier: 1,
        prerequisites: ['BARRACKS']
    },

    SAM_SITE: {
        name: 'SAM Site',
        cost: 800,
        buildTime: 12,
        health: 500,
        armor: 0.3,
        power: -15,
        footprint: { w: 1, h: 1 },
        attackRange: 8,
        damage: 100,
        fireRate: 60,
        antiAirOnly: true,
        tier: 2,
        prerequisites: ['ARMORY']
    },

    WALL: {
        name: 'Wall',
        cost: 50,
        buildTime: 1,
        health: 200,
        armor: 0.5,
        power: 0,
        footprint: { w: 1, h: 1 },
        tier: 1,
        prerequisites: ['BARRACKS']
    },
};

// ===========================================
// AI PERSONALITIES
// ===========================================
const RTS_AI_PERSONALITY = {
    TURTLE: 'TURTLE',
    RUSHER: 'RUSHER',
    MIDGAME_RUSHER: 'MIDGAME_RUSHER',
    EXPLORER: 'EXPLORER',
    EXPANDER: 'EXPANDER'
};

const RTS_AI_WEIGHTS = {
    TURTLE: {
        name: 'Turtle',
        description: 'Focuses on base defense and economy. Rarely attacks, but hard to crack.',
        economy: 1.5,
        defense: 1.8,
        expansion: 0.7,
        aggression: 0.3,
        scouting: 0.9,
        tech: 1.4,
        attackThreshold: 2.0,       // Only attacks with 2x enemy strength
        preferredUnits: ['TANK', 'ARTILLERY', 'HEAVY_TANK'],
        buildOrder: ['POWER_PLANT', 'REFINERY', 'BARRACKS', 'GUARD_TOWER', 'WAR_FACTORY', 'GUARD_TOWER', 'ARMORY']
    },

    RUSHER: {
        name: 'Rusher',
        description: 'Aggressive early game. Attacks quickly with cheap units.',
        economy: 0.6,
        defense: 0.3,
        expansion: 0.4,
        aggression: 2.0,
        scouting: 1.2,
        tech: 0.2,
        attackThreshold: 0.8,       // Attacks even when slightly weaker
        rushTiming: 180,            // Attacks at 3 minutes (180 seconds)
        preferredUnits: ['RIFLEMAN', 'SCOUT_BUGGY'],
        buildOrder: ['POWER_PLANT', 'BARRACKS', 'BARRACKS', 'REFINERY', 'WAR_FACTORY']
    },

    MIDGAME_RUSHER: {
        name: 'Delayed Striker',
        description: 'Builds economy first, then attacks with elite units at mid-game.',
        economy: 1.2,
        defense: 0.8,
        expansion: 0.5,
        aggression: 1.5,
        scouting: 1.0,
        tech: 1.3,
        attackThreshold: 1.0,
        rushTiming: 480,            // Attacks at 8 minutes
        waitForTier: 2,             // Waits until Tier 2 tech
        preferredUnits: ['TANK', 'ROCKET_SOLDIER', 'ARTILLERY'],
        buildOrder: ['POWER_PLANT', 'REFINERY', 'BARRACKS', 'WAR_FACTORY', 'ARMORY', 'POWER_PLANT']
    },

    EXPLORER: {
        name: 'Explorer',
        description: 'Heavy scouting, map control, information warfare.',
        economy: 1.0,
        defense: 0.6,
        expansion: 1.0,
        aggression: 0.8,
        scouting: 2.0,
        tech: 1.0,
        attackThreshold: 1.2,
        preferredUnits: ['SCOUT_BUGGY', 'ORCA', 'RIFLEMAN'],
        buildOrder: ['POWER_PLANT', 'REFINERY', 'BARRACKS', 'WAR_FACTORY', 'RADAR', 'AIRFIELD'],
        scoutingInterval: 30        // Sends scouts every 30 seconds
    },

    EXPANDER: {
        name: 'Expander',
        description: 'Multiple bases, territorial control, economic victory.',
        economy: 1.3,
        defense: 0.7,
        expansion: 2.0,
        aggression: 0.8,
        scouting: 1.5,
        tech: 1.1,
        attackThreshold: 1.1,
        idealBaseCount: 3,
        expansionThreshold: 0.4,    // Expands when resources at 40%
        preferredUnits: ['HARVESTER', 'TANK', 'GUARD_TOWER'],
        buildOrder: ['POWER_PLANT', 'REFINERY', 'REFINERY', 'BARRACKS', 'WAR_FACTORY', 'RADAR']
    }
};

// ===========================================
// AI DIFFICULTY MODIFIERS
// ===========================================
const RTS_AI_DIFFICULTY = {
    EASY: {
        name: 'Easy',
        resourceMultiplier: 0.8,    // AI gets 80% resources
        buildSpeedMultiplier: 0.8,  // AI builds 20% slower
        decisionDelay: 2.0,         // AI thinks slower
        cheats: false
    },
    NORMAL: {
        name: 'Normal',
        resourceMultiplier: 1.0,
        buildSpeedMultiplier: 1.0,
        decisionDelay: 1.0,
        cheats: false
    },
    HARD: {
        name: 'Hard',
        resourceMultiplier: 1.2,
        buildSpeedMultiplier: 1.2,
        decisionDelay: 0.5,
        cheats: false
    },
    BRUTAL: {
        name: 'Brutal',
        resourceMultiplier: 1.5,
        buildSpeedMultiplier: 1.5,
        decisionDelay: 0.2,
        cheats: true,               // Can see through fog
        bonusResources: 500         // Extra starting resources
    }
};

// ===========================================
// GRAPHICS QUALITY SETTINGS
// ===========================================
const RTS_GRAPHICS_QUALITY = {
    LOW: {
        name: 'Low',
        shapeVertices: 4,           // Squares only
        shadowEnabled: false,
        particleDensity: 0.5,
        animationFrameSkip: 2,      // Skip every other frame
        fogQuality: 'simple'        // Binary fog
    },
    MEDIUM: {
        name: 'Medium',
        shapeVertices: 8,           // Octagons
        shadowEnabled: true,
        particleDensity: 0.75,
        animationFrameSkip: 1,
        fogQuality: 'gradient'      // Smooth fog edges
    },
    HIGH: {
        name: 'High',
        shapeVertices: 16,          // Smooth circles
        shadowEnabled: true,
        particleDensity: 1.0,
        animationFrameSkip: 0,
        fogQuality: 'gradient',
        reuleauxPolygons: true      // Full Reuleaux shapes
    }
};

// ===========================================
// PERFORMANCE LIMITS
// ===========================================
const RTS_PERFORMANCE = {
    MAX_UNITS_PER_PLAYER: 100,
    MAX_BUILDINGS_PER_PLAYER: 50,
    MAX_PROJECTILES: 500,
    MAX_PARTICLES: 1000,
    SPATIAL_PARTITION_CELL_SIZE: 128,   // QuadTree cell size
    PATH_CACHE_SIZE: 100,
    AI_DECISION_INTERVAL: 60,           // Frames between AI decisions
};

// ===========================================
// CONTROL GROUPS
// ===========================================
const RTS_CONTROLS = {
    MAX_CONTROL_GROUPS: 10,             // Groups 0-9
    MAX_SELECTION: 50,                  // Max units selectable at once
    DOUBLE_CLICK_TIME: 300,             // MS for double-click detection
    BOX_SELECT_MIN_SIZE: 10,            // Pixels before box select activates
};

// ===========================================
// MAP GENERATION
// ===========================================
const RTS_MAP_GEN = {
    NOISE_SCALE: 0.08,                  // Perlin noise scale for terrain
    TIBERIUM_NOISE_SCALE: 0.12,         // Noise scale for resource placement
    CLIFF_THRESHOLD: 0.75,              // Noise value above this = cliff
    WATER_THRESHOLD: 0.2,               // Noise value below this = water
    MIN_BUILDABLE_PERCENT: 0.6,         // Minimum 60% of map must be buildable
};

// ===========================================
// EXPORT FOR GLOBAL ACCESS
// ===========================================
if (typeof window !== 'undefined') {
    window.RTSGameState = RTSGameState;
    window.RTS_GRID = RTS_GRID;
    window.RTS_RESOURCES = RTS_RESOURCES;
    window.RTS_UNIT_STATES = RTS_UNIT_STATES;
    window.RTS_UNIT_STANCES = RTS_UNIT_STANCES;
    window.RTS_UNIT_TYPES = RTS_UNIT_TYPES;
    window.RTS_UNITS = RTS_UNITS;
    window.RTS_VETERANCY = RTS_VETERANCY;
    window.RTS_BUILDINGS = RTS_BUILDINGS;
    window.RTS_AI_PERSONALITY = RTS_AI_PERSONALITY;
    window.RTS_AI_WEIGHTS = RTS_AI_WEIGHTS;
    window.RTS_AI_DIFFICULTY = RTS_AI_DIFFICULTY;
    window.RTS_GRAPHICS_QUALITY = RTS_GRAPHICS_QUALITY;
    window.RTS_PERFORMANCE = RTS_PERFORMANCE;
    window.RTS_CONTROLS = RTS_CONTROLS;
    window.RTS_MAP_GEN = RTS_MAP_GEN;
}
