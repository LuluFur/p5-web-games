// StatsManager.js - Tracks game statistics for scoring and achievements
class StatsManager {
    constructor(game) {
        this.game = game;
        this.reset();

        console.log("StatsManager: Initialized");
    }

    reset() {
        // Combat stats
        this.enemiesKilled = 0;
        this.enemiesKilledByType = {};
        this.damageDealt = 0;
        this.towersBuilt = 0;
        this.towersByType = {};

        // Economy stats
        this.goldEarned = 0;
        this.goldSpent = 0;
        this.livesLost = 0;

        // Wave stats
        this.wavesCompleted = 0;
        this.levelStartTime = Date.now();
        this.levelCompletionTime = 0;

        // Performance stats
        this.perfectWaves = 0; // Waves completed without losing lives
        this.lastWaveLivesLost = 0;
    }

    // ═══════════════════════════════════════════════════════════════
    // TRACKING METHODS
    // ═══════════════════════════════════════════════════════════════

    recordEnemyKilled(enemyType) {
        this.enemiesKilled++;
        if (!this.enemiesKilledByType[enemyType]) {
            this.enemiesKilledByType[enemyType] = 0;
        }
        this.enemiesKilledByType[enemyType]++;
    }

    recordDamage(amount) {
        this.damageDealt += amount;
    }

    recordTowerBuilt(towerType) {
        this.towersBuilt++;
        if (!this.towersByType[towerType]) {
            this.towersByType[towerType] = 0;
        }
        this.towersByType[towerType]++;
    }

    recordGoldEarned(amount) {
        this.goldEarned += amount;
    }

    recordGoldSpent(amount) {
        this.goldSpent += amount;
    }

    recordLifeLost() {
        this.livesLost++;
        this.lastWaveLivesLost++;
    }

    recordWaveComplete() {
        this.wavesCompleted++;

        // Check if perfect wave (no lives lost)
        if (this.lastWaveLivesLost === 0) {
            this.perfectWaves++;
        }

        this.lastWaveLivesLost = 0;
    }

    recordLevelComplete() {
        this.levelCompletionTime = Date.now() - this.levelStartTime;
    }

    // ═══════════════════════════════════════════════════════════════
    // RATING CALCULATIONS
    // ═══════════════════════════════════════════════════════════════

    /**
     * Calculate star rating (1-3 stars) based on performance
     * 3 stars: No lives lost + fast completion
     * 2 stars: Few lives lost
     * 1 star: Survived
     */
    calculateStarRating() {
        let lives = this.game.economyManager ? this.game.economyManager.lives : 20;
        let maxLives = ECONOMY_CONSTANTS.STARTING_LIVES;
        let livesPercent = lives / maxLives;

        // 3 stars: 100% health + high perfect wave ratio
        if (livesPercent === 1.0 && this.perfectWaves >= this.wavesCompleted * 0.8) {
            return 3;
        }

        // 2 stars: 70%+ health
        if (livesPercent >= 0.7) {
            return 2;
        }

        // 1 star: Survived
        return 1;
    }

    /**
     * Calculate score based on performance metrics
     */
    calculateScore() {
        let score = 0;

        // Base score from enemies killed
        score += this.enemiesKilled * 100;

        // Bonus for waves completed
        score += this.wavesCompleted * 500;

        // Bonus for lives remaining
        let lives = this.game.economyManager ? this.game.economyManager.lives : 0;
        score += lives * 250;

        // Bonus for perfect waves
        score += this.perfectWaves * 1000;

        // Bonus for gold efficiency (gold remaining)
        let gold = this.game.economyManager ? this.game.economyManager.gold : 0;
        score += gold * 2;

        return Math.floor(score);
    }

    // ═══════════════════════════════════════════════════════════════
    // GETTERS FOR UI
    // ═══════════════════════════════════════════════════════════════

    getCompletionTime() {
        let seconds = Math.floor(this.levelCompletionTime / 1000);
        let minutes = Math.floor(seconds / 60);
        seconds = seconds % 60;
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }

    getTopKilledEnemy() {
        let topEnemy = null;
        let topCount = 0;

        for (let [enemy, count] of Object.entries(this.enemiesKilledByType)) {
            if (count > topCount) {
                topCount = count;
                topEnemy = enemy;
            }
        }

        return { enemy: topEnemy, count: topCount };
    }

    getAccuracy() {
        // Calculate tower shot accuracy (could be enhanced with projectile tracking)
        // For now, simple estimate based on damage vs enemies
        return Math.min(100, Math.floor((this.enemiesKilled / Math.max(1, this.towersBuilt)) * 10));
    }

    getSummary() {
        return {
            enemiesKilled: this.enemiesKilled,
            wavesCompleted: this.wavesCompleted,
            towersBuilt: this.towersBuilt,
            livesLost: this.livesLost,
            goldEarned: this.goldEarned,
            goldSpent: this.goldSpent,
            perfectWaves: this.perfectWaves,
            completionTime: this.getCompletionTime(),
            stars: this.calculateStarRating(),
            score: this.calculateScore(),
            topEnemy: this.getTopKilledEnemy()
        };
    }
}
