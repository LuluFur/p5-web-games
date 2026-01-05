class Goblin extends Enemy {
    constructor(path, speed = 4, health = 35) {
        super(path, speed, health);
        this.goldValue = 8;
    }

    draw() {
        if (!this.active && this.state !== 'DYING') return;

        let cx = this.x;
        let cy = this.y;

        // Shadow
        if (!this.isPreview && this.state !== 'DYING') {
            fill(0, 50);
            noStroke();
            ellipse(cx, cy + 28, 40, 15);
        }

        // Summoning Circle (SPAWN ONLY)
        if (this.state === 'SPAWNING') {
            push();
            noFill();
            stroke(50, 200, 50, 200); // Green tint for goblin
            strokeWeight(3);
            let time = frameCount * 0.1;
            translate(cx, cy + 25);
            rotate(time);
            ellipse(0, 0, 50, 20);
            rotate(-time * 2);
            strokeWeight(1);
            rectMode(CENTER);
            rect(0, 0, 30, 30);
            pop();
        }

        let imgKey;
        let frameIndex;

        // Calculate Direction Key
        let dirKey = 's';
        if (this.facingAngle !== undefined) {
            dirKey = this.getDirectionCode(this.facingAngle);
        }

        // DETERMINE ANIMATION BASED ON STATE
        if (this.state === 'SPAWNING') {
            // Breathing Idle (4 Frames) - looped
            frameIndex = floor(frameCount / 10) % 4;
            imgKey = `g_spawn_${dirKey}_${frameIndex}`;
        } else if (this.state === 'DYING') {
            // Death (7 Frames)
            let totalDeathFrames = 7;
            let tickPerFrame = 10;
            let passed = (70 - this.stateTimer);
            frameIndex = floor(passed / tickPerFrame);
            if (frameIndex >= totalDeathFrames) frameIndex = totalDeathFrames - 1;
            imgKey = `g_death_${dirKey}_${frameIndex}`;
        } else {
            // WALKING
            // Determine Scary vs Normal (same logic as zombie)
            if (!Game.instance || !Game.instance.grid) {
                frameIndex = floor(frameCount / 10) % 6;
                imgKey = `g_walk_${dirKey}_${frameIndex}`;
            } else {
                let grid = Game.instance.grid;
                let col = Math.floor(this.x / 64);
                let isScary = (col >= 3 && col < grid.cols - 3);

                if (isScary) {
                    frameIndex = floor(frameCount / 10) % 8;
                    imgKey = `g_scary_${dirKey}_${frameIndex}`;
                } else {
                    frameIndex = floor(frameCount / 10) % 6;
                    imgKey = `g_walk_${dirKey}_${frameIndex}`;
                }
            }
        }

        let img = Assets.getImage(imgKey);

        // Fallback checks
        if (!img) {
            // Try fallback to East if specific dir missing
            imgKey = imgKey.replace(`_${dirKey}_`, '_e_');
            img = Assets.getImage(imgKey);
        }
        // Final fallback
        if (!img && this.state === 'WALK') img = Assets.getImage('goblin');

        if (img) {
            push();
            translate(cx, cy);
            imageMode(CENTER);
            image(img, 0, 0, 64, 64);
            pop();
        } else {
            // Basic Shape fallback
            fill(this.state === 'SPAWNING' ? 200 : (this.state === 'DYING' ? 50 : 60), 160, 60);
            ellipse(cx, cy, 30);
        }

        // Health Bar (Only if damaged and not dead)
        if (this.state !== 'DYING' && this.hasBeenDamaged && this.healthBar) {
            this.healthBar.draw();
        }
    }

    getDirectionCode(angle) {
        let deg = degrees(angle);
        if (deg < 0) deg += 360;
        let ticks = floor((deg + 22.5) / 45) % 8;
        const codes = ['e', 'se', 's', 'sw', 'w', 'nw', 'n', 'ne'];
        return codes[ticks];
    }
}
