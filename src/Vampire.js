class Vampire extends Enemy {
    constructor(path, speed = 1.5, health = 200) {
        super(path, speed, health);
        this.color = color(100, 0, 100); // Purple tint base
        this.summonCooldown = 300; // 5 seconds
        this.summonTimer = this.summonCooldown;
        this.stateTimer = 0;
    }

    update() {
        super.update();

        if (!this.active || this.state === 'DYING' || this.state === 'SPAWNING') return;

        // Custom Summon Logic
        if (this.state === 'SUMMONING') {
            this.stateTimer--;

            // Total Duration: 80 frames
            // 0..20: Crouch Down
            // 20..60: Hold (Channel)
            // 60..80: Stand Up

            // Time Elapsed (we count down from 80 to 0)
            let t = 80 - this.stateTimer;

            // Visual Effect: swirling particles during HOLD phase
            if (Game.instance && t >= 20 && t < 60 && frameCount % 5 === 0) {
                let angle = frameCount * 0.2;
                let r = 30;
                let px = this.x + Math.cos(angle) * r;
                let py = this.y + Math.sin(angle) * r;
                Game.instance.spawnParticles(px, py, 1, color(150, 50, 200));
            }

            // Spawn Event at end of Hold (start of Stand Up)
            if (t === 60) {
                this.summonZombies();
            }

            if (this.stateTimer <= 0) {
                this.state = 'WALK';
                this.summonTimer = this.summonCooldown;
            } else if (t === 1) { // Frame 1 of animation logic (t starts at 0, actually wait, t = 80 - stateTimer)
                // t goes from 0 to 80.
                // We want play once.
                // if (t === 1)
            }
            // Easier: just check stateTimer
            if (this.stateTimer === 79) {
                if (window.Sounds) window.Sounds.play('vampire_summon');
            }

            return; // Don't move while summoning
        }

        // Count down cd
        if (this.state === 'WALK') {
            this.summonTimer--;
            if (this.summonTimer <= 0) {
                this.state = 'SUMMONING';
                this.stateTimer = 80; // Total Anim Time
            }
        }
    }

    summonZombies() {
        if (!Game.instance) return;

        console.log("Vampire summoning minions!");

        // Spawn 2 zombies at current location
        for (let i = 0; i < 2; i++) {
            // Offset slightly so they don't stack perfectly
            let offset = (i === 0 ? -10 : 10);

            // Create new enemy
            // We need to pass the same path
            let minion = new Enemy(this.path, 2.5, 50); // Faster, weaker

            // Synch position
            minion.x = this.x + offset;
            minion.y = this.y + offset;
            minion.pathIndex = this.pathIndex;
            minion.state = 'WALK'; // Skip spawn anim
            minion.active = true;

            Game.instance.enemies.push(minion);

            // Juice
            Game.instance.spawnParticles(minion.x, minion.y, 10, color(50, 0, 50));
        }
    }

    draw() {
        if (!this.active && this.state !== 'DYING') return;

        // Aura
        if (!this.isPreview) {
            push();
            noFill();
            stroke(128, 0, 128, 100);
            strokeWeight(2);
            ellipse(this.x, this.y + 20, 50, 20);
            pop();
        }

        let imgKey;
        let frameIndex = 0;
        let dirKey = 's';
        if (this.facingAngle !== undefined) {
            dirKey = this.getDirectionCode(this.facingAngle);
        }

        if (this.state === 'SUMMONING') {
            // 3-Phase Animation
            let t = 80 - this.stateTimer; // 0 to 80

            if (t < 20) {
                // Phase 1: Crouch Down (0 -> 4)
                // 20 frames / 5 frames = 4 frames per sprite
                frameIndex = floor(map(t, 0, 20, 0, 5));
            } else if (t < 60) {
                // Phase 2: Hold (Last Frame)
                frameIndex = 4;
            } else {
                // Phase 3: Stand Up (4 -> 0)
                // t is 60->80.
                frameIndex = floor(map(t, 60, 80, 4, -1)); // Reverse
                if (frameIndex < 0) frameIndex = 0;
            }
            // Clamp
            if (frameIndex > 4) frameIndex = 4;
            if (frameIndex < 0) frameIndex = 0;

            imgKey = `v_crouch_${dirKey}_${frameIndex}`;

            // Channeling Bar logic (Optional, maybe specific to Hold phase?)
            if (t >= 20 && t < 60) {
                fill(0);
                rect(this.x - 20, this.y - 50, 40, 5);
                fill(150, 50, 250);
                let progress = (t - 20) / 40;
                rect(this.x - 20, this.y - 50, 40 * progress, 5);
            }

        } else if (this.state === 'WALK') {
            // Walk Animation (6 frames)
            frameIndex = floor(frameCount / 10) % 6;
            imgKey = `v_walk_${dirKey}_${frameIndex}`;
        } else {
            // Fallback
            imgKey = 'vampire';
        }

        let img = Assets.getImage(imgKey);
        if (!img) {
            // Fallback to south if key missing (since we only loaded south/south-east often)
            // But we loaded all for crouch. Check standard walk.
            if (imgKey.includes('_s_') || imgKey.includes('_se_')) {
                // Likely fine
            } else {
                // Try forcing south
                let sKey = imgKey.replace(`_${dirKey}_`, '_s_');
                if (Assets.getImage(sKey)) imgKey = sKey;
            }
            img = Assets.getImage(imgKey);
        }
        if (!img) img = Assets.getImage('vampire'); // Static fallback

        if (img) {
            push();
            translate(this.x, this.y);
            imageMode(CENTER);

            // Death Tint
            if (this.state === 'DYING') {
                tint(255, 0, 0, 100);
            }

            image(img, 0, 0, 80, 80);
            pop();
        } else {
            fill(128, 0, 128);
            ellipse(this.x, this.y, 40);
        }

        if (!this.isPreview && this.state !== 'DYING' && this.hasBeenDamaged && this.healthBar) {
            this.healthBar.draw();
        }
    }
}
