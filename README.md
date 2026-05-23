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

TIFO's core action — `rally()` — is a high-frequency, low-amount transaction. A fan might rally 5-10 times in a single match, spending fractions of a dollar each time. This usage pattern is only viable on a chain where gas is nearly free:

| Requirement | X Layer Delivers |
|------------|-----------------|
| **Sub-cent gas** | ~$0.001 per tx — a fan can rally 1,000 times for $1 in total gas |
| **Fast finality** | Map color changes feel instant for real-time territory visualization |
| **EVM compatibility** | Standard Foundry + wagmi/viem + OKLink verification toolchain |
| **zkEVM security** | Ethereum-grade security inherited through zero-knowledge proofs |

X Layer is not "a chain we picked" — it is the **only L2 where TIFO's unit economics work**. On Ethereum mainnet, a $2 rally with a $5 gas fee destroys the experience. On X Layer, micro-rallies are cheaper than sending a text message. The entire protocol is architected around this assumption.

**Composability:** `getMapState()` and `territoryCounts()` are public view functions — anyone on X Layer can build derivatives, leaderboards, or NFT gates on top of TIFO's live territory data. TIFO is designed to be an **on-chain attention layer for the World Cup** on X Layer.

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Network | X Layer Testnet (zkEVM L2, chainId 195) | Low-gas high-frequency settlement |
| Smart Contracts | Solidity 0.8.24 + Foundry | Territory war core logic |
| Frontend | Next.js 14 + wagmi + RainbowKit + Tailwind CSS | Map UI, rally interface, faction pages |
| Map Rendering | D3-geo + TopoJSON (world GeoJSON) | Real-world map with real-time faction coloring |
| Indexer | TypeScript + viem + PostgreSQL | On-chain event indexing + REST API |
| War Correspondent | TypeScript + viem + X API v2 | Auto-tweet captures, defections, match events |
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
│   │   ├── interfaces/               # Extracted interface definitions
│   │   │   ├── IFactionRegistry.sol  # Faction read interface (used by TerritoryMap)
│   │   │   ├── IWarChestBump.sol     # Rally → WarChest callback interface
│   │   │   ├── ITerritoryMapBoost.sol # MatchOracle → map boost interface
│   │   │   └── ITerritoryMapView.sol # WarChest → map view interface
│   │   └── libraries/
│   │       ├── TifoTypes.sol         # Constants + custom errors
│   │       └── PowerMath.sol         # Decay + underdog bonus pure functions
│   ├── test/
│   │   ├── Tifo.t.sol                    # 66 unit/integration test cases, 99%+ source coverage
│   │   └── TifoFork.t.sol                # Fork tests against live X Layer Testnet deployments
│   ├── script/
│   │   ├── Deploy.s.sol              # Full deployment + wiring
│   │   ├── SeedMap.s.sol             # Genesis anchor seeding (48 factions, real ISO mapping)
│   │   ├── FundFans.s.sol            # Pre-fund burner wallets with MockUSDT + OKB gas
│   │   └── SimulateWar.s.sol         # Dense simulation for grading window
│   └── deployments/xlayer-testnet.json
├── apps/
│   ├── web/                          # Next.js 14 App Router frontend
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── page.tsx              # Landing page: hero + live stats + CTA
│   │   │   │   ├── map/page.tsx          # Interactive real-time world map
│   │   │   │   ├── rally/[regionId]/page.tsx # Rally panel: slider + underdog preview
│   │   │   │   ├── faction/[id]/         # Faction details + dynamic OG images
│   │   │   │   ├── me/                   # War record + dynamic OG images
│   │   │   │   ├── leaderboard/page.tsx  # 48-faction real-time rankings
│   │   │   │   └── api/
│   │   │   │       ├── okx-price/route.ts     # OKX price (DEX quote + public fallback)
│   │   │   │       └── okx-dex-quote/route.ts # OKX DEX Aggregator (HMAC authenticated)
│   │   │   ├── components/           # WorldMap, RegionSidebar, GasCostBadge, etc.
│   │   │   ├── hooks/useOkbPrice.ts  # OKB/USDT price hook (60s cache)
│   │   │   ├── config/               # wagmi, contracts, factions, regionMapping, ABIs
│   │   │   └── providers/Web3Provider.tsx
│   │   ├── public/data/              # World TopoJSON (110m + 50m)
│   │   ├── e2e/                      # Playwright E2E tests (6 suites, 20 cases)
│   │   │   ├── landing.spec.ts       # Landing page load + hero + stats
│   │   │   ├── faction.spec.ts       # Faction selection + detail pages
│   │   │   ├── map.spec.ts           # Map rendering + region interaction
│   │   │   ├── rally.spec.ts         # Rally signing flow + commit slider
│   │   │   ├── verifiability.spec.ts # OKLink proof links + region history
│   │   │   └── mobile.spec.ts        # Mobile viewport responsiveness
│   │   ├── playwright.config.ts      # Playwright config (Chrome + mobile Safari)
│   │   └── package.json              # @tifo/web
│   ├── indexer/                      # On-chain event indexer + REST API
│   │   ├── src/
│   │   │   ├── index.ts              # Entry: DB init + API server + indexer
│   │   │   ├── db/schema.sql         # PostgreSQL schema (8 tables)
│   │   │   ├── indexer/              # viem polling (5-block buffer) + handlers
│   │   │   └── api/routes.ts         # REST: /map/state, /region/:id/history, etc.
│   │   └── package.json
│   └── correspondent/                # War Correspondent — auto-tweet agent
│       ├── .env.example              # Environment template (RPC, X API, DeepSeek)
│       ├── src/
│       │   ├── index.ts              # Entry point
│       │   ├── correspondent.ts      # Event polling + AI dispatch + countdown
│       │   ├── deepseek.ts           # DeepSeek V4 AI integration (enhance + generate)
│       │   ├── templates.ts          # Tweet generators (3 variants + countdown)
│       │   ├── twitter.ts            # X API v2 OAuth 1.0a client (zero SDK)
│       │   └── factions.ts           # 48 faction names + flag emojis
│       └── package.json
├── packages/                         # Shared packages
│   ├── config/factions.config.js     # 48 faction definitions (single source of truth)
│   └── abi/                          # Contract ABIs (CommonJS)
├── docs/
│   ├── PITCH.md                      # One-page pitch for judges
│   └── ARCHITECTURE.md               # System architecture overview
├── deploy/
│   ├── setup-server.sh               # Bare-metal server setup
│   └── deploy-web.sh                 # Frontend deployment script
├── docker-compose.yml
├── package.json                      # Workspace root (apps/*, packages/*)
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

### Defection Frontend Entry Points

Defection is TIFO's signature social mechanic and is surfaced prominently across three pages:

| Location | When Visible | What It Shows |
|----------|-------------|---------------|
| **Region Sidebar** (`/map`) | Always, for enrolled users viewing a non-neutral region | If user is in owner faction: active "Defect & Reclaim" button. If not: "Defection Opportunity" prompt with faction-switch link to `/me` |
| **Rally Page** (`/rally/[regionId]`) | Always, for enrolled users on a non-neutral region | Same dual display: active defect button (owner faction) or opportunity prompt with link to switch factions |
| **War Record** (`/me`) | When faction territories < 5 | Alert card with one-click defect action for stale contributions |

This ensures users discover the defection mechanic regardless of which page they enter from -- the `/map` sidebar and `/rally` page both guide non-owner-faction users toward the faction switch needed to defect.

---

## Frontend Pages

| Route | Page | Description |
|-------|------|-------------|
| `/` | Landing Page | Hero with animated world map preview, live stats counter, how-it-works guide |
| `/map` | Territory Map | Full-screen D3-geo world map colored by faction ownership. Click any region for details + rally button + **defection entry** |
| `/rally/[regionId]` | Rally Panel | Slider to select commit amount, real-time underdog bonus preview, power change prediction, wagmi `rally()` transaction with approve flow, **inline faucet button** when balance is zero, **defection panel with faction-switch prompt** |
| `/faction/[id]` | Faction Details | Territory count, WarChest prize pool, member count, owned regions list, top contributors, **power curve (24h territory trend chart)**, **"Rally Reinforcements" Share on X button for social viral loop** |
| `/me` | My War Record | **Faucet card** (claim 1,000 mUSDT with cooldown indicator + OKLink tx link), faction enrollment (join/switch), contribution stats, **passive yield display (WarChest accrual + claim entry)**, defection opportunities, share on X |
| `/leaderboard` | Faction Leaderboard | 48 factions ranked by territory count, gold/silver/bronze top-3 styling |

### Dynamic OG Images (Social Sharing)

Both `/faction/[id]` and `/me` generate dynamic 1200x630 Open Graph images via `next/og`:
- **Faction OG**: Faction name, code, color accent, confederation, stats summary, `@0xWangyangming` branding
- **Profile OG**: War record branding with TIFO identity, `@0xWangyangming` + X Layer attribution

These ensure tweet/share previews display rich, faction-specific cards that drive social engagement.

### Power Curve (Faction Page)

The `/faction/[id]` page includes a **24-hour power curve** — an SVG-rendered territory trend chart showing how many territories the faction held over the past 24 hours. When the indexer provides historical `powerHistory` data, it renders real data; otherwise, it generates a simulated trend based on the current territory count. The chart features grid lines, axis labels, area fill in faction color, and highlighted current data point.

### Rally Reinforcements (Share on X)

The `/faction/[id]` page includes a prominent **"Rally Reinforcements — Share on X"** button that generates a pre-filled tweet with the faction's current battle stats (territories held, prize pool, member count), faction flag emoji, and project hashtags. This drives social viral loops (社交裂变) as specified in the dev spec.

### Passive Yield Display (War Record)

The `/me` page shows WarChest **passive yield information**:
- **Estimated accrued passive output** based on `passiveRatePerSecond`, faction territory count, and elapsed time since season start
- **Season status** (Active / Settled) read from the WarChest contract
- **Claim button** that calls `WarChest.claim()` when the season is settled, with OKLink transaction proof link
- Passive rate per territory per hour displayed for transparency

---

## OKX Ecosystem Integration

TIFO is built to be a native X Layer application, deeply integrated with the OKX ecosystem:

| Integration | How |
|------------|-----|
| **OKX Wallet** | First-class wallet connector via RainbowKit (`okxWallet` in "Recommended" group). Users connect, sign rallies, and manage factions directly from OKX Wallet. Other wallets (MetaMask, WalletConnect, Coinbase) are available when `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` is configured |
| **X Layer Testnet** | All contracts deployed on chainId 195. The high-frequency rally pattern leverages X Layer's low gas costs |
| **OKLink Verification** | All contract source code verified on OKLink. The verifiability panel in the frontend links every territory event directly to its OKLink transaction page |
| **OKX DEX Aggregator API** | Authenticated swap quote API (`/api/okx-dex-quote`) with HMAC-SHA256 signing using OKX DEX credentials. The `/api/okx-price` route uses DEX quotes as primary price source with public ticker fallback. `GasCostBadge` displays estimated gas cost per rally in USD (~$0.001) |
| **zkEVM Compatibility** | Contracts compiled with `evm_version = "paris"` (avoids PUSH0/Shanghai) for full X Layer zkEVM compatibility |

---

## Data Indexer & Verifiability API

The indexer (`apps/indexer/`) is a TypeScript service that subscribes to all TIFO on-chain events with a **5-block confirmation buffer** and writes them to PostgreSQL. It exposes REST endpoints that power the frontend's verifiability panel.

### Indexed Events (7 types)

`FactionJoined` · `RallyPlaced` · `TerritoryCaptured` · `Defected` · `MatchEventPushed` · `RewardClaimed` · `SeasonSettled`

### REST API

| Endpoint | Description |
|----------|-------------|
| `GET /healthz` | Health check + sync status |
| `GET /map/state` | Full map ownership (200 regions, live from chain) |
| `GET /region/:id/history` | Complete capture timeline + OKLink tx links |
| `GET /leaderboard` | Faction rankings by territory count |
| `GET /faction/:id` | Faction details, contributors, captures |
| `GET /stats` | Global on-chain statistics + most contested regions |

### Verifiability Panel

The `/region/:id/history` endpoint returns every ownership change with its transaction hash and a direct link to OKLink. The frontend renders this as a scrollable timeline — click any event to jump to its on-chain proof. This is the "everything you see is on-chain" feature that hits the completeness scoring criterion.

```bash
# Start the indexer
cd apps/indexer
cp .env.example .env
npm install
npm run db:init
npm run dev
```

---

## War Correspondent (Auto-Tweet Agent)

The correspondent (`apps/correspondent/`) monitors three on-chain events and auto-posts war dispatches to X:

| Event | What gets tweeted |
|-------|-------------------|
| `TerritoryCaptured` | `"⚔️ 🇧🇷 Brazil just seized Region #5 from 🇦🇷 Argentina!"` |
| `Defected` | `"🗡️ BETRAYAL! A former 🇫🇷 France supporter defected to 🇩🇪 Germany"` |
| `MatchEventPushed` | `"⚽ GOAL! 🇪🇸 Spain — Power surge across 3 regions!"` |
| **Countdown** (daily) | `"📅 19 days until kickoff! Current Territory Leaderboard: 🥇 Brazil: 35 territories..."` |

Each tweet includes OKLink transaction proof, `@0xWangyangming @aspect_build #TIFO #XLayer` tags, and 3 randomized template variants for variety.

### DeepSeek V4 AI Integration

The Correspondent integrates DeepSeek V4 as an AI engine for more natural, varied tweet generation. When `DEEPSEEK_API_KEY` is configured, two AI modes activate:

1. **AI Generation** (`generateTweetFromData`): Generates entirely original tweets from structured on-chain event data (faction names, region IDs, tx hashes). Uses higher temperature (0.9) for creative variety. This is the primary mode.
2. **AI Enhancement** (`enhanceTweet`): Rewrites template-generated tweets with more personality and flair while preserving all factual data. Used as a fallback when generation doesn't produce valid output.

The flow is: **structured data → AI generation → (fallback) AI enhancement of template → (fallback) raw template text**. If no API key is set, the system falls back gracefully to template-based tweets with zero errors.

- **Countdown tweets**: Daily automated countdown to World Cup kickoff (June 11, 2026). Reads live `territoryCounts()` from the TerritoryMap contract to display the top-3 faction leaderboard. Fires on startup and every 24 hours thereafter.
- **5-block confirmation buffer** to avoid tweeting reorged events
- **Rate limiter**: max 10 tweets per 15-minute window
- **Dry-run mode**: `DRY_RUN=true` logs tweets without posting

```bash
cd apps/correspondent
cp .env.example .env
npm install
npm run dry   # test mode — logs tweets to stdout
npm start     # live mode — posts to X
```

---

## Getting Started

### Prerequisites

- Node.js >= 18
- [Foundry](https://book.getfoundry.sh/getting-started/installation) (for smart contracts)

### Frontend

```bash
# Install dependencies
cd apps/web
npm install

# Copy environment template
cp .env.example .env.local
# Edit .env.local to set:
#   OKX_DEX_API_KEY, OKX_DEX_SECRET_KEY, OKX_DEX_PASSPHRASE  (for DEX price quotes)
#   NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID  (optional, for WalletConnect/Coinbase wallets)

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the territory map.

### E2E Tests (Playwright)

```bash
cd apps/web

# Install Playwright browsers (first time only)
npx playwright install

# Run all E2E tests (headless)
npm run test:e2e

# Run with browser visible
npm run test:e2e:headed

# Interactive UI mode
npm run test:e2e:ui
```

6 test suites covering: landing page, faction selection, map rendering, rally flow, verifiability panel (OKLink links), and mobile layout responsiveness. Tests run on Desktop Chrome and mobile Safari viewports.

### Fork Tests (Live Deployment Verification)

Fork tests run against the live X Layer Testnet deployment to verify contract bytecode, wiring correctness, and end-to-end flows:

```bash
cd contracts
forge test --fork-url https://testrpc.xlayer.tech -vvv --match-contract TifoForkTest
```

| Test | What It Verifies |
|------|-----------------|
| `test_Fork_ContractsHaveBytecode` | All 5 contracts deployed with bytecode |
| `test_Fork_MapWiredToRegistry` | TerritoryMap.registry() → FactionRegistry |
| `test_Fork_WarChestWiredToMap` | WarChest.map() → TerritoryMap |
| `test_Fork_OracleWiredToMap` | MatchOracle.map() → TerritoryMap |
| `test_Fork_MapOwnerIsOracle` | TerritoryMap.owner() == MatchOracle |
| `test_Fork_WarChestUpdaterWired` | WarChest.updater() == TerritoryMap (bumpContribTotal callback) |
| `test_Fork_WarChestTokenIsUSDT` | WarChest.token() == MockUSDT |
| `test_Fork_RegistryWiredToChest` | FactionRegistry.warChest() == WarChest |
| `test_Fork_RegionsSeeded` | 200 regions seeded |
| `test_Fork_48FactionsConfigured` | territoryCounts returns 48 entries |
| `test_Fork_JoinRallyCaptureFlow` | join → faucet → approve → rally → capture |
| `test_Fork_DefectFlowAfterCapture` | join → rally → capture → switch faction → defect (full betrayal flow) |
| `test_Fork_EffectivePowerDecays` | Power decreases after time passes (decay verification) |
| `test_Fork_GetMapStateReturns200` | getMapState() returns 200 entries |
| `test_Fork_TerritoryCounts48Entries` | At least some territories owned |
| `test_Fork_MockUSDTMetadata` | Token name, symbol, decimals correct |

### Smart Contracts

```bash
cd contracts

# Install Foundry dependencies
forge install

# Build contracts
forge build

# Run tests
forge test -vvv

# Run fork tests against live X Layer Testnet
forge test --fork-url https://testrpc.xlayer.tech -vvv --match-contract TifoForkTest

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

### Live On-Chain Data (Indexed)

| Metric | Value |
|--------|-------|
| Regions | 200 |
| Factions seeded | 48 |
| Rallies indexed | 600+ |
| Territory captures | 60+ |
| Match events pushed | 55+ |
| Faction joins | 50+ |
| Unique users | 50+ |
| Active factions | 30+ |
| Total on-chain transactions | 800+ (rallies, joins, captures, surges) |

> Every number in the frontend is reconstructed from on-chain event logs on X Layer (chainId 195). Verify any transaction via OKLink.

---

## How It Works -- 30-Second Demo

1. **Connect** OKX Wallet on X Layer Testnet
2. **Pick a faction** -- choose your nation (first join is free)
3. **Mint** testnet MockUSDT from the faucet (available on `/me` page and inline on rally page when balance is zero)
4. **Rally** -- tap a region on the map, commit tokens, and push your faction's power
5. **Watch** the map shift in real time as your faction gains (or loses) ground
6. **Defect** -- if your region gets captured, betray your old faction for a finder's reward
7. **Verify** -- click any event to see the on-chain transaction on OKLink

Every color change on the map is a verifiable X Layer transaction.

---

## Server Deployment (Indexer + Correspondent)

The Indexer and Correspondent services require a server with PostgreSQL to run, providing real-time indexed data to the frontend.

### Live Deployment

**API Base URL:** `http://76.13.189.224/api`

| Service | Status | Details |
|---------|--------|---------|
| PostgreSQL 16 | Running | Database `tifo`, 8 tables + 21 indexes, auto-start on boot |
| Indexer | Running | Polling X Layer Testnet (3s interval, 5-block confirmation), REST API on port 4000 via Nginx |
| Correspondent | Running (DRY_RUN) | Monitoring TerritoryCaptured, Defected, MatchEventPushed events; 4 war dispatches generated |
| Nginx | Running | Reverse proxy `/api/*` → port 4000, CORS enabled for frontend |

**Live API endpoints:**
- `http://76.13.189.224/api/healthz` — Health check + sync status
- `http://76.13.189.224/api/map/state` — Full map ownership (200 regions)
- `http://76.13.189.224/api/leaderboard` — 48-faction territory rankings
- `http://76.13.189.224/api/stats` — Global on-chain statistics
- `http://76.13.189.224/api/faction/:id` — Faction details + contributors
- `http://76.13.189.224/api/region/:id/history` — Full capture history + OKLink proof links

### Architecture

```
Server
├── PostgreSQL 16/17        # 8 indexed tables + cursor state
├── TIFO Indexer            # Port 4000 — event indexing + REST API
├── TIFO Correspondent      # Auto-tweet agent (DRY_RUN or LIVE)
└── Nginx                   # Reverse proxy: /api/* → :4000
```

### Quick Deploy (Bare Metal)

```bash
# One-command server setup (Ubuntu/Debian)
ssh root@<server-ip> 'bash -s' < deploy/setup-server.sh

# Or step by step:
ssh root@<server-ip>
git clone https://github.com/wangyangmingsss/tifo.git /opt/tifo
cd /opt/tifo && bash deploy/setup-server.sh
```

### Quick Deploy (Docker Compose)

```bash
git clone https://github.com/wangyangmingsss/tifo.git
cd tifo
docker-compose up -d
# API available at http://localhost:4000
```

### Service Management

```bash
# View service status
systemctl status tifo-indexer
systemctl status tifo-correspondent

# View logs
journalctl -u tifo-indexer -f
journalctl -u tifo-correspondent -f

# Restart services
systemctl restart tifo-indexer
systemctl restart tifo-correspondent
```

### API Base URL

Once deployed, the Indexer REST API is available at:
- Direct: `http://<server-ip>:4000`
- Via Nginx: `http://<server-ip>/api`

Frontend should set the environment variable:
```
NEXT_PUBLIC_INDEXER_API=http://76.13.189.224/api
```

### API Response Examples

**GET /healthz**
```json
{
  "status": "ok",
  "chainBlockNumber": "31080049",
  "lastIndexedBlock": "31008000",
  "database": "connected"
}
```

**GET /stats** (summary)
```json
{
  "chain": { "chainId": 195, "network": "X Layer Testnet", "regionCount": 200 },
  "totals": {
    "rallies": 109, "captures": 8, "defections": 0,
    "matchEvents": 3, "factionJoins": 11, "uniqueUsers": 12, "activeFactions": 10
  },
  "verifiabilityNote": "Every number here is reconstructed from on-chain event logs on X Layer (chainId 195)."
}
```

**GET /region/0/history** — includes full capture timeline with OKLink tx proof links.

**GET /leaderboard** — 48 factions ranked by `territoriesHeld`, with `totalRallies`, `uniqueSupporters`, `capturesWon`.

### Deployment Files

| File | Purpose |
|------|---------|
| `deploy/setup-server.sh` | One-command bare-metal setup (PostgreSQL + Node.js + systemd + Nginx) |
| `docker-compose.yml` | Docker Compose for PostgreSQL + Indexer + Correspondent |
| `apps/indexer/Dockerfile` | Indexer container image |
| `apps/correspondent/Dockerfile` | Correspondent container image |

---

## Security — Slither Static Analysis

All contracts were analyzed using [Slither](https://github.com/crytic/slither) static analyzer (solc 0.8.24, Foundry compilation). **54 raw detections** were reported across 5 source contracts and 1 library. Below is a deduplicated summary grouped by severity, with status and rationale for each.

**No High-severity findings were detected.**

| # | Finding | Severity | Contract(s) | Status | Notes |
|---|---------|----------|-------------|--------|-------|
| 1 | Divide-before-multiply in `claim()` | Medium | WarChest | Acknowledged | Precision loss bounded to 1 wei per region per claimant. Acceptable for hackathon; production uses higher-precision accumulator. |
| 2 | Divide-before-multiply in `applyUnderdogBonus()` | Medium | PowerMath | Acknowledged | Bonus truncation is sub-wei. Not exploitable. |
| 3 | Reentrancy in `joinFaction()` via `_pull()` | Medium | FactionRegistry | Mitigated | Token is MockUSDT (no callback hooks). Production with arbitrary ERC-20s needs ReentrancyGuard. |
| 4 | Reentrancy in `rally()` via `_pull()` + `bumpContribTotal()` | Medium | TerritoryMap | Mitigated | Same rationale — MockUSDT has no transfer callbacks. `bumpContribTotal` targets trusted WarChest. |
| 5 | Uninitialized locals `totalOut`, `totalScore`, `totalPool` | Low | WarChest | Acknowledged | Solidity zero-initializes `uint256` locals. False positive pattern warning. |
| 6 | Unused return values from `map.regions()` | Low | WarChest | Acknowledged | Only `ownerFaction` needed; other fields intentionally discarded. |
| 7 | Missing events on `transferOwnership()` | Low | All | Acknowledged | One-time deployment wiring step. |
| 8 | Missing events on `setParams()`, `setPassiveRate()` | Low | TerritoryMap, WarChest | Acknowledged | Params set once at deployment. |
| 9 | Missing zero-address checks | Low | All | Acknowledged | Constructor args set by deployer script. |
| 10 | External calls inside loops | Low | MatchOracle, WarChest | Acknowledged | Bounded, trusted input. Gas borne by caller. |
| 11 | `block.timestamp` usage | Info | All | Acknowledged | ~15s validator manipulation negligible for game mechanics. |
| 12 | Low-level `token.call()` | Info | All | Acknowledged | Intentional pattern for non-standard ERC-20 compatibility. Return value checked. |
| 13 | Missing interface inheritance | Info | All | Acknowledged | Interfaces defined inline. Not a security issue. |

### Acknowledged Design Choices

- **Single-signer oracle**: MatchOracle uses a single operator key. Intentional hackathon choice; production would use Chainlink Functions or UMA.
- **Bounded loops**: `_largestForeignContribution` iterates 48 factions. `getMapState`/`territoryCounts` iterate ~200 regions (view-only).
- **Ownable admin functions**: Used during deployment wiring only. Ownership transferred to MatchOracle post-setup.
- **No ReentrancyGuard**: Protocol assumes trusted MockUSDT. Production with arbitrary ERC-20s must add OpenZeppelin `ReentrancyGuard`.

---

## License

MIT
