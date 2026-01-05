// SpriteRenderer.js - Handles entity sprite rendering
class SpriteRenderer {
    constructor(game) {
        this.game = game;
    }

    // Draw all towers
    drawTowers() {
        let grid = this.game.grid;
        if (!grid) return;

        let draggingTower = null;

        // First pass: Draw all non-dragging towers
        for (let r = 0; r < grid.rows; r++) {
            for (let c = 0; c < grid.cols; c++) {
                let cell = grid.map[r][c];
                if (cell instanceof Tower) {
                    if (cell.isDragging) {
                        draggingTower = cell; // Save for later
                    } else {
                        let x = c * grid.cellSize;
                        let y = r * grid.cellSize;
                        cell.draw(x, y, grid.cellSize);
                    }
                }
            }
        }

        // Second pass: Draw dragging tower on top (with transparency)
        if (draggingTower) {
            push();

            // Draw at drag position if available, otherwise grid position
            let x, y;
            if (draggingTower.dragX !== undefined && draggingTower.dragY !== undefined) {
                x = draggingTower.dragX;
                y = draggingTower.dragY;
            } else {
                x = draggingTower.col * grid.cellSize;
                y = draggingTower.row * grid.cellSize;
            }

            // JUICE: Pulsing glow effect
            let pulseIntensity = sin(frameCount * 0.15) * 0.3 + 0.7; // 0.4 to 1.0
            let glowSize = 80 + sin(frameCount * 0.1) * 15;

            // Glow aura
            noStroke();
            fill(100, 200, 255, 80 * pulseIntensity);
            ellipse(x + 32, y + 32, glowSize, glowSize);

            // Make dragging tower semi-transparent with pulse
            tint(255, 150 + 50 * pulseIntensity);

            draggingTower.draw(x, y, grid.cellSize);

            // JUICE: Spawn trailing particles every few frames
            if (frameCount % 3 === 0 && Game.instance) {
                let particleColor = color(100, 200, 255, 150);
                Game.instance.spawnParticles(x + 32, y + 32, 1, particleColor);
            }

            // Draw valid/invalid merge indicator
            this.drawMergeIndicator(draggingTower);

            pop();
        }
    }

    // Draw visual feedback for merge validity
    drawMergeIndicator(draggingTower) {
        let grid = this.game.grid;
        if (!grid) return;

        // Get mouse position relative to grid
        let gridW = grid.cols * grid.cellSize;
        let gridH = grid.rows * grid.cellSize;
        let offsetX = (width - gridW) / 2;
        let offsetY = (height - gridH) / 2;
        let mx = mouseX - offsetX;
        let my = mouseY - offsetY;

        // Check if hovering over valid cell
        if (mx < 0 || mx > gridW || my < 0 || my > gridH) return;

        let cell = grid.getCellAt(mx, my);
        let target = grid.map[cell.r][cell.c];

        // Check if hovering over valid merge target
        if (target instanceof Tower && target !== draggingTower) {
            let canMerge = (target.type === draggingTower.type && target.mergeRank === draggingTower.mergeRank);

            // Draw highlight on target tile
            push();
            noFill();
            strokeWeight(4);
            if (canMerge) {
                stroke(100, 255, 100, 200); // Green = valid merge
            } else {
                stroke(255, 100, 100, 200); // Red = invalid merge
            }
            let tx = cell.c * grid.cellSize;
            let ty = cell.r * grid.cellSize;
            rect(tx, ty, grid.cellSize, grid.cellSize);
            pop();
        }
    }

    // Helper: Draw Reuleaux Polygon
    drawReuleauxPolygon(centerX, centerY, size, numberOfSides) {
        if (numberOfSides < 3) return;

        let radius = size / 2;
        let reuleauxRadius = radius * Math.sqrt(2 + 2 * Math.cos(Math.PI / numberOfSides));

        let ctx = drawingContext;
        ctx.beginPath();

        let angle1 = 0;
        let p1x = radius * Math.cos(angle1);
        let p1y = radius * Math.sin(angle1);
        ctx.moveTo(p1x, p1y);

        for (let i = 0; i < numberOfSides; i++) {
            let index2 = (i + 0.5) % numberOfSides;
            let index3 = (i + 1) % numberOfSides;

            let angle2 = index2 * TWO_PI / numberOfSides;
            let angle3 = index3 * TWO_PI / numberOfSides;

            let p2x = radius * Math.cos(angle2);
            let p2y = radius * Math.sin(angle2);
            let p3x = radius * Math.cos(angle3);
            let p3y = radius * Math.sin(angle3);

            ctx.arcTo(p2x, p2y, p3x, p3y, reuleauxRadius);
        }

        ctx.closePath();
        ctx.fill();
        ctx.stroke();
    }

    // Draw all enemies
    drawEnemies() {
        for (let e of this.game.enemies) {
            e.draw();
        }
    }

    // Draw all projectiles
    drawProjectiles() {
        for (let p of this.game.projectiles) {
            p.draw();
        }
    }

    // Draw all entities in correct order
    drawAll() {
        this.drawTowers();
        this.drawEnemies();
        this.drawProjectiles();
    }

    // Draw path lines (for debugging/visualization)
    drawPaths(paths) {
        if (!paths || paths.length === 0) return;

        push();
        noFill();
        strokeWeight(4);

        paths.forEach((p, index) => {
            if (index === 0) stroke(255, 255, 0, 100);
            else if (index === 1) stroke(0, 255, 255, 100);
            else if (index === 2) stroke(255, 0, 255, 100);
            else stroke(255, 255, 255, 50);

            this.drawPathLine(p);
        });

        pop();
    }

    // Draw a single path line
    drawPathLine(path) {
        let grid = this.game.grid;
        if (!grid) return;

        beginShape();
        for (let node of path) {
            let cx = node.c * grid.cellSize + grid.cellSize / 2;
            let cy = node.r * grid.cellSize + grid.cellSize / 2;
            vertex(cx, cy);
        }
        endShape();
    }
}
