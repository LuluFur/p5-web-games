/**
 * UnitManager.js - Manages all units in the RTS game
 *
 * Responsibilities:
 * - Unit creation and destruction
 * - Unit updates and collision detection
 * - Spatial partitioning for efficient queries
 * - Unit factory methods
 * - Coordinate with SelectionManager and Player
 */

class UnitManager {
    constructor(game) {
        this.game = game;

        // All units in the game
        this.units = [];

        // Units by player (for quick access)
        this.unitsByPlayer = new Map();

        // Spatial partitioning grid for efficient queries
        this.spatialGrid = new Map();
        this.spatialCellSize = RTS_GRID?.CELL_SIZE * 2 || 64;

        // Unit pool for recycling (Phase 2 optimization)
        this.unitPool = [];
        this.maxPoolSize = 50;

        // Counters
        this.nextUnitId = 1;
        this.totalUnitsCreated = 0;
    }

    // ========================================
    // UNIT CREATION
    // ========================================

    /**
     * Create a new unit
     * @param {string} unitType - Type of unit to create (from RTS_UNITS)
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {Player} owner - Owner player
     * @returns {Unit} The created unit
     */
    createUnit(unitType, x, y, owner) {
        // Get unit configuration (faction-aware)
        const config = this.getUnitConfig(unitType, owner);

        if (!config) {
            console.error(`UnitManager: Unknown unit type "${unitType}" for faction ${owner?.faction || 'UNKNOWN'}`);
            return null;
        }

        // Apply faction bonuses to config
        const finalConfig = this.applyFactionBonuses(config, owner);

        // Create appropriate unit class
        let unit;
        // Normalize type to uppercase for comparison (RTS_UNIT_TYPES uses uppercase)
        const unitTypeNormalized = (finalConfig.type || '').toUpperCase();

        switch (unitTypeNormalized) {
            case 'INFANTRY':
                unit = new InfantryUnit(x, y, owner, finalConfig);
                break;
            case 'VEHICLE':
                unit = new VehicleUnit(x, y, owner, finalConfig);
                break;
            case 'HARVESTER':
                unit = new HarvesterUnit(x, y, owner, finalConfig);
                break;
            default:
                unit = new Unit(x, y, owner, finalConfig);
        }

        // Assign unique ID
        unit.id = this.nextUnitId++;
        this.totalUnitsCreated++;

        // Register unit
        this.registerUnit(unit);

        // Emit creation event
        if (this.game.eventManager) {
            this.game.eventManager.emit('UNIT_CREATED', {
                unit: unit,
                type: unitType,
                owner: owner,
                faction: owner?.faction
            });
        }

        return unit;
    }

    /**
     * Get unit configuration by type (faction-aware)
     * @param {string} unitType - Unit type ID
     * @param {Player} owner - Owner player (for faction lookup)
     * @returns {object|null}
     */
    getUnitConfig(unitType, owner) {
        const unitTypeUpper = unitType.toUpperCase();

        // First, check faction-specific units if owner has factionData
        if (owner?.factionData?.units?.[unitTypeUpper]) {
            return { ...owner.factionData.units[unitTypeUpper], unitType: unitTypeUpper };
        }

        // Fall back to generic RTS_UNITS
        if (typeof RTS_UNITS !== 'undefined' && RTS_UNITS[unitTypeUpper]) {
            return { ...RTS_UNITS[unitTypeUpper], unitType: unitTypeUpper };
        }

        // Final fallback: default configs (speed values match RTS_UNITS scale)
        const defaults = {
            INFANTRY: {
                name: 'Infantry',
                type: 'INFANTRY',
                health: 100,
                speed: 1.5,
                damage: 10,
                attackSpeed: 1.0,
                range: 100,
                sightRange: 5,
                cost: 100,
                buildTime: 3
            },
            VEHICLE: {
                name: 'Vehicle',
                type: 'VEHICLE',
                health: 300,
                speed: 2.0,
                damage: 25,
                attackSpeed: 0.5,
                range: 150,
                sightRange: 7,
                cost: 500,
                buildTime: 8
            },
            HARVESTER: {
                name: 'Harvester',
                type: 'HARVESTER',
                health: 400,
                speed: 2.8,
                damage: 0,
                sightRange: 6,
                cost: 1000,
                buildTime: 10,
                harvestCapacity: 1000,
                harvestRate: 50
            }
        };

        return defaults[unitTypeUpper] || null;
    }

    /**
     * Apply faction bonuses to unit configuration
     * @param {object} config - Base unit configuration
     * @param {Player} owner - Owner player
     * @returns {object} Config with faction bonuses applied
     */
    applyFactionBonuses(config, owner) {
        if (!owner || !owner.factionData) {
            return config;
        }

        // Clone config to avoid mutating original
        const bonusedConfig = { ...config };

        // Apply speed bonus
        if (bonusedConfig.speed && owner.getFactionBonus('speed')) {
            bonusedConfig.speed *= (1 + owner.getFactionBonus('speed'));
        }

        // Apply armor bonus
        if (bonusedConfig.armor !== undefined && owner.getFactionBonus('armor')) {
            bonusedConfig.armor *= (1 + owner.getFactionBonus('armor'));
        }

        // Apply damage bonus
        if (bonusedConfig.damage && owner.getFactionBonus('damage')) {
            bonusedConfig.damage *= (1 + owner.getFactionBonus('damage'));
        }

        // Apply resource efficiency to harvesters
        if (bonusedConfig.harvestRate && owner.getFactionBonus('resourceEfficiency')) {
            bonusedConfig.harvestRate *= (1 + owner.getFactionBonus('resourceEfficiency'));
        }

        return bonusedConfig;
    }

    /**
     * Register a unit in the manager
     * @param {Unit} unit
     */
    registerUnit(unit) {
        this.units.push(unit);

        // Register with player
        if (unit.owner) {
            if (!this.unitsByPlayer.has(unit.owner)) {
                this.unitsByPlayer.set(unit.owner, []);
            }
            this.unitsByPlayer.get(unit.owner).push(unit);
            unit.owner.addUnit(unit);
        }

        // Add to spatial grid
        this.updateSpatialPosition(unit);
    }

    /**
     * Remove a unit from the manager
     * @param {Unit} unit
     */
    removeUnit(unit) {
        const index = this.units.indexOf(unit);
        if (index !== -1) {
            this.units.splice(index, 1);
        }

        // Remove from player
        if (unit.owner) {
            const playerUnits = this.unitsByPlayer.get(unit.owner);
            if (playerUnits) {
                const idx = playerUnits.indexOf(unit);
                if (idx !== -1) playerUnits.splice(idx, 1);
            }
            unit.owner.removeUnit(unit);
        }

        // Remove from spatial grid
        this.removeFromSpatialGrid(unit);

        // Notify selection manager
        if (this.game.selectionManager) {
            this.game.selectionManager.removeUnit(unit);
        }

        // Cleanup unit references to break circular chains
        if (typeof unit.cleanup === 'function') {
            unit.cleanup();
        }

        // Emit destruction event
        if (this.game.eventManager) {
            this.game.eventManager.emit('UNIT_DESTROYED', {
                unit: unit,
                owner: unit.owner
            });
        }
    }

    // ========================================
    // SPATIAL PARTITIONING
    // ========================================

    /**
     * Get spatial grid key for a position
     * @param {number} x
     * @param {number} y
     * @returns {string}
     */
    getSpatialKey(x, y) {
        const gx = Math.floor(x / this.spatialCellSize);
        const gy = Math.floor(y / this.spatialCellSize);
        return `${gx},${gy}`;
    }

    /**
     * Update unit's position in spatial grid
     * @param {Unit} unit
     */
    updateSpatialPosition(unit) {
        // Remove from old cell if tracked
        if (unit._spatialKey) {
            const oldCell = this.spatialGrid.get(unit._spatialKey);
            if (oldCell) {
                const idx = oldCell.indexOf(unit);
                if (idx !== -1) oldCell.splice(idx, 1);
            }
        }

        // Add to new cell
        const newKey = this.getSpatialKey(unit.x, unit.y);
        if (!this.spatialGrid.has(newKey)) {
            this.spatialGrid.set(newKey, []);
        }
        this.spatialGrid.get(newKey).push(unit);
        unit._spatialKey = newKey;
    }

    /**
     * Remove unit from spatial grid (and clean up empty cells)
     * @param {Unit} unit
     */
    removeFromSpatialGrid(unit) {
        if (unit._spatialKey) {
            const cell = this.spatialGrid.get(unit._spatialKey);
            if (cell) {
                const idx = cell.indexOf(unit);
                if (idx !== -1) cell.splice(idx, 1);
                // Clean up empty cells to prevent Map unbounded growth
                if (cell.length === 0) {
                    this.spatialGrid.delete(unit._spatialKey);
                }
            }
            unit._spatialKey = null;
        }
    }

    /**
     * Get all units in a radius around a point
     * @param {number} x - Center X
     * @param {number} y - Center Y
     * @param {number} radius - Search radius
     * @returns {Unit[]}
     */
    getUnitsInRadius(x, y, radius) {
        const results = [];
        const radiusSq = radius * radius;

        // Check neighboring spatial cells
        const minGx = Math.floor((x - radius) / this.spatialCellSize);
        const maxGx = Math.floor((x + radius) / this.spatialCellSize);
        const minGy = Math.floor((y - radius) / this.spatialCellSize);
        const maxGy = Math.floor((y + radius) / this.spatialCellSize);

        for (let gx = minGx; gx <= maxGx; gx++) {
            for (let gy = minGy; gy <= maxGy; gy++) {
                const cell = this.spatialGrid.get(`${gx},${gy}`);
                if (!cell) continue;

                for (const unit of cell) {
                    if (unit.isDead()) continue;

                    const dx = unit.x - x;
                    const dy = unit.y - y;
                    if (dx * dx + dy * dy <= radiusSq) {
                        results.push(unit);
                    }
                }
            }
        }

        return results;
    }

    /**
     * Get nearest enemy unit to a position
     * @param {number} x
     * @param {number} y
     * @param {Player} myPlayer
     * @param {number} maxRange
     * @returns {Unit|null}
     */
    getNearestEnemy(x, y, myPlayer, maxRange = Infinity) {
        let nearest = null;
        let nearestDistSq = maxRange * maxRange;

        for (const unit of this.units) {
            if (unit.isDead()) continue;
            if (!myPlayer || !myPlayer.isEnemy(unit.owner)) continue;

            const dx = unit.x - x;
            const dy = unit.y - y;
            const distSq = dx * dx + dy * dy;

            if (distSq < nearestDistSq) {
                nearestDistSq = distSq;
                nearest = unit;
            }
        }

        return nearest;
    }

    // ========================================
    // QUERIES
    // ========================================

    /**
     * Get all units
     * @returns {Unit[]}
     */
    getAllUnits() {
        return this.units;
    }

    /**
     * Get units owned by a player
     * @param {Player} player
     * @returns {Unit[]}
     */
    getUnitsByPlayer(player) {
        return this.unitsByPlayer.get(player) || [];
    }

    /**
     * Get unit by ID
     * @param {number} id
     * @returns {Unit|null}
     */
    getUnitById(id) {
        return this.units.find(u => u.id === id) || null;
    }

    /**
     * Get unit at a screen position
     * @param {number} x
     * @param {number} y
     * @returns {Unit|null}
     */
    getUnitAtPosition(x, y) {
        // Check in reverse order (top units first)
        for (let i = this.units.length - 1; i >= 0; i--) {
            const unit = this.units[i];
            if (!unit.isDead() && unit.containsPoint(x, y)) {
                return unit;
            }
        }
        return null;
    }

    // ========================================
    // UPDATE & DRAW
    // ========================================

    /**
     * Update all units
     * @param {number} deltaTime
     */
    update(deltaTime) {
        // Update all units
        for (const unit of this.units) {
            // Always update to handle death animations and fade out
            unit.update(deltaTime);

            // Only update spatial grid for living units
            if (!unit.isDead()) {
                // Update spatial position after movement
                const newKey = this.getSpatialKey(unit.x, unit.y);
                if (newKey !== unit._spatialKey) {
                    this.updateSpatialPosition(unit);
                }
            }
        }

        // Remove dead units (after fade out completes)
        this.removeDeadUnits();
    }

    /**
     * Remove dead units from the manager after fade-out completes
     * Units go through: DYING state -> death animation (300ms) -> fade out (300ms) -> removal
     */
    removeDeadUnits() {
        for (let i = this.units.length - 1; i >= 0; i--) {
            const unit = this.units[i];
            // Check if unit is fully dead AND death animation + fade out has completed
            // active is set to false after fadeOutDuration expires in Unit.update()
            if (!unit.active && unit.state === RTS_UNIT_STATES.DYING) {
                this.removeUnit(unit);
            }
        }
    }

    /**
     * Draw all units
     */
    draw() {
        // Sort units by Y position for proper layering
        const sortedUnits = [...this.units].sort((a, b) => a.y - b.y);

        for (const unit of sortedUnits) {
            // Check if on screen (culling)
            if (this.isOnScreen(unit)) {
                unit.draw();
            }
        }
    }

    /**
     * Check if unit is on screen (accounting for camera)
     * @param {Unit} unit
     * @returns {boolean}
     */
    isOnScreen(unit) {
        const margin = 100;

        // If camera exists, check against camera viewport
        if (this.game.camera) {
            const cam = this.game.camera;
            const viewportWidth = width / cam.zoom;
            const viewportHeight = height / cam.zoom;

            return unit.x >= cam.x - margin &&
                   unit.x <= cam.x + viewportWidth + margin &&
                   unit.y >= cam.y - margin &&
                   unit.y <= cam.y + viewportHeight + margin;
        }

        // Fallback: no camera, use screen bounds
        return unit.x >= -margin &&
               unit.x <= width + margin &&
               unit.y >= -margin &&
               unit.y <= height + margin;
    }

    // ========================================
    // CLEANUP
    // ========================================

    /**
     * Clear all units
     */
    clear() {
        this.units = [];
        this.unitsByPlayer.clear();
        this.spatialGrid.clear();
        this.nextUnitId = 1;
    }

    /**
     * Get debug info
     * @returns {object}
     */
    getDebugInfo() {
        return {
            totalUnits: this.units.length,
            aliveUnits: this.units.filter(u => !u.isDead()).length,
            totalCreated: this.totalUnitsCreated,
            spatialCells: this.spatialGrid.size
        };
    }
}

// Make available globally
if (typeof window !== 'undefined') {
    window.UnitManager = UnitManager;
}
