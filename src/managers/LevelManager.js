// LevelManager.js - Manages level progression, unlocking, and terrain-based levels
class LevelManager {
    constructor(game) {
        this.game = game;

        // Level progression tracking
        this.currentLevel = 1;
        this.maxUnlockedLevel = 1;
        this.currentLevelData = null;
        this.wavesCompletedPerLevel = {}; // Track waves completed for each level

        // Load saved progress from localStorage
        this.loadProgress();

        console.log("LevelManager: Initialized");
    }

    /**
     * Get level data by ID
     * @param {number} levelId - Level ID to get
     * @returns {object} Level data object
     */
    getLevelData(levelId) {
        // Find level data by ID
        for (let key in LEVEL_DATA) {
            if (LEVEL_DATA[key].id === levelId) {
                return LEVEL_DATA[key];
            }
        }
        return null;
    }

    /**
     * Load a level and apply its terrain
     * @param {number} levelId - Level ID to load
     * @returns {boolean} Success
     */
    loadLevel(levelId) {
        let levelData = this.getLevelData(levelId);

        if (!levelData) {
            console.error(`LevelManager: Level ${levelId} not found!`);
            return false;
        }

        // Check unlock requirements
        if (levelData.unlockRequirement) {
            let req = levelData.unlockRequirement;
            let reqLevelWaves = this.wavesCompletedPerLevel[req.level] || 0;

            if (reqLevelWaves < req.wavesCompleted) {
                console.warn(`LevelManager: Level ${levelId} requires ${req.wavesCompleted} waves on Level ${req.level}`);
                return false;
            }
        }

        console.log(`LevelManager: Loading level ${levelId} - ${levelData.name}`);

        // Store current level data
        this.currentLevelData = levelData;
        this.currentLevel = levelId;

        // Load terrain into grid
        if (this.game.grid && levelData.terrain && levelData.terrain.length > 0) {
            this.game.grid.loadTerrain(levelData.terrain);
            console.log(`LevelManager: Terrain loaded for ${levelData.name}`);
        } else {
            console.log(`LevelManager: No terrain data for ${levelData.name} (using default grass)`);
        }

        // Set starting resources
        if (this.game.economyManager) {
            this.game.economyManager.gold = levelData.startingGold;
            this.game.economyManager.lives = levelData.startingLives;
        }

        return true;
    }

    /**
     * Get the list of enemy types allowed for the current level
     * Uses the current level's enemy list from LEVEL_DATA
     */
    getAvailableEnemies() {
        if (!this.currentLevelData) {
            // Fallback to old system if level data not loaded
            let availableEnemies = [];
            for (let level = 1; level <= this.currentLevel; level++) {
                let unlocks = LEVEL_CONSTANTS?.ENEMY_UNLOCKS?.[level];
                if (unlocks) {
                    availableEnemies = availableEnemies.concat(unlocks);
                }
            }
            return availableEnemies.length > 0 ? availableEnemies : ['zombie', 'skeleton', 'goblin'];
        }

        return this.currentLevelData.enemies || [];
    }

    /**
     * Get the newly unlocked enemies for the current level
     */
    getNewEnemiesForLevel() {
        if (!this.currentLevelData) {
            return LEVEL_CONSTANTS?.ENEMY_UNLOCKS?.[this.currentLevel] || [];
        }
        return this.currentLevelData.enemies || [];
    }

    /**
     * Check if level is complete and should advance
     * @param {number} currentWave - The current wave number
     */
    checkLevelComplete(currentWave) {
        let wavesPerLevel = LEVEL_CONSTANTS.WAVES_PER_LEVEL;

        if (currentWave >= wavesPerLevel) {
            return true;
        }

        return false;
    }

    /**
     * Complete current level and unlock next
     */
    completeLevel() {
        console.log(`LevelManager: Level ${this.currentLevel} completed!`);

        // Unlock next level
        if (this.currentLevel + 1 <= 5) {
            this.maxUnlockedLevel = Math.max(this.maxUnlockedLevel, this.currentLevel + 1);
        }

        // Save progress
        this.saveProgress();

        // Show level complete message
        if (typeof TEXT_ANIMATOR !== 'undefined') {
            TEXT_ANIMATOR.show(`LEVEL ${this.currentLevel} COMPLETE!`, width / 2, height / 2, 120, color(255, 215, 0));
        }
    }

    /**
     * Start a specific level
     * @param {number} level - Level to start
     */
    startLevel(level) {
        if (level > this.maxUnlockedLevel) {
            console.warn(`LevelManager: Level ${level} is not unlocked yet!`);
            return false;
        }

        this.currentLevel = level;
        console.log(`LevelManager: Starting Level ${level}`);

        // Return to PLAY state and reset game
        return true;
    }

    /**
     * Check if a level is unlocked
     * @param {number} level - Level to check
     */
    isLevelUnlocked(level) {
        return level <= this.maxUnlockedLevel;
    }

    /**
     * Record waves completed for a level
     * @param {number} levelId - Level ID
     * @param {number} wavesCompleted - Number of waves completed
     */
    recordWavesCompleted(levelId, wavesCompleted) {
        if (!this.wavesCompletedPerLevel[levelId] || wavesCompleted > this.wavesCompletedPerLevel[levelId]) {
            this.wavesCompletedPerLevel[levelId] = wavesCompleted;
            this.saveProgress();
        }
    }

    /**
     * Save progress to localStorage
     */
    saveProgress() {
        try {
            let progress = {
                maxUnlockedLevel: this.maxUnlockedLevel,
                wavesCompletedPerLevel: this.wavesCompletedPerLevel
            };
            localStorage.setItem('mergeDefence_progress', JSON.stringify(progress));
            console.log("LevelManager: Progress saved");
        } catch (e) {
            console.warn("LevelManager: Failed to save progress", e);
        }
    }

    /**
     * Load progress from localStorage
     */
    loadProgress() {
        try {
            let saved = localStorage.getItem('mergeDefence_progress');
            if (saved) {
                let progress = JSON.parse(saved);
                this.maxUnlockedLevel = progress.maxUnlockedLevel || 1;
                this.wavesCompletedPerLevel = progress.wavesCompletedPerLevel || {};
                console.log("LevelManager: Progress loaded", progress);
            }
        } catch (e) {
            console.warn("LevelManager: Failed to load progress", e);
        }
    }

    /**
     * Reset all progress (for testing)
     */
    resetProgress() {
        this.currentLevel = 1;
        this.maxUnlockedLevel = 1;
        this.saveProgress();
        console.log("LevelManager: Progress reset");
    }
}
