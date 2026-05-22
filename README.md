# TIFO — 48-Faction Zero-Sum On-Chain Territory War · 2026 FIFA World Cup · X Layer

> Fans don't bet on match outcomes — they wage war on a real-world map, fighting for territory on behalf of their national team. Territory decays, gets betrayed by defectors, and surges with real match events. Every rally, capture, and defection is a verifiable transaction on X Layer.

*Built for OKX Build X Hackathon · XCup 2026 · Submission deadline 2026-05-28 23:59 UTC*

---

## Why X Layer

High-frequency, low-value rallies are the core mechanic — each user may submit dozens per session. On a high-gas L1 this would be economically impossible. X Layer's zkEVM L2 (chainId 195) provides sub-cent transaction costs that make TIFO's continuous territory war viable, turning the technical choice into a product requirement.

## Repository Structure

```
tifo/
├── contracts/                  # Foundry project (Solidity 0.8.24)
│   ├── src/
│   │   ├── FactionRegistry.sol     # Faction enrollment + switching economy
│   │   ├── TerritoryMap.sol        # Territory core (the soul of TIFO)
│   │   ├── WarChest.sol            # Prize pool & season settlement
│   │   ├── MatchOracle.sol         # Match event → map boost bridge
│   │   ├── MockUSDT.sol            # Testnet token with faucet
│   │   └── libraries/
│   │       ├── TifoTypes.sol       # Constants + custom errors
│   │       └── PowerMath.sol       # Decay + underdog bonus pure functions
│   ├── test/Tifo.t.sol             # 66 test cases, 99%+ source coverage
│   ├── script/
│   │   ├── Deploy.s.sol            # Full deployment + wiring
│   │   ├── SeedMap.s.sol           # Genesis anchor seeding (48 factions)
│   │   └── SimulateWar.s.sol       # Dense simulation for grading window
│   └── deployments/xlayer-testnet.json
├── apps/
│   ├── web/                        # Next.js frontend
│   ├── indexer/                    # Event indexer + verifiability API
│   └── correspondent/              # Mulerun agent war reporter
├── packages/
│   ├── config/                     # 48 faction config
│   └── abi/                        # Contract ABI exports
└── docs/                           # PITCH.md, ARCHITECTURE.md
```

## Smart Contracts

5 contracts + 2 libraries, all Solidity 0.8.24, **zero external dependencies** (no OpenZeppelin).

| Contract | Purpose |
|---|---|
| **TifoTypes** | Shared constants (`FACTION_COUNT=48`, `NO_FACTION=255`, `BPS=10000`) and 11 custom errors |
| **PowerMath** | Pure functions: hourly decay (capped at 168 iterations) and underdog bonus calculation |
| **FactionRegistry** | User faction enrollment; first join free, switching costs fee (recycled to WarChest) |
| **TerritoryMap** | Core engine: `rally()` (commit tokens → push faction power → capture), `defect()` (betray old faction → convert stale contribution), decay + underdog bonus make territory dynamic |
| **WarChest** | Prize pool: passive accrual for territory holders, season settlement, pull-based claims with `bumpContribTotal` wiring |
| **MatchOracle** | Single-operator oracle pushing match events (GOAL/PENALTY/RED_CARD/WHISTLE) → map power surges |
| **MockUSDT** | Self-contained ERC-20 with faucet (1000 mUSDT per 12h cooldown) for zero-cost testnet experience |

## Three Core Mechanics (Innovation)

1. **Decay** — Territory power bleeds hourly (`retentionBps = 9900`, 1% per hour). Stop rallying → lose territory. Forces continuous on-chain activity. Iteration capped at 168 hours to bound gas.
2. **Underdog Bonus** — The further behind a faction is, the more each rally unit counts (up to `maxUnderdogBps = 5000`, +50%). No region is ever locked; comebacks are always possible.
3. **Defection** — Betray your old faction: convert stale contributions into power for the new owner (80% conversion + 20% finder's reward). Creates loyalty-vs-profit social tension unique in hackathon SocialFi.

## Quick Start

```bash
cd contracts
forge install foundry-rs/forge-std  # if not already installed
forge build                          # compile (evm_version = paris for X Layer zkEVM)
forge test -vvv                      # run 66 tests (all green)
forge coverage                       # source coverage ≥99%
```

### Test Coverage

66 test cases covering all 5 contracts + 2 libraries. Scripts excluded from coverage (deployment-only).

| File | Lines | Statements | Branches | Functions |
|---|---|---|---|---|
| FactionRegistry.sol | 95.83% | 95.65% | 80.00% | 100% |
| MatchOracle.sol | 100% | 96.43% | 75.00% | 100% |
| MockUSDT.sol | 100% | 100% | 100% | 100% |
| TerritoryMap.sol | 99.06% | 99.24% | 94.74% | 100% |
| WarChest.sol | 100% | 97.53% | 86.67% | 100% |
| PowerMath.sol | 100% | 100% | 100% | 100% |
| **Total** | **99.17%** | **98.44%** | **90.38%** | **100%** |

## Deployed Contracts (X Layer Testnet)

All contracts deployed, wired, seeded, and **source-verified** on X Layer Testnet (chainId 195).

Explorer: [OKLink X Layer Testnet](https://www.oklink.com/xlayer-test)

| Contract | Address | Verified |
|---|---|---|
| MockUSDT | [`0x212E0207999B982b2F4B8f91cA421D94dc8438e3`](https://www.oklink.com/xlayer-test/address/0x212E0207999B982b2F4B8f91cA421D94dc8438e3) | Yes |
| WarChest | [`0x2E587e2E830D637B80e3a23db7001a92582f1352`](https://www.oklink.com/xlayer-test/address/0x2E587e2E830D637B80e3a23db7001a92582f1352) | Yes |
| FactionRegistry | [`0x80449696e9F2DBEBC7F154805320f49ae5aA6E23`](https://www.oklink.com/xlayer-test/address/0x80449696e9F2DBEBC7F154805320f49ae5aA6E23) | Yes |
| TerritoryMap | [`0x4987CFAF2CA1650887786C83746CcEC4d4941331`](https://www.oklink.com/xlayer-test/address/0x4987CFAF2CA1650887786C83746CcEC4d4941331) | Yes |
| MatchOracle | [`0x57E585543940cCfAB71141d84A419C3F7872d5be`](https://www.oklink.com/xlayer-test/address/0x57E585543940cCfAB71141d84A419C3F7872d5be) | Yes |

**Deployer:** `0xA01fb14B58BDB67A8f07977273f8a2cA04078542`

### Deployment Wiring

All integration points are closed in a single `Deploy.s.sol` transaction:

```
WarChest.map        → TerritoryMap  (chest reads territory state)
WarChest.updater    → TerritoryMap  (rally() auto-bumps claim denominator)
TerritoryMap.owner  → MatchOracle   (oracle can applyMatchBoost)
```

### Live On-Chain Data

| Metric | Value |
|---|---|
| Regions registered | 200 |
| Factions seeded | 48 (each with 1000e18 starting power) |
| Factions holding territory | 40 / 48 |
| Regions currently owned | 48 / 200 |
| Oracle events pushed | 55 (seeds + goal surges) |
| Simulated fans | 30 burner wallets |
| Rally rounds per fan | 5 |
| Goal surge events | 6 |
| Total on-chain transactions | 300+ (rallies, joins, captures, surges) |

**Top factions by territory:** NZL (4 regions), IRQ (3), ENG (2), CRO (2), JPN (2)

### Protocol Parameters

| Parameter | Value | Description |
|---|---|---|
| `retentionBps` | 9,900 | 1% power decay per hour |
| `maxUnderdogBps` | 5,000 | Up to +50% bonus for underdogs |
| `protocolBps` | 200 | 2% of each rally → WarChest |
| `switchFee` | 100 mUSDT | Cost to change factions |
| `passiveRatePerSecond` | 1e12 | Passive accrual for territory holders |
| `FAUCET_AMOUNT` | 1,000 mUSDT | Per faucet call |
| `FAUCET_COOLDOWN` | 12 hours | Between faucet calls |

## Deployment Commands

```bash
export OPERATOR_PRIVATE_KEY=<your-key>

# 1. Deploy all contracts + wire integrations
forge script script/Deploy.s.sol:Deploy \
  --rpc-url https://testrpc.xlayer.tech \
  --private-key $OPERATOR_PRIVATE_KEY \
  --broadcast -vvv

# 2. Seed 48 faction anchor regions
MATCH_ORACLE=<oracle-addr> \
  forge script script/SeedMap.s.sol:SeedMap \
  --rpc-url https://testrpc.xlayer.tech \
  --private-key $OPERATOR_PRIVATE_KEY \
  --broadcast -vvv

# 3. Simulate dense on-chain activity (run multiple batches)
MOCK_USDT=<addr> FACTION_REGISTRY=<addr> TERRITORY_MAP=<addr> MATCH_ORACLE=<addr> \
  SIM_FANS=10 ROUNDS=5 SIM_OFFSET=0 \
  forge script script/SimulateWar.s.sol:SimulateWar \
  --rpc-url https://testrpc.xlayer.tech \
  --private-key $OPERATOR_PRIVATE_KEY \
  --broadcast -vvv
```

## Design Choices (Honest Engineering Notes)

- **Single-operator oracle**: Pragmatic hackathon choice. Production would use Chainlink Functions or UMA for decentralization. Honestly labeled in code and docs.
- **`evm_version = "paris"`**: X Layer zkEVM historically doesn't support PUSH0 (Shanghai default in Solidity 0.8.20+). Paris avoids this — the most common deployment failure on zkEVM.
- **No OpenZeppelin**: MockUSDT is self-contained, all contracts use low-level `call` for ERC-20 transfers to handle non-standard tokens. Zero external dependencies = `forge build` with no extra remapping.
- **Bounded loops**: `_largestForeignContribution` iterates over 48 factions (bounded). `getMapState`/`territoryCounts` iterate over ~200 regions (view-only, no on-chain gas cost).
- **`bumpContribTotal` wiring**: TerritoryMap's `rally()` auto-mirrors contribution totals into WarChest via `try/catch` callback, making the dependency non-fatal. Deploy script sets `updater` to close this integration.
- **SimulateWar with `SIM_OFFSET`**: Allows incremental batches of simulation without colliding with previously registered fans.

## License

MIT

---

*Built for OKX Build X Hackathon · XCup 2026*
