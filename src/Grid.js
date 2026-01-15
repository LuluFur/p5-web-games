class Grid {
    constructor(rows, cols, cellSize, levelId = 1, options = {}) {
        this.rows = rows;
        this.cols = cols;
        this.cellSize = cellSize;
        this.map = [];

        // RTS mode options
        this.isRTSMode = options.isRTSMode || false;
        this.skipTrees = options.skipTrees || false;
        this.surfaceMap = null;  // Set by MapGenerator for terrain rendering

        // NEW: Terrain array (separate from buildability map)
        this.terrain = [];

        // Grid initialization
        const mid = Math.floor(this.rows / 2);

        // Visual feedback for invalid placement
        this.invalidTile = null; // {row, col, frame} - tile that flashes red
        this.invalidTileFrame = 0;

        // Unlock animation state
        this.unlockAnimation = null; // {row, startFrame, duration, tileDelay}

        // NEW: Track unlocked row count for progressive cliff frequency
        this.unlockedRowCount = 3; // Start with 3 rows unlocked (initial middle rows)

        // NEW: Perlin noise seed for cliff generation (randomize each game)
        this.cliffNoiseSeed = Math.random() * 1000;

        // NEW: Fog of war trees system
        this.trees = []; // {row, col, type, state: 'standing'|'falling', fallProgress: 0-1}
        this.fallingTrees = []; // Trees currently being cut down

        // Initialize grid
        for (let r = 0; r < this.rows; r++) {
            this.map[r] = [];
            this.terrain[r] = []; // NEW: Initialize terrain array
            for (let c = 0; c < this.cols; c++) {
                // RTS mode: all cells are playable
                this.map[r][c] = 0; // All playable

                // NEW: Initialize all terrain as GRASS by default
                this.terrain[r][c] = TERRAIN_TYPES.GRASS;
            }
        }

        // IMPORTANT: Generate level terrain FIRST (before any unlocks)
        // This ensures terrain is pre-generated for locked rows
        if (!this.isRTSMode) {
            this.initializeLevelTerrain(levelId);
        }

        // Generate fog of war trees for locked rows (skip in RTS mode)
        if (!this.skipTrees && !this.isRTSMode) {
            this.initializeFogTrees();
        }

        console.log(`Grid: Initialized. Rows: ${this.rows}`);
        return canExpandTop || canExpandBottom;
    }

    expandGrid() {
        let expanded = false;
        let unlockedRow = -1;

        if (this.expandTopNext) {
            // Try Top (keep row 0 as water boundary)
            // Remove old unlock logic - not needed
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
            return false;
        }
    }
            if (this.map[r][c] === 2) {
                this.map[r][c] = 0;
            }
        }

        // NEW: Add cliff obstacles using Perlin noise clustering
        // Cliffs become more common with each unlock
        this.addCliffClusters(r);

        // NEW: Cut down trees in this row and give gold reward
        this.cutTreesInRow(r);

        // Increment unlock counter
        // No unlock logic needed

        for (let col = startCol; col < endCol; col++) {
            // IMPORTANT: Only replace GRASS tiles (don't overwrite water/ice/lava)
            if (this.terrain[row][col] !== TERRAIN_TYPES.GRASS) continue;

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
     * Get cell data at grid coordinates (RTS compatibility)
     * @param {number} col - Column index
     * @param {number} row - Row index
     * @returns {object|null} Cell object with walkable, buildable, terrain, building properties
     */
    getCell(col, row) {
        if (!this.isValidCell(row, col)) return null;

        const mapValue = this.map[row][col];
        const terrainType = this.terrain[row][col];
        const terrainProps = TERRAIN_PROPERTIES[terrainType] || TERRAIN_PROPERTIES[TERRAIN_TYPES.GRASS];

        return {
            row: row,
            col: col,
            x: col * this.cellSize,
            y: row * this.cellSize,
            // Walkable: empty cell (0) and terrain allows movement
            walkable: mapValue === 0 && terrainProps.walkable,
            // Buildable: empty cell (0) and terrain allows building
            buildable: mapValue === 0 && terrainProps.buildable,
            // Terrain type
            terrain: terrainType,
            terrainName: terrainProps.name,
            // Building reference (if any)
            building: null // Will be set by BuildingManager
        };
    }

    /**
     * Set cell walkable/buildable state (for RTS buildings)
     * @param {number} col - Column index
     * @param {number} row - Row index
     * @param {boolean} walkable - Whether cell is walkable
     */
    setCellWalkable(col, row, walkable) {
        if (!this.isValidCell(row, col)) return;
        this.map[row][col] = walkable ? 0 : 1;
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

    // ========================================
    // LEVEL-SPECIFIC TERRAIN GENERATION
    // ========================================

    /**
     * Generate water patches using Perlin noise (Level 2 - Marshlands)
     * Only replaces GRASS tiles in playable area (skips spawn/base zones)
     * @param {number} coverage - Percentage coverage (0.0-1.0), default 0.30 for 30%
     */
    generateWaterPatches(coverage = 0.30) {
        const threshold = 1.0 - coverage; // 0.70 threshold = 30% coverage
        const noiseScale = 0.12; // Larger patches than cliffs
        const noiseOffsetX = Math.random() * 1000;
        const noiseOffsetY = Math.random() * 1000;

        let waterCount = 0;
        const startCol = 3; // Skip spawn zone
        const endCol = this.cols - 3; // Skip base zone

        // Generate for ALL rows (including locked ones)
        for (let row = 0; row < this.rows; row++) {
            for (let col = startCol; col < endCol; col++) {
                // Only replace GRASS tiles
                if (this.terrain[row][col] !== TERRAIN_TYPES.GRASS) continue;

                const noiseX = (col + noiseOffsetX) * noiseScale;
                const noiseY = (row + noiseOffsetY) * noiseScale;
                const noiseValue = noise(noiseX, noiseY);

                if (noiseValue > threshold) {
                    this.setTerrainType(row, col, TERRAIN_TYPES.WATER);
                    waterCount++;
                }
            }
        }

        console.log(`Generated ${waterCount} water tiles (~${(waterCount / (this.rows * (endCol - startCol)) * 100).toFixed(1)}% coverage)`);
    }

    /**
     * Generate ice patches using Perlin noise (Level 4 - Frozen Wastes)
     * Only replaces GRASS tiles in playable area (skips spawn/base zones)
     * @param {number} coverage - Percentage coverage (0.0-1.0), default 0.20 for 20%
     */
    generateIcePatches(coverage = 0.20) {
        const threshold = 1.0 - coverage; // 0.80 threshold = 20% coverage
        const noiseScale = 0.10; // Medium-sized patches
        const noiseOffsetX = Math.random() * 1000;
        const noiseOffsetY = Math.random() * 1000;

        let iceCount = 0;
        const startCol = 3;
        const endCol = this.cols - 3;

        // Generate for ALL rows (including locked ones)
        for (let row = 0; row < this.rows; row++) {
            for (let col = startCol; col < endCol; col++) {
                // Only replace GRASS tiles
                if (this.terrain[row][col] !== TERRAIN_TYPES.GRASS) continue;

                const noiseX = (col + noiseOffsetX) * noiseScale;
                const noiseY = (row + noiseOffsetY) * noiseScale;
                const noiseValue = noise(noiseX, noiseY);

                if (noiseValue > threshold) {
                    this.setTerrainType(row, col, TERRAIN_TYPES.ICE);
                    iceCount++;
                }
            }
        }

        console.log(`Generated ${iceCount} ice tiles (~${(iceCount / (this.rows * (endCol - startCol)) * 100).toFixed(1)}% coverage)`);
    }

    /**
     * Generate lava rivers using Perlin noise (Level 5 - Volcanic Crater)
     * Only replaces GRASS tiles in playable area (skips spawn/base zones)
     * @param {number} coverage - Percentage coverage (0.0-1.0), default 0.35 for 35%
     */
    generateLavaRivers(coverage = 0.35) {
        const threshold = 1.0 - coverage; // 0.65 threshold = 35% coverage
        const noiseScale = 0.14; // Larger connected rivers
        const noiseOffsetX = Math.random() * 1000;
        const noiseOffsetY = Math.random() * 1000;

        let lavaCount = 0;
        const startCol = 3;
        const endCol = this.cols - 3;

        // Generate for ALL rows (including locked ones)
        for (let row = 0; row < this.rows; row++) {
            for (let col = startCol; col < endCol; col++) {
                // Only replace GRASS tiles
                if (this.terrain[row][col] !== TERRAIN_TYPES.GRASS) continue;

                const noiseX = (col + noiseOffsetX) * noiseScale;
                const noiseY = (row + noiseOffsetY) * noiseScale;
                const noiseValue = noise(noiseX, noiseY);

                if (noiseValue > threshold) {
                    this.setTerrainType(row, col, TERRAIN_TYPES.LAVA);
                    lavaCount++;
                }
            }
        }

        console.log(`Generated ${lavaCount} lava tiles (~${(lavaCount / (this.rows * (endCol - startCol)) * 100).toFixed(1)}% coverage)`);
    }

    /**
     * Initialize terrain for a specific level
     * @param {number} levelId - Level identifier (1-5)
     */
    initializeLevelTerrain(levelId) {
        // Reset all terrain to grass
        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.cols; col++) {
                this.terrain[row][col] = TERRAIN_TYPES.GRASS;
            }
        }

        console.log(`Initializing terrain for Level ${levelId}...`);

        switch (levelId) {
            case 1:
                // Level 1: Grasslands - no special terrain
                console.log('Level 1: Grasslands (no special terrain)');
                break;

            case 2:
                // Level 2: Marshlands - 30% water
                console.log('Level 2: Marshlands - generating water patches...');
                this.generateWaterPatches(0.30);
                break;

            case 3:
                // Level 3: Mountain Pass - cliffs added per unlock (existing system)
                console.log('Level 3: Mountain Pass (cliffs generate on unlock)');
                break;

            case 4:
                // Level 4: Frozen Wastes - 20% ice
                console.log('Level 4: Frozen Wastes - generating ice patches...');
                this.generateIcePatches(0.20);
                break;

            case 5:
                // Level 5: Volcanic Crater - 35% lava
                console.log('Level 5: Volcanic Crater - generating lava rivers...');
                this.generateLavaRivers(0.35);
                break;

            default:
                console.warn(`Unknown level ID: ${levelId}, using grasslands`);
        }
    }

    /**
     * Initialize fog of war trees for locked rows
     * Trees are randomly placed on locked tiles (excluding spawn/base zones)
     */
    initializeFogTrees() {
        this.trees = [];

        // Tree types: 0 = Oak, 1 = Pine, 2 = Birch, 3 = Maple
        const treeTypes = [0, 1, 2, 3];
        const treeDensity = 0.35; // 35% chance per tile

        for (let row = 0; row < this.rows; row++) {
            // Skip unlocked rows
            if (row >= this.unlockStart && row <= this.unlockEnd) continue;

            for (let col = 3; col < this.cols - 3; col++) { // Skip spawn/base zones
                // Random tree placement
                if (Math.random() < treeDensity) {
                    this.trees.push({
                        row: row,
                        col: col,
                        type: treeTypes[Math.floor(Math.random() * treeTypes.length)],
                        state: 'standing',
                        fallProgress: 0, // 0-1 (for animation)
                        fallAngle: 0     // Rotation angle during fall
                    });
                }
            }
        }

        console.log(`Fog of War: ${this.trees.length} machine trees generated`);
    }

    /**
     * Draw a machine-themed tree at specified position
     * @param {number} x - Screen X position (top-left)
     * @param {number} y - Screen Y position (top-left)
     * @param {number} type - Tree type (0-3)
     * @param {number} fallAngle - Rotation angle (0 = standing, PI/2 = fallen)
     */
    drawMachineTree(x, y, type, fallAngle = 0) {
        let cx = x + this.cellSize / 2;
        let cy = y + this.cellSize / 2;

        push();
        translate(cx, cy);

        // Rotate for falling animation (pivot at base)
        if (fallAngle > 0) {
            translate(0, this.cellSize / 3); // Pivot point near base
            rotate(fallAngle);
            translate(0, -this.cellSize / 3);
        }

        // Draw tree based on type
        switch (type) {
            case 0: // Oak Tree
                this.drawOakTree();
                break;
            case 1: // Pine Tree
                this.drawPineTree();
                break;
            case 2: // Birch Tree
                this.drawBirchTree();
                break;
            case 3: // Maple Tree
                this.drawMapleTree();
                break;
        }

        pop();
    }

    /**
     * Oak Tree - Layered green rectangles
     */
    drawOakTree() {
        noStroke();

        // Trunk (brown)
        fill(101, 67, 33); // Saddle brown
        rect(-3, 0, 6, 28);

        // Foliage - layered rectangles that get shorter as they go up
        fill(34, 139, 34); // Forest green

        // Layer 1 (bottom - widest)
        rect(-16, -8, 32, 6);

        // Layer 2
        fill(46, 125, 50);
        rect(-14, -13, 28, 5);

        // Layer 3
        fill(60, 140, 60);
        rect(-12, -17, 24, 5);

        // Layer 4
        fill(34, 139, 34);
        rect(-10, -21, 20, 4);

        // Layer 5 (top - shortest)
        fill(46, 125, 50);
        rect(-7, -24, 14, 3);
    }

    /**
     * Pine Tree - Narrow layered rectangles
     */
    drawPineTree() {
        noStroke();

        // Trunk
        fill(101, 67, 33);
        rect(-2, 2, 4, 26);

        // Foliage - narrow layers (pine shape)
        fill(35, 100, 35); // Dark green

        // Layer 1
        rect(-12, -4, 24, 5);

        // Layer 2
        fill(40, 115, 40);
        rect(-10, -8, 20, 4);

        // Layer 3
        fill(35, 100, 35);
        rect(-8, -12, 16, 4);

        // Layer 4
        fill(40, 115, 40);
        rect(-6, -16, 12, 4);

        // Layer 5
        fill(35, 100, 35);
        rect(-4, -20, 8, 4);

        // Layer 6 (top)
        fill(40, 115, 40);
        rect(-2, -23, 4, 3);
    }

    /**
     * Birch Tree - Tall with lighter colors
     */
    drawBirchTree() {
        noStroke();

        // Trunk (light gray-brown)
        fill(210, 180, 140); // Tan
        rect(-3, -2, 6, 30);

        // Bark stripes
        fill(80, 70, 60);
        rect(-3, 4, 6, 2);
        rect(-3, 12, 6, 2);
        rect(-3, 20, 6, 2);

        // Foliage - bright green layers
        fill(124, 252, 0); // Lawn green

        // Layer 1
        rect(-14, -10, 28, 5);

        // Layer 2
        fill(144, 238, 144);
        rect(-12, -14, 24, 4);

        // Layer 3
        fill(124, 252, 0);
        rect(-10, -18, 20, 4);

        // Layer 4
        fill(144, 238, 144);
        rect(-8, -21, 16, 3);

        // Layer 5 (top)
        fill(124, 252, 0);
        rect(-5, -24, 10, 3);
    }

    /**
     * Maple Tree - Wide rounded canopy
     */
    drawMapleTree() {
        noStroke();

        // Trunk
        fill(139, 90, 43); // Brown
        rect(-4, 2, 8, 26);

        // Foliage - wide rounded layers
        fill(85, 107, 47); // Dark olive green

        // Layer 1 (very wide)
        rect(-18, -6, 36, 6);

        // Layer 2
        fill(107, 142, 35);
        rect(-16, -11, 32, 5);

        // Layer 3
        fill(85, 107, 47);
        rect(-13, -15, 26, 4);

        // Layer 4
        fill(107, 142, 35);
        rect(-10, -19, 20, 4);

        // Layer 5 (top)
        fill(85, 107, 47);
        rect(-6, -22, 12, 3);
    }

    /**
     * Bounce easing out function
     * @param {number} t - Time/progress (0-1)
     * @returns {number} Eased value
     */
    easeOutBounce(t) {
        const n1 = 7.5625;
        const d1 = 2.75;

        if (t < 1 / d1) {
            return n1 * t * t;
        } else if (t < 2 / d1) {
            return n1 * (t -= 1.5 / d1) * t + 0.75;
        } else if (t < 2.5 / d1) {
            return n1 * (t -= 2.25 / d1) * t + 0.9375;
        } else {
            return n1 * (t -= 2.625 / d1) * t + 0.984375;
        }
    }

    /**
     * Update falling tree animations with bounce easing
     */
    updateFallingTrees() {
        for (let i = this.fallingTrees.length - 1; i >= 0; i--) {
            let tree = this.fallingTrees[i];

            tree.fallProgress += 0.015; // Slower fall speed (was 0.05)

            // Apply bounce easing to rotation
            let easedProgress = this.easeOutBounce(tree.fallProgress);
            tree.fallAngle = easedProgress * (PI / 2); // 0 to 90 degrees with bounce

            // Remove when fallen
            if (tree.fallProgress >= 1) {
                this.fallingTrees.splice(i, 1);
            }
        }
    }

    /**
     * Cut down trees in a row (called when row unlocks)
     * @param {number} row - Row that was unlocked
     */
    cutTreesInRow(row) {
        let treesCount = 0;

        for (let i = this.trees.length - 1; i >= 0; i--) {
            let tree = this.trees[i];

            if (tree.row === row) {
                // Start falling animation
                tree.state = 'falling';
                this.fallingTrees.push(tree);

                // Remove from standing trees
                this.trees.splice(i, 1);

                // Spawn brown particles (wood chips)
                let treeX = (tree.col + 0.5) * this.cellSize;
                let treeY = (tree.row + 0.5) * this.cellSize;

                if (Game.instance && Game.instance.objectManager) {
                    // Brown particles for wood
                    Game.instance.objectManager.spawnParticles(
                        treeX, treeY, 8, color(101, 67, 33)
                    );
                }

                // Spawn gold coins (5-10 gold per tree) using enemy death mechanic
                let goldValue = Math.floor(Math.random() * 6) + 5;
                if (Game.instance && Game.instance.objectManager) {
                    Game.instance.objectManager.spawnCoins(treeX, treeY, goldValue);
                }

                // Play coin sound
                if (window.Sounds) {
                    window.Sounds.play('coin');
                }

                treesCount++;
            }
        }

        if (treesCount > 0) {
            console.log(`${treesCount} trees cut down!`);
        }

        return treesCount;
    }

    /**
     * Draw fog of war overlay on locked rows
     * Progressive darkness based on distance from unlocked area
     */
    drawFogOfWar() {
        noStroke();

        for (let r = 0; r < this.rows; r++) {
            // Skip unlocked rows
            if (r >= this.unlockStart && r <= this.unlockEnd) continue;

            // Calculate distance from unlocked area
            let distanceFromUnlocked;
            if (r < this.unlockStart) {
                distanceFromUnlocked = this.unlockStart - r;
            } else {
                distanceFromUnlocked = r - this.unlockEnd;
            }

            // Progressive fog darkness (lighter near unlocked, darker far away)
            // First locked row: 120 alpha, increases by 25 per row, caps at 200
            let fogAlpha = Math.min(240 + (distanceFromUnlocked - 1) * 10, 255);

            // Fog color (dark blue-gray)
            fill(20, 25, 35, fogAlpha);

            // Draw fog overlay for entire row
            rect(0, r * this.cellSize, this.cols * this.cellSize, this.cellSize);
        }
    }

    /**
     * Draw machine trees on locked tiles
     * Includes standing trees and falling trees
     */
    drawTrees() {
        // Draw standing trees
        for (let tree of this.trees) {
            let x = tree.col * this.cellSize;
            let y = tree.row * this.cellSize;
            this.drawMachineTree(x, y, tree.type, 0);
        }

        // Draw falling trees (with rotation animation)
        for (let tree of this.fallingTrees) {
            let x = tree.col * this.cellSize;
            let y = tree.row * this.cellSize;
            this.drawMachineTree(x, y, tree.type, tree.fallAngle);
        }
    }

    // ========================================
    // STATIC BUILDER CLASS
    // ========================================

    /**
     * Fluent builder for creating Grid instances
     *
     * Usage:
     *   const grid = Grid.Builder.create()
     *       .withDimensions(20, 16)
     *       .withCellSize(32)
     *       .forLevel(2)
     *       .asRTSMode()
     *       .build();
     */
    static Builder = class {
        constructor() {
            this._reset();
        }

        _reset() {
            this._rows = 10;
            this._cols = 24;
            this._cellSize = 64;
            this._levelId = 1;
            this._isRTSMode = false;
            this._skipTrees = false;
            return this;
        }

        withDimensions(rows, cols) {
            this._rows = rows;
            this._cols = cols;
            return this;
        }

        withRows(rows) {
            this._rows = rows;
            return this;
        }

        withCols(cols) {
            this._cols = cols;
            return this;
        }

        withCellSize(size) {
            this._cellSize = size;
            return this;
        }

        forLevel(levelId) {
            this._levelId = levelId;
            return this;
        }

        asRTSMode() {
            this._isRTSMode = true;
            return this;
        }

        asTowerDefenseMode() {
            this._isRTSMode = false;
            return this;
        }

        withTrees() {
            this._skipTrees = false;
            return this;
        }

        withoutTrees() {
            this._skipTrees = true;
            return this;
        }

        build() {
            return new Grid(
                this._rows,
                this._cols,
                this._cellSize,
                this._levelId,
                {
                    isRTSMode: this._isRTSMode,
                    skipTrees: this._skipTrees
                }
            );
        }

        static create() {
            return new Grid.Builder();
        }

        static towerDefense(rows = 10, cols = 24, cellSize = 64) {
            return new Grid.Builder()
                .withDimensions(rows, cols)
                .withCellSize(cellSize)
                .asTowerDefenseMode()
                .build();
        }

        static rts(rows = 20, cols = 30, cellSize = 32) {
            return new Grid.Builder()
                .withDimensions(rows, cols)
                .withCellSize(cellSize)
                .asRTSMode()
                .withoutTrees()
                .build();
        }
    };
}

// ========================================
// GLOBAL TEST HELPER
// ========================================
/**
 * Test different level terrains from browser console
 * Usage: testLevelTerrain(2) - for Marshlands with water
 * Usage: testLevelTerrain(4) - for Frozen Wastes with ice
 * Usage: testLevelTerrain(5) - for Volcanic Crater with lava
 */
if (typeof window !== 'undefined') {
    window.testLevelTerrain = function (levelId) {
        if (!Game.instance || !Game.instance.grid) {
            console.error('Game not initialized yet!');
            return;
        }

        console.log(`\n====== TESTING LEVEL ${levelId} TERRAIN ======`);
        Game.instance.grid.initializeLevelTerrain(levelId);
        console.log('Terrain generated! Check the game board.\n');

        // Print terrain statistics
        let terrainCounts = {};
        for (let row = 0; row < Game.instance.grid.rows; row++) {
            for (let col = 0; col < Game.instance.grid.cols; col++) {
                let type = Game.instance.grid.terrain[row][col];
                terrainCounts[type] = (terrainCounts[type] || 0) + 1;
            }
        }

        console.log('Terrain Distribution:');
        Object.keys(terrainCounts).forEach(type => {
            let typeName = Object.keys(TERRAIN_TYPES).find(key => TERRAIN_TYPES[key] == type);
            let percentage = (terrainCounts[type] / (Game.instance.grid.rows * Game.instance.grid.cols) * 100).toFixed(1);
            console.log(`  ${typeName}: ${terrainCounts[type]} tiles (${percentage}%)`);
        });
    };


}
