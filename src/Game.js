const GameState = {
    // RTS Game States
    MENU: 'MENU',                 // Main menu
    LOADING: 'LOADING',           // Asset loading with progress bar
    MAIN_MENU: 'MAIN_MENU',       // Main menu (New Game, Settings)
    SETTINGS: 'SETTINGS',         // Settings screen
    NEW_GAME_SETUP: 'NEW_GAME_SETUP', // Map preview, AI settings
    RTS_PLAY: 'RTS_PLAY',         // Active RTS gameplay
    PAUSED: 'PAUSED',             // Game paused
    GAMEOVER: 'GAMEOVER',         // Player lost
    VICTORY: 'VICTORY'            // Player won
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

        // RTS Mode flag
        this.isRTSMode = false;

        // RTS Players
        this.players = [];
        this.localPlayer = null;  // Human player reference

        // RTS Managers (initialized in initRTS)
        this.unitManager = null;
        this.selectionManager = null;

        // Map generator (creates terrain, tiberium, start positions)
        this.mapGenerator = null;

        // AI Controllers (one per AI player)
        this.aiControllers = [];

        // RTS Game Settings (set in NEW_GAME_SETUP)
        this.rtsSettings = {
            mapSize: 'medium',
            aiPersonality: 'RUSHER',
            difficulty: 'NORMAL',
            startingResources: 5000
        };

        // Delta time tracking for RTS
        this.lastFrameTime = 0;
        this.deltaTime = 0;

        // Performance monitoring (infrequent logging)
        this.lastPerfLog = 0;
        this.perfLogInterval = 5000; // Log performance every 5 seconds
    }

    init() {
        // Show main menu first
        this.state = GameState.MAIN_MENU;
    }

    /**
     * Start a new RTS game (called from main menu)
     */
    startNewGame() {
        this.initRTS();
    }

    // ═══════════════════════════════════════════════════════════════
    // RTS MODE INITIALIZATION
    // ═══════════════════════════════════════════════════════════════

    /**
     * Clean up previous game state to prevent memory leaks
     */
    cleanupPreviousGame() {
        // Clear event listeners
        if (window.EVENTS) {
            window.EVENTS.removeAllListeners();
        }

        // Clean up AI controllers
        if (this.aiControllers) {
            for (const ai of this.aiControllers) {
                if (ai.cleanup) ai.cleanup();
            }
            this.aiControllers = [];
        }

        // Clean up managers
        if (this.unitManager) {
            this.unitManager.clear();
        }
        if (this.buildingManager) {
            this.buildingManager.clear();
        }
        if (this.resourceManager) {
            this.resourceManager.clear();
        }
        if (this.selectionManager) {
            this.selectionManager.clearSelection();
        }
        if (this.objectManager) {
            this.objectManager.clear();
        }

        // Clear players
        if (this.players) {
            this.players = [];
        }
        this.localPlayer = null;
    }

    /**
     * Initialize RTS game mode
     * Called when starting a new RTS game
     */
    initRTS() {
        this.isRTSMode = true;

        // Debug visualization flags
        this.showVisionRanges = false; // Press 'V' to toggle vision range debug overlay
        this.showFogOfWar = true; // Fog of war enabled by default

        // Clean up previous game state
        this.cleanupPreviousGame();

        // Initialize EventManager
        this.eventManager = window.EVENTS || new EventManager();

        // Initialize RTS Grid (larger than tower defense)
        const gridConfig = RTS_GRID || { CELL_SIZE: 32, DEFAULT_COLS: 64, DEFAULT_ROWS: 64 };
        this.grid = new Grid(
            gridConfig.DEFAULT_ROWS,
            gridConfig.DEFAULT_COLS,
            gridConfig.CELL_SIZE,
            1, // levelId (not used in RTS)
            { isRTSMode: true, skipTrees: true } // RTS options
        );

        // Unlock all rows for RTS (no fog of war progression)
        this.grid.unlockStart = 0;
        this.grid.unlockEnd = this.grid.rows - 1;

        // Initialize camera for RTS (will be centered after player init)
        this.camera = {
            x: 0,
            y: 0,
            zoom: 1.0,
            minZoom: 0.5,
            maxZoom: 2.0,
            // Right-click drag panning
            isDragging: false,
            dragStartX: 0,
            dragStartY: 0,
            dragStartCamX: 0,
            dragStartCamY: 0
        };

        // Initialize Players (before MapGenerator so we have start positions)
        this.initPlayers();

        // Generate map using MapGenerator
        this.mapGenerator = MapGenerator.Builder.twoPlayer(this.grid);
        this.mapGenerator.generate();

        // Apply surface map to grid
        if (this.mapGenerator.surfaceMap) {
            this.grid.setSurfaceMap(this.mapGenerator.surfaceMap);
        }

        // Set player start positions from MapGenerator (use pre-computed pixel coordinates)
        if (this.mapGenerator.startPositions.length >= 2) {
            this.localPlayer.startPosition = {
                x: this.mapGenerator.startPositions[0].pixelX,
                y: this.mapGenerator.startPositions[0].pixelY
            };
            if (this.players[1]) {
                this.players[1].startPosition = {
                    x: this.mapGenerator.startPositions[1].pixelX,
                    y: this.mapGenerator.startPositions[1].pixelY
                };
            }
        }

        // Initialize RTS Managers
        this.unitManager = new UnitManager(this);
        this.selectionManager = new SelectionManager(this);
        this.resourceManager = new ResourceManager(this);
        this.buildingManager = new BuildingManager(this);

        // Keep ObjectManager for particles/projectiles
        this.objectManager = new ObjectManager(this);

        // Initialize VisibilityManager for fog of war
        this.visibilityManager = new VisibilityManager();
        for (const player of this.players) {
            this.visibilityManager.registerPlayer(player);
        }

        // Initialize Renderers
        this.screenEffectRenderer = new ScreenEffectRenderer();
        this.debugRenderer = new DebugRenderer();

        // Initialize UI Panels
        this.buildingInfoPanel = new BuildingInfoPanel();
        this.productionPanel = typeof ProductionPanel !== 'undefined' ? new ProductionPanel() : null;

        // Initialize resource fields from MapGenerator
        if (this.resourceManager) {
            this.resourceManager.initializeFields();

            // Verify fields were created
            if (this.resourceManager.fields.length === 0) {
                // Create emergency fallback fields near each player
                for (const player of this.players) {
                    if (player.startPosition) {
                        const angle = Math.random() * Math.PI * 2;
                        const dist = 200 + Math.random() * 100;
                        const fx = player.startPosition.x + Math.cos(angle) * dist;
                        const fy = player.startPosition.y + Math.sin(angle) * dist;
                        this.resourceManager.createField(fx, fy, 'green');
                    }
                }
            }
        }

        // Spawn starting construction yards for all players
        if (this.buildingManager) {
            this.buildingManager.spawnStartingBuildings();
        }

        // Units will be produced from buildings - no initial spawn
        // this.spawnInitialUnits();

        // Initialize AI Controllers for AI players
        this.initAIControllers();

        // Center camera on player's starting position
        this.centerCameraOnPlayer();

        // Set state to RTS_PLAY
        this.setState(GameState.RTS_PLAY);
        this.lastFrameTime = millis();
    }

    /**
     * Center camera on the local player's starting position
     */
    centerCameraOnPlayer() {
        if (!this.camera || !this.localPlayer) return;

        const startPos = this.localPlayer.startPosition;
        if (!startPos) return;

        // Center camera on player's base (offset by half screen)
        this.camera.x = startPos.x - (width / 2) / this.camera.zoom;
        this.camera.y = startPos.y - (height / 2) / this.camera.zoom;

        // Clamp to valid bounds
        this.updateCamera();
    }

    /**
     * Initialize players for RTS game
     */
    initPlayers() {
        this.players = [];

        // Calculate map dimensions
        const cellSize = this.grid ? this.grid.cellSize : 32;
        const mapWidth = this.grid ? this.grid.cols * cellSize : 2048;
        const mapHeight = this.grid ? this.grid.rows * cellSize : 2048;
        const margin = 4 * cellSize;  // 4 cells from edge

        // Create human player
        this.localPlayer = new Player({
            id: 0,
            name: 'Player',
            isHuman: true,
            team: 0,
            color: { r: 0, g: 150, b: 255 }
        });
        this.localPlayer.resources.tiberium = this.rtsSettings.startingResources;
        // Bottom-left corner of the map
        this.localPlayer.startPosition = { x: margin, y: mapHeight - margin };
        this.players.push(this.localPlayer);

        // Create AI opponent
        const aiPlayer = new Player({
            id: 1,
            name: 'AI Commander',
            isHuman: false,
            team: 1,
            color: { r: 255, g: 50, b: 50 },
            aiPersonality: this.rtsSettings.aiPersonality,
            aiDifficulty: this.rtsSettings.difficulty
        });
        aiPlayer.resources.tiberium = this.rtsSettings.startingResources;
        // Top-right corner of the map
        aiPlayer.startPosition = { x: mapWidth - margin, y: margin };
        this.players.push(aiPlayer);
    }

    /**
     * Initialize AI Controllers for non-human players
     */
    initAIControllers() {
        this.aiControllers = [];

        for (const player of this.players) {
            if (!player.isHuman) {
                const aiController = AIController.Builder.create()
                    .forPlayer(player)
                    .withPersonality(player.aiPersonality || this.rtsSettings.aiPersonality || 'BALANCED')
                    .withDifficulty(player.aiDifficulty || this.rtsSettings.difficulty || 'NORMAL')
                    .build();

                this.aiControllers.push(aiController);
            }
        }
    }

    /**
     * Spawn initial units for Phase 1 testing
     */
    spawnInitialUnits() {
        if (!this.unitManager) return;

        const cellSize = this.grid.cellSize || 32;

        // Spawn player units
        for (let i = 0; i < 5; i++) {
            this.unitManager.createUnit(
                'infantry',
                100 + i * 40,
                100 + i * 20,
                this.localPlayer
            );
        }

        // Spawn a harvester for player
        this.unitManager.createUnit(
            'harvester',
            200,
            200,
            this.localPlayer
        );

        // Spawn enemy units
        const enemyPlayer = this.players[1];
        if (enemyPlayer) {
            for (let i = 0; i < 3; i++) {
                this.unitManager.createUnit(
                    'infantry',
                    width - 200 + i * 40,
                    height - 200 + i * 20,
                    enemyPlayer
                );
            }
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // STATE MANAGEMENT
    // ═══════════════════════════════════════════════════════════════

    setState(newState) {
        let oldState = this.state;
        this.state = newState;

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
        this.updateRTS();
    }

    /**
     * RTS Mode update loop
     */
    updateRTS() {
        // Calculate delta time
        const now = millis();
        this.deltaTime = (now - this.lastFrameTime) / 1000; // Convert to seconds
        this.lastFrameTime = now;

        // Cap delta time to prevent physics issues
        this.deltaTime = Math.min(this.deltaTime, 0.1);

        // Only update during active play
        if (this.state !== GameState.RTS_PLAY) return;

        // Update camera (panning, edge scrolling)
        this.updateCamera();

        // Update selection manager
        if (this.selectionManager) {
            this.selectionManager.update();
        }

        // Update unit manager
        if (this.unitManager) {
            this.unitManager.update(this.deltaTime);
        }

        // Update resource manager
        if (this.resourceManager) {
            this.resourceManager.update(this.deltaTime);
        }

        // Update building manager
        if (this.buildingManager) {
            this.buildingManager.update(this.deltaTime);
        }

        // Update players
        for (const player of this.players) {
            player.update(this.deltaTime);
        }

        // Update AI Controllers
        for (const ai of this.aiControllers) {
            ai.update(this.deltaTime);
        }

        // Update particles/projectiles
        if (this.objectManager) {
            this.objectManager.updateAll();
        }

        // Update visibility (fog of war) for all players
        const visStart = performance.now();
        if (this.visibilityManager) {
            this.visibilityManager.updateVisibility(this.players, this.unitManager, this.buildingManager);
        }
        const visTime = performance.now() - visStart;

        // Check victory/defeat conditions
        this.checkRTSEndConditions();

        // Smart performance logging (every 5 seconds only)
        if (now - this.lastPerfLog > this.perfLogInterval) {
            this.lastPerfLog = now;
            const fps = Math.round(frameRate());
            const unitCount = this.unitManager ? this.unitManager.units.length : 0;
            const buildingCount = this.buildingManager ? this.buildingManager.buildings.length : 0;
            console.log(`[PERF] FPS: ${fps} | Units: ${unitCount} | Buildings: ${buildingCount} | Visibility: ${visTime.toFixed(2)}ms`);
        }
    }

    draw() {
        if (this.state === GameState.MAIN_MENU) {
            this.drawMainMenu();
        } else if (this.state === GameState.GAMEOVER) {
            this.drawGameOver();
        } else if (this.state === GameState.VICTORY) {
            this.drawVictory();
        } else {
            this.drawRTS();
        }
    }

    /**
     * Draw game over screen
     */
    drawGameOver() {
        // Dark overlay
        background(20, 15, 15);

        push();
        textAlign(CENTER, CENTER);

        // Defeat text
        fill(255, 80, 80);
        textSize(64);
        textStyle(BOLD);
        text("DEFEAT", width / 2, height / 3);

        // Message
        fill(200, 150, 150);
        textSize(20);
        textStyle(NORMAL);
        text("Your Construction Yard was destroyed!", width / 2, height / 2);

        // Stats
        fill(150, 150, 150);
        textSize(14);
        if (this.localPlayer) {
            text(`Units Created: ${this.localPlayer.stats.unitsCreated}`, width / 2, height / 2 + 50);
            text(`Units Lost: ${this.localPlayer.stats.unitsLost}`, width / 2, height / 2 + 70);
            text(`Buildings Built: ${this.localPlayer.stats.buildingsCreated}`, width / 2, height / 2 + 90);
        }

        // Return to menu button
        const buttonWidth = 200;
        const buttonHeight = 50;
        const buttonX = width / 2 - buttonWidth / 2;
        const buttonY = height - 120;

        fill(80, 60, 60);
        stroke(150, 100, 100);
        strokeWeight(2);
        rect(buttonX, buttonY, buttonWidth, buttonHeight, 5);

        fill(255);
        noStroke();
        textSize(18);
        text("RETURN TO MENU", width / 2, buttonY + buttonHeight / 2);

        pop();
    }

    /**
     * Draw victory screen
     */
    drawVictory() {
        // Victory background
        background(15, 25, 15);

        push();
        textAlign(CENTER, CENTER);

        // Victory text
        fill(100, 255, 100);
        textSize(64);
        textStyle(BOLD);
        text("VICTORY", width / 2, height / 3);

        // Message
        fill(150, 200, 150);
        textSize(20);
        textStyle(NORMAL);
        text("Enemy Construction Yard Destroyed!", width / 2, height / 2);

        // Stats
        fill(150, 150, 150);
        textSize(14);
        if (this.localPlayer) {
            text(`Units Created: ${this.localPlayer.stats.unitsCreated}`, width / 2, height / 2 + 50);
            text(`Units Lost: ${this.localPlayer.stats.unitsLost}`, width / 2, height / 2 + 70);
            text(`Buildings Built: ${this.localPlayer.stats.buildingsCreated}`, width / 2, height / 2 + 90);
        }

        // Return to menu button
        const buttonWidth = 200;
        const buttonHeight = 50;
        const buttonX = width / 2 - buttonWidth / 2;
        const buttonY = height - 120;

        fill(60, 80, 60);
        stroke(100, 150, 100);
        strokeWeight(2);
        rect(buttonX, buttonY, buttonWidth, buttonHeight, 5);

        fill(255);
        noStroke();
        textSize(18);
        text("RETURN TO MENU", width / 2, buttonY + buttonHeight / 2);

        pop();
    }

    /**
     * Draw the main menu screen
     */
    drawMainMenu() {
        // Background
        background(20, 25, 35);

        // Title
        push();
        fill(0, 255, 100);
        textAlign(CENTER, CENTER);
        textSize(48);
        textStyle(BOLD);
        text("TIBERIUM RTS", width / 2, height / 4);

        // Subtitle
        fill(150, 200, 150);
        textSize(18);
        textStyle(NORMAL);
        text("Command & Conquer Style Real-Time Strategy", width / 2, height / 4 + 50);

        // Menu buttons
        const buttonWidth = 200;
        const buttonHeight = 50;
        const buttonX = width / 2 - buttonWidth / 2;
        let buttonY = height / 2;

        // New Game button
        this._drawMenuButton("NEW GAME", buttonX, buttonY, buttonWidth, buttonHeight, true);

        // AI Personality selector
        buttonY += 70;
        fill(100, 100, 100);
        textSize(14);
        text("AI Personality:", width / 2, buttonY - 15);

        const personalities = ['RUSHER', 'TURTLE', 'BALANCED', 'RANDOM'];
        const personalityWidth = 100;
        const totalWidth = personalities.length * personalityWidth;
        let px = width / 2 - totalWidth / 2;
        buttonY += 10;

        for (const p of personalities) {
            const isSelected = this.rtsSettings.aiPersonality === p;
            this._drawMenuButton(p, px, buttonY, personalityWidth - 10, 35, isSelected);
            px += personalityWidth;
        }

        // Instructions
        fill(120);
        textSize(12);
        textAlign(CENTER, BOTTOM);
        text("Click NEW GAME to start | Select AI Personality above", width / 2, height - 30);

        pop();
    }

    /**
     * Draw a menu button
     */
    _drawMenuButton(label, x, y, w, h, highlighted = false) {
        const isHover = mouseX >= x && mouseX <= x + w && mouseY >= y && mouseY <= y + h;

        // Button background
        if (highlighted) {
            fill(isHover ? color(0, 200, 80) : color(0, 150, 60));
            stroke(0, 255, 100);
        } else {
            fill(isHover ? color(70, 70, 80) : color(50, 50, 60));
            stroke(80, 80, 100);
        }
        strokeWeight(2);
        rect(x, y, w, h, 8);

        // Button text
        fill(highlighted ? 255 : 180);
        noStroke();
        textAlign(CENTER, CENTER);
        textSize(16);
        textStyle(BOLD);
        text(label, x + w / 2, y + h / 2);
    }

    /**
     * RTS Mode draw
     */
    drawRTS() {
        // Background
        background(40, 45, 40);

        if (!this.grid) return;

        push();

        // Apply camera transform (scale first, then translate for proper zoom behavior)
        if (this.camera) {
            scale(this.camera.zoom);
            translate(-this.camera.x, -this.camera.y);
        }

        // Apply screen shake
        if (this.screenEffectRenderer) {
            this.screenEffectRenderer.applyShake();
        }

        // Draw grid/terrain
        this.grid.draw();

        // Draw tiberium fields
        if (this.resourceManager) {
            this.resourceManager.draw();
        }

        // Draw buildings
        if (this.buildingManager) {
            this.buildingManager.draw();
        }

        // Draw units
        if (this.unitManager) {
            this.unitManager.draw();
        }

        // Draw particles
        if (this.objectManager) {
            for (let p of this.objectManager.particles) {
                p.draw();
            }
        }

        // Draw projectiles
        if (this.objectManager) {
            for (let proj of this.objectManager.projectiles) {
                proj.draw();
            }
        }

        // Draw selection box
        if (this.selectionManager) {
            this.selectionManager.draw();
        }

        // Draw fog of war (explored but not visible areas)
        // Only enabled if showFogOfWar flag is true (press F to toggle)
        if (this.showFogOfWar && this.visibilityManager && this.localPlayer) {
            this.visibilityManager.drawFogOfWar(this.localPlayer, this.grid);
        }

        // Optional: Draw vision ranges (debug mode, press V to toggle)
        if (this.showVisionRanges && this.visibilityManager && this.localPlayer) {
            this.visibilityManager.drawVisionRangesDebug(this.localPlayer, this.unitManager, this.buildingManager);
        }

        pop();

        // Draw screen flash
        if (this.screenEffectRenderer) {
            this.screenEffectRenderer.drawFlash();
        }

        // Draw RTS HUD
        this.drawRTSHUD();

        // Debug overlay
        if (this.debugRenderer) {
            const resourceInfo = this.resourceManager ? this.resourceManager.getDebugInfo() : {};
            this.debugRenderer.draw({
                units: this.unitManager ? this.unitManager.units.length : 0,
                selected: this.selectionManager ? this.selectionManager.selectedUnits.length : 0,
                particles: this.objectManager ? this.objectManager.particleCount : 0,
                projectiles: this.objectManager ? this.objectManager.projectileCount : 0,
                tiberium: this.localPlayer ? this.localPlayer.resources.tiberium : 0,
                fields: resourceInfo.activeFields || 0,
                mapTiberium: resourceInfo.totalTiberium || 0,
                fps: Math.round(frameRate())
            });
        }
    }

    /**
     * Draw RTS HUD (temporary - will be replaced by proper HUD class)
     */
    drawRTSHUD() {
        push();

        // Resource bar at top
        fill(20, 20, 20, 200);
        noStroke();
        rect(0, 0, width, 40);

        // Resources
        fill(0, 255, 100);
        textAlign(LEFT, CENTER);
        textSize(16);
        text(`Tiberium: ${Math.floor(this.localPlayer?.resources.tiberium || 0)}`, 20, 20);

        // Power - calculated from building manager
        let totalPower = 0;
        let usedPower = 0;
        if (this.buildingManager) {
            totalPower = this.buildingManager.totalPower;
            usedPower = this.buildingManager.usedPower;
        }
        const powered = totalPower >= usedPower;
        fill(powered ? color(255, 255, 100) : color(255, 100, 100));
        text(`Power: ${usedPower} / ${totalPower}`, 200, 20);

        // Buildings count
        const buildingCount = this.buildingManager?.buildings.length || 0;
        fill(200);
        text(`Buildings: ${buildingCount}`, 380, 20);

        // Selected units count
        const selectedCount = this.selectionManager?.selectedUnits.length || 0;
        fill(200);
        textAlign(RIGHT, CENTER);
        text(`Selected: ${selectedCount}`, width - 20, 20);

        // Build menu panel (bottom right)
        this.drawBuildPanel();

        // Building info panel (right side - when building selected)
        if (this.buildingInfoPanel) {
            const selectedBuilding = this.selectionManager?.getSelectedBuilding();
            if (selectedBuilding) {
                this.buildingInfoPanel.show(selectedBuilding);
            } else {
                this.buildingInfoPanel.hide();
            }
            this.buildingInfoPanel.draw();
        }

        // Production panel (left side - when production building selected)
        if (this.productionPanel) {
            const selectedBuilding = this.selectionManager?.getSelectedBuilding();
            if (selectedBuilding && selectedBuilding.isProductionBuilding) {
                this.productionPanel.show(selectedBuilding);
            } else {
                this.productionPanel.hide();
            }
            this.productionPanel.update(this.deltaTime);
            this.productionPanel.draw();
        }

        // Instructions
        fill(150);
        textSize(12);
        textAlign(CENTER, BOTTOM);

        // Show placement mode instructions if active
        if (this.buildingManager?.placementMode) {
            fill(255, 255, 100);
            text("Left-click: Place | Right-click/ESC: Cancel", width / 2, height - 10);
        } else {
            text("1-8: Build | Right-drag: Pan | Scroll: Zoom | Left-click: Select | Right-click: Command", width / 2, height - 10);
        }

        pop();
    }

    /**
     * Draw build panel showing available buildings organized by category
     */
    drawBuildPanel() {
        if (!this.buildingManager || !this.localPlayer) return;

        const panelX = width - 220;
        const panelY = 50;
        const panelWidth = 210;
        const buttonHeight = 32;
        const sectionHeaderHeight = 24;
        const padding = 5;

        // Get available buildings
        const available = this.buildingManager.getAvailableBuildings(this.localPlayer);

        // Define building categories with accent colors
        const categories = {
            main: {
                label: 'MAIN BUILDINGS',
                accentColor: color(80, 130, 200),      // Blue
                headerBg: color(40, 60, 90),
                types: ['construction_yard', 'power_plant', 'refinery', 'barracks', 'war_factory', 'tech_center', 'tiberium_silo', 'radar']
            },
            defense: {
                label: 'DEFENSE',
                accentColor: color(200, 80, 80),       // Red
                headerBg: color(90, 40, 40),
                types: ['guard_tower', 'sam_site', 'wall']
            },
            support: {
                label: 'SUPPORT',
                accentColor: color(200, 180, 80),      // Yellow/Gold
                headerBg: color(90, 80, 40),
                types: ['airfield', 'armory']
            }
        };

        // Hotkey mapping for buildings
        const hotkeyMap = {
            'construction_yard': '1',
            'power_plant': '2',
            'barracks': '3',
            'refinery': '4',
            'war_factory': '5',
            'guard_tower': '6',
            'tech_center': '7',
            'tiberium_silo': '8',
            'radar': '9',
            'sam_site': '0',
            'wall': 'W',
            'airfield': 'A',
            'armory': 'R'
        };

        // Categorize available buildings
        const categorizedBuildings = {
            main: [],
            defense: [],
            support: []
        };

        for (const b of available) {
            for (const [catKey, catData] of Object.entries(categories)) {
                if (catData.types.includes(b.type)) {
                    categorizedBuildings[catKey].push(b);
                    break;
                }
            }
        }

        // Calculate total panel height
        let totalHeight = padding;
        for (const [catKey, buildings] of Object.entries(categorizedBuildings)) {
            if (buildings.length > 0) {
                totalHeight += sectionHeaderHeight + padding;
                totalHeight += buildings.length * (buttonHeight + padding);
            }
        }
        totalHeight += padding;

        // Limit panel height and enable scroll indicator if needed
        const maxPanelHeight = height - panelY - 60;
        const needsScroll = totalHeight > maxPanelHeight;
        const displayHeight = needsScroll ? maxPanelHeight : totalHeight;

        // Panel background
        fill(30, 30, 30, 230);
        stroke(60);
        strokeWeight(1);
        rect(panelX, panelY, panelWidth, displayHeight, 5);

        // Draw categories
        let currentY = panelY + padding;

        for (const [catKey, catData] of Object.entries(categories)) {
            const buildings = categorizedBuildings[catKey];
            if (buildings.length === 0) continue;

            // Check if section would be off-screen
            if (currentY > panelY + displayHeight - sectionHeaderHeight) break;

            // Section header background
            fill(catData.headerBg);
            stroke(catData.accentColor);
            strokeWeight(2);
            rect(panelX + padding, currentY, panelWidth - padding * 2, sectionHeaderHeight, 3);

            // Section header text
            fill(catData.accentColor);
            textAlign(LEFT, CENTER);
            textSize(11);
            noStroke();
            text(catData.label, panelX + padding + 8, currentY + sectionHeaderHeight / 2);

            // Accent bar on left
            fill(catData.accentColor);
            noStroke();
            rect(panelX + padding, currentY, 3, sectionHeaderHeight, 3, 0, 0, 3);

            currentY += sectionHeaderHeight + padding;

            // Draw building buttons in this category
            for (const b of buildings) {
                // Check if button would be off-screen
                if (currentY + buttonHeight > panelY + displayHeight - padding) {
                    // Draw "more..." indicator
                    fill(150);
                    textAlign(CENTER, CENTER);
                    textSize(10);
                    text("... more buildings", panelX + panelWidth / 2, currentY + 10);
                    break;
                }

                // Button background
                const isSelected = this.buildingManager.placementMode &&
                                  this.buildingManager.selectedBuildingType === b.type;

                if (isSelected) {
                    fill(60, 120, 60);
                    stroke(100, 200, 100);
                } else if (b.canAfford) {
                    fill(45, 45, 55);
                    stroke(catData.accentColor);
                } else {
                    fill(35, 30, 30);
                    stroke(60);
                }

                strokeWeight(1);
                rect(panelX + padding, currentY, panelWidth - padding * 2, buttonHeight, 3);

                // Category accent indicator on left edge
                if (!isSelected) {
                    fill(catData.accentColor);
                    noStroke();
                    rect(panelX + padding, currentY, 2, buttonHeight, 2, 0, 0, 2);
                }

                // Hotkey
                const hotkey = hotkeyMap[b.type];
                if (hotkey) {
                    fill(b.canAfford ? catData.accentColor : color(80));
                    textAlign(LEFT, CENTER);
                    textSize(12);
                    noStroke();
                    text(`[${hotkey}]`, panelX + padding + 6, currentY + buttonHeight / 2);
                }

                // Building name
                fill(b.canAfford ? 220 : 90);
                textSize(11);
                textAlign(LEFT, CENTER);
                text(b.name, panelX + 42, currentY + buttonHeight / 2 - 6);

                // Cost with icon
                fill(b.canAfford ? color(100, 255, 100) : color(255, 100, 100));
                textSize(10);
                text(`$${b.cost}`, panelX + 42, currentY + buttonHeight / 2 + 7);

                // Build time (right side)
                fill(120);
                textAlign(RIGHT, CENTER);
                textSize(9);
                text(`${b.buildTime}s`, panelX + panelWidth - padding - 8, currentY + buttonHeight / 2);

                currentY += buttonHeight + padding;
            }

            // Add extra spacing between categories
            currentY += 3;
        }

        // Scroll indicator if needed
        if (needsScroll) {
            fill(100);
            textAlign(CENTER, BOTTOM);
            textSize(10);
            noStroke();
            text("Scroll for more", panelX + panelWidth / 2, panelY + displayHeight - 2);
        }
    }

    /**
     * Check RTS victory/defeat conditions
     * Victory: Destroy enemy construction yard (primary base building)
     * Defeat: Lose your construction yard
     */
    checkRTSEndConditions() {
        // Update defeat status for all players
        for (const player of this.players) {
            if (player && !player.isDefeated) {
                player.checkDefeat();
            }
        }

        // Check if local player is defeated
        if (this.localPlayer && this.localPlayer.isDefeated) {
            console.log("Game Over: Your Construction Yard was destroyed!");
            this.setState(GameState.GAMEOVER);
            return;
        }

        // Check if AI is defeated
        const aiPlayer = this.players.find(p => !p.isHuman);
        if (aiPlayer && aiPlayer.isDefeated) {
            console.log("Victory: Enemy Construction Yard destroyed!");
            this.setState(GameState.VICTORY);
            return;
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // CAMERA SYSTEM
    // ═══════════════════════════════════════════════════════════════

    /**
     * Update camera position (clamp to map bounds with UI padding)
     * Allows camera to show UI panels without clamping inside the map
     */
    updateCamera() {
        if (!this.camera) return;

        const cam = this.camera;

        // Calculate map and viewport dimensions
        const mapWidth = this.grid ? this.grid.cols * this.grid.cellSize : 2048;
        const mapHeight = this.grid ? this.grid.rows * this.grid.cellSize : 2048;
        const viewportWidth = width / cam.zoom;
        const viewportHeight = height / cam.zoom;

        // UI padding in world units (converted from screen pixels)
        // Right side: BuildingInfoPanel width (220) + margins
        const rightPadding = 250 / cam.zoom;
        // Left side: Production panel + stats
        const leftPadding = 100 / cam.zoom;
        // Top and bottom: Reserve space for UI
        const topPadding = 60 / cam.zoom;
        const bottomPadding = 40 / cam.zoom;

        // Apply padding to camera bounds
        const minX = -leftPadding;
        const maxX = mapWidth + rightPadding - viewportWidth;
        const minY = -topPadding;
        const maxY = mapHeight + bottomPadding - viewportHeight;

        // If viewport is larger than map, center the map
        if (viewportWidth >= mapWidth + leftPadding + rightPadding) {
            cam.x = (mapWidth + rightPadding + leftPadding - viewportWidth) / 2;
        } else {
            cam.x = Math.max(minX, Math.min(cam.x, maxX));
        }

        if (viewportHeight >= mapHeight + topPadding + bottomPadding) {
            cam.y = (mapHeight + topPadding + bottomPadding - viewportHeight) / 2;
        } else {
            cam.y = Math.max(minY, Math.min(cam.y, maxY));
        }
    }

    /**
     * Start camera drag (right-click)
     */
    startCameraDrag(screenX, screenY) {
        if (!this.camera) return;

        this.camera.isDragging = true;
        this.camera.dragStartX = screenX;
        this.camera.dragStartY = screenY;
        this.camera.dragStartCamX = this.camera.x;
        this.camera.dragStartCamY = this.camera.y;
    }

    /**
     * Update camera drag
     */
    updateCameraDrag(screenX, screenY) {
        if (!this.camera || !this.camera.isDragging) return;

        // Calculate drag delta (inverted - drag left moves camera right)
        const dx = this.camera.dragStartX - screenX;
        const dy = this.camera.dragStartY - screenY;

        // Apply to camera (scaled by zoom)
        this.camera.x = this.camera.dragStartCamX + dx / this.camera.zoom;
        this.camera.y = this.camera.dragStartCamY + dy / this.camera.zoom;
    }

    /**
     * End camera drag
     */
    endCameraDrag() {
        if (!this.camera) return;
        this.camera.isDragging = false;
    }

    /**
     * Handle mouse wheel for camera zoom
     * @param {number} delta - Wheel delta (positive = scroll down/zoom out)
     */
    handleMouseWheel(delta) {
        if (!this.camera || !this.isRTSMode) return;

        const cam = this.camera;
        const zoomFactor = 0.1;

        // Get mouse position in world coordinates before zoom
        const worldX = cam.x + mouseX / cam.zoom;
        const worldY = cam.y + mouseY / cam.zoom;

        // Apply zoom
        if (delta > 0) {
            cam.zoom = Math.max(cam.minZoom, cam.zoom - zoomFactor);
        } else {
            cam.zoom = Math.min(cam.maxZoom, cam.zoom + zoomFactor);
        }

        // Adjust camera to keep mouse position stable (zoom toward mouse)
        cam.x = worldX - mouseX / cam.zoom;
        cam.y = worldY - mouseY / cam.zoom;

        // Clamp camera
        const mapWidth = this.grid ? this.grid.cols * this.grid.cellSize : 2048;
        const mapHeight = this.grid ? this.grid.rows * this.grid.cellSize : 2048;
        cam.x = Math.max(0, Math.min(cam.x, mapWidth - width / cam.zoom));
        cam.y = Math.max(0, Math.min(cam.y, mapHeight - height / cam.zoom));
    }

    /**
     * Convert screen coordinates to world coordinates
     */
    screenToWorld(screenX, screenY) {
        if (!this.camera) return { x: screenX, y: screenY };
        return {
            x: this.camera.x + screenX / this.camera.zoom,
            y: this.camera.y + screenY / this.camera.zoom
        };
    }

    /**
     * Convert world coordinates to screen coordinates
     */
    worldToScreen(worldX, worldY) {
        if (!this.camera) return { x: worldX, y: worldY };
        return {
            x: (worldX - this.camera.x) * this.camera.zoom,
            y: (worldY - this.camera.y) * this.camera.zoom
        };
    }

    // ═══════════════════════════════════════════════════════════════
    // INPUT HANDLERS
    // ═══════════════════════════════════════════════════════════════

    handleMousePressed() {
        if (this.state === GameState.MAIN_MENU) {
            this.handleMenuClick();
        } else if (this.state === GameState.GAMEOVER || this.state === GameState.VICTORY) {
            this.handleEndScreenClick();
        } else {
            this.handleRTSMousePressed();
        }
    }

    /**
     * Handle clicks on game over/victory screens
     */
    handleEndScreenClick() {
        const buttonWidth = 200;
        const buttonHeight = 50;
        const buttonX = width / 2 - buttonWidth / 2;
        const buttonY = height - 120;

        // Check RETURN TO MENU button
        if (mouseX >= buttonX && mouseX <= buttonX + buttonWidth &&
            mouseY >= buttonY && mouseY <= buttonY + buttonHeight) {
            this.state = GameState.MAIN_MENU;
        }
    }

    /**
     * Handle clicks on main menu
     */
    handleMenuClick() {
        const buttonWidth = 200;
        const buttonHeight = 50;
        const buttonX = width / 2 - buttonWidth / 2;
        let buttonY = height / 2;

        // Check NEW GAME button
        if (mouseX >= buttonX && mouseX <= buttonX + buttonWidth &&
            mouseY >= buttonY && mouseY <= buttonY + buttonHeight) {
            // Handle RANDOM personality
            if (this.rtsSettings.aiPersonality === 'RANDOM') {
                const personalities = ['RUSHER', 'TURTLE', 'BALANCED'];
                this.rtsSettings.aiPersonality = personalities[Math.floor(Math.random() * personalities.length)];
                console.log(`Game: Randomized AI personality to ${this.rtsSettings.aiPersonality}`);
            }
            this.startNewGame();
            return;
        }

        // Check AI Personality buttons
        buttonY += 80;
        const personalities = ['RUSHER', 'TURTLE', 'BALANCED', 'RANDOM'];
        const personalityWidth = 100;
        const totalWidth = personalities.length * personalityWidth;
        let px = width / 2 - totalWidth / 2;

        for (const p of personalities) {
            if (mouseX >= px && mouseX <= px + personalityWidth - 10 &&
                mouseY >= buttonY && mouseY <= buttonY + 35) {
                this.rtsSettings.aiPersonality = p;
                console.log(`Game: Selected AI personality: ${p}`);
                return;
            }
            px += personalityWidth;
        }
    }

    handleKeyPressed(key) {
        this.handleRTSKeyPressed(key);
    }

    // ═══════════════════════════════════════════════════════════════
    // RTS INPUT HANDLERS
    // ═══════════════════════════════════════════════════════════════

    handleRTSMousePressed() {
        if (this.state !== GameState.RTS_PLAY) return;

        // UI Panels handle clicks first (using screen coordinates)
        if (this.productionPanel && this.productionPanel.handleClick(mouseX, mouseY)) {
            return; // Click was handled by production panel
        }

        // Convert screen coordinates to world coordinates
        const world = this.screenToWorld(mouseX, mouseY);
        const shiftHeld = keyIsDown(SHIFT);

        // Check building placement mode first
        if (this.buildingManager && this.buildingManager.placementMode) {
            if (this.buildingManager.handleClick(world.x, world.y, mouseButton)) {
                return; // Handled by building manager
            }
        }

        // Left-click for selection
        if (mouseButton === LEFT) {
            if (this.selectionManager) {
                this.selectionManager.handleMousePressed(world.x, world.y, shiftHeld);
            }
        }
        // Right-click starts camera drag OR issues commands
        else if (mouseButton === RIGHT) {
            // Start camera drag - commands are issued on release if no drag occurred
            this.startCameraDrag(mouseX, mouseY);
            this._rightClickStart = { x: mouseX, y: mouseY, world: world };
        }
    }

    handleRTSMouseDragged() {
        if (this.state !== GameState.RTS_PLAY) return;

        // Right-click drag for camera panning
        if (mouseButton === RIGHT && this.camera?.isDragging) {
            this.updateCameraDrag(mouseX, mouseY);
            return;
        }

        // Left-click drag for selection box
        const world = this.screenToWorld(mouseX, mouseY);
        if (this.selectionManager) {
            this.selectionManager.handleMouseDragged(world.x, world.y);
        }
    }

    handleRTSMouseReleased() {
        if (this.state !== GameState.RTS_PLAY) return;

        const world = this.screenToWorld(mouseX, mouseY);
        const shiftHeld = keyIsDown(SHIFT);

        // Check if this was a right-click
        if (mouseButton === RIGHT) {
            // Check if we dragged significantly (threshold of 5 pixels)
            const wasDragging = this.camera?.isDragging;
            const dragDist = this._rightClickStart ?
                Math.sqrt(Math.pow(mouseX - this._rightClickStart.x, 2) +
                         Math.pow(mouseY - this._rightClickStart.y, 2)) : 0;

            this.endCameraDrag();

            // If minimal drag, treat as right-click command
            if (dragDist < 5 && this._rightClickStart) {
                if (this.selectionManager) {
                    this.selectionManager.handleRightClick(
                        this._rightClickStart.world.x,
                        this._rightClickStart.world.y,
                        shiftHeld
                    );
                }
            }

            this._rightClickStart = null;
            return;
        }

        // Left-click release for selection
        if (this.selectionManager) {
            this.selectionManager.handleMouseReleased(world.x, world.y, shiftHeld);
        }
    }

    handleRTSKeyPressed(key) {
        // ESC to pause or cancel placement
        if (key === 'Escape') {
            // Cancel building placement first
            if (this.buildingManager && this.buildingManager.placementMode) {
                this.buildingManager.cancelPlacement();
                return;
            }

            if (this.state === GameState.RTS_PLAY) {
                this.setState(GameState.PAUSED);
            } else if (this.state === GameState.PAUSED) {
                this.setState(GameState.RTS_PLAY);
            }
            return;
        }

        // D to toggle debug
        if (key === 'd' || key === 'D') {
            if (this.debugRenderer) {
                this.debugRenderer.toggle();
            }
            return;
        }

        // V to toggle vision range debug visualization
        if (key === 'v' || key === 'V') {
            this.showVisionRanges = !this.showVisionRanges;
            console.log(`Vision ranges ${this.showVisionRanges ? 'enabled' : 'disabled'}`);
            return;
        }

        // Building hotkeys (number keys for quick building)
        if (this.buildingManager && this.localPlayer) {
            const buildingKeys = {
                '1': 'construction_yard',
                '2': 'power_plant',
                '3': 'barracks',
                '4': 'refinery',
                '5': 'war_factory',
                '6': 'guard_tower',
                '7': 'tech_center',
                '8': 'silo'
            };

            if (buildingKeys[key]) {
                this.buildingManager.startPlacement(buildingKeys[key], this.localPlayer);
                return;
            }
        }

        // H to order harvesters to harvest
        if ((key === 'h' || key === 'H') && this.selectionManager) {
            for (const unit of this.selectionManager.selectedUnits) {
                if (unit.config?.type === 'harvester') {
                    const harvestCmd = new HarvestCommand(unit);
                    unit.queueCommand(harvestCmd);
                }
            }
            return;
        }

        // Pass to selection manager for control groups and commands
        if (this.state === GameState.RTS_PLAY && this.selectionManager) {
            const ctrlHeld = keyIsDown(CONTROL);
            const shiftHeld = keyIsDown(SHIFT);
            this.selectionManager.handleKeyPressed(key, ctrlHeld, shiftHeld);
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // CONVENIENCE GETTERS (Proxy to managers)
    // ═══════════════════════════════════════════════════════════════

    get projectiles() {
        return this.objectManager ? this.objectManager.projectiles : [];
    }

    get particles() {
        return this.objectManager ? this.objectManager.particles : [];
    }

    // ═══════════════════════════════════════════════════════════════
    // CONVENIENCE METHODS (Proxy to managers)
    // ═══════════════════════════════════════════════════════════════

    addProjectile(p) {
        if (this.objectManager) this.objectManager.addProjectile(p);
    }

    spawnParticles(x, y, count, color) {
        if (this.objectManager) this.objectManager.spawnParticles(x, y, count, color);
    }

    triggerShake(amount) {
        if (this.screenEffectRenderer) this.screenEffectRenderer.triggerShake(amount);
    }

    // ═══════════════════════════════════════════════════════════════
    // DEBUG (Disabled by default)
    // ═══════════════════════════════════════════════════════════════

    displayDebug() {
        // Now handled by DebugRenderer
    }
}
