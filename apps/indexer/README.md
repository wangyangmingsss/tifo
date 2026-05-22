# TIFO Indexer

On-chain event indexer + REST API for the TIFO protocol on X Layer Testnet.

Built with **TypeScript + viem + PostgreSQL**. Subscribes to 7 on-chain events with a 5-block confirmation buffer and exposes REST endpoints for the frontend verifiability panel.

## Indexed Events

| Event | Contract | Description |
|---|---|---|
| `FactionJoined` | FactionRegistry | User joins/switches faction |
| `RallyPlaced` | TerritoryMap | User rallies tokens to a region |
| `TerritoryCaptured` | TerritoryMap | Region ownership flips |
| `Defected` | TerritoryMap | User defects to new faction |
| `MatchEventPushed` | MatchOracle | Match event (goal/penalty/etc) pushed |
| `RewardClaimed` | WarChest | User claims reward |
| `SeasonSettled` | WarChest | Season settlement finalized |

## API Endpoints

```
GET /healthz              # Health check + sync status
GET /map/state            # Full map ownership (200 regions)
GET /region/:id/history   # Region capture history + OKLink links
GET /leaderboard          # Faction rankings by territory
GET /faction/:id          # Faction details + contributors
GET /stats                # Global on-chain statistics
```

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env with your PostgreSQL connection string

# 3. Initialize database
npm run db:init

# 4. Start indexer + API server
npm run dev        # development (hot reload)
npm run build && npm start  # production
```

## Architecture

```
src/
├── index.ts              # Entry point: DB init + API + indexer
├── config.ts             # Environment configuration
├── abis/                 # Contract ABI definitions
│   ├── FactionRegistry.ts
│   ├── TerritoryMap.ts
│   ├── WarChest.ts
│   └── MatchOracle.ts
├── db/
│   ├── client.ts         # PostgreSQL pool + cursor helpers
│   ├── schema.sql        # Database schema (8 tables)
│   └── init.ts           # Schema initialization script
├── indexer/
│   ├── eventListener.ts  # viem polling with 5-block buffer
│   └── handlers.ts       # Event decode + PG write handlers
└── api/
    ├── server.ts         # Express server setup
    └── routes.ts         # REST route handlers
```

## Key Design Decisions

- **5-block confirmation buffer**: Prevents indexing reorged blocks
- **99-block chunk size**: X Layer Testnet limits `eth_getLogs` to 100 blocks per request
- **Idempotent writes**: `ON CONFLICT DO NOTHING` on `(tx_hash, log_index)` prevents duplicates
- **Hybrid reads**: `/map/state` reads directly from chain for real-time accuracy; historical data from PostgreSQL
- **OKLink links**: Every tx hash includes a direct OKLink verification URL
