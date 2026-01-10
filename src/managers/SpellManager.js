// SpellManager.js - Handles active player spells (click to cast)
class SpellManager {
    constructor(game) {
        this.game = game;

        // Available spells
        this.spells = {
            slow: {
                name: 'Frost Field',
                cooldown: 1200,     // 20 seconds at 60fps
                currentCooldown: 0,
                duration: 180,      // 3 seconds
                radius: 100,
                effect: 0.5,        // 50% slow
                color: color(100, 200, 255),
                key: '1'
            },
            meteor: {
                name: 'Meteor',
                cooldown: 1800,     // 30 seconds
                currentCooldown: 0,
                damage: 200,
                radius: 80,
                color: color(255, 100, 50),
                key: '2'
            }
        };

        this.activeSpell = null;    // Currently selected spell for casting
        this.activeEffects = [];    // Active spell effects on the field
    }

    update() {
        // Update cooldowns
        for (let key in this.spells) {
            if (this.spells[key].currentCooldown > 0) {
                this.spells[key].currentCooldown--;
            }
        }

        // Update active effects
        for (let i = this.activeEffects.length - 1; i >= 0; i--) {
            let effect = this.activeEffects[i];
            effect.timer--;

            // Apply slow effect
            if (effect.type === 'slow') {
                for (let enemy of this.game.enemies) {
                    if (enemy.active && dist(enemy.x, enemy.y, effect.x, effect.y) < effect.radius) {
                        enemy.slowMultiplier = effect.effect;
                    }
                }
            }

            if (effect.timer <= 0) {
                // Remove slow from enemies when effect ends
                if (effect.type === 'slow') {
                    for (let enemy of this.game.enemies) {
                        enemy.slowMultiplier = 1;
                    }
                }
                this.activeEffects.splice(i, 1);
            }
        }
    }

    // Select a spell for casting
    selectSpell(spellKey) {
        if (this.spells[spellKey] && this.spells[spellKey].currentCooldown <= 0) {
            this.activeSpell = spellKey;
            console.log(`Selected spell: ${this.spells[spellKey].name}`);
            return true;
        }
        return false;
    }

    // Cast spell at location
    castAtLocation(x, y) {
        if (!this.activeSpell) return false;

        let spell = this.spells[this.activeSpell];
        if (spell.currentCooldown > 0) {
            this.activeSpell = null;
            return false;
        }

        // Cast the spell
        spell.currentCooldown = spell.cooldown;

        if (this.activeSpell === 'slow') {
            // Create slow field effect
            this.activeEffects.push({
                type: 'slow',
                x: x,
                y: y,
                radius: spell.radius,
                effect: spell.effect,
                timer: spell.duration,
                color: spell.color
            });

            // Visual feedback
            if (Game.instance) {
                Game.instance.spawnParticles(x, y, 20, spell.color);
                Game.instance.triggerShake(3);
            }
            if (typeof window.Sounds !== 'undefined') window.Sounds.play('freeze');
        }
        else if (this.activeSpell === 'meteor') {
            // Instant damage in area
            for (let enemy of this.game.enemies) {
                if (enemy.active && dist(enemy.x, enemy.y, x, y) < spell.radius) {
                    enemy.takeDamage(spell.damage);
                }
            }

            // Big visual feedback
            if (Game.instance) {
                Game.instance.spawnParticles(x, y, 30, spell.color);
                Game.instance.triggerShake(5);
            }
            if (typeof window.Sounds !== 'undefined') window.Sounds.play('explosion');

            // Add visual effect
            this.activeEffects.push({
                type: 'meteor_crater',
                x: x,
                y: y,
                radius: spell.radius,
                timer: 60,
                color: spell.color
            });
        }

        this.activeSpell = null;
        return true;
    }

    // Draw spell UI and effects
    draw() {
        // Draw active effects
        for (let effect of this.activeEffects) {
            push();
            noFill();

            if (effect.type === 'slow') {
                // Pulsing ice field
                let alpha = map(effect.timer, 0, 180, 50, 150);
                stroke(100, 200, 255, alpha);
                strokeWeight(3);
                ellipse(effect.x, effect.y, effect.radius * 2);

                // Inner frost
                fill(100, 200, 255, alpha / 2);
                noStroke();
                ellipse(effect.x, effect.y, effect.radius * 1.5);
            }
            else if (effect.type === 'meteor_crater') {
                // Fading crater
                let alpha = map(effect.timer, 0, 60, 0, 200);
                fill(50, 20, 10, alpha);
                stroke(255, 100, 50, alpha);
                strokeWeight(2);
                ellipse(effect.x, effect.y, effect.radius * 2);
            }

            pop();
        }

        // Draw spell casting cursor if spell selected
        if (this.activeSpell) {
            let spell = this.spells[this.activeSpell];
            push();
            noFill();
            stroke(spell.color);
            strokeWeight(2);

            // Show range circle at mouse
            ellipse(mouseX, mouseY, spell.radius * 2);

            // Pulsing effect
            let pulse = sin(frameCount * 0.2) * 10;
            stroke(red(spell.color), green(spell.color), blue(spell.color), 100);
            ellipse(mouseX, mouseY, spell.radius * 2 + pulse);

            pop();
        }

        // Draw spell buttons (bottom right)
        this.drawSpellButtons();
    }

    drawSpellButtons() {
        let startX = width - 150;
        let startY = height - 130;
        let btnSize = 50;
        let gap = 10;

        push();

        let i = 0;
        for (let key in this.spells) {
            let spell = this.spells[key];
            let x = startX + i * (btnSize + gap);
            let y = startY;

            let isReady = spell.currentCooldown <= 0;
            let isSelected = this.activeSpell === key;

            // Button background
            fill(isReady ? (isSelected ? 80 : 40) : 20);
            stroke(isSelected ? color(255, 215, 0) : 100);
            strokeWeight(isSelected ? 3 : 1);
            rect(x, y, btnSize, btnSize, 5);

            // Spell icon
            fill(isReady ? spell.color : color(60));
            noStroke();
            if (key === 'slow') {
                // Snowflake icon
                ellipse(x + btnSize / 2, y + btnSize / 2, 25);
            } else if (key === 'meteor') {
                // Fire icon
                triangle(x + btnSize / 2, y + 10, x + 15, y + 40, x + 35, y + 40);
            }

            // Cooldown overlay
            if (!isReady) {
                fill(0, 0, 0, 150);
                noStroke();
                rect(x, y, btnSize, btnSize, 5);

                // Cooldown text
                fill(255);
                textAlign(CENTER, CENTER);
                textSize(14);
                text(Math.ceil(spell.currentCooldown / 60) + 's', x + btnSize / 2, y + btnSize / 2);
            }

            // Key hint
            fill(200);
            textAlign(CENTER, TOP);
            textSize(10);
            text(spell.key, x + btnSize / 2, y + btnSize + 2);

            i++;
        }

        pop();
    }

    // Handle key press for spell selection
    handleKeyPress(key) {
        if (key === '1') {
            return this.selectSpell('slow');
        } else if (key === '2') {
            return this.selectSpell('meteor');
        }
        return false;
    }

    // Handle mouse click for spell casting
    handleClick(x, y) {
        if (this.activeSpell) {
            return this.castAtLocation(x, y);
        }

        // Check if clicking on spell buttons
        let startX = width - 150;
        let startY = height - 130;
        let btnSize = 50;
        let gap = 10;

        let i = 0;
        for (let key in this.spells) {
            let bx = startX + i * (btnSize + gap);
            let by = startY;

            if (x >= bx && x <= bx + btnSize && y >= by && y <= by + btnSize) {
                return this.selectSpell(key);
            }
            i++;
        }

        return false;
    }
}
