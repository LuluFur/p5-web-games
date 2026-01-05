class Particle {
    constructor(x, y, color, speed, life) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.life = life;
        this.maxLife = life;

        // Random direction
        let angle = random(TWO_PI);
        this.vx = cos(angle) * speed;
        this.vy = sin(angle) * speed;

        this.size = random(3, 6);
        this.drag = 0.95; // Slow down over time
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;

        this.vx *= this.drag;
        this.vy *= this.drag;

        this.life--;
    }

    draw() {
        let alpha = map(this.life, 0, this.maxLife, 0, 255);
        noStroke();
        fill(red(this.color), green(this.color), blue(this.color), alpha);
        ellipse(this.x, this.y, this.size);
    }
}
