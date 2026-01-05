class Golem extends Enemy {
    constructor(path, speed = 0.8, health = 400) {
        super(path, speed, health);
        this.color = color(100);
    }

    draw() {
        if (!this.active && this.state !== 'DYING') return;

        let cx = this.x;
        let cy = this.y;

        // Shadow
        if (!this.isPreview) {
            fill(0, 80); // Heavy shadow
            noStroke();
            ellipse(cx, cy + 25, 50, 20);
        }

        // Body - Big Stone Block
        fill(120);
        stroke(60);
        strokeWeight(2);

        // Rumble / Shake as it walks
        let shake = sin(frameCount * 0.1) * 2;

        push();
        translate(cx, cy + shake);

        // Torso
        rectMode(CENTER);
        rect(0, 0, 50, 50, 5);

        // Head
        rect(0, -35, 25, 25, 2);

        // Arms
        let armSwing = sin(frameCount * 0.05) * 10;
        rect(-35, 0 + armSwing, 15, 40, 2);
        rect(35, 0 - armSwing, 15, 40, 2);

        // Eyes (Eerie Glow)
        fill(255, 100, 0); // Orange magma
        noStroke();
        rect(-5, -35, 5, 2);
        rect(5, -35, 5, 2);

        pop();
        rectMode(CORNER);

        if (!this.isPreview && this.state !== 'DYING' && this.hasBeenDamaged && this.healthBar) {
            this.healthBar.draw();
        }
    }
}
