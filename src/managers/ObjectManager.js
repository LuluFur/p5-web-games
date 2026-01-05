// ObjectManager.js - Handles updates for all game objects (towers, enemies, projectiles, particles)
class ObjectManager {
    constructor(game) {
        this.game = game;
        this.enemies = [];
        this.projectiles = [];
        this.particles = [];
        this.coins = []; // Coin particles for collection

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

    // Update all towers (targeting & shooting)
    updateTowers() {
        let grid = this.game.grid;
        if (!grid) return;

        for (let r = 0; r < grid.rows; r++) {
            for (let c = 0; c < grid.cols; c++) {
                let cell = grid.map[r][c];
                if (cell instanceof Tower) {
                    cell.update(this.enemies);
                }
            }
        }
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

    // Update all enemies
    updateEnemies() {
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            let e = this.enemies[i];
            e.update();
            if (!e.active) {
                this.enemies.splice(i, 1);
            }
        }
    }

    // Update all coin particles
    updateCoins() {
        for (let i = this.coins.length - 1; i >= 0; i--) {
            let c = this.coins[i];
            c.update();
            if (c.shouldRemove()) {
                this.coins.splice(i, 1);
            }
        }
    }

    // Update all game objects in correct order
    updateAll() {
        this.updateTowers();
        this.updateProjectiles();
        this.updateParticles();
        this.updateEnemies();
        this.updateCoins();
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

    // Add an enemy
    addEnemy(enemy) {
        this.enemies.push(enemy);
    }

    // Spawn coin particles at enemy death location
    spawnCoins(x, y, goldValue) {
        // Calculate number of coins based on gold value
        let coinCount = Math.min(Math.ceil(goldValue / 3), 8); // Max 8 coins

        for (let i = 0; i < coinCount; i++) {
            let coin = new CoinParticle(x, y, Math.ceil(goldValue / coinCount));
            this.coins.push(coin);
        }
    }

    // Clear all objects (for reset)
    clear() {
        this.enemies = [];
        this.projectiles = [];
        this.particles = [];
        this.coins = [];
    }

    // Get counts
    get enemyCount() { return this.enemies.length; }
    get projectileCount() { return this.projectiles.length; }
    get particleCount() { return this.particles.length; }
    get coinCount() { return this.coins.length; }
}
