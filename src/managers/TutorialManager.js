// TutorialManager.js - Handles interactive tutorial system
class TutorialManager {
    constructor(game) {
        this.game = game;
        this.active = false; // Start inactive, only activate when start() is called
        this.step = 0;
        this.waitingForAction = false;
        this.highlightTarget = null;
        this.startFrame = 0;
        this.showUI = true; // Whether to show tutorial UI (dialogue, arrow)
        this.pendingTimeout = null; // Track setTimeout for cleanup

        // Track which UI elements have been introduced
        this.unlockedElements = new Set();

        // Rich text parsing for tutorial messages
        this.textSegments = [];
        this.characterSegmentMap = [];

        // Track tower spawns for tutorial
        this.towersSpawned = 0;
        this.eventListeners = []; // Store event listener references for cleanup

        // Predetermined tower types for tutorial (2 cannons for merging, 1 sniper for moving)
        this.tutorialTowerSequence = ['cannon', 'cannon', 'sniper'];
        this.tutorialTowerIndex = 0;

        // Tutorial steps configuration
        this.steps = [
            {
                id: 'welcome',
                title: 'Welcome, Commander!',
                text: 'Enemies will approach from the {red}LEFT{/red} and try to reach your base on the {blue}RIGHT{/blue}.',
                highlight: null,
                action: 'click', // Wait for click to continue
                arrow: null
            },
            {
                id: 'gold',
                title: 'Your Resources',
                text: 'This is your {gold}{pulse}GOLD{/pulse}{/gold}. You spend it to build {orange}TOWERS{/orange}.',
                highlight: 'gold', // Highlight the gold display
                action: 'click',
                arrow: { x: 50, y: 40, dir: 'up' }
            },
            {
                id: 'lives',
                title: 'Your Lives',
                text: 'These are your {red}{bounce}LIVES{/bounce}{/red}. If an enemy reaches your base, you {red}LOSE LIVES{/red}!',
                highlight: 'lives',
                action: 'click',
                arrow: { x: 200, y: 40, dir: 'up' }
            },
            {
                id: 'spawn_towers',
                title: 'Spawn Towers!',
                text: 'Click {gold}{pulse}SPAWN TOWER{/pulse}{/gold} to summon random towers! Spawn {orange}3 TOWERS{/orange} to continue. ({gold}75 GOLD{/gold} each)',
                highlight: 'tower_bar',
                action: 'towers_spawned', // Will trigger when 3 towers spawned
                arrow: { x: 0, y: 0, dir: 'down', target: 'tower_bar' }
            },
            {
                id: 'move_tutorial',
                title: 'Move a Tower',
                text: '{cyan}DRAG THE BLUE TOWER{/cyan} to the {green}GREEN TILE{/green}. Follow the {white}WHITE ARROW{/white}!',
                highlight: null,
                action: 'tower_moved',
                arrow: null
            },
            {
                id: 'tower_moved',
                title: 'Nice Move!',
                text: '{green}Perfect!{/green} You can reposition towers anytime. Now let\'s try merging!',
                highlight: null,
                action: 'click',
                arrow: null
            },
            {
                id: 'merge_tutorial',
                title: 'Merge Towers',
                text: '{gold}DRAG A GOLD TOWER{/gold} onto the {gold}OTHER GOLD TOWER{/gold}. Follow the {gold}GOLDEN ARROWS{/gold} to merge!',
                highlight: null,
                action: 'tower_merged',
                arrow: null
            },
            {
                id: 'tower_merged',
                title: 'Merge Complete!',
                text: '{rainbow}AMAZING!{/rainbow} Merged towers are {gold}MORE POWERFUL{/gold}. Keep merging to create ultimate defenders!',
                highlight: null,
                action: 'click',
                arrow: null
            },
            {
                id: 'start_wave',
                title: 'Start the Battle',
                text: 'When ready, click {gold}{pulse}START WAVE{/pulse}{/gold} to send enemies. You can build more towers before starting!',
                highlight: 'wave_button',
                action: 'click', // Changed from 'wave_started' to allow dismissing
                arrow: null
            },
            {
                id: 'complete',
                title: 'Tutorial Complete!',
                text: '{rainbow}You\'re ready to defend!{/rainbow} Build more towers, survive waves, and expand your territory!',
                highlight: null,
                action: 'click',
                arrow: null
            }
        ];
    }

    // Get current step data
    get currentStep() {
        return this.steps[this.step] || null;
    }

    // Parse rich text into segments and build character mapping
    parseRichText(text) {
        this.textSegments = [];
        this.characterSegmentMap = [];

        // If RichTextParser is available, use it
        if (typeof RICH_TEXT_PARSER !== 'undefined') {
            this.textSegments = RICH_TEXT_PARSER.parse(text);
        } else {
            // Fallback: treat entire text as single segment
            this.textSegments = [{ text: text, color: null, effects: [] }];
        }

        // Build character-to-segment map
        let charIndex = 0;
        for (let segmentIndex = 0; segmentIndex < this.textSegments.length; segmentIndex++) {
            let segment = this.textSegments[segmentIndex];
            for (let i = 0; i < segment.text.length; i++) {
                this.characterSegmentMap[charIndex] = {
                    segmentIndex: segmentIndex,
                    letterIndex: i,
                    char: segment.text[i]
                };
                charIndex++;
            }
        }
    }

    /**
     * Start the tutorial from the first step
     */
    start() {
        this.active = true;
        this.step = 0;
        this.startFrame = frameCount;
        this.towersSpawned = 0;
        this.tutorialTowerIndex = 0;  // Reset tower sequence

        // Set up event listeners
        this.setupEventListeners();

        // Parse first step text
        if (this.currentStep) {
            this.parseRichText(this.currentStep.text);
        }
        console.log("Tutorial: Started");
    }

    // Set up event listeners for tutorial tracking
    setupEventListeners() {
        if (typeof EVENTS === 'undefined') return;

        // Remove old listeners first
        this.cleanupEventListeners();

        // Listen for tower placement events
        const towerPlaceHandler = (data) => {
            if (!this.active) return;

            // Only count during spawn_towers step
            if (this.currentStep && this.currentStep.id === 'spawn_towers') {
                this.towersSpawned++;
                console.log(`Tutorial: Tower spawned (${this.towersSpawned}/3)`);

                // Update tutorial text to show progress
                this.updateSpawnProgress();

                // Check if we've spawned enough towers
                if (this.towersSpawned >= 3) {
                    this.onAction('towers_spawned');
                }
            }
        };

        // Listen for tower merge events
        const towerMergeHandler = (data) => {
            if (!this.active) return;

            // Only count during merge_tutorial step
            if (this.currentStep && this.currentStep.id === 'merge_tutorial') {
                console.log('Tutorial: Towers merged!');
                this.onAction('tower_merged');
            }
        };

        EVENTS.on(EVENT_NAMES.TOWER_PLACE, towerPlaceHandler);
        this.eventListeners.push({ event: EVENT_NAMES.TOWER_PLACE, handler: towerPlaceHandler });

        EVENTS.on(EVENT_NAMES.TOWER_MERGE, towerMergeHandler);
        this.eventListeners.push({ event: EVENT_NAMES.TOWER_MERGE, handler: towerMergeHandler });
    }

    // Clean up event listeners
    cleanupEventListeners() {
        if (typeof EVENTS === 'undefined') return;

        for (let listener of this.eventListeners) {
            EVENTS.off(listener.event, listener.handler);
        }
        this.eventListeners = [];
    }

    // Update tutorial text to show spawn progress
    updateSpawnProgress() {
        if (!this.currentStep || this.currentStep.id !== 'spawn_towers') return;

        // Update text with current progress
        let progressText = `Click {gold}{pulse}SPAWN TOWER{/pulse}{/gold} to summon random towers! Spawn {orange}3 TOWERS{/orange} to continue. ({gold}75 GOLD{/gold} each)\n\n{cyan}Progress: ${this.towersSpawned}/3 towers spawned{/cyan}`;

        this.currentStep.text = progressText;
        this.parseRichText(progressText);
    }

    // Get next predetermined tower type for tutorial
    getNextTutorialTowerType() {
        if (this.tutorialTowerIndex >= this.tutorialTowerSequence.length) {
            // Fallback to cannon if we somehow go over
            return 'cannon';
        }

        let towerType = this.tutorialTowerSequence[this.tutorialTowerIndex];
        this.tutorialTowerIndex++;

        console.log(`Tutorial: Spawning predetermined tower #${this.tutorialTowerIndex}: ${towerType}`);
        return towerType;
    }

    // Move to next step
    nextStep() {
        // Unlock the element from current step before moving
        let currentHighlight = this.currentStep ? this.currentStep.highlight : null;
        if (currentHighlight) {
            this.unlockedElements.add(currentHighlight);
        }

        this.step++;
        this.startFrame = frameCount;

        if (this.step >= this.steps.length) {
            this.complete();
        } else {
            // Reset tower spawn counter and index when entering spawn_towers step
            if (this.currentStep && this.currentStep.id === 'spawn_towers') {
                this.towersSpawned = 0;
                this.tutorialTowerIndex = 0;
            }

            // Parse text for new step
            if (this.currentStep) {
                this.parseRichText(this.currentStep.text);
            }
            console.log(`Tutorial: Step ${this.step} - ${this.currentStep.id}`);
        }
    }

    // Complete the tutorial
    complete() {
        // Cancel pending timeout
        if (this.pendingTimeout) {
            clearTimeout(this.pendingTimeout);
            this.pendingTimeout = null;
        }

        // Clean up event listeners
        this.cleanupEventListeners();

        this.active = false;
        // Unlock all elements
        this.unlockedElements.add('gold');
        this.unlockedElements.add('lives');
        this.unlockedElements.add('wave');
        this.unlockedElements.add('tower_bar');
        this.unlockedElements.add('wave_button');
        console.log("Tutorial: Complete!");
    }

    // Skip tutorial - unlock everything
    skip() {
        // Cancel pending timeout
        if (this.pendingTimeout) {
            clearTimeout(this.pendingTimeout);
            this.pendingTimeout = null;
        }

        // Clean up event listeners
        this.cleanupEventListeners();

        this.active = false;
        this.unlockedElements.add('gold');
        this.unlockedElements.add('lives');
        this.unlockedElements.add('wave');
        this.unlockedElements.add('tower_bar');
        this.unlockedElements.add('wave_button');
        console.log("Tutorial: Skipped");
    }

    // Check if a UI element should be visible
    isElementVisible(elementId) {
        // If tutorial is not active, show everything
        if (!this.active) return true;

        // Check if element has been unlocked
        if (this.unlockedElements.has(elementId)) return true;

        // Check if element is currently being highlighted (show it)
        if (this.currentStep && this.currentStep.highlight === elementId) return true;

        return false;
    }

    /**
     * Check if action matches current step requirement and advance if matched
     * @param {string} actionType - Type of action performed (e.g., 'tower_placed', 'wave_started')
     */
    onAction(actionType) {
        if (!this.active || !this.currentStep) return;

        if (this.currentStep.action === actionType) {
            // Hide UI immediately when action is performed
            this.showUI = false;

            // Cancel any existing timeout
            if (this.pendingTimeout) {
                clearTimeout(this.pendingTimeout);
            }

            // Track the timeout so it can be canceled
            this.pendingTimeout = setTimeout(() => {
                this.nextStep();
                this.showUI = true;
                this.pendingTimeout = null;
            }, 300);
        }
    }

    // Handle click during tutorial
    handleClick() {
        if (!this.active || !this.currentStep) return false;

        if (this.currentStep.action === 'click') {
            this.nextStep();
            return true; // Consumed click
        }

        return false; // Allow normal click handling
    }

    // Draw tutorial overlay
    draw() {
        if (!this.active || !this.currentStep) return;
        if (!this.showUI) return; // Hide during action transitions

        // Don't show tutorial during dialogue
        if (this.game.state === GameState.DIALOGUE) return;
        if (this.game.dialogueManager && this.game.dialogueManager.active) return;

        let step = this.currentStep;

        // Draw dim overlay (except highlighted area)
        this.drawOverlay(step.highlight);

        // Draw dialogue box
        this.drawDialogue(step.title, step.text);

        // Draw arrow if element is highlighted
        if (step.highlight) {
            this.drawArrowForElement(step.highlight);
        }

        // Draw skip button
        this.drawSkipButton();
    }

    // Draw semi-transparent overlay with cutout for highlight
    drawOverlay(highlightType) {
        push();

        // Check if we should highlight specific tiles instead of darkening background
        let highlightedTiles = this.getHighlightedTiles();

        if (highlightedTiles && highlightedTiles.type === 'tiles') {
            // Draw highlights on specific tiles (for move/merge tutorials)
            let grid = this.game.grid;
            let offset = grid.getGridOffset();

            // Pulsing animation
            let pulseAlpha = sin(frameCount * 0.1) * 50 + 100;

            // Draw source towers (towers that can be moved/merged)
            if (highlightedTiles.sourceTiles) {
                for (let tile of highlightedTiles.sourceTiles) {
                    let x = offset.x + tile.c * grid.cellSize;
                    let y = offset.y + tile.r * grid.cellSize;

                    // Highlight fill
                    fill(
                        red(highlightedTiles.sourceColor),
                        green(highlightedTiles.sourceColor),
                        blue(highlightedTiles.sourceColor),
                        pulseAlpha
                    );
                    noStroke();
                    rect(x, y, grid.cellSize, grid.cellSize);

                    // Highlight border
                    noFill();
                    stroke(
                        red(highlightedTiles.sourceColor),
                        green(highlightedTiles.sourceColor),
                        blue(highlightedTiles.sourceColor),
                        pulseAlpha + 100
                    );
                    strokeWeight(3);
                    rect(x, y, grid.cellSize, grid.cellSize);
                }
            }

            // Draw target tiles (empty tiles where towers can move)
            if (highlightedTiles.targetTiles && highlightedTiles.targetColor) {
                for (let tile of highlightedTiles.targetTiles) {
                    let x = offset.x + tile.c * grid.cellSize;
                    let y = offset.y + tile.r * grid.cellSize;

                    // Highlight fill
                    fill(
                        red(highlightedTiles.targetColor),
                        green(highlightedTiles.targetColor),
                        blue(highlightedTiles.targetColor),
                        pulseAlpha * 0.6
                    );
                    noStroke();
                    rect(x, y, grid.cellSize, grid.cellSize);

                    // Highlight border
                    noFill();
                    stroke(
                        red(highlightedTiles.targetColor),
                        green(highlightedTiles.targetColor),
                        blue(highlightedTiles.targetColor),
                        pulseAlpha + 80
                    );
                    strokeWeight(2);
                    rect(x, y, grid.cellSize, grid.cellSize);
                }
            }

            // Draw animated arrows between source and target
            if (highlightedTiles.arrows && highlightedTiles.arrows.length > 0) {
                this.drawTutorialArrows(highlightedTiles.arrows, highlightedTiles.arrowColor, grid, offset);
            }
        } else {
            // Standard overlay with cutout (for UI elements)
            fill(0, 0, 0, 150);

            if (!highlightType) {
                // Full overlay
                rect(0, 0, width, height);
            } else {
                // Overlay with cutout
                let bounds = this.getHighlightBounds(highlightType);
                if (bounds) {
                    // Top
                    rect(0, 0, width, bounds.y - 5);
                    // Bottom
                    rect(0, bounds.y + bounds.h + 5, width, height);
                    // Left
                    rect(0, bounds.y - 5, bounds.x - 5, bounds.h + 10);
                    // Right
                    rect(bounds.x + bounds.w + 5, bounds.y - 5, width, bounds.h + 10);

                    // Highlight border
                    noFill();
                    stroke(255, 215, 0);
                    strokeWeight(3);
                    rect(bounds.x - 5, bounds.y - 5, bounds.w + 10, bounds.h + 10, 5);
                } else {
                    rect(0, 0, width, height);
                }
            }
        }

        pop();
    }

    // Get bounds for highlighted element (uses UIHelper registered bounds)
    getHighlightBounds(type) {
        // First try to get registered bounds from UIHelper
        if (typeof UI_HELPER !== 'undefined') {
            let bounds = UI_HELPER.getElementBounds(type);
            if (bounds) {
                return bounds;
            }
        }

        // Special case for grid areas (calculated, not registered)
        if (type === 'grid') {
            // Entire grid
            if (!this.game.grid) return null;
            let gridW = this.game.grid.cols * this.game.grid.cellSize;
            let gridH = this.game.grid.rows * this.game.grid.cellSize;
            let offsetX = (width - gridW) / 2;
            let offsetY = (height - gridH) / 2;
            return { x: offsetX, y: offsetY, w: gridW, h: gridH };
        }

        if (type === 'playable_grid') {
            // Only the green buildable area (excludes spawn and base zones)
            if (!this.game.grid) return null;

            let grid = this.game.grid;
            let cellSize = grid.cellSize;

            // Buildable area: columns 3 to cols-3 (NOMANS_LAND_COLS = 3)
            let noMansLandCols = GRID_CONSTANTS ? GRID_CONSTANTS.NOMANS_LAND_COLS : 3;
            let startCol = noMansLandCols;
            let endCol = grid.cols - noMansLandCols;

            // Calculate playable area bounds
            let playableW = (endCol - startCol) * cellSize;
            let playableH = grid.rows * cellSize;

            // Calculate grid offset
            let gridW = grid.cols * cellSize;
            let gridH = grid.rows * cellSize;
            let gridOffsetX = (width - gridW) / 2;
            let gridOffsetY = (height - gridH) / 2;

            // Playable area position
            let playableX = gridOffsetX + (startCol * cellSize);
            let playableY = gridOffsetY;

            return { x: playableX, y: playableY, w: playableW, h: playableH };
        }

        // Fallback for elements that weren't registered
        console.warn(`Tutorial: No bounds registered for element '${type}'`);
        return null;
    }

    // Draw arrow pointing at an element
    drawArrowForElement(elementId) {
        let arrowData;

        // Use DisplayManager if available
        if (this.game.displayManager) {
            arrowData = this.game.displayManager.getArrowForElement(elementId);
        }

        if (!arrowData) {
            // Fallback - compute from bounds
            let bounds = this.getHighlightBounds(elementId);
            if (!bounds) return;

            let centerX = bounds.x + bounds.w / 2;

            // Determine arrow direction based on element position
            if (bounds.y < height / 2) {
                // Top half - arrow points down from above
                arrowData = { x: centerX, y: bounds.y - 10, dir: 'down' };
            } else {
                // Bottom half - arrow points down from above
                arrowData = { x: centerX, y: bounds.y - 10, dir: 'down' };
            }
        }

        this.drawArrow(arrowData);
    }

    // Render rich text with per-letter effects (uses shared RichTextParser.render)
    renderRichText(startX, startY, maxWidth, maxHeight) {
        if (typeof RICH_TEXT_PARSER !== 'undefined' && this.characterSegmentMap.length > 0) {
            RICH_TEXT_PARSER.render(this.characterSegmentMap, this.textSegments, startX, startY, maxWidth, maxHeight, 16);
        }
    }

    // Draw dialogue box
    drawDialogue(title, message) {
        push();

        // Box position (center-top)
        let boxW = 500;
        let boxH = 140;
        let boxX = (width - boxW) / 2;
        let boxY = 80;

        // Background
        fill(20, 20, 40, 240);
        stroke(100, 200, 255);
        strokeWeight(3);
        rectMode(CORNER);
        rect(boxX, boxY, boxW, boxH, 15);

        // Title
        noStroke();
        fill(255, 215, 0);
        textSize(24);
        textAlign(CENTER, TOP);
        text(title, width / 2, boxY + 15);

        // Body text (rich text rendering)
        this.renderRichText(boxX + 20, boxY + 50, boxW - 40, 60);

        // Continue hint
        if (this.currentStep.action === 'click') {
            if (frameCount % 60 < 40) {
                fill(100, 255, 100);
                textSize(14);
                textAlign(CENTER, TOP);
                text("Click to continue...", width / 2, boxY + boxH - 25);
            }
        }

        pop();
    }

    // Draw directional arrow
    drawArrow(arrow) {
        push();

        let x = arrow.x;
        let y = arrow.y;

        // If targeting an element, position relative to it
        if (arrow.target) {
            let bounds = this.getHighlightBounds(arrow.target);
            if (bounds) {
                x = bounds.x + bounds.w / 2;
                y = bounds.y - 30;
            }
        }

        // Animated bounce
        let bounce = sin(frameCount * 0.15) * 8;

        fill(255, 215, 0);
        noStroke();

        // Draw arrow based on direction
        push();
        translate(x, y + bounce);

        if (arrow.dir === 'down') {
            triangle(-15, -20, 15, -20, 0, 0);
            rect(-8, -40, 16, 25);
        } else if (arrow.dir === 'up') {
            rotate(PI);
            triangle(-15, -20, 15, -20, 0, 0);
            rect(-8, -40, 16, 25);
        } else if (arrow.dir === 'left') {
            rotate(-HALF_PI);
            triangle(-15, -20, 15, -20, 0, 0);
            rect(-8, -40, 16, 25);
        } else if (arrow.dir === 'right') {
            rotate(HALF_PI);
            triangle(-15, -20, 15, -20, 0, 0);
            rect(-8, -40, 16, 25);
        }

        pop();
        pop();
    }

    // Draw skip button
    drawSkipButton() {
        push();

        let btnX = width - 100;
        let btnY = 20;
        let btnW = 80;
        let btnH = 30;

        // Check hover
        let hover = mouseX >= btnX && mouseX <= btnX + btnW &&
            mouseY >= btnY && mouseY <= btnY + btnH;

        fill(hover ? 100 : 60);
        stroke(150);
        strokeWeight(1);
        rect(btnX, btnY, btnW, btnH, 5);

        fill(200);
        noStroke();
        textSize(14);
        textAlign(CENTER, CENTER);
        text("SKIP", btnX + btnW / 2, btnY + btnH / 2);

        pop();
    }

    // Check if skip button was clicked
    isSkipClicked() {
        let btnX = width - 100;
        let btnY = 20;
        let btnW = 80;
        let btnH = 30;

        return mouseX >= btnX && mouseX <= btnX + btnW &&
            mouseY >= btnY && mouseY <= btnY + btnH;
    }

    // Draw animated equilateral triangle arrows between tiles
    drawTutorialArrows(arrows, arrowColor, grid, offset) {
        push();

        // Animate arrows traveling along path
        let animProgress = (frameCount * 0.02) % 1; // 0 to 1 cycle
        let pulseSize = sin(frameCount * 0.15) * 0.15 + 1; // Size pulse 0.85-1.15

        for (let arrow of arrows) {
            // Calculate start and end positions (center of tiles)
            let startX = offset.x + arrow.from.c * grid.cellSize + grid.cellSize / 2;
            let startY = offset.y + arrow.from.r * grid.cellSize + grid.cellSize / 2;
            let endX = offset.x + arrow.to.c * grid.cellSize + grid.cellSize / 2;
            let endY = offset.y + arrow.to.r * grid.cellSize + grid.cellSize / 2;

            // Calculate arrow position along path
            let arrowX = lerp(startX, endX, animProgress);
            let arrowY = lerp(startY, endY, animProgress);

            // Calculate angle pointing from start to end
            let angle = atan2(endY - startY, endX - startX);

            // Draw equilateral triangle arrow
            this.drawEquilateralTriangle(arrowX, arrowY, 16 * pulseSize, angle, arrowColor);

            // Draw subtle line trail
            stroke(
                red(arrowColor),
                green(arrowColor),
                blue(arrowColor),
                80
            );
            strokeWeight(2);
            line(startX, startY, endX, endY);
        }

        pop();
    }

    // Draw an equilateral triangle (used for arrows)
    drawEquilateralTriangle(x, y, size, rotation, color) {
        push();
        translate(x, y);
        rotate(rotation);

        // Equilateral triangle pointing right
        let height = size * Math.sqrt(3) / 2;

        fill(color);
        stroke(
            red(color) * 0.7,
            green(color) * 0.7,
            blue(color) * 0.7
        );
        strokeWeight(2);

        beginShape();
        vertex(height, 0);                    // Tip (pointing right)
        vertex(-height / 2, -size / 2);       // Top left
        vertex(-height / 2, size / 2);        // Bottom left
        endShape(CLOSE);

        // Add glow
        noStroke();
        fill(
            red(color),
            green(color),
            blue(color),
            100
        );
        beginShape();
        vertex(height, 0);
        vertex(-height / 2, -size / 2);
        vertex(-height / 2, size / 2);
        endShape(CLOSE);

        pop();
    }

    // Pre-spawn specific towers for move/merge tutorial to avoid softlocks
    spawnTutorialTowers() {
        if (!this.game.grid || !this.game.towerManager) return;

        let grid = this.game.grid;
        let towerManager = this.game.towerManager;

        // Clear any existing towers first
        for (let r = 0; r < grid.rows; r++) {
            for (let c = 0; c < grid.cols; c++) {
                if (grid.map[r][c] instanceof Tower) {
                    grid.map[r][c] = 0;
                }
            }
        }

        // Find middle row
        let midRow = Math.floor((grid.unlockStart + grid.unlockEnd) / 2);

        // Spawn 2 cannons (mergeable) and 1 sniper (for moving)
        // Positions: left-center area
        let positions = [
            { r: midRow, c: 5, type: 'cannon' },     // First cannon
            { r: midRow, c: 7, type: 'cannon' },     // Second cannon (can merge!)
            { r: midRow - 1, c: 6, type: 'sniper' }  // Sniper for moving
        ];

        for (let pos of positions) {
            let tower = towerManager.createTower(pos.type, pos.r, pos.c);
            if (tower) {
                grid.map[pos.r][pos.c] = tower;
            }
        }

        console.log("Tutorial: Pre-spawned 3 towers (2 cannons for merging, 1 sniper for moving)");
    }

    // Get highlighted tiles for current tutorial step
    getHighlightedTiles() {
        if (!this.active || !this.currentStep) return null;

        let grid = this.game.grid;
        if (!grid) return null;

        // For move tutorial: highlight ONE tower and ONE empty tile with arrow
        if (this.currentStep.id === 'move_tutorial') {
            let sourceTower = null;
            let targetTile = null;
            let minC = GRID_CONSTANTS.NOMANS_LAND_COLS;
            let maxC = grid.cols - GRID_CONSTANTS.NOMANS_LAND_COLS;

            // Find the sniper tower we spawned (row above middle, column 6)
            let midRow = Math.floor((grid.unlockStart + grid.unlockEnd) / 2);
            let sniperPos = { r: midRow - 1, c: 6 };

            // Check if sniper is still there, otherwise find any tower
            if (grid.map[sniperPos.r]?.[sniperPos.c] instanceof Tower) {
                sourceTower = sniperPos;
            } else {
                // Fallback: find any tower
                for (let r = 0; r < grid.rows; r++) {
                    for (let c = 0; c < grid.cols; c++) {
                        if (grid.map[r][c] instanceof Tower) {
                            sourceTower = { r: r, c: c };
                            break;
                        }
                    }
                    if (sourceTower) break;
                }
            }

            if (!sourceTower) return null;

            // Find a good empty tile to the right of the tower
            let emptyTiles = [];
            for (let r = grid.unlockStart; r <= grid.unlockEnd; r++) {
                for (let c = minC; c < maxC; c++) {
                    if (grid.map[r][c] === 0 && grid.getTerrainType(r, c) !== TERRAIN_TYPES.CLIFF) {
                        emptyTiles.push({ r: r, c: c });
                    }
                }
            }

            // Find closest empty tile that's to the right of the tower
            let rightTiles = emptyTiles
                .filter(tile => tile.c > sourceTower.c)
                .map(tile => ({
                    tile: tile,
                    dist: Math.abs(tile.r - sourceTower.r) + Math.abs(tile.c - sourceTower.c)
                }))
                .sort((a, b) => a.dist - b.dist);

            if (rightTiles.length > 0) {
                targetTile = rightTiles[0].tile;
            } else {
                // Fallback: any closest empty tile
                let closestTiles = emptyTiles
                    .map(tile => ({
                        tile: tile,
                        dist: Math.abs(tile.r - sourceTower.r) + Math.abs(tile.c - sourceTower.c)
                    }))
                    .sort((a, b) => a.dist - b.dist);

                if (closestTiles.length > 0) {
                    targetTile = closestTiles[0].tile;
                }
            }

            if (!targetTile) return null;

            // Create single arrow from tower to target
            let arrows = [{ from: sourceTower, to: targetTile }];

            return {
                type: 'tiles',
                sourceTiles: [sourceTower],
                targetTiles: [targetTile],
                sourceColor: color(100, 200, 255, 150),  // Cyan for tower
                targetColor: color(100, 255, 100, 150),  // Green for destination
                arrows: arrows,
                arrowColor: color(255, 255, 255, 200)
            };
        }

        // For merge tutorial: highlight mergeable towers with arrows between them
        if (this.currentStep.id === 'merge_tutorial') {
            let towers = [];
            let arrows = [];
            let towerTypes = {};

            // Count towers by type
            for (let r = 0; r < grid.rows; r++) {
                for (let c = 0; c < grid.cols; c++) {
                    let cell = grid.map[r][c];
                    if (cell instanceof Tower) {
                        let key = `${cell.type}_${cell.mergeRank}`;
                        if (!towerTypes[key]) towerTypes[key] = [];
                        towerTypes[key].push({ r: r, c: c, tower: cell });
                    }
                }
            }

            // Find the FIRST pair of mergeable towers and create ONE arrow
            for (let key in towerTypes) {
                if (towerTypes[key].length >= 2) {
                    let group = towerTypes[key];

                    // Only highlight the first 2 towers in this group
                    towers.push({ r: group[0].r, c: group[0].c });
                    towers.push({ r: group[1].r, c: group[1].c });

                    // Create ONE arrow from first tower to second tower
                    arrows.push({
                        from: { r: group[0].r, c: group[0].c },
                        to: { r: group[1].r, c: group[1].c }
                    });

                    // Only use the first mergeable pair, then stop
                    break;
                }
            }

            return {
                type: 'tiles',
                sourceTiles: towers,
                targetTiles: [],
                sourceColor: color(255, 215, 0, 150),  // Gold for mergeable towers
                targetColor: null,
                arrows: arrows,
                arrowColor: color(255, 215, 0, 220)
            };
        }

        return null;
    }
}
