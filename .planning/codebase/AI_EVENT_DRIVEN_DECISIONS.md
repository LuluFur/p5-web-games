# Event-Driven AI Decision System

## Overview
A reactive AI system that uses event hooks to trigger decisions, maintains a priority task queue with automatic prerequisite resolution, and adapts base requirements based on game state (economy, combat, defense needs).

---

## Core Concepts

### 1. Event Hooks
AI listens to game events and evaluates whether action is needed:
- `ON_RESOURCES_CHANGED` → Check if can afford queued items
- `ON_BUILDING_COMPLETE` → Re-evaluate what's now possible
- `ON_BUILDING_DESTROYED` → Queue rebuilding if critical
- `ON_UNIT_DESTROYED` → Adjust army composition needs
- `ON_ENEMY_REVEALED` → Update threat assessment, adjust priorities
- `ON_UNDER_ATTACK` → Shift to defensive mode
- `ON_INCOME_CHANGED` → Adjust economy priorities

### 2. Task Queue with Prerequisites
When a task cannot be completed, instead of failing:
1. Identify WHY it can't be done
2. Create prerequisite tasks
3. Insert prerequisites BEFORE the blocked task
4. Retry original task after prerequisites complete

### 3. Evolved Requirements
Base requirements that dynamically adjust based on:
- **STABLE** mode: Build balanced base
- **ECONOMY** mode: Prioritize refineries, harvesters
- **ATTACK** mode: Prioritize production buildings, units
- **DEFEND** mode: Prioritize guard towers, walls

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        EVENT BUS                                 │
│  (EVENTS.emit / EVENTS.on)                                      │
└─────────────────────────────────────────────────────────────────┘
            │                    │                    │
            ▼                    ▼                    ▼
┌───────────────────┐ ┌───────────────────┐ ┌───────────────────┐
│  ResourceMonitor  │ │  ThreatMonitor    │ │  BaseMonitor      │
│  - income rate    │ │  - enemy sightings│ │  - building count │
│  - storage        │ │  - attack events  │ │  - damage state   │
└───────────────────┘ └───────────────────┘ └───────────────────┘
            │                    │                    │
            └────────────────────┼────────────────────┘
                                 ▼
                    ┌───────────────────────┐
                    │   AI_MODE_EVALUATOR   │
                    │   Determines current  │
                    │   priority mode       │
                    └───────────────────────┘
                                 │
                                 ▼
                    ┌───────────────────────┐
                    │  EVOLVED_REQUIREMENTS │
                    │  Dynamic build needs  │
                    │  based on mode        │
                    └───────────────────────┘
                                 │
                                 ▼
                    ┌───────────────────────┐
                    │    TASK_QUEUE         │
                    │  Priority-ordered     │
                    │  with prerequisites   │
                    └───────────────────────┘
                                 │
                                 ▼
                    ┌───────────────────────┐
                    │   TASK_EXECUTOR       │
                    │  Attempts execution   │
                    │  Resolves blockers    │
                    └───────────────────────┘
```

---

## Phase 1: Event Hook System

### 1.1 Create AIEventHooks Class
- [ ] Create new file `src/ai/AIEventHooks.js`
- [ ] Subscribe to all relevant game events
- [ ] Route events to appropriate evaluator methods
- [ ] Debounce rapid-fire events (e.g., multiple units dying)

**Event Subscriptions:**
```javascript
class AIEventHooks {
    constructor(aiController) {
        this.ai = aiController;
        this.setupHooks();
    }

    setupHooks() {
        // Economy events
        EVENTS.on(EVENT_NAMES.GOLD_GAIN, (data) => this.onResourcesChanged(data));
        EVENTS.on(EVENT_NAMES.GOLD_SPEND, (data) => this.onResourcesChanged(data));

        // Building events
        EVENTS.on(EVENT_NAMES.BUILDING_COMPLETE, (data) => this.onBuildingComplete(data));
        EVENTS.on(EVENT_NAMES.BUILDING_DESTROYED, (data) => this.onBuildingDestroyed(data));

        // Unit events
        EVENTS.on(EVENT_NAMES.UNIT_CREATED, (data) => this.onUnitCreated(data));
        EVENTS.on(EVENT_NAMES.UNIT_DESTROYED, (data) => this.onUnitDestroyed(data));

        // Discovery events
        EVENTS.on(EVENT_NAMES.ENEMY_REVEALED, (data) => this.onEnemyRevealed(data));
        EVENTS.on(EVENT_NAMES.ENEMY_BASE_DISCOVERED, (data) => this.onEnemyBaseDiscovered(data));

        // Combat events
        EVENTS.on('BASE_UNDER_ATTACK', (data) => this.onBaseUnderAttack(data));
        EVENTS.on('ATTACK_REPELLED', (data) => this.onAttackRepelled(data));
    }

    // Filter events to only process for this AI's player
    isRelevant(data) {
        return data.player === this.ai.player ||
               data.owner === this.ai.player ||
               data.discoveredBy === this.ai.player;
    }
}
```

### 1.2 Event Handler Methods
- [ ] `onResourcesChanged()` - Check if blocked tasks can now proceed
- [ ] `onBuildingComplete()` - Unlock dependent tasks, update requirements
- [ ] `onBuildingDestroyed()` - Queue rebuilding, reassess defense
- [ ] `onUnitDestroyed()` - Update army needs
- [ ] `onEnemyRevealed()` - Update threat model, adjust priorities
- [ ] `onBaseUnderAttack()` - Switch to DEFEND mode
- [ ] `onAttackRepelled()` - Return to previous mode

### 1.3 Debouncing System
- [ ] Batch rapid events (e.g., 5 units dying in 1 second)
- [ ] Process batched events once per evaluation cycle (every 500ms)
- [ ] Prevent queue thrashing from rapid state changes

```javascript
// Debounce example
this.pendingEvaluations = new Set();
this.evaluationTimer = null;

queueEvaluation(type) {
    this.pendingEvaluations.add(type);
    if (!this.evaluationTimer) {
        this.evaluationTimer = setTimeout(() => {
            this.processEvaluations();
            this.evaluationTimer = null;
        }, 500);
    }
}

processEvaluations() {
    if (this.pendingEvaluations.has('RESOURCES')) this.evaluateResourceNeeds();
    if (this.pendingEvaluations.has('DEFENSE')) this.evaluateDefenseNeeds();
    if (this.pendingEvaluations.has('ARMY')) this.evaluateArmyNeeds();
    this.pendingEvaluations.clear();
}
```

---

## Phase 2: AI Mode System

### 2.1 Define AI Modes
- [ ] Add mode enum to AIController

```javascript
const AI_MODE = {
    STABLE: 'STABLE',       // Balanced base building
    ECONOMY: 'ECONOMY',     // Focus on income
    ATTACK: 'ATTACK',       // Focus on army production
    DEFEND: 'DEFEND',       // Focus on defenses
    EMERGENCY: 'EMERGENCY'  // Critical response (base dying)
};
```

### 2.2 Mode Evaluation Logic
- [ ] Create `evaluateMode()` method called on relevant events

```javascript
evaluateMode() {
    const metrics = this.gatherMetrics();

    // EMERGENCY: Base health critical
    if (metrics.baseHealthPercent < 30) {
        return AI_MODE.EMERGENCY;
    }

    // DEFEND: Under active attack
    if (metrics.isUnderAttack) {
        return AI_MODE.DEFEND;
    }

    // ECONOMY: Income too low for army
    if (metrics.incomeRate < 50 && metrics.armyValue < 2000) {
        return AI_MODE.ECONOMY;
    }

    // ATTACK: Strong economy, need army
    if (metrics.incomeRate > 100 && metrics.armySize < this.targetArmySize) {
        return AI_MODE.ATTACK;
    }

    // STABLE: Default balanced mode
    return AI_MODE.STABLE;
}

gatherMetrics() {
    return {
        baseHealthPercent: this.calculateBaseHealth(),
        isUnderAttack: this.isUnderAttack(),
        incomeRate: this.calculateIncomeRate(),
        armySize: this.getArmySize(),
        armyValue: this.calculateArmyValue(),
        resourcesStored: this.player.resources.tiberium,
        buildingsCount: this.getBuildingCounts(),
        threatLevel: this.enemyMemory?.getEstimatedThreatLevel() || 0
    };
}
```

### 2.3 Mode Transition Events
- [ ] Emit event when mode changes
- [ ] Log mode transitions for debugging
- [ ] Allow mode to be locked (e.g., forced DEFEND during attack)

```javascript
setMode(newMode, locked = false) {
    if (this.modeLocked && !locked) return; // Can't change if locked

    const oldMode = this.currentMode;
    this.currentMode = newMode;
    this.modeLocked = locked;

    if (oldMode !== newMode) {
        console.log(`[AI] ${this.personality} MODE: ${oldMode} → ${newMode}`);
        EVENTS.emit('AI_MODE_CHANGED', {
            player: this.player,
            oldMode,
            newMode
        });

        // Trigger requirement re-evaluation
        this.updateEvolvedRequirements();
    }
}
```

---

## Phase 3: Evolved Requirements System

### 3.1 Base Requirements Structure
- [ ] Define stable_base_requirements (minimum viable base)
- [ ] Define mode-specific adjustments

```javascript
const STABLE_BASE_REQUIREMENTS = {
    power_plant: { min: 2, max: 4, priority: 10 },
    barracks: { min: 1, max: 2, priority: 20 },
    refinery: { min: 1, max: 2, priority: 15 },
    war_factory: { min: 1, max: 2, priority: 25 },
    guard_tower: { min: 2, max: 4, priority: 30 },
    tech_center: { min: 0, max: 1, priority: 50 }
};

const MODE_ADJUSTMENTS = {
    STABLE: {
        // No adjustments, use base requirements
    },
    ECONOMY: {
        refinery: { min: 2, max: 3, priority: 5 },      // Higher priority
        power_plant: { min: 3, max: 5, priority: 8 },   // More power for refineries
        guard_tower: { min: 1, max: 2, priority: 40 }   // Lower priority
    },
    ATTACK: {
        barracks: { min: 2, max: 3, priority: 5 },
        war_factory: { min: 2, max: 3, priority: 8 },
        guard_tower: { min: 1, max: 2, priority: 50 }   // Deprioritize
    },
    DEFEND: {
        guard_tower: { min: 4, max: 8, priority: 5 },   // Max priority
        barracks: { min: 1, max: 1, priority: 30 },     // Just maintain
        war_factory: { min: 1, max: 1, priority: 30 }
    },
    EMERGENCY: {
        guard_tower: { min: 6, max: 10, priority: 1 },  // Spam defenses
        power_plant: { min: 1, max: 2, priority: 2 },   // Keep power on
        // Everything else deprioritized
    }
};
```

### 3.2 Dynamic Requirement Calculation
- [ ] Create `getEvolvedRequirements()` method
- [ ] Merge base with mode adjustments
- [ ] Consider current building counts

```javascript
getEvolvedRequirements() {
    const base = { ...STABLE_BASE_REQUIREMENTS };
    const modeAdj = MODE_ADJUSTMENTS[this.currentMode] || {};

    // Merge adjustments
    for (const [building, adj] of Object.entries(modeAdj)) {
        if (base[building]) {
            base[building] = { ...base[building], ...adj };
        }
    }

    // Sort by priority (lower = higher priority)
    const sorted = Object.entries(base)
        .sort((a, b) => a[1].priority - b[1].priority);

    return sorted;
}
```

### 3.3 Requirement Deficit Calculation
- [ ] Compare current buildings to requirements
- [ ] Generate list of needed buildings with priorities

```javascript
calculateRequirementDeficits() {
    const requirements = this.getEvolvedRequirements();
    const currentCounts = this.getBuildingCounts();
    const deficits = [];

    for (const [buildingType, req] of requirements) {
        const current = currentCounts[buildingType] || 0;
        const needed = req.min - current;

        if (needed > 0) {
            deficits.push({
                type: buildingType,
                current,
                required: req.min,
                needed,
                priority: req.priority
            });
        }
    }

    // Sort by priority
    return deficits.sort((a, b) => a.priority - b.priority);
}
```

---

## Phase 4: Task Queue System

### 4.1 Task Structure
- [ ] Define task data structure

```javascript
class AITask {
    constructor(config) {
        this.id = generateTaskId();
        this.type = config.type;           // 'BUILD', 'PRODUCE', 'ATTACK', 'DEFEND'
        this.target = config.target;       // Building type, unit type, or position
        this.priority = config.priority;   // Lower = higher priority
        this.status = 'PENDING';           // PENDING, BLOCKED, IN_PROGRESS, COMPLETE, FAILED
        this.prerequisites = [];           // Array of task IDs that must complete first
        this.blockedReason = null;         // Why task is blocked
        this.attempts = 0;                 // Number of execution attempts
        this.maxAttempts = 5;              // Give up after this many failures
        this.createdAt = Date.now();
        this.metadata = config.metadata || {};
    }
}
```

### 4.2 Task Queue Manager
- [ ] Create `AITaskQueue` class

```javascript
class AITaskQueue {
    constructor(aiController) {
        this.ai = aiController;
        this.tasks = [];                  // All tasks
        this.taskMap = new Map();         // id → task for quick lookup
        this.completedTasks = [];         // History for debugging
    }

    // Add task with automatic prerequisite resolution
    addTask(taskConfig) {
        const task = new AITask(taskConfig);
        this.tasks.push(task);
        this.taskMap.set(task.id, task);
        this.sortByPriority();
        return task.id;
    }

    // Get next executable task
    getNextTask() {
        for (const task of this.tasks) {
            if (task.status === 'PENDING' && this.arePrerequisitesMet(task)) {
                return task;
            }
        }
        return null;
    }

    arePrerequisitesMet(task) {
        return task.prerequisites.every(prereqId => {
            const prereq = this.taskMap.get(prereqId);
            return prereq && prereq.status === 'COMPLETE';
        });
    }

    sortByPriority() {
        this.tasks.sort((a, b) => a.priority - b.priority);
    }

    // Remove completed/failed tasks older than 60 seconds
    cleanup() {
        const now = Date.now();
        this.tasks = this.tasks.filter(t => {
            if (t.status === 'COMPLETE' || t.status === 'FAILED') {
                if (now - t.createdAt > 60000) {
                    this.completedTasks.push(t);
                    this.taskMap.delete(t.id);
                    return false;
                }
            }
            return true;
        });
    }
}
```

### 4.3 Prerequisite Resolution System
- [ ] Create `resolvePrerequisites()` method
- [ ] Automatically identify and create prerequisite tasks

```javascript
resolvePrerequisites(task) {
    if (task.type !== 'BUILD') return; // Only buildings have complex prereqs

    const buildingType = task.target;
    const buildingManager = Game.instance?.buildingManager;

    // Check what's blocking this building
    const blockers = this.identifyBlockers(buildingType);

    if (blockers.length === 0) return; // No blockers, task can proceed

    // Create prerequisite tasks for each blocker
    const prereqIds = [];
    for (const blocker of blockers) {
        const prereqTask = this.createPrerequisiteTask(blocker, task.priority - 1);
        prereqIds.push(prereqTask.id);
    }

    // Link prerequisites to blocked task
    task.prerequisites = prereqIds;
    task.status = 'BLOCKED';
    task.blockedReason = blockers.map(b => b.reason).join(', ');

    console.log(`[AI] Task ${task.id} (${task.target}) blocked: ${task.blockedReason}`);
    console.log(`[AI] Created ${prereqIds.length} prerequisite tasks`);
}

identifyBlockers(buildingType) {
    const blockers = [];
    const buildingManager = Game.instance?.buildingManager;

    // Check tech requirements
    const requirements = buildingManager?.getBuildingRequirements(buildingType);
    if (requirements) {
        for (const req of requirements) {
            if (!this.hasBuilding(req)) {
                blockers.push({
                    type: 'MISSING_BUILDING',
                    building: req,
                    reason: `Requires ${req}`
                });
            }
        }
    }

    // Check power requirements
    const powerNeeded = this.getBuildingPowerCost(buildingType);
    if (powerNeeded > this.getAvailablePower()) {
        blockers.push({
            type: 'INSUFFICIENT_POWER',
            deficit: powerNeeded - this.getAvailablePower(),
            reason: 'Insufficient power'
        });
    }

    // Check resource requirements
    const cost = this.getBuildingCost(buildingType);
    if (cost > this.player.resources.tiberium) {
        blockers.push({
            type: 'INSUFFICIENT_RESOURCES',
            deficit: cost - this.player.resources.tiberium,
            reason: 'Insufficient resources'
        });
    }

    return blockers;
}

createPrerequisiteTask(blocker, priority) {
    switch (blocker.type) {
        case 'MISSING_BUILDING':
            return this.addTask({
                type: 'BUILD',
                target: blocker.building,
                priority: priority,
                metadata: { isPrerequisite: true }
            });

        case 'INSUFFICIENT_POWER':
            return this.addTask({
                type: 'BUILD',
                target: 'power_plant',
                priority: priority,
                metadata: { isPrerequisite: true, forPower: true }
            });

        case 'INSUFFICIENT_RESOURCES':
            // Can't directly create resources, but can prioritize harvesters
            return this.addTask({
                type: 'PRODUCE',
                target: 'harvester',
                priority: priority,
                metadata: { isPrerequisite: true, forResources: true }
            });
    }
}
```

### 4.4 Task Execution Flow
- [ ] Create `executeTask()` method with retry logic

```javascript
async executeTask(task) {
    task.status = 'IN_PROGRESS';
    task.attempts++;

    let success = false;

    switch (task.type) {
        case 'BUILD':
            success = this.ai.tryBuildBuilding(task.target);
            break;
        case 'PRODUCE':
            success = this.ai.tryProduceUnits(task.target, 1);
            break;
        case 'ATTACK':
            success = this.ai.issueAttackOrders(task.target);
            break;
        case 'DEFEND':
            success = this.ai.issueDefendOrders(task.target);
            break;
    }

    if (success) {
        task.status = 'COMPLETE';
        console.log(`[AI] Task ${task.id} (${task.type}: ${task.target}) COMPLETE`);

        // Check if this unlocks any blocked tasks
        this.checkBlockedTasks();
    } else {
        if (task.attempts >= task.maxAttempts) {
            task.status = 'FAILED';
            console.log(`[AI] Task ${task.id} (${task.type}: ${task.target}) FAILED after ${task.attempts} attempts`);
        } else {
            // Try to resolve why it failed
            this.resolvePrerequisites(task);

            if (task.status !== 'BLOCKED') {
                task.status = 'PENDING'; // Retry later
            }
        }
    }
}

checkBlockedTasks() {
    for (const task of this.tasks) {
        if (task.status === 'BLOCKED' && this.arePrerequisitesMet(task)) {
            task.status = 'PENDING';
            task.blockedReason = null;
            console.log(`[AI] Task ${task.id} (${task.target}) UNBLOCKED`);
        }
    }
}
```

---

## Phase 5: Integration

### 5.1 Wire Up Event Hooks to Task Queue
- [ ] Events trigger requirement evaluation
- [ ] Deficits become tasks in queue
- [ ] Tasks execute on AI update cycle

```javascript
// In AIEventHooks
onBuildingComplete(data) {
    if (!this.isRelevant(data)) return;

    // Building complete might unlock blocked tasks
    this.ai.taskQueue.checkBlockedTasks();

    // Re-evaluate what we need now
    this.queueEvaluation('REQUIREMENTS');
}

onResourcesChanged(data) {
    if (!this.isRelevant(data)) return;

    // More resources might allow blocked tasks to proceed
    this.ai.taskQueue.checkBlockedTasks();
}

// Evaluation creates tasks
evaluateRequirements() {
    const deficits = this.ai.calculateRequirementDeficits();

    for (const deficit of deficits) {
        // Don't duplicate existing tasks
        if (this.ai.taskQueue.hasTaskFor('BUILD', deficit.type)) continue;

        for (let i = 0; i < deficit.needed; i++) {
            this.ai.taskQueue.addTask({
                type: 'BUILD',
                target: deficit.type,
                priority: deficit.priority
            });
        }
    }
}
```

### 5.2 Main Update Loop Integration
- [ ] Replace direct build queue with task queue processing

```javascript
// In AIController.update()
updateTaskQueue(deltaTime) {
    // Process one task per update (or more based on difficulty)
    const tasksPerUpdate = this.difficultySettings.tasksPerUpdate || 1;

    for (let i = 0; i < tasksPerUpdate; i++) {
        const task = this.taskQueue.getNextTask();
        if (task) {
            this.taskQueue.executeTask(task);
        }
    }

    // Periodic cleanup
    if (this.taskQueueCleanupTimer <= 0) {
        this.taskQueue.cleanup();
        this.taskQueueCleanupTimer = 10; // Every 10 seconds
    }
    this.taskQueueCleanupTimer -= deltaTime;
}
```

### 5.3 Debug Visualization
- [ ] Add debug panel showing:
  - Current AI mode
  - Task queue contents
  - Blocked tasks and reasons
  - Completed tasks history

```javascript
debugTaskQueue() {
    console.log(`=== AI Task Queue (${this.personality}) ===`);
    console.log(`Mode: ${this.currentMode}`);
    console.log(`Tasks: ${this.taskQueue.tasks.length}`);

    for (const task of this.taskQueue.tasks) {
        const prereqs = task.prerequisites.length > 0
            ? ` [waiting: ${task.prerequisites.join(', ')}]`
            : '';
        const blocked = task.blockedReason
            ? ` (${task.blockedReason})`
            : '';
        console.log(`  [${task.status}] ${task.type}: ${task.target} (pri: ${task.priority})${prereqs}${blocked}`);
    }
}
```

---

## Example Flow: Building a War Factory

```
1. AI evaluates requirements, needs war_factory
2. Task created: BUILD war_factory (priority 25)

3. Execute task...
4. BLOCKED: Requires barracks, insufficient power

5. Create prerequisites:
   - BUILD barracks (priority 24)
   - BUILD power_plant (priority 24)

6. Execute BUILD power_plant... SUCCESS
7. Execute BUILD barracks...
8. BLOCKED: Requires power_plant (already building)

9. Power plant completes (event)
10. Barracks task UNBLOCKED
11. Execute BUILD barracks... SUCCESS

12. Barracks completes (event)
13. War factory task UNBLOCKED
14. Execute BUILD war_factory... SUCCESS

Timeline:
[power_plant queued] → [power_plant building] → [power_plant complete]
                                                         ↓
[barracks queued] → [barracks blocked] → [barracks unblocked] → [barracks complete]
                                                                         ↓
[war_factory queued] → [war_factory blocked] ─────────────────→ [war_factory unblocked] → [war_factory complete]
```

---

## File Structure

```
src/ai/
├── AIController.js          # Main AI, integrates all systems
├── AIEventHooks.js          # NEW - Event subscriptions and routing
├── AITaskQueue.js           # NEW - Task queue with prereq resolution
├── AITask.js                # NEW - Task class definition
├── AIModeEvaluator.js       # NEW - Mode determination logic
├── AIRequirements.js        # NEW - Base and evolved requirements
├── EnemyMemory.js           # From previous plan
└── EnemyDiscoveryTracker.js # Existing
```

---

## Implementation Checklist

### Phase 1: Event Hooks
- [ ] Create AIEventHooks.js
- [ ] Subscribe to all game events
- [ ] Add debouncing system
- [ ] Route events to evaluators

### Phase 2: Mode System
- [ ] Define AI_MODE enum
- [ ] Create evaluateMode() logic
- [ ] Add mode transition events
- [ ] Implement mode locking for emergencies

### Phase 3: Evolved Requirements
- [ ] Define STABLE_BASE_REQUIREMENTS
- [ ] Define MODE_ADJUSTMENTS
- [ ] Create getEvolvedRequirements()
- [ ] Create calculateRequirementDeficits()

### Phase 4: Task Queue
- [ ] Create AITask class
- [ ] Create AITaskQueue class
- [ ] Implement prerequisite resolution
- [ ] Implement task execution with retries
- [ ] Add blocked task checking

### Phase 5: Integration
- [ ] Wire events to task queue
- [ ] Replace old build queue
- [ ] Add debug visualization
- [ ] Test prerequisite chains

---

## Benefits of This Approach

1. **Reactive**: AI responds to events, not polling
2. **Self-healing**: Blocked tasks automatically find solutions
3. **Adaptive**: Mode system adjusts priorities dynamically
4. **Debuggable**: Clear task queue shows AI "thinking"
5. **Scalable**: Easy to add new task types and requirements
6. **No dead ends**: Prerequisites ensure tasks eventually complete

---

## Performance Considerations

- Debounce events to prevent queue thrashing
- Limit prerequisite depth (max 5 levels)
- Cleanup old completed tasks regularly
- Cache requirement calculations (invalidate on building change)
- One task execution per frame (or configurable by difficulty)
