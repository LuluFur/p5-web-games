# Technical Concerns

## Critical Issues

### 1. Uncommitted Work in Git
**Severity:** CRITICAL
**Status:** 6 deleted files + 4 new files uncommitted

- **Deleted:** PLAN_AI_DECISION_MAKING.md, PLAN_AI_TARGETING.md, PLAN_FOG_OF_WAR.md, PLAN_FOG_OF_WAR_AI.md, PLAN_GRACE_PERIOD.md, PLAN_PROGRESSION_TRACKING.md
- **Modified:** index.html, src/Game.js, src/Unit.js, src/ai/AIController.js, src/managers/EventManager.js
- **Untracked:** package.json, package-lock.json, src/ai/EnemyDiscoveryTracker.js, 3 new AI design docs

**Risk:** Loss of work, unclear intent, prevents code review
**Action Required:** Commit or explain deletions

### 2. No Module System (13,749 Lines of Global JavaScript)
**Severity:** HIGH
**Issue:** 40+ scripts load in strict order, global namespace pollution

**Risks:**
- Name collision errors unpredictable
- New contributors can't add features without understanding load order
- Single dependency chain failure breaks entire game
- No tree-shaking or dead code elimination

**Recommendation:** Consider webpack/rollup for module bundling

### 3. No Automated Testing
**Severity:** HIGH
**Issue:** Only manual testing procedures documented

**Gaps:**
- No unit tests (only BuilderTests.js exists but limited)
- No integration tests
- No performance regression tests

**Risk:** Regressions not caught, balance changes unpredictable

## Performance Concerns

### 1. Object Pooling Not Universal
**Severity:** MEDIUM
**Issue:** Implemented for particles (500 cap) but NOT for:
- Projectiles (no pooling)
- Enemies (spawned fresh)
- Units (RTS, no reuse)

**Impact:** GC pauses on death waves or rapid spawning
**Recommendation:** Implement projectile pooling

### 2. Off-Screen Culling Has Fixed Margin
**Severity:** MEDIUM
**Issue:** OFFSCREEN_CULL_MARGIN fixed at 100px

**Risk:** Large maps or high zoom-out render 500+ off-screen entities
**Impact:** 20-30% FPS loss on expanded grids
**Recommendation:** Make margin dynamic based on zoom

### 3. Pathfinding Not Optimized
**Severity:** MEDIUM
**Issue:** A* called per unit, no spatial partitioning

**Risk:** 50+ units pathfinding = O(n × m × a)
**Missing:** Quadtree, hierarchical pathfinding
**Recommendation:** Add waypoint graph for mid-game

### 4. Event System Memory Limit
**Severity:** LOW
**Issue:** EventManager stores 100 events in history

**Risk:** If events fire 1000x/second, history fills instantly
**Location:** src/managers/EventManager.js:131-141
**Recommendation:** Reduce to 50, add timestamp pruning

## Architectural Concerns

### 1. Singleton Game Instance
**Severity:** MEDIUM
**Issue:** Game.instance used throughout 40+ files

**Problems:**
- Hard to unit test (can't isolate components)
- Cleanup between games incomplete
- No clear dependency injection

**Recommendation:** Extract dependencies into constructor parameters

### 2. Manager Cleanup Incomplete
**Severity:** MEDIUM
**Issue:** Game.cleanupPreviousGame() has TODOs

**Risks:**
- AIControllers may not clear all references
- BuildingManager may leave event listeners
- No registry of all listeners to purge

**Location:** src/Game.js:80-104
**Recommendation:** Add comprehensive listener purge

### 3. No Separation Between Game Modes
**Severity:** MEDIUM
**Issue:** Same Game class handles Tower Defense AND RTS

**Problems:**
- 11 game states mixed
- Tower defense code mixed with RTS code
- Impossible to disable one mode

**Recommendation:** Split into GameModes or subclasses

## Unimplemented Features

### 1. Terrain System (DESIGNED, NOT IMPLEMENTED)
**Status:** 5 phases in ImplementationRoadmap.md
**Missing:** Water, cliffs, ice, lava terrain types

**Risk:** Large refactor required
**Files Affected:** Grid.js, Pathfinder.js, Tower.js, Enemy.js
**Estimated Effort:** 2-3 weeks

### 2. Multi-Level Progression (DESIGNED, NOT IMPLEMENTED)
**Status:** LevelProgressionSystem.md exists
**Missing:** Campaign, progression unlocks, star ratings

**Risk:** Large architectural change
**Current State:** Infinite waves only

### 3. Water Enemies (DESIGNED, NOT IMPLEMENTED)
**Status:** WaterEnemies.md, AI_ENHANCEMENT_PLAN.md
**Missing Classes:** SwampWraith, DrownedZombie, Siren, Kraken

**Dependencies:** Requires terrain system first

### 4. AI Enhancement (4 Phases, MOSTLY UNIMPLEMENTED)
**Phase 1:** EnemyDiscoveryTracker.js exists but incomplete
**Phase 2-4:** Dynamic army composition, attack timing, veterancy - NOT implemented

### 5. Event-Driven AI Decisions (NOT IMPLEMENTED)
**Status:** AI_EVENT_DRIVEN_DECISIONS.md designed
**Missing:** Event hooks, task queue, mode-based requirements

### 6. Combat Strategy System (NOT IMPLEMENTED)
**Status:** AI_COMBAT_STRATEGY.md designed
**Missing:** Unit counter matrix, effectiveness tracking

## Code Quality Concerns

### 1. Extremely Large Files
**Severity:** MEDIUM

- AIController.js: 1400+ lines
- Game.js: 1500+ lines
- Building.js, Unit.js: 500+ lines each

**Risk:** Hard to find code, difficult to test
**Recommendation:** Split AIController into strategy subclasses

### 2. No TypeScript or JSDoc
**Severity:** MEDIUM
**Issue:** Vanilla ES6, sparse documentation

**Risk:** Can't determine types, return values, side effects
**Missing:** Type hints in 80% of functions
**Recommendation:** Add comprehensive JSDoc

### 3. Inconsistent Error Handling
**Severity:** MEDIUM
**Issue:** Some managers have try/catch, most don't

**Risk:** Errors in callbacks silently fail
**Recommendation:** Wrap all event-driven code in try/catch

### 4. No Configuration System
**Severity:** LOW
**Issue:** All balance values hard-coded

**Risk:** Players can't customize difficulty
**Missing:** Config file loading, difficulty modifiers

## Documentation Gaps

### 1. ERROR_GUIDE.md Outdated
**Status:** Tower defense only, no RTS errors
**Missing:** RTS_001-RTS_005 error patterns

### 2. Architectural Patterns Incomplete
**Missing:**
- Composite (hierarchies)
- Observer (damage/death)
- Chain of Responsibility (command queue)

### 3. No Data Flow Documentation
**Missing:**
- Resource flow diagrams
- Combat flow diagrams
- Command flow diagrams
- Event propagation diagrams

### 4. Performance Profiling Guide Vague
**Missing:** Specific DevTools steps, metrics thresholds

## Security & Stability

### 1. No Input Validation on Game Settings
**Severity:** LOW
**Issue:** RTS settings not validated

**Example:** `game.rtsSettings.startingResources = -999999` crashes economy
**Recommendation:** Add enum validation

### 2. Global Window Pollution
**Severity:** LOW
**Issue:** 10+ global objects created

**Risk:** Console-based griefing possible
**Recommendation:** Use IIFE to limit globals

### 3. Asset Loading Race Condition
**Severity:** MEDIUM
**Status:** Partially fixed, P5_001 error still in guide

**Risk:** Assets accessed before preload completes
**Recommendation:** Add asset loaded flag check

## Dependency & Versioning

### 1. p5.js Version Pinned to 1.10.0
**Severity:** LOW
**Status:** CDN link to 1.10.0

**Risk:** Security fixes require manual update
**Recommendation:** Migrate to npm, update to 1.14.0+

### 2. No package-lock.json (Until Recently)
**Status:** Newly added, but package.json minimal

**Risk:** Builds not reproducible
**Recommendation:** Pin http-server version

### 3. No Build System
**Severity:** MEDIUM
**Issue:** No webpack/vite, all 40+ scripts load synchronously

**Impact:** ~150KB+ script size, no code splitting
**Recommendation:** Add Vite for development

## State Management

### 1. No State Restoration on Restart
**Severity:** MEDIUM
**Issue:** cleanupPreviousGame() incomplete

**Risk:** Second game inherits first game's state
**Test:** Check if IDs reset on new game

### 2. AIController References May Outlive Game
**Severity:** MEDIUM
**Issue:** destroy() called but event listeners persist

**Risk:** Memory leak
**Recommendation:** Store unsubscribe functions

### 3. Tower/Enemy Death State Transitions
**Severity:** MEDIUM
**Evidence:** Recent fix "Prevent state reset to IDLE when unit is dying"

**Risk:** Fragile state machine
**Recommendation:** Add state transition validator

## Known Bugs & Workarounds

### 1. Unit Fade-Out Animation (Recently Fixed)
**Status:** Fixed in commit 97019c6
**Risk:** Similar issues may exist in other animations

### 2. Memory Leak Prevention Notes
**Location:** src/Unit.js:150, :543
**Note:** "Replaces setTimeout to avoid memory leak"
**Recommendation:** Audit all setTimeout/setInterval usage

### 3. Build Radius Calculations (Recently Fixed)
**Status:** Fixed in commit 0033c08
**Risk:** Similar calculation bugs likely elsewhere

### 4. FOW Visibility (Multiple Recent Fixes)
**Pattern:** Multiple FOW patches suggest complexity
**Recommendation:** Add integration tests for FOW

## Missing Gameplay Features

### 1. No Pause System (RTS Mode)
**Severity:** MEDIUM
**Status:** GameState.PAUSED exists but not used

### 2. No Difficulty Settings UI
**Severity:** MEDIUM
**Status:** Difficulty defined but no UI to select

### 3. No Settings/Options Screen
**Severity:** LOW
**Missing:** Volume, graphics, keybinds

### 4. No RTS Tutorial
**Severity:** MEDIUM
**Status:** Tower defense has tutorial, RTS doesn't

## Summary Table

| Category | Severity | Count | Priority |
|----------|----------|-------|----------|
| Unimplemented Features | HIGH | 6 | Plan roadmap |
| Performance Issues | MEDIUM | 4 | Optimize next |
| Code Quality | MEDIUM | 4 | Refactor when stable |
| Architectural | MEDIUM | 3 | Address in v2.0 |
| Testing | HIGH | 3 | Add tests now |
| Git/Workflow | CRITICAL | 1 | Commit immediately |
| Documentation | MEDIUM | 4 | Update incrementally |
| Known Bugs | LOW | 4 | Monitor for regression |

## Immediate Action Items

1. **COMMIT OR EXPLAIN GIT STATUS** (CRITICAL)
2. Add build system (webpack/vite)
3. Implement basic test suite (50+ tests)
4. Refactor AIController (split into strategies)
5. Fix incomplete cleanup (state reset)
6. Add JSDoc type hints
7. Implement terrain system Phase 1
8. Add performance profiling tools
