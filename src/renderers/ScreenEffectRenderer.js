// ScreenEffectRenderer.js - Handles screen-wide visual effects
class ScreenEffectRenderer {
    constructor() {
        this.shake = 0;
        this.flashColor = null;
        this.flashAlpha = 0;
    }

    // Trigger screen shake
    triggerShake(amount) {
        this.shake = Math.max(this.shake, amount);
    }

    // Trigger screen flash (e.g., damage flash)
    triggerFlash(flashColor, duration = 10) {
        this.flashColor = flashColor;
        this.flashAlpha = duration;
    }

    // Apply shake transform (call before drawing game content)
    applyShake() {
        if (this.shake > 0) {
            let s = this.shake;
            translate(random(-s, s), random(-s, s));
            this.shake *= 0.9;
            if (this.shake < 0.5) this.shake = 0;
        }
    }

    // Draw screen flash overlay (call after drawing game content)
    drawFlash() {
        if (this.flashAlpha > 0 && this.flashColor) {
            push();
            noStroke();
            fill(red(this.flashColor), green(this.flashColor), blue(this.flashColor), this.flashAlpha * 10);
            rect(0, 0, width, height);
            pop();
            this.flashAlpha--;
        }
    }

    // Update effects (call in game update loop)
    update() {
        // Shake decay is handled in applyShake
        // Flash decay is handled in drawFlash
    }

    // Check if any effects are active
    get isActive() {
        return this.shake > 0 || this.flashAlpha > 0;
    }
}
