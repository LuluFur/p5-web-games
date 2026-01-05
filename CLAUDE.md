# Merge Defence - Tower Defense Game

## What This Is

A browser-based tower defense game where players defend against waves of undead enemies using specialized defender units. Features adaptive difficulty, merge-based tower progression with Rush Royale-style Reuleaux polygon shapes, and dynamic wave generation for infinite replayability.

**Current Status:** Playable with 20 scripted waves + infinite procedural waves. Performance optimized for 200+ simultaneous entities.

## Tech Stack

- **Framework:** p5.js 1.10.0 (Canvas rendering, animation, input)
- **Language:** Vanilla ES6 JavaScript (no transpilation)
- **Asset Format:** PNG sprite sheets (8-directional animations)
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

### Testing
No automated tests currently. Manual test plan:
1. Build towers, verify cost deduction
2. Start wave, verify enemies spawn and path correctly
3. Verify towers target and damage enemies
4. Check FPS stays above 50 on wave 15+
5. Verify particle count caps at 500 (see debug overlay)

### Performance Profiling
```javascript
// In browser console (F12):
// 1. Check debug overlay (top-left) for FPS and entity counts
// 2. Chrome DevTools → Performance → Record during wave 15+
// 3. Look for:
//    - Frame drops (target: 60 FPS, acceptable: 50+ FPS)
//    - Long GC pauses (should be <10ms with object pooling)
//    - Draw call count (should drop with off-screen culling)
```

## Git Workflow

### Branch Strategy

**Main Branches:**
- `main` - Production-ready code, always stable and deployable
- `develop` - Integration branch for features (if using GitFlow)

**Working Branches:**
- `feature/feature-name` - New features (merge system, tower unlocking, etc.)
- `fix/bug-description` - Bug fixes
- `refactor/component-name` - Code refactoring without behavior changes
- `docs/update-description` - Documentation updates

### Feature Development Workflow

```bash
# 1. Create feature branch from main
git checkout main
git pull origin main
git checkout -b feature/tower-merge-system

# 2. Make changes and commit frequently
git add src/Tower.js src/managers/TowerManager.js
git commit -m "feat: implement merge rank system with Reuleaux shapes"

# 3. Continue development with atomic commits
git add src/managers/InputManager.js sketch.js
git commit -m "feat: add drag-and-drop merging input handling"

git add src/renderers/SpriteRenderer.js
git commit -m "feat: add visual merge indicators and drag transparency"

# 4. When feature is complete, merge back to main
git checkout main
git pull origin main  # Get latest changes
git merge feature/tower-merge-system
git push origin main

# 5. Delete feature branch (cleanup)
git branch -d feature/tower-merge-system
```

### Bug Fix Workflow

```bash
# 1. Create fix branch
git checkout main
git checkout -b fix/projectile-null-crash

# 2. Fix the bug with descriptive commit
git add src/Projectile.js
git commit -m "fix: add null safety check for target in Projectile.update()

Prevents crash when projectile targets are removed mid-flight.
Adds check for both null and active state before accessing target.

Fixes #23"

# 3. Merge back to main
git checkout main
git merge fix/projectile-null-crash
git push origin main
git branch -d fix/projectile-null-crash
```

### Commit Message Convention

Follow **Conventional Commits** format:

```
<type>(<scope>): <short summary>

<body - detailed explanation (optional)>

<footer - references to issues (optional)>
```

**Types:**
- `feat:` New feature
- `fix:` Bug fix
- `refactor:` Code change that neither fixes a bug nor adds a feature
- `docs:` Documentation only changes
- `style:` Code style changes (formatting, missing semicolons, etc.)
- `perf:` Performance improvements
- `test:` Adding or updating tests
- `chore:` Maintenance tasks (dependencies, build config, etc.)

**Examples:**
```bash
git commit -m "feat(towers): add Executioner with armor pierce mechanic"
git commit -m "fix(enemy): correct blood particle color from green to red"
git commit -m "refactor(buffer): simplify network buff to 2-tile radius"
git commit -m "docs: update CLAUDE.md with git workflow instructions"
git commit -m "perf(render): add off-screen culling for particles"
```

### Merging Strategy

**Fast-Forward Merge (Preferred for simple features):**
```bash
git checkout main
git merge --ff-only feature/simple-feature  # Only if no conflicts
```

**Merge Commit (For complex features):**
```bash
git checkout main
git merge --no-ff feature/complex-feature
# Creates merge commit even if fast-forward is possible
# Preserves feature branch history
```

**Squash Merge (Clean history for experimental work):**
```bash
git checkout main
git merge --squash feature/experimental
git commit -m "feat: add experimental tower merging system

- Implemented drag-and-drop
- Added Reuleaux polygon shapes
- Integrated with TowerManager"
```

### Handling Conflicts

```bash
# If merge has conflicts
git merge feature/my-feature
# CONFLICT in src/Tower.js

# 1. Open conflicted files and resolve manually
# Look for <<<<<<< HEAD markers

# 2. Stage resolved files
git add src/Tower.js

# 3. Complete merge
git commit -m "merge: integrate feature/my-feature

Resolved conflicts in Tower.js merge rank system"
```

### Checking Status

```bash
# View current branch and uncommitted changes
git status

# View commit history
git log --oneline --graph --all

# View changes not yet staged
git diff

# View changes staged for commit
git diff --staged

# View branches
git branch -a
```

### Undoing Changes

```bash
# Discard local changes (CAREFUL!)
git checkout -- src/Tower.js

# Unstage file (keep changes)
git reset HEAD src/Tower.js

# Undo last commit (keep changes)
git reset --soft HEAD~1

# Undo last commit (discard changes - DANGEROUS!)
git reset --hard HEAD~1

# Revert a commit (creates new commit)
git revert abc123
```

### Best Practices

1. **Commit Early, Commit Often** - Small, atomic commits are easier to review and revert
2. **Write Descriptive Messages** - Future you will thank present you
3. **Test Before Committing** - Ensure code runs without errors
4. **Pull Before Push** - Always get latest changes before pushing
5. **One Feature Per Branch** - Keep branches focused and short-lived
6. **Delete Merged Branches** - Keep repository clean
7. **Never Commit Secrets** - Use .gitignore for API keys, credentials
8. **Review Diffs** - Use `git diff` before committing to catch mistakes

### Common Workflows

**Quick Fix During Development:**
```bash
# Working on feature, need to quickly fix bug
git stash                      # Save work in progress
git checkout -b fix/urgent-bug
# ... make fix ...
git commit -m "fix: urgent bug"
git checkout main
git merge fix/urgent-bug
git checkout feature/my-feature
git stash pop                  # Restore work in progress
```

**Updating Feature Branch with Main:**
```bash
# Keep feature branch up to date with main
git checkout feature/my-feature
git merge main  # Or: git rebase main (rewrites history)
```

**Creating Release Tag:**
```bash
git tag -a v1.0.0 -m "Release version 1.0.0 - Merge Defence with tower merging"
git push origin v1.0.0
```

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

When working on specific areas, consult:

- **.claude/docs/architectural_patterns.md** - Core patterns used throughout (Manager, Singleton, Pooling, State Machines, etc.). Read before adding new systems.

- **design_doc.md** - Game design rationale, tower/enemy stats, progression system. Reference for balance changes.

- **PERFORMANCE_OPTIMIZATIONS.md** - Performance optimization details, tuning guidelines, stress testing procedures.

### Planned Features (Design Documents)

The following design documents outline major features for future implementation:

- **src/design/ImplementationRoadmap.md** - **START HERE!** Step-by-step implementation guide with 6 phases, code examples, file creation checklist, and testing procedures. Provides concrete path from current state to full terrain/multi-level system. Read this first before implementing any planned features.

- **src/design/LevelProgressionSystem.md** - Multi-level campaign system with 5 unique levels (Grasslands → Marshlands → Mountain Pass → Frozen Wastes → Volcanic Crater). Includes star rating system, difficulty modes, and level-specific terrain challenges. Reference for campaign design rationale.

- **src/design/TerrainMechanics.md** - Terrain-based mechanics system introducing 5 terrain types (Grass, Water, Cliffs, Ice, Lava). Covers building restrictions, enemy behavior modifiers, tower variants (Amphibious, Fire-Immune), environmental hazards (Blizzards, Volcanic Vents), and pathfinding integration. Reference when implementing terrain or level-specific mechanics.

- **src/design/WaterEnemies.md** - Water-based enemy types (Swamp Wraith, Drowned Zombie, Siren, Kraken Tentacle, Tidal Horror) with terrain-dependent behaviors, spawn patterns, and balancing metrics. Consult when adding aquatic enemies or water-related gameplay.

**Implementation Priority** (See ImplementationRoadmap.md for details):
1. **Phase 1-3**: Terrain System (foundation)
2. **Phase 4**: Amphibious Towers (tower variants)
3. **Phase 5**: Level Data System (multi-level framework)
4. **Phase 6**: Water Enemies (content)

**Key Architectural Changes Required**:
- **New Managers**: LevelManager, TerrainManager
- **New State**: CAMPAIGN (overworld map selection)
- **Grid Extension**: Add terrain property (2D array of TERRAIN_TYPES)
- **Pathfinding Extension**: Terrain-aware A* with enemy-specific walkability
- **Tower Variants**: Amphibious and Fire-Immune tower subclasses
- **Enemy Extensions**: Water speed modifiers, healing, immunity mechanics
- **Data Layer**: LevelData.js for terrain layouts, spawn points, level configs

## Common Tasks

### Current System
**Adding Tower:** Create subclass (Tower.js:231-448) → Add to factory (TowerManager.js:20-38) → Add stats (GameConstants.js) → Add to UI (UI.js:128-136)

**Adding Enemy:** Create subclass (Enemy.js:312-450) → Add to factory (WaveManager.js:170-192) → Add to WaveConfig.js → Load sprites (AssetLoader.js)

**Performance Tuning:** Edit GameConstants.js - MAX_PARTICLES (500), OFFSCREEN_CULL_MARGIN (100px), PARTICLE_POOL_SIZE (600)

### Planned Features (See Design Docs)
**Adding Terrain Type:** Define in TERRAIN_TYPES enum (GameConstants.js) → Create terrain data in LevelData.js → Update Grid rendering → Add placement validation (TowerManager.js) → Update Pathfinder walkability logic

**Adding Water Enemy:** Create subclass extending Enemy → Add isAquatic flag + water modifiers → Implement terrain-based behavior (speed, healing, immunity) → Add to WaveConfig → Update spawn logic (WaveManager.js)

**Creating New Level:** Define level data (LevelData.js) → Design terrain layout (2D array) → Configure enemy compositions → Set unlock requirements → Create level-specific visual assets

### Debugging & Error Resolution

**When encountering errors, consult [ERROR_GUIDE.md](ERROR_GUIDE.md) for comprehensive troubleshooting.**

**Quick Error Lookup:**
```bash
# Search for specific error message
grep -n "error message text" ERROR_GUIDE.md

# Example: Search for shell compatibility error
grep -n "dir: cannot access" ERROR_GUIDE.md

# Example: Search by error ID
grep -n "ERROR_ID: JS_001" ERROR_GUIDE.md
```

**Error Categories in ERROR_GUIDE.md:**
- **Shell & Command Line** - Git Bash, npm, port conflicts
- **JavaScript Runtime** - ReferenceError, TypeError, undefined variables
- **p5.js Specific** - Global conflicts, asset loading, canvas issues
- **Asset Loading** - Missing sprites, CORS, path errors
- **Game Logic** - Pathfinding, enemy AI, tower placement
- **Performance** - FPS drops, memory leaks, optimization
- **Build & Deployment** - Production errors, 404s, CORS

**For Claude/AI Agents:**
When encountering an error:
1. Use `Grep pattern:"<error_message>" path:ERROR_GUIDE.md` to find solutions
2. Each error has searchable error messages and unique ERROR_ID
3. Solutions include file paths and line numbers for quick fixes

**Updating ERROR_GUIDE.md:**
When an error has been encountered and resolved:
1. **REQUIRED:** Use the `Task` tool with `subagent_type=debug-guide-maintainer` to document the error
2. Provide the error details (error message, context, fix, affected files)
3. The agent will automatically:
   - Check for duplicate entries
   - Assign the next available ERROR_ID
   - Format the entry with searchable tags
   - Add it to the appropriate category
   - Ensure grep-searchable error messages
4. **DO NOT** manually edit ERROR_GUIDE.md - always use the agent

**Common Quick Fixes:**
| Error Type | Quick Fix | ERROR_ID |
|------------|-----------|----------|
| `X is not defined` | Check index.html script order | JS_001 |
| `X is not a function` | Check p5.js naming conflicts | JS_002 |
| `dir: cannot access` | Use `ls -R` instead of `dir /S /B` | SHELL_001 |
| Enemies stuck | Verify pathfinding validation | GAME_001 |
| Missing sprites | Check AssetLoader paths and frame counts | ASSET_001, ASSET_002 |
| FPS drops | Check particle/enemy counts, tune constants | PERF_001 |
| CORS errors | Start local server: `npx http-server -p 8000 -c-1` | ASSET_001 |

## Architecture Philosophy

This codebase prioritizes:
1. **Separation of Concerns** - Managers handle one thing, renderers don't mutate state
2. **Performance over Elegance** - Object pooling, culling, event-driven updates
3. **Data-Driven Design** - Waves, towers, enemies defined in constants/configs
4. **Progressive Disclosure** - Tutorial system, expanding grid, DDA for accessibility

See .claude/docs/architectural_patterns.md for detailed pattern explanations.
