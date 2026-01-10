# Plan: Fix Enemy AI Targeting - Target Nearest Building

## Overview
Improve AI targeting logic to choose targets based on threat level, fog of war visibility, and euclidean distance. Use event-based retargeting instead of recalculating every frame.

## Design Details

### Targeting Priority
1. **Watchtowers first** when discovered during exploration (highest threat)
2. **Threat level calculation**: Defense > Tech > Production > Other
3. **Fog of war constraint**: Only target buildings visible to AI
4. **Euclidean distance**: Break ties using distance

### Threat Level Scoring
```
threatScore = (threatLevel * 1000) + (1 / distance)
Example:
- Watchtower (threat=3): 3000 + 1/distance
- Defense building (threat=2): 2000 + 1/distance
- Tech building (threat=1): 1000 + 1/distance
- Production (threat=0): 0 + 1/distance

Select building with highest threatScore
```

### Event-Based Retargeting
Retarget only when these events occur:
1. **Building destroyed** - current target gone
2. **New building built** - new threat appeared
3. **Building damaged** - threat level changes
4. **Fog of war discovered** - new buildings visible
5. **Threat changed** - building upgraded/downgraded

### Implementation Approach
1. Add `threatLevel` property to Building class
2. Create `calculateThreatScore(building, aiPlayer)` function
3. Store current target in AI player state
4. Subscribe to building events (destroyed, built, damaged, discovered)
5. On event trigger: recalculate best target using `findBestTarget()`

## Files to Modify
- `src/Building.js` (add threatLevel property)
- `src/managers/AIManager.js` or new `AITargetingManager.js`
- `src/Game.js` (integrate event listeners)

## Dependencies
- VisibilityManager (for fog of war checks)
- Building/Unit event system (for event-based triggers)

## Status
Ready for implementation after VisibilityManager
