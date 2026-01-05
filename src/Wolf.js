class Wolf extends Enemy {
    constructor(path, speed = 4, health = 30) {
        super(path, speed, health);
        this.color = color(150, 50, 50); // Reddish Brown
    }

    draw() {
        if (!this.active && this.state !== 'DYING') return;

        let cx = this.x;
        let cy = this.y;

        // Shadow
        if (!this.isPreview) {
            fill(0, 50);
            noStroke();
            ellipse(cx, cy + 15, 30, 10);
        }

        // Body (Ellipse for speed illusion)
        fill(100, 60, 40);
        noStroke();
        push();
        translate(cx, cy);
        // Rotate towards movement?
        // We have facingAngle from Enemy.js? No, Enemy.js doesn't expose it to `this` unless we set it.
        // But we have getDirectionCode logic logic in Vampire.
        // Let's just draw generic "running shape"

        // Elongated body
        ellipse(0, 0, 40, 20); // Horizontal

        // Head
        ellipse(15, -5, 15, 15);
        // Ears
        triangle(10, -10, 15, -15, 20, -10);

        // Legs (simple animation)
        let legOff = sin(frameCount * 0.8) * 5;
        stroke(100, 60, 40);
        strokeWeight(3);
        line(-10, 5, -10 + legOff, 15);
        line(10, 5, 10 - legOff, 15);

        pop();

        if (!this.isPreview && this.state !== 'DYING' && this.hasBeenDamaged && this.healthBar) {
            this.healthBar.draw();
        }
    }
}
