class Decor {
    constructor(grid) {
        this.grid = grid;
        this.elements = []; // {r, c, type, x, y}
        this.generate();
    }

    generate() {
        // Loop through grid, if grass (0), chance to spawn decor
        for (let r = 0; r < this.grid.rows; r++) {
            for (let c = 0; c < this.grid.cols; c++) {
                if (this.grid.map[r][c] === 0) {
                    if (random() < 0.1) {
                        // 10% chance
                        let type = random(['flower', 'rock', 'pebble']);
                        let x = c * this.grid.cellSize + random(10, 50);
                        let y = r * this.grid.cellSize + random(10, 50);
                        this.elements.push({ type: type, x: x, y: y });
                    }
                }
            }
        }
    }

    draw() {
        noStroke();
        for (let e of this.elements) {
            if (e.type === 'flower') {
                fill(255, 100, 100);
                ellipse(e.x, e.y, 6);
                fill(255, 255, 0);
                ellipse(e.x, e.y, 2);
            } else if (e.type === 'rock') {
                fill(100);
                ellipse(e.x, e.y, 8, 5);
            } else if (e.type === 'pebble') {
                fill(120);
                ellipse(e.x, e.y, 4, 3);
            }
        }
    }
}
