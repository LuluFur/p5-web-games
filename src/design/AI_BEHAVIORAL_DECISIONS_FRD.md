# AI Behavioral Decisions Feature Requirement Document (FRD)

## Overview

This document defines the AI behavioral decision system for strategic building placement and defense coordination. The system enhances AI from simple spiral placement to context-aware positioning based on building importance, defensive needs, and adaptive strategy evolution.

## Core Components

### 1. Building Placement Strategy System

#### 1.1 Placement Modes Classification

Each building type is classified into one of three placement modes:

**SPREAD Mode:**
- **Purpose:** Optimize coverage and resource efficiency
- **Buildings:** Power plants, refineries, tiberium silos
- **Logic:** Distribute across base to maximize effect radius and vulnerability reduction
- **Pattern:** Minimum distance constraints between similar buildings (e.g., power plants 8+ cells apart)

**DEFENDED Mode:**
- **Purpose:** Protect critical infrastructure with layered defenses
- **Buildings:** Construction yard, tech center, radar, war factory
- **Logic:** Central placement with defensive perimeter
- **Pattern:** Position near base core, immediate defense deployment

**NEUTRAL Mode:**
- **Purpose:** Flexible placement based on available space
- **Buildings:** Barracks, armory, helipad
- **Logic:** Fill gaps, use available valid positions
- **Pattern:** No strict constraints, prioritize space efficiency

#### 1.2 Strategic Placement Algorithm

```javascript
class StrategicPlacementEngine {
    findPlacement(buildingType, player, existingBuildings) {
        const placementMode = this.getPlacementMode(buildingType);
        
        switch (placementMode) {
            case PLACEMENT_MODE.SPREAD:
                return this.findSpreadPlacement(buildingType, existingBuildings);
            case PLACEMENT_MODE.DEFENDED:
                return this.findDefendedPlacement(buildingType, player);
            case PLACEMENT_MODE.NEUTRAL:
                return this.findNeutralPlacement(buildingType, existingBuildings);
        }
    }
    
    findSpreadPlacement(buildingType, existingBuildings) {
        // Find position that maximizes distance from similar buildings
        const similarBuildings = existingBuildings.filter(b => 
            b.type === buildingType || 
            this.isSimilarInfrastructure(b.type, buildingType)
        );
        
        // Calculate distance-weighted placement score
        let bestPosition = null;
        let bestScore = -Infinity;
        
        for (const candidate of this.generateCandidatePositions()) {
            const minDistance = Math.min(
                ...similarBuildings.map(b => 
                    this.gridDistance(candidate, b.position)
                )
            );
            
            const score = minDistance; // Prefer maximum separation
            if (score > bestScore) {
                bestScore = score;
                bestPosition = candidate;
            }
        }
        
        return bestPosition;
    }
    
    findDefendedPlacement(buildingType, player) {
        // Calculate base center from existing buildings
        const baseCenter = this.calculateBaseCenter(existingBuildings);
        
        // Find position near base center with defensive considerations
        const candidatePositions = this.generatePositionsAroundPoint(
            baseCenter, 3, 6 // 3-6 cells from center
        );
        
        // Score based on defensibility and accessibility
        return candidatePositions.reduce((best, current) => 
            this.calculateDefensiveScore(current) > 
            this.calculateDefensiveScore(best) ? current : best
        );
    }
}
```

### 2. Adaptive Defense System

#### 2.1 Defense Personality Mapping

Different AI personalities prefer different defense types:

```javascript
const DEFENSE_PREFERENCES = {
    [AI_PERSONALITY.TURTLE]: {
        primary: 'guard_tower',
        secondary: 'impact_cannon',
        strategy: 'perimeter', // Focus on outer defenses
        density: 'high',       // More defensive structures
        evolution: 'conservative' // Slow to adapt
    },
    [AI_PERSONALITY.RUSHER]: {
        primary: 'impact_cannon',
        secondary: 'guard_tower',
        strategy: 'choke_point', // Focus on key approaches
        density: 'minimal',      // Fewer defenses, more units
        evolution: 'aggressive'    // Rapid adaptation to attacks
    },
    [AI_PERSONALITY.BALANCED]: {
        primary: 'guard_tower',
        secondary: 'impact_cannon',
        strategy: 'layered',     // Mixed approach
        density: 'medium',
        evolution: 'adaptive'     // Balanced adaptation
    }
};
```

#### 2.2 Defense Deployment Logic

When a DEFENDED building is placed, the AI evaluates and deploys defenses:

```javascript
deployDefenseForBuilding(building, personality, difficulty) {
    const defenseConfig = DEFENSE_PREFERENCES[personality];
    const threatLevel = this.assessThreatLevel(building);
    
    // Calculate required defense based on building importance
    const defenseCount = this.calculateDefenseRequirement(
        building.type, 
        threatLevel, 
        defenseConfig.density
    );
    
    // Generate defensive positions around building
    const defensePositions = this.generateDefensePositions(
        building.position,
        defenseCount,
        defenseConfig.strategy
    );
    
    // Queue defense construction
    for (const position of defensePositions) {
        const defenseType = this.selectDefenseType(
            defenseConfig,
            this.enemyComposition,
            difficulty.intelligence
        );
        
        this.priorityQueue.push({
            type: 'defense',
            buildingType: defenseType,
            position: position,
            priority: 'HIGH',
            defending: building
        });
    }
}
```

### 3. Event-Driven Decision Making

#### 3.1 Event Subscription and Response

The AI responds dynamically to game events:

**Event: BUILDING_DESTROYED**
```javascript
_onBuildingDestroyed(event) {
    const { building, destroyer } = event.data;
    
    // Decision: Was this a critical loss?
    if (this.isCriticalBuilding(building.type)) {
        // Reaction: Immediate defensive posture
        this.state = AI_STATE.DEFENSIVE;
        
        // Action: Rebuild with higher priority
        this.priorityQueue.push({
            type: 'rebuild',
            buildingType: building.type,
            priority: 'URGENT',
            defendImmediately: true
        });
        
        // Evolution: Learn attack vector
        this.updateThreatModel(destroyer, building.position);
    }
    
    // Decision: Is our defense composition ineffective?
    if (building.type.includes('tower') || building.type.includes('cannon')) {
        if (building.timeAlive < this.averageDefenseLifetime) {
            // Reaction: Adapt defense types
            this.adaptDefenseComposition();
        }
    }
}
```

**Event: ENEMY_REVEALED**
```javascript
_onEnemyRevealed(event) {
    const { unit, position } = event.data;
    
    // Decision: What type of threat is this?
    const threatType = this.classifyThreat(unit);
    
    if (threatType === 'air_unit') {
        // Reaction: Prioritize anti-air defenses
        this.adjustDefensePriorities('anti_air', 'HIGH');
        
        // Action: Build appropriate counters
        if (this.hasBuildingType('war_factory')) {
            this.queueUnit('rocket_soldier', 3);
        }
    }
    
    // Decision: Is this an expansion threat?
    const distanceToBase = this.distanceToBase(position);
    if (distanceToBase < this.expansionThreatThreshold) {
        // Reaction: Contest expansion zone
        this.state = AI_STATE.EXPANSION_CONTEST;
        
        // Action: Send scout/defender
        this.sendUnitToPosition('scout', position, 'CONTEST');
    }
}
```

**Event: UNIT_CREATED**
```javascript
_onUnitCreated(event) {
    const { unit, player } = event.data;
    
    // Decision: Do we need to counter this unit type?
    if (player !== this.player) {
        this.updateEnemyComposition(unit);
        
        const counterNeeded = this.analyzeUnitForCountering(unit);
        if (counterNeeded) {
            // Reaction: Build specific counter
            this.queueCounterUnit(counterNeeded);
        }
    }
}
```

### 4. Difficulty-Based Evolution

#### 4.1 Intelligence Score System

Each difficulty level has an intelligence score affecting decision quality:

```javascript
const DIFFICULTY_EVOLUTION = {
    [DIFFICULTY.EASY]: {
        intelligence: 0.3,      // Poor decision making
        adaptationSpeed: 0.2,    // Very slow to adapt
        mistakeChance: 0.4,       // Often makes suboptimal choices
        strategyDepth: 1,         // Only considers immediate threats
        evolutionRate: 0.1        // Minimal strategic evolution
    },
    [DIFFICULTY.MEDIUM]: {
        intelligence: 0.6,      // Competent decision making
        adaptationSpeed: 0.5,    // Moderate adaptation
        mistakeChance: 0.2,       // Sometimes makes mistakes
        strategyDepth: 2,         // Considers medium-term threats
        evolutionRate: 0.3        // Some strategic evolution
    },
    [DIFFICULTY.HARD]: {
        intelligence: 0.85,     // Good decision making
        adaptationSpeed: 0.8,    // Fast adaptation
        mistakeChance: 0.05,      // Rare mistakes
        strategyDepth: 3,         // Considers long-term threats
        evolutionRate: 0.6        // Significant evolution
    },
    [DIFFICULTY.BRUTAL]: {
        intelligence: 1.0,      // Perfect decision making
        adaptationSpeed: 1.0,    // Instant adaptation
        mistakeChance: 0.0,       // No mistakes
        strategyDepth: 4,         // Plans multiple moves ahead
        evolutionRate: 1.0        // Maximum evolution
    }
};
```

#### 4.2 Adaptive Strategy Evolution

The AI evolves based on player actions:

```javascript
evolveStrategy(playerActions, recentBattles) {
    const evolution = DIFFICULTY_EVOLUTION[this.difficulty];
    
    // Analyze player attack patterns
    const attackPatterns = this.analyzePlayerStrategies(playerActions);
    
    if (attackPatterns.preferredUnit === 'air_units') {
        // Evolution: Increase anti-air production
        this.evolutionWeights['rocket_soldier'] += evolution.evolutionRate * 0.3;
        this.evolutionWeights['anti_air_defense'] += evolution.evolutionRate * 0.2;
    }
    
    if (attackPatterns.preferredStrategy === 'rushing') {
        // Evolution: Prioritize early defenses
        this.evolutionWeights['early_defense'] += evolution.evolutionRate * 0.4;
        this.buildOrderModifications.push({
            type: 'insert',
            position: 2,
            item: { type: 'building', name: 'guard_tower' }
        });
    }
    
    // Evolution: Adjust defense composition based on battle results
    for (const battle of recentBattles) {
        this.analyzeBattleOutcome(battle);
    }
    
    // Apply evolution with randomness based on intelligence
    if (Math.random() < evolution.intelligence) {
        this.applyEvolution();
    }
}
```

### 5. Implementation Examples

#### 5.1 Scenario 1: Power Plant Placement (EASY AI)

**Event:** AI decides to build power plant

**Decision Process:**
1. Classify building as SPREAD mode
2. Find existing power plants (1 at position {10,10})
3. Generate candidate positions with distance scoring
4. Select position {18,6} (8 cells away from existing)
5. Place power plant

**Result:** Power plants distributed for reliability

#### 5.2 Scenario 2: Tech Center Defense (MEDIUM AI)

**Event:** Tech center placed at {15,15}

**Decision Process:**
1. Classify as DEFENDED building
2. Check personality (BALANCED) → defense preference: guard_tower
3. Calculate defense requirement: 2 structures
4. Generate defense positions in layered pattern
5. Queue guard towers at {13,13} and {17,17}

**Result:** Immediate defensive perimeter established

#### 5.3 Scenario 3: Adaptive Response (HARD AI)

**Event:** Player destroys 3 guard towers with infantry rush

**Decision Process:**
1. Event: BUILDING_DESTROYED triggers threat analysis
2. Detect pattern: infantry effective against current defenses
3. Evolution: adapt to counter infantry
4. Modify defense composition to include impact cannons
5. Prioritize anti-infantry defenses in future placement

**Result:** AI adapts defense strategy to counter player tactics

### 6. Technical Implementation Plan

#### 6.1 New Classes Required

- `StrategicPlacementEngine` - Core placement logic
- `DefenseCoordinator` - Defense deployment management
- `ThreatAnalysisSystem` - Pattern recognition and evolution
- `EvolutionManager` - Long-term strategy adaptation

#### 6.2 Integration Points

- Modify `AIController.tryBuildBuilding()` to use strategic placement
- Add defense deployment to building placement success
- Enhance event handlers for decision making
- Integrate evolution system with difficulty settings

#### 6.3 Configuration Files

- Building placement mode definitions
- Defense preference matrices per personality
- Evolution rate configurations per difficulty
- Event-decision mapping tables

### 7. Success Metrics

- **Placement Efficiency:** 85%+ of buildings in optimal positions
- **Defense Coverage:** 90%+ of critical buildings defended
- **Adaptation Rate:** AI adjusts strategy within 3-5 attacks
- **Difficulty Differentiation:** Clear behavior differences between levels
- **Performance Impact:** <10% CPU overhead for decision making

This system creates a more intelligent, adaptable AI that makes strategic decisions based on building importance, defensive needs, and evolving player strategies, providing a challenging and dynamic gameplay experience.