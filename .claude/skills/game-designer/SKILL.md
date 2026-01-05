---
name: game-designer
description: Provides game design advice for tower defense balance, enemy stats, tower abilities, progression curves, and difficulty tuning. Use when designing new enemies, towers, waves, or asking about game balance, difficulty, or player psychology.
allowed-tools: Read, Grep
---

# Game Design Consultant

## Reference Documentation

- **Design Document:** @~design_doc.md
- **Game Constants:** @~src/constants/GameConstants.js
- **Wave Config:** @~src/WaveConfig.js

## Tower Defense Design Principles

### 1. Strategic Depth

**Good tower defense games require:**
- **Positioning matters** - Placement affects effectiveness
- **Tower synergy** - Combinations are stronger than individuals
- **Resource scarcity** - Can't build everything
- **Meaningful choices** - Trade-offs between options

**Your game achieves this through:**
- Grid-based placement with path blocking validation
- BufferTower network effects
- Limited gold forcing prioritization
- 6 specialized towers with distinct roles

### 2. Difficulty Curve

**Wave Progression Structure:**

```
Waves 1-4:   Tutorial warmup (Zombies, basic Vampires)
Waves 5-8:   New enemy types introduced with dialogue
Waves 9-14:  Mixed hordes, elite enemies (Golem, Regenerator)
Waves 15-19: Endgame chaos, massive swarms
Wave 20:     Boss fight (Necromancer)
Wave 21+:    Infinite procedural generation
```

**Dynamic Difficulty Adjustment (DDA):**
```javascript
// WaveManager adjusts based on player health
if (lives < 10) {
    spawnInterval *= 1.15; // 15% slower spawns
    goldReward *= 1.25;    // 25% more gold
}
```

### 3. Tower Balance Framework

**Cost-to-Power Ratio:**

| Tower | Cost | DPS | Range | Role | Cost Efficiency |
|-------|------|-----|-------|------|----------------|
| Gunner | 75g | 0.625 | 3 | Balanced | 1.0x (baseline) |
| Ranger | 150g | 0.90 | 3.5 | Rapid fire | 0.72x |
| Sniper | 250g | 1.11 | 6 | Long range | 0.53x |
| Pyro | 200g | 1.33 | 2 | AOE | 0.80x |
| Storm | 300g | 0.48 | 3 | Chain | 0.19x |
| Buffer | 100g | 0 (support) | 0 | Force multiplier | Special |

**Calculation:**
```javascript
DPS = Damage / (FireRate / 60)
Cost Efficiency = (DPS / Cost) / (Gunner DPS / Gunner Cost)
```

**Balance Notes:**
- Storm Mage low DPS justified by chain lightning hitting 3 enemies
- Sniper low efficiency justified by massive range advantage
- Pyromancer high DPS offset by short range vulnerability

### 4. Enemy Design Philosophy

**Enemy Archetypes:**

**Swarm (Goblin, Wraith):**
- Low HP, high speed
- Force rapid-fire towers
- Punish slow, high-damage towers
- Create visual chaos and pressure

**Tank (Vampire, Golem, Ogre):**
- High HP, slow movement
- Force focus fire
- Waste rapid-fire tower ammo
- Give players breathing room but drain resources

**Specialist (Regenerator, Necromancer):**
- Unique mechanics
- Force specific counters
- Create memorable moments
- Add strategic depth

**Scaling Formula:**
```javascript
// Enemy HP scaling
baseHP + (wave × multiplier)

// Zombie: 50 + (wave × 8)
// Wave 1: 58 HP
// Wave 10: 130 HP
// Wave 20: 210 HP
```

---

## Balancing New Content

### Adding a New Tower

**Step 1: Define Role**

What unique purpose does this tower serve?
- Fills a gap in current roster
- Enables new strategies
- Counters specific enemy types

**Step 2: Determine Stats**

```javascript
// Use comparison table
// Example: "Frost Tower" - slowing specialist

cost: 175g          // Between Gunner (75) and Ranger (150)
range: 2.5          // Short (discourages spam)
damage: 0           // Support tower, no direct damage
fireRate: 15        // Very fast to apply slow
special: {
    slowPercent: 50,  // Halves enemy speed
    duration: 120     // 2 seconds
}

// Cost efficiency: 0 (support)
// Justification: Enables other towers to hit more, force multiplier
```

**Step 3: Counter-Play**

What weaknesses prevent this tower from being overpowered?
- Short range → vulnerable to early rushes
- No damage → requires other towers to be useful
- Expensive → delays economy

**Step 4: Playtest Scenarios**

Test against:
- Wave 5 (first challenge)
- Wave 15 (mixed horde)
- Wave 20 (boss)

### Adding a New Enemy

**Step 1: Identify Design Space**

What archetype?
- Swarm (cheap spam)
- Tank (HP sponge)
- Specialist (unique mechanic)

**Step 2: Define Mechanics**

```javascript
// Example: "Teleporter" enemy

speed: 1.2
hp: 80 + (wave × 6)
gold: 15g
special: {
    teleportDistance: 5,  // Skips 5 tiles
    teleportInterval: 180  // Every 3 seconds
}

// Threat: Bypasses chokepoints
// Counter: Long-range towers (Sniper)
// Weakness: Teleports are predictable (players adapt)
```

**Step 3: Sprite Requirements**

8-directional animations needed:
- walk (6 frames × 8 directions = 48 sprites)
- teleport-start (4 frames × 8 directions = 32 sprites)
- teleport-end (4 frames × 8 directions = 32 sprites)
- death (7 frames × 8 directions = 56 sprites)
- **Total:** 168 sprite frames

### Balancing Existing Content

**Identify Imbalance:**

**Too Weak (never used):**
- Check pick rate (if you had analytics)
- Ask: "Why would I build this over X?"
- Example: Storm Mage rarely used

**Too Strong (always used):**
- Check if players spam it
- Ask: "Can I beat the game with only this?"
- Example: Gunner spam early game

**Fix Storm Mage (currently weak):**

```javascript
// Current stats
damage: 12
fireRate: 25
chains: 2
chainDamage: 0.5 (50% per jump)

// Proposed buff
damage: 15           // +25% base damage
chainDamage: 0.6    // 60% per jump (was 50%)

// Justification: High cost (300g) not justified by damage
// Impact: 3-target hit = 15 + 9 + 5.4 = 29.4 total (was 24)
```

---

## Progression & Economy

### Gold Economy Design

**Income Sources:**
- Starting gold: 200g
- Per kill: 5-40g (varies by enemy)
- Wave completion: 50-200g bonus
- DDA bonus: 25% if struggling

**Spending Curve:**

```
Wave 1:  200g → 2-3 Gunners (150-225g)
Wave 5:  ~600g → First Sniper or 2 Rangers
Wave 10: ~1500g → Mix of 8-10 towers
Wave 20: ~4000g → 15-20 towers, some Lv3
```

**Tuning Levers:**
- Starting gold (affects early game)
- Enemy gold values (affects mid-game)
- Wave bonuses (affects late-game)

### XP & Leveling

**Current System:**
- 1 XP per kill
- Level 2: 3 XP (3 kills)
- Level 3: 9 XP (9 kills total)
- Benefits: +30% damage, -10% fire rate, +0.5 range

**Why this works:**
- Early placement rewarded (more kills over time)
- Positioning matters (some spots get more kills)
- Encourages keeping towers (not constant rebuilding)

**Alternative Systems (not implemented):**
```javascript
// Manual upgrades (more player control)
upgrade_cost = base_cost × level
benefits: +50% damage per level

// Exponential XP (slower progression)
Level 2: 5 XP
Level 3: 15 XP
Level 4: 30 XP
```

---

## Player Psychology

### Flow State

**Keep players in "flow" (engaged but not frustrated):**

```
Too Easy → Boredom
   ↓
Flow (perfect)
   ↓
Too Hard → Frustration
```

**Your game achieves flow through:**
- DDA (adjusts difficulty based on performance)
- Expanding grid (sense of growth)
- XP system (visible progress)
- Wave variety (never boring)

### Juice & Feedback

**"Game feel" enhancements:**
- Screen shake on impacts
- Particle explosions on death
- Flash frames on damage
- Knockback effects
- Coin particles flying to UI

**Why it matters:**
- Makes actions feel impactful
- Provides clear feedback
- Increases satisfaction
- "Feel" beats graphics

### Micro-Goals

**"Just one more..." addiction loop:**

1. **Immediate:** "Just 50 more gold for a Sniper"
2. **Short-term:** "Survive until wave 10"
3. **Medium-term:** "Beat wave 20 boss"
4. **Long-term:** "Reach wave 30+"

**Your game has all 4 layers**, which creates compulsive replayability.

---

## Wave Design

### Wave Composition

**Early Waves (1-5):**
```javascript
// Simple, predictable
wave1: { zombie: 10 }
wave2: { zombie: 15, vampire: 2 }
wave3: { zombie: 12, skeleton: 5 }

// Goals: Teach mechanics, build confidence
```

**Mid Waves (6-14):**
```javascript
// Mixed threats
wave10: {
    zombie: 20,
    skeleton: 10,
    goblin: 5,     // Speed threat
    vampire: 3     // Tank threat
}

// Goals: Test strategy, force adaptation
```

**Late Waves (15-19):**
```javascript
// Chaos, overwhelming numbers
wave15: {
    zombie: 30,
    swarm: 50,     // Visual chaos
    golem: 2,      // Armored tanks
    wraith: 10     // Fast flankers
}

// Goals: Test build quality, create intensity
```

**Boss Wave (20):**
```javascript
// Memorable fight
wave20: {
    necromancer: 1,  // Boss
    // Summons 3 skeletons every 4 seconds
}

// Goals: Epic moment, clear milestone
```

**Infinite Waves (21+):**
```javascript
// Procedurally generated using budget algorithm
budget = baseGoldValue × wave × 1.2
// Spend budget on random enemy mix
// Scales forever

// Goals: Endless replayability, high score chasing
```

---

## Design Checklist

When adding new content:

### New Tower
- [ ] Unique role (not redundant with existing)
- [ ] Clear strengths and weaknesses
- [ ] Cost reflects power level
- [ ] Synergizes with existing towers
- [ ] Has counter-play (not overpowered)
- [ ] Sprite/visual design distinct
- [ ] Test against waves 5, 15, 20

### New Enemy
- [ ] Fills archetype (swarm/tank/specialist)
- [ ] Has clear counter (specific tower type)
- [ ] HP/speed balanced to wave scaling
- [ ] Gold reward matches threat level
- [ ] 8-directional sprites ready
- [ ] Death animation satisfying
- [ ] Test in mixed wave compositions

### New Wave
- [ ] Introduces challenge gradually
- [ ] Tests specific player strategies
- [ ] Mix of enemy types (not homogeneous)
- [ ] Gold reward balanced to difficulty
- [ ] Dialogue adds context (optional)
- [ ] Playtest for difficulty spike

---

## Tuning Tools

**GameConstants.js** - Central balance hub:

```javascript
// Tower stats
TOWER_STATS.GUNNER.damage = 25;  // Adjust firepower
TOWER_COSTS.SNIPER = 250;        // Adjust economy

// Enemy scaling
ENEMY_STATS.ZOMBIE.hpMultiplier = 8; // Per-wave scaling

// Performance vs visual quality
MAX_PARTICLES: 500,  // Particle limit
```

**WaveConfig.js** - Wave definitions:

```javascript
// Edit wave compositions
waves[9] = {
    zombie: 20,
    skeleton: 10,
    vampire: 5
};
```

**DDA Constants:**

```javascript
// Adjust difficulty curve
DDA_HEALTH_THRESHOLD: 10,  // Lives remaining to trigger help
DDA_SPAWN_SLOW: 1.15,      // 15% slower spawns
DDA_GOLD_BOOST: 1.25       // 25% more gold
```

---

## Key Files

- **design_doc.md** - Complete design philosophy
- **GameConstants.js** - All balance values
- **WaveConfig.js** - Wave definitions
- **WaveGenerator.js** - Procedural wave algorithm
- **Tower.js** - Tower base class and subclasses
- **Enemy.js** - Enemy base class and subclasses

## Design Philosophy Summary

**Core Loop:** Build → Defend → Reward → Upgrade
**Complexity:** Easy to learn, depth through synergy
**Difficulty:** DDA keeps flow state
**Replayability:** Infinite waves, diverse strategies
**Feel:** Juice and feedback > graphics

Always playtest changes across multiple wave ranges!
