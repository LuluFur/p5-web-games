# External Integrations

## Summary

**NO external integrations detected** - This is a completely self-contained game.

## External Services

- ❌ No cloud services (Firebase, Supabase, AWS, etc.)
- ❌ No backend APIs
- ❌ No third-party authentication
- ❌ No analytics platforms
- ❌ No multiplayer servers
- ❌ No payment processors
- ❌ No CDN (beyond p5.js libraries)

## Asset Loading

**Local Files Only** - All assets bundled with game

### Image Sprites
- Location: `assets/` directory
- Format: PNG sprite sheets
- Structure: 8-directional animations
- Count: ~700 PNG files
- Creatures: zombie, vampire, skeleton, goblin
- Metadata: JSON files define animation frame counts

### Audio
- **NO audio files** - All sound procedurally synthesized
- Web Audio API via p5.sound
- Oscillators (sine, triangle, sawtooth waves)
- ADSR envelopes for dynamic sound

## Data Storage

- ❌ No localStorage
- ❌ No sessionStorage
- ❌ No IndexedDB
- ❌ No cookies
- ❌ No server-side saves
- **Session-only state** - Lost on page refresh

## Configuration

All configuration local:
- GameConstants.js - Balance values
- RTSConstants.js - RTS mechanics
- TerrainConstants.js - Terrain parameters
- LevelData.js - Level definitions

## Networking

- ❌ No WebSocket connections
- ❌ No multiplayer
- ❌ No leaderboards
- **Single-player only** - Entirely client-side

## Future Integration Opportunities

If features needed:
- **Multiplayer:** Would need Socket.io + Node.js server
- **Persistence:** Could add Firebase/Supabase
- **Analytics:** Could integrate Plausible (privacy-focused)
- **Leaderboards:** Would need backend API
