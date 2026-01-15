/**
 * DefenseCoordinator.js
 * 
 * Manages automated defense deployment for AI
 * Creates defensive perimeters around critical buildings
 */

class DefenseCoordinator {
    constructor(aiController) {
        this.ai = aiController;
        this.game = null;
        
        // Defense personality preferences
        this.DEFENSE_PREFERENCES = {
            TURTLE: {
                primary: 'guard_tower',
                secondary: 'impact_cannon',
                strategy: 'perimeter',
                density: 'high',
                positionsPerBuilding: 4
            },
            RUSHER: {
                primary: 'guard_tower',
                secondary: 'guard_tower', // Rushers use basic towers
                strategy: 'choke_point',
                density: 'minimal',
                positionsPerBuilding: 2
            },
            BALANCED: {
                primary: 'guard_tower',
                secondary: 'guard_tower',
                strategy: 'layered',
                density: 'medium',
                positionsPerBuilding: 3
            }
        };

        // Building importance weights for defense priority
        this.DEFENSE_PRIORITY = {
            construction_yard: 100,
            tech_center: 80,
            war_factory: 70,
            radar: 60,
            refinery: 50,
            power_plant: 40,
            barracks: 30,
            airfield: 75
        };
    }

    /**
     * Initialize with game instance
     */
    initialize(game) {
        this.game = game;
    }

    /**
     * Deploy defenses for a newly placed building
     */
    deployDefenseForBuilding(building, personality) {
        if (!this.game) return;

        const placementMode = this.getStrategicPlacementEngine().getPlacementMode(building.type);
        
        // Only deploy defenses for DEFENDED mode buildings
        if (placementMode !== 'defended') {
            return;
        }

        const defenseConfig = this.DEFENSE_PREFERENCES[personality] || this.DEFENSE_PREFERENCES.BALANCED;
        const priority = this.DEFENSE_PRIORITY[building.type] || 50;
        
        // Calculate required defense count based on importance
        const defenseCount = this.calculateDefenseRequirement(building, defenseConfig);
        
        if (defenseCount === 0) return;

        console.log(`[AI] ${personality} deploying ${defenseCount} defenses for ${building.type}`);

        // Generate defensive positions around building
        const defensePositions = this.generateDefensePositions(
            building.position,
            defenseCount,
            defenseConfig.strategy,
            building.type
        );

        // Queue defense construction with position validation
        for (let i = 0; i < defensePositions.length; i++) {
            const position = defensePositions[i];
            
            // Check if position is actually buildable
            if (!this.isValidDefensePosition(position)) {
                continue;
            }
            
            const defenseType = this.selectDefenseType(defenseConfig, this.getEnemyComposition());

            this.ai.priorityQueue.push({
                type: 'defense',
                buildingType: defenseType,
                position: position,
                priority: this.calculateDefensePriority(priority, i),
                defending: building,
                frame: this.game ? this.game.frame : 0
            });
        }
    }

    /**
     * Calculate how many defenses a building needs
     */
    calculateDefenseRequirement(building, defenseConfig) {
        const basePriority = this.DEFENSE_PRIORITY[building.type] || 50;
        
        // Adjust based on AI difficulty intelligence
        const intelligence = this.getDifficultyIntelligence();
        
        // Higher difficulty AIs use more optimal defense counts
        let defenseCount = Math.floor((basePriority / 100) * defenseConfig.positionsPerBuilding);
        
        // Apply intelligence modifier
        defenseCount = Math.ceil(defenseCount * (0.5 + intelligence * 0.5));
        
        // Minimum and maximum bounds
        return Math.max(1, Math.min(defenseCount, defenseConfig.positionsPerBuilding));
    }

    /**
     * Generate defensive positions around a building
     */
    generateDefensePositions(buildingPos, count, strategy, buildingType) {
        const positions = [];
        const buildingCenter = {
            x: buildingPos.x + 1, // Approximate building center
            y: buildingPos.y + 1
        };

        switch (strategy) {
            case 'perimeter':
                // Place defenses in a circle around building
                for (let i = 0; i < count; i++) {
                    const angle = (Math.PI * 2 * i) / count;
                    const distance = 3 + (i % 2); // Vary distance: 3-4 cells
                    const pos = {
                        gridX: Math.round(buildingCenter.x + Math.cos(angle) * distance),
                        gridY: Math.round(buildingCenter.y + Math.sin(angle) * distance)
                    };
                    positions.push(pos);
                }
                break;

            case 'choke_point':
                // Place defenses at key approaches
                const approaches = this.findKeyApproaches(buildingCenter);
                for (let i = 0; i < Math.min(count, approaches.length); i++) {
                    const approach = approaches[i];
                    const pos = {
                        gridX: Math.round(approach.x),
                        gridY: Math.round(approach.y)
                    };
                    positions.push(pos);
                }
                break;

            case 'layered':
                // Mix of close and medium range defenses
                for (let i = 0; i < count; i++) {
                    const distance = i < 2 ? 2 : 4; // 2 close, rest medium
                    const angle = (Math.PI * 2 * i) / count;
                    const pos = {
                        gridX: Math.round(buildingCenter.x + Math.cos(angle) * distance),
                        gridY: Math.round(buildingCenter.y + Math.sin(angle) * distance)
                    };
                    positions.push(pos);
                }
                break;

            default:
                // Fallback: simple circle
                for (let i = 0; i < count; i++) {
                    const angle = (Math.PI * 2 * i) / count;
                    const pos = {
                        gridX: Math.round(buildingCenter.x + Math.cos(angle) * 3),
                        gridY: Math.round(buildingCenter.y + Math.sin(angle) * 3)
                    };
                    positions.push(pos);
                }
        }

        return positions;
    }

    /**
     * Find key approaches to a position (for choke point strategy)
     */
    findKeyApproaches(position) {
        const approaches = [];
        
        // Sample directions to find likely attack routes
        const directions = [
            { x: 0, y: -5 },   // North
            { x: 5, y: 0 },    // East
            { x: 0, y: 5 },    // South
            { x: -5, y: 0 },   // West
            { x: 3, y: -3 },   // Northeast
            { x: 3, y: 3 },    // Southeast
            { x: -3, y: 3 },   // Southwest
            { x: -3, y: -3 }   // Northwest
        ];

        for (const dir of directions) {
            const approach = {
                x: position.x + dir.x,
                y: position.y + dir.y
            };
            approaches.push(approach);
        }

        return approaches;
    }

    /**
     * Select appropriate defense type based on configuration and enemy composition
     */
    selectDefenseType(defenseConfig, enemyComposition) {
        // Start with personality preference
        let defenseType = defenseConfig.primary;

        // Adapt based on enemy composition if intelligence is high enough
        const intelligence = this.getDifficultyIntelligence();
        if (intelligence > 0.7 && enemyComposition) {
            // High intelligence AIs adapt to enemy types
            if (enemyComposition.airUnits > 0.3) {
                // Lots of air units - prefer towers with anti-air
                defenseType = 'guard_tower'; // Assume towers have better AA
            } else if (enemyComposition.vehicles > 0.5) {
                // Lots of vehicles - prefer stronger defenses
                defenseType = defenseConfig.secondary || defenseConfig.primary;
            }
        }

        // Apply some randomness based on intelligence
        if (Math.random() > intelligence) {
            // Lower intelligence makes suboptimal choices
            defenseType = Math.random() > 0.5 ? defenseConfig.primary : defenseConfig.secondary;
        }

        return defenseType;
    }

    /**
     * Calculate defense placement priority
     */
    calculateDefensePriority(buildingPriority, positionIndex) {
        // Higher priority for more important buildings
        // Later positions get slightly lower priority (to build closer defenses first)
        return 'HIGH'; // Simplified for now
    }

    /**
     * Get AI intelligence score from difficulty
     */
    getDifficultyIntelligence() {
        // This would come from AI difficulty settings
        if (this.ai && this.ai.difficulty) {
            const intelligenceScores = {
                EASY: 0.3,
                MEDIUM: 0.6,
                HARD: 0.85,
                BRUTAL: 1.0
            };
            return intelligenceScores[this.ai.difficulty] || 0.6;
        }
        return 0.6; // Default to medium
    }

    /**
     * Get current enemy composition
     */
    getEnemyComposition() {
        // Return enemy composition from AI controller if available
        return this.ai.enemyComposition || {
            infantry: 0,
            vehicles: 0,
            aircraft: 0,
            total: 0
        };
    }

    /**
     * Check if defense position is valid (buildable and doesn't block paths)
     */
    isValidDefensePosition(position) {
        if (!this.game || !this.game.grid) return false;
        
        // Check basic validity
        if (position.gridX < 0 || position.gridX >= this.game.grid.cols ||
            position.gridY < 0 || position.gridY >= this.game.grid.rows) {
            return false;
        }
        
        // Check if position is blocked
        if (this.game.grid.isObstacle(position.gridX, position.gridY)) {
            return false;
        }
        
        return true;
    }

    /**
     * Get strategic placement engine instance
     */
    getStrategicPlacementEngine() {
        // Reuse or create the strategic placement engine
        if (!this.strategicPlacementEngine) {
            this.strategicPlacementEngine = new StrategicPlacementEngine();
        }
        return this.strategicPlacementEngine;
    }

    /**
     * Check if building should have automatic defenses
     */
    needsDefense(building) {
        const placementMode = this.getStrategicPlacementEngine().getPlacementMode(building.type);
        return placementMode === 'defended';
    }

    /**
     * Update defense priorities based on game events
     */
    onBuildingDestroyed(building, destroyer) {
        // If a defensive building was destroyed quickly, adapt strategy
        if (building.type.includes('tower') || building.type.includes('cannon')) {
            const lifetime = this.game ? this.game.frame - building.createdFrame : 0;
            if (lifetime < 300) { // Destroyed within 5 seconds at 60 FPS
                console.log(`[AI] Defense ${building.type} destroyed quickly, adapting strategy`);
                // Could adjust defense types or placement here
            }
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DefenseCoordinator;
}