// ParticleManager.js - Handles particle effects
class ParticleManager {
    constructor() {
        this.particles = [];
    }

    spawn(x, y, count, particleColor) {
        for (let i = 0; i < count; i++) {
            this.particles.push(new Particle(x, y, particleColor));
        }
    }

    update() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            this.particles[i].update();
            if (this.particles[i].isDead()) {
                this.particles.splice(i, 1);
            }
        }
    }

    draw() {
        for (let p of this.particles) {
            p.draw();
        }
    }

    clear() {
        this.particles = [];
    }

    get count() {
        return this.particles.length;
    }
}
