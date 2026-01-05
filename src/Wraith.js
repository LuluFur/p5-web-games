class Wraith extends Enemy {
    constructor(path, speed = 3.5, health = 45) {
        super(path, speed, health);
    }

    draw() {
        if (!this.active && this.state !== 'DYING') return;

        let cx = this.x;
        let cy = this.y;

        // No Shadow (Floating)

        push();
        translate(cx, cy);

        // Floating hover
        let hover = sin(frameCount * 0.1) * 5;
        translate(0, hover);

        // Robes
        fill(30, 30, 50, 200); // Dark Blue/Grey, Translucent
        noStroke();

        beginShape();
        vertex(0, -25); // Head top
        bezierVertex(-20, -20, -30, 10, -25, 30); // Left side
        vertex(0, 25); // Bottom center tip
        bezierVertex(25, 30, 30, 10, 20, -20); // Right side
        endShape(CLOSE);

        // Hood
        fill(20, 20, 40);
        ellipse(0, -20, 25, 30);

        // Empty Face
        fill(0);
        ellipse(0, -18, 15, 18);

        // Glowing Eyes
        fill(100, 255, 255); // Cyan glow
        ellipse(-4, -18, 4, 4);
        ellipse(4, -18, 4, 4);

        // Scythe/Staff logic removed for simplicity, just floaty ghost man

        pop();

        if (!this.isPreview && this.state !== 'DYING' && this.hasBeenDamaged && this.healthBar) {
            this.healthBar.draw();
        }
    }
}
