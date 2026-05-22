# TIFO — 48-Faction Zero-Sum On-Chain Territory War · 2026 FIFA World Cup · X Layer

**Built for OKX Build X Hackathon | XCup 2026 | X Layer Testnet (chainId 195)**

> Fans don't bet on match outcomes — they wage war on a real-world map, fighting for territory on behalf of their national team. Territory decays, gets betrayed by defectors, and surges with real match events. Every rally, capture, and defection is a verifiable transaction on X Layer.

*Submission deadline 2026-05-28 23:59 UTC*

---

## The Problem

Billions of fans cheer for their national teams every four years, but that passion has no on-chain expression. Prediction markets reduce football to "who wins?" — a binary outcome that ignores the living drama of 90 minutes. Existing fan tokens are static holdings with no gameplay. There is no protocol where supporting your nation is an active, contested, strategic act.

## The Solution

TIFO is a shared, contested world map where 48 World Cup factions wage continuous territory war. Each of the 200 map regions is owned by whichever faction has the most power in it. Power comes from fans committing tokens (rallying), but three novel mechanics ensure the game never stagnates:

1. **Decay** — Territory power bleeds 1% per hour. Stop playing and you lose your land. This forces continuous on-chain engagement; idle whales cannot hold territory.
2. **Underdog Bonus** — The further behind your faction is in a region, the more each rally counts (up to +50%). No region is ever permanently locked. Comebacks are always possible.
3. **Defection** — Betray your old faction: convert stale contributions into power for the new owner (80% conversion + 20% finder's reward). Creates loyalty-vs-profit social tension unique in hackathon SocialFi.

Every goal, red card, and final whistle from the real World Cup is pushed on-chain through the MatchOracle, triggering faction-wide power surges that reshape the entire map in seconds.

---

## Why X Layer

TIFO's core action — `rally()` — is a high-frequency, low-amount transaction. A fan might rally 5-10 times in a single match, spending fractions of a dollar each time. This usage pattern demands:

- **Cheap gas**: Sub-cent transaction costs so micro-rallies are economically viable
- **Fast finality**: Map updates must feel instant for the real-time territory visualization
- **EVM compatibility**: Foundry toolchain, wagmi/viem frontend stack, OKLink verification — all work out of the box
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

## Repository Structure

```
tifo/
├── contracts/                    # Foundry project (Solidity 0.8.24)
│   ├── src/
│   │   ├── TerritoryMap.sol          # Territory core (the soul of TIFO)
│   │   ├── FactionRegistry.sol       # Faction enrollment + switching economy
│   │   ├── WarChest.sol              # Prize pool & season settlement
│   │   ├── MatchOracle.sol           # Match event → map boost bridge
│   │   ├── MockUSDT.sol              # Testnet token with faucet
│   │   └── libraries/
│   │       ├── TifoTypes.sol         # Constants + custom errors
│   │       └── PowerMath.sol         # Decay + underdog bonus pure functions
│   ├── test/Tifo.t.sol               # 66 test cases, 99%+ source coverage
│   ├── script/
│   │   ├── Deploy.s.sol              # Full deployment + wiring
│   │   ├── SeedMap.s.sol             # Genesis anchor seeding (48 factions)
│   │   └── SimulateWar.s.sol         # Dense simulation for grading window
│   └── deployments/xlayer-testnet.json
├── src/                          # Next.js 14 App Router frontend
│   ├── app/
│   │   ├── page.tsx                  # Landing page: hero + live stats + CTA
│   │   └── map/page.tsx              # Interactive real-time world map
│   ├── components/
│   │   ├── WorldMap.tsx              # D3-geo + TopoJSON map with faction coloring
│   │   ├── WorldMapPreview.tsx       # Mini map preview for homepage hero
│   │   ├── RegionSidebar.tsx         # Region detail panel + rally button + capture history
│   │   ├── MapLegend.tsx             # Faction territory leaderboard overlay
│   │   ├── StatsCounter.tsx          # Animated counter with IntersectionObserver
│   │   └── Navbar.tsx                # Navigation + RainbowKit wallet connect
│   ├── config/
│   │   ├── factions.ts               # 48 faction definitions (colors, names, anchors)
│   │   ├── contracts.ts              # Contract addresses + chain config + OKLink helpers
│   │   ├── regionMapping.ts          # ISO 3166-1 → region ID mapping (177 countries)
│   │   ├── wagmi.ts                  # Wagmi/RainbowKit provider config
│   │   └── abi/                      # Contract ABIs (TerritoryMap, FactionRegistry, MockUSDT)
│   └── providers/
│       └── Web3Provider.tsx          # WagmiProvider + QueryClient + RainbowKit
├── public/
│   └── data/
│       ├── countries-110m.json       # World TopoJSON (overview, 177 countries)
│       └── countries-50m.json        # World TopoJSON (detail, 241 countries)
├── docs/
│   ├── PITCH.md                      # One-page pitch for judges
│   └── ARCHITECTURE.md              # System architecture overview
└── README.md
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

All contracts are deployed and **source-verified** on OKLink.

| Contract | Address | Verified |
|----------|---------|----------|
| MockUSDT | [`0x212E0207999B982b2F4B8f91cA421D94dc8438e3`](https://www.oklink.com/xlayer-test/address/0x212E0207999B982b2F4B8f91cA421D94dc8438e3) | Yes |
| WarChest | [`0x2E587e2E830D637B80e3a23db7001a92582f1352`](https://www.oklink.com/xlayer-test/address/0x2E587e2E830D637B80e3a23db7001a92582f1352) | Yes |
| FactionRegistry | [`0x80449696e9F2DBEBC7F154805320f49ae5aA6E23`](https://www.oklink.com/xlayer-test/address/0x80449696e9F2DBEBC7F154805320f49ae5aA6E23) | Yes |
| TerritoryMap | [`0x4987CFAF2CA1650887786C83746CcEC4d4941331`](https://www.oklink.com/xlayer-test/address/0x4987CFAF2CA1650887786C83746CcEC4d4941331) | Yes |
| MatchOracle | [`0x57E585543940cCfAB71141d84A419C3F7872d5be`](https://www.oklink.com/xlayer-test/address/0x57E585543940cCfAB71141d84A419C3F7872d5be) | Yes |

**Deployer:** `0xA01fb14B58BDB67A8f07977273f8a2cA04078542`

### Live On-Chain Data

| Metric | Value |
|--------|-------|
| Regions | 200 |
| Factions seeded | 48 |
| Rally rounds per fan | 5 |
| Total on-chain transactions | 300+ (rallies, joins, captures, surges) |

> Every number in the frontend is verifiable on X Layer. Click any event to jump to its OKLink transaction page.

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
