# Merge Defence: Design Document

## 1. Game Overview
**Title:** Merge Defence
**Genre:** Tower Defense
**Platform:** Web (p5.js 1.10.0)
**Visual Style:** Vibrant Pixel Art with Procedural Characters
**Core Theme:** "Last Stand Defense" - Defend your base (Right side) against waves of undead using specialized defender units. Grid expands as you progress.

## 2. Visual & Audio Aesthetics
### Visuals
-   **Environment:** Vibrant, lush green grass with distinct zones (Spawn/Red, Playable/Green, Base/Blue). Water locks unexplored areas.
-   **Sizing:** **64x64** pixel art tiles.
-   **Feedback:** Juice! Screen shake on impactful hits, particle explosions (blood splatters, soul particles), flash frames on death, knockback effects.
-   **Enemies:** 8-directional sprite animations (walk, scary-walk, spawn, death) using pixel art assets.
-   **Towers:** Procedurally drawn goblin-like defenders with distinct weapons and color schemes.

## 3. Tower System: Specialized Defenders
Towers are humanoid defenders with unique roles. They level up automatically through XP gained from kills (no manual upgrades). Each tower has distinct strengths and weaknesses to encourage strategic placement.

### Gunner (75g) - Balanced
- **Role:** All-purpose defender
- **Visual:** Green uniform, single barrel rifle
- **Stats:** Range 3, Damage 25, Fire Rate 40
- **Strengths:** Balanced DPS, affordable, good starter tower
- **Best Against:** General purpose, early waves

### Ranger (150g) - Rapid Fire
- **Role:** Anti-swarm specialist
- **Visual:** Blue uniform, dual barrels
- **Stats:** Range 3.5, Damage 18, Fire Rate 20
- **Strengths:** Very fast attacks, slightly longer range
- **Best Against:** Swarms, Goblins, fast enemies

### Sniper (250g) - Long Range
- **Role:** Backline damage dealer
- **Visual:** Purple/gray camo, long sniper rifle
- **Stats:** Range 6, Damage 100, Fire Rate 90
- **Strengths:** Longest range, highest single-hit damage, shows tracer line
- **Best Against:** Golems (armor piercing), Vampires, boss enemies

### Pyromancer (200g) - AOE Damage
- **Role:** Area control
- **Visual:** Orange/red robes, fire staff
- **Stats:** Range 2, Damage 4, Fire Rate 3
- **Strengths:** Continuous flame, hits multiple enemies in cone
- **Best Against:** Swarms, grouped enemies. Weak: Short range

### Storm Mage (300g) - Chain Lightning
- **Role:** Multi-target specialist
- **Visual:** Teal robes, floating electric orb
- **Stats:** Range 3, Damage 12, Fire Rate 25
- **Strengths:** Lightning chains to 2 nearby enemies (50% damage per jump), shows jagged lightning effects
- **Best Against:** Grouped enemies, medium packs

### Buffer (100g) - Support
- **Role:** Force multiplier
- **Visual:** Gold crystal beacon with pulsing glow
- **Stats:** Range 0 (doesn't attack)
- **Mechanics:** Creates network with orthogonally adjacent towers. Each connected tower gets +5% damage per tower in network. Shows gold pulsing lines and flowing particles to connected towers.
- **Strategy:** Place in center of tower clusters for maximum effect

### Tower Progression System
- **XP-Based Auto-Leveling:** Towers gain 1 XP per kill. Level up at 3 XP (Lv2) and 9 XP (Lv3).
- **Level Benefits:** +30% damage, -10% fire rate (faster), +0.5 range, increased sell value.
- **Max Level:** 3 (expandable to 5 in code)
- **Visual Indicators:** Blue glow (Lv2), Gold glow (Lv3). Eyes track and aim at targets.

## 4. Enemy Bestiary: The Undead Horde
Enemies have rich 8-directional sprite animations. They spawn with a summoning circle animation (3s), walk normally in safe zones, switch to "scary walk" in the middle danger zone, and have unique death animations with knockback effects.

### Core Enemies (Waves 1-5)

#### Zombie (The Relentless)
- **Speed:** 2.0
- **HP:** 50 + (wave × 8)
- **Gold:** 10g
- **Visuals:** 8-directional rotting flesh animations
- **Animations:** 6-frame walk, 8-frame scary walk, 8-frame spawn, 7-frame death
- **Best Counter:** Any tower, good for XP farming

#### Vampire (The Durable)
- **Speed:** 1.0
- **HP:** 150 + (wave × 15)
- **Gold:** 15g
- **Visuals:** Elegant dark cloak, 8-directional sprites
- **Animations:** 6-frame walk, 4-frame idle, 5-frame crouch
- **Best Counter:** Focus fire, Snipers for high damage

#### Skeleton (The Swift)
- **Speed:** 1.4
- **HP:** 80 + (wave × 8)
- **Gold:** 12g
- **Visuals:** Animated bones, 8-directional sprites
- **Animations:** 6-frame walk, 8-frame fight stance spawn, 4-frame idle
- **Best Counter:** Rapid fire (Ranger), AOE if grouped

### Advanced Enemies (Waves 6-12)

#### Wraith (The Specter)
- **Speed:** 2.5
- **HP:** 40 + (wave × 4)
- **Gold:** 8g
- **Visuals:** Floating ghost, 8-directional sprites
- **Threat:** Very fast, dangerous in groups
- **Best Counter:** AOE (Pyro), Chain Lightning (Storm)

#### Goblin (The Raider)
- **Speed:** 2.8
- **HP:** 35 + (wave × 4)
- **Gold:** 8g
- **Visuals:** 8-directional sprites
- **Threat:** Fastest base speed, swarms the base
- **Best Counter:** Choke points, rapid fire, early interception

#### Swarm (The Horde)
- **Speed:** 3.5 + (wave × 0.1)
- **HP:** 25 + (wave × 3)
- **Gold:** 5g each
- **Visuals:** Small procedural brown creatures (no sprites)
- **Features:** Animated legs, red eyes
- **Best Counter:** Pyromancer (AOE), Storm (chains)

### Elite Enemies (Waves 11+)

#### Golem (The Armored)
- **Speed:** 0.8
- **HP:** 400 + (wave × 30)
- **Gold:** 30g
- **Special:** 50% ARMOR - all damage reduced by half
- **Visuals:** Large procedural stone body with glowing orange eyes
- **Threat:** Extremely tanky, wastes rapid-fire tower ammo
- **Best Counter:** Snipers (high single-hit damage), focus fire

#### Regenerator (The Undying)
- **Speed:** 1.5
- **HP:** 120 + (wave × 10)
- **Gold:** 20g
- **Special:** Heals 3 HP/second if not hit for 1 second
- **Visuals:** Pulsing green slime, shows healing particles
- **Threat:** Can outlast burst damage
- **Best Counter:** Continuous damage (Pyro), focus fire

#### Ogre (The Brute)
- **Speed:** 0.7
- **HP:** 450 + (wave × 40)
- **Gold:** 40g
- **Visuals:** Massive procedural body
- **Threat:** Huge HP pool
- **Best Counter:** Mass concentrated fire, Storm chains

### Boss Enemy (Wave 20)

#### Necromancer (The Dark Lord)
- **Speed:** 1.0
- **HP:** 800
- **Gold:** 100g
- **Special:** Summons 3 Skeletons every 4 seconds
- **Visuals:** Purple robes, green glowing eyes, staff with pulsing gem, 1.3× scale, bobbing animation
- **Threat:** Endless minions overwhelm defenses
- **Strategy:** Kill summoned Skeletons quickly, focus all towers on Necromancer between summons

## 5. Technical Architecture

### Core Systems
- **Game Class:** Singleton orchestrator that delegates to specialized managers and renderers
- **State Machine:** MENU → PLAY → DIALOGUE → GAMEOVER
- **Grid System:** 9×20 grid (64px cells), middle-out unlock pattern (starts with 3 rows), water locks unexplored rows
- **Pathfinding:** Multi-path A* algorithm finds 3 dynamic paths from left spawn to right base

### Manager Pattern Architecture
The game uses specialized managers for clean separation of concerns:

#### Core Managers
- **EconomyManager:** Gold, lives, spending/earning logic
- **ObjectManager:** Manages enemies, projectiles, particles arrays. Handles updates and cleanup.
- **TowerManager:** Tower placement, selection, tracking
- **WaveManager:** Wave spawning, enemy creation factory, dynamic difficulty adjustment (DDA)

#### Feature Managers
- **DialogueManager:** Story dialogue boxes before waves
- **InputManager:** Mouse/keyboard input routing
- **TutorialManager:** Progressive UI unlocking for new players
- **SpellManager:** (Future: Player-activated abilities)
- **DisplayManager:** UI state and menu management

#### Renderer Pattern
- **SpriteRenderer:** Draws towers with character sprites
- **ScreenEffectRenderer:** Screen shake, flash effects
- **DebugRenderer:** FPS, entity counts overlay
- **DisplayRenderer:** Menu screens, game over

### Key Features
- **Dynamic Difficulty Adjustment (DDA):** WaveManager adjusts spawn speed ±15% based on player health. Struggling players get bonus gold and slower spawns.
- **Grid Expansion:** Every 3 waves, unlocks 1 row (alternating top/bottom) for 200g
- **XP System:** Towers auto-level from kills without manual intervention
- **Asset Loading:** Async/await pattern loads ~400+ sprite frames on startup
- **Particle System:** Blood splatter, soul particles, explosion effects
- **Sound System:** SoundManager handles music states (idle/wave) and SFX

## 6. Game Flow & Psychology

### Addictive Loop
1. **Micro-Goals:** "Just 50 more gold for a Sniper tower"
2. **Visual Rewards:** XP level-up gold particles, glowing auras, screen shake on kills
3. **Flow State:** Wave rhythm: Intensity (combat) → Calm (planning/building) → Intensity
4. **Progressive Challenge:** DDA keeps difficulty in "sweet spot" - challenging but not overwhelming
5. **Expanding Playground:** Grid expansion creates sense of empire growth

### Wave Progression
- **Waves 1-4:** Tutorial warmup (Zombies, basic Vampires)
- **Waves 5-8:** New enemy types introduced with dialogue
- **Waves 9-14:** Mixed hordes, elite enemies, armor mechanics
- **Waves 15-19:** Endgame chaos, massive swarms
- **Wave 20:** Boss fight (Necromancer)
- **Wave 21+:** Dynamic wave generation using budget algorithm
