# System Architecture

## Core Architectural Patterns

### 1. Manager Pattern (Separation of Concerns)

Each manager handles a single domain:
- **UnitManager** - Unit creation, lifecycle, spatial queries
- **BuildingManager** - Building placement, construction, power grid
- **SelectionManager** - RTS selection (single, box, control groups)
- **EventManager** - Publish-subscribe event system
- **ResourceManager** - Tiberium field management
- **VisibilityManager** - Fog of war, vision tracking
- **InputManager** - User input handling
- **DisplayManager** - HUD rendering

### 2. Singleton Pattern

- **Game class** enforces single instance via `Game.instance`
- Serves as main orchestrator/facade for all systems
- Accessible globally for direct system access

### 3. State Machine Pattern

**Game States:** MENU, LOADING, MAIN_MENU, SETTINGS, NEW_GAME_SETUP, RTS_PLAY, PAUSED, GAMEOVER, VICTORY

**Unit States:** IDLE, MOVING, ATTACKING, HARVESTING, RETURNING, UNLOADING, CONSTRUCTING, DYING

**Building States:** PLACING, CONSTRUCTING, ACTIVE, DAMAGED, DESTROYED

### 4. Event-Driven Architecture

- Centralized **EventManager** uses pub-sub pattern
- Event constants prevent typos (EVENT_NAMES object)
- Managers emit events instead of direct calls
- Examples: UNIT_CREATED, BUILDING_PLACED, ENEMY_REVEALED, STATE_CHANGE

### 5. Factory Pattern

- **UnitManager.createUnit()** - Factory for unit instantiation
- **BuildingManager** - Building type registry
- Dispatches to appropriate subclasses (Infantry, Vehicle, Harvester)

### 6. Renderer Pattern

Rendering decoupled from game logic:
- **SpriteRenderer** - Entity sprite rendering
- **DisplayRenderer** - HUD, menus, UI overlays
- **DebugRenderer** - Debug visualization
- **ScreenEffectRenderer** - Screen-space effects

**Renderers never mutate game state**

### 7. Object Pooling Pattern

- **UnitManager** - Unit pool for recycling
- **ObjectManager** - Particle/projectile pooling
- Reduces garbage collection pauses

### 8. Spatial Partitioning

- Grid-based queries for efficiency
- Cell size = 64 pixels
- Fast range queries for vision, collision, targeting

## Main Game Loop

```
sketch.js setup()
  └─> Async asset loading
      └─> Game constructor (singleton)
          └─> game.initRTS()

sketch.js draw()
  └─> game.update()
      ├─> updateCamera()
      ├─> unitManager.update(deltaTime)
      ├─> buildingManager.update(deltaTime)
      ├─> resourceManager.update(deltaTime)
      ├─> for each player: player.update(deltaTime)
      ├─> for each AIController: aiController.update(deltaTime)
      ├─> objectManager.updateAll()
      ├─> visibilityManager.updateVisibility()
      └─> checkRTSEndConditions()
  └─> game.draw()
      └─> drawRTS()
```

## Component Communication

### Event Flow Example

```
Unit.takeDamage(50)
  └─> EVENTS.emit('UNIT_DESTROYED', { unit, killer })
      ├─> SelectionManager removes from selection
      ├─> StatsManager increments kill count
      └─> SoundManager plays death sound
```

### Data Flow Example: Unit Combat

```
Unit.update()
  └─> Search for targets in attack range
  └─> If target found
      ├─> Face target
      ├─> Decrement attackCooldown
      └─> If cooldown <= 0
          └─> this.attack(target)
              ├─> Calculate damage
              ├─> target.takeDamage(damage)
              │   └─> If health <= 0: target.die()
              └─> Spawn projectile/particle effects
```

## Class Hierarchies

### Unit Hierarchy
```
Unit (base class)
├── InfantryUnit
│   ├── Rifleman
│   └── Rocket Soldier
├── VehicleUnit
│   ├── Medium Tank
│   └── Light Tank
└── HarvesterUnit
    └── Harvester
```

### Building Types
- ConstructionYard (HQ)
- PowerPlant (power generation)
- Barracks (infantry production)
- WarFactory (vehicle production)
- Refinery (resource collection)
- TechCenter (unlocks)
- GuardTower (defense)
- Silo (storage)
- Radar (vision)

## Core Systems

### Grid & Pathfinding
- 64x64 cell grid (32-pixel cells)
- Dual-layer: buildability + terrain type
- A* pathfinding with 5-second cache
- World coordinates ↔ Grid coordinates conversion

### Selection System
- Single-click, shift-click, box select, double-click
- Control groups (Ctrl+1-9 to assign, 1-9 to recall)
- Selection persists across frames

### Fog of War
- Per-player visibility tracking
- Smart throttling (only update when units move)
- Tracks visible entities + explored cells
- Discovery events trigger AI responses

### Resource Economy
- Tiberium fields with regeneration
- Harvester units collect and deliver
- Power grid system (generation vs consumption)
- Build costs deducted from player resources

### AI System
- Personalities: BALANCED, RUSHER, TURTLE, ECONOMIST
- Difficulties: EASY, NORMAL, HARD, BRUTAL
- States: BUILDING, EXPANDING, MASSING, ATTACKING, DEFENDING
- Build orders, target selection, patrol routes

## Performance Optimizations

1. **Spatial Partitioning** - 64-pixel grid for range queries
2. **Pathfinding Cache** - 5-second cache, max 100 entries
3. **Visibility Throttling** - Update only when units move
4. **Off-Screen Culling** - Skip rendering outside viewport
5. **Object Pooling** - Reuse units, particles, projectiles
6. **Event-Driven Updates** - No polling loops
7. **Color Caching** - Avoid recreating p5.color() each frame

## Constants-Driven Configuration

All tunable values centralized:
- **GameConstants.js** - Legacy tower defense
- **RTSConstants.js** - RTS balance, unit/building stats
- **TerrainConstants.js** - Terrain generation

Enables balance tweaking without code modification.
