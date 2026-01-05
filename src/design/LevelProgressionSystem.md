# Multi-Level Progression System Design

## Overview
Transform Merge Defence from a single-map experience into a campaign-driven game with multiple distinct levels. Each level introduces new tactical challenges through terrain variation, enemy compositions, and progressive difficulty scaling.

## Research Foundation

### Key Insights from Tower Defense Analysis
- **Flow State Maintenance**: Players enjoy progression through new towers, enemies, and map layouts while maintaining a balanced difficulty curve
- **Meaningful Variety**: Multiple maps with difficulty modes and unlockables create sustained engagement
- **Challenge vs. Fairness**: Games like Kingdom Rush succeed through "challenging yet fair difficulty curves"
- **Focus Optimization**: Scrolling maps can shatter player focus; fixed-viewport levels maintain strategic clarity

### Player Psychology
- **Sense of Progression**: Advancing through distinct levels creates stronger satisfaction than endless waves
- **Perceived Control**: Multiple paths to victory (different tower strategies per level) increases engagement
- **Active Gameplay**: Level-specific mechanics prevent passive "set and forget" strategies

## Core Design Philosophy

### Campaign Structure: The Journey Metaphor
Rather than defending a single location, the player is **conducting a strategic retreat** across multiple defensive positions as the undead horde advances. Each level represents a new fallback point with unique tactical advantages and challenges.

**Narrative Hook**: "The Dead March Ever Forward - How Long Can You Hold?"

### Level Progression Model
```
Campaign Map (Overworld)
    ↓
Level 1: The Grasslands (Tutorial) → Unlock Level 2
    ↓
Level 2: The Marshlands → Unlock Level 3
    ↓
Level 3: The Mountain Pass → Unlock Level 4
    ↓
Level 4: The Frozen Wastes → Unlock Level 5
    ↓
Level 5: The Volcanic Crater (Final Stand) → Endless Mode
    ↓
Endless Mode (Infinite Waves, Leaderboard)
```

## Level Design Framework

### Core Principles
1. **Tactical Variety**: Each level must demand different tower compositions
2. **Visual Distinction**: Clear aesthetic differentiation (grass → swamp → mountain → snow → lava)
3. **Mechanical Novelty**: New terrain types introduce strategic depth without overwhelming complexity
4. **Progressive Difficulty**: Each level increases base enemy stats by 15-20%
5. **Replayability**: Star rating system (1-3 stars) based on lives remaining encourages mastery

### Level Completion Requirements
- **Survive 20 waves** (Level 1-4)
- **Defeat the Boss Wave** (Wave 20)
- **Minimum Lives**: Must finish with ≥1 life

### Star Rating System
```javascript
// Lives remaining determines star rating
if (lives >= 18): 3 Stars (Gold) - Unlock Hard Mode
if (lives >= 10): 2 Stars (Silver) - Unlock Next Level
if (lives >= 1):  1 Star (Bronze) - Unlock Next Level
if (lives <= 0):  0 Stars (Defeat) - Retry
```

### Difficulty Modes (Per Level)
- **Normal Mode**: Default experience (unlocked by default for Level 1)
- **Hard Mode**: +30% enemy HP, +20% spawn speed, -25% starting gold (unlocked by 3-starring Normal)
- **Nightmare Mode**: +60% enemy HP, +40% spawn speed, -50% starting gold, boss appears Wave 15 (unlocked by 3-starring Hard)

## Individual Level Designs

### Level 1: The Grasslands
**Theme**: "Last Stand at the Green Fields"
**Environment**: Lush grass, gentle hills, scattered trees (current game aesthetic)
**Terrain Features**: Standard buildable tiles, no obstacles
**Enemy Focus**: Core enemies (Zombie, Vampire, Skeleton) with basic stats
**Unlock**: Available from start
**Tutorial**: Full tutorial system (active)
**Grid Size**: 10×20 with progressive row unlocking
**Boss**: Necromancer (Wave 20)

**Design Goal**: Teach core mechanics in a forgiving environment

---

### Level 2: The Marshlands
**Theme**: "Defense at the Murky Delta"
**Environment**: Dark green/brown swamp, fog effects, dead trees
**Grid Size**: 12×20 (2 more rows than Level 1)

#### Terrain Features
- **Water Tiles** (30% of grid):
  - **Appearance**: Blue-green murky water, animated ripples
  - **Building Restrictions**:
    - Standard towers: CANNOT be placed
    - Amphibious towers: CAN be placed (new tower type)
  - **Path Behavior**: Enemies path around water (increases path complexity)
  - **Visual**: Water pools force players to create "bridges" with their tower lines

- **Buildable Land**: Standard grass tiles

#### New Mechanics Introduced
1. **Amphibious Towers**: Towers that can be built on water (see Terrain Mechanics doc)
2. **Water Pathing**: Enemies navigate around water, creating longer, more complex paths
3. **Fog of War** (Optional): Sections of map shrouded until revealed by towers

#### Enemy Composition
- **New Enemy**: Swamp Wraiths (faster on water tiles)
- **Increased Variety**: More Wraiths, Goblins (speed enemies)
- **Water Spawn Points**: Some enemies spawn from water edges

**Design Goal**: Force players to adapt tower placement strategies around obstacles

---

### Level 3: The Mountain Pass
**Theme**: "Chokepoint at the Stone Gates"
**Environment**: Gray stone, rocky cliffs, narrow passages
**Grid Size**: 10×22 (narrower but longer)

#### Terrain Features
- **Cliff Tiles** (25% of grid):
  - **Appearance**: Tall rocky elevations, shaded darker
  - **Building Restrictions**:
    - Melee/short-range towers: CANNOT be placed
    - Long-range towers (Sniper, Storm Mage): CAN be placed
    - Provides +1 range bonus ("high ground advantage")
  - **Path Behavior**: Enemies cannot walk on cliffs (creates natural chokepoints)

- **Narrow Chokepoints**: 2-3 tile wide passages between cliffs

#### Strategic Elements
- **High Ground Advantage**: Cliffs give range bonus but limit tower types
- **Natural Funneling**: Cliff formations create natural chokepoints for AOE towers
- **Vertical Map Design**: Top and bottom paths separated by cliff walls

#### Enemy Composition
- **Flying Enemies** (New): Ignore cliff pathing, fly straight to base
- **Armored Enemies**: More Golems to test focused fire
- **Boss**: Mountain Golem (Massive HP, 70% armor)

**Design Goal**: Teach terrain advantage mechanics and counter flying units

---

### Level 4: The Frozen Wastes
**Theme**: "Desperate Defense in the Blizzard"
**Environment**: Snow-covered plains, ice formations, blizzard particles
**Grid Size**: 12×20

#### Terrain Features
- **Ice Patches** (20% of grid):
  - **Appearance**: Transparent blue-white ice, reflective surface
  - **Enemy Behavior**: Enemies move 40% faster on ice (slip-sliding)
  - **Tower Behavior**: Projectiles from towers on ice have 20% longer range (ice deflection)
  - **Building**: All towers can build on ice

- **Blizzard Zones** (Dynamic):
  - **Mechanic**: Every 3 waves, a blizzard sweeps across 30% of map
  - **Effect**: Towers in blizzard zone: -30% attack speed, +20% range (visibility penalty, but clear shots)
  - **Visual**: Swirling snow particles, reduced visibility

#### Strategic Elements
- **Speed Management**: Ice makes fast enemies extremely dangerous
- **Positioning Trade-offs**: Build in blizzard zone for range but lose attack speed
- **Dynamic Adaptation**: Blizzard zones shift, forcing strategic flexibility

#### Enemy Composition
- **Ice-Resistant Enemies**: Wolves, Frost Wraiths (immune to ice speed buff)
- **Boss**: Frost Dragon (Flying, summons ice walls)

**Design Goal**: Introduce dynamic environmental hazards that shift during gameplay

---

### Level 5: The Volcanic Crater
**Theme**: "Final Stand at the Hell's Gate"
**Environment**: Red-orange lava flows, volcanic rock, fire particles
**Grid Size**: 14×20 (largest grid)

#### Terrain Features
- **Lava Rivers** (35% of grid):
  - **Appearance**: Glowing orange-red lava, animated bubbling
  - **Building Restrictions**: Only Fire-Immune towers (new upgrade path)
  - **Enemy Behavior**: Non-fire enemies take 5 DPS walking through lava
  - **Fire Enemies**: Heal 10 HP/sec in lava

- **Volcanic Vents** (5 fixed positions):
  - **Mechanic**: Every 90 seconds, vents erupt dealing 200 AOE damage
  - **Tower Synergy**: Vents can be "activated" by Pyromancer towers for manual control
  - **Visual**: Dramatic fire eruption, screen shake

#### Strategic Elements
- **Environmental Damage**: Lava damages enemies passively
- **High Risk, High Reward**: Building near vents for control
- **Fire Enemy Countering**: Must prevent fire enemies from healing in lava

#### Enemy Composition
- **Fire Demons** (New): Heal in lava, resistant to fire towers
- **Mixed Hordes**: All previous enemy types at maximum stats
- **Boss**: Volcanic Titan (Massive AOE attacks, summons fire enemies)

**Design Goal**: Culmination of all mechanics, maximum challenge

---

## Campaign Overworld Design

### Visual Layout
```
[Campaign Map - Node-Based]

[Grasslands] → [Marshlands] → [Mountain Pass]
                                      ↓
                              [Frozen Wastes] → [Volcanic Crater]
                                                        ↓
                                                  [Endless Mode]
```

### Node Interaction
- **Locked Levels**: Grayed out, show "Complete [Previous Level] to unlock"
- **Available Levels**: Glowing, clickable
- **Completed Levels**: Show star rating (1-3 stars), "Replay" and "Hard Mode" buttons
- **Hover Info**: Shows best time, highest wave reached, star rating

### Persistent Progression (Optional Future Feature)
- **Meta-Upgrades**: Spend "Campaign Points" earned from stars to unlock permanent bonuses
  - Example: +5% starting gold (costs 10 stars)
  - Example: +1 starting life (costs 15 stars)
  - Example: Unlock new tower type (costs 20 stars)

## Technical Implementation Considerations

### New Systems Required
1. **LevelManager** (new manager):
   - Loads level-specific terrain data
   - Manages level completion state
   - Tracks star ratings and unlocks
   - Handles level transitions

2. **TerrainSystem** (new system):
   - Stores terrain type per grid cell
   - Applies terrain-specific rules to towers/enemies
   - Renders terrain visuals

3. **CampaignState** (new state):
   - New game state: CAMPAIGN (overworld map)
   - Tracks unlocked levels, star ratings
   - Handles level selection UI

4. **LevelData Structure**:
```javascript
const LEVEL_DATA = {
    GRASSLANDS: {
        id: 1,
        name: "The Grasslands",
        gridSize: { rows: 10, cols: 20 },
        terrain: [], // 2D array of terrain types
        enemies: ["zombie", "vampire", "skeleton"],
        bossWave: 20,
        startingGold: 200,
        unlockRequirement: null, // Available from start
    },
    MARSHLANDS: {
        id: 2,
        name: "The Marshlands",
        gridSize: { rows: 12, cols: 20 },
        terrain: [...], // Includes water tiles
        enemies: ["zombie", "vampire", "skeleton", "wraith", "swampWraith"],
        bossWave: 20,
        startingGold: 200,
        unlockRequirement: { level: 1, minStars: 2 },
    },
    // ... etc
};
```

### Data Storage (LocalStorage)
```javascript
// Save campaign progress
const campaignProgress = {
    currentLevel: 2,
    levelCompletions: {
        1: { stars: 3, bestTime: 1234, hardModeUnlocked: true },
        2: { stars: 2, bestTime: 1456, hardModeUnlocked: false },
    },
    totalStars: 5,
};
localStorage.setItem('systemDefenseCampaign', JSON.stringify(campaignProgress));
```

### File Structure Updates
```
src/
├── design/
│   ├── LevelProgressionSystem.md (this file)
│   ├── TerrainMechanics.md
│   └── WaterEnemies.md
├── managers/
│   ├── LevelManager.js (new)
│   └── TerrainManager.js (new)
├── data/
│   └── LevelData.js (new)
└── renderers/
    └── CampaignRenderer.js (new)
```

## Balancing Guidelines

### Difficulty Scaling Formula
```javascript
// Base enemy stats scale per level
function getEnemyStatsForLevel(baseStats, levelId) {
    const levelMultiplier = 1 + (levelId - 1) * 0.15; // 15% per level
    return {
        hp: baseStats.hp * levelMultiplier,
        speed: baseStats.speed * (1 + (levelId - 1) * 0.05), // 5% speed increase
        gold: baseStats.gold * levelMultiplier,
    };
}
```

### Star Rating Tuning
- **3 Stars**: Should require optimal tower placement and composition (aspirational)
- **2 Stars**: Should be achievable by competent players on first try
- **1 Star**: Should be achievable by struggling players with DDA assistance

### Wave Count Per Level
- **Levels 1-4**: 20 waves (scripted) + boss wave 20
- **Level 5**: 25 waves (longer final challenge)
- **Endless Mode**: Infinite procedural waves (post-Level 5 completion)

## Player Feedback & Communication

### Level Select Screen
- **Level Preview**: Shows minimap of terrain layout
- **Recommended Towers**: "Try Amphibious towers for water zones!"
- **Difficulty Indicator**: 1-5 skull rating
- **Completion Stats**: "Best: 3 Stars | Time: 12:34 | Wave: 20/20"

### In-Level Feedback
- **First-Time Tips**: "Watch out! Enemies move faster on ice!"
- **Terrain Tooltips**: Hover over water tile → "Water: Only Amphibious towers can build here"
- **Challenge Notifications**: "Blizzard approaching in 10 seconds!"

## Future Expansion Possibilities

### Daily Challenge Mode
- Random terrain generation with specific constraints
- Leaderboard for daily high scores
- Unique modifiers (e.g., "All towers cost 50% more")

### Level Editor
- Player-created levels with terrain painting
- Share levels via codes
- Community level voting

### Seasonal Events
- Halloween Level: Graveyard theme, undead spawn faster
- Christmas Level: Winter wonderland, enemies frozen periodically

## Success Metrics

### Player Engagement Goals
- **Completion Rate**: 60% of players complete Level 3
- **Replay Rate**: 40% of players replay levels for 3 stars
- **Session Length**: Average 25+ minutes (vs. 15 minutes single-level)
- **Star Collection**: Average 2.2 stars per level completion

### Design Validation Questions
1. Does each level feel tactically distinct?
2. Are terrain mechanics intuitive within 1-2 waves?
3. Does progression feel rewarding without feeling grindy?
4. Are Hard/Nightmare modes genuinely challenging or just stat inflation?

## Summary

The Multi-Level Progression System transforms System Defense from a single-map experience into a **campaign-driven strategic journey**. By introducing terrain variety (water, cliffs, ice, lava), environmental hazards (blizzards, volcanic vents), and progressive difficulty scaling, each level demands unique tower strategies while maintaining the core addictive gameplay loop.

**Key Pillars**:
1. **Tactical Variety**: Each level = new strategic puzzle
2. **Visual Progression**: Grass → Swamp → Mountain → Ice → Lava journey
3. **Replayability**: Star ratings and difficulty modes
4. **Fair Challenge**: DDA maintains flow state across skill levels

**Next Steps**: See `TerrainMechanics.md` for detailed terrain implementation and `WaterEnemies.md` for aquatic enemy designs.
