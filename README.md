# TIFO -- 48 Factions, One Map, Zero-Sum Territory War

**Built for OKX Build X Hackathon | XCup 2026 | X Layer Testnet (chainId 195)**

> Fans don't bet on match outcomes -- they fight for territory on a real-world map. Territory decays, gets flipped by defectors, and surges with real match events. Every rally, capture, and defection is a verifiable X Layer transaction.

---

## The Problem

Billions of fans cheer for their national teams every four years, but that passion has no on-chain expression. Prediction markets reduce football to "who wins?" -- a binary outcome that ignores the living drama of 90 minutes. Existing fan tokens are static holdings with no gameplay. There is no protocol where supporting your nation is an active, contested, strategic act.

## The Solution

TIFO is a shared, contested world map where 48 World Cup factions wage continuous territory war. Each of the 200 map regions is owned by whichever faction has the most power in it. Power comes from fans committing tokens (rallying), but three novel mechanics ensure the game never stagnates:

1. **Decay** -- Territory power bleeds 1% per hour. Stop playing and you lose your land. This forces continuous on-chain engagement; idle whales cannot hold territory.
2. **Underdog Bonus** -- The further behind your faction is in a region, the more each rally counts (up to +50%). No region is ever permanently locked. Comebacks are always possible.
3. **Defection** -- If a region you rallied for gets captured by another faction, you can defect: convert your stale contribution into power for the new owner, keeping a 20% finder's reward. This injects social betrayal dynamics and accelerates contested regions flipping.

Every goal, red card, and final whistle from the real World Cup is pushed on-chain through the MatchOracle, triggering faction-wide power surges that reshape the entire map in seconds.

---

## Why X Layer

<!-- SECTION: why-xlayer -->
TIFO's core action -- `rally()` -- is a high-frequency, low-amount transaction. A fan might rally 5-10 times in a single match, spending fractions of a dollar each time. This usage pattern demands:

- **Cheap gas**: Sub-cent transaction costs so micro-rallies are economically viable
- **Fast finality**: Map updates must feel instant for the real-time territory visualization
- **EVM compatibility**: Foundry toolchain, wagmi/viem frontend stack, OKLink verification -- all work out of the box
- **zkEVM security**: Ethereum-grade security inherited through zero-knowledge proofs

X Layer's zkEVM L2 checks every box. The entire protocol is designed around the assumption that gas is cheap enough for fans to rally as often as they cheer.

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Network | X Layer Testnet (zkEVM L2, chainId 195) | Low-gas high-frequency settlement |
| Smart Contracts | Solidity 0.8.24 + Foundry | Territory war core logic |
| Frontend | Next.js 14 + wagmi + RainbowKit + Tailwind CSS | Map UI, rally interface, faction pages |
| Map Rendering | D3-geo + TopoJSON (world GeoJSON) | Real-world map with real-time faction coloring |
| Wallet | OKX Wallet (first-class via RainbowKit) | Transaction signing and faction enrollment |
| Pricing Token | MockUSDT (with faucet) | Zero-cost testnet experience |
| Block Explorer | OKLink | Contract verification and transaction proof |

---

## Monorepo Structure

```
tifo/
+-- contracts/                    # Foundry project
|   +-- src/
|   |   +-- TerritoryMap.sol          # Territory core (the soul of TIFO)
|   |   +-- FactionRegistry.sol       # Faction enrollment + switch fees
|   |   +-- WarChest.sol              # Prize pool and settlement
|   |   +-- MatchOracle.sol           # Real match events -> on-chain surges
|   |   +-- MockUSDT.sol              # Testnet token with faucet
|   |   +-- libraries/
|   |       +-- TifoTypes.sol         # Constants + custom errors
|   |       +-- PowerMath.sol         # Decay + underdog bonus pure functions
|   +-- script/
|   |   +-- Deploy.s.sol              # Full deployment + wiring
|   |   +-- SeedMap.s.sol             # Genesis: anchor each faction to home region
|   |   +-- SimulateWar.s.sol         # Dense on-chain activity for demo
|   +-- test/                         # Foundry unit tests
|   +-- deployments/
|       +-- xlayer-testnet.json       # Deployed contract addresses
+-- src/                          # Next.js frontend
|   +-- app/
|   |   +-- page.tsx                  # Landing page with live stats
|   |   +-- map/page.tsx              # Interactive territory map
|   +-- components/
|   |   +-- WorldMap.tsx              # D3-geo map with faction coloring
|   |   +-- RegionSidebar.tsx         # Region detail + rally action
|   |   +-- MapLegend.tsx             # Faction legend with territory counts
|   |   +-- Navbar.tsx                # Navigation + wallet connect
|   +-- config/
|       +-- factions.ts               # 48 faction definitions (colors, anchors)
|       +-- contracts.ts              # Contract addresses + chain config
|       +-- wagmi.ts                  # Wagmi/RainbowKit provider config
+-- docs/
|   +-- PITCH.md                      # One-page pitch for judges
|   +-- ARCHITECTURE.md              # System architecture overview
+-- public/                       # Static assets (world TopoJSON, icons)
+-- README.md                     # This file
```

---

## Smart Contracts

Five contracts and two libraries form the on-chain protocol:

### Libraries

| Contract | Purpose |
|----------|---------|
| `TifoTypes.sol` | Constants (`FACTION_COUNT = 48`, `NO_FACTION = 255`, `BPS = 10_000`) and gas-efficient custom errors |
| `PowerMath.sol` | Pure functions for decay calculation (hourly retention with 168-hour cap) and underdog bonus scaling |

### Core Contracts

| Contract | Purpose | Key Functions |
|----------|---------|---------------|
| `FactionRegistry.sol` | Maps wallets to factions. First join is free; switching costs a fee routed to WarChest | `joinFaction()`, `factionOf()`, `isEnrolled()` |
| `TerritoryMap.sol` | The heart of TIFO. 200 regions contested by 48 factions with decay, underdog bonus, and defection | `rally()`, `defect()`, `getMapState()`, `effectivePower()` |
| `WarChest.sol` | Collects the 2% protocol fee from every rally. Distributes prizes to winning factions at season settlement | `claim()`, `bumpContribTotal()` |
| `MatchOracle.sol` | Operator-controlled bridge from real match events to on-chain power surges | `pushMatchEvent()` (WHISTLE, GOAL, RED_CARD, FINAL) |
| `MockUSDT.sol` | ERC-20 with open `mint()` for testnet. Zero barrier to entry | `mint()`, `approve()` |

### Contract Wiring

Deployment wires the contracts into a closed loop:

```
WarChest.setMap(TerritoryMap)         -- chest reads territory state
WarChest.setUpdater(TerritoryMap)     -- rally() bumps claim denominator
TerritoryMap.transferOwnership(MatchOracle)  -- oracle can apply match boosts
```

After wiring, the deployer retains no admin privileges over the map -- only the MatchOracle can trigger surges.

---

## Core Mechanics

### 1. Decay

Every region's faction power decays by `retentionBps` (default 99%) per hour. After one day of inactivity, a region retains only ~78% of its power. After a week, virtually nothing remains. This creates a use-it-or-lose-it dynamic: territory must be actively defended.

```
effectivePower = storedPower * (retentionBps / 10000) ^ hoursSinceLastUpdate
```

The decay loop is capped at 168 iterations (one week) to bound gas costs.

### 2. Underdog Bonus

When a faction rallies a region where it is behind, each token committed is amplified:

```
bonus = min(maxUnderdogBps, (ownerPower - attackerPower) * maxUnderdogBps / ownerPower)
effectiveAmount = rawAmount * (10000 + bonus) / 10000
```

With `maxUnderdogBps = 5000`, a faction with zero power in a region gets +50% on every rally. This guarantees that no region is ever mathematically locked -- coordinated underdogs can always mount a comeback.

### 3. Defection

The social-game core. When a region flips from Faction A to Faction B, former Faction A contributors in that region face a choice: keep their stale contribution (which now earns them nothing) or defect to Faction B:

- **80%** of the stale contribution converts to fresh power for Faction B
- **20%** goes to the defector as a finder's reward (contribution credit under Faction B)

Defection is bounded: the contract iterates over 48 factions to find the caller's largest foreign contribution -- a constant-gas operation.

---

## OKX Ecosystem Integration

TIFO is built to be a native X Layer application, deeply integrated with the OKX ecosystem:

| Integration | How |
|------------|-----|
| **OKX Wallet** | First-class wallet connector via RainbowKit. Users connect, sign rallies, and manage factions directly from OKX Wallet |
| **X Layer Testnet** | All contracts deployed on chainId 195. The high-frequency rally pattern leverages X Layer's low gas costs |
| **OKLink Verification** | All contract source code verified on OKLink. The verifiability panel in the frontend links every territory event directly to its OKLink transaction page |
| **zkEVM Compatibility** | Contracts compiled with `evm_version = "paris"` (avoids PUSH0/Shanghai) for full X Layer zkEVM compatibility |

---

## Getting Started

### Prerequisites

- Node.js >= 18
- [Foundry](https://book.getfoundry.sh/getting-started/installation) (for smart contracts)

### Frontend

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the territory map.

### Smart Contracts

```bash
cd contracts

# Install Foundry dependencies
forge install

# Build contracts
forge build

# Run tests
forge test -vvv

# Deploy to X Layer Testnet
forge script script/Deploy.s.sol:Deploy \
  --rpc-url https://testrpc.xlayer.tech \
  --private-key $OPERATOR_PRIVATE_KEY \
  --broadcast -vvv
```

### Simulate Activity (Demo)

After deployment, run the war simulation to generate dense on-chain activity:

```bash
# Set environment variables with deployed addresses
export MOCK_USDT=<address>
export FACTION_REGISTRY=<address>
export TERRITORY_MAP=<address>
export MATCH_ORACLE=<address>

# Run simulation (20 fans, 10 rounds each = 200+ transactions)
forge script script/SimulateWar.s.sol:SimulateWar \
  --rpc-url https://testrpc.xlayer.tech \
  --private-key $OPERATOR_PRIVATE_KEY \
  --broadcast -vvv
```

---

## Contract Addresses (X Layer Testnet)

| Contract | Address |
|----------|---------|
| MockUSDT | `TBD` |
| FactionRegistry | `TBD` |
| TerritoryMap | `TBD` |
| WarChest | `TBD` |
| MatchOracle | `TBD` |

> Addresses will be populated in `contracts/deployments/xlayer-testnet.json` after deployment.

---

## How It Works -- 30-Second Demo

1. **Connect** OKX Wallet on X Layer Testnet
2. **Pick a faction** -- choose your nation (first join is free)
3. **Mint** testnet MockUSDT from the faucet
4. **Rally** -- tap a region on the map, commit tokens, and push your faction's power
5. **Watch** the map shift in real time as your faction gains (or loses) ground
6. **Defect** -- if your region gets captured, betray your old faction for a finder's reward
7. **Verify** -- click any event to see the on-chain transaction on OKLink

Every color change on the map is a verifiable X Layer transaction.

---

## License

MIT
