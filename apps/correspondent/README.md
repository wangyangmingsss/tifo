# TIFO War Correspondent

Automated on-chain event watcher that generates and posts war dispatches to X (Twitter). Monitors the TIFO territory map for dramatic moments — captures, defections, and match events — and broadcasts them with faction flags, OKLink proof links, and @XLayerOfficial mentions.

**Positioning:** Operational automation tool, not a product core. Satisfies the hackathon's "active X account with ongoing posts" requirement while driving social engagement and map awareness.

## Watched Events

| Event | Source | Trigger |
|---|---|---|
| `TerritoryCaptured` | TerritoryMap | A region flips from one faction to another |
| `Defected` | TerritoryMap | A user betrays their old faction for the new owner |
| `MatchEventPushed` | MatchOracle | Goal / penalty / red card / whistle pushed on-chain |

## Tweet Templates

Each event type has 3 randomized template variants for variety:

- **Capture:** `"⚔️ TERRITORY CAPTURED! 🇧🇷 Brazil just seized Region #5 from 🇦🇷 Argentina! ..."`
- **Defection:** `"🗡️ BETRAYAL! A former 🇫🇷 France supporter has defected to 🇩🇪 Germany ..."`
- **Match Event:** `"⚽ GOAL! 🇪🇸 Spain — Power surge across 3 regions! ..."`
- **Countdown:** `"📅 20 days until kickoff! Current Territory Leaderboard: ..."`

All tweets include OKLink transaction links and `@0xWangyangming @aspect_build #TIFO #XLayer` tags.

## Setup

```bash
# Install dependencies
npm install

# Configure (copy and fill in X API credentials)
cp .env.example .env

# Dry-run mode (logs tweets without posting)
npm run dry

# Production (actually posts to X)
npm start
```

## Architecture

```
src/
├── index.ts          # Entry point
├── config.ts         # Environment configuration
├── factions.ts       # 48 faction names + flag emojis
├── templates.ts      # Tweet text generators (3 variants each)
├── twitter.ts        # X API v2 OAuth 1.0a client (pure Node.js)
└── correspondent.ts  # viem event polling + dispatch logic
```

## Key Design

- **5-block confirmation buffer** — avoids tweeting about reorged events
- **99-block chunk polling** — respects X Layer Testnet's `eth_getLogs` limit
- **Rate limiter** — max 10 tweets per 15-minute window (under X API free tier)
- **Dry-run mode** — `DRY_RUN=true` logs tweets to stdout without posting
- **Zero external SDK** — Twitter OAuth 1.0a implemented with raw `crypto` + `https`
- **Randomized templates** — 3 variants per event type for tweet variety
