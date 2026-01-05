/**
 * GameConstants.js - Central configuration for game balance and performance
 */

// ===========================================
// GRID & ZONES
// ===========================================
const GRID_CONSTANTS = {
    CELL_SIZE: 64,
    ROWS: 10,
    COLS: 20,
    NOMANS_LAND_COLS: 3,  // Unbuildable spawn/base zones
    SCARY_ZONE_START: 3,  // Where enemies switch to scary animation
};

// ===========================================
// ECONOMY
// ===========================================
const ECONOMY_CONSTANTS = {
    STARTING_GOLD: 500,  // Increased for easier gameplay
    STARTING_LIVES: 20,
    GRID_EXPAND_COST: 200,
};

// ===========================================
// TOWER STATS
// ===========================================
const TOWER_STATS = {
    GUNNER: { cost: 75, range: 3, damage: 25, fireRate: 40 },
    RANGER: { cost: 150, range: 3.5, damage: 18, fireRate: 20 },
    SNIPER: { cost: 250, range: 6, damage: 100, fireRate: 90 },
    PYROMANCER: { cost: 200, range: 2, damage: 4, fireRate: 3 },
    ELECTRIFIER: { cost: 300, range: 3, damage: 12, fireRate: 25 },
    BUFFER: { cost: 100, range: 0, damage: 0, fireRate: 999 },
};

const TOWER_CONSTANTS = {
    MAX_LEVEL: 3,
    XP_THRESHOLDS: [0, 3, 9],  // XP needed for level 2, 3
    LEVEL_DAMAGE_MULT: 1.3,
    LEVEL_FIRE_RATE_MULT: 0.9,
    LEVEL_RANGE_INCREASE: 0.5,

    // Buffer Tower
    BUFFER_NETWORK_UPDATE_INTERVAL: 30,  // Frames between network recalculations
    BUFFER_DAMAGE_BONUS_PER_TOWER: 0.05,  // 5% per connected tower

    // Electrifier (Storm Mage)
    LIGHTNING_CHAIN_RANGE: 120,
    LIGHTNING_MAX_CHAINS: 2,
    LIGHTNING_CHAIN_DAMAGE_MULT: 0.5,  // 50% damage per jump

    // Knockback
    KNOCKBACK_DAMAGE_THRESHOLD: 30,  // Damage needed to trigger live knockback
    KNOCKBACK_FORCE_MULTIPLIER: 0.1,
    KNOCKBACK_MAX: 8,  // Max knockback distance in pixels
};

// ===========================================
// PERFORMANCE LIMITS
// ===========================================
const PERFORMANCE_CONSTANTS = {
    MAX_PARTICLES: 500,  // Prevent particle explosion lag
    MAX_PROJECTILES: 200,  // Safety limit for projectiles

    // Object Pool Sizes
    PARTICLE_POOL_SIZE: 600,
    PROJECTILE_POOL_SIZE: 250,

    // Culling
    OFFSCREEN_CULL_MARGIN: 100,  // Pixels outside grid to still render
};

// ===========================================
// ENEMY CONSTANTS
// ===========================================
const ENEMY_CONSTANTS = {
    SPAWN_STATE_DURATION: 180,  // 3 seconds at 60fps
    DEATH_STATE_DURATION: 70,
    DEATH_KNOCKBACK_X: 15,
    DEATH_KNOCKBACK_Y: 10,

    // Animation Frame Rates
    WALK_FRAME_DURATION: 10,  // Frames per animation frame

    // Golem
    GOLEM_ARMOR: 0.5,  // 50% damage reduction

    // Regenerator
    REGENERATOR_HEAL_RATE: 3,  // HP per second
    REGENERATOR_HEAL_DELAY: 60,  // Frames before regen starts

    // Necromancer
    NECROMANCER_SUMMON_COOLDOWN: 240,  // 4 seconds
    NECROMANCER_SUMMON_COUNT: 3,
};

// ===========================================
// WAVE & DDA
// ===========================================
const WAVE_CONSTANTS = {
    GRID_EXPAND_INTERVAL: 3,  // Expand grid every N waves

    // Dynamic Difficulty Adjustment
    DDA_MIN: 0.85,  // -15% spawn speed (easier)
    DDA_MAX: 1.15,  // +15% spawn speed (harder)
    DDA_ADJUSTMENT_STRUGGLING: -0.05,
    DDA_ADJUSTMENT_DOMINATING: 0.03,
    DDA_HEALTH_THRESHOLD_LOW: 0.4,  // 40% health = struggling
    DDA_HEALTH_THRESHOLD_HIGH: 0.9,  // 90% health = dominating
    DDA_BONUS_GOLD_BASE: 25,
};

// ===========================================
// TERRAIN GENERATION
// ===========================================
const TERRAIN_GENERATION = {
    CLIFF_BASE_THRESHOLD: 0.80,  // Base Perlin noise threshold for cliffs (20% coverage)
    CLIFF_THRESHOLD_DECREMENT: 0.05,  // Threshold decrease per unlock pair
    CLIFF_MIN_THRESHOLD: 0.50,  // Minimum threshold (50% maximum cliff coverage)
    CLIFF_NOISE_SCALE: 0.15,  // Perlin noise scale for natural patterns
};

// ===========================================
// INPUT HANDLING
// ===========================================
const INPUT_CONSTANTS = {
    CLICK_DRAG_THRESHOLD_MS: 200,  // Time threshold to distinguish click from drag
};

// ===========================================
// VISUAL EFFECTS
// ===========================================
const VFX_CONSTANTS = {
    SCREEN_SHAKE_DEATH: 8,
    SCREEN_SHAKE_HIT: 2,

    PARTICLE_COUNT_HIT: 3,
    PARTICLE_COUNT_DEATH: 15,
    PARTICLE_COUNT_SOUL: 3,
    PARTICLE_COUNT_UPGRADE: 15,

    PARTICLE_MIN_SPEED: 2,
    PARTICLE_MAX_SPEED: 5,
    PARTICLE_MIN_LIFE: 20,
    PARTICLE_MAX_LIFE: 50,
};

// ===========================================
// UI LAYOUT
// ===========================================
const UI_CONSTANTS = {
    // Dialogue Box
    DIALOGUE_BOX_WIDTH: 800,
    DIALOGUE_BOX_HEIGHT: 260,
    DIALOGUE_BOX_MARGIN: 20,

    // Tutorial Box
    TUTORIAL_BOX_WIDTH: 500,
    TUTORIAL_BOX_HEIGHT: 140,
    TUTORIAL_BOX_Y: 80,

    // Buttons
    BUTTON_WIDTH: 180,
    BUTTON_HEIGHT: 40,

    // Skip Button
    SKIP_BUTTON_WIDTH: 80,
    SKIP_BUTTON_HEIGHT: 30,
    SKIP_BUTTON_MARGIN_X: 100,
    SKIP_BUTTON_MARGIN_Y: 20,
};

// ===========================================
// LEVEL PROGRESSION
// ===========================================
const LEVEL_CONSTANTS = {
    // Enemy types unlocked per level (2 new types each level)
    ENEMY_UNLOCKS: {
        1: ['zombie', 'skeleton'],           // Level 1: Basic enemies
        2: ['vampire', 'swarm'],             // Level 2: Tanky and fast
        3: ['wraith', 'goblin'],             // Level 3: Very fast enemies
        4: ['golem', 'regenerator'],         // Level 4: Armored enemies
        5: ['ogre', 'necromancer'],          // Level 5: Boss level
    },
    // Waves required to complete each level
    WAVES_PER_LEVEL: 10,
};

// ===========================================
// Export for global access
// ===========================================
if (typeof window !== 'undefined') {
    window.GRID_CONSTANTS = GRID_CONSTANTS;
    window.ECONOMY_CONSTANTS = ECONOMY_CONSTANTS;
    window.TOWER_STATS = TOWER_STATS;
    window.TOWER_CONSTANTS = TOWER_CONSTANTS;
    window.PERFORMANCE_CONSTANTS = PERFORMANCE_CONSTANTS;
    window.ENEMY_CONSTANTS = ENEMY_CONSTANTS;
    window.WAVE_CONSTANTS = WAVE_CONSTANTS;
    window.TERRAIN_GENERATION = TERRAIN_GENERATION;
    window.INPUT_CONSTANTS = INPUT_CONSTANTS;
    window.VFX_CONSTANTS = VFX_CONSTANTS;
    window.UI_CONSTANTS = UI_CONSTANTS;
    window.LEVEL_CONSTANTS = LEVEL_CONSTANTS;
}
