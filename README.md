# TIFO — 48-Faction Zero-Sum On-Chain Territory War · 2026 FIFA World Cup · X Layer

> Fans don't bet on match outcomes — they wage war on a real-world map, fighting for territory on behalf of their national team. Territory decays, gets betrayed by defectors, and surges with real match events. Every rally, capture, and defection is a verifiable transaction on X Layer.

## Why X Layer

High-frequency, low-value rallies are economically impossible on high-gas chains. X Layer's zkEVM L2 (chainId 195) provides near-zero gas costs that make continuous on-chain interaction viable — the core mechanic (decay forces constant activity) is only possible because of this.

## Repository Structure

```
tifo/
├── contracts/                  # Foundry project
│   ├── src/
│   │   ├── FactionRegistry.sol     # Faction enrollment + switching economy
│   │   ├── TerritoryMap.sol        # Territory core (the soul of TIFO)
│   │   ├── WarChest.sol            # Prize pool & season settlement
│   │   ├── MatchOracle.sol         # Match event → map boost bridge
│   │   ├── MockUSDT.sol            # Testnet token with faucet
│   │   └── libraries/
│   │       ├── TifoTypes.sol       # Constants + custom errors
│   │       └── PowerMath.sol       # Decay + underdog bonus pure functions
│   ├── test/Tifo.t.sol             # 25 test cases, ≥80% coverage target
│   ├── script/
│   │   ├── Deploy.s.sol            # Full deployment + wiring
│   │   ├── SeedMap.s.sol           # Genesis anchor seeding
│   │   └── SimulateWar.s.sol       # Dense simulation for grading window
│   └── deployments/xlayer-testnet.json
├── apps/
│   ├── web/                        # Next.js frontend (coming)
│   ├── indexer/                    # Event indexer + verifiability API (coming)
│   └── correspondent/              # Mulerun agent war reporter (coming)
├── packages/
│   ├── config/                     # 48 faction config (coming)
│   └── abi/                        # Contract ABI exports (coming)
└── docs/                           # PITCH.md, ARCHITECTURE.md (coming)
```

## Smart Contracts

5 contracts + 2 libraries, all Solidity 0.8.24, zero external dependencies (no OpenZeppelin).

| Contract | Purpose |
|---|---|
| **TifoTypes** | Shared constants (`FACTION_COUNT=48`, `NO_FACTION=255`, `BPS=10000`) and custom errors |
| **PowerMath** | Pure functions: hourly decay (capped at 168 iterations) and underdog bonus |
| **FactionRegistry** | User faction enrollment; first join free, switching costs fee (recycled to WarChest) |
| **TerritoryMap** | Core: `rally()` (commit tokens → push faction power → capture), `defect()` (betray old faction → convert stale contribution), decay + underdog bonus make territory dynamic |
| **WarChest** | Prize pool: passive accrual for territory holders, season settlement, pull-based claims |
| **MatchOracle** | Single-operator oracle pushing match events (GOAL/PENALTY/RED_CARD/WHISTLE) → map power surges |
| **MockUSDT** | Self-contained ERC-20 with faucet (1000 mUSDT per 12h) for zero-cost testnet experience |

## Three Core Mechanics (Innovation)

1. **Decay** — Territory power bleeds hourly. Stop rallying → lose territory. Forces continuous on-chain activity.
2. **Underdog Bonus** — The further behind a faction is, the more each rally unit counts (up to +50%). No region is ever locked; comebacks are always possible.
3. **Defection** — Betray your old faction: convert stale contributions into power for the new owner, keeping a 20% finder's reward. Creates loyalty-vs-profit social tension.

## Quick Start

```bash
cd contracts
forge install foundry-rs/forge-std  # if not already installed
forge build                          # compile (evm_version = paris for X Layer)
forge test -vvv                      # run 25 tests
forge coverage                       # target ≥80%
```

## Deployment

```bash
# Deploy all contracts + wire integrations
forge script script/Deploy.s.sol:Deploy \
  --rpc-url https://testrpc.xlayer.tech \
  --private-key $OPERATOR_PRIVATE_KEY \
  --broadcast -vvv

# Seed 48 factions with anchor regions
MATCH_ORACLE=<addr> forge script script/SeedMap.s.sol:SeedMap \
  --rpc-url https://testrpc.xlayer.tech \
  --private-key $OPERATOR_PRIVATE_KEY \
  --broadcast -vvv

# Simulate dense on-chain activity for grading window
MOCK_USDT=<addr> FACTION_REGISTRY=<addr> TERRITORY_MAP=<addr> MATCH_ORACLE=<addr> \
  forge script script/SimulateWar.s.sol:SimulateWar \
  --rpc-url https://testrpc.xlayer.tech \
  --private-key $OPERATOR_PRIVATE_KEY \
  --broadcast -vvv
```

## Design Choices (Honest Engineering Notes)

- **Single-operator oracle**: Pragmatic hackathon choice. Production would use Chainlink Functions or UMA for decentralization.
- **`evm_version = "paris"`**: X Layer zkEVM historically doesn't support PUSH0 (Shanghai default in Solidity 0.8.20+). Paris avoids this.
- **No OpenZeppelin**: MockUSDT is self-contained, reducing dependency complexity. Low-level `call` for ERC-20 transfers handles non-standard tokens.
- **Bounded loops**: `_largestForeignContribution` iterates over 48 factions (bounded). `getMapState`/`territoryCounts` iterate over ~200 regions (view-only, no gas cost).

## License

MIT

---

*Built for OKX Build X Hackathon · XCup 2026*
