/**
 * VisibilityManager - Tracks visibility/fog of war for all players
 *
 * Responsible for:
 * - Tracking what each player can see based on unit/building vision ranges
 * - Updating visible entities each frame
 * - Providing visibility checks for game logic
 * - Supporting fog of war rendering
 */

class VisibilityManager {
    constructor() {
        // Map of playerId -> Set of visible entity IDs
        this.visibleEntities = new Map();

        // Map of playerId -> Set of visible positions (for terrain/map)
        this.visiblePositions = new Map();

        // Cache for performance (updated once per frame)
        this.cacheValid = false;

        // SMART OPTIMIZATION: Per-unit vision cache using integer keys
        // playerId -> unitId -> Set<number> (packed grid coordinates)
        this.unitVisionCache = new Map();

        // SMART OPTIMIZATION: Track which regions have dirty visibility
        // Instead of recalculating everything, only update affected regions
        this.dirtyRegions = new Set();
    }

    /**
     * Initialize visibility tracking for a player
     * @param {object} player - The player object
     */
    registerPlayer(player) {
        if (!player || player.id === undefined || player.id === null) {
            console.warn('VisibilityManager: Player has no valid ID');
            return;
        }

        this.visibleEntities.set(player.id, new Set());
        this.visiblePositions.set(player.id, new Set());

        // Initialize FOW cache tracking
        if (!player.fowCache) {
            player.fowCache = {
                exploredCount: 0,
                visibleCount: 0,
                lastFrameExploredCount: -1
            };
        }
    }

    /**
     * Update visibility for all players
     * ULTRA-SMART THROTTLED OPTIMIZATION:
     * - Only update entity visibility when units move significantly
     * - Only update grid cells when units move > vision range / 5
     * - Reduces expensive calculations from every frame to every 5-10 frames
     */
    updateVisibility(players, unitManager, buildingManager) {
        if (!players || !unitManager || !buildingManager) return;

        for (const player of players) {
            // SMART THROTTLE: Only update if any player unit moved significantly
            const shouldUpdate = this.shouldUpdatePlayerVisibility(player, unitManager);

            if (shouldUpdate) {
                // Update which enemy units/buildings are visible
                this.updatePlayerVisibility(player, unitManager, buildingManager);

                // Update explored cells for units that moved
                this.updateExploredCellsIncremental(player, unitManager, buildingManager);
            }
        }

        this.cacheValid = true;
    }

    /**
     * Check if player visibility needs updating
     * Only updates when units move > 1/5 of their vision range
     * Reduces expensive spatial queries from 60fps to ~10fps
     */
    shouldUpdatePlayerVisibility(player, unitManager) {
        // Initialize cache
        if (!this._visibilityUpdateCache) {
            this._visibilityUpdateCache = new Map();
        }

        const cacheKey = `player_${player.id}`;
        const cache = this._visibilityUpdateCache.get(cacheKey) || {
            lastUpdateTime: 0,
            lastUnitPositions: new Map()
        };

        const playerUnits = unitManager.unitsByPlayer.get(player) || [];
        let hasMeaningfulMovement = false;

        // Check if any unit moved more than 1/5 of its vision range
        for (const unit of playerUnits) {
            if (unit.isDead() || !unit.active) continue;

            const unitKey = `unit_${unit.id}`;
            const lastPos = cache.lastUnitPositions.get(unitKey);

            // Get vision range to determine meaningful movement threshold
            const visionRange = this.getVisionRange(unit);
            const moveThreshold = Math.max(50, visionRange / 5); // At least 50px

            if (!lastPos) {
                // First time seeing this unit
                cache.lastUnitPositions.set(unitKey, { x: unit.x, y: unit.y });
                hasMeaningfulMovement = true;
                break;
            }

            const dx = Math.abs(lastPos.x - unit.x);
            const dy = Math.abs(lastPos.y - unit.y);
            const distanceMoved = Math.sqrt(dx * dx + dy * dy);

            if (distanceMoved > moveThreshold) {
                cache.lastUnitPositions.set(unitKey, { x: unit.x, y: unit.y });
                hasMeaningfulMovement = true;
                break; // Only need one unit to have moved significantly
            }
        }

        // Clean up removed units
        for (const key of cache.lastUnitPositions.keys()) {
            const unitId = parseInt(key.split('_')[1]);
            const stillExists = playerUnits.some(u => u.id === unitId);
            if (!stillExists) {
                cache.lastUnitPositions.delete(key);
            }
        }

        this._visibilityUpdateCache.set(cacheKey, cache);
        return hasMeaningfulMovement;
    }

    /**
     * ULTRA-SMART INCREMENTAL UPDATE: Track grid cell position
     * Only recalculate when unit crosses grid boundaries (not on every pixel movement)
     * This MASSIVELY reduces string allocations and calculations
     */
    updateExploredCellsIncremental(player, unitManager, buildingManager) {
        if (!player || player.isSpectator) return;

        // Get player's vision sources
        const playerUnits = unitManager.unitsByPlayer.get(player) || [];
        const playerBuildings = buildingManager
            ? buildingManager.buildings.filter(b => b.owner === player && b.active && !b.isDead())
            : [];

        const visionSources = [...playerUnits, ...playerBuildings];
        const cellSize = RTS_GRID?.CELL_SIZE || 32;

        if (visionSources.length === 0) return;

        // DEBUG: Log vision sources on first frame
        if (!this._debugLoggedVisionSources) {
            this._debugLoggedVisionSources = true;
            console.log(`[FOW] Player ${player.id} has ${visionSources.length} vision sources:`);
            for (const source of visionSources) {
                const range = this.getVisionRange(source);
                console.log(`  - ${source.name || source.type}: vision range = ${range}px (${(range/cellSize).toFixed(1)} cells)`);
            }
        }

        // Initialize player caches if needed
        if (!this.unitVisionCache.has(player.id)) {
            this.unitVisionCache.set(player.id, new Map());
        }
        const playerUnitCache = this.unitVisionCache.get(player.id);

        // Always calculate visible cells so FOW works when enabled
        player.visibleCells.clear();

        // Track explored cells only if FOW is being rendered (optimization)
        const trackExploredCells = Game.instance && Game.instance.showFogOfWar;

        // Calculate visibility for all vision sources
        for (const source of visionSources) {
            const sourceId = source.id;
            const cacheKey = `${source.constructor.name}_${sourceId}`;

            // Get current grid cell position
            const currentGridX = Math.floor(source.x / cellSize);
            const currentGridY = Math.floor(source.y / cellSize);
            const currentGridPos = (currentGridX << 16) | currentGridY; // Pack as 32-bit

            // Get last cached grid position
            const lastGridPosKey = `${cacheKey}_gridPos`;
            const lastGridPos = this.unitVisionCache.get(lastGridPosKey);

            // Only recalculate if unit moved to a different grid cell
            const movedToNewCell = lastGridPos === undefined || lastGridPos !== currentGridPos;

            let sourceVisionCells = playerUnitCache.get(cacheKey);

            if (movedToNewCell) {
                // Recalculate vision only when crossing grid boundaries
                sourceVisionCells = this.calculateVisionCellsAsIntegers(source, cellSize);

                // Cache this unit's vision
                playerUnitCache.set(cacheKey, sourceVisionCells);
                this.unitVisionCache.set(lastGridPosKey, currentGridPos);
            }

            // Add to visible/explored cells for FOW rendering
            if (sourceVisionCells) {
                for (const integerKey of sourceVisionCells) {
                    const stringKey = this.integerKeyToString(integerKey);
                    player.visibleCells.add(stringKey);

                    // Only track explored cells if FOW rendering is enabled (optimization)
                    if (trackExploredCells) {
                        player.exploredCells.add(stringKey);
                    }
                }
            }
        }
    }

    /**
     * Convert packed integer coordinates to grid string key
     */
    integerKeyToString(integerKey) {
        const gridX = integerKey >> 10;
        const gridY = integerKey & 1023;
        return `${gridX},${gridY}`;
    }

    /**
     * Calculate vision cells for a source using INTEGER keys
     * No string allocation = no GC pressure
     * @returns Set<number> with packed coordinates (x << 10 | y)
     */
    calculateVisionCellsAsIntegers(source, cellSize) {
        const visionRange = this.getVisionRange(source);
        if (visionRange <= 0) return new Set();

        const cellSet = new Set();
        const centerGridX = Math.floor(source.x / cellSize);
        const centerGridY = Math.floor(source.y / cellSize);
        const radiusInCells = Math.ceil(visionRange / cellSize);
        const visionRangeSq = visionRange * visionRange;

        // Pre-compute source center
        const sourceCenterX = source.x + cellSize / 2;
        const sourceCenterY = source.y + cellSize / 2;

        for (let dx = -radiusInCells; dx <= radiusInCells; dx++) {
            const gridX = centerGridX + dx;
            const cellCenterX = gridX * cellSize + cellSize / 2;
            const dx2 = cellCenterX - sourceCenterX;
            const dx2Sq = dx2 * dx2;

            // Early termination: if dx alone exceeds range, skip this column
            if (dx2Sq > visionRangeSq) continue;

            for (let dy = -radiusInCells; dy <= radiusInCells; dy++) {
                const gridY = centerGridY + dy;
                const cellCenterY = gridY * cellSize + cellSize / 2;
                const dy2 = cellCenterY - sourceCenterY;
                const distSq = dx2Sq + dy2 * dy2;

                if (distSq <= visionRangeSq) {
                    // Pack coordinates as integer (supports up to 1024×1024 grids)
                    const packedKey = (gridX << 10) | gridY;
                    cellSet.add(packedKey);
                }
            }
        }

        return cellSet;
    }

    /**
     * Convert packed integer key back to string for Set storage
     */
    unpackCellKey(packedKey) {
        const gridX = packedKey >> 10;
        const gridY = packedKey & 1023;
        return `${gridX},${gridY}`;
    }


    /**
     * Update visibility for a specific player
     * OPTIMIZED: Use spatial queries instead of checking all units/buildings
     * @param {object} player - The player to update
     * @param {UnitManager} unitManager - Unit manager instance
     * @param {BuildingManager} buildingManager - Building manager instance
     */
    updatePlayerVisibility(player, unitManager, buildingManager) {
        if (!player.id) return;

        const visibleSet = this.visibleEntities.get(player.id);
        if (!visibleSet) return;

        visibleSet.clear();

        // Get player's units (using cached array for performance)
        const playerUnits = unitManager.unitsByPlayer.get(player) || [];
        const playerBuildings = buildingManager
            ? buildingManager.buildings.filter(b => b.owner === player && b.active && !b.isDead())
            : [];

        // For each unit/building, add visible entities to the set
        const visionSources = [...playerUnits, ...playerBuildings];

        for (const source of visionSources) {
            const visionRange = this.getVisionRange(source);
            if (visionRange <= 0) continue;

            // Use spatial query to find nearby units (much faster than checking all)
            const nearbyUnits = unitManager.getUnitsInRadius(source.x, source.y, visionRange);
            for (const unit of nearbyUnits) {
                if (unit.owner === player) continue; // Skip friendly units
                if (unit.isDead()) continue;
                if (!unit.active) continue;

                // Double-check range (spatial query gives approximation)
                if (this.isInRange(source, unit, visionRange)) {
                    visibleSet.add(`unit_${unit.id}`);
                }
            }

            // For buildings, still need to iterate (no spatial query available yet)
            // But fewer buildings typically exist than units
            if (buildingManager) {
                for (const building of buildingManager.buildings) {
                    if (building.owner === player) continue; // Skip friendly buildings
                    if (building.isDead()) continue;
                    if (!building.active) continue;

                    if (this.isInRange(source, building, visionRange)) {
                        visibleSet.add(`building_${building.id}`);
                    }
                }
            }
        }
    }


    /**
     * Get vision range for a unit or building
     * @param {Unit|Building} entity
     * @returns {number} Vision range in pixels
     */
    getVisionRange(entity) {
        if (!entity) return 0;

        // Units use sightRange (in grid cells), convert to pixels
        if (entity.getSightRange) {
            const cellSize = RTS_GRID?.CELL_SIZE || 32;
            return entity.getSightRange() * cellSize;
        }

        // Buildings use visionRange (in pixels)
        if (entity.visionRange !== undefined) {
            return entity.visionRange;
        }

        return 0;
    }

    /**
     * Check if target is within range of source
     * OPTIMIZED: Uses squared distance to avoid Math.sqrt
     * @param {Unit|Building} source
     * @param {Unit|Building} target
     * @param {number} range
     * @returns {boolean}
     */
    isInRange(source, target, range) {
        if (!source || !target) return false;

        const dx = target.x - source.x;
        const dy = target.y - source.y;
        const distSq = dx * dx + dy * dy;
        const rangeSq = range * range;

        return distSq <= rangeSq;
    }

    /**
     * Check if an entity is visible to a player
     * @param {object} player - The player
     * @param {Unit|Building} entity - Entity to check
     * @returns {boolean} True if visible
     */
    isVisible(player, entity) {
        if (!player || !entity) return false;

        const visibleSet = this.visibleEntities.get(player.id);
        if (!visibleSet) return false;

        if (entity.type !== undefined && (entity.type === 'unit' || entity.type.startsWith('INFANTRY') || entity.type.startsWith('VEHICLE'))) {
            // It's a unit
            return visibleSet.has(`unit_${entity.id}`);
        } else {
            // It's a building
            return visibleSet.has(`building_${entity.id}`);
        }
    }

    /**
     * Alternative check - determine if entity is visible based on entity structure
     * @param {object} player - The player
     * @param {Unit|Building} entity - Entity to check
     * @returns {boolean} True if visible
     */
    canSee(player, entity) {
        if (!player || !entity) return false;

        const visibleSet = this.visibleEntities.get(player.id);
        if (!visibleSet) return false;

        // Check if entity ID is in the visible set (either as unit or building)
        if (visibleSet.has(`unit_${entity.id}`) || visibleSet.has(`building_${entity.id}`)) {
            return true;
        }

        return false;
    }

    /**
     * Get all visible units for a player
     * @param {object} player - The player
     * @param {UnitManager} unitManager
     * @returns {Unit[]} Array of visible units
     */
    getVisibleUnits(player, unitManager) {
        if (!player || !unitManager) return [];

        const visibleSet = this.visibleEntities.get(player.id);
        if (!visibleSet) return [];

        const visible = [];
        for (const unit of unitManager.units) {
            if (visibleSet.has(`unit_${unit.id}`)) {
                visible.push(unit);
            }
        }

        return visible;
    }

    /**
     * Get all visible buildings for a player
     * @param {object} player - The player
     * @param {BuildingManager} buildingManager
     * @returns {Building[]} Array of visible buildings
     */
    getVisibleBuildings(player, buildingManager) {
        if (!player || !buildingManager) return [];

        const visibleSet = this.visibleEntities.get(player.id);
        if (!visibleSet) return [];

        const visible = [];
        for (const building of buildingManager.buildings) {
            if (visibleSet.has(`building_${building.id}`)) {
                visible.push(building);
            }
        }

        return visible;
    }

    /**
     * Draw vision ranges for debugging
     * Shows circles around units/buildings indicating their vision range
     * @param {object} player - The player to show vision for (usually local player)
     * @param {UnitManager} unitManager
     * @param {BuildingManager} buildingManager
     */
    debugDrawVisionRanges(player, unitManager, buildingManager) {
        if (!player || !unitManager) return;

        const playerUnits = unitManager.units.filter(u => u.owner === player && u.active && !u.isDead());
        const playerBuildings = buildingManager ?
            buildingManager.buildings.filter(b => b.owner === player && b.active && !b.isDead()) :
            [];

        // Draw unit vision ranges
        for (const unit of playerUnits) {
            const range = this.getVisionRange(unit);
            if (range > 0) {
                noFill();
                stroke(0, 255, 0, 100);
                strokeWeight(1);
                ellipse(unit.x, unit.y, range * 2, range * 2);
            }
        }

        // Draw building vision ranges
        for (const building of playerBuildings) {
            const range = this.getVisionRange(building);
            if (range > 0) {
                noFill();
                stroke(0, 200, 255, 100);
                strokeWeight(1);
                ellipse(building.x, building.y, range * 2, range * 2);
            }
        }
    }

    /**
     * Draw fog of war overlay for a player
     * Optimized: Only redraws when explored cells change
     * @param {object} player - The player to render FOW for
     * @param {object} grid - The grid for reference
     */
    drawFogOfWar(player, grid) {
        if (!player || !player.visibleCells || !player.exploredCells) {
            console.warn("FOW: Missing player or cell data");
            return;
        }

        const cellSize = grid?.cellSize || RTS_GRID?.CELL_SIZE || 32;


        // Skip rendering if no explored cells (common early game)
        if (player.exploredCells.size === 0) {
            return;
        }

        // Initialize cache if needed
        if (!player.fowCache) {
            player.fowCache = {
                exploredCount: player.exploredCells.size,
                visibleCount: player.visibleCells.size,
                lastFrameExploredCount: -1
            };
        }

        // Update counts
        player.fowCache.exploredCount = player.exploredCells.size;
        player.fowCache.visibleCount = player.visibleCells.size;

        push();
        noStroke();
        fill(0, 0, 0, 100); // Dark semi-transparent overlay

        // Batch render: Collect rectangles and draw them more efficiently
        // Instead of drawing one by one, collect coordinates for batch rendering
        const shroudedCells = [];
        for (const cellKey of player.exploredCells) {
            if (!player.visibleCells.has(cellKey)) {
                shroudedCells.push(cellKey);
            }
        }

        // Draw all shrouded cells
        // p5.js is optimized for multiple rect calls in sequence
        for (const cellKey of shroudedCells) {
            const [gridX, gridY] = cellKey.split(',').map(Number);
            const x = gridX * cellSize;
            const y = gridY * cellSize;
            rect(x, y, cellSize, cellSize);
        }

        pop();
    }

    /**
     * Draw vision range circles (debug visualization)
     * @param {object} player - The player
     * @param {UnitManager} unitManager - Unit manager instance
     * @param {BuildingManager} buildingManager - Building manager instance
     */
    drawVisionRangesDebug(player, unitManager, buildingManager) {
        const playerUnits = unitManager.units.filter(u => u.owner === player && u.active && !u.isDead());
        const playerBuildings = buildingManager ?
            buildingManager.buildings.filter(b => b.owner === player && b.active && !b.isDead()) :
            [];

        push();
        strokeWeight(1);
        stroke(100, 200, 100, 80);
        noFill();

        for (const unit of playerUnits) {
            const range = this.getVisionRange(unit);
            if (range > 0) {
                circle(unit.x, unit.y, range * 2);
            }
        }

        for (const building of playerBuildings) {
            const range = this.getVisionRange(building);
            if (range > 0) {
                circle(building.x, building.y, range * 2);
            }
        }

        pop();
    }

    /**
     * Clear all visibility data
     */
    clear() {
        this.visibleEntities.clear();
        this.visiblePositions.clear();
        this.cacheValid = false;
    }

    /**
     * Get debug info for console logging
     * @param {object} player
     * @returns {object} Debug info
     */
    getDebugInfo(player) {
        if (!player || !this.visibleEntities.has(player.id)) {
            return { error: 'No visibility data for player' };
        }

        const visibleSet = this.visibleEntities.get(player.id);
        const visibleUnits = Array.from(visibleSet).filter(id => id.startsWith('unit_')).length;
        const visibleBuildings = Array.from(visibleSet).filter(id => id.startsWith('building_')).length;

        return {
            playerId: player.id,
            visibleUnits,
            visibleBuildings,
            totalVisible: visibleSet.size
        };
    }
}

// Export for global access
if (typeof window !== 'undefined') {
    window.VisibilityManager = VisibilityManager;
}
