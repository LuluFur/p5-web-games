# Plan: Test and Implement Fog of War System

## Overview
Implement a visibility/fog of war system where AI and player units only see within their vision range. This is foundational for all other AI improvements.

## Implementation Details

### Vision Range System
- **Variable by type**: Different unit types and building types have different vision ranges
- Store vision radius as property on each unit/building class
- Example structure:
  ```
  Unit {
    visionRange: 150  // pixels
  }
  Building {
    visionRange: 200  // pixels
  }
  ```

### Visibility Tracking
- Create `VisibilityManager` to track what each player/AI can see
- For each player, maintain a set of visible entities/positions
- Recalculate visibility each frame based on:
  - All units controlled by player
  - All buildings placed by player
  - Vision range of each unit/building

### Implementation Approach
1. Create `src/managers/VisibilityManager.js`
2. Add vision range properties to Unit and Building classes
3. Update rendering to show fog of war (optional: dark overlay for unseen areas)
4. Implement visibility check: `isVisible(entity, playerSide)`

### Testing
- Manual: Place units/buildings and verify vision reveals/hides entities
- Verify vision radius matches tuned values per type
- Test that moving units updates visible area in real-time

## Files to Create/Modify
- `src/managers/VisibilityManager.js` (NEW)
- `src/Unit.js` (add visionRange property)
- `src/Building.js` (add visionRange property)
- `src/Game.js` (integrate VisibilityManager)

## Dependencies
- None (foundational system)

## Status
Ready for implementation
