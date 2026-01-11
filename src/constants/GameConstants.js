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
// TD CONSTANTS REMOVED
// ===========================================
// Tower defense constants removed during Phase 1 cleanup.
// RTS unit/building stats are in RTSConstants.js

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
// Export for global access
// ===========================================
if (typeof window !== 'undefined') {
    window.GRID_CONSTANTS = GRID_CONSTANTS;
    window.PERFORMANCE_CONSTANTS = PERFORMANCE_CONSTANTS;
    window.TERRAIN_GENERATION = TERRAIN_GENERATION;
    window.INPUT_CONSTANTS = INPUT_CONSTANTS;
    window.VFX_CONSTANTS = VFX_CONSTANTS;
    window.UI_CONSTANTS = UI_CONSTANTS;
}
