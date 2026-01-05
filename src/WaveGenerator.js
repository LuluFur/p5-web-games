// WaveGenerator.js - Dynamic wave generation with Flow State Balancing
// Uses a similar philosophy to tower DPS balancing:
// - Wave Threat Budget = Base * WaveScaling * FlowStateMultiplier
// - Enemy Threat = Health * SpeedFactor

class WaveGenerator {
    constructor() {
        // === ENEMY THREAT PROFILES ===
        // Threat = baseHealth * speedFactor
        // SpeedFactor increases threat for fast enemies (less time to kill)
        this.enemyProfiles = {
            'zombie': { baseHealth: 50, baseSpeed: 2.0, speedFactor: 1.0, tier: 1, weight: 30 },
            'skeleton': { baseHealth: 80, baseSpeed: 2.0, speedFactor: 1.0, tier: 1, weight: 20 },
            'vampire': { baseHealth: 200, baseSpeed: 1.5, speedFactor: 0.85, tier: 2, weight: 10 },
            'wraith': { baseHealth: 45, baseSpeed: 3.5, speedFactor: 1.4, tier: 2, weight: 15 },
            'goblin': { baseHealth: 35, baseSpeed: 4.0, speedFactor: 1.6, tier: 2, weight: 15 },
            'swarm': { baseHealth: 25, baseSpeed: 3.5, speedFactor: 1.5, tier: 2, weight: 25 },
            'golem': { baseHealth: 400, baseSpeed: 0.8, speedFactor: 0.7, tier: 3, weight: 5 },
            'ogre': { baseHealth: 450, baseSpeed: 1.0, speedFactor: 0.75, tier: 3, weight: 5 },
            'regenerator': { baseHealth: 120, baseSpeed: 1.5, speedFactor: 1.1, tier: 3, weight: 8 },
            'necromancer': { baseHealth: 800, baseSpeed: 0.5, speedFactor: 0.5, tier: 4, weight: 1 }
        };

        // === SCALING CONSTANTS ===
        // Similar to Tower: Base DPS = Cost * 0.5
        // Wave: Base Threat Budget = WaveNumber * 100
        this.baseWaveBudget = 100;
        this.budgetScalingExponent = 1.15; // Exponential scaling

        // === FLOW STATE PARAMETERS ===
        // Creates a sin wave rhythm: Intensity -> Calm -> Intensity
        // Period of 4 waves (peaks every 4th wave)
        this.flowPeriod = 4;
        this.flowAmplitude = 0.25; // ±25% variation
        this.flowPhaseOffset = 0;  // Start at mid-intensity
    }

    /**
     * Calculate the Flow State Multiplier for a given wave
     * Creates rhythm: HIGH -> low -> HIGH -> low
     * @param {number} waveNumber - Current wave (1-indexed)
     * @returns {number} Multiplier between (1 - amplitude) and (1 + amplitude)
     */
    getFlowStateMultiplier(waveNumber) {
        // Sin wave oscillates between -1 and 1
        // We want peaks on waves 4, 8, 12... (boss/intense waves)
        const phase = ((waveNumber - 1) / this.flowPeriod) * Math.PI * 2 + this.flowPhaseOffset;
        const sinValue = Math.sin(phase);

        // Map to range [1 - amplitude, 1 + amplitude]
        return 1 + (sinValue * this.flowAmplitude);
    }

    /**
     * Calculate the total threat budget for a wave
     * Formula: baseBudget * (waveNumber ^ scalingExponent) * flowMultiplier * ddaMultiplier
     * @param {number} waveNumber - Current wave (1-indexed)
     * @param {number} ddaMultiplier - Dynamic Difficulty Adjustment (default 1.0)
     * @returns {number} Total threat budget for the wave
     */
    calculateWaveBudget(waveNumber, ddaMultiplier = 1.0) {
        const flowMultiplier = this.getFlowStateMultiplier(waveNumber);
        const scaledBudget = this.baseWaveBudget * Math.pow(waveNumber, this.budgetScalingExponent);

        return Math.floor(scaledBudget * flowMultiplier * ddaMultiplier);
    }

    /**
     * Calculate the effective threat of an enemy type at a given wave
     * Threat = (baseHealth + waveScaling) * speedFactor
     * @param {string} enemyType - Enemy type key
     * @param {number} waveNumber - Current wave (1-indexed)
     * @returns {number} Effective threat value
     */
    calculateEnemyThreat(enemyType, waveNumber) {
        const profile = this.enemyProfiles[enemyType];
        if (!profile) return 100; // Default threat for unknown types

        // Health scales with wave (matches createEnemy in WaveManager)
        const scaledHealth = profile.baseHealth + (waveNumber * 8);

        // Apply speed factor (faster = more threatening)
        return Math.floor(scaledHealth * profile.speedFactor);
    }

    /**
     * Get available enemy types for a given wave based on tier unlocks
     * @param {number} waveNumber - Current wave (1-indexed)
     * @returns {string[]} Array of available enemy type keys
     */
    getAvailableEnemies(waveNumber) {
        // Tier unlock waves:
        // Tier 1: Waves 1+ (zombie, skeleton)
        // Tier 2: Waves 3+ (vampire, wraith, goblin, swarm)
        // Tier 3: Waves 8+ (golem, ogre, regenerator)
        // Tier 4: Wave 15+ (boss enemies)

        let maxTier = 1;
        if (waveNumber >= 3) maxTier = 2;
        if (waveNumber >= 8) maxTier = 3;
        if (waveNumber >= 15) maxTier = 4;

        return Object.entries(this.enemyProfiles)
            .filter(([_, profile]) => profile.tier <= maxTier)
            .map(([type, _]) => type);
    }

    /**
     * Generate a wave composition based on the budget
     * @param {number} waveNumber - Current wave (1-indexed)
     * @param {number} ddaMultiplier - DDA adjustment (default 1.0)
     * @returns {Object} Wave configuration { enemies: [], count: number, interval: number }
     */
    generateWave(waveNumber, ddaMultiplier = 1.0) {
        const budget = this.calculateWaveBudget(waveNumber, ddaMultiplier);
        const availableEnemies = this.getAvailableEnemies(waveNumber);

        // Build enemy pool with weighted selection
        const pool = [];
        let totalWeight = 0;

        for (const type of availableEnemies) {
            const profile = this.enemyProfiles[type];
            pool.push({ type, weight: profile.weight, threat: this.calculateEnemyThreat(type, waveNumber) });
            totalWeight += profile.weight;
        }

        // Fill the budget with enemies
        const selectedEnemies = [];
        let remainingBudget = budget;
        let iterations = 0;
        const maxIterations = 100; // Safety limit

        while (remainingBudget > 0 && iterations < maxIterations) {
            iterations++;

            // Weighted random selection
            let roll = Math.random() * totalWeight;
            let selected = null;

            for (const enemy of pool) {
                roll -= enemy.weight;
                if (roll <= 0) {
                    selected = enemy;
                    break;
                }
            }

            if (!selected) selected = pool[0];

            // Check if we can afford this enemy
            if (selected.threat <= remainingBudget) {
                selectedEnemies.push(selected.type);
                remainingBudget -= selected.threat;
            } else {
                // Find cheapest enemy we can afford
                const affordable = pool
                    .filter(e => e.threat <= remainingBudget)
                    .sort((a, b) => b.weight - a.weight);

                if (affordable.length > 0) {
                    selectedEnemies.push(affordable[0].type);
                    remainingBudget -= affordable[0].threat;
                } else {
                    // Can't afford anything, done
                    break;
                }
            }
        }

        // Calculate spawn interval based on enemy count and speed
        // More enemies = shorter intervals, faster enemies = slightly longer
        const avgSpeed = this.calculateAverageSpeed(selectedEnemies);
        const baseInterval = 60; // 1 second base
        const countFactor = Math.max(0.3, 1 - (selectedEnemies.length * 0.02)); // Lower for more enemies
        const speedFactor = Math.max(0.5, 2 - avgSpeed); // Slower spawn for fast enemies

        const interval = Math.max(10, Math.floor(baseInterval * countFactor * speedFactor));

        // Log generation details for debugging
        const flowMult = this.getFlowStateMultiplier(waveNumber);
        console.log(`Wave ${waveNumber} generated: Budget=${budget}, Flow=${flowMult.toFixed(2)}, ` +
            `Enemies=${selectedEnemies.length}, Interval=${interval}`);

        return {
            enemies: this.buildEnemyPool(selectedEnemies),
            count: selectedEnemies.length,
            interval: interval,
            budget: budget,
            flowMultiplier: flowMult
        };
    }

    /**
     * Build a compact enemy pool for the wave (removes duplicates, keeps distribution)
     * @param {string[]} enemies - Full list of selected enemies
     * @returns {string[]} Unique enemy types for random selection
     */
    buildEnemyPool(enemies) {
        // Count occurrences
        const counts = {};
        for (const type of enemies) {
            counts[type] = (counts[type] || 0) + 1;
        }

        // Build pool with proportional representation
        const pool = [];
        for (const [type, count] of Object.entries(counts)) {
            // Add proportionally (at least 1)
            const entries = Math.max(1, Math.floor(count / Math.max(1, enemies.length / 10)));
            for (let i = 0; i < entries; i++) {
                pool.push(type);
            }
        }

        return pool.length > 0 ? pool : ['zombie'];
    }

    /**
     * Calculate average speed of selected enemies
     * @param {string[]} enemies - List of enemy type keys
     * @returns {number} Average speed
     */
    calculateAverageSpeed(enemies) {
        if (enemies.length === 0) return 2.0;

        let totalSpeed = 0;
        for (const type of enemies) {
            const profile = this.enemyProfiles[type];
            totalSpeed += profile ? profile.baseSpeed : 2.0;
        }

        return totalSpeed / enemies.length;
    }

    /**
     * Preview wave statistics without generating
     * @param {number} waveNumber - Wave to preview
     * @returns {Object} Wave statistics
     */
    previewWave(waveNumber) {
        const flowMult = this.getFlowStateMultiplier(waveNumber);
        const budget = this.calculateWaveBudget(waveNumber);
        const availableEnemies = this.getAvailableEnemies(waveNumber);

        return {
            waveNumber,
            budget,
            flowMultiplier: flowMult,
            isIntenseWave: flowMult > 1.1,
            isCalmWave: flowMult < 0.9,
            availableEnemies
        };
    }
}

// Singleton instance
const WaveGen = new WaveGenerator();
