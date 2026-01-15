let game;

// p5.js 2.0 Async Setup Pattern
async function setup() {
    let cnv = createCanvas(1280, 720); // 1.5x approx, 16:9 aspect

    // Expose drawingContext for Tower glowing effects
    // p5.js 2.0 / Global mode compatibility fix
    window.drawingContext = cnv.drawingContext || cnv.elt.getContext('2d');

    console.log("Setup: Game initialization started");

    game = new Game(); // Singleton
    game.initRTS(); // Start directly in RTS mode
}

function draw() {
    background(20);
    if (game) {
        game.update();
        game.draw();
    }
}

function mousePressed() {
    // Sound system deprecated for RTS mode - stub out for now
    // Original SoundManager kept in src/SoundManager.js for reference
    if (!window.Sounds) {
        window.Sounds = {
            play: () => {},
            reset: () => {},
            enabled: false,
            initialized: true
        };
    }

    if (game) {
        game.handleMousePressed();
    }
}

function mouseDragged() {
    // RTS Mode
    if (game && game.isRTSMode) {
        game.handleRTSMouseDragged();
        return;
    }

    if (game && game.inputManager) {
        game.inputManager.handleMouseDragged();
    }
}

function mouseReleased() {
    // RTS Mode
    if (game && game.isRTSMode) {
        game.handleRTSMouseReleased();
        return;
    }

    if (game && game.inputManager) {
        game.inputManager.handleMouseReleased();
    }
}

// Prevent context menu on right-click (for RTS commands)
document.addEventListener('contextmenu', (e) => {
    if (game && game.isRTSMode) {
        e.preventDefault();
    }
});

function keyPressed() {
    if (game) {
        game.handleKeyPressed(key);
    }
}

function mouseWheel(event) {
    if (game && game.isRTSMode) {
        game.handleMouseWheel(event.delta);
        return false; // Prevent page scrolling
    }
}
