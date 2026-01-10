/**
 * Unit.js - Base class for all RTS units
 *
 * Implements:
 * - Command queue with shift-click support
 * - State machine (IDLE, MOVING, ATTACKING, etc.)
 * - Veterancy system (XP, ranks, stat bonuses)
 * - Machine-style primitive drawing
 * - Combat system (targeting, damage, projectiles)
 *
 * Subclasses: InfantryUnit, VehicleUnit, HarvesterUnit, AircraftUnit
 */

// Cached color objects to avoid creating them every frame
const UNIT_COLORS = {
    healthGreen: null,
    healthRed: null,
    harvesterFull: null,
    harvesterPartial: null,
    harvesterGlow: null,
    initialized: false
};

/**
 * Initialize cached colors (call after p5.js is ready)
 */
function initUnitColors() {
    if (UNIT_COLORS.initialized) return;
    if (typeof color !== 'function') return; // p5.js not ready

    UNIT_COLORS.healthGreen = color(100, 200, 100);
    UNIT_COLORS.healthRed = color(255, 100, 100);
    UNIT_COLORS.harvesterFull = color(100, 255, 150);
    UNIT_COLORS.harvesterPartial = color(50, 150, 100);
    UNIT_COLORS.initialized = true;
}

class Unit {
    /**
     * @param {number} x - Spawn X position
     * @param {number} y - Spawn Y position
     * @param {object} owner - Player who owns this unit
     * @param {object} config - Unit configuration from RTS_UNITS
     */
    constructor(x, y, owner, config) {
        // Position and movement
        this.x = x;
        this.y = y;
        this.owner = owner;
        this.config = config;

        // Core stats (from config)
        this.maxHealth = config.health || 100;
        this.health = this.maxHealth;
        this.baseArmor = config.armor || 0;
        this.baseSpeed = config.speed || 2;
        this.baseDamage = config.damage || 10;
        this.baseFireRate = config.fireRate || 60;
        this.baseSightRange = config.sightRange || 5;
        this.baseAttackRange = config.attackRange || 3;

        // Unit identity
        this.id = Unit.nextId++;
        this.name = config.name || 'Unit';
        this.type = config.type || RTS_UNIT_TYPES.INFANTRY;
        this.tier = config.tier || 1;
        this.cost = config.cost || 100;

        // State machine
        this.state = RTS_UNIT_STATES.IDLE;
        this.active = true;
        this.isSelected = false;
        this.facingAngle = 0;

        // Command queue
        this.commandQueue = [];
        this.currentCommand = null;

        // Combat
        this.attackCooldown = 0;
        this.target = null;
        this.lastAttacker = null;
        this.lastDamageTime = 0;

        // Veterancy
        this.experience = 0;
        this.rank = 'ROOKIE';
        this.kills = 0;

        // Multipliers (from veterancy/buffs)
        this.damageMultiplier = 1.0;
        this.armorMultiplier = 1.0;
        this.speedMultiplier = 1.0;
        this.rofMultiplier = 1.0;
        this.sightMultiplier = 1.0;

        // Visual
        this.radius = 12;
        this.bodyColor = this.getDefaultColor();
        // Convert owner's color object {r,g,b} to p5.js color

        // Death fade out
        this.fadeOutAlpha = 255;  // Current transparency (255 = fully opaque)
        this.fadeOutDuration = 300;  // ms to fade out (after death animation)
        this.accentColor = owner && owner.color ?
            color(owner.color.r, owner.color.g, owner.color.b) :
            color(100, 100, 255);

        // Health bar
        this.showHealthBar = false;
        this.healthBarTimer = 0;

        // Stance: AI units spawn with HOLD_POSITION to prevent early attacks
        // Human units spawn with AGGRESSIVE for immediate control
        this.stance = (owner && !owner.isHuman) ? RTS_UNIT_STANCES.HOLD_POSITION : RTS_UNIT_STANCES.AGGRESSIVE;

        // Removed verbose logging - console.log is slow when spawning many units
    }

    // ===========================================
    // STATIC PROPERTIES
    // ===========================================
    static nextId = 1;

    // ===========================================
    // CORE UPDATE LOOP
    // ===========================================
    update(deltaTime = 1 / 60) {
        if (!this.active) return;

        // Handle death animation and fade out timer (replaces setTimeout to avoid memory leak)
        if (this.state === RTS_UNIT_STATES.DYING && this.deathTimestamp) {
            const elapsed = Date.now() - this.deathTimestamp;

            // Initial death delay (instant effect, then fade)
            if (elapsed < this.deathDelay) {
                // Still in initial death state, no fade yet
                this.fadeOutAlpha = 255;
            }
            // Fade out phase
            else if (elapsed < this.deathDelay + this.fadeOutDuration) {
                // Calculate fade progress (0 to 1)
                const fadeProgress = (elapsed - this.deathDelay) / this.fadeOutDuration;
                // Fade from 255 (opaque) to 0 (transparent)
                this.fadeOutAlpha = Math.max(0, 255 * (1 - fadeProgress));
            }
            // Fade complete - unit is done, can be pooled
            else {
                this.active = false;
                this.deathTimestamp = null;
                this.fadeOutAlpha = 0;
                return;
            }
        }

        // Update cooldowns
        if (this.attackCooldown > 0) {
            this.attackCooldown--;
        }

        // Health bar visibility timer
        if (this.healthBarTimer > 0) {
            this.healthBarTimer--;
            this.showHealthBar = true;
        } else {
            this.showHealthBar = false;
        }

        // Process current command
        this.processCommands(deltaTime);

        // Apply stance behavior when no current command (allows automatic re-targeting)
        if (!this.currentCommand) {
            // Reset to IDLE if in another state with no command
            if (this.state !== RTS_UNIT_STATES.IDLE) {
                this.state = RTS_UNIT_STATES.IDLE;
            }
            this.applyStanceBehavior(deltaTime);
        }

        // Self-healing for heroic units
        if (this.rank === 'HEROIC' && this.health < this.maxHealth * 0.5) {
            const healRate = RTS_VETERANCY.BONUSES.HEROIC.selfHeal || 0;
            this.health = Math.min(this.maxHealth, this.health + healRate * this.maxHealth * deltaTime);
        }

        // Apply unit separation to prevent stacking
        this.applySeparation(deltaTime);
    }

    /**
     * Apply separation force to prevent units from stacking
     * Uses a simple repulsion model based on overlap
     */
    applySeparation(deltaTime) {
        if (!Game.instance || !Game.instance.unitManager) return;
        if (this.state === RTS_UNIT_STATES.DYING) return;

        const separationRadius = this.radius * 2.5;  // Start pushing when this close
        const separationStrength = 150;  // Pixels per second max push
        const nearbyUnits = Game.instance.unitManager.getUnitsInRadius(this.x, this.y, separationRadius);

        let pushX = 0;
        let pushY = 0;
        let pushCount = 0;

        for (const other of nearbyUnits) {
            if (other === this || other.isDead()) continue;

            const dx = this.x - other.x;
            const dy = this.y - other.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < 0.1) {
                // Units at same position - push in random direction
                const angle = Math.random() * Math.PI * 2;
                pushX += Math.cos(angle) * separationStrength;
                pushY += Math.sin(angle) * separationStrength;
                pushCount++;
            } else if (dist < separationRadius) {
                // Calculate push proportional to overlap
                const overlap = 1 - (dist / separationRadius);
                const force = overlap * separationStrength;
                pushX += (dx / dist) * force;
                pushY += (dy / dist) * force;
                pushCount++;
            }
        }

        // Apply averaged push force
        if (pushCount > 0) {
            pushX /= pushCount;
            pushY /= pushCount;
            this.x += pushX * deltaTime;
            this.y += pushY * deltaTime;
        }
    }

    processCommands(deltaTime) {
        // Get next command if current is complete
        if (!this.currentCommand && this.commandQueue.length > 0) {
            this.currentCommand = this.commandQueue.shift();

            // Validate command before starting
            if (!this.validateCommand(this.currentCommand)) {
                console.warn(`Invalid command discarded for unit ${this.id}`);
                this.currentCommand = null;
                return;
            }

            this.currentCommand.start();
        }

        // Execute current command
        if (this.currentCommand) {
            // Validate command can still execute
            if (!this.currentCommand.canExecute || !this.currentCommand.canExecute()) {
                this.currentCommand = null;
                return;
            }

            if (!this.currentCommand.execute(deltaTime)) {
                // Command complete - cleanup to break circular references
                if (this.currentCommand && typeof this.currentCommand.cleanup === 'function') {
                    this.currentCommand.cleanup();
                }
                this.currentCommand = null;
            }
        }
    }

    /**
     * Validate that a command is properly formed and can be executed
     * @param {Command} command - Command to validate
     * @returns {boolean} True if command is valid
     */
    validateCommand(command) {
        // Check command exists and has required methods
        if (!command) return false;
        if (typeof command.start !== 'function') return false;
        if (typeof command.execute !== 'function') return false;

        // Check command references this unit
        if (command.unit !== this) {
            console.warn('Command unit mismatch');
            return false;
        }

        return true;
    }

    applyStanceBehavior(deltaTime) {
        // Guard: AttackCommand must exist
        if (typeof AttackCommand === 'undefined') return;

        // Recursion guard - prevent multiple stance checks per frame
        if (this._inStanceBehavior) return;
        this._inStanceBehavior = true;

        try {
            switch (this.stance) {
                case RTS_UNIT_STANCES.AGGRESSIVE:
                    // Seek and attack enemies (units or buildings) in sight range
                    const enemy = this.findNearestTarget(this.getSightRange() * RTS_GRID.CELL_SIZE);
                    if (enemy && enemy.active && !enemy.isDead()) {
                        const attackCmd = new AttackCommand(this, enemy, true);
                        this.queueCommand(attackCmd, false, true);
                    }
                    break;

                case RTS_UNIT_STANCES.DEFENSIVE:
                    // Only engage if recently attacked
                    if (this.lastAttacker && Date.now() - this.lastDamageTime < 5000) {
                        if (this.lastAttacker.active && !this.lastAttacker.isDead()) {
                            const attackCmd = new AttackCommand(this, this.lastAttacker, true);
                            this.queueCommand(attackCmd, false, true);
                        }
                    }
                    break;

                case RTS_UNIT_STANCES.HOLD_POSITION:
                    // Attack only enemies (units or buildings) in weapon range, don't move
                    const closeEnemy = this.findNearestTarget(this.getAttackRange());
                    if (closeEnemy && closeEnemy.active && !closeEnemy.isDead()) {
                        const attackCmd = new AttackCommand(this, closeEnemy, false);
                        this.queueCommand(attackCmd, false, true);
                    }
                    break;
            }
        } finally {
            this._inStanceBehavior = false;
        }
    }

    // ===========================================
    // COMMAND QUEUE
    // ===========================================

    /**
     * Add command to queue
     * @param {Command} command - Command to execute
     * @param {boolean} shiftPressed - If true, add to queue; if false, replace queue
     * @param {boolean} priority - If true, execute immediately
     */
    queueCommand(command, shiftPressed = false, priority = false) {
        // Validate command before queueing
        if (!this.validateCommand(command)) {
            console.warn(`Invalid command rejected for unit ${this.id}`);
            return;
        }

        if (priority) {
            // Interrupt current command and execute immediately
            if (this.currentCommand) {
                this.currentCommand.interrupt();
            }
            this.commandQueue.unshift(command);
            this.currentCommand = null;
        } else if (shiftPressed) {
            // Add to end of queue
            this.commandQueue.push(command);
        } else {
            // Replace queue
            this.clearCommands();
            this.commandQueue.push(command);
        }
    }

    /**
     * Clear all queued commands
     */
    clearCommands() {
        if (this.currentCommand) {
            this.currentCommand.interrupt();
            if (typeof this.currentCommand.cleanup === 'function') {
                this.currentCommand.cleanup();
            }
            this.currentCommand = null;
        }
        // Cleanup all queued commands to break circular references
        for (const cmd of this.commandQueue) {
            if (typeof cmd.cleanup === 'function') {
                cmd.cleanup();
            }
        }
        this.commandQueue = [];
        this.state = RTS_UNIT_STATES.IDLE;
    }

    /**
     * Issue a command (alias for queueCommand with replace)
     * @param {Command} command
     */
    issueCommand(command) {
        this.queueCommand(command, false, false);
    }

    // ===========================================
    // COMBAT
    // ===========================================

    /**
     * Perform an attack on target
     * @param {Unit|Building} target
     */
    performAttack(target) {
        if (!target || !target.active) return;

        // Calculate damage with modifiers
        const damage = this.getDamage();

        // Apply bonus damage vs type
        let finalDamage = damage;
        if (this.config.bonusVsVehicle && target.type === RTS_UNIT_TYPES.VEHICLE) {
            finalDamage *= this.config.bonusVsVehicle;
        }
        if (this.config.bonusVsAir && target.type === RTS_UNIT_TYPES.AIRCRAFT) {
            finalDamage *= this.config.bonusVsAir;
        }

        // Deal damage
        target.takeDamage(finalDamage, this);

        // Set cooldown
        this.attackCooldown = this.getFireRate();

        // Create projectile (visual effect)
        this.spawnProjectile(target);

        // Emit attack event
        if (typeof EVENTS !== 'undefined') {
            EVENTS.emit('UNIT_ATTACK', {
                attacker: this,
                target: target,
                damage: finalDamage
            });
        }
    }

    /**
     * Spawn projectile toward target
     * @param {Unit|Building} target
     */
    spawnProjectile(target) {
        if (window.RTSProjectileManager) {
            RTSProjectileManager.createProjectile(
                this.x, this.y,
                target.x, target.y,
                this.getProjectileType(),
                this.accentColor
            );
        }
    }

    getProjectileType() {
        if (this.type === RTS_UNIT_TYPES.INFANTRY) return 'bullet';
        if (this.type === RTS_UNIT_TYPES.VEHICLE) return 'shell';
        if (this.type === RTS_UNIT_TYPES.AIRCRAFT) return 'missile';
        return 'bullet';
    }

    /**
     * Take damage from attacker
     * @param {number} amount - Damage amount
     * @param {Unit|Building} attacker - Source of damage
     */
    takeDamage(amount, attacker) {
        if (this.state === RTS_UNIT_STATES.DYING) return;

        // Apply armor reduction
        const armor = this.getArmor();
        const reducedDamage = amount * (1 - armor);

        this.health -= reducedDamage;
        this.lastAttacker = attacker;
        this.lastDamageTime = Date.now();
        this.healthBarTimer = 180; // Show health bar for 3 seconds

        // Spawn damage particles
        if (window.ShapeRenderer && Game && Game.instance) {
            Game.instance.spawnParticles(this.x, this.y, 3, color(255, 100, 100));
        }

        // Check for death
        if (this.health <= 0) {
            this.die(attacker);
        }
    }

    /**
     * Handle unit death
     * @param {Unit|Building} killer
     */
    die(killer) {
        this.state = RTS_UNIT_STATES.DYING;
        this.clearCommands();

        // Award XP to killer
        if (killer && killer.addExperience) {
            const xpAward = this.cost * RTS_VETERANCY.XP_PER_KILL_MULT;
            killer.addExperience(xpAward);
            killer.kills++;
        }

        // Spawn death effects
        if (Game && Game.instance) {
            Game.instance.spawnParticles(this.x, this.y, 15, this.bodyColor);
            Game.instance.triggerShake(3);
        }

        // Emit death event
        if (typeof EVENTS !== 'undefined') {
            EVENTS.emit('UNIT_DESTROYED', {
                unit: this,
                killer: killer,
                position: { x: this.x, y: this.y }
            });
        }

        // Set death timer (handled in update loop - avoids setTimeout memory leak)
        this.deathTimestamp = Date.now();
        this.deathDelay = 300; // ms for death animation (before fade out)
        this.fadeOutStartTime = this.deathTimestamp + this.deathDelay; // Fade starts after death animation
        this.fadeOutAlpha = 255; // Reset fade alpha
    }

    isDead() {
        return this.state === RTS_UNIT_STATES.DYING || !this.active || this.health <= 0;
    }

    /**
     * Cleanup unit references to break circular reference chains
     * Called when unit is removed from game
     * NOTE: Does NOT clear commands - they may still execute and need this.unit
     */
    cleanup() {
        // Break cross-unit references that create circular chains
        // But don't null this.unit from commands - they still need it
        this.owner = null;
        this.target = null;
        this.lastAttacker = null;
        this.selectedBy = null;

        // Clear commands WITHOUT nulling unit references
        if (this.currentCommand) {
            this.currentCommand.interrupt();
            this.currentCommand = null;
        }
        this.commandQueue = [];
        this.state = RTS_UNIT_STATES.IDLE;
    }

    // ===========================================
    // TARGETING
    // ===========================================

    /**
     * Find nearest enemy unit/building within range
     * @param {number} range - Search range in pixels
     * @returns {Unit|Building|null}
     */
    findNearestEnemy(range) {
        if (!Game.instance || !Game.instance.unitManager) return null;

        // Get all enemy units within range
        const allUnits = Game.instance.unitManager.units;
        const enemies = allUnits.filter(u =>
            u.owner !== this.owner &&
            this.owner.isEnemy(u.owner) &&
            !u.isDead() &&
            u.active &&
            Math.hypot(u.x - this.x, u.y - this.y) <= range
        );

        if (enemies.length === 0) return null;

        // Find closest using linear scan O(n) instead of sort O(n log n)
        let nearest = enemies[0];
        let nearestDist = Math.hypot(nearest.x - this.x, nearest.y - this.y);

        for (let i = 1; i < enemies.length; i++) {
            const dist = Math.hypot(enemies[i].x - this.x, enemies[i].y - this.y);
            if (dist < nearestDist) {
                nearestDist = dist;
                nearest = enemies[i];
            }
        }

        return nearest;
    }

    /**
     * Find nearest target (unit or building) within range
     * Prioritizes units first, then falls back to buildings if no units found
     * @param {number} range - Search range in pixels
     * @returns {Unit|Building|null}
     */
    findNearestTarget(range) {
        // First try to find enemy units
        const nearestUnit = this.findNearestEnemy(range);
        if (nearestUnit) return nearestUnit;

        // If no units found, look for enemy buildings
        if (!Game.instance || !Game.instance.buildingManager) return null;

        const buildings = Game.instance.buildingManager.buildings;
        let nearest = null;
        let nearestDist = range;

        for (const building of buildings) {
            // Skip if not an enemy
            if (building.owner === this.owner) continue;
            if (building.isDead() || !building.active) continue;

            // Check distance
            const dist = Math.hypot(building.x - this.x, building.y - this.y);
            if (dist < nearestDist) {
                nearestDist = dist;
                nearest = building;
            }
        }

        return nearest;
    }

    // ===========================================
    // VETERANCY
    // ===========================================

    /**
     * Add experience points
     * @param {number} amount
     */
    addExperience(amount) {
        this.experience += amount;
        this.checkRankUp();
    }

    checkRankUp() {
        const ranks = RTS_VETERANCY.RANKS;
        let newRank = 'ROOKIE';

        if (this.experience >= ranks.HEROIC.xp) {
            newRank = 'HEROIC';
        } else if (this.experience >= ranks.ELITE.xp) {
            newRank = 'ELITE';
        } else if (this.experience >= ranks.VETERAN.xp) {
            newRank = 'VETERAN';
        }

        if (newRank !== this.rank) {
            this.rank = newRank;
            this.applyRankBonuses();
            this.onRankUp();
        }
    }

    applyRankBonuses() {
        const bonuses = RTS_VETERANCY.BONUSES[this.rank];
        if (bonuses) {
            this.damageMultiplier = bonuses.damage;
            this.armorMultiplier = bonuses.armor;
            this.speedMultiplier = bonuses.speed;
            this.rofMultiplier = bonuses.rof;
            this.sightMultiplier = bonuses.sight;
        }
    }

    onRankUp() {
        // Visual effect
        if (Game && Game.instance) {
            Game.instance.spawnParticles(this.x, this.y - 20, 10, color(255, 215, 0));
        }

        // Emit event
        if (typeof EVENTS !== 'undefined') {
            EVENTS.emit('UNIT_RANK_UP', {
                unit: this,
                rank: this.rank
            });
        }
    }

    // ===========================================
    // STAT GETTERS (with multipliers)
    // ===========================================

    getSpeed() {
        return this.baseSpeed * this.speedMultiplier;
    }

    getDamage() {
        return this.baseDamage * this.damageMultiplier;
    }

    getArmor() {
        return Math.min(0.9, this.baseArmor * this.armorMultiplier);
    }

    getFireRate() {
        return Math.max(5, this.baseFireRate / this.rofMultiplier);
    }

    getSightRange() {
        return this.baseSightRange * this.sightMultiplier;
    }

    getAttackRange() {
        return this.baseAttackRange * RTS_GRID.CELL_SIZE;
    }

    // ===========================================
    // POSITION HELPERS
    // ===========================================

    getGridPosition() {
        return {
            r: Math.floor(this.y / RTS_GRID.CELL_SIZE),
            c: Math.floor(this.x / RTS_GRID.CELL_SIZE)
        };
    }

    getCenter() {
        return { x: this.x, y: this.y };
    }

    distanceTo(other) {
        return Math.hypot(other.x - this.x, other.y - this.y);
    }

    // ===========================================
    // SELECTION
    // ===========================================

    select() {
        this.isSelected = true;
        if (typeof EVENTS !== 'undefined') {
            EVENTS.emit('UNIT_SELECTED', { unit: this });
        }
    }

    deselect() {
        this.isSelected = false;
    }

    containsPoint(px, py) {
        const dist = Math.hypot(px - this.x, py - this.y);
        return dist <= this.radius;
    }

    // ===========================================
    // DRAWING
    // ===========================================

    draw() {
        // Don't draw if completely faded out
        if (this.fadeOutAlpha <= 0) return;
        // Don't draw if inactive and not in death animation
        if (!this.active && this.state !== RTS_UNIT_STATES.DYING) return;

        push();
        translate(this.x, this.y);

        // Shadow (fade with unit during death)
        if (window.ShapeRenderer) {
            if (this.state === RTS_UNIT_STATES.DYING && this.fadeOutAlpha < 255) {
                // Shadow also fades during fade out phase
                const shadowAlpha = map(this.fadeOutAlpha, 0, 255, 0, 40);
                window.ShapeRenderer.drawShadow(0, this.radius * 0.8, this.radius * 1.5, this.radius * 0.5, shadowAlpha);
            } else {
                window.ShapeRenderer.drawShadow(0, this.radius * 0.8, this.radius * 1.5, this.radius * 0.5, 40);
            }
        }

        // Apply fade out transparency
        if (this.state === RTS_UNIT_STATES.DYING) {
            tint(255, this.fadeOutAlpha);
        }

        // Rotate to facing direction
        rotate(this.facingAngle);

        // Draw unit body (override in subclasses)
        this.drawBody();

        // CRITICAL: Reset tint immediately after drawing
        noTint();

        pop();

        // Draw overlays (not rotated) - only if not completely faded
        if (this.fadeOutAlpha > 0) {
            this.drawOverlays();
        }
    }

    /**
     * Draw unit body - override in subclasses for different unit types
     */
    drawBody() {
        // Default: simple circular unit
        noStroke();

        // Base circle
        fill(this.bodyColor);
        if (window.ShapeRenderer) {
            window.ShapeRenderer.drawCircle(0, 0, this.radius * 2);
        } else {
            ellipse(0, 0, this.radius * 2);
        }

        // Team color accent
        fill(this.accentColor);
        if (window.ShapeRenderer) {
            window.ShapeRenderer.drawCircle(0, 0, this.radius);
        } else {
            ellipse(0, 0, this.radius);
        }

        // Direction indicator
        fill(200);
        triangle(this.radius * 0.5, 0, -this.radius * 0.3, -this.radius * 0.4, -this.radius * 0.3, this.radius * 0.4);
    }

    /**
     * Draw UI overlays (selection, health bar, rank)
     */
    drawOverlays() {
        // Selection indicator
        if (this.isSelected) {
            if (window.ShapeRenderer) {
                window.ShapeRenderer.drawSelectionIndicator(
                    this.x, this.y,
                    this.radius * 2.5,
                    this.accentColor
                );
            } else {
                noFill();
                stroke(this.accentColor);
                strokeWeight(2);
                ellipse(this.x, this.y, this.radius * 2.5);
            }
        }

        // Health bar
        if (this.showHealthBar || this.isSelected) {
            const percent = this.health / this.maxHealth;
            if (window.ShapeRenderer) {
                window.ShapeRenderer.drawHealthBar(
                    this.x, this.y - this.radius - 10,
                    30, 4, percent
                );
            } else {
                // Fallback health bar (use cached colors)
                initUnitColors();
                fill(60);
                noStroke();
                rect(this.x - 15, this.y - this.radius - 10, 30, 4);
                fill(percent > 0.5 ? UNIT_COLORS.healthGreen : UNIT_COLORS.healthRed);
                rect(this.x - 15, this.y - this.radius - 10, 30 * percent, 4);
            }
        }

        // Rank chevrons
        if (this.rank !== 'ROOKIE') {
            this.drawRankIndicator();
        }
    }

    drawRankIndicator() {
        const rankColors = {
            VETERAN: color(100, 200, 255),
            ELITE: color(255, 200, 50),
            HEROIC: color(255, 100, 255)
        };

        const chevronCount = {
            VETERAN: 1,
            ELITE: 2,
            HEROIC: 3
        };

        const chevronColor = rankColors[this.rank] || color(255);
        const count = chevronCount[this.rank] || 0;

        push();
        translate(this.x + this.radius + 3, this.y - this.radius);

        stroke(chevronColor);
        strokeWeight(2);
        noFill();

        for (let i = 0; i < count; i++) {
            const y = i * 4;
            line(-3, y, 0, y + 3);
            line(0, y + 3, 3, y);
        }

        pop();
    }

    // ===========================================
    // UTILITY
    // ===========================================

    getDefaultColor() {
        switch (this.type) {
            case RTS_UNIT_TYPES.INFANTRY:
                return color(100, 150, 100);
            case RTS_UNIT_TYPES.VEHICLE:
                return color(100, 100, 150);
            case RTS_UNIT_TYPES.AIRCRAFT:
                return color(150, 100, 100);
            case RTS_UNIT_TYPES.HARVESTER:
                return color(150, 150, 100);
            default:
                return color(120, 120, 120);
        }
    }

    /**
     * Serialize unit state for saving/networking
     */
    serialize() {
        return {
            id: this.id,
            type: this.config.name,
            x: this.x,
            y: this.y,
            health: this.health,
            experience: this.experience,
            rank: this.rank,
            ownerId: this.owner ? this.owner.id : null
        };
    }

    // ===========================================
    // STATIC BUILDER CLASS
    // ===========================================

    /**
     * Fluent builder for creating Unit instances
     *
     * Usage:
     *   const unit = Unit.Builder.create()
     *       .ofType('infantry')
     *       .atPosition(100, 200)
     *       .ownedBy(player)
     *       .withHealth(150)
     *       .withSpeed(2.5)
     *       .build();
     */
    static Builder = class {
        constructor() {
            this._reset();
        }

        _reset() {
            this._type = 'infantry';
            this._x = 0;
            this._y = 0;
            this._owner = null;
            this._config = {};
            this._overrides = {};
            return this;
        }

        ofType(type) {
            this._type = type.toLowerCase();
            return this;
        }

        atPosition(x, y) {
            this._x = x;
            this._y = y;
            return this;
        }

        ownedBy(player) {
            this._owner = player;
            return this;
        }

        withHealth(health) {
            this._overrides.health = health;
            return this;
        }

        withSpeed(speed) {
            this._overrides.speed = speed;
            return this;
        }

        withDamage(damage) {
            this._overrides.damage = damage;
            return this;
        }

        withAttackRange(range) {
            this._overrides.attackRange = range;
            return this;
        }

        withSightRange(range) {
            this._overrides.sightRange = range;
            return this;
        }

        withFireRate(rate) {
            this._overrides.fireRate = rate;
            return this;
        }

        withArmor(armor) {
            this._overrides.armor = armor;
            return this;
        }

        withCost(cost) {
            this._overrides.cost = cost;
            return this;
        }

        withExperience(xp) {
            this._overrides.experience = xp;
            return this;
        }

        withRank(rank) {
            this._overrides.rank = rank.toUpperCase();
            return this;
        }

        withHarvestCapacity(capacity) {
            this._overrides.harvestCapacity = capacity;
            this._overrides.capacity = capacity;
            return this;
        }

        withHarvestRate(rate) {
            this._overrides.harvestRate = rate;
            return this;
        }

        withConfig(config) {
            this._config = { ...this._config, ...config };
            return this;
        }

        build() {
            const baseConfig = this._getBaseConfig();
            const mergedConfig = {
                ...baseConfig,
                ...this._config,
                ...this._overrides
            };

            let unit;
            const typeNormalized = this._type.toUpperCase();

            switch (typeNormalized) {
                case 'INFANTRY':
                    unit = new InfantryUnit(
                        this._x,
                        this._y,
                        this._owner,
                        mergedConfig
                    );
                    break;

                case 'VEHICLE':
                    unit = new VehicleUnit(
                        this._x,
                        this._y,
                        this._owner,
                        mergedConfig
                    );
                    break;

                case 'HARVESTER':
                    unit = new HarvesterUnit(
                        this._x,
                        this._y,
                        this._owner,
                        mergedConfig
                    );
                    break;

                default:
                    unit = new Unit(
                        this._x,
                        this._y,
                        this._owner,
                        mergedConfig
                    );
            }

            if (this._overrides.experience) {
                unit.experience = this._overrides.experience;
            }

            if (this._overrides.rank) {
                unit.rank = this._overrides.rank;
                unit.applyRankBonuses();
            }

            return unit;
        }

        _getBaseConfig() {
            if (typeof RTS_UNITS !== 'undefined') {
                const upperType = this._type.toUpperCase();
                if (RTS_UNITS[upperType]) {
                    return { ...RTS_UNITS[upperType], name: this._type };
                }
            }

            const defaults = {
                infantry: {
                    name: 'infantry',
                    type: 'infantry',
                    health: 100,
                    speed: 1.5,
                    damage: 10,
                    fireRate: 60,
                    attackRange: 3,
                    sightRange: 5,
                    armor: 0,
                    cost: 100
                },
                vehicle: {
                    name: 'vehicle',
                    type: 'vehicle',
                    health: 300,
                    speed: 2.0,
                    damage: 25,
                    fireRate: 90,
                    attackRange: 4,
                    sightRange: 6,
                    armor: 0.2,
                    cost: 500
                },
                harvester: {
                    name: 'harvester',
                    type: 'harvester',
                    health: 400,
                    speed: 2.8,
                    damage: 0,
                    sightRange: 4,
                    armor: 0.1,
                    cost: 1000,
                    harvestCapacity: 1000,
                    capacity: 1000,
                    harvestRate: 50
                }
            };

            return defaults[this._type] || defaults.infantry;
        }

        static create() {
            return new Unit.Builder();
        }

        static infantry(owner, x = 0, y = 0) {
            return new Unit.Builder()
                .ofType('infantry')
                .atPosition(x, y)
                .ownedBy(owner)
                .build();
        }

        static vehicle(owner, x = 0, y = 0) {
            return new Unit.Builder()
                .ofType('vehicle')
                .atPosition(x, y)
                .ownedBy(owner)
                .build();
        }

        static harvester(owner, x = 0, y = 0) {
            return new Unit.Builder()
                .ofType('harvester')
                .atPosition(x, y)
                .ownedBy(owner)
                .build();
        }
    };
}

// Static ID counter for unique unit IDs
Unit.nextId = 1;

// ===========================================
// INFANTRY UNIT
// ===========================================
class InfantryUnit extends Unit {
    constructor(x, y, owner, config) {
        super(x, y, owner, config);
        this.radius = 8;
        this.canGarrison = config.canGarrison || false;
        this.isGarrisoned = false;
    }

    drawBody() {
        // Infantry: Small humanoid figure

        // Legs
        noStroke();
        fill(60);
        rect(-3, 2, 2, 6);
        rect(1, 2, 2, 6);

        // Body
        fill(this.bodyColor);
        stroke(0);
        strokeWeight(1);
        ellipse(0, 0, 10, 12);

        // Head
        fill(220, 180, 150);
        noStroke();
        ellipse(0, -6, 6, 6);

        // Weapon pointing in facing direction
        push();
        rotate(0); // Already rotated by parent
        fill(80);
        rect(3, -2, 10, 3);
        pop();

        // Team color helmet
        fill(this.accentColor);
        arc(0, -7, 6, 4, PI, TWO_PI);
    }
}

// ===========================================
// VEHICLE UNIT
// ===========================================
class VehicleUnit extends Unit {
    constructor(x, y, owner, config) {
        super(x, y, owner, config);
        this.radius = 16;
        this.crushesInfantry = config.crushesInfantry || false;
        this.turretAngle = 0;
    }

    update(deltaTime) {
        super.update(deltaTime);

        // Turret tracks target
        if (this.target && this.target.active) {
            const targetAngle = Math.atan2(
                this.target.y - this.y,
                this.target.x - this.x
            );
            // Smooth turret rotation
            const angleDiff = targetAngle - this.turretAngle;
            this.turretAngle += angleDiff * 0.1;
        }
    }

    drawBody() {
        // Vehicle: Tank-like shape

        // Treads
        fill(50);
        noStroke();
        rect(-18, -8, 36, 4, 2);
        rect(-18, 4, 36, 4, 2);

        // Hull
        fill(this.bodyColor);
        stroke(0);
        strokeWeight(1);
        rect(-16, -6, 32, 12, 3);

        // Team color stripe
        noStroke();
        fill(this.accentColor);
        rect(-14, -2, 28, 4);

        // Turret (rotates independently)
        push();
        rotate(this.turretAngle - this.facingAngle); // Counter-rotate to world space

        fill(red(this.bodyColor) * 0.8, green(this.bodyColor) * 0.8, blue(this.bodyColor) * 0.8);
        stroke(0);
        strokeWeight(1);
        ellipse(0, 0, 14, 14);

        // Barrel
        fill(60);
        rect(5, -2, 20, 4, 1);

        pop();
    }
}

// ===========================================
// HARVESTER UNIT
// ===========================================
class HarvesterUnit extends Unit {
    constructor(x, y, owner, config) {
        super(x, y, owner, config);
        this.radius = 18;
        this.capacity = config.harvestCapacity || config.capacity || RTS_RESOURCES?.HARVESTER_CAPACITY || 1000;
        this.harvestRate = config.harvestRate || RTS_RESOURCES?.HARVEST_RATE || 50;
        this.currentLoad = 0;
        this.homeRefinery = null;

        // Harvesters should not chase enemies - they focus on harvesting
        this.stance = RTS_UNIT_STANCES.HOLD_POSITION;

        // Cooldown to prevent spamming auto-harvest when no tiberium available
        this.autoHarvestCooldown = 0;
    }

    /**
     * Harvest resources from a cell
     * @param {object} cell - Tiberium cell to harvest from
     * @param {number} deltaTime
     * @returns {number} Amount harvested
     */
    harvest(cell, deltaTime) {
        if (!cell || this.currentLoad >= this.capacity) return 0;

        const harvestAmount = this.harvestRate * deltaTime;
        const available = Math.min(harvestAmount, cell.amount, this.capacity - this.currentLoad);

        cell.amount -= available;
        this.currentLoad += available;

        return available;
    }

    /**
     * Deposit resources at refinery
     * @param {Building} refinery
     * @returns {number} Amount deposited
     */
    depositResources(refinery) {
        const amount = this.currentLoad;
        this.currentLoad = 0;

        if (refinery && refinery.owner) {
            refinery.owner.addResources('tiberium', amount);
        }

        return amount;
    }

    getLoadPercent() {
        return this.currentLoad / this.capacity;
    }

    drawBody() {
        // Harvester: Large industrial vehicle
        const loadPercent = this.getLoadPercent();

        // Base platform
        fill(80, 70, 60);
        noStroke();
        rect(-20, -10, 40, 20, 4);

        // Treads
        fill(40);
        rect(-22, -12, 8, 24, 2);
        rect(14, -12, 8, 24, 2);

        // Body - color shifts based on load
        const bodyR = red(this.bodyColor);
        const bodyG = green(this.bodyColor);
        const bodyB = blue(this.bodyColor);
        fill(bodyR, bodyG + loadPercent * 50, bodyB);
        stroke(0);
        strokeWeight(1);
        rect(-16, -8, 32, 16, 3);

        // Collection arm (front) - animate when harvesting
        fill(100);
        if (this.state === RTS_UNIT_STATES.HARVESTING) {
            const wobble = sin(millis() / 100) * 2;
            rect(12, -6 + wobble, 12, 12, 2);
        } else {
            rect(12, -6, 12, 12, 2);
        }

        // Team color stripe
        noStroke();
        fill(this.accentColor);
        rect(-14, -2, 28, 4);

        // Tiberium in cargo bay - green glow based on load
        if (loadPercent > 0) {
            // Cargo visualization
            const glowIntensity = 100 + loadPercent * 155;
            fill(50, glowIntensity, 80, 200);
            rect(-12, 4, 24 * loadPercent, 4, 2);

            // Crystal sparkle effect when full
            if (loadPercent > 0.8) {
                const sparkle = (sin(millis() / 50) + 1) / 2;
                fill(150, 255, 150, sparkle * 100);
                ellipse(-8 + random(-2, 2), 6, 3, 3);
            }
        }

        // State indicator icon
        this.drawStateIcon();
    }

    /**
     * Draw state indicator icon above harvester
     */
    drawStateIcon() {
        push();
        translate(0, -25);

        if (this.state === RTS_UNIT_STATES.HARVESTING) {
            // Pickaxe/mining icon
            stroke(0, 200, 100);
            strokeWeight(2);
            noFill();
            // Animated mining motion
            const swing = sin(millis() / 150) * 15;
            push();
            rotate(radians(swing));
            line(0, 0, 0, 8);
            line(-4, 0, 4, 0);
            pop();
        } else if (this.state === RTS_UNIT_STATES.RETURNING) {
            // Arrow pointing to refinery
            fill(255, 200, 50);
            noStroke();
            triangle(0, -4, -5, 4, 5, 4);
            rect(-2, 4, 4, 4);
        } else if (this.state === RTS_UNIT_STATES.UNLOADING) {
            // Unloading animation
            const progress = (millis() % 1000) / 1000;
            stroke(0, 255, 100);
            strokeWeight(2);
            noFill();
            arc(0, 0, 12, 12, 0, TWO_PI * progress);
        }

        pop();
    }

    /**
     * Override update to auto-harvest when idle
     */
    update(deltaTime) {
        super.update(deltaTime);

        // Update cooldown
        if (this.autoHarvestCooldown > 0) {
            this.autoHarvestCooldown -= deltaTime;
        }

        // Auto-harvest when idle and no commands pending (with cooldown)
        if (this.state === RTS_UNIT_STATES.IDLE &&
            this.commandQueue.length === 0 &&
            !this.currentCommand &&
            this.autoHarvestCooldown <= 0) {

            // Set cooldown to prevent spam (3 seconds between attempts)
            this.autoHarvestCooldown = 3.0;

            if (this.currentLoad < this.capacity) {
                // Start harvesting
                const harvestCmd = new HarvestCommand(this);
                this.queueCommand(harvestCmd);
            } else {
                // Full - return to base
                const returnCmd = new ReturnResourcesCommand(this);
                this.queueCommand(returnCmd);
            }
        }
    }

    drawOverlays() {
        super.drawOverlays();

        const percent = this.getLoadPercent();

        // Load bar above health bar
        if (this.isSelected || this.currentLoad > 0) {
            initUnitColors();
            const barY = this.y - this.radius - 18;

            // Background
            fill(40);
            noStroke();
            rect(this.x - 18, barY, 36, 6, 2);

            // Tiberium fill (use cached color when full)
            if (percent >= 1) {
                fill(UNIT_COLORS.harvesterFull);
            } else {
                // Partial fill needs dynamic color calculation
                fill(50, 150 + percent * 100, 100);
            }
            rect(this.x - 17, barY + 1, 34 * percent, 4, 1);

            // Pulsing glow when full
            if (percent >= 1) {
                const pulse = (sin(millis() / 200) + 1) / 2;
                fill(100, 255, 150, pulse * 100);
                rect(this.x - 17, barY + 1, 34, 4, 1);
            }
        }

        // Tiberium amount text when selected
        if (this.isSelected) {
            push();
            fill(0, 255, 100);
            stroke(0);
            strokeWeight(2);
            textAlign(CENTER, BOTTOM);
            textSize(10);
            const loadText = `${Math.floor(this.currentLoad)}/${this.capacity}`;
            text(loadText, this.x, this.y - this.radius - 22);
            pop();
        }

        // Draw path line to target when selected
        if (this.isSelected && this.commandQueue.length > 0) {
            const cmd = this.commandQueue[0];
            if (cmd && cmd.dropPoint) {
                // Draw line to refinery
                push();
                stroke(255, 200, 50, 100);
                strokeWeight(2);
                drawingContext.setLineDash([5, 5]);
                line(this.x, this.y, cmd.dropPoint.x, cmd.dropPoint.y);
                drawingContext.setLineDash([]);
                pop();
            } else if (cmd && cmd.harvestPosition) {
                // Draw line to harvest point
                push();
                stroke(0, 255, 100, 100);
                strokeWeight(2);
                drawingContext.setLineDash([5, 5]);
                line(this.x, this.y, cmd.harvestPosition.x, cmd.harvestPosition.y);
                drawingContext.setLineDash([]);
                pop();
            }
        }
    }
}

// ===========================================
// EXPORT FOR GLOBAL ACCESS
// ===========================================
if (typeof window !== 'undefined') {
    window.Unit = Unit;
    window.InfantryUnit = InfantryUnit;
    window.VehicleUnit = VehicleUnit;
    window.HarvesterUnit = HarvesterUnit;
    window.UNIT_COLORS = UNIT_COLORS;
    window.initUnitColors = initUnitColors;
}
