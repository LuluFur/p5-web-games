let game;

// p5.js 2.0 Async Setup Pattern
async function setup() {
    let cnv = createCanvas(1280, 720); // 1.5x approx, 16:9 aspect

    // Expose drawingContext for Tower glowing effects
    // p5.js 2.0 / Global mode compatibility fix
    window.drawingContext = cnv.drawingContext || cnv.elt.getContext('2d');

    console.log("Setup: Async Loading Started");

    // Track failed assets for error handling
    const failedAssets = [];

    // Load all assets in parallel
    // Assets queue is defined in AssetLoader.js
    const promises = Assets.queue.map((item) => {
        if (item.type === 'image') {
            return new Promise((resolve, reject) => {
                loadImage(
                    item.path,
                    (img) => {
                        Assets.assets.images[item.key] = img;
                        resolve();
                    },
                    (err) => {
                        console.error(`Failed to load ${item.key}`, err);
                        failedAssets.push(item.key);
                        resolve(); // Resolve anyway to not block other loads
                    }
                );
            });
        }
        return Promise.resolve();
    });

    await Promise.all(promises);

    console.log("Setup: Loaded Assets:", Object.keys(Assets.assets.images));

    // Check for failed assets
    if (failedAssets.length > 0) {
        console.error('Failed to load assets:', failedAssets);

        // Critical assets that must load for game to function
        const criticalAssets = ['zombie', 'z_walk_e_0', 'z_walk_w_0', 'z_walk_s_0', 'z_walk_n_0'];
        const missingCritical = failedAssets.filter(asset =>
            criticalAssets.some(critical => asset.includes(critical))
        );

        if (missingCritical.length > 0) {
            // Display error message to user
            background(20);
            fill(255, 100, 100);
            textAlign(CENTER, CENTER);
            textSize(24);
            text('Failed to load critical game assets', width / 2, height / 2 - 40);
            textSize(16);
            fill(200);
            text('Please refresh the page or check your connection', width / 2, height / 2 + 20);
            textSize(12);
            fill(150);
            text(`Missing: ${missingCritical.join(', ')}`, width / 2, height / 2 + 60);

            console.error('Cannot start game - missing critical assets:', missingCritical);
            noLoop(); // Stop draw loop
            return; // Don't initialize game
        }

        // Non-critical assets missing - warn but continue
        console.warn('Some non-critical assets failed to load. Game may have visual issues.');
    }

    // Don't initialize SoundManager yet - wait for user interaction
    window.Sounds = null;

    game = new Game(); // Singleton
    game.init();
}

function draw() {
    background(20);
    if (game) {
        game.update();
        game.draw();
    }
}

function mousePressed() {
    // Initialize Sound Manager on first click (browser audio policy requires user interaction)
    if (!window.Sounds) {
        try {
            window.Sounds = new SoundManager();
            window.Sounds.init();
        } catch (e) {
            console.warn("Sound initialization failed:", e);
            // Fallback stub with all expected methods
            window.Sounds = {
                play: () => {},
                reset: () => {},
                enabled: false,
                initialized: true
            };
        }
    } else if (!window.Sounds.initialized) {
        window.Sounds.init();
    }

    // Resume Audio Context
    if (typeof userStartAudio !== 'undefined') {
        userStartAudio();
    }

    if (game) {
        game.handleMousePressed();
    }
}

function mouseDragged() {
    if (game && game.inputManager) {
        game.inputManager.handleMouseDragged();
    }
}

function mouseReleased() {
    if (game && game.inputManager) {
        game.inputManager.handleMouseReleased();
    }
}

function keyPressed() {
    if (game) {
        game.handleKeyPressed(key);
    }
}
