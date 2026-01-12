# Phase 3 Implementation Plan: Procedural Map Generation

**Status:** Ready for execution
**Created:** 2026-01-11
**Estimated tasks:** 6

---

## Context

Phase 3 enhances the existing procedural map generation system to support configurable map sizes, guaranteed choke points, and full pathfinding integration.

**Discovery findings:**
- MapGenerator.js already exists with Perlin noise terrain, rivers, tiberium fields, and start positions
- Grid.js has terrain array with TERRAIN_TYPES (GRASS, CLIFF, WATER, etc.) and movement restrictions
- TerrainConstants.js defines terrain properties (walkable, buildable, speedModifier)
- Current implementation is hardcoded to 30×40 maps, needs configurable sizes
- Need to verify choke points are guaranteed and pathfinding integration is complete

**Phase 3 goals from roadmap:**
- Map size configuration (64×64, 96×96, 128×128)
- Guaranteed choke points and expansion locations
- Cliff barriers with pathfinding integration
- Water tiles with movement restrictions (already implemented)
- Balanced Tiberium placement (already implemented)
- Symmetric start positions (already implemented)

---

## Tasks

### Task 1: Add map size configuration system
**What:** Extend MapGenerator to support small (64×64), medium (96×96), large (128×128) presets
**Why:** Roadmap requires configurable map sizes, currently hardcoded to 30×40
**Files:** src/MapGenerator.js, src/constants/RTSConstants.js
**Actions:**
1. Add MAP_SIZES constant to RTSConstants.js with presets (SMALL, MEDIUM, LARGE)
2. Update MapGenerator constructor to accept sizePreset parameter
3. Update Builder class with withSize() and withSizePreset() methods
4. Adjust noiseScale and riverNoiseScale based on map size for consistent features
5. Update minBaseClearance scaling for larger maps

**Success criteria:**
- MapGenerator can generate 64×64, 96×96, and 128×128 maps
- Terrain features scale appropriately with map size
- Builder pattern supports size configuration

---

### Task 2: Implement guaranteed choke point generation
**What:** Add explicit choke point creation between bases and expansions
**Why:** Roadmap requires tactical choke points for defensive gameplay
**Files:** src/MapGenerator.js
**Actions:**
1. Add chokePoints array to MapGenerator class
2. Create generateChokePoints() method called after start positions
3. Place 2-4 narrow corridors (3-4 cells wide) between player bases
4. Mark choke point regions to prevent tiberium/terrain feature placement
5. Apply choke points to surfaceMap as narrow sand corridors through terrain
6. Add getChokePoints() accessor method

**Success criteria:**
- Maps have 2-4 identifiable choke points between bases
- Choke points are 3-4 cells wide (narrower than normal paths)
- Choke points are clear of tiberium fields and blocking terrain

---

### Task 3: Add expansion location generation
**What:** Generate designated expansion zones with nearby tiberium
**Why:** RTS maps need strategic expansion points for mid-game economy
**Files:** src/MapGenerator.js
**Actions:**
1. Add expansionZones array to MapGenerator class
2. Create generateExpansionZones() method called after tiberium generation
3. Place 2-3 expansion zones per player at medium distance from base (15-25 cells)
4. Each expansion has: clear buildable area (8×8), nearby tiberium field (radius 3)
5. Ensure expansion zones are equidistant from all player bases (balanced)
6. Add getExpansionZones() accessor method

**Success criteria:**
- Maps have 4-6 expansion zones (2-3 per player in 2P)
- Each expansion has buildable area + tiberium
- Expansions are balanced (equal distance from bases)

---

### Task 4: Integrate terrain with pathfinding validation
**What:** Verify cliff/water blocking works with Pathfinder, fix any issues
**Why:** Roadmap requires pathfinding integration with terrain
**Files:** src/Pathfinder.js, src/Grid.js, src/MapGenerator.js
**Actions:**
1. Read Pathfinder.js to understand how it checks walkability
2. Verify Pathfinder uses grid.isWalkable() which checks terrain properties
3. Test that CLIFF and WATER terrains are unwalkable in pathfinding
4. Add validatePathfinding() method to MapGenerator that tests base-to-base paths exist
5. If no valid path found between bases, regenerate map (max 10 attempts)
6. Log warnings if pathfinding validation fails

**Success criteria:**
- Units cannot path through CLIFF or DEEP_WATER tiles
- MapGenerator.generate() validates at least one path exists between all bases
- Maps regenerate if no valid path found

---

### Task 5: Add map variation verification
**What:** Ensure no two maps are identical using seed system
**Why:** Roadmap success criteria requires unique maps
**Files:** src/MapGenerator.js, src/Game.js
**Actions:**
1. Verify MapGenerator uses seed for all random generation (already implemented)
2. In Game.js, generate random seed if not provided (already done)
3. Add getMapSeed() method to MapGenerator for display/debug
4. Log map seed to console on generation
5. Test: Generate 10 maps with different seeds, verify surfaceMap differs
6. Add optional seedHistory tracking to prevent duplicate seeds in session

**Success criteria:**
- Each game uses different seed (unless manually specified)
- Console shows "Map generated with seed: XXXXX"
- Identical seeds produce identical maps (reproducibility)
- Different seeds produce different maps

---

### Task 6: Update Game.js to use new map configuration
**What:** Integrate map size selection and expose new features to game systems
**Why:** Make new features accessible to game code
**Files:** src/Game.js, src/constants/RTSConstants.js
**Actions:**
1. Add mapSize to rtsSettings config (defaults to MEDIUM)
2. Update MapGenerator initialization to use rtsSettings.mapSize
3. Store chokePoints and expansionZones references in Game instance
4. Update grid initialization to match selected map size
5. Adjust camera bounds for different map sizes
6. Add optional debug rendering for choke points and expansion zones

**Success criteria:**
- Game.js can initialize maps of different sizes
- rtsSettings.mapSize controls map generation
- Choke points and expansion zones are accessible to AI (Phase 4)

---

## Verification Steps

After completing all tasks:

1. **Map size test:**
   - Generate SMALL (64×64), MEDIUM (96×96), LARGE (128×128) maps
   - Verify terrain features scale appropriately
   - Check performance (FPS) on LARGE maps

2. **Choke point test:**
   - Generate 5 maps, visually identify choke points
   - Verify choke points are 3-4 cells wide
   - Check units can path through choke points

3. **Expansion test:**
   - Generate map, locate all expansion zones
   - Verify each has buildable area + tiberium
   - Measure distances to confirm balance

4. **Pathfinding test:**
   - Generate 10 maps, verify no impassable maps
   - Test unit movement from base to all tiberium fields
   - Verify cliffs/water block pathing correctly

5. **Uniqueness test:**
   - Generate 20 maps, verify all have different seeds
   - Spot-check surfaceMaps to confirm variation
   - Verify identical seeds produce identical maps

---

## Dependencies

**Required before Phase 3:**
- ✅ Phase 1 complete (foundation cleaned)
- ✅ Phase 2 complete (faction system integrated)

**Required for Phase 3:**
- MapGenerator.js (already exists)
- Grid.js with terrain array (already exists)
- TerrainConstants.js (already exists)
- Pathfinder.js (needs integration check)

**Enables future phases:**
- Phase 4: AI can use choke points and expansion zones strategically
- Phase 6: UI can show map size selection
- Phase 7: Playtesting can evaluate map balance

---

## Implementation Notes

**Existing functionality to preserve:**
- ✅ Perlin noise terrain generation (generateSurfaceMap)
- ✅ River generation (generateRivers, carveRiver)
- ✅ Tiberium field placement (generateTiberiumFields)
- ✅ Start position layouts (SYMMETRIC_2P, 4P, ASYMMETRIC, LANES)
- ✅ Path clearances (calculatePathClearances)
- ✅ Terrain features (rocks, cliffs, craters)
- ✅ Builder pattern API
- ✅ Seeded random for reproducibility

**New additions:**
- Map size configuration (MAP_SIZES constant)
- Choke point generation (chokePoints array)
- Expansion zone generation (expansionZones array)
- Pathfinding validation (validatePathfinding method)
- Seed logging and verification

**Code style:**
- Follow existing MapGenerator patterns
- Use Builder pattern for configuration
- Add comments explaining choke point and expansion algorithms
- Log generation steps to console for debugging

---

## Success Criteria (from Roadmap)

- ✅ No two games have identical maps → Task 5 (seed verification)
- ✅ Players spawn with equal access to resources → Already implemented (symmetric tiberium)
- ✅ Maps have defendable choke points and expansion opportunities → Tasks 2, 3
- ✅ Pathfinding works correctly with terrain → Task 4

---

## Commit Strategy

**Commit 1:** Map size configuration system (Task 1)
- Add MAP_SIZES to RTSConstants.js
- Update MapGenerator constructor and Builder
- Test size presets

**Commit 2:** Choke points and expansion zones (Tasks 2, 3)
- Add chokePoints generation
- Add expansionZones generation
- Test tactical features

**Commit 3:** Pathfinding integration and verification (Tasks 4, 5, 6)
- Validate pathfinding with terrain
- Add seed logging and uniqueness checks
- Integrate with Game.js

---

## Risks and Mitigations

**Risk:** Large maps (128×128) cause performance issues
**Mitigation:** Profile rendering, add culling if needed, consider reducing default to 96×96

**Risk:** Pathfinding validation slows down map generation
**Mitigation:** Only validate critical paths (base-to-base), skip full coverage check

**Risk:** Choke points block all paths to expansions
**Mitigation:** Generate choke points first, then place expansions with path validation

**Risk:** Perlin noise doesn't scale well to larger maps
**Mitigation:** Adjust noiseScale based on map size to maintain feature density

---

*Ready for execution with `/gsd:execute-plan`*
