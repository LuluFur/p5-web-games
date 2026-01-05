class HealthBar {
    constructor(entity, width = 30, height = 5, yOffset = -25) {
        this.entity = entity;
        this.width = width;
        this.height = height;
        this.yOffset = yOffset;
    }

    draw() {
        if (!this.entity.active) return;

        let cx = this.entity.x;
        let cy = this.entity.y + this.yOffset;

        // Background (Gray)
        fill(100);
        noStroke();
        rect(cx - this.width / 2, cy, this.width, this.height);

        // Foreground (Green -> Red)
        // Ensure ratio is clamped between 0 and 1
        let ratio = this.entity.health / this.entity.maxHealth;
        ratio = constrain(ratio, 0, 1);

        fill(0, 255, 0); // Green
        // Optional: Change color based on health?
        if (ratio < 0.3) fill(255, 0, 0);
        else if (ratio < 0.6) fill(255, 165, 0);

        rect(cx - this.width / 2, cy, this.width * ratio, this.height);
    }
}
