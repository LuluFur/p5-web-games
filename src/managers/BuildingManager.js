/**
 * BuildingManager.js
 *
 * Manages building placement, validation, construction, and power grid.
 * Handles ghost previews, placement radius checking, and building lifecycle.
 */

class BuildingManager {
    constructor(game) {
        this.game = game;
        this.buildings = [];
        this.ghostBuilding = null; // Building being placed
        this.placementMode = false;
        this.selectedBuildingType = null;

        // Power grid
        this.totalPower = 0;
        this.usedPower = 0;
        this.isPowered = true;

        // Construction settings
        this.buildRadius = 14; // Cells from existing buildings (matches Construction Yard vision range)

        // Building registry
        this.buildingTypes = {
            'construction_yard': ConstructionYard,
            'power_plant': PowerPlant,
            'barracks': Barracks,
            'refinery': Refinery,
            'war_factory': WarFactory,
            'tech_center': TechCenter,
            'guard_tower': GuardTower,
            'silo': Silo,
            'radar': Radar,
            'helipad': Helipad,
            'repair_bay': RepairBay
        };

        // Cached building info for UI (avoid creating instances every frame)
        this.buildingInfoCache = {
            'construction_yard': { name: 'Construction Yard', cost: 0, buildTime: 0 },
            'power_plant': { name: 'Power Plant', cost: 300, buildTime: 8 },
            'barracks': { name: 'Barracks', cost: 400, buildTime: 10 },
            'refinery': { name: 'Refinery', cost: 500, buildTime: 12 },
            'war_factory': { name: 'War Factory', cost: 800, buildTime: 15 },
            'tech_center': { name: 'Tech Center', cost: 1500, buildTime: 25 },
            'guard_tower': { name: 'Guard Tower', cost: 250, buildTime: 6 },
            'silo': { name: 'Silo', cost: 200, buildTime: 5 },
            'radar': { name: 'Radar', cost: 1000, buildTime: 15 },
            'helipad': { name: 'Helipad', cost: 1200, buildTime: 18 },
            'repair_bay': { name: 'Repair Bay', cost: 800, buildTime: 12 }
        };
    }

    /**
     * Spawn initial construction yards for all players
     */
    spawnStartingBuildings() {
        if (!this.game.players || !this.game.grid) return;

        const cellSize = this.game.grid.cellSize;

        for (const player of this.game.players) {
            if (!player.startPosition) continue;

            // Convert pixel position to grid position
            const gridX = Math.floor(player.startPosition.x / cellSize);
            const gridY = Math.floor(player.startPosition.y / cellSize);

            // Create construction yard for this player
            const constructionYard = new ConstructionYard(gridX, gridY, player);
            constructionYard.isComplete = true;
            constructionYard.state = BUILDING_STATES.ACTIVE;
            constructionYard.buildProgress = 1;

            // Ensure position is correct (center of building)
            constructionYard.cellSize = cellSize;
            constructionYard.x = (gridX + constructionYard.width / 2) * cellSize;
            constructionYard.y = (gridY + constructionYard.height / 2) * cellSize;

            // Add to managers and player
            this.buildings.push(constructionYard);
            player.buildings.push(constructionYard);

            // Mark grid cells as occupied
            this.markGridOccupied(constructionYard);

            // Update power grid
            this.totalPower += constructionYard.powerOutput;

            // Update player's unlocked buildings based on construction yard
            if (typeof player.updateUnlocksFromBuildings === 'function') {
                player.updateUnlocksFromBuildings();
            }

        }

        this.updatePowerGrid();
    }

    /**
     * Mark grid cells as occupied by a building
     */
    markGridOccupied(building) {
        if (!this.game.grid) return;

        for (let dy = 0; dy < building.height; dy++) {
            for (let dx = 0; dx < building.width; dx++) {
                const gx = building.gridX + dx;
                const gy = building.gridY + dy;

                if (gx >= 0 && gx < this.game.grid.cols &&
                    gy >= 0 && gy < this.game.grid.rows) {
                    this.game.grid.map[gy][gx] = building;
                }
            }
        }
    }

    /**
     * Start placing a building
     */
    startPlacement(buildingType, player) {
        if (!this.buildingTypes[buildingType]) {
            console.warn(`Unknown building type: ${buildingType}`);
            return false;
        }

        const info = this.buildingInfoCache[buildingType];

        // Check if player can afford it (using cached info)
        if (player.resources.tiberium < info.cost) {
            return false;
        }

        // Check tech requirements
        if (!this.meetsRequirements(buildingType, player)) {
            return false;
        }

        // Only create building instance after validation passes
        const BuildingClass = this.buildingTypes[buildingType];
        this.ghostBuilding = new BuildingClass(0, 0, player);
        this.selectedBuildingType = buildingType;
        this.placementMode = true;

        return true;
    }

    /**
     * Cancel placement mode
     */
    cancelPlacement() {
        this.ghostBuilding = null;
        this.selectedBuildingType = null;
        this.placementMode = false;
    }

    /**
     * Check if player meets requirements for building
     *
     * Tech Tree Requirements:
     * - Power Plant: No requirements (basic building, just needs Construction Yard)
     * - Barracks: Requires Power Plant
     * - Refinery: Requires Power Plant
     * - War Factory: Requires Barracks + Power Plant
     * - Guard Tower: Requires Barracks
     * - Tech Center: Requires War Factory (which implies Barracks + Power Plant)
     * - Silo: Requires Refinery (which implies Power Plant)
     * - Radar: Requires Refinery + Barracks (communications/intel)
     * - Helipad: Requires War Factory (aircraft production)
     * - Repair Bay: Requires War Factory (vehicle support)
     */
    meetsRequirements(buildingType, player) {
        // All buildings require construction_yard, which is always true if player exists
        // The requirements below are the DIRECT prerequisites only
        const requirements = {
            'construction_yard': [],                      // Starting building
            'power_plant': [],                            // No requirements (basic building)
            'barracks': ['power_plant'],                  // Requires Power Plant
            'refinery': ['power_plant'],                  // Requires Power Plant
            'war_factory': ['barracks', 'power_plant'],   // Requires Barracks + Power Plant
            'guard_tower': ['barracks'],                  // Requires Barracks
            'tech_center': ['war_factory'],               // Requires War Factory
            'silo': ['refinery'],                         // Requires Refinery
            'radar': ['refinery', 'barracks'],            // Requires Refinery + Barracks
            'helipad': ['war_factory'],                   // Requires War Factory
            'repair_bay': ['war_factory']                 // Requires War Factory
        };

        const required = requirements[buildingType] || [];

        // Player must have construction yard to build anything
        if (buildingType !== 'construction_yard') {
            const hasConYard = this.buildings.some(b =>
                b.owner === player &&
                b.type === 'construction_yard' &&
                b.isComplete
            );
            if (!hasConYard) return false;
        }

        // Check all direct prerequisites
        for (const req of required) {
            const hasBuilding = this.buildings.some(b =>
                b.owner === player &&
                b.type === req &&
                b.isComplete
            );
            if (!hasBuilding) return false;
        }

        return true;
    }

    /**
     * Update ghost building position
     */
    updateGhostPosition(worldX, worldY) {
        if (!this.ghostBuilding || !this.game.grid) return;

        const grid = this.game.grid;
        const gx = Math.floor(worldX / grid.cellSize);
        const gy = Math.floor(worldY / grid.cellSize);

        // Center the building on cursor
        const offsetX = Math.floor(this.ghostBuilding.width / 2);
        const offsetY = Math.floor(this.ghostBuilding.height / 2);

        this.ghostBuilding.gridX = gx - offsetX;
        this.ghostBuilding.gridY = gy - offsetY;

        // Set x,y to CENTER of building (draw code expects center)
        this.ghostBuilding.x = (this.ghostBuilding.gridX + this.ghostBuilding.width / 2) * grid.cellSize;
        this.ghostBuilding.y = (this.ghostBuilding.gridY + this.ghostBuilding.height / 2) * grid.cellSize;
    }

    /**
     * Check if current ghost position is valid
     */
    isValidPlacement() {
        if (!this.ghostBuilding || !this.game.grid) return false;

        const grid = this.game.grid;
        const gx = this.ghostBuilding.gridX;
        const gy = this.ghostBuilding.gridY;

        // Check if building fits on grid
        if (!this.ghostBuilding.canPlaceAt(grid, gx, gy)) {
            return false;
        }

        // Check for tiberium field overlap
        if (this.game.resourceManager) {
            const cellSize = grid.cellSize;
            const buildingCenterX = (gx + this.ghostBuilding.width / 2) * cellSize;
            const buildingCenterY = (gy + this.ghostBuilding.height / 2) * cellSize;
            const buildingWidth = this.ghostBuilding.width * cellSize;
            const buildingHeight = this.ghostBuilding.height * cellSize;

            const overlappingField = this.game.resourceManager.checkBuildingOverlap(
                buildingCenterX, buildingCenterY, buildingWidth, buildingHeight
            );

            if (overlappingField) {
                this.placementBlockReason = 'tiberium';
                return false;
            }
        }

        // Check build radius (must be near existing buildings)
        // Exception: first building (construction yard) can be placed anywhere valid
        const playerBuildings = this.buildings.filter(b =>
            b.owner === this.ghostBuilding.owner
        );

        if (playerBuildings.length > 0) {
            if (!this.isWithinBuildRadius(gx, gy, this.ghostBuilding.width, this.ghostBuilding.height, playerBuildings)) {
                this.placementBlockReason = 'range';
                return false;
            }
        }

        this.placementBlockReason = null;
        return true;
    }

    /**
     * Debug placement issues
     */
    debugPlacement(grid, gx, gy) {
        const issues = [];
        for (let dy = 0; dy < this.ghostBuilding.height; dy++) {
            for (let dx = 0; dx < this.ghostBuilding.width; dx++) {
                const checkX = gx + dx;
                const checkY = gy + dy;

                if (checkX < 0 || checkX >= grid.cols) {
                    issues.push(`(${checkX},${checkY}): out of bounds X`);
                } else if (checkY < 0 || checkY >= grid.rows) {
                    issues.push(`(${checkX},${checkY}): out of bounds Y`);
                } else {
                    const mapVal = grid.map[checkY][checkX];
                    if (mapVal !== 0) {
                        issues.push(`(${checkX},${checkY}): map=${mapVal} (not 0)`);
                    }
                }
            }
        }
        return issues.length > 0 ? issues : ['unknown reason'];
    }

    /**
     * Check if position is within build radius of existing buildings
     * Optimized to use bounding box overlap instead of O(n²) cell iteration
     */
    isWithinBuildRadius(gx, gy, width, height, buildings) {
        // Expand new building bounds by build radius
        const minX = gx - this.buildRadius;
        const maxX = gx + width - 1 + this.buildRadius;
        const minY = gy - this.buildRadius;
        const maxY = gy + height - 1 + this.buildRadius;

        for (const building of buildings) {
            if (!building.isComplete) continue;

            // Check if expanded bounds overlap with existing building
            const bMinX = building.gridX;
            const bMaxX = building.gridX + building.width - 1;
            const bMinY = building.gridY;
            const bMaxY = building.gridY + building.height - 1;

            // Rectangle overlap test
            if (maxX >= bMinX && minX <= bMaxX && maxY >= bMinY && minY <= bMaxY) {
                return true;
            }
        }
        return false;
    }

    /**
     * Direct building placement (for AI use)
     * Validates: cost, building requirements/prerequisites, and placement validity
     * @param {string} buildingType - Type of building
     * @param {number} gridX - Grid X position
     * @param {number} gridY - Grid Y position
     * @param {Player} player - Owner
     * @returns {boolean} Success
     */
    placeBuilding(buildingType, gridX, gridY, player) {
        const BuildingClass = this.buildingTypes[buildingType];
        if (!BuildingClass) {
            console.error(`Unknown building type: ${buildingType}`);
            return false;
        }

        // Check if player can afford it
        const info = this.buildingInfoCache[buildingType];
        if (!info || player.resources.tiberium < info.cost) {
            return false;
        }

        // Check if player meets building requirements/prerequisites
        if (!this.meetsRequirements(buildingType, player)) {
            console.warn(`Building requirements not met for ${buildingType}`);
            return false;
        }

        // Create building
        const building = new BuildingClass(gridX, gridY, player);
        const grid = this.game.grid;

        // Check if placement is valid using building's own validation
        if (!building.canPlaceAt(grid, gridX, gridY)) {
            return false;
        }

        // Check build radius (must be near existing buildings, except first building)
        const playerBuildings = this.buildings.filter(b => b.owner === player);
        if (playerBuildings.length > 0) {
            if (!this.isWithinBuildRadius(gridX, gridY, building.width, building.height, playerBuildings)) {
                return false;
            }
        }

        // Deduct resources
        player.spendTiberium(info.cost);

        // Set position
        building.cellSize = grid.cellSize;
        building.x = (gridX + building.width / 2) * grid.cellSize;
        building.y = (gridY + building.height / 2) * grid.cellSize;

        // Update rally point to match the finalized coordinates
        if (building.rallyPoint) {
            building.rallyPoint.x = building.x;
            building.rallyPoint.y = building.y;
        }

        // Add to building list
        this.buildings.push(building);
        player.buildings.push(building);

        // Mark grid cells as occupied
        this.markGridCells(building, true);

        // Start construction
        if (building.type !== 'construction_yard') {
            building.startConstruction();
        }

        // Emit event
        if (this.game.eventManager) {
            this.game.eventManager.emit('building_placed', {
                building: building,
                player: player
            });
        }

        this.updatePowerGrid();

        return true;
    }

    /**
     * Confirm placement of ghost building
     */
    confirmPlacement() {
        if (!this.ghostBuilding || !this.isValidPlacement()) {
            return false;
        }

        const player = this.ghostBuilding.owner;
        const cost = this.ghostBuilding.cost;
        const grid = this.game.grid;

        // Deduct resources
        player.spendTiberium(cost);

        // Ensure building position is correctly set (center of building)
        this.ghostBuilding.cellSize = grid.cellSize;
        this.ghostBuilding.x = (this.ghostBuilding.gridX + this.ghostBuilding.width / 2) * grid.cellSize;
        this.ghostBuilding.y = (this.ghostBuilding.gridY + this.ghostBuilding.height / 2) * grid.cellSize;

        // Update rally point to match the finalized coordinates
        if (this.ghostBuilding.rallyPoint) {
            this.ghostBuilding.rallyPoint.x = this.ghostBuilding.x;
            this.ghostBuilding.rallyPoint.y = this.ghostBuilding.y;
        }

        // Add building to list
        this.buildings.push(this.ghostBuilding);
        player.buildings.push(this.ghostBuilding);

        // Mark grid cells as occupied
        this.markGridCells(this.ghostBuilding, true);

        // Start construction (unless it's a ConYard which starts complete)
        if (this.ghostBuilding.type !== 'construction_yard') {
            this.ghostBuilding.startConstruction();
        }

        // Emit event
        if (this.game.eventManager) {
            this.game.eventManager.emit('building_placed', {
                building: this.ghostBuilding,
                player: player
            });
        }


        // Clear placement mode
        this.cancelPlacement();

        // Update power grid
        this.updatePowerGrid();

        return true;
    }

    /**
     * Mark/unmark grid cells as occupied by building
     */
    markGridCells(building, occupied) {
        const grid = this.game.grid;
        if (!grid) return;

        for (let dx = 0; dx < building.width; dx++) {
            for (let dy = 0; dy < building.height; dy++) {
                const gx = building.gridX + dx;
                const gy = building.gridY + dy;

                // Use setCellWalkable which handles (col, row) order
                grid.setCellWalkable(gx, gy, !occupied);
            }
        }

    }

    /**
     * Update power grid calculations
     */
    updatePowerGrid() {
        this.totalPower = 0;
        this.usedPower = 0;

        for (const building of this.buildings) {
            if (!building.isComplete) continue;

            if (building.powerOutput > 0) {
                this.totalPower += building.powerOutput;
            }
            if (building.powerConsumption > 0) {
                this.usedPower += building.powerConsumption;
            }
        }

        const wasPowered = this.isPowered;
        this.isPowered = this.totalPower >= this.usedPower;

        // Emit brownout events
        if (wasPowered && !this.isPowered && this.game.eventManager) {
            this.game.eventManager.emit('power_brownout', {
                totalPower: this.totalPower,
                usedPower: this.usedPower
            });
        } else if (!wasPowered && this.isPowered && this.game.eventManager) {
            this.game.eventManager.emit('power_restored', {
                totalPower: this.totalPower,
                usedPower: this.usedPower
            });
        }
    }

    /**
     * Update all buildings
     */
    update(deltaTime) {
        // Update ghost position
        if (this.placementMode && this.ghostBuilding) {
            const worldPos = this.game.screenToWorld(mouseX, mouseY);
            this.updateGhostPosition(worldPos.x, worldPos.y);
        }

        // Update all buildings
        for (const building of this.buildings) {
            building.update(deltaTime);
        }

        // Check for completed constructions
        for (const building of this.buildings) {
            if (building.constructionJustCompleted) {
                building.constructionJustCompleted = false;
                this.updatePowerGrid();

                // Update player's unlocked buildings/units based on new construction
                if (building.owner && typeof building.owner.updateUnlocksFromBuildings === 'function') {
                    building.owner.updateUnlocksFromBuildings();
                }

                if (this.game.eventManager) {
                    this.game.eventManager.emit('building_complete', {
                        building: building,
                        player: building.owner
                    });
                }
            }
        }

        // Remove destroyed buildings
        this.buildings = this.buildings.filter(b => {
            if (b.health <= 0) {
                this.markGridCells(b, false);
                this.updatePowerGrid();

                // Also remove from player's building list
                if (b.owner && b.owner.buildings) {
                    const idx = b.owner.buildings.indexOf(b);
                    if (idx !== -1) {
                        b.owner.buildings.splice(idx, 1);
                    }
                }

                if (this.game.eventManager) {
                    this.game.eventManager.emit('building_destroyed', {
                        building: b,
                        player: b.owner
                    });
                }
                return false;
            }
            return true;
        });
    }

    /**
     * Draw all buildings and ghost preview
     */
    draw() {
        // Draw all placed buildings
        for (const building of this.buildings) {
            building.draw();
        }

        // Draw ghost building preview
        if (this.placementMode && this.ghostBuilding) {
            this.drawGhostPreview();
        }
    }

    /**
     * Draw ghost building preview with validity coloring
     */
    drawGhostPreview() {
        const building = this.ghostBuilding;
        const grid = this.game.grid;
        const cellSize = grid.cellSize;

        // Check different validity conditions
        const canPlaceOnTerrain = building.canPlaceAt(grid, building.gridX, building.gridY);
        const playerBuildings = this.buildings.filter(b => b.owner === building.owner);
        const isFirstBuilding = playerBuildings.length === 0;
        const inBuildRadius = isFirstBuilding || this.isWithinBuildRadius(
            building.gridX, building.gridY,
            building.width, building.height,
            playerBuildings.filter(b => b.isComplete)
        );

        // Check for tiberium field overlap
        let onTiberium = false;
        if (this.game.resourceManager) {
            const buildingCenterX = (building.gridX + building.width / 2) * cellSize;
            const buildingCenterY = (building.gridY + building.height / 2) * cellSize;
            const buildingWidth = building.width * cellSize;
            const buildingHeight = building.height * cellSize;
            onTiberium = !!this.game.resourceManager.checkBuildingOverlap(
                buildingCenterX, buildingCenterY, buildingWidth, buildingHeight
            );
        }

        const isValid = canPlaceOnTerrain && inBuildRadius && !onTiberium;

        push();

        // Always show build radius when placing (except for first building)
        if (!isFirstBuilding) {
            this.drawBuildRadiusHint();
        }

        // Draw placement grid cells
        for (let dx = 0; dx < building.width; dx++) {
            for (let dy = 0; dy < building.height; dy++) {
                const x = (building.gridX + dx) * cellSize;
                const y = (building.gridY + dy) * cellSize;

                // Check if this specific cell is valid
                const gx = building.gridX + dx;
                const gy = building.gridY + dy;
                let cellValid = grid.isValidCell(gy, gx); // Note: isValidCell takes (row, col)
                if (cellValid) {
                    const mapVal = grid.map[gy]?.[gx];
                    cellValid = mapVal === 0;
                }

                const cellColor = cellValid && inBuildRadius && !onTiberium;
                fill(cellColor ? 'rgba(0, 255, 0, 0.3)' : 'rgba(255, 0, 0, 0.3)');
                stroke(cellColor ? 'rgba(0, 255, 0, 0.6)' : 'rgba(255, 0, 0, 0.6)');
                strokeWeight(1);
                rect(x, y, cellSize, cellSize);
            }
        }

        // Draw building ghost
        push();
        if (isValid) {
            tint(100, 255, 100, 180);
        } else {
            tint(255, 100, 100, 180);
        }
        building.draw();
        pop();

        // Draw warnings based on what's blocking placement
        if (onTiberium) {
            this.drawTiberiumWarning();
        } else if (canPlaceOnTerrain && !inBuildRadius && !isFirstBuilding) {
            this.drawOutOfRangeWarning();
        }

        pop();
    }

    /**
     * Draw hint showing where player can build
     * Uses a merged outline algorithm for cleaner visuals
     */
    drawBuildRadiusHint() {
        const grid = this.game.grid;
        const playerBuildings = this.buildings.filter(b =>
            b.owner === this.ghostBuilding.owner && b.isComplete
        );

        if (playerBuildings.length === 0) return;

        const cellSize = grid.cellSize;

        // Build a grid of valid cells for visualization
        const validCells = new Set();

        for (const building of playerBuildings) {
            // Add all cells within build radius of this building
            for (let dy = -this.buildRadius - 2; dy <= building.height + this.buildRadius + 2; dy++) {
                for (let dx = -this.buildRadius - 2; dx <= building.width + this.buildRadius + 2; dx++) {
                    const checkX = building.gridX + dx;
                    const checkY = building.gridY + dy;

                    // Check Manhattan distance to any building cell
                    let minDist = Infinity;
                    for (let by = 0; by < building.height; by++) {
                        for (let bx = 0; bx < building.width; bx++) {
                            const dist = Math.abs(dx - bx) + Math.abs(dy - by);
                            minDist = Math.min(minDist, dist);
                        }
                    }

                    if (minDist <= this.buildRadius) {
                        validCells.add(`${checkX},${checkY}`);
                    }
                }
            }
        }

        push();

        // Draw filled valid area with transparency
        noStroke();
        fill(50, 200, 100, 30);
        for (const cellKey of validCells) {
            const [cx, cy] = cellKey.split(',').map(Number);
            rect(cx * cellSize, cy * cellSize, cellSize, cellSize);
        }

        // Draw outline by finding edge cells
        stroke(100, 255, 150, 180);
        strokeWeight(2);
        noFill();

        for (const cellKey of validCells) {
            const [cx, cy] = cellKey.split(',').map(Number);
            const x = cx * cellSize;
            const y = cy * cellSize;

            // Check each edge - draw if neighbor is not in valid set
            if (!validCells.has(`${cx},${cy - 1}`)) {
                line(x, y, x + cellSize, y); // Top edge
            }
            if (!validCells.has(`${cx},${cy + 1}`)) {
                line(x, y + cellSize, x + cellSize, y + cellSize); // Bottom edge
            }
            if (!validCells.has(`${cx - 1},${cy}`)) {
                line(x, y, x, y + cellSize); // Left edge
            }
            if (!validCells.has(`${cx + 1},${cy}`)) {
                line(x + cellSize, y, x + cellSize, y + cellSize); // Right edge
            }
        }

        // Draw pulsing glow effect on outline
        const pulse = (sin(millis() / 300) + 1) / 2;
        stroke(100, 255, 150, 50 + pulse * 50);
        strokeWeight(4);

        for (const cellKey of validCells) {
            const [cx, cy] = cellKey.split(',').map(Number);
            const x = cx * cellSize;
            const y = cy * cellSize;

            if (!validCells.has(`${cx},${cy - 1}`)) {
                line(x, y, x + cellSize, y);
            }
            if (!validCells.has(`${cx},${cy + 1}`)) {
                line(x, y + cellSize, x + cellSize, y + cellSize);
            }
            if (!validCells.has(`${cx - 1},${cy}`)) {
                line(x, y, x, y + cellSize);
            }
            if (!validCells.has(`${cx + 1},${cy}`)) {
                line(x + cellSize, y, x + cellSize, y + cellSize);
            }
        }

        pop();
    }

    /**
     * Draw red warning when placing outside build range
     */
    drawOutOfRangeWarning() {
        if (!this.ghostBuilding) return;

        const grid = this.game.grid;
        const gx = this.ghostBuilding.gridX;
        const gy = this.ghostBuilding.gridY;
        const cellSize = grid.cellSize;

        // Pulsing red effect
        const pulse = (sin(millis() / 150) + 1) / 2;

        push();

        // Red overlay on ghost building
        fill(255, 50, 50, 40 + pulse * 40);
        noStroke();
        rect(
            gx * cellSize,
            gy * cellSize,
            this.ghostBuilding.width * cellSize,
            this.ghostBuilding.height * cellSize
        );

        // Red X
        stroke(255, 80, 80, 150 + pulse * 100);
        strokeWeight(3);
        const cx = (gx + this.ghostBuilding.width / 2) * cellSize;
        const cy = (gy + this.ghostBuilding.height / 2) * cellSize;
        const size = 20;
        line(cx - size, cy - size, cx + size, cy + size);
        line(cx + size, cy - size, cx - size, cy + size);

        // "OUT OF RANGE" text
        fill(255, 100, 100);
        noStroke();
        textAlign(CENTER, BOTTOM);
        textSize(12);
        text("OUT OF RANGE", cx, gy * cellSize - 5);

        pop();
    }

    /**
     * Draw warning when placing on tiberium field
     */
    drawTiberiumWarning() {
        if (!this.ghostBuilding) return;

        const grid = this.game.grid;
        const gx = this.ghostBuilding.gridX;
        const gy = this.ghostBuilding.gridY;
        const cellSize = grid.cellSize;

        // Pulsing green/toxic effect
        const pulse = (sin(millis() / 150) + 1) / 2;

        push();

        // Green toxic overlay on ghost building
        fill(50, 200, 80, 40 + pulse * 50);
        noStroke();
        rect(
            gx * cellSize,
            gy * cellSize,
            this.ghostBuilding.width * cellSize,
            this.ghostBuilding.height * cellSize
        );

        // Tiberium crystal icon
        const cx = (gx + this.ghostBuilding.width / 2) * cellSize;
        const cy = (gy + this.ghostBuilding.height / 2) * cellSize;

        // Draw crystal with X overlay
        push();
        translate(cx, cy);

        // Crystal shape
        fill(80, 200, 100, 150 + pulse * 100);
        stroke(100, 255, 120);
        strokeWeight(2);
        beginShape();
        vertex(0, -15);
        vertex(8, -5);
        vertex(8, 8);
        vertex(0, 15);
        vertex(-8, 8);
        vertex(-8, -5);
        endShape(CLOSE);

        // Red X over crystal
        stroke(255, 80, 80, 200);
        strokeWeight(3);
        line(-12, -12, 12, 12);
        line(12, -12, -12, 12);
        pop();

        // "TIBERIUM FIELD" text
        fill(100, 255, 120);
        noStroke();
        textAlign(CENTER, BOTTOM);
        textSize(12);
        text("TIBERIUM FIELD", cx, gy * cellSize - 5);

        pop();
    }

    /**
     * Get buildings for a specific player
     */
    getBuildingsForPlayer(player) {
        return this.buildings.filter(b => b.owner === player);
    }

    /**
     * Get building at world position
     */
    getBuildingAt(worldX, worldY) {
        for (const building of this.buildings) {
            if (building.containsPoint(worldX, worldY)) {
                return building;
            }
        }
        return null;
    }

    /**
     * Get building at grid position
     */
    getBuildingAtGrid(gx, gy) {
        for (const building of this.buildings) {
            if (gx >= building.gridX && gx < building.gridX + building.width &&
                gy >= building.gridY && gy < building.gridY + building.height) {
                return building;
            }
        }
        return null;
    }

    /**
     * Check if player has a specific building type
     */
    playerHasBuilding(player, buildingType) {
        return this.buildings.some(b =>
            b.owner === player &&
            b.type === buildingType &&
            b.isComplete
        );
    }

    /**
     * Get all buildings owned by a player
     * @param {Player} player
     * @returns {Building[]}
     */
    getBuildingsByPlayer(player) {
        return this.buildings.filter(b => b.owner === player);
    }

    /**
     * Get available buildings player can construct
     * Uses cached info to avoid creating instances every frame
     */
    getAvailableBuildings(player) {
        const available = [];

        for (const type of Object.keys(this.buildingTypes)) {
            if (this.meetsRequirements(type, player)) {
                const info = this.buildingInfoCache[type];
                available.push({
                    type: type,
                    name: info.name,
                    cost: info.cost,
                    buildTime: info.buildTime,
                    canAfford: player.resources.tiberium >= info.cost
                });
            }
        }

        return available;
    }

    /**
     * Handle click during placement mode
     */
    handleClick(worldX, worldY, button) {
        if (!this.placementMode) return false;

        if (button === LEFT) {
            if (this.isValidPlacement()) {
                return this.confirmPlacement();
            }
        } else if (button === RIGHT) {
            this.cancelPlacement();
            return true;
        }

        return false;
    }

    /**
     * Spawn unit from production building
     */
    spawnUnitFromBuilding(building, unitType) {
        if (!building || !building.isComplete) return null;

        const grid = this.game.grid;
        const cellSize = grid.cellSize;

        // Find spawn point (rally point or adjacent cell)
        let spawnX, spawnY;

        if (building.rallyPoint) {
            spawnX = building.rallyPoint.x;
            spawnY = building.rallyPoint.y;
        } else {
            // Spawn below building
            spawnX = (building.gridX + building.width / 2) * cellSize;
            spawnY = (building.gridY + building.height + 1) * cellSize;
        }

        // Create unit
        if (this.game.unitManager) {
            const unit = this.game.unitManager.createUnit(unitType, spawnX, spawnY, building.owner);

            // Move to rally point if set
            if (building.rallyPoint && unit) {
                unit.commandQueue.push({
                    type: 'move',
                    targetX: building.rallyPoint.x,
                    targetY: building.rallyPoint.y
                });
            }

            return unit;
        }

        return null;
    }

    /**
     * Clear all buildings and reset state for new game
     */
    clear() {
        // Clear all buildings
        this.buildings = [];
        this.ghostBuilding = null;
        this.placementMode = false;
        this.selectedBuildingType = null;

        // Reset power grid
        this.totalPower = 0;
        this.usedPower = 0;
        this.isPowered = true;

        console.log("BuildingManager: Cleared all buildings");
    }
}

// Attach to window for global access
window.BuildingManager = BuildingManager;
