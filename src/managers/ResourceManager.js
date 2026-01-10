/**
 * ResourceManager.js - Manages Tiberium fields and resource collection
 *
 * Responsibilities:
 * - Spawn and manage Tiberium fields
 * - Track field depletion and regeneration
 * - Provide queries for harvester AI
 * - Visual rendering of resource fields
 */

class ResourceManager {
    constructor(game) {
        this.game = game;

        // All tiberium fields
        this.fields = [];

        // Configuration
        this.config = RTS_RESOURCES || {
            TIBERIUM_VALUE: 100,
            FIELD_SIZE: 3,
            FIELD_CAPACITY: 10000,
            REGEN_RATE: 5,
            REGEN_DELAY: 30000
        };

        // Spawn configuration
        this.minFieldDistance = 200; // Minimum distance between fields
        this.initialFieldCount = 6;  // Fields to spawn at game start

        console.log("ResourceManager: Initialized");
    }

    /**
     * Initialize resource fields for the map
     */
    initializeFields() {
        this.fields = [];

        // Check if MapGenerator provided tiberium field data
        if (this.game.mapGenerator && this.game.mapGenerator.tiberiumFields) {
            if (this.game.mapGenerator.tiberiumFields.length > 0) {
                this.initializeFromMapGenerator();
                return;
            }
        }

        // Fallback: Spawn fields near player start positions
        for (const player of this.game.players) {
            if (player.startPosition) {
                this.spawnFieldNear(
                    player.startPosition.x,
                    player.startPosition.y,
                    150, 300 // Min/max distance from start
                );
            }
        }

        // Spawn neutral fields around the map
        const mapWidth = this.game.grid ? this.game.grid.cols * this.game.grid.cellSize : 2048;
        const mapHeight = this.game.grid ? this.game.grid.rows * this.game.grid.cellSize : 2048;

        for (let i = 0; i < this.initialFieldCount; i++) {
            this.spawnFieldRandom(mapWidth, mapHeight);
        }
    }

    /**
     * Initialize fields from MapGenerator's pre-defined tiberium locations
     */
    initializeFromMapGenerator() {
        const cellSize = this.game.grid?.cellSize || 32;
        const mapFields = this.game.mapGenerator.tiberiumFields;

        for (const fieldData of mapFields) {
            // Convert grid coordinates to world coordinates
            const worldX = (fieldData.gridX + 0.5) * cellSize;
            const worldY = (fieldData.gridY + 0.5) * cellSize;

            // Create field with appropriate type
            const field = this.createField(worldX, worldY, fieldData.type || 'green');

            // Scale field size based on radius
            if (fieldData.radius) {
                field.radius = fieldData.radius * cellSize;
            }
        }
    }

    /**
     * Create a new Tiberium field
     * @param {number} x - Center X
     * @param {number} y - Center Y
     * @param {string} type - 'green' or 'blue'
     * @returns {TiberiumField}
     */
    createField(x, y, type = 'green') {
        const field = new TiberiumField(x, y, type, this.config);
        this.fields.push(field);
        return field;
    }

    /**
     * Spawn a field near a position
     */
    spawnFieldNear(x, y, minDist, maxDist) {
        const angle = Math.random() * TWO_PI;
        const dist = minDist + Math.random() * (maxDist - minDist);

        const fieldX = x + Math.cos(angle) * dist;
        const fieldY = y + Math.sin(angle) * dist;

        return this.createField(fieldX, fieldY, 'green');
    }

    /**
     * Spawn a field at random position
     */
    spawnFieldRandom(mapWidth, mapHeight) {
        const margin = 100;
        let attempts = 10;

        while (attempts > 0) {
            const x = margin + Math.random() * (mapWidth - margin * 2);
            const y = margin + Math.random() * (mapHeight - margin * 2);

            // Check distance from other fields
            let valid = true;
            for (const field of this.fields) {
                const dist = Math.hypot(field.x - x, field.y - y);
                if (dist < this.minFieldDistance) {
                    valid = false;
                    break;
                }
            }

            if (valid) {
                // 20% chance for blue tiberium (more valuable)
                const type = Math.random() < 0.2 ? 'blue' : 'green';
                return this.createField(x, y, type);
            }

            attempts--;
        }

        return null;
    }

    /**
     * Find the nearest tiberium field with resources
     * @param {number} x - Start X
     * @param {number} y - Start Y
     * @param {number} maxRange - Maximum search range (optional)
     * @param {Player} owner - Optional owner to prefer fields near their base
     * @returns {TiberiumField|null}
     */
    findNearestField(x, y, maxRange = Infinity, owner = null) {
        if (this.fields.length === 0) {
            return null;
        }

        let best = null;
        let bestScore = Infinity;
        let fallbackBest = null;
        let fallbackScore = Infinity;

        // Get owner's base position for preference calculation
        const basePos = owner?.startPosition || null;

        // First pass: find the closest field to the base (reference distance)
        let minDistToBase = Infinity;
        if (basePos && basePos.x !== undefined) {
            for (const field of this.fields) {
                if (field.isDepleted()) continue;
                const distToBase = Math.hypot(field.x - basePos.x, field.y - basePos.y);
                if (distToBase < minDistToBase) {
                    minDistToBase = distToBase;
                }
            }
        }

        for (const field of this.fields) {
            if (field.isDepleted()) {
                continue;
            }

            const distToHarvester = Math.hypot(field.x - x, field.y - y);
            if (distToHarvester > maxRange) continue;

            // Track the absolute closest field as fallback
            if (distToHarvester < fallbackScore) {
                fallbackScore = distToHarvester;
                fallbackBest = field;
            }

            // Calculate score (lower is better)
            let score = distToHarvester;

            // If owner has valid base position, prefer fields near base
            if (basePos && basePos.x !== undefined && minDistToBase < Infinity) {
                const distToBase = Math.hypot(field.x - basePos.x, field.y - basePos.y);

                // Soft limit: skip fields more than 2.5x farther than the nearest field to base
                if (distToBase > minDistToBase * 2.5) {
                    continue;
                }

                // Strong weight on distance to base (2x weight)
                score = distToHarvester + distToBase * 2;
            }

            if (score < bestScore) {
                bestScore = score;
                best = field;
            }
        }

        // If base-distance filter removed all fields, use fallback (closest field)
        if (!best && fallbackBest) {
            return fallbackBest;
        }

        return best;
    }

    /**
     * Find the best tiberium cell to harvest at a field
     * Uses linear scan (O(n)) instead of sorting (O(n log n))
     * @param {TiberiumField} field
     * @param {number} harvesterX
     * @param {number} harvesterY
     * @returns {object|null} { x, y, amount }
     */
    findBestHarvestCell(field, harvesterX, harvesterY) {
        if (!field || field.isDepleted()) return null;

        // Get cells with tiberium
        const cells = field.getCellsWithTiberium();
        if (cells.length === 0) return null;

        // Linear scan to find best cell (O(n) instead of O(n log n) sort)
        let bestCell = null;
        let bestScore = Infinity;

        for (let i = 0; i < cells.length; i++) {
            const cell = cells[i];
            const dist = Math.hypot(cell.x - harvesterX, cell.y - harvesterY);
            // Score: prefer closer cells with more tiberium (lower is better)
            const score = dist / cell.amount;
            if (score < bestScore) {
                bestScore = score;
                bestCell = cell;
            }
        }

        return bestCell;
    }

    /**
     * Harvest tiberium from a position
     * @param {number} x - Harvest position X
     * @param {number} y - Harvest position Y
     * @param {number} amount - Amount to harvest
     * @returns {object} { harvested: number, value: number }
     */
    harvestAt(x, y, amount) {
        for (const field of this.fields) {
            const result = field.harvestAt(x, y, amount);
            if (result.harvested > 0) {
                return result;
            }
        }
        return { harvested: 0, value: 0 };
    }

    /**
     * Update all fields (regeneration)
     * @param {number} deltaTime
     */
    update(deltaTime) {
        for (const field of this.fields) {
            field.update(deltaTime);
        }
    }

    /**
     * Draw all tiberium fields
     */
    draw() {
        for (const field of this.fields) {
            field.draw();
        }
    }

    /**
     * Check if a building rectangle would overlap any tiberium field
     * @param {number} x - Building center X
     * @param {number} y - Building center Y
     * @param {number} width - Building width in pixels
     * @param {number} height - Building height in pixels
     * @returns {TiberiumField|null} The overlapping field, or null if no overlap
     */
    checkBuildingOverlap(x, y, width, height) {
        for (const field of this.fields) {
            if (field.overlapsRect(x, y, width, height)) {
                return field;
            }
        }
        return null;
    }

    /**
     * Check if a point is inside any tiberium field
     * @param {number} x
     * @param {number} y
     * @returns {TiberiumField|null}
     */
    getFieldAtPoint(x, y) {
        for (const field of this.fields) {
            if (field.containsPoint(x, y)) {
                return field;
            }
        }
        return null;
    }

    /**
     * Get debug info
     */
    getDebugInfo() {
        let totalTiberium = 0;
        let activeFields = 0;

        for (const field of this.fields) {
            totalTiberium += field.getTotalAmount();
            if (!field.isDepleted()) activeFields++;
        }

        return {
            fields: this.fields.length,
            activeFields,
            totalTiberium: Math.floor(totalTiberium)
        };
    }

    /**
     * Get total tiberium across all fields (for harvest loop prevention)
     */
    getTotalAmount() {
        let total = 0;
        for (const field of this.fields) {
            total += field.getTotalAmount();
        }
        return total;
    }

    /**
     * Cleanup method - call when game ends or manager is destroyed
     * Prevents memory leaks from stale references
     */
    destroy() {
        // Clear all fields and their internal references
        for (const field of this.fields) {
            field.destroy();
        }
        this.fields = [];
        this.game = null;
        console.log('ResourceManager: Destroyed');
    }

    /**
     * Reset the manager (for new game)
     */
    reset() {
        this.destroy();
        this.fields = [];
        this.initializeFields();
    }

    /**
     * Clear all fields without reinitializing (for game cleanup)
     */
    clear() {
        // Destroy each field
        for (const field of this.fields) {
            if (field.destroy) field.destroy();
        }
        this.fields = [];
        console.log("ResourceManager: Cleared all fields");
    }
}

/**
 * TiberiumField - A cluster of tiberium crystals with regrowth core
 */
class TiberiumField {
    constructor(x, y, type, config) {
        this.x = x;
        this.y = y;
        this.type = type; // 'green' or 'blue'
        this.config = config;

        // Field properties
        this.radius = (config.FIELD_SIZE || 3) * (RTS_GRID?.CELL_SIZE || 32);
        this.maxCapacity = config.FIELD_CAPACITY || 10000;
        this.baseRegenRate = config.REGEN_RATE || 5;
        this.regenDelay = config.REGEN_DELAY || 10000; // Faster regen start

        // Value multiplier (blue is worth more)
        this.valueMultiplier = type === 'blue' ? 2.0 : 1.0;

        // Regrowth Core - center structure that accelerates regeneration
        this.coreRadius = 20;
        this.coreHealth = 100;
        this.coreMaxHealth = 100;
        this.coreRegenBoost = 5.0; // 5x faster regen when core is alive
        this.corePulse = 0; // Animation phase

        // Initialize cells
        this.cells = [];
        this.initializeCells();

        // Regeneration tracking
        this.lastHarvestTime = 0;
        this.isRegenerating = false;

        // Cache for total amount (invalidated on harvest/regen)
        this._cachedTotalAmount = null;
        this._cacheValid = false;

        // Visual properties
        this.crystals = this.generateCrystals();
        this.ambientParticles = [];
        this.shimmerPhase = Math.random() * TWO_PI;
    }

    /**
     * Initialize tiberium cells within the field
     */
    initializeCells() {
        const cellSize = RTS_GRID?.CELL_SIZE || 32;
        const gridRadius = Math.ceil(this.radius / cellSize);

        for (let dr = -gridRadius; dr <= gridRadius; dr++) {
            for (let dc = -gridRadius; dc <= gridRadius; dc++) {
                const dist = Math.hypot(dr, dc) * cellSize;
                if (dist <= this.radius) {
                    // Amount decreases towards edges, increases near core
                    const edgeFalloff = 1 - (dist / this.radius) * 0.4;
                    const coreFalloff = dist < this.radius * 0.3 ? 1.3 : 1.0;
                    const baseAmount = (this.maxCapacity / (gridRadius * gridRadius * 3)) * edgeFalloff * coreFalloff;

                    this.cells.push({
                        x: this.x + dc * cellSize,
                        y: this.y + dr * cellSize,
                        amount: baseAmount + Math.random() * baseAmount * 0.5,
                        maxAmount: baseAmount * 1.5,
                        distFromCore: dist
                    });
                }
            }
        }
    }

    /**
     * Generate crystal positions for visual rendering
     */
    generateCrystals() {
        const crystals = [];
        const count = 25 + Math.floor(Math.random() * 15);

        for (let i = 0; i < count; i++) {
            const angle = Math.random() * TWO_PI;
            // Keep crystals away from the core center
            const minDist = this.coreRadius + 5;
            const dist = minDist + Math.random() * (this.radius * 0.85 - minDist);

            crystals.push({
                x: Math.cos(angle) * dist,
                y: Math.sin(angle) * dist,
                height: 10 + Math.random() * 20,
                width: 3 + Math.random() * 5,
                rotation: Math.random() * 0.4 - 0.2,
                shimmerOffset: Math.random() * TWO_PI,
                growthDelay: Math.random() * 1000
            });
        }

        // Sort by Y for proper layering
        crystals.sort((a, b) => a.y - b.y);
        return crystals;
    }

    /**
     * Check if a point is within the tiberium field (for building placement)
     * @returns {boolean}
     */
    containsPoint(x, y) {
        const dist = Math.hypot(x - this.x, y - this.y);
        return dist <= this.radius;
    }

    /**
     * Check if a rectangle overlaps the tiberium field
     * @param {number} rx - Rectangle center X
     * @param {number} ry - Rectangle center Y
     * @param {number} rw - Rectangle width
     * @param {number} rh - Rectangle height
     * @returns {boolean}
     */
    overlapsRect(rx, ry, rw, rh) {
        // Find closest point on rectangle to circle center
        const closestX = Math.max(rx - rw/2, Math.min(this.x, rx + rw/2));
        const closestY = Math.max(ry - rh/2, Math.min(this.y, ry + rh/2));

        const dist = Math.hypot(closestX - this.x, closestY - this.y);
        return dist <= this.radius;
    }

    /**
     * Get bounding box for the field
     */
    getBounds() {
        return {
            x: this.x - this.radius,
            y: this.y - this.radius,
            width: this.radius * 2,
            height: this.radius * 2,
            centerX: this.x,
            centerY: this.y,
            radius: this.radius
        };
    }

    /**
     * Harvest tiberium at a specific position
     */
    harvestAt(x, y, maxAmount) {
        const cellSize = RTS_GRID?.CELL_SIZE || 32;

        for (const cell of this.cells) {
            const dist = Math.hypot(cell.x - x, cell.y - y);
            if (dist <= cellSize && cell.amount > 0) {
                const harvested = Math.min(cell.amount, maxAmount);
                cell.amount -= harvested;
                this.lastHarvestTime = millis();
                this.invalidateCache(); // Invalidate cached total

                return {
                    harvested,
                    value: harvested * (this.config.TIBERIUM_VALUE || 100) * this.valueMultiplier
                };
            }
        }

        return { harvested: 0, value: 0 };
    }

    /**
     * Get all cells with tiberium
     */
    getCellsWithTiberium() {
        return this.cells.filter(c => c.amount > 0);
    }

    /**
     * Get total tiberium in field (cached for performance)
     */
    getTotalAmount() {
        if (this._cacheValid && this._cachedTotalAmount !== null) {
            return this._cachedTotalAmount;
        }

        // Calculate and cache
        let total = 0;
        for (let i = 0; i < this.cells.length; i++) {
            total += this.cells[i].amount;
        }
        this._cachedTotalAmount = total;
        this._cacheValid = true;
        return total;
    }

    /**
     * Invalidate the cached total amount (call after changes)
     */
    invalidateCache() {
        this._cacheValid = false;
    }

    /**
     * Check if field is depleted
     */
    isDepleted() {
        return this.getTotalAmount() < 10;
    }

    /**
     * Get effective regeneration rate (boosted by core)
     */
    getRegenRate() {
        if (this.coreHealth > 0) {
            const coreEfficiency = this.coreHealth / this.coreMaxHealth;
            return this.baseRegenRate * (1 + (this.coreRegenBoost - 1) * coreEfficiency);
        }
        return this.baseRegenRate;
    }

    /**
     * Update field (regeneration)
     */
    update(deltaTime) {
        // Update core pulse animation
        this.corePulse += deltaTime * 2;
        this.shimmerPhase += deltaTime * 0.5;

        // Slowly regenerate core if damaged
        if (this.coreHealth < this.coreMaxHealth && this.coreHealth > 0) {
            this.coreHealth += deltaTime * 0.5;
            this.coreHealth = Math.min(this.coreHealth, this.coreMaxHealth);
        }

        // Start regenerating after delay (or immediately if core is alive)
        const regenDelayActual = this.coreHealth > 0 ? this.regenDelay * 0.3 : this.regenDelay;
        if (!this.isRegenerating && millis() - this.lastHarvestTime > regenDelayActual) {
            this.isRegenerating = true;
        }

        // Regenerate cells - prioritize cells near core
        if (this.isRegenerating) {
            let anyBelowMax = false;
            let anyChanged = false;
            const regenRate = this.getRegenRate();

            for (const cell of this.cells) {
                if (cell.amount < cell.maxAmount) {
                    // Cells closer to core regenerate faster
                    const coreProximityBonus = this.coreHealth > 0 ?
                        Math.max(0.5, 1 - (cell.distFromCore / this.radius) * 0.7) : 0.5;

                    cell.amount += regenRate * deltaTime * coreProximityBonus;
                    cell.amount = Math.min(cell.amount, cell.maxAmount);
                    anyBelowMax = true;
                    anyChanged = true;
                }
            }

            // Invalidate cache if any cells changed
            if (anyChanged) {
                this.invalidateCache();
            }

            // Stop regenerating when full
            if (!anyBelowMax) {
                this.isRegenerating = false;
            }
        }

        // Update ambient particles
        this.updateAmbientParticles(deltaTime);
    }

    /**
     * Update floating ambient particles
     */
    updateAmbientParticles(deltaTime) {
        // Spawn new particles occasionally
        if (this.coreHealth > 0 && Math.random() < 0.1 * deltaTime) {
            const angle = Math.random() * TWO_PI;
            const dist = Math.random() * this.radius * 0.8;
            this.ambientParticles.push({
                x: Math.cos(angle) * dist,
                y: Math.sin(angle) * dist,
                vx: (Math.random() - 0.5) * 10,
                vy: -10 - Math.random() * 20,
                life: 1.0,
                size: 2 + Math.random() * 3
            });
        }

        // Update existing particles
        for (let i = this.ambientParticles.length - 1; i >= 0; i--) {
            const p = this.ambientParticles[i];
            p.x += p.vx * deltaTime;
            p.y += p.vy * deltaTime;
            p.life -= deltaTime * 0.5;

            if (p.life <= 0) {
                this.ambientParticles.splice(i, 1);
            }
        }

        // Limit particle count
        while (this.ambientParticles.length > 20) {
            this.ambientParticles.shift();
        }
    }

    /**
     * Draw the tiberium field
     */
    draw() {
        push();
        translate(this.x, this.y);

        const totalAmount = this.getTotalAmount();
        const intensity = totalAmount / this.maxCapacity;
        const isBlue = this.type === 'blue';

        // ===== GROUND EFFECTS =====
        // Outer glow ring
        if (intensity > 0.1) {
            noFill();
            for (let i = 3; i >= 0; i--) {
                const alpha = (20 + i * 10) * intensity;
                if (isBlue) {
                    stroke(0, 100, 255, alpha);
                } else {
                    stroke(0, 200, 80, alpha);
                }
                strokeWeight(3 + i * 2);
                ellipse(0, 0, this.radius * 2 - i * 10, this.radius * 2 - i * 10);
            }
        }

        // Ground texture - darker earth with tiberium veins
        noStroke();
        fill(isBlue ? color(20, 30, 40, 150) : color(25, 35, 20, 150));
        ellipse(0, 0, this.radius * 2, this.radius * 2);

        // Vein pattern
        stroke(isBlue ? color(40, 80, 120, 100) : color(40, 80, 40, 100));
        strokeWeight(2);
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * TWO_PI + this.shimmerPhase * 0.1;
            const len = this.radius * (0.5 + 0.3 * Math.sin(this.shimmerPhase + i));
            line(0, 0, Math.cos(angle) * len, Math.sin(angle) * len);
        }

        // ===== CRYSTALS =====
        for (const crystal of this.crystals) {
            const localCell = this.cells.find(c =>
                Math.hypot(c.x - this.x - crystal.x, c.y - this.y - crystal.y) < 40
            );

            if (!localCell || localCell.amount < 5) continue;

            const scale = Math.min(1, localCell.amount / localCell.maxAmount);
            const shimmer = 0.8 + 0.2 * Math.sin(this.shimmerPhase * 3 + crystal.shimmerOffset);

            push();
            translate(crystal.x, crystal.y);
            rotate(crystal.rotation);

            const h = crystal.height * scale;
            const w = crystal.width * scale;

            // Crystal shadow
            noStroke();
            fill(0, 0, 0, 40);
            ellipse(w * 0.5, h * 0.4, w * 2, w);

            // Crystal body with gradient effect
            if (isBlue) {
                // Blue crystal - icy appearance
                fill(60 * shimmer, 120 * shimmer, 220 * shimmer, 220);
                stroke(120, 180, 255, 200);
            } else {
                // Green crystal - toxic glow
                fill(50 * shimmer, 180 * shimmer, 60 * shimmer, 220);
                stroke(100, 255, 120, 200);
            }
            strokeWeight(1);

            // Main crystal shape - more complex geometry
            beginShape();
            vertex(0, -h);              // Top point
            vertex(w * 0.7, -h * 0.6);  // Upper right
            vertex(w, -h * 0.1);        // Mid right
            vertex(w * 0.8, h * 0.3);   // Lower right
            vertex(0, h * 0.5);         // Bottom
            vertex(-w * 0.8, h * 0.3);  // Lower left
            vertex(-w, -h * 0.1);       // Mid left
            vertex(-w * 0.7, -h * 0.6); // Upper left
            endShape(CLOSE);

            // Inner glow
            noStroke();
            if (isBlue) {
                fill(150, 200, 255, 80 * shimmer);
            } else {
                fill(150, 255, 150, 80 * shimmer);
            }
            beginShape();
            vertex(0, -h * 0.8);
            vertex(w * 0.4, -h * 0.3);
            vertex(0, h * 0.2);
            vertex(-w * 0.4, -h * 0.3);
            endShape(CLOSE);

            // Highlight reflection
            fill(255, 255, 255, 120 * shimmer);
            triangle(
                -w * 0.3, -h * 0.7,
                w * 0.2, -h * 0.5,
                -w * 0.1, -h * 0.4
            );

            pop();
        }

        // ===== REGROWTH CORE =====
        if (this.coreHealth > 0) {
            this.drawRegrowthCore(intensity);
        }

        // ===== AMBIENT PARTICLES =====
        for (const p of this.ambientParticles) {
            noStroke();
            if (isBlue) {
                fill(100, 180, 255, p.life * 150);
            } else {
                fill(100, 255, 120, p.life * 150);
            }
            ellipse(p.x, p.y, p.size * p.life, p.size * p.life);
        }

        pop();
    }

    /**
     * Draw the regrowth core at field center
     */
    drawRegrowthCore(fieldIntensity) {
        const pulse = Math.sin(this.corePulse) * 0.15 + 1;
        const coreIntensity = (this.coreHealth / this.coreMaxHealth) * fieldIntensity;
        const isBlue = this.type === 'blue';

        push();

        // Core outer glow
        noStroke();
        for (let i = 4; i >= 0; i--) {
            const glowSize = this.coreRadius * (1.5 + i * 0.3) * pulse;
            const alpha = (40 - i * 8) * coreIntensity;
            if (isBlue) {
                fill(80, 150, 255, alpha);
            } else {
                fill(80, 255, 100, alpha);
            }
            ellipse(0, 0, glowSize, glowSize);
        }

        // Core base - rocky structure
        fill(50, 50, 45);
        stroke(30, 30, 25);
        strokeWeight(2);
        beginShape();
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * TWO_PI;
            const r = this.coreRadius * (0.7 + 0.15 * Math.sin(angle * 3 + this.corePulse * 0.5));
            vertex(Math.cos(angle) * r, Math.sin(angle) * r);
        }
        endShape(CLOSE);

        // Core crystal cluster
        for (let i = 0; i < 5; i++) {
            const angle = (i / 5) * TWO_PI + this.corePulse * 0.2;
            const dist = 5 + i * 2;
            const size = 8 - i;

            push();
            translate(Math.cos(angle) * dist, Math.sin(angle) * dist);
            rotate(angle + HALF_PI);

            if (isBlue) {
                fill(100, 180, 255, 200);
                stroke(180, 220, 255);
            } else {
                fill(80, 220, 100, 200);
                stroke(150, 255, 180);
            }
            strokeWeight(1);

            // Mini crystal
            beginShape();
            vertex(0, -size * pulse);
            vertex(size * 0.4, 0);
            vertex(0, size * 0.3);
            vertex(-size * 0.4, 0);
            endShape(CLOSE);
            pop();
        }

        // Central energy orb
        noStroke();
        const orbSize = 6 * pulse;
        if (isBlue) {
            fill(180, 220, 255, 200 * coreIntensity);
        } else {
            fill(180, 255, 200, 200 * coreIntensity);
        }
        ellipse(0, 0, orbSize, orbSize);

        // Energy orb highlight
        fill(255, 255, 255, 150 * coreIntensity);
        ellipse(-1, -1, orbSize * 0.4, orbSize * 0.4);

        // Regeneration indicator ring (when regenerating)
        if (this.isRegenerating) {
            noFill();
            if (isBlue) {
                stroke(100, 200, 255, 150);
            } else {
                stroke(100, 255, 150, 150);
            }
            strokeWeight(2);
            const arcProgress = (millis() % 2000) / 2000 * TWO_PI;
            arc(0, 0, this.coreRadius * 2.5, this.coreRadius * 2.5, arcProgress, arcProgress + PI);
        }

        pop();
    }

    /**
     * Cleanup method - call when field is destroyed
     */
    destroy() {
        this.cells = [];
        this.crystals = [];
        this.ambientParticles = [];
        this._cachedTotalAmount = null;
        this._cacheValid = false;
    }
}

// Make available globally
if (typeof window !== 'undefined') {
    window.ResourceManager = ResourceManager;
    window.TiberiumField = TiberiumField;
}
