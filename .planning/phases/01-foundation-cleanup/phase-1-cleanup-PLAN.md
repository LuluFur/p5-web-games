# PLAN: Foundation & Cleanup

**Phase 1 of 7** — Remove tower defense remnants, stabilize RTS architecture

---

## Objective

Remove all tower defense code to eliminate confusion and naming conflicts. Create a clean foundation for RTS-only development.

**Why this matters:** TD code (Tower.js with 7 subclasses) conflicts with RTS Building system. References in managers cause ambiguity. Must clean up before adding factions.

---

## Execution Context

**Mode:** YOLO (auto-approve, just execute)

**Codebase context:**
- @.planning/codebase/STRUCTURE.md (file organization)
- @.planning/codebase/ARCHITECTURE.md (manager pattern)
- @.planning/codebase/TESTING.md (BuilderTests.js status)

**Key files:**
- index.html (script loading order)
- src/Tower.js (53KB file with 7 subclasses)
- src/constants/GameConstants.js (may have TD constants)
- src/managers/{BuildingManager,InputManager,EventManager,StatsManager}.js (reference Tower classes)
- src/tests/BuilderTests.js (may test removed classes)

---

## Context

### Discovery Findings

**TD files found:**
- ✓ `src/Tower.js` — 53KB file with Tower base class + 7 subclasses (CannonTower, DoubleCannon, Flamethrower, Electrifier, SniperTower, BufferTower, SwapTower)
- ✓ Referenced in index.html:35 (`<script src="src/Tower.js"></script>`)

**TD references in other files:**
- BuildingManager.js — May reference Tower
- InputManager.js — May handle Tower drag/drop
- EventManager.js — May have tower-related events
- StatsManager.js — May track tower stats
- GameConstants.js — Contains some TD constants

**NOT found:**
- ❌ Enemy.js (already removed)
- ❌ WaveManager.js (already removed)
- ❌ TowerManager.js (already removed)

**RTS systems to preserve:**
- ✓ Building.js + subclasses (GuardTower is RTS building, not TD tower)
- ✓ Unit.js + subclasses
- ✓ All managers (clean up references only)

---

## Tasks

### Task 1: Remove Tower.js and index.html reference
**What:** Delete Tower.js file and remove script tag from index.html

**Why:** Tower class conflicts with Building-based RTS architecture

**How:**
1. Remove `<script src="src/Tower.js"></script>` from index.html (line 35)
2. Delete `src/Tower.js` file
3. Verify no compilation errors on page load

**Files modified:**
- index.html (remove 1 line)
- src/Tower.js (delete file)

**Verification:**
```bash
# Tower.js should not exist
[ ! -f src/Tower.js ] || { echo "ERROR: Tower.js still exists"; exit 1; }

# index.html should not reference Tower.js
grep -q "Tower.js" index.html && { echo "ERROR: index.html still references Tower.js"; exit 1; } || echo "OK"
```

---

### Task 2: Clean up TD references in managers
**What:** Remove or comment out Tower-specific code in manager files

**Why:** Managers referencing deleted Tower class will cause errors

**How:**
1. Search BuildingManager.js for "Tower" references (exclude "GuardTower" which is RTS)
2. Search InputManager.js for Tower drag/drop code
3. Search EventManager.js for tower-related event names
4. Search StatsManager.js for tower-specific stats tracking
5. Remove or comment out TD-specific code
6. Preserve all RTS Building/Unit code

**Files modified:**
- src/managers/BuildingManager.js (if Tower refs found)
- src/managers/InputManager.js (if Tower refs found)
- src/managers/EventManager.js (if Tower event names found)
- src/managers/StatsManager.js (if Tower stats found)

**Verification:**
```bash
# No manager files should reference "Tower" (except GuardTower comments)
grep -r "Tower[^G]" src/managers/*.js --exclude-dir=node_modules | grep -v "GuardTower" | grep -v "//" && { echo "ERROR: Tower references still exist"; exit 1; } || echo "OK"
```

---

### Task 3: Clean up TD constants in GameConstants.js
**What:** Remove tower defense-specific constants

**Why:** Unused constants pollute namespace and cause confusion

**How:**
1. Read GameConstants.js
2. Identify TD-specific constant objects (e.g., TOWER_STATS, WAVE_CONFIG, ENEMY_STATS)
3. Remove TD constants
4. Preserve RTS constants (RTS_UNITS, RTS_GRID, etc. in RTSConstants.js)
5. Add comment noting TD constants removed

**Files modified:**
- src/constants/GameConstants.js

**Verification:**
```bash
# GameConstants.js should not have TOWER_STATS or similar
grep -E "TOWER_STATS|WAVE_CONFIG|ENEMY_STATS" src/constants/GameConstants.js && { echo "ERROR: TD constants still exist"; exit 1; } || echo "OK"
```

---

### Task 4: Update BuilderTests.js
**What:** Remove or skip tests for deleted Tower classes

**Why:** Tests referencing Tower will fail after deletion

**How:**
1. Read src/tests/BuilderTests.js
2. Find tests for Tower, TowerManager, or TD-specific features
3. Remove those test suites or add `.skip()` if test framework supports it
4. Preserve all RTS tests (Unit, Building, Player, etc.)
5. Run tests to verify no failures

**Files modified:**
- src/tests/BuilderTests.js (if Tower tests exist)

**Verification:**
```bash
# Run tests in browser console (manual step)
# User should see: "X passed, 0 failed" with no Tower-related tests
echo "Manual verification: Open browser console and run runBuilderTests()"
```

---

### Task 5: Verify RTS game launches without errors
**What:** Start local server and verify game loads

**Why:** Ensure TD removal didn't break RTS functionality

**How:**
1. Start http-server: `npm start`
2. Open http://127.0.0.1:8000 in browser
3. Check browser console for errors
4. Verify RTS mode loads (no "Tower is not defined" errors)
5. Try basic RTS actions:
   - Place a building (Construction Yard)
   - Create a unit (Infantry)
   - Move a unit
   - Verify no crashes

**Files modified:** None (verification only)

**Verification:**
```bash
# Manual browser verification required
echo "Manual verification steps:"
echo "1. npm start"
echo "2. Open http://127.0.0.1:8000"
echo "3. Check console for errors"
echo "4. Click to start RTS game"
echo "5. Place building, create unit, move unit"
echo "6. Confirm no crashes"
```

---

## Verification Checklist

**Automated checks:**
- [ ] Tower.js file deleted
- [ ] index.html does not reference Tower.js
- [ ] No manager files reference Tower (except GuardTower)
- [ ] GameConstants.js has no TD constants (TOWER_STATS, WAVE_CONFIG, ENEMY_STATS)

**Manual checks:**
- [ ] Browser console shows no errors on page load
- [ ] RTS game mode launches successfully
- [ ] Can place buildings without errors
- [ ] Can create and move units without errors
- [ ] BuilderTests.js passes (or Tower tests removed/skipped)

---

## Success Criteria

**Phase complete when:**
1. ✅ Tower.js deleted and not referenced anywhere
2. ✅ All manager files cleaned of TD code
3. ✅ GameConstants.js has no TD-specific constants
4. ✅ BuilderTests.js passes (no Tower test failures)
5. ✅ RTS game launches and runs without errors
6. ✅ Basic RTS gameplay works (build, create, move)

**Definition of "clean foundation":**
- Zero references to Tower, Enemy, Wave classes in codebase
- RTS systems (Unit, Building, managers) work independently
- No naming confusion between TD and RTS concepts

---

## Output

**Modified files (5-8 estimated):**
- index.html (script tag removed)
- src/Tower.js (deleted)
- src/constants/GameConstants.js (TD constants removed)
- src/managers/BuildingManager.js (Tower refs removed, if any)
- src/managers/InputManager.js (Tower drag/drop removed, if any)
- src/managers/EventManager.js (Tower events removed, if any)
- src/managers/StatsManager.js (Tower stats removed, if any)
- src/tests/BuilderTests.js (Tower tests removed/skipped, if any)

**Git commit message:**
```
refactor: Remove tower defense remnants (Phase 1)

- Delete Tower.js (53KB, 7 subclasses)
- Remove Tower.js from index.html script loading
- Clean up Tower references in managers
- Remove TD constants from GameConstants.js
- Update BuilderTests.js (remove/skip Tower tests)

Stabilizes RTS-only architecture for faction system development.

Phase 1 of 7: Foundation & Cleanup
```

---

## Checkpoints

**After Task 1 (Remove Tower.js):**
- Expect: Page load errors referencing "Tower is not defined"
- Action: Continue to Task 2 to clean up references

**After Task 2 (Clean managers):**
- Expect: Fewer errors, but TD constants may still cause issues
- Action: Continue to Task 3

**After Task 3 (Clean constants):**
- Expect: Page loads without errors
- Action: Continue to Task 4 to fix tests

**After Task 4 (Update tests):**
- Expect: Tests pass
- Action: Continue to Task 5 for manual verification

**After Task 5 (Manual verification):**
- Expect: RTS game works
- Action: Commit and mark phase complete

---

## Risks & Mitigations

**Risk:** Accidentally delete RTS Building code (GuardTower is a Building, not Tower)
- **Mitigation:** Search carefully - "GuardTower" is RTS, "Tower" is TD
- **Recovery:** Git revert if needed

**Risk:** Manager cleanup breaks RTS functionality
- **Mitigation:** Test after each manager file change
- **Recovery:** Git revert specific manager file

**Risk:** BuilderTests.js has extensive Tower tests that are hard to remove
- **Mitigation:** Use test.skip() or comment out suites, don't delete infrastructure
- **Recovery:** Can re-enable tests later if needed

---

*Plan created: 2026-01-11*
*Estimated time: 1-2 hours*
*Complexity: Low (deletion and cleanup, no new code)*
