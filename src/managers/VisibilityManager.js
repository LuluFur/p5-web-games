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
     * Should be called once per frame
     */
    updateVisibility(players, unitManager, buildingManager) {
        if (!players || !unitManager || !buildingManager) return;

        for (const player of players) {
            this.updatePlayerVisibility(player, unitManager, buildingManager);
            this.updateExploredCells(player, unitManager, buildingManager);
        }

        this.cacheValid = true;
    }

    /**
     * Update visibility for a specific player
     * @param {object} player - The player to update
     * @param {UnitManager} unitManager - Unit manager instance
     * @param {BuildingManager} buildingManager - Building manager instance
     */
    updatePlayerVisibility(player, unitManager, buildingManager) {
        if (!player.id) return;

        const visibleSet = this.visibleEntities.get(player.id);
        if (!visibleSet) return;

        visibleSet.clear();

        // Get all player's units and buildings
        const playerUnits = unitManager.units.filter(u => u.owner === player && u.active && !u.isDead());
        const playerBuildings = buildingManager ?
            buildingManager.buildings.filter(b => b.owner === player && b.active && !b.isDead()) :
            [];

        // For each unit/building, add visible entities to the set
        const visionSources = [...playerUnits, ...playerBuildings];

        for (const source of visionSources) {
            const visionRange = this.getVisionRange(source);
            if (visionRange <= 0) continue;

            // Check all enemy units
            for (const unit of unitManager.units) {
                if (unit.owner === player) continue; // Skip friendly units
                if (unit.isDead()) continue;
                if (!unit.active) continue;

                if (this.isInRange(source, unit, visionRange)) {
                    visibleSet.add(`unit_${unit.id}`);
                }
            }

            // Check all enemy buildings
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
     * Update explored and visible cells for a player based on vision sources
     * Optimized to avoid unnecessary recalculation
     * @param {object} player - The player to update
     * @param {UnitManager} unitManager - Unit manager instance
     * @param {BuildingManager} buildingManager - Building manager instance
     */
    updateExploredCells(player, unitManager, buildingManager) {
        if (!player || player.isSpectator) return;

        // Clear current visible cells, but keep explored cells
        player.visibleCells.clear();

        // Get all player's units and buildings (vision sources)
        const playerUnits = unitManager.units.filter(u => u.owner === player && u.active && !u.isDead());
        const playerBuildings = buildingManager ?
            buildingManager.buildings.filter(b => b.owner === player && b.active && !b.isDead()) :
            [];

        const visionSources = [...playerUnits, ...playerBuildings];
        const cellSize = RTS_GRID?.CELL_SIZE || 32;


        // Optimization: skip cell calculation if no vision sources
        if (visionSources.length === 0) {
            return;
        }

        // For each vision source, mark cells as visible and explored
        for (const source of visionSources) {
            const visionRange = this.getVisionRange(source);
            if (visionRange <= 0) continue;

            // Calculate grid cells within vision range using circular area
            const centerGridX = Math.floor(source.x / cellSize);
            const centerGridY = Math.floor(source.y / cellSize);
            const radiusInCells = Math.ceil(visionRange / cellSize);

            // Optimization: use squared distance to avoid Math.hypot overhead
            const visionRangeSq = visionRange * visionRange;

            for (let dx = -radiusInCells; dx <= radiusInCells; dx++) {
                for (let dy = -radiusInCells; dy <= radiusInCells; dy++) {
                    const gridX = centerGridX + dx;
                    const gridY = centerGridY + dy;

                    // Check if cell is within circular vision range (squared distance)
                    const cellCenterX = gridX * cellSize + cellSize / 2;
                    const cellCenterY = gridY * cellSize + cellSize / 2;
                    const dx2 = cellCenterX - source.x;
                    const dy2 = cellCenterY - source.y;
                    const distSq = dx2 * dx2 + dy2 * dy2;

                    if (distSq <= visionRangeSq) {
                        const cellKey = `${gridX},${gridY}`;
                        // Mark as both visible and explored
                        player.visibleCells.add(cellKey);
                        player.exploredCells.add(cellKey);
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
     * Uses euclidean distance
     * @param {Unit|Building} source
     * @param {Unit|Building} target
     * @param {number} range
     * @returns {boolean}
     */
    isInRange(source, target, range) {
        if (!source || !target) return false;

        const dx = target.x - source.x;
        const dy = target.y - source.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        return distance <= range;
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
