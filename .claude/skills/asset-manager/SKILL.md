---
name: asset-manager
description: Diagnoses sprite loading failures, animation frame mismatches, missing assets, CORS errors, and asset path issues. Use when sprites don't load, enemies render as circles, animations are broken, or console shows 404 errors for assets.
allowed-tools: Read, Bash(ls:*), Bash(find:*), Bash(wc:*)
---

# Asset Management & Debugging

## Asset Structure

This project uses **8-directional sprite animations** for enemies:

```
assets/
├── goblin/
│   ├── animations/
│   │   ├── walk/
│   │   │   ├── east/
│   │   │   │   ├── frame_000.png
│   │   │   │   ├── frame_001.png
│   │   │   │   └── ... (6 frames total)
│   │   │   ├── west/
│   │   │   ├── south/
│   │   │   ├── north/
│   │   │   ├── south-east/
│   │   │   ├── south-west/
│   │   │   ├── north-east/
│   │   │   └── north-west/
│   │   ├── scary-walk/ (8 directions × 8 frames)
│   │   └── breathing-idle/ (8 directions × 4 frames)
│   └── metadata.json
├── skeleton/
├── vampire/
└── zombie/
```

## Common Asset Issues

### Issue 1: Sprites Not Loading (404 Errors)

**Symptoms:**
- Browser console shows: `GET http://127.0.0.1:8000/assets/.../frame_000.png 404`
- Enemies render as colored circles instead of sprites
- Missing sprite warnings in console

**Diagnosis:**

```bash
# 1. Check if local server is running
# Should see: "Starting up http-server..."
npx http-server -p 8000 -c-1

# 2. Verify file exists
ls -la "assets/goblin/animations/walk/south/frame_000.png"

# 3. List all files in animation folder
ls -R "assets/goblin/animations/"

# 4. Count frames in a specific direction
ls assets/goblin/animations/walk/south/ | wc -l
# Should match frame count in AssetLoader.js
```

**Solutions:**

**A) Missing Local Server (CORS)**
```bash
# CORS blocks local file:// access
# MUST run local server:
npx http-server -p 8000 -c-1

# Then open: http://127.0.0.1:8000
# NOT: file:///C:/Users/.../index.html
```

**B) Wrong File Path**
```javascript
// Check AssetLoader.js path generation
// For goblin walk south frame 0, generates:
let path = `assets/goblin/animations/walk/south/frame_000.png`;

// Verify:
// 1. Folder name matches exactly (case-sensitive!)
// 2. Frame numbering: 000, 001, 002... (zero-padded)
// 3. Extension is .png (not .jpg or .PNG)
```

**C) File Actually Missing**
```bash
# Check if assets were committed to Git
git status
git ls-files assets/

# If missing, they weren't committed:
git add assets/
git commit -m "Add sprite assets"
```

---

### Issue 2: Animation Frame Count Mismatch

**Symptoms:**
- Animations stutter or skip frames
- Console shows `undefined` for certain frames
- Enemy flickers between sprite and fallback

**Diagnosis:**

```bash
# Count actual frames in folder
ls assets/goblin/animations/walk/south/ | wc -l

# Compare to AssetLoader.js configuration
# Should match frame count defined in code
```

**Fix in AssetLoader.js:**

```javascript
// Example: walk animation
const goblinAnims = [
    {
        name: 'walk',
        folder: 'walk',
        frames: 6,  // ← MUST match actual file count
        prefix: 'g_walk'
    },
];

// Standard frame counts:
// walk: 6 frames
// scary-walk: 8 frames
// breathing-idle: 4 frames
// fight-stance-idle: 8 frames
// falling-back-death: 7 frames
```

**Verification:**

```bash
# For each animation, verify frame count
for dir in assets/goblin/animations/*/south/; do
    echo "$(basename $(dirname $dir)): $(ls $dir | wc -l) frames"
done

# Output should match AssetLoader.js config
```

---

### Issue 3: Wrong Sprite Key

**Symptoms:**
- Specific enemy always renders as circle
- Console shows: `Looking for sprite: xyz` then `Found: undefined`
- Other enemies of same type render correctly

**Diagnosis:**

```javascript
// In Enemy.js draw(), add debug logging:
console.log("Enemy type:", this.type);
console.log("Animation:", this.currentAnim);
console.log("Direction:", this.currentDir);
console.log("Frame:", this.animFrame);
console.log("Generated key:", imgKey);
console.log("Image found:", Assets.getImage(imgKey));
```

**Common Key Format Issues:**

```javascript
// Correct key format: <prefix>_<anim>_<dir>_<frame>
// Examples:
// "g_walk_s_0"     - Goblin walk south frame 0
// "z_scary_ne_3"   - Zombie scary-walk north-east frame 3
// "v_crouch_w_4"   - Vampire crouch west frame 4

// ✗ Wrong - missing prefix
imgKey = "walk_s_0";

// ✗ Wrong - wrong separator
imgKey = "g-walk-s-0";

// ✗ Wrong - frame out of range
imgKey = "g_walk_s_7"; // walk only has 6 frames (0-5)

// ✗ Wrong - invalid direction code
imgKey = "g_walk_southwest_0"; // should be "sw" not "southwest"
```

**Direction Codes:**
- `e` - East
- `w` - West
- `s` - South
- `n` - North
- `se` - South-East
- `sw` - South-West
- `ne` - North-East
- `nw` - North-West

---

### Issue 4: Async Loading Race Condition

**Symptoms:**
- First few enemies render as circles, later ones as sprites
- Refreshing the page sometimes fixes it
- Console shows: `Cannot read properties of undefined (reading 'images')`

**Cause:** Game starts before assets finish loading

**Fix in sketch.js:**

```javascript
// ✓ Correct - Wait for assets
async function setup() {
    createCanvas(1280, 720);

    // Load all assets BEFORE creating game
    await Promise.all(Assets.queue.map(item => /* ... */));

    console.log("Assets loaded:", Object.keys(Assets.assets.images).length);

    // NOW it's safe to create game
    game = new Game();
}

// ✗ Wrong - Creates game immediately
function setup() {
    createCanvas(1280, 720);
    game = new Game(); // Assets not loaded yet!
}
```

---

### Issue 5: Case-Sensitive Paths (Linux/Mac)

**Symptoms:**
- Works on Windows, fails on Linux/Mac
- 404 errors on deployment

**Cause:** Windows is case-insensitive, Linux/Mac are case-sensitive

```bash
# Windows: These are the same
assets/Goblin/Walk/Frame_000.png
assets/goblin/walk/frame_000.png

# Linux/Mac: These are different!
```

**Fix:** Ensure consistent lowercase naming

```bash
# Check for mixed-case files
find assets -type f -name '*[A-Z]*'

# Should return empty - all files should be lowercase
```

---

## Asset Verification Checklist

When debugging asset issues, check:

### 1. Server Running
```bash
✓ npx http-server -p 8000 -c-1 is running
✓ Accessing http://127.0.0.1:8000 (not file://)
```

### 2. File Structure
```bash
✓ All files are lowercase
✓ Frame numbering is zero-padded (000, 001, 002...)
✓ All frames exist for all 8 directions
```

### 3. AssetLoader.js Configuration
```javascript
✓ Frame count matches actual files
✓ Folder names match exactly
✓ Prefix is unique per enemy type
```

### 4. Enemy Class Configuration
```javascript
✓ Enemy has spritePrefix defined
✓ Animations array includes all used animations
✓ Direction codes are correct (e, w, s, n, se, sw, ne, nw)
```

### 5. Asset Loading Complete
```javascript
✓ setup() waits for asset loading
✓ Console shows "Loaded Assets: X" message
✓ No "Failed to load" errors in console
```

---

## Asset Loading Flow

**AssetLoader.js (lines 18-125):**
1. Defines animation configs for each enemy type
2. Generates asset paths for all frames
3. Queues assets for loading

**sketch.js (lines 4-35):**
1. Async setup() function
2. Loads all queued assets in parallel
3. Waits for completion before creating Game
4. Handles failed assets with fallback

**Enemy.js (lines 137-214):**
1. Generates sprite key from current state
2. Attempts to get image from Assets
3. Falls back to colored circle if missing

---

## Adding New Enemy Assets

To add a new enemy type:

### 1. Create Folder Structure
```bash
mkdir -p assets/new-enemy/animations/{walk,scary-walk,death}/{e,w,s,n,se,sw,ne,nw}
```

### 2. Add Sprite Frames
- Place frame_000.png through frame_00X.png in each direction folder
- Ensure all directions have same frame count

### 3. Update AssetLoader.js
```javascript
// Add to enemy configs
const newEnemyAnims = [
    { name: 'walk', folder: 'walk', frames: 6, prefix: 'ne_walk' },
    { name: 'scary', folder: 'scary-walk', frames: 8, prefix: 'ne_scary' },
    { name: 'death', folder: 'death', frames: 7, prefix: 'ne_death' }
];

// Add to queue generation
for (let anim of newEnemyAnims) {
    for (let dir of directions) {
        for (let f = 0; f < anim.frames; f++) {
            // ... queue asset
        }
    }
}
```

### 4. Create Enemy Class
```javascript
class NewEnemy extends Enemy {
    constructor(path) {
        super(path);
        this.spritePrefix = 'ne'; // Matches prefix in AssetLoader
        this.animations = {
            walk: { frames: 6, speed: 8 },
            scary: { frames: 8, speed: 6 },
            death: { frames: 7, speed: 5 }
        };
    }
}
```

### 5. Test Loading
```javascript
// In browser console after loading
console.log("New enemy sprites:",
    Object.keys(Assets.assets.images)
        .filter(k => k.startsWith('ne_'))
);
// Should show all ne_walk_*, ne_scary_*, ne_death_* sprites
```

---

## Quick Asset Audit Script

```bash
#!/bin/bash
# audit-assets.sh - Verify asset integrity

echo "=== Asset Audit ==="

# Check server
if lsof -i :8000 > /dev/null; then
    echo "✓ Server running on port 8000"
else
    echo "✗ No server on port 8000 - run: npx http-server -p 8000 -c-1"
fi

# Check structure
for enemy in goblin skeleton vampire zombie; do
    echo ""
    echo "Checking $enemy..."

    for anim in walk scary-walk breathing-idle; do
        for dir in e w s n se sw ne nw; do
            count=$(ls assets/$enemy/animations/$anim/$dir/ 2>/dev/null | wc -l)
            if [ $count -gt 0 ]; then
                echo "  $anim/$dir: $count frames"
            else
                echo "  ✗ Missing: $anim/$dir"
            fi
        done
    done
done
```

---

## Key Files

- **AssetLoader.js:18-125** - Asset path generation and queuing
- **sketch.js:4-35** - Async asset loading
- **Enemy.js:137-214** - Sprite rendering with fallback
- **ERROR_GUIDE.md** - ASSET_001, ASSET_002, ASSET_003

Always verify file paths match AssetLoader.js configuration exactly!
