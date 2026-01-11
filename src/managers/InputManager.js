// InputManager.js - Handles mouse and keyboard input
class InputManager {
    constructor(game) {
        this.game = game;
        // TD drag/drop removed - RTS uses different input model
    }

    // Main mouse press handler
    handleMousePressed() {
        let game = this.game;
        let tutorial = game.tutorialManager;

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
            return;
        }

        // 2. Handle grid interactions (RTS mode)
        // TD grid click handling removed
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

    // TD grid click handlers removed - RTS uses different input model (handled by RTS managers)

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

        // TD wave start and tower selection hotkeys removed
        // RTS uses different input model
    }
}
