// WaveManager.js - Handles wave progression and enemy spawning
class WaveManager {
    constructor(game) {
        this.game = game;
        this.waveActive = false;
        this.wave = 1;
        this.waveIndex = 0;
        this.spawnQueue = 0;
        this.spawnTimer = 0;
        this.spawnInterval = 60;
        this.paths = [];

        // Dynamic Difficulty Adjustment (DDA) - Adaptive spawn speed based on player performance
        this.difficultyMultiplier = 1.0;       // Spawn speed multiplier (1.0 = normal, <1.0 = easier, >1.0 = harder)
        this.healthAtWaveStart = 0;            // Track health when wave started for difficulty calculation
        this.difficultyMultiplierMin = WAVE_CONSTANTS.DDA_MIN;  // -15% spawn speed (easier)
        this.difficultyMultiplierMax = WAVE_CONSTANTS.DDA_MAX;  // +15% spawn speed (harder)

        // Dynamic Wave Generation
        this.useDynamicWaves = true;    // Use WaveGenerator after scripted waves
        this.currentWaveConfig = null;  // Holds generated wave config
        this.currentEnemyPool = null;   // Enemy pool for spawning
    }

    // Start a new wave (may trigger dialogue first)
    startWave() {
        if (this.waveActive) return;

        // Check for level introduction dialogue (first wave of levels 2+)
        // Skip level 1 wave 1 since tutorial handles enemy introduction
        if (this.wave % LEVEL_CONSTANTS.WAVES_PER_LEVEL === 1 && this.wave > 1 && this.game.levelManager) {
            let newEnemies = this.game.levelManager.getNewEnemiesForLevel();
            if (newEnemies.length > 0) {
                // Show dialogue introducing new enemies
                let enemyNames = newEnemies.map(e => this.getEnemyDisplayName(e)).join(' and ');
                let dialogue = {
                    title: `LEVEL ${this.game.levelManager.currentLevel}`,
                    text: `New enemies discovered: {red}${enemyNames}{/red}!\nPrepare your defenses!`,
                    type: newEnemies[0]
                };
                if (this.game.dialogueManager) {
                    this.game.dialogueManager.start(dialogue);
                }
                return;
            }
        }

        // Check for wave-specific dialogue from WAVE_DIALOGUE
        if (typeof WAVE_DIALOGUE !== 'undefined' && WAVE_DIALOGUE[this.wave]) {
            if (this.game.dialogueManager) {
                this.game.dialogueManager.start(WAVE_DIALOGUE[this.wave]);
            }
            return;
        }

        // Generate informative dialogue for waves without explicit dialogue
        if (this.game.dialogueManager && this.wave % 5 === 0) {
            // Show dialogue every 5th wave for milestone waves
            let dialogue = this.generateWaveDialogue();
            if (dialogue) {
                this.game.dialogueManager.start(dialogue);
                return;
            }
        }

        this.internalStartWave();
    }

    // Get display name for enemy type
    getEnemyDisplayName(type) {
        const names = {
            'zombie': 'Zombies',
            'skeleton': 'Skeletons',
            'vampire': 'Vampires',
            'wraith': 'Wraiths',
            'goblin': 'Goblins',
            'swarm': 'Swarm',
            'golem': 'Golems',
            'regenerator': 'Regenerators',
            'ogre': 'Ogres',
            'necromancer': 'Necromancer',
            'ghost': 'Ghosts',
            'slime': 'Slimes',
            'wolf': 'Wolves'
        };
        return names[type] || type;
    }

    // Generate informative dialogue for waves
    generateWaveDialogue() {
        // Determine wave configuration
        let currentWaveData = WAVE_DATA[this.waveIndex];
        let enemyPool = [];
        let count = 0;
        let isDynamic = false;

        if (currentWaveData) {
            // Use scripted wave data
            enemyPool = currentWaveData.enemies;
            count = currentWaveData.count;
        } else if (this.useDynamicWaves && typeof WaveGen !== 'undefined') {
            // Preview dynamic wave
            let previewConfig = WaveGen.generateWave(this.wave, this.difficultyMultiplier);
            enemyPool = previewConfig.enemies;
            count = previewConfig.count;
            isDynamic = true;
        } else {
            return null; // No wave data available
        }

        // Count unique enemy types
        let enemyTypes = [...new Set(enemyPool)];
        let enemyCounts = {};
        for (let type of enemyPool) {
            enemyCounts[type] = (enemyCounts[type] || 0) + 1;
        }

        // Generate title
        let title = `WAVE ${this.wave}`;
        if (this.wave % 10 === 0) {
            title = `{gold}{pulse}WAVE ${this.wave}{/pulse}{/gold}`;
        }

        // Generate enemy composition text
        let compositionText = '';
        if (enemyTypes.length === 1) {
            // Single enemy type
            let type = enemyTypes[0];
            let displayName = this.getEnemyDisplayName(type);
            compositionText = `{orange}${count} ${displayName}{/orange}`;
        } else if (enemyTypes.length <= 3) {
            // Few enemy types - list them with counts
            let parts = enemyTypes.map(type => {
                let displayName = this.getEnemyDisplayName(type);
                let typeCount = Math.floor((enemyCounts[type] / enemyPool.length) * count);
                return `{cyan}${displayName}{/cyan}`;
            });
            compositionText = parts.join(', ');
        } else {
            // Many enemy types - just say mixed
            compositionText = `{red}${enemyTypes.length} different enemy types{/red}`;
        }

        // Generate description based on wave characteristics
        let description = '';
        if (count >= 40) {
            description = '\n{red}{shake}MASSIVE HORDE{/shake}{/red} incoming!';
        } else if (count >= 25) {
            description = '\n{orange}Large wave{/orange} detected!';
        } else if (enemyTypes.length >= 4) {
            description = '\n{purple}Mixed forces{/purple} approaching!';
        } else if (isDynamic) {
            description = '\nDynamically generated threat detected.';
        }

        // Add difficulty adjustment info
        if (this.difficultyMultiplier > 1.1) {
            description += '\n{red}[Difficulty increased - performing well!]{/red}';
        } else if (this.difficultyMultiplier < 0.9) {
            description += '\n{cyan}[Difficulty adjusted for balance]{/cyan}';
        }

        // Build final text
        let text = `Incoming: ${compositionText}\nTotal enemies: {gold}${count}{/gold}${description}`;

        // Choose a representative enemy sprite
        let visualType = enemyTypes[0] || 'zombie';

        return {
            title: title,
            text: text,
            type: visualType
        };
    }

    // Actually begin the wave (after dialogue if any)
    internalStartWave() {
        let grid = this.game.grid;
        let minR = grid.unlockStart;
        let maxR = grid.unlockEnd;
        let centerR = floor((minR + maxR) / 2);

        if (minR === undefined || maxR === undefined || isNaN(centerR)) {
            console.error("Grid unlock properties are undefined!");
            return;
        }

        let start = { r: centerR, c: 0 };
        let end = { r: centerR, c: grid.cols - 1 };

        if (grid.map[start.r][start.c] !== 0 || grid.map[end.r][end.c] !== 0) {
            console.log("Cannot start wave: Main entrances blocked!");
            return;
        }

        this.paths = Pathfinder.findMultiPaths(grid, start, end, 3);
        if (this.paths.length === 0) {
            console.log("Cannot start wave: No path to exit!");
            return;
        }

        // Determine wave configuration: scripted or dynamic
        let currentWaveData = WAVE_DATA[this.waveIndex];

        if (currentWaveData) {
            // Use scripted wave data
            this.spawnQueue = currentWaveData.count;
            this.currentEnemyPool = currentWaveData.enemies;
            this.currentWaveConfig = null;

            // Apply DDA to spawn interval
            let baseInterval = currentWaveData.interval;
            this.spawnInterval = Math.floor(baseInterval / this.difficultyMultiplier);
        } else if (this.useDynamicWaves && typeof WaveGen !== 'undefined') {
            // Generate dynamic wave using budget algorithm
            this.currentWaveConfig = WaveGen.generateWave(this.wave, this.difficultyMultiplier);
            this.spawnQueue = this.currentWaveConfig.count;
            this.currentEnemyPool = this.currentWaveConfig.enemies;
            this.spawnInterval = Math.floor(this.currentWaveConfig.interval / this.difficultyMultiplier);

            console.log(`Dynamic Wave ${this.wave}: Budget=${this.currentWaveConfig.budget}, ` +
                `Flow=${this.currentWaveConfig.flowMultiplier.toFixed(2)}, ` +
                `Enemies=${this.spawnQueue}, Pool=[${this.currentEnemyPool.join(', ')}]`);
        } else {
            // Fallback: simple scaling
            this.spawnQueue = 5 + (this.wave * 2);
            this.currentEnemyPool = ['zombie'];
            this.spawnInterval = Math.max(20, 60 - this.wave);
        }

        // Filter enemy pool based on level unlocks
        this.currentEnemyPool = this.filterEnemiesByLevel(this.currentEnemyPool);

        this.waveActive = true;
        this.healthAtWaveStart = this.game.economyManager.lives;

        // Emit wave start event
        if (typeof EVENTS !== 'undefined') {
            EVENTS.emit(EVENT_NAMES.WAVE_START, {
                wave: this.wave,
                enemyCount: this.spawnQueue,
                enemyTypes: this.currentEnemyPool,
                difficultyMultiplier: this.difficultyMultiplier
            });
        }

        // Trigger wave announcement using TextAnimator
        if (typeof TEXT_ANIMATOR !== 'undefined') {
            let messageText = `Wave ${this.wave} Starting...`;
            let animOptions = {
                size: 52,
                color: color(255, 255, 255),
                glowColor: color(255, 215, 0),
                letterDelay: 2,
                slideDistance: 40,
                slideSpeed: 12,
                readingSpeed: 4,
                soundType: 'text_announce',
                startDelay: 30,  // 0.5 second delay to separate from wave_start sound
                playDisappearSound: true  // Play sounds when letters disappear
            };

            // Calculate duration based on text length, then add the delay
            let duration = TextAnimator.calculateDuration(messageText, animOptions);
            duration += animOptions.startDelay; // Add delay to total duration

            TEXT_ANIMATOR.show(messageText, width / 2, height / 3, duration, animOptions);
        }

        console.log(`Wave ${this.wave}: ${this.spawnQueue} enemies, DDA: ${(this.difficultyMultiplier * 100).toFixed(0)}%`);
    }

    // Spawn a single enemy
    spawnEnemy() {
        let grid = this.game.grid;
        let minR = grid.unlockStart;
        let maxR = grid.unlockEnd;

        if (minR === undefined) minR = 0;
        if (maxR === undefined) maxR = grid.rows - 1;

        let validStarts = [];

        // Check columns 0, 1, 2
        for (let c = 0; c < 3; c++) {
            for (let r = minR; r <= maxR; r++) {
                if (grid.map[r][c] === 0) {
                    let cx = c * 64 + 32;
                    let cy = r * 64 + 32;
                    let occupied = false;

                    for (let e of this.game.enemies) {
                        if (dist(e.x, e.y, cx, cy) < 40) {
                            occupied = true;
                            break;
                        }
                    }

                    if (!occupied) {
                        validStarts.push({ r: r, c: c });
                    }
                }
            }
        }

        if (validStarts.length === 0) {
            return; // Skip spawn
        }

        let startNode = random(validStarts);
        let centerR = floor((minR + maxR) / 2);
        let endNode = { r: centerR, c: grid.cols - 1 };

        let path = Pathfinder.findPath(grid, startNode, endNode);

        if (path.length > 0) {
            // Use centralized enemy pool (works for both scripted and dynamic waves)
            let type = random(this.currentEnemyPool || ['zombie']);

            let enemy = this.createEnemy(type, path);

            // Add enemy via ObjectManager or directly
            if (this.game.objectManager) {
                this.game.objectManager.addEnemy(enemy);
            } else {
                this.game.enemies.push(enemy);
            }

            // Emit enemy spawn event
            if (typeof EVENTS !== 'undefined') {
                EVENTS.emit(EVENT_NAMES.ENEMY_SPAWN, {
                    type: type,
                    wave: this.wave,
                    remaining: this.spawnQueue
                });
            }
        }
    }

    // Factory method for creating enemies
    createEnemy(type, path) {
        switch (type) {
            case 'vampire':
                return new Vampire(path, 1.5, 225 + (this.wave * 22.5));
            case 'skeleton':
                return new Skeleton(path, 2.1, 120 + (this.wave * 12));
            case 'wraith':
                return new Wraith(path, 3.75, 60 + (this.wave * 6));
            case 'goblin':
                return new Goblin(path, 4.2, 52.5 + (this.wave * 6));
            case 'ogre':
                return new Ogre(path, 1.05, 675 + (this.wave * 60));
            // New enemy types
            case 'swarm':
                return new Swarm(path, 5.25 + (this.wave * 0.15), 37.5 + (this.wave * 4.5));
            case 'golem':
                return new Golem(path, 1.2, 600 + (this.wave * 45));
            case 'regenerator':
                return new Regenerator(path, 2.25, 180 + (this.wave * 15));
            default:
                return new Enemy(path, 3.0, 75 + (this.wave * 12));
        }
    }

    // Update wave logic (call in game loop)
    update() {
        if (!this.waveActive) return;

        // Spawn enemies
        if (this.spawnQueue > 0) {
            this.spawnTimer++;
            if (this.spawnTimer >= this.spawnInterval) {
                this.spawnEnemy();
                this.spawnQueue--;
                this.spawnTimer = 0;
            }
        }

        // Check wave completion
        if (this.spawnQueue <= 0 && this.game.enemies.length === 0) {
            this.waveActive = false;

            // Calculate DDA adjustment based on performance
            let currentHealth = this.game.economyManager.lives;
            let healthLost = this.healthAtWaveStart - currentHealth;
            let healthPercent = currentHealth / ECONOMY_CONSTANTS.STARTING_LIVES;

            if (healthPercent > 0.9) {
                // Crushing it - speed up slightly
                this.difficultyMultiplier = Math.min(this.difficultyMultiplierMax, this.difficultyMultiplier + 0.03);
                console.log('DDA: Player dominant, speeding up...');
            } else if (healthPercent < 0.4) {
                // Struggling - slow down and bonus gold
                this.difficultyMultiplier = Math.max(this.difficultyMultiplierMin, this.difficultyMultiplier - 0.05);
                let bonusGold = 25 + (this.wave * 5);
                this.game.economyManager.addGold(bonusGold);
                console.log(`DDA: Player struggling, slowing down. Bonus ${bonusGold}g!`);
            }

            let completedWave = this.wave;
            this.wave++;
            this.waveIndex++;

            // Emit wave complete event
            if (typeof EVENTS !== 'undefined') {
                EVENTS.emit(EVENT_NAMES.WAVE_COMPLETE, {
                    wave: completedWave,
                    healthLost: healthLost,
                    healthPercent: healthPercent,
                    difficultyMultiplier: this.difficultyMultiplier,
                    nextWave: this.wave
                });
            }

            // Expand grid every 3 waves
            if (this.wave % 3 === 0 && this.game.grid) {
                this.game.grid.expandGrid();
            }

            // Track wave completion
            if (this.game.statsManager) {
                this.game.statsManager.recordWaveComplete();
            }

            // Check for level completion
            if (this.game.levelManager) {
                let levelManager = this.game.levelManager;
                if (levelManager.checkLevelComplete(this.wave)) {
                    levelManager.completeLevel();

                    // Record level completion time
                    if (this.game.statsManager) {
                        this.game.statsManager.recordLevelComplete();
                    }

                    // Show level complete screen
                    this.game.setState(GameState.LEVEL_COMPLETE);
                }
            }

            console.log(`Wave ${completedWave} Complete!`);
        }
    }

    /**
     * Filter enemy pool based on level unlocks
     * Only allows enemies that have been unlocked in current or previous levels
     */
    filterEnemiesByLevel(enemyPool) {
        if (!this.game.levelManager) return enemyPool;

        let availableEnemies = this.game.levelManager.getAvailableEnemies();

        // Filter pool to only include unlocked enemies
        let filtered = enemyPool.filter(enemy => availableEnemies.includes(enemy));

        // If filtering removed all enemies, fallback to available enemies
        if (filtered.length === 0) {
            filtered = availableEnemies.slice(); // Copy array
        }

        // Log new enemies for this level
        let newEnemies = this.game.levelManager.getNewEnemiesForLevel();
        if (newEnemies.length > 0 && this.wave === 1) {
            console.log(`New enemies discovered: ${newEnemies.join(', ')}`);
        }

        return filtered;
    }

    // Draw paths (for debugging)
    drawPaths() {
        if (this.paths && this.paths.length > 0) {
            noFill();
            strokeWeight(4);

            this.paths.forEach((p, index) => {
                if (index === 0) stroke(255, 255, 0, 100);
                else if (index === 1) stroke(0, 255, 255, 100);
                else if (index === 2) stroke(255, 0, 255, 100);
                else stroke(255, 255, 255, 50);

                beginShape();
                noFill();
                for (let node of p) {
                    let x = node.c * 64 + 32;
                    let y = node.r * 64 + 32;
                    vertex(x, y);
                }
                endShape();
            });
        }
    }
}
