---
name: error-debugger
description: Diagnoses JavaScript errors, asset loading failures, p5.js conflicts, game logic bugs, and performance issues. Use when encountering errors, crashes, console warnings, sprites not loading, enemies stuck, towers not working, or any unexpected behavior.
allowed-tools: Read, Grep, Bash(ls:*), Bash(find:*)
---

# Error Debugging Workflow

## Reference Documentation

The complete error guide is available in: @~ERROR_GUIDE.md

## Systematic Debugging Approach

When encountering an error, follow this workflow:

### 1. Identify Error Category

**Categories:**
- **SHELL** - Command line, npm, Git Bash issues
- **JS** - JavaScript runtime errors (ReferenceError, TypeError)
- **P5** - p5.js specific issues (global conflicts, canvas)
- **ASSET** - Sprite loading, animation frames, CORS
- **GAME** - Enemy AI, towers, pathfinding, gameplay logic
- **PERF** - FPS drops, frame stuttering, memory leaks
- **BUILD** - Deployment, 404s, production issues

### 2. Search ERROR_GUIDE.md

```bash
# Search for exact error message
grep -n "error message text" ERROR_GUIDE.md

# Search by category
grep -n "ERROR_ID: JS_" ERROR_GUIDE.md
```

### 3. Common Quick Fixes

**Script Loading Order (JS_001):**
- Check index.html lines 14-62
- Constants → Utilities → Core → Managers → Renderers → Game → sketch.js

**p5.js Global Conflicts (JS_002):**
- Don't use: `text`, `rect`, `color`, `image`, `fill`, `stroke` as variable names
- Use: `textContent`, `enemyColor`, `fillValue` instead

**Asset Loading (ASSET_001/002):**
```bash
# 1. Verify server running
npx http-server -p 8000 -c-1

# 2. Check file exists
ls -la "assets/goblin/animations/walk/south/frame_000.png"

# 3. Verify frame count matches config
ls assets/goblin/animations/walk/south/ | wc -l
```

**Enemies Stuck (GAME_001):**
- Check enemy state transitions (SPAWNING → WALK)
- Verify pathfinding hasn't been blocked by tower placement
- Check path array is valid

**Performance (PERF_001):**
- Check debug overlay: particles < 500, enemies < 100
- Verify off-screen culling active (Game.js:172-208)
- Check object pooling (ObjectManager.js:90-131)

### 4. Document New Errors

If error is not in ERROR_GUIDE.md:

```markdown
### ERROR_ID: <CATEGORY>_<NEXT_NUM>
**Error Message:** `<exact error text>`

**Cause:** <explanation>

**Solution:**
<step-by-step fix>

**File Reference:** <files:lines>
```

Use the debug-guide-maintainer agent to add it:
- Automatically checks for duplicates
- Assigns next ERROR_ID
- Formats with searchable tags

## Key Files

- **ERROR_GUIDE.md** - Complete error database (19+ errors documented)
- **index.html:14-62** - Script loading order
- **AssetLoader.js:18-125** - Sprite paths and frame counts
- **GameConstants.js** - Performance tuning values
- **ObjectManager.js:90-131** - Particle pooling

## Output Format

When debugging, provide:

1. **Error Category** - SHELL/JS/P5/ASSET/GAME/PERF/BUILD
2. **ERROR_ID** - If known (e.g., JS_001)
3. **Root Cause** - Why it happened
4. **Solution** - Step-by-step fix with code examples
5. **Prevention** - How to avoid in future
6. **File References** - Exact file paths and line numbers

Always check ERROR_GUIDE.md first before suggesting solutions!
