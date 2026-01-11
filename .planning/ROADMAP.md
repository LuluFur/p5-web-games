# Roadmap: Tiberium Wars RTS

**7 phases** — Foundation to polished RTS experience

---

## Phase 1: Foundation & Cleanup ✅
**Status:** Complete (2026-01-11)
**Plans:** 1/1 completed
**Commits:** 3 (8a27bf9, d51e596, 71f901b)

**Goal:** Remove tower defense remnants, stabilize RTS architecture

**What was delivered:**
- ✅ Removed Tower.js (53KB, 1,682 lines, 7 subclasses)
- ✅ Cleaned TD references from InputManager (-240 lines drag/drop)
- ✅ Updated StatsManager (Tower stats → Building stats)
- ✅ Removed TD constants from GameConstants.js (-39 lines)
- ✅ Verified BuilderTests.js has no Tower tests (no changes needed)
- ⚠️ Manual verification pending (user should test RTS game launch)

**Impact:** 1,962 lines removed. Clean RTS-only architecture established.

---

## Phase 2: Faction System ✅
**Status:** Complete (2026-01-11)
**Plans:** 1/1 completed
**Commits:** 3 (075e6a6, 9ac709d, cc4b751)

**Goal:** Implement 2-3 distinct factions with unique units and buildings

**What was delivered:**
- ✅ Faction data structure (RTS_FACTIONS in RTSConstants.js)
- ✅ 3 factions: ALLIANCE (balanced/defensive), SYNDICATE (speed/stealth), COLLECTIVE (economy/tech)
- ✅ Unique units per faction (5-8 unit types each, 520+ lines)
- ✅ Unique buildings per faction (10-12 building types each)
- ✅ Faction abilities: STEALTH (Syndicate), TELEPORT (Collective), SHIELD_REGEN (Alliance)
- ✅ Player.faction property and faction assignment in Game.js
- ✅ Visual differentiation (faction colors, symbols: ▲, ◆, ◈)
- ✅ Manager integration (UnitManager, BuildingManager apply faction bonuses)

**Impact:** Factions feel mechanically distinct. Foundation for AI strategies and balance.

---

## Phase 3: Procedural Map Generation ✅
**Status:** Complete (2026-01-11)
**Plans:** 1/1 completed
**Commits:** 3 (3da6fcf, 5b928bc, 3a4202b)

**Goal:** Generate balanced maps with terrain, resources, and tactical features

**What was delivered:**
- ✅ Map size configuration (MAP_SIZES: SMALL 64×64, MEDIUM 96×96, LARGE 128×128)
- ✅ Scaled terrain generation (noise scales inversely with map size)
- ✅ Choke point generation (2-4 narrow corridors, 3-4 cells wide)
- ✅ Expansion zone generation (2-3 per player, 8×8 buildable + tiberium radius 3)
- ✅ Pathfinding validation (automatic map regeneration, max 10 attempts)
- ✅ Seed logging (console output for reproducibility)
- ✅ Game.js integration (map size presets, choke point/expansion storage for AI)
- ✅ Terrain already integrated with pathfinding (CLIFF and DEEP_WATER unwalkable)
- ✅ Start positions symmetric (existing 2P layout preserved)

**Impact:** ~386 lines added. Maps now have tactical features (choke points, expansions) for strategic gameplay. AI can use choke points and expansions in Phase 4.

---

## Phase 4: AI Enhancement
**Goal:** Upgrade AI to feel like a human opponent

**Why this now:** With factions and maps complete, AI can use full game systems.

**Deliverables:**
- Smart build orders per faction (economic opener, tech rush, timing attack)
- Scouting behavior (explore map, track enemy expansions)
- Expansion logic (when to build new bases)
- Army composition (counter-unit selection based on enemy composition)
- Tactical combat (focus fire, retreat when losing, unit micro)
- Attack timing (don't attack when weak, press advantages)
- Difficulty scaling (Easy: slow/passive, Hard: fast/aggressive)

**Research needed:** Yes — RTS AI decision trees, finite state machines for strategy

**Success criteria:**
- AI builds bases, harvests resources, and produces units without human input
- AI adapts build order to map and faction matchup
- AI attacks at opportune moments (not suicidal or overly passive)
- Difficulty levels feel meaningfully different

---

## Phase 5: Performance & Testing
**Goal:** Hit 60 FPS with 100+ units, add unit tests for core systems

**Why this now:** Performance issues compound with more units. Test before final polish.

**Deliverables:**
- Universal object pooling (projectiles, units, particles)
- Dynamic off-screen culling (margin scales with zoom level)
- Hierarchical pathfinding or waypoint graphs
- Unit tests for:
  - Pathfinding correctness (A* algorithm, obstacle avoidance)
  - Economy calculations (harvest rates, resource costs)
  - Build validation (grid occupancy, power requirements)
  - Combat damage (damage formulas, armor, veterancy)
- Performance benchmark suite (measure FPS with 50, 100, 150 units)

**Research needed:** Yes — hierarchical pathfinding (HPA*, JPS+), JavaScript performance profiling

**Success criteria:**
- Maintain 60 FPS (or 50+ acceptable) with 100 units in combat
- Core test suite passes (80%+ coverage on tested systems)
- No memory leaks during 30+ minute matches
- Pathfinding doesn't stutter when 20+ units move simultaneously

---

## Phase 6: UI & Polish
**Goal:** Polished gameplay feel with responsive controls and clear feedback

**Why this now:** With systems stable, focus on player experience.

**Deliverables:**
- Skirmish setup screen (map size, player count, AI difficulty, starting resources)
- Responsive unit selection (hover highlights, selection boxes, formation indicators)
- Combat visual effects (projectile trails, explosions, damage numbers, muzzle flashes)
- Audio feedback (unit acknowledgments, building complete, attack warnings)
- Camera controls (pan with WASD/arrows, zoom with mouse wheel, edge scrolling)
- Minimap with fog of war
- Resource/power display in HUD
- Build queue visualization

**Research needed:** No — standard RTS UI patterns

**Success criteria:**
- Players can configure and start matches without confusion
- Unit selection feels snappy (< 50ms response)
- Combat has satisfying audiovisual feedback
- Camera controls are smooth and intuitive

---

## Phase 7: Integration & Balance
**Goal:** End-to-end playability and faction balance

**Why this last:** All systems must work together. Balance requires complete game.

**Deliverables:**
- Full match playthrough (setup → build → harvest → combat → victory)
- Faction balance tuning (win rates within 45-55% for each faction)
- AI personality tuning (Rusher vs Turtle vs Economist feel distinct)
- Game pacing tuning (matches finish in 15-30 minutes)
- Victory/defeat screens
- Game restart without memory leaks
- Final bug sweep (critical bugs fixed, minor bugs documented)

**Research needed:** No — playtesting and iteration

**Success criteria:**
- Complete match from start to finish works without crashes
- All 3 factions are competitively viable
- AI difficulty levels provide appropriate challenge
- Players report game is "fun and engaging"
- No critical bugs remain (game-breaking, data loss, crashes)

---

## Dependencies

```
Phase 1 (Foundation)
  ↓
Phase 2 (Factions) ←──┐
  ↓                    │
Phase 3 (Maps)         │
  ↓                    │
Phase 4 (AI) ←─────────┘
  ↓
Phase 5 (Performance/Tests)
  ↓
Phase 6 (UI/Polish)
  ↓
Phase 7 (Integration/Balance)
```

**Critical path:** 1 → 2 → 3 → 4 → 5 → 6 → 7

**Can parallelize:** Phase 5 (testing parts) can happen alongside Phase 6 (UI work)

---

## Research Phases

**Phase 3:** Procedural RTS map generation
- Algorithms for symmetric/mirrored map generation
- Balanced resource placement formulas
- Choke point identification

**Phase 4:** RTS AI decision-making
- Build order decision trees
- Unit composition counters
- Attack timing heuristics

**Phase 5:** Performance optimization
- Hierarchical pathfinding (HPA*, JPS+)
- JavaScript profiling best practices
- Object pooling patterns for large entity counts

---

*Last updated: 2026-01-11*
