# Code Conventions

## Naming Conventions

### Classes
- **PascalCase** for all class names
- Examples: `Game`, `Tower`, `Enemy`, `Unit`, `Building`, `EventManager`
- Subclasses follow parent: `InfantryUnit`, `VehicleUnit`, `HarvesterUnit`

### Functions & Methods
- **camelCase** for all functions
- Examples: `update()`, `draw()`, `handleClick()`, `findTarget()`
- Static methods: `GameMath.distance()`, `TestRunner.run()`
- Factory methods: `Builder.create()`, `Builder.infantry()`

### Variables
- **camelCase** for regular variables
- Examples: `gameState`, `currentTower`, `targetEnemy`, `isDragging`

### Constants
- **SCREAMING_SNAKE_CASE** in GameConstants.js
- Examples: `MAX_PARTICLES`, `GRID_CELL_SIZE`, `TOWER_STATS`
- Organized into objects: `GRID_CONSTANTS`, `PERFORMANCE_CONSTANTS`

### Object Keys
- **lowercase_with_underscores** for semantic data
- Examples: `tower_place`, `wave_complete`, `enemy_death` (event names)
- Examples: `construction_yard`, `power_plant` (building types)

### Properties
- **camelCase** for instance properties
- Examples: `this.maxHealth`, `this.isDragging`, `this.state`

### Enums/States
- **SCREAMING_SNAKE_CASE** for state values
- Examples: `IDLE`, `MOVING`, `ATTACKING`, `DYING`
- Note: Inconsistent casing exists (some lower, some upper)

## p5.js Global Conflict Avoidance

**CRITICAL RULE:** Never shadow p5.js globals

❌ BAD:
```javascript
let text = "...";
let color = "#FF0000";
let image = loadedImage;
```

✅ GOOD:
```javascript
let announcementText = "...";
let fillColor = "#FF0000";
let spriteImage = loadedImage;
```

Common p5.js globals to avoid: `text`, `rect`, `ellipse`, `line`, `point`, `color`, `image`, `random`, `noise`, `width`, `height`

## Code Style

### Indentation
- **4-space indentation** (soft tabs)
- 1 space around operators: `let x = 5 + 3`
- No trailing spaces

### Brackets
- Opening brace on same line
```javascript
if (condition) {
    // code
} else {
    // code
}
```

### Comments

**Section Headers:**
```javascript
// ===========================================
// CORE UPDATE LOOP
// ===========================================
```

**JSDoc for Public Methods:**
```javascript
/**
 * Unit.js - Base class for all RTS units
 * Implements:
 * - Command queue with shift-click support
 * - State machine (IDLE, MOVING, ATTACKING, etc.)
 */
```

**Inline Comments:**
```javascript
// Retargeting logic with throttling for performance
if (!this.target || !this.target.active) {
    this.findTarget();
}
```

### Whitespace
- 1 blank line between methods
- 2 blank lines between major sections (with dividers)
- No blank lines within method bodies (except rare cases)

### Line Length
- Typically 80-120 characters (no strict limit)

## Common Patterns

### Singleton
```javascript
constructor() {
    if (Game.instance) return Game.instance;
    Game.instance = this;
}
```

### Factory
```javascript
createUnit(type, x, y, owner) {
    switch(type) {
        case 'infantry': return new InfantryUnit(x, y, owner);
        case 'vehicle': return new VehicleUnit(x, y, owner);
    }
}
```

### State Machine
```javascript
const GameState = {
    MENU: 'MENU',
    LOADING: 'LOADING',
    RTS_PLAY: 'RTS_PLAY',
    PAUSED: 'PAUSED'
};
```

### Event-Driven
```javascript
EVENTS.on('wave_complete', (data) => {
    console.log('Wave complete!', data);
});

EVENTS.emit('wave_complete', { wave: 5 });
```

### Builder Pattern
```javascript
const player = Player.Builder.create()
    .withId(1)
    .withName('Commander')
    .asHuman()
    .build();
```

## Error Handling

### Null Safety
```javascript
if (typeof EVENTS !== 'undefined') {
    EVENTS.on('ENEMY_REVEALED', (data) => { ... });
}
```

### Stale Reference Checks
```javascript
if (this.draggingTower) {
    if (grid.map[this.draggingTower.row]?.[this.draggingTower.col] !== this.draggingTower) {
        console.warn("Clearing stale dragging tower reference");
        this.draggingTower = null;
    }
}
```

### Default Values
```javascript
this.maxHealth = config.health || 1000;
this.armor = config.armor || 0;
```

## File Naming

- **Classes:** PascalCase.js (`Tower.js`, `Enemy.js`, `Building.js`)
- **Managers:** PascalCase.js in `src/managers/`
- **Renderers:** PascalCase.js in `src/renderers/`
- **Constants:** PascalCase.js in `src/constants/`
- **Utilities:** PascalCase.js in `src/utils/`

## Documentation

### File Headers
```javascript
/**
 * Unit.js - Base class for all RTS units
 *
 * Implements:
 * - Command queue with shift-click support
 * - State machine (IDLE, MOVING, ATTACKING, etc.)
 * - Veterancy system (XP, ranks, stat bonuses)
 */
```

### JSDoc Parameters
```javascript
/**
 * @param {number} x - Spawn X position
 * @param {number} y - Spawn Y position
 * @param {object} owner - Player who owns this unit
 * @param {object} config - Unit configuration from RTS_UNITS
 */
constructor(x, y, owner, config) { ... }
```

## Best Practices

1. **Manager pattern** - One responsibility per manager
2. **Event-driven** - Emit events instead of direct calls
3. **Constants-driven** - All magic numbers in GameConstants.js
4. **Renderers read-only** - Never mutate state in render code
5. **Avoid p5.js globals** - Use descriptive names
6. **Comment non-obvious logic** - Explain why, not what
7. **Section dividers** - Organize large files with headers
