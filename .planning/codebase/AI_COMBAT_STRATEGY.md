# AI Combat Strategy System

## Overview
An adaptive combat AI that evaluates attack effectiveness in real-time, identifies unit/building counters, and dynamically switches strategies when current approach fails. Uses a damage tracking system to learn what works and what doesn't.

---

## Core Concepts

### 1. Combat Effectiveness Tracking
Monitor damage dealt vs damage taken per unit type against each target type. If effectiveness drops below threshold, trigger strategy re-evaluation.

### 2. Unit/Building Counter Matrix
Predefined strengths and weaknesses for all unit and building types. AI consults this when selecting attack composition.

### 3. Adaptive Strategy Selection
When attack stalls or fails, AI analyzes WHY and selects counter-strategy:
- Wrong unit types → Switch composition
- Insufficient numbers → Mass more units
- Defensive buildings too strong → Bring artillery/long-range
- Mixed enemy composition → Bring balanced force

---

## Unit & Building Counter Matrix

### Unit Type Definitions

| Unit | Role | Damage | Range | Speed | Armor | Special |
|------|------|--------|-------|-------|-------|---------|
| RIFLEMAN | Anti-infantry | 15 | 5 | Medium | Light | Cheap, numerous |
| ROCKET_SOLDIER | Anti-vehicle/air | 50 | 6 | Slow | Light | +50% vs vehicles |
| ENGINEER | Support | 0 | 0 | Medium | None | Captures buildings |
| COMMANDO | Elite | 100 | 6 | Fast | Medium | Instant kill infantry |
| SCOUT_BUGGY | Recon | 10 | 4 | Very Fast | Light | Best vision range |
| TANK | Main battle | 80 | 6 | Medium | Heavy | Crushes infantry |
| ARTILLERY | Siege | 150 | 10 | Slow | Light | Outranges defenses |
| HEAVY_TANK | Assault | 120 | 6 | Slow | Very Heavy | High HP |
| STEALTH_TANK | Special ops | 90 | 6 | Fast | Medium | Cloaking |
| HARVESTER | Economy | 0 | 0 | Slow | Medium | Non-combat |

### Building Type Definitions

| Building | Role | HP | Damage | Range | Special |
|----------|------|-----|--------|-------|---------|
| CONSTRUCTION_YARD | Core | 2000 | 0 | 0 | Must protect |
| POWER_PLANT | Infrastructure | 500 | 0 | 0 | Powers base |
| BARRACKS | Production | 800 | 0 | 0 | Infantry |
| REFINERY | Economy | 1000 | 0 | 0 | Income source |
| WAR_FACTORY | Production | 1200 | 0 | 0 | Vehicles |
| TECH_CENTER | Tech | 1000 | 0 | 0 | Unlocks elite |
| GUARD_TOWER | Defense | 600 | 40 | 7 | Anti-ground |
| SAM_SITE | Defense | 500 | 60 | 8 | Anti-air only |
| OBELISK | Defense | 800 | 200 | 8 | Beam weapon |
| TURRET | Defense | 400 | 30 | 6 | Rapid fire |

---

## Counter Matrix

### Unit vs Unit Effectiveness

```javascript
const UNIT_VS_UNIT = {
    // Attacker → Defender → Effectiveness (0.0 - 2.0, where 1.0 is neutral)
    RIFLEMAN: {
        RIFLEMAN: 1.0,
        ROCKET_SOLDIER: 1.2,      // Faster fire rate
        ENGINEER: 2.0,            // Easy kill
        COMMANDO: 0.3,            // Gets destroyed
        SCOUT_BUGGY: 0.5,         // Hard to hit
        TANK: 0.2,                // Barely scratches
        ARTILLERY: 0.8,           // Light armor
        HEAVY_TANK: 0.1,          // Useless
        STEALTH_TANK: 0.4,        // Can't see it
        HARVESTER: 0.5            // Tanky
    },
    ROCKET_SOLDIER: {
        RIFLEMAN: 0.6,            // Overkill, slow fire
        ROCKET_SOLDIER: 1.0,
        ENGINEER: 1.5,
        COMMANDO: 0.4,
        SCOUT_BUGGY: 1.5,         // Anti-vehicle
        TANK: 1.5,                // Designed for this
        ARTILLERY: 1.3,
        HEAVY_TANK: 1.2,          // Still effective
        STEALTH_TANK: 1.4,
        HARVESTER: 1.5
    },
    TANK: {
        RIFLEMAN: 2.0,            // Crushes them
        ROCKET_SOLDIER: 1.5,      // Outguns them
        ENGINEER: 2.0,
        COMMANDO: 1.2,
        SCOUT_BUGGY: 1.3,
        TANK: 1.0,
        ARTILLERY: 1.5,           // Close range wins
        HEAVY_TANK: 0.7,          // Outgunned
        STEALTH_TANK: 0.8,
        HARVESTER: 1.2
    },
    ARTILLERY: {
        RIFLEMAN: 1.5,            // Splash damage
        ROCKET_SOLDIER: 1.3,
        ENGINEER: 1.5,
        COMMANDO: 1.0,
        SCOUT_BUGGY: 0.6,         // Too fast
        TANK: 1.2,
        ARTILLERY: 1.0,
        HEAVY_TANK: 1.0,
        STEALTH_TANK: 0.5,        // Can't see it
        HARVESTER: 1.3
    },
    COMMANDO: {
        RIFLEMAN: 2.0,            // Instant kill
        ROCKET_SOLDIER: 2.0,
        ENGINEER: 2.0,
        COMMANDO: 1.0,
        SCOUT_BUGGY: 0.3,         // Vehicles immune
        TANK: 0.1,                // Can't hurt vehicles
        ARTILLERY: 0.2,
        HEAVY_TANK: 0.1,
        STEALTH_TANK: 0.1,
        HARVESTER: 0.2
    },
    HEAVY_TANK: {
        RIFLEMAN: 2.0,
        ROCKET_SOLDIER: 1.8,
        ENGINEER: 2.0,
        COMMANDO: 1.5,
        SCOUT_BUGGY: 1.5,
        TANK: 1.5,
        ARTILLERY: 1.8,
        HEAVY_TANK: 1.0,
        STEALTH_TANK: 1.2,
        HARVESTER: 1.5
    }
};
```

### Unit vs Building Effectiveness

```javascript
const UNIT_VS_BUILDING = {
    RIFLEMAN: {
        CONSTRUCTION_YARD: 0.3,   // Takes forever
        POWER_PLANT: 0.5,
        BARRACKS: 0.4,
        REFINERY: 0.4,
        WAR_FACTORY: 0.3,
        TECH_CENTER: 0.4,
        GUARD_TOWER: 0.2,         // Gets killed first
        SAM_SITE: 0.6,            // Ground unit vs anti-air
        OBELISK: 0.1,             // Instant death
        TURRET: 0.3
    },
    ROCKET_SOLDIER: {
        CONSTRUCTION_YARD: 0.8,
        POWER_PLANT: 1.0,
        BARRACKS: 0.9,
        REFINERY: 0.9,
        WAR_FACTORY: 0.8,
        TECH_CENTER: 0.9,
        GUARD_TOWER: 0.6,         // Can trade
        SAM_SITE: 1.2,            // Ground immune
        OBELISK: 0.3,             // Still dangerous
        TURRET: 0.7
    },
    TANK: {
        CONSTRUCTION_YARD: 1.2,
        POWER_PLANT: 1.5,
        BARRACKS: 1.4,
        REFINERY: 1.3,
        WAR_FACTORY: 1.2,
        TECH_CENTER: 1.3,
        GUARD_TOWER: 0.8,         // Takes damage
        SAM_SITE: 1.5,            // Easy target
        OBELISK: 0.4,             // Very dangerous
        TURRET: 0.9
    },
    ARTILLERY: {
        CONSTRUCTION_YARD: 1.5,
        POWER_PLANT: 1.8,
        BARRACKS: 1.7,
        REFINERY: 1.6,
        WAR_FACTORY: 1.5,
        TECH_CENTER: 1.6,
        GUARD_TOWER: 2.0,         // Outranges it!
        SAM_SITE: 2.0,            // Outranges it!
        OBELISK: 1.5,             // Can outrange
        TURRET: 2.0               // Outranges it!
    },
    HEAVY_TANK: {
        CONSTRUCTION_YARD: 1.5,
        POWER_PLANT: 1.8,
        BARRACKS: 1.7,
        REFINERY: 1.6,
        WAR_FACTORY: 1.5,
        TECH_CENTER: 1.6,
        GUARD_TOWER: 1.2,         // Can tank hits
        SAM_SITE: 1.8,
        OBELISK: 0.7,             // Still hurts
        TURRET: 1.3
    },
    ENGINEER: {
        CONSTRUCTION_YARD: 3.0,   // Instant capture!
        POWER_PLANT: 3.0,
        BARRACKS: 3.0,
        REFINERY: 3.0,
        WAR_FACTORY: 3.0,
        TECH_CENTER: 3.0,
        GUARD_TOWER: 0.0,         // Can't capture defenses
        SAM_SITE: 0.0,
        OBELISK: 0.0,
        TURRET: 0.0
    }
};
```

### Building Weaknesses (What Counters Them)

```javascript
const BUILDING_COUNTERS = {
    GUARD_TOWER: {
        hardCounters: ['ARTILLERY'],           // Outranges
        softCounters: ['HEAVY_TANK', 'TANK'],  // Can overwhelm
        weakness: 'RANGE',                      // Limited range
        strategy: 'OUTRANGE_OR_SWARM'
    },
    SAM_SITE: {
        hardCounters: ['TANK', 'ARTILLERY'],   // Ground units
        softCounters: ['RIFLEMAN'],
        weakness: 'GROUND_ONLY',               // Can't hit ground
        strategy: 'USE_GROUND_UNITS'
    },
    OBELISK: {
        hardCounters: ['ARTILLERY'],           // Only thing that outranges
        softCounters: ['HEAVY_TANK'],          // Can survive a hit
        weakness: 'SINGLE_TARGET',             // One target at a time
        strategy: 'SWARM_OR_OUTRANGE'
    },
    TURRET: {
        hardCounters: ['ARTILLERY', 'TANK'],
        softCounters: ['ROCKET_SOLDIER'],
        weakness: 'LOW_DAMAGE',
        strategy: 'OVERWHELM'
    },
    REFINERY: {
        hardCounters: ['COMMANDO'],            // Quick kill
        softCounters: ['TANK', 'ARTILLERY'],
        weakness: 'NO_DEFENSE',
        strategy: 'PRIORITY_TARGET'
    },
    CONSTRUCTION_YARD: {
        hardCounters: ['ENGINEER'],            // Instant capture
        softCounters: ['ARTILLERY', 'HEAVY_TANK'],
        weakness: 'HIGH_VALUE',
        strategy: 'CAPTURE_OR_DESTROY'
    }
};
```

---

## Combat Effectiveness Tracking

### 1. Damage Tracker Class

```javascript
class CombatTracker {
    constructor() {
        // Track effectiveness per engagement
        this.engagements = [];

        // Running totals per unit type
        this.unitStats = new Map();
        // Format: unitType → {
        //   damageDealt: number,
        //   damageTaken: number,
        //   kills: number,
        //   deaths: number,
        //   vsTargetType: Map<targetType, {dealt, taken}>
        // }
    }

    recordDamage(attacker, defender, damage) {
        const attackerType = attacker.config?.type || attacker.type;
        const defenderType = defender.config?.type || defender.type;

        // Update attacker stats
        this.updateStats(attackerType, defenderType, damage, 0);

        // Update defender stats (damage taken)
        this.updateStats(defenderType, attackerType, 0, damage);
    }

    recordKill(killer, victim) {
        const killerType = killer.config?.type || killer.type;
        const victimType = victim.config?.type || victim.type;

        const killerStats = this.getStats(killerType);
        killerStats.kills++;

        const victimStats = this.getStats(victimType);
        victimStats.deaths++;
    }

    // Calculate effectiveness ratio for unit type vs target type
    getEffectiveness(unitType, targetType) {
        const stats = this.getStats(unitType);
        const vsTarget = stats.vsTargetType.get(targetType);

        if (!vsTarget || vsTarget.dealt === 0) {
            // No data, use theoretical matrix
            return this.getTheoreticalEffectiveness(unitType, targetType);
        }

        // Effectiveness = damage dealt / damage taken
        // Higher is better
        const ratio = vsTarget.dealt / Math.max(vsTarget.taken, 1);
        return ratio;
    }

    getTheoreticalEffectiveness(unitType, targetType) {
        // Check if target is a building or unit
        if (UNIT_VS_BUILDING[unitType]?.[targetType]) {
            return UNIT_VS_BUILDING[unitType][targetType];
        }
        if (UNIT_VS_UNIT[unitType]?.[targetType]) {
            return UNIT_VS_UNIT[unitType][targetType];
        }
        return 1.0; // Neutral
    }
}
```

### 2. Engagement Analysis

```javascript
class EngagementAnalyzer {
    constructor(combatTracker) {
        this.tracker = combatTracker;
        this.currentEngagement = null;
    }

    startEngagement(attackingUnits, targetPosition) {
        this.currentEngagement = {
            startTime: Date.now(),
            startingUnits: attackingUnits.map(u => ({
                id: u.id,
                type: u.config?.type,
                hp: u.health
            })),
            currentUnits: [...attackingUnits],
            casualties: [],
            damageDealt: 0,
            damageTaken: 0,
            targetPosition,
            status: 'IN_PROGRESS'
        };
    }

    updateEngagement(deltaTime) {
        if (!this.currentEngagement) return null;

        const eng = this.currentEngagement;

        // Update current unit list (remove dead)
        eng.currentUnits = eng.currentUnits.filter(u => !u.isDead());

        // Calculate losses
        const startCount = eng.startingUnits.length;
        const currentCount = eng.currentUnits.length;
        const lossPercent = (startCount - currentCount) / startCount;

        // Evaluate engagement status
        return {
            duration: Date.now() - eng.startTime,
            lossPercent,
            unitsRemaining: currentCount,
            damageDealt: eng.damageDealt,
            damageTaken: eng.damageTaken,
            efficiency: eng.damageDealt / Math.max(eng.damageTaken, 1),
            status: this.evaluateStatus(lossPercent, eng.damageDealt)
        };
    }

    evaluateStatus(lossPercent, damageDealt) {
        // Stalled: High losses, low damage
        if (lossPercent > 0.3 && damageDealt < 500) {
            return 'STALLED';
        }

        // Failing: Very high losses
        if (lossPercent > 0.5) {
            return 'FAILING';
        }

        // Winning: Low losses, good damage
        if (lossPercent < 0.2 && damageDealt > 1000) {
            return 'WINNING';
        }

        return 'CONTESTED';
    }
}
```

---

## Strategy Selection System

### 1. Strategy Definitions

```javascript
const ATTACK_STRATEGIES = {
    INFANTRY_SWARM: {
        name: 'Infantry Swarm',
        description: 'Overwhelm with cheap infantry',
        composition: {
            RIFLEMAN: { ratio: 0.7 },
            ROCKET_SOLDIER: { ratio: 0.3 }
        },
        minUnits: 12,
        bestAgainst: ['SAM_SITE', 'LIGHT_VEHICLES'],
        weakAgainst: ['TANK', 'OBELISK', 'GUARD_TOWER']
    },

    ARMOR_PUSH: {
        name: 'Armor Push',
        description: 'Tank assault with infantry support',
        composition: {
            TANK: { ratio: 0.5 },
            HEAVY_TANK: { ratio: 0.2 },
            ROCKET_SOLDIER: { ratio: 0.3 }
        },
        minUnits: 8,
        bestAgainst: ['INFANTRY', 'LIGHT_DEFENSES', 'BUILDINGS'],
        weakAgainst: ['OBELISK', 'MASSED_ROCKETS']
    },

    ARTILLERY_SIEGE: {
        name: 'Artillery Siege',
        description: 'Outrange defenses, destroy from afar',
        composition: {
            ARTILLERY: { ratio: 0.4 },
            TANK: { ratio: 0.3 },
            ROCKET_SOLDIER: { ratio: 0.3 }
        },
        minUnits: 6,
        bestAgainst: ['GUARD_TOWER', 'SAM_SITE', 'TURRET', 'OBELISK'],
        weakAgainst: ['FAST_UNITS', 'FLANKING']
    },

    BLITZ: {
        name: 'Blitz',
        description: 'Fast units hit economy/production',
        composition: {
            SCOUT_BUGGY: { ratio: 0.4 },
            TANK: { ratio: 0.4 },
            STEALTH_TANK: { ratio: 0.2 }
        },
        minUnits: 6,
        bestAgainst: ['HARVESTERS', 'REFINERIES', 'UNDEFENDED_BUILDINGS'],
        weakAgainst: ['GUARD_TOWER', 'PREPARED_DEFENSE']
    },

    ENGINEER_RUSH: {
        name: 'Engineer Rush',
        description: 'Capture key buildings',
        composition: {
            ENGINEER: { ratio: 0.3 },
            TANK: { ratio: 0.4 },
            RIFLEMAN: { ratio: 0.3 }
        },
        minUnits: 8,
        bestAgainst: ['CONSTRUCTION_YARD', 'WAR_FACTORY', 'REFINERY'],
        weakAgainst: ['INFANTRY_DEFENSE', 'WALLS']
    },

    BALANCED_ASSAULT: {
        name: 'Balanced Assault',
        description: 'Flexible mixed force',
        composition: {
            TANK: { ratio: 0.3 },
            RIFLEMAN: { ratio: 0.25 },
            ROCKET_SOLDIER: { ratio: 0.25 },
            ARTILLERY: { ratio: 0.2 }
        },
        minUnits: 10,
        bestAgainst: ['MIXED_DEFENSE', 'UNKNOWN'],
        weakAgainst: ['SPECIALIZED_COUNTER']
    }
};
```

### 2. Strategy Selector

```javascript
class StrategySelector {
    constructor(enemyMemory, combatTracker) {
        this.memory = enemyMemory;
        this.tracker = combatTracker;
        this.currentStrategy = null;
        this.strategyHistory = [];
    }

    selectStrategy() {
        const threats = this.analyzeKnownThreats();
        const scores = {};

        // Score each strategy against known threats
        for (const [strategyName, strategy] of Object.entries(ATTACK_STRATEGIES)) {
            scores[strategyName] = this.scoreStrategy(strategy, threats);
        }

        // Penalize recently failed strategies
        for (const history of this.strategyHistory.slice(-3)) {
            if (history.result === 'FAILED') {
                scores[history.strategy] *= 0.5; // 50% penalty
            }
        }

        // Select highest scoring strategy
        const best = Object.entries(scores)
            .sort((a, b) => b[1] - a[1])[0];

        console.log(`[AI] Strategy scores:`, scores);
        console.log(`[AI] Selected strategy: ${best[0]} (score: ${best[1].toFixed(2)})`);

        this.currentStrategy = best[0];
        return ATTACK_STRATEGIES[best[0]];
    }

    analyzeKnownThreats() {
        const threats = {
            defensiveBuildings: [],
            combatUnits: [],
            productionBuildings: [],
            economyBuildings: [],
            totalThreatLevel: 0
        };

        if (!this.memory) return threats;

        // Categorize discovered buildings
        for (const [id, building] of this.memory.buildings) {
            if (building.destroyed) continue;

            const type = building.type.toUpperCase();

            if (['GUARD_TOWER', 'SAM_SITE', 'OBELISK', 'TURRET'].includes(type)) {
                threats.defensiveBuildings.push(building);
                threats.totalThreatLevel += this.getThreatValue(type);
            } else if (['BARRACKS', 'WAR_FACTORY'].includes(type)) {
                threats.productionBuildings.push(building);
            } else if (['REFINERY', 'HARVESTER'].includes(type)) {
                threats.economyBuildings.push(building);
            }
        }

        // Categorize discovered units
        for (const [id, unit] of this.memory.units) {
            if (unit.destroyed) continue;
            threats.combatUnits.push(unit);
        }

        return threats;
    }

    scoreStrategy(strategy, threats) {
        let score = 50; // Base score

        // Bonus for countering defensive buildings
        for (const defense of threats.defensiveBuildings) {
            const defenseType = defense.type.toUpperCase();
            if (strategy.bestAgainst.includes(defenseType)) {
                score += 20;
            }
            if (strategy.weakAgainst.includes(defenseType)) {
                score -= 30;
            }
        }

        // Check for heavy defenses (obelisk, multiple towers)
        const hasObelisk = threats.defensiveBuildings.some(d =>
            d.type.toUpperCase() === 'OBELISK');
        const towerCount = threats.defensiveBuildings.filter(d =>
            d.type.toUpperCase() === 'GUARD_TOWER').length;

        if (hasObelisk && strategy.name !== 'Artillery Siege') {
            score -= 40; // Heavy penalty for non-siege vs obelisk
        }

        if (towerCount >= 3 && !strategy.bestAgainst.includes('GUARD_TOWER')) {
            score -= 20;
        }

        // Bonus for targeting economy if defenses are light
        if (threats.defensiveBuildings.length <= 1 &&
            threats.economyBuildings.length > 0 &&
            strategy.bestAgainst.includes('REFINERIES')) {
            score += 30;
        }

        // Unknown enemy composition - prefer balanced
        if (threats.totalThreatLevel === 0) {
            if (strategy.name === 'Balanced Assault') {
                score += 20;
            }
        }

        return Math.max(0, score);
    }

    getThreatValue(buildingType) {
        const values = {
            GUARD_TOWER: 3,
            TURRET: 2,
            SAM_SITE: 2,
            OBELISK: 5
        };
        return values[buildingType] || 1;
    }

    recordStrategyResult(strategyName, result) {
        this.strategyHistory.push({
            strategy: strategyName,
            result, // 'SUCCESS', 'FAILED', 'PARTIAL'
            timestamp: Date.now()
        });

        // Keep last 10 results
        if (this.strategyHistory.length > 10) {
            this.strategyHistory.shift();
        }
    }
}
```

---

## Adaptive Re-evaluation System

### 1. Attack Monitor

```javascript
class AttackMonitor {
    constructor(aiController, strategySelector, engagementAnalyzer) {
        this.ai = aiController;
        this.selector = strategySelector;
        this.analyzer = engagementAnalyzer;

        this.reevaluationCooldown = 0;
        this.minReevaluationInterval = 15; // seconds
        this.consecutiveFailures = 0;
    }

    update(deltaTime) {
        this.reevaluationCooldown -= deltaTime;

        if (this.ai.state !== AI_STATE.ATTACKING) return;

        const status = this.analyzer.updateEngagement(deltaTime);
        if (!status) return;

        // Check if we need to re-evaluate
        if (this.shouldReevaluate(status)) {
            this.reevaluate(status);
        }
    }

    shouldReevaluate(status) {
        if (this.reevaluationCooldown > 0) return false;

        // Re-evaluate if attack is failing
        if (status.status === 'FAILING') return true;

        // Re-evaluate if stalled for too long
        if (status.status === 'STALLED' && status.duration > 30000) return true;

        // Re-evaluate if taking heavy losses with low damage output
        if (status.lossPercent > 0.4 && status.efficiency < 0.5) return true;

        return false;
    }

    reevaluate(status) {
        console.log(`[AI] Attack re-evaluation triggered: ${status.status}`);
        console.log(`[AI] Losses: ${(status.lossPercent * 100).toFixed(1)}%, Efficiency: ${status.efficiency.toFixed(2)}`);

        this.reevaluationCooldown = this.minReevaluationInterval;

        // Record failure of current strategy
        if (this.selector.currentStrategy) {
            this.selector.recordStrategyResult(this.selector.currentStrategy, 'FAILED');
        }

        this.consecutiveFailures++;

        // Analyze what went wrong
        const analysis = this.analyzeFailure(status);

        // Decide next action
        const decision = this.decideNextAction(analysis);

        console.log(`[AI] Failure analysis: ${analysis.reason}`);
        console.log(`[AI] Decision: ${decision.action}`);

        this.executeDecision(decision);
    }

    analyzeFailure(status) {
        const engagement = this.analyzer.currentEngagement;

        // Check what's killing our units
        const threats = this.identifyActiveThreats();

        // Determine primary cause of failure
        if (threats.defensiveBuildings.length > 0) {
            const hasObelisk = threats.defensiveBuildings.some(d =>
                d.type === 'obelisk');
            const hasTowers = threats.defensiveBuildings.some(d =>
                d.type === 'guard_tower');

            if (hasObelisk) {
                return {
                    reason: 'OBELISK_DAMAGE',
                    suggestion: 'NEED_ARTILLERY',
                    threats
                };
            }

            if (hasTowers && status.lossPercent > 0.3) {
                return {
                    reason: 'TOWER_DAMAGE',
                    suggestion: 'NEED_RANGE_OR_MASS',
                    threats
                };
            }
        }

        // Check if we're losing to enemy units
        if (threats.combatUnits.length > engagement.currentUnits.length) {
            return {
                reason: 'OUTNUMBERED',
                suggestion: 'NEED_MORE_UNITS',
                threats
            };
        }

        // Check unit composition mismatch
        const enemyHasVehicles = threats.combatUnits.some(u =>
            ['TANK', 'HEAVY_TANK', 'ARTILLERY'].includes(u.type?.toUpperCase()));
        const weHaveAntiVehicle = engagement.currentUnits.some(u =>
            u.config?.type === 'ROCKET_SOLDIER');

        if (enemyHasVehicles && !weHaveAntiVehicle) {
            return {
                reason: 'COMPOSITION_MISMATCH',
                suggestion: 'NEED_ANTI_VEHICLE',
                threats
            };
        }

        return {
            reason: 'UNKNOWN',
            suggestion: 'FALLBACK_AND_REGROUP',
            threats
        };
    }

    decideNextAction(analysis) {
        switch (analysis.suggestion) {
            case 'NEED_ARTILLERY':
                return {
                    action: 'RETREAT_AND_BUILD',
                    unitsToBuild: ['ARTILLERY', 'ARTILLERY'],
                    newStrategy: 'ARTILLERY_SIEGE'
                };

            case 'NEED_RANGE_OR_MASS':
                if (this.ai.getArmySize() < 10) {
                    return {
                        action: 'RETREAT_AND_MASS',
                        targetArmySize: 15,
                        newStrategy: 'ARMOR_PUSH'
                    };
                }
                return {
                    action: 'SWITCH_STRATEGY',
                    newStrategy: 'ARTILLERY_SIEGE'
                };

            case 'NEED_MORE_UNITS':
                return {
                    action: 'RETREAT_AND_MASS',
                    targetArmySize: this.ai.getArmySize() + 8,
                    newStrategy: null // Keep current
                };

            case 'NEED_ANTI_VEHICLE':
                return {
                    action: 'RETREAT_AND_BUILD',
                    unitsToBuild: ['ROCKET_SOLDIER', 'ROCKET_SOLDIER', 'TANK'],
                    newStrategy: 'BALANCED_ASSAULT'
                };

            case 'FALLBACK_AND_REGROUP':
            default:
                return {
                    action: 'TACTICAL_RETREAT',
                    regroupPosition: this.ai.getBaseCenter(),
                    newStrategy: 'BALANCED_ASSAULT'
                };
        }
    }

    executeDecision(decision) {
        switch (decision.action) {
            case 'RETREAT_AND_BUILD':
                this.ai.issueRetreatOrders();
                this.ai.taskQueue.addTask({
                    type: 'PRODUCE_COMPOSITION',
                    target: decision.unitsToBuild,
                    priority: 5
                });
                this.ai.state = AI_STATE.MASSING;
                break;

            case 'RETREAT_AND_MASS':
                this.ai.issueRetreatOrders();
                this.ai.targetArmySize = decision.targetArmySize;
                this.ai.state = AI_STATE.MASSING;
                break;

            case 'SWITCH_STRATEGY':
                // Don't retreat, just change composition for reinforcements
                this.selector.currentStrategy = decision.newStrategy;
                break;

            case 'TACTICAL_RETREAT':
                this.ai.issueRetreatOrders(decision.regroupPosition);
                this.ai.state = AI_STATE.MASSING;
                break;
        }

        if (decision.newStrategy) {
            this.selector.currentStrategy = decision.newStrategy;
            console.log(`[AI] New strategy: ${decision.newStrategy}`);
        }
    }

    identifyActiveThreats() {
        // Get entities currently in combat with our units
        const threats = {
            defensiveBuildings: [],
            combatUnits: []
        };

        const engagement = this.analyzer.currentEngagement;
        if (!engagement) return threats;

        // Find buildings/units near engagement area
        const searchRadius = 400; // pixels
        const center = engagement.targetPosition;

        if (Game.instance?.buildingManager) {
            for (const building of Game.instance.buildingManager.buildings) {
                if (building.owner === this.ai.player) continue;
                if (building.isDead()) continue;

                const dist = Math.hypot(building.x - center.x, building.y - center.y);
                if (dist < searchRadius) {
                    if (['guard_tower', 'obelisk', 'turret', 'sam_site'].includes(building.type)) {
                        threats.defensiveBuildings.push(building);
                    }
                }
            }
        }

        if (Game.instance?.unitManager) {
            for (const unit of Game.instance.unitManager.units) {
                if (unit.owner === this.ai.player) continue;
                if (unit.isDead()) continue;

                const dist = Math.hypot(unit.x - center.x, unit.y - center.y);
                if (dist < searchRadius) {
                    threats.combatUnits.push(unit);
                }
            }
        }

        return threats;
    }
}
```

---

## Integration with AI Controller

### Event Hooks for Combat

```javascript
// In AIEventHooks.js
setupCombatHooks() {
    // Track damage dealt
    EVENTS.on('DAMAGE_DEALT', (data) => {
        if (this.isRelevant(data)) {
            this.ai.combatTracker.recordDamage(data.attacker, data.defender, data.damage);
        }
    });

    // Track kills
    EVENTS.on(EVENT_NAMES.UNIT_DESTROYED, (data) => {
        if (data.killer && this.isRelevant({ player: data.killer.owner })) {
            this.ai.combatTracker.recordKill(data.killer, data.unit);
        }
    });

    EVENTS.on(EVENT_NAMES.BUILDING_DESTROYED, (data) => {
        if (data.killer && this.isRelevant({ player: data.killer.owner })) {
            this.ai.combatTracker.recordKill(data.killer, data.building);
        }
    });
}
```

### Attack Phase Integration

```javascript
// In AIController.js
updateAttackPhase(deltaTime) {
    // Let attack monitor handle re-evaluation
    this.attackMonitor.update(deltaTime);

    // If no current strategy, select one
    if (!this.strategySelector.currentStrategy) {
        const strategy = this.strategySelector.selectStrategy();
        this.buildStrategyComposition(strategy);
    }

    // Rest of attack logic...
}

buildStrategyComposition(strategy) {
    const armySize = this.targetArmySize || strategy.minUnits;
    const composition = [];

    for (const [unitType, config] of Object.entries(strategy.composition)) {
        const count = Math.round(armySize * config.ratio);
        for (let i = 0; i < count; i++) {
            composition.push(unitType);
        }
    }

    // Queue production
    for (const unitType of composition) {
        this.taskQueue.addTask({
            type: 'PRODUCE',
            target: unitType.toLowerCase(),
            priority: 10
        });
    }
}
```

---

## Implementation Checklist

### Phase 1: Counter Matrix Data
- [ ] Define UNIT_VS_UNIT effectiveness matrix
- [ ] Define UNIT_VS_BUILDING effectiveness matrix
- [ ] Define BUILDING_COUNTERS with weaknesses
- [ ] Add threat values for each building type

### Phase 2: Combat Tracking
- [ ] Create CombatTracker class
- [ ] Implement damage recording
- [ ] Implement kill tracking
- [ ] Add effectiveness calculation methods
- [ ] Emit DAMAGE_DEALT events from combat code

### Phase 3: Engagement Analysis
- [ ] Create EngagementAnalyzer class
- [ ] Implement engagement start/end tracking
- [ ] Calculate loss percentages and efficiency
- [ ] Evaluate engagement status (WINNING, STALLED, FAILING)

### Phase 4: Strategy System
- [ ] Define ATTACK_STRATEGIES with compositions
- [ ] Create StrategySelector class
- [ ] Implement threat analysis
- [ ] Implement strategy scoring
- [ ] Track strategy history and failures

### Phase 5: Adaptive Re-evaluation
- [ ] Create AttackMonitor class
- [ ] Implement shouldReevaluate logic
- [ ] Implement analyzeFailure with reasons
- [ ] Implement decideNextAction
- [ ] Implement executeDecision (retreat, regroup, switch)

### Phase 6: Integration
- [ ] Add combat hooks to AIEventHooks
- [ ] Integrate AttackMonitor into attack phase
- [ ] Connect strategy selection to unit production
- [ ] Add debug logging for strategy decisions

---

## Example Flow: Failed Attack Re-evaluation

```
1. AI selects INFANTRY_SWARM strategy (12 riflemen)
2. Attack begins, engagement tracked

3. After 20 seconds:
   - Loss: 50% (6 dead)
   - Damage dealt: 400
   - Status: FAILING

4. Re-evaluation triggered:
   - Threats identified: 2x Guard Tower, 1x Obelisk
   - Analysis: OBELISK_DAMAGE
   - Suggestion: NEED_ARTILLERY

5. Decision: RETREAT_AND_BUILD
   - Issue retreat orders
   - Queue: 2x Artillery production
   - New strategy: ARTILLERY_SIEGE
   - State → MASSING

6. Once artillery built:
   - Army: 6 riflemen + 2 artillery
   - Resume attack with new composition
   - Artillery outranges obelisk
   - Attack succeeds

7. Record strategy result: ARTILLERY_SIEGE → SUCCESS
```

---

## Debug Output Example

```
[AI] RUSHER starting attack with INFANTRY_SWARM
[AI] Engagement started: 12 units vs target (1024, 768)
[AI] Engagement update: 10s, losses 25%, efficiency 0.8, status CONTESTED
[AI] Engagement update: 20s, losses 50%, efficiency 0.4, status FAILING
[AI] Attack re-evaluation triggered: FAILING
[AI] Losses: 50.0%, Efficiency: 0.40
[AI] Failure analysis: OBELISK_DAMAGE
[AI] Decision: RETREAT_AND_BUILD
[AI] New strategy: ARTILLERY_SIEGE
[AI] STATE: ATTACKING → MASSING
[AI] Queued production: ARTILLERY, ARTILLERY
...
[AI] Army ready, resuming attack with ARTILLERY_SIEGE
[AI] Engagement started: 8 units vs target (1024, 768)
[AI] Artillery engaging obelisk from range 10 (obelisk range: 8)
[AI] Engagement update: 15s, losses 12%, efficiency 2.3, status WINNING
[AI] Target destroyed: obelisk
[AI] Recording strategy result: ARTILLERY_SIEGE → SUCCESS
```
