/**
 * BuildingInfoPanel.js - Transparent sidebar for building information
 *
 * Displays building details when selected:
 * - Name, health, power status
 * - Production queue
 * - Available upgrades
 * - Dynamic sizing with constraints
 */

class BuildingInfoPanel {
    constructor(config = {}) {
        // Panel dimensions (dynamic)
        this.width = config.width || 220;
        this.minHeight = 120;
        this.maxHeight = 400;
        this.padding = 12;
        this.margin = 10;

        // Position (right side of screen)
        this.anchor = config.anchor || 'right';

        // Appearance
        this.backgroundColor = config.backgroundColor || [30, 35, 45, 180];
        this.borderColor = config.borderColor || [80, 120, 180, 200];
        this.textColor = config.textColor || [220, 220, 230];
        this.accentColor = config.accentColor || [100, 180, 255];

        // State
        this.visible = false;
        this.selectedBuilding = null;
        this.contentHeight = this.minHeight;

        // Animation
        this.slideProgress = 0;
        this.targetSlide = 0;
        this.slideSpeed = 0.15;
    }

    /**
     * Show panel for a building
     * @param {Building} building
     */
    show(building) {
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
    }

    /**
     * Calculate content height based on building
     */
    calculateContentHeight() {
        if (!this.selectedBuilding) {
            this.contentHeight = this.minHeight;
            return;
        }

        let height = this.padding * 2;

        // Header
        height += 30;

        // Health bar
        height += 25;

        // Power status
        height += 20;

        // Production queue (if applicable)
        if (this.selectedBuilding.productionQueue?.length > 0) {
            height += 25 + (this.selectedBuilding.productionQueue.length * 20);
        }

        // Stats section
        height += 80;

        // Upgrades (if applicable)
        const upgrades = this.getAvailableUpgrades();
        if (upgrades.length > 0) {
            height += 25 + (upgrades.length * 30);
        }

        this.contentHeight = Math.min(Math.max(height, this.minHeight), this.maxHeight);
    }

    /**
     * Get available upgrades for building
     */
    getAvailableUpgrades() {
        if (!this.selectedBuilding) return [];

        // Mock upgrades based on building type
        const upgradeMap = {
            'barracks': [
                { name: 'Reinforced Armor', cost: 500, icon: 'A' },
                { name: 'Rapid Training', cost: 750, icon: 'T' }
            ],
            'war_factory': [
                { name: 'Advanced Weapons', cost: 800, icon: 'W' },
                { name: 'Heavy Armor', cost: 1000, icon: 'H' }
            ],
            'refinery': [
                { name: 'Fast Unload', cost: 400, icon: 'U' }
            ],
            'guard_tower': [
                { name: 'Extended Range', cost: 300, icon: 'R' },
                { name: 'Rapid Fire', cost: 500, icon: 'F' }
            ]
        };

        return upgradeMap[this.selectedBuilding.type] || [];
    }

    /**
     * Update panel animation
     */
    update(deltaTime) {
        // Animate slide
        this.slideProgress += (this.targetSlide - this.slideProgress) * this.slideSpeed;

        if (this.targetSlide === 0 && this.slideProgress < 0.01) {
            this.visible = false;
            this.slideProgress = 0;
        }

        // Update content height if building changes
        if (this.selectedBuilding) {
            this.calculateContentHeight();
        }
    }

    /**
     * Draw the panel
     */
    draw() {
        if (!this.visible && this.slideProgress < 0.01) return;

        const b = this.selectedBuilding;
        if (!b) return;

        push();

        // Calculate position with slide animation
        const panelX = width - (this.width + this.margin) * this.slideProgress;
        const panelY = this.margin;

        // Draw panel background
        this.drawBackground(panelX, panelY);

        // Draw content
        translate(panelX + this.padding, panelY + this.padding);

        let yOffset = 0;

        // Header
        yOffset = this.drawHeader(b, yOffset);

        // Health bar
        yOffset = this.drawHealthBar(b, yOffset);

        // Power status
        yOffset = this.drawPowerStatus(b, yOffset);

        // Stats
        yOffset = this.drawStats(b, yOffset);

        // Production queue
        if (b.productionQueue?.length > 0) {
            yOffset = this.drawProductionQueue(b, yOffset);
        }

        // Upgrades
        const upgrades = this.getAvailableUpgrades();
        if (upgrades.length > 0) {
            yOffset = this.drawUpgrades(upgrades, yOffset);
        }

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
        text(building.name || 'Building', 28, yOffset);

        // Type
        textSize(10);
        textStyle(NORMAL);
        fill(150, 150, 160);
        text(building.type?.replace(/_/g, ' ').toUpperCase() || '', 28, yOffset + 16);

        return yOffset + 35;
    }

    /**
     * Draw health bar
     */
    drawHealthBar(building, yOffset) {
        const barWidth = this.width - this.padding * 2 - 4;
        const barHeight = 12;
        const healthPercent = building.health / building.maxHealth;

        // Label
        fill(...this.textColor);
        textSize(10);
        textAlign(LEFT, TOP);
        text('HEALTH', 0, yOffset);

        yOffset += 12;

        // Background
        fill(40, 40, 50);
        noStroke();
        rect(0, yOffset, barWidth, barHeight, 3);

        // Health fill
        const healthColor = healthPercent > 0.5 ? [80, 200, 80] :
                           healthPercent > 0.25 ? [200, 200, 80] : [200, 80, 80];
        fill(...healthColor);
        rect(0, yOffset, barWidth * healthPercent, barHeight, 3);

        // Value text
        fill(255);
        textSize(9);
        textAlign(CENTER, CENTER);
        text(`${Math.floor(building.health)} / ${building.maxHealth}`, barWidth / 2, yOffset + barHeight / 2);

        return yOffset + barHeight + 10;
    }

    /**
     * Draw power status
     */
    drawPowerStatus(building, yOffset) {
        const hasPower = building.powerOutput > 0;
        const usesPower = building.powerConsumption > 0;

        fill(...this.textColor);
        textSize(10);
        textAlign(LEFT, TOP);

        if (hasPower) {
            fill(100, 255, 100);
            text(`POWER: +${building.powerOutput}`, 0, yOffset);
        } else if (usesPower) {
            fill(255, 200, 100);
            text(`POWER: -${building.powerConsumption}`, 0, yOffset);
        } else {
            fill(120, 120, 130);
            text('POWER: N/A', 0, yOffset);
        }

        return yOffset + 20;
    }

    /**
     * Draw building stats
     */
    drawStats(building, yOffset) {
        fill(100, 100, 110);
        textSize(10);
        textAlign(LEFT, TOP);
        text('STATS', 0, yOffset);
        yOffset += 14;

        const stats = [
            { label: 'Cost', value: `$${building.cost || 0}` },
            { label: 'Build Time', value: `${building.buildTime || 0}s` },
            { label: 'Size', value: `${building.width}x${building.height}` }
        ];

        // Add attack stats for guard tower
        if (building.damage) {
            stats.push({ label: 'Damage', value: building.damage });
            stats.push({ label: 'Range', value: Math.floor(building.attackRange) });
        }

        for (const stat of stats) {
            fill(160, 160, 170);
            textAlign(LEFT, TOP);
            text(stat.label + ':', 0, yOffset);

            fill(...this.accentColor);
            textAlign(RIGHT, TOP);
            text(stat.value, this.width - this.padding * 2 - 4, yOffset);

            yOffset += 14;
        }

        return yOffset + 5;
    }

    /**
     * Draw production queue
     */
    drawProductionQueue(building, yOffset) {
        fill(100, 100, 110);
        textSize(10);
        textAlign(LEFT, TOP);
        text('PRODUCTION', 0, yOffset);
        yOffset += 14;

        for (const item of building.productionQueue) {
            fill(60, 60, 70);
            noStroke();
            rect(0, yOffset, this.width - this.padding * 2 - 4, 18, 3);

            fill(...this.textColor);
            textSize(10);
            textAlign(LEFT, CENTER);
            text(item.name || 'Unit', 6, yOffset + 9);

            yOffset += 20;
        }

        return yOffset + 5;
    }

    /**
     * Draw available upgrades
     */
    drawUpgrades(upgrades, yOffset) {
        fill(100, 100, 110);
        textSize(10);
        textAlign(LEFT, TOP);
        text('UPGRADES', 0, yOffset);
        yOffset += 14;

        for (const upgrade of upgrades) {
            // Button background
            fill(50, 60, 70);
            stroke(80, 90, 100);
            strokeWeight(1);
            rect(0, yOffset, this.width - this.padding * 2 - 4, 26, 4);

            // Icon
            fill(...this.accentColor);
            noStroke();
            ellipse(15, yOffset + 13, 18, 18);
            fill(255);
            textSize(10);
            textAlign(CENTER, CENTER);
            text(upgrade.icon, 15, yOffset + 13);

            // Name
            fill(...this.textColor);
            textSize(10);
            textAlign(LEFT, CENTER);
            text(upgrade.name, 30, yOffset + 13);

            // Cost
            fill(255, 200, 100);
            textSize(9);
            textAlign(RIGHT, CENTER);
            text(`$${upgrade.cost}`, this.width - this.padding * 2 - 10, yOffset + 13);

            yOffset += 28;
        }

        return yOffset + 5;
    }

    // ========================================
    // STATIC BUILDER CLASS
    // ========================================

    static Builder = class {
        constructor() {
            this._reset();
        }

        _reset() {
            this._width = 220;
            this._anchor = 'right';
            this._backgroundColor = [30, 35, 45, 180];
            this._borderColor = [80, 120, 180, 200];
            return this;
        }

        withWidth(width) {
            this._width = width;
            return this;
        }

        anchoredRight() {
            this._anchor = 'right';
            return this;
        }

        anchoredLeft() {
            this._anchor = 'left';
            return this;
        }

        withBackgroundColor(r, g, b, a = 180) {
            this._backgroundColor = [r, g, b, a];
            return this;
        }

        withBorderColor(r, g, b, a = 200) {
            this._borderColor = [r, g, b, a];
            return this;
        }

        build() {
            return new BuildingInfoPanel({
                width: this._width,
                anchor: this._anchor,
                backgroundColor: this._backgroundColor,
                borderColor: this._borderColor
            });
        }

        static create() {
            return new BuildingInfoPanel.Builder();
        }
    };
}

// Export for global access
if (typeof window !== 'undefined') {
    window.BuildingInfoPanel = BuildingInfoPanel;
}
