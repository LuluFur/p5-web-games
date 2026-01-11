# Directory Structure

## Project Layout

```
p5-web-games/
├── index.html                 # Entry point, script loading order
├── sketch.js                  # p5.js hooks (setup, draw)
├── style.css                  # Canvas styling
├── package.json               # npm config
├── design_doc.md              # Game design reference
├── CLAUDE.md                  # Project instructions
│
├── src/
│   ├── constants/             # All tunable values
│   │   ├── GameConstants.js   # Tower defense constants
│   │   ├── RTSConstants.js    # RTS balance, units, buildings
│   │   └── TerrainConstants.js
│   │
│   ├── managers/              # Singleton managers (12 total)
│   │   ├── EventManager.js    # Pub-sub event system
│   │   ├── UnitManager.js     # Unit creation, lifecycle
│   │   ├── BuildingManager.js # Building placement, power
│   │   ├── SelectionManager.js
│   │   ├── ResourceManager.js
│   │   ├── VisibilityManager.js
│   │   ├── InputManager.js
│   │   ├── DisplayManager.js
│   │   ├── ParticleManager.js
│   │   ├── ObjectManager.js
│   │   ├── SpellManager.js
│   │   └── StatsManager.js
│   │
│   ├── renderers/             # Rendering systems
│   │   ├── SpriteRenderer.js
│   │   ├── DisplayRenderer.js
│   │   ├── DebugRenderer.js
│   │   └── ScreenEffectRenderer.js
│   │
│   ├── ai/                    # AI subsystem
│   │   ├── AIController.js
│   │   └── EnemyDiscoveryTracker.js
│   │
│   ├── ui/                    # UI panels
│   │   ├── BuildingInfoPanel.js
│   │   └── ProductionPanel.js
│   │
│   ├── data/                  # Game data
│   │   └── LevelData.js
│   │
│   ├── commands/              # Command pattern
│   │   └── Command.js
│   │
│   ├── design/                # Design documents
│   │   ├── AI_COMBAT_STRATEGY.md
│   │   ├── AI_ENHANCEMENT_PLAN.md
│   │   ├── ImplementationRoadmap.md
│   │   ├── TerrainMechanics.md
│   │   └── WaterEnemies.md
│   │
│   ├── utils/                 # Utility functions
│   │   ├── GameMath.js
│   │   ├── UIHelper.js
│   │   ├── ShapeRenderer.js
│   │   ├── TextAnimator.js
│   │   └── TestRunner.js
│   │
│   ├── tests/
│   │   └── BuilderTests.js
│   │
│   ├── Game.js                # Main orchestrator
│   ├── Grid.js                # Grid structure
│   ├── Pathfinder.js          # A* pathfinding
│   ├── Unit.js                # Base unit + subclasses
│   ├── Building.js            # Base building + types
│   ├── Player.js              # Player representation
│   ├── Projectile.js
│   ├── Particle.js
│   ├── HealthBar.js
│   ├── MapGenerator.js
│   ├── AssetLoader.js
│   └── SoundManager.js
│
├── .claude/
│   ├── docs/                  # Documentation
│   │   ├── architectural_patterns.md
│   │   ├── PERFORMANCE_OPTIMIZATIONS.md
│   │   ├── ERROR_GUIDE.md
│   │   └── CONTRIBUTING.md
│   └── skills/                # Claude Code skills
│       ├── asset-manager/
│       ├── error-debugger/
│       ├── game-designer/
│       └── p5-code-review/
│
└── assets/                    # Sprite sheets
    ├── zombie/
    ├── vampire/
    ├── skeleton/
    └── goblin/
```

## Directory Responsibilities

### src/constants/
All magic numbers and tunable values. Single source of truth for:
- Performance limits (particle counts, culling margins)
- Balance values (unit/building stats)
- Game mechanics parameters
- Terrain generation settings

### src/managers/
Single-responsibility systems following Manager pattern:
- Each manager handles one domain
- No cross-dependencies between managers
- Communicate via EventManager
- Created lazily by Game singleton

### src/renderers/
Rendering logic separated from game logic:
- Renderers never mutate game state
- Only read entity properties
- No business logic
- Organized by rendering concern

### src/ai/
AI decision-making subsystem:
- AIController manages AI players
- EnemyDiscoveryTracker handles fog of war events
- Build orders, target selection, attack timing

### src/design/
Feature design documents (not code):
- Implementation roadmaps
- Planned features
- Design specifications
- Pseudo-code examples

## File Organization Principles

1. **One class per file** (with rare exceptions for small related classes)
2. **PascalCase.js** file naming
3. **Directory = responsibility boundary**
4. **Managers in managers/, renderers in renderers/**
5. **Constants separate from implementation**

## Module Boundaries

**No ES6 imports** - Scripts load in strict order defined in index.html

Dependencies flow downward:
```
sketch.js (top)
  ↓
Game.js
  ↓
Managers
  ↓
Core Classes (Unit, Building, Grid, etc.)
  ↓
Utilities
  ↓
Constants (bottom)
```

## Entry Points

1. **index.html** - Loads all scripts in dependency order
2. **sketch.js** - p5.js entry point, calls Game singleton
3. **Game.js** - Orchestrates all systems

## Key File Locations

- Main game loop: `src/Game.js:396-501`
- Unit behavior: `src/Unit.js`
- Building placement: `src/managers/BuildingManager.js:41-115`
- AI logic: `src/ai/AIController.js`
- Pathfinding: `src/Pathfinder.js`
- Event system: `src/managers/EventManager.js`
- Selection: `src/managers/SelectionManager.js`
