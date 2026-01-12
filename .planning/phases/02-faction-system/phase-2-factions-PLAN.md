# PLAN: Faction System Implementation

**Phase 2 of 7** — Implement 3 distinct factions with unique units, buildings, and mechanics

---

## Objective

Create a faction system with 3 playable factions (GDI-style, Nod-style, Scrin-style), each with unique units, buildings, and faction-specific mechanics. This establishes the core strategic differentiator for the game.

**Why this matters:** Factions affect all future systems (AI, balance, UI). Must be implemented early so AI, map generation, and UI can account for faction differences.

---

## Execution Context

**Mode:** YOLO (auto-approve, just execute)

**Codebase context:**
- @.planning/codebase/STRUCTURE.md (file organization)
- @.planning/codebase/ARCHITECTURE.md (manager pattern, event system)
- @.planning/codebase/CONVENTIONS.md (coding style)
- @src/constants/RTSConstants.js (existing unit/building definitions)
- @src/Player.js (player data structure)
- @src/Unit.js (unit base class)
- @src/Building.js (building base class)

**Key files:**
- index.html (script loading order - may need new files)
- src/Player.js (add faction property)
- src/constants/RTSConstants.js (add faction data structure)
- src/managers/UnitManager.js (faction-aware unit creation)
- src/managers/BuildingManager.js (faction-aware building creation)
- src/Game.js (faction selection in game setup)

---

## Context

### Discovery Findings

**Current state:**
- ✓ No existing faction system (clean slate)
- ✓ RTSConstants.js has generic units/buildings (RIFLEMAN, BARRACKS, etc.)
- ✓ Player.js has basic structure (id, name, resources, buildings, units)
- ✓ Unit/Building base classes support config-based stats
- ✓ Manager pattern in place for extending systems

**Architecture patterns to follow:**
- ✓ Data-driven design - Factions defined in RTSConstants.js
- ✓ Factory pattern - UnitManager/BuildingManager dispatch to faction-specific configs
- ✓ Event-driven - Emit FACTION_SELECTED events
- ✓ Single responsibility - Faction logic in constants, not scattered

**C&C3 faction inspirations:**
1. **GDI-style (Balanced)** - General purpose, well-rounded units, strong defensive options
2. **Nod-style (Stealth/Aggro)** - Stealthy units, aggressive tactics, hit-and-run gameplay
3. **Scrin-style (Tech/Alien)** - Advanced technology, teleportation, energy-based weapons

---

## Tasks

### Task 1: Define faction data structure in RTSConstants.js
**What:** Create FACTIONS constant with 3 factions and their unit/building rosters

**Why:** Centralize all faction configuration for balance tuning

**How:**
1. Read RTSConstants.js to understand existing structure
2. Add new constant `RTS_FACTIONS` with 3 factions:
   - ALLIANCE (GDI-style): Balanced, defensive
   - SYNDICATE (Nod-style): Stealth, aggressive
   - COLLECTIVE (Scrin-style): Tech, alien
3. For each faction, define:
   - Faction metadata (name, description, color scheme)
   - Available units (5-8 unique unit types each)
   - Available buildings (10-12 building types each)
   - Faction bonuses (e.g., "+10% harvester speed", "stealth when idle")
   - Starting tech unlocks
4. Create faction-specific unit configs extending base RTS_UNITS
5. Create faction-specific building configs extending RTS_BUILDINGS
6. Ensure balanced asymmetry (different but fair)

**Files modified:**
- src/constants/RTSConstants.js

**Design decisions:**
- **Unit differentiation:** Each faction has unique unit names, different stats, some unique abilities
- **Building differentiation:** Core buildings (HQ, Power, Refinery) shared but with different costs/stats; production buildings unlock different unit rosters
- **Faction bonuses:** Passive bonuses that feel impactful but not overpowered
  - Alliance: +15% building health, +10% unit armor
  - Syndicate: +20% unit speed, stealth ability on select units
  - Collective: +10% resource efficiency, teleportation mechanics
- **Balance target:** Each faction should have ~45-55% win rate vs others

**Verification:**
```bash
# RTSConstants.js should have RTS_FACTIONS constant
grep -q "RTS_FACTIONS" src/constants/RTSConstants.js || { echo "ERROR: RTS_FACTIONS not defined"; exit 1; }

# Should have 3 factions defined
grep -c "ALLIANCE\|SYNDICATE\|COLLECTIVE" src/constants/RTSConstants.js | grep "3" || { echo "ERROR: Not all 3 factions defined"; exit 1; }
```

---

### Task 2: Add faction property to Player class
**What:** Update Player.js to store and manage faction assignment

**Why:** Players need to know their faction to determine available units/buildings

**How:**
1. Read Player.js constructor
2. Add `faction` property to constructor config (default: 'ALLIANCE')
3. Add `factionData` property that stores reference to RTS_FACTIONS[faction]
4. Update `getDefaultColor()` to use faction color scheme if available
5. Initialize `unlockedBuildings` and `unlockedUnits` based on faction starting roster
6. Add `getFactionBonus(bonusType)` method to retrieve faction-specific bonuses
7. Update any existing code that assumes generic unit/building availability

**Files modified:**
- src/Player.js

**Example code pattern:**
```javascript
constructor(config) {
    // Faction assignment
    this.faction = config.faction || 'ALLIANCE';
    this.factionData = RTS_FACTIONS[this.faction];

    // Initialize faction-specific unlocks
    this.unlockedBuildings = new Set(this.factionData.startingBuildings);
    this.unlockedUnits = new Set(this.factionData.startingUnits);

    // Color based on faction
    this.color = config.color || this.factionData.color;
}

getFactionBonus(bonusType) {
    return this.factionData.bonuses?.[bonusType] || 0;
}
```

**Verification:**
```bash
# Player.js should have faction property
grep -q "this.faction" src/Player.js || { echo "ERROR: faction property not added"; exit 1; }

# Player.js should have getFactionBonus method
grep -q "getFactionBonus" src/Player.js || { echo "ERROR: getFactionBonus method missing"; exit 1; }
```

---

### Task 3: Update UnitManager for faction-aware unit creation
**What:** Modify UnitManager.createUnit() to use faction-specific unit configs

**Why:** Units must come from player's faction roster, not generic pool

**How:**
1. Read UnitManager.js createUnit() method
2. Modify createUnit() to:
   - Accept `owner` (Player) parameter (likely already exists)
   - Retrieve unit config from owner.factionData.units[unitType]
   - Fall back to RTS_UNITS[unitType] for shared units
   - Apply faction bonuses to unit stats (speed, damage, armor multipliers)
3. Add validation to prevent creating units not in faction roster
4. Update any existing createUnit() calls to ensure owner is passed
5. Emit UNIT_CREATED event with faction info for stats tracking

**Files modified:**
- src/managers/UnitManager.js

**Example code pattern:**
```javascript
createUnit(unitType, x, y, owner) {
    // Get faction-specific config or fall back to generic
    const factionConfig = owner?.factionData?.units?.[unitType];
    const baseConfig = RTS_UNITS[unitType];
    const config = factionConfig || baseConfig;

    if (!config) {
        console.error(`Unit type ${unitType} not available for faction ${owner.faction}`);
        return null;
    }

    // Apply faction bonuses
    const finalConfig = this.applyFactionBonuses(config, owner);

    // Create unit instance (existing logic)
    const unit = new Unit(x, y, owner, finalConfig);
    // ... rest of creation logic
}

applyFactionBonuses(config, owner) {
    return {
        ...config,
        speed: config.speed * (1 + owner.getFactionBonus('speed')),
        armor: config.armor * (1 + owner.getFactionBonus('armor')),
        damage: config.damage * (1 + owner.getFactionBonus('damage'))
    };
}
```

**Verification:**
```bash
# UnitManager should use faction-specific configs
grep -q "factionData" src/managers/UnitManager.js || { echo "ERROR: UnitManager not faction-aware"; exit 1; }

# UnitManager should validate faction roster
grep -q "not available for faction" src/managers/UnitManager.js || { echo "WARNING: No faction validation"; }
```

---

### Task 4: Update BuildingManager for faction-aware building placement
**What:** Modify BuildingManager to use faction-specific building configs and validate prerequisites

**Why:** Buildings must come from player's faction roster and respect faction-specific tech trees

**How:**
1. Read BuildingManager.js placeBuilding() and meetsRequirements() methods
2. Modify placeBuilding() to:
   - Retrieve building config from owner.factionData.buildings[buildingType]
   - Fall back to RTS_BUILDINGS[buildingType] for shared buildings
   - Apply faction bonuses to building stats (health, power generation)
3. Update meetsRequirements() to:
   - Check if building is in player's faction roster
   - Validate faction-specific prerequisites (not just generic ones)
   - Check tech level unlocks per faction
4. Update building production queues to only show faction-available units
5. Emit BUILDING_PLACED event with faction info

**Files modified:**
- src/managers/BuildingManager.js

**Example code pattern:**
```javascript
placeBuilding(buildingType, gridX, gridY, owner) {
    // Get faction-specific config
    const factionConfig = owner?.factionData?.buildings?.[buildingType];
    const baseConfig = RTS_BUILDINGS[buildingType];
    const config = factionConfig || baseConfig;

    if (!config) {
        console.error(`Building ${buildingType} not available for faction ${owner.faction}`);
        return false;
    }

    // Validate faction-specific prerequisites
    if (!this.meetsRequirements(buildingType, owner)) {
        return false;
    }

    // Apply faction bonuses
    const finalConfig = this.applyFactionBonuses(config, owner);

    // ... rest of placement logic
}

meetsRequirements(buildingType, owner) {
    const config = owner.factionData.buildings[buildingType] || RTS_BUILDINGS[buildingType];

    // Check faction roster
    if (!owner.unlockedBuildings.has(buildingType)) {
        return false;
    }

    // Check faction-specific prerequisites
    // ... existing prerequisite logic
}
```

**Verification:**
```bash
# BuildingManager should use faction-specific configs
grep -q "factionData" src/managers/BuildingManager.js || { echo "ERROR: BuildingManager not faction-aware"; exit 1; }

# BuildingManager should validate faction roster
grep -q "not available for faction" src/managers/BuildingManager.js || { echo "WARNING: No faction validation"; }
```

---

### Task 5: Add faction selection to game setup
**What:** Update Game.js initRTS() to support faction selection for players

**Why:** Players need to choose factions before game starts

**How:**
1. Read Game.js initRTS() method
2. Add faction parameter to player initialization:
   - Human player: Default to 'ALLIANCE' (UI will change this in Phase 6)
   - AI players: Randomly assign or pick based on AI personality
3. Pass faction to Player constructor
4. Add faction info to game state for AI to use
5. Emit GAME_STARTED event with faction assignments for logging

**Files modified:**
- src/Game.js

**Example code pattern:**
```javascript
initRTS(config = {}) {
    // Existing initialization...

    // Create human player with faction
    const humanFaction = config.humanFaction || 'ALLIANCE';
    this.humanPlayer = new Player({
        id: 0,
        name: 'Player',
        isHuman: true,
        faction: humanFaction,
        team: 0
    });

    // Create AI players with factions
    const aiFactions = ['SYNDICATE', 'COLLECTIVE', 'ALLIANCE'];
    this.aiPlayers = [];
    for (let i = 0; i < (config.aiCount || 1); i++) {
        const aiFaction = aiFactions[i % aiFactions.length]; // Rotate through factions
        this.aiPlayers.push(new Player({
            id: i + 1,
            name: `AI Player ${i + 1}`,
            isHuman: false,
            faction: aiFaction,
            aiPersonality: this.getRandomPersonality(),
            team: i + 1
        }));
    }

    // ... rest of initialization
}
```

**Verification:**
```bash
# Game.js should initialize players with factions
grep -q "faction:" src/Game.js || { echo "ERROR: Game.js not assigning factions"; exit 1; }
```

---

### Task 6: Implement faction-specific unit abilities (basic)
**What:** Add placeholder for faction abilities (stealth, teleport) in Unit.js

**Why:** Some faction mechanics require special unit behaviors

**How:**
1. Read Unit.js update() and draw() methods
2. Add `abilities` property to Unit class (array of ability names)
3. Implement basic ability system:
   - **STEALTH** (Syndicate): Unit invisible when idle/not attacking
   - **TELEPORT** (Collective): Can teleport short distances (cooldown)
   - **SHIELD_REGEN** (Alliance): Slow health regeneration when not in combat
4. Add ability activation logic in update()
5. Add visual indicators for abilities in draw()
6. Make abilities optional (only if unit config specifies them)

**Files modified:**
- src/Unit.js

**Example code pattern:**
```javascript
class Unit {
    constructor(x, y, owner, config) {
        // ... existing properties

        // Faction abilities
        this.abilities = config.abilities || [];
        this.abilityStates = {
            stealth: { active: false },
            teleport: { cooldown: 0, maxCooldown: 300 },
            shieldRegen: { lastDamageTime: 0, regenDelay: 180 }
        };
    }

    update(deltaTime) {
        // ... existing update logic

        // Update abilities
        if (this.abilities.includes('STEALTH')) {
            this.updateStealthAbility(deltaTime);
        }
        if (this.abilities.includes('TELEPORT')) {
            this.updateTeleportAbility(deltaTime);
        }
        if (this.abilities.includes('SHIELD_REGEN')) {
            this.updateShieldRegenAbility(deltaTime);
        }
    }

    updateStealthAbility(deltaTime) {
        // Stealth active when idle and not recently attacked
        const idleTime = frameCount - (this.lastAttackFrame || 0);
        this.abilityStates.stealth.active = (this.state === RTS_UNIT_STATES.IDLE && idleTime > 180);
    }

    updateTeleportAbility(deltaTime) {
        // Reduce cooldown
        if (this.abilityStates.teleport.cooldown > 0) {
            this.abilityStates.teleport.cooldown -= deltaTime;
        }
    }

    updateShieldRegenAbility(deltaTime) {
        // Regenerate health if not damaged recently
        const timeSinceDamage = millis() - this.lastDamageTime;
        if (timeSinceDamage > this.abilityStates.shieldRegen.regenDelay * 16.67) {
            this.health = Math.min(this.maxHealth, this.health + 0.5 * (deltaTime / 16.67));
        }
    }
}
```

**Verification:**
```bash
# Unit.js should have abilities property
grep -q "this.abilities" src/Unit.js || { echo "ERROR: abilities property missing"; exit 1; }

# Unit.js should have ability update methods
grep -q "updateStealthAbility\|updateTeleportAbility\|updateShieldRegenAbility" src/Unit.js || { echo "WARNING: Ability methods not implemented"; }
```

---

### Task 7: Add visual faction differentiation
**What:** Update unit/building rendering to show faction identity (colors, shapes)

**Why:** Players need to visually distinguish factions at a glance

**How:**
1. Read Unit.js and Building.js draw methods
2. Update color selection to use faction color scheme:
   - Alliance: Blue tones
   - Syndicate: Red/orange tones
   - Collective: Purple/green alien tones
3. Add faction-specific shape variations (subtle):
   - Alliance: Angular, military shapes
   - Syndicate: Sharp, aggressive shapes
   - Collective: Organic, curved shapes
4. Ensure enemy faction units are clearly visually distinct
5. Add faction emblem/icon to units (small symbol)

**Files modified:**
- src/Unit.js (getDefaultColor, draw)
- src/Building.js (getDefaultColor, draw)

**Example code pattern:**
```javascript
class Unit {
    getDefaultColor() {
        // Use faction color scheme
        if (this.owner?.factionData?.colorScheme) {
            return this.owner.factionData.colorScheme.primary;
        }

        // Fallback to default
        return { r: 100, g: 100, b: 200 };
    }

    draw() {
        // ... existing draw logic

        // Draw faction indicator (small symbol)
        if (this.owner?.factionData?.symbol) {
            this.drawFactionSymbol(this.owner.factionData.symbol);
        }
    }

    drawFactionSymbol(symbol) {
        push();
        fill(255, 255, 255, 180);
        textAlign(CENTER, CENTER);
        textSize(8);
        text(symbol, this.x, this.y - this.radius - 8);
        pop();
    }
}
```

**Verification:**
```bash
# Unit.js and Building.js should use faction colors
grep -q "factionData.colorScheme" src/Unit.js || { echo "WARNING: Faction colors not applied to units"; }
grep -q "factionData.colorScheme" src/Building.js || { echo "WARNING: Faction colors not applied to buildings"; }
```

---

### Task 8: Verify faction system integration
**What:** Test all 3 factions in-game to ensure differentiation and balance

**Why:** Ensure factions feel mechanically distinct and are balanced

**How:**
1. Start local server: `npm start`
2. Open http://127.0.0.1:8000
3. For each faction (modify Game.js temporarily to test each):
   - Verify correct units are available in production buildings
   - Verify correct buildings are available to build
   - Verify faction bonuses apply (check unit stats in console)
   - Verify visual differentiation (colors, symbols)
   - Test faction abilities (stealth, teleport, shield regen)
4. Test faction vs faction combat:
   - Alliance vs Syndicate
   - Alliance vs Collective
   - Syndicate vs Collective
5. Verify no crashes or errors with multiple factions active

**Files modified:** None (verification only)

**Verification:**
```bash
# Manual browser verification required
echo "Manual verification steps:"
echo "1. npm start"
echo "2. Open http://127.0.0.1:8000"
echo "3. Test each faction (Alliance, Syndicate, Collective)"
echo "4. Verify unit/building rosters are faction-specific"
echo "5. Verify faction bonuses apply to stats"
echo "6. Verify visual differentiation (colors, symbols)"
echo "7. Test faction abilities work"
echo "8. Test faction vs faction combat"
echo "9. Confirm no crashes or errors"
```

---

## Verification Checklist

**Automated checks:**
- [ ] RTSConstants.js has RTS_FACTIONS with 3 factions defined
- [ ] Player.js has faction property and getFactionBonus method
- [ ] UnitManager.js uses faction-specific unit configs
- [ ] BuildingManager.js uses faction-specific building configs
- [ ] Game.js initializes players with factions
- [ ] Unit.js has abilities property and ability update methods
- [ ] Unit.js and Building.js use faction color schemes

**Manual checks:**
- [ ] Each faction has 5-8 unique units
- [ ] Each faction has 10-12 unique buildings
- [ ] Faction bonuses are applied to unit/building stats
- [ ] Faction abilities work (stealth, teleport, shield regen)
- [ ] Visual differentiation clear (colors, symbols)
- [ ] No crashes when switching between factions
- [ ] Factions feel mechanically distinct (not just stat tweaks)

---

## Success Criteria

**Phase complete when:**
1. ✅ 3 factions defined in RTSConstants.js with complete unit/building rosters
2. ✅ Player class supports faction assignment and faction-specific data
3. ✅ UnitManager creates faction-specific units with bonuses applied
4. ✅ BuildingManager places faction-specific buildings with validation
5. ✅ Game.js initializes players with faction selection
6. ✅ Faction abilities implemented (stealth, teleport, shield regen)
7. ✅ Visual faction differentiation clear (colors, symbols)
8. ✅ All 3 factions playable without errors
9. ✅ Factions feel mechanically distinct in gameplay

**Definition of "mechanically distinct":**
- Alliance excels at defensive play and durability
- Syndicate excels at mobility and hit-and-run tactics
- Collective excels at tech/economy and unconventional tactics
- Each faction has at least 2 unique units with special abilities
- Each faction has a passive bonus that affects playstyle

---

## Output

**Modified files (7 estimated):**
- src/constants/RTSConstants.js (add RTS_FACTIONS, faction units/buildings)
- src/Player.js (add faction property, getFactionBonus method)
- src/managers/UnitManager.js (faction-aware unit creation)
- src/managers/BuildingManager.js (faction-aware building placement)
- src/Game.js (faction selection in game setup)
- src/Unit.js (abilities system, faction colors)
- src/Building.js (faction colors)

**New constants added:**
- RTS_FACTIONS (3 factions with complete data)
- FACTION_UNITS (faction-specific unit configs)
- FACTION_BUILDINGS (faction-specific building configs)
- FACTION_ABILITIES (ability definitions)

**Git commit messages:**
```
feat(factions): Add faction data structure with 3 factions

- Define ALLIANCE, SYNDICATE, COLLECTIVE in RTSConstants.js
- Each faction has unique unit/building rosters
- Faction bonuses and color schemes defined
- 5-8 units per faction, 10-12 buildings per faction

Phase 2 of 7: Faction System (1/3)
```

```
feat(factions): Integrate factions into Player and managers

- Add faction property to Player class
- Update UnitManager for faction-aware unit creation
- Update BuildingManager for faction-aware building placement
- Apply faction bonuses to unit/building stats
- Validate faction rosters in production

Phase 2 of 7: Faction System (2/3)
```

```
feat(factions): Implement faction abilities and visual differentiation

- Add abilities system to Unit class (stealth, teleport, shield regen)
- Apply faction color schemes to units and buildings
- Add faction symbols for visual identification
- Integrate faction selection in Game.js setup

Phase 2 of 7: Faction System (3/3)
```

---

## Checkpoints

**After Task 1 (Define factions):**
- Expect: RTSConstants.js much larger, no functional changes yet
- Action: Continue to Task 2 to integrate with Player class

**After Task 2 (Add faction to Player):**
- Expect: Players have faction data, but managers don't use it yet
- Action: Continue to Task 3 and 4 to update managers

**After Task 3-4 (Update managers):**
- Expect: Units/buildings created with faction-specific configs
- Action: Test in browser to verify rosters are different per faction

**After Task 5 (Game setup):**
- Expect: Can initialize game with different factions
- Action: Test all 3 factions separately

**After Task 6-7 (Abilities and visuals):**
- Expect: Factions look and play differently
- Action: Manual testing of each faction's unique feel

**After Task 8 (Integration test):**
- Expect: All factions work without errors
- Action: Commit and mark phase complete

---

## Risks & Mitigations

**Risk:** Faction balance is off (one faction dominates)
- **Mitigation:** Use symmetrical costs/stats with minor variations for v1, fine-tune in Phase 7
- **Recovery:** Adjust faction bonuses in RTSConstants.js (data-driven, no code changes)

**Risk:** Faction abilities introduce bugs (stealth invisible units, teleport pathfinding issues)
- **Mitigation:** Keep abilities simple for Phase 2, expand in later phases
- **Recovery:** Disable problematic abilities with config flag, fix in follow-up

**Risk:** Too many faction-specific units/buildings (maintenance burden)
- **Mitigation:** Share 60-70% of units/buildings across factions, only 30-40% unique
- **Recovery:** Consolidate similar units into shared configs with faction variations

**Risk:** Visual differentiation not clear enough
- **Mitigation:** Use strong color contrasts (blue vs red vs purple)
- **Recovery:** Add more visual indicators in Phase 6 (UI/Polish)

**Risk:** Player class becomes bloated with faction logic
- **Mitigation:** Keep faction logic in constants, Player just stores reference
- **Recovery:** Extract to FactionManager if needed later

---

## Design Notes

### Faction Design Philosophy

**Alliance (GDI-style):**
- **Playstyle:** Defensive, durable, straightforward
- **Bonuses:** +15% building health, +10% unit armor
- **Unique mechanic:** Shield regeneration on elite units
- **Unit roster:** Heavy tanks, artillery, defensive structures
- **Weakness:** Slower, higher costs, less mobile

**Syndicate (Nod-style):**
- **Playstyle:** Aggressive, mobile, hit-and-run
- **Bonuses:** +20% unit speed, stealth on select units
- **Unique mechanic:** Stealth units invisible when idle
- **Unit roster:** Light vehicles, stealth infantry, flame weapons
- **Weakness:** Fragile, poor at sieges, requires micro

**Collective (Scrin-style):**
- **Playstyle:** Tech-focused, economic, unconventional
- **Bonuses:** +10% resource efficiency, teleportation
- **Unique mechanic:** Units can teleport short distances
- **Unit roster:** Energy weapons, hover units, advanced tech
- **Weakness:** Expensive, slow early game, requires tech investment

### Unit Distribution Strategy

**Shared units (all factions):**
- Harvester (resource collection)
- Basic infantry (early defense)
- Engineer (capture/repair)

**Faction-unique units (5-8 per faction):**
- Alliance: Mammoth Tank, Grenadier, Zone Trooper, Orca Fighter
- Syndicate: Stealth Tank, Shadow Team, Flame Tank, Venom
- Collective: Tripod, Disintegrator, Shock Trooper, Stormrider

**Building overlap:**
- Core buildings shared: Construction Yard, Power Plant, Refinery
- Production buildings faction-specific: Different barracks/factories
- Support buildings mix of shared and unique

### Ability Implementation Notes

**Stealth (Syndicate):**
- Activated: When unit idle for 3+ seconds and not recently attacked
- Deactivated: When unit attacks or takes damage
- Visual: Unit becomes semi-transparent (alpha 0.3)
- Detection: Enemy units with detection ability can reveal

**Teleport (Collective):**
- Cooldown: 5 seconds (300 frames)
- Range: 5 cells maximum
- Cost: Free (cooldown is cost)
- Visual: Particle effect at start/end position
- Limitation: Cannot teleport through obstacles

**Shield Regen (Alliance):**
- Activation: 3 seconds after last damage taken
- Rate: 0.5 HP per frame (30 HP/sec)
- Visual: Subtle shield shimmer effect
- Limitation: Only on veteran+ units

---

*Plan created: 2026-01-11*
*Estimated time: 3-5 hours*
*Complexity: Medium-High (new systems, significant data definition, multiple file changes)*
