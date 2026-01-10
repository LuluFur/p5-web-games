class Pathfinder {
    // ========================================
    // RTS PATHFINDING EXTENSIONS
    // ========================================

    /**
     * Path cache for performance optimization
     * Key format: "startR,startC->endR,endC"
     * Value: { path: [...], timestamp: millis(), hits: number }
     */
    static pathCache = new Map();
    static CACHE_EXPIRY_MS = 5000; // Cache paths for 5 seconds
    static MAX_CACHE_SIZE = 100;

    /**
     * Find path from world coordinates to world coordinates
     * Converts pixel positions to grid cells and back
     *
     * @param {Grid} grid - The game grid
     * @param {number} startX - Start X in world pixels
     * @param {number} startY - Start Y in world pixels
     * @param {number} endX - End X in world pixels
     * @param {number} endY - End Y in world pixels
     * @param {object} options - Optional settings { useCache, avoidUnits }
     * @returns {Array} Path as array of { x, y } world positions
     */
    static findPathWorld(grid, startX, startY, endX, endY, options = {}) {
        const cellSize = grid.cellSize || RTS_GRID?.CELL_SIZE || 32;

        // Convert world coords to grid coords
        const startCell = this.worldToGrid(startX, startY, grid);
        const endCell = this.worldToGrid(endX, endY, grid);

        // Clamp to grid bounds
        startCell.r = Math.max(0, Math.min(grid.rows - 1, startCell.r));
        startCell.c = Math.max(0, Math.min(grid.cols - 1, startCell.c));
        endCell.r = Math.max(0, Math.min(grid.rows - 1, endCell.r));
        endCell.c = Math.max(0, Math.min(grid.cols - 1, endCell.c));

        // Check cache if enabled
        if (options.useCache !== false) {
            const cacheKey = `${startCell.r},${startCell.c}->${endCell.r},${endCell.c}`;
            const cached = this.getCachedPath(cacheKey);
            if (cached) return cached;
        }

        // Find path in grid coordinates
        const gridPath = this.findPath(grid, startCell, endCell, options.penaltyNodes);

        // Convert back to world coordinates
        const worldPath = gridPath.map(node =>
            this.gridToWorld(node.r, node.c, grid)
        );

        // Cache the result
        if (options.useCache !== false && worldPath.length > 0) {
            const cacheKey = `${startCell.r},${startCell.c}->${endCell.r},${endCell.c}`;
            this.cachePath(cacheKey, worldPath);
        }

        return worldPath;
    }

    /**
     * Convert world coordinates to grid cell
     * @param {number} x - World X
     * @param {number} y - World Y
     * @param {Grid} grid - The grid
     * @returns {object} { r, c } grid cell
     */
    static worldToGrid(x, y, grid) {
        const cellSize = grid.cellSize || RTS_GRID?.CELL_SIZE || 32;
        const offsetX = grid.offsetX || 0;
        const offsetY = grid.offsetY || 0;

        return {
            r: Math.floor((y - offsetY) / cellSize),
            c: Math.floor((x - offsetX) / cellSize)
        };
    }

    /**
     * Convert grid cell to world coordinates (center of cell)
     * @param {number} r - Row
     * @param {number} c - Column
     * @param {Grid} grid - The grid
     * @returns {object} { x, y } world position
     */
    static gridToWorld(r, c, grid) {
        const cellSize = grid.cellSize || RTS_GRID?.CELL_SIZE || 32;
        const offsetX = grid.offsetX || 0;
        const offsetY = grid.offsetY || 0;

        return {
            x: offsetX + c * cellSize + cellSize / 2,
            y: offsetY + r * cellSize + cellSize / 2
        };
    }

    /**
     * Get cached path if valid
     * @param {string} key - Cache key
     * @returns {Array|null} Cached path or null
     */
    static getCachedPath(key) {
        const cached = this.pathCache.get(key);
        if (!cached) return null;

        // Check if expired
        if (typeof millis === 'function' && millis() - cached.timestamp > this.CACHE_EXPIRY_MS) {
            this.pathCache.delete(key);
            return null;
        }

        cached.hits++;
        return [...cached.path]; // Return copy
    }

    /**
     * Cache a path
     * @param {string} key - Cache key
     * @param {Array} path - The path to cache
     */
    static cachePath(key, path) {
        // Enforce max cache size
        if (this.pathCache.size >= this.MAX_CACHE_SIZE) {
            // Remove oldest entries
            const toRemove = this.pathCache.size - this.MAX_CACHE_SIZE + 10;
            const keys = Array.from(this.pathCache.keys());
            for (let i = 0; i < toRemove; i++) {
                this.pathCache.delete(keys[i]);
            }
        }

        this.pathCache.set(key, {
            path: [...path],
            timestamp: typeof millis === 'function' ? millis() : Date.now(),
            hits: 0
        });
    }

    /**
     * Clear the path cache (call when grid changes)
     */
    static clearCache() {
        this.pathCache.clear();
    }

    /**
     * Find the nearest walkable cell to a target
     * Used when target cell is blocked
     *
     * @param {Grid} grid - The grid
     * @param {number} targetR - Target row
     * @param {number} targetC - Target column
     * @param {number} maxRadius - Max search radius (default 5)
     * @returns {object|null} { r, c } of nearest walkable cell or null
     */
    static findNearestWalkable(grid, targetR, targetC, maxRadius = 5) {
        // Spiral outward from target
        for (let radius = 1; radius <= maxRadius; radius++) {
            for (let dr = -radius; dr <= radius; dr++) {
                for (let dc = -radius; dc <= radius; dc++) {
                    // Only check perimeter of this radius
                    if (Math.abs(dr) !== radius && Math.abs(dc) !== radius) continue;

                    const r = targetR + dr;
                    const c = targetC + dc;

                    // Check bounds
                    if (r < 0 || r >= grid.rows || c < 0 || c >= grid.cols) continue;

                    // Check walkable
                    if (this.isWalkable(grid, r, c)) {
                        return { r, c };
                    }
                }
            }
        }

        return null;
    }

    /**
     * Check if a cell is walkable
     * @param {Grid} grid - The grid
     * @param {number} r - Row
     * @param {number} c - Column
     * @returns {boolean}
     */
    static isWalkable(grid, r, c) {
        // Check bounds
        if (r < 0 || r >= grid.rows || c < 0 || c >= grid.cols) {
            return false;
        }

        // Check if occupied by structure
        if (grid.map && grid.map[r][c] !== 0) {
            return false;
        }

        // Check terrain
        if (typeof grid.getTerrainType === 'function') {
            const terrain = grid.getTerrainType(r, c);
            if (typeof TERRAIN_TYPES !== 'undefined' && terrain === TERRAIN_TYPES.CLIFF) {
                return false;
            }
        }

        return true;
    }

    /**
     * Calculate path distance (for AI decisions)
     * @param {Array} path - The path
     * @returns {number} Total path distance
     */
    static getPathDistance(path) {
        if (!path || path.length < 2) return 0;

        let distance = 0;
        for (let i = 1; i < path.length; i++) {
            const dx = path[i].x - path[i - 1].x;
            const dy = path[i].y - path[i - 1].y;
            distance += Math.sqrt(dx * dx + dy * dy);
        }

        return distance;
    }

    /**
     * Smooth a path by removing unnecessary waypoints
     * Uses line-of-sight checks to skip intermediate nodes
     *
     * @param {Grid} grid - The grid
     * @param {Array} path - Original path
     * @returns {Array} Smoothed path
     */
    static smoothPath(grid, path) {
        if (!path || path.length <= 2) return path;

        const smoothed = [path[0]];
        let current = 0;

        while (current < path.length - 1) {
            // Try to skip as many waypoints as possible
            let furthest = current + 1;

            for (let i = path.length - 1; i > current + 1; i--) {
                if (this.hasLineOfSight(grid, path[current], path[i])) {
                    furthest = i;
                    break;
                }
            }

            smoothed.push(path[furthest]);
            current = furthest;
        }

        return smoothed;
    }

    /**
     * Check line of sight between two points
     * @param {Grid} grid - The grid
     * @param {object} from - Start point { x, y } or { r, c }
     * @param {object} to - End point { x, y } or { r, c }
     * @returns {boolean} True if clear line of sight
     */
    static hasLineOfSight(grid, from, to) {
        // Convert to grid coords if needed
        let fromCell, toCell;

        if ('r' in from && 'c' in from) {
            fromCell = from;
            toCell = to;
        } else {
            fromCell = this.worldToGrid(from.x, from.y, grid);
            toCell = this.worldToGrid(to.x, to.y, grid);
        }

        // Bresenham's line algorithm
        let x0 = fromCell.c;
        let y0 = fromCell.r;
        let x1 = toCell.c;
        let y1 = toCell.r;

        const dx = Math.abs(x1 - x0);
        const dy = Math.abs(y1 - y0);
        const sx = x0 < x1 ? 1 : -1;
        const sy = y0 < y1 ? 1 : -1;
        let err = dx - dy;

        while (true) {
            // Check if current cell is walkable
            if (!this.isWalkable(grid, y0, x0)) {
                return false;
            }

            if (x0 === x1 && y0 === y1) break;

            const e2 = 2 * err;
            if (e2 > -dy) {
                err -= dy;
                x0 += sx;
            }
            if (e2 < dx) {
                err += dx;
                y0 += sy;
            }
        }

        return true;
    }

    // ========================================
    // ORIGINAL PATHFINDING (BELOW)
    // ========================================

    /**
     * Find shortest path using Dijkstra's Algorithm with terrain awareness.
     *
     * Algorithm Details:
     * - Uses Dijkstra's shortest path algorithm (guaranteed optimal path)
     * - Supports 8-directional movement (cardinal + diagonal)
     * - Diagonal movement cost: 1.414 (√2), Cardinal movement cost: 1.0
     * - Prevents corner-cutting through obstacles/cliffs
     * - Optional penalty nodes for soft obstacle avoidance
     *
     * Terrain Handling:
     * - Cliffs are impassable (blocks pathfinding)
     * - Towers block movement (grid.map[r][c] !== 0)
     * - Diagonal moves check adjacent cells to prevent clipping
     *
     * Performance:
     * - Time Complexity: O(E log V) where E = edges, V = vertices
     * - Space Complexity: O(V) for distances and cameFrom maps
     * - Max iterations: 10,000 (safety limit to prevent infinite loops)
     * - Priority queue: O(n log n) sort per iteration (could be optimized with binary heap)
     *
     * @param {object} grid - Grid instance with map, rows, cols properties
     * @param {object} start - Start node { r: row, c: col }
     * @param {object} end - End node { r: row, c: col }
     * @param {Set} penaltyNodes - Optional set of "r,c" strings to penalize (+50 cost)
     * @returns {Array} Path as array of { r, c } nodes from start to end, or [] if no path
     *
     * @example
     * const path = Pathfinder.findPath(grid, { r: 0, c: 0 }, { r: 9, c: 19 });
     * if (path.length > 0) {
     *   // Path found: path[0] is start, path[path.length-1] is end
     * }
     *
     * @example
     * // With penalty nodes (soft avoidance)
     * const penaltyNodes = new Set(["5,10", "5,11", "5,12"]);
     * const path = Pathfinder.findPath(grid, start, end, penaltyNodes);
     * // Path will avoid penalty nodes unless no alternative exists
     */
    static findPath(grid, start, end, penaltyNodes = new Set()) {
        const MAX_ITERATIONS = 10000; // Safety limit to prevent infinite loops
        let iterations = 0;

        let queue = []; // Simple priority queue
        let distances = {}; // Key: "r,c", Value: cost
        let cameFrom = {};

        let startKey = `${start.r},${start.c}`;
        distances[startKey] = 0;
        queue.push({ node: start, dist: 0 });

        let found = false;

        while (queue.length > 0 && iterations < MAX_ITERATIONS) {
            iterations++;
            // Sort by distance (lowest first) - rudimentary PQ
            queue.sort((a, b) => a.dist - b.dist);
            let current = queue.shift().node;

            if (current.r === end.r && current.c === end.c) {
                found = true;
                break;
            }

            const moves = [
                { r: -1, c: 0 }, { r: 1, c: 0 },
                { r: 0, c: -1 }, { r: 0, c: 1 },
                // Diagonals
                { r: -1, c: -1 }, { r: -1, c: 1 },
                { r: 1, c: -1 }, { r: 1, c: 1 }
            ];

            for (let move of moves) {
                let nextR = current.r + move.r;
                let nextC = current.c + move.c;
                let nextKey = `${nextR},${nextC}`;

                // Check bounds
                if (nextR < 0 || nextR >= grid.rows || nextC < 0 || nextC >= grid.cols) {
                    continue;
                }

                // Check if walkable (not a tower)
                if (grid.map[nextR][nextC] !== 0) {
                    continue;
                }

                // NEW: Check terrain - cliffs are not walkable
                const terrainType = grid.getTerrainType(nextR, nextC);
                if (terrainType === TERRAIN_TYPES.CLIFF) {
                    continue; // Cannot walk through cliffs
                }

                // Diagonal Check: Prevent crossing corners
                if (Math.abs(move.r) === 1 && Math.abs(move.c) === 1) {
                    // Check if adjacent cardinal tiles are blocked by towers
                    if (grid.map[nextR][current.c] !== 0 || grid.map[current.r][nextC] !== 0) {
                        continue;
                    }

                    // NEW: Also check if adjacent tiles are cliffs (diagonal movement)
                    const terrainR = grid.getTerrainType(nextR, current.c);
                    const terrainC = grid.getTerrainType(current.r, nextC);
                    if (terrainR === TERRAIN_TYPES.CLIFF || terrainC === TERRAIN_TYPES.CLIFF) {
                        continue; // Cannot cut diagonal corners through cliffs
                    }
                }

                // Calculate cost
                // Base cost = 1 for straights, 1.41 for diagonals
                let isDiagonal = (move.r !== 0 && move.c !== 0);
                let stepCost = isDiagonal ? 1.414 : 1;

                // Penalty = 50 if node is in penaltyNodes
                let penalty = penaltyNodes.has(nextKey) ? 50 : 0;
                let newDist = distances[`${current.r},${current.c}`] + stepCost + penalty;

                if (!(nextKey in distances) || newDist < distances[nextKey]) {
                    distances[nextKey] = newDist;
                    cameFrom[nextKey] = current;
                    queue.push({ node: { r: nextR, c: nextC }, dist: newDist });
                }
            }
        }

        // Check if we hit the iteration limit
        if (iterations >= MAX_ITERATIONS) {
            console.error('Pathfinder: Exceeded maximum iterations - possible infinite loop or corrupted grid state');
            return []; // Return empty path to prevent freeze
        }

        if (!found) return [];

        // Reconstruct path
        let path = [];
        let curr = end;
        while (curr) {
            path.unshift(curr);
            curr = cameFrom[`${curr.r},${curr.c}`];
            // Safety break for start node
            if (curr && curr.r === start.r && curr.c === start.c) { // Check curr is not null/undefined
                path.unshift(start);
                break;
            }
            if (!curr && path[0] && path[0].r === start.r && path[0].c === start.c) { // If curr became null and start is already added
                break;
            }
        }
        return path;
    }

    static findMultiPaths(grid, start, end, limit = 3) {
        let paths = [];
        let penaltyNodes = new Set();

        for (let i = 0; i < limit; i++) {
            // Find path with current penalties
            let path = this.findPath(grid, start, end, penaltyNodes);

            if (path.length > 0) {
                // Check if this path is identical to the previous one (convergence)
                // If strictly identical, stop, we've exhausted options.
                // But generally, Dijkstra with high penalties ensures divergence if possible.

                // Add current path's nodes to penalties for Next iterations
                // Don't penalize Start/End
                for (let j = 1; j < path.length - 1; j++) {
                    penaltyNodes.add(`${path[j].r},${path[j].c}`);
                }

                paths.push(path);
            } else {
                break; // blocked
            }
        }

        return paths;
    }
}
