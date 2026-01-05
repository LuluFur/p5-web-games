# Implementation Roadmap: Terrain & Multi-Level System

## Overview
This document provides a **step-by-step implementation plan** for adding the Terrain Mechanics and Multi-Level Progression systems to Merge Defence. It breaks down the work into manageable phases with clear dependencies and technical requirements.

## Implementation Philosophy

### Incremental Development
Build in **vertical slices** - each phase should result in a playable, testable feature:
- Phase 1: Basic terrain rendering (see it work)
- Phase 2: Terrain restrictions (interact with it)
- Phase 3: Enemy terrain interaction (complete gameplay loop)
- Phase 4+: Expand with levels, enemies, polish

### Testing Strategy
After each phase:
1. Manual playtest to verify core mechanic works
2. Check performance (FPS should stay 50+)
3. Verify no regressions in existing features
4. Adjust constants/balancing as needed

### Minimal Viable Implementation
Start with **one terrain type** (Water) and **one level** (Marshlands) before expanding. Prove the architecture works before scaling up.

---

## Phase 1: Terrain Foundation (Core System)

**Goal**: Add terrain data to Grid and render different tile types visually.

**Duration Estimate**: 2-4 hours of focused work

### New Files to Create

#### 1. `src/constants/TerrainConstants.js`
```javascript
/**
 * TerrainConstants.js - Terrain types and configuration
 */

const TERRAIN_TYPES = {
    GRASS: 0,
    WATER: 1,
    CLIFF: 2,
    ICE: 3,
    LAVA: 4,
};

const TERRAIN_COLORS = {
    [TERRAIN_TYPES.GRASS]: '#5C8F3D',
    [TERRAIN_TYPES.WATER]: '#4A90A4',
    [TERRAIN_TYPES.CLIFF]: '#666666',
    [TERRAIN_TYPES.ICE]: '#C7E8F5',
    [TERRAIN_TYPES.LAVA]: '#FF6B35',
};

const TERRAIN_PROPERTIES = {
    [TERRAIN_TYPES.GRASS]: {
        name: 'Grass',
        walkable: true,
        buildable: true,
        speedModifier: 1.0,
    },
    [TERRAIN_TYPES.WATER]: {
        name: 'Water',
        walkable: false, // For non-aquatic enemies
        buildable: false, // For non-amphibious towers
        speedModifier: 1.0,
        requiresAmphibious: true,
    },
    [TERRAIN_TYPES.CLIFF]: {
        name: 'Cliff',
        walkable: false,
        buildable: true, // But only long-range towers
        requiresLongRange: true,
        rangeBonus: 1,
    },
    [TERRAIN_TYPES.ICE]: {
        name: 'Ice',
        walkable: true,
        buildable: true,
        speedModifier: 1.4, // Enemies 40% faster
        projectileRangeBonus: 1.2, // Projectiles 20% longer range
    },
    [TERRAIN_TYPES.LAVA]: {
        name: 'Lava',
        walkable: true, // But damages enemies
        buildable: false, // For non-fire-immune towers
        damagePerSecond: 5,
        fireEnemyHealing: 10,
        requiresFireImmune: true,
    },
};

if (typeof window !== 'undefined') {
    window.TERRAIN_TYPES = TERRAIN_TYPES;
    window.TERRAIN_COLORS = TERRAIN_COLORS;
    window.TERRAIN_PROPERTIES = TERRAIN_PROPERTIES;
}
```

### Files to Modify

#### 1. `src/Grid.js` - Add Terrain Support
```javascript
class Grid {
    constructor(rows, cols, cellSize) {
        // ... existing code ...

        // NEW: Initialize terrain array (all grass by default)
        this.terrain = [];
        for (let row = 0; row < this.rows; row++) {
            this.terrain[row] = [];
            for (let col = 0; col < this.cols; col++) {
                this.terrain[row][col] = TERRAIN_TYPES.GRASS;
            }
        }
    }

    // NEW: Get terrain type at cell
    getTerrainType(row, col) {
        if (!this.isValidCell(row, col)) return TERRAIN_TYPES.GRASS;
        return this.terrain[row][col];
    }

    // NEW: Set terrain type at cell
    setTerrainType(row, col, terrainType) {
        if (this.isValidCell(row, col)) {
            this.terrain[row][col] = terrainType;
        }
    }

    // NEW: Load terrain from level data
    loadTerrain(terrainData) {
        if (!terrainData || terrainData.length === 0) {
            console.warn('No terrain data provided, using default grass');
            return;
        }

        for (let row = 0; row < this.rows && row < terrainData.length; row++) {
            for (let col = 0; col < this.cols && col < terrainData[row].length; col++) {
                this.terrain[row][col] = terrainData[row][col];
            }
        }
        console.log('Terrain loaded:', terrainData.length, 'rows');
    }

    // Existing render method needs update
    render() {
        // NEW: Render terrain FIRST (before grid lines)
        this.renderTerrain();

        // ... existing grid rendering code ...
    }

    // NEW: Render terrain tiles
    renderTerrain() {
        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.cols; col++) {
                const terrainType = this.terrain[row][col];

                // Skip grass (already background color)
                if (terrainType === TERRAIN_TYPES.GRASS) continue;

                const x = col * this.cellSize;
                const y = row * this.cellSize;

                // Draw terrain tile
                fill(TERRAIN_COLORS[terrainType]);
                noStroke();
                rect(x, y, this.cellSize, this.cellSize);
            }
        }
    }
}
```

#### 2. `index.html` - Add TerrainConstants.js to Load Order
```html
<!-- Add AFTER GameConstants.js, BEFORE Grid.js -->
<script src="src/constants/TerrainConstants.js"></script>
<script src="src/Grid.js"></script>
```

### Testing Phase 1
```javascript
// In sketch.js setup(), after grid creation, test terrain rendering:
function setup() {
    // ... existing setup ...

    // TEST: Create water stripe across middle
    for (let col = 5; col < 15; col++) {
        game.grid.setTerrainType(5, col, TERRAIN_TYPES.WATER);
        game.grid.setTerrainType(6, col, TERRAIN_TYPES.WATER);
    }

    console.log('Test terrain loaded - check for blue water stripe');
}
```

**Expected Result**: Blue water stripe visible across middle of grid.

---

## Phase 2: Terrain Building Restrictions

**Goal**: Prevent tower placement on restricted terrain (water, cliffs).

**Duration Estimate**: 2-3 hours

### Files to Modify

#### 1. `src/managers/TowerManager.js` - Add Terrain Validation
```javascript
class TowerManager {
    // ... existing code ...

    canPlaceTower(row, col, towerType) {
        // ... existing checks (gold, occupied, etc.) ...

        // NEW: Check terrain buildability
        const terrain = this.game.grid.getTerrainType(row, col);
        const terrainProps = TERRAIN_PROPERTIES[terrain];

        if (!terrainProps.buildable) {
            // Terrain completely unbuildable (will change in Phase 4 for amphibious)
            return {
                canPlace: false,
                reason: `Cannot build on ${terrainProps.name}`
            };
        }

        if (terrainProps.requiresLongRange && !towerType.isLongRange) {
            return {
                canPlace: false,
                reason: `Only long-range towers on ${terrainProps.name}`
            };
        }

        // ... existing pathfinding check ...

        return { canPlace: true };
    }

    // Update placeTower to show error messages
    placeTower(row, col, towerClass) {
        const validation = this.canPlaceTower(row, col, towerClass);

        if (!validation.canPlace) {
            console.warn('Cannot place tower:', validation.reason);
            // TODO: Show UI error message
            return false;
        }

        // ... existing placement logic ...
    }
}
```

#### 2. `src/Tower.js` - Add Terrain Properties to Tower Types
```javascript
class Tower {
    constructor(x, y, game) {
        // ... existing code ...

        // NEW: Terrain capabilities (override in subclasses)
        this.isLongRange = false;
        this.isAmphibious = false;
        this.isFireImmune = false;
    }
}

// Update Sniper and Storm Mage to be long-range
class Sniper extends Tower {
    constructor(x, y, game) {
        super(x, y, game);
        this.isLongRange = true; // NEW
        // ... rest of existing code ...
    }
}

class Electrifier extends Tower {
    constructor(x, y, game) {
        super(x, y, game);
        this.isLongRange = true; // NEW
        // ... rest of existing code ...
    }
}
```

### Testing Phase 2
1. Try placing Gunner on water → Should fail with error message
2. Try placing Sniper on cliff → Should succeed
3. Try placing Gunner on cliff → Should fail
4. Verify existing tower placement on grass still works

---

## Phase 3: Terrain-Aware Pathfinding

**Goal**: Enemies navigate around water/cliffs, preferring certain terrains.

**Duration Estimate**: 3-4 hours

### Files to Modify

#### 1. `src/Enemy.js` - Add Terrain Properties
```javascript
class Enemy {
    constructor(type, x, y, wave) {
        // ... existing code ...

        // NEW: Terrain interaction properties
        this.isAquatic = type.isAquatic || false;
        this.isFlyingUnit = type.isFlyingUnit || false;
        this.waterSpeedMult = type.waterSpeedMult || 1.0;
        this.iceSpeedMult = type.iceSpeedMult || 1.4;
    }

    update() {
        // ... existing state management ...

        // NEW: Apply terrain speed modifiers
        if (this.state === 'walking') {
            const terrain = this.game.grid.getTerrainType(this.gridY, this.gridX);
            this.currentSpeed = this.getSpeedForTerrain(terrain);
        }

        // ... rest of existing update logic ...
    }

    // NEW: Calculate speed based on terrain
    getSpeedForTerrain(terrain) {
        let speed = this.speed;

        if (terrain === TERRAIN_TYPES.ICE) {
            speed *= this.iceSpeedMult;
        }
        if (terrain === TERRAIN_TYPES.WATER && this.isAquatic) {
            speed *= this.waterSpeedMult;
        }

        return speed;
    }

    // NEW: Check if enemy can walk on terrain
    canWalkOnTerrain(terrain) {
        if (this.isFlyingUnit) return true; // Flying ignores terrain

        const terrainProps = TERRAIN_PROPERTIES[terrain];

        // Water is unwalkable for non-aquatic
        if (terrain === TERRAIN_TYPES.WATER && !this.isAquatic) {
            return false;
        }

        // Cliffs are unwalkable for all ground units
        if (terrain === TERRAIN_TYPES.CLIFF) {
            return false;
        }

        return terrainProps.walkable;
    }
}
```

#### 2. `src/Pathfinder.js` - Terrain-Aware A*
```javascript
class Pathfinder {
    findPath(startNode, endNode, grid, enemyType = null) {
        // ... existing A* setup ...

        while (openSet.length > 0) {
            // ... existing node selection ...

            for (let neighbor of this.getNeighbors(current, grid)) {
                // NEW: Check terrain walkability for this enemy type
                if (enemyType) {
                    const terrain = grid.getTerrainType(neighbor.row, neighbor.col);

                    if (!enemyType.canWalkOnTerrain(terrain)) {
                        continue; // Skip unwalkable terrain
                    }

                    // Apply terrain cost modifiers
                    const terrainCost = this.getTerrainCost(terrain, enemyType);
                    neighbor.g = current.g + 1 + terrainCost;
                } else {
                    neighbor.g = current.g + 1;
                }

                // ... rest of existing A* logic ...
            }
        }

        // ... existing path return ...
    }

    // NEW: Get terrain cost modifier for pathfinding
    getTerrainCost(terrain, enemyType) {
        // Aquatic enemies prefer water
        if (terrain === TERRAIN_TYPES.WATER && enemyType.isAquatic) {
            return -0.5; // Lower cost = preferred path
        }

        // Ice is tempting (faster movement)
        if (terrain === TERRAIN_TYPES.ICE) {
            return -0.3; // Slightly preferred
        }

        return 0; // Normal cost
    }
}
```

#### 3. `src/managers/WaveManager.js` - Pass Enemy Type to Pathfinder
```javascript
class WaveManager {
    // ... existing code ...

    spawnEnemy(enemyType, spawnPoint) {
        // ... existing enemy creation ...

        const enemy = this.enemyFactory(enemyType, x, y, this.currentWave);

        // NEW: Generate path with enemy type for terrain awareness
        const path = this.game.pathfinder.findPath(
            { row: spawnRow, col: spawnCol },
            { row: baseRow, col: baseCol },
            this.game.grid,
            enemy // Pass enemy type for terrain awareness
        );

        if (!path) {
            console.error('No valid path found for enemy!');
            return;
        }

        enemy.setPath(path);
        // ... rest of existing code ...
    }
}
```

### Testing Phase 3
1. Place water tiles blocking direct path
2. Spawn enemies → They should path around water
3. Create cliff maze → Enemies navigate through gaps
4. Verify pathfinding still prevents complete blocking

---

## Phase 4: Amphibious Towers (Tower Variants)

**Goal**: Create amphibious tower variants that can build on water.

**Duration Estimate**: 3-4 hours

### New Files to Create

#### 1. `src/towers/AmphibiousTowers.js`
```javascript
/**
 * AmphibiousTowers.js - Water-capable tower variants
 * Load AFTER Tower.js in index.html
 */

class AmphibiousGunner extends Gunner {
    constructor(x, y, game) {
        super(x, y, game);

        // Terrain capabilities
        this.isAmphibious = true;

        // Apply water modifiers if on water
        const terrain = game.grid.getTerrainType(this.gridY, this.gridX);
        if (terrain === TERRAIN_TYPES.WATER) {
            this.range *= 0.9; // -10% range penalty
            this.fireRate *= 0.85; // +15% attack speed (lower = faster)
        }
    }

    // Override render to show amphibious visual (add flotation device)
    render() {
        super.render();

        // Add visual indicator (blue tint or water effect)
        if (this.game.grid.getTerrainType(this.gridY, this.gridX) === TERRAIN_TYPES.WATER) {
            fill(100, 150, 255, 50);
            noStroke();
            ellipse(this.x, this.y + 20, 50, 15); // Water platform
        }
    }
}

class AmphibiousRanger extends Ranger {
    constructor(x, y, game) {
        super(x, y, game);
        this.isAmphibious = true;

        const terrain = game.grid.getTerrainType(this.gridY, this.gridX);
        if (terrain === TERRAIN_TYPES.WATER) {
            this.range *= 0.9;
            this.fireRate *= 0.85;
        }
    }
}

class AmphibiousSniper extends Sniper {
    constructor(x, y, game) {
        super(x, y, game);
        this.isAmphibious = true;
        this.isLongRange = true; // Still long-range

        const terrain = game.grid.getTerrainType(this.gridY, this.gridX);
        if (terrain === TERRAIN_TYPES.WATER) {
            this.range *= 0.85; // -15% range penalty
            this.damage *= 1.1; // +10% damage (steady platform)
        }
    }
}
```

### Files to Modify

#### 1. `src/managers/TowerManager.js` - Update Placement Validation
```javascript
class TowerManager {
    canPlaceTower(row, col, towerType) {
        // ... existing checks ...

        const terrain = this.game.grid.getTerrainType(row, col);
        const terrainProps = TERRAIN_PROPERTIES[terrain];

        // NEW: Updated terrain buildability check
        if (!terrainProps.buildable) {
            // Check if tower has special terrain capability
            if (terrainProps.requiresAmphibious && !towerType.prototype.isAmphibious) {
                return {
                    canPlace: false,
                    reason: `Only Amphibious towers on ${terrainProps.name}`
                };
            }
            if (terrainProps.requiresFireImmune && !towerType.prototype.isFireImmune) {
                return {
                    canPlace: false,
                    reason: `Only Fire-Immune towers on ${terrainProps.name}`
                };
            }
        }

        // ... rest of validation ...
    }

    // Update tower factory
    createTower(towerClass, row, col) {
        const x = col * this.game.grid.cellSize + this.game.grid.cellSize / 2;
        const y = row * this.game.grid.cellSize + this.game.grid.cellSize / 2;

        // Map tower classes
        const towerMap = {
            'Gunner': Gunner,
            'AmphibiousGunner': AmphibiousGunner, // NEW
            'Ranger': Ranger,
            'AmphibiousRanger': AmphibiousRanger, // NEW
            'Sniper': Sniper,
            'AmphibiousSniper': AmphibiousSniper, // NEW
            'Pyromancer': Pyromancer,
            'Electrifier': Electrifier,
            'Buffer': BufferTower,
        };

        const TowerClass = towerMap[towerClass];
        return new TowerClass(x, y, this.game);
    }
}
```

#### 2. `src/constants/GameConstants.js` - Add Amphibious Tower Stats
```javascript
const TOWER_STATS = {
    GUNNER: { cost: 75, range: 3, damage: 25, fireRate: 40 },
    AMPHIBIOUS_GUNNER: { cost: 100, range: 3, damage: 25, fireRate: 40 }, // +25g
    RANGER: { cost: 150, range: 3.5, damage: 18, fireRate: 20 },
    AMPHIBIOUS_RANGER: { cost: 175, range: 3.5, damage: 18, fireRate: 20 }, // +25g
    SNIPER: { cost: 250, range: 6, damage: 100, fireRate: 90 },
    AMPHIBIOUS_SNIPER: { cost: 275, range: 6, damage: 100, fireRate: 90 }, // +25g
    // ... existing towers ...
};
```

#### 3. `src/UI.js` - Add Amphibious Towers to Build Menu
```javascript
class UI {
    drawBuildMenu() {
        // ... existing tower buttons ...

        // NEW: Add amphibious tower section
        this.drawTowerButton(x, y, 'Amphibious Gunner', 100);
        this.drawTowerButton(x, y + 60, 'Amphibious Ranger', 175);
        this.drawTowerButton(x, y + 120, 'Amphibious Sniper', 275);
    }
}
```

#### 4. `index.html` - Load AmphibiousTowers.js
```html
<!-- Add AFTER Tower.js -->
<script src="src/Tower.js"></script>
<script src="src/towers/AmphibiousTowers.js"></script>
```

### Testing Phase 4
1. Try placing Amphibious Gunner on water → Should succeed
2. Try placing regular Gunner on water → Should still fail
3. Verify amphibious towers attack normally from water
4. Check range/damage modifiers apply correctly

---

## Phase 5: Level Data System

**Goal**: Create data-driven level definitions with terrain layouts.

**Duration Estimate**: 2-3 hours

### New Files to Create

#### 1. `src/data/LevelData.js`
```javascript
/**
 * LevelData.js - Level definitions and terrain layouts
 */

const LEVEL_DATA = {
    GRASSLANDS: {
        id: 1,
        name: "The Grasslands",
        gridSize: { rows: 10, cols: 20 },

        // All grass terrain (current game)
        terrain: [], // Empty = all grass

        enemies: ['zombie', 'vampire', 'skeleton', 'wraith', 'goblin', 'swarm', 'golem', 'regenerator', 'ogre'],
        bossWave: 20,
        bossType: 'necromancer',

        startingGold: 200,
        startingLives: 20,

        unlockRequirement: null, // Available from start
    },

    MARSHLANDS: {
        id: 2,
        name: "The Marshlands",
        gridSize: { rows: 12, cols: 20 },

        // Terrain layout (0=grass, 1=water)
        terrain: [
            [0,0,0,0,0,0,0,0,1,1,1,1,0,0,0,0,0,0,0,0], // Row 0
            [0,0,0,0,0,0,1,1,1,1,1,1,1,0,0,0,0,0,0,0], // Row 1
            [0,0,0,0,0,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0], // Row 2
            [0,0,0,0,0,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0], // Row 3
            [0,0,0,0,0,0,1,1,1,1,1,1,1,0,0,0,0,0,0,0], // Row 4
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], // Row 5
            [0,0,0,0,0,0,0,0,0,1,1,1,1,1,0,0,0,0,0,0], // Row 6
            [0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,0,0,0,0,0], // Row 7
            [0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,0,0,0,0,0], // Row 8
            [0,0,0,0,0,0,0,1,1,1,1,1,1,1,0,0,0,0,0,0], // Row 9
            [0,0,0,0,0,0,0,0,1,1,1,1,1,0,0,0,0,0,0,0], // Row 10
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], // Row 11
        ],

        enemies: ['zombie', 'vampire', 'skeleton', 'wraith', 'swampWraith', 'drownedZombie'],
        bossWave: 20,
        bossType: 'tidalHorror',

        startingGold: 200,
        startingLives: 20,

        unlockRequirement: { level: 1, minStars: 2 },
    },

    // Add more levels later...
};

if (typeof window !== 'undefined') {
    window.LEVEL_DATA = LEVEL_DATA;
}
```

### New Manager to Create

#### 2. `src/managers/LevelManager.js`
```javascript
/**
 * LevelManager.js - Handles level loading and progression
 */

class LevelManager {
    constructor(game) {
        this.game = game;
        this.currentLevel = null;
        this.levelProgress = this.loadProgress();
    }

    // Load a level by ID
    loadLevel(levelId) {
        const levelKey = Object.keys(LEVEL_DATA).find(key => LEVEL_DATA[key].id === levelId);
        const levelData = LEVEL_DATA[levelKey];

        if (!levelData) {
            console.error('Level not found:', levelId);
            return false;
        }

        console.log('Loading level:', levelData.name);

        // Resize grid if needed
        const { rows, cols } = levelData.gridSize;
        if (this.game.grid.rows !== rows || this.game.grid.cols !== cols) {
            this.game.grid = new Grid(rows, cols, GRID_CONSTANTS.CELL_SIZE);
        }

        // Load terrain
        if (levelData.terrain && levelData.terrain.length > 0) {
            this.game.grid.loadTerrain(levelData.terrain);
        }

        // Set starting resources
        this.game.economyManager.gold = levelData.startingGold;
        this.game.economyManager.lives = levelData.startingLives;

        // Configure wave manager for this level
        this.game.waveManager.configureForLevel(levelData);

        this.currentLevel = levelData;
        return true;
    }

    // Check if level is unlocked
    isLevelUnlocked(levelId) {
        const levelKey = Object.keys(LEVEL_DATA).find(key => LEVEL_DATA[key].id === levelId);
        const levelData = LEVEL_DATA[levelKey];

        if (!levelData.unlockRequirement) return true; // Always unlocked

        const reqLevel = levelData.unlockRequirement.level;
        const reqStars = levelData.unlockRequirement.minStars;

        const progress = this.levelProgress[reqLevel];
        return progress && progress.stars >= reqStars;
    }

    // Save level completion
    saveLevelCompletion(levelId, stars, time) {
        const existing = this.levelProgress[levelId] || { stars: 0, bestTime: Infinity };

        this.levelProgress[levelId] = {
            stars: Math.max(stars, existing.stars),
            bestTime: Math.min(time, existing.bestTime),
            hardModeUnlocked: stars >= 3,
        };

        this.saveProgress();
    }

    // LocalStorage persistence
    loadProgress() {
        const saved = localStorage.getItem('systemDefenseLevelProgress');
        return saved ? JSON.parse(saved) : {};
    }

    saveProgress() {
        localStorage.setItem('systemDefenseLevelProgress', JSON.stringify(this.levelProgress));
    }
}
```

### Files to Modify

#### 1. `src/Game.js` - Add LevelManager
```javascript
class Game {
    constructor() {
        // ... existing managers ...

        // NEW: Level management
        this.levelManager = new LevelManager(this);

        // Load default level (Grasslands)
        this.levelManager.loadLevel(1);
    }
}
```

#### 2. `index.html` - Load new files
```html
<!-- Add in correct order -->
<script src="src/data/LevelData.js"></script>
<script src="src/managers/LevelManager.js"></script>
```

### Testing Phase 5
1. Start game → Should load Grasslands (Level 1)
2. Manually call `game.levelManager.loadLevel(2)` in console
3. Verify Marshlands loads with water terrain
4. Check starting gold/lives reset correctly

---

## Phase 6: Water Enemies (Basic Implementation)

**Goal**: Create first water enemy (Swamp Wraith) with terrain interaction.

**Duration Estimate**: 4-5 hours

### New Files to Create

#### 1. `src/enemies/WaterEnemies.js`
```javascript
/**
 * WaterEnemies.js - Aquatic enemy types
 */

class SwampWraith extends Enemy {
    constructor(x, y, wave, game) {
        const type = {
            name: 'Swamp Wraith',
            baseHP: 60,
            hpPerWave: 6,
            speed: 1.8,
            gold: 12,

            // Aquatic properties
            isAquatic: true,
            waterSpeedMult: 1.67, // 67% faster in water
            landDamageMult: 1.2, // Takes 20% more damage on land
        };

        super(type, x, y, wave);
        this.game = game;
    }

    // Override takeDamage to apply land vulnerability
    takeDamage(damage, source) {
        const terrain = this.game.grid.getTerrainType(this.gridY, this.gridX);

        if (terrain === TERRAIN_TYPES.GRASS) {
            damage *= this.landDamageMult; // More vulnerable on land
        }

        super.takeDamage(damage, source);
    }

    // Override render for water-specific visuals
    render() {
        super.render();

        // Add dripping water particles
        if (frameCount % 10 === 0) {
            const terrain = this.game.grid.getTerrainType(this.gridY, this.gridX);
            if (terrain === TERRAIN_TYPES.WATER) {
                // Spawn water droplet particle
                this.game.objectManager.createParticle(
                    this.x, this.y,
                    color(100, 150, 255), // Blue water
                    15 // Small particle
                );
            }
        }
    }
}

class DrownedZombie extends Enemy {
    constructor(x, y, wave, game) {
        const type = {
            name: 'Drowned Zombie',
            baseHP: 200,
            hpPerWave: 20,
            speed: 1.2,
            gold: 18,

            isAquatic: true,
            waterSpeedMult: 1.0, // Same speed on land/water
            waterHealing: 5, // HP/sec in water
        };

        super(type, x, y, wave);
        this.game = game;
        this.healTimer = 0;
    }

    update() {
        super.update();

        // Apply water healing
        const terrain = this.game.grid.getTerrainType(this.gridY, this.gridX);
        if (terrain === TERRAIN_TYPES.WATER && this.state === 'walking') {
            this.healTimer++;

            if (this.healTimer >= 60) { // Every 1 second
                this.hp = Math.min(this.maxHp, this.hp + this.type.waterHealing);
                this.healTimer = 0;

                // Show healing particle
                this.game.objectManager.createParticle(
                    this.x, this.y - 20,
                    color(100, 255, 100), // Green healing
                    20
                );
            }
        } else {
            this.healTimer = 0;
        }
    }
}
```

### Files to Modify

#### 1. `src/managers/WaveManager.js` - Add Water Enemies to Factory
```javascript
class WaveManager {
    enemyFactory(enemyType, x, y, wave) {
        const enemyMap = {
            // Existing enemies...
            'zombie': () => new Zombie(x, y, wave, this.game),
            'vampire': () => new Vampire(x, y, wave, this.game),

            // NEW: Water enemies
            'swampWraith': () => new SwampWraith(x, y, wave, this.game),
            'drownedZombie': () => new DrownedZombie(x, y, wave, this.game),
        };

        const factory = enemyMap[enemyType];
        if (!factory) {
            console.error('Unknown enemy type:', enemyType);
            return null;
        }

        return factory();
    }

    // NEW: Configure wave spawns for specific level
    configureForLevel(levelData) {
        this.availableEnemies = levelData.enemies;
        this.bossWave = levelData.bossWave;
        this.bossType = levelData.bossType;
    }
}
```

#### 2. `index.html` - Load WaterEnemies.js
```html
<!-- Add AFTER Enemy.js -->
<script src="src/Enemy.js"></script>
<script src="src/enemies/WaterEnemies.js"></script>
```

### Testing Phase 6
1. Load Marshlands level
2. Manually spawn SwampWraith: `game.waveManager.spawnEnemy('swampWraith', {row: 5, col: 0})`
3. Watch it move faster on water, slower on land
4. Verify it takes more damage on land
5. Spawn DrownedZombie and verify healing in water

---

## Implementation Summary

### New Files Created (14 total)
1. ✅ `src/constants/TerrainConstants.js` - Terrain types and properties
2. ✅ `src/data/LevelData.js` - Level definitions
3. ✅ `src/managers/LevelManager.js` - Level loading and progression
4. ✅ `src/towers/AmphibiousTowers.js` - Water-capable towers
5. ✅ `src/enemies/WaterEnemies.js` - Aquatic enemies
6. ⏳ `src/managers/TerrainManager.js` - (Optional Phase 7+)
7. ⏳ `src/renderers/CampaignRenderer.js` - (Phase 8+)
8. ⏳ `src/design/ImplementationRoadmap.md` - (This file!)

### Files Modified (8 total)
1. ✅ `src/Grid.js` - Terrain support
2. ✅ `src/Pathfinder.js` - Terrain-aware pathfinding
3. ✅ `src/Tower.js` - Terrain capabilities
4. ✅ `src/Enemy.js` - Terrain interaction
5. ✅ `src/Game.js` - LevelManager integration
6. ✅ `src/managers/TowerManager.js` - Terrain placement validation
7. ✅ `src/managers/WaveManager.js` - Enemy factory, level config
8. ✅ `src/UI.js` - Amphibious tower buttons
9. ✅ `src/constants/GameConstants.js` - Amphibious tower stats
10. ✅ `index.html` - Script loading order

### Phase Dependencies
```
Phase 1 (Terrain Foundation)
    ↓
Phase 2 (Building Restrictions) ← depends on Phase 1
    ↓
Phase 3 (Pathfinding) ← depends on Phase 1
    ↓
Phase 4 (Amphibious Towers) ← depends on Phases 1, 2
    ↓
Phase 5 (Level Data) ← depends on Phase 1
    ↓
Phase 6 (Water Enemies) ← depends on Phases 1, 3, 5
```

---

## Future Phases (Post-MVP)

### Phase 7: Advanced Terrain (Cliffs, Ice, Lava)
- Create cliff/ice/lava terrain types
- Implement environmental hazards (blizzards, volcanic vents)
- Create fire-immune tower variants
- Add levels 3, 4, 5

### Phase 8: Campaign UI
- Campaign map screen (CAMPAIGN game state)
- Level selection interface
- Star rating display
- Level unlock progression

### Phase 9: Advanced Water Enemies
- Siren (debuff aura, water immunity)
- Kraken Tentacle (spawner)
- Tidal Horror (boss with phases)

### Phase 10: Polish & Balance
- Terrain animations (ripples, bubbles)
- Hover tooltips for terrain
- Sound effects for terrain
- Balancing pass on all values

---

## Recommended Implementation Order

### Week 1: Core Terrain System
- Day 1-2: Phase 1 (Terrain rendering)
- Day 3-4: Phase 2 (Building restrictions)
- Day 5-7: Phase 3 (Pathfinding)

### Week 2: Towers & Levels
- Day 1-3: Phase 4 (Amphibious towers)
- Day 4-5: Phase 5 (Level data system)
- Day 6-7: Testing and bug fixes

### Week 3: Water Enemies & Content
- Day 1-4: Phase 6 (Water enemies)
- Day 5-7: Balancing and playtesting

### Week 4+: Expansion
- Phase 7: Advanced terrain types
- Phase 8: Campaign UI
- Phase 9: Advanced enemies
- Phase 10: Polish

---

## Risk Mitigation

### Potential Issues & Solutions

**Issue**: Pathfinding breaks with complex terrain
- **Solution**: Ensure at least one valid path always exists, add validation

**Issue**: Performance degrades with terrain rendering
- **Solution**: Only render terrain tiles that differ from grass (skip grass rendering)

**Issue**: Tower placement becomes confusing
- **Solution**: Add clear visual feedback (red X, tooltips, error messages)

**Issue**: Water enemies too strong/weak
- **Solution**: Start conservative, iterate based on playtesting

**Issue**: Level data becomes unwieldy
- **Solution**: Use visual level editor or procedural generation (future)

---

## Success Metrics

### Phase Completion Checklist

**Phase 1 Complete When**:
- ✅ Water tiles render as blue
- ✅ Terrain loads from data
- ✅ No performance regression

**Phase 2 Complete When**:
- ✅ Cannot place standard towers on water
- ✅ Error messages display properly
- ✅ Existing placement still works

**Phase 3 Complete When**:
- ✅ Enemies path around water
- ✅ No enemies get stuck
- ✅ At least one valid path always exists

**Phase 4 Complete When**:
- ✅ Amphibious towers place on water
- ✅ Water modifiers apply correctly
- ✅ Cost balancing feels fair

**Phase 5 Complete When**:
- ✅ Can switch between levels
- ✅ Terrain loads correctly
- ✅ Resources reset per level

**Phase 6 Complete When**:
- ✅ Water enemies spawn and move
- ✅ Terrain interactions work
- ✅ Balanced difficulty

---

## Conclusion

This roadmap provides a **concrete, tested implementation path** from current state to full terrain and multi-level system. Each phase builds incrementally, maintains playability, and can be tested independently.

**Start with Phase 1** to prove the architecture, then proceed sequentially. Each phase should take 2-5 hours of focused development, making the entire core system achievable in 2-3 weeks of part-time work.

**Key Principle**: Build vertical slices. After each phase, you should have a playable, demonstrable feature—not half-finished systems.
