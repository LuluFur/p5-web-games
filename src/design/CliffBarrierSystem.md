# Cliff Barrier System

## Overview
Cliffs are **gray stone obstacles** that appear randomly when unlocking new rows. They create tactical challenges by:
- **Blocking tower placement** (cannot build on cliffs)
- **Blocking line-of-sight** (towers cannot see/target enemies through cliffs)
- **Blocking enemy movement** (enemies path around cliffs)

## Visual Design
- **Color**: Gray stone (#666666)
- **Shading**: Diagonal shadow for 3D effect
- **Highlight**: Light gray edge for depth

## How Cliffs Appear

### Perlin Noise Clustering System
When you unlock a new row (every 3 waves), cliffs are generated using **Perlin noise** to create natural-looking clusters:

**Progressive Difficulty (Paired Unlocks):**
Rows unlock in pairs (top then bottom), and share the same cliff threshold:
- **Unlocks 1-2** (First pair): threshold = 0.80 → Very sparse (~20% cliff coverage)
- **Unlocks 3-4** (Second pair): threshold = 0.75 → Sparse (~25% cliff coverage)
- **Unlocks 5-6** (Third pair): threshold = 0.70 → Moderate (~30% cliff coverage)
- **Unlocks 7-8** (Fourth pair): threshold = 0.65 → Dense (~35% cliff coverage)
- **Unlocks 9+** (Late game): threshold = 0.50 (capped) → Maximum density (~50% cliff coverage)

**Why Paired Unlocks?**
- Grid expands alternating top/bottom (row 3 top, row 6 bottom, etc.)
- Each pair (one top, one bottom) gets the same cliff density
- Ensures balanced difficulty on both sides of the map

**Cluster Formation:**
- Uses `noise(x, y)` with scale factor `0.15` for cluster size
- **Note:** p5.js `noise()` returns 0-1 (not -1 to 1)
- Larger clusters form naturally (not random individual tiles)
- Each game has unique cliff patterns (random noise seed)
- Cliffs only appear in **playable area** (not in spawn/base zones)

### Example Unlocked Row:
```
[Spawn] [  ] [CLIFF][CLIFF] [  ] [  ] [  ] [CLIFF][CLIFF][CLIFF] [  ] [Base]
         ↑ Natural cliff clusters (not random individual tiles) ↑
```

## Gameplay Mechanics

### 1. Building Restrictions
```javascript
// Cannot place towers on cliffs
if (terrain === TERRAIN_TYPES.CLIFF) {
    return false; // Placement blocked
}
```

### 2. Line-of-Sight Blocking
Towers check `grid.hasLineOfSight(towerX, towerY, enemyX, enemyY)` before targeting:

```javascript
// Tower targeting logic
if (!this.game.grid.hasLineOfSight(this.x, this.y, enemy.x, enemy.y)) {
    continue; // Skip this enemy, cliff is blocking
}
```

**How it works:**
- Uses **Bresenham's line algorithm** to trace path from tower to enemy
- If path crosses a cliff tile → line of sight **blocked**
- Tower cannot target that enemy

### 3. Enemy Pathfinding
Enemies cannot walk through cliffs (already handled by A* pathfinding):

```javascript
// In Pathfinder.js
if (terrain === TERRAIN_TYPES.CLIFF) {
    continue; // Cannot path through cliff
}
```

## Integration with Towers (Next Step)

### Tower.js - Update Targeting
You'll need to add line-of-sight check to `Tower.findTarget()`:

```javascript
findTarget() {
    let closest = null;
    let closestDist = Infinity;

    for (let enemy of this.game.objectManager.enemies) {
        if (enemy.state !== 'walking') continue;

        let d = dist(this.x, this.y, enemy.x, enemy.y);
        let rangePx = this.range * this.game.grid.cellSize;

        // Check range AND line of sight
        if (d < rangePx && d < closestDist) {
            // NEW: Check if cliffs block line of sight
            if (this.game.grid.hasLineOfSight(this.x, this.y, enemy.x, enemy.y)) {
                closest = enemy;
                closestDist = d;
            }
        }
    }

    return closest;
}
```

### Projectile.js - Cliff Collision (Optional)
For physical projectiles that should collide with cliffs:

```javascript
update() {
    // ... existing movement ...

    // Check cliff collision
    const gridPos = this.game.grid.getCellAt(this.x, this.y);
    const terrain = this.game.grid.getTerrainType(gridPos.r, gridPos.c);

    if (terrain === TERRAIN_TYPES.CLIFF) {
        this.dead = true; // Projectile hits cliff
        // Spawn impact particle effect
    }
}
```

## Adjusting Cliff Generation

### Tuning Parameters (Grid.js:309-316)

**Cluster Size** - Adjust `noiseScale`:
```javascript
const noiseScale = 0.15; // Default - medium-sized clusters
const noiseScale = 0.10; // Larger, more sprawling clusters
const noiseScale = 0.25; // Smaller, tighter clusters
```

**Progressive Difficulty** - Adjust threshold scaling (paired unlocks):
```javascript
const baseThreshold = 0.80;      // Starting difficulty (very sparse - unlock pair 1-2)
const thresholdDecrement = 0.05; // Decrease every 2 unlocks (5% per pair)
const minThreshold = 0.50;       // Maximum difficulty cap (50% coverage)

// Make cliffs increase faster:
const thresholdDecrement = 0.08; // 8% per pair (more aggressive)

// Keep cliffs rare throughout:
const baseThreshold = 0.85;      // Higher starting threshold
const thresholdDecrement = 0.03; // Slower scaling (3% per pair)
```

**Coverage Examples (with noise > threshold):**
- Threshold 0.80 = ~20% of tiles become cliffs
- Threshold 0.70 = ~30% cliff coverage
- Threshold 0.60 = ~40% cliff coverage
- Threshold 0.50 = ~50% cliff coverage (max density)

## Manual Cliff Placement

For specific level designs, manually place cliffs:

```javascript
// In level data or after grid creation
game.grid.setTerrainType(4, 10, TERRAIN_TYPES.CLIFF); // Row 4, Col 10
game.grid.setTerrainType(5, 10, TERRAIN_TYPES.CLIFF); // Row 5, Col 10
// Creates a 2-tile vertical cliff wall
```

## Strategic Implications

### For Players:
- **Plan Tower Placement**: Consider cliff positions before building
- **Use Cliffs Strategically**: Create chokepoints or protect weak spots
- **Adapt Quickly**: Each unlocked row has different cliff patterns

### For Enemies:
- **Longer Paths**: Cliffs force enemies to take detours
- **Safe Zones**: Enemies behind cliffs cannot be targeted
- **Ambush Opportunities**: Enemies emerge from behind cliffs unexpectedly

## Future Enhancements

1. **Cliff Clusters**: Place cliffs in groups for bigger obstacles
2. **Themed Levels**: Different cliff frequencies per level
3. **Cliff Types**: Tall cliffs (block all) vs short cliffs (block ground only, flying enemies ignore)
4. **Destructible Cliffs**: Towers or abilities that clear cliffs
5. **Visual Particles**: Dust/debris when projectiles hit cliffs

## Testing the System

### Current Status (Phase 1 Complete):
✅ Cliff terrain type defined
✅ Gray visual rendering with 3D shading
✅ Line-of-sight algorithm implemented
✅ **Perlin noise clustering** for natural cliff formations
✅ **Progressive difficulty** - more cliffs each unlock
✅ Cliff tiles block building
✅ Cliff tiles block enemy pathfinding

### Next Steps (Phase 2):
- [ ] Integrate `hasLineOfSight()` into Tower targeting (for ranged attacks)
- [ ] Add projectile cliff collision (optional visual polish)
- [ ] Fine-tune noise scale and threshold based on playtesting

### How to Observe Perlin Noise Clustering:
1. Unlock multiple rows (200g each)
2. Watch console logs: "Row X unlocked: Y cliffs (threshold: Z, unlock #N, pair P)"
3. **First pair (unlocks 1-2)**: Very few cliffs (~1-3 per row, threshold 0.80)
4. **Second pair (unlocks 3-4)**: More cliffs (~2-4 per row, threshold 0.75)
5. **Later pairs**: Progressively denser (~4-8 per row, threshold decreases)
6. **Paired rows have similar cliff counts** (top and bottom balance)
7. Observe natural clustering (not random individual tiles)

**Example Console Output:**
```
Row 3 unlocked: 2 cliffs (threshold: 0.80, unlock #3, pair 0)
Row 6 unlocked: 3 cliffs (threshold: 0.80, unlock #4, pair 0)  ← Same pair, similar count
Row 2 unlocked: 4 cliffs (threshold: 0.75, unlock #5, pair 1)
Row 7 unlocked: 4 cliffs (threshold: 0.75, unlock #6, pair 1)  ← Same pair, similar count
```

## Example Scenario

```
Player unlocks Row 3:
→ 2 cliffs appear randomly at (3,7) and (3,12)

Player places Gunner at (3,5):
→ Can target enemies at (3,6) - no cliffs in way
→ CANNOT target enemies at (3,8) - cliff at (3,7) blocks line of sight

Enemy spawns at (3,0):
→ Paths around cliff at (3,7)
→ Takes longer route to base
→ Gunner gets more shots while enemy navigates
```

---

## Summary

The **Cliff Barrier System** adds **tactical depth** through:
1. **Random obstacles** that change each playthrough
2. **Line-of-sight blocking** that forces strategic tower placement
3. **Enemy pathing complexity** that creates longer engagement windows

All without overwhelming the player - cliffs are simple, visual, and intuitive!
