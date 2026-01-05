/**
 * UIHelper.js - Utility for consistent UI layout and spacing
 * Prevents element overlap and provides standard spacing/sizing
 */

class UIHelper {
    constructor() {
        // Standard spacing units
        this.spacing = {
            xs: 5,
            sm: 10,
            md: 20,
            lg: 40,
            xl: 60
        };

        // Standard component sizes
        this.sizes = {
            button: { w: 180, h: 40 },
            buttonLarge: { w: 240, h: 50 },
            buttonSmall: { w: 120, h: 30 }
        };

        // Track occupied screen regions to prevent overlap
        this.occupiedRegions = [];

        // Track actual rendered element bounds for tutorial highlighting
        this.elementBounds = new Map();
    }

    // Register an element's bounds (called when drawing UI elements)
    registerElement(id, bounds) {
        this.elementBounds.set(id, {
            x: bounds.x,
            y: bounds.y,
            w: bounds.w,
            h: bounds.h
        });
    }

    // Get registered element bounds (for tutorial highlighting)
    getElementBounds(id) {
        return this.elementBounds.get(id) || null;
    }

    // Clear all registered bounds (call at start of frame)
    clearBounds() {
        this.elementBounds.clear();
    }

    // Calculate dialogue box layout with buttons
    getDialogueLayout(hasButtons = false) {
        let boxW = 800;
        let boxH = hasButtons ? 260 : 200;
        let boxX = width / 2;
        let boxY = height - boxH - this.spacing.md;

        return {
            box: { x: boxX, y: boxY, w: boxW, h: boxH },
            title: { x: boxX - 200, y: boxY + this.spacing.md },
            text: {
                x: boxX - 200,
                y: boxY + 60,
                w: 550,
                h: hasButtons ? 110 : 150
            },
            buttons: hasButtons ? {
                y: boxY + boxH - 50,
                left: { x: boxX - 200 },
                right: { x: boxX + 200 }
            } : null
        };
    }

    // Calculate tutorial dialogue layout
    getTutorialDialogueLayout() {
        let boxW = 500;
        let boxH = 140;
        let boxX = (width - boxW) / 2;
        let boxY = 80;

        return {
            box: { x: boxX, y: boxY, w: boxW, h: boxH },
            title: { x: width / 2, y: boxY + 15 },
            text: { x: boxX + 20, y: boxY + 50, w: boxW - 40 },
            continueHint: { x: width / 2, y: boxY + boxH - 25 }
        };
    }

    // Calculate button position with automatic spacing
    getButtonPosition(index, total, containerY, containerCenterX) {
        let btnW = this.sizes.button.w;
        let spacing = this.spacing.lg;

        // Calculate total width needed
        let totalWidth = (total * btnW) + ((total - 1) * spacing);
        let startX = containerCenterX - totalWidth / 2;

        return {
            x: startX + (index * (btnW + spacing)) + btnW / 2,
            y: containerY,
            w: btnW,
            h: this.sizes.button.h
        };
    }

    // Check if mouse is over a rectangular region
    isMouseOver(bounds) {
        if (bounds.w && bounds.h) {
            // Rectangle with width and height
            return mouseX >= bounds.x && mouseX <= bounds.x + bounds.w &&
                   mouseY >= bounds.y && mouseY <= bounds.y + bounds.h;
        } else {
            // Centered rectangle (x/y are center, needs w/h)
            let halfW = bounds.w / 2;
            let halfH = bounds.h / 2;
            return mouseX >= bounds.x - halfW && mouseX <= bounds.x + halfW &&
                   mouseY >= bounds.y - halfH && mouseY <= bounds.y + halfH;
        }
    }

    // Draw a standard button with hover state
    drawButton(label, bounds, baseColor, hoverColor) {
        let isHover = this.isMouseOver(bounds);

        push();
        rectMode(CENTER);
        fill(isHover ? hoverColor : baseColor);
        stroke(red(hoverColor), green(hoverColor), blue(hoverColor));
        strokeWeight(2);
        rect(bounds.x, bounds.y, bounds.w, bounds.h, 8);

        fill(255);
        noStroke();
        textAlign(CENTER, CENTER);
        textSize(18);
        text(label, bounds.x, bounds.y);
        pop();

        return isHover;
    }

    // Check if click is within bounds
    isClicked(bounds) {
        return this.isMouseOver(bounds);
    }

    // Calculate vertical stack of elements with spacing
    getVerticalStack(startY, elements, spacing = 'md') {
        let currentY = startY;
        let positions = [];
        let gap = this.spacing[spacing];

        for (let element of elements) {
            positions.push({
                y: currentY,
                h: element.h
            });
            currentY += element.h + gap;
        }

        return positions;
    }

    // Calculate horizontal row of elements with spacing
    getHorizontalRow(startX, centerY, elements, spacing = 'md') {
        let currentX = startX;
        let positions = [];
        let gap = this.spacing[spacing];

        for (let element of elements) {
            positions.push({
                x: currentX + element.w / 2,
                y: centerY,
                w: element.w,
                h: element.h
            });
            currentX += element.w + gap;
        }

        return positions;
    }

    // Get safe area bounds (avoiding UI elements)
    getSafeArea() {
        return {
            top: 70, // Below top bar
            bottom: height - 90, // Above bottom bar
            left: 0,
            right: width
        };
    }
}

// Create global instance
if (typeof window !== 'undefined') {
    window.UI_HELPER = new UIHelper();
}
