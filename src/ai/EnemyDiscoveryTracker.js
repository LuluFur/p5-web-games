/**
 * EnemyDiscoveryTracker
 *
 * Detects when enemies (units and buildings) first become visible through fog of war.
 * Tracks previously visible entities to identify newly discovered enemies.
 * Fires ENEMY_REVEALED events when new enemies are spotted.
 */
class EnemyDiscoveryTracker {
    constructor() {
        // playerId → Set of previously visible entity IDs
        // Format: "unit_123" or "building_456"
        this.previouslyVisible = new Map();
    }

    /**
     * Check for newly discovered enemies this frame
     * @param {Object} player - The player we're checking visibility for
     * @param {VisibilityManager} visibilityManager - Visibility system
     * @param {UnitManager} unitManager - Unit manager
     * @param {BuildingManager} buildingManager - Building manager
     * @returns {Array} Array of { entityId, entity, isBuilding, isHighPriority }
     */
    detectNewDiscoveries(player, visibilityManager, unitManager, buildingManager) {
        const currentVisible = visibilityManager.visibleEntities.get(player.id) || new Set();
        const previousVisible = this.previouslyVisible.get(player.id) || new Set();

        const newlyDiscovered = [];

        // Check each currently visible entity
        for (const entityId of currentVisible) {
            // Is this entity newly visible?
            if (!previousVisible.has(entityId)) {
                // Parse entityId format: "unit_123" or "building_456"
                const [type, idStr] = entityId.split('_');
                const id = parseInt(idStr);

                let entity = null;
                let isBuilding = false;

                // Look up the actual entity object
                if (type === 'building') {
                    entity = buildingManager.buildings.find(b => b.id === id);
                    isBuilding = true;
                } else if (type === 'unit') {
                    entity = unitManager.units.find(u => u.id === id);
                }

                // Only track enemy entities
                if (entity && entity.owner !== player) {
                    const isHighPriority = this.isHighPriorityTarget(entity);

                    newlyDiscovered.push({
                        entityId,
                        entity,
                        isBuilding,
                        isHighPriority
                    });
                }
            }
        }

        // Update our tracking for next frame
        this.previouslyVisible.set(player.id, new Set(currentVisible));

        return newlyDiscovered;
    }

    /**
     * Determine if an entity is high priority (should interrupt units in AGGRESSIVE stance)
     * @param {Unit|Building} entity - The entity to check
     * @returns {boolean} True if high priority
     */
    isHighPriorityTarget(entity) {
        // Defensive buildings - top priority
        if (entity.type === 'guard_tower' || entity.type === 'obelisk' ||
            entity.type === 'sam_site' || entity.type === 'turret') {
            return true;
        }

        // Construction Yard - top priority
        if (entity.type === 'construction_yard') {
            return true;
        }

        return false;
    }

    /**
     * Clear tracking for a specific player (useful for game reset)
     * @param {string} playerId - The player ID to clear
     */
    clearPlayer(playerId) {
        this.previouslyVisible.delete(playerId);
    }

    /**
     * Clear all tracking (game reset/cleanup)
     */
    clearAll() {
        this.previouslyVisible.clear();
    }
}
