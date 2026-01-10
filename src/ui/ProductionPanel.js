/**
 * ProductionPanel.js - Unit production UI for production buildings
 *
 * Displays when a production building (Barracks, War Factory, Helipad) is selected:
 * - Grid of unit icons that the building can produce
 * - Click to queue unit production
 * - Queue count overlay on icons (e.g., "x3")
 * - Progress bar for current production
 */

class ProductionPanel {
    constructor(config = {}) {
        // Panel dimensions
        this.width = config.width || 240;
        this.minHeight = 100;
        this.maxHeight = 350;
        this.padding = 12;
        this.margin = 10;

        // Grid layout for unit icons
        this.iconSize = 50;
        this.iconSpacing = 6;
        this.iconsPerRow = 4;

        // Position (left side of screen, below resource bar)
        this.anchor = config.anchor || 'left';

        // Appearance
        this.backgroundColor = config.backgroundColor || [30, 35, 45, 200];
        this.borderColor = config.borderColor || [80, 120, 180, 200];
        this.textColor = config.textColor || [220, 220, 230];
        this.accentColor = config.accentColor || [100, 180, 255];
        this.progressColor = config.progressColor || [0, 200, 255];

        // State
        this.visible = false;
        this.selectedBuilding = null;
        this.contentHeight = this.minHeight;
        this.hoveredUnit = null;

        // Animation
        this.slideProgress = 0;
        this.targetSlide = 0;
        this.slideSpeed = 0.15;

        // Cached unit buttons for click detection
        this.unitButtons = [];
    }

    /**
     * Show panel for a production building
     * @param {Building} building
     */
    show(building) {
        if (!building || !this.isProductionBuilding(building)) {
            this.hide();
            return;
        }

        this.selectedBuilding = building;
        this.visible = true;
        this.targetSlide = 1;
        this.calculateContentHeight();
    }

    /**
     * Hide panel
     */
    hide() {
        this.targetSlide = 0;
        this.selectedBuilding = null;
        this.unitButtons = [];
    }

    /**
     * Check if building is a production building
     */
    isProductionBuilding(building) {
        return building && building.producibleUnits && building.producibleUnits.length > 0;
    }

    /**
     * Calculate content height based on building's producible units
     */
    calculateContentHeight() {
        if (!this.selectedBuilding || !this.selectedBuilding.producibleUnits) {
            this.contentHeight = this.minHeight;
            return;
        }

        let height = this.padding * 2;

        // Header
        height += 35;

        // Progress bar (if producing)
        if (this.selectedBuilding.currentProduction) {
            height += 35;
        }

        // Queue summary
        if (this.selectedBuilding.productionQueue && this.selectedBuilding.productionQueue.length > 0) {
            height += 25;
        }

        // Unit grid
        const unitCount = this.selectedBuilding.producibleUnits.length;
        const rows = Math.ceil(unitCount / this.iconsPerRow);
        height += rows * (this.iconSize + this.iconSpacing) + 10;

        // Tooltip area
        if (this.hoveredUnit) {
            height += 45;
        }

        this.contentHeight = Math.min(Math.max(height, this.minHeight), this.maxHeight);
    }

    /**
     * Get queue count for a specific unit type
     */
    getQueueCount(unitType) {
        if (!this.selectedBuilding || !this.selectedBuilding.productionQueue) return 0;

        let count = 0;
        for (const item of this.selectedBuilding.productionQueue) {
            if (item.type === unitType) count++;
        }

        // Also count current production
        if (this.selectedBuilding.currentProduction &&
            this.selectedBuilding.currentProduction.type === unitType) {
            count++;
        }

        return count;
    }

    /**
     * Handle mouse click on panel
     * @returns {boolean} True if click was handled
     */
    handleClick(screenX, screenY) {
        if (!this.visible || !this.selectedBuilding) return false;

        // Check if click is within panel bounds
        const panelX = this.margin + (this.width + this.margin) * (1 - this.slideProgress);
        const panelY = 50;

        if (screenX < panelX || screenX > panelX + this.width ||
            screenY < panelY || screenY > panelY + this.contentHeight) {
            return false;
        }

        // Check unit buttons
        for (const button of this.unitButtons) {
            if (screenX >= button.x && screenX <= button.x + button.w &&
                screenY >= button.y && screenY <= button.y + button.h) {

                // Try to queue unit production
                if (this.selectedBuilding.queueUnit) {
                    const success = this.selectedBuilding.queueUnit(button.unitType);
                    if (success) {
                        console.log(`ProductionPanel: Queued ${button.unitType}`);
                    }
                }
                return true;
            }
        }

        return true; // Consumed click even if no button hit
    }

    /**
     * Update panel state
     */
    update(deltaTime) {
        // Animate slide
        this.slideProgress += (this.targetSlide - this.slideProgress) * this.slideSpeed;

        if (this.targetSlide === 0 && this.slideProgress < 0.01) {
            this.visible = false;
            this.slideProgress = 0;
        }

        // Update content height
        if (this.selectedBuilding) {
            this.calculateContentHeight();
        }

        // Update hovered unit based on mouse position
        this.updateHoveredUnit();
    }

    /**
     * Update which unit icon is being hovered
     */
    updateHoveredUnit() {
        if (!this.visible) {
            this.hoveredUnit = null;
            return;
        }

        this.hoveredUnit = null;

        for (const button of this.unitButtons) {
            if (mouseX >= button.x && mouseX <= button.x + button.w &&
                mouseY >= button.y && mouseY <= button.y + button.h) {
                this.hoveredUnit = button.unitType;
                break;
            }
        }
    }

    /**
     * Draw the panel
     */
    draw() {
        if (!this.visible && this.slideProgress < 0.01) return;

        const b = this.selectedBuilding;
        if (!b || !b.producibleUnits) return;

        push();

        // Calculate position with slide animation (left side)
        const panelX = this.margin + (this.width + this.margin) * (1 - this.slideProgress) - (this.width + this.margin);
        const panelY = 50;

        // Recalculate to slide in from left
        const slideOffset = (this.width + this.margin) * (1 - this.slideProgress);
        const finalX = this.margin - slideOffset;

        // Draw panel background
        this.drawBackground(finalX, panelY);

        // Clear unit buttons for this frame
        this.unitButtons = [];

        // Draw content
        push();
        translate(finalX + this.padding, panelY + this.padding);

        let yOffset = 0;

        // Header
        yOffset = this.drawHeader(b, yOffset);

        // Production progress bar (if producing)
        if (b.currentProduction) {
            yOffset = this.drawProductionProgress(b, yOffset);
        }

        // Queue summary
        if (b.productionQueue && b.productionQueue.length > 0) {
            yOffset = this.drawQueueSummary(b, yOffset);
        }

        // Unit grid
        yOffset = this.drawUnitGrid(b, yOffset, finalX + this.padding, panelY + this.padding);

        // Tooltip for hovered unit
        if (this.hoveredUnit) {
            yOffset = this.drawTooltip(this.hoveredUnit, yOffset);
        }

        pop();

        pop();
    }

    /**
     * Draw panel background
     */
    drawBackground(x, y) {
        // Main background
        noStroke();
        fill(...this.backgroundColor);
        rect(x, y, this.width, this.contentHeight, 8);

        // Border
        noFill();
        stroke(...this.borderColor);
        strokeWeight(2);
        rect(x, y, this.width, this.contentHeight, 8);

        // Accent line at top
        stroke(...this.accentColor);
        strokeWeight(3);
        line(x + 10, y + 2, x + this.width - 10, y + 2);
    }

    /**
     * Draw header with building name
     */
    drawHeader(building, yOffset) {
        // Building icon (colored circle)
        fill(building.primaryColor || color(100, 150, 200));
        noStroke();
        ellipse(12, yOffset + 12, 20, 20);

        // Building name
        fill(...this.textColor);
        textAlign(LEFT, TOP);
        textSize(14);
        textStyle(BOLD);
        text(building.name || 'Production', 28, yOffset);

        // "PRODUCTION" label
        textSize(10);
        textStyle(NORMAL);
        fill(150, 150, 160);
        text('UNIT PRODUCTION', 28, yOffset + 16);

        return yOffset + 38;
    }

    /**
     * Draw production progress bar
     */
    drawProductionProgress(building, yOffset) {
        const barWidth = this.width - this.padding * 2 - 4;
        const barHeight = 16;
        const prod = building.currentProduction;

        // Get unit config for name
        const unitConfig = RTS_UNITS?.[prod.type.toUpperCase()];
        const unitName = unitConfig?.name || prod.type;

        // Label
        fill(200, 200, 210);
        textSize(10);
        textAlign(LEFT, TOP);
        text(`Building: ${unitName}`, 0, yOffset);

        yOffset += 14;

        // Background
        fill(40, 40, 50);
        noStroke();
        rect(0, yOffset, barWidth, barHeight, 4);

        // Progress fill
        fill(...this.progressColor);
        const progressWidth = Math.max(0, Math.min(1, building.productionProgress)) * barWidth;
        rect(0, yOffset, progressWidth, barHeight, 4);

        // Percentage text
        fill(255);
        textSize(10);
        textAlign(CENTER, CENTER);
        text(`${Math.floor(building.productionProgress * 100)}%`, barWidth / 2, yOffset + barHeight / 2);

        return yOffset + barHeight + 8;
    }

    /**
     * Draw queue summary
     */
    drawQueueSummary(building, yOffset) {
        const queueLength = building.productionQueue.length;

        fill(150, 150, 160);
        textSize(10);
        textAlign(LEFT, TOP);
        text(`Queue: ${queueLength} unit${queueLength !== 1 ? 's' : ''} waiting`, 0, yOffset);

        return yOffset + 18;
    }

    /**
     * Draw unit production grid
     */
    drawUnitGrid(building, yOffset, panelBaseX, panelBaseY) {
        const units = building.producibleUnits;
        if (!units || units.length === 0) return yOffset;

        // Section label
        fill(100, 100, 110);
        textSize(10);
        textAlign(LEFT, TOP);
        text('AVAILABLE UNITS', 0, yOffset);
        yOffset += 16;

        // Get owner's resources
        const owner = building.owner;
        const currentTiberium = owner?.resources?.tiberium || 0;

        // Draw grid of unit icons
        for (let i = 0; i < units.length; i++) {
            const unitType = units[i];
            const unitConfig = RTS_UNITS?.[unitType.toUpperCase()];

            if (!unitConfig) continue;

            const col = i % this.iconsPerRow;
            const row = Math.floor(i / this.iconsPerRow);

            const iconX = col * (this.iconSize + this.iconSpacing);
            const iconY = yOffset + row * (this.iconSize + this.iconSpacing);

            // Store button for click detection (screen coordinates)
            this.unitButtons.push({
                x: panelBaseX + iconX,
                y: panelBaseY + iconY,
                w: this.iconSize,
                h: this.iconSize,
                unitType: unitType
            });

            // Can afford check
            const canAfford = currentTiberium >= unitConfig.cost;
            const isHovered = this.hoveredUnit === unitType;
            const queueCount = this.getQueueCount(unitType);

            // Draw unit button
            this.drawUnitButton(iconX, iconY, unitConfig, unitType, canAfford, isHovered, queueCount);
        }

        // Calculate total height used
        const rows = Math.ceil(units.length / this.iconsPerRow);
        return yOffset + rows * (this.iconSize + this.iconSpacing) + 5;
    }

    /**
     * Draw individual unit button
     */
    drawUnitButton(x, y, unitConfig, unitType, canAfford, isHovered, queueCount) {
        push();
        translate(x, y);

        // Button background
        if (isHovered) {
            fill(canAfford ? color(60, 80, 100) : color(80, 50, 50));
            stroke(canAfford ? color(100, 150, 200) : color(150, 80, 80));
        } else {
            fill(canAfford ? color(45, 55, 65) : color(50, 40, 40));
            stroke(canAfford ? color(70, 80, 90) : color(80, 60, 60));
        }
        strokeWeight(isHovered ? 2 : 1);
        rect(0, 0, this.iconSize, this.iconSize, 6);

        // Unit icon (simple shape based on type)
        this.drawUnitIcon(unitConfig, canAfford);

        // Cost
        fill(canAfford ? color(100, 255, 100) : color(255, 100, 100));
        textSize(9);
        textAlign(CENTER, BOTTOM);
        noStroke();
        text(`$${unitConfig.cost}`, this.iconSize / 2, this.iconSize - 2);

        // Queue count overlay
        if (queueCount > 0) {
            // Badge background
            fill(200, 100, 50);
            noStroke();
            ellipse(this.iconSize - 8, 8, 18, 18);

            // Count text
            fill(255);
            textSize(10);
            textAlign(CENTER, CENTER);
            textStyle(BOLD);
            text(`x${queueCount}`, this.iconSize - 8, 8);
            textStyle(NORMAL);
        }

        pop();
    }

    /**
     * Draw unit icon based on unit type
     */
    drawUnitIcon(unitConfig, canAfford) {
        const cx = this.iconSize / 2;
        const cy = this.iconSize / 2 - 5;
        const alpha = canAfford ? 255 : 150;

        noStroke();

        switch (unitConfig.type) {
            case RTS_UNIT_TYPES.INFANTRY:
                // Infantry: small figure
                fill(100, 150, 100, alpha);
                ellipse(cx, cy - 8, 12, 12); // Head
                rect(cx - 6, cy - 2, 12, 14, 2); // Body
                break;

            case RTS_UNIT_TYPES.VEHICLE:
                // Vehicle: tank shape
                fill(80, 100, 80, alpha);
                rect(cx - 14, cy - 4, 28, 14, 3); // Hull
                fill(60, 80, 60, alpha);
                rect(cx - 8, cy - 10, 16, 8, 2); // Turret
                fill(50, 70, 50, alpha);
                rect(cx + 5, cy - 8, 12, 3); // Barrel
                break;

            case RTS_UNIT_TYPES.HARVESTER:
                // Harvester: box with scoop
                fill(100, 120, 80, alpha);
                rect(cx - 12, cy - 6, 24, 16, 3);
                fill(80, 100, 60, alpha);
                rect(cx - 14, cy + 4, 8, 8, 2); // Scoop
                break;

            case RTS_UNIT_TYPES.AIRCRAFT:
                // Aircraft: helicopter shape
                fill(80, 80, 100, alpha);
                ellipse(cx, cy, 20, 12); // Body
                fill(100, 100, 120, alpha);
                rect(cx - 15, cy - 2, 30, 3); // Rotor
                fill(60, 60, 80, alpha);
                rect(cx + 6, cy, 10, 4); // Tail
                break;

            default:
                // Generic unit: circle
                fill(100, 100, 100, alpha);
                ellipse(cx, cy, 24, 24);
        }

        // Unit type initial
        fill(255, 255, 255, alpha);
        textSize(10);
        textAlign(CENTER, CENTER);
        text(unitConfig.name.charAt(0).toUpperCase(), cx, cy);
    }

    /**
     * Draw tooltip for hovered unit
     */
    drawTooltip(unitType, yOffset) {
        const unitConfig = RTS_UNITS?.[unitType.toUpperCase()];
        if (!unitConfig) return yOffset;

        yOffset += 5;

        // Separator line
        stroke(80, 90, 100);
        strokeWeight(1);
        line(0, yOffset, this.width - this.padding * 2 - 4, yOffset);
        yOffset += 8;

        // Unit name
        fill(...this.textColor);
        textSize(12);
        textAlign(LEFT, TOP);
        textStyle(BOLD);
        noStroke();
        text(unitConfig.name, 0, yOffset);
        textStyle(NORMAL);

        // Stats
        yOffset += 16;
        fill(150, 150, 160);
        textSize(9);

        const stats = [];
        if (unitConfig.health) stats.push(`HP: ${unitConfig.health}`);
        if (unitConfig.damage) stats.push(`DMG: ${unitConfig.damage}`);
        if (unitConfig.speed) stats.push(`SPD: ${unitConfig.speed}`);
        if (unitConfig.buildTime) stats.push(`Time: ${unitConfig.buildTime}s`);

        text(stats.join(' | '), 0, yOffset);

        return yOffset + 20;
    }

    // ========================================
    // STATIC BUILDER CLASS
    // ========================================

    static Builder = class {
        constructor() {
            this._reset();
        }

        _reset() {
            this._width = 240;
            this._anchor = 'left';
            this._backgroundColor = [30, 35, 45, 200];
            this._borderColor = [80, 120, 180, 200];
            return this;
        }

        withWidth(width) {
            this._width = width;
            return this;
        }

        anchoredLeft() {
            this._anchor = 'left';
            return this;
        }

        anchoredRight() {
            this._anchor = 'right';
            return this;
        }

        withBackgroundColor(r, g, b, a = 200) {
            this._backgroundColor = [r, g, b, a];
            return this;
        }

        withBorderColor(r, g, b, a = 200) {
            this._borderColor = [r, g, b, a];
            return this;
        }

        build() {
            return new ProductionPanel({
                width: this._width,
                anchor: this._anchor,
                backgroundColor: this._backgroundColor,
                borderColor: this._borderColor
            });
        }

        static create() {
            return new ProductionPanel.Builder();
        }
    };
}

// Export for global access
if (typeof window !== 'undefined') {
    window.ProductionPanel = ProductionPanel;
}
