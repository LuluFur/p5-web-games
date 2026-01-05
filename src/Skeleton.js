class Skeleton extends Enemy {
    constructor(path, speed = 2, health = 80) {
        super(path, speed, health);
        this.color = color(220); // Bone White
    }

    draw() {
        if (!this.active && this.state !== 'DYING') return;

        let cx = this.x;
        let cy = this.y;

        // Shadow
        if (!this.isPreview && this.state !== 'DYING') {
            fill(0, 50);
            noStroke();
            ellipse(cx, cy + 25, 30, 10);
        }

        let imgKey;
        let frameIndex;

        // Direction
        let dirKey = 's';
        if (this.facingAngle !== undefined) {
            dirKey = this.getDirectionCode(this.facingAngle);
        }

        if (this.state === 'DYING') {
            // Death (6 frames)
            let tickPerFrame = 10;
            let passed = (70 - this.stateTimer); // assuming 70 death timer
            frameIndex = floor(passed / tickPerFrame);
            if (frameIndex > 5) frameIndex = 5;
            imgKey = `s_death_${dirKey}_${frameIndex}`;
        } else if (this.state === 'SPAWNING') {
            // Spawning
            frameIndex = floor(frameCount / 10) % 6;
            imgKey = `s_spawn_${dirKey}_${frameIndex}`;
        } else {
            // Walk
            frameIndex = floor(frameCount / 10) % 6;
            imgKey = `s_walk_${dirKey}_${frameIndex}`;
        }

        let img = Assets.getImage(imgKey);
        // Fallback
        if (!img) {
            let sKey = imgKey.replace(`_${dirKey}_`, '_s_');
            img = Assets.getImage(sKey);
        }

        if (img) {
            push();
            translate(cx, cy);
            imageMode(CENTER);
            if (this.state === 'DYING') tint(255, 0, 0, 150);
            image(img, 0, 0, 64, 64);
            pop();
        } else {
            // Procedural Fallback (Bone White Circle)
            fill(220);
            ellipse(cx, cy, 30);
        }

        if (!this.isPreview && this.state !== 'DYING' && this.hasBeenDamaged && this.healthBar) {
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
