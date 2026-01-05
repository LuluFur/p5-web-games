class Grid {
    constructor(rows, cols, cellSize) {
        this.rows = rows;
        this.cols = cols;
        this.cellSize = cellSize;
        this.map = [];

        // NEW: Terrain array (separate from buildability map)
        this.terrain = [];

        // Middle-Out logic
        // Start with 3 rows in the middle unlocked (easier tutorial)
        let mid = Math.floor(this.rows / 2);
        this.unlockStart = mid - 1; // e.g. 4-1 = 3
        this.unlockEnd = mid + 1;   // e.g. 4+1 = 5 (Inclusive: Rows 3, 4, 5)

        this.expandTopNext = true; // Toggle

        // Visual feedback for invalid placement
        this.invalidTile = null; // {row, col, frame} - tile that flashes red
        this.invalidTileFrame = 0;

        // Unlock animation state
        this.unlockAnimation = null; // {row, startFrame, duration, tileDelay}

        // NEW: Track unlocked row count for progressive cliff frequency
        this.unlockedRowCount = 3; // Start with 3 rows unlocked (initial middle rows)

        // NEW: Perlin noise seed for cliff generation (randomize each game)
        this.cliffNoiseSeed = Math.random() * 1000;

        // Initialize grid
        for (let r = 0; r < this.rows; r++) {
            this.map[r] = [];
            this.terrain[r] = []; // NEW: Initialize terrain array
            for (let c = 0; c < this.cols; c++) {
                if (r >= this.unlockStart && r <= this.unlockEnd) {
                    this.map[r][c] = 0; // Playable
                } else {
                    this.map[r][c] = 2; // Water (Locked)
                }

                // NEW: Initialize all terrain as GRASS by default
                this.terrain[r][c] = TERRAIN_TYPES.GRASS;
            }
        }

        console.log(`Grid: Initialized. Unlocked Rows: ${this.unlockStart} to ${this.unlockEnd}`);
    }

    draw() {
        stroke(50);
        strokeWeight(1);

        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                let x = c * this.cellSize;
                let y = r * this.cellSize;
                let cell = this.map[r][c];

                // Check if this is the invalid tile (flash red)
                let isInvalidTile = this.invalidTile &&
                                   this.invalidTile.row === r &&
                                   this.invalidTile.col === c &&
                                   (frameCount - this.invalidTileFrame) < 20; // Flash for 20 frames

                // NEW: Check terrain type FIRST
                const terrainType = this.terrain[r][c];

                // 1. Draw Terrain - CLIFF BARRIERS
                if (terrainType === TERRAIN_TYPES.CLIFF) {
                    // Draw cliff as gray stone barrier
                    if (isInvalidTile) {
                        // Flash red when clicked
                        let flashAlpha = map(frameCount - this.invalidTileFrame, 0, 20, 200, 0);
                        fill(255, 50, 50, flashAlpha);
                    } else {
                        // Gray stone base
                        fill(TERRAIN_COLORS[TERRAIN_TYPES.CLIFF]);
                    }
                    rect(x, y, this.cellSize, this.cellSize);

                    // Add cliff visual effects (rocky texture)
                    if (!isInvalidTile) {
                        noStroke();
                        // Darker shading for 3D effect
                        fill(0, 0, 0, 70);
                        triangle(x, y, x + this.cellSize, y, x, y + this.cellSize);

                        // Highlight edge
                        fill(150, 150, 150, 100);
                        triangle(x + this.cellSize, y + this.cellSize,
                                x + this.cellSize, y,
                                x, y + this.cellSize);

                        stroke(50); // Reset stroke
                    }
                }
                // 2. Draw Terrain - MARSH
                else if (terrainType === TERRAIN_TYPES.MARSH) {
                    fill(TERRAIN_COLORS[TERRAIN_TYPES.MARSH]);
                    rect(x, y, this.cellSize, this.cellSize);

                    // Add marsh visual effects (darker spots)
                    noStroke();
                    fill(0, 0, 0, 50);
                    ellipse(x + 15, y + 15, 12);
                    ellipse(x + 45, y + 35, 15);
                    ellipse(x + 30, y + 50, 10);
                    stroke(50); // Reset stroke
                }
                // 3. Draw Terrain - MUD
                else if (terrainType === TERRAIN_TYPES.MUD) {
                    fill(TERRAIN_COLORS[TERRAIN_TYPES.MUD]);
                    rect(x, y, this.cellSize, this.cellSize);

                    // Add mud visual effects (very dark wet spots)
                    noStroke();
                    fill(0, 0, 0, 80);
                    ellipse(x + 20, y + 20, 18);
                    ellipse(x + 40, y + 40, 20);
                    ellipse(x + 25, y + 45, 14);
                    stroke(50); // Reset stroke
                }
                // 4. Draw Terrain - STONE
                else if (terrainType === TERRAIN_TYPES.STONE) {
                    fill(TERRAIN_COLORS[TERRAIN_TYPES.STONE]);
                    rect(x, y, this.cellSize, this.cellSize);

                    // Add stone visual effects (lighter highlights)
                    noStroke();
                    fill(255, 255, 255, 60);
                    rect(x + 5, y + 5, 20, 10);
                    rect(x + 35, y + 30, 15, 8);
                    rect(x + 15, y + 45, 18, 12);
                    stroke(50); // Reset stroke
                }
                // 5. Draw Terrain - SAND
                else if (terrainType === TERRAIN_TYPES.SAND) {
                    fill(TERRAIN_COLORS[TERRAIN_TYPES.SAND]);
                    rect(x, y, this.cellSize, this.cellSize);

                    // Add sand visual effects (lighter grains)
                    noStroke();
                    fill(255, 255, 255, 40);
                    ellipse(x + 10, y + 10, 8);
                    ellipse(x + 50, y + 20, 10);
                    ellipse(x + 30, y + 45, 9);
                    ellipse(x + 45, y + 50, 7);
                    stroke(50); // Reset stroke
                }
                // FALLBACK: Old water system (locked tiles) - only if terrain is GRASS
                else if (cell === 2) {
                    // Water (locked tiles)
                    if (isInvalidTile) {
                        let flashAlpha = map(frameCount - this.invalidTileFrame, 0, 20, 200, 0);
                        fill(255, 50, 50, flashAlpha);
                    } else {
                        fill(30, 144, 255); // DodgerBlue
                    }
                    rect(x, y, this.cellSize, this.cellSize);

                    if (!isInvalidTile) {
                        fill(255, 255, 255, 50);
                        noStroke();
                        ellipse(x + 10, y + 10, 10);
                        ellipse(x + 50, y + 50, 15);
                        stroke(50);
                    }
                }
                // GRASS ZONES (only if terrain is GRASS and cell is not locked water)
                else {
                    if (isInvalidTile) {
                        let flashAlpha = map(frameCount - this.invalidTileFrame, 0, 20, 200, 0);
                        fill(255, 50, 50, flashAlpha);
                    } else if (c < 3) {
                        // Spawn Zone
                        if ((r + c) % 2 === 0) fill(100, 50, 50);
                        else fill(120, 60, 60);
                    } else if (c >= this.cols - 3) {
                        // Base Zone
                        if ((r + c) % 2 === 0) fill(50, 50, 100);
                        else fill(60, 60, 120);
                    } else {
                        // Playable
                        if ((r + c) % 2 === 0) fill(34, 139, 34);
                        else fill(50, 205, 50);
                    }
                    rect(x, y, this.cellSize, this.cellSize);
                }

                // 2. Wall/Blocked Tiles (NOT Towers - those are drawn separately)
                if (cell === 1) {
                    fill(100);
                    rect(x, y, this.cellSize, this.cellSize);
                }
                // Note: Towers (cell instanceof Tower) are drawn by Game.drawPlay() for proper layering
            }
        }

        // Draw unlock animation overlay
        this.drawUnlockAnimation();
    }

    placeTower(row, col, towerData) {
        if (row < 0 || row >= this.rows || col < 0 || col >= this.cols) return false;

        // No-Man's Land Check
        if (col < 3 || col >= this.cols - 3) {
            console.log("Cannot build in No-Man's Land!");
            this.flashInvalidTile(row, col);
            return false;
        }

        // Locked / Water Check
        if (this.map[row][col] === 2) {
            console.log("Cannot build on Water!");
            this.flashInvalidTile(row, col);
            return false;
        }

        // NEW: Terrain Check - Cannot build on cliffs
        const terrainType = this.getTerrainType(row, col);
        if (terrainType === TERRAIN_TYPES.CLIFF) {
            console.log("Cannot build on Cliff!");
            this.flashInvalidTile(row, col);
            return false;
        }

        // Empty tile - place tower
        if (this.map[row][col] === 0) {
            this.map[row][col] = towerData;
            return true;
        }
        // Existing tower - remove it (for editing)
        else if (this.map[row][col] instanceof Tower) {
            this.map[row][col] = 0;
            return true;
        }
        // Occupied by something else (wall, etc.)
        else {
            console.log("Tile is occupied!");
            this.flashInvalidTile(row, col);
            return false;
        }
    }

    // Trigger visual feedback for invalid placement
    flashInvalidTile(row, col) {
        this.invalidTile = { row: row, col: col };
        this.invalidTileFrame = frameCount;

        // Trigger screen flash effect (red borders)
        if (Game.instance && Game.instance.screenEffectRenderer) {
            Game.instance.screenEffectRenderer.triggerFlash(color(255, 50, 50, 30), 4);
        }

        // Play error sound if available
        if (window.Sounds) {
            window.Sounds.play('error');
        }
    }

    toggleWall(row, col) {
        // ... (Optional, mostly used for debug) ...
        return false;
    }

    /**
     * Check if grid expansion is still possible
     * @returns {boolean} True if more rows can be unlocked
     */
    canExpand() {
        // Can expand if we haven't reached both boundaries
        // Keep row 0 and last row as water boundaries
        const canExpandTop = this.unlockStart > 1;
        const canExpandBottom = this.unlockEnd < this.rows - 2;
        return canExpandTop || canExpandBottom;
    }

    expandGrid() {
        let expanded = false;
        let unlockedRow = -1;

        if (this.expandTopNext) {
            // Try Top (keep row 0 as water boundary)
            if (this.unlockStart > 1) {
                this.unlockStart--;
                unlockedRow = this.unlockStart;
                this.unlockRow(this.unlockStart);
                expanded = true;
            } else if (this.unlockEnd < this.rows - 2) {
                // Top boundary reached, force Bottom
                this.unlockEnd++;
                unlockedRow = this.unlockEnd;
                this.unlockRow(this.unlockEnd);
                expanded = true;
            }
        } else {
            // Try Bottom (keep last row as water boundary)
            if (this.unlockEnd < this.rows - 2) {
                this.unlockEnd++;
                unlockedRow = this.unlockEnd;
                this.unlockRow(this.unlockEnd);
                expanded = true;
            } else if (this.unlockStart > 1) {
                // Bottom boundary reached, force Top
                this.unlockStart--;
                unlockedRow = this.unlockStart;
                this.unlockRow(this.unlockStart);
                expanded = true;
            }
        }

        if (expanded) {
            this.expandTopNext = !this.expandTopNext; // Toggle for next time
            console.log(`Grid Expanded: Rows ${this.unlockStart}-${this.unlockEnd}`);

            // Trigger unlock animation
            this.triggerUnlockEffect(unlockedRow);

            return true;
        }
        return false;
    }

    unlockRow(r) {
        for (let c = 0; c < this.cols; c++) {
            if (this.map[r][c] === 2) {
                this.map[r][c] = 0;
            }
        }

        // NEW: Add cliff obstacles using Perlin noise clustering
        // Cliffs become more common with each unlock
        this.addCliffClusters(r);

        // Increment unlock counter
        this.unlockedRowCount++;
    }

    /**
     * Add procedurally generated cliff clusters to a newly unlocked row.
     * Uses Perlin noise for natural-looking terrain patterns with progressive difficulty.
     *
     * Difficulty Progression:
     * - First 2 unlocks (rows 1-2): Very sparse cliffs (threshold 0.80 = ~20% coverage)
     * - Every 2 subsequent unlocks: Threshold decreases by 0.05
     * - Example: Unlocks 3-4 → 0.75, Unlocks 5-6 → 0.70, Unlocks 7-8 → 0.65
     * - Caps at 0.50 threshold (maximum 50% cliff coverage)
     *
     * How it works:
     * 1. Samples Perlin noise for each cell in the playable area (cols 3 to cols-3)
     * 2. If noise value > threshold, places a cliff at that cell
     * 3. Lower threshold = more cliffs (since more cells exceed threshold)
     *
     * Why unlocksSinceStart - 2?
     * - First 2 middle rows are unlocked at game start
     * - We don't count them in the progression
     * - Ensures balanced difficulty curve
     *
     * Why divide by 2 for unlockPair?
     * - Grid unlocks symmetrically (top row, then bottom row)
     * - Both rows in a pair should have identical cliff density
     * - unlockPair groups them: pair 0 = unlocks 1-2, pair 1 = unlocks 3-4, etc.
     *
     * @param {number} row - Row index to add cliffs to (0-indexed)
     *
     * @example
     * // Unlock #3 (unlocksSinceStart = 1)
     * unlockPair = Math.floor(1 / 2) = 0
     * threshold = 0.80 - (0 * 0.05) = 0.80 (20% cliffs)
     *
     * // Unlock #5 (unlocksSinceStart = 3)
     * unlockPair = Math.floor(3 / 2) = 1
     * threshold = 0.80 - (1 * 0.05) = 0.75 (25% cliffs)
     */
    addCliffClusters(row) {
        // Only add cliffs to playable area (skip spawn/base zones)
        const startCol = 3; // After spawn zone
        const endCol = this.cols - 3; // Before base zone

        // Progressive difficulty: threshold decreases every 2 unlocks
        // This way top and bottom rows unlocked in each cycle have equal cliff density
        // Note: p5.js noise() returns 0-1, not -1 to 1

        // Calculate which "pair" of unlocks we're in
        // Start counting from unlock #3 (first 2 middle rows don't get cliffs initially)
        const unlocksSinceStart = this.unlockedRowCount - 2; // Subtract initial 2 rows
        const unlockPair = Math.floor(unlocksSinceStart / 2); // Pair number (0, 1, 2, ...)

        // Threshold progression
        const baseThreshold = TERRAIN_GENERATION.CLIFF_BASE_THRESHOLD;        // Very sparse for first 2 unlocks (unlocks 1-2)
        const thresholdDecrement = TERRAIN_GENERATION.CLIFF_THRESHOLD_DECREMENT;   // Decrease by 5% every 2 unlocks
        const minThreshold = TERRAIN_GENERATION.CLIFF_MIN_THRESHOLD;         // Cap at 50% (50% cliff coverage max)

        const threshold = Math.max(
            minThreshold,
            baseThreshold - (unlockPair * thresholdDecrement)
        );

        // Perlin noise parameters
        const noiseScale = TERRAIN_GENERATION.CLIFF_NOISE_SCALE; // Lower = larger clusters, Higher = smaller clusters
        const noiseOffsetY = this.cliffNoiseSeed; // Random offset for each game

        let cliffCount = 0;

        for (let col = startCol; col < endCol; col++) {
            // Sample Perlin noise at this position
            // Use row and col as coordinates, scaled for cluster size
            const noiseX = col * noiseScale;
            const noiseY = (row + noiseOffsetY) * noiseScale;
            const noiseValue = noise(noiseX, noiseY); // Returns 0-1

            // If noise value exceeds threshold, place cliff
            if (noiseValue > threshold) {
                this.setTerrainType(row, col, TERRAIN_TYPES.CLIFF);
                cliffCount++;
            }
        }

        console.log(`Row ${row} unlocked: ${cliffCount} cliffs (threshold: ${threshold.toFixed(2)}, unlock #${this.unlockedRowCount}, pair ${unlockPair})`);
    }

    /**
     * Trigger visual unlock effect for a newly unlocked row
     * @param {number} row - Row index to animate
     */
    triggerUnlockEffect(row) {
        this.unlockAnimation = {
            row: row,
            startFrame: frameCount,
            duration: 90,           // Total animation duration
            tileDelay: 2,           // Frames between each tile reveal
            slideSpeed: 15          // Frames for each tile to complete slide
        };

        // Emit territory unlock event
        if (typeof EVENTS !== 'undefined') {
            EVENTS.emit(EVENT_NAMES.TERRITORY_UNLOCK, {
                row: row,
                unlockStart: this.unlockStart,
                unlockEnd: this.unlockEnd,
                totalRows: this.unlockEnd - this.unlockStart + 1
            });
        }

        // Trigger text announcement
        if (typeof TEXT_ANIMATOR !== 'undefined') {
            let messageText = 'NEW TERRITORY UNLOCKED!';
            let animOptions = {
                size: 44,
                color: color(100, 255, 100),
                glowColor: color(50, 255, 50),
                letterDelay: 2,
                slideDistance: 35,
                slideSpeed: 10,
                readingSpeed: 4,
                soundType: 'text_announce',
                playDisappearSound: true  // Play sounds when letters disappear
            };

            // Calculate duration based on text length
            let duration = TextAnimator.calculateDuration(messageText, animOptions);

            TEXT_ANIMATOR.show(messageText, width / 2, height / 2, duration, animOptions);
        }

        console.log(`Territory Unlocked: Row ${row} animation started`);
    }

    /**
     * Draw tile-by-tile unlock animation
     */
    drawUnlockAnimation() {
        if (!this.unlockAnimation) return;

        let anim = this.unlockAnimation;
        let elapsed = frameCount - anim.startFrame;

        // End animation after duration
        if (elapsed > anim.duration) {
            this.unlockAnimation = null;
            return;
        }

        let row = anim.row;

        for (let c = 0; c < this.cols; c++) {
            let x = c * this.cellSize;
            let y = row * this.cellSize;

            // Tile appearance timing
            let tileAppearStart = c * anim.tileDelay;
            let tileAppearEnd = tileAppearStart + anim.slideSpeed;

            // Skip if not yet started or already finished
            if (elapsed < tileAppearStart || elapsed >= tileAppearEnd) continue;

            // Calculate animation progress
            let progress = (elapsed - tileAppearStart) / anim.slideSpeed;
            progress = this.easeOutCubic(progress);

            // Slide up effect
            let yOffset = 30 * (1 - progress);
            let alpha = progress * 255;

            // Draw animated tile overlay
            push();
            translate(0, yOffset);

            // Glowing green overlay
            fill(100, 255, 100, alpha * 0.6);
            noStroke();
            rect(x, y, this.cellSize, this.cellSize);

            // Sparkle effect
            if (progress > 0.3) {
                fill(255, 255, 255, alpha * 0.8);
                let sparkleSize = progress * 8;
                ellipse(x + this.cellSize / 2, y + this.cellSize / 2, sparkleSize);
            }

            pop();
        }
    }

    /**
     * Easing function for smooth animation
     */
    easeOutCubic(t) {
        return 1 - Math.pow(1 - t, 3);
    }

    getCellAt(x, y) {
        let c = Math.floor(x / this.cellSize);
        let r = Math.floor(y / this.cellSize);
        return { r, c };
    }

    /**
     * Calculate grid offset for centering on canvas
     * @returns {object} { x, y, width, height } - Grid offset and dimensions
     */
    getGridOffset() {
        let gridW = this.cols * this.cellSize;
        let gridH = this.rows * this.cellSize;
        return {
            x: (width - gridW) / 2,
            y: (height - gridH) / 2,
            width: gridW,
            height: gridH
        };
    }

    // ========================================
    // TERRAIN SYSTEM METHODS (Phase 1)
    // ========================================

    /**
     * Get terrain type at a specific cell
     * @param {number} row - Row index
     * @param {number} col - Column index
     * @returns {number} TERRAIN_TYPES enum value
     */
    getTerrainType(row, col) {
        if (!this.isValidCell(row, col)) {
            return TERRAIN_TYPES.GRASS; // Default for out of bounds
        }
        return this.terrain[row][col];
    }

    /**
     * Set terrain type at a specific cell
     * @param {number} row - Row index
     * @param {number} col - Column index
     * @param {number} terrainType - TERRAIN_TYPES enum value
     */
    setTerrainType(row, col, terrainType) {
        if (this.isValidCell(row, col)) {
            this.terrain[row][col] = terrainType;
        }
    }

    /**
     * Check if cell coordinates are valid
     * @param {number} row - Row index
     * @param {number} col - Column index
     * @returns {boolean}
     */
    isValidCell(row, col) {
        return row >= 0 && row < this.rows && col >= 0 && col < this.cols;
    }

    /**
     * Load terrain layout from level data
     * @param {Array<Array<number>>} terrainData - 2D array of TERRAIN_TYPES
     */
    loadTerrain(terrainData) {
        if (!terrainData || terrainData.length === 0) {
            console.warn('Grid: No terrain data provided, using default grass');
            return;
        }

        console.log('Grid: Loading terrain data...');

        for (let row = 0; row < this.rows && row < terrainData.length; row++) {
            for (let col = 0; col < this.cols && col < terrainData[row].length; col++) {
                this.terrain[row][col] = terrainData[row][col];
            }
        }

        console.log(`Grid: Terrain loaded (${terrainData.length} rows)`);
    }

    /**
     * Check if line-of-sight is blocked by cliffs between two points
     * Used for tower targeting and projectile paths
     * @param {number} x1 - Start X position
     * @param {number} y1 - Start Y position
     * @param {number} x2 - End X position
     * @param {number} y2 - End Y position
     * @returns {boolean} - True if line of sight is clear, false if blocked
     */
    hasLineOfSight(x1, y1, x2, y2) {
        // Bresenham's line algorithm to check cells between two points
        const startCol = Math.floor(x1 / this.cellSize);
        const startRow = Math.floor(y1 / this.cellSize);
        const endCol = Math.floor(x2 / this.cellSize);
        const endRow = Math.floor(y2 / this.cellSize);

        const dx = Math.abs(endCol - startCol);
        const dy = Math.abs(endRow - startRow);
        const sx = startCol < endCol ? 1 : -1;
        const sy = startRow < endRow ? 1 : -1;
        let err = dx - dy;

        let currentCol = startCol;
        let currentRow = startRow;

        while (true) {
            // Check if current cell is a cliff
            if (this.isValidCell(currentRow, currentCol)) {
                const terrainType = this.getTerrainType(currentRow, currentCol);
                if (terrainType === TERRAIN_TYPES.CLIFF) {
                    return false; // Line of sight blocked by cliff
                }
            }

            // Reached end point
            if (currentCol === endCol && currentRow === endRow) break;

            const e2 = 2 * err;
            if (e2 > -dy) {
                err -= dy;
                currentCol += sx;
            }
            if (e2 < dx) {
                err += dx;
                currentRow += sy;
            }
        }

        return true; // Line of sight is clear
    }

    /**
     * Get all cliff positions (for collision detection)
     * @returns {Array<{row, col, x, y}>} Array of cliff tile data
     */
    getCliffTiles() {
        const cliffs = [];
        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.cols; col++) {
                if (this.terrain[row][col] === TERRAIN_TYPES.CLIFF) {
                    cliffs.push({
                        row: row,
                        col: col,
                        x: col * this.cellSize,
                        y: row * this.cellSize,
                        width: this.cellSize,
                        height: this.cellSize
                    });
                }
            }
        }
        return cliffs;
    }
}
