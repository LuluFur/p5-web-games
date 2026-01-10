/**
 * Command.js - Command Pattern for Unit Orders
 *
 * Implements the Command pattern for RTS unit orders.
 * Commands are queued and executed over time, enabling:
 * - Shift-click queue support
 * - Undo/redo capability (future)
 * - Network synchronization (future)
 * - Replay system (future)
 *
 * Usage:
 *   const moveCmd = new MoveCommand(unit, targetX, targetY);
 *   unit.queueCommand(moveCmd);
 */

// ===========================================
// BASE COMMAND CLASS
// ===========================================
class Command {
    /**
     * @param {Unit} unit - The unit executing this command
     */
    constructor(unit) {
        this.unit = unit;
        this.isComplete = false;
        this.isStarted = false;
        this.timestamp = Date.now();
    }

    /**
     * Called when command starts executing
     * Override in subclasses for initialization logic
     */
    start() {
        this.isStarted = true;
    }

    /**
     * Called every frame while command is active
     * @param {number} deltaTime - Time since last frame in seconds
     * @returns {boolean} True if command should continue, false if complete
     */
    execute(deltaTime) {
        // Override in subclasses
        return false;
    }

    /**
     * Called when command is interrupted or cancelled
     */
    interrupt() {
        this.isComplete = true;
    }

    /**
     * Clean up references to break circular reference chains
     * Subclasses should override and call super.cleanup()
     * NOTE: Do NOT null this.unit - commands may still execute after cleanup
     */
    cleanup() {
        // Don't null this.unit - it may still be needed for execute()
        // Just mark as complete to stop re-execution
        this.isComplete = true;
    }

    /**
     * Check if command can be executed
     * @returns {boolean}
     */
    canExecute() {
        return this.unit && this.unit.active && !this.unit.isDead();
    }

    /**
     * Get command type name for debugging
     * @returns {string}
     */
    getType() {
        return this.constructor.name;
    }
}

// ===========================================
// MOVE COMMAND
// ===========================================
class MoveCommand extends Command {
    /**
     * @param {Unit} unit - Unit to move
     * @param {number} targetX - Target X position in pixels
     * @param {number} targetY - Target Y position in pixels
     */
    constructor(unit, targetX, targetY) {
        super(unit);
        this.targetX = targetX;
        this.targetY = targetY;
        this.path = null;
        this.pathIndex = 0;
        this.stuckTimer = 0;
        this.lastPosition = null;
        this.pathCalculated = false; // Defer pathfinding to first execute()
    }

    start() {
        super.start();
        // Initialize position tracking but defer pathfinding to execute()
        this.lastPosition = { x: this.unit.x, y: this.unit.y };
    }

    /**
     * Calculate path on-demand (called from execute)
     * This defers the expensive A* pathfinding from spawn time to movement time
     * @private
     */
    calculatePath() {
        if (this.pathCalculated) return;
        this.pathCalculated = true;

        if (window.RTSPathfinder) {
            const startCell = this.unit.getGridPosition();
            const endCell = {
                r: Math.floor(this.targetY / RTS_GRID.CELL_SIZE),
                c: Math.floor(this.targetX / RTS_GRID.CELL_SIZE)
            };

            console.time(`PATHFIND_${this.unit.id}`);
            this.path = RTSPathfinder.findPath(startCell, endCell);
            console.timeEnd(`PATHFIND_${this.unit.id}`);

            if (!this.path || this.path.length === 0) {
                this.isComplete = true;
            } else {
                this.pathIndex = 0;
            }
        } else {
            // Direct movement if no pathfinder
            this.path = null;
        }
    }

    execute(deltaTime) {
        if (!this.canExecute()) {
            this.isComplete = true;
            return false;
        }

        // Calculate path on first execute (deferred from spawn time)
        if (!this.pathCalculated) {
            this.calculatePath();
            if (this.isComplete) {
                return false; // Path calculation failed
            }
        }

        // Change unit state to moving
        this.unit.state = RTS_UNIT_STATES.MOVING;

        let targetX, targetY;

        if (this.path && this.path.length > 0) {
            // Follow path
            const currentNode = this.path[this.pathIndex];
            targetX = currentNode.c * RTS_GRID.CELL_SIZE + RTS_GRID.CELL_SIZE / 2;
            targetY = currentNode.r * RTS_GRID.CELL_SIZE + RTS_GRID.CELL_SIZE / 2;
        } else {
            // Direct movement
            targetX = this.targetX;
            targetY = this.targetY;
        }

        // Calculate direction and distance
        const dx = targetX - this.unit.x;
        const dy = targetY - this.unit.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Check if reached current waypoint
        const arrivalThreshold = this.path ? 4 : 8;
        if (dist < arrivalThreshold) {
            if (this.path && this.pathIndex < this.path.length - 1) {
                // Move to next waypoint
                this.pathIndex++;
            } else {
                // Reached final destination
                this.unit.state = RTS_UNIT_STATES.IDLE;
                this.isComplete = true;
                return false;
            }
        } else {
            // Move toward target
            const speed = this.unit.getSpeed() * deltaTime * 60; // Normalize for 60fps
            const moveX = (dx / dist) * Math.min(speed, dist);
            const moveY = (dy / dist) * Math.min(speed, dist);

            this.unit.x += moveX;
            this.unit.y += moveY;

            // Update facing direction
            this.unit.facingAngle = Math.atan2(dy, dx);
        }

        // Stuck detection (time-based, not frame-rate dependent)
        if (this.lastPosition) {
            const moved = Math.abs(this.unit.x - this.lastPosition.x) +
                Math.abs(this.unit.y - this.lastPosition.y);
            if (moved < 0.1) {
                this.stuckTimer += deltaTime; // Accumulate time in seconds
                if (this.stuckTimer > 2.0) { // 2 seconds
                    console.log('MoveCommand: Unit stuck, cancelling');
                    this.isComplete = true;
                    this.unit.state = RTS_UNIT_STATES.IDLE;
                    return false;
                }
            } else {
                this.stuckTimer = 0;
            }
        }
        this.lastPosition = { x: this.unit.x, y: this.unit.y };

        return true; // Continue executing
    }

    interrupt() {
        super.interrupt();
        this.unit.state = RTS_UNIT_STATES.IDLE;
    }

    cleanup() {
        super.cleanup();
        this.path = null;
        this.lastPosition = null;
        // Don't null this.unit - it may still be needed
    }
}

// ===========================================
// ATTACK COMMAND
// ===========================================
class AttackCommand extends Command {
    /**
     * @param {Unit} unit - Attacking unit
     * @param {Unit|Building} target - Target to attack
     * @param {boolean} pursue - Whether to chase target (default true)
     */
    constructor(unit, target, pursue = true) {
        super(unit);
        this.target = target;
        this.pursue = pursue;
        this.moveCommand = null;
    }

    start() {
        super.start();
        this.unit.state = RTS_UNIT_STATES.ATTACKING;
    }

    execute(deltaTime) {
        if (!this.canExecute()) {
            this.isComplete = true;
            return false;
        }

        // Check if target is still valid
        if (!this.target || !this.target.active || this.target.isDead()) {
            this.isComplete = true;
            this.unit.state = RTS_UNIT_STATES.IDLE;
            return false;
        }

        // Calculate distance to target
        const dx = this.target.x - this.unit.x;
        const dy = this.target.y - this.unit.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const attackRange = this.unit.getAttackRange();

        // Face the target
        this.unit.facingAngle = Math.atan2(dy, dx);

        if (dist <= attackRange) {
            // In range - attack!
            this.unit.state = RTS_UNIT_STATES.ATTACKING;

            if (this.unit.attackCooldown <= 0) {
                this.unit.performAttack(this.target);
            }
        } else if (this.pursue) {
            // Out of range - move closer
            this.unit.state = RTS_UNIT_STATES.MOVING;

            // Create or update move command to chase target
            if (!this.moveCommand) {
                this.moveCommand = new MoveCommand(this.unit, this.target.x, this.target.y);
                this.moveCommand.start();
            } else {
                // Update target position
                this.moveCommand.targetX = this.target.x;
                this.moveCommand.targetY = this.target.y;
            }

            this.moveCommand.execute(deltaTime);
        } else {
            // Out of range and not pursuing - stop attacking
            this.isComplete = true;
            this.unit.state = RTS_UNIT_STATES.IDLE;
            return false;
        }

        return true;
    }

    interrupt() {
        super.interrupt();
        if (this.moveCommand) {
            this.moveCommand.interrupt();
        }
        this.unit.state = RTS_UNIT_STATES.IDLE;
    }

    cleanup() {
        super.cleanup();
        this.target = null;
        if (this.moveCommand) {
            this.moveCommand.cleanup();
            this.moveCommand = null;
        }
        // Don't null this.unit - needed for execute()
    }
}

// ===========================================
// ATTACK MOVE COMMAND
// ===========================================
class AttackMoveCommand extends Command {
    /**
     * Move to destination, attacking any enemies encountered
     * @param {Unit} unit - Unit to command
     * @param {number} targetX - Destination X
     * @param {number} targetY - Destination Y
     */
    constructor(unit, targetX, targetY) {
        super(unit);
        this.targetX = targetX;
        this.targetY = targetY;
        this.moveCommand = new MoveCommand(unit, targetX, targetY);
        this.attackCommand = null;
    }

    start() {
        super.start();
        this.moveCommand.start();
    }

    execute(deltaTime) {
        if (!this.canExecute()) {
            this.isComplete = true;
            return false;
        }

        // Check for nearby enemies while moving
        const nearbyEnemy = this.unit.findNearestEnemy(this.unit.getSightRange());

        if (nearbyEnemy) {
            // Found enemy - attack them
            if (!this.attackCommand || this.attackCommand.target !== nearbyEnemy) {
                if (this.attackCommand) {
                    this.attackCommand.interrupt();
                }
                this.attackCommand = new AttackCommand(this.unit, nearbyEnemy, true);
                this.attackCommand.start();
            }

            // Execute attack
            if (!this.attackCommand.execute(deltaTime)) {
                // Attack complete (target dead), continue moving
                this.attackCommand = null;
            }
        } else {
            // No enemies - continue moving
            if (!this.moveCommand.execute(deltaTime)) {
                // Reached destination
                this.isComplete = true;
                return false;
            }
        }

        return true;
    }

    interrupt() {
        super.interrupt();
        this.moveCommand.interrupt();
        if (this.attackCommand) {
            this.attackCommand.interrupt();
        }
    }

    cleanup() {
        super.cleanup();
        if (this.moveCommand) {
            this.moveCommand.cleanup();
            this.moveCommand = null;
        }
        if (this.attackCommand) {
            this.attackCommand.cleanup();
            this.attackCommand = null;
        }
        // Don't null this.unit - needed for execute()
    }
}

// ===========================================
// STOP COMMAND
// ===========================================
class StopCommand extends Command {
    constructor(unit) {
        super(unit);
    }

    start() {
        super.start();
        // Immediately clear all commands and stop
        this.unit.clearCommands();
        this.unit.state = RTS_UNIT_STATES.IDLE;
        this.isComplete = true;
    }

    execute(deltaTime) {
        return false; // Instant command
    }
}

// ===========================================
// PATROL COMMAND
// ===========================================
class PatrolCommand extends Command {
    /**
     * Patrol between current position and target, attacking enemies
     * @param {Unit} unit - Unit to patrol
     * @param {number} targetX - Patrol point X
     * @param {number} targetY - Patrol point Y
     */
    constructor(unit, targetX, targetY) {
        super(unit);
        this.pointA = { x: unit.x, y: unit.y };
        this.pointB = { x: targetX, y: targetY };
        this.currentTarget = this.pointB;
        this.moveCommand = null;
    }

    start() {
        super.start();
        this.moveCommand = new MoveCommand(this.unit, this.currentTarget.x, this.currentTarget.y);
        this.moveCommand.start();
    }

    execute(deltaTime) {
        if (!this.canExecute()) {
            this.isComplete = true;
            return false;
        }

        // Check for enemies
        const enemy = this.unit.findNearestEnemy(this.unit.getSightRange());
        if (enemy) {
            // Attack enemy, then resume patrol
            const attackCmd = new AttackCommand(this.unit, enemy, true);
            this.unit.queueCommand(attackCmd, false, true); // Priority insert
            return true;
        }

        // Continue patrol movement
        if (!this.moveCommand.execute(deltaTime)) {
            // Reached patrol point - swap targets
            if (this.currentTarget === this.pointB) {
                this.currentTarget = this.pointA;
            } else {
                this.currentTarget = this.pointB;
            }

            this.moveCommand = new MoveCommand(this.unit, this.currentTarget.x, this.currentTarget.y);
            this.moveCommand.start();
        }

        return true; // Patrol continues indefinitely
    }

    interrupt() {
        super.interrupt();
        if (this.moveCommand) {
            this.moveCommand.interrupt();
        }
    }

    cleanup() {
        super.cleanup();
        this.pointA = null;
        this.pointB = null;
        this.currentTarget = null;
        if (this.moveCommand) {
            this.moveCommand.cleanup();
            this.moveCommand = null;
        }
        // Don't null this.unit - needed for execute()
    }
}

// ===========================================
// GUARD COMMAND
// ===========================================
class GuardCommand extends Command {
    /**
     * Guard a position or unit, attacking any enemies that come near
     * @param {Unit} unit - Guarding unit
     * @param {Unit|{x,y}} target - Unit to guard or position
     */
    constructor(unit, target) {
        super(unit);
        this.guardTarget = target;
        this.guardRadius = unit.getSightRange() * RTS_GRID.CELL_SIZE;
        this.returnToPost = false;
        this.attackCommand = null;
    }

    start() {
        super.start();
        this.guardPosition = this.guardTarget.x !== undefined ?
            { x: this.guardTarget.x, y: this.guardTarget.y } :
            { x: this.unit.x, y: this.unit.y };
    }

    execute(deltaTime) {
        if (!this.canExecute()) {
            this.isComplete = true;
            return false;
        }

        // Update guard position if guarding a unit
        if (this.guardTarget && this.guardTarget.active) {
            this.guardPosition = { x: this.guardTarget.x, y: this.guardTarget.y };
        }

        // Look for enemies near guard position
        const enemy = this.findEnemyNearGuardPoint();

        if (enemy) {
            // Attack the enemy
            if (!this.attackCommand || this.attackCommand.target !== enemy) {
                if (this.attackCommand) {
                    this.attackCommand.interrupt();
                }
                this.attackCommand = new AttackCommand(this.unit, enemy, true);
                this.attackCommand.start();
            }

            if (!this.attackCommand.execute(deltaTime)) {
                // Target dead
                this.attackCommand = null;
            }
        } else if (this.attackCommand) {
            // No enemies, stop attacking
            this.attackCommand.interrupt();
            this.attackCommand = null;
        }

        // Return to guard position if too far
        const dx = this.unit.x - this.guardPosition.x;
        const dy = this.unit.y - this.guardPosition.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > this.guardRadius && !this.attackCommand) {
            const moveCmd = new MoveCommand(this.unit, this.guardPosition.x, this.guardPosition.y);
            this.unit.queueCommand(moveCmd, false, true);
        }

        return true; // Guard continues indefinitely
    }

    findEnemyNearGuardPoint() {
        // Find enemies within guard radius of guard position
        if (!window.RTSUnitManager) return null;

        const enemies = RTSUnitManager.getEnemyUnitsInRange(
            this.guardPosition.x,
            this.guardPosition.y,
            this.guardRadius,
            this.unit.owner
        );

        if (enemies.length > 0) {
            // Return closest enemy
            return enemies.sort((a, b) => {
                const distA = Math.hypot(a.x - this.guardPosition.x, a.y - this.guardPosition.y);
                const distB = Math.hypot(b.x - this.guardPosition.x, b.y - this.guardPosition.y);
                return distA - distB;
            })[0];
        }

        return null;
    }

    interrupt() {
        super.interrupt();
        if (this.attackCommand) {
            this.attackCommand.interrupt();
        }
    }

    cleanup() {
        super.cleanup();
        this.guardTarget = null;
        this.guardPosition = null;
        if (this.attackCommand) {
            this.attackCommand.cleanup();
            this.attackCommand = null;
        }
        // Don't null this.unit - needed for execute()
    }
}

// ===========================================
// HARVEST COMMAND (for Harvesters)
// ===========================================
class HarvestCommand extends Command {
    /**
     * Order harvester to harvest from a tiberium field
     * @param {Unit} unit - Harvester unit
     * @param {TiberiumField} field - Optional specific field to harvest
     */
    constructor(unit, field = null) {
        super(unit);
        this.targetField = field;
        this.harvestPosition = null;
        this.moveCommand = null;
        this.retryCount = 0;
        this.maxRetries = 3; // Prevent infinite field-searching
        this.lastHarvestTime = 0; // Track last successful harvest

        // Cache resourceManager reference to avoid lookups every frame
        this._cachedResourceManager = (Game && Game.instance && Game.instance.resourceManager)
            ? Game.instance.resourceManager
            : null;
    }

    /**
     * Get the resource manager (uses cached reference)
     */
    getResourceManager() {
        // Use cached reference if valid, otherwise try to get fresh
        if (this._cachedResourceManager) {
            return this._cachedResourceManager;
        }
        // Fallback: try to get it fresh (in case it was created later)
        if (Game && Game.instance && Game.instance.resourceManager) {
            this._cachedResourceManager = Game.instance.resourceManager;
            return this._cachedResourceManager;
        }
        return null;
    }

    start() {
        super.start();
        this.unit.state = RTS_UNIT_STATES.MOVING;

        const resourceManager = this.getResourceManager();

        // Find nearest tiberium if no specific field given (prefer fields near owner's base)
        if (!this.targetField && resourceManager) {
            this.targetField = resourceManager.findNearestField(this.unit.x, this.unit.y, Infinity, this.unit.owner);
        }

        // If no field found, fail immediately
        if (!this.targetField) {
            this.isComplete = true;
            this.unit.state = RTS_UNIT_STATES.IDLE;
            return;
        }

        // Find best harvest position
        const cell = resourceManager.findBestHarvestCell(
            this.targetField, this.unit.x, this.unit.y
        );

        if (cell) {
            this.harvestPosition = { x: cell.x, y: cell.y };
            this.moveCommand = new MoveCommand(this.unit, cell.x, cell.y);
            this.moveCommand.start();
        } else {
            // Field exists but no harvestable cells
            this.isComplete = true;
            this.unit.state = RTS_UNIT_STATES.IDLE;
        }
    }

    execute(deltaTime) {
        if (!this.canExecute()) {
            this.isComplete = true;
            return false;
        }

        const resourceManager = this.getResourceManager();
        if (!resourceManager) {
            this.isComplete = true;
            return false;
        }

        // Check if full - return to refinery
        if (this.unit.currentLoad >= this.unit.capacity) {
            const returnCmd = new ReturnResourcesCommand(this.unit);
            this.unit.queueCommand(returnCmd, false, true);
            this.isComplete = true;
            return false;
        }

        // If moving to field
        if (this.moveCommand && !this.moveCommand.isComplete) {
            this.moveCommand.execute(deltaTime);
            // Check if move completed
            if (this.moveCommand.isComplete) {
                // Reached harvesting position
                this.unit.state = RTS_UNIT_STATES.HARVESTING;
            }
            return true;
        }

        // Harvesting
        if (this.unit.state === RTS_UNIT_STATES.HARVESTING && this.harvestPosition) {
            // Harvest from resource manager
            const result = resourceManager.harvestAt(
                this.harvestPosition.x,
                this.harvestPosition.y,
                this.unit.harvestRate * deltaTime
            );

            if (result.harvested > 0) {
                this.unit.currentLoad += result.harvested;
                this.lastHarvestTime = Date.now(); // Track successful harvest
                this.retryCount = 0; // Reset retries on successful harvest

                // Check if now full after harvesting - return immediately
                if (this.unit.currentLoad >= this.unit.capacity) {
                    const returnCmd = new ReturnResourcesCommand(this.unit);
                    this.unit.queueCommand(returnCmd, false, true);
                    this.isComplete = true;
                    return false;
                }
            } else {
                // Cell depleted - check if full before finding new position
                if (this.unit.currentLoad >= this.unit.capacity) {
                    const returnCmd = new ReturnResourcesCommand(this.unit);
                    this.unit.queueCommand(returnCmd, false, true);
                    this.isComplete = true;
                    return false;
                }

                // Increment retry count to prevent infinite field-searching
                this.retryCount++;
                if (this.retryCount > this.maxRetries) {
                    // Too many retries - return with partial load or go idle
                    if (this.unit.currentLoad > 0) {
                        const returnCmd = new ReturnResourcesCommand(this.unit);
                        this.unit.queueCommand(returnCmd, false, true);
                    }
                    this.isComplete = true;
                    this.unit.state = RTS_UNIT_STATES.IDLE;
                    return false;
                }

                // Cell depleted, find new position
                const newCell = resourceManager.findBestHarvestCell(
                    this.targetField, this.unit.x, this.unit.y
                );

                if (newCell) {
                    this.harvestPosition = { x: newCell.x, y: newCell.y };
                    this.moveCommand = new MoveCommand(this.unit, newCell.x, newCell.y);
                    this.moveCommand.start();
                    this.unit.state = RTS_UNIT_STATES.MOVING;
                } else {
                    // Field depleted, find new field (prefer fields near owner's base)
                    this.targetField = resourceManager.findNearestField(this.unit.x, this.unit.y, Infinity, this.unit.owner);
                    if (this.targetField) {
                        const cell = resourceManager.findBestHarvestCell(
                            this.targetField, this.unit.x, this.unit.y
                        );
                        if (cell) {
                            this.harvestPosition = { x: cell.x, y: cell.y };
                            this.moveCommand = new MoveCommand(this.unit, cell.x, cell.y);
                            this.moveCommand.start();
                            this.unit.state = RTS_UNIT_STATES.MOVING;
                        } else {
                            // Found field but no valid cell - will retry
                        }
                    } else {
                        // No more tiberium on map - return with partial load
                        if (this.unit.currentLoad > 0) {
                            const returnCmd = new ReturnResourcesCommand(this.unit);
                            this.unit.queueCommand(returnCmd, false, true);
                        }
                        this.isComplete = true;
                        this.unit.state = RTS_UNIT_STATES.IDLE;
                        return false;
                    }
                }
            }
        }

        // If we have no valid move command or harvest position, we're stuck
        if (!this.moveCommand && !this.harvestPosition) {
            this.isComplete = true;
            this.unit.state = RTS_UNIT_STATES.IDLE;
            return false;
        }

        return true;
    }

    cleanup() {
        super.cleanup();
        this.targetField = null;
        this.harvestPosition = null;
        this._cachedResourceManager = null;
        if (this.moveCommand) {
            this.moveCommand.cleanup();
            this.moveCommand = null;
        }
        // Don't null this.unit - needed for execute()
    }
}

// ===========================================
// RETURN RESOURCES COMMAND (for Harvesters)
// ===========================================
class ReturnResourcesCommand extends Command {
    /**
     * Order harvester to return to refinery and deposit resources
     * Phase 2: Currently deposits directly to player (no refinery building yet)
     * @param {Unit} unit - Harvester unit
     * @param {object} refinery - Optional specific refinery/drop point
     */
    constructor(unit, refinery = null) {
        super(unit);
        this.targetRefinery = refinery;
        this.moveCommand = null;
        this.unloadTimer = 0;
        this.unloadDuration = 2; // Seconds to unload
        this.dropPoint = null;
    }

    start() {
        super.start();
        this.unit.state = RTS_UNIT_STATES.RETURNING;

        // Find nearest refinery if not specified
        if (!this.targetRefinery) {
            this.targetRefinery = this.findNearestRefinery();
        }

        // Get drop point from refinery or use fallback
        if (this.targetRefinery && this.targetRefinery.getDropoffPoint) {
            this.dropPoint = this.targetRefinery.getDropoffPoint();
        } else if (this.targetRefinery) {
            this.dropPoint = { x: this.targetRefinery.x, y: this.targetRefinery.y };
        } else {
            // Fallback: use owner's start position
            const owner = this.unit.owner;
            if (owner && owner.startPosition) {
                this.dropPoint = owner.startPosition;
            } else {
                this.dropPoint = { x: 150, y: 150 };
            }
            console.warn('ReturnResourcesCommand: No refinery found, using fallback');
        }

        // Store refinery reference on harvester for visuals
        this.unit.homeRefinery = this.targetRefinery;

        if (this.dropPoint) {
            this.moveCommand = new MoveCommand(this.unit, this.dropPoint.x, this.dropPoint.y);
            this.moveCommand.start();
        } else {
            console.warn('ReturnResourcesCommand: No drop point found');
            this.isComplete = true;
        }
    }

    /**
     * Find the nearest refinery owned by this unit's owner
     */
    findNearestRefinery() {
        if (!Game.instance || !Game.instance.buildingManager) return null;

        const buildings = Game.instance.buildingManager.buildings;
        let nearest = null;
        let nearestDist = Infinity;

        for (const building of buildings) {
            if (building.owner === this.unit.owner &&
                building.type === 'refinery' &&
                building.isComplete) {
                const dist = Math.hypot(building.x - this.unit.x, building.y - this.unit.y);
                if (dist < nearestDist) {
                    nearestDist = dist;
                    nearest = building;
                }
            }
        }

        return nearest;
    }

    execute(deltaTime) {
        if (!this.canExecute()) {
            this.isComplete = true;
            return false;
        }

        // Moving to drop point
        if (this.moveCommand && !this.moveCommand.isComplete) {
            this.unit.state = RTS_UNIT_STATES.RETURNING;
            this.moveCommand.execute(deltaTime);

            if (this.moveCommand.isComplete) {
                this.unit.state = RTS_UNIT_STATES.UNLOADING;
                this.unloadTimer = RTS_RESOURCES?.UNLOAD_TIME || 1.5;
            }
            return true;
        }

        // Unloading
        if (this.unit.state === RTS_UNIT_STATES.UNLOADING) {
            this.unloadTimer -= deltaTime;

            if (this.unloadTimer <= 0) {
                // Deposit resources to player
                const deposited = this.unit.currentLoad;
                if (this.unit.owner) {
                    const tiberiumValue = deposited * (RTS_RESOURCES?.TIBERIUM_VALUE || 1);
                    this.unit.owner.addTiberium(tiberiumValue);
                }
                this.unit.currentLoad = 0;

                // Only queue harvest if tiberium exists (prevent infinite loop)
                const resourceManager = Game?.instance?.resourceManager;
                const hasResources = resourceManager && resourceManager.getTotalAmount() > 0;

                if (hasResources) {
                    // Go back to harvesting
                    const harvestCmd = new HarvestCommand(this.unit);
                    this.unit.queueCommand(harvestCmd);
                }
                // If no resources, harvester will stay idle at refinery

                this.unit.state = RTS_UNIT_STATES.IDLE;
                this.isComplete = true;
                return false;
            }
        }

        return true;
    }

    cleanup() {
        super.cleanup();
        this.targetRefinery = null;
        this.dropPoint = null;
        if (this.moveCommand) {
            this.moveCommand.cleanup();
            this.moveCommand = null;
        }
        // Don't null this.unit - needed for execute()
    }
}

// ===========================================
// CONSTRUCT BUILDING COMMAND (for Engineers/MCVs)
// ===========================================
class ConstructBuildingCommand extends Command {
    /**
     * Deploy/construct a building
     * @param {Unit} unit - Constructing unit (Engineer or MCV)
     * @param {string} buildingType - Type of building to construct
     * @param {number} gridX - Grid X position
     * @param {number} gridY - Grid Y position
     */
    constructor(unit, buildingType, gridX, gridY) {
        super(unit);
        this.buildingType = buildingType;
        this.gridX = gridX;
        this.gridY = gridY;
    }

    start() {
        super.start();

        // Validate placement
        if (window.RTSBuildingManager) {
            const canPlace = RTSBuildingManager.canPlaceBuilding(
                this.buildingType, this.gridX, this.gridY, this.unit.owner
            );

            if (!canPlace) {
                console.warn('ConstructBuildingCommand: Cannot place building here');
                this.isComplete = true;
                return;
            }
        }

        this.unit.state = RTS_UNIT_STATES.CONSTRUCTING;
    }

    execute(deltaTime) {
        if (!this.canExecute()) {
            this.isComplete = true;
            return false;
        }

        // Start construction through building manager
        if (window.RTSBuildingManager) {
            RTSBuildingManager.startConstruction(
                this.buildingType,
                this.gridX,
                this.gridY,
                this.unit.owner
            );

            // If unit is MCV, it becomes the construction yard
            if (this.unit.isMCV) {
                this.unit.active = false;
            }
        }

        this.isComplete = true;
        return false;
    }

    cleanup() {
        super.cleanup();
        this.buildingType = null;
        // Don't null this.unit - needed for execute()
    }
}

// ===========================================
// COMMAND BUILDER (Fluent API)
// ===========================================

/**
 * Fluent builder for creating Command instances
 *
 * Usage:
 *   const cmd = Command.Builder.create()
 *       .forUnit(myUnit)
 *       .moveTo(100, 200)
 *       .build();
 *
 *   const attackCmd = Command.Builder.create()
 *       .forUnit(myUnit)
 *       .attack(enemyUnit)
 *       .withPursuit(true)
 *       .build();
 */
Command.Builder = class {
    constructor() {
        this._reset();
    }

    _reset() {
        this._unit = null;
        this._type = null;
        this._targetX = 0;
        this._targetY = 0;
        this._target = null;
        this._pursue = true;
        this._buildingType = null;
        this._gridX = 0;
        this._gridY = 0;
        this._field = null;
        this._refinery = null;
        return this;
    }

    forUnit(unit) {
        this._unit = unit;
        return this;
    }

    moveTo(x, y) {
        this._type = 'move';
        this._targetX = x;
        this._targetY = y;
        return this;
    }

    attack(target) {
        this._type = 'attack';
        this._target = target;
        return this;
    }

    attackMoveTo(x, y) {
        this._type = 'attackmove';
        this._targetX = x;
        this._targetY = y;
        return this;
    }

    stop() {
        this._type = 'stop';
        return this;
    }

    patrolTo(x, y) {
        this._type = 'patrol';
        this._targetX = x;
        this._targetY = y;
        return this;
    }

    guard(target) {
        this._type = 'guard';
        this._target = target;
        return this;
    }

    harvest(field = null) {
        this._type = 'harvest';
        this._field = field;
        return this;
    }

    returnResources(refinery = null) {
        this._type = 'return';
        this._refinery = refinery;
        return this;
    }

    construct(buildingType, gridX, gridY) {
        this._type = 'construct';
        this._buildingType = buildingType;
        this._gridX = gridX;
        this._gridY = gridY;
        return this;
    }

    withPursuit(pursue) {
        this._pursue = pursue;
        return this;
    }

    build() {
        if (!this._unit) {
            throw new Error('Command.Builder: unit is required');
        }

        switch (this._type) {
            case 'move':
                return new MoveCommand(
                    this._unit,
                    this._targetX,
                    this._targetY
                );

            case 'attack':
                return new AttackCommand(
                    this._unit,
                    this._target,
                    this._pursue
                );

            case 'attackmove':
                return new AttackMoveCommand(
                    this._unit,
                    this._targetX,
                    this._targetY
                );

            case 'stop':
                return new StopCommand(this._unit);

            case 'patrol':
                return new PatrolCommand(
                    this._unit,
                    this._targetX,
                    this._targetY
                );

            case 'guard':
                return new GuardCommand(
                    this._unit,
                    this._target
                );

            case 'harvest':
                return new HarvestCommand(
                    this._unit,
                    this._field
                );

            case 'return':
                return new ReturnResourcesCommand(
                    this._unit,
                    this._refinery
                );

            case 'construct':
                return new ConstructBuildingCommand(
                    this._unit,
                    this._buildingType,
                    this._gridX,
                    this._gridY
                );

            default:
                throw new Error(`Command.Builder: unknown command type "${this._type}"`);
        }
    }

    static create() {
        return new Command.Builder();
    }

    static move(unit, x, y) {
        return new Command.Builder()
            .forUnit(unit)
            .moveTo(x, y)
            .build();
    }

    static attack(unit, target, pursue = true) {
        return new Command.Builder()
            .forUnit(unit)
            .attack(target)
            .withPursuit(pursue)
            .build();
    }

    static harvest(unit, field = null) {
        return new Command.Builder()
            .forUnit(unit)
            .harvest(field)
            .build();
    }
};

// ===========================================
// EXPORT FOR GLOBAL ACCESS
// ===========================================
if (typeof window !== 'undefined') {
    window.Command = Command;
    window.MoveCommand = MoveCommand;
    window.AttackCommand = AttackCommand;
    window.AttackMoveCommand = AttackMoveCommand;
    window.StopCommand = StopCommand;
    window.PatrolCommand = PatrolCommand;
    window.GuardCommand = GuardCommand;
    window.HarvestCommand = HarvestCommand;
    window.ReturnResourcesCommand = ReturnResourcesCommand;
    window.ConstructBuildingCommand = ConstructBuildingCommand;
}
