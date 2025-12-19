# Tower Defense Game Design Document

## 1. Game Overview
**Title:** System Defense (Placeholder)
**Genre:** Tower Defense
**Platform:** Web (p5.js 2.0)
**Theme:** Cyberpunk/Minimalist Geometric
**Core Loop:**
1.  **Build Phase:** Player spends resources to place towers on a grid.
2.  **Defend Phase:** Enemies spawn and traverse a path. Towers attack enemies.
3.  **Reward:** Defeated enemies drop resources. Surviving waves grants bonuses.
4.  **Upgrade:** Player upgrades towers or buys new ones.

## 2. Gameplay Mechanics
### The Grid
- The map is a tile-based grid.
- Some tiles are "Path" (enemies walk here).
- Some tiles are "Buildable" (towers go here).
- Some tiles are "Obstacle" (inactive).

### Towers
- **Basic Turret:** Fast fire, low damage.
- **Sniper:** Slow fire, high range/damage.
- **Slow Tower:** AOE slow effect, no damage.
- **Splash Tower:** Area damage.

### Enemies
- **Basic Bot:** Average speed/health.
- **Speedster:** Fast, low health.
- **Tank:** Slow, high health.

### Resources
- **Credits:** Earned by killing enemies. Used to buy/upgrade towers.
- **Lives:** Lost when an enemy reaches the end of the path. Game Over if 0.

## 3. Technical Pillars (The "Vibe" Code)
- **OOP Architecture:** distinct classes for `Tower`, `Enemy`, `Projectile`, `GameManager`.
- **Test-Driven:** manual verification steps and console logs for every feature.
- **Performance:** Object pooling for projectiles and particles if needed (Quality > Quantity).
- **p5.js 2.0:** Utilizing the latest features of p5.js.

## 4. Visual Style
- Clean lines, neon colors on dark background.
- UI overlay for stats.
- Visual feedback for hits, placement, and upgrades.
