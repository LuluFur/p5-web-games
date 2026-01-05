class Slime extends Enemy {
    constructor(path, speed = 2, health = 80) {
        super(path, speed, health);
        this.color = color(50, 200, 50);
    }

    draw() {
        if (!this.active && this.state !== 'DYING') return;

        let cx = this.x;
        let cy = this.y;

        // Shadow
        if (!this.isPreview) {
            fill(0, 50);
            noStroke();
            ellipse(cx, cy + 20, 30, 10);
        }

        // Body
        fill(this.color);
        stroke(30, 100, 30);
        strokeWeight(2);

        // Squish effect
        let bounce = sin(frameCount * 0.2) * 5;
        ellipse(cx, cy, 40 + bounce, 30 - bounce);

        // Eyes
        fill(255);
        noStroke();
        ellipse(cx - 8, cy - 5, 8);
        ellipse(cx + 8, cy - 5, 8);
        fill(0);
        ellipse(cx - 8, cy - 5, 3);
        ellipse(cx + 8, cy - 5, 3);

        if (this.hasBeenDamaged && this.healthBar) this.healthBar.draw();
    }
}
