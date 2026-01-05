// CoinParticle.js - Satisfying coin collection with physics and trails
class CoinParticle {
    constructor(x, y, value = 1) {
        this.x = x;
        this.y = y;
        this.value = value; // Gold value

        // Physics for arc motion
        this.vx = random(-3, 3); // Random horizontal velocity
        this.vy = random(-8, -12); // Initial upward velocity
        this.gravity = 0.4; // Gravity acceleration
        this.bounce = 0.6; // Bounce damping (60% energy retained)

        // Target height for bouncing (random ground level)
        this.groundY = y + random(20, 60);
        this.bounceCount = 0;
        this.maxBounces = random(2, 4); // 2-3 bounces

        // State machine
        this.state = 'FLYING'; // FLYING -> COLLECTING -> COLLECTED
        this.collectTimer = 0;
        this.collectDuration = 30; // Frames to ease to UI

        // Trail effect
        this.trail = [];
        this.maxTrailLength = 8;

        // Visual properties
        this.rotation = random(TWO_PI);
        this.rotationSpeed = random(-0.2, 0.2);
        this.size = 12;
        this.glowIntensity = 0;

        // Target for collection (gold UI position)
        this.targetX = 85; // Gold counter position
        this.targetY = 30;

        this.active = true;
    }

    update() {
        if (!this.active) return;

        // Update trail
        this.trail.push({ x: this.x, y: this.y });
        if (this.trail.length > this.maxTrailLength) {
            this.trail.shift();
        }

        if (this.state === 'FLYING') {
            this.updateFlying();
        } else if (this.state === 'COLLECTING') {
            this.updateCollecting();
        }

        // Rotation
        this.rotation += this.rotationSpeed;

        // Pulsing glow
        this.glowIntensity = sin(frameCount * 0.2) * 0.5 + 0.5;
    }

    updateFlying() {
        // Apply gravity
        this.vy += this.gravity;

        // Update position
        this.x += this.vx;
        this.y += this.vy;

        // Check for bounce
        if (this.y >= this.groundY && this.vy > 0) {
            this.y = this.groundY;
            this.vy *= -this.bounce; // Reverse and dampen
            this.vx *= 0.8; // Slow down horizontal movement
            this.bounceCount++;

            // Play bounce sound (quiet)
            if (window.Sounds && this.bounceCount <= this.maxBounces) {
                // Play a subtle bounce sound
                window.Sounds.play('click', 0.1);
            }

            // After max bounces, transition to collecting
            if (this.bounceCount >= this.maxBounces) {
                this.state = 'COLLECTING';
                this.collectTimer = 0;

                // Play collection start sound
                if (window.Sounds) {
                    window.Sounds.play('build', 0.3);
                }
            }
        }

        // Air resistance
        this.vx *= 0.99;
    }

    updateCollecting() {
        this.collectTimer++;

        // Ease towards gold UI
        let progress = this.collectTimer / this.collectDuration;
        // Ease-out cubic
        let easeProgress = 1 - Math.pow(1 - progress, 3);

        // Interpolate position
        let startX = this.x;
        let startY = this.y;
        this.x = lerp(startX, this.targetX, easeProgress);
        this.y = lerp(startY, this.targetY, easeProgress);

        // Speed up as it gets closer
        if (progress > 0.3) {
            let dx = this.targetX - this.x;
            let dy = this.targetY - this.y;
            this.x += dx * 0.15;
            this.y += dy * 0.15;
        }

        // Check if reached target
        let distToTarget = dist(this.x, this.y, this.targetX, this.targetY);
        if (distToTarget < 10 || this.collectTimer >= this.collectDuration) {
            this.collect();
        }
    }

    collect() {
        this.state = 'COLLECTED';
        this.active = false;

        // Add gold to player
        if (Game.instance) {
            Game.instance.addGold(this.value);
        }

        // Play collection sound (reduced volume by 25%)
        if (window.Sounds) {
            window.Sounds.play('upgrade', 0.375);
        }

        // Spawn small sparkle particles at gold UI
        if (Game.instance) {
            for (let i = 0; i < 5; i++) {
                let sparkle = {
                    x: this.targetX,
                    y: this.targetY,
                    vx: random(-2, 2),
                    vy: random(-2, 2),
                    life: 20,
                    maxLife: 20,
                    color: color(255, 215, 0, 200)
                };
                Game.instance.spawnParticles(sparkle.x, sparkle.y, 1, sparkle.color);
            }
        }
    }

    draw() {
        if (!this.active) return;

        push();

        // Draw trail
        this.drawTrail();

        // Draw coin
        this.drawCoin();

        pop();
    }

    drawTrail() {
        if (this.trail.length < 2) return;

        noFill();
        for (let i = 0; i < this.trail.length - 1; i++) {
            let alpha = map(i, 0, this.trail.length - 1, 0, 150);
            let thickness = map(i, 0, this.trail.length - 1, 1, 3);

            stroke(255, 215, 0, alpha);
            strokeWeight(thickness);

            let p1 = this.trail[i];
            let p2 = this.trail[i + 1];
            line(p1.x, p1.y, p2.x, p2.y);
        }
    }

    drawCoin() {
        push();
        translate(this.x, this.y);
        rotate(this.rotation);

        // Glow effect
        if (this.state === 'COLLECTING') {
            let glowSize = this.size + 8;
            fill(255, 215, 0, 50 + this.glowIntensity * 100);
            noStroke();
            ellipse(0, 0, glowSize, glowSize);
        }

        // Outer ring (darker gold)
        fill(180, 140, 0);
        stroke(140, 100, 0);
        strokeWeight(2);
        ellipse(0, 0, this.size, this.size);

        // Inner circle (bright gold)
        fill(255, 215, 0);
        noStroke();
        ellipse(0, 0, this.size * 0.7, this.size * 0.7);

        // Shine/highlight
        fill(255, 255, 200, 180);
        ellipse(-this.size * 0.15, -this.size * 0.15, this.size * 0.3, this.size * 0.3);

        // Symbol (dollar sign or coin pattern)
        fill(180, 140, 0);
        textAlign(CENTER, CENTER);
        textSize(this.size * 0.6);
        textStyle(BOLD);
        text('$', 0, 0);

        pop();
    }

    // Check if coin should be removed
    shouldRemove() {
        return !this.active;
    }
}
