class Tower {
    constructor(row, col, type) {
        this.row = row;
        this.col = col;
        this.type = type; // "Gunner", "Ranger", "Sniper", "Pyromancer", "Druid"
        this.range = 3;
        this.damage = 10;
        this.fireRate = 60;
        this.cooldown = 0;
        this.color = color(200);

        // Merge System (replaces XP)
        this.mergeRank = 1; // 1-7 (Circle → Septagon)
        this.maxMergeRank = 7;
        this.baseCost = 50;
        this.sellValue = 25;
        this.angle = 0;

        // Drag-and-drop state
        this.isDragging = false;
        this.dragOffsetX = 0;
        this.dragOffsetY = 0;
        this.originalRow = row;
        this.originalCol = col;

        // Store base stats for merge calculations
        this.baseDamage = this.damage;
        this.baseFireRate = this.fireRate;
        this.baseRange = this.range;

        // Targeting optimization
        this.retargetCooldown = 0;
    }

    // Merge with another tower (called when dropping on valid target)
    mergeWith(otherTower) {
        if (this.mergeRank >= this.maxMergeRank) {
            console.log("Already at max merge rank!");
            return false;
        }

        if (this.type !== otherTower.type) {
            console.log("Can only merge towers of the same type!");
            return false;
        }

        if (this.mergeRank !== otherTower.mergeRank) {
            console.log("Can only merge towers of the same rank!");
            return false;
        }

        // Increase merge rank
        this.mergeRank++;

        // Calculate new stats based on merge rank
        // Much more powerful scaling: rank multiplier × exponential growth

        // Damage: rank × 1.5^(rank-1) - exponential + linear boost
        // Rank 1: 1x, Rank 2: 3x, Rank 3: 6.75x, Rank 4: 13.5x, Rank 5: 25.3x, Rank 6: 45.5x, Rank 7: 79.7x
        this.damage = Math.floor(this.baseDamage * this.mergeRank * Math.pow(1.5, this.mergeRank - 1));

        // Fire Rate: 0.85^(rank-1) - faster per rank
        this.fireRate = Math.max(5, Math.floor(this.baseFireRate * Math.pow(0.85, this.mergeRank - 1)));

        // Range: Multiplicative scaling with rank
        // Rank 1: 1x, Rank 2: 1.3x, Rank 3: 1.6x, Rank 4: 1.9x, Rank 5: 2.2x, Rank 6: 2.5x, Rank 7: 2.8x
        this.range = this.baseRange * (1 + (this.mergeRank - 1) * 0.3);

        // Sell value: rank × 2^(rank-1) × 0.75 (exponential with rank bonus)
        this.sellValue = Math.floor(this.baseCost * this.mergeRank * Math.pow(2, this.mergeRank - 1) * 0.75);

        // Play merge sound
        if (window.Sounds) window.Sounds.play('upgrade');

        // Visual feedback - MORE particles for higher ranks
        if (Game.instance) {
            let x = this.col * 64 + 32;
            let y = this.row * 64 + 32;
            let particleCount = 10 + (this.mergeRank * 5);
            Game.instance.spawnParticles(x, y, particleCount, this.getMergeColor());
        }

        console.log(`${this.type} merged to rank ${this.mergeRank}!`);
        return true;
    }

    // Get color based on merge rank
    getMergeColor() {
        const colors = [
            color(255, 255, 255),   // Rank 1: White
            color(100, 200, 255),   // Rank 2: Blue
            color(150, 100, 255),   // Rank 3: Purple
            color(255, 100, 255),   // Rank 4: Magenta
            color(255, 150, 50),    // Rank 5: Orange
            color(255, 215, 0),     // Rank 6: Gold
            color(0, 255, 200)      // Rank 7: Cyan
        ];
        return colors[this.mergeRank - 1] || colors[0];
    }

    // Get shape name for current merge rank
    getShapeName() {
        const shapes = ['Circle', 'Square', 'Triangle', 'Diamond', 'Pentagon', 'Hexagon', 'Septagon'];
        return shapes[this.mergeRank - 1] || 'Circle';
    }

    update(enemies) {
        if (this.cooldown > 0) this.cooldown--;
        if (this.retargetCooldown > 0) this.retargetCooldown--;

        // Retargeting logic with throttling for performance
        if (!this.target || !this.target.active || this.target.state === 'DYING') {
            // Immediate retarget if target is invalid
            this.target = this.findTarget(enemies);
            this.retargetCooldown = 10; // Reset cooldown
        } else if (this.getDistance(this.target) > this.getModifiedRange() * 64) {
            // Target out of range - throttle retargeting
            if (this.retargetCooldown <= 0) {
                this.target = this.findTarget(enemies);
                this.retargetCooldown = 10; // Only retarget every 10 frames when out of range
            }
        }

        if (this.target) {
            let myX = this.col * 64 + 32;
            let myY = this.row * 64 + 32;
            this.angle = Math.atan2(this.target.y - myY, this.target.x - myX);

            if (this.cooldown <= 0) {
                this.shoot();
                this.cooldown = this.fireRate;
            }
        }
    }

    findTarget(enemies) {
        let bestTarget = null;
        let bestProgress = -1;
        let pxRange = this.getModifiedRange() * 64;

        for (let e of enemies) {
            if (!e.active || e.state === 'SPAWNING' || e.state === 'DYING') continue;

            // Check if enemy is in range
            let dist = this.getDistance(e);
            if (dist > pxRange) continue;

            // Check line of sight (cliffs block projectiles)
            if (Game.instance && Game.instance.grid) {
                let myX = this.col * 64 + 32;
                let myY = this.row * 64 + 32;
                if (!Game.instance.grid.hasLineOfSight(myX, myY, e.x, e.y)) {
                    continue; // Cliff blocks line of sight, skip this enemy
                }
            }

            // Calculate enemy progress along path
            // Higher pathIndex = further along path = higher priority
            let progress = e.pathIndex;

            // Add fractional progress based on position within current segment
            if (e.path && e.pathIndex < e.path.length - 1) {
                let currentNode = e.path[e.pathIndex];
                let nextNode = e.path[e.pathIndex + 1];

                let currentX = currentNode.c * 64 + 32;
                let currentY = currentNode.r * 64 + 32;
                let nextX = nextNode.c * 64 + 32;
                let nextY = nextNode.r * 64 + 32;

                let segmentLength = Math.sqrt((nextX - currentX) ** 2 + (nextY - currentY) ** 2);
                let distToNext = Math.sqrt((nextX - e.x) ** 2 + (nextY - e.y) ** 2);

                // Add 0-1 fraction for progress within segment
                if (segmentLength > 0) {
                    progress += (segmentLength - distToNext) / segmentLength;
                }
            }

            // Select enemy with most progress (furthest along path)
            if (progress > bestProgress) {
                bestProgress = progress;
                bestTarget = e;
            }
        }
        return bestTarget;
    }

    getDistance(e) {
        let myCenter = { x: this.col * 64 + 32, y: this.row * 64 + 32 };
        let dx = e.x - myCenter.x;
        let dy = e.y - myCenter.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    /**
     * Get tower range with terrain modifier applied
     * @returns {number} Modified range value in grid cells
     */
    getModifiedRange() {
        // Get terrain type at tower location
        if (!Game.instance || !Game.instance.grid) {
            return this.range; // No terrain system, use base range
        }

        let terrainType = Game.instance.grid.getTerrainType(this.row, this.col);

        // Get terrain properties
        if (typeof TERRAIN_PROPERTIES === 'undefined') {
            return this.range; // No terrain system, use base range
        }

        let terrainProps = TERRAIN_PROPERTIES[terrainType];
        if (!terrainProps) {
            return this.range; // Unknown terrain, use base range
        }

        // Apply range modifier
        return this.range * terrainProps.towerRangeModifier;
    }

    shoot() {
        if (Game.instance) {
            let myX = this.col * 64 + 32;
            let myY = this.row * 64 + 32;

            // Apply network bonus from BufferTower if present
            let effectiveDamage = this.networkBonus ? this.damage * this.networkBonus : this.damage;

            Game.instance.addProjectile(new Projectile(myX, myY, this.target, effectiveDamage, this));

            // Audio
            // Audio
            if (this.shootSound && window.Sounds) window.Sounds.play(this.shootSound);
            else if (window.Sounds) window.Sounds.play('shoot');
        }
    }

    // New Character Drawing Helper
    drawCharacter(x, y, size, bodyColor, hatColor = null, weaponType = 'gun') {
        push();
        translate(x, y); // Center of tile

        // Draw merge rank shape FIRST (behind character)
        this.drawMergeShapeBackground(0, 0, size);

        // 1. Legs (Static stance)
        fill(50); // Dark grey pants
        noStroke();
        rect(-8, 10, 6, 12);
        rect(2, 10, 6, 12);

        // 2. Body
        fill(bodyColor);
        stroke(0);
        strokeWeight(1);
        rect(-10, -5, 20, 18, 4); // Torso

        // 3. Head
        fill(220, 180, 140); // Skin tone (Human)
        // Or Goblin? Green? "Like goblins" -> User said "Simplistic characters like goblins"
        // Let's go with Green skin Goblins as Defenders? Or Humans that look like Goblins?
        // "Change these towers to humanoid, simplistic characters like goblins."
        // I'll make them Goblin-esque (Green Skin)
        fill(100, 200, 100);
        ellipse(0, -12, 22, 20);

        // Eyes
        fill(255);
        ellipse(-4, -14, 6, 6);
        ellipse(4, -14, 6, 6);
        fill(0); // Pupils
        // Aiming direction for eyes?
        let eyeOffX = cos(this.angle) * 2;
        ellipse(-4 + eyeOffX, -14, 2, 2);
        ellipse(4 + eyeOffX, -14, 2, 2);

        // Hat / Helm
        if (hatColor) {
            fill(hatColor);
            arc(0, -18, 24, 20, PI, 0); // Beanie/Helmet style
        }

        // 4. Weapon (Rotates)
        push();
        translate(0, 0); // Pivot at shoulder roughly
        rotate(this.angle);
        fill(80);
        stroke(0);

        if (weaponType === 'gun') {
            rect(5, 2, 20, 6); // Barrel
            fill(139, 69, 19); // Wood stock
            rect(0, 2, 8, 8);
        } else if (weaponType === 'dual') {
            rect(5, -4, 15, 5); // Left
            rect(5, 6, 15, 5); // Right
        } else if (weaponType === 'sniper') {
            fill(40);
            rect(5, 0, 35, 5); // Long barrel
            fill(0, 255, 0);
            rect(10, -3, 8, 3); // Scope
        } else if (weaponType === 'staff') {
            fill(100, 50, 0);
            rect(10, -15, 4, 30); // Staff vertical held?
            // Actually, staffs point at enemy usually in games
            rect(10, -2, 20, 4);
            fill(255, 50, 0);
            ellipse(30, 0, 10, 10); // Orb
        } else if (weaponType === 'orb') {
            fill(0, 255, 255);
            ellipse(20, 0, 12, 12); // Floating Orb
        }

        pop();

        pop();
    }

    // Draw merge rank shape BACKGROUND (filled, behind character)
    drawMergeShapeBackground(x, y, size) {
        // Make shape fill the entire tile (100% of tile size)
        let shapeSize = size;

        // Get color based on merge rank with transparency
        let shapeColor = this.getMergeColor();

        // All shapes use Reuleaux polygon construction
        // Number of sides increases with rank
        let sides = this.mergeRank + 2; // Rank 1 = 3 sides (triangle), Rank 7 = 9 sides

        push();
        translate(x, y);

        // Rotate to point upward for odd-sided polygons
        if (sides % 2 === 1) {
            rotate(-PI / 2);
        }

        // Set fill and stroke before drawing
        fill(red(shapeColor), green(shapeColor), blue(shapeColor), 120); // Semi-transparent fill
        stroke(red(shapeColor), green(shapeColor), blue(shapeColor), 200);
        strokeWeight(2);

        // Special case: Rank 1 is just a circle
        if (this.mergeRank === 1) {
            ellipse(0, 0, shapeSize, shapeSize);
        } else {
            this.drawReuleauxPolygon(0, 0, shapeSize, sides);
        }

        pop();
    }

    // Helper: Draw Reuleaux Polygon (proper mathematical implementation)
    drawReuleauxPolygon(centerX, centerY, size, numberOfSides) {
        if (numberOfSides < 3) return;

        let radius = size / 2; // Full tile size

        // Calculate Reuleaux radius using proper formula
        let reuleauxRadius = radius * Math.sqrt(2 + 2 * Math.cos(Math.PI / numberOfSides));

        // Use p5's underlying canvas context for arcTo
        let ctx = drawingContext;

        ctx.beginPath();

        // Start at first vertex
        let angle1 = 0;
        let p1x = centerX + radius * Math.cos(angle1);
        let p1y = centerY + radius * Math.sin(angle1);
        ctx.moveTo(p1x, p1y);

        // Draw arcs between vertices
        for (let i = 0; i < numberOfSides; i++) {
            // Point 1 = arc start (current vertex)
            // Point 2 = tangent intersection (midpoint between vertices)
            // Point 3 = arc end (next vertex)
            let index2 = (i + 0.5) % numberOfSides;
            let index3 = (i + 1) % numberOfSides;

            let angle1 = i * TWO_PI / numberOfSides;
            let angle2 = index2 * TWO_PI / numberOfSides;
            let angle3 = index3 * TWO_PI / numberOfSides;

            let p1x = centerX + radius * Math.cos(angle1);
            let p1y = centerY + radius * Math.sin(angle1);
            let p2x = centerX + radius * Math.cos(angle2);
            let p2y = centerY + radius * Math.sin(angle2);
            let p3x = centerX + radius * Math.cos(angle3);
            let p3y = centerY + radius * Math.sin(angle3);

            // Use arcTo to create smooth Reuleaux arc
            ctx.arcTo(p2x, p2y, p3x, p3y, reuleauxRadius);
        }

        ctx.closePath();
        ctx.fill();
        ctx.stroke();
    }


    draw(x, y, size) {
        // Default impl
        this.drawCharacter(x + size / 2, y + size / 2, size, this.color);
    }
}

// Tower Balance System:
// Base DPS = Cost * 0.5 (at meta score 1.0)
// Meta Score: 1.0 = balanced, <1.0 = underpowered, >1.0 = meta/strong
// DPS = damage * (60 / fireRate)

class CannonTower extends Tower {
    constructor(row, col) {
        super(row, col, "Gunner");
        // Reliable single-target DPS
        // DPS = 25 * (60/40) = 37.5
        this.range = 3;
        this.damage = 25;
        this.fireRate = 40;     // Balanced single-target
        this.color = color(100, 120, 100);
        this.baseCost = 0;      // No cost
        this.sellValue = 0;
    }

    draw(x, y, size) {
        this.drawCharacter(x + size / 2, y + size / 2, size, this.color, color(50, 70, 50), 'gun');
    }
}

class DoubleCannon extends Tower {
    constructor(row, col) {
        super(row, col, "Ranger");
        // BUFFED: Fast DPS machine
        // DPS = 26 * (60/18) = 86.7 (powerful rapid fire)
        this.range = 3.5;
        this.damage = 26;       // BUFFED from 18
        this.fireRate = 18;     // BUFFED from 20 (faster)
        this.color = color(50, 80, 150);
        this.baseCost = 0;      // No cost
        this.sellValue = 0;
    }

    draw(x, y, size) {
        this.drawCharacter(x + size / 2, y + size / 2, size, this.color, color(30, 50, 100), 'dual');
    }
}

class Flamethrower extends Tower {
    constructor(row, col) {
        super(row, col, "Pyro");
        // BUFFED: Burn igniter with extended range
        // DPS = 8 * (60/3) = 160 base + burn DoT
        this.range = 3.0;       // BUFFED from 2.0 (same as Cannon)
        this.damage = 8;        // BUFFED from 4
        this.fireRate = 3;      // Continuous flame stream
        this.color = color(180, 50, 50);
        this.baseCost = 0;      // No cost
        this.sellValue = 0;
    }

    draw(x, y, size) {
        this.drawCharacter(x + size / 2, y + size / 2, size, this.color, color(100, 20, 20), 'staff');
    }

    shoot() {
        if (!this.target || !this.target.active) return;

        // Apply network bonus from BufferTower if present
        let effectiveDamage = this.networkBonus ? this.damage * this.networkBonus : this.damage;
        this.target.takeDamage(effectiveDamage, this);

        // IGNITE ENEMY - Apply burn status effect
        if (this.target.ignite) {
            this.target.ignite(TOWER_CONSTANTS.BURN_DURATION, TOWER_CONSTANTS.BURN_DAMAGE_PER_TICK);
        }

        if (Game.instance) {
            let myX = this.col * 64 + 32;
            let myY = this.row * 64 + 32;

            // Calculate angle TO the target
            let dx = this.target.x - myX;
            let dy = this.target.y - myY;
            let angleToTarget = Math.atan2(dy, dx);
            let distToTarget = Math.sqrt(dx * dx + dy * dy);

            // Create realistic flame stream - particles along the path to target
            let particleCount = TOWER_CONSTANTS.FLAME_PARTICLE_COUNT;
            for (let i = 0; i < particleCount; i++) {
                // Spread particles along the flame stream
                let distRatio = (i / particleCount) * 0.8; // 80% of distance
                let spreadAngle = angleToTarget + random(-0.2, 0.2); // Cone spread
                let particleDist = distToTarget * distRatio + random(-10, 10);

                let particleX = myX + Math.cos(spreadAngle) * particleDist;
                let particleY = myY + Math.sin(spreadAngle) * particleDist;

                // Varied flame colors (red, orange, yellow)
                let flameColor = random() < 0.3
                    ? color(255, 255, random(100, 200))  // Yellow
                    : color(255, random(50, 150), random(0, 50)); // Red-orange

                Game.instance.spawnParticles(particleX, particleY, 1, flameColor);
            }
        }
    }
}

class Electrifier extends Tower {
    constructor(row, col) {
        super(row, col, "Storm");
        // BUFFED: Premium lightning striker with better chains
        // DPS = 20 * (60/25) = 48 base, 3 chains at 70% = ~120 effective
        this.range = 3.0;
        this.damage = 20;       // BUFFED from 12
        this.fireRate = 25;     // Fast zapping
        this.color = color(20, 20, 80);
        this.baseCost = 0;      // No cost
        this.sellValue = 0;
        this.chains = [];
        this.laserFrames = 0;
    }

    shoot() {
        if (!this.target || !this.target.active) return;

        // Apply network bonus from BufferTower if present
        let effectiveDamage = this.networkBonus ? this.damage * this.networkBonus : this.damage;

        this.chains = [];
        let visited = new Set();
        let queue = [{ enemy: this.target, depth: 0 }];
        visited.add(this.target);

        let tCol = this.col * 64 + 32;
        let tRow = this.row * 64 + 32;
        this.chains.push({ x1: tCol, y1: tRow, x2: this.target.x, y2: this.target.y });
        this.target.takeDamage(effectiveDamage, this);

        while (queue.length > 0) {
            let current = queue.shift();
            if (current.depth >= TOWER_CONSTANTS.LIGHTNING_MAX_CHAINS) continue; // Max 3 chains (BUFFED)

            // Safety check for Game instance
            if (!Game.instance || !Game.instance.enemies) break;

            let neighbors = Game.instance.enemies.filter(e =>
                e !== current.enemy &&
                e.active &&
                !visited.has(e) &&
                dist(e.x, e.y, current.enemy.x, current.enemy.y) < TOWER_CONSTANTS.LIGHTNING_CHAIN_RANGE
            );

            for (let n of neighbors) {
                visited.add(n);
                n.takeDamage(effectiveDamage * TOWER_CONSTANTS.LIGHTNING_CHAIN_DAMAGE_MULT, this); // 70% chain damage (BUFFED)
                this.chains.push({ x1: current.enemy.x, y1: current.enemy.y, x2: n.x, y2: n.y });
                queue.push({ enemy: n, depth: current.depth + 1 });
                if (queue.length > 5) break;
            }
        }

        this.laserFrames = 10;
        if (typeof Sounds !== 'undefined') Sounds.play('shoot');
    }

    draw(x, y, size) {
        // Draw Char
        this.drawCharacter(x + size / 2, y + size / 2, size, this.color, color(0, 255, 255), 'orb');

        // Lightning visual overlay
        if (this.laserFrames > 0) {
            this.laserFrames--;
            push();
            let alpha = map(this.laserFrames, 0, 10, 0, 255);
            stroke(0, 255, 255, alpha);
            strokeWeight(2);
            noFill();
            drawingContext.shadowBlur = 10;
            drawingContext.shadowColor = 'cyan';
            for (let c of this.chains) {
                this.drawJaggedLine(c.x1, c.y1, c.x2, c.y2);
            }
            pop();
        }
    }

    drawJaggedLine(x1, y1, x2, y2) {
        let dist = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
        let steps = dist / 10;
        beginShape();
        vertex(x1, y1);
        for (let i = 1; i < steps; i++) {
            let t = i / steps;
            let tx = lerp(x1, x2, t);
            let ty = lerp(y1, y2, t);
            let jitter = 5;
            vertex(tx + random(-jitter, jitter), ty + random(-jitter, jitter));
        }
        vertex(x2, y2);
        endShape();
    }
}

class SniperTower extends Tower {
    constructor(row, col) {
        super(row, col, "Sniper");
        // Long-range precision striker
        // DPS = 100 * (60/90) = 66.7 (lower DPS but huge range)
        this.range = 6;         // Longest range
        this.damage = 100;
        this.fireRate = 90;     // Slow but powerful
        this.color = color(60, 50, 30);
        this.baseCost = 0;      // No cost
        this.sellValue = 0;
        this.laserFrames = 0;
        this.lastTarget = null;
    }

    shoot() {
        if (!this.target || !this.target.active) return;

        // Apply network bonus from BufferTower if present
        let effectiveDamage = this.networkBonus ? this.damage * this.networkBonus : this.damage;
        this.target.takeDamage(effectiveDamage, this);

        if (typeof Sounds !== 'undefined') {
            Sounds.play('shoot');
        }

        if (Game.instance) {
            Game.instance.spawnParticles(this.target.x, this.target.y, 8, color(255, 50, 50));
        }

        this.laserFrames = 10;
        this.lastTarget = { x: this.target.x, y: this.target.y };
    }

    draw(x, y, size) {
        // Character
        this.drawCharacter(x + size / 2, y + size / 2, size, this.color, color(40, 60, 40), 'sniper');

        // Tracer Line
        if (this.laserFrames > 0 && this.lastTarget) {
            this.laserFrames--;
            push();
            stroke(255, 255, 0, map(this.laserFrames, 0, 10, 0, 255));
            strokeWeight(2);
            let cx = x + size / 2;
            let cy = y + size / 2;
            let bx = cx + cos(this.angle) * 20;
            let by = cy + sin(this.angle) * 20;
            line(bx, by, this.lastTarget.x, this.lastTarget.y);
            pop();
        }
    }
}

// ===========================================
// BUFFER TOWER - Buffs adjacent towers in a network
// ===========================================
class BufferTower extends Tower {
    constructor(row, col) {
        super(row, col, "Buffer");
        // BUFFED: Weak attack + 10% buff per tower
        this.range = 1.5;       // BUFFED from 0 (can now attack)
        this.damage = 5;        // BUFFED from 0 (weak attack)
        this.fireRate = 60;     // BUFFED from 999 (slow but attacks)
        this.color = color(255, 215, 0);  // Gold
        this.baseCost = 0;      // No cost
        this.sellValue = 0;
        this.networkSize = 0;
        this.buffedTowers = [];
    }

    // Buffer now attacks like normal towers + provides buffs
    update(enemies) {
        super.update(enemies);  // Use normal tower update (finds targets, shoots)
        // Network is calculated on-demand by TowerManager
    }

    // Find all connected towers (orthogonally adjacent)
    calculateNetwork() {
        if (!Game.instance || !Game.instance.grid) return;

        let grid = Game.instance.grid;
        let visited = new Set();
        let towers = [];
        let queue = [{ r: this.row, c: this.col }];

        while (queue.length > 0) {
            let pos = queue.shift();
            let key = `${pos.r},${pos.c}`;

            if (visited.has(key)) continue;
            visited.add(key);

            let cell = grid.map[pos.r]?.[pos.c];
            if (cell instanceof Tower) {
                towers.push(cell);

                // Check orthogonal neighbors
                let neighbors = [
                    { r: pos.r - 1, c: pos.c },
                    { r: pos.r + 1, c: pos.c },
                    { r: pos.r, c: pos.c - 1 },
                    { r: pos.r, c: pos.c + 1 }
                ];

                for (let n of neighbors) {
                    if (n.r >= 0 && n.r < grid.rows && n.c >= 0 && n.c < grid.cols) {
                        queue.push(n);
                    }
                }
            }
        }

        this.networkSize = towers.length;
        this.buffedTowers = towers.filter(t => t !== this);

        // Apply buffs based on network size
        // Each tower in network gets: +10% damage per connected tower (BUFFED from 5%)
        let bonusMultiplier = 1 + (this.networkSize * TOWER_CONSTANTS.BUFFER_DAMAGE_BONUS_PER_TOWER);

        for (let tower of this.buffedTowers) {
            tower.networkBonus = bonusMultiplier;
        }
    }

    draw(x, y, size) {
        let cx = x + size / 2;
        let cy = y + size / 2;

        push();
        translate(cx, cy); // Center for merge shape

        // Draw merge rank shape FIRST (behind tower)
        this.drawMergeShapeBackground(0, 0, size);

        // Pulsing network indicator
        let pulse = sin(frameCount * 0.1) * 0.2 + 0.8;

        // Base platform
        fill(60, 50, 20);
        noStroke();
        ellipse(0, 15, 50, 20);

        // Crystal/beacon
        fill(255 * pulse, 215 * pulse, 0);
        stroke(200, 150, 0);
        strokeWeight(2);

        // Diamond shape
        beginShape();
        vertex(0, -20);
        vertex(12, 0);
        vertex(0, 15);
        vertex(-12, 0);
        endShape(CLOSE);

        // Inner glow
        noStroke();
        fill(255, 255, 200, 150 * pulse);
        beginShape();
        vertex(0, -10);
        vertex(6, 0);
        vertex(0, 8);
        vertex(-6, 0);
        endShape(CLOSE);

        // Network size indicator
        fill(255);
        textAlign(CENTER, CENTER);
        textSize(10);
        text(`x${this.networkSize}`, 0, 30);

        pop(); // End tower drawing transform

        // Draw OPTIMIZED connection lines to buffed towers (in absolute space)
        // Only draw direct connections (orthogonal neighbors), not the full network
        if (this.buffedTowers.length > 0) {
            push();
            let pulseAlpha = 120 + sin(frameCount * 0.05) * 40;

            // Single stroke setup for all lines
            stroke(255, 215, 0, pulseAlpha);
            strokeWeight(3);

            for (let tower of this.buffedTowers) {
                // Only draw lines to directly adjacent towers (not full network)
                let rowDiff = Math.abs(tower.row - this.row);
                let colDiff = Math.abs(tower.col - this.col);
                if (rowDiff + colDiff !== 1) continue; // Skip non-adjacent

                let tx = tower.col * 64 + 32;
                let ty = tower.row * 64 + 32;

                // Single line per connection
                line(cx, cy, tx, ty);

                // Single flowing particle (throttled to every 2nd frame)
                if (frameCount % 2 === 0) {
                    let t = (frameCount * 0.03) % 1;
                    let px = lerp(cx, tx, t);
                    let py = lerp(cy, ty, t);

                    noStroke();
                    fill(255, 255, 200, 180);
                    ellipse(px, py, 5, 5);
                }
            }
            pop(); // End connection lines drawing
        }
    }
}

// ===========================================
// SWAP TOWER - Can swap positions with towers of same merge rank
// ===========================================
class SwapTower extends Tower {
    constructor(row, col) {
        super(row, col, "Swap");
        // Cost: 125 | Utility tower with swap mechanic
        // DPS = 20 * (60/35) = 34.3 (moderate damage, utility focus)
        this.range = 3.0;
        this.damage = 20;
        this.fireRate = 35;
        this.color = color(180, 80, 180);  // Purple/magenta
        this.baseCost = 125;
        this.sellValue = 62;

        // Swap mechanic properties
        this.canSwap = true;
        this.swapCooldown = 0;
        this.swapCooldownMax = 60; // 1 second cooldown after swap
    }

    update(enemies) {
        super.update(enemies);

        // Update swap cooldown
        if (this.swapCooldown > 0) {
            this.swapCooldown--;
        }
    }

    shoot() {
        if (!this.target || !this.target.active) return;

        // Apply network bonus from BufferTower if present
        let effectiveDamage = this.networkBonus ? this.damage * this.networkBonus : this.damage;

        if (Game.instance) {
            let myX = this.col * 64 + 32;
            let myY = this.row * 64 + 32;

            // Teleport-style projectile (instant, purple particle trail)
            Game.instance.addProjectile(new Projectile(myX, myY, this.target, effectiveDamage, this));

            // Purple particles on cast
            Game.instance.spawnParticles(myX, myY, 5, color(180, 80, 255, 200));
        }
    }

    draw(x, y, size) {
        // Draw character with swap visual indicator
        let cx = x + size / 2;
        let cy = y + size / 2;

        // Draw character
        this.drawCharacter(cx, cy, size, this.color, color(120, 40, 120), 'dual');

        // Draw swap icon overlay (rotating arrows)
        push();
        translate(cx, cy);

        // Pulsing glow if swap is ready
        if (this.swapCooldown === 0) {
            let pulse = sin(frameCount * 0.15) * 0.3 + 0.7;
            stroke(200, 100, 255, 150 * pulse);
            strokeWeight(2);
            noFill();
            ellipse(0, 0, size * 0.7);
        }

        // Rotating swap arrows
        rotate(frameCount * 0.05);
        stroke(255, 200, 255, 180);
        strokeWeight(2);
        noFill();

        // Two curved arrows forming a swap symbol
        for (let i = 0; i < 2; i++) {
            push();
            rotate(PI * i);
            arc(0, 0, size * 0.4, size * 0.4, -HALF_PI, HALF_PI);

            // Arrow head
            let arrowX = 0;
            let arrowY = size * 0.2;
            line(arrowX, arrowY, arrowX - 4, arrowY - 4);
            line(arrowX, arrowY, arrowX + 4, arrowY - 4);
            pop();
        }

        pop();
    }

    // Override merge to allow merging with same type only
    mergeWith(otherTower) {
        // Swap tower can only merge with other Swap towers for rank increase
        if (this.type !== otherTower.type) return false;

        // Use standard merge logic from parent class
        return super.mergeWith(otherTower);
    }

    // Check if this tower can swap with another tower
    canSwapWith(otherTower) {
        if (this.swapCooldown > 0) return false;
        if (!otherTower || !(otherTower instanceof Tower)) return false;

        // Can swap with any tower of the same merge rank
        return this.mergeRank === otherTower.mergeRank;
    }

    // Perform swap with another tower
    swapWith(otherTower) {
        if (!this.canSwapWith(otherTower)) return false;

        // Swap positions
        let tempRow = this.row;
        let tempCol = this.col;

        this.row = otherTower.row;
        this.col = otherTower.col;

        otherTower.row = tempRow;
        otherTower.col = tempCol;

        // Trigger cooldown
        this.swapCooldown = this.swapCooldownMax;

        // Visual feedback
        if (Game.instance) {
            let myX = this.col * 64 + 32;
            let myY = this.row * 64 + 32;
            let otherX = otherTower.col * 64 + 32;
            let otherY = otherTower.row * 64 + 32;

            Game.instance.spawnParticles(myX, myY, 10, color(200, 100, 255));
            Game.instance.spawnParticles(otherX, otherY, 10, color(200, 100, 255));
        }

        // Play sound
        if (window.Sounds) {
            window.Sounds.play('tower_place');
        }

        return true;
    }
}

