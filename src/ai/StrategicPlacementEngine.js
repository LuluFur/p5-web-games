/**
 * StrategicPlacementEngine.js
 * 
 * Provides intelligent building placement strategies for AI
 * Replaces simple spiral placement with context-aware positioning
 */

class StrategicPlacementEngine {
    constructor() {
        this.PLACEMENT_MODE = {
            SPREAD: 'spread',      // Distribute for coverage/efficiency
            DEFENDED: 'defended',  // Central with defensive perimeter
            NEUTRAL: 'neutral'     // Flexible placement
        };

        // Building type classification
        this.BUILDING_CLASSIFICATION = {
            // SPREAD buildings - optimize coverage and reduce vulnerability
            power_plant: this.PLACEMENT_MODE.SPREAD,
            refinery: this.PLACEMENT_MODE.SPREAD,
            tiberium_silo: this.PLACEMENT_MODE.SPREAD,
            silo: this.PLACEMENT_MODE.SPREAD,
            
            // DEFENDED buildings - critical infrastructure
            construction_yard: this.PLACEMENT_MODE.DEFENDED,
            tech_center: this.PLACEMENT_MODE.DEFENDED,
            radar: this.PLACEMENT_MODE.DEFENDED,
            war_factory: this.PLACEMENT_MODE.DEFENDED,
            airfield: this.PLACEMENT_MODE.DEFENDED,
            
            // NEUTRAL buildings - flexible placement
            barracks: this.PLACEMENT_MODE.NEUTRAL,
            armory: this.PLACEMENT_MODE.NEUTRAL,
            guard_tower: this.PLACEMENT_MODE.NEUTRAL,
            helipad: this.PLACEMENT_MODE.NEUTRAL,
            repair_bay: this.PLACEMENT_MODE.NEUTRAL
        };

        // Similar infrastructure groups for spread calculations
        this.INFRASTRUCTURE_GROUPS = {
            power: ['power_plant'],
            resource: ['refinery', 'tiberium_silo', 'silo'],
            production: ['barracks', 'war_factory'],
            support: ['tech_center', 'radar']
        };
    }

    /**
     * Get placement mode for a building type
     */
    getPlacementMode(buildingType) {
        return this.BUILDING_CLASSIFICATION[buildingType] || this.PLACEMENT_MODE.NEUTRAL;
    }

    /**
     * Find optimal placement for a building
     */
    findPlacement(buildingType, player, existingBuildings, grid) {
        const placementMode = this.getPlacementMode(buildingType);
        
        switch (placementMode) {
            case this.PLACEMENT_MODE.SPREAD:
                return this.findSpreadPlacement(buildingType, existingBuildings, grid);
            case this.PLACEMENT_MODE.DEFENDED:
                return this.findDefendedPlacement(buildingType, player, existingBuildings, grid);
            case this.PLACEMENT_MODE.NEUTRAL:
            default:
                return this.findNeutralPlacement(buildingType, existingBuildings, grid);
        }
    }

    /**
     * SPREAD mode: maximize distance from similar buildings
     */
    findSpreadPlacement(buildingType, existingBuildings, grid) {
        // Find buildings in same infrastructure group
        const similarBuildings = existingBuildings.filter(b => 
            this.isSimilarInfrastructure(b.type, buildingType)
        );
        
        if (similarBuildings.length === 0) {
            // No similar buildings - use neutral placement
            return this.findNeutralPlacement(buildingType, existingBuildings, grid);
        }

        // Generate candidate positions around base area
        const candidatePositions = this.generateCandidatePositions(
            existingBuildings, grid, 20 // 20 cell search radius
        );

        // Score positions based on distance from similar buildings
        let bestPosition = null;
        let bestScore = -Infinity;

        for (const candidate of candidatePositions) {
            const minDistance = Math.min(
                ...similarBuildings.map(b => 
                    this.gridDistance(candidate, b.position)
                )
            );
            
            // Prefer positions that maximize minimum distance
            const score = minDistance;
            
            // Apply slight randomness to avoid predictable patterns
            const randomFactor = Math.random() * 0.1;
            const finalScore = score + randomFactor;
            
            if (finalScore > bestScore && this.isValidPosition(candidate, grid)) {
                bestScore = finalScore;
                bestPosition = candidate;
            }
        }

        return bestPosition;
    }

    /**
     * DEFENDED mode: place near base center with defensive considerations
     */
    findDefendedPlacement(buildingType, player, existingBuildings, grid) {
        // Calculate base center from existing buildings
        const baseCenter = this.calculateBaseCenter(existingBuildings);
        
        if (!baseCenter) {
            // No existing buildings - use neutral placement
            return this.findNeutralPlacement(buildingType, existingBuildings, grid);
        }

        // Generate positions around base center (3-6 cells away)
        const candidatePositions = this.generatePositionsAroundPoint(
            baseCenter, 3, 6, grid
        );

        // Score positions based on defensibility
        let bestPosition = null;
        let bestScore = -Infinity;

        for (const candidate of candidatePositions) {
            const defensiveScore = this.calculateDefensiveScore(
                candidate, existingBuildings, grid
            );
            
            // Prefer positions with good defensive characteristics
            if (defensiveScore > bestScore && this.isValidPosition(candidate, grid)) {
                bestScore = defensiveScore;
                bestPosition = candidate;
            }
        }

        return bestPosition || this.findNeutralPlacement(buildingType, existingBuildings, grid);
    }

    /**
     * NEUTRAL mode: flexible placement based on available space
     */
    findNeutralPlacement(buildingType, existingBuildings, grid) {
        // Use modified spiral with better space utilization
        const startPos = existingBuildings.length > 0 ? 
            this.calculateBaseCenter(existingBuildings) : 
            { x: grid.cols / 2, y: grid.rows / 2 };

        const size = this.getBuildingSize(buildingType);
        const startGridX = Math.floor(startPos.x);
        const startGridY = Math.floor(startPos.y);

        // Enhanced spiral that prioritizes good building spots
        const candidates = [];
        
        for (let radius = 1; radius < 15; radius++) {
            for (let dx = -radius; dx <= radius; dx++) {
                for (let dy = -radius; dy <= radius; dy++) {
                    if (Math.abs(dx) !== radius && Math.abs(dy) !== radius) continue;

                    const gx = startGridX + dx;
                    const gy = startGridY + dy;

                    if (this.canPlaceBuilding(gx, gy, size.width, size.height, grid)) {
                        candidates.push({ gridX: gx, gridY: gy });
                    }
                }
            }
        }

        // Return first valid position, or best if multiple
        return candidates.length > 0 ? candidates[0] : null;
    }

    /**
     * Generate candidate positions around base area
     */
    generateCandidatePositions(existingBuildings, grid, radius) {
        const positions = [];
        const baseCenter = this.calculateBaseCenter(existingBuildings) || 
                          { x: grid.cols / 2, y: grid.rows / 2 };

        // Sample positions in a grid pattern
        for (let x = Math.max(0, baseCenter.x - radius); 
             x <= Math.min(grid.cols, baseCenter.x + radius); x++) {
            for (let y = Math.max(0, baseCenter.y - radius); 
                 y <= Math.min(grid.rows, baseCenter.y + radius); y++) {
                positions.push({ gridX: x, gridY: y });
            }
        }

        return positions;
    }

    /**
     * Generate positions in a ring around a point
     */
    generatePositionsAroundPoint(center, minRadius, maxRadius, grid) {
        const positions = [];
        
        for (let radius = minRadius; radius <= maxRadius; radius++) {
            for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 8) {
                const x = Math.round(center.x + Math.cos(angle) * radius);
                const y = Math.round(center.y + Math.sin(angle) * radius);
                
                if (x >= 0 && x < grid.cols && y >= 0 && y < grid.rows) {
                    positions.push({ gridX: x, gridY: y });
                }
            }
        }

        return positions;
    }

    /**
     * Calculate defensive score for a position
     */
    calculateDefensiveScore(position, existingBuildings, grid) {
        let score = 0;

        // Higher score for positions with natural defense advantages
        if (grid.isChokePoint && grid.isChokePoint(position.gridX, position.gridY)) {
            score += 50; // Choke points are valuable defensive positions
        }

        // Higher score for positions with good coverage area
        const coverageRadius = 5;
        let clearCells = 0;
        for (let dx = -coverageRadius; dx <= coverageRadius; dx++) {
            for (let dy = -coverageRadius; dy <= coverageRadius; dy++) {
                const x = position.gridX + dx;
                const y = position.gridY + dy;
                if (x >= 0 && x < grid.cols && y >= 0 && y < grid.rows) {
                    if (!grid.isObstacle(x, y)) clearCells++;
                }
            }
        }
        score += clearCells * 2;

        // Lower score for positions too close to map edge
        const edgeDistance = Math.min(
            position.gridX, position.gridY,
            grid.cols - position.gridX, grid.rows - position.gridY
        );
        if (edgeDistance < 3) score -= 20;

        return score;
    }

    /**
     * Calculate base center from existing buildings
     */
    calculateBaseCenter(buildings) {
        if (buildings.length === 0) return null;

        const sumX = buildings.reduce((sum, b) => sum + b.position.x, 0);
        const sumY = buildings.reduce((sum, b) => sum + b.position.y, 0);
        
        return {
            x: sumX / buildings.length,
            y: sumY / buildings.length
        };
    }

    /**
     * Check if buildings are in same infrastructure group
     */
    isSimilarInfrastructure(buildingType1, buildingType2) {
        for (const [group, types] of Object.entries(this.INFRASTRUCTURE_GROUPS)) {
            if (types.includes(buildingType1) && types.includes(buildingType2)) {
                return true;
            }
        }
        return buildingType1 === buildingType2; // Exact match fallback
    }

    /**
     * Calculate grid distance between two positions
     */
    gridDistance(pos1, pos2) {
        const dx = pos1.gridX - pos2.x;
        const dy = pos1.gridY - pos2.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    /**
     * Get building size
     */
    getBuildingSize(buildingType) {
        const sizes = {
            power_plant: { width: 2, height: 2 },
            barracks: { width: 2, height: 2 },
            refinery: { width: 3, height: 2 },
            war_factory: { width: 3, height: 2 },
            guard_tower: { width: 1, height: 1 },
            tech_center: { width: 2, height: 2 },
            silo: { width: 1, height: 2 },
            radar: { width: 2, height: 2 },
            airfield: { width: 4, height: 3 }
        };
        return sizes[buildingType] || { width: 2, height: 2 };
    }

    /**
     * Check if building can be placed at position
     */
    canPlaceBuilding(gridX, gridY, width, height, grid) {
        if (!grid || !grid.canPlaceBuilding) return false;
        return grid.canPlaceBuilding(gridX, gridY, width, height);
    }

    /**
     * Validate position is within bounds and not occupied
     */
    isValidPosition(position, grid) {
        if (!grid) return false;
        return position.gridX >= 0 && position.gridX < grid.cols &&
               position.gridY >= 0 && position.gridY < grid.rows;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = StrategicPlacementEngine;
}