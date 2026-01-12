# PLAN: AI Enhancement

**Phase 4 of 7** — Upgrade AI to feel like a human opponent with faction-aware strategies

---

## Objective

Enhance the existing AI system (AIController.js, 1,655 lines) to leverage Phase 2 factions and Phase 3 map features. Make AI feel intelligent by using faction-specific build orders, exploiting choke points, capturing expansions, and adapting to enemy composition.

**Why this matters:** The AI is the primary opponent. Without smart AI, the game feels hollow even with factions and maps working.

---

## Execution Context

**Mode:** YOLO (auto-approve, just execute)

**Codebase context:**
- @.planning/codebase/ARCHITECTURE.md (manager pattern, event system)
- @.planning/codebase/STRUCTURE.md (file organization)
- @src/ai/AIController.js (existing AI system - 1,655 lines)
- @src/constants/RTSConstants.js (RTS_FACTIONS, RTS_AI_WEIGHTS)
- @src/Player.js (faction property, progression tracking)
- @src/Game.js (chokePoints, expansionZones from Phase 3)

**Key files:**
- src/ai/AIController.js (main AI logic)
- src/constants/RTSConstants.js (AI personalities, faction data)
- src/Player.js (progression tracking)
- src/Game.js (access to map features)

---

## Context

### Discovery Findings

**Existing AI capabilities:**
- ✓ AIController.js exists with 1,655 lines
- ✓ 4 personality types: BALANCED, RUSHER, TURTLE, ECONOMIST
- ✓ 4 difficulty levels: EASY, NORMAL, HARD, BRUTAL
- ✓ Build order execution (queue system)
- ✓ Unit production (infantry, vehicles)
- ✓ Attack logic (army rallying, target selection)
- ✓ Scouting/exploration system
- ✓ Player progression tracking (8 metrics in Player.progression)
- ✓ State machine (BUILDING, EXPANDING, MASSING, ATTACKING, DEFENDING, EXPLORING, PATROL)

**Missing integrations (from Phase 2 & 3):**
- ❌ No faction-specific build orders (AI doesn't use faction rosters)
- ❌ No choke point awareness (game.chokePoints unused)
- ❌ No expansion zone capture logic (game.expansionZones unused)
- ❌ No counter-unit selection based on enemy faction
- ❌ No retreat logic (units fight to death)
- ❌ Build orders use generic unit names ('infantry', 'vehicle') instead of faction units

**RTSConstants.js AI data:**
- ✓ RTS_AI_WEIGHTS exist with 5 personalities: TURTLE, RUSHER, MIDGAME_RUSHER, EXPLORER, EXPANDER
- ✓ Each has buildOrder, preferredUnits, attackThreshold, economy/defense/aggression weights
- ✓ RTS_AI_DIFFICULTY has 4 levels with resourceMultiplier, buildSpeedMultiplier, decisionDelay

**Architecture patterns to follow:**
- ✓ State machine pattern (AI_STATE already implemented)
- ✓ Event-driven (should listen to ENEMY_REVEALED, BUILDING_PLACED, etc.)
- ✓ Data-driven (build orders, weights from RTSConstants.js)

---

## Tasks

### Task 1: Make AI faction-aware (build orders)
**What:** Update AIController to use faction-specific units from player.factionData

**Why:** AI currently requests generic 'infantry' and 'vehicle' units, which don't match faction rosters (RIFLEMAN, MILITANT, SHOCK_TROOPER, etc.)

**How:**
1. Read AIController.js initializeBuildOrder() method (~line 147-210)
2. Add `getFactionUnit(genericType)` method:
   - Maps generic types ('infantry', 'vehicle', 'harvester') to faction-specific units
   - Example: 'infantry' → 'RIFLEMAN' (Alliance), 'MILITANT' (Syndicate), 'SHOCK_TROOPER' (Collective)
   - Uses this.player.factionData.units to find appropriate unit
3. Add `getFactionBuilding(genericType)` method:
   - Maps generic building types to faction-specific names
   - Example: 'barracks' → 'BARRACKS' (Alliance), 'HAND_OF_NOD' (Syndicate), 'PORTAL' (Collective)
4. Update initializeBuildOrder() to use RTS_AI_WEIGHTS from RTSConstants.js:
   - Read buildOrder from RTS_AI_WEIGHTS[this.personality]
   - Use preferredUnits from personality config
5. Update executeBuildOrder() to translate unit/building names using faction methods
6. Test that AI builds faction-specific units

**Files modified:**
- src/ai/AIController.js

**Verification:**
```bash
# AIController should have faction translation methods
grep -q "getFactionUnit" src/ai/AIController.js || { echo "ERROR: getFactionUnit missing"; exit 1; }
grep -q "getFactionBuilding" src/ai/AIController.js || { echo "ERROR: getFactionBuilding missing"; exit 1; }

# Should use RTS_AI_WEIGHTS
grep -q "RTS_AI_WEIGHTS" src/ai/AIController.js || { echo "WARNING: Not using RTS_AI_WEIGHTS"; }
```

---

### Task 2: Implement expansion zone capture logic
**What:** Add AI behavior to build bases at expansion zones (from Phase 3)

**Why:** Expansions are strategic locations with tiberium. AI should compete for them.

**How:**
1. Read AIController.js update() method to understand decision flow
2. Add `evaluateExpansionOpportunities()` method:
   - Access game.expansionZones (set in Game.js during Phase 3)
   - Filter expansions by distance from AI base (prefer 15-25 cell range)
   - Check if expansion is contested (enemy units nearby)
   - Score expansions: closer + more tiberium + less contested = higher score
   - Return best expansion candidate
3. Add `captureExpansion(expansion)` method:
   - Queue CONSTRUCTION_YARD building at expansion.gridX, expansion.gridY
   - Send 2-3 units to guard expansion site
   - Mark expansion as "claimed" to prevent re-evaluation
4. Update AI_STATE machine to include EXPANDING state logic:
   - Trigger when economy needs boost (tiberium income < spending rate)
   - Trigger when base_expansion_progress < 50
   - Build Construction Yard at best expansion
5. Add expansion timing based on AI difficulty:
   - EASY: Expand after 10 minutes
   - NORMAL: Expand after 7 minutes
   - HARD: Expand after 5 minutes
   - BRUTAL: Expand after 3 minutes

**Files modified:**
- src/ai/AIController.js

**Example code pattern:**
```javascript
evaluateExpansionOpportunities() {
    if (!this.game?.expansionZones || this.game.expansionZones.length === 0) {
        return null;
    }

    const myBase = this.player.startPosition;
    const scored = this.game.expansionZones.map(exp => {
        const dist = Math.hypot(exp.pixelX - myBase.x, exp.pixelY - myBase.y);
        const normalizedDist = 1 - (dist / 1000); // Closer = better
        const tiberiumValue = exp.tiberiumField?.density || 0;
        const contested = this.isExpansionContested(exp) ? 0.5 : 1.0;

        return {
            expansion: exp,
            score: normalizedDist * tiberiumValue * contested
        };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored[0]?.expansion || null;
}
```

**Verification:**
```bash
# AIController should have expansion methods
grep -q "evaluateExpansionOpportunities" src/ai/AIController.js || { echo "ERROR: expansion evaluation missing"; exit 1; }
grep -q "captureExpansion" src/ai/AIController.js || { echo "ERROR: expansion capture missing"; exit 1; }
```

---

### Task 3: Add choke point defensive positioning
**What:** Make AI use choke points for defense (from Phase 3)

**Why:** Choke points are tactical locations. AI should defend them instead of random positions.

**How:**
1. Read AIController.js defendBase() method
2. Add `getNearestChokePoint(position)` method:
   - Access game.chokePoints (set in Game.js during Phase 3)
   - Find choke point nearest to given position
   - Return choke point data (gridX, gridY, width, angle)
3. Update defendBase() logic:
   - When under attack, find choke point between enemy and base
   - Move defensive units to choke point
   - Hold position at choke (set stance to HOLD_POSITION)
4. Add `isChokePointDefended(chokePoint)` check:
   - Count friendly units at choke point
   - Return true if >= 3 units present
5. Update TURTLE personality to prioritize choke defense:
   - Build guard towers at choke points
   - Station units at chokes when not attacking

**Files modified:**
- src/ai/AIController.js

**Example code pattern:**
```javascript
getNearestChokePoint(position) {
    if (!this.game?.chokePoints || this.game.chokePoints.length === 0) {
        return null;
    }

    let nearest = null;
    let minDist = Infinity;

    for (const choke of this.game.chokePoints) {
        const dist = Math.hypot(choke.pixelX - position.x, choke.pixelY - position.y);
        if (dist < minDist) {
            minDist = dist;
            nearest = choke;
        }
    }

    return nearest;
}

defendBase() {
    const enemyThreat = this.getNearestEnemyThreat();
    if (!enemyThreat) return;

    const myBase = this.player.startPosition;
    const chokePoint = this.getNearestChokePoint(myBase);

    if (chokePoint && !this.isChokePointDefended(chokePoint)) {
        // Move defensive units to choke point
        const defenders = this.getAvailableDefenders();
        for (const unit of defenders) {
            const moveCmd = new MoveCommand(unit, chokePoint.pixelX, chokePoint.pixelY);
            unit.queueCommand(moveCmd);
            unit.stance = RTS_UNIT_STANCES.HOLD_POSITION;
        }
    }
}
```

**Verification:**
```bash
# AIController should reference choke points
grep -q "chokePoint" src/ai/AIController.js || { echo "ERROR: choke point logic missing"; exit 1; }
grep -q "getNearestChokePoint" src/ai/AIController.js || { echo "ERROR: choke point method missing"; exit 1; }
```

---

### Task 4: Implement tactical retreat logic
**What:** Add retreat behavior when units are losing combat

**Why:** AI units currently fight to death. Smart retreat preserves army strength.

**How:**
1. Add `evaluateCombatSituation(unit)` method:
   - Check unit health percentage (< 30% = critical)
   - Count nearby friendly vs enemy units (within sight range)
   - Check if unit has backup nearby (friendly units within 5 cells)
   - Return RETREAT, HOLD, or ADVANCE decision
2. Add `executeRetreat(unit)` method:
   - Calculate retreat vector (away from nearest enemy)
   - Move unit toward nearest friendly building or allied units
   - Set unit stance to DEFENSIVE (won't chase enemies)
3. Update combat update loop to check retreat conditions:
   - For each unit in combat, evaluate situation
   - If RETREAT decision, execute retreat
   - If unit successfully retreats (health > 50%), re-engage
4. Add personality-based retreat thresholds:
   - RUSHER: Only retreat at < 20% health (aggressive)
   - BALANCED: Retreat at < 40% health
   - TURTLE: Retreat at < 50% health (cautious)
   - ECONOMIST: Retreat at < 60% health (preserve units)

**Files modified:**
- src/ai/AIController.js

**Example code pattern:**
```javascript
evaluateCombatSituation(unit) {
    const healthPercent = unit.health / unit.maxHealth;
    const nearbyEnemies = this.getNearbyEnemies(unit, unit.sightRange);
    const nearbyAllies = this.getNearbyAllies(unit, 5);

    // Critical health and outnumbered
    if (healthPercent < 0.3 && nearbyEnemies.length > nearbyAllies.length) {
        return 'RETREAT';
    }

    // Personality-based retreat threshold
    const retreatThreshold = this.getRetreatThreshold();
    if (healthPercent < retreatThreshold && nearbyEnemies.length > nearbyAllies.length * 1.5) {
        return 'RETREAT';
    }

    // Outnumber enemy, keep fighting
    if (nearbyAllies.length > nearbyEnemies.length) {
        return 'ADVANCE';
    }

    return 'HOLD';
}

executeRetreat(unit) {
    const nearestEnemy = this.getNearestEnemy(unit);
    if (!nearestEnemy) return;

    // Calculate retreat direction (away from enemy)
    const dx = unit.x - nearestEnemy.x;
    const dy = unit.y - nearestEnemy.y;
    const dist = Math.hypot(dx, dy);
    const retreatDist = 200; // Pixels to retreat

    const retreatX = unit.x + (dx / dist) * retreatDist;
    const retreatY = unit.y + (dy / dist) * retreatDist;

    // Issue retreat command
    const retreatCmd = new MoveCommand(unit, retreatX, retreatY);
    unit.queueCommand(retreatCmd, false, true); // Priority command
    unit.stance = RTS_UNIT_STANCES.DEFENSIVE;
}
```

**Verification:**
```bash
# AIController should have retreat methods
grep -q "evaluateCombatSituation" src/ai/AIController.js || { echo "ERROR: combat evaluation missing"; exit 1; }
grep -q "executeRetreat" src/ai/AIController.js || { echo "ERROR: retreat logic missing"; exit 1; }
```

---

### Task 5: Add counter-unit selection (faction matchup awareness)
**What:** AI builds counter-units based on enemy faction and army composition

**Why:** Rock-paper-scissors unit counters are core to RTS. AI should adapt.

**How:**
1. Add `analyzeEnemyComposition()` method:
   - Track known enemy units (from scouting)
   - Count unit types: infantry, vehicles, aircraft
   - Identify dominant unit type
   - Return composition analysis (e.g., "70% infantry, 30% vehicles")
2. Add `selectCounterUnits(enemyComposition)` method:
   - Use faction data to select counter-units
   - Example: If enemy is 70% infantry, build splash damage units (Grenadier, Flame Tank)
   - Example: If enemy is 70% vehicles, build anti-armor units (Rocket Soldier, Tank Destroyer)
   - Return list of recommended unit types
3. Add faction-specific counter tables:
   - Alliance counters (Grenadier for infantry blobs, Mammoth Tank for vehicles)
   - Syndicate counters (Flame units for infantry, Stealth Tank for harassment)
   - Collective counters (Disintegrator for infantry, Tripod for vehicles)
4. Update unit production logic to prioritize counter-units:
   - After initial build order, switch to counter-production
   - Maintain 60% counters, 40% preferred units (from personality)
5. Add scouting trigger: when enemy composition unknown, send scout

**Files modified:**
- src/ai/AIController.js

**Example code pattern:**
```javascript
analyzeEnemyComposition() {
    const knownEnemies = this.knownEnemyUnits;
    if (knownEnemies.length === 0) return null;

    const composition = {
        infantry: 0,
        vehicle: 0,
        aircraft: 0,
        total: knownEnemies.length
    };

    for (const enemy of knownEnemies) {
        const type = enemy.type?.toUpperCase() || 'INFANTRY';
        if (type.includes('INFANTRY')) composition.infantry++;
        else if (type.includes('VEHICLE')) composition.vehicle++;
        else if (type.includes('AIRCRAFT')) composition.aircraft++;
    }

    return composition;
}

selectCounterUnits(composition) {
    if (!composition) return this.getPreferredUnits(); // Fallback to personality

    const counters = [];
    const faction = this.player.faction;

    // Counter infantry-heavy armies
    if (composition.infantry / composition.total > 0.6) {
        if (faction === 'ALLIANCE') counters.push('GRENADIER', 'ZONE_TROOPER');
        if (faction === 'SYNDICATE') counters.push('FLAME_TROOPER', 'FLAME_TANK');
        if (faction === 'COLLECTIVE') counters.push('DISINTEGRATOR', 'TRIPOD');
    }

    // Counter vehicle-heavy armies
    if (composition.vehicle / composition.total > 0.6) {
        if (faction === 'ALLIANCE') counters.push('ZONE_TROOPER', 'ARTILLERY');
        if (faction === 'SYNDICATE') counters.push('STEALTH_TANK', 'ATTACK_BUGGY');
        if (faction === 'COLLECTIVE') counters.push('DEVOURER_TANK', 'TRIPOD');
    }

    return counters.length > 0 ? counters : this.getPreferredUnits();
}
```

**Verification:**
```bash
# AIController should have counter-unit logic
grep -q "analyzeEnemyComposition" src/ai/AIController.js || { echo "ERROR: composition analysis missing"; exit 1; }
grep -q "selectCounterUnits" src/ai/AIController.js || { echo "ERROR: counter-unit selection missing"; exit 1; }
```

---

### Task 6: Enhance scouting to track enemy expansions
**What:** Improve scouting to find and track enemy expansion bases

**Why:** Knowing where enemy is expanding allows AI to harass or contest expansions

**How:**
1. Update scoutMap() method to prioritize expansion zones:
   - Check game.expansionZones for unclaimed expansions
   - Send scouts to expansion zones first
   - Check for enemy buildings at expansions
2. Add `trackEnemyExpansions()` method:
   - When scout discovers enemy building at expansion, mark it
   - Store enemy expansion locations in knownEnemyBases array
   - Prioritize attacking enemy expansions (weaker than main base)
3. Update attack target selection to consider expansions:
   - If enemy has 2+ bases, target the weakest (fewest defenses)
   - Expansions typically have fewer guard towers
4. Add expansion denial strategy:
   - If AI discovers enemy building expansion, send harass force
   - 3-5 fast units to disrupt construction
   - Retreat if enemy reinforces

**Files modified:**
- src/ai/AIController.js

**Example code pattern:**
```javascript
scoutMap() {
    // Prioritize expansion zones
    if (this.game?.expansionZones) {
        for (const expansion of this.game.expansionZones) {
            if (!this.isExpansionScouted(expansion)) {
                this.sendScoutToLocation(expansion.pixelX, expansion.pixelY);
                return;
            }
        }
    }

    // Fall back to normal exploration
    this.exploreMap();
}

trackEnemyExpansions() {
    if (!this.game?.expansionZones) return;

    for (const expansion of this.game.expansionZones) {
        const enemyBuildings = this.findEnemyBuildingsNear(expansion.pixelX, expansion.pixelY, 5);
        if (enemyBuildings.length > 0) {
            // Enemy has expansion here
            if (!this.knownEnemyBases.some(b => b.x === expansion.pixelX && b.y === expansion.pixelY)) {
                this.knownEnemyBases.push({
                    x: expansion.pixelX,
                    y: expansion.pixelY,
                    isExpansion: true,
                    buildings: enemyBuildings
                });
            }
        }
    }
}
```

**Verification:**
```bash
# AIController should track enemy expansions
grep -q "trackEnemyExpansions" src/ai/AIController.js || { echo "ERROR: expansion tracking missing"; exit 1; }
grep -q "knownEnemyBases" src/ai/AIController.js || { echo "WARNING: Enemy base tracking not found"; }
```

---

### Task 7: Add difficulty-scaled decision making
**What:** Make AI difficulty affect quality of decisions, not just reaction time

**Why:** Current difficulty only affects timers. Smart decisions should vary by difficulty.

**How:**
1. Read current AI_DIFFICULTY settings in RTSConstants.js
2. Add decision quality modifiers to RTS_AI_DIFFICULTY:
   - EASY: 40% chance to make optimal choice (often picks wrong counter-unit)
   - NORMAL: 70% chance to make optimal choice
   - HARD: 90% chance to make optimal choice
   - BRUTAL: 100% chance + perfect scouting knowledge
3. Update selectCounterUnits() to use decision quality:
   - Roll random chance to pick optimal counter
   - If fail, pick random unit from faction roster
4. Update expansion timing based on difficulty:
   - EASY: Expand too late or too early (random)
   - NORMAL: Expand at reasonable timing
   - HARD: Expand at optimal timing
   - BRUTAL: Expand aggressively (multiple expansions)
5. Add "fog of war cheating" for BRUTAL:
   - BRUTAL can see enemy army composition without scouting
   - BRUTAL knows best expansion to take
   - BRUTAL anticipates enemy attacks

**Files modified:**
- src/constants/RTSConstants.js (add decisionQuality to RTS_AI_DIFFICULTY)
- src/ai/AIController.js (use decisionQuality in decisions)

**Example code pattern:**
```javascript
// In RTSConstants.js
EASY: {
    buildSpeedMultiplier: 0.8,
    resourceMultiplier: 0.8,
    decisionDelay: 2.0,
    decisionQuality: 0.4,    // 40% chance to make good choice
    cheats: false
},

// In AIController.js
selectCounterUnits(composition) {
    const optimalCounters = this.calculateOptimalCounters(composition);
    const decisionQuality = this.difficultySettings.decisionQuality || 0.7;

    // Roll to see if AI makes optimal choice
    if (Math.random() < decisionQuality) {
        return optimalCounters;
    } else {
        // Pick random faction unit instead
        return this.getRandomFactionUnits();
    }
}
```

**Verification:**
```bash
# RTSConstants should have decisionQuality
grep -q "decisionQuality" src/constants/RTSConstants.js || { echo "ERROR: decisionQuality missing"; exit 1; }

# AIController should use decisionQuality
grep -q "decisionQuality" src/ai/AIController.js || { echo "ERROR: AI not using decisionQuality"; exit 1; }
```

---

### Task 8: Integrate AI with event system (optimize performance)
**What:** Make AI listen to events instead of polling every frame

**Why:** Current AI likely polls for changes. Event-driven is more efficient.

**How:**
1. Read EventManager usage in other managers
2. Subscribe AI to relevant events:
   - `ENEMY_REVEALED` - Update knownEnemyUnits when enemy discovered
   - `BUILDING_DESTROYED` - Remove from knownEnemyBuildings
   - `UNIT_CREATED` - Track own army size
   - `TIBERIUM_DEPLETED` - Know when to send harvester elsewhere
3. Update AIController constructor to subscribe to events:
   - Use game.eventManager.on('EVENT_NAME', callback)
4. Update AIController.destroy() to unsubscribe:
   - Prevent memory leaks by removing listeners
5. Replace polling logic with event handlers:
   - Don't loop through all units every frame to find enemies
   - Wait for ENEMY_REVEALED event instead

**Files modified:**
- src/ai/AIController.js

**Example code pattern:**
```javascript
constructor(config) {
    // ... existing setup

    // Subscribe to events
    if (this.game?.eventManager) {
        this.eventManager = this.game.eventManager;

        this.eventManager.on('ENEMY_REVEALED', (data) => {
            if (data.discoveredBy === this.player) {
                this.onEnemyRevealed(data.enemy);
            }
        });

        this.eventManager.on('BUILDING_DESTROYED', (data) => {
            this.onBuildingDestroyed(data.building);
        });

        this.eventManager.on('UNIT_CREATED', (data) => {
            if (data.owner === this.player) {
                this.onOwnUnitCreated(data.unit);
            }
        });
    }
}

onEnemyRevealed(enemy) {
    if (enemy.type === 'building') {
        if (!this.knownEnemyBuildings.includes(enemy)) {
            this.knownEnemyBuildings.push(enemy);
        }
    } else {
        if (!this.knownEnemyUnits.includes(enemy)) {
            this.knownEnemyUnits.push(enemy);
        }
    }
}

destroy() {
    // Unsubscribe from events to prevent memory leaks
    if (this.eventManager) {
        this.eventManager.off('ENEMY_REVEALED', this.onEnemyRevealed);
        this.eventManager.off('BUILDING_DESTROYED', this.onBuildingDestroyed);
        this.eventManager.off('UNIT_CREATED', this.onOwnUnitCreated);
    }

    // ... existing cleanup
}
```

**Verification:**
```bash
# AIController should subscribe to events
grep -q "eventManager.on" src/ai/AIController.js || { echo "WARNING: AI not event-driven"; }

# AIController should unsubscribe in destroy
grep -q "eventManager.off" src/ai/AIController.js || { echo "ERROR: Event cleanup missing"; exit 1; }
```

---

## Verification Checklist

**Automated checks:**
- [ ] AIController has getFactionUnit() and getFactionBuilding() methods
- [ ] AIController uses RTS_AI_WEIGHTS from RTSConstants.js
- [ ] Expansion evaluation and capture methods exist
- [ ] Choke point defensive positioning implemented
- [ ] Retreat logic (evaluateCombatSituation, executeRetreat) exists
- [ ] Counter-unit selection based on enemy composition implemented
- [ ] Enemy expansion tracking added
- [ ] RTS_AI_DIFFICULTY has decisionQuality field
- [ ] AIController subscribes to events (ENEMY_REVEALED, etc.)
- [ ] AIController.destroy() unsubscribes from events

**Manual checks:**
- [ ] Start RTS game with AI opponent
- [ ] AI builds faction-specific units (not generic infantry/vehicle)
- [ ] AI captures at least 1 expansion zone during match
- [ ] AI defends choke points when under attack
- [ ] AI units retreat when losing combat (health < 40%)
- [ ] AI builds counter-units after scouting enemy (e.g., Grenadiers vs infantry)
- [ ] AI scouts expansion zones and attacks enemy expansions
- [ ] EASY difficulty makes mistakes, HARD difficulty plays optimally
- [ ] No console errors related to AI decisions
- [ ] AI performance doesn't drop FPS (event-driven, not polling)

---

## Success Criteria

**Phase complete when:**
1. ✅ AI uses faction-specific build orders (RIFLEMAN for Alliance, MILITANT for Syndicate, etc.)
2. ✅ AI captures expansion zones (visible in game - AI builds Construction Yard at expansion)
3. ✅ AI defends choke points (units move to choke when base attacked)
4. ✅ AI retreats damaged units (units don't fight to death, pull back at low health)
5. ✅ AI builds counter-units (scouts enemy, adapts production)
6. ✅ AI tracks enemy expansions (scouts expansions, attacks weaker bases)
7. ✅ Difficulty levels feel distinct (EASY makes mistakes, HARD plays smart)
8. ✅ AI is event-driven (subscribes to events, performant)

**Definition of "feels like a human opponent":**
- AI adapts to player strategy (doesn't repeat same build every game)
- AI exploits map features (uses choke points, contests expansions)
- AI makes tactical decisions (retreats when weak, attacks when strong)
- AI feels challenging but beatable (not perfect, has personality quirks)

---

## Output

**Modified files (2-3 estimated):**
- src/ai/AIController.js (add ~400-600 lines for new logic)
- src/constants/RTSConstants.js (add decisionQuality to AI_DIFFICULTY)
- (Possibly Game.js if AI needs game.eventManager reference)

**New methods in AIController.js:**
- getFactionUnit(genericType)
- getFactionBuilding(genericType)
- evaluateExpansionOpportunities()
- captureExpansion(expansion)
- getNearestChokePoint(position)
- isChokePointDefended(chokePoint)
- evaluateCombatSituation(unit)
- executeRetreat(unit)
- analyzeEnemyComposition()
- selectCounterUnits(composition)
- trackEnemyExpansions()
- onEnemyRevealed(enemy) [event handler]
- onBuildingDestroyed(building) [event handler]

**Git commit messages:**
```
feat(ai): Add faction-aware build orders and unit selection

- AI uses faction-specific units (RIFLEMAN, MILITANT, SHOCK_TROOPER)
- Translate generic unit types to faction rosters
- Use RTS_AI_WEIGHTS from RTSConstants.js
- AI adapts to faction strengths (SYNDICATE builds fast units, etc.)

Phase 4 of 7: AI Enhancement (1/3)
```

```
feat(ai): Implement expansion capture and choke point defense

- AI evaluates and captures expansion zones from Phase 3
- AI defends choke points when under attack
- Add retreat logic for damaged units (< 40% health)
- Personality-based retreat thresholds (RUSHER aggressive, TURTLE cautious)

Phase 4 of 7: AI Enhancement (2/3)
```

```
feat(ai): Add counter-unit selection and event-driven optimization

- AI analyzes enemy composition and builds counters
- Scout enemy expansions and track known bases
- Difficulty affects decision quality (EASY 40%, HARD 90%)
- Event-driven AI (ENEMY_REVEALED, BUILDING_DESTROYED)
- Performance optimized (no polling, event listeners)

Phase 4 of 7: AI Enhancement (3/3)
```

---

## Checkpoints

**After Task 1 (Faction awareness):**
- Expect: AI builds faction-specific units
- Action: Test in-game, verify console shows "AI building RIFLEMAN" not "building infantry"

**After Task 2 (Expansions):**
- Expect: AI Construction Yards appear at expansion zones
- Action: Watch minimap for AI expansion attempts

**After Task 3 (Choke points):**
- Expect: AI units cluster at narrow corridors when defending
- Action: Attack AI base, observe defensive positioning

**After Task 4 (Retreat):**
- Expect: Damaged AI units run away instead of dying
- Action: Damage AI units to ~30% health, watch for retreat

**After Task 5 (Counter-units):**
- Expect: AI builds different units based on player's army
- Action: Mass infantry, observe if AI builds Grenadiers/Flame units

**After Task 6 (Expansion tracking):**
- Expect: AI scouts and attacks player expansions
- Action: Build expansion, watch for AI harassment

**After Task 7 (Difficulty scaling):**
- Expect: EASY AI makes wrong choices, HARD AI optimizes
- Action: Test both difficulties, compare AI decisions

**After Task 8 (Events):**
- Expect: No performance degradation, smooth FPS
- Action: Profile in browser, check event listener count

---

## Risks & Mitigations

**Risk:** AI gets stuck in decision loops (keeps changing mind)
- **Mitigation:** Add cooldowns to strategy changes (don't switch build order every 5 seconds)
- **Recovery:** Add state machine transition delays

**Risk:** Faction unit translation breaks for unknown units
- **Mitigation:** Fall back to generic unit if faction equivalent not found
- **Recovery:** Log warnings when translation fails

**Risk:** Expansion capture causes AI to over-extend and lose
- **Mitigation:** Only expand when economy is strong (>3000 tiberium)
- **Recovery:** Add "too aggressive" check in evaluateExpansionOpportunities

**Risk:** Retreat logic causes AI to never engage (too cautious)
- **Mitigation:** Only retreat when outnumbered + low health (both conditions)
- **Recovery:** Tune retreat thresholds based on playtesting

**Risk:** Event-driven AI misses updates (listeners not firing)
- **Mitigation:** Keep some polling as fallback (every 2 seconds, not every frame)
- **Recovery:** Debug event firing with console.log

**Risk:** Counter-unit logic is too predictable (always same counters)
- **Mitigation:** Mix 60% counters + 40% personality units
- **Recovery:** Add randomization to counter selection

---

## Design Notes

### Faction-Aware Strategy Matrix

**Alliance AI tendencies:**
- Prefers defensive play (more towers, fewer early attacks)
- Expands cautiously (waits for strong economy)
- Uses Mammoth Tanks as late-game power units
- Shield regen allows sustained engagements

**Syndicate AI tendencies:**
- Aggressive early game (Militant spam)
- Expands quickly (fast units secure expansions)
- Uses Stealth Tanks for harassment
- Hit-and-run tactics (engage, retreat, re-engage)

**Collective AI tendencies:**
- Economic focus (builds 2 Refineries early)
- Tech rush (goes for Tripod fast)
- Uses Teleport to escape bad engagements
- Relies on superior late-game units

### AI Personality + Faction Combinations

Some combinations create unique playstyles:

- **RUSHER + SYNDICATE** = Ultra-aggressive, very fast attacks
- **TURTLE + ALLIANCE** = Impenetrable defense with +15% building HP bonus
- **ECONOMIST + COLLECTIVE** = +10% resource efficiency + economic build order = insane eco
- **EXPLORER + any** = Heavy scouting, will find all expansions quickly

### Expansion Timing Guidelines

**Economic indicators for expansion:**
- Tiberium income > 200/sec (sustainable)
- Storage > 3000 (can afford Construction Yard)
- Main base has 2+ Refineries (not bottlenecked)
- No active threat (not currently defending)

**Strategic indicators against expansion:**
- Under attack (prioritize defense)
- Low army size (< 10 units = vulnerable expansion)
- Enemy pressure high (enemy scouts near expansions)

### Choke Point Tactics

**When to defend choke:**
- Enemy army > AI army (use terrain advantage)
- Protecting expansion in progress
- Stalling while reinforcements arrive

**When to abandon choke:**
- Overwhelmed (enemy 3x larger force)
- Better fallback position exists (closer to base)
- Choke is too far from base (can't reinforce)

---

*Plan created: 2026-01-12*
*Estimated time: 4-6 hours*
*Complexity: High (complex decision logic, multiple systems, AI behavior tuning)*
