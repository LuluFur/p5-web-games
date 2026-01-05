const GameState = {
    MENU: 'MENU',
    PLAY: 'PLAY',
    GAMEOVER: 'GAMEOVER',
    DIALOGUE: 'DIALOGUE',
    PAUSED: 'PAUSED',
    LEVEL_COMPLETE: 'LEVEL_COMPLETE'
};

/**
 * Game - Main orchestrator class
 * Delegates all logic to specialized managers and renderers
 */
class Game {
    constructor() {
        if (Game.instance) return Game.instance;
        Game.instance = this;

        this.state = GameState.MENU;
        this.grid = null;
        this.speedMultiplier = 1; // 1 = normal speed, 2 = 2x speed

        console.log("Game: Instance created");
    }

    init() {
        console.log("Game: Initializing...");

        // Clean up previous event listeners to prevent memory leaks on restart
        if (window.EVENTS) {
            window.EVENTS.removeAllListeners();
            console.log("Game: Cleared all event listeners");
        }

        // Core grid
        this.grid = new Grid(9, 20, 64);

        // Initialize EventManager (global singleton)
        this.eventManager = window.EVENTS || new EventManager();

        // Initialize LevelManager (must be first to track progress)
        // Only create once to preserve level progress
        if (!this.levelManager) {
            this.levelManager = new LevelManager(this);
        }

        // Initialize all managers
        this.economyManager = new EconomyManager(this);
        this.statsManager = new StatsManager(this);
        this.objectManager = new ObjectManager(this);
        this.towerManager = new TowerManager(this);
        this.waveManager = new WaveManager(this);
        this.dialogueManager = new DialogueManager(this);
        this.inputManager = new InputManager(this);
        this.displayManager = new DisplayManager(this);
        this.tutorialManager = new TutorialManager(this);
        this.spellManager = new SpellManager(this);

        // Initialize all renderers
        this.screenEffectRenderer = new ScreenEffectRenderer();
        this.debugRenderer = new DebugRenderer();
        this.displayRenderer = new DisplayRenderer(this);
        this.spriteRenderer = new SpriteRenderer(this);

        // UI (existing class)
        this.ui = new UI(this);

        // NEW: Load the first level (or current level) with terrain
        if (this.levelManager) {
            let levelToLoad = this.levelManager.currentLevel || 1;
            this.levelManager.loadLevel(levelToLoad);
            console.log(`Game: Loaded level ${levelToLoad} with terrain`);
        }

        // Set initial state
        this.setState(GameState.PLAY);

        // Start tutorial on level 1 only (players can skip with ESC)
        if (this.tutorialManager && this.levelManager && this.levelManager.currentLevel === 1) {
            this.tutorialManager.start();
        }

        console.log("Game: All systems initialized");
    }

    // ═══════════════════════════════════════════════════════════════
    // STATE MANAGEMENT
    // ═══════════════════════════════════════════════════════════════

    setState(newState) {
        let oldState = this.state;
        this.state = newState;
        console.log(`Game: State changed to ${this.state}`);

        // Emit state change event
        if (typeof EVENTS !== 'undefined') {
            EVENTS.emit(EVENT_NAMES.STATE_CHANGE, {
                oldState: oldState,
                newState: newState
            });
        }

        if (this.state === GameState.GAMEOVER) {
            if (window.Sounds) window.Sounds.play('gameover');
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // MAIN GAME LOOP
    // ═══════════════════════════════════════════════════════════════

    update() {
        // Only update during active play (not paused, menu, gameover, or level complete)
        if (this.state !== GameState.PLAY && this.state !== GameState.DIALOGUE) return;

        // Run updates based on speed multiplier
        let updates = this.speedMultiplier || 1;
        for (let i = 0; i < updates; i++) {
            // Update wave spawning
            if (this.waveManager) {
                this.waveManager.update();
            }

            // Update all game objects
            if (this.objectManager) {
                this.objectManager.updateAll();
            }

            // Update spells
            if (this.spellManager) {
                this.spellManager.update();
            }
        }
    }

    draw() {
        // Clear UI element bounds at start of frame (for tutorial highlighting)
        if (typeof UI_HELPER !== 'undefined') {
            UI_HELPER.clearBounds();
        }

        if (this.state === GameState.MENU) {
            this.displayRenderer.drawMenu();
        } else if (this.state === GameState.PLAY || this.state === GameState.DIALOGUE) {
            this.drawPlay();
            if (this.state === GameState.DIALOGUE && this.dialogueManager) {
                this.dialogueManager.draw();
            }
        } else if (this.state === GameState.PAUSED) {
            this.drawPlay(); // Frozen background
            this.displayRenderer.drawPauseMenu();
        } else if (this.state === GameState.LEVEL_COMPLETE) {
            this.drawPlay(); // Frozen background
            this.displayRenderer.drawLevelComplete();
        } else if (this.state === GameState.GAMEOVER) {
            this.drawPlay(); // Frozen background
            this.displayRenderer.drawGameOver();
        }

        // Debug overlay
        if (this.debugRenderer) {
            this.debugRenderer.draw({
                enemies: this.objectManager ? this.objectManager.enemyCount : 0,
                towers: this.towerManager ? this.towerManager.getTowerCount() : 0,
                particles: this.objectManager ? this.objectManager.particleCount : 0,
                projectiles: this.objectManager ? this.objectManager.projectileCount : 0,
                wave: this.waveManager ? this.waveManager.wave : 0,
                gold: this.economyManager ? this.economyManager.gold : 0,
                lives: this.economyManager ? this.economyManager.lives : 0
            });
        }

        // Draw spell effects and UI
        if (this.spellManager) {
            this.spellManager.draw();
        }

        // Tutorial overlay (on top of everything)
        if (this.tutorialManager && this.tutorialManager.active) {
            this.tutorialManager.draw();
        }
    }

    drawPlay() {
        background(30);

        if (!this.grid) return;

        // Calculate grid offset for centering
        let offset = this.grid.getGridOffset();
        let offsetX = offset.x;
        let offsetY = offset.y;

        push();

        // Apply screen shake
        if (this.screenEffectRenderer) {
            this.screenEffectRenderer.applyShake();
        }

        translate(offsetX, offsetY);

        // Draw border
        noFill();
        stroke(100);
        strokeWeight(4);
        rect(-2, -2, offset.width + 4, offset.height + 4);

        // Draw grid tiles
        this.grid.draw();

        // Draw paths
        if (this.waveManager) {
            this.waveManager.drawPaths();
        }

        // Draw towers
        if (this.spriteRenderer) {
            this.spriteRenderer.drawTowers();
        }

        // Performance: Calculate visible bounds for culling
        let cullMargin = PERFORMANCE_CONSTANTS.OFFSCREEN_CULL_MARGIN;
        let visibleLeft = -offsetX - cullMargin;
        let visibleRight = -offsetX + width + cullMargin;
        let visibleTop = -offsetY - cullMargin;
        let visibleBottom = -offsetY + height + cullMargin;

        // Draw enemies (with off-screen culling)
        if (this.objectManager) {
            for (let e of this.objectManager.enemies) {
                // Only draw if on-screen
                if (e.x >= visibleLeft && e.x <= visibleRight &&
                    e.y >= visibleTop && e.y <= visibleBottom) {
                    e.draw();
                }
            }
        }

        // Draw projectiles (with off-screen culling)
        if (this.objectManager) {
            for (let p of this.objectManager.projectiles) {
                if (p.x >= visibleLeft && p.x <= visibleRight &&
                    p.y >= visibleTop && p.y <= visibleBottom) {
                    p.draw();
                }
            }
        }

        // Draw particles (with off-screen culling)
        if (this.objectManager) {
            for (let p of this.objectManager.particles) {
                if (p.x >= visibleLeft && p.x <= visibleRight &&
                    p.y >= visibleTop && p.y <= visibleBottom) {
                    p.draw();
                }
            }
        }

        pop();

        // Draw coin particles (outside grid offset, in screen space)
        if (this.objectManager) {
            for (let coin of this.objectManager.coins) {
                push();
                // Apply grid offset for coins that are still in grid space
                if (coin.state === 'FLYING') {
                    translate(offsetX, offsetY);
                }
                coin.draw();
                pop();
            }
        }

        // Draw screen flash
        if (this.screenEffectRenderer) {
            this.screenEffectRenderer.drawFlash();
        }

        // UI Overlay
        if (this.ui) this.ui.draw();

        // Draw animated text (wave announcements, etc.)
        if (typeof TEXT_ANIMATOR !== 'undefined') {
            TEXT_ANIMATOR.draw();
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // INPUT HANDLERS (Delegated to InputManager)
    // ═══════════════════════════════════════════════════════════════

    handleMousePressed() {
        if (this.inputManager) {
            this.inputManager.handleMousePressed();
        }
    }

    handleKeyPressed(key) {
        if (this.inputManager) {
            this.inputManager.handleKeyPressed(key);
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // CONVENIENCE GETTERS (Proxy to managers)
    // ═══════════════════════════════════════════════════════════════

    get gold() {
        return this.economyManager ? this.economyManager.gold : 0;
    }

    set gold(value) {
        if (this.economyManager) this.economyManager.gold = value;
    }

    get lives() {
        return this.economyManager ? this.economyManager.lives : 0;
    }

    set lives(value) {
        if (this.economyManager) this.economyManager.lives = value;
    }

    get wave() {
        return this.waveManager ? this.waveManager.wave : 1;
    }

    get waveActive() {
        return this.waveManager ? this.waveManager.waveActive : false;
    }

    get enemies() {
        return this.objectManager ? this.objectManager.enemies : [];
    }

    get projectiles() {
        return this.objectManager ? this.objectManager.projectiles : [];
    }

    get particles() {
        return this.objectManager ? this.objectManager.particles : [];
    }

    get selectedTower() {
        return this.towerManager ? this.towerManager.selectedTower : null;
    }

    set selectedTower(value) {
        if (this.towerManager) this.towerManager.selectedTower = value;
    }

    get selectedTowerType() {
        return this.towerManager ? this.towerManager.selectedTowerType : 'wood';
    }

    set selectedTowerType(value) {
        if (this.towerManager) this.towerManager.selectedTowerType = value;
    }

    get spawnQueue() {
        return this.waveManager ? this.waveManager.spawnQueue : 0;
    }

    // ═══════════════════════════════════════════════════════════════
    // CONVENIENCE METHODS (Proxy to managers)
    // ═══════════════════════════════════════════════════════════════

    addGold(amount) {
        if (this.economyManager) this.economyManager.addGold(amount);
    }

    spendGold(amount) {
        return this.economyManager ? this.economyManager.spendGold(amount) : false;
    }

    reduceLives(amount) {
        if (this.economyManager) this.economyManager.reduceLives(amount);
    }

    addProjectile(p) {
        if (this.objectManager) this.objectManager.addProjectile(p);
    }

    spawnParticles(x, y, count, color) {
        if (this.objectManager) this.objectManager.spawnParticles(x, y, count, color);
    }

    triggerShake(amount) {
        if (this.screenEffectRenderer) this.screenEffectRenderer.triggerShake(amount);
    }

    startWave() {
        if (this.waveManager) this.waveManager.startWave();
    }

    // ═══════════════════════════════════════════════════════════════
    // DEBUG (Disabled by default)
    // ═══════════════════════════════════════════════════════════════

    displayDebug() {
        // Now handled by DebugRenderer
    }
}
