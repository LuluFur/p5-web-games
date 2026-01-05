// DebugRenderer.js - Handles debug overlay rendering
class DebugRenderer {
    constructor() {
        this.enabled = false;
    }

    toggle() {
        this.enabled = !this.enabled;
    }

    draw(gameData) {
        if (!this.enabled) return;

        push();
        fill(255);
        noStroke();
        textSize(14);
        textAlign(LEFT, TOP);

        let y = 10;
        const lineHeight = 18;

        text(`FPS: ${Math.floor(frameRate())}`, 10, y);
        y += lineHeight;

        if (gameData.enemies !== undefined) {
            text(`Enemies: ${gameData.enemies}`, 10, y);
            y += lineHeight;
        }

        if (gameData.towers !== undefined) {
            text(`Towers: ${gameData.towers}`, 10, y);
            y += lineHeight;
        }

        if (gameData.particles !== undefined) {
            text(`Particles: ${gameData.particles}`, 10, y);
            y += lineHeight;
        }

        if (gameData.projectiles !== undefined) {
            text(`Projectiles: ${gameData.projectiles}`, 10, y);
            y += lineHeight;
        }

        if (gameData.wave !== undefined) {
            text(`Wave: ${gameData.wave}`, 10, y);
            y += lineHeight;
        }

        if (gameData.gold !== undefined) {
            text(`Gold: ${gameData.gold}`, 10, y);
            y += lineHeight;
        }

        if (gameData.lives !== undefined) {
            text(`Lives: ${gameData.lives}`, 10, y);
        }

        pop();
    }
}
