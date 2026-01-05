# Merge Defence - Tower Defense Game

## What This Is

A browser-based tower defense game where players defend against waves of undead enemies using specialized defender units. Features adaptive difficulty, merge-based tower progression with Rush Royale-style Reuleaux polygon shapes, and dynamic wave generation for infinite replayability.

**Current Status:** Playable with 20 scripted waves + infinite procedural waves. Performance optimized for 200+ simultaneous entities.

## Quick Navigation

- [Architecture & Philosophy](#architecture-philosophy) - Core design principles and patterns
- [Project Structure](#project-structure) - Directory organization and responsibilities
- [Essential Commands](#essential-commands) - Development, testing, profiling
- [Key File References](#key-file-references) - Navigation to critical code sections
- [Common Tasks](#common-tasks) - Step-by-step guides for recurring workflows
- [MCP Servers](#mcp-servers) - External tools and documentation providers
- [Skills & Agents](#claude-code-agents--skills) - AI assistants for specialized tasks
- [Debugging](#debugging--error-resolution) - Error troubleshooting and solutions

## Tech Stack

- **Framework:** p5.js 1.10.0 (Canvas rendering, animation, input)
- **Language:** Vanilla ES6 JavaScript (no transpilation)
- **Asset Format:** PNG sprite sheets (8-directional low-top-down animations)
- **Architecture:** Manager pattern with singleton game orchestrator
- **State Management:** Explicit state machines (GameState, EnemyState)

## Project Structure

```
├── index.html, sketch.js, style.css    # Entry point, p5.js hooks
├── design_doc.md                        # Game design reference
├── src/
│   ├── constants/GameConstants.js       # All tunable values
│   ├── design/                          # Feature design documents (see below)
│   ├── managers/                        # Game systems (Economy, Wave, Object, Tower, Input, etc.)
│   ├── renderers/                       # Rendering (Sprite, ScreenEffect, Debug)
│   ├── data/                            # Level data, configs (future)
│   ├── Game.js                          # Singleton orchestrator
│   ├── Grid.js, Pathfinder.js           # Level structure, A* pathfinding
│   ├── Tower.js, Enemy.js               # Base classes + subclasses
│   ├── Projectile.js, Particle.js       # Physics entities
│   ├── WaveConfig.js, AssetLoader.js    # Data, asset loading
└── assets/*/animations/                 # Sprite sheets (8-dir × 4-8 frames)
```

## Key Directories

- **src/managers/** - Single-responsibility systems (economy, waves, input). Add new managers for new features.
- **src/renderers/** - Rendering separated from logic. Don't modify game state here.
- **src/constants/** - All tunable values (performance, balance, costs).
- **src/design/** - Feature design documents for planned systems (multi-level, terrain, water enemies).
- **src/data/** - (Future) Level definitions, terrain layouts, campaign progression data.
- **assets/** - 8-directional sprite animations. See AssetLoader.js:18-103 for structure.

## Architecture Philosophy

This codebase prioritizes:
1. **Separation of Concerns** - Managers handle one thing, renderers don't mutate state
2. **Performance over Elegance** - Object pooling, culling, event-driven updates
3. **Data-Driven Design** - Waves, towers, enemies defined in constants/configs
4. **Progressive Disclosure** - Tutorial system, expanding grid, DDA for accessibility
5. **Event-Driven Updates** - No polling, use events for state changes

See .claude/docs/architectural_patterns.md for detailed pattern explanations.

## Essential Commands

### Development
```bash
# Start local server (required for asset loading due to CORS)
npx http-server -p 8000 -c-1

# Open in browser
http://127.0.0.1:8000

# Browser console shows:
# - Asset loading progress
# - Wave spawn logs
# - Tower placement validation
# - Performance warnings
```

### Testing & Performance
- **Testing:** Manual procedures in [.claude/docs/CONTRIBUTING.md](.claude/docs/CONTRIBUTING.md)
- **Performance:** Profiling guide in [.claude/docs/PERFORMANCE_OPTIMIZATIONS.md](.claude/docs/PERFORMANCE_OPTIMIZATIONS.md)
- **Target:** 60 FPS (acceptable: 50+ on wave 15+), <500 particles, <10ms GC pauses

## Git Workflow

**Commits:** Follow [Conventional Commits](https://www.conventionalcommits.org/) - `type(scope): summary`

Use `/git-helper` skill for guided assistance

## File Loading Order

**CRITICAL:** Scripts must load in this exact order (see index.html:14-62):
1. GameConstants.js - Required by all other files
2. Utilities (GameMath.js, etc.)
3. Core classes (Grid, Pathfinder, Tower, Enemy, Particle, Projectile)
4. Managers (depend on core classes)
5. Renderers (depend on managers)
6. Game.js (depends on everything)
7. sketch.js (p5.js entry point, creates Game instance)

**Why:** No module system (ES6 imports), scripts execute top-to-bottom. Dependencies must exist before use.

## Key File References

### Game Loop
- sketch.js:4-35 (p5.js async setup, asset loading)
- sketch.js:37-43 (main draw loop)
- src/Game.js:77-94 (update orchestration)
- src/Game.js:96-131 (render orchestration)

### Tower Placement Flow
- src/managers/InputManager.js (click handling)
- src/managers/TowerManager.js:41-78 (placement validation)
- src/managers/TowerManager.js:81-115 (pathfinding check)
- src/Grid.js:81-104 (grid mutation)

### Enemy Spawning Flow
- src/managers/WaveManager.js:39-105 (wave start logic)
- src/managers/WaveManager.js:108-167 (individual spawn)
- src/managers/WaveManager.js:170-192 (enemy factory)
- src/Enemy.js:1-305 (enemy lifecycle)

### Performance Critical Paths
- src/managers/ObjectManager.js:90-131 (particle pooling)
- src/Game.js:172-208 (off-screen culling)
- src/managers/TowerManager.js:174-186 (BufferTower event-driven updates)

## Additional Documentation

- **.claude/docs/architectural_patterns.md** - Core patterns (Manager, Singleton, Pooling, State Machines)
- **.claude/docs/PERFORMANCE_OPTIMIZATIONS.md** - Performance tuning, profiling, optimization
- **.claude/docs/ERROR_GUIDE.md** - Searchable error database with ERROR_IDs
- **design_doc.md** - Game design rationale, tower/enemy stats, progression
- **src/design/** - Planned features (ImplementationRoadmap.md, TerrainMechanics.md, WaterEnemies.md, LevelProgressionSystem.md)

## Common Tasks

**Adding Tower:** Create subclass (Tower.js:231-448) → Add to factory (TowerManager.js:20-38) → Add stats (GameConstants.js) → Add to UI (UI.js:128-136)

**Adding Enemy:** Create subclass (Enemy.js:312-450) → Add to factory (WaveManager.js:170-192) → Add to WaveConfig.js → Load sprites (AssetLoader.js)

**Performance Tuning:** Edit GameConstants.js - MAX_PARTICLES (500), OFFSCREEN_CULL_MARGIN (100px), PARTICLE_POOL_SIZE (600)

**Planned Features:** See src/design/ for terrain, water enemies, multi-level system

## Debugging & Error Resolution

**Errors?** See [.claude/docs/ERROR_GUIDE.md](.claude/docs/ERROR_GUIDE.md) or use `/error-debugger` skill

**Quick Fixes:**
- `X is not defined` → Check index.html script order (JS_001)
- `X is not a function` → Check p5.js naming conflicts (JS_002)
- Missing sprites → Check AssetLoader paths/frame counts (ASSET_001)
- FPS drops → Check particle/enemy counts in GameConstants (PERF_001)
- CORS errors → Start local server: `npx http-server -p 8000 -c-1`

**Document Fixes:** Use `debug-guide-maintainer` agent (auto-assigns ERROR_IDs, checks duplicates)

## MCP Servers

**context7** - Provides up-to-date, version-specific documentation and code examples
- Use when: Need latest API docs, framework examples, or version-specific syntax
- Available for: p5.js, JavaScript ES6+, web APIs, and other technologies
- Access: Automatically available via MCP integration

## Claude Code Agents & Skills

**Best Practice - Parallel Execution:**
When given multiple tasks (bug fixes, features, research), use multiple subagents in parallel:
- **Example:** "Fix 3 bugs and research pathfinding algorithms" → Launch 4 agents simultaneously
- **Benefits:** Faster execution, independent context windows, no task blocking
- **How:** Single message with multiple Task tool calls (not sequential)

**Quick Reference:** Invoke skills when you encounter domain-specific challenges.

| Skill | When to Use | Key Capability |
|-------|-------------|----------------|
| `/asset-manager` | Sprites not loading, 404 errors | Diagnoses sprite paths, frame counts, CORS |
| `/error-debugger` | Runtime errors, crashes | Searches .claude/docs/ERROR_GUIDE.md |
| `/game-designer` | Balance, difficulty tuning | Cost-to-power analysis, scaling formulas |
| `/git-helper` | Git workflows, commits | Conventional commits, merge strategies |
| `/p5-code-review` | Code review, architecture | Validates patterns, checks performance |
| `/performance-tuning` | FPS drops, lag | Diagnoses bottlenecks, tunes constants |

**Agent:** `debug-guide-maintainer` - Auto-maintains .claude/docs/ERROR_GUIDE.md after bug fixes

**How to Use:**
- Invoke directly: `/skill-name` in chat
- Or describe the problem: "sprites not loading" → Claude auto-invokes `/asset-manager`
- Skills integrate with project context and reference files

**Skill Documentation:** See `.claude/skills/[skill-name]/SKILL.md` for detailed capabilities.

