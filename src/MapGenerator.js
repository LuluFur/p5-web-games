/**
 * MapGenerator.js - Procedural map generation for RTS mode
 *
 * Handles:
 * - Pre-placed construction yards for each player
 * - Terrain feature generation (rocks, cliffs, water)
 * - Tiberium field placement at strategic locations
 * - Symmetric or asymmetric map layouts
 */

// Map layout presets
const MAP_LAYOUTS = {
    SYMMETRIC_2P: 'symmetric_2p',      // 2 players, mirrored
    SYMMETRIC_4P: 'symmetric_4p',      // 4 players, rotational symmetry
    ASYMMETRIC: 'asymmetric',          // Random, balanced spawns
    LANES: 'lanes'                     // 2-3 lanes with chokepoints
};

// Terrain feature types
const TERRAIN_FEATURES = {
    ROCK: 'rock',
    CLIFF: 'cliff',
    WATER: 'water',
    CRATER: 'crater'
};

// Surface types for Perlin noise terrain
const SURFACE_TYPES = {
    SAND: 'sand',
    DARK_SAND: 'dark_sand',
    MUD: 'mud',
    LOW_GRASS: 'low_grass',
    MID_GRASS: 'mid_grass',
    WATER: 'water',
    DEEP_WATER: 'deep_water'
};

// Desert-themed color palettes for each surface type
const SURFACE_COLORS = {
    [SURFACE_TYPES.SAND]: { base: [210, 180, 140], variation: 15 },
    [SURFACE_TYPES.DARK_SAND]: { base: [180, 150, 110], variation: 12 },
    [SURFACE_TYPES.MUD]: { base: [101, 67, 33], variation: 10 },
    [SURFACE_TYPES.LOW_GRASS]: { base: [160, 150, 100], variation: 20 },
    [SURFACE_TYPES.MID_GRASS]: { base: [130, 140, 80], variation: 15 },
    [SURFACE_TYPES.WATER]: { base: [65, 105, 140], variation: 10 },
    [SURFACE_TYPES.DEEP_WATER]: { base: [40, 70, 110], variation: 8 }
};

class MapGenerator {
    constructor(config = {}) {
        // Grid reference
        this.grid = config.grid || null;

        // Map size preset handling
        let sizePreset = null;
        if (config.sizePreset && typeof MAP_SIZES !== 'undefined') {
            sizePreset = MAP_SIZES[config.sizePreset] || MAP_SIZES.MEDIUM;
        }

        // Map dimensions (in cells) - use preset if provided
        this.rows = config.rows || (sizePreset ? sizePreset.rows : 30);
        this.cols = config.cols || (sizePreset ? sizePreset.cols : 40);
        this.cellSize = config.cellSize || 32;

        // Layout configuration
        this.layout = config.layout || MAP_LAYOUTS.SYMMETRIC_2P;
        this.playerCount = config.playerCount || 2;

        // Generation parameters - use preset values if provided
        this.tiberiumDensity = config.tiberiumDensity || 0.15;
        this.terrainDensity = config.terrainDensity || 0.08;
        this.minBaseClearance = config.minBaseClearance || (sizePreset ? sizePreset.minBaseClearance : 8);

        // Random seed for reproducible generation
        this.seed = config.seed || Math.floor(Math.random() * 100000);
        this.rng = this.createSeededRandom(this.seed);

        // Generated data
        this.startPositions = [];       // Construction yard positions
        this.tiberiumFields = [];       // Tiberium spawn regions
        this.terrainFeatures = [];      // Rocks, cliffs, water
        this.pathClearances = [];       // Guaranteed clear paths
        this.surfaceMap = [];           // 2D array of surface types
        this.riverPaths = [];           // River flow paths
        this.chokePoints = [];          // Narrow tactical corridors
        this.expansionZones = [];       // Strategic expansion locations

        // Perlin noise settings - use preset values if provided
        this.noiseScale = config.noiseScale || (sizePreset ? sizePreset.noiseScale : 0.08);
        this.riverNoiseScale = config.riverNoiseScale || (sizePreset ? sizePreset.riverNoiseScale : 0.03);
        this.mudThreshold = 0.15;       // How common mud is (lower = rarer)
        this.grassThreshold = 0.35;     // Transition to grass
        this.waterThreshold = 0.7;      // River threshold
    }

    /**
     * Create seeded random number generator
     */
    createSeededRandom(seed) {
        let s = seed;
        return () => {
            s = (s * 1103515245 + 12345) & 0x7fffffff;
            return s / 0x7fffffff;
        };
    }

    /**
     * Generate complete map
     * @returns {Object} Generated map data
     */
    generate() {
        const maxAttempts = 10;
        let attempt = 0;
        let pathfindingValid = false;

        // Retry generation until valid pathfinding or max attempts reached
        while (!pathfindingValid && attempt < maxAttempts) {
            if (attempt > 0) {
                console.warn(`MapGenerator: Pathfinding validation failed, retrying generation (attempt ${attempt + 1}/${maxAttempts})`);
                // Generate new seed for retry
                this.seed = Math.floor(Math.random() * 100000);
                this.rng = this.createSeededRandom(this.seed);
            }

            // Clear previous generation
            this.startPositions = [];
            this.tiberiumFields = [];
            this.terrainFeatures = [];
            this.pathClearances = [];
            this.surfaceMap = [];
            this.riverPaths = [];
            this.chokePoints = [];
            this.expansionZones = [];

            // Set noise seed for reproducibility
            if (typeof noiseSeed === 'function') {
                noiseSeed(this.seed);
            }

            console.log(`MapGenerator: Generating map with seed ${this.seed}`);

            // Step 1: Place construction yards FIRST (needed for POI masking)
            this.generateStartPositions();

            // Step 2: Place tiberium fields (needed for POI masking)
            this.generateTiberiumFields();

            // Step 3: Generate expansion zones (after tiberium to avoid overlap)
            this.generateExpansionZones();

            // Step 4: Generate base terrain surfaces with Perlin noise (masks out POIs)
            this.generateSurfaceMap();

            // Step 5: Generate choke points between bases (after surface map created)
            this.generateChokePoints();

            // Step 6: Generate rivers using noise-based flow
            this.generateRivers();

            // Step 7: Apply smooth terrain transitions around bases
            this.applyBaseTerrainTransitions();

            // Step 8: Calculate path clearances between bases
            this.calculatePathClearances();

            // Step 9: Add terrain features (avoiding paths, bases, chokes, expansions)
            this.generateTerrainFeatures();

            // Step 10: Apply to grid if provided
            if (this.grid) {
                this.applyToGrid();
            }

            // Step 11: Validate pathfinding between bases
            pathfindingValid = this.validatePathfinding();

            if (!pathfindingValid) {
                attempt++;
            }
        }

        if (!pathfindingValid) {
            console.error(`MapGenerator: Failed to generate valid map after ${maxAttempts} attempts`);
        } else if (attempt > 0) {
            console.log(`MapGenerator: Successfully generated valid map after ${attempt + 1} attempts`);
        }

        return {
            startPositions: this.startPositions,
            tiberiumFields: this.tiberiumFields,
            terrainFeatures: this.terrainFeatures,
            surfaceMap: this.surfaceMap,
            riverPaths: this.riverPaths,
            chokePoints: this.chokePoints,
            expansionZones: this.expansionZones,
            seed: this.seed
        };
    }

    /**
     * Generate surface map using Perlin noise
     * Creates desert-themed terrain with sand, mud, grass patches
     * Masks out water near POIs (bases and tiberium fields)
     */
    generateSurfaceMap() {
        // Initialize 2D array
        this.surfaceMap = new Array(this.rows);

        for (let y = 0; y < this.rows; y++) {
            this.surfaceMap[y] = new Array(this.cols);

            for (let x = 0; x < this.cols; x++) {
                // Sample multiple octaves of noise for varied terrain
                const baseNoise = this.sampleNoise(x, y, this.noiseScale);
                const detailNoise = this.sampleNoise(x, y, this.noiseScale * 2.5) * 0.3;
                const combinedNoise = baseNoise + detailNoise;

                // Check distance to POIs for water masking
                const poiDistance = this.getDistanceToPOI(x, y);
                const minWaterDistance = this.minBaseClearance + 4; // Extra buffer for water

                // Determine surface type based on noise value
                let surfaceType = this.getSurfaceTypeFromNoise(combinedNoise, poiDistance, minWaterDistance);

                // Calculate color with variation
                const colorData = this.getSurfaceColor(surfaceType, x, y);

                // Water tiles are blocked (not walkable, not buildable)
                const isWater = surfaceType === SURFACE_TYPES.WATER || surfaceType === SURFACE_TYPES.DEEP_WATER;

                this.surfaceMap[y][x] = {
                    type: surfaceType,
                    color: colorData,
                    noiseValue: combinedNoise,
                    blocked: isWater,
                    walkable: !isWater,
                    buildable: !isWater
                };
            }
        }
    }

    /**
     * Get distance to nearest POI (base or tiberium field)
     * @param {number} x - Grid X coordinate
     * @param {number} y - Grid Y coordinate
     * @returns {number} Distance to nearest POI
     */
    getDistanceToPOI(x, y) {
        let minDist = Infinity;

        // Check distance to bases
        for (const start of this.startPositions) {
            const dist = Math.sqrt(
                Math.pow(x - start.gridX, 2) +
                Math.pow(y - start.gridY, 2)
            );
            minDist = Math.min(minDist, dist);
        }

        // Check distance to tiberium fields
        for (const field of this.tiberiumFields) {
            const dist = Math.sqrt(
                Math.pow(x - field.gridX, 2) +
                Math.pow(y - field.gridY, 2)
            );
            // Account for field radius
            minDist = Math.min(minDist, dist - field.radius);
        }

        return minDist;
    }

    /**
     * Sample Perlin noise at position
     * Uses p5.js noise() if available, otherwise fallback
     */
    sampleNoise(x, y, scale) {
        if (typeof noise === 'function') {
            return noise(x * scale, y * scale);
        }
        // Fallback: simplified noise approximation
        const n = Math.sin(x * scale * 12.9898 + y * scale * 78.233) * 43758.5453;
        return n - Math.floor(n);
    }

    /**
     * Determine surface type from noise value
     * Desert theme: mostly sand, with mud, grass patches
     * Masks out water near POIs using distance-based falloff
     * @param {number} noiseValue - Combined noise value (0-1+)
     * @param {number} poiDistance - Distance to nearest POI (optional)
     * @param {number} minWaterDistance - Minimum distance for water spawning (optional)
     */
    getSurfaceTypeFromNoise(noiseValue, poiDistance = Infinity, minWaterDistance = 12) {
        // Normalize to 0-1 range
        const n = Math.max(0, Math.min(1, noiseValue));

        // Check if we should allow water at this position
        // Water is completely blocked near POIs, with gradual falloff
        const canHaveWater = poiDistance >= minWaterDistance;
        const waterFalloff = poiDistance < minWaterDistance + 4 ?
            (poiDistance - minWaterDistance) / 4 : 1.0; // Gradual transition zone

        // Water (rivers handled separately, but keep deep areas)
        // Only spawn water if far enough from POIs
        if (canHaveWater && waterFalloff > 0.5) {
            if (n > this.waterThreshold + 0.1) {
                return SURFACE_TYPES.DEEP_WATER;
            }
            if (n > this.waterThreshold) {
                return SURFACE_TYPES.WATER;
            }
        }

        // In the transition zone, replace would-be water with dark sand
        if (!canHaveWater && n > this.waterThreshold) {
            return SURFACE_TYPES.DARK_SAND;
        }

        // Grass patches (oasis-like areas)
        if (n > this.grassThreshold + 0.15) {
            return SURFACE_TYPES.MID_GRASS;
        }
        if (n > this.grassThreshold) {
            return SURFACE_TYPES.LOW_GRASS;
        }

        // Mud (rare, in lower areas)
        if (n < this.mudThreshold) {
            return SURFACE_TYPES.MUD;
        }

        // Dark sand transitions
        if (n < this.mudThreshold + 0.1) {
            return SURFACE_TYPES.DARK_SAND;
        }

        // Default: sand
        return SURFACE_TYPES.SAND;
    }

    /**
     * Get surface color with per-cell variation
     */
    getSurfaceColor(surfaceType, x, y) {
        const colorDef = SURFACE_COLORS[surfaceType] || SURFACE_COLORS[SURFACE_TYPES.SAND];
        const variation = colorDef.variation;

        // Add subtle variation using position-based noise
        const varNoise = this.sampleNoise(x * 3, y * 3, 0.5) - 0.5;

        return {
            r: Math.floor(colorDef.base[0] + varNoise * variation),
            g: Math.floor(colorDef.base[1] + varNoise * variation),
            b: Math.floor(colorDef.base[2] + varNoise * variation)
        };
    }

    /**
     * Generate rivers using Perlin noise flow
     */
    generateRivers() {
        // Determine number of rivers based on map size
        const riverCount = Math.floor(Math.min(this.cols, this.rows) / 15);

        for (let i = 0; i < riverCount; i++) {
            const river = this.generateRiverPath(i);
            if (river && river.length > 10) {
                this.riverPaths.push(river);
                this.carveRiver(river);
            }
        }
    }

    /**
     * Generate a single river path using noise-guided flow
     */
    generateRiverPath(riverIndex) {
        const path = [];

        // Start from edge of map
        let x, y;
        const edge = riverIndex % 4;

        switch (edge) {
            case 0: // Top edge
                x = Math.floor(this.rng() * (this.cols - 10)) + 5;
                y = 0;
                break;
            case 1: // Right edge
                x = this.cols - 1;
                y = Math.floor(this.rng() * (this.rows - 10)) + 5;
                break;
            case 2: // Bottom edge
                x = Math.floor(this.rng() * (this.cols - 10)) + 5;
                y = this.rows - 1;
                break;
            case 3: // Left edge
                x = 0;
                y = Math.floor(this.rng() * (this.rows - 10)) + 5;
                break;
        }

        // Flow river across map using noise for meandering
        const maxSteps = this.cols + this.rows;
        let prevAngle = (edge + 2) % 4 * Math.PI / 2;  // Flow toward opposite edge

        for (let step = 0; step < maxSteps; step++) {
            // Check bounds
            if (x < 0 || x >= this.cols || y < 0 || y >= this.rows) {
                break;
            }

            // Check if too close to a base
            if (this.tooCloseToBase(x, y)) {
                break;
            }

            path.push({ x: Math.floor(x), y: Math.floor(y) });

            // Use noise to determine flow direction with meandering
            const flowNoise = this.sampleNoise(x + riverIndex * 100, y, this.riverNoiseScale);
            const angleOffset = (flowNoise - 0.5) * Math.PI * 0.5;  // ±45 degrees
            const angle = prevAngle + angleOffset * 0.3;

            // Move in flow direction
            x += Math.cos(angle) * 1.2;
            y += Math.sin(angle) * 1.2;

            prevAngle = angle;
        }

        return path;
    }

    /**
     * Carve river into surface map
     */
    carveRiver(riverPath) {
        for (const point of riverPath) {
            const width = 1 + Math.floor(this.rng() * 2);  // 1-2 cells wide

            for (let dy = -width; dy <= width; dy++) {
                for (let dx = -width; dx <= width; dx++) {
                    const gx = point.x + dx;
                    const gy = point.y + dy;

                    if (gx >= 0 && gx < this.cols && gy >= 0 && gy < this.rows) {
                        const dist = Math.sqrt(dx * dx + dy * dy);

                        if (dist <= width) {
                            // Center is deep water, edges are shallow
                            const surfaceType = dist < width * 0.5 ?
                                SURFACE_TYPES.DEEP_WATER :
                                SURFACE_TYPES.WATER;

                            this.surfaceMap[gy][gx] = {
                                type: surfaceType,
                                color: this.getSurfaceColor(surfaceType, gx, gy),
                                noiseValue: 1,
                                blocked: surfaceType === SURFACE_TYPES.DEEP_WATER,
                                isRiver: true
                            };
                        }
                    }
                }
            }
        }
    }

    /**
     * Apply smooth terrain transitions around base areas
     * Creates gradual blend from sand bases to surrounding terrain
     */
    applyBaseTerrainTransitions() {
        const transitionRadius = this.minBaseClearance + 6; // Extra cells for transition
        const coreRadius = this.minBaseClearance - 2; // Inner area stays pure sand

        for (const start of this.startPositions) {
            for (let dy = -transitionRadius; dy <= transitionRadius; dy++) {
                for (let dx = -transitionRadius; dx <= transitionRadius; dx++) {
                    const gx = start.gridX + dx;
                    const gy = start.gridY + dy;

                    if (gx < 0 || gx >= this.cols || gy < 0 || gy >= this.rows) continue;

                    const dist = Math.sqrt(dx * dx + dy * dy);

                    // Skip core area (already sand)
                    if (dist <= coreRadius) continue;

                    // Skip outside transition zone
                    if (dist > transitionRadius) continue;

                    // Calculate blend factor (0 = sand, 1 = original terrain)
                    const blendFactor = (dist - coreRadius) / (transitionRadius - coreRadius);

                    // Get current terrain
                    const current = this.surfaceMap[gy]?.[gx];
                    if (!current || current.clearedForBase) continue;

                    // Don't transition into water - replace with sand
                    if (current.type === SURFACE_TYPES.WATER) {
                        this.surfaceMap[gy][gx] = {
                            type: SURFACE_TYPES.SAND,
                            color: this.getSurfaceColor(SURFACE_TYPES.SAND, gx, gy),
                            noiseValue: 0.5,
                            blocked: false
                        };
                        continue;
                    }

                    // Blend terrain: low blend = more sand-like
                    if (blendFactor < 0.5 && current.type !== SURFACE_TYPES.SAND) {
                        // Transition zone - use light sand or dark sand
                        const transitionType = blendFactor < 0.25 ?
                            SURFACE_TYPES.SAND : SURFACE_TYPES.DARK_SAND;
                        this.surfaceMap[gy][gx] = {
                            type: transitionType,
                            color: this.getSurfaceColor(transitionType, gx, gy),
                            noiseValue: current.noiseValue,
                            blocked: false
                        };
                    }
                }
            }
        }
    }

    /**
     * Clear terrain around base positions (make buildable)
     */
    clearBaseAreas() {
        for (const start of this.startPositions) {
            const clearRadius = this.minBaseClearance;

            for (let dy = -clearRadius; dy <= clearRadius; dy++) {
                for (let dx = -clearRadius; dx <= clearRadius; dx++) {
                    const gx = start.gridX + dx;
                    const gy = start.gridY + dy;

                    if (gx >= 0 && gx < this.cols && gy >= 0 && gy < this.rows) {
                        // Set to sand/buildable terrain
                        this.surfaceMap[gy][gx] = {
                            type: SURFACE_TYPES.SAND,
                            color: this.getSurfaceColor(SURFACE_TYPES.SAND, gx, gy),
                            noiseValue: 0.5,
                            blocked: false,
                            clearedForBase: true
                        };
                    }
                }
            }
        }
    }

    /**
     * Generate starting positions based on layout
     */
    generateStartPositions() {
        const margin = 4;  // Cells from edge
        const yardSize = { width: 3, height: 3 };  // Construction yard is 3x3

        switch (this.layout) {
            case MAP_LAYOUTS.SYMMETRIC_2P:
                this.generateSymmetric2P(margin, yardSize);
                break;

            case MAP_LAYOUTS.SYMMETRIC_4P:
                this.generateSymmetric4P(margin, yardSize);
                break;

            case MAP_LAYOUTS.LANES:
                this.generateLanes(margin, yardSize);
                break;

            case MAP_LAYOUTS.ASYMMETRIC:
            default:
                this.generateAsymmetric(margin, yardSize);
                break;
        }
    }

    /**
     * Generate 2-player symmetric positions (corners)
     */
    generateSymmetric2P(margin, yardSize) {
        // Player 1: Bottom-left
        this.startPositions.push({
            playerId: 0,
            gridX: margin,
            gridY: this.rows - margin - yardSize.height,
            pixelX: margin * this.cellSize,
            pixelY: (this.rows - margin - yardSize.height) * this.cellSize
        });

        // Player 2: Top-right
        this.startPositions.push({
            playerId: 1,
            gridX: this.cols - margin - yardSize.width,
            gridY: margin,
            pixelX: (this.cols - margin - yardSize.width) * this.cellSize,
            pixelY: margin * this.cellSize
        });
    }

    /**
     * Generate 4-player symmetric positions (all corners)
     */
    generateSymmetric4P(margin, yardSize) {
        const positions = [
            { gridX: margin, gridY: margin },                                           // Top-left
            { gridX: this.cols - margin - yardSize.width, gridY: margin },              // Top-right
            { gridX: margin, gridY: this.rows - margin - yardSize.height },             // Bottom-left
            { gridX: this.cols - margin - yardSize.width, gridY: this.rows - margin - yardSize.height }  // Bottom-right
        ];

        for (let i = 0; i < Math.min(this.playerCount, 4); i++) {
            this.startPositions.push({
                playerId: i,
                gridX: positions[i].gridX,
                gridY: positions[i].gridY,
                pixelX: positions[i].gridX * this.cellSize,
                pixelY: positions[i].gridY * this.cellSize
            });
        }
    }

    /**
     * Generate lane-based positions (left vs right)
     */
    generateLanes(margin, yardSize) {
        const centerY = Math.floor(this.rows / 2);

        // Player 1: Left side, center
        this.startPositions.push({
            playerId: 0,
            gridX: margin,
            gridY: centerY - Math.floor(yardSize.height / 2),
            pixelX: margin * this.cellSize,
            pixelY: (centerY - Math.floor(yardSize.height / 2)) * this.cellSize
        });

        // Player 2: Right side, center
        this.startPositions.push({
            playerId: 1,
            gridX: this.cols - margin - yardSize.width,
            gridY: centerY - Math.floor(yardSize.height / 2),
            pixelX: (this.cols - margin - yardSize.width) * this.cellSize,
            pixelY: (centerY - Math.floor(yardSize.height / 2)) * this.cellSize
        });
    }

    /**
     * Generate asymmetric but balanced positions
     */
    generateAsymmetric(margin, yardSize) {
        // For asymmetric, use varied positions but ensure fairness
        const candidates = this.generateCandidatePositions(margin, yardSize);

        // Select positions that are roughly equidistant from center
        const centerX = this.cols / 2;
        const centerY = this.rows / 2;

        // Sort by distance from center
        candidates.sort((a, b) => {
            const distA = Math.sqrt(Math.pow(a.gridX - centerX, 2) + Math.pow(a.gridY - centerY, 2));
            const distB = Math.sqrt(Math.pow(b.gridX - centerX, 2) + Math.pow(b.gridY - centerY, 2));
            return distB - distA;  // Furthest from center first
        });

        // Select spread-out positions
        for (let i = 0; i < this.playerCount && i < candidates.length; i++) {
            const pos = candidates[i];
            this.startPositions.push({
                playerId: i,
                gridX: pos.gridX,
                gridY: pos.gridY,
                pixelX: pos.gridX * this.cellSize,
                pixelY: pos.gridY * this.cellSize
            });
        }
    }

    /**
     * Generate candidate starting positions
     */
    generateCandidatePositions(margin, yardSize) {
        const candidates = [];
        const step = 6;  // Check every 6 cells

        for (let y = margin; y < this.rows - margin - yardSize.height; y += step) {
            for (let x = margin; x < this.cols - margin - yardSize.width; x += step) {
                candidates.push({ gridX: x, gridY: y });
            }
        }

        // Shuffle using seeded RNG
        for (let i = candidates.length - 1; i > 0; i--) {
            const j = Math.floor(this.rng() * (i + 1));
            [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
        }

        return candidates;
    }

    /**
     * Calculate clearance paths between bases
     */
    calculatePathClearances() {
        // Create direct paths between each pair of bases
        for (let i = 0; i < this.startPositions.length; i++) {
            for (let j = i + 1; j < this.startPositions.length; j++) {
                const start = this.startPositions[i];
                const end = this.startPositions[j];

                // Create a wide path (corridor) between bases
                this.pathClearances.push({
                    from: { x: start.gridX + 1, y: start.gridY + 1 },
                    to: { x: end.gridX + 1, y: end.gridY + 1 },
                    width: 4  // Path width in cells
                });
            }
        }
    }

    /**
     * Generate tiberium fields at strategic locations
     * All fields are mirrored across the map center for perfect symmetry
     */
    generateTiberiumFields() {
        const centerX = Math.floor(this.cols / 2);
        const centerY = Math.floor(this.rows / 2);

        // 1. Place blue tiberium in the center (contested resource)
        this.tiberiumFields.push({
            gridX: centerX,
            gridY: centerY,
            radius: 3,
            density: 0.9,
            type: 'blue',
            contested: true
        });

        // 2. Place green tiberium near BOTH player bases
        const player1 = this.startPositions[0];
        const player2 = this.startPositions[1];

        // Generate tiberium near Player 1's base
        if (player1) {
            const nearbyField = this.generateNearbyTiberium(player1, 6, 10);
            if (nearbyField) {
                this.tiberiumFields.push(nearbyField);
                console.log(`MapGenerator: Created tiberium near P1 at grid (${nearbyField.gridX}, ${nearbyField.gridY})`);
            }

            const secondaryField = this.generateNearbyTiberium(player1, 10, 15);
            if (secondaryField && !this.tiberiumOverlaps(secondaryField)) {
                this.tiberiumFields.push(secondaryField);
                console.log(`MapGenerator: Created secondary tiberium near P1 at grid (${secondaryField.gridX}, ${secondaryField.gridY})`);
            }
        }

        // Generate tiberium near Player 2's base (directly, not mirrored)
        if (player2) {
            const nearbyField = this.generateNearbyTiberium(player2, 6, 10);
            if (nearbyField && !this.tiberiumOverlaps(nearbyField)) {
                this.tiberiumFields.push(nearbyField);
                console.log(`MapGenerator: Created tiberium near P2 at grid (${nearbyField.gridX}, ${nearbyField.gridY})`);
            }

            const secondaryField = this.generateNearbyTiberium(player2, 10, 15);
            if (secondaryField && !this.tiberiumOverlaps(secondaryField)) {
                this.tiberiumFields.push(secondaryField);
                console.log(`MapGenerator: Created secondary tiberium near P2 at grid (${secondaryField.gridX}, ${secondaryField.gridY})`);
            }
        }

        // 3. Add mirrored field pairs in the middle area (contested zones)
        const middleFieldCount = 3;
        for (let i = 0; i < middleFieldCount; i++) {
            const fieldPair = this.generateMirroredFieldPair(centerX, centerY);
            if (fieldPair) {
                this.tiberiumFields.push(...fieldPair);
            }
        }
    }

    /**
     * Mirror a tiberium field across the map center
     */
    mirrorTiberiumField(field, centerX, centerY) {
        const mirroredX = centerX + (centerX - field.gridX);
        const mirroredY = centerY + (centerY - field.gridY);
        const radius = field.radius;

        // Check bounds including field radius
        if (mirroredX - radius < 0 || mirroredX + radius >= this.cols ||
            mirroredY - radius < 0 || mirroredY + radius >= this.rows) {
            return null;
        }

        return {
            gridX: mirroredX,
            gridY: mirroredY,
            radius: radius,
            density: field.density,
            type: field.type,
            mirrored: true
        };
    }

    /**
     * Generate a mirrored pair of tiberium fields
     */
    generateMirroredFieldPair(centerX, centerY) {
        const maxAttempts = 20;

        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            const radius = Math.floor(this.rng() * 2) + 2;

            // Generate position in one quadrant with bounds safety
            const maxOffsetX = Math.min(centerX - radius - 2, this.cols - centerX - radius - 2);
            const maxOffsetY = Math.min(centerY - radius - 2, this.rows - centerY - radius - 2);

            if (maxOffsetX < 4 || maxOffsetY < 4) continue;

            const offsetX = Math.floor(this.rng() * (maxOffsetX - 4)) + 4;
            const offsetY = Math.floor(this.rng() * (maxOffsetY - 4)) + 4;

            const x1 = centerX - offsetX;
            const y1 = centerY - offsetY;
            const x2 = centerX + offsetX;
            const y2 = centerY + offsetY;

            const density = 0.6 + this.rng() * 0.3;

            // Verify both fields are fully within bounds
            if (x1 - radius < 0 || x2 + radius >= this.cols ||
                y1 - radius < 0 || y2 + radius >= this.rows) {
                continue;
            }

            // Check both positions are valid
            const field1 = { gridX: x1, gridY: y1, radius, density, type: 'green' };
            const field2 = { gridX: x2, gridY: y2, radius, density, type: 'green' };

            if (!this.tiberiumOverlaps(field1) && !this.tiberiumOverlaps(field2) &&
                !this.tooCloseToBase(x1, y1) && !this.tooCloseToBase(x2, y2)) {
                return [field1, field2];
            }
        }

        return null;
    }

    /**
     * Check if a field overlaps existing fields
     */
    tiberiumOverlaps(field) {
        for (const existing of this.tiberiumFields) {
            const dist = Math.sqrt(
                Math.pow(field.gridX - existing.gridX, 2) +
                Math.pow(field.gridY - existing.gridY, 2)
            );
            if (dist < field.radius + existing.radius + 2) {
                return true;
            }
        }
        return false;
    }

    /**
     * Check if position is too close to any base
     */
    tooCloseToBase(x, y) {
        for (const start of this.startPositions) {
            const dist = Math.sqrt(
                Math.pow(x - start.gridX, 2) +
                Math.pow(y - start.gridY, 2)
            );
            if (dist < this.minBaseClearance) {
                return true;
            }
        }
        return false;
    }

    /**
     * Generate choke points - narrow corridors between bases
     * Creates 2-4 tactical bottlenecks for defensive gameplay
     */
    generateChokePoints() {
        if (this.startPositions.length < 2) return;

        const player1 = this.startPositions[0];
        const player2 = this.startPositions[1];

        // Generate 2-4 choke points along different paths between bases
        const chokeCount = 2 + Math.floor(this.rng() * 3);  // 2-4 chokes

        for (let i = 0; i < chokeCount; i++) {
            const t = (i + 1) / (chokeCount + 1);  // Position along path (evenly distributed)

            // Add random variation to position
            const variance = (this.rng() - 0.5) * 0.2;  // ±10% variation
            const actualT = Math.max(0.2, Math.min(0.8, t + variance));

            // Linear interpolation between bases
            const centerX = Math.floor(player1.gridX + (player2.gridX - player1.gridX) * actualT);
            const centerY = Math.floor(player1.gridY + (player2.gridY - player1.gridY) * actualT);

            // Add perpendicular offset for variety
            const perpAngle = Math.atan2(player2.gridY - player1.gridY, player2.gridX - player1.gridX) + Math.PI / 2;
            const perpOffset = (this.rng() - 0.5) * 8;  // ±4 cells perpendicular
            const chokeX = Math.floor(centerX + Math.cos(perpAngle) * perpOffset);
            const chokeY = Math.floor(centerY + Math.sin(perpAngle) * perpOffset);

            // Ensure choke point is within bounds
            if (chokeX < 2 || chokeX >= this.cols - 2 || chokeY < 2 || chokeY >= this.rows - 2) {
                continue;
            }

            // Choke point dimensions (narrow corridor)
            const width = 3 + Math.floor(this.rng() * 2);  // 3-4 cells wide
            const length = 4 + Math.floor(this.rng() * 3);  // 4-6 cells long

            // Determine orientation based on base positions
            const angle = Math.atan2(player2.gridY - player1.gridY, player2.gridX - player1.gridX);

            this.chokePoints.push({
                gridX: chokeX,
                gridY: chokeY,
                width: width,
                length: length,
                angle: angle,
                cleared: false
            });
        }

        // Apply choke points to surface map (clear terrain)
        this.applyChokePoints();

        console.log(`MapGenerator: Generated ${this.chokePoints.length} choke points`);
    }

    /**
     * Apply choke points to surface map
     * Clears narrow corridors and marks them to prevent tiberium/feature placement
     */
    applyChokePoints() {
        for (const choke of this.chokePoints) {
            // Clear corridor area
            for (let dy = -choke.length; dy <= choke.length; dy++) {
                for (let dx = -choke.width; dx <= choke.width; dx++) {
                    // Rotate offset based on angle
                    const rotX = Math.cos(choke.angle) * dx - Math.sin(choke.angle) * dy;
                    const rotY = Math.sin(choke.angle) * dx + Math.cos(choke.angle) * dy;

                    const gx = Math.floor(choke.gridX + rotX);
                    const gy = Math.floor(choke.gridY + rotY);

                    // Check bounds
                    if (gx < 0 || gx >= this.cols || gy < 0 || gy >= this.rows) continue;

                    // Only clear within corridor width
                    if (Math.abs(dx) <= choke.width / 2 && Math.abs(dy) <= choke.length / 2) {
                        // Set to sand (clear, walkable terrain)
                        if (this.surfaceMap[gy] && this.surfaceMap[gy][gx]) {
                            this.surfaceMap[gy][gx] = {
                                type: SURFACE_TYPES.SAND,
                                color: this.getSurfaceColor(SURFACE_TYPES.SAND, gx, gy),
                                noiseValue: 0.5,
                                blocked: false,
                                walkable: true,
                                buildable: true,
                                isChokePoint: true
                            };
                        }
                    }
                }
            }

            choke.cleared = true;
        }
    }

    /**
     * Get choke points for game systems
     * @returns {Array} Array of choke point data
     */
    getChokePoints() {
        return this.chokePoints;
    }

    /**
     * Generate expansion zones - strategic locations with buildable area + tiberium
     * Creates 2-3 expansions per player at medium distance from base
     */
    generateExpansionZones() {
        if (this.startPositions.length < 1) return;

        const expansionsPerPlayer = 2 + Math.floor(this.rng());  // 2-3 expansions per player

        for (const player of this.startPositions) {
            for (let i = 0; i < expansionsPerPlayer; i++) {
                const expansion = this.generateSingleExpansion(player, i);
                if (expansion) {
                    this.expansionZones.push(expansion);
                }
            }
        }

        console.log(`MapGenerator: Generated ${this.expansionZones.length} expansion zones`);
    }

    /**
     * Generate a single expansion zone
     * @param {object} basePos - Player's base position
     * @param {number} index - Expansion index for this player
     * @returns {object|null} Expansion data or null if generation failed
     */
    generateSingleExpansion(basePos, index) {
        const maxAttempts = 20;
        const minDist = 15;  // Minimum 15 cells from base
        const maxDist = 25;  // Maximum 25 cells from base
        const buildableSize = 8;  // 8×8 buildable area
        const tiberiumRadius = 3;  // Tiberium field radius

        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            // Random angle and distance
            const angle = this.rng() * Math.PI * 2;
            const distance = minDist + this.rng() * (maxDist - minDist);

            const centerX = Math.floor(basePos.gridX + Math.cos(angle) * distance);
            const centerY = Math.floor(basePos.gridY + Math.sin(angle) * distance);

            // Check if expansion is within bounds (including buildable area and tiberium radius)
            const margin = Math.max(buildableSize / 2, tiberiumRadius) + 1;
            if (centerX - margin < 0 || centerX + margin >= this.cols ||
                centerY - margin < 0 || centerY + margin >= this.rows) {
                continue;
            }

            // Check if expansion overlaps with existing tiberium fields
            let overlaps = false;
            for (const field of this.tiberiumFields) {
                const dist = Math.sqrt(
                    Math.pow(centerX - field.gridX, 2) +
                    Math.pow(centerY - field.gridY, 2)
                );
                if (dist < field.radius + tiberiumRadius + 3) {
                    overlaps = true;
                    break;
                }
            }
            if (overlaps) continue;

            // Check if expansion overlaps with existing expansions
            for (const existing of this.expansionZones) {
                const dist = Math.sqrt(
                    Math.pow(centerX - existing.gridX, 2) +
                    Math.pow(centerY - existing.gridY, 2)
                );
                if (dist < buildableSize + 4) {
                    overlaps = true;
                    break;
                }
            }
            if (overlaps) continue;

            // Check if too close to other bases
            for (const otherBase of this.startPositions) {
                if (otherBase.playerId === basePos.playerId) continue;
                const dist = Math.sqrt(
                    Math.pow(centerX - otherBase.gridX, 2) +
                    Math.pow(centerY - otherBase.gridY, 2)
                );
                if (dist < minDist) {
                    overlaps = true;
                    break;
                }
            }
            if (overlaps) continue;

            // Valid expansion location found
            const expansion = {
                playerId: basePos.playerId,
                gridX: centerX,
                gridY: centerY,
                buildableSize: buildableSize,
                tiberiumRadius: tiberiumRadius,
                tiberiumField: null  // Will be populated below
            };

            // Create tiberium field for this expansion
            const tiberiumField = {
                gridX: centerX + Math.floor((this.rng() - 0.5) * 4),  // Slight offset
                gridY: centerY + Math.floor((this.rng() - 0.5) * 4),
                radius: tiberiumRadius,
                density: 0.75,
                type: 'green',
                isExpansion: true,
                expansionId: this.expansionZones.length
            };

            // Add tiberium field to global list
            this.tiberiumFields.push(tiberiumField);
            expansion.tiberiumField = tiberiumField;

            return expansion;
        }

        // Failed to generate expansion after max attempts
        console.warn(`MapGenerator: Failed to generate expansion ${index} for player ${basePos.playerId}`);
        return null;
    }

    /**
     * Get expansion zones for game systems
     * @returns {Array} Array of expansion zone data
     */
    getExpansionZones() {
        return this.expansionZones;
    }

    /**
     * Validate pathfinding between all player bases
     * Ensures at least one valid path exists between bases
     * @returns {boolean} True if all bases are connected, false otherwise
     */
    validatePathfinding() {
        if (!this.grid || this.startPositions.length < 2) {
            return true;  // Nothing to validate
        }

        // Check pathfinding between all pairs of bases
        for (let i = 0; i < this.startPositions.length; i++) {
            for (let j = i + 1; j < this.startPositions.length; j++) {
                const start = this.startPositions[i];
                const end = this.startPositions[j];

                // Use Pathfinder to find path between bases
                if (typeof Pathfinder !== 'undefined') {
                    const path = Pathfinder.findPathWorld(
                        this.grid,
                        start.pixelX,
                        start.pixelY,
                        end.pixelX,
                        end.pixelY,
                        { useCache: false }
                    );

                    if (!path || path.length === 0) {
                        console.warn(`MapGenerator: No valid path between player ${start.playerId} and player ${end.playerId}`);
                        return false;
                    }
                }
            }
        }

        return true;
    }

    /**
     * Get map seed for display/debug
     * @returns {number} The random seed used for this map
     */
    getMapSeed() {
        return this.seed;
    }

    /**
     * Generate tiberium near a specific base
     */
    generateNearbyTiberium(basePos, minDist, maxDist) {
        const maxAttempts = 10;
        const radius = 3;

        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            const angle = this.rng() * Math.PI * 2;
            const distance = minDist + this.rng() * (maxDist - minDist);

            const x = Math.floor(basePos.gridX + Math.cos(angle) * distance);
            const y = Math.floor(basePos.gridY + Math.sin(angle) * distance);

            // Ensure field is fully within bounds (including radius)
            if (x - radius >= 0 && x + radius < this.cols &&
                y - radius >= 0 && y + radius < this.rows) {
                return {
                    gridX: x,
                    gridY: y,
                    radius: radius,
                    density: 0.8,
                    type: 'green',
                    nearBase: basePos.playerId
                };
            }
        }

        // Fallback: place at safe position
        const safeX = Math.max(radius + 1, Math.min(this.cols - radius - 1, basePos.gridX + minDist));
        const safeY = Math.max(radius + 1, Math.min(this.rows - radius - 1, basePos.gridY + minDist));

        return {
            gridX: safeX,
            gridY: safeY,
            radius: radius,
            density: 0.8,
            type: 'green',
            nearBase: basePos.playerId
        };
    }

    /**
     * Generate terrain features (obstacles)
     */
    generateTerrainFeatures() {
        const featureCount = Math.floor(this.cols * this.rows * this.terrainDensity / 10);

        for (let i = 0; i < featureCount; i++) {
            const feature = this.generateTerrainFeature();
            if (feature) {
                this.terrainFeatures.push(feature);
            }
        }
    }

    /**
     * Generate a single terrain feature
     */
    generateTerrainFeature() {
        const maxAttempts = 30;
        const types = [
            TERRAIN_FEATURES.ROCK,
            TERRAIN_FEATURES.ROCK,
            TERRAIN_FEATURES.CLIFF,
            TERRAIN_FEATURES.CRATER
        ];

        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            const x = Math.floor(this.rng() * (this.cols - 4)) + 2;
            const y = Math.floor(this.rng() * (this.rows - 4)) + 2;
            const type = types[Math.floor(this.rng() * types.length)];
            const size = Math.floor(this.rng() * 2) + 1;  // 1-2 cells

            if (this.isValidFeaturePlacement(x, y, size)) {
                return {
                    type: type,
                    gridX: x,
                    gridY: y,
                    width: size,
                    height: size,
                    rotation: this.rng() * Math.PI * 2
                };
            }
        }

        return null;
    }

    /**
     * Check if terrain feature placement is valid
     */
    isValidFeaturePlacement(x, y, size) {
        // Check distance from bases
        for (const start of this.startPositions) {
            const dist = Math.sqrt(
                Math.pow(x - start.gridX, 2) +
                Math.pow(y - start.gridY, 2)
            );
            if (dist < this.minBaseClearance) {
                return false;
            }
        }

        // Check if blocking path between bases
        for (const path of this.pathClearances) {
            if (this.isOnPath(x, y, path)) {
                return false;
            }
        }

        // Check distance from tiberium fields
        for (const field of this.tiberiumFields) {
            const dist = Math.sqrt(
                Math.pow(x - field.gridX, 2) +
                Math.pow(y - field.gridY, 2)
            );
            if (dist < field.radius + 2) {
                return false;
            }
        }

        return true;
    }

    /**
     * Check if position is on a clearance path
     */
    isOnPath(x, y, path) {
        // Simple line distance check
        const dx = path.to.x - path.from.x;
        const dy = path.to.y - path.from.y;
        const length = Math.sqrt(dx * dx + dy * dy);

        if (length === 0) return false;

        // Project point onto line
        const t = Math.max(0, Math.min(1,
            ((x - path.from.x) * dx + (y - path.from.y) * dy) / (length * length)
        ));

        const closestX = path.from.x + t * dx;
        const closestY = path.from.y + t * dy;

        const distance = Math.sqrt(
            Math.pow(x - closestX, 2) +
            Math.pow(y - closestY, 2)
        );

        return distance < path.width;
    }

    /**
     * Apply generated map to grid
     */
    applyToGrid() {
        if (!this.grid) return;

        // Set surface map for terrain rendering
        if (this.surfaceMap && this.grid.setSurfaceMap) {
            this.grid.setSurfaceMap(this.surfaceMap);
        }

        // Mark terrain features as blocked
        for (const feature of this.terrainFeatures) {
            for (let dy = 0; dy < feature.height; dy++) {
                for (let dx = 0; dx < feature.width; dx++) {
                    const gx = feature.gridX + dx;
                    const gy = feature.gridY + dy;

                    if (gx >= 0 && gx < this.cols && gy >= 0 && gy < this.rows) {
                        this.grid.setCell(gy, gx, {
                            blocked: true,
                            terrainType: feature.type,
                            buildable: false
                        });
                    }
                }
            }
        }

        // Mark tiberium fields
        for (const field of this.tiberiumFields) {
            for (let dy = -field.radius; dy <= field.radius; dy++) {
                for (let dx = -field.radius; dx <= field.radius; dx++) {
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist <= field.radius && this.rng() < field.density) {
                        const gx = field.gridX + dx;
                        const gy = field.gridY + dy;

                        if (gx >= 0 && gx < this.cols && gy >= 0 && gy < this.rows) {
                            this.grid.setCell(gy, gx, {
                                hasTiberium: true,
                                tiberiumAmount: 500 + Math.floor(this.rng() * 500),
                                tiberiumType: field.type
                            });
                        }
                    }
                }
            }
        }
    }

    /**
     * Get construction yard position for a player
     * @param {number} playerId
     * @returns {Object|null} Position data or null
     */
    getStartPositionForPlayer(playerId) {
        return this.startPositions.find(pos => pos.playerId === playerId) || null;
    }

    /**
     * Get all tiberium fields near a position
     * @param {number} x Grid X
     * @param {number} y Grid Y
     * @param {number} radius Search radius
     */
    getTiberiumFieldsNear(x, y, radius) {
        return this.tiberiumFields.filter(field => {
            const dist = Math.sqrt(
                Math.pow(x - field.gridX, 2) +
                Math.pow(y - field.gridY, 2)
            );
            return dist <= radius + field.radius;
        });
    }

    // ========================================
    // STATIC BUILDER CLASS
    // ========================================

    static Builder = class {
        constructor() {
            this._reset();
        }

        _reset() {
            this._grid = null;
            this._rows = 30;
            this._cols = 40;
            this._cellSize = 32;
            this._layout = MAP_LAYOUTS.SYMMETRIC_2P;
            this._playerCount = 2;
            this._tiberiumDensity = 0.15;
            this._terrainDensity = 0.08;
            this._seed = null;
            this._sizePreset = null;
            return this;
        }

        withGrid(grid) {
            this._grid = grid;
            this._rows = grid.rows;
            this._cols = grid.cols;
            this._cellSize = grid.cellSize;
            return this;
        }

        withDimensions(rows, cols) {
            this._rows = rows;
            this._cols = cols;
            return this;
        }

        withSize(rows, cols) {
            return this.withDimensions(rows, cols);
        }

        withSizePreset(preset) {
            this._sizePreset = preset;
            return this;
        }

        small() {
            this._sizePreset = 'SMALL';
            return this;
        }

        medium() {
            this._sizePreset = 'MEDIUM';
            return this;
        }

        large() {
            this._sizePreset = 'LARGE';
            return this;
        }

        withCellSize(size) {
            this._cellSize = size;
            return this;
        }

        withLayout(layout) {
            this._layout = layout;
            return this;
        }

        symmetric2Player() {
            this._layout = MAP_LAYOUTS.SYMMETRIC_2P;
            this._playerCount = 2;
            return this;
        }

        symmetric4Player() {
            this._layout = MAP_LAYOUTS.SYMMETRIC_4P;
            this._playerCount = 4;
            return this;
        }

        lanes() {
            this._layout = MAP_LAYOUTS.LANES;
            return this;
        }

        asymmetric() {
            this._layout = MAP_LAYOUTS.ASYMMETRIC;
            return this;
        }

        withPlayerCount(count) {
            this._playerCount = count;
            return this;
        }

        withTiberiumDensity(density) {
            this._tiberiumDensity = density;
            return this;
        }

        withTerrainDensity(density) {
            this._terrainDensity = density;
            return this;
        }

        withSeed(seed) {
            this._seed = seed;
            return this;
        }

        randomSeed() {
            this._seed = Math.floor(Math.random() * 100000);
            return this;
        }

        build() {
            return new MapGenerator({
                grid: this._grid,
                rows: this._rows,
                cols: this._cols,
                cellSize: this._cellSize,
                layout: this._layout,
                playerCount: this._playerCount,
                tiberiumDensity: this._tiberiumDensity,
                terrainDensity: this._terrainDensity,
                seed: this._seed,
                sizePreset: this._sizePreset
            });
        }

        /**
         * Build and immediately generate
         * @returns {Object} Generated map data
         */
        buildAndGenerate() {
            const generator = this.build();
            return generator.generate();
        }

        static create() {
            return new MapGenerator.Builder();
        }

        // ========================================
        // STATIC FACTORY METHODS
        // ========================================

        /**
         * Create 2-player symmetric map
         */
        static twoPlayer(grid, seed = null) {
            return MapGenerator.Builder.create()
                .withGrid(grid)
                .symmetric2Player()
                .withSeed(seed)
                .build();
        }

        /**
         * Create 4-player symmetric map
         */
        static fourPlayer(grid, seed = null) {
            return MapGenerator.Builder.create()
                .withGrid(grid)
                .symmetric4Player()
                .withSeed(seed)
                .build();
        }

        /**
         * Create lane-based map (MOBA style)
         */
        static laneMap(grid, seed = null) {
            return MapGenerator.Builder.create()
                .withGrid(grid)
                .lanes()
                .withTiberiumDensity(0.1)
                .withTerrainDensity(0.12)
                .withSeed(seed)
                .build();
        }
    };
}

// Export for global access
if (typeof window !== 'undefined') {
    window.MapGenerator = MapGenerator;
    window.MAP_LAYOUTS = MAP_LAYOUTS;
    window.TERRAIN_FEATURES = TERRAIN_FEATURES;
}
