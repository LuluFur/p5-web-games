# Terrain Mechanics Design

## Overview
Terrain-based mechanics add strategic depth by creating **buildable restrictions**, **enemy behavior modifiers**, and **environmental synergies**. Different tile types force players to adapt tower placement and composition, preventing "solved" optimal strategies.

## Research Foundation

### Industry Insights
- **Terrain in Tower Defense**: Maps with ocean features allow underwater tower installation; cliffs create natural chokepoints
- **Strategic Depth**: Terrain obstacles make it difficult to use tower range properly, forcing thoughtful placement
- **Flying Units**: Bypass terrain entirely, creating counter-play requirements
- **High Ground Advantage**: Towers on elevated positions gain range bonuses (ancient warfare principle applied to TD)

### Design Goals
1. **Meaningful Constraints**: Terrain should create interesting problems, not frustrating limitations
2. **Visual Clarity**: Players must instantly understand terrain effects (color coding, tooltips)
3. **Strategic Trade-offs**: Each terrain type offers advantages and disadvantages
4. **Counter-Play**: Every restriction has a tower/strategy that overcomes it

## Core Terrain Types

### 1. Standard Grass (Baseline)
**Visual**: Green grass texture (current default)
**Building Rules**: All towers can be placed
**Enemy Behavior**: Normal movement speed
**Special Effects**: None

**Design Purpose**: Neutral baseline for comparison

---

### 2. Water Tiles
**Visual**: Blue-green animated water, gentle ripple effects, occasional bubbles
**Introduced**: Level 2 (Marshlands)

#### Building Rules
- **Standard Towers**: CANNOT be placed (placement UI shows red X)
- **Amphibious Towers**: CAN be placed (see Tower Variants below)
- **Bridge Towers** (Future): Special tower that converts water → buildable land

#### Enemy Behavior
- **Land Enemies**: Path around water (A* treats as unwalkable)
- **Aquatic Enemies**: Walk through water at normal speed (see WaterEnemies.md)
- **Flying Enemies**: Ignore water (fly over)

#### Tower Modifiers
- **Amphibious Towers on Water**:
  - -10% range penalty (water surface interference)
  - +15% attack speed (water cooling for gunners)
  - Special VFX: Water splash particles on firing

#### Strategic Implications
- **Path Manipulation**: Water forces enemies into predictable routes
- **Defensive Walls**: Create water "moats" around key positions
- **Tower Specialization**: Requires investing in amphibious variants
- **Trade-offs**: Amphibious towers sacrifice range for positioning flexibility

#### Visual Feedback
- **Hover Tooltip**: "Water: Only Amphibious towers"
- **Placement Preview**: Standard towers show red X + "Cannot build on water"
- **Water Effects**: Animated ripples, reflections of nearby towers

#### Technical Implementation
```javascript
// In Grid.js
const TERRAIN_TYPES = {
    GRASS: 0,
    WATER: 1,
    CLIFF: 2,
    ICE: 3,
    LAVA: 4,
};

class Grid {
    constructor() {
        this.terrain = []; // 2D array of TERRAIN_TYPES
    }

    canPlaceTower(row, col, towerType) {
        const terrain = this.terrain[row][col];

        if (terrain === TERRAIN_TYPES.WATER) {
            return towerType.isAmphibious; // Only amphibious towers
        }
        if (terrain === TERRAIN_TYPES.CLIFF) {
            return towerType.isLongRange; // Only long-range towers
        }
        return true; // Grass allows all
    }
}
```

---

### 3. Cliff Tiles
**Visual**: Dark gray rocky texture, shadowed edges, vertical elevation appearance
**Introduced**: Level 3 (Mountain Pass)

#### Building Rules
- **Short-Range Towers** (Pyro, Buffer, Gunner): CANNOT be placed
- **Long-Range Towers** (Sniper, Storm Mage, Ranger): CAN be placed
- **Special Bonus**: Towers on cliffs gain +1 range ("high ground advantage")

#### Enemy Behavior
- **Land Enemies**: Cannot path through cliffs (A* treats as unwalkable)
- **Flying Enemies**: Ignore cliffs (fly over)
- **Climbing Enemies** (Future): Special enemy type that can scale cliffs slowly

#### Tower Modifiers
- **Range Bonus**: +1 cell range when placed on cliff
- **Visual Height**: Towers rendered with slight elevation offset (pseudo-3D)
- **Targeting Priority**: Cliffs provide vision over obstacles

#### Strategic Implications
- **Sniper Nests**: Cliffs create ideal positions for long-range towers
- **Natural Chokepoints**: Cliff formations funnel enemies into killzones
- **Specialization Required**: Must bring long-range towers for cliff maps
- **Flying Counters**: Cliff maps introduce flying enemies as counter-balance

#### Visual Feedback
- **Hover Tooltip**: "Cliff: Long-range towers only (+1 range)"
- **Placement Preview**: Short-range towers show red X + "Cannot build on cliff"
- **Elevation VFX**: Towers on cliffs have subtle shadow beneath them

---

### 4. Ice Patches
**Visual**: Transparent blue-white ice, crystalline sparkles, reflective surface
**Introduced**: Level 4 (Frozen Wastes)

#### Building Rules
- **All Towers**: CAN be placed on ice
- **No Restrictions**: Unlike water/cliffs, ice is universally buildable

#### Enemy Behavior
- **Speed Modifier**: +40% movement speed (enemies slip-slide)
- **Visual Effect**: Enemies leave ice trail particles, sliding animation
- **Ice-Resistant Enemies**: Wolves, Frost Wraiths ignore speed buff

#### Tower Modifiers
- **Projectile Range**: +20% projectile travel distance (ice deflection physics)
- **Visual Effect**: Projectiles leave icy trail, blue tint
- **No Attack Speed Change**: Ice doesn't affect tower firing

#### Strategic Implications
- **High-Risk Zones**: Fast enemies become extremely dangerous on ice
- **Slowing Synergy**: Ice + slow towers = balanced enemy speed
- **Range Extension**: Use ice for extended coverage
- **Positional Puzzle**: Choose between safe grass or risky ice for better range

#### Dynamic Hazard: Blizzard Zones
- **Trigger**: Every 3 waves, blizzard affects 30% of random tiles
- **Duration**: Lasts entire wave
- **Effect on Towers in Blizzard**:
  - -30% attack speed (visibility penalty)
  - +20% range (clear long-distance shots)
  - Visual: Heavy snow particles obscure towers
- **Effect on Enemies**:
  - -20% movement speed (fighting against wind)

#### Visual Feedback
- **Hover Tooltip**: "Ice: Enemies +40% speed, projectiles +20% range"
- **Speed Indicator**: Fast enemies show "speed up" particle trail on ice
- **Blizzard Warning**: "Blizzard approaching!" + 5 second countdown

---

### 5. Lava Rivers
**Visual**: Glowing orange-red lava, bubbling animation, heat shimmer effect
**Introduced**: Level 5 (Volcanic Crater)

#### Building Rules
- **Standard Towers**: CANNOT be placed
- **Fire-Immune Towers**: CAN be placed (upgraded variants)
- **Heat-Resistant** (Future): Special tower upgrade path unlocked in Level 5

#### Enemy Behavior
- **Non-Fire Enemies**: Take 5 DPS (damage per second) walking through lava
- **Fire Enemies** (Fire Demons): HEAL 10 HP/sec in lava
- **Path Preference**: Fire enemies prioritize lava paths

#### Tower Modifiers
- **Fire Towers on Lava**: +30% damage (heat synergy)
- **Non-Fire Towers**: -20% fire rate (heat malfunction)
- **Visual Effect**: Towers glow red-hot, heat shimmer particles

#### Environmental Hazard: Volcanic Vents
- **Placement**: 5 fixed vent positions per map
- **Passive**: Erupt every 90 seconds, dealing 200 AOE damage
- **Active Control**: Pyromancer towers adjacent to vents can trigger eruptions (60s cooldown)
- **Visual**: Dramatic fire column, screen shake, enemy knockback

#### Strategic Implications
- **Environmental Damage**: Lava passively damages enemies (10-20% of their HP)
- **Fire Enemy Counters**: Must block fire enemies from reaching lava
- **Vent Positioning**: Risk/reward for building near vents
- **Tower Upgrades**: Level 5 introduces fire-immunity upgrades

#### Visual Feedback
- **Hover Tooltip**: "Lava: Non-fire enemies take 5 DPS | Fire enemies HEAL 10 HP/s"
- **Damage Numbers**: Floating red "-5" damage ticks on enemies in lava
- **Vent Countdown**: "Eruption in 15s" timer above vents

---

## Tower Variants for Terrain

### Amphibious Towers (Water-Capable)
These towers can be placed on both grass and water tiles.

#### Amphibious Gunner (100g) [+25g premium]
- **Base Stats**: Same as Gunner
- **Water Bonus**: +15% attack speed on water
- **Water Penalty**: -10% range on water
- **Visual**: Green uniform + flotation device, anchored platform

#### Amphibious Ranger (175g) [+25g premium]
- **Base Stats**: Same as Ranger
- **Water Bonus**: +15% attack speed on water
- **Water Penalty**: -10% range on water
- **Visual**: Blue uniform + harpoon rifle, buoy platform

#### Amphibious Sniper (275g) [+25g premium]
- **Base Stats**: Same as Sniper
- **Water Bonus**: +10% damage (steady water platform)
- **Water Penalty**: -15% range (water refraction)
- **Visual**: Purple uniform + waterproof camo, stilted platform

**Design Note**: Amphibious variants cost 25g more but provide strategic flexibility. Players trade economy for positioning options.

### Fire-Immune Towers (Lava-Capable)
Introduced in Level 5, these towers can be placed on lava tiles.

#### Fire-Immune Gunner (100g) [+25g premium]
- **Base Stats**: Same as Gunner
- **Lava Bonus**: +20% damage (superheated rounds)
- **Lava Penalty**: -15% fire rate (heat stress)
- **Visual**: Heat-resistant armor, glowing barrel

#### Volcanic Pyromancer (225g) [+25g premium]
- **Base Stats**: Enhanced Pyromancer
- **Lava Bonus**: +40% damage, +1 range (lava empowerment)
- **Lava Penalty**: None (fire synergy)
- **Visual**: Molten rock armor, lava staff

**Design Note**: Fire-immune variants only available in Level 5+. Players must adapt to new tower types for volcanic terrain.

---

## Terrain Generation System

### Level-Specific Terrain Layouts
Each level has a **hand-crafted** terrain layout (not procedural) to ensure balanced strategic challenge.

#### Example: Level 2 (Marshlands) Terrain Layout
```
Legend: . = Grass, ~ = Water, S = Spawn, B = Base

Row  0: . . . S S S . . . . . . . . . . . . . .
Row  1: . . . . . . . . ~ ~ ~ . . . . . . . . .
Row  2: . . . . . . ~ ~ ~ ~ ~ ~ . . . . . . . .
Row  3: . . . . . . ~ ~ ~ ~ ~ ~ . . . . . . . .
Row  4: . . . . . . . ~ ~ ~ . . . . . . . . . .
Row  5: . . . . . . . . . . . . . . . . . . . .
Row  6: . . . . . . . . . . . . ~ ~ ~ . . . . .
Row  7: . . . . . . . . . . ~ ~ ~ ~ ~ . . . . .
Row  8: . . . . . . . . . . ~ ~ ~ ~ ~ . . . . .
Row  9: . . . . . . . . . . . . . ~ ~ . . . . .
Row 10: . . . . . . . . . . . . . . . . . . B B
Row 11: . . . . . . . . . . . . . . . . . . B B
```

**Design Analysis**:
- Water pools force 2-3 distinct enemy paths
- Central water creates natural chokepoint (rows 2-4)
- Bottom water (rows 6-9) requires amphibious towers or accepts longer enemy path
- Spawn and base zones remain clear (no terrain obstacles)

### Terrain Data Structure
```javascript
// In src/data/LevelData.js
const LEVEL_TERRAIN = {
    MARSHLANDS: {
        rows: 12,
        cols: 20,
        terrain: [
            // 2D array where each cell is TERRAIN_TYPES enum
            [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0], // Row 0
            [0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0], // Row 1
            // ... etc
        ],
        waterPercentage: 0.30, // 30% water tiles
        enemySpawnPoints: [
            { row: 0, col: 3 }, // Top-left spawn
            { row: 5, col: 0 }, // Mid-left spawn
            { row: 10, col: 0 }, // Bottom-left spawn
        ],
    },

    MOUNTAIN_PASS: {
        rows: 10,
        cols: 22,
        terrain: [
            // Cliffs create narrow 3-tile chokepoints
        ],
        cliffPercentage: 0.25,
    },
};
```

---

## Pathfinding Integration

### Terrain-Aware A* Algorithm
Current pathfinding (Pathfinder.js) must be extended to handle terrain:

```javascript
// In Pathfinder.js
class Pathfinder {
    findPath(start, end, grid, enemyType) {
        // ... existing A* logic

        // NEW: Check terrain walkability
        const terrain = grid.getTerrainType(neighbor.row, neighbor.col);

        if (!enemyType.canWalkOnTerrain(terrain)) {
            continue; // Skip unwalkable terrain
        }

        // NEW: Apply terrain cost modifiers
        const terrainCost = this.getTerrainCost(terrain, enemyType);
        neighbor.g = current.g + 1 + terrainCost;

        // ... rest of A* logic
    }

    getTerrainCost(terrain, enemyType) {
        if (terrain === TERRAIN_TYPES.WATER && !enemyType.isAquatic) {
            return Infinity; // Unwalkable
        }
        if (terrain === TERRAIN_TYPES.ICE) {
            return 0.5; // Prefer ice (faster movement)
        }
        if (terrain === TERRAIN_TYPES.LAVA && enemyType.isFireType) {
            return -0.5; // Fire enemies prefer lava (healing)
        }
        return 0; // Normal cost
    }
}
```

### Multi-Path Handling with Terrain
Water and cliffs can create **multiple distinct paths**:
- **Path 1**: Top route (around top water pool)
- **Path 2**: Middle route (through chokepoint)
- **Path 3**: Bottom route (around bottom water pool)

Enemies should **distribute across paths** to prevent all enemies funneling into one chokepoint.

---

## Visual Design System

### Terrain Color Palette
- **Grass**: #5C8F3D (vibrant green)
- **Water**: #4A90A4 (blue-green), animated with lighter #6DB3C7 ripples
- **Cliff**: #666666 (gray stone), shaded edges #444444
- **Ice**: #C7E8F5 (pale blue), sparkles #FFFFFF
- **Lava**: #FF6B35 (orange-red), brighter bubbles #FFD700

### Animation System
- **Water**: 4-frame ripple animation (15 fps)
- **Ice**: Static texture + particle sparkles (30/sec)
- **Lava**: 6-frame bubble animation (20 fps) + heat shimmer distortion
- **Cliffs**: Static texture + shadow gradients

### Hover Tooltips
When player hovers over terrain tile:
```
[Terrain Icon] Water
• Only Amphibious towers can build
• Land enemies path around
• Aquatic enemies move normally
```

### Placement Preview
When attempting to place tower on restricted terrain:
```
[Red X Icon] Cannot Build
Gunner cannot be placed on Water
Try: Amphibious Gunner
```

---

## Balancing Guidelines

### Terrain Coverage Percentages
- **Water**: 20-35% of map (force adaptations without overwhelming)
- **Cliffs**: 20-30% of map (create chokepoints)
- **Ice**: 15-25% of map (dynamic hazard zones)
- **Lava**: 30-40% of map (final level challenge)

### Enemy Path Length
Terrain should increase average path length by:
- **Water**: +20-30% path length (navigation around)
- **Cliffs**: +15-25% path length (chokepoint funneling)
- **Ice**: No change (walkable)
- **Lava**: +10% path length (fire enemies prefer lava routes)

### Tower Variant Pricing
- **Amphibious Variant**: +25g (+33% cost premium for flexibility)
- **Fire-Immune Variant**: +25g (+25-33% cost premium)
- **Cliff-Capable (Long-Range)**: No premium (baseline towers)

**Rationale**: Terrain-adapted towers cost more but unlock strategic positions. Players trade economy for tactical flexibility.

### Difficulty Scaling
- **Level 2** (First Terrain): Water coverage 25% (gentle introduction)
- **Level 3** (Second Terrain): Cliff coverage 25% (moderate challenge)
- **Level 4** (Complex Terrain): Ice 20% + dynamic blizzards (high complexity)
- **Level 5** (Maximum Terrain): Lava 35% + volcanic vents (peak challenge)

---

## Player Psychology & Learning Curve

### First-Time Terrain Introduction
When player encounters new terrain type:
1. **Pre-Wave Dialogue**: "Commander, the terrain ahead is treacherous. Water blocks standard towers—use Amphibious units!"
2. **Visual Highlight**: New terrain tiles glow/pulse for 5 seconds
3. **Tutorial Prompt**: "Try placing an Amphibious Gunner on the water"
4. **Hover Tooltips**: Always available for reference

### Failure Recovery
If player blocks all paths with water/cliffs:
- **Pathfinding Error**: "No valid path to base! Remove some towers or adjust placements."
- **Suggestion**: "Enemies need at least one route—terrain blocks some paths naturally."

### Mastery Indicators
- **3-Star Completion**: Player used terrain advantages optimally (e.g., cliff range bonuses)
- **Efficient Gold Usage**: Minimal amphibious towers (used terrain strategically)
- **Fast Clear Time**: Exploited chokepoints and environmental damage

---

## Technical Implementation Checklist

### Phase 1: Core Terrain System
- [ ] Add `terrain` 2D array to Grid.js
- [ ] Create `TERRAIN_TYPES` enum in GameConstants.js
- [ ] Update Grid rendering to draw terrain textures
- [ ] Implement terrain-based placement validation in TowerManager.js

### Phase 2: Pathfinding Integration
- [ ] Extend Pathfinder.js to handle terrain walkability
- [ ] Implement terrain cost modifiers for A* algorithm
- [ ] Add multi-path generation for terrain-divided maps
- [ ] Test path blocking prevention (ensure 1+ valid path always exists)

### Phase 3: Tower Variants
- [ ] Create Amphibious tower subclasses (AmphibiousGunner, etc.)
- [ ] Add terrain modifier logic to Tower.js (range/damage/fireRate adjustments)
- [ ] Implement fire-immune tower variants
- [ ] Update UI to show tower variants in build menu

### Phase 4: Enemy Behavior
- [ ] Add terrain interaction to Enemy.js (ice speed, lava damage)
- [ ] Implement fire enemy lava healing
- [ ] Add visual effects (ice trails, lava damage numbers)
- [ ] Create aquatic enemy types (see WaterEnemies.md)

### Phase 5: Environmental Hazards
- [ ] Implement Blizzard Zone system (Level 4)
- [ ] Create Volcanic Vent mechanics (Level 5)
- [ ] Add hazard visual effects and warnings
- [ ] Integrate hazard timers into WaveManager

### Phase 6: Visual Polish
- [ ] Design and implement terrain textures
- [ ] Add terrain animations (water ripples, lava bubbles)
- [ ] Create hover tooltip system for terrain
- [ ] Implement placement preview error messages

---

## Summary

The Terrain Mechanics system introduces **strategic constraints and environmental synergies** that transform tower placement from a simple optimization puzzle into a dynamic tactical challenge. By introducing five distinct terrain types (Grass, Water, Cliffs, Ice, Lava), each with unique building restrictions and enemy behavior modifiers, the game forces players to:

1. **Adapt Tower Composition**: Invest in specialized tower variants (amphibious, fire-immune)
2. **Leverage Environmental Advantages**: Use cliffs for range bonuses, lava for passive damage
3. **Navigate Dynamic Hazards**: React to blizzards and volcanic eruptions
4. **Master Positioning Trade-offs**: Balance safety vs. coverage vs. economy

**Key Pillars**:
- **Meaningful Constraints**: Terrain creates problems with multiple solutions
- **Visual Clarity**: Instant recognition through color coding and tooltips
- **Strategic Depth**: Each level demands different terrain mastery
- **Fair Challenge**: No "trap" terrain placements—always solvable with proper strategy

**Next Steps**: See `WaterEnemies.md` for aquatic enemy designs that interact with water terrain, and `LevelProgressionSystem.md` for how terrain integrates into the campaign structure.
