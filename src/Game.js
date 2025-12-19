class Game {
    constructor() {
        this.towers = [];
        this.enemies = [];
        this.projectiles = [];
        this.resources = 100;
        this.lives = 20;
    }

    init() {
        console.log("System Defense Initialized");
        // Placeholder for grid initialization
    }

    update() {
        // Update game logic
    }

    draw() {
        // Draw game elements
        this.displayDebug();
    }

    displayDebug() {
        push();
        fill(255);
        noStroke();
        textSize(14);
        textAlign(LEFT, TOP);
        text(`FPS: ${Math.floor(frameRate())}`, 10, 10);
        text(`Resources: ${this.resources}`, 10, 30);
        text(`Lives: ${this.lives}`, 10, 50);
        pop();
    }
}
