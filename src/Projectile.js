class Projectile {
    constructor(x, y, target, damage, owner = null) {
        this.x = x;
        this.y = y;
        this.target = target; // Enemy reference
        this.damage = damage;
        this.owner = owner; // Tower that fired this projectile
        this.speed = 10;
        this.active = true;
        this.radius = 5;
    }

    update() {
        if (!this.target || !this.target.active || this.target.state === 'DYING') {
            this.active = false; // Target dead or removed, fizzle out
            return;
        }

        // Move towards target
        let dx = this.target.x - this.x;
        let dy = this.target.y - this.y;
        let currentDist = Math.sqrt(dx * dx + dy * dy); // Renamed to avoid conflict with p5.js dist()

        // Check collision
        let d = dist(this.x, this.y, this.target.x, this.target.y); // Using p5.js dist()
        if (d < 15) { // Hit
            if (window.Sounds) window.Sounds.play('hit');
            this.target.takeDamage(this.damage, this.owner);
            this.active = false;

            // Spawn Particles
            if (Game.instance) {
                Game.instance.spawnParticles(this.target.x, this.target.y, 5, color(255, 100, 100)); // Red Blood
                Game.instance.spawnParticles(this.target.x, this.target.y, 3, color(255, 200, 0)); // Sparks
            }
        } else {
            // Move
            this.x += (dx / currentDist) * this.speed;
            this.y += (dy / currentDist) * this.speed;
        }
    }

    draw() {
        if (!this.active) return;

        fill(255, 255, 0); // Yellow bullet
        noStroke();
        ellipse(this.x, this.y, this.radius * 2);
    }
}
