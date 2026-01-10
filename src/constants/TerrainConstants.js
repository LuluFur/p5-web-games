/**
 * TerrainConstants.js - Terrain types and configuration
 * Load AFTER GameConstants.js, BEFORE Grid.js
 */

// ===========================================
// TERRAIN TYPES
// ===========================================
const TERRAIN_TYPES = {
    GRASS: 0,
    CLIFF: 1,  // Physical barrier - blocks movement and line-of-sight
    MARSH: 2,  // Slows enemies, buildable
    MUD: 3,    // Heavily slows enemies, reduces tower range
    STONE: 4,  // Normal movement, boosts tower range
    SAND: 5,   // Speeds up enemies, unstable for towers
    WATER: 6,  // Level 2 - Blocks land enemies, special towers only
    ICE: 7,    // Level 4 - Speeds up enemies, extends projectile range
    LAVA: 8,   // Level 5 - Damages non-fire enemies, heals fire enemies
};

// ===========================================
// TERRAIN VISUAL PROPERTIES
// ===========================================
const TERRAIN_COLORS = {
    [TERRAIN_TYPES.GRASS]: '#5C8F3D',      // Vibrant green (default, not actually rendered)
    [TERRAIN_TYPES.CLIFF]: '#666666',      // Gray stone barrier
    [TERRAIN_TYPES.MARSH]: '#4A6741',      // Dark green-brown swamp
    [TERRAIN_TYPES.MUD]: '#5C4033',        // Brown mud
    [TERRAIN_TYPES.STONE]: '#8B8680',      // Light gray stone
    [TERRAIN_TYPES.SAND]: '#EDC9AF',       // Tan/beige sand
    [TERRAIN_TYPES.WATER]: '#4A90A4',      // Blue-green water
    [TERRAIN_TYPES.ICE]: '#C7E8F5',        // Pale blue ice
    [TERRAIN_TYPES.LAVA]: '#FF6B35',       // Orange-red lava
};

// ===========================================
// TERRAIN GAMEPLAY PROPERTIES
// ===========================================
const TERRAIN_PROPERTIES = {
    [TERRAIN_TYPES.GRASS]: {
        name: 'Grass',
        walkable: true,              // All enemies can walk
        buildable: true,             // All towers can build
        blocksLineOfSight: false,    // Does not block projectiles
        speedModifier: 1.0,          // Normal speed
        towerRangeModifier: 1.0,     // Normal range
        description: 'Standard buildable terrain',
    },

    [TERRAIN_TYPES.CLIFF]: {
        name: 'Cliff',
        walkable: false,             // Enemies cannot walk through
        buildable: false,            // Towers cannot be placed on cliffs
        blocksLineOfSight: true,     // Blocks tower line-of-sight and projectiles
        speedModifier: 0.0,          // Impassable
        towerRangeModifier: 1.0,     // N/A
        description: 'Physical barrier - blocks movement and projectiles',
    },

    [TERRAIN_TYPES.MARSH]: {
        name: 'Marsh',
        walkable: true,              // Enemies can walk but slowly
        buildable: true,             // Towers can be placed
        blocksLineOfSight: false,    // Does not block projectiles
        speedModifier: 0.7,          // 30% slower
        towerRangeModifier: 0.9,     // 10% less range (unstable ground)
        description: 'Swampy terrain - slows enemies, slightly reduces tower range',
    },

    [TERRAIN_TYPES.MUD]: {
        name: 'Mud',
        walkable: true,              // Enemies can walk but very slowly
        buildable: true,             // Towers can be placed
        blocksLineOfSight: false,    // Does not block projectiles
        speedModifier: 0.5,          // 50% slower
        towerRangeModifier: 0.8,     // 20% less range (very unstable)
        description: 'Deep mud - heavily slows enemies, reduces tower range',
    },

    [TERRAIN_TYPES.STONE]: {
        name: 'Stone',
        walkable: true,              // Normal movement
        buildable: true,             // Excellent for building
        blocksLineOfSight: false,    // Does not block projectiles
        speedModifier: 1.0,          // Normal speed
        towerRangeModifier: 1.2,     // 20% more range (high ground)
        description: 'Solid stone - provides tower range bonus',
    },

    [TERRAIN_TYPES.SAND]: {
        name: 'Sand',
        walkable: true,              // Enemies move faster
        buildable: true,             // Can build but unstable
        blocksLineOfSight: false,    // Does not block projectiles
        speedModifier: 1.3,          // 30% faster
        towerRangeModifier: 0.85,    // 15% less range (unstable)
        description: 'Loose sand - speeds up enemies, reduces tower effectiveness',
    },

    [TERRAIN_TYPES.WATER]: {
        name: 'Water',
        walkable: false,             // Land enemies cannot walk (aquatic enemies can)
        buildable: false,            // Standard towers cannot build (amphibious can)
        blocksLineOfSight: false,    // Does not block projectiles
        speedModifier: 0.0,          // Impassable for land enemies
        towerRangeModifier: 0.9,     // 10% less range (water interference)
        towerFireRateModifier: 1.15, // 15% faster attack speed (water cooling)
        description: 'Water - only amphibious towers can build, land enemies path around',
    },

    [TERRAIN_TYPES.ICE]: {
        name: 'Ice',
        walkable: true,              // All enemies can walk
        buildable: true,             // All towers can build
        blocksLineOfSight: false,    // Does not block projectiles
        speedModifier: 1.4,          // 40% faster (slipping on ice)
        towerRangeModifier: 1.0,     // Normal range for towers
        projectileRangeBonus: 1.2,   // 20% longer projectile travel (ice deflection)
        description: 'Ice - enemies move faster, projectiles travel farther',
    },

    [TERRAIN_TYPES.LAVA]: {
        name: 'Lava',
        walkable: true,              // Enemies can walk but take damage
        buildable: false,            // Only fire-immune towers can build
        blocksLineOfSight: false,    // Does not block projectiles
        speedModifier: 1.0,          // Normal speed
        towerRangeModifier: 1.0,     // Normal range
        damagePerSecond: 5,          // Non-fire enemies take 5 DPS
        fireEnemyHealPerSecond: 10,  // Fire enemies heal 10 HP/s
        description: 'Lava - damages non-fire enemies, heals fire enemies, only fire-immune towers',
    },
};

// ===========================================
// EXPORT FOR GLOBAL ACCESS
// ===========================================
if (typeof window !== 'undefined') {
    window.TERRAIN_TYPES = TERRAIN_TYPES;
    window.TERRAIN_COLORS = TERRAIN_COLORS;
    window.TERRAIN_PROPERTIES = TERRAIN_PROPERTIES;
}
