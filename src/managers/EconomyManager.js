// EconomyManager.js - Handles gold, lives, and economy logic
class EconomyManager {
    constructor(game) {
        this.game = game;
        this.gold = ECONOMY_CONSTANTS.STARTING_GOLD;
        this.lives = ECONOMY_CONSTANTS.STARTING_LIVES;
    }

    // Add gold (from kills, selling towers, etc.)
    addGold(amount) {
        this.gold += amount;

        // Track stats
        if (this.game.statsManager && amount > 0) {
            this.game.statsManager.recordGoldEarned(amount);
        }

        // Emit gold gain event
        if (amount > 0 && typeof EVENTS !== 'undefined') {
            EVENTS.emit(EVENT_NAMES.GOLD_GAIN, {
                amount: amount,
                total: this.gold
            });
        }
    }

    // Spend gold (returns true if successful)
    spendGold(amount) {
        if (this.gold >= amount) {
            this.gold -= amount;

            // Track stats
            if (this.game.statsManager) {
                this.game.statsManager.recordGoldSpent(amount);
            }

            // Emit gold spend event
            if (typeof EVENTS !== 'undefined') {
                EVENTS.emit(EVENT_NAMES.GOLD_SPEND, {
                    amount: amount,
                    remaining: this.gold
                });
            }

            return true;
        }
        return false;
    }

    // Reduce lives (damage from enemies reaching base)
    reduceLives(amount) {
        this.lives -= amount;

        // Track stats
        if (this.game.statsManager) {
            for (let i = 0; i < amount; i++) {
                this.game.statsManager.recordLifeLost();
            }
        }

        // Emit life lost event
        if (typeof EVENTS !== 'undefined') {
            EVENTS.emit(EVENT_NAMES.LIFE_LOST, {
                amount: amount,
                remaining: this.lives
            });
        }

        if (this.lives <= 0) {
            this.lives = 0;
            this.game.setState(GameState.GAMEOVER);

            // Emit game over event
            if (typeof EVENTS !== 'undefined') {
                EVENTS.emit(EVENT_NAMES.GAME_OVER, {
                    wave: this.game.wave || 0,
                    gold: this.gold
                });
            }

            console.log("GAME OVER");
        }
    }

    // Reset economy for new game
    reset() {
        this.gold = ECONOMY_CONSTANTS.STARTING_GOLD;
        this.lives = ECONOMY_CONSTANTS.STARTING_LIVES;
    }
}
