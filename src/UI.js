class UI {
    constructor(game) {
        this.game = game;

        // Button Configs
        this.btnHeight = 50;
        this.btnWidth = 160;
        this.padding = 20;

        this.menuRect = null; // For context menu interaction
    }

    draw() {
        // Draw Range Circle for Selected Tower
        if (this.game.selectedTower) {
            let t = this.game.selectedTower;
            let offset = this.game.grid.getGridOffset();

            let cx = offset.x + t.col * 64 + 32;
            let cy = offset.y + t.row * 64 + 32;
            let r = t.range * 64;

            push();
            noFill();
            stroke(255, 255, 255, 100);
            strokeWeight(2);
            ellipse(cx, cy, r * 2);
            pop();
        }

        this.drawTopBar();
        this.drawBottomBar();

        // XP-based auto-upgrade: No manual upgrade menu needed
        // if (this.game.selectedTower) {
        //     this.drawUpgradeMenu();
        // }

        this.drawMouseCursor();
    }

    drawTopBar() {
        let w = width;
        let h = 60;

        push();
        // Background
        fill(20, 20, 30, 230);
        noStroke();
        rect(0, 0, w, h);

        // Border bottom
        stroke(50, 50, 70);
        strokeWeight(2);
        line(0, h, w, h);

        // Stats
        noStroke();
        textAlign(LEFT, CENTER);
        textSize(24);
        let cy = h / 2;

        // Helper to check tutorial visibility
        let tutorial = this.game.tutorialManager;
        let isVisible = (id) => !tutorial || tutorial.isElementVisible(id);

        // Level indicator (always visible)
        if (this.game.levelManager) {
            fill(200, 150, 255);
            textSize(20);
            text(`Level ${this.game.levelManager.currentLevel}`, 700, cy);
        }

        // Gold (visible after intro)
        if (isVisible('gold')) {
            fill(255, 215, 0);
            text(`G: ${this.game.gold}`, 40, cy);
            // Register bounds for tutorial
            if (typeof UI_HELPER !== 'undefined') {
                UI_HELPER.registerElement('gold', { x: 30, y: 15, w: 130, h: 35 });
            }
        }

        // Lives (visible after intro)
        if (isVisible('lives')) {
            fill(255, 80, 80);
            text(`♥: ${this.game.lives}`, 200, cy);
            // Register bounds for tutorial
            if (typeof UI_HELPER !== 'undefined') {
                UI_HELPER.registerElement('lives', { x: 185, y: 15, w: 100, h: 35 });
            }
        }

        // Wave (visible after tower bar)
        if (isVisible('wave') || isVisible('wave_button')) {
            fill(100, 200, 255);
            text(`Wave: ${this.game.wave}`, 350, cy);

            // Enemies
            fill(200);
            textSize(18);
            text(`Enemies: ${this.game.enemies.length + this.game.spawnQueue}`, 500, cy);

            // Register bounds for tutorial
            if (typeof UI_HELPER !== 'undefined') {
                UI_HELPER.registerElement('wave', { x: 335, y: 15, w: 130, h: 35 });
            }
        }

        pop();
    }

    drawBottomBar() {
        if (this.game.state === 'DIALOGUE') return;

        let tutorial = this.game.tutorialManager;
        let isVisible = (id) => !tutorial || tutorial.isElementVisible(id);

        // Speed button (always visible during wave)
        if (this.game.waveActive) {
            let btnW = 140;
            let btnH = 50;
            let pad = 10;
            let speedX = width - btnW - pad;
            let speedY = height - btnH - pad;

            // Get current frame rate multiplier (default 1.0 = normal speed)
            let isSpeedUp = this.game.speedMultiplier && this.game.speedMultiplier > 1;
            let speedText = isSpeedUp ? "SPEED: 2X" : "SPEED: 1X";
            let baseColor = isSpeedUp ? color(255, 150, 0) : color(100, 100, 100);
            let hoverColor = isSpeedUp ? color(255, 180, 50) : color(130, 130, 130);

            this.drawButton(speedText, speedX, speedY, btnW, btnH, baseColor, hoverColor);
            return; // Don't show other buttons during wave
        }

        // 1. Right Side Controls (Start / Expand) - only show if wave_button unlocked
        if (isVisible('wave_button')) {
            let btnW = 140;
            let btnH = 50;
            let pad = 10;
            let startX = width - btnW - pad;
            let startY = height - btnH - pad;

            this.drawButton("START WAVE", startX, startY, btnW, btnH, color(0, 180, 0), color(0, 220, 0));

            // Register wave button bounds for tutorial
            if (typeof UI_HELPER !== 'undefined') {
                UI_HELPER.registerElement('wave_button', { x: startX, y: startY, w: btnW, h: btnH });
            }

            let expX = startX - btnW - pad;
            // Only show expand button if expansion is still possible
            if (this.game.grid.canExpand()) {
                let expCost = 200;
                let canAfford = this.game.gold >= expCost;
                let baseColor = canAfford ? color(30, 144, 255) : color(100);
                let hoverColor = canAfford ? color(60, 180, 255) : color(120);
                this.drawButton(`EXPAND (${expCost})`, expX, startY, btnW, btnH, baseColor, hoverColor);
            }
        }

        // 2. Spawn Tower Button - Rush Royale style!
        if (!isVisible('tower_bar')) return;

        let spawnCost = 75; // Base cost for spawning a tower
        let btnW = 200;
        let btnH = 60;
        let btnX = 20;
        let btnY = height - btnH - 10;

        // Register spawn button bounds for tutorial
        if (typeof UI_HELPER !== 'undefined') {
            UI_HELPER.registerElement('tower_bar', { x: btnX, y: btnY, w: btnW, h: btnH });
        }

        let canAfford = this.game.gold >= spawnCost;
        let isHover = mouseX >= btnX && mouseX <= btnX + btnW &&
                      mouseY >= btnY && mouseY <= btnY + btnH;

        // Animated glow effect
        let glowIntensity = sin(frameCount * 0.1) * 50 + 100;

        // Button background with glow
        if (canAfford) {
            // Glow
            fill(0, 255, 100, glowIntensity * 0.3);
            noStroke();
            rect(btnX - 4, btnY - 4, btnW + 8, btnH + 8, 12);

            // Main button
            fill(isHover ? 70 : 50);
            stroke(0, 255, 100);
            strokeWeight(3);
            rect(btnX, btnY, btnW, btnH, 10);
        } else {
            // Disabled state
            fill(30);
            stroke(80);
            strokeWeight(2);
            rect(btnX, btnY, btnW, btnH, 10);
        }

        // Button text
        noStroke();
        fill(canAfford ? 255 : 120);
        textAlign(CENTER, CENTER);
        textSize(20);
        textStyle(BOLD);
        text("SPAWN TOWER", btnX + btnW / 2, btnY + btnH / 2 - 8);

        // Cost
        textSize(16);
        fill(canAfford ? color(255, 215, 0) : color(100));
        text(`${spawnCost}G`, btnX + btnW / 2, btnY + btnH / 2 + 12);

        // Sparkle effect if affordable
        if (canAfford && frameCount % 10 === 0) {
            let sparkleX = btnX + random(btnW);
            let sparkleY = btnY + random(btnH);
            fill(255, 255, 100, 200);
            noStroke();
            ellipse(sparkleX, sparkleY, 3, 3);
        }
    }

    drawTowerIcon(x, y, size, type) {
        push();
        translate(x, y);
        scale(size / 64);

        // Consistent base structure for all towers
        let baseColor, accentColor, weaponType;

        switch (type) {
            case 'cannon':
                baseColor = color(100, 120, 100);  // Military green
                accentColor = color(60, 80, 60);
                weaponType = 'barrel';
                break;
            case 'double':
                baseColor = color(50, 80, 150);    // Blue uniform
                accentColor = color(30, 50, 100);
                weaponType = 'double_barrel';
                break;
            case 'sniper':
                baseColor = color(80, 60, 100);    // Purple/gray
                accentColor = color(50, 40, 70);
                weaponType = 'long_barrel';
                break;
            case 'flame':
                baseColor = color(180, 80, 40);    // Orange/brown
                accentColor = color(120, 50, 20);
                weaponType = 'flame';
                break;
            case 'electric':
                baseColor = color(40, 80, 120);    // Teal
                accentColor = color(20, 50, 80);
                weaponType = 'orb';
                break;
            case 'buffer':
                baseColor = color(200, 170, 50);   // Gold
                accentColor = color(140, 110, 30);
                weaponType = 'crystal';
                break;
            default:
                baseColor = color(100);
                accentColor = color(60);
                weaponType = 'barrel';
        }

        // Draw consistent tower base (all towers have same structure)
        noStroke();

        // Platform/base
        fill(accentColor);
        rect(12, 40, 40, 16, 3);

        // Tower body
        fill(baseColor);
        rect(18, 20, 28, 30, 4);

        // Highlight
        fill(red(baseColor) + 30, green(baseColor) + 30, blue(baseColor) + 30);
        rect(20, 22, 8, 26, 2);

        // Weapon based on type
        fill(60, 60, 70);
        if (weaponType === 'barrel') {
            // Single barrel cannon
            rect(28, 8, 8, 18);
            fill(40);
            rect(29, 6, 6, 6);
        } else if (weaponType === 'double_barrel') {
            // Double barrel
            rect(24, 10, 6, 16);
            rect(34, 10, 6, 16);
            fill(40);
            rect(25, 6, 4, 6);
            rect(35, 6, 4, 6);
        } else if (weaponType === 'long_barrel') {
            // Long sniper barrel
            rect(29, 2, 6, 24);
            fill(40);
            rect(27, 0, 10, 4);
        } else if (weaponType === 'flame') {
            // Flame nozzle with fire
            rect(28, 12, 8, 14);
            fill(255, 150, 0);
            ellipse(32, 8, 14, 14);
            fill(255, 220, 100);
            ellipse(32, 10, 8, 8);
        } else if (weaponType === 'orb') {
            // Electric orb
            fill(0, 200, 255);
            ellipse(32, 14, 18, 18);
            fill(150, 240, 255);
            ellipse(30, 12, 8, 8);
        } else if (weaponType === 'crystal') {
            // Buffer crystal
            fill(255, 215, 0);
            beginShape();
            vertex(32, 5);
            vertex(42, 22);
            vertex(32, 38);
            vertex(22, 22);
            endShape(CLOSE);
            fill(255, 255, 200);
            beginShape();
            vertex(32, 12);
            vertex(37, 22);
            vertex(32, 30);
            vertex(27, 22);
            endShape(CLOSE);
        }

        pop();
    }

    drawUpgradeMenu() {
        let t = this.game.selectedTower;
        if (!t) return;

        let menuW = 220; // Slightly wider for Evolve text
        let menuH = 180;
        // Position near the tower, but clamped to screen
        let tx = t.col * 64 + 32; // Center
        let ty = t.row * 64;

        // Center offset logic
        let gridW = this.game.grid.cols * 64;
        let gridH = this.game.grid.rows * 64;
        let offX = (width - gridW) / 2;
        let offY = (height - gridH) / 2;

        let sx = offX + tx + 40; // To the right of tower
        let sy = offY + ty - 50;

        // Evolve removed for new system, or strictly purely upgrades?
        // Let's assume linear upgrade for now as requested "Remove wood->stone progression"
        // But we can keep level up stats.
        let evo = null; // t.getEvolution ? t.getEvolution() : null; // Disabled for now

        // Clamp
        if (sx + menuW > width) sx = offX + tx - menuW - 40;
        if (sy + menuH > height) sy = height - menuH - 10;
        if (sy < 10) sy = 10;

        push();
        // Background
        fill(20, 20, 30, 240);
        stroke(100);
        strokeWeight(2);
        rect(sx, sy, menuW, menuH, 10);

        // Info
        noStroke();
        fill(255);
        textAlign(LEFT, TOP);
        textSize(18);
        textStyle(BOLD);
        text(t.type, sx + 15, sy + 15);

        textStyle(NORMAL);
        textSize(14);
        fill(200);
        text(`Level: ${t.level >= 5 ? 'MAX' : t.level + '/5'}`, sx + 15, sy + 40);
        text(`Dmg: ${t.damage}`, sx + 15, sy + 60);
        text(`Range: ${t.range}`, sx + 100, sy + 60);
        text(`Rate: ${(60 / t.fireRate).toFixed(1)}/s`, sx + 15, sy + 80);

        // Buttons
        let buttonText = "";
        let buttonCost = 0;
        let canAfford = false;
        let action = "NONE"; // UPGRADE, MAXED

        if (t.level >= 5) {
            buttonText = "MAX LEVEL";
            action = "MAXED";
        } else {
            let upCost = t.getUpgradeCost();
            buttonText = `UPGRADE (${upCost})`;
            buttonCost = upCost;
            canAfford = this.game.gold >= buttonCost;
            action = "UPGRADE";
        }

        // Draw Action Button
        if (action === "MAXED") {
            this.drawButton(buttonText, sx + 10, sy + 110, 200, 30, color(80), color(80));
        } else {
            this.drawButton(buttonText, sx + 10, sy + 110, 200, 30,
                canAfford ? color(0, 150, 0) : color(80, 80, 80),
                canAfford ? color(0, 200, 0) : color(80, 80, 80));
        }

        // Sell Button
        let sellText = `SELL (+${t.sellValue})`;
        this.drawButton(sellText, sx + 10, sy + 145, 180, 25, color(150, 50, 50), color(200, 50, 50));

        // Store visual rect for clicking
        this.menuRect = {
            x: sx,
            y: sy,
            w: menuW,
            h: menuH,
            action: action,
            cost: buttonCost
        };

        pop();
    }

    drawButton(label, x, y, w, h, baseCol, hoverCol) {
        let isHover = (mouseX >= x && mouseX <= x + w && mouseY >= y && mouseY <= y + h);

        push();
        fill(isHover ? hoverCol : baseCol);
        stroke(255, 255, 255, 100);
        strokeWeight(2);
        rect(x, y, w, h, 8); // Rounded

        // Text
        fill(255);
        noStroke();
        textAlign(CENTER, CENTER);
        textSize(18);
        textStyle(BOLD);
        text(label, x + w / 2, y + h / 2);
        pop();
    }

    // Check clicks
    handleClick() {
        // ... Check Upgrade Menu First if active
        if (this.game.selectedTower && this.menuRect) {
            let mx = mouseX;
            let my = mouseY;
            let r = this.menuRect;

            // Check if inside menu (to prevent clicking through to map)
            if (mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h) {

                // ACTION BUTTON CLICK (Upgrade / Evolve / Maxed)
                // Rect: x+10, y+110, 200, 30. (Width changed to 200 in drawUpgradeMenu)
                if (mx >= r.x + 10 && mx <= r.x + 210 && my >= r.y + 110 && my <= r.y + 140) {
                    if (r.action === 'MAXED') {
                        // Do nothing
                        console.log("Tower is Maxed");
                    } else {
                        if (this.game.spendGold(r.cost)) {
                            // Only Upgrade supported now
                            this.game.selectedTower.upgrade();
                        }
                    }
                }

                // SELL CLICK
                // Rect: x+10, y+145, 180, 25
                if (mx >= r.x + 10 && mx <= r.x + 190 && my >= r.y + 145 && my <= r.y + 170) {
                    let val = this.game.selectedTower.sellValue;
                    this.game.addGold(val);
                    // Remove from grid
                    let t = this.game.selectedTower;
                    this.game.grid.map[t.row][t.col] = 0;
                    this.game.selectedTower = null;
                }

                return true; // Handled
            }
        }

        // Speed button during wave
        if (this.game.waveActive) {
            let speedX = width - 150;
            let speedY = height - 60;
            if (this.isMouseIn(speedX, speedY, 140, 50)) {
                // Toggle speed
                if (!this.game.speedMultiplier || this.game.speedMultiplier === 1) {
                    this.game.speedMultiplier = 2;
                } else {
                    this.game.speedMultiplier = 1;
                }
                return true;
            }
            return false;
        }

        let startX = width - 150;
        let startY = height - 60;
        // Start Wave Check (Approx rects, matching drawBottomBar)
        if (this.isMouseIn(startX, startY, 140, 50)) {
            // JUICE: Wave start effect
            if (Game.instance) {
                let centerX = startX + 70;
                let centerY = startY + 25;
                // Green particle burst
                for (let i = 0; i < 30; i++) {
                    let particleColor = color(100, 255, 100, 200);
                    Game.instance.spawnParticles(centerX, centerY, 1, particleColor);
                }
                Game.instance.triggerShake(2);

                // Flash effect
                if (Game.instance.screenEffectRenderer) {
                    Game.instance.screenEffectRenderer.triggerFlash(color(100, 255, 100, 30), 5);
                }
            }

            // Play wave start sound
            if (window.Sounds) {
                window.Sounds.play('build', 0.8);
            }

            this.game.startWave();
            // Notify tutorial
            if (this.game.tutorialManager && this.game.tutorialManager.active) {
                this.game.tutorialManager.onAction('wave_started');
            }
            return true;
        }

        let expX = startX - 150;
        // Only allow clicking if expansion is still possible
        if (this.game.grid.canExpand()) {
            if (this.isMouseIn(expX, startY, 140, 50)) {
                // Check if player has enough gold
                if (this.game.economyManager.gold >= 200) {
                    // Try to expand
                    const expanded = this.game.grid.expandGrid();
                    if (expanded) {
                        // Only deduct gold if expansion succeeded
                        this.game.economyManager.spendGold(200);
                    } else {
                        // This shouldn't happen if canExpand() is correct, but handle it
                        console.warn("Expansion failed unexpectedly!");
                        this.game.grid.flashInvalidTile(this.game.grid.unlockStart, 10);
                    }
                } else {
                    console.log("Not enough gold to expand!");
                }
                return true;
            }
        }

        // SPAWN TOWER BUTTON CLICK
        let spawnCost = 75;
        let btnW = 200;
        let btnH = 60;
        let btnX = 20;
        let btnY = height - btnH - 10;

        if (this.isMouseIn(btnX, btnY, btnW, btnH)) {
            // JUICE: Button click effect
            if (Game.instance) {
                // Button click particles
                let centerX = btnX + btnW / 2;
                let centerY = btnY + btnH / 2;
                for (let i = 0; i < 20; i++) {
                    let particleColor = color(0, 255, 100, 200);
                    Game.instance.spawnParticles(centerX, centerY, 1, particleColor);
                }
                Game.instance.triggerShake(2);
            }

            // Play button click sound
            if (window.Sounds) {
                window.Sounds.play('click', 0.5);
            }

            // Try to spawn a random tower
            if (this.game.towerManager && this.game.towerManager.spawnRandomTower) {
                this.game.towerManager.spawnRandomTower(spawnCost);
            }
            return true;
        }

        return false;
    }

    isMouseIn(x, y, w, h) {
        return (mouseX >= x && mouseX <= x + w && mouseY >= y && mouseY <= y + h);
    }

    drawMouseCursor() {
        // Logic for custom cursor or build preview could go here
    }
}
