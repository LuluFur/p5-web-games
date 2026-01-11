# Testing Practices

## Testing Framework

### TestRunner.js (Custom Lightweight Framework)

Project uses custom test framework instead of Jest/Mocha:

```javascript
TestRunner.suite(name, fn)      // Define test suite
TestRunner.test(description, fn) // Define test
TestRunner.assert(condition, msg) // Basic assertion
TestRunner.assertEqual(actual, expected)
TestRunner.assertDeepEqual(actual, expected)
TestRunner.assertInstanceOf(value, constructor)
TestRunner.assertThrows(fn)
TestRunner.run(suppressOutput = true) // Execute all tests
```

**Features:**
- ✅ Console output suppression during tests
- ✅ Pass/fail reporting with colored console output
- ✅ Test suites and grouping
- ✅ Async test support
- ✅ Error tracking and summary
- ✅ Available globally: `window.TestRunner`

**Location:** `src/utils/TestRunner.js` (260 lines)

## Test Coverage

### Primary Test File: BuilderTests.js (594 lines)

**Test Count:** ~50 tests

**Coverage Areas:**

#### A. Player.Builder Tests
- Create player with default values
- Create human/AI players
- Set AI personality
- Set start position

#### B. Unit.Builder Tests
- Create infantry, vehicle, harvester
- Override health, speed, armor
- Set unit owner
- Static factory methods

#### C. Building.Builder Tests
- Create barracks, power plant, construction yard
- Set building states (PLACING, CONSTRUCTING, ACTIVE)
- Set rally point, power output

#### D. Grid.Builder Tests
- Create grid with dimensions
- RTS vs Tower Defense mode
- Set level ID

#### E. Command.Builder Tests
- Move, attack, stop, patrol, harvest commands
- Error handling (throw without unit)

#### F. MapGenerator Tests
- Generate start positions
- Generate tiberium fields
- Reproducible seed
- Boundary checking

#### G. BuildingManager Tests
- Building type registry
- Building info cache

#### H. UnitBehavior Tests
- Harvester passive stance
- Speed bounds validation
- Config consistency

## Running Tests

**In Browser Console:**
```javascript
runBuilderTests()
```

**Output:**
```
=== Running Tests ===
[Suite] Player.Builder
  ✓ should create player with default values
  ✓ should create human player with custom values
...
=== Test Summary ===
47 passed, 0 failed (100%)
```

**Entry Point:** `BuilderTests.js:584-592`

## Manual Testing Procedures

From CONTRIBUTING.md:

### Tower Placement
- Build towers, verify cost deduction
- Test insufficient gold rejection
- Test path-blocking validation

### Wave Spawning
- Start wave, verify enemies spawn correctly
- Check pathfinding to base
- Verify wave completion rewards

### Combat
- Towers target and damage enemies
- Projectiles hit targets
- Particles spawn on hits/deaths

### Performance
- FPS stays above 50 on wave 15+
- Particle count caps at 500
- No memory leaks during long sessions

## Performance Profiling

**Browser DevTools:**
1. Check debug overlay (top-left) for FPS and entity counts
2. Chrome DevTools → Performance → Record during wave 15+
3. Look for:
   - Frame drops (target: 60 FPS, acceptable: 50+ FPS)
   - Long GC pauses (should be <10ms)
   - Draw call count

## Testing Coverage Assessment

### What IS Tested
- ✅ Builder pattern (fluent interfaces)
- ✅ Factory methods (unit, building, player creation)
- ✅ Object instantiation with defaults
- ✅ Configuration overrides
- ✅ Map generation logic
- ✅ Manager initialization
- ✅ Unit behavior (speed, stance)
- ✅ Building type registry

### Testing Gaps (What IS NOT Tested)
- ❌ Integration tests (managers working together)
- ❌ State machine transitions
- ❌ Combat calculations (damage, armor, DPS)
- ❌ Pathfinding algorithm
- ❌ Event system (emit/on)
- ❌ Update loops and timing
- ❌ Rendering logic
- ❌ Input handling
- ❌ AI decision-making
- ❌ Resource management
- ❌ UI interaction
- ❌ Performance-critical paths

## Test Statistics

- **Test Count:** ~50 tests (in BuilderTests.js)
- **Test Types:** Unit tests only (no integration, no E2E)
- **Coverage:** Estimated 10-15% of codebase
- **Framework:** Custom TestRunner (no external dependencies)

## Testing Approach

### Philosophy
1. **Builder Pattern Focused** - Tests fluent interfaces
2. **Happy Path Testing** - Primarily positive cases
3. **Basic Validation** - Type checking, instance verification
4. **No Mocking** - Tests create real objects
5. **Manual Testing Preference** - Browser-based testing documented

### Organization
- Tests grouped by component (Player, Unit, Building)
- One test suite per component
- Self-contained and independent tests
- Helper functions for common setup

### Error Handling in Tests
```javascript
TestRunner.assertThrows(() => {
    Command.Builder.create()
        .moveTo(100, 100)
        .build();
}, 'Should throw when unit not set');
```

## Recommendations

### Immediate Improvements
1. **Add integration tests** for state machines
2. **Add combat tests** for damage calculations
3. **Add AI tests** for decision-making
4. **Add performance benchmarks** (baseline FPS)

### Recommended Coverage Targets
- Pathfinding: 80% (critical, complex)
- Economy: 70% (important, moderate)
- AI: 50% (hard to test)
- UI: 30% (visual, manual testing sufficient)

### Missing Test Infrastructure
- ❌ No automated test runner in CI
- ❌ No performance regression tests
- ❌ No visual regression tests
- ❌ No balance testing framework
