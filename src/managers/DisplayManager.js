// DisplayManager.js - Centralized management of UI element positions and dimensions
class DisplayManager {
    constructor(game) {
        this.game = game;
    }

    // Get grid offset for calculating grid-relative positions
    getGridOffset() {
        if (!this.game.grid) return { x: 0, y: 0 };
        let gridW = this.game.grid.cols * this.game.grid.cellSize;
        let gridH = this.game.grid.rows * this.game.grid.cellSize;
        return {
            x: (width - gridW) / 2,
            y: (height - gridH) / 2
        };
    }

    // Get bounds for any UI element by ID
    // Returns { x, y, w, h } or null if not found
    getElementBounds(elementId) {
        let grid = this.game.grid;
        let offset = this.getGridOffset();

        switch (elementId) {
            case 'gold':
                return { x: 30, y: 15, w: 130, h: 35 };

            case 'lives':
                return { x: 170, y: 15, w: 100, h: 35 };

            case 'wave':
                return { x: 340, y: 15, w: 120, h: 35 };

            case 'enemies':
                return { x: 490, y: 15, w: 150, h: 35 };

            case 'tower_bar':
                return { x: 10, y: height - 80, w: 400, h: 70 };

            case 'wave_button':
                return { x: width - 150, y: height - 60, w: 140, h: 50 };

            case 'expand_button':
                return { x: width - 300, y: height - 60, w: 140, h: 50 };

            case 'grid':
                // Full grid
                if (!grid) return null;
                let gridW = grid.cols * grid.cellSize;
                let gridH = grid.rows * grid.cellSize;
                return { x: offset.x, y: offset.y, w: gridW, h: gridH };

            case 'spawn_zone':
                // Red tiles - columns 0-2 (enemy spawn area)
                if (!grid) return null;
                return {
                    x: offset.x,
                    y: offset.y + grid.unlockStart * grid.cellSize,
                    w: 3 * grid.cellSize,
                    h: (grid.unlockEnd - grid.unlockStart + 1) * grid.cellSize
                };

            case 'base_zone':
                // Blue tiles - last 3 columns (player base)
                if (!grid) return null;
                return {
                    x: offset.x + (grid.cols - 3) * grid.cellSize,
                    y: offset.y + grid.unlockStart * grid.cellSize,
                    w: 3 * grid.cellSize,
                    h: (grid.unlockEnd - grid.unlockStart + 1) * grid.cellSize
                };

            case 'playable_grid':
                // Green tiles only - middle columns (where towers can be placed)
                if (!grid) return null;
                return {
                    x: offset.x + 3 * grid.cellSize,
                    y: offset.y + grid.unlockStart * grid.cellSize,
                    w: (grid.cols - 6) * grid.cellSize,
                    h: (grid.unlockEnd - grid.unlockStart + 1) * grid.cellSize
                };

            default:
                return null;
        }
    }

    // Get arrow direction and position for pointing at an element
    // Returns { x, y, dir } where dir is 'up', 'down', 'left', 'right'
    // Automatically flips if arrow would be off-screen
    getArrowForElement(elementId) {
        let bounds = this.getElementBounds(elementId);
        if (!bounds) return null;

        let centerX = bounds.x + bounds.w / 2;
        let centerY = bounds.y + bounds.h / 2;
        let arrowSize = 50; // Approximate arrow size for collision check

        let arrow = { x: 0, y: 0, dir: 'down' };

        switch (elementId) {
            case 'gold':
            case 'lives':
            case 'wave':
            case 'enemies':
                // Top bar elements - arrow points DOWN from above
                arrow = { x: centerX, y: bounds.y + bounds.h + 10, dir: 'up' };
                break;

            case 'tower_bar':
                // Bottom - arrow points DOWN from above
                arrow = { x: bounds.x + 100, y: bounds.y - 10, dir: 'down' };
                break;

            case 'wave_button':
                // Bottom right - arrow points DOWN from above
                arrow = { x: centerX, y: bounds.y - 20, dir: 'down' };
                break;

            case 'expand_button':
                arrow = { x: centerX, y: bounds.y - 20, dir: 'down' };
                break;

            case 'grid':
            case 'playable_grid':
            case 'spawn_zone':
            case 'base_zone':
                // Grid elements - arrow from above
                arrow = { x: centerX, y: bounds.y - 20, dir: 'down' };
                break;

            default:
                arrow = { x: centerX, y: bounds.y - 10, dir: 'down' };
        }

        // Flip arrow if it would be off-screen
        arrow = this.flipArrowIfOffscreen(arrow, bounds, arrowSize);

        return arrow;
    }

    // Flip arrow direction if it would render off-screen
    flipArrowIfOffscreen(arrow, bounds, arrowSize) {
        let centerX = bounds.x + bounds.w / 2;
        let centerY = bounds.y + bounds.h / 2;

        // Check if arrow goes off top
        if (arrow.dir === 'down' && arrow.y - arrowSize < 0) {
            arrow.y = bounds.y + bounds.h + 10;
            arrow.dir = 'up';
        }
        // Check if arrow goes off bottom
        else if (arrow.dir === 'up' && arrow.y + arrowSize > height) {
            arrow.y = bounds.y - 10;
            arrow.dir = 'down';
        }
        // Check if arrow goes off left
        else if (arrow.dir === 'right' && arrow.x - arrowSize < 0) {
            arrow.x = bounds.x + bounds.w + 10;
            arrow.dir = 'left';
        }
        // Check if arrow goes off right
        else if (arrow.dir === 'left' && arrow.x + arrowSize > width) {
            arrow.x = bounds.x - 10;
            arrow.dir = 'right';
        }

        return arrow;
    }
}

