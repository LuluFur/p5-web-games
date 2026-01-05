class Ghost extends Enemy {
    constructor(path, speed = 3.5, health = 40) {
        super(path, speed, health);
    }

    draw() {
        if (!this.active && this.state !== 'DYING') return;

        let cx = this.x;
        let cy = this.y;

        // No shadow (It's a ghost!)

        // Body
        push();
        fill(200, 200, 255, 150); // Transparent
        noStroke();

        // Float effect
        let float = sin(frameCount * 0.1) * 5;
        translate(cx, cy + float);

        beginShape();
        vertex(-15, -20);
        vertex(15, -20);
        vertex(20, 20);
        vertex(10, 15);
        vertex(0, 20);
        vertex(-10, 15);
        vertex(-20, 20);
        endShape(CLOSE);

        // Eyes
        fill(0);
        ellipse(-5, -5, 5);
        ellipse(5, -5, 5);
        pop();

        if (this.hasBeenDamaged && this.healthBar) this.healthBar.draw();
    }
}
