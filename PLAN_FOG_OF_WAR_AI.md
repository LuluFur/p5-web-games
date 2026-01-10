# Plan: Implement Fog of War for Enemy AI

## Overview
AI units and buildings only see within their vision range. AI cannot see enemy bases until it explores with units or expands with buildings. This creates asymmetric knowledge.

## Design Details

### Exploration Mechanic
- **Unit exploration**: AI units move around map, revealing what they see
- **Building expansion**: When AI places buildings, they also provide vision
- Vision expands dynamically as AI explores/builds

### Knowledge System
AI maintains separate "known map state":
- Known enemy positions (from past sightings)
- Known building locations (from exploration)
- Last seen time for each entity

### Fog of War States
For each enemy entity:
- **Visible**: Currently within an AI unit/building's vision range
- **Known**: Was visible in past, position remembered
- **Unknown**: Never seen before

### Information Decay (Optional)
- Keep memory of last seen position for X seconds
- After timeout, treat as "unknown" again
- Creates realistic "units disappeared" scenarios

## Implementation Approach
1. Extend VisibilityManager to track:
   - Current visible entities per player
   - Known/remembered entity positions
   - Last seen timestamp

2. Create `AIKnowledgeManager` to store AI's understanding of map:
   - Enemy base positions (discovered)
   - Enemy unit locations (last known)
   - Unexplored map regions

3. Update AI decision-making to use only known information:
   - Don't know about buildings until explored
   - Target decisions based on visible/known enemies only

4. Hide enemy units/buildings in rendering if not visible to AI

## Files to Create/Modify
- `src/managers/VisibilityManager.js` (enhance with knowledge tracking)
- `src/managers/AIKnowledgeManager.js` (NEW)
- `src/Game.js` (use visibility checks when rendering for AI)

## Dependencies
- VisibilityManager (from Fog of War plan)

## Status
Ready for implementation after VisibilityManager and AI Targeting fixes
