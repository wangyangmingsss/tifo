# TIFO — System Architecture

> Full technical architecture of the TIFO protocol: smart contracts, frontend, event indexer, and war correspondent agent.

---

## High-Level System Diagram

```
                              ┌──────────────────────────┐
                              │   War Correspondent       │
                              │   viem → tweet templates   │
                              │   → X API v2 auto-post     │
                              └────────────▲──────────────┘
                                           │ poll events
                                           │
┌──────────────────┐   REST    ┌───────────┴──────────────┐               ┌──────────────────────────┐
│   Next.js 14     │◄─────────►│       Indexer             │               │   X Layer Testnet (195)   │
│   Frontend       │   query   │  viem + PostgreSQL        │◄─────────────►│                           │
│                  │           │  7 event types indexed     │  eth_getLogs  │   MockUSDT                │
│  /               │           │  5 REST endpoints          │  (5-block     │   FactionRegistry         │
│  Landing page    │           │  full history rebuild      │   confirm)    │   TerritoryMap  ← core    │
│                  │           └────────────────────────────┘               │   WarChest                │
│  /map            │                                                       │   MatchOracle             │
│  Territory map   │                                                       │                           │
│                  │    wagmi: sign & broadcast tx                          │                           │
│  /rally          ├──────────────────────────────────────────────────────►│                           │
│  /faction        │                                                       └────────────▲──────────────┘
│  /me             │                                                                    │
│  /leaderboard    │                                                                    │ pushMatchEvent()
└──────────────────┘                                                      ┌─────────────┴──────────────┐
                                                                          │   Match Event Source        │
                                                                          │                             │
                                                                          │   Pre-kickoff (now):        │
                                                                          │     SimulateWar.s.sol       │
                                                                          │                             │
                                                                          │   Post-kickoff (June 11):   │
                                                                          │     Football-Data API feed  │
                                                                          └─────────────────────────────┘
```

---

## Smart Contract Layer

### Contract Inventory

| Contract | LOC | Purpose |
|----------|-----|---------|
| `TifoTypes.sol` | ~20 | Constants (`FACTION_COUNT=48`, `NO_FACTION=255`, `BPS=10000`) + custom errors |
| `PowerMath.sol` | ~40 | Pure functions: `decay()` (hourly, 168h cap) + `applyUnderdogBonus()` |
| `MockUSDT.sol` | ~60 | Self-contained ERC-20, open `mint()`, `faucet()` with 12h cooldown |
| `FactionRegistry.sol` | ~80 | `joinFaction()`, `factionOf()`, `isEnrolled()`. Switch fee → WarChest |
| `TerritoryMap.sol` | ~200 | `rally()`, `defect()`, `getMapState()`, `applyMatchBoost()` |
| `WarChest.sol` | ~120 | Prize pool, passive accrual, `settleSeason()`, `claim()` (pull pattern) |
| `MatchOracle.sol` | ~60 | `pushMatchEvent()` → `applyMatchBoost()` across regions |

### Contract Dependency Graph

```
MockUSDT (ERC-20)
    │
    ├──► FactionRegistry
    │        │
    │        └──► WarChest (receives switch fees)
    │
    └──► TerritoryMap (pulls rally tokens)
              │
              ├──► FactionRegistry (reads factionOf / isEnrolled)
              ├──► WarChest (sends 2% protocol fee, bumps contrib totals)
              ├──► PowerMath (library: decay + underdog)
              ├──► TifoTypes (library: constants + errors)
              │
              └──► MatchOracle (owns TerritoryMap, calls applyMatchBoost)
```

### Deployment Wiring (Deploy.s.sol)

Sequence matters — `addRegions()` must precede `transferOwnership()`:

```
1. Deploy MockUSDT
2. Deploy WarChest(token)
3. Deploy FactionRegistry(token, warChest)
4. Deploy TerritoryMap(token, registry, warChest)
5. Deploy MatchOracle(territoryMap)
6. chest.setMap(map)                    ← chest reads territory state
7. chest.setUpdater(map)               ← rally() auto-bumps claim denominator
8. map.addRegions(200)                  ← while deployer still owns map
9. map.transferOwnership(oracle)        ← LAST: oracle gets boost rights
```

After step 9, the deployer has zero admin privileges over the map.

### zkEVM Compatibility

X Layer's zkEVM historically does not support the `PUSH0` opcode (Solidity ≥0.8.20 on Shanghai). `foundry.toml` sets `evm_version = "paris"` to avoid this. All contracts compile and deploy cleanly.

---

## Data Flow: Core Loop

### 1. User Enrollment

```
User → OKX Wallet → FactionRegistry.joinFaction(factionId)
  → emit FactionJoined(user, factionId, isSwitch)
```

- First join: free. Switch: fee routed to WarChest
- `factionOf[user]` stored as single SLOAD for gas efficiency

### 2. Rally (Highest-Frequency Action)

```
User → OKX Wallet → TerritoryMap.rally(regionId, amount)
```

Inside `rally()`:

1. Validate region exists + user enrolled
2. Pull tokens: 2% → WarChest (protocol fee), 98% → TerritoryMap
3. Settle decay on attacker + current owner (bounded at 168 iterations)
4. Calculate underdog bonus: `effective = amount × (1 + bonusBps/10000)`
5. Update faction power + contribution records
6. `try warChest.bumpContribTotal() catch {}` — non-fatal wiring
7. If `attackerPower > ownerPower` → flip region, increment captureCount
8. Emit `RallyPlaced(user, regionId, faction, raw, effective, newTotal)`
9. If flipped → emit `TerritoryCaptured(regionId, oldFaction, newFaction, count)`

### 3. Defection

```
User → OKX Wallet → TerritoryMap.defect(regionId)
```

1. User must belong to current owning faction (already switched in Registry)
2. `_largestForeignContribution()` — bounded loop over 48 factions (constant gas)
3. 80% of stale contribution → fresh power for current owner
4. 20% → defector's contribution weight under new faction (finder's reward)
5. Old faction power reduced
6. Emit `Defected(user, regionId, fromFaction, toFaction, converted, reward)`

### 4. Match Events

```
Operator → MatchOracle.pushMatchEvent(faction, eventType, regions, overrideBoost)
  → for each region: TerritoryMap.applyMatchBoost(region, faction, boost)
  → emit MatchEventPushed(eventId, faction, type, regions, boost)
```

| EventType | Default Boost | Effect |
|-----------|--------------|--------|
| GOAL | 500e18 | Major power surge → likely captures |
| PENALTY | 250e18 | Moderate surge |
| RED_CARD | 150e18 | Minor surge |
| WHISTLE | 0 | No boost (used for genesis seeding with override) |

### 5. Settlement

```
Owner → WarChest.settleSeason()
  → reads territoryCounts() → freezes scores + payouts
  → emit SeasonSettled(totalScore, totalPool)

User → WarChest.claim(regionIds[])
  → payout = (factionPayout / score) × (myContrib / totalContrib)
  → pull pattern, no loop transfers
  → emit RewardClaimed(user, regionId, faction, amount)
```

---

## Event Indexer (`apps/indexer/`)

### Purpose

Subscribe to all TIFO on-chain events, write to PostgreSQL, and expose REST endpoints for the frontend verifiability panel and statistics.

### Architecture

```
┌──────────────────┐     ┌──────────────┐     ┌──────────────┐
│  X Layer RPC     │────►│  EventIndexer │────►│  PostgreSQL   │
│  eth_getLogs     │     │  5-block buf  │     │  8 tables     │
│  (99-block max)  │     │  7 event types│     │  indexed      │
└──────────────────┘     └──────┬───────┘     └──────┬───────┘
                                │                     │
                         ┌──────▼───────┐     ┌──────▼───────┐
                         │  Express API  │◄────│  SQL queries  │
                         │  port 4000    │     │  + on-chain   │
                         └──────────────┘     │  view calls   │
                                              └──────────────┘
```

### Indexed Events

| Event | Source Contract | PG Table |
|-------|---------------|----------|
| `FactionJoined` | FactionRegistry | `faction_joins` |
| `RallyPlaced` | TerritoryMap | `rallies` |
| `TerritoryCaptured` | TerritoryMap | `captures` |
| `Defected` | TerritoryMap | `defections` |
| `MatchEventPushed` | MatchOracle | `match_events` |
| `RewardClaimed` | WarChest | `reward_claims` |
| `SeasonSettled` | WarChest | `season_settled` |

Plus `indexer_state` for cursor tracking.

### REST Endpoints

| Endpoint | Data Source | Purpose |
|----------|-----------|---------|
| `GET /healthz` | PG + RPC | Sync status |
| `GET /map/state` | On-chain `getMapState()` + PG | Full map with capture counts |
| `GET /region/:id/history` | PG `captures` + `rallies` + `defections` | Verifiability panel |
| `GET /leaderboard` | On-chain `territoryCounts()` + PG | Faction rankings |
| `GET /faction/:id` | On-chain + PG | Detail + top contributors |
| `GET /stats` | On-chain + PG | Global statistics |

### Design Decisions

- **Hybrid reads**: `/map/state` reads live from chain for accuracy; historical data from PG for speed
- **Idempotent writes**: `ON CONFLICT (tx_hash, log_index) DO NOTHING` prevents duplicates on re-index
- **99-block chunks**: X Layer Testnet limits `eth_getLogs` to 100 blocks per request
- **OKLink URLs**: Every response includes clickable `oklinkUrl` for each transaction

---

## War Correspondent (`apps/correspondent/`)

### Purpose

Automated operational agent that monitors on-chain events and posts war dispatches to X (Twitter), satisfying the hackathon's "active X account" requirement.

### Architecture

```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────┐
│  X Layer RPC     │────►│  Correspondent    │────►│  X API v2     │
│  eth_getLogs     │     │  3 event types    │     │  OAuth 1.0a   │
│  5-block buffer  │     │  3 templates each │     │  auto-tweet   │
└──────────────────┘     │  rate limited     │     └──────────────┘
                         └──────────────────┘
```

### Watched Events → Tweet Templates

| Event | Example Tweet |
|-------|--------------|
| `TerritoryCaptured` | `"⚔️ 🇧🇷 Brazil just seized Region #5 from 🇦🇷 Argentina! Capture #3 — the map is shifting."` |
| `Defected` | `"🗡️ BETRAYAL! A former 🇫🇷 France supporter defected to 🇩🇪 Germany in Region #12."` |
| `MatchEventPushed` | `"⚽ GOAL! 🇪🇸 Spain — Power surge across 3 regions! Rally now or lose ground."` |

Each event type has 3 randomized template variants. All tweets include OKLink proof links and `@0xWangyangming @aspect_build #TIFO #XLayer` tags.

### Safeguards

- **Rate limiter**: max 10 tweets per 15-minute window (under X API free tier)
- **Dry-run mode**: `DRY_RUN=true` logs full tweet text without posting
- **Zero SDK**: OAuth 1.0a implemented with Node.js `crypto` + `https`

---

## Frontend (`src/`)

### Stack

Next.js 14 App Router + wagmi v2 + RainbowKit + Tailwind CSS + D3-geo

### Pages

| Route | Component | Data Source |
|-------|-----------|-------------|
| `/` | Landing page | `territoryCounts()` + indexer `/stats` |
| `/map` | D3-geo world map | `getMapState()` real-time polling |
| `/rally/[regionId]` | Rally panel | `effectivePower()` + `rally()` tx |
| `/faction/[id]` | Faction details | `territoryCounts()` + `memberCount()` + indexer |
| `/me` | My war record | `factionOf()` + `contribution()` |
| `/leaderboard` | Faction rankings | `territoryCounts()` |

### Map Rendering

- TopoJSON world data (Natural Earth, 177+ countries)
- ISO 3166-1 → regionId mapping for 200 regions
- D3-geo projection with zoom + pan
- Real-time faction coloring from `getMapState()`
- Click region → sidebar with power bars, capture history, rally button

### Dynamic OG Images

`next/og` generates 1200×630 cards for `/faction/[id]` and `/me`:
- Faction-colored accent with name, code, confederation
- Stats overlay (territories held, rally count)
- `@0xWangyangming` branding for social sharing

---

## Gas & Performance

| Operation | Gas (approx) | Frequency |
|-----------|-------------|-----------|
| `joinFaction()` | ~60k | Once per user |
| `rally()` | ~120k | Highest frequency |
| `defect()` | ~100k | Occasional |
| `pushMatchEvent()` (3 regions) | ~200k | Per match event |
| `getMapState()` (view) | 0 (eth_call) | Every poll cycle |
| `territoryCounts()` (view) | 0 (eth_call) | Every poll cycle |

At X Layer testnet gas prices (~0.001 USD/tx), a fan can rally 1,000 times for $1 in gas.

---

## Security Considerations

| Item | Status |
|------|--------|
| Bounded loops | Decay: 168 max iterations. Defection: 48 factions. Views: 200 regions. |
| No unbounded storage iteration | `bumpContribTotal()` mirrors contrib totals to avoid iterating contributors |
| Pull-pattern claims | `claim()` transfers once at the end, no loop transfers |
| Non-fatal wiring | `try/catch` on WarChest callback — map works without chest |
| Single-signer oracle | **Honest design choice for hackathon**. Production: Chainlink Functions / UMA |
| No admin on live map | Ownership transferred to MatchOracle after deployment |
| Paris EVM target | Avoids PUSH0 opcode incompatibility on zkEVM |

---

*Built for OKX Build X Hackathon · XCup 2026 · X Layer Testnet (chainId 195)*
