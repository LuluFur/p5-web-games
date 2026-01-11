# AI Enhancement Plan: Memory, Army Scaling & Base Building

## Overview
Enhance the AI with intelligent memory of discovered enemies, dynamic army composition based on threats, and smart base building with placement preferences.

---

## Phase 1: Enemy Discovery Memory System

### 1.1 Create EnemyMemory Class
- [ ] Create new file `src/ai/EnemyMemory.js`
  - [ ] Store discovered buildings with position, type, and timestamp
  - [ ] Store discovered units with type and last known position
  - [ ] Track threat level based on what was discovered
  - [ ] Mark entries as "confirmed destroyed" when building/unit dies
  - [ ] Add decay system for unit positions (units move, buildings don't)

**Data Structure:**
```javascript
{
  buildings: Map<entityId, {
    type: string,           // 'guard_tower', 'barracks', etc.
    position: {x, y},
    discoveredAt: timestamp,
    lastSeen: timestamp,
    destroyed: boolean,
    threatLevel: number     // 0-10 scale
  }>,
  units: Map<entityId, {
    type: string,
    lastKnownPosition: {x, y},
    lastSeen: timestamp,
    destroyed: boolean
  }>,
  estimatedEnemyStrength: number,  // Calculated from discoveries
  enemyBaseLocation: {x, y} | null // Estimated center of enemy base
}
```

**Notes:**
- Buildings are permanent memory (don't move)
- Unit positions decay after 30 seconds (they move)
- Threat level calculation: guard_tower=3, barracks=1, war_factory=2, tech_center=2, refinery=1, conyard=5

### 1.2 Integrate with EnemyDiscoveryTracker
- [ ] Modify `EnemyDiscoveryTracker.js` to feed discoveries into EnemyMemory
- [ ] On ENEMY_REVEALED event, add to memory
- [ ] On ENEMY_DESTROYED event (need to add), mark as destroyed in memory
- [ ] Calculate enemyBaseLocation as centroid of discovered buildings

### 1.3 Add ENEMY_DESTROYED Event
- [ ] Emit event when enemy building is destroyed
- [ ] Emit event when enemy unit is destroyed
- [ ] AIController listens and updates EnemyMemory

### 1.4 Memory Persistence Methods
- [ ] `getDiscoveredDefenses()` - returns all known defensive buildings
- [ ] `getDiscoveredProduction()` - returns barracks, war_factory, etc.
- [ ] `getEstimatedThreatLevel()` - total threat from all discoveries
- [ ] `getEnemyBaseCenter()` - estimated location to attack
- [ ] `hasDiscoveredEnemyBase()` - true if conyard or 3+ buildings found
- [ ] `clearDestroyedEntries()` - remove confirmed kills from memory

---

## Phase 2: Dynamic Army Composition Based on Discoveries

### 2.1 Threat Assessment System
- [ ] Add `assessRequiredArmy()` method to AIController
  - [ ] Calculate minimum army size based on discovered threats
  - [ ] Factor in difficulty multiplier
  - [ ] Consider defensive building count (guard towers need more units)

**Army Size Formula:**
```javascript
baseArmy = 6
threatMultiplier = enemyMemory.getEstimatedThreatLevel() * 0.5
difficultyBonus = { EASY: 0, NORMAL: 2, HARD: 4, BRUTAL: 6 }
requiredArmy = baseArmy + threatMultiplier + difficultyBonus[difficulty]
```

### 2.2 Composition Adaptation
- [ ] Modify `generatePatrolComposition()` to consider discoveries
  - [ ] If guard towers discovered: +2 Rocket Soldiers (outrange towers)
  - [ ] If war factory discovered: +1 Tank (expect vehicles)
  - [ ] If many infantry seen: +1 Tank (crushing damage)
  - [ ] If tech_center discovered: prioritize attack before elite units

**Composition Adjustment Table:**
| Discovery | Unit Adjustment | Reason |
|-----------|-----------------|--------|
| guard_tower | +2 ROCKET_SOLDIER | Long range to outrange tower |
| war_factory | +1 TANK | Counter enemy vehicles |
| barracks (2+) | +1 TANK | Crush infantry swarms |
| tech_center | Rush attack flag | Prevent elite units |
| artillery seen | +2 SCOUT_BUGGY | Fast flanking |

### 2.3 Attack Timing Based on Memory
- [ ] Don't patrol indefinitely - if enemy base discovered, prepare attack
- [ ] Add `shouldAttackNow()` method:
  - [ ] Returns true if: army >= requiredArmy AND hasDiscoveredEnemyBase()
  - [ ] Or if: tech_center discovered (rush before elite units)
- [ ] Transition from PATROL to ATTACKING when conditions met

### 2.4 Difficulty Scaling
- [ ] EASY: 75% of calculated army required, ignores some threats
- [ ] NORMAL: 100% of calculated army required
- [ ] HARD: 100% army + targets high-value buildings first
- [ ] BRUTAL: 125% army + coordinates multiple attack waves

---

## Phase 3: Stable Base Requirements System

### 3.1 Create BaseRequirements Configuration
- [ ] Add `STABLE_BASE_REQUIREMENTS` constant to AIController or new config file

**Structure:**
```javascript
const STABLE_BASE_REQUIREMENTS = {
  // Priority 1 = build first, higher = build later
  power_plant: {
    minCount: 2,
    maxCount: 4,
    priority: 1,
    placement: 'SPREAD',        // Spread apart to avoid chain destruction
    minSpacing: 5,              // Minimum cells between power plants
  },
  barracks: {
    minCount: 1,
    maxCount: 2,
    priority: 2,
    placement: 'NEAR_BASE',     // Close to ConYard
  },
  refinery: {
    minCount: 1,
    maxCount: 3,
    priority: 3,
    placement: 'NEAR_TIBERIUM', // Prioritize tiberium field proximity
    searchRadius: 15,           // Cells to search for tiberium
  },
  war_factory: {
    minCount: 1,
    maxCount: 2,
    priority: 4,
    placement: 'NEAR_BASE',
  },
  guard_tower: {
    minCount: 2,
    maxCount: 6,
    priority: 5,
    placement: 'PERIMETER',     // Edge of build radius
    coverageAngle: 60,          // Degrees between towers for coverage
  },
  tech_center: {
    minCount: 0,                // Optional
    maxCount: 1,
    priority: 6,
    placement: 'PROTECTED',     // Behind other buildings
  },
  silo: {
    minCount: 0,
    maxCount: 2,
    priority: 7,
    placement: 'ANY',
    triggerCondition: 'resources > 2000', // Only build when needed
  }
};
```

### 3.2 Placement Strategy Methods
- [ ] `findSpreadPlacement(buildingType, minSpacing)` - for power plants
  - [ ] Find positions that are at least minSpacing cells from existing same-type buildings
  - [ ] Prefer positions that maximize distance from all power plants

- [ ] `findNearTiberiumPlacement(buildingType, searchRadius)` - for refineries
  - [ ] Scan for tiberium cells within radius of build area
  - [ ] Score positions by: tiberiumCellsNearby * 10 - distanceFromBase
  - [ ] Return highest scoring valid position

- [ ] `findPerimeterPlacement(buildingType, coverageAngle)` - for guard towers
  - [ ] Calculate build radius circle
  - [ ] Find positions on outer edge of buildable area
  - [ ] Space towers by coverageAngle degrees for maximum coverage
  - [ ] Prioritize directions toward unexplored/enemy areas

- [ ] `findProtectedPlacement(buildingType)` - for tech center
  - [ ] Find position surrounded by other buildings
  - [ ] Maximize distance from build radius edge
  - [ ] Prefer position behind defensive towers

- [ ] `findNearBasePlacement(buildingType)` - for barracks, war_factory
  - [ ] Close to ConYard for quick rally
  - [ ] But not blocking expansion paths

### 3.3 Base Evaluation System
- [ ] Add `evaluateBaseStability()` method
  - [ ] Check each requirement against current buildings
  - [ ] Return array of missing/needed buildings with priority
  - [ ] Consider destroyed buildings (need rebuilding)

**Return Format:**
```javascript
{
  isStable: boolean,
  missingBuildings: [
    { type: 'power_plant', count: 1, priority: 1 },
    { type: 'guard_tower', count: 2, priority: 5 }
  ],
  nextBuildPriority: 'power_plant'
}
```

### 3.4 Integrate with Build Queue
- [ ] Modify `evaluateAndAdjustStrategy()` to use base requirements
- [ ] Before adding random buildings, check stability requirements
- [ ] Insert high-priority missing buildings at front of queue
- [ ] Respect placement preferences when calling `findBuildingPlacement()`

---

## Phase 4: Smart Placement Implementation

### 4.1 Tiberium Field Detection
- [ ] Add `findNearestTiberiumField(fromX, fromY, maxRadius)` method
  - [ ] Scan grid for tiberium cells
  - [ ] Return center of nearest tiberium cluster
  - [ ] Cache results (tiberium doesn't move frequently)

### 4.2 Build Radius Calculation
- [ ] Add `getBuildRadiusEdge(angle)` method
  - [ ] Given angle in degrees, return (x, y) on build radius perimeter
  - [ ] Used for guard tower placement

### 4.3 Spacing Validation
- [ ] Add `getDistanceToNearestBuilding(x, y, buildingType)` method
  - [ ] Check spacing requirements before placement
  - [ ] Return distance to nearest same-type building

### 4.4 Update findBuildingPlacement()
- [ ] Refactor to use placement strategy based on building type
- [ ] Call appropriate strategy method (spread, perimeter, etc.)
- [ ] Fall back to generic placement if strategy fails

---

## Phase 5: Integration & Testing

### 5.1 Wire Up All Systems
- [ ] Create EnemyMemory instance in AIController constructor
- [ ] Subscribe to discovery and destruction events
- [ ] Update army requirements after each discovery
- [ ] Use base requirements for build queue management

### 5.2 Add Debug Logging
- [ ] Log discoveries: `[AI] Discovered enemy guard_tower at (512, 768)`
- [ ] Log threat assessment: `[AI] Threat level: 7, Required army: 12`
- [ ] Log placement decisions: `[AI] Placing guard_tower at PERIMETER (angle: 45deg)`
- [ ] Log base stability: `[AI] Base unstable: missing 1 power_plant, 2 guard_towers`

### 5.3 Testing Scenarios
- [ ] Test: AI discovers enemy base, scales army appropriately
- [ ] Test: AI places refineries near tiberium
- [ ] Test: AI spreads power plants apart
- [ ] Test: AI places guard towers on perimeter
- [ ] Test: AI rebuilds destroyed buildings
- [ ] Test: Different difficulties produce different army sizes

---

## Implementation Order

1. **Phase 1.1-1.4**: Enemy Memory System (foundation for everything else)
2. **Phase 3.1**: Base Requirements Config (data structure)
3. **Phase 3.3**: Base Evaluation (can test with config)
4. **Phase 4.1-4.3**: Placement helpers (needed for smart placement)
5. **Phase 3.2**: Placement Strategies (uses helpers)
6. **Phase 3.4**: Build Queue Integration
7. **Phase 2.1-2.4**: Army Scaling (uses memory system)
8. **Phase 5**: Integration & Testing

---

## File Changes Summary

| File | Changes |
|------|---------|
| `src/ai/EnemyMemory.js` | NEW - Memory system for discoveries |
| `src/ai/AIController.js` | Add memory integration, base requirements, placement strategies |
| `src/ai/EnemyDiscoveryTracker.js` | Feed discoveries to memory |
| `src/managers/EventManager.js` | Add ENEMY_DESTROYED event |
| `src/Building.js` or `src/Unit.js` | Emit destruction events |
| `index.html` | Add EnemyMemory.js script |

---

## Notes & Considerations

- **Performance**: Cache tiberium field locations, don't scan every frame
- **Memory cleanup**: Remove very old unit sightings (> 5 minutes)
- **Placement fallback**: If smart placement fails, use generic spiral search
- **Difficulty balance**: Easy AI should make "mistakes" in placement
- **Multiplayer ready**: Each AI has own EnemyMemory instance
