# Tiberium Wars RTS

**Browser-based real-time strategy game inspired by Command & Conquer 3: Tiberium Wars**

A comprehensive systems engineering showcase demonstrating clean architecture patterns, intelligent AI, and polished gameplay in a fully playable RTS experience.

---

## Vision

Build a browser-based RTS game where players fight AI opponents to be the last one standing on procedurally generated tile-based maps. This project prioritizes **systems over features** — demonstrating professional architecture patterns (Manager, Factory, Event-Driven, State Machine), clean separation of concerns, and extensible design.

The finished game will be:
- **Fully playable** - Complete RTS experience with base building, economy, and combat
- **Fun and engaging** - Responsive controls, strategic depth, satisfying combat feedback
- **Technically excellent** - Clean code, unit tested, 60 FPS with 100+ units, well-documented

### Core Inspiration: C&C3 Systems

- **Base Building** - Construction yards, build radius, power grid management
- **Resource Economy** - Tiberium harvesting, refinery management, field regeneration
- **Unit Control** - Selection (single, box, control groups), move/attack commands, unit AI
- **Tactical Combat** - Unit counters, veterancy, focus fire, retreat mechanics
- **Strategic AI** - Build orders, expansion timing, scouting, attack/defend decisions

---

## Requirements

### Validated

*Existing capabilities from current codebase:*

- ✓ Manager pattern architecture — existing
  - UnitManager, BuildingManager, SelectionManager, ResourceManager, VisibilityManager, EventManager, InputManager, DisplayManager
- ✓ Event-driven system with pub-sub pattern — existing
- ✓ RTS core game loop (update → render separation) — existing
- ✓ Unit creation & lifecycle (Infantry, Vehicle, Harvester) — existing
- ✓ Building placement with validation (build radius, grid occupancy) — existing
- ✓ Power grid system (generation vs consumption) — existing
- ✓ Resource economy (Tiberium fields, harvesting, regeneration) — existing
- ✓ Fog of war with per-player visibility tracking — existing
- ✓ Enemy discovery events (ENEMY_REVEALED) — existing
- ✓ Unit selection (single-click, box select, control groups Ctrl+1-9) — existing
- ✓ A* pathfinding with caching — existing
- ✓ Spatial partitioning for efficient queries — existing
- ✓ Object pooling (particles, partial for units) — existing
- ✓ AI controller with personalities & difficulties — existing
- ✓ Unit state machines (IDLE, MOVING, ATTACKING, HARVESTING, etc.) — existing
- ✓ Building state machines (PLACING, CONSTRUCTING, ACTIVE) — existing
- ✓ Priority-based unit targeting system — existing

### Active

*New capabilities to build for v1:*

- [ ] Remove tower defense remnants incrementally (Tower.js, Enemy.js, WaveManager.js)
- [ ] Multiple factions with unique units/buildings (2-3 factions: GDI-style, Nod-style, Scrin-style)
- [ ] Full procedural map generation
  - [ ] Terrain types (grass, cliffs, water) with passability rules
  - [ ] Strategic resource placement (Tiberium fields)
  - [ ] Tactical features (choke points, defendable positions, balanced spawns)
- [ ] Comprehensive AI behavior
  - [ ] Smart build orders (economic start, tech progression, adapt to map)
  - [ ] Tactical combat (unit micro, focus fire, retreat, counter-unit selection)
  - [ ] Strategic decision-making (scouting, expansion, attack/defend timing)
- [ ] Configurable skirmish mode UI
  - [ ] Map size selection
  - [ ] Player count & team configuration
  - [ ] AI difficulty & personality selection
  - [ ] Starting resource options
- [ ] Unit tests for core systems
  - [ ] Pathfinding algorithm correctness
  - [ ] Economy calculations (harvest rates, costs, income)
  - [ ] Build validation logic
  - [ ] Combat damage calculations
- [ ] Performance optimization to 60 FPS with 100+ units
  - [ ] Universal object pooling (projectiles, units)
  - [ ] Dynamic culling margin based on zoom
  - [ ] Hierarchical pathfinding or waypoint graphs
- [ ] Polished gameplay feel
  - [ ] Responsive unit selection feedback
  - [ ] Satisfying combat effects (projectiles, explosions, damage numbers)
  - [ ] Clear audio/visual feedback for actions
  - [ ] Smooth camera controls (pan, zoom, edge scrolling)

### Out of Scope

*Explicitly deferred to future versions:*

- **Multiplayer networking** — Single-player vs AI only, no online/LAN multiplayer
- **Advanced graphics** — 2D sprites/primitives only, no WebGL 3D or shader effects
- **Campaign mode** — Skirmish only, no story missions or cutscenes
- **Persistent progression** — No meta-progression, unlocks, or player accounts
- **Mobile support** — Desktop browsers only (mouse & keyboard required)
- **Modding tools** — No in-game editor or mod loader (data files are editable but not exposed)

---

## Constraints

### Technical

- **Tech stack:** p5.js 1.10.0 + vanilla ES6 JavaScript (no framework changes)
- **No build step:** Direct script loading, no webpack/rollup/babel (current architecture)
- **Modern browsers:** Chrome, Firefox, Edge latest versions (no IE11 or Safari <14)
- **Performance target:** Maintain 60 FPS (acceptable: 50+ FPS) with 100+ simultaneous units
- **Asset format:** 2D sprites (PNG) or p5.js primitives for rendering

### Architectural

- **Manager pattern:** Continue single-responsibility managers, no monolithic classes
- **Event-driven:** Use EventManager for decoupled communication, no direct cross-manager calls
- **No global state pollution:** Minimize globals beyond Game.instance and constants
- **Renderers read-only:** Rendering code cannot mutate game state

### Gameplay

- **Tile-based maps:** 32-pixel grid cells, procedurally generated
- **Player count:** 2-8 players (1 human + 1-7 AI)
- **Match length:** Target 15-30 minute matches
- **Victory condition:** Last player standing (all enemy buildings destroyed)

---

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| **Focus on systems over content** | Demonstrate architecture patterns, not asset variety | Start with minimal units/buildings, expand via data files — Pending |
| **Multiple factions in v1** | Core differentiator from generic RTS demos | 2-3 factions with unique abilities, not just stat variations — Pending |
| **Incremental TD cleanup** | Avoid rewriting everything upfront, reduce risk | Remove Tower.js/Enemy.js/WaveManager.js as RTS systems replace them — Pending |
| **Unit tests for core systems only** | Balance quality with velocity | Focus tests on pathfinding, economy, combat math — no UI/rendering tests — Pending |
| **p5.js + vanilla JS** | Maintain current tech stack, avoid framework churn | No React/Vue/TypeScript migration — Confirmed |
| **All equally important: AI, architecture, gameplay** | Comprehensive quality bar across all dimensions | No "MVP with placeholder AI" — all systems must feel polished — Pending |
| **Configurable skirmish mode** | Flexible replay value without campaign complexity | Pre-game setup screen for map size, teams, difficulty — Pending |
| **Full procedural map generation** | Infinite replayability, demonstrates algorithm skills | Terrain, resources, and tactical layout all procedural — Pending |
| **60 FPS with 100+ units** | Late-game performance critical for RTS feel | Optimize pooling, culling, pathfinding before adding content — Pending |

---

## Success Criteria

**v1 is complete when:**

1. ✅ **Playable RTS match** - Start game → build base → harvest resources → build army → defeat AI
2. ✅ **3 factions** - Each with unique units, buildings, and playstyle (not just reskins)
3. ✅ **Smart AI** - Opponents build, expand, attack, and defend intelligently
4. ✅ **Procedural maps** - No two matches play the same, balanced spawns and resources
5. ✅ **Polished feel** - Responsive controls, satisfying combat, clear feedback
6. ✅ **Performance** - 60 FPS (or 50+) with 100+ units in late-game battles
7. ✅ **Clean architecture** - Manager pattern, event-driven, testable, documented
8. ✅ **Core tests passing** - Pathfinding, economy, combat logic verified

**Definition of "fun and engaging":**

- Players can execute complex strategies (timing attacks, economic booms, defensive play)
- AI feels like a worthy opponent (not brain-dead or unfairly omniscient)
- Unit counters matter (rock-paper-scissors, not all units equal)
- Matches have interesting moments (comebacks, base trades, expansions under pressure)

---

## Current Status

**Git Status:** Clean (latest commit: feat: Add event-driven enemy discovery system and reorganize docs)

**Codebase Map:** 7 documents in `.planning/codebase/` (STACK, ARCHITECTURE, STRUCTURE, CONVENTIONS, TESTING, INTEGRATIONS, CONCERNS)

**Architecture:** Manager pattern with 12 specialized managers, event-driven communication, state machines for entities

**Known Issues (from CONCERNS.md):**
- No module system (13,749 lines of global JS, 40+ scripts in strict load order)
- Limited automated testing (BuilderTests.js only, ~50 tests, 10-15% coverage)
- Performance gaps (pooling incomplete, culling margin fixed, pathfinding unoptimized)
- Singleton pain (Game.instance throughout, hard to test)
- Manager cleanup incomplete (event listeners may leak on game restart)
- Tower defense remnants still present (Tower.js, Enemy.js coexist with RTS code)

**Next Steps:** Create roadmap with phases for implementing active requirements

---

*Last updated: 2026-01-11 after initialization*
