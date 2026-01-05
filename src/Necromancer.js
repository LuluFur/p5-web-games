class Necromancer extends Enemy {
    constructor(path, speed = 1.0, health = 800) {
        super(path, speed, health);
        this.summonCooldown = 240; // 4 seconds
        this.summonTimer = this.summonCooldown;
        this.color = color(75, 0, 130); // Indigo
    }

    update() {
        super.update();
        if (!this.active || this.state === 'DYING' || this.state === 'SPAWNING') return;

        // Summon Logic
        this.summonTimer--;
        if (this.summonTimer <= 0) {
            this.summonSkeletons();
            this.summonTimer = this.summonCooldown;
        }
    }

    summonSkeletons() {
        if (!Game.instance) return;

        console.log("Necromancer raising the dead!");

        // Visual Effect
        Game.instance.spawnParticles(this.x, this.y, 15, color(100, 255, 100)); // Green Necro/Fel fire

        // Summon 3 Skeletons
        for (let i = 0; i < 3; i++) {
            let offsetR = random(-20, 20);
            let offsetC = random(-20, 20);

            // Create Skeleton
            // Inherit path and index
            let skel = new Skeleton(this.path, 2.5, 60); // Fast, weak
            skel.x = this.x + offsetR;
            skel.y = this.y + offsetC;
            skel.pathIndex = this.pathIndex;
            skel.state = 'WALK';
            skel.active = true;

            Game.instance.enemies.push(skel);
        }

        if (window.Sounds) window.Sounds.play('shoot'); // Placeholder sound
    }

    draw() {
        if (!this.active && this.state !== 'DYING') return;

        let cx = this.x;
        let cy = this.y;

        // Boss Aura or Shadow
        if (!this.isPreview) {
            push();
            noFill();
            stroke(75, 0, 130, 150);
            strokeWeight(3);
            ellipse(cx, cy + 30, 60, 20);
            pop();
        }

        push();
        translate(cx, cy);

        // Bobbing
        let bob = sin(frameCount * 0.05) * 3;
        translate(0, bob);

        // Scale up (Boss size)
        scale(1.3);

        // Robes
        fill(48, 25, 52); // Dark Purple
        noStroke();

        beginShape();
        vertex(0, -25); // Head top
        bezierVertex(-20, -10, -30, 20, -25, 35); // Left robe
        vertex(0, 30); // Bottom
        bezierVertex(25, 35, 30, 20, 20, -10); // Right robe
        endShape(CLOSE);

        // Trim
        stroke(138, 43, 226); // BlueViolet
        strokeWeight(2);
        line(-15, -10, -15, 35);
        line(15, -10, 15, 35);
        noStroke();

        // Hood / Head
        fill(30, 30, 30); // Shadowy face
        ellipse(0, -20, 25, 25);

        // Eyes
        fill(50, 255, 50); // Glowing Green Eyes
        ellipse(-5, -20, 4, 4);
        ellipse(5, -20, 4, 4);

        // Staff
        stroke(100, 50, 0);
        strokeWeight(3);
        line(20, -10, 20, 30); // Staff shaft

        // Gem on staff
        noStroke();
        fill(100, 255, 100);
        ellipse(20, -15, 8, 10);

        // Pulse effect on gem
        if (frameCount % 60 < 30) {
            noFill();
            stroke(100, 255, 100, 100);
            strokeWeight(1);
            ellipse(20, -15, 15, 18);
        }

        pop();

        if (this.hasBeenDamaged && this.healthBar) this.healthBar.draw();
    }
}
