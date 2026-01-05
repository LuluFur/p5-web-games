/**
 * LevelData.js - Level definitions with terrain layouts
 * Load AFTER TerrainConstants.js, BEFORE LevelManager.js
 */

const LEVEL_DATA = {
    // Level 1: The Grasslands (Tutorial)
    GRASSLANDS: {
        id: 1,
        name: "The Grasslands",
        description: "A peaceful meadow. The perfect place to learn the basics of defense.",

        gridSize: { rows: 10, cols: 20 },

        // All grass terrain (default) - empty array means all grass
        terrain: [],

        // Available enemy types for this level
        enemies: ['zombie', 'skeleton', 'goblin', 'wolf'],

        // Boss wave and type
        bossWave: 20,
        bossType: 'necromancer',

        // Starting resources
        startingGold: 200,
        startingLives: 20,

        // Unlock requirement (null = always available)
        unlockRequirement: null,
    },

    // Level 2: The Marshlands
    MARSHLANDS: {
        id: 2,
        name: "The Marshlands",
        description: "Swampy terrain slows your enemies, but also limits your tower effectiveness.",

        gridSize: { rows: 10, cols: 20 },

        // Terrain layout - MARSH tiles slow enemies
        // 0=GRASS, 2=MARSH
        terrain: [
            [0,0,0,0,0,2,2,2,0,0,0,0,2,2,0,0,0,0,0,0], // Row 0
            [0,0,0,0,2,2,2,2,2,0,0,2,2,2,2,0,0,0,0,0], // Row 1
            [0,0,0,2,2,2,2,2,2,2,0,2,2,2,2,2,0,0,0,0], // Row 2
            [0,0,0,2,2,2,2,2,2,2,0,2,2,2,2,2,0,0,0,0], // Row 3
            [0,0,0,0,2,2,2,2,2,0,0,0,2,2,2,0,0,0,0,0], // Row 4
            [0,0,0,0,0,2,2,2,0,0,0,0,0,2,0,0,0,0,0,0], // Row 5
            [0,0,0,0,0,0,2,0,0,0,0,0,0,0,0,0,0,0,0,0], // Row 6
            [0,0,0,2,2,2,2,2,2,0,0,0,2,2,2,2,0,0,0,0], // Row 7
            [0,0,2,2,2,2,2,2,2,2,0,2,2,2,2,2,2,0,0,0], // Row 8
            [0,0,0,2,2,2,2,2,2,0,0,0,2,2,2,2,0,0,0,0], // Row 9
        ],

        enemies: ['zombie', 'skeleton', 'goblin', 'wolf', 'vampire', 'wraith'],

        bossWave: 20,
        bossType: 'necromancer',

        startingGold: 200,
        startingLives: 20,

        unlockRequirement: { level: 1, wavesCompleted: 10 },
    },

    // Level 3: The Mudlands
    MUDLANDS: {
        id: 3,
        name: "The Mudlands",
        description: "Deep mud heavily slows enemies but weakens your towers. Strategic placement is key!",

        gridSize: { rows: 10, cols: 20 },

        // Terrain layout - MUD tiles heavily slow enemies
        // 0=GRASS, 3=MUD
        terrain: [
            [0,0,0,0,0,0,3,3,3,0,0,0,0,0,0,0,0,0,0,0], // Row 0
            [0,0,0,0,0,3,3,3,3,3,0,0,0,0,0,0,0,0,0,0], // Row 1
            [0,0,0,0,3,3,3,3,3,3,3,0,0,0,0,0,0,0,0,0], // Row 2
            [0,0,0,0,0,3,3,3,3,3,0,0,0,0,0,0,0,0,0,0], // Row 3
            [0,0,0,0,0,0,3,3,3,0,0,0,0,0,0,0,0,0,0,0], // Row 4
            [0,0,0,0,0,0,0,0,0,0,0,0,3,3,3,3,0,0,0,0], // Row 5
            [0,0,0,0,0,0,0,0,0,0,0,3,3,3,3,3,3,0,0,0], // Row 6
            [0,0,0,0,0,0,0,0,0,0,3,3,3,3,3,3,3,0,0,0], // Row 7
            [0,0,0,0,0,0,0,0,0,0,0,3,3,3,3,3,0,0,0,0], // Row 8
            [0,0,0,0,0,0,0,0,0,0,0,0,3,3,3,0,0,0,0,0], // Row 9
        ],

        enemies: ['zombie', 'skeleton', 'goblin', 'wolf', 'vampire', 'wraith', 'slime'],

        bossWave: 20,
        bossType: 'necromancer',

        startingGold: 200,
        startingLives: 20,

        unlockRequirement: { level: 2, wavesCompleted: 10 },
    },

    // Level 4: The Stone Plateau
    STONE_PLATEAU: {
        id: 4,
        name: "The Stone Plateau",
        description: "Solid stone provides excellent range bonuses to your towers. Use this advantage!",

        gridSize: { rows: 10, cols: 20 },

        // Terrain layout - STONE tiles boost tower range
        // 0=GRASS, 4=STONE
        terrain: [
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], // Row 0
            [0,0,0,0,0,4,4,4,4,0,0,4,4,4,4,0,0,0,0,0], // Row 1
            [0,0,0,0,4,4,4,4,4,4,4,4,4,4,4,4,0,0,0,0], // Row 2
            [0,0,0,0,4,4,4,4,4,4,4,4,4,4,4,4,0,0,0,0], // Row 3
            [0,0,0,0,0,4,4,4,4,0,0,4,4,4,4,0,0,0,0,0], // Row 4
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], // Row 5
            [0,0,0,0,0,4,4,4,4,0,0,4,4,4,4,0,0,0,0,0], // Row 6
            [0,0,0,0,4,4,4,4,4,4,4,4,4,4,4,4,0,0,0,0], // Row 7
            [0,0,0,0,4,4,4,4,4,4,4,4,4,4,4,4,0,0,0,0], // Row 8
            [0,0,0,0,0,4,4,4,4,0,0,4,4,4,4,0,0,0,0,0], // Row 9
        ],

        enemies: ['zombie', 'skeleton', 'goblin', 'wolf', 'vampire', 'wraith', 'slime', 'golem'],

        bossWave: 20,
        bossType: 'necromancer',

        startingGold: 200,
        startingLives: 20,

        unlockRequirement: { level: 3, wavesCompleted: 10 },
    },

    // Level 5: The Desert Wastes
    DESERT: {
        id: 5,
        name: "The Desert Wastes",
        description: "Loose sand speeds up enemies and weakens towers. A true test of skill!",

        gridSize: { rows: 10, cols: 20 },

        // Terrain layout - SAND tiles speed up enemies
        // 0=GRASS, 5=SAND
        terrain: [
            [0,0,0,5,5,5,5,5,5,5,5,5,5,5,5,5,0,0,0,0], // Row 0
            [0,0,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,0,0,0], // Row 1
            [0,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,0,0], // Row 2
            [0,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,0,0], // Row 3
            [0,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,0,0], // Row 4
            [0,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,0,0], // Row 5
            [0,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,0,0], // Row 6
            [0,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,0,0], // Row 7
            [0,0,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,0,0,0], // Row 8
            [0,0,0,5,5,5,5,5,5,5,5,5,5,5,5,5,0,0,0,0], // Row 9
        ],

        enemies: ['zombie', 'skeleton', 'goblin', 'wolf', 'vampire', 'wraith', 'slime', 'golem', 'ogre'],

        bossWave: 20,
        bossType: 'necromancer',

        startingGold: 200,
        startingLives: 20,

        unlockRequirement: { level: 4, wavesCompleted: 10 },
    },

    // Level 6: Mixed Terrain Challenge
    MIXED_LANDS: {
        id: 6,
        name: "The Mixed Lands",
        description: "A chaotic mix of all terrain types. Adapt or perish!",

        gridSize: { rows: 10, cols: 20 },

        // Terrain layout - Mix of all terrains
        // 0=GRASS, 2=MARSH, 3=MUD, 4=STONE, 5=SAND
        terrain: [
            [0,0,0,5,5,5,4,4,4,0,0,0,2,2,2,0,0,0,0,0], // Row 0
            [0,0,5,5,5,4,4,4,4,4,0,2,2,2,2,2,0,0,0,0], // Row 1
            [0,0,5,5,4,4,4,4,4,4,0,2,2,2,2,2,0,0,0,0], // Row 2
            [0,0,5,5,4,4,4,4,4,0,0,0,2,2,2,0,0,0,0,0], // Row 3
            [0,0,0,5,5,4,4,4,0,0,0,0,0,3,0,0,0,0,0,0], // Row 4
            [0,0,0,0,5,5,4,0,0,0,0,0,3,3,3,0,0,0,0,0], // Row 5
            [0,0,0,0,0,5,5,0,0,0,0,3,3,3,3,3,0,0,0,0], // Row 6
            [0,0,0,0,0,0,5,5,0,0,3,3,3,3,3,3,0,0,0,0], // Row 7
            [0,0,0,0,0,0,0,5,5,0,0,3,3,3,3,0,0,0,0,0], // Row 8
            [0,0,0,0,0,0,0,0,0,0,0,0,3,3,0,0,0,0,0,0], // Row 9
        ],

        enemies: ['zombie', 'skeleton', 'goblin', 'wolf', 'vampire', 'wraith', 'slime', 'golem', 'ogre', 'ghost'],

        bossWave: 20,
        bossType: 'necromancer',

        startingGold: 200,
        startingLives: 20,

        unlockRequirement: { level: 5, wavesCompleted: 10 },
    },
};

// Export for global access
if (typeof window !== 'undefined') {
    window.LEVEL_DATA = LEVEL_DATA;
}
