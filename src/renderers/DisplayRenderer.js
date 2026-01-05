// DisplayRenderer.js - Handles HUD, menus, and UI overlays
class DisplayRenderer {
    constructor(game) {
        this.game = game;
    }

    // Draw main menu
    drawMenu() {
        push();
        background(20, 20, 40);

        // Title
        fill(255, 215, 0);
        textAlign(CENTER, CENTER);
        textSize(56);
        textStyle(BOLD);
        text("MERGE DEFENCE", width / 2, 100);

        // Subtitle
        textSize(20);
        fill(200);
        textStyle(NORMAL);
        text("Defend your base from the undead!", width / 2, 160);

        // Level selection buttons
        this.drawLevelButtons();

        // Tutorial auto-runs on Level 1 only (can skip with ESC)

        // Instructions
        fill(150);
        textSize(14);
        text("Complete each level to unlock the next!", width / 2, height - 40);
        fill(100, 200, 255);
        textSize(12);
        text("Level 1 includes a tutorial (press ESC to skip)", width / 2, height - 20);

        pop();
    }

    drawLevelButtons() {
        let levelManager = this.game.levelManager;
        if (!levelManager) return;

        let btnW = 120;
        let btnH = 80;
        let spacing = 20;
        let startX = (width - (5 * btnW + 4 * spacing)) / 2;
        let startY = 250;

        for (let level = 1; level <= 5; level++) {
            let x = startX + (level - 1) * (btnW + spacing);
            let y = startY;

            let isUnlocked = levelManager.isLevelUnlocked(level);
            let isHovered = mouseX >= x && mouseX <= x + btnW &&
                           mouseY >= y && mouseY <= y + btnH;

            // Button background
            if (isUnlocked) {
                fill(isHovered ? 60 : 40);
                stroke(isHovered ? 255 : 150);
            } else {
                fill(20);
                stroke(60);
            }
            strokeWeight(3);
            rect(x, y, btnW, btnH, 10);

            // Lock icon for locked levels (draw first, in center)
            if (!isUnlocked) {
                this.drawLockIcon(x + btnW / 2, y + 35);
            } else {
                // Level number (only show when unlocked)
                noStroke();
                fill(255, 215, 0);
                textSize(32);
                textAlign(CENTER, CENTER);
                text(level, x + btnW / 2, y + 30);
            }

            // Level name
            fill(isUnlocked ? 200 : 60);
            textSize(12);
            let levelName = this.getLevelName(level);
            text(levelName, x + btnW / 2, y + 55);
        }
    }

    getLevelName(level) {
        const names = {
            1: "GRASSLANDS",
            2: "MARSHLANDS",
            3: "MOUNTAINS",
            4: "FROZEN WASTES",
            5: "VOLCANIC CRATER"
        };
        return names[level] || "UNKNOWN";
    }

    drawLockIcon(x, y) {
        push();
        fill(100, 100, 100);
        stroke(80);
        strokeWeight(2);

        // Lock body
        rect(x - 8, y, 16, 12, 2);

        // Lock shackle
        noFill();
        arc(x, y - 2, 10, 10, PI, TWO_PI);

        pop();
    }

    // Tutorial checkbox removed - tutorial now auto-runs on Level 1 only
    // Players can skip tutorial by pressing ESC

    // Draw pause menu
    drawPauseMenu() {
        push();

        // Dim background
        fill(0, 0, 0, 180);
        rect(0, 0, width, height);

        // Pause text
        fill(255, 215, 0);
        textAlign(CENTER, CENTER);
        textSize(56);
        textStyle(BOLD);
        text("PAUSED", width / 2, height / 2 - 100);

        // Menu box
        let boxW = 300;
        let boxH = 200;
        let boxX = (width - boxW) / 2;
        let boxY = height / 2 - 50;

        fill(30, 30, 50, 240);
        stroke(100, 150, 255);
        strokeWeight(3);
        rect(boxX, boxY, boxW, boxH, 15);

        // Buttons
        noStroke();
        textStyle(NORMAL);
        textSize(20);

        let btnY = boxY + 40;
        let btnH = 40;
        let btnSpacing = 20;

        // Resume button
        let resumeHover = mouseX >= boxX + 50 && mouseX <= boxX + boxW - 50 &&
                         mouseY >= btnY && mouseY <= btnY + btnH;
        fill(resumeHover ? 80 : 50);
        stroke(150);
        strokeWeight(2);
        rect(boxX + 50, btnY, boxW - 100, btnH, 8);
        fill(255);
        noStroke();
        text("Resume (ESC)", width / 2, btnY + btnH / 2);

        btnY += btnH + btnSpacing;

        // Restart button
        let restartHover = mouseX >= boxX + 50 && mouseX <= boxX + boxW - 50 &&
                          mouseY >= btnY && mouseY <= btnY + btnH;
        fill(restartHover ? 80 : 50);
        stroke(150);
        strokeWeight(2);
        rect(boxX + 50, btnY, boxW - 100, btnH, 8);
        fill(255);
        noStroke();
        text("Restart Level (R)", width / 2, btnY + btnH / 2);

        btnY += btnH + btnSpacing;

        // Main menu button
        let menuHover = mouseX >= boxX + 50 && mouseX <= boxX + boxW - 50 &&
                       mouseY >= btnY && mouseY <= btnY + btnH;
        fill(menuHover ? 80 : 50);
        stroke(150);
        strokeWeight(2);
        rect(boxX + 50, btnY, boxW - 100, btnH, 8);
        fill(255);
        noStroke();
        text("Main Menu (M)", width / 2, btnY + btnH / 2);

        pop();
    }

    // Draw level complete screen
    drawLevelComplete() {
        push();

        // Dim background
        fill(0, 0, 0, 200);
        rect(0, 0, width, height);

        let stats = this.game.statsManager ? this.game.statsManager.getSummary() : null;
        let level = this.game.levelManager ? this.game.levelManager.currentLevel : 1;

        // Title
        fill(255, 215, 0);
        textAlign(CENTER, CENTER);
        textSize(56);
        textStyle(BOLD);
        text(`LEVEL ${level} COMPLETE!`, width / 2, 100);

        // Star rating
        if (stats) {
            this.drawStars(width / 2, 180, stats.stars);
        }

        // Stats box
        let boxW = 500;
        let boxH = 350;
        let boxX = (width - boxW) / 2;
        let boxY = 250;

        fill(30, 30, 50, 240);
        stroke(255, 215, 0);
        strokeWeight(3);
        rect(boxX, boxY, boxW, boxH, 15);

        // Stats
        if (stats) {
            noStroke();
            fill(255);
            textStyle(NORMAL);
            textAlign(LEFT, TOP);
            textSize(20);

            let leftX = boxX + 40;
            let rightX = boxX + boxW / 2 + 20;
            let startY = boxY + 30;
            let lineH = 35;

            // Left column
            fill(150, 200, 255);
            text("Enemies Killed:", leftX, startY);
            fill(255);
            text(stats.enemiesKilled, leftX + 180, startY);

            fill(150, 200, 255);
            text("Waves Completed:", leftX, startY + lineH);
            fill(255);
            text(stats.wavesCompleted, leftX + 180, startY + lineH);

            fill(150, 200, 255);
            text("Towers Built:", leftX, startY + lineH * 2);
            fill(255);
            text(stats.towersBuilt, leftX + 180, startY + lineH * 2);

            fill(150, 200, 255);
            text("Perfect Waves:", leftX, startY + lineH * 3);
            fill(255);
            text(stats.perfectWaves, leftX + 180, startY + lineH * 3);

            fill(150, 200, 255);
            text("Lives Lost:", leftX, startY + lineH * 4);
            fill(255);
            text(stats.livesLost, leftX + 180, startY + lineH * 4);

            // Right column
            fill(150, 200, 255);
            text("Gold Earned:", rightX, startY);
            fill(255, 215, 0);
            text(stats.goldEarned, rightX + 150, startY);

            fill(150, 200, 255);
            text("Gold Spent:", rightX, startY + lineH);
            fill(200);
            text(stats.goldSpent, rightX + 150, startY + lineH);

            fill(150, 200, 255);
            text("Completion Time:", rightX, startY + lineH * 2);
            fill(255);
            text(stats.completionTime, rightX + 150, startY + lineH * 2);

            // Score (centered at bottom)
            textAlign(CENTER, TOP);
            textSize(32);
            fill(255, 215, 0);
            text(`SCORE: ${stats.score}`, width / 2, boxY + boxH - 60);
        }

        // Continue prompt
        textSize(18);
        fill(200);
        if (frameCount % 60 < 40) {
            text("Click to continue...", width / 2, height - 50);
        }

        pop();
    }

    // Draw star rating
    drawStars(x, y, stars) {
        push();
        let starSize = 50;
        let spacing = 70;
        let startX = x - (spacing * 1.5);

        for (let i = 0; i < 3; i++) {
            let sx = startX + i * spacing;
            if (i < stars) {
                fill(255, 215, 0);
            } else {
                fill(60, 60, 80);
            }
            noStroke();
            this.drawStar(sx, y, starSize / 2, starSize / 4, 5);
        }
        pop();
    }

    // Draw a star shape
    drawStar(x, y, radius1, radius2, npoints) {
        let angle = TWO_PI / npoints;
        let halfAngle = angle / 2.0;
        beginShape();
        for (let a = -PI / 2; a < TWO_PI - PI / 2; a += angle) {
            let sx = x + cos(a) * radius1;
            let sy = y + sin(a) * radius1;
            vertex(sx, sy);
            sx = x + cos(a + halfAngle) * radius2;
            sy = y + sin(a + halfAngle) * radius2;
            vertex(sx, sy);
        }
        endShape(CLOSE);
    }

    // Draw game over overlay
    drawGameOver() {
        push();

        // Dim background
        fill(0, 200);
        rect(0, 0, width, height);

        let stats = this.game.statsManager ? this.game.statsManager.getSummary() : null;

        // Title
        fill(255, 50, 50);
        textAlign(CENTER, CENTER);
        textSize(64);
        textStyle(BOLD);
        text("GAME OVER", width / 2, 100);

        // Stats box
        let boxW = 450;
        let boxH = 300;
        let boxX = (width - boxW) / 2;
        let boxY = 200;

        fill(30, 30, 50, 240);
        stroke(255, 50, 50);
        strokeWeight(3);
        rect(boxX, boxY, boxW, boxH, 15);

        // Stats
        if (stats) {
            noStroke();
            fill(255);
            textStyle(NORMAL);
            textAlign(CENTER, TOP);
            textSize(24);

            let startY = boxY + 30;
            let lineH = 40;

            fill(200);
            text(`Wave ${stats.wavesCompleted} Reached`, width / 2, startY);

            fill(150, 200, 255);
            textSize(20);
            text(`Enemies Defeated: ${stats.enemiesKilled}`, width / 2, startY + lineH);
            text(`Towers Built: ${stats.towersBuilt}`, width / 2, startY + lineH * 2);
            text(`Gold Earned: ${stats.goldEarned}`, width / 2, startY + lineH * 3);

            // Score
            textSize(28);
            fill(255, 215, 0);
            text(`SCORE: ${stats.score}`, width / 2, startY + lineH * 4.5);
        }

        // Restart hint (blinking)
        textSize(18);
        fill(200);
        textStyle(NORMAL);
        if (frameCount % 60 < 40) {
            text("Press R to Restart  |  M for Menu", width / 2, height - 50);
        }

        pop();
    }

    // Draw in-game HUD (legacy - UI.js handles most of this now)
    drawHUD() {
        let game = this.game;
        let waveManager = game.waveManager;

        push();
        fill(255);
        noStroke();
        textSize(24);
        textAlign(LEFT, TOP);

        // Gold
        fill(255, 215, 0);
        text(`Gold: ${game.gold}`, 20, 20);

        // Lives
        fill(255, 50, 50);
        text(`Lives: ${game.lives}`, 20, 50);

        // Wave
        fill(200);
        let wave = waveManager ? waveManager.wave : game.wave;
        let spawnQueue = waveManager ? waveManager.spawnQueue : game.spawnQueue;
        text(`Wave: ${wave}`, 20, 80);
        text(`Enemies: ${game.enemies.length + spawnQueue}`, 20, 110);

        pop();
    }

    // Draw wave start button
    drawWaveButton() {
        let waveManager = this.game.waveManager;
        if (waveManager && waveManager.waveActive) return;

        push();
        let btnX = width - 180;
        let btnY = height - 80;
        let btnW = 150;
        let btnH = 50;

        fill(0, 200, 0);
        rect(btnX, btnY, btnW, btnH, 10);

        fill(255);
        textAlign(CENTER, CENTER);
        textSize(20);
        text("START WAVE", btnX + btnW / 2, btnY + btnH / 2);
        pop();
    }

    // Check if wave button was clicked
    isWaveButtonClicked() {
        let waveManager = this.game.waveManager;
        if (waveManager && waveManager.waveActive) return false;

        let btnX = width - 180;
        let btnY = height - 80;
        let btnW = 150;
        let btnH = 50;

        return mouseX >= btnX && mouseX <= btnX + btnW &&
            mouseY >= btnY && mouseY <= btnY + btnH;
    }
}
