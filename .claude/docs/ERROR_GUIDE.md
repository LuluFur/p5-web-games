# Error Guide - Merge Defence

**Purpose:** Comprehensive troubleshooting guide for common errors. Optimized for both human reading and automated error learning.

**For Claude/AI Agents:** When encountering an error:
1. Use `Grep pattern:"<error_message>" path:ERROR_GUIDE.md` to search for solutions
2. Error messages are included verbatim for exact matching
3. Each error has a unique `ERROR_ID` for quick reference
4. Solutions are actionable and include file paths with line numbers

**For Developers:** Use Ctrl+F / Cmd+F to search for error messages or error IDs.

---

## Table of Contents

- [Shell & Command Line Errors](#shell--command-line-errors)
- [JavaScript Runtime Errors](#javascript-runtime-errors)
- [p5.js Specific Errors](#p5js-specific-errors)
- [Asset Loading Errors](#asset-loading-errors)
- [Game Logic Errors](#game-logic-errors)
- [Performance Issues](#performance-issues)
- [Build & Deployment Errors](#build--deployment-errors)

---

## Shell & Command Line Errors

### ERROR_ID: SHELL_001
**Error Message:** `dir: cannot access '/S': No such file or directory`

**Full Error:**
```
dir: cannot access '/S': No such file or directory
dir: cannot access '/B': No such file or directory
```

**Cause:** Using Windows CMD syntax in Git Bash or Unix-like shell environments.

**Context:** Windows has two shell environments:
- CMD/PowerShell: Uses `dir`, `findstr`, `type`
- Git Bash: Uses Unix commands (`ls`, `grep`, `cat`)

**Solution:**
```bash
# Wrong - Windows CMD syntax
dir /S /B "path/to/directory"

# Correct - Unix syntax (works in Git Bash)
ls -R "path/to/directory"

# Alternative - More detailed listing
find "path/to/directory" -type f
```

**Prevention:**
- Always use Unix-style commands when working in Git Bash
- Use `ls` instead of `dir`
- Use `grep` instead of `findstr`
- Use `cat` instead of `type`

**Platform Detection (for scripts):**
```bash
# Detect shell environment
if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
    # Git Bash on Windows - use Unix commands
    ls -R
fi
```

---

### ERROR_ID: SHELL_002
**Error Message:** `npx: command not found`

**Cause:** Node.js/npm not installed or not in PATH.

**Solution:**
```bash
# Check if Node.js is installed
node --version
npm --version

# If not installed, download from: https://nodejs.org/
# Restart terminal after installation

# If installed but command not found, add to PATH:
# Windows: Add C:\Program Files\nodejs to System PATH
# Mac/Linux: Add to ~/.bashrc or ~/.zshrc:
export PATH="$PATH:/usr/local/bin"
```

**File Reference:** CLAUDE.md:48-50 (local server setup)

---

### ERROR_ID: SHELL_003
**Error Message:** `Address already in use` or `EADDRINUSE: address already in use :::8000`

**Cause:** Port 8000 is already occupied by another process.

**Solution:**
```bash
# Find process using port 8000
# Windows (PowerShell):
netstat -ano | findstr :8000

# Mac/Linux:
lsof -i :8000

# Kill the process
# Windows: taskkill /PID <PID> /F
# Mac/Linux: kill -9 <PID>

# Or use a different port:
npx http-server -p 8001 -c-1
```

---

## JavaScript Runtime Errors

### ERROR_ID: JS_001
**Error Message:** `ReferenceError: <ClassName> is not defined`

**Common Examples:**
- `ReferenceError: GAME_STATES is not defined`
- `ReferenceError: GameConstants is not defined`
- `ReferenceError: Tower is not defined`

**Cause:** Script loading order issue - attempting to use a class/constant before its script loads.

**Solution:**
1. Check `index.html` script order (see lines 14-62)
2. Ensure dependencies load before dependents:

**Correct Loading Order:**
```html
<!-- 1. Constants (required by everything) -->
<script src="src/constants/GameConstants.js"></script>

<!-- 2. Utilities -->
<script src="src/utils/GameMath.js"></script>

<!-- 3. Core Classes -->
<script src="src/Grid.js"></script>
<script src="src/Pathfinder.js"></script>
<script src="src/Enemy.js"></script>
<script src="src/Tower.js"></script>

<!-- 4. Managers (depend on core classes) -->
<script src="src/managers/WaveManager.js"></script>
<script src="src/managers/TowerManager.js"></script>

<!-- 5. Renderers (depend on managers) -->
<script src="src/renderers/SpriteRenderer.js"></script>

<!-- 6. Game orchestrator (depends on everything) -->
<script src="src/Game.js"></script>

<!-- 7. p5.js entry point (creates Game instance) -->
<script src="sketch.js"></script>
```

**File Reference:** CLAUDE.md:302-312, index.html:14-62

---

### ERROR_ID: JS_002
**Error Message:** `TypeError: <function> is not a function`

**Common Examples:**
- `TypeError: text is not a function`
- `TypeError: rect is not a function`
- `TypeError: color is not a function`

**Cause:** Shadowing p5.js global functions with local variables.

**p5.js Global Functions (DO NOT USE AS VARIABLE NAMES):**
- `text`, `rect`, `line`, `ellipse`, `arc`, `triangle`
- `color`, `fill`, `stroke`, `noFill`, `noStroke`
- `image`, `tint`, `noTint`
- `random`, `noise`, `map`, `constrain`
- `translate`, `rotate`, `scale`, `push`, `pop`

**Solution:**
```javascript
// Wrong - shadows p5.js global
let text = "Hello World";
text(text, 10, 10); // ERROR: text is not a function

// Correct - use descriptive names
let textContent = "Hello World";
text(textContent, 10, 10); // Works!

// Wrong
let color = 255;

// Correct
let colorValue = 255;
let enemyColor = color(255, 0, 0);
```

**Prevention:** Check p5.js reference before naming variables: https://p5js.org/reference/

**File Reference:** CLAUDE.md:423-428

---

### ERROR_ID: JS_003
**Error Message:** `Uncaught ReferenceError: frameCount is not defined`

**Cause:** Using p5.js globals outside of p5.js context (before setup/draw).

**Solution:**
```javascript
// Wrong - frameCount not available yet
class Enemy {
    constructor() {
        this.frame = frameCount; // ERROR at construction time
    }
}

// Correct - use frameCount in update/draw
class Enemy {
    constructor() {
        this.frame = 0;
    }

    update() {
        this.frame = frameCount; // OK - called from draw loop
    }
}
```

---

## p5.js Specific Errors

### ERROR_ID: P5_001
**Error Message:** `Uncaught TypeError: Cannot read properties of undefined (reading 'images')`

**Cause:** Attempting to access Assets before AssetLoader preload completes.

**Solution:**
```javascript
// In sketch.js, ensure proper async setup:
async function setup() {
    createCanvas(1280, 720);

    // Wait for assets to load
    Assets.preload();

    // Only create game AFTER assets load
    game = new Game();
}

// In enemy/tower draw(), check if asset exists:
let img = Assets.getImage(imgKey);
if (img) {
    image(img, 0, 0);
} else {
    // Fallback rendering
    fill(255, 0, 0);
    ellipse(x, y, 30);
}
```

**File Reference:** sketch.js:4-35, AssetLoader.js:106-134

---

### ERROR_ID: P5_002
**Error Message:** `p5.js says: image() was expecting p5.Image for parameter #0, received undefined instead`

**Cause:** Image not loaded or incorrect key used.

**Solution:**
```javascript
// Debug: Check if image loaded
console.log("Checking image:", imgKey);
let img = Assets.getImage(imgKey);
console.log("Image found:", img);

if (!img) {
    console.error(`Missing image: ${imgKey}`);
    // Check AssetLoader.js:18-125 for correct key format
    // Verify assets folder has the file
}

// Always provide fallback
if (img) {
    image(img, x, y, w, h);
} else {
    fill(255, 0, 255); // Magenta = missing sprite
    rect(x, y, w, h);
}
```

**File Reference:** AssetLoader.js:116-129 (asset loading), Enemy.js:187-214 (fallback pattern)

---

## Asset Loading Errors

### ERROR_ID: ASSET_001
**Error Message:** `Failed to load <asset_path>` (in browser console)

**Common Examples:**
- `Failed to load assets/goblin/animations/walk/south/frame_000.png`
- `GET http://127.0.0.1:8000/assets/zombie/walk/south/frame_000.png 404 (Not Found)`

**Cause:** Incorrect path, missing file, or CORS issue.

**Solution:**

**Step 1 - Verify file exists:**
```bash
# Check if file exists at the path
ls -la "assets/goblin/animations/walk/south/frame_000.png"

# List all files in animation folder
ls -R "assets/goblin/animations/"
```

**Step 2 - Verify path in AssetLoader.js:**
```javascript
// Check that path matches actual folder structure
// AssetLoader.js generates paths like:
let path = `assets/goblin/animations/${anim.folder}/${dir}/frame_${pad}.png`;

// Ensure:
// 1. Folder name matches exactly (case-sensitive)
// 2. Frame numbering is correct (000, 001, 002...)
// 3. Frame count matches config
```

**Step 3 - Check CORS (local server running):**
```bash
# Ensure local server is running
npx http-server -p 8000 -c-1

# Open browser to:
http://127.0.0.1:8000
# NOT: file:///C:/Users/.../index.html (CORS blocks local files)
```

**File Reference:** AssetLoader.js:18-125, CLAUDE.md:48-50

---

### ERROR_ID: ASSET_002
**Error Message:** Enemy renders as colored circle instead of sprite

**Cause:** Sprite not loaded OR animation key doesn't match AssetLoader configuration.

**Diagnosis:**
```javascript
// In Enemy draw() method, add debug logging:
console.log("Looking for sprite:", imgKey);
let img = Assets.getImage(imgKey);
console.log("Found:", img);

// Check console output - is key formatted correctly?
// Example correct keys:
// - "z_walk_s_0" (zombie walk south frame 0)
// - "g_scary_ne_3" (goblin scary walk north-east frame 3)
// - "v_crouch_w_4" (vampire crouch west frame 4)
```

**Common Key Format Issues:**
```javascript
// Wrong - missing prefix
imgKey = "walk_s_0"; // Should be "g_walk_s_0" for goblin

// Wrong - wrong separator
imgKey = "g-walk-s-0"; // Should use underscores

// Wrong - frame out of range
imgKey = "g_walk_s_7"; // walk only has 6 frames (0-5)
```

**Solution:**
1. Check AssetLoader.js prefix matches enemy class
2. Verify frame count matches animation
3. Ensure direction codes are correct (e, w, s, n, se, sw, ne, nw)

**File Reference:** AssetLoader.js:18-125, Enemy.js:137-214, Goblin.js:37-78

---

### ERROR_ID: ASSET_003
**Error Message:** Animation frame count mismatch

**Symptoms:**
- Animation stutters or skips frames
- Console shows "undefined" for certain frames
- Enemy flickers between sprite and fallback circle

**Cause:** Frame count in AssetLoader doesn't match actual files in folder.

**Solution:**
```bash
# Count frames in animation folder
ls assets/goblin/animations/walk/south/ | wc -l
# Should match frame count in AssetLoader.js

# For goblin walk, should be 6 files:
# frame_000.png, frame_001.png, ..., frame_005.png
```

**Fix in AssetLoader.js:**
```javascript
// If folder has 8 frames but config says 6:
const goblinAnims = [
    { name: 'walk', folder: 'walk', frames: 8, prefix: 'g_walk' }, // Update to 8
];
```

**Standard Frame Counts:**
- walk: 6 frames
- scary-walk: 8 frames
- breathing-idle: 4 frames
- fight-stance-idle: 8 frames
- falling-back-death: 7 frames
- crouching: 5 frames

**File Reference:** AssetLoader.js:18-125

---

## Game Logic Errors

### ERROR_ID: GAME_001
**Error Message:** Enemies stuck or not moving

**Symptoms:**
- Enemies spawn but don't move
- Enemies stop mid-path
- Console shows pathfinding errors

**Causes & Solutions:**

**Cause 1: Path blocked by tower placement**
```javascript
// Check console for:
"TowerManager: Placement would block path"

// Solution: Players must leave at least one valid path
// Pathfinder.js:validatePath() prevents this
```

**Cause 2: Enemy state stuck in SPAWNING**
```javascript
// In Enemy.js, check state transition:
if (this.state === 'SPAWNING') {
    this.stateTimer--;
    if (this.stateTimer <= 0) {
        this.state = 'WALK'; // Must transition to WALK
    }
    return; // Don't move while spawning
}
```

**Cause 3: Invalid path array**
```javascript
// Debug enemy path:
console.log("Enemy path:", this.path);
console.log("Path index:", this.pathIndex);

// Path should be array of {r, c} objects
// pathIndex should increment as enemy moves
```

**File Reference:** Enemy.js:28-103, Pathfinder.js, TowerManager.js:81-115

---

### ERROR_ID: GAME_002
**Error Message:** Tower won't place / "Cannot place tower here"

**Causes:**

**Cause 1: Grid cell occupied**
```javascript
// Check Grid.js:isWalkable()
// Cell must be GRASS (not PATH or TOWER)
```

**Cause 2: Would block all paths**
```javascript
// TowerManager.js:81-115 validates pathfinding
// Must maintain at least one valid path to end
```

**Cause 3: Out of grid bounds**
```javascript
// Check col/row are within grid bounds:
if (col < 0 || col >= grid.cols || row < 0 || row >= grid.rows) {
    return false;
}
```

**Cause 4: Insufficient gold**
```javascript
// Check EconomyManager.gold >= tower cost
console.log("Gold:", EconomyManager.gold);
console.log("Tower cost:", TOWER_COSTS[towerType]);
```

**File Reference:** TowerManager.js:41-115, Grid.js:81-104

---

### ERROR_ID: GAME_003
**Error Message:** Projectiles not hitting enemies

**Symptoms:**
- Towers shoot but enemies don't take damage
- Projectiles fly past enemies
- Visual hit but no health reduction

**Diagnosis:**
```javascript
// In Projectile.js update(), add logging:
console.log("Projectile distance to target:", dist);
console.log("Hit threshold:", this.hitThreshold);
console.log("Target active:", this.target.active);
```

**Common Causes:**

**Cause 1: Target null check missing**
```javascript
// Before calculating distance:
if (!this.target || !this.target.active) {
    this.active = false;
    return;
}
```

**Cause 2: Hit threshold too small**
```javascript
// In Projectile constructor:
this.hitThreshold = 15; // Increase if projectiles pass through
```

**Cause 3: Enemy already dying**
```javascript
// In Projectile hit detection:
if (this.target.state === 'DYING') {
    this.active = false; // Don't hit dead enemies
    return;
}
```

**File Reference:** Projectile.js, Tower.js (targeting logic)

---

## Performance Issues

### ERROR_ID: PERF_001
**Symptoms:** Frame drops, stuttering, FPS below 50

**Diagnosis:**
1. Check debug overlay (top-left) for entity counts
2. Press F12 → Console → Look for warnings
3. Chrome DevTools → Performance → Record during wave 15+

**Common Causes & Solutions:**

**Cause 1: Too many particles**
```javascript
// Check particle count in debug overlay
// Should be capped at MAX_PARTICLES (500)

// Fix in GameConstants.js:
MAX_PARTICLES: 500,
PARTICLE_POOL_SIZE: 600,

// Verify pooling works in ObjectManager.js:90-131
```

**Cause 2: Off-screen culling not working**
```javascript
// Game.js:172-208 should cull entities outside viewport
// Add logging:
console.log("Visible enemies:", visibleEnemies.length);
console.log("Total enemies:", this.enemies.length);
```

**Cause 3: Too many projectiles**
```javascript
// Limit projectiles per tower
if (this.projectiles.length > 50) {
    this.projectiles.shift(); // Remove oldest
}
```

**Cause 4: Memory leak**
```javascript
// Check if arrays grow indefinitely
console.log("Particles:", game.particles.length);
console.log("Enemies:", game.enemies.length);
console.log("Projectiles:", game.projectiles.length);

// Ensure inactive entities are removed:
this.enemies = this.enemies.filter(e => e.active);
```

**Performance Targets:**
- 60 FPS ideal, 50+ FPS acceptable
- < 500 particles simultaneously
- < 100 enemies simultaneously
- GC pauses < 10ms

**File Reference:** GameConstants.js, ObjectManager.js:90-131, Game.js:172-208, PERFORMANCE_OPTIMIZATIONS.md

---

### ERROR_ID: PERF_002
**Symptoms:** Game freezes during wave start

**Cause:** Spawning too many enemies simultaneously.

**Solution:**
```javascript
// In WaveManager.js, use staggered spawning:
startWave() {
    this.spawnQueue = [...enemies]; // Queue all enemies
    this.spawnTimer = 0;
    this.spawnInterval = 30; // Spawn every 0.5 seconds
}

update() {
    if (this.spawnQueue.length > 0) {
        this.spawnTimer--;
        if (this.spawnTimer <= 0) {
            this.spawnEnemy(this.spawnQueue.shift());
            this.spawnTimer = this.spawnInterval;
        }
    }
}
```

**File Reference:** WaveManager.js:39-167

---

## Build & Deployment Errors

### ERROR_ID: BUILD_001
**Error Message:** `404 Not Found` when accessing deployed game

**Cause:** Incorrect base path or missing index.html.

**Solution:**
```bash
# Ensure index.html is in root of deployment
# Check all asset paths are relative, not absolute

# Wrong:
<script src="/src/Game.js"></script>
<img src="/assets/zombie.png">

# Correct:
<script src="src/Game.js"></script>
<img src="assets/zombie.png">
```

---

### ERROR_ID: BUILD_002
**Error Message:** Assets load locally but not on deployed site

**Cause:** CORS or incorrect asset paths in production.

**Solution:**
```javascript
// Check browser console for:
// "Cross-Origin Request Blocked" or "Mixed Content"

// Ensure all paths are relative
// If deploying to GitHub Pages:
// - Assets must be in same repo
// - Paths should be relative: "assets/..." not "/assets/..."
```

---

## How to Add New Errors to This Guide

**For automated error learning (future subagent):**

1. **Detect error pattern:**
   ```javascript
   // Example: Error in console or command output
   const errorMessage = "ReferenceError: GAME_STATES is not defined";
   ```

2. **Generate ERROR_ID:**
   ```javascript
   // Format: <CATEGORY>_<NUMBER>
   // Categories: SHELL, JS, P5, ASSET, GAME, PERF, BUILD
   const errorId = "JS_004"; // Next available in JavaScript category
   ```

3. **Template for new error:**
   ```markdown
   ### ERROR_ID: <CATEGORY>_<NUMBER>
   **Error Message:** `<exact error text>`

   **Cause:** <brief explanation>

   **Solution:**
   <code example or step-by-step fix>

   **File Reference:** <relevant files with line numbers>
   ```

4. **Append to appropriate section** (maintain numerical order within category)

5. **Test searchability:**
   ```bash
   grep -n "exact error text" ERROR_GUIDE.md
   # Should return the error entry
   ```

---

## Error Reporting Template

When encountering a new error, document it using this template:

```markdown
### ERROR_ID: <CATEGORY>_<NEXT_NUM>
**Error Message:** `<paste exact error>`

**Context:**
- File: <file where error occurred>
- Action: <what you were trying to do>
- Environment: <browser, Node version, OS>

**Cause:** <root cause explanation>

**Solution:**
<step-by-step fix with code examples>

**Prevention:** <how to avoid in future>

**File Reference:** <relevant files:line numbers>

**Date Added:** <YYYY-MM-DD>
```

---

**Last Updated:** 2026-01-04
**Total Errors Documented:** 19
**Categories:** 7 (Shell, JavaScript, p5.js, Assets, Game Logic, Performance, Build)
