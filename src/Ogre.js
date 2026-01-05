class Ogre extends Enemy {
    constructor(path, speed = 1, health = 450) {
        super(path, speed, health); // Slower than normal
        this.color = color(100, 100, 120);
    }

    draw() {
        if (!this.active && this.state !== 'DYING') return;

        let cx = this.x;
        let cy = this.y;

        // Shadow
        if (!this.isPreview && this.state !== 'DYING') {
            fill(0, 60);
            noStroke();
            ellipse(cx, cy + 35, 60, 20);
        }

        push();
        translate(cx, cy);

        // Lumbar motion
        let sway = sin(frameCount * 0.05) * 5;
        rotate(radians(sway));

        // Legs (Sturdy)
        fill(80, 70, 60); // Pants
        noStroke();
        rect(-20, 10, 15, 30, 5);
        rect(5, 10, 15, 30, 5);

        // Body (Massive)
        fill(130, 120, 110); // Greyish Skin
        ellipse(0, 0, 60, 70); // Torso

        // Armor Plate
        fill(80);
        stroke(50);
        strokeWeight(2);
        rect(-15, -20, 30, 40, 5);

        // Head (Small visual relative to body)
        noStroke();
        fill(130, 120, 110);
        ellipse(0, -45, 30, 35);

        // Jaw/Tusks
        fill(230);
        triangle(-5, -35, -5, -45, 0, -35); // Wrong direction?
        // Tusks pointing up from lower jaw
        triangle(-8, -35, -5, -45, -2, -35);
        triangle(2, -35, 5, -45, 8, -35);

        // Eyes (Under brow)
        fill(0);
        rect(-10, -50, 20, 5); // Brow
        fill(255, 0, 0);
        ellipse(-5, -48, 3);
        ellipse(5, -48, 3);

        // Arms (Huge)
        fill(130, 120, 110);
        ellipse(-35, -10, 20, 50); // Left Arm
        ellipse(35, -10, 20, 50); // Right Arm

        // Club?
        fill(100, 50, 20);
        push();
        translate(35, 15);
        rotate(radians(-10));
        rect(-5, 0, 10, 40, 2); // Handle
        ellipse(0, 40, 20, 30); // Head
        pop();

        pop();

        if (!this.isPreview && this.state !== 'DYING' && this.hasBeenDamaged && this.healthBar) {
            this.healthBar.draw();
        }
    }
}
