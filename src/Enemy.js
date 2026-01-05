class Enemy {
    constructor(path, speed = 2, health = 100) {
        this.path = path; // Array of {r, c}
        this.pathIndex = 0;

        // Start at precise center of first node
        let startNode = this.path[0];
        this.x = startNode.c * 64 + 32;
        this.y = startNode.r * 64 + 32;

        this.speed = speed;
        this.health = health;
        this.maxHealth = health;
        this.active = true;
        this.radius = 15;

        // States: SPAWNING, WALK, DYING
        this.state = 'SPAWNING';
        this.stateTimer = 180; // 3 seconds at 60fps
        this.deathTimer = 0;

        // Health bar visibility (only show after taking damage)
        this.hasBeenDamaged = false;

        this.healthBar = new HealthBar(this, 30, 5, -25);
    }

    update() {
        if (!this.active) return;

        // 1. SPAWNING STATE
        if (this.state === 'SPAWNING') {
            this.stateTimer--;

            // Spawn Particles (Rising Dirt/Magic)
            if (frameCount % 10 === 0 && Game.instance) {
                Game.instance.spawnParticles(this.x, this.y + 20, 1, color(50, 0, 50, 150));
            }

            if (this.stateTimer <= 0) {
                this.state = 'WALK'; // Start moving
            }
            return; // Don't move
        }

        // 2. DYING STATE - Apply knockback slide
        if (this.state === 'DYING') {
            this.stateTimer--;

            // Slowly slide backward (knockback effect)
            if (this.knockbackX !== undefined && this.stateTimer > 40) {
                let slideSpeed = 0.3;
                this.x += this.knockbackX * slideSpeed;
                this.y += this.knockbackY * slideSpeed;
                // Reduce knockback over time
                this.knockbackX *= 0.95;
                this.knockbackY *= 0.95;
            }

            if (this.stateTimer <= 0) {
                this.active = false;
            }
            return; // Don't move
        }

        // 3. WALK STATE
        if (this.pathIndex >= this.path.length - 1) return;

        // Turn "Scary" check inside update for robustness?
        // Or keep logic simple.

        // Move towards next node
        let targetNode = this.path[this.pathIndex + 1];
        let targetX = targetNode.c * 64 + 32;
        let targetY = targetNode.r * 64 + 32;

        let dx = targetX - this.x;
        let dy = targetY - this.y;
        let dist = Math.sqrt(dx * dx + dy * dy);

        // Store angle for direction logic
        if (dist > 0.1) {
            this.facingAngle = Math.atan2(dy, dx);
        }

        // NEW: Calculate speed with terrain modifier
        let currentSpeed = this.getModifiedSpeed();

        if (dist < currentSpeed) {
            this.x = targetX;
            this.y = targetY;
            this.pathIndex++;

            if (this.pathIndex >= this.path.length - 1) {
                this.reachedEnd();
            }
        } else {
            this.x += (dx / dist) * currentSpeed;
            this.y += (dy / dist) * currentSpeed;
        }

        // Footstep Particles (Dust)
        if (frameCount % 15 === 0 && Game.instance) {
            Game.instance.spawnParticles(this.x, this.y + 20, 1, color(100, 100, 100, 150));
        }
    }

    draw() {
        if (!this.active && this.state !== 'DYING') return;

        let cx = this.x;
        let cy = this.y;

        // Shadow
        if (!this.isPreview) {
            if (this.state !== 'DYING') {
                fill(0, 50);
                noStroke();
                ellipse(cx, cy + 28, 40, 15);
            }
        }

        // Summoning Circle (SPAWN ONLY)
        if (this.state === 'SPAWNING') {
            push();
            noFill();
            stroke(100, 50, 100, 200);
            strokeWeight(3);
            let time = frameCount * 0.1;
            translate(cx, cy + 25);
            rotate(time);
            ellipse(0, 0, 50, 20); // Flat perspective circle
            rotate(-time * 2);
            strokeWeight(1);
            rectMode(CENTER);
            rect(0, 0, 30, 30);
            pop();
        }

        let imgKey;
        let frameIndex;

        // Calculate Direction Key
        // Default to 's' (South) if undefined
        let dirKey = 's';
        if (this.facingAngle !== undefined) {
            dirKey = this.getDirectionCode(this.facingAngle);
        }

        // DETERMINE ANIMATION BASED ON STATE
        if (this.state === 'SPAWNING') {
            // Fight Stance / Idle (8 Frames)
            // Loop it? Or play once? "Wait 3 seconds" -> Loop idle
            frameIndex = floor(frameCount / 10) % 8;
            imgKey = `z_spawn_${dirKey}_${frameIndex}`;
        } else if (this.state === 'DYING') {
            // Death (7 Frames)
            // Play once. stateTimer was initialized to roughly 70 (10 frames each)
            // But let's calculate based on progress
            let totalDeathFrames = 7;
            let tickPerFrame = 10;
            // Timer counts DOWN from total time (e.g. 70) to 0.
            // Progress = (Total - Current)
            let passed = (70 - this.stateTimer);
            frameIndex = floor(passed / tickPerFrame);
            if (frameIndex >= totalDeathFrames) frameIndex = totalDeathFrames - 1; // Clamp to last frame
            imgKey = `z_death_${dirKey}_${frameIndex}`;
        } else {
            // WALKING
            // Determine Scary vs Normal
            if (!Game.instance || !Game.instance.grid) {
                // Fallback to normal walk animation if game instance not available
                frameIndex = floor(frameCount / 10) % 6;
                imgKey = `z_walk_${dirKey}_${frameIndex}`;
            } else {
                let grid = Game.instance.grid;
                let col = Math.floor(this.x / 64);
                let isScary = (col >= 3 && col < grid.cols - 3);

                if (isScary) {
                    frameIndex = floor(frameCount / 10) % 8;
                    imgKey = `z_scary_${dirKey}_${frameIndex}`;
                } else {
                    frameIndex = floor(frameCount / 10) % 6;
                    imgKey = `z_walk_${dirKey}_${frameIndex}`;
                }
            }
        }

        let img = Assets.getImage(imgKey);

        // Fallback checks
        if (!img) {
            // Try fallback to East if specific dir missing (though we loaded all)
            imgKey = imgKey.replace(`_${dirKey}_`, '_e_');
            img = Assets.getImage(imgKey);
        }
        // Fallback
        if (!img && this.state === 'WALK') img = Assets.getImage('zombie');

        if (img) {
            push();
            translate(cx, cy);
            imageMode(CENTER);
            image(img, 0, 0, 64, 64);
            pop();
        } else {
            // Basic Shape fallback logic...
            fill(this.state === 'SPAWNING' ? 200 : (this.state === 'DYING' ? 50 : 255), 0, 0);
            ellipse(cx, cy, 30);
        }

        // Health Bar (Only if damaged and not dead)
        if (this.state !== 'DYING' && this.hasBeenDamaged && this.healthBar) {
            this.healthBar.draw();
        }
    }

    getDirectionCode(angle) {
        // Angle is in radians, -PI to PI. 0 is Right (East), PI/2 is Down (South).
        // Map to 8 segments.
        // Slice size = PI / 4 (45 degrees)
        // Shift by half slice (PI/8) to center the segments

        // Normalize angle to 0 - TWO_PI? Or keep -PI to PI
        // Degrees: 0 = East, 90 = South, 180 = West, -90 = North
        let deg = degrees(angle);
        if (deg < 0) deg += 360; // 0 to 360

        // 8 slices of 45 degrees. Center of East is 0 (so 337.5 to 22.5)
        // Offset by 22.5 (half slice) to make math easy using floor
        let ticks = floor((deg + 22.5) / 45) % 8;

        const codes = ['e', 'se', 's', 'sw', 'w', 'nw', 'n', 'ne'];
        return codes[ticks];
    }

    reachedEnd() {
        this.active = false;

        // Emit enemy reach base event
        if (typeof EVENTS !== 'undefined') {
            EVENTS.emit(EVENT_NAMES.ENEMY_REACH_BASE, {
                type: this.constructor.name,
                position: { x: this.x, y: this.y },
                damage: 1
            });
        }

        if (Game.instance) {
            Game.instance.reduceLives(1);
        }
    }

    takeDamage(amount, attacker = null) {
        if (this.state === 'DYING') return;

        // Mark as damaged (shows health bar)
        this.hasBeenDamaged = true;

        // Apply armor reduction if present
        let finalDamage = this.armor ? amount * (1 - this.armor) : amount;
        this.health -= finalDamage;
        this.lastHitFrame = frameCount;

        // Live knockback on powerful hits (>30 damage)
        if (attacker && attacker.col !== undefined && finalDamage > 30) {
            let attackerX = attacker.col * 64 + 32;
            let attackerY = attacker.row * 64 + 32;
            let dx = this.x - attackerX;
            let dy = this.y - attackerY;
            let len = Math.sqrt(dx * dx + dy * dy) || 1;
            let knockForce = Math.min(finalDamage * 0.1, 8); // Cap at 8 pixels
            this.x += (dx / len) * knockForce;
            this.y += (dy / len) * knockForce;
        }

        // Blood Splatter on hit
        if (Game.instance) {
            Game.instance.spawnParticles(this.x, this.y, 3, color(100 + random(50), 0, 0));
        }

        if (this.health <= 0) {
            this.state = 'DYING';
            this.stateTimer = 70;

            // Track kill stat
            if (Game.instance && Game.instance.statsManager) {
                let enemyType = this.constructor.name.toLowerCase();
                Game.instance.statsManager.recordEnemyKilled(enemyType);
            }

            // Emit enemy death event
            if (typeof EVENTS !== 'undefined') {
                EVENTS.emit(EVENT_NAMES.ENEMY_DEATH, {
                    type: this.constructor.name,
                    position: { x: this.x, y: this.y },
                    goldValue: this.goldValue || 10,
                    maxHealth: this.maxHealth,
                    attacker: attacker
                });
            }

            // Calculate knockback direction (from attacker if available)
            if (attacker && attacker.col !== undefined) {
                let attackerX = attacker.col * 64 + 32;
                let attackerY = attacker.row * 64 + 32;
                let dx = this.x - attackerX;
                let dy = this.y - attackerY;
                let len = Math.sqrt(dx * dx + dy * dy) || 1;
                // Store knockback for death animation
                this.knockbackX = (dx / len) * 15;
                this.knockbackY = (dy / len) * 10;
            } else {
                this.knockbackX = random(-10, 10);
                this.knockbackY = random(-5, 5);
            }

            if (Game.instance) {
                // Spawn coin particles instead of directly adding gold
                if (Game.instance.objectManager) {
                    Game.instance.objectManager.spawnCoins(this.x, this.y, this.goldValue || 10);
                }

                Game.instance.triggerShake(3);  // Subtle shake

                // JUICY death particles - more varied and more plentiful!
                for (let i = 0; i < 25; i++) {
                    let pColor = color(
                        random(0, 50),
                        random(100, 200),
                        random(0, 50)
                    );
                    Game.instance.spawnParticles(
                        this.x + random(-10, 10),
                        this.y + random(-10, 10),
                        1,
                        pColor
                    );
                }

                // Soul/spirit particle burst (white/yellow)
                for (let i = 0; i < 8; i++) {
                    let spiritColor = color(255, 255, 200 - random(50), 220);
                    Game.instance.spawnParticles(this.x, this.y - 20, 1, spiritColor);
                }
            }

            // No longer grant XP - merge system replaced XP leveling
        }
    }

    // ===========================================
    // TERRAIN INTERACTION METHODS
    // ===========================================

    /**
     * Get the terrain type at the enemy's current position
     * @returns {number} TERRAIN_TYPES enum value
     */
    getCurrentTerrain() {
        if (!Game.instance || !Game.instance.grid) {
            return TERRAIN_TYPES.GRASS; // Default
        }

        // Convert pixel position to grid cell
        let grid = Game.instance.grid;
        let col = Math.floor(this.x / grid.cellSize);
        let row = Math.floor(this.y / grid.cellSize);

        return grid.getTerrainType(row, col);
    }

    /**
     * Calculate current speed with terrain modifier applied
     * @returns {number} Modified speed value
     */
    getModifiedSpeed() {
        let terrainType = this.getCurrentTerrain();

        // Get terrain properties
        if (typeof TERRAIN_PROPERTIES === 'undefined') {
            return this.speed; // No terrain system, use base speed
        }

        let terrainProps = TERRAIN_PROPERTIES[terrainType];
        if (!terrainProps) {
            return this.speed; // Unknown terrain, use base speed
        }

        // Apply speed modifier
        return this.speed * terrainProps.speedModifier;
    }
}

// ===========================================
// NEW ENEMY TYPES
// ===========================================

// SWARM - Fast, weak, comes in groups. Countered by AOE/Flame/Electric
class Swarm extends Enemy {
    constructor(path, speed = 3.5, health = 25) {
        super(path, speed, health);
        this.radius = 10;           // Smaller
        this.goldValue = 5;         // Less gold each
        this.stateTimer = 60;       // Faster spawn
    }

    draw() {
        if (!this.active) return;

        let cx = this.x;
        let cy = this.y;

        // Small scurrying creature
        push();
        fill(80, 60, 40);
        noStroke();
        ellipse(cx, cy, 20, 16);

        // Legs animation
        let legOffset = sin(frameCount * 0.5) * 3;
        fill(60, 40, 20);
        ellipse(cx - 8, cy + legOffset, 4, 8);
        ellipse(cx + 8, cy - legOffset, 4, 8);

        // Eyes
        fill(255, 100, 100);
        ellipse(cx - 4, cy - 3, 4, 4);
        ellipse(cx + 4, cy - 3, 4, 4);
        pop();

        this.healthBar.draw(cx, cy);
    }
}

// REGENERATOR - Heals over time if not taking damage. Needs focus fire
class Regenerator extends Enemy {
    constructor(path, speed = 1.5, health = 120) {
        super(path, speed, health);
        this.regenRate = 3;         // HP per second
        this.lastHitFrame = 0;
        this.regenDelay = 60;       // 1 second before regen starts
        this.goldValue = 20;
    }

    update() {
        super.update();

        // Regenerate if not hit recently
        if (this.state === 'WALK' && frameCount - this.lastHitFrame > this.regenDelay) {
            this.health = Math.min(this.maxHealth, this.health + this.regenRate / 60);

            // Healing particles
            if (frameCount % 20 === 0 && Game.instance) {
                Game.instance.spawnParticles(this.x, this.y - 10, 1, color(100, 255, 100));
            }
        }
    }

    draw() {
        if (!this.active) return;

        let cx = this.x;
        let cy = this.y;

        push();
        // Slimy body
        let pulse = sin(frameCount * 0.1) * 3;
        fill(50, 150, 50, 200);
        noStroke();
        ellipse(cx, cy, 30 + pulse, 25 + pulse);

        // Inner glow when healing
        if (frameCount - this.lastHitFrame > this.regenDelay) {
            fill(100, 255, 100, 100);
            ellipse(cx, cy, 20, 18);
        }

        // Eyes
        fill(200, 255, 200);
        ellipse(cx - 6, cy - 3, 6, 8);
        ellipse(cx + 6, cy - 3, 6, 8);
        fill(0);
        ellipse(cx - 6, cy - 2, 3, 4);
        ellipse(cx + 6, cy - 2, 3, 4);

        pop();

        this.healthBar.draw(cx, cy);
    }
}

