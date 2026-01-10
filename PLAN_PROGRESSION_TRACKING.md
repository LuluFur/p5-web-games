# Plan: Add Player Progression Tracking System

## Overview
Implement persistent progression tracking for both human and AI players. Seven metrics track game state for AI decision-making and human achievement tracking.

## Design Details

### Progression Values
Each player (human or AI) has these 7 values:
1. **base_defence_progress** - Defensive building count/upgrades (0-100+)
2. **base_expansion_progress** - Territory/resource buildings placed (0-100+)
3. **base_technology_progress** - Technology/research level (0-100+)
4. **map_exploration_progress** - Percentage of map explored (0-100)
5. **map_coverage_progress** - Percentage of map controlled (0-100)
6. **map_tiberium_fields_contained_progress** - Resource fields secured (0-100+)
7. **enemies_defeated_progress** - Unit kills/battles won (0-100+)

### Data Structure
```javascript
PlayerProgression {
  playerId: "human" or "ai_1" etc,
  playerSide: "human" or "ai",
  difficulty: "easy" or "normal" or "hard",

  base_defence_progress: 0,
  base_expansion_progress: 0,
  base_technology_progress: 0,
  map_exploration_progress: 0,
  map_coverage_progress: 0,
  map_tiberium_fields_contained_progress: 0,
  enemies_defeated_progress: 0,

  lastUpdated: timestamp,
  sessionId: "game_session_123"
}
```

### Persistence
- Save to JSON file per player: `saves/progression_[playerId].json`
- Load at game start if file exists
- Create new progression (all zeros) if file doesn't exist
- Save on game end or periodically during gameplay

### Initialization
- Start all values at 0
- Increment based on game actions:
  - Place defense building → base_defence_progress += amount
  - Explore new area → map_exploration_progress += amount
  - Kill enemy unit → enemies_defeated_progress += amount
  - etc.

### Access Pattern
```javascript
playerProgression.getProgress("base_defence")  // returns 0-100+
playerProgression.incrementProgress("enemies_defeated", 5)
playerProgression.save()  // write to JSON
```

## Implementation Approach
1. Create `src/managers/ProgressionManager.js`:
   - Load/save JSON progressions
   - Provide getters/setters for each value
   - Auto-save on periodic intervals

2. Modify `src/Game.js`:
   - Initialize ProgressionManager at game start
   - Pass progression to AI for decision-making

3. Add increment calls throughout game:
   - Building placed → increment base expansion
   - Enemy killed → increment enemies defeated
   - New area explored → increment exploration
   - Territory claimed → increment coverage

4. Create JSON storage:
   - Directory: `saves/` (create if not exists)
   - Format: `progression_[playerId].json`

## Files to Create/Modify
- `src/managers/ProgressionManager.js` (NEW)
- `src/Game.js` (initialize and integrate)
- `src/Building.js` (call increment on placement)
- `src/Unit.js` (call increment on enemy kill)

## Storage Location
- Saves stored in `saves/` directory relative to project root
- One JSON file per player: `progression_human.json`, `progression_ai_1.json`

## Dependencies
- File system access for persistence

## Status
Ready for implementation
