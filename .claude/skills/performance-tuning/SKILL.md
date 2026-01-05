---
name: performance-tuning
description: Analyzes and optimizes p5.js game performance including FPS drops, particle limits, off-screen culling, object pooling, and memory usage. Use when checking performance, experiencing lag, frame stuttering, or when optimizing for late-game waves with hundreds of entities.
allowed-tools: Read, Grep
---

# Performance Tuning Workflow

## Reference Documentation

Complete optimization guide: @~PERFORMANCE_OPTIMIZATIONS.md

## Performance Targets

**Acceptable Performance:**
- **Wave 1-10:** 60 FPS (ideal)
- **Wave 15:** 55-60 FPS
- **Wave 20+:** 50-55 FPS
- **Wave 30+ (stress test):** 40-45 FPS

**Entity Limits:**
- Particles: < 500 active (hard cap)
- Enemies: < 100 simultaneous
- Projectiles: < 200
- GC pauses: < 10ms

## Quick Performance Check

### 1. Check Debug Overlay (Top-Left)

Look for:
```
FPS: 45 ← Should be 50+
Enemies: 85
Towers: 15
Particles: 523 ← PROBLEM: Over 500 limit
Projectiles: 47
```

### 2. Identify Bottleneck

**High particle count (>500)?**
→ Check ObjectManager.js:90-131 (particle pooling)
→ Verify MAX_PARTICLES cap in GameConstants.js

**High enemy count (>100)?**
→ Check WaveManager.js staggered spawning
→ Verify off-screen culling working

**FPS drops during tower placement?**
→ Check BufferTower network recalculation (should be event-driven)

**Memory climbing?**
→ Check for inactive entities not being removed
→ Verify particle pooling reusing objects

## Key Optimizations

### 1. Object Pooling (ObjectManager.js:90-131)

**What it does:** Pre-allocate 600 particle objects, reuse instead of creating new ones

**How to verify:**
```javascript
// Check particle pool in console:
console.log("Pool size:", game.objectManager.particlePool.length);
console.log("Active particles:", game.objectManager.particles.length);

// Pool should shrink when particles spawn, refill when they die
```

**Tuning:**
```javascript
// GameConstants.js
PARTICLE_POOL_SIZE: 600,  // Pre-allocated objects
MAX_PARTICLES: 500,       // Active limit
```

**Impact:** ~60% reduction in GC pauses during combat

---

### 2. MAX_PARTICLES Cap (ObjectManager.js)

**What it does:** Hard limit prevents particle explosion lag

**How it works:**
```javascript
if (this.particles.length >= MAX_PARTICLES) {
    this.particles.shift(); // Remove oldest (FIFO)
}
```

**Tuning:**
- **Low-end devices:** 300 particles
- **Default:** 500 particles
- **High-end:** 800 particles

**Impact:** Caps worst-case rendering cost

---

### 3. Off-Screen Culling (Game.js:172-208)

**What it does:** Only draw entities inside viewport + margin

**How to verify:**
```javascript
// Game.js - Add logging in draw()
let visibleEnemies = enemies.filter(e =>
    e.x >= visibleLeft && e.x <= visibleRight &&
    e.y >= visibleTop && e.y <= visibleBottom
);
console.log(`Drawing ${visibleEnemies.length}/${enemies.length} enemies`);
```

**Tuning:**
```javascript
// GameConstants.js
OFFSCREEN_CULL_MARGIN: 100, // Pixels outside viewport to render

// Lower = better performance, risk of pop-in
// Higher = smoother entry/exit, more draw calls
```

**Impact:** ~30-50% reduction in draw calls

---

### 4. BufferTower Network Optimization (Tower.js, TowerManager.js)

**What it does:** Only recalculate networks when towers placed/sold (not every 30 frames)

**Old behavior (wasteful):**
```javascript
// Every 30 frames for EVERY BufferTower
if (frameCount % 30 === 0) {
    this.calculateNetwork(); // 5 buffers = 10 BFS/second
}
```

**New behavior (event-driven):**
```javascript
// TowerManager.js:174-186
// Only when tower placed or sold
TowerManager.recalculateBufferNetworks();
```

**Impact:** ~80% reduction in BufferTower CPU usage

---

## Performance Tuning Guide

### For Low-End Devices

Edit `src/constants/GameConstants.js`:

```javascript
PERFORMANCE_CONSTANTS = {
    MAX_PARTICLES: 300,          // Reduce particles
    PARTICLE_POOL_SIZE: 360,     // 20% larger than MAX
    OFFSCREEN_CULL_MARGIN: 50,   // Aggressive culling
    MAX_PROJECTILES: 150         // Fewer projectiles
}
```

### For High-End Devices

```javascript
PERFORMANCE_CONSTANTS = {
    MAX_PARTICLES: 800,          // More visual impact
    PARTICLE_POOL_SIZE: 960,
    OFFSCREEN_CULL_MARGIN: 200,  // Generous margin
    MAX_PROJECTILES: 300
}
```

### Quality vs Performance Trade-offs

| Setting | Lower Value | Higher Value |
|---------|-------------|--------------|
| MAX_PARTICLES | Better FPS | More visual impact |
| PARTICLE_POOL_SIZE | Less memory | Fewer GC pauses |
| OFFSCREEN_CULL_MARGIN | Better perf | No pop-in |

---

## Testing Procedures

### 1. Particle Stress Test

```
1. Spawn 50 enemies in tight group
2. Kill simultaneously with Pyromancer AOE
3. Check FPS doesn't drop below 50
4. Verify particle count caps at MAX_PARTICLES
```

### 2. BufferTower Test

```
1. Place 10 BufferTowers in connected network
2. Add/remove towers rapidly
3. Verify no frame stutters
4. Check recalculation only happens on placement
```

### 3. Culling Test

```
1. Spawn 100 enemies across map
2. Scroll/pan camera
3. Verify off-screen enemies don't render
4. Check no visual pop-in when entering screen
```

### 4. Memory Leak Test

```
1. Play to wave 30+
2. Open F12 → Performance → Record
3. Check memory usage plateaus (doesn't climb indefinitely)
4. Verify GC pauses < 10ms
```

---

## Chrome DevTools Profiling

**To identify bottlenecks:**

1. Press F12 → Performance tab
2. Click Record (red circle)
3. Play game through wave 15+
4. Stop recording after 10 seconds
5. Look for:
   - **Long frames** (yellow bars > 16ms)
   - **GC pauses** (gray bars)
   - **Function calls** consuming most time

**Common culprits:**
- `draw()` - Too many draw calls
- `update()` - Too many entities
- `calculateNetwork()` - BufferTower BFS
- Particle creation - Should be using pool

---

## Future Optimization Ideas

If performance is still insufficient:

### 1. Spatial Partitioning
- Use quadtree for collision detection
- Current: O(n²), Optimized: O(n log n)
- Most impactful for 200+ enemies

### 2. Batch Rendering
- Draw all particles in single draw call
- Requires p5.js vertex buffer or WebGL mode

### 3. Level of Detail (LOD)
- Skip animation frames when many enemies on screen
- Reduce visual quality dynamically based on FPS

### 4. Web Workers
- Offload pathfinding to background thread
- Prevents BFS from blocking main thread

### 5. Projectile Pooling
- Same technique as particles
- Less impactful (fewer projectiles than particles)

---

## Key Files

- **GameConstants.js** - All tunable performance values
- **ObjectManager.js:90-131** - Particle pooling implementation
- **Game.js:172-208** - Off-screen culling logic
- **TowerManager.js:174-186** - BufferTower network recalculation
- **PERFORMANCE_OPTIMIZATIONS.md** - Complete optimization documentation

## Output Format

When analyzing performance:

1. **Current FPS** - From debug overlay
2. **Entity Counts** - Particles, enemies, projectiles
3. **Identified Bottleneck** - What's causing lag
4. **Recommended Fix** - Specific code changes or tuning
5. **Expected Impact** - FPS improvement estimate
6. **Testing Steps** - How to verify fix worked

Always reference PERFORMANCE_OPTIMIZATIONS.md for detailed explanations!
