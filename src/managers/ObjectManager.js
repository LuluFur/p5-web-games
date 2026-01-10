// ObjectManager.js - Handles updates for all game objects (projectiles, particles)
class ObjectManager {
    constructor(game) {
        this.game = game;
        this.projectiles = [];
        this.particles = [];

        // Performance: Object Pools
        this.particlePool = [];
        this.projectilePool = [];
        this.initPools();
    }

    // Initialize object pools for performance
    initPools() {
        // Pre-create particle pool
        for (let i = 0; i < PERFORMANCE_CONSTANTS.PARTICLE_POOL_SIZE; i++) {
            this.particlePool.push(new Particle(0, 0, color(0), 0, 0));
        }
        console.log(`ObjectManager: Particle pool initialized (${this.particlePool.length} objects)`);
    }

    // Update all projectiles
    updateProjectiles() {
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            let p = this.projectiles[i];
            p.update();
            if (!p.active) {
                this.projectiles.splice(i, 1);
            }
        }
    }

    // Update all particles (with pooling)
    updateParticles() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            let p = this.particles[i];
            p.update();
            if (p.life <= 0) {
                // Return to pool if space available
                if (this.particlePool.length < PERFORMANCE_CONSTANTS.PARTICLE_POOL_SIZE) {
                    this.particlePool.push(p);
                }
                this.particles.splice(i, 1);
            }
        }
    }

    // Update all game objects in correct order
    updateAll() {
        this.updateProjectiles();
        this.updateParticles();
    }

    // Add a projectile
    addProjectile(p) {
        this.projectiles.push(p);
    }

    // Spawn particles at a location (with pooling and MAX limit)
    spawnParticles(x, y, count, particleColor) {
        // Performance: Enforce MAX_PARTICLES limit
        if (this.particles.length >= PERFORMANCE_CONSTANTS.MAX_PARTICLES) {
            // Remove particles from end if at limit (pop is O(1) vs shift's O(n))
            let removeCount = Math.min(count, this.particles.length - PERFORMANCE_CONSTANTS.MAX_PARTICLES + count);
            for (let i = 0; i < removeCount; i++) {
                let removed = this.particles.pop(); // O(1) - much faster than shift()
                // Return to pool
                if (this.particlePool.length < PERFORMANCE_CONSTANTS.PARTICLE_POOL_SIZE) {
                    this.particlePool.push(removed);
                }
            }
        }

        for (let i = 0; i < count; i++) {
            let particle;
            // Try to get from pool first
            if (this.particlePool.length > 0) {
                particle = this.particlePool.pop();
                // Reset particle properties
                particle.x = x;
                particle.y = y;
                particle.color = particleColor;
                particle.life = random(VFX_CONSTANTS.PARTICLE_MIN_LIFE, VFX_CONSTANTS.PARTICLE_MAX_LIFE);
                particle.maxLife = particle.life;

                let speed = random(VFX_CONSTANTS.PARTICLE_MIN_SPEED, VFX_CONSTANTS.PARTICLE_MAX_SPEED);
                let angle = random(TWO_PI);
                particle.vx = cos(angle) * speed;
                particle.vy = sin(angle) * speed;
                particle.size = random(3, 6);
            } else {
                // Pool exhausted, create new (rare)
                particle = new Particle(
                    x, y, particleColor,
                    random(VFX_CONSTANTS.PARTICLE_MIN_SPEED, VFX_CONSTANTS.PARTICLE_MAX_SPEED),
                    random(VFX_CONSTANTS.PARTICLE_MIN_LIFE, VFX_CONSTANTS.PARTICLE_MAX_LIFE)
                );
            }
            this.particles.push(particle);
        }
    }

    // Clear all objects (for reset)
    clear() {
        this.projectiles = [];
        this.particles = [];
    }

    // Get counts
    get projectileCount() { return this.projectiles.length; }
    get particleCount() { return this.particles.length; }
}
