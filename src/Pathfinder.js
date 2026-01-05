class Pathfinder {
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
