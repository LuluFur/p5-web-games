# Plan: Implement AI Decision-Making Based on Progression Values

## Overview
AI builds its unit/building queue and strategy entirely based on current progression values. Different progression states trigger different behaviors, creating adaptive, strategic AI.

## Design Details

### Decision Framework
AI decision tree based on progression values:
```
IF base_defence_progress < 20:
  STRATEGY: Build defensive structures
  BUILD_PRIORITY: Watchtowers, walls, anti-air

ELIF base_expansion_progress < 30:
  STRATEGY: Expand territory and resources
  BUILD_PRIORITY: Resource buildings, expansion buildings

ELIF map_exploration_progress < 50:
  STRATEGY: Scout and explore map
  BUILD_PRIORITY: Radar, scout units

ELIF enemies_defeated_progress < 40:
  STRATEGY: Build military and attack
  BUILD_PRIORITY: Barracks, attack units, tech units

...etc
```

### Progression Thresholds
Define thresholds where AI behavior shifts:
- 0-25: Defensive phase (build defenses, limited expansion)
- 25-50: Expansion phase (build infrastructure, claim territory)
- 50-75: Exploration phase (scout, map control)
- 75-100: Offensive phase (build army, attack enemies)

### Build Queue System
1. Calculate priority for each building type
2. Rank by strategic value given current progression
3. Build in priority order

Example:
```javascript
buildPriority = {
  watchtower: progression.base_defence < 30 ? 100 : 20,
  barracks: progression.enemies_defeated < 50 ? 80 : 60,
  refinery: progression.base_expansion < 40 ? 90 : 50,
  radar: progression.map_exploration < 50 ? 70 : 30,
  tech_lab: progression.base_technology < 60 ? 85 : 75
}

// AI builds highest priority first
```

### Strategy Adaptation
AI adapts strategy based on progression state:
- Low defence: Defensive positions, watchtower chains
- High defence but low expansion: Aggressive expansion
- High everything: Balanced military + economy

### Implementation Approach
1. Create `src/managers/AIStrategyManager.js`:
   - Takes PlayerProgression as input
   - Returns build queue/unit composition
   - Defines progression thresholds

2. Modify `src/managers/AIManager.js`:
   - Call AIStrategyManager each decision cycle
   - Get build/unit priorities
   - Execute in order

3. Update build decisions:
   - Instead of hardcoded logic, use progression-based thresholds
   - Allow for emergent, adaptive behaviors

## Behavior Examples
**Easy AI (simplified)**:
- Focuses on building economy
- Limited military
- Slow expansion
- Defensive only

**Normal AI (balanced)**:
- Balanced defense/offense
- Adaptive to map and opponent
- Expansion and exploration

**Hard AI (aggressive)**:
- Rapid expansion
- Aggressive exploration
- Military-focused
- Quick adaptation to threats

## Files to Create/Modify
- `src/managers/AIStrategyManager.js` (NEW)
- `src/managers/AIManager.js` (integrate strategy)
- `src/constants/GameConstants.js` (define progression thresholds)

## Dependencies
- PlayerProgression system (from Progression Tracking plan)
- Grace Period system (delays military actions)

## Status
Ready for implementation after Progression Tracking is complete
