# TIFO -- System Architecture

## Overview

TIFO is a monorepo containing on-chain smart contracts (Foundry) and a Next.js frontend that together implement a real-time territory war on a world map. All game state lives on-chain; the frontend is a pure read/write client.

## System Architecture Diagram

```
                          +-------------------------+
                          |   Mulerun Correspondent  |
                          |   Events -> War Reports   |
                          |   -> Auto-post to X       |
                          +-----------^-------------+
                                      | read events
                                      |
+----------------+   query    +-------+--------+              +------------------------+
|  Next.js Web   |<---------->|    Indexer      |              |   X Layer (zkEVM L2)   |
|                |   API      |  viem + PG      |<------------>|                        |
|  /             |            |  reconstruct    |   events:    |  MockUSDT              |
|  Landing page  |            |  full history   |  RallyPlaced |  FactionRegistry       |
|                |            +----------------+   Captured    |  TerritoryMap          |
|  /map          |                                  Defected   |  WarChest              |
|  Territory map |                                             |  MatchOracle           |
|                |                                             |                        |
|  /rally        |   wagmi: sign & send tx                     |                        |
|  Rally action  +-------------------------------------------->|                        |
|                |                                             +-----------^------------+
+----------------+                                                         |
                                                                           | pushMatchEvent()
                                                             +------------+-----------+
                                                             |  Match Event Source     |
                                                             |                        |
                                                             |  Pre-kickoff:          |
                                                             |    SimulateWar.s.sol    |
                                                             |                        |
                                                             |  Post-kickoff:         |
                                                             |    Football-Data API   |
                                                             +------------------------+
```

## Data Flow

### 1. User Enrollment

```
User -> OKX Wallet -> FactionRegistry.joinFaction(factionId)
```

- First join is free; subsequent faction switches incur a fee routed to WarChest
- `factionOf[user]` and `isEnrolled[user]` are stored as single SLOADs for gas efficiency
- Emits `FactionJoined(user, factionId, isSwitch)`

### 2. Rally (Core Loop)

```
User -> OKX Wallet -> TerritoryMap.rally(regionId, amount)
```

Execution flow inside `rally()`:

1. Validate region exists and user is enrolled
2. Pull tokens: 2% to WarChest (protocol fee), 98% held by TerritoryMap
3. Settle decay on both attacker and current owner factions
4. Calculate underdog bonus based on power gap
5. Update faction power and contribution records
6. Bump WarChest contribution total (for claim denominator)
7. Check capture condition: if attacker power > owner power, flip the region
8. Emit `RallyPlaced` (and `TerritoryCaptured` if flipped)

### 3. Defection

```
User -> OKX Wallet -> TerritoryMap.defect(regionId)
```

1. User must belong to the current owning faction
2. Contract finds user's largest contribution under any non-owner faction (bounded loop over 48 factions)
3. 80% of stale contribution converts to power for current owner
4. 20% credited to defector as contribution weight under new faction
5. Old faction's power reduced accordingly
6. Emit `Defected(user, regionId, fromFaction, toFaction, converted, reward)`

### 4. Match Events

```
Operator -> MatchOracle.pushMatchEvent(faction, eventType, regions, boost)
```

Event types and their effects:

| Event | Effect |
|-------|--------|
| `WHISTLE` | Apply a raw power boost to specified regions (used for genesis seeding) |
| `GOAL` | Surge the scoring faction's power across target regions |
| `RED_CARD` | Penalty power reduction to the carded faction |
| `FINAL` | End-of-match settlement trigger |

The oracle calls `TerritoryMap.applyMatchBoost()` as the map's owner, which updates power and checks for captures.

### 5. Map Rendering

```
Frontend -> TerritoryMap.getMapState() -> uint8[200] (owner faction per region)
Frontend -> TerritoryMap.effectivePower(regionId, faction) -> live power after decay
Frontend -> TerritoryMap.territoryCounts() -> uint256[48] (region count per faction)
```

The frontend calls read-only view functions to render the D3-geo map. Each region is colored by its owner faction. The sidebar shows power bars for all factions competing in a selected region.

### 6. Settlement

```
WarChest.claim(regionId, faction) -- faction members claim proportional share
```

At season checkpoints, WarChest distributes accumulated protocol fees to the faction that holds each region, split by each member's contribution weight.

## Contract Dependency Graph

```
MockUSDT (ERC-20)
    |
    +----> FactionRegistry (reads token for switch fees)
    |           |
    |           +----> WarChest (receives switch fees)
    |
    +----> TerritoryMap (pulls tokens for rallies)
                |
                +----> FactionRegistry (reads factionOf, isEnrolled)
                +----> WarChest (sends protocol fees, bumps contrib totals)
                +----> PowerMath (library: decay + underdog bonus)
                +----> TifoTypes (library: constants + errors)
                |
                +----> MatchOracle (owns TerritoryMap, calls applyMatchBoost)
```

## Key Design Decisions

### Full State Reconstructability from Events

`rally()` emits `RallyPlaced` with the raw amount, effective power (after underdog bonus), and new faction total. Combined with `TerritoryCaptured` and `Defected` events, the entire map history can be reconstructed from event logs alone. This is the foundation of the verifiability claim.

### Bounded Gas Costs

- Decay iteration capped at 168 hours (one week)
- Defection scans exactly 48 factions (constant)
- `getMapState()` iterates exactly `regionCount` (200) entries
- No unbounded loops or dynamic arrays in storage

### Non-Fatal WarChest Wiring

`rally()` wraps the `bumpContribTotal()` call in a try/catch. If WarChest is not yet wired (during testing or partial deployment), the map continues functioning. The dependency is non-fatal by design.

### Ownership Transfer to Oracle

After deployment and region seeding, `TerritoryMap.transferOwnership(MatchOracle)` strips the deployer of admin rights. Only the oracle can modify region power through match events. This prevents operator manipulation of the live map.
