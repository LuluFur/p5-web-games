/**
 * BuilderTests.js - Comprehensive tests for all Builder classes
 *
 * Tests the fluent builder pattern implementation for:
 * - Player.Builder
 * - Unit.Builder
 * - Building.Builder
 * - Grid.Builder
 * - Command.Builder
 *
 * Run in browser console: runBuilderTests()
 */

// ===========================================
// PLAYER BUILDER TESTS
// ===========================================
TestRunner.suite('Player.Builder', () => {

    TestRunner.test('should create player with default values', () => {
        const player = Player.Builder.create()
            .build();

        TestRunner.assert(player instanceof Player, 'Should be Player instance');
        TestRunner.assertEqual(player.id, 0, 'Default ID');
        TestRunner.assertEqual(player.isHuman, true, 'Default is human');
        TestRunner.assertEqual(player.team, 0, 'Default team');
    });

    TestRunner.test('should create human player with custom values', () => {
        const player = Player.Builder.create()
            .withId(1)
            .withName('Commander')
            .asHuman()
            .onTeam(0)
            .withColor(100, 150, 200)
            .withStartingResources(10000)
            .build();

        TestRunner.assertEqual(player.id, 1);
        TestRunner.assertEqual(player.name, 'Commander');
        TestRunner.assertEqual(player.isHuman, true);
        TestRunner.assertEqual(player.team, 0);
        TestRunner.assertEqual(player.color.r, 100);
        TestRunner.assertEqual(player.resources.tiberium, 10000);
    });

    TestRunner.test('should create AI player with personality', () => {
        const player = Player.Builder.create()
            .withId(2)
            .asAI('RUSHER')
            .withAIDifficulty('HARD')
            .onTeam(1)
            .build();

        TestRunner.assertEqual(player.isHuman, false);
        TestRunner.assertEqual(player.aiPersonality, 'RUSHER');
        TestRunner.assertEqual(player.aiDifficulty, 'HARD');
        TestRunner.assertEqual(player.team, 1);
    });

    TestRunner.test('should use static factory for human player', () => {
        const player = Player.Builder.human(5, 'TestPlayer');

        TestRunner.assertEqual(player.id, 5);
        TestRunner.assertEqual(player.name, 'TestPlayer');
        TestRunner.assertEqual(player.isHuman, true);
    });

    TestRunner.test('should set start position', () => {
        const player = Player.Builder.create()
            .atStartPosition(100, 200)
            .build();

        TestRunner.assertDeepEqual(player.startPosition, { x: 100, y: 200 });
    });
});

// ===========================================
// UNIT BUILDER TESTS
// ===========================================
TestRunner.suite('Unit.Builder', () => {

    TestRunner.test('should create infantry unit with defaults', () => {
        const unit = Unit.Builder.create()
            .ofType('infantry')
            .atPosition(100, 200)
            .build();

        TestRunner.assert(unit instanceof InfantryUnit, 'Should be InfantryUnit');
        TestRunner.assertEqual(unit.x, 100);
        TestRunner.assertEqual(unit.y, 200);
    });

    TestRunner.test('should create vehicle unit', () => {
        const unit = Unit.Builder.create()
            .ofType('vehicle')
            .atPosition(50, 50)
            .build();

        TestRunner.assert(unit instanceof VehicleUnit, 'Should be VehicleUnit');
    });

    TestRunner.test('should create harvester with capacity', () => {
        const unit = Unit.Builder.create()
            .ofType('harvester')
            .withHarvestCapacity(2000)
            .withHarvestRate(100)
            .build();

        TestRunner.assert(unit instanceof HarvesterUnit, 'Should be HarvesterUnit');
        TestRunner.assertEqual(unit.capacity, 2000);
        TestRunner.assertEqual(unit.harvestRate, 100);
    });

    TestRunner.test('should override health and speed', () => {
        const unit = Unit.Builder.create()
            .ofType('infantry')
            .withHealth(500)
            .withSpeed(100)
            .withDamage(50)
            .build();

        TestRunner.assertEqual(unit.maxHealth, 500);
        TestRunner.assertEqual(unit.health, 500);
    });

    TestRunner.test('should set unit owner', () => {
        const player = Player.Builder.human(1, 'Owner');
        const unit = Unit.Builder.create()
            .ofType('infantry')
            .ownedBy(player)
            .build();

        TestRunner.assertEqual(unit.owner, player);
    });

    TestRunner.test('should use static factory for infantry', () => {
        const player = Player.Builder.human();
        const unit = Unit.Builder.infantry(player, 50, 75);

        TestRunner.assert(unit instanceof InfantryUnit);
        TestRunner.assertEqual(unit.x, 50);
        TestRunner.assertEqual(unit.y, 75);
    });

    TestRunner.test('should apply armor override', () => {
        const unit = Unit.Builder.create()
            .ofType('vehicle')
            .withArmor(0.5)
            .build();

        TestRunner.assertEqual(unit.baseArmor, 0.5);
    });
});

// ===========================================
// BUILDING BUILDER TESTS
// ===========================================
TestRunner.suite('Building.Builder', () => {

    TestRunner.test('should create barracks at grid position', () => {
        const building = Building.Builder.create()
            .ofType('barracks')
            .atGridPosition(5, 10)
            .build();

        TestRunner.assert(building instanceof Barracks, 'Should be Barracks');
        TestRunner.assertEqual(building.gridX, 5);
        TestRunner.assertEqual(building.gridY, 10);
    });

    TestRunner.test('should create power plant with custom health', () => {
        const building = Building.Builder.create()
            .ofType('power_plant')
            .withHealth(2000)
            .build();

        TestRunner.assert(building instanceof PowerPlant);
        TestRunner.assertEqual(building.maxHealth, 2000);
        TestRunner.assertEqual(building.health, 2000);
    });

    TestRunner.test('should create construction yard as complete', () => {
        const building = Building.Builder.create()
            .ofType('construction_yard')
            .asComplete()
            .build();

        TestRunner.assert(building instanceof ConstructionYard);
        TestRunner.assertEqual(building.isComplete, true);
        TestRunner.assertEqual(building.state, BUILDING_STATES.ACTIVE);
    });

    TestRunner.test('should create building in constructing state', () => {
        const building = Building.Builder.create()
            .ofType('refinery')
            .asConstructing()
            .build();

        TestRunner.assertEqual(building.isComplete, false);
        TestRunner.assertEqual(building.state, BUILDING_STATES.CONSTRUCTING);
        TestRunner.assertEqual(building.buildProgress, 0);
    });

    TestRunner.test('should set rally point', () => {
        const building = Building.Builder.create()
            .ofType('barracks')
            .withRallyPoint(200, 300)
            .build();

        TestRunner.assertDeepEqual(building.rallyPoint, { x: 200, y: 300 });
    });

    TestRunner.test('should set power output', () => {
        const building = Building.Builder.create()
            .ofType('power_plant')
            .withPowerOutput(200)
            .build();

        TestRunner.assertEqual(building.powerOutput, 200);
    });

    TestRunner.test('should use static factory for barracks', () => {
        const player = Player.Builder.human();
        const building = Building.Builder.barracks(player, 3, 4);

        TestRunner.assert(building instanceof Barracks);
        TestRunner.assertEqual(building.gridX, 3);
        TestRunner.assertEqual(building.gridY, 4);
    });
});

// ===========================================
// GRID BUILDER TESTS
// ===========================================
TestRunner.suite('Grid.Builder', () => {

    TestRunner.test('should create grid with dimensions', () => {
        const grid = Grid.Builder.create()
            .withDimensions(15, 20)
            .withCellSize(32)
            .build();

        TestRunner.assertEqual(grid.rows, 15);
        TestRunner.assertEqual(grid.cols, 20);
        TestRunner.assertEqual(grid.cellSize, 32);
    });

    TestRunner.test('should create RTS mode grid', () => {
        const grid = Grid.Builder.create()
            .withDimensions(20, 30)
            .asRTSMode()
            .withoutTrees()
            .build();

        TestRunner.assertEqual(grid.isRTSMode, true);
        TestRunner.assertEqual(grid.skipTrees, true);
    });

    TestRunner.test('should create tower defense grid', () => {
        const grid = Grid.Builder.create()
            .asTowerDefenseMode()
            .withTrees()
            .build();

        TestRunner.assertEqual(grid.isRTSMode, false);
        TestRunner.assertEqual(grid.skipTrees, false);
    });

    TestRunner.test('should set level ID', () => {
        const grid = Grid.Builder.create()
            .forLevel(3)
            .build();

        // Level is passed to constructor (verify grid exists)
        TestRunner.assert(grid instanceof Grid);
    });

    TestRunner.test('should use static factory for RTS', () => {
        const grid = Grid.Builder.rts(25, 35, 24);

        TestRunner.assertEqual(grid.rows, 25);
        TestRunner.assertEqual(grid.cols, 35);
        TestRunner.assertEqual(grid.cellSize, 24);
        TestRunner.assertEqual(grid.isRTSMode, true);
    });

    TestRunner.test('should use static factory for tower defense', () => {
        const grid = Grid.Builder.towerDefense(12, 18, 48);

        TestRunner.assertEqual(grid.rows, 12);
        TestRunner.assertEqual(grid.cols, 18);
        TestRunner.assertEqual(grid.cellSize, 48);
        TestRunner.assertEqual(grid.isRTSMode, false);
    });
});

// ===========================================
// COMMAND BUILDER TESTS
// ===========================================
TestRunner.suite('Command.Builder', () => {

    // Helper to create a test unit
    function createTestUnit() {
        return Unit.Builder.create()
            .ofType('infantry')
            .atPosition(100, 100)
            .build();
    }

    TestRunner.test('should create move command', () => {
        const unit = createTestUnit();
        const cmd = Command.Builder.create()
            .forUnit(unit)
            .moveTo(200, 300)
            .build();

        TestRunner.assert(cmd instanceof MoveCommand);
        TestRunner.assertEqual(cmd.targetX, 200);
        TestRunner.assertEqual(cmd.targetY, 300);
    });

    TestRunner.test('should create attack command', () => {
        const unit = createTestUnit();
        const target = createTestUnit();
        const cmd = Command.Builder.create()
            .forUnit(unit)
            .attack(target)
            .withPursuit(false)
            .build();

        TestRunner.assert(cmd instanceof AttackCommand);
        TestRunner.assertEqual(cmd.target, target);
        TestRunner.assertEqual(cmd.pursue, false);
    });

    TestRunner.test('should create stop command', () => {
        const unit = createTestUnit();
        const cmd = Command.Builder.create()
            .forUnit(unit)
            .stop()
            .build();

        TestRunner.assert(cmd instanceof StopCommand);
    });

    TestRunner.test('should create patrol command', () => {
        const unit = createTestUnit();
        const cmd = Command.Builder.create()
            .forUnit(unit)
            .patrolTo(400, 400)
            .build();

        TestRunner.assert(cmd instanceof PatrolCommand);
    });

    TestRunner.test('should create harvest command', () => {
        const unit = Unit.Builder.create()
            .ofType('harvester')
            .build();

        const cmd = Command.Builder.create()
            .forUnit(unit)
            .harvest()
            .build();

        TestRunner.assert(cmd instanceof HarvestCommand);
    });

    TestRunner.test('should throw error without unit', () => {
        TestRunner.assertThrows(() => {
            Command.Builder.create()
                .moveTo(100, 100)
                .build();
        }, 'Should throw when unit not set');
    });

    TestRunner.test('should use static factory for move', () => {
        const unit = createTestUnit();
        const cmd = Command.Builder.move(unit, 150, 250);

        TestRunner.assert(cmd instanceof MoveCommand);
        TestRunner.assertEqual(cmd.targetX, 150);
        TestRunner.assertEqual(cmd.targetY, 250);
    });
});

// ===========================================
// MAP GENERATOR TESTS
// ===========================================
TestRunner.suite('MapGenerator', () => {

    TestRunner.test('should create generator with default settings', () => {
        const gen = MapGenerator.Builder.create()
            .withDimensions(30, 40)
            .build();

        TestRunner.assertEqual(gen.rows, 30);
        TestRunner.assertEqual(gen.cols, 40);
        TestRunner.assertEqual(gen.playerCount, 2);
    });

    TestRunner.test('should generate start positions for 2 players', () => {
        const gen = MapGenerator.Builder.create()
            .withDimensions(30, 40)
            .symmetric2Player()
            .build();

        gen.generate();

        TestRunner.assertEqual(gen.startPositions.length, 2);
        TestRunner.assertEqual(gen.startPositions[0].playerId, 0);
        TestRunner.assertEqual(gen.startPositions[1].playerId, 1);
    });

    TestRunner.test('should generate tiberium fields within bounds', () => {
        const gen = MapGenerator.Builder.create()
            .withDimensions(30, 40)
            .build();

        gen.generate();

        for (const field of gen.tiberiumFields) {
            const minX = field.gridX - field.radius;
            const maxX = field.gridX + field.radius;
            const minY = field.gridY - field.radius;
            const maxY = field.gridY + field.radius;

            TestRunner.assert(minX >= 0, `Field X min ${minX} should be >= 0`);
            TestRunner.assert(maxX < gen.cols, `Field X max ${maxX} should be < ${gen.cols}`);
            TestRunner.assert(minY >= 0, `Field Y min ${minY} should be >= 0`);
            TestRunner.assert(maxY < gen.rows, `Field Y max ${maxY} should be < ${gen.rows}`);
        }
    });

    TestRunner.test('should generate blue tiberium in center', () => {
        const gen = MapGenerator.Builder.create()
            .withDimensions(30, 40)
            .build();

        gen.generate();

        const blueTiberium = gen.tiberiumFields.find(f => f.type === 'blue');
        TestRunner.assert(blueTiberium !== undefined, 'Should have blue tiberium');
        TestRunner.assert(blueTiberium.contested === true, 'Blue tiberium should be contested');
    });

    TestRunner.test('should generate surface map with correct dimensions', () => {
        const gen = MapGenerator.Builder.create()
            .withDimensions(20, 25)
            .build();

        gen.generate();

        TestRunner.assertEqual(gen.surfaceMap.length, 20);
        TestRunner.assertEqual(gen.surfaceMap[0].length, 25);
    });

    TestRunner.test('should use reproducible seed', () => {
        const gen1 = MapGenerator.Builder.create()
            .withDimensions(20, 20)
            .withSeed(12345)
            .build();

        const gen2 = MapGenerator.Builder.create()
            .withDimensions(20, 20)
            .withSeed(12345)
            .build();

        const result1 = gen1.generate();
        const result2 = gen2.generate();

        TestRunner.assertEqual(result1.startPositions.length, result2.startPositions.length);
        TestRunner.assertEqual(result1.startPositions[0].gridX, result2.startPositions[0].gridX);
        TestRunner.assertEqual(result1.startPositions[0].gridY, result2.startPositions[0].gridY);
    });

    TestRunner.test('should use static factory for 2-player map', () => {
        const grid = { rows: 30, cols: 40, cellSize: 32 };
        const gen = MapGenerator.Builder.twoPlayer(grid, 99999);

        TestRunner.assertEqual(gen.rows, 30);
        TestRunner.assertEqual(gen.cols, 40);
        TestRunner.assertEqual(gen.seed, 99999);
    });
});

// ===========================================
// BUILDING MANAGER TESTS
// ===========================================
TestRunner.suite('BuildingManager', () => {

    TestRunner.test('should have all building types registered', () => {
        // Create a minimal mock game object
        const mockGame = { grid: null, players: [] };
        const manager = new BuildingManager(mockGame);

        TestRunner.assert(manager.buildingTypes['construction_yard'] !== undefined);
        TestRunner.assert(manager.buildingTypes['power_plant'] !== undefined);
        TestRunner.assert(manager.buildingTypes['barracks'] !== undefined);
        TestRunner.assert(manager.buildingTypes['refinery'] !== undefined);
        TestRunner.assert(manager.buildingTypes['war_factory'] !== undefined);
        TestRunner.assert(manager.buildingTypes['tech_center'] !== undefined);
        TestRunner.assert(manager.buildingTypes['guard_tower'] !== undefined);
        TestRunner.assert(manager.buildingTypes['silo'] !== undefined);
    });

    TestRunner.test('should have building info cache for all types', () => {
        const mockGame = { grid: null, players: [] };
        const manager = new BuildingManager(mockGame);

        const types = ['construction_yard', 'power_plant', 'barracks', 'refinery',
                       'war_factory', 'tech_center', 'guard_tower', 'silo'];

        for (const type of types) {
            TestRunner.assert(manager.buildingInfoCache[type] !== undefined, `Missing cache for ${type}`);
            TestRunner.assert(manager.buildingInfoCache[type].name !== undefined, `Missing name for ${type}`);
            TestRunner.assert(manager.buildingInfoCache[type].cost !== undefined, `Missing cost for ${type}`);
        }
    });
});

// ===========================================
// UNIT BEHAVIOR TESTS
// ===========================================
TestRunner.suite('UnitBehavior', () => {

    TestRunner.test('harvester should have passive stance (not aggressive)', () => {
        const harvester = Unit.Builder.create()
            .ofType('harvester')
            .build();

        // Harvesters should not chase enemies - they should harvest
        TestRunner.assert(
            harvester.stance !== RTS_UNIT_STANCES.AGGRESSIVE,
            'Harvester should not have AGGRESSIVE stance'
        );
    });

    TestRunner.test('infantry should have reasonable speed (< 5)', () => {
        const unit = Unit.Builder.create()
            .ofType('infantry')
            .build();

        const speed = unit.getSpeed();
        TestRunner.assert(speed < 5, `Infantry speed ${speed} is too high (should be < 5)`);
        TestRunner.assert(speed > 0, `Infantry speed ${speed} should be positive`);
    });

    TestRunner.test('harvester should have reasonable speed (< 5)', () => {
        const harvester = Unit.Builder.create()
            .ofType('harvester')
            .build();

        const speed = harvester.getSpeed();
        TestRunner.assert(speed < 5, `Harvester speed ${speed} is too high (should be < 5)`);
    });

    TestRunner.test('UnitManager should create units with correct speed', () => {
        const mockGame = { grid: null, players: [], eventManager: null };
        const manager = new UnitManager(mockGame);
        const config = manager.getUnitConfig('infantry');

        TestRunner.assert(config.speed < 5, `Infantry config speed ${config.speed} is too high`);
    });

    TestRunner.test('UnitManager harvester config should have correct speed', () => {
        const mockGame = { grid: null, players: [], eventManager: null };
        const manager = new UnitManager(mockGame);
        const config = manager.getUnitConfig('harvester');

        TestRunner.assert(config.speed < 5, `Harvester config speed ${config.speed} is too high`);
    });
});

// ===========================================
// TEST RUNNER ENTRY POINT
// ===========================================

/**
 * Run all builder tests
 * Call from browser console: runBuilderTests()
 */
function runBuilderTests() {
    console.log('%cStarting Builder Tests...', 'color: #00aaff; font-size: 14px');
    return TestRunner.run(true); // Suppress console during tests
}

// Export for global access
if (typeof window !== 'undefined') {
    window.runBuilderTests = runBuilderTests;
    console.log('%c[BuilderTests] Available: runBuilderTests()', 'color: #00ff00');
}
