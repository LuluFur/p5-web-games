// TowerManager.js - Handles tower placement, selling, and path validation
class TowerManager {
    constructor(game) {
        this.game = game;
        this.selectedTower = null;
        this.selectedTowerType = null; // No tower selected by default
    }

    // Tower type costs (IDs must match UI.js tower menu)
    static TOWER_COSTS = {
        'cannon': 75,
        'double': 150,
        'flame': 200,
        'electric': 300,
        'sniper': 250,
        'buffer': 100,
        'swap': 125
    };

    // Create a tower based on type
    createTower(type, row, col) {
        switch (type) {
            case 'cannon':
                return new CannonTower(row, col);
            case 'double':
                return new DoubleCannon(row, col);
            case 'flame':
                return new Flamethrower(row, col);
            case 'electric':
                return new Electrifier(row, col);
            case 'sniper':
                return new SniperTower(row, col);
            case 'buffer':
                return new BufferTower(row, col);
            case 'swap':
                return new SwapTower(row, col);
            default:
                console.warn(`Unknown tower type: ${type}`);
                return null;
        }
    }

    // Attempt to place a tower at a cell
    placeTower(cell) {
        let grid = this.game.grid;
        let economy = this.game.economyManager;

        if (!grid || !economy) return false;

        // Check if a tower type is selected
        if (!this.selectedTowerType) {
            console.log("No tower type selected!");
            return false;
        }

        let cost = TowerManager.TOWER_COSTS[this.selectedTowerType] || 75;
        let newTower = this.createTower(this.selectedTowerType, cell.r, cell.c);

        // Check gold
        if (!economy.spendGold(cost)) {
            console.log("Not enough gold!");

            // Flash the tile and screen red (includes error sound)
            if (grid.flashInvalidTile) {
                grid.flashInvalidTile(cell.r, cell.c);
            }

            return false;
        }

        // Place tower on grid
        let placed = grid.placeTower(cell.r, cell.c, newTower);
        if (!placed) {
            economy.addGold(cost); // Refund
            return false;
        }

        // Validate paths still exist
        if (!this.validatePaths(cell, cost)) {
            return false;
        }

        console.log(`Built ${this.selectedTowerType} tower for ${cost}g`);

        // Track tower built stat
        if (this.game.statsManager) {
            this.game.statsManager.recordTowerBuilt(this.selectedTowerType);
        }

        // Emit tower place event
        if (typeof EVENTS !== 'undefined') {
            EVENTS.emit(EVENT_NAMES.TOWER_PLACE, {
                type: this.selectedTowerType,
                position: { row: cell.r, col: cell.c },
                cost: cost,
                tower: newTower
            });
        }

        // Recalculate buffer networks (only if buffer towers exist)
        this.recalculateBufferNetworks();

        return true;
    }

    // Validate that paths still exist after placing tower
    validatePaths(cell, cost) {
        let grid = this.game.grid;
        let economy = this.game.economyManager;
        let waveManager = this.game.waveManager;

        let minR = grid.unlockStart;
        let maxR = grid.unlockEnd;
        let centerR = floor((minR + maxR) / 2);
        let start = { r: centerR, c: 0 };
        let end = { r: centerR, c: grid.cols - 1 };

        // Check if start/end are blocked
        if (grid.map[start.r][start.c] !== 0 || grid.map[end.r][end.c] !== 0) {
            console.log("Cannot block start or end!");
            grid.map[cell.r][cell.c] = 0; // Revert
            economy.addGold(cost);
            return false;
        }

        // Find paths
        let foundPaths = Pathfinder.findMultiPaths(grid, start, end, 3);
        if (foundPaths.length === 0) {
            console.log(`Path blocked! Reverting.`);
            grid.map[cell.r][cell.c] = 0;
            economy.addGold(cost);

            // Flash the tile and screen red for blocking path (includes error sound)
            if (grid.flashInvalidTile) {
                grid.flashInvalidTile(cell.r, cell.c);
            }

            return false;
        }

        // Update paths
        if (waveManager) {
            waveManager.paths = foundPaths;
        }
        return true;
    }

    // Sell the currently selected tower
    sellTower() {
        if (!this.selectedTower) return false;

        let grid = this.game.grid;
        let economy = this.game.economyManager;

        let sellValue = this.selectedTower.sellValue || 25;

        // Remove from grid
        grid.map[this.selectedTower.row][this.selectedTower.col] = 0;

        // Refund gold
        economy.addGold(sellValue);

        console.log(`Sold tower for ${sellValue}g`);

        // Emit tower sell event
        if (typeof EVENTS !== 'undefined') {
            EVENTS.emit(EVENT_NAMES.TOWER_SELL, {
                type: this.selectedTower.type || 'unknown',
                position: { row: this.selectedTower.row, col: this.selectedTower.col },
                sellValue: sellValue
            });
        }

        this.selectedTower = null;

        // Recalculate buffer networks after selling
        this.recalculateBufferNetworks();

        return true;
    }

    // Select a tower at given grid position
    selectTowerAt(row, col) {
        let grid = this.game.grid;
        if (!grid) return null;

        let cell = grid.map[row][col];
        if (cell instanceof Tower) {
            this.selectedTower = cell;

            // JUICE: Selection particles and sound
            let x = col * 64 + 32;
            let y = row * 64 + 32;

            if (Game.instance) {
                // Small particle ring
                for (let i = 0; i < 12; i++) {
                    let angle = (i / 12) * TWO_PI;
                    let particleColor = color(100, 200, 255, 200);
                    Game.instance.spawnParticles(x, y, 1, particleColor);
                }

                // Subtle shake
                Game.instance.triggerShake(2);
            }

            // Play selection sound (subtle click)
            if (window.Sounds) {
                window.Sounds.play('click', 0.3);
            }

            // Emit tower select event
            if (typeof EVENTS !== 'undefined') {
                EVENTS.emit(EVENT_NAMES.TOWER_SELECT, {
                    type: cell.type || 'unknown',
                    position: { row: row, col: col },
                    tower: cell
                });
            }

            return cell;
        }
        return null;
    }

    // Deselect current tower
    deselectTower() {
        this.selectedTower = null;
    }

    // Attempt to merge two towers (drag-and-drop merge system)
    attemptMerge(draggedTower, targetTower) {
        let grid = this.game.grid;

        if (!grid || !draggedTower || !targetTower) return false;

        // Call tower's merge logic (validates type and rank)
        let mergeSuccess = targetTower.mergeWith(draggedTower);

        if (mergeSuccess) {
            // Remove dragged tower from grid
            grid.map[draggedTower.row][draggedTower.col] = 0;

            // JUICE: Merge explosion effect!
            let x = targetTower.col * 64 + 32;
            let y = targetTower.row * 64 + 32;

            if (Game.instance) {
                // Big particle burst with rainbow colors
                for (let i = 0; i < 50; i++) {
                    let hue = random(360);
                    let particleColor = color(
                        200 + random(55),
                        150 + random(105),
                        random(100, 255)
                    );
                    Game.instance.spawnParticles(x, y, 1, particleColor);
                }

                // Subtle screen shake
                Game.instance.triggerShake(3);

                // Flash effect
                if (Game.instance.screenEffectRenderer) {
                    Game.instance.screenEffectRenderer.triggerFlash(color(255, 255, 100, 50), 6);
                }
            }

            // Play merge sound (upgrade sound)
            if (window.Sounds) {
                window.Sounds.play('upgrade', 0.7);
            }

            // Emit merge event
            if (typeof EVENTS !== 'undefined') {
                EVENTS.emit(EVENT_NAMES.TOWER_MERGE, {
                    type: targetTower.type,
                    newRank: targetTower.mergeRank,
                    position: { row: targetTower.row, col: targetTower.col }
                });
            }

            // Recalculate buffer networks after merge
            this.recalculateBufferNetworks();

            // Deselect tower
            this.deselectTower();

            // Notify tutorial of merge
            if (this.game.tutorialManager && this.game.tutorialManager.active) {
                this.game.tutorialManager.onAction('tower_merged');
            }

            console.log(`Merged ${draggedTower.type} into ${targetTower.type} - now rank ${targetTower.mergeRank}`);
            return true;
        }

        return false;
    }

    // Attempt to swap positions of two towers (SwapTower mechanic)
    attemptSwap(swapTower, targetTower) {
        let grid = this.game.grid;

        if (!grid || !swapTower || !targetTower) return false;
        if (!(swapTower instanceof SwapTower)) return false;

        // Call SwapTower's swap logic (validates rank and cooldown)
        let swapSuccess = swapTower.swapWith(targetTower);

        if (swapSuccess) {
            // Update grid positions
            grid.map[swapTower.row][swapTower.col] = swapTower;
            grid.map[targetTower.row][targetTower.col] = targetTower;

            // Emit swap event
            if (typeof EVENTS !== 'undefined') {
                EVENTS.emit(EVENT_NAMES.TOWER_UPGRADE, {
                    type: 'swap',
                    tower1: { type: swapTower.type, position: { row: swapTower.row, col: swapTower.col } },
                    tower2: { type: targetTower.type, position: { row: targetTower.row, col: targetTower.col } }
                });
            }

            // Recalculate buffer networks after swap (positions changed)
            this.recalculateBufferNetworks();

            // Deselect tower
            this.deselectTower();

            console.log(`Swapped ${swapTower.type} (${swapTower.row},${swapTower.col}) with ${targetTower.type} (${targetTower.row},${targetTower.col})`);
            return true;
        }

        return false;
    }

    // Count all towers on the grid
    getTowerCount() {
        let count = 0;
        let grid = this.game.grid;
        if (!grid) return 0;

        for (let r = 0; r < grid.rows; r++) {
            for (let c = 0; c < grid.cols; c++) {
                if (grid.map[r][c] instanceof Tower) {
                    count++;
                }
            }
        }
        return count;
    }

    // Recalculate all BufferTower networks (called when towers placed/sold)
    recalculateBufferNetworks() {
        let grid = this.game.grid;
        if (!grid) return;

        for (let r = 0; r < grid.rows; r++) {
            for (let c = 0; c < grid.cols; c++) {
                let cell = grid.map[r][c];
                if (cell instanceof BufferTower) {
                    cell.calculateNetwork();
                }
            }
        }
    }

    // Spawn a random tower at a random valid location (Rush Royale style!)
    spawnRandomTower(cost) {
        let grid = this.game.grid;
        let economy = this.game.economyManager;

        if (!grid || !economy) return false;

        // During tutorial spawn_towers step, make spawning free
        let isTutorialSpawnStep = this.game.tutorialManager &&
                                  this.game.tutorialManager.active &&
                                  this.game.tutorialManager.currentStep &&
                                  this.game.tutorialManager.currentStep.id === 'spawn_towers';

        // Track if we charged gold (for refund logic)
        let chargedGold = false;

        // Check gold (tutorial spawn step is free, otherwise charge normally)
        if (!isTutorialSpawnStep) {
            if (!economy.spendGold(cost)) {
                console.log("Not enough gold to spawn tower!");
                if (window.Sounds) window.Sounds.play('error', 0.3);
                return false;
            }
            chargedGold = true;
        }

        // Find all valid spawn locations (buildable tiles that don't block path)
        let validLocations = [];
        let minC = GRID_CONSTANTS.NOMANS_LAND_COLS;
        let maxC = grid.cols - GRID_CONSTANTS.NOMANS_LAND_COLS;

        for (let r = 0; r < grid.rows; r++) {
            for (let c = minC; c < maxC; c++) {
                // Check if empty, buildable, and not a cliff
                let terrainType = grid.getTerrainType(r, c);
                if (grid.map[r][c] === 0 && terrainType !== TERRAIN_TYPES.CLIFF) {
                    validLocations.push({ r: r, c: c });
                }
            }
        }

        if (validLocations.length === 0) {
            console.log("No valid locations to spawn tower!");
            if (chargedGold) economy.addGold(cost); // Refund only if we charged
            if (window.Sounds) window.Sounds.play('error', 0.3);
            return false;
        }

        // Pick random location
        let location = random(validLocations);

        // Pick tower type (predetermined during tutorial, random otherwise)
        let towerType;
        if (this.game.tutorialManager && this.game.tutorialManager.active) {
            // Tutorial mode: spawn predetermined towers
            towerType = this.game.tutorialManager.getNextTutorialTowerType();
        } else {
            // Normal mode: random tower
            let towerTypes = ['cannon', 'double', 'sniper', 'flame', 'electric', 'buffer'];
            towerType = random(towerTypes);
        }

        let randomType = towerType;

        // Create tower
        let newTower = this.createTower(randomType, location.r, location.c);
        if (!newTower) {
            if (chargedGold) economy.addGold(cost); // Refund only if we charged
            return false;
        }

        // Place on grid
        grid.map[location.r][location.c] = newTower;

        // Validate path still exists (pass 0 if tutorial so validatePaths doesn't refund)
        if (!this.validatePaths(location, chargedGold ? cost : 0)) {
            return false;
        }

        // Track tower built stat
        if (this.game.statsManager) {
            this.game.statsManager.recordTowerBuilt(randomType);
        }

        // Emit tower place event
        if (typeof EVENTS !== 'undefined') {
            EVENTS.emit(EVENT_NAMES.TOWER_PLACE, {
                type: randomType,
                position: { row: location.r, col: location.c },
                cost: cost,
                tower: newTower,
                spawned: true  // Flag to indicate this was a random spawn
            });
        }

        // JUICE: Spawn animation!
        this.spawnTowerAnimation(location.r, location.c);

        // Play spawn sound
        if (window.Sounds) window.Sounds.play('build', 0.8);

        console.log(`Spawned ${randomType} tower at (${location.r}, ${location.c})`);
        return true;
    }

    // Move a tower from one location to another (drag-to-move)
    moveTower(tower, targetRow, targetCol) {
        let grid = this.game.grid;
        if (!grid || !tower) return false;

        // Check if target is valid (empty and buildable)
        let target = grid.map[targetRow][targetCol];
        if (target !== 0 || target.isCliff) {
            console.log("Cannot move tower to this location!");
            return false;
        }

        // Store old position
        let oldRow = tower.row;
        let oldCol = tower.col;

        // Move tower
        grid.map[oldRow][oldCol] = 0;
        grid.map[targetRow][targetCol] = tower;
        tower.row = targetRow;
        tower.col = targetCol;

        // Validate paths still exist
        let tempCell = { r: targetRow, c: targetCol };
        if (!this.validatePaths(tempCell, 0)) {
            // Revert move
            grid.map[targetRow][targetCol] = 0;
            grid.map[oldRow][oldCol] = tower;
            tower.row = oldRow;
            tower.col = oldCol;
            return false;
        }

        // Recalculate buffer networks
        this.recalculateBufferNetworks();

        // JUICE: Movement particles
        if (Game.instance) {
            Game.instance.spawnParticles(
                oldCol * 64 + 32,
                oldRow * 64 + 32,
                10,
                color(100, 200, 255)
            );
            Game.instance.triggerShake(3);
        }

        // Notify tutorial of tower move
        if (this.game.tutorialManager && this.game.tutorialManager.active) {
            this.game.tutorialManager.onAction('tower_moved');
        }

        console.log(`Moved tower from (${oldRow}, ${oldCol}) to (${targetRow}, ${targetCol})`);
        return true;
    }

    // Spawn tower animation with particles and effects
    spawnTowerAnimation(row, col) {
        if (!Game.instance) return;

        let x = col * 64 + 32;
        let y = row * 64 + 32;

        // Explosion of particles
        for (let i = 0; i < 30; i++) {
            let angle = random(TWO_PI);
            let speed = random(2, 8);
            let particleColor = color(
                random(100, 255),
                random(200, 255),
                random(50, 150)
            );
            Game.instance.spawnParticles(x, y, 1, particleColor);
        }

        // Screen shake
        Game.instance.triggerShake(2);

        // Flash effect
        if (Game.instance.screenEffectRenderer) {
            Game.instance.screenEffectRenderer.triggerFlash(color(255, 255, 255, 40), 5);
        }
    }
}
