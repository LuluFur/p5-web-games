let game;

function setup() {
    createCanvas(800, 600);
    game = new Game();
    game.init();
}

function draw() {
    background(20);
    game.update();
    game.draw();
}
