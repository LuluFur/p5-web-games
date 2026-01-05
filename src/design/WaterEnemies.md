# Water-Based Enemy Types Design

## Overview
Water-based enemies introduce **terrain-dependent threats** that exploit water tiles, creating strategic pressure to invest in amphibious towers and adapt placement strategies. These enemies interact uniquely with water terrain, forcing players to defend both land and aquatic routes.

## Research Foundation

### Tower Defense Enemy Design Principles
From genre analysis, effective enemy design requires:
1. **Forcing Strategic Diversity**: Each enemy type should punish over-reliance on a single tower strategy
2. **Rock-Paper-Scissors Balance**: No tower should be universally effective; enemies demand specialized counters
3. **Tactical Surprise**: New enemy behaviors keep gameplay fresh and prevent "solved" strategies
4. **Visual Clarity**: Players must instantly recognize enemy threats and behaviors

### Water-Specific Mechanics from Industry
- **Aquatic Pathfinding**: Underwater enemies navigate water routes, bypassing land-based defenses
- **Amphibious Threats**: Enemies that transition between land and water create unpredictable pathing
- **Environmental Synergy**: Water enemies may heal, gain speed, or become invulnerable in water
- **Counter-Play**: Specialized towers (underwater turrets, amphibious units) required to engage

## Design Philosophy

### Core Concept: "The Tide Rises"
Water enemies represent a **second front** that players must defend. While standard undead approach via land routes, aquatic horrors emerge from water sources, forcing players to:
- **Split Resources**: Invest in both land and amphibious towers
- **Anticipate Routes**: Predict which enemies use water vs. land paths
- **Adapt Positioning**: Place amphibious towers in water to intercept aquatic threats

### Balancing Principles
1. **Not Universally Superior**: Water pathing should be a trade-off, not an advantage in all scenarios
2. **Clear Counters**: Amphibious towers should effectively counter water enemies (no hard counters, but strong matchups)
3. **Visual Distinction**: Water enemies must be instantly recognizable (color, animations, spawn effects)
4. **Progressive Introduction**: Introduce aquatic enemies in Level 2 (Marshlands) after players master basic towers

---

## Water Enemy Types

### 1. Swamp Wraith (Aquatic Specter)
**Archetype**: Fast Aquatic Harasser
**Introduced**: Level 2 (Marshlands), Wave 5
**Spawn Location**: Water tile edges

#### Base Stats
- **HP**: 60 + (wave × 6)
- **Speed**:
  - On Grass: 1.8 (slow)
  - On Water: 3.0 (very fast - 67% speed boost)
- **Gold**: 12g
- **Damage to Base**: 1 life

#### Behavior
- **Pathing Preference**: Prioritizes water routes (A* treats water as -0.5 cost)
- **Speed Burst**: Gains 67% speed boost when on water tiles
- **Land Vulnerability**: Takes +20% damage on grass (out of element)
- **Transition**: Smoothly transitions between land/water (no spawn animation mid-path)

#### Visual Design
- **Appearance**: Translucent blue-green ghost, dripping water effects, seaweed strands
- **Animations**:
  - **Water Walk**: 6-frame floating animation with ripple particles
  - **Land Walk**: 6-frame slower hovering (looks weakened)
  - **Spawn**: 3-second emergence from water surface (bubbles → rise)
  - **Death**: 7-frame dissolve into water puddle
- **Audio**: Gurgling water sounds, eerie whale-like moans

#### Strategic Counter
- **Best Towers**:
  - Amphibious Rangers (rapid fire to catch them in water)
  - Standard towers positioned to hit them on land (when slowed)
- **Weak Against**: Pyromancer (water resistance), slow single-target towers
- **Player Strategy**: Force them onto land by blocking water routes with amphibious towers

#### Design Rationale
Swamp Wraiths punish players who ignore water zones. Their extreme water speed creates urgency to build amphibious towers early, but their land vulnerability rewards mixed strategies.

---

### 2. Drowned Zombie (Amphibious Brute)
**Archetype**: Tanky Amphibious Swimmer
**Introduced**: Level 2 (Marshlands), Wave 7
**Spawn Location**: Water tile edges

#### Base Stats
- **HP**: 200 + (wave × 20)
- **Speed**:
  - On Grass: 1.2 (slow)
  - On Water: 1.2 (same - amphibious)
- **Gold**: 18g
- **Damage to Base**: 2 lives

#### Behavior
- **Amphibious Pathing**: Can walk on both water and grass equally
- **Water Healing**: Regenerates 5 HP/sec while on water tiles
- **Damage Soak**: No damage modifiers (consistent threat)
- **Path Unpredictability**: Uses whichever route (land or water) is shorter

#### Visual Design
- **Appearance**: Bloated green zombie, algae-covered skin, barnacles, glowing blue eyes
- **Animations**:
  - **Water Walk**: 6-frame swimming motion with bubbles
  - **Land Walk**: 6-frame shambling gait (dripping water)
  - **Spawn**: 3-second crawl from water depths
  - **Death**: 7-frame explosion with water splash particles
- **Audio**: Heavy splashing, waterlogged groans

#### Strategic Counter
- **Best Towers**:
  - Snipers (high burst damage to overcome healing)
  - Amphibious Gunners placed in water (constant pressure)
  - Focus fire to kill before excessive healing
- **Weak Against**:
  - Distributed damage (allows healing to negate)
  - Pyromancer (short range, can't follow into water)
- **Player Strategy**: Intercept on land where healing doesn't apply, or use amphibious burst damage

#### Design Rationale
Drowned Zombies force players to make a choice: kill them quickly on land, or invest in amphibious towers to pursue them into water. Their healing mechanic punishes chip damage and rewards focused fire.

---

### 3. Siren (Aquatic Disruptor)
**Archetype**: Water-Based Debuffer
**Introduced**: Level 2 (Marshlands), Wave 10 (Boss Wave Mini-Boss)
**Spawn Location**: Central water pool

#### Base Stats
- **HP**: 150 + (wave × 12)
- **Speed**:
  - On Grass: 0.8 (very slow)
  - On Water: 2.0 (moderate)
- **Gold**: 25g
- **Damage to Base**: 1 life

#### Behavior
- **Water Immunity**: Takes 0 damage while on water tiles (invulnerable)
- **Land Vulnerability**: Takes normal damage on grass
- **Disrupt Aura**: Towers within 2 cells of Siren have -30% attack speed (while Siren on water)
- **Pathing Strategy**: Stays in water as long as possible, only exits when forced

#### Unique Mechanic: "Siren's Song"
- **Trigger**: Every 10 seconds while on water
- **Effect**: Nearest 3 towers have attack speed reduced to 50% for 3 seconds
- **Visual**: Pulsing blue rings emanate from Siren, affected towers flash blue
- **Audio**: Haunting melody sound effect

#### Visual Design
- **Appearance**: Ethereal female figure, flowing blue hair, fish tail, spectral glow
- **Animations**:
  - **Water Swim**: 8-frame graceful swimming with hair flow
  - **Land Crawl**: 4-frame struggling slow movement (out of water)
  - **Song Cast**: 4-frame animation (head tilts back, arms spread)
  - **Death**: 7-frame fade into mist with musical notes particles
- **Audio**: Ethereal singing, water chimes

#### Strategic Counter
- **Best Towers**:
  - Long-range towers outside debuff range (Snipers 3+ cells away)
  - Amphibious towers that force Siren onto land (block water paths)
  - Storm Mage (chains ignore water immunity if chain originates from land target)
- **Weak Against**:
  - Short-range towers (debuffed by aura)
  - Towers placed in water (debuff radius includes them)
- **Player Strategy**:
  1. Use amphibious towers to block water routes, forcing Siren onto land
  2. Focus fire when vulnerable on grass
  3. Position long-range towers outside debuff radius

#### Design Rationale
Sirens create **positional puzzles**. Players must bait them onto land while maintaining DPS from outside the debuff zone. Water immunity makes them "mini-bosses" that demand strategy, not just raw firepower.

---

### 4. Kraken Tentacle (Environmental Hazard Enemy)
**Archetype**: Stationary Water Spawner
**Introduced**: Level 2 (Marshlands), Wave 15
**Spawn Location**: Large water pools (3×3 minimum)

#### Base Stats
- **HP**: 500 (does not scale with wave - fixed HP)
- **Speed**: 0 (stationary)
- **Gold**: 50g (high reward for elimination)
- **Damage to Base**: 0 (does not reach base)

#### Behavior
- **Stationary Spawner**: Remains in water pool, cannot move
- **Tentacle Summons**: Spawns 1 Small Tentacle every 8 seconds
- **Small Tentacles**:
  - HP: 40
  - Speed: 2.5 (on water), 1.5 (on land)
  - Gold: 5g
  - Path to base normally
- **Invulnerability**: Main Kraken takes 0 damage from non-amphibious towers
- **Elimination**: Must be killed by amphibious towers to stop spawns

#### Visual Design
- **Appearance**: Massive octopus tentacle emerging from water, barnacles, scars, glowing red eye at base
- **Animations**:
  - **Idle**: 6-frame slow writhing in water
  - **Summon**: 4-frame tentacle thrash, water splash, small tentacle emerges
  - **Death**: 10-frame dramatic sink into water with massive splash particles
- **Audio**: Deep roar, water churning, tentacle slaps

#### Strategic Counter
- **Required**: Amphibious towers (only way to damage Kraken)
- **Best Towers**:
  - Amphibious Snipers (high damage to kill quickly)
  - Amphibious Rangers (consistent DPS + kill small tentacles)
- **Player Strategy**:
  1. Prioritize killing Kraken before tentacles overwhelm defenses
  2. Balance resources: damage Kraken vs. kill tentacles
  3. Position amphibious towers early in water pools

#### Design Rationale
Kraken Tentacles are **gear checks**. If players haven't invested in amphibious towers by Wave 15, they face endless spawns. This creates a strategic "deadline" to adapt to water mechanics. The stationary nature makes it a **fixed objective** rather than a racing threat.

---

### 5. Tidal Horror (Aquatic Boss)
**Archetype**: Water-Based Mini-Boss
**Introduced**: Level 2 Boss Wave (Wave 20)
**Spawn Location**: Largest water pool

#### Base Stats
- **HP**: 1200
- **Speed**:
  - On Grass: 0.6 (very slow)
  - On Water: 1.8 (moderate)
- **Gold**: 100g
- **Damage to Base**: 5 lives (devastating)

#### Behavior
- **Phase 1** (100%-50% HP): Stays in water, summons 2 Drowned Zombies every 6 seconds
- **Phase 2** (50%-0% HP): Exits water, gains +50% damage resistance, stops summoning
- **Water Shield**: Takes 50% reduced damage while on water
- **Tidal Wave Attack** (Phase 1): Every 15 seconds, unleashes wave that pushes all non-amphibious towers' projectiles away (projectiles disappear)

#### Unique Mechanic: "Tidal Wave"
- **Charge Time**: 3 seconds (visual buildup with water swirling)
- **Effect**: All projectiles in flight from non-amphibious towers are destroyed
- **Amphibious Exemption**: Amphibious tower projectiles ignore Tidal Wave
- **Visual**: Blue wave pulse radiates from Tidal Horror, projectiles flash and vanish
- **Audio**: Roaring wave crash sound

#### Visual Design
- **Appearance**: Enormous humanoid covered in barnacles, kelp beard, crown of coral, glowing cyan eyes, 1.5× scale
- **Animations**:
  - **Water Swim**: 6-frame powerful strokes, creates wake
  - **Land Walk**: 6-frame lumbering stomps (dripping, weakened)
  - **Tidal Wave Cast**: 4-frame charge (arms raise, water spirals)
  - **Phase Transition**: 6-frame roar animation (water explodes around it)
  - **Death**: 12-frame dramatic collapse, massive water eruption
- **Audio**: Deep roar, crashing waves, haunting whale song

#### Strategic Counter
- **Phase 1 Strategy**:
  - Use amphibious towers to damage through water shield
  - Kill summoned zombies quickly to prevent base damage
  - Anticipate Tidal Wave (stop firing 3 seconds before to save resources)
- **Phase 2 Strategy**:
  - Switch to land-based towers (higher DPS, no water shield)
  - Focus all fire (no more summons to manage)
  - Exploit increased vulnerability (50% resistance → 0%)
- **Best Towers**:
  - Amphibious Snipers (Phase 1 DPS)
  - Land-based Snipers/Storm Mages (Phase 2 burst)
  - Rangers for zombie cleanup

#### Design Rationale
Tidal Horror is a **two-phase skill check**. Phase 1 tests amphibious tower investment and summon management. Phase 2 rewards baiting the boss onto land and bursting it down. The Tidal Wave mechanic punishes reliance on land towers, forcing players to build amphibious units or time attacks carefully.

---

## Enemy Spawn Patterns

### Level 2 (Marshlands) Wave Composition
Introducing water enemies gradually to teach mechanics:

- **Waves 1-4**: Standard land enemies (Zombie, Vampire, Skeleton) - No water enemies
- **Wave 5**: First Swamp Wraith appearance (3× Wraiths) - Tutorial dialogue
- **Wave 7**: First Drowned Zombie (2× Zombies + 5× Wraiths)
- **Wave 10**: First Siren (1× Siren + 8× Wraiths + 4× Drowned Zombies)
- **Wave 15**: First Kraken Tentacle (1× Kraken in water pool + mixed land enemies)
- **Waves 16-19**: Mixed compositions (30% water enemies, 70% land enemies)
- **Wave 20**: Tidal Horror Boss (1× Tidal Horror + 10× Drowned Zombies + 15× Swamp Wraiths)

### Spawn Distribution Logic
```javascript
// In WaveManager.js
function generateWaterEnemySpawn(wave, levelId) {
    if (levelId !== 2) return null; // Only Level 2 has water enemies

    // Gradually increase water enemy percentage
    const waterEnemyRatio = Math.min(0.4, wave * 0.03); // Cap at 40%

    // Prioritize water spawn points if available
    const spawnPoints = grid.getWaterEdgeSpawnPoints();

    return {
        enemyType: randomWaterEnemy(),
        spawnPoint: random(spawnPoints),
        count: Math.floor(waveEnemyCount * waterEnemyRatio),
    };
}
```

---

## Visual Feedback & Communication

### First Water Enemy Encounter
When Swamp Wraith first appears (Wave 5):
1. **Pre-Wave Dialogue**: "Commander! Spectral entities are emerging from the water. Standard towers may struggle—consider amphibious units."
2. **Enemy Highlight**: Swamp Wraith glows on spawn for 3 seconds
3. **Tutorial Prompt**: "Water enemies move faster on water! Use Amphibious towers to intercept them."
4. **Tooltip Reminder**: Hover over Swamp Wraith → "Moves 67% faster on water | -20% damage on land"

### Enemy Identification System
- **Color Coding**: All water enemies have blue-green tint
- **Water Particles**: Dripping water effects on all aquatic enemies
- **Spawn VFX**: Water enemies emerge from bubbling water (vs. summoning circle for land enemies)
- **Icon Indicators**:
  - Water droplet icon above enemy = water-preferred
  - Waves icon = amphibious
  - Shield + water icon = water immunity

### Combat Feedback
- **Damage Numbers**:
  - White damage numbers on land
  - Blue damage numbers in water
  - "IMMUNE" for Siren in water, Kraken from land towers
- **Healing Indicators**: Green "+5" numbers on Drowned Zombies in water
- **Debuff Visualization**: Towers affected by Siren glow blue with slow particles

---

## Integration with Existing Systems

### Enemy.js Extensions
```javascript
class Enemy {
    constructor(type, x, y, wave) {
        // ... existing code
        this.isAquatic = type.isAquatic || false;
        this.waterSpeedMultiplier = type.waterSpeedMultiplier || 1.0;
        this.waterDamageModifier = type.waterDamageModifier || 1.0;
    }

    update() {
        // ... existing code

        // NEW: Check current terrain
        const terrain = grid.getTerrainType(this.gridX, this.gridY);

        if (terrain === TERRAIN_TYPES.WATER && this.isAquatic) {
            this.currentSpeed = this.baseSpeed * this.waterSpeedMultiplier;
            this.applyWaterEffects(); // Healing, immunity, etc.
        } else {
            this.currentSpeed = this.baseSpeed;
        }
    }

    takeDamage(damage, source) {
        const terrain = grid.getTerrainType(this.gridX, this.gridY);

        // Water immunity (Siren)
        if (this.waterImmune && terrain === TERRAIN_TYPES.WATER && !source.isAmphibious) {
            this.showFloatingText("IMMUNE");
            return;
        }

        // Apply terrain damage modifiers
        if (terrain === TERRAIN_TYPES.WATER) {
            damage *= this.waterDamageModifier;
        }

        // ... existing damage logic
    }
}
```

### Pathfinder.js Water Routing
```javascript
class Pathfinder {
    findPath(start, end, grid, enemyType) {
        // ... existing A* logic

        const terrain = grid.getTerrainType(neighbor.row, neighbor.col);

        // Water enemies prefer water routes
        if (enemyType.isAquatic && terrain === TERRAIN_TYPES.WATER) {
            neighbor.g -= 0.5; // Lower cost = preferred path
        }

        // Non-aquatic enemies avoid water
        if (!enemyType.isAquatic && terrain === TERRAIN_TYPES.WATER) {
            neighbor.g += 999; // Effectively unwalkable
        }

        // Amphibious enemies treat all terrain equally
        // (no modifier needed)
    }
}
```

### WaveConfig.js Enemy Definitions
```javascript
const WATER_ENEMY_TYPES = {
    SWAMP_WRAITH: {
        name: "Swamp Wraith",
        baseHP: 60,
        hpPerWave: 6,
        speed: 1.8,
        waterSpeedMultiplier: 1.67,
        gold: 12,
        isAquatic: true,
        waterDamageModifier: 1.0,
        landDamageModifier: 1.2, // Takes +20% damage on land
        spawnAnimation: "water_emerge",
    },

    DROWNED_ZOMBIE: {
        name: "Drowned Zombie",
        baseHP: 200,
        hpPerWave: 20,
        speed: 1.2,
        waterSpeedMultiplier: 1.0, // Same speed on water/land
        gold: 18,
        isAquatic: true,
        waterHealing: 5, // HP per second in water
        spawnAnimation: "water_crawl",
    },

    SIREN: {
        name: "Siren",
        baseHP: 150,
        hpPerWave: 12,
        speed: 0.8,
        waterSpeedMultiplier: 2.5,
        gold: 25,
        isAquatic: true,
        waterImmune: true, // Invulnerable in water
        debuffAura: { range: 2, attackSpeedReduction: 0.3 },
        sirenSong: { cooldown: 600, duration: 180, range: 999 }, // 10s cooldown, 3s duration
        spawnAnimation: "water_rise",
    },

    KRAKEN_TENTACLE: {
        name: "Kraken Tentacle",
        baseHP: 500,
        hpPerWave: 0, // Fixed HP
        speed: 0,
        gold: 50,
        isStationary: true,
        isAquatic: true,
        requiresAmphibious: true, // Only amphibious towers damage it
        summonType: "SMALL_TENTACLE",
        summonInterval: 480, // 8 seconds
        spawnAnimation: "tentacle_emerge",
    },

    TIDAL_HORROR: {
        name: "Tidal Horror",
        baseHP: 1200,
        hpPerWave: 0,
        speed: 0.6,
        waterSpeedMultiplier: 3.0,
        gold: 100,
        isAquatic: true,
        waterDamageReduction: 0.5, // 50% damage reduction in water
        phases: [
            { hpThreshold: 0.5, summonType: "DROWNED_ZOMBIE", summonInterval: 360 },
            { hpThreshold: 0.0, damageResistance: 0.5, stopSummoning: true },
        ],
        tidalWave: { cooldown: 900, chargeTime: 180 }, // 15s cooldown, 3s charge
        spawnAnimation: "boss_emerge",
        scale: 1.5,
    },
};
```

---

## Balancing Metrics

### Water Enemy Distribution
- **Level 2 Average**: 25% of total enemies are water-based
- **Early Waves (1-10)**: 10-15% water enemies
- **Mid Waves (11-15)**: 25-30% water enemies
- **Late Waves (16-20)**: 30-40% water enemies

### Amphibious Tower Investment Required
- **Minimum Viable**: 2-3 Amphibious Gunners (200-300g investment)
- **Optimal**: 4-5 Amphibious mixed towers (400-600g investment)
- **Maximum**: 8+ Amphibious towers (800g+) - Overkill, inefficient

### Kill Value Analysis
- **Swamp Wraith**: 12g / 60 HP = 0.20 gold/HP (high value, priority target)
- **Drowned Zombie**: 18g / 200 HP = 0.09 gold/HP (low value, but heal threat)
- **Siren**: 25g / 150 HP = 0.17 gold/HP + tactical value (priority when vulnerable)
- **Kraken**: 50g / 500 HP = 0.10 gold/HP + stops spawns (mandatory target)
- **Tidal Horror**: 100g / 1200 HP = 0.08 gold/HP (boss reward)

### DPS Requirements
To kill water enemies before reaching base (assuming 15-cell path, speeds on water):
- **Swamp Wraith**: 3.0 cells/sec → 5s to traverse → Need 12 DPS minimum
- **Drowned Zombie**: 1.2 cells/sec + healing → 12.5s → Need 21 DPS (accounting for 5 HPS heal)
- **Siren**: Must force onto land (2.0 speed → 0.8 speed), then 18.75s → Need 8 DPS on land
- **Tidal Horror**: 1.8 speed (Phase 1) → 8.3s → Need 72 DPS (accounting for 50% reduction)

---

## Player Psychology & Learning

### Teaching Water Mechanics
1. **Wave 5** (First Swamp Wraith): "Here's a new threat"
2. **Wave 7** (First Drowned Zombie): "They can heal in water"
3. **Wave 10** (First Siren): "They're immune in water—force them out!"
4. **Wave 15** (Kraken): "You MUST have amphibious towers now"
5. **Wave 20** (Boss): "Combine everything you've learned"

### Failure States & Recovery
- **No Amphibious Towers by Wave 15**: Kraken spawns endless tentacles → Likely defeat → Teaches necessity
- **Ignoring Siren**: Towers debuffed → Land enemies slip through → Teaches priority targeting
- **Chasing Drowned Zombies into Water**: Waste ammo on healing targets → Teaches intercept on land

### Mastery Indicators
- **3-Star Completion**: Player intercepts water enemies efficiently (minimal base damage)
- **Economy**: 5 or fewer amphibious towers (optimized placement)
- **Siren Kills**: Average kill time < 8 seconds (forced onto land quickly)

---

## Technical Implementation Checklist

### Phase 1: Basic Water Enemies
- [ ] Create SwampWraith class extending Enemy
- [ ] Implement water speed modifier logic in Enemy.update()
- [ ] Add water emerge spawn animation
- [ ] Create water-specific enemy factory in WaveManager

### Phase 2: Advanced Behaviors
- [ ] Implement DrownedZombie water healing mechanic
- [ ] Create Siren debuff aura system
- [ ] Add Siren Song ability with visual/audio feedback
- [ ] Implement water immunity logic (prevent damage from non-amphibious)

### Phase 3: Spawner & Boss
- [ ] Create KrakenTentacle stationary spawner enemy
- [ ] Implement tentacle summon mechanics
- [ ] Build TidalHorror boss with two-phase system
- [ ] Add Tidal Wave projectile destruction mechanic

### Phase 4: Integration
- [ ] Update Pathfinder to handle aquatic enemy preferences
- [ ] Add water enemy spawn points to LevelData
- [ ] Create WaveConfig entries for all water enemies
- [ ] Implement visual effects (water particles, healing numbers, immune text)

### Phase 5: Polish
- [ ] Design and animate all water enemy sprites (8-directional)
- [ ] Create unique sound effects (splashing, gurgling, Siren song)
- [ ] Add tutorial dialogues for each water enemy introduction
- [ ] Implement damage number color coding (blue in water, white on land)

---

## Summary

Water-based enemies transform the Marshlands (Level 2) into a **multi-front tactical challenge**. By introducing five distinct aquatic threats—Swamp Wraith (fast harasser), Drowned Zombie (amphibious tank), Siren (debuff controller), Kraken Tentacle (spawner), and Tidal Horror (boss)—the game forces players to:

1. **Invest in Specialization**: Amphibious towers become mandatory by Wave 15
2. **Master Terrain Awareness**: Understand when enemies are vulnerable (water vs. land)
3. **Adapt Target Priority**: Siren and Kraken demand immediate focus
4. **Balance Economy**: Amphibious towers cost more—optimize placement

**Key Pillars**:
- **Tactical Variety**: Each water enemy demands different counter-strategies
- **Progressive Challenge**: Gentle introduction (Wave 5) → mandatory adaptation (Wave 15) → mastery test (Wave 20)
- **Visual Clarity**: Blue-green color coding, water particles, clear debuff indicators
- **Fair Difficulty**: Water enemies are strong but have clear weaknesses (land vulnerability, amphibious counters)

**Integration**: Water enemies leverage the terrain system (TerrainMechanics.md) and multi-level structure (LevelProgressionSystem.md) to create a cohesive strategic experience.

**Next Steps**: Implement core water enemy behaviors, create sprite animations, and integrate with existing Enemy.js and WaveManager.js systems. See technical checklist for phased development approach.
