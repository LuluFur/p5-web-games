# Plan: Implement Grace Period - AI Waits Before Attacking

## Overview
AI waits a configurable grace period based on difficulty before launching attacks. Gives players time to build up defenses.

## Design Details

### Grace Period Timings
- **Easy**: 5 minutes
- **Normal**: 3 minutes
- **Hard**: 1 minute

### Timer Behavior
- Starts when game begins (or when AI spawns in multi-player)
- During grace period: AI still builds, explores, expands
- After grace period: AI begins military operations (attacks)

### Implementation Approach
1. Add grace period timer to AI player state:
   ```javascript
   aiPlayer.gracePeriodMs = 5 * 60 * 1000  // Easy: 5 min
   aiPlayer.gracePeriodActive = true
   aiPlayer.gracePeriodStartTime = gameStartTime
   ```

2. Create `isInGracePeriod(aiPlayer)` check:
   - Returns true if `currentTime < startTime + gracePeriodMs`
   - Used to gate attack decisions

3. Update AI decision-making:
   - If in grace period: only build/explore, no attacks
   - If not in grace period: normal AI behavior

4. Display visual indicator (optional):
   - Show timer to human players
   - "AI will attack in X seconds"

## Files to Modify
- `src/managers/AIManager.js` (add grace period timer)
- `src/Game.js` (pass difficulty to AI init)
- `src/constants/GameConstants.js` (define grace period values)

## Dependencies
- AI system initialization with difficulty level

## Status
Ready for implementation
