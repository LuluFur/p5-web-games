/**
 * Building.js - Base class for all RTS buildings
 *
 * Buildings are static structures that:
 * - Are placed on the grid
 * - Have construction time and animation
 * - Provide power, produce units, or defend
 * - Can be damaged and destroyed
 */

const BUILDING_STATES = {
    PLACING: 'placing',       // Ghost preview, not yet placed
    CONSTRUCTING: 'constructing', // Being built
    ACTIVE: 'active',         // Fully operational
    DAMAGED: 'damaged',       // Low health, reduced function
    DESTROYED: 'destroyed'    // Dead, will be removed
};

// Cached color objects to avoid creating them every frame
const BUILDING_COLORS = {
    healthGreen: null,
    healthYellow: null,
    healthRed: null,
    muzzleFlash: null,
    initialized: false
};

/**
 * Initialize cached colors (call after p5.js is ready)
 */
function initBuildingColors() {
    if (BUILDING_COLORS.initialized) return;
    if (typeof color !== 'function') return; // p5.js not ready

    BUILDING_COLORS.healthGreen = color(0, 255, 0);
    BUILDING_COLORS.healthYellow = color(255, 255, 0);
    BUILDING_COLORS.healthRed = color(255, 0, 0);
    BUILDING_COLORS.muzzleFlash = color(255, 200, 50);
    BUILDING_COLORS.initialized = true;
}

class Building {
    static nextId = 1;

    constructor(gridX, gridY, owner, config = {}) {
        this.id = Building.nextId++;
        this.gridX = gridX;  // Grid cell X
        this.gridY = gridY;  // Grid cell Y
        this.owner = owner;

        // Config
        this.config = config;
        this.name = config.name || 'Building';
        this.type = config.type || 'generic';

        // Size in grid cells
        this.width = config.width || 2;
        this.height = config.height || 2;

        // Calculate world position (center of building)
        const cellSize = RTS_GRID?.CELL_SIZE || 32;
        this.x = (gridX + this.width / 2) * cellSize;
        this.y = (gridY + this.height / 2) * cellSize;
        this.cellSize = cellSize;

        // Health
        this.maxHealth = config.health || 1000;
        this.health = this.maxHealth;
        this.armor = config.armor || 0;

        // Construction
        this.buildTime = config.buildTime || 10; // Seconds
        this.buildProgress = 0; // 0 to 1
        this.state = BUILDING_STATES.PLACING;
        this.isComplete = false;

        // Cost
        this.cost = config.cost || 500;

        // Power
        this.powerOutput = config.powerOutput || 0;
        this.powerConsumption = config.powerConsumption || 0;

        // Production (for factories)
        this.productionQueue = [];
        this.currentProduction = null;
        this.productionProgress = 0;
        this.rallyPoint = null;

        // Visual
        this.primaryColor = owner?.color ?
            color(owner.color.r, owner.color.g, owner.color.b) :
            color(100, 100, 200);
        this.secondaryColor = color(60, 60, 80);

        // State
        this.active = true;
        this.selected = false;

        // Vision range for fog of war (in pixels)
        // Default: 0 (no vision). Overridden in subclasses.
        this.visionRange = config.visionRange || 0;
    }

    // ========================================
    // PLACEMENT & CONSTRUCTION
    // ========================================

    /**
     * Start construction (called after valid placement)
     * Note: Cost is deducted by BuildingManager.confirmPlacement()
     */
    startConstruction() {
        this.state = BUILDING_STATES.CONSTRUCTING;
        this.buildProgress = 0;
    }

    /**
     * Update construction progress
     * @param {number} deltaTime - Time since last frame in seconds
     */
    updateConstruction(deltaTime) {
        if (this.state !== BUILDING_STATES.CONSTRUCTING) return;

        this.buildProgress += deltaTime / this.buildTime;

        if (this.buildProgress >= 1) {
            this.buildProgress = 1;
            this.completeConstruction();
        }
    }

    /**
     * Complete construction
     */
    completeConstruction() {
        this.state = BUILDING_STATES.ACTIVE;
        this.isComplete = true;

        // Add power to owner's grid
        if (this.owner && this.powerOutput > 0) {
            this.owner.addPower(this.powerOutput);
        }

        // Emit event
        if (typeof EVENTS !== 'undefined') {
            EVENTS.emit('BUILDING_COMPLETE', { building: this });
        }

    }

    /**
     * Check if placement is valid at given grid position
     * @param {Grid} grid - The game grid
     * @param {number} gx - Grid X
     * @param {number} gy - Grid Y
     * @returns {boolean}
     */
    canPlaceAt(grid, gx, gy) {
        // Check all cells the building would occupy
        for (let dy = 0; dy < this.height; dy++) {
            for (let dx = 0; dx < this.width; dx++) {
                const checkX = gx + dx;
                const checkY = gy + dy;

                // Bounds check
                if (checkX < 0 || checkX >= grid.cols ||
                    checkY < 0 || checkY >= grid.rows) {
                    return false;
                }

                // Check if cell is buildable (0 = empty/buildable)
                if (grid.map[checkY][checkX] !== 0) {
                    return false;
                }
            }
        }

        return true;
    }

    /**
     * Occupy grid cells after placement
     * @param {Grid} grid
     */
    occupyGrid(grid) {
        for (let dy = 0; dy < this.height; dy++) {
            for (let dx = 0; dx < this.width; dx++) {
                const cellX = this.gridX + dx;
                const cellY = this.gridY + dy;
                if (cellX >= 0 && cellX < grid.cols &&
                    cellY >= 0 && cellY < grid.rows) {
                    grid.map[cellY][cellX] = 3; // 3 = building
                }
            }
        }
    }

    /**
     * Free grid cells when destroyed
     * @param {Grid} grid
     */
    freeGrid(grid) {
        for (let dy = 0; dy < this.height; dy++) {
            for (let dx = 0; dx < this.width; dx++) {
                const cellX = this.gridX + dx;
                const cellY = this.gridY + dy;
                if (cellX >= 0 && cellX < grid.cols &&
                    cellY >= 0 && cellY < grid.rows) {
                    grid.map[cellY][cellX] = 0; // 0 = empty
                }
            }
        }
    }

    // ========================================
    // COMBAT
    // ========================================

    takeDamage(amount, attacker) {
        if (this.state === BUILDING_STATES.DESTROYED) return;

        // Apply armor reduction
        const reducedDamage = amount * (1 - this.armor);
        this.health -= reducedDamage;

        // Check for damaged state
        if (this.health <= this.maxHealth * 0.25) {
            this.state = BUILDING_STATES.DAMAGED;
        }

        // Check for destruction
        if (this.health <= 0) {
            this.health = 0;
            this.destroy();
        }
    }

    destroy() {
        this.state = BUILDING_STATES.DESTROYED;
        this.active = false;

        // Remove power from owner's grid
        if (this.owner && this.powerOutput > 0) {
            this.owner.removePower(this.powerOutput);
        }

        // Emit event
        if (typeof EVENTS !== 'undefined') {
            EVENTS.emit('BUILDING_DESTROYED', { building: this });
        }

    }

    isDead() {
        return this.state === BUILDING_STATES.DESTROYED || this.health <= 0;
    }

    // ========================================
    // PRODUCTION (for factories)
    // ========================================

    /**
     * Add unit to production queue
     * @param {string} unitType
     */
    queueUnit(unitType) {
        const unitConfig = RTS_UNITS?.[unitType.toUpperCase()];
        if (!unitConfig) {
            return false;
        }

        // Check if owner can afford
        if (this.owner && this.owner.resources.tiberium < unitConfig.cost) {
            return false;
        }

        // Deduct cost
        if (this.owner) {
            this.owner.spendTiberium(unitConfig.cost);
        }

        this.productionQueue.push({
            type: unitType,
            config: unitConfig,
            buildTime: unitConfig.buildTime || 5
        });

        // Start production if idle
        if (!this.currentProduction) {
            this.startNextProduction();
        }

        return true;
    }

    startNextProduction() {
        if (this.productionQueue.length === 0) {
            this.currentProduction = null;
            return;
        }

        this.currentProduction = this.productionQueue.shift();
        this.productionProgress = 0;
    }

    updateProduction(deltaTime) {
        if (!this.currentProduction || this.state !== BUILDING_STATES.ACTIVE) return;

        // Check power (production slows if low power)
        const powerRatio = this.owner?.getPowerRatio() || 1;
        const speedModifier = powerRatio < 1 ? 0.5 : 1;

        this.productionProgress += (deltaTime / this.currentProduction.buildTime) * speedModifier;

        if (this.productionProgress >= 1) {
            this.completeProduction();
        }
    }

    completeProduction() {
        if (!this.currentProduction) return;

        // Spawn unit at rally point (which defaults to building center)
        const spawnX = this.rallyPoint?.x || this.x;
        const spawnY = this.rallyPoint?.y || this.y;

        // Create unit through UnitManager
        if (Game.instance && Game.instance.unitManager) {
            const unit = Game.instance.unitManager.createUnit(
                this.currentProduction.type,
                spawnX,
                spawnY,
                this.owner
            );

            // If rally point is set and different from spawn location, move unit there
            if (this.rallyPoint && unit && typeof MoveCommand !== 'undefined' &&
                (Math.abs(this.rallyPoint.x - spawnX) > 1 || Math.abs(this.rallyPoint.y - spawnY) > 1)) {
                const moveCmd = new MoveCommand(unit, this.rallyPoint.x, this.rallyPoint.y);
                unit.queueCommand(moveCmd);
            }
        }

        // Emit event
        if (typeof EVENTS !== 'undefined') {
            EVENTS.emit('PRODUCTION_COMPLETE', {
                building: this,
                unitType: this.currentProduction.type
            });
        }

        // Start next in queue
        this.startNextProduction();
    }

    setRallyPoint(x, y) {
        this.rallyPoint = { x, y };
    }

    // ========================================
    // UPDATE
    // ========================================

    update(deltaTime) {
        if (!this.active) return;

        // Update construction
        if (this.state === BUILDING_STATES.CONSTRUCTING) {
            this.updateConstruction(deltaTime);
        }

        // Update production
        if (this.state === BUILDING_STATES.ACTIVE) {
            this.updateProduction(deltaTime);
        }
    }

    // ========================================
    // SELECTION
    // ========================================

    select() {
        this.selected = true;
    }

    deselect() {
        this.selected = false;
    }

    containsPoint(px, py) {
        const halfW = (this.width * this.cellSize) / 2;
        const halfH = (this.height * this.cellSize) / 2;
        return px >= this.x - halfW && px <= this.x + halfW &&
               py >= this.y - halfH && py <= this.y + halfH;
    }

    // ========================================
    // DRAWING
    // ========================================

    draw() {
        if (!this.active && this.state !== BUILDING_STATES.DESTROYED) return;

        push();
        translate(this.x, this.y);

        // Draw based on state
        if (this.state === BUILDING_STATES.PLACING) {
            this.drawGhost();
        } else if (this.state === BUILDING_STATES.CONSTRUCTING) {
            this.drawConstruction();
        } else {
            this.drawBody();
        }

        // Selection indicator
        if (this.selected) {
            this.drawSelectionIndicator();
        }

        // Health bar (when damaged or selected)
        if (this.selected || this.health < this.maxHealth) {
            this.drawHealthBar();
        }

        // Production progress bar (when producing)
        if (this.currentProduction && this.productionProgress > 0) {
            this.drawProductionProgress();
        }

        // Name plate (only for completed buildings)
        if (this.state === BUILDING_STATES.ACTIVE) {
            this.drawNamePlate();
        }

        pop();

        // Rally point (drawn in world coords, so after pop)
        if (this.selected && this.rallyPoint && this.state === BUILDING_STATES.ACTIVE) {
            // Get owner's color
            const ownerColor = this.owner?.color;
            const rallyColor = ownerColor ?
                color(ownerColor.r, ownerColor.g, ownerColor.b) :
                color(100, 200, 100);

            // Draw line from building to rally point
            stroke(rallyColor);
            strokeWeight(1);
            const dashLength = 8;
            const gapLength = 4;
            const dx = this.rallyPoint.x - this.x;
            const dy = this.rallyPoint.y - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const steps = Math.floor(dist / (dashLength + gapLength));
            for (let i = 0; i < steps; i++) {
                const t1 = (i * (dashLength + gapLength)) / dist;
                const t2 = Math.min(1, (i * (dashLength + gapLength) + dashLength) / dist);
                line(
                    this.x + dx * t1, this.y + dy * t1,
                    this.x + dx * t2, this.y + dy * t2
                );
            }

            // Draw rally point flag
            if (window.ShapeRenderer) {
                window.ShapeRenderer.drawRallyPoint(
                    this.rallyPoint.x, this.rallyPoint.y,
                    rallyColor
                );
            } else {
                // Fallback - simple circle
                fill(rallyColor);
                noStroke();
                ellipse(this.rallyPoint.x, this.rallyPoint.y, 10, 10);
            }
        }
    }

    drawGhost() {
        // Semi-transparent preview
        const halfW = (this.width * this.cellSize) / 2;
        const halfH = (this.height * this.cellSize) / 2;

        noStroke();
        fill(0, 255, 0, 80); // Green = valid
        rect(-halfW, -halfH, this.width * this.cellSize, this.height * this.cellSize);

        // Outline
        stroke(0, 255, 0, 150);
        strokeWeight(2);
        noFill();
        rect(-halfW, -halfH, this.width * this.cellSize, this.height * this.cellSize);
    }

    drawConstruction() {
        const halfW = (this.width * this.cellSize) / 2;
        const halfH = (this.height * this.cellSize) / 2;

        // Foundation
        fill(60, 60, 60);
        noStroke();
        rect(-halfW, -halfH, this.width * this.cellSize, this.height * this.cellSize);

        // Construction scaffolding effect
        stroke(150, 150, 100);
        strokeWeight(1);
        for (let i = 0; i < 3; i++) {
            const y = -halfH + (this.height * this.cellSize * this.buildProgress) * (i / 3);
            line(-halfW, y, halfW, y);
        }

        // Progress bar
        fill(40);
        rect(-halfW + 5, halfH - 10, this.width * this.cellSize - 10, 6);
        fill(255, 200, 0);
        rect(-halfW + 5, halfH - 10, (this.width * this.cellSize - 10) * this.buildProgress, 6);
    }

    drawBody() {
        // Override in subclasses for specific building visuals
        const halfW = (this.width * this.cellSize) / 2;
        const halfH = (this.height * this.cellSize) / 2;

        // Base
        fill(this.secondaryColor);
        stroke(0);
        strokeWeight(1);
        rect(-halfW + 2, -halfH + 2, this.width * this.cellSize - 4, this.height * this.cellSize - 4, 4);

        // Team color accent
        fill(this.primaryColor);
        noStroke();
        rect(-halfW + 5, -halfH + 5, this.width * this.cellSize - 10, 8);
    }

    drawSelectionIndicator() {
        const halfW = (this.width * this.cellSize) / 2 + 5;
        const halfH = (this.height * this.cellSize) / 2 + 5;

        noFill();
        stroke(0, 255, 0);
        strokeWeight(2);

        // Corner brackets
        const cornerSize = 10;
        // Top-left
        line(-halfW, -halfH + cornerSize, -halfW, -halfH);
        line(-halfW, -halfH, -halfW + cornerSize, -halfH);
        // Top-right
        line(halfW - cornerSize, -halfH, halfW, -halfH);
        line(halfW, -halfH, halfW, -halfH + cornerSize);
        // Bottom-left
        line(-halfW, halfH - cornerSize, -halfW, halfH);
        line(-halfW, halfH, -halfW + cornerSize, halfH);
        // Bottom-right
        line(halfW - cornerSize, halfH, halfW, halfH);
        line(halfW, halfH - cornerSize, halfW, halfH);
    }

    drawHealthBar() {
        // Ensure colors are initialized
        initBuildingColors();

        const halfW = (this.width * this.cellSize) / 2;
        const barWidth = this.width * this.cellSize - 10;
        const barHeight = 4;
        const y = -(this.height * this.cellSize) / 2 - 10;

        // Background
        fill(40);
        noStroke();
        rect(-barWidth / 2, y, barWidth, barHeight);

        // Health (use cached colors)
        const healthPercent = this.health / this.maxHealth;
        const healthColor = healthPercent > 0.5 ? BUILDING_COLORS.healthGreen :
                           healthPercent > 0.25 ? BUILDING_COLORS.healthYellow : BUILDING_COLORS.healthRed;
        fill(healthColor);
        rect(-barWidth / 2, y, barWidth * healthPercent, barHeight);
    }

    drawProductionProgress() {
        const barWidth = this.width * this.cellSize - 10;
        const barHeight = 4;
        const halfH = (this.height * this.cellSize) / 2;
        const y = halfH + 4; // Below building, above name plate

        // Background
        fill(40);
        noStroke();
        rect(-barWidth / 2, y, barWidth, barHeight);

        // Progress (cyan/blue for production)
        fill(0, 200, 255);
        rect(-barWidth / 2, y, barWidth * this.productionProgress, barHeight);

        // Unit icon/name (small text showing what's being produced)
        if (this.currentProduction) {
            fill(200);
            textAlign(CENTER, TOP);
            textSize(8);
            const unitName = this.currentProduction.name || 'Unit';
            text(unitName, 0, y + barHeight + 2);
        }
    }

    drawNamePlate() {
        const halfH = (this.height * this.cellSize) / 2;
        const y = halfH + 12; // Below the building

        // Get owner color for the plate background
        const ownerColor = this.owner?.color || { r: 100, g: 100, b: 100 };

        // Text setup
        textAlign(CENTER, TOP);
        textSize(10);

        // Measure text width for background
        const displayName = this.name || this.type;
        const textW = textWidth(displayName) + 8;
        const textH = 14;

        // Background plate with owner color
        fill(ownerColor.r, ownerColor.g, ownerColor.b, 180);
        stroke(0, 0, 0, 100);
        strokeWeight(1);
        rect(-textW / 2, y - 2, textW, textH, 3);

        // Text
        fill(255);
        noStroke();
        text(displayName, 0, y);
    }

    /**
     * Get the drop-off point for harvesters (for Refinery)
     */
    getDropoffPoint() {
        return {
            x: this.x,
            y: this.y + (this.height * this.cellSize) / 2 + 10
        };
    }

    // ========================================
    // STATIC BUILDER CLASS
    // ========================================

    /**
     * Fluent builder for creating Building instances
     *
     * Usage:
     *   const building = Building.Builder.create()
     *       .ofType('barracks')
     *       .atGridPosition(5, 10)
     *       .ownedBy(player)
     *       .withHealth(1000)
     *       .asComplete()
     *       .build();
     */
    static Builder = class {
        constructor() {
            this._reset();
        }

        _reset() {
            this._type = 'barracks';
            this._gridX = 0;
            this._gridY = 0;
            this._owner = null;
            this._overrides = {};
            this._startComplete = false;
            this._startConstructing = false;
            this._rallyPoint = null;
            return this;
        }

        ofType(type) {
            this._type = type.toLowerCase();
            return this;
        }

        atGridPosition(gridX, gridY) {
            this._gridX = gridX;
            this._gridY = gridY;
            return this;
        }

        ownedBy(player) {
            this._owner = player;
            return this;
        }

        withHealth(health) {
            this._overrides.health = health;
            return this;
        }

        withCost(cost) {
            this._overrides.cost = cost;
            return this;
        }

        withBuildTime(seconds) {
            this._overrides.buildTime = seconds;
            return this;
        }

        withPowerOutput(power) {
            this._overrides.powerOutput = power;
            return this;
        }

        withPowerConsumption(power) {
            this._overrides.powerConsumption = power;
            return this;
        }

        withSize(width, height) {
            this._overrides.width = width;
            this._overrides.height = height;
            return this;
        }

        withArmor(armor) {
            this._overrides.armor = armor;
            return this;
        }

        withRallyPoint(x, y) {
            this._rallyPoint = { x, y };
            return this;
        }

        asComplete() {
            this._startComplete = true;
            this._startConstructing = false;
            return this;
        }

        asConstructing() {
            this._startConstructing = true;
            this._startComplete = false;
            return this;
        }

        asPlacing() {
            this._startComplete = false;
            this._startConstructing = false;
            return this;
        }

        build() {
            let building;

            switch (this._type) {
                case 'construction_yard':
                case 'constructionyard':
                    building = new ConstructionYard(
                        this._gridX,
                        this._gridY,
                        this._owner
                    );
                    break;

                case 'power_plant':
                case 'powerplant':
                    building = new PowerPlant(
                        this._gridX,
                        this._gridY,
                        this._owner
                    );
                    break;

                case 'barracks':
                    building = new Barracks(
                        this._gridX,
                        this._gridY,
                        this._owner
                    );
                    break;

                case 'refinery':
                    building = new Refinery(
                        this._gridX,
                        this._gridY,
                        this._owner
                    );
                    break;

                case 'war_factory':
                case 'warfactory':
                    building = new WarFactory(
                        this._gridX,
                        this._gridY,
                        this._owner
                    );
                    break;

                case 'tech_center':
                case 'techcenter':
                    building = new TechCenter(
                        this._gridX,
                        this._gridY,
                        this._owner
                    );
                    break;

                case 'guard_tower':
                case 'guardtower':
                    building = new GuardTower(
                        this._gridX,
                        this._gridY,
                        this._owner
                    );
                    break;

                case 'silo':
                    building = new Silo(
                        this._gridX,
                        this._gridY,
                        this._owner
                    );
                    break;

                case 'radar':
                    building = new Radar(
                        this._gridX,
                        this._gridY,
                        this._owner
                    );
                    break;

                case 'helipad':
                    building = new Helipad(
                        this._gridX,
                        this._gridY,
                        this._owner
                    );
                    break;

                case 'repair_bay':
                case 'repairbay':
                    building = new RepairBay(
                        this._gridX,
                        this._gridY,
                        this._owner
                    );
                    break;

                default:
                    building = new Building(
                        this._gridX,
                        this._gridY,
                        this._owner,
                        this._getDefaultConfig()
                    );
            }

            if (this._overrides.health !== undefined) {
                building.maxHealth = this._overrides.health;
                building.health = this._overrides.health;
            }

            if (this._overrides.cost !== undefined) {
                building.cost = this._overrides.cost;
            }

            if (this._overrides.buildTime !== undefined) {
                building.buildTime = this._overrides.buildTime;
            }

            if (this._overrides.powerOutput !== undefined) {
                building.powerOutput = this._overrides.powerOutput;
            }

            if (this._overrides.powerConsumption !== undefined) {
                building.powerConsumption = this._overrides.powerConsumption;
            }

            if (this._overrides.armor !== undefined) {
                building.armor = this._overrides.armor;
            }

            if (this._rallyPoint) {
                building.rallyPoint = this._rallyPoint;
            }

            if (this._startComplete) {
                building.state = BUILDING_STATES.ACTIVE;
                building.isComplete = true;
                building.buildProgress = 1;
            } else if (this._startConstructing) {
                building.state = BUILDING_STATES.CONSTRUCTING;
                building.isComplete = false;
                building.buildProgress = 0;
            }

            return building;
        }

        _getDefaultConfig() {
            return {
                name: this._type,
                type: this._type,
                width: this._overrides.width || 2,
                height: this._overrides.height || 2,
                health: this._overrides.health || 500,
                cost: this._overrides.cost || 300,
                buildTime: this._overrides.buildTime || 10,
                powerOutput: this._overrides.powerOutput || 0,
                powerConsumption: this._overrides.powerConsumption || 0
            };
        }

        static create() {
            return new Building.Builder();
        }

        static constructionYard(owner, gridX = 0, gridY = 0) {
            return new Building.Builder()
                .ofType('construction_yard')
                .atGridPosition(gridX, gridY)
                .ownedBy(owner)
                .asComplete()
                .build();
        }

        static powerPlant(owner, gridX = 0, gridY = 0) {
            return new Building.Builder()
                .ofType('power_plant')
                .atGridPosition(gridX, gridY)
                .ownedBy(owner)
                .build();
        }

        static barracks(owner, gridX = 0, gridY = 0) {
            return new Building.Builder()
                .ofType('barracks')
                .atGridPosition(gridX, gridY)
                .ownedBy(owner)
                .build();
        }

        static refinery(owner, gridX = 0, gridY = 0) {
            return new Building.Builder()
                .ofType('refinery')
                .atGridPosition(gridX, gridY)
                .ownedBy(owner)
                .build();
        }

        static warFactory(owner, gridX = 0, gridY = 0) {
            return new Building.Builder()
                .ofType('war_factory')
                .atGridPosition(gridX, gridY)
                .ownedBy(owner)
                .build();
        }

        static techCenter(owner, gridX = 0, gridY = 0) {
            return new Building.Builder()
                .ofType('tech_center')
                .atGridPosition(gridX, gridY)
                .ownedBy(owner)
                .build();
        }

        static guardTower(owner, gridX = 0, gridY = 0) {
            return new Building.Builder()
                .ofType('guard_tower')
                .atGridPosition(gridX, gridY)
                .ownedBy(owner)
                .build();
        }

        static silo(owner, gridX = 0, gridY = 0) {
            return new Building.Builder()
                .ofType('silo')
                .atGridPosition(gridX, gridY)
                .ownedBy(owner)
                .build();
        }

        static radar(owner, gridX = 0, gridY = 0) {
            return new Building.Builder()
                .ofType('radar')
                .atGridPosition(gridX, gridY)
                .ownedBy(owner)
                .build();
        }

        static helipad(owner, gridX = 0, gridY = 0) {
            return new Building.Builder()
                .ofType('helipad')
                .atGridPosition(gridX, gridY)
                .ownedBy(owner)
                .build();
        }

        static repairBay(owner, gridX = 0, gridY = 0) {
            return new Building.Builder()
                .ofType('repair_bay')
                .atGridPosition(gridX, gridY)
                .ownedBy(owner)
                .build();
        }
    };
}

// ========================================
// SPECIFIC BUILDING TYPES
// ========================================

/**
 * Construction Yard - Main base building, allows construction
 */
class ConstructionYard extends Building {
    constructor(gridX, gridY, owner) {
        super(gridX, gridY, owner, {
            name: 'Construction Yard',
            type: 'construction_yard',
            width: 3,
            height: 3,
            health: 2000,
            cost: 0, // Free starting building
            buildTime: 0,
            powerOutput: 0,
            powerConsumption: 0,
            visionRange: 200  // Moderate vision (6 cells)
        });

        // ConYard starts complete
        this.state = BUILDING_STATES.ACTIVE;
        this.isComplete = true;
        this.buildProgress = 1;
    }

    drawBody() {
        const halfW = (this.width * this.cellSize) / 2;
        const halfH = (this.height * this.cellSize) / 2;

        // Base platform
        fill(70, 70, 80);
        stroke(40);
        strokeWeight(1);
        rect(-halfW + 2, -halfH + 2, this.width * this.cellSize - 4, this.height * this.cellSize - 4, 6);

        // Main structure
        fill(90, 90, 100);
        rect(-halfW + 10, -halfH + 10, this.width * this.cellSize - 20, this.height * this.cellSize - 30, 4);

        // Crane arm
        stroke(this.primaryColor);
        strokeWeight(3);
        line(0, -halfH + 15, halfW - 15, -halfH + 25);
        line(halfW - 15, -halfH + 25, halfW - 15, halfH - 20);

        // Team color stripe
        noStroke();
        fill(this.primaryColor);
        rect(-halfW + 10, halfH - 18, this.width * this.cellSize - 20, 8);
    }
}

/**
 * Power Plant - Generates power for the base
 */
class PowerPlant extends Building {
    constructor(gridX, gridY, owner) {
        super(gridX, gridY, owner, {
            name: 'Power Plant',
            type: 'power_plant',
            width: 2,
            height: 2,
            health: 750,
            cost: 300,
            buildTime: 8,
            powerOutput: 100,
            powerConsumption: 0
        });
    }

    drawBody() {
        const halfW = (this.width * this.cellSize) / 2;
        const halfH = (this.height * this.cellSize) / 2;

        // Base
        fill(60, 70, 80);
        stroke(40);
        strokeWeight(1);
        rect(-halfW + 2, -halfH + 2, this.width * this.cellSize - 4, this.height * this.cellSize - 4, 4);

        // Cooling towers
        fill(80, 80, 90);
        ellipse(-halfW + 20, 0, 25, 30);
        ellipse(halfW - 20, 0, 25, 30);

        // Power core (glowing)
        const pulse = sin(millis() / 200) * 0.3 + 0.7;
        fill(255 * pulse, 255 * pulse, 100 * pulse);
        noStroke();
        ellipse(0, 0, 20, 20);

        // Team color
        fill(this.primaryColor);
        rect(-halfW + 5, halfH - 12, this.width * this.cellSize - 10, 6);
    }
}

/**
 * Barracks - Produces infantry units
 */
class Barracks extends Building {
    constructor(gridX, gridY, owner) {
        super(gridX, gridY, owner, {
            name: 'Barracks',
            type: 'barracks',
            width: 2,
            height: 2,
            health: 800,
            cost: 400,
            buildTime: 10,
            powerOutput: 0,
            powerConsumption: 20,
            visionRange: 160  // Moderate vision (5 cells)
        });

        // Units this building can produce
        this.producibleUnits = ['RIFLEMAN', 'ROCKET_SOLDIER', 'ENGINEER', 'COMMANDO'];
        this.isProductionBuilding = true;

        // Rally point - units spawn directly on the building
        this.rallyPoint = {
            x: this.x,
            y: this.y
        };
    }

    drawBody() {
        const halfW = (this.width * this.cellSize) / 2;
        const halfH = (this.height * this.cellSize) / 2;

        // Base
        fill(70, 60, 50);
        stroke(40);
        strokeWeight(1);
        rect(-halfW + 2, -halfH + 2, this.width * this.cellSize - 4, this.height * this.cellSize - 4, 4);

        // Building structure
        fill(90, 80, 70);
        rect(-halfW + 8, -halfH + 8, this.width * this.cellSize - 16, this.height * this.cellSize - 20, 3);

        // Door
        fill(50, 40, 30);
        rect(-8, halfH - 20, 16, 18);

        // Team color banner
        fill(this.primaryColor);
        noStroke();
        rect(-halfW + 8, -halfH + 8, this.width * this.cellSize - 16, 8);

        // Production indicator
        if (this.currentProduction) {
            fill(255, 200, 0);
            const progWidth = (this.width * this.cellSize - 20) * this.productionProgress;
            rect(-halfW + 10, -halfH - 8, progWidth, 4);
        }
    }
}

/**
 * Refinery - Processes tiberium from harvesters
 */
class Refinery extends Building {
    constructor(gridX, gridY, owner) {
        super(gridX, gridY, owner, {
            name: 'Refinery',
            type: 'refinery',
            width: 3,
            height: 2,
            health: 900,
            cost: 500,
            buildTime: 12,
            powerOutput: 0,
            powerConsumption: 30,
            visionRange: 140  // Low-moderate vision (4-5 cells)
        });

        // Refinery spawns a harvester on completion
        this.spawnsHarvester = true;
    }

    completeConstruction() {
        super.completeConstruction();

        // Spawn free harvester directly on the refinery
        if (this.spawnsHarvester && Game.instance && Game.instance.unitManager) {
            const spawnX = this.x;
            const spawnY = this.y;
            Game.instance.unitManager.createUnit('harvester', spawnX, spawnY, this.owner);
        }
    }

    drawBody() {
        const halfW = (this.width * this.cellSize) / 2;
        const halfH = (this.height * this.cellSize) / 2;

        // Base platform
        fill(60, 70, 60);
        stroke(40);
        strokeWeight(1);
        rect(-halfW + 2, -halfH + 2, this.width * this.cellSize - 4, this.height * this.cellSize - 4, 4);

        // Main structure
        fill(80, 90, 80);
        rect(-halfW + 10, -halfH + 10, this.width * this.cellSize - 40, this.height * this.cellSize - 20, 3);

        // Tiberium silo
        fill(0, 150, 100);
        ellipse(halfW - 20, 0, 30, 40);

        // Dock area
        fill(50, 50, 50);
        rect(-halfW + 5, halfH - 15, 40, 13);

        // Team color
        fill(this.primaryColor);
        noStroke();
        rect(-halfW + 10, -halfH + 10, this.width * this.cellSize - 40, 6);
    }
}

/**
 * War Factory - Produces vehicle units
 */
class WarFactory extends Building {
    constructor(gridX, gridY, owner) {
        super(gridX, gridY, owner, {
            name: 'War Factory',
            type: 'war_factory',
            width: 3,
            height: 2,
            health: 1200,
            cost: 800,
            buildTime: 15,
            powerOutput: 0,
            powerConsumption: 40,
            visionRange: 180  // Moderate vision (5-6 cells)
        });

        // Units this building can produce
        this.producibleUnits = ['HARVESTER', 'SCOUT_BUGGY', 'TANK', 'ARTILLERY', 'HEAVY_TANK', 'STEALTH_TANK'];
        this.isProductionBuilding = true;

        // Rally point - units spawn directly on the building
        this.rallyPoint = {
            x: this.x,
            y: this.y
        };
    }

    drawBody() {
        const halfW = (this.width * this.cellSize) / 2;
        const halfH = (this.height * this.cellSize) / 2;

        // Base platform
        fill(70, 70, 80);
        stroke(40);
        strokeWeight(1);
        rect(-halfW + 2, -halfH + 2, this.width * this.cellSize - 4, this.height * this.cellSize - 4, 4);

        // Main hangar
        fill(90, 90, 100);
        rect(-halfW + 8, -halfH + 8, this.width * this.cellSize - 16, this.height * this.cellSize - 16, 6);

        // Hangar door (dark opening)
        fill(30, 30, 40);
        rect(-halfW + 15, halfH - 20, this.width * this.cellSize - 30, 18);

        // Crane rail
        stroke(120, 120, 130);
        strokeWeight(3);
        line(-halfW + 20, -halfH + 15, halfW - 20, -halfH + 15);

        // Team color stripe
        noStroke();
        fill(this.primaryColor);
        rect(-halfW + 8, -halfH + 8, this.width * this.cellSize - 16, 8);

        // Production indicator
        if (this.currentProduction) {
            fill(255, 200, 0);
            const progWidth = (this.width * this.cellSize - 20) * this.productionProgress;
            rect(-halfW + 10, -halfH - 8, progWidth, 4);
        }
    }
}

/**
 * Tech Center - Unlocks advanced units and buildings
 */
class TechCenter extends Building {
    constructor(gridX, gridY, owner) {
        super(gridX, gridY, owner, {
            name: 'Tech Center',
            type: 'tech_center',
            width: 2,
            height: 2,
            health: 800,
            cost: 1500,
            buildTime: 20,
            powerOutput: 0,
            powerConsumption: 60
        });

        this.researchProgress = 0;
        this.currentResearch = null;
    }

    completeConstruction() {
        super.completeConstruction();

        // Unlock advanced tech for owner
        if (this.owner) {
            this.owner.advanceTechLevel();
            this.owner.unlockBuilding('obelisk');
            this.owner.unlockUnit('mammoth_tank');
        }
    }

    drawBody() {
        const halfW = (this.width * this.cellSize) / 2;
        const halfH = (this.height * this.cellSize) / 2;

        // Base
        fill(60, 60, 80);
        stroke(40);
        strokeWeight(1);
        rect(-halfW + 2, -halfH + 2, this.width * this.cellSize - 4, this.height * this.cellSize - 4, 4);

        // Main dome
        fill(80, 80, 110);
        ellipse(0, 0, this.width * this.cellSize - 20, this.height * this.cellSize - 20);

        // Tech antenna
        stroke(150, 150, 180);
        strokeWeight(2);
        line(0, -halfH + 10, 0, -halfH - 15);
        noStroke();
        fill(100, 200, 255);
        ellipse(0, -halfH - 15, 8, 8);

        // Pulsing core
        const pulse = sin(millis() / 300) * 0.3 + 0.7;
        fill(100 * pulse, 180 * pulse, 255 * pulse);
        ellipse(0, 0, 20, 20);

        // Team color accent
        fill(this.primaryColor);
        noStroke();
        arc(0, 0, this.width * this.cellSize - 24, this.height * this.cellSize - 24, PI, TWO_PI);
    }
}

/**
 * Guard Tower - Defensive turret that attacks enemies
 * Inspired by C&C3 Watchtower - rapid-fire anti-infantry defense
 */
class GuardTower extends Building {
    constructor(gridX, gridY, owner) {
        super(gridX, gridY, owner, {
            name: 'Guard Tower',
            type: 'guard_tower',
            width: 1,
            height: 1,
            health: 600,
            cost: 300,
            buildTime: 6,
            powerOutput: 0,
            powerConsumption: 15,
            visionRange: 250  // 7-8 cell vision
        });

        // Combat stats - buffed for rapid-fire infantry shredding
        this.damage = 25;                                      // Up from 15 - more punch per shot
        this.attackRange = 7 * (RTS_GRID?.CELL_SIZE || 32);   // Up from 5 - longer engagement range
        this.fireRate = 8;                                     // Down from 30 - much faster fire rate (~7.5 shots/sec)
        this.attackCooldown = 0;
        this.currentTarget = null;
        this.turretAngle = 0;
    }

    update(deltaTime) {
        super.update(deltaTime);

        if (this.state !== BUILDING_STATES.ACTIVE) return;

        // Update attack cooldown
        if (this.attackCooldown > 0) {
            this.attackCooldown -= deltaTime * 60;
        }

        // Find and attack enemies
        this.updateCombat(deltaTime);
    }

    updateCombat(deltaTime) {
        // Find nearest target (unit or building)
        if (!this.currentTarget || !this.isValidTarget(this.currentTarget)) {
            this.currentTarget = this.findNearestTarget();
        }

        if (this.currentTarget) {
            // Rotate turret toward target
            const dx = this.currentTarget.x - this.x;
            const dy = this.currentTarget.y - this.y;
            this.turretAngle = Math.atan2(dy, dx);

            // Attack if ready
            if (this.attackCooldown <= 0) {
                this.attack(this.currentTarget);
                this.attackCooldown = this.fireRate;
            }
        }
    }

    isValidTarget(target) {
        if (!target || target.isDead()) return false;
        const dist = Math.hypot(target.x - this.x, target.y - this.y);
        return dist <= this.attackRange;
    }

    findNearestEnemy() {
        if (!Game.instance || !Game.instance.unitManager) return null;

        // Use optimized method if available (avoids filtering all units)
        if (typeof RTSUnitManager !== 'undefined' && RTSUnitManager.getEnemyUnitsInRange) {
            const enemies = RTSUnitManager.getEnemyUnitsInRange(
                this.x, this.y, this.attackRange, this.owner
            );
            if (enemies.length === 0) return null;

            // Return closest (array is already filtered by range)
            let nearest = enemies[0];
            let nearestDist = Math.hypot(nearest.x - this.x, nearest.y - this.y);
            for (let i = 1; i < enemies.length; i++) {
                const dist = Math.hypot(enemies[i].x - this.x, enemies[i].y - this.y);
                if (dist < nearestDist) {
                    nearestDist = dist;
                    nearest = enemies[i];
                }
            }
            return nearest;
        }

        // Fallback: iterate units directly (avoid creating filtered array)
        const units = Game.instance.unitManager.units;
        let nearest = null;
        let nearestDist = this.attackRange;

        for (let i = 0; i < units.length; i++) {
            const u = units[i];
            if (u.isDead() || u.owner === this.owner) continue;
            if (this.owner && !this.owner.isEnemy(u.owner)) continue;

            const dist = Math.hypot(u.x - this.x, u.y - this.y);
            if (dist < nearestDist) {
                nearestDist = dist;
                nearest = u;
            }
        }

        return nearest;
    }

    /**
     * Find nearest target (unit or building) in attack range
     * Prioritizes units first, then buildings if no units found
     * @returns {Unit|Building|null}
     */
    findNearestTarget() {
        // First try to find enemy units
        const nearestUnit = this.findNearestEnemy();
        if (nearestUnit) return nearestUnit;

        // If no units found, look for enemy buildings
        if (!Game.instance || !Game.instance.buildingManager) return null;

        const buildings = Game.instance.buildingManager.buildings;
        let nearest = null;
        let nearestDist = this.attackRange;

        for (const building of buildings) {
            // Skip if not an enemy
            if (building.owner === this.owner) continue;
            if (building.isDead() || !building.active) continue;

            // Check distance
            const dist = Math.hypot(building.x - this.x, building.y - this.y);
            if (dist < nearestDist) {
                nearestDist = dist;
                nearest = building;
            }
        }

        return nearest;
    }

    attack(target) {
        target.takeDamage(this.damage, this);

        // Spawn muzzle flash particles (use cached color)
        if (Game.instance && Game.instance.objectManager) {
            initBuildingColors();
            Game.instance.objectManager.spawnParticles(
                this.x, this.y - 10, 3, BUILDING_COLORS.muzzleFlash
            );
        }
    }

    drawBody() {
        const halfW = (this.width * this.cellSize) / 2;
        const halfH = (this.height * this.cellSize) / 2;

        // Base platform
        fill(80, 80, 70);
        stroke(40);
        strokeWeight(1);
        rect(-halfW + 2, -halfH + 2, this.width * this.cellSize - 4, this.height * this.cellSize - 4, 3);

        // Tower body
        fill(100, 100, 90);
        rect(-12, -12, 24, 24, 4);

        // Turret (rotates)
        push();
        rotate(this.turretAngle);

        // Gun barrel
        fill(60, 60, 60);
        rect(0, -3, 25, 6, 2);

        // Turret base
        fill(this.primaryColor);
        ellipse(0, 0, 16, 16);

        pop();

        // Range indicator when selected
        if (this.selected) {
            noFill();
            stroke(255, 100, 100, 80);
            strokeWeight(1);
            ellipse(0, 0, this.attackRange * 2, this.attackRange * 2);
        }
    }
}

/**
 * Radar - Communications center that reveals map and unlocks advanced units
 */
class Radar extends Building {
    constructor(gridX, gridY, owner) {
        super(gridX, gridY, owner, {
            name: 'Radar',
            type: 'radar',
            width: 2,
            height: 2,
            health: 600,
            cost: 1000,
            buildTime: 15,
            powerOutput: 0,
            powerConsumption: 40,
            visionRange: 480  // Longest vision range (15 cells)
        });

        // Radar functionality
        this.radarRange = 15 * (RTS_GRID?.CELL_SIZE || 32); // Reveals fog in this range
        this.rotationAngle = 0;
        this.scanSpeed = 1.5; // Rotations per second
    }

    completeConstruction() {
        super.completeConstruction();

        // Unlock advanced units for owner
        if (this.owner) {
            if (typeof this.owner.unlockUnit === 'function') {
                this.owner.unlockUnit('commando');
                this.owner.unlockUnit('stealth_tank');
            }
            // Enable minimap if fog of war is implemented
            if (typeof this.owner.enableRadar === 'function') {
                this.owner.enableRadar(this.radarRange);
            }
        }
    }

    update(deltaTime) {
        super.update(deltaTime);

        if (this.state === BUILDING_STATES.ACTIVE) {
            // Rotate radar dish
            this.rotationAngle += deltaTime * this.scanSpeed * TWO_PI;
            if (this.rotationAngle > TWO_PI) {
                this.rotationAngle -= TWO_PI;
            }
        }
    }

    drawBody() {
        const halfW = (this.width * this.cellSize) / 2;
        const halfH = (this.height * this.cellSize) / 2;

        // Base platform
        fill(60, 60, 70);
        stroke(40);
        strokeWeight(1);
        rect(-halfW + 2, -halfH + 2, this.width * this.cellSize - 4, this.height * this.cellSize - 4, 4);

        // Equipment building
        fill(80, 80, 90);
        rect(-halfW + 8, halfH - 25, this.width * this.cellSize - 16, 20, 3);

        // Radar tower base
        fill(70, 70, 80);
        rect(-6, -halfH + 10, 12, 30);

        // Rotating radar dish
        push();
        translate(0, -halfH + 5);
        rotate(this.rotationAngle);

        // Dish support arm
        stroke(100, 100, 110);
        strokeWeight(3);
        line(0, 0, 20, 0);

        // Radar dish (parabolic shape)
        fill(90, 100, 110);
        noStroke();
        arc(20, 0, 25, 35, -HALF_PI, HALF_PI, PIE);

        // Dish details
        stroke(120, 130, 140);
        strokeWeight(1);
        line(20, -12, 20, 12);

        pop();

        // Antenna on top
        stroke(150, 150, 160);
        strokeWeight(2);
        line(0, -halfH + 5, 0, -halfH - 10);

        // Blinking light on antenna
        const blink = sin(millis() / 300) > 0;
        if (blink && this.state === BUILDING_STATES.ACTIVE) {
            fill(255, 50, 50);
            noStroke();
            ellipse(0, -halfH - 10, 6, 6);
        }

        // Team color accent
        fill(this.primaryColor);
        noStroke();
        rect(-halfW + 8, halfH - 25, this.width * this.cellSize - 16, 5);

        // Screen glow effect when active
        if (this.state === BUILDING_STATES.ACTIVE) {
            const pulse = sin(millis() / 400) * 0.3 + 0.7;
            fill(100 * pulse, 200 * pulse, 100 * pulse, 150);
            rect(-halfW + 12, halfH - 20, 20, 12, 2);
        }
    }
}

/**
 * Helipad - Produces and repairs aircraft units
 */
class Helipad extends Building {
    constructor(gridX, gridY, owner) {
        super(gridX, gridY, owner, {
            name: 'Helipad',
            type: 'helipad',
            width: 2,
            height: 2,
            health: 700,
            cost: 1200,
            buildTime: 18,
            powerOutput: 0,
            powerConsumption: 25
        });

        // Units this building can produce
        this.producibleUnits = ['ORCA', 'APACHE'];
        this.isProductionBuilding = true;

        // Aircraft landing/repair
        this.landedAircraft = null;
        this.repairRate = 10; // HP per second for landed aircraft
        this.refuelRate = 5; // Ammo per second

        // Rally point for produced aircraft - spawn directly on the helipad
        this.rallyPoint = {
            x: this.x,
            y: this.y
        };

        // Visual
        this.lightPhase = 0;
    }

    update(deltaTime) {
        super.update(deltaTime);

        if (this.state !== BUILDING_STATES.ACTIVE) return;

        // Update landing lights animation
        this.lightPhase += deltaTime * 2;
        if (this.lightPhase > TWO_PI) {
            this.lightPhase -= TWO_PI;
        }

        // Repair/refuel landed aircraft
        if (this.landedAircraft && !this.landedAircraft.isDead()) {
            // Repair
            if (this.landedAircraft.health < this.landedAircraft.maxHealth) {
                this.landedAircraft.health = Math.min(
                    this.landedAircraft.maxHealth,
                    this.landedAircraft.health + this.repairRate * deltaTime
                );
            }
            // Refuel/rearm
            if (this.landedAircraft.ammo !== undefined &&
                this.landedAircraft.ammo < this.landedAircraft.maxAmmo) {
                this.landedAircraft.ammo = Math.min(
                    this.landedAircraft.maxAmmo,
                    this.landedAircraft.ammo + this.refuelRate * deltaTime
                );
            }
        }
    }

    /**
     * Check if helipad can accept an aircraft for landing
     */
    canAcceptAircraft(aircraft) {
        if (!this.isComplete || this.state !== BUILDING_STATES.ACTIVE) return false;
        if (this.landedAircraft !== null) return false;
        if (aircraft.owner !== this.owner) return false;
        return true;
    }

    /**
     * Land an aircraft on this helipad
     */
    landAircraft(aircraft) {
        if (!this.canAcceptAircraft(aircraft)) return false;
        this.landedAircraft = aircraft;
        aircraft.landed = true;
        aircraft.x = this.x;
        aircraft.y = this.y;
        return true;
    }

    /**
     * Launch the landed aircraft
     */
    launchAircraft() {
        if (!this.landedAircraft) return null;
        const aircraft = this.landedAircraft;
        aircraft.landed = false;
        this.landedAircraft = null;
        return aircraft;
    }

    drawBody() {
        const halfW = (this.width * this.cellSize) / 2;
        const halfH = (this.height * this.cellSize) / 2;

        // Concrete pad
        fill(90, 90, 90);
        stroke(60);
        strokeWeight(1);
        rect(-halfW + 2, -halfH + 2, this.width * this.cellSize - 4, this.height * this.cellSize - 4, 2);

        // Landing circle (helipad marking)
        stroke(255, 255, 0);
        strokeWeight(2);
        noFill();
        ellipse(0, 0, this.width * this.cellSize - 20, this.height * this.cellSize - 20);

        // H marking
        stroke(255, 255, 0);
        strokeWeight(3);
        line(-10, -15, -10, 15);
        line(10, -15, 10, 15);
        line(-10, 0, 10, 0);

        // Corner landing lights
        if (this.state === BUILDING_STATES.ACTIVE) {
            const corners = [
                [-halfW + 8, -halfH + 8],
                [halfW - 8, -halfH + 8],
                [-halfW + 8, halfH - 8],
                [halfW - 8, halfH - 8]
            ];

            noStroke();
            for (let i = 0; i < corners.length; i++) {
                // Stagger the lights
                const offset = (i * HALF_PI);
                const intensity = (sin(this.lightPhase + offset) + 1) / 2;
                fill(255, 200 * intensity, 50 * intensity, 200);
                ellipse(corners[i][0], corners[i][1], 8, 8);
            }
        }

        // Control tower/fuel station on side
        fill(70, 70, 80);
        stroke(40);
        strokeWeight(1);
        rect(halfW - 18, -halfH + 5, 14, 25, 2);

        // Team color stripe on tower
        fill(this.primaryColor);
        noStroke();
        rect(halfW - 18, -halfH + 5, 14, 5);

        // Fuel pump
        fill(80, 80, 90);
        stroke(40);
        strokeWeight(1);
        rect(-halfW + 5, halfH - 15, 12, 10, 2);

        // Landed aircraft indicator
        if (this.landedAircraft) {
            // Simple helicopter silhouette
            fill(60, 60, 70);
            noStroke();
            ellipse(0, 0, 20, 16);
            rect(-2, -20, 4, 20);
            ellipse(0, -20, 30, 4);
        }
    }
}

/**
 * RepairBay - Repairs vehicles that enter its area
 */
class RepairBay extends Building {
    constructor(gridX, gridY, owner) {
        super(gridX, gridY, owner, {
            name: 'Repair Bay',
            type: 'repair_bay',
            width: 3,
            height: 2,
            health: 800,
            cost: 800,
            buildTime: 12,
            powerOutput: 0,
            powerConsumption: 30
        });

        // Repair functionality
        this.repairRange = 1.5 * (RTS_GRID?.CELL_SIZE || 32); // Units must be close
        this.repairRate = 25; // HP per second
        this.repairCostPerHP = 0.5; // Tiberium cost per HP repaired
        this.currentlyRepairing = []; // Units being repaired

        // Visual
        this.sparkTimer = 0;
        this.sparkPositions = [];
    }

    update(deltaTime) {
        super.update(deltaTime);

        if (this.state !== BUILDING_STATES.ACTIVE) return;

        // Find nearby damaged vehicles
        this.currentlyRepairing = [];

        if (Game.instance && Game.instance.unitManager) {
            const units = Game.instance.unitManager.units;

            for (const unit of units) {
                if (unit.isDead()) continue;
                if (unit.owner !== this.owner) continue;
                if (!unit.isVehicle) continue; // Only repair vehicles
                if (unit.health >= unit.maxHealth) continue;

                // Check if unit is within repair bay area
                const dx = unit.x - this.x;
                const dy = unit.y - this.y;
                const halfW = (this.width * this.cellSize) / 2 + this.repairRange;
                const halfH = (this.height * this.cellSize) / 2 + this.repairRange;

                if (Math.abs(dx) <= halfW && Math.abs(dy) <= halfH) {
                    // Check if owner can afford repair
                    const repairAmount = Math.min(
                        this.repairRate * deltaTime,
                        unit.maxHealth - unit.health
                    );
                    const repairCost = repairAmount * this.repairCostPerHP;

                    if (this.owner.resources.tiberium >= repairCost) {
                        // Perform repair
                        unit.health += repairAmount;
                        this.owner.spendTiberium(repairCost);
                        this.currentlyRepairing.push(unit);
                    }
                }
            }
        }

        // Update spark effect
        this.sparkTimer += deltaTime;
        if (this.sparkTimer > 0.1 && this.currentlyRepairing.length > 0) {
            this.sparkTimer = 0;
            // Add new spark
            this.sparkPositions.push({
                x: (Math.random() - 0.5) * this.width * this.cellSize * 0.6,
                y: (Math.random() - 0.5) * this.height * this.cellSize * 0.4,
                life: 0.3
            });
        }

        // Update existing sparks
        for (let i = this.sparkPositions.length - 1; i >= 0; i--) {
            this.sparkPositions[i].life -= deltaTime;
            if (this.sparkPositions[i].life <= 0) {
                this.sparkPositions.splice(i, 1);
            }
        }
    }

    drawBody() {
        const halfW = (this.width * this.cellSize) / 2;
        const halfH = (this.height * this.cellSize) / 2;

        // Concrete floor
        fill(80, 80, 80);
        stroke(50);
        strokeWeight(1);
        rect(-halfW + 2, -halfH + 2, this.width * this.cellSize - 4, this.height * this.cellSize - 4, 4);

        // Service pit (dark area in center)
        fill(40, 40, 45);
        noStroke();
        rect(-halfW + 15, -halfH + 12, this.width * this.cellSize - 30, this.height * this.cellSize - 24, 2);

        // Yellow hazard stripes on edges
        stroke(255, 200, 0);
        strokeWeight(3);
        const stripeSpacing = 10;
        for (let i = -halfW + 10; i < halfW - 10; i += stripeSpacing * 2) {
            line(i, -halfH + 6, i + stripeSpacing, -halfH + 6);
            line(i, halfH - 6, i + stripeSpacing, halfH - 6);
        }

        // Repair arms/gantry
        stroke(100, 100, 110);
        strokeWeight(4);
        // Left arm
        line(-halfW + 10, -halfH + 15, -halfW + 10, halfH - 15);
        line(-halfW + 10, 0, -halfW + 25, 0);
        // Right arm
        line(halfW - 10, -halfH + 15, halfW - 10, halfH - 15);
        line(halfW - 10, 0, halfW - 25, 0);

        // Tool heads
        fill(80, 80, 90);
        stroke(60);
        strokeWeight(1);
        ellipse(-halfW + 25, 0, 12, 12);
        ellipse(halfW - 25, 0, 12, 12);

        // Control booth
        fill(70, 70, 80);
        rect(-halfW + 5, -halfH + 5, 20, 15, 2);
        // Window
        fill(100, 150, 200, 150);
        noStroke();
        rect(-halfW + 8, -halfH + 8, 14, 8, 1);

        // Team color stripe
        fill(this.primaryColor);
        noStroke();
        rect(-halfW + 5, -halfH + 5, 20, 4);

        // Repair indicator lights
        if (this.currentlyRepairing.length > 0) {
            // Green "REPAIRING" light
            fill(0, 255, 0, 200);
            ellipse(halfW - 12, -halfH + 10, 8, 8);
        } else {
            // Red "IDLE" light
            fill(255, 0, 0, 150);
            ellipse(halfW - 12, -halfH + 10, 8, 8);
        }

        // Draw repair sparks
        if (this.sparkPositions.length > 0) {
            noStroke();
            for (const spark of this.sparkPositions) {
                const alpha = (spark.life / 0.3) * 255;
                fill(255, 255, 100, alpha);
                ellipse(spark.x, spark.y, 4, 4);
                fill(255, 200, 50, alpha * 0.5);
                ellipse(spark.x, spark.y, 8, 8);
            }
        }

        // Draw repair range when selected
        if (this.selected) {
            noFill();
            stroke(0, 255, 0, 80);
            strokeWeight(1);
            rect(
                -halfW - this.repairRange,
                -halfH - this.repairRange,
                this.width * this.cellSize + this.repairRange * 2,
                this.height * this.cellSize + this.repairRange * 2,
                4
            );
        }
    }
}

/**
 * Silo - Increases tiberium storage capacity
 */
class Silo extends Building {
    constructor(gridX, gridY, owner) {
        super(gridX, gridY, owner, {
            name: 'Silo',
            type: 'silo',
            width: 1,
            height: 2,
            health: 300,
            cost: 200,
            buildTime: 6,
            powerOutput: 0,
            powerConsumption: 5
        });

        this.storageCapacity = 2000;
    }

    completeConstruction() {
        super.completeConstruction();

        // Increase owner's max storage
        if (this.owner) {
            this.owner.resources.maxStorage += this.storageCapacity;
        }
    }

    destroy() {
        // Reduce owner's max storage
        if (this.owner) {
            this.owner.resources.maxStorage -= this.storageCapacity;
            // Clamp current resources to new max
            this.owner.resources.tiberium = Math.min(
                this.owner.resources.tiberium,
                this.owner.resources.maxStorage
            );
        }

        super.destroy();
    }

    drawBody() {
        const halfW = (this.width * this.cellSize) / 2;
        const halfH = (this.height * this.cellSize) / 2;

        // Base
        fill(60, 60, 60);
        stroke(40);
        strokeWeight(1);
        rect(-halfW + 2, halfH - 12, this.width * this.cellSize - 4, 10, 2);

        // Silo cylinder
        fill(80, 90, 80);
        rect(-halfW + 4, -halfH + 4, this.width * this.cellSize - 8, this.height * this.cellSize - 16, 4);

        // Tiberium level indicator
        const fillLevel = this.owner ?
            this.owner.resources.tiberium / this.owner.resources.maxStorage : 0;
        const fillHeight = (this.height * this.cellSize - 24) * fillLevel;

        fill(0, 180, 100, 180);
        noStroke();
        rect(-halfW + 6, halfH - 14 - fillHeight, this.width * this.cellSize - 12, fillHeight);

        // Top cap
        fill(70, 80, 70);
        stroke(40);
        strokeWeight(1);
        ellipse(0, -halfH + 8, this.width * this.cellSize - 8, 12);

        // Team color band
        fill(this.primaryColor);
        noStroke();
        rect(-halfW + 4, -halfH + 14, this.width * this.cellSize - 8, 6);
    }
}

// Export for global access
if (typeof window !== 'undefined') {
    window.Building = Building;
    window.BUILDING_STATES = BUILDING_STATES;
    window.BUILDING_COLORS = BUILDING_COLORS;
    window.initBuildingColors = initBuildingColors;
    window.ConstructionYard = ConstructionYard;
    window.PowerPlant = PowerPlant;
    window.Barracks = Barracks;
    window.Refinery = Refinery;
    window.WarFactory = WarFactory;
    window.TechCenter = TechCenter;
    window.GuardTower = GuardTower;
    window.Silo = Silo;
    window.Radar = Radar;
    window.Helipad = Helipad;
    window.RepairBay = RepairBay;
}
