// InputManager.js - Handles mouse and keyboard input
class InputManager {
    constructor(game) {
        this.game = game;
        this.draggingTower = null; // Tower being dragged
        this.dragStartTime = 0; // To differentiate click vs drag
    }

    // Main mouse press handler
    handleMousePressed() {
        let game = this.game;
        let tutorial = game.tutorialManager;

        // Safety: clear any lingering drag state from previous operations
        if (this.draggingTower) {
            // Check if the dragging tower is still valid on the grid
            let grid = game.grid;
            if (grid && this.draggingTower.row !== undefined && this.draggingTower.col !== undefined) {
                if (grid.map[this.draggingTower.row]?.[this.draggingTower.col] !== this.draggingTower) {
                    // Tower no longer on grid (was merged or deleted)
                    console.warn("Clearing stale dragging tower reference");
                    this.draggingTower = null;
                }
            } else {
                // Invalid drag state
                console.warn("Clearing invalid dragging tower");
                this.draggingTower = null;
            }
        }

        // Tutorial handling (highest priority when active)
        if (tutorial && tutorial.active) {
            // Check skip button
            if (tutorial.isSkipClicked()) {
                tutorial.skip();
                return;
            }
            // Handle tutorial click (may consume it)
            if (tutorial.handleClick()) {
                return;
            }
        }

        // Menu state - handle level selection and tutorial checkbox
        if (game.state === GameState.MENU) {
            this.handleMenuClick();
            return;
        }

        // Pause state - handle pause menu clicks
        if (game.state === GameState.PAUSED) {
            this.handlePauseClick();
            return;
        }

        // Level complete state - click to continue
        if (game.state === GameState.LEVEL_COMPLETE) {
            game.setState(GameState.MENU);
            return;
        }

        // Game over state - handled by keyboard
        if (game.state === GameState.GAMEOVER) return;

        // Dialogue state - advance dialogue
        if (game.state === GameState.DIALOGUE) {
            if (game.dialogueManager && game.dialogueManager.handleClick()) {
                return;
            }
        }

        // Play state
        if (game.state !== GameState.PLAY) return;

        // 0. Check Spell Casting (active spell takes priority)
        if (game.spellManager && game.spellManager.handleClick(mouseX, mouseY)) {
            return;
        }

        // 1. Check UI Interaction
        if (game.ui && game.ui.handleClick()) {
            // Notify tutorial of tower selection
            if (tutorial && tutorial.active) {
                tutorial.onAction('tower_selected');
            }
            return;
        }

        // 2. Handle grid interactions
        this.handleGridClick();
    }

    // Handle clicks on pause menu
    handlePauseClick() {
        let game = this.game;

        // Pause menu dimensions (match DisplayRenderer)
        let boxW = 300;
        let boxH = 200;
        let boxX = (width - boxW) / 2;
        let boxY = height / 2 - 50;

        let btnY = boxY + 40;
        let btnH = 40;
        let btnSpacing = 20;

        // Resume button
        if (mouseX >= boxX + 50 && mouseX <= boxX + boxW - 50 &&
            mouseY >= btnY && mouseY <= btnY + btnH) {
            game.setState(GameState.PLAY);
            return;
        }

        btnY += btnH + btnSpacing;

        // Restart button
        if (mouseX >= boxX + 50 && mouseX <= boxX + boxW - 50 &&
            mouseY >= btnY && mouseY <= btnY + btnH) {
            game.init();
            return;
        }

        btnY += btnH + btnSpacing;

        // Main menu button
        if (mouseX >= boxX + 50 && mouseX <= boxX + boxW - 50 &&
            mouseY >= btnY && mouseY <= btnY + btnH) {
            game.setState(GameState.MENU);
            return;
        }
    }

    // Handle clicks on menu (level selection and tutorial checkbox)
    handleMenuClick() {
        let game = this.game;
        let levelManager = game.levelManager;
        if (!levelManager) return;

        // Level button click detection
        let btnW = 120;
        let btnH = 80;
        let spacing = 20;
        let startX = (width - (5 * btnW + 4 * spacing)) / 2;
        let startY = 250;

        for (let level = 1; level <= 5; level++) {
            let x = startX + (level - 1) * (btnW + spacing);
            let y = startY;

            if (mouseX >= x && mouseX <= x + btnW &&
                mouseY >= y && mouseY <= y + btnH) {
                // Level button clicked
                if (levelManager.isLevelUnlocked(level)) {
                    levelManager.startLevel(level);
                    game.init(); // Reinitialize game for selected level
                    game.setState(GameState.PLAY);
                    return;
                }
            }
        }

        // Tutorial checkbox removed - tutorial auto-runs on Level 1 only
    }

    // Handle clicks on the game grid
    handleGridClick() {
        let game = this.game;
        let grid = game.grid;
        let towerManager = game.towerManager;
        let waveManager = game.waveManager;
        let tutorial = game.tutorialManager;

        if (!grid) return;

        let offset = grid.getGridOffset();
        let mx = mouseX - offset.x;
        let my = mouseY - offset.y;

        // Click outside grid -> Deselect
        if (mx < 0 || mx > offset.width || my < 0 || my > offset.height) {
            if (towerManager) towerManager.deselectTower();
            return;
        }

        let cell = grid.getCellAt(mx, my);
        let target = grid.map[cell.r][cell.c];

        // During wave - only allow selection (no dragging)
        if (waveManager && waveManager.waveActive) {
            if (target instanceof Tower && towerManager) {
                towerManager.selectTowerAt(cell.r, cell.c);
            } else if (towerManager) {
                towerManager.deselectTower();
            }
            return;
        }

        // A. Clicked Existing Tower -> Start Drag (for moving/merging)
        if (target instanceof Tower) {
            // Start drag operation
            this.draggingTower = target;
            this.dragStartTime = millis();
            target.isDragging = true;
            target.dragOffsetX = mouseX - (target.col * 64 + offset.x + 32);
            target.dragOffsetY = mouseY - (target.row * 64 + offset.y + 32);
            target.originalRow = target.row;
            target.originalCol = target.col;

            if (towerManager) towerManager.selectTowerAt(cell.r, cell.c);
            return;
        }

        // B. Clicked Empty -> Just deselect (no manual placement)
        if (towerManager) {
            towerManager.deselectTower();
        }
    }

    // Handle mouse dragging (called from sketch.js mouseDragged())
    handleMouseDragged() {
        if (!this.draggingTower) return;

        // Update tower visual position (not grid position yet)
        let grid = this.game.grid;
        if (!grid) return;

        let offset = grid.getGridOffset();

        // Tower follows mouse with offset
        let targetX = mouseX - offset.x - this.draggingTower.dragOffsetX;
        let targetY = mouseY - offset.y - this.draggingTower.dragOffsetY;

        // Convert to grid coordinates (for visual feedback)
        this.draggingTower.dragX = targetX;
        this.draggingTower.dragY = targetY;
    }

    // Handle mouse release (called from sketch.js mouseReleased())
    handleMouseReleased() {
        if (!this.draggingTower) return;

        let tower = this.draggingTower;
        let grid = this.game.grid;
        let towerManager = this.game.towerManager;

        if (!grid || !towerManager) {
            this.cancelDrag();
            return;
        }

        // Safety check: ensure tower still exists on grid
        if (tower.row === undefined || tower.col === undefined) {
            console.warn("Dragging tower has no position - canceling");
            this.draggingTower = null;
            return;
        }

        if (grid.map[tower.row]?.[tower.col] !== tower) {
            console.warn("Dragging tower is no longer on grid - canceling");
            this.draggingTower = null;
            return;
        }

        let offset = grid.getGridOffset();
        let mx = mouseX - offset.x;
        let my = mouseY - offset.y;

        // Check if released on valid grid cell
        if (mx < 0 || mx > offset.width || my < 0 || my > offset.height) {
            this.cancelDrag();
            return;
        }

        let cell = grid.getCellAt(mx, my);
        let target = grid.map[cell.r][cell.c];

        // If quick click (not drag), just select tower
        let dragDuration = millis() - this.dragStartTime;
        if (dragDuration < INPUT_CONSTANTS.CLICK_DRAG_THRESHOLD_MS) { // Quick click vs drag
            this.cancelDrag();
            return;
        }

        // Check if dropped on another tower (attempt merge)
        if (target instanceof Tower && target !== tower) {
            // Try to merge towers of same type
            if (towerManager.attemptMerge(tower, target)) {
                console.log("Merge successful!");
                // Clear ALL drag state immediately after successful merge
                // Even though tower was deleted from grid, clear its properties
                // to prevent any ghost references
                tower.isDragging = false;
                tower.dragX = undefined;
                tower.dragY = undefined;
                tower.dragOffsetX = undefined;
                tower.dragOffsetY = undefined;
                tower.originalRow = undefined;
                tower.originalCol = undefined;
                this.draggingTower = null;
                return;
            } else {
                console.log("Cannot merge - different type or rank");
                // JUICE: Failed merge feedback
                if (window.Sounds) window.Sounds.play('error', 0.4);
                if (grid.flashInvalidTile) {
                    grid.flashInvalidTile(target.row, target.col);
                }
                this.cancelDrag();
                return;
            }
        }
        // Dropped on empty space - try to move tower
        else if (target === 0) {
            if (towerManager.moveTower(tower, cell.r, cell.c)) {
                console.log("Tower moved!");
                // Play movement sound
                if (window.Sounds) window.Sounds.play('build', 0.5);
                // Clear drag state after successful move
                tower.isDragging = false;
                tower.dragX = undefined;
                tower.dragY = undefined;
                this.draggingTower = null;
                return;
            } else {
                console.log("Cannot move tower there");
                // JUICE: Failed move feedback
                if (window.Sounds) window.Sounds.play('error', 0.3);
                this.cancelDrag();
                return;
            }
        }
        // Dropped on same tower - cancel
        else {
            this.cancelDrag();
        }
    }

    // Cancel drag and return tower to original position
    cancelDrag() {
        if (!this.draggingTower) return;

        // Only try to access tower properties if it still exists on grid
        if (this.draggingTower.row !== undefined && this.draggingTower.col !== undefined) {
            let grid = this.game.grid;
            if (grid && grid.map[this.draggingTower.row]?.[this.draggingTower.col] === this.draggingTower) {
                // Tower still exists on grid, safe to modify
                this.draggingTower.isDragging = false;
                this.draggingTower.dragX = undefined;
                this.draggingTower.dragY = undefined;
            }
        }

        this.draggingTower = null;
    }

    // Keyboard input handler
    handleKeyPressed(key) {
        let game = this.game;

        // R to restart
        if (key === 'r' || key === 'R') {
            if (game.state === GameState.GAMEOVER || game.state === GameState.PAUSED) {
                game.init();
                if (typeof window.Sounds !== 'undefined') window.Sounds.reset();
            }
        }

        // M for main menu
        if (key === 'm' || key === 'M') {
            if (game.state === GameState.GAMEOVER || game.state === GameState.PAUSED) {
                game.setState(GameState.MENU);
            }
        }

        // D to toggle debug
        if (key === 'd' || key === 'D') {
            if (game.debugRenderer) {
                game.debugRenderer.toggle();
            }
        }

        // ESC to toggle pause or skip tutorial
        if (key === 'Escape') {
            if (game.tutorialManager && game.tutorialManager.active) {
                game.tutorialManager.skip();
            } else if (game.state === GameState.PLAY) {
                // Pause game
                game.setState(GameState.PAUSED);
            } else if (game.state === GameState.PAUSED) {
                // Resume game
                game.setState(GameState.PLAY);
            }
        }

        // Space to start wave
        if (key === ' ' && game.state === GameState.PLAY) {
            if (game.waveManager && !game.waveManager.waveActive) {
                game.waveManager.startWave();

                // Notify tutorial
                if (game.tutorialManager && game.tutorialManager.active) {
                    game.tutorialManager.onAction('wave_started');
                }
            }
        }

        // Number keys to select tower type
        if (key === '1' && game.towerManager) {
            game.towerManager.selectedTowerType = 'cannon';
        }
        if (key === '2' && game.towerManager) {
            game.towerManager.selectedTowerType = 'double';
        }
        if (key === '3' && game.towerManager) {
            game.towerManager.selectedTowerType = 'flame';
        }
        if (key === '4' && game.towerManager) {
            game.towerManager.selectedTowerType = 'electric';
        }
        if (key === '5' && game.towerManager) {
            game.towerManager.selectedTowerType = 'sniper';
        }
        if (key === '6' && game.towerManager) {
            game.towerManager.selectedTowerType = 'buffer';
        }
    }
}
