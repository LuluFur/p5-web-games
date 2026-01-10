/**
 * ShapeRenderer.js - Quality-scalable shape drawing utilities
 *
 * Provides drawing functions that adapt to graphics quality settings.
 * LOW quality uses simple squares, HIGH quality uses smooth curves.
 *
 * Usage:
 *   ShapeRenderer.setQuality('HIGH');
 *   ShapeRenderer.drawRoundedRect(x, y, w, h, radius);
 *   ShapeRenderer.drawPolygon(x, y, radius, sides);
 *   ShapeRenderer.drawReuleauxPolygon(x, y, radius, sides);
 */

class ShapeRenderer {
    constructor() {
        // Singleton pattern
        if (ShapeRenderer.instance) return ShapeRenderer.instance;
        ShapeRenderer.instance = this;

        // Default to medium quality
        this.quality = RTS_GRAPHICS_QUALITY ? RTS_GRAPHICS_QUALITY.MEDIUM : {
            shapeVertices: 8,
            shadowEnabled: true,
            reuleauxPolygons: false
        };

        this.qualityLevel = 'MEDIUM';
    }

    /**
     * Set graphics quality level
     * @param {string} level - 'LOW', 'MEDIUM', or 'HIGH'
     */
    setQuality(level) {
        this.qualityLevel = level;
        if (RTS_GRAPHICS_QUALITY && RTS_GRAPHICS_QUALITY[level]) {
            this.quality = RTS_GRAPHICS_QUALITY[level];
        }
        console.log(`ShapeRenderer: Quality set to ${level}`);
    }

    /**
     * Get current number of vertices based on quality
     * @returns {number} Vertices to use for shapes
     */
    getVertexCount() {
        return this.quality.shapeVertices || 8;
    }

    /**
     * Draw a rounded rectangle with quality-adaptive corners
     * @param {number} x - X position (top-left)
     * @param {number} y - Y position (top-left)
     * @param {number} w - Width
     * @param {number} h - Height
     * @param {number} radius - Corner radius
     * @param {object} options - Optional: { fill, stroke, strokeWeight }
     */
    drawRoundedRect(x, y, w, h, radius, options = {}) {
        // Apply styling if provided
        if (options.fill !== undefined) fill(options.fill);
        if (options.stroke !== undefined) stroke(options.stroke);
        if (options.strokeWeight !== undefined) strokeWeight(options.strokeWeight);

        // LOW quality: just draw a regular rect
        if (this.qualityLevel === 'LOW' || this.quality.shapeVertices <= 4) {
            rect(x, y, w, h);
            return;
        }

        // MEDIUM/HIGH: use p5's built-in rounded rect
        rect(x, y, w, h, radius);
    }

    /**
     * Draw a regular polygon centered at (x, y)
     * @param {number} x - Center X
     * @param {number} y - Center Y
     * @param {number} radius - Distance from center to vertices
     * @param {number} sides - Number of sides (min 3)
     * @param {number} rotation - Rotation in radians (0 = first vertex points right)
     * @param {object} options - Optional: { fill, stroke, strokeWeight }
     */
    drawPolygon(x, y, radius, sides, rotation = 0, options = {}) {
        // Apply styling
        if (options.fill !== undefined) fill(options.fill);
        if (options.stroke !== undefined) stroke(options.stroke);
        if (options.strokeWeight !== undefined) strokeWeight(options.strokeWeight);

        // LOW quality: use minimum vertices
        const actualSides = this.qualityLevel === 'LOW' ?
            Math.min(sides, 4) : sides;

        beginShape();
        for (let i = 0; i < actualSides; i++) {
            const angle = rotation + (TWO_PI / actualSides) * i;
            const vx = x + cos(angle) * radius;
            const vy = y + sin(angle) * radius;
            vertex(vx, vy);
        }
        endShape(CLOSE);
    }

    /**
     * Draw a circle with quality-adaptive smoothness
     * @param {number} x - Center X
     * @param {number} y - Center Y
     * @param {number} diameter - Diameter of circle
     * @param {object} options - Optional: { fill, stroke, strokeWeight }
     */
    drawCircle(x, y, diameter, options = {}) {
        // Apply styling
        if (options.fill !== undefined) fill(options.fill);
        if (options.stroke !== undefined) stroke(options.stroke);
        if (options.strokeWeight !== undefined) strokeWeight(options.strokeWeight);

        // LOW quality: draw as polygon
        if (this.qualityLevel === 'LOW') {
            this.drawPolygon(x, y, diameter / 2, 6, -PI / 2);
            return;
        }

        // MEDIUM/HIGH: use native ellipse
        ellipse(x, y, diameter, diameter);
    }

    /**
     * Draw a Reuleaux polygon (curved-sided polygon with constant width)
     * Used for tower merge indicators in the original game
     * @param {number} x - Center X
     * @param {number} y - Center Y
     * @param {number} size - Overall size
     * @param {number} sides - Number of sides (3+ for triangle, etc.)
     * @param {object} options - Optional: { fill, stroke, strokeWeight }
     */
    drawReuleauxPolygon(x, y, size, sides, options = {}) {
        // Apply styling
        if (options.fill !== undefined) fill(options.fill);
        if (options.stroke !== undefined) stroke(options.stroke);
        if (options.strokeWeight !== undefined) strokeWeight(options.strokeWeight);

        // LOW/MEDIUM: fall back to regular polygon
        if (!this.quality.reuleauxPolygons || this.qualityLevel === 'LOW') {
            this.drawPolygon(x, y, size / 2, sides, -PI / 2, options);
            return;
        }

        // HIGH quality: draw proper Reuleaux polygon using arcs
        if (sides < 3) sides = 3;

        const radius = size / 2;
        const reuleauxRadius = radius * Math.sqrt(2 + 2 * Math.cos(PI / sides));

        // Use canvas context for arcTo
        const ctx = drawingContext;

        ctx.beginPath();

        // Start at first vertex
        const startAngle = -PI / 2; // Point upward
        const p1x = x + radius * cos(startAngle);
        const p1y = y + radius * sin(startAngle);
        ctx.moveTo(p1x, p1y);

        // Draw arcs between vertices
        for (let i = 0; i < sides; i++) {
            const angle1 = startAngle + (TWO_PI / sides) * i;
            const angle2 = startAngle + (TWO_PI / sides) * (i + 0.5);
            const angle3 = startAngle + (TWO_PI / sides) * (i + 1);

            const p2x = x + radius * cos(angle2);
            const p2y = y + radius * sin(angle2);
            const p3x = x + radius * cos(angle3);
            const p3y = y + radius * sin(angle3);

            ctx.arcTo(p2x, p2y, p3x, p3y, reuleauxRadius);
        }

        ctx.closePath();
        ctx.fill();
        ctx.stroke();
    }

    /**
     * Draw a machine-style base platform (layered rectangles)
     * Common pattern for tower/building bases
     * @param {number} x - Center X
     * @param {number} y - Center Y
     * @param {number} width - Platform width
     * @param {number} height - Platform height
     * @param {color} baseColor - Main color
     * @param {number} layers - Number of layers (1-3)
     */
    drawPlatform(x, y, width, height, baseColor, layers = 2) {
        noStroke();

        // Calculate color variations
        const r = red(baseColor);
        const g = green(baseColor);
        const b = blue(baseColor);

        for (let i = layers - 1; i >= 0; i--) {
            const layerW = width - i * 8;
            const layerH = height - i * 4;
            const layerY = y + i * 2;

            // Darker for lower layers
            const darkness = 1 - (i * 0.2);
            fill(r * darkness, g * darkness, b * darkness);

            this.drawRoundedRect(
                x - layerW / 2,
                layerY - layerH / 2,
                layerW,
                layerH,
                this.qualityLevel === 'LOW' ? 0 : 4
            );
        }
    }

    /**
     * Draw a shadow beneath an object
     * @param {number} x - Center X
     * @param {number} y - Shadow Y position
     * @param {number} width - Shadow width
     * @param {number} height - Shadow height
     * @param {number} alpha - Shadow opacity (0-255)
     */
    drawShadow(x, y, width, height, alpha = 50) {
        if (!this.quality.shadowEnabled) return;

        noStroke();
        fill(0, 0, 0, alpha);

        if (this.qualityLevel === 'LOW') {
            rect(x - width / 2, y - height / 2, width, height);
        } else {
            ellipse(x, y, width, height);
        }
    }

    /**
     * Draw a health bar above a unit/building
     * @param {number} x - Center X
     * @param {number} y - Y position (top of bar)
     * @param {number} width - Bar width
     * @param {number} height - Bar height
     * @param {number} percent - Health percentage (0-1)
     * @param {object} options - { showBorder, borderColor, bgColor }
     */
    drawHealthBar(x, y, width, height, percent, options = {}) {
        const showBorder = options.showBorder !== false;
        const borderColor = options.borderColor || color(0);
        const bgColor = options.bgColor || color(60);

        // Background
        fill(bgColor);
        if (showBorder) {
            stroke(borderColor);
            strokeWeight(1);
        } else {
            noStroke();
        }
        rect(x - width / 2, y, width, height);

        // Health fill
        noStroke();
        if (percent > 0.5) {
            fill(100, 200, 100); // Green
        } else if (percent > 0.25) {
            fill(255, 200, 50);  // Yellow
        } else {
            fill(255, 80, 80);   // Red
        }

        const fillWidth = width * Math.max(0, Math.min(1, percent));
        rect(x - width / 2, y, fillWidth, height);
    }

    /**
     * Draw a selection indicator (pulsing circle/square)
     * @param {number} x - Center X
     * @param {number} y - Center Y
     * @param {number} size - Selection indicator size
     * @param {color} selectionColor - Color of selection
     * @param {boolean} isEnemy - If true, uses enemy color scheme
     */
    drawSelectionIndicator(x, y, size, selectionColor, isEnemy = false) {
        const pulseAlpha = 150 + sin(frameCount * 0.1) * 50;
        const pulseSize = size + sin(frameCount * 0.15) * 3;

        noFill();
        stroke(red(selectionColor), green(selectionColor), blue(selectionColor), pulseAlpha);
        strokeWeight(2);

        if (this.qualityLevel === 'LOW') {
            rect(x - pulseSize / 2, y - pulseSize / 2, pulseSize, pulseSize);
        } else {
            ellipse(x, y, pulseSize, pulseSize);
        }
    }

    /**
     * Draw a construction progress indicator
     * @param {number} x - Center X
     * @param {number} y - Center Y
     * @param {number} size - Size of indicator
     * @param {number} progress - Progress (0-1)
     */
    drawConstructionProgress(x, y, size, progress) {
        noFill();
        stroke(100, 200, 100);
        strokeWeight(3);

        if (this.qualityLevel === 'LOW') {
            // Simple bar
            const barWidth = size;
            const barHeight = 8;
            fill(60);
            noStroke();
            rect(x - barWidth / 2, y - barHeight / 2, barWidth, barHeight);
            fill(100, 200, 100);
            rect(x - barWidth / 2, y - barHeight / 2, barWidth * progress, barHeight);
        } else {
            // Circular progress
            const endAngle = -PI / 2 + TWO_PI * progress;
            arc(x, y, size, size, -PI / 2, endAngle);
        }
    }

    /**
     * Draw a rally point marker
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {color} teamColor - Team color
     */
    drawRallyPoint(x, y, teamColor) {
        const bounce = sin(frameCount * 0.1) * 3;

        // Flag pole
        stroke(100);
        strokeWeight(2);
        line(x, y, x, y - 20 + bounce);

        // Flag
        noStroke();
        fill(teamColor);
        triangle(
            x, y - 20 + bounce,
            x + 12, y - 15 + bounce,
            x, y - 10 + bounce
        );

        // Base marker
        fill(teamColor);
        this.drawCircle(x, y, 8);
    }

    /**
     * Draw attack/move order indicator
     * @param {number} x - Target X
     * @param {number} y - Target Y
     * @param {string} type - 'move', 'attack', 'patrol', 'guard'
     */
    drawOrderIndicator(x, y, type) {
        const alpha = 200 - (frameCount % 60) * 3;
        if (alpha < 50) return; // Fade out

        noFill();
        strokeWeight(2);

        switch (type) {
            case 'move':
                stroke(100, 255, 100, alpha);
                this.drawCircle(x, y, 20 + (frameCount % 60) * 0.5);
                break;

            case 'attack':
                stroke(255, 100, 100, alpha);
                // X marker
                const s = 10;
                line(x - s, y - s, x + s, y + s);
                line(x + s, y - s, x - s, y + s);
                this.drawCircle(x, y, 20 + (frameCount % 60) * 0.5);
                break;

            case 'patrol':
                stroke(255, 255, 100, alpha);
                // Diamond marker
                this.drawPolygon(x, y, 10, 4, 0);
                break;

            case 'guard':
                stroke(100, 100, 255, alpha);
                // Shield shape
                arc(x, y, 20, 20, 0, PI);
                line(x - 10, y, x - 10, y - 10);
                line(x + 10, y, x + 10, y - 10);
                arc(x, y - 10, 20, 10, PI, TWO_PI);
                break;
        }
    }

    /**
     * Draw fog of war overlay for a cell
     * @param {number} x - Cell X position
     * @param {number} y - Cell Y position
     * @param {number} size - Cell size
     * @param {string} fogState - 'shroud', 'fog', or 'visible'
     */
    drawFogCell(x, y, size, fogState) {
        if (fogState === 'visible') return;

        noStroke();

        if (fogState === 'shroud') {
            // Completely hidden
            fill(0);
            rect(x, y, size, size);
        } else if (fogState === 'fog') {
            // Previously explored but not visible
            if (this.quality.fogQuality === 'simple') {
                fill(0, 0, 0, 180);
                rect(x, y, size, size);
            } else {
                // Gradient fog - darker in center
                fill(0, 0, 0, 150);
                rect(x, y, size, size);
            }
        }
    }
}

// Create global singleton instance
if (typeof window !== 'undefined') {
    window.ShapeRenderer = new ShapeRenderer();
}
