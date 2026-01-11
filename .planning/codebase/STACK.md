# Technology Stack

## Languages & Versions

- **JavaScript:** ES6+ (Vanilla, no transpilation)
- **HTML5:** Standard markup with semantic structure
- **CSS3:** Standard CSS with flexbox layout

## Core Frameworks & Libraries

| Framework | Version | Purpose | Source |
|-----------|---------|---------|--------|
| **p5.js** | 1.10.0 | Canvas rendering, 2D graphics, input handling | CDN (cdnjs.cloudflare.com) |
| **p5.sound** | 1.10.0 | Web Audio API synthesis - oscillators, envelopes, effects | CDN (cdnjs.cloudflare.com) |

**No UI frameworks** - Custom UI implementation (no React/Vue)

## Build Tools & Package Management

- **Package Manager:** npm
- **Dev Server:** http-server (lightweight HTTP server)
- **Development:** `npm start` → launches server on port 8000
- **No build pipeline** - No webpack, rollup, or bundling
- **No transpilation** - Files served directly as-is

### Dependencies

- **Production:** ZERO npm packages (all game logic is custom vanilla JS)
- **Development:** http-server only (for CORS-compliant asset loading)

## Runtime Environment

- **Target:** Modern web browsers (Chrome, Firefox, Safari, Edge)
- **Browser APIs:**
  - Canvas 2D Context
  - Web Audio API (via p5.sound)
  - DOM API
  - requestAnimationFrame (p5.js handles internally)
- **No backend** - Static file server only

## Script Loading Order

**CRITICAL:** Scripts must load in exact order (no module system):

1. Constants (GameConstants.js, TerrainConstants.js, RTSConstants.js)
2. Utilities (GameMath.js, UIHelper.js, etc.)
3. Data (LevelData.js)
4. Core Systems (AssetLoader, Grid, Pathfinder, Tower, Unit, Building, Player)
5. Managers (EventManager, UnitManager, BuildingManager, etc.)
6. AI (AIController, EnemyDiscoveryTracker)
7. Renderers (SpriteRenderer, DisplayRenderer, DebugRenderer)
8. Game Core (Game.js, SoundManager.js)
9. Entry Point (sketch.js)

**Why This Matters:** No ES6 imports used. Scripts execute top-to-bottom. Dependencies must exist before use.

## Asset Loading

- **Images:** ~700 PNG sprite sheets (local files)
- **Audio:** Procedurally synthesized via p5.sound (no audio files)
- **Asset Metadata:** JSON files for animation definitions
- **Loading:** AssetLoader.js with async queue system

## Key Characteristics

- **Minimalist stack** - Only p5.js + Canvas
- **Zero production dependencies** - All game logic custom
- **No build step** - Direct script loading
- **Self-contained** - No external services
- **Performance-focused** - Object pooling, culling, spatial partitioning
