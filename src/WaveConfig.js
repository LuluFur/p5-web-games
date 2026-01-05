/**
 * WaveConfig.js - Scripted wave configurations
 *
 * NOTE: Wave dialogue is now in WaveDialogue.js (organized by level)
 * This file only contains enemy spawn configurations
 */

const WAVE_DATA = [
    // === TUTORIAL (Waves 1-5) - Learn the basics with zombies only ===
    {
        count: 3,
        interval: 90,
        enemies: ['zombie']
    },
    {
        count: 5,
        interval: 70,
        enemies: ['zombie']
    },
    {
        count: 7,
        interval: 65,
        enemies: ['zombie']
    },
    {
        count: 10,
        interval: 55,
        enemies: ['zombie']
    },
    {
        count: 12,
        interval: 50,
        enemies: ['zombie']
    },

    // === EARLY GAME (Waves 6-10) - First new enemy type ===
    {
        count: 3,
        interval: 100,
        enemies: ['vampire']
    },
    {
        count: 8,
        interval: 60,
        enemies: ['zombie', 'zombie', 'vampire']
    },
    {
        count: 10,
        interval: 50,
        enemies: ['zombie', 'zombie', 'zombie', 'vampire']
    },
    {
        count: 15,
        interval: 45,
        enemies: ['zombie', 'zombie', 'vampire']
    },
    {
        count: 18,
        interval: 40,
        enemies: ['zombie', 'vampire', 'vampire']
    },

    // === MID GAME (Waves 11-15) - Second enemy type ===
    {
        count: 8,
        interval: 50,
        enemies: ['skeleton']
    },
    {
        count: 12,
        interval: 45,
        enemies: ['zombie', 'skeleton', 'skeleton']
    },
    {
        count: 15,
        interval: 40,
        enemies: ['zombie', 'vampire', 'skeleton']
    },
    {
        count: 10,
        interval: 30,
        enemies: ['swarm', 'swarm', 'zombie']
    },
    {
        count: 20,
        interval: 35,
        enemies: ['zombie', 'skeleton', 'vampire', 'swarm']
    },

    // === ADVANCED (Waves 16-20) - Wraiths and Goblins ===
    {
        count: 8,
        interval: 45,
        enemies: ['wraith']
    },
    {
        count: 15,
        interval: 35,
        enemies: ['zombie', 'skeleton', 'wraith']
    },
    {
        count: 20,
        interval: 30,
        enemies: ['zombie', 'vampire', 'skeleton', 'swarm', 'wraith']
    },
    {
        count: 12,
        interval: 35,
        enemies: ['goblin', 'swarm']
    },
    {
        count: 25,
        interval: 28,
        enemies: ['zombie', 'skeleton', 'goblin', 'swarm', 'wraith']
    },

    // === ELITE WAVES (Waves 21-25) - Armored enemies ===
    {
        count: 3,
        interval: 120,
        enemies: ['golem']
    },
    {
        count: 30,
        interval: 25,
        enemies: ['zombie', 'skeleton', 'swarm', 'goblin']
    },
    {
        count: 5,
        interval: 60,
        enemies: ['golem', 'vampire']
    },
    {
        count: 4,
        interval: 90,
        enemies: ['regenerator']
    },
    {
        count: 35,
        interval: 22,
        enemies: ['zombie', 'skeleton', 'goblin', 'wraith', 'swarm']
    },

    // === BRUTAL (Waves 26-28) - Ogres appear ===
    {
        count: 2,
        interval: 150,
        enemies: ['ogre']
    },
    {
        count: 40,
        interval: 20,
        enemies: ['zombie', 'skeleton', 'swarm', 'goblin', 'wraith']
    },
    {
        count: 6,
        interval: 70,
        enemies: ['golem', 'regenerator', 'vampire']
    },

    // === ENDGAME (Waves 29-30) - Maximum challenge before boss ===
    {
        count: 50,
        interval: 18,
        enemies: ['zombie', 'skeleton', 'goblin', 'swarm', 'wraith', 'vampire']
    },
    {
        count: 8,
        interval: 60,
        enemies: ['ogre', 'golem', 'regenerator']
    },

    // === BOSS (Wave 31) ===
    {
        count: 1,
        interval: 100,
        enemies: ['necromancer']
    }
];

