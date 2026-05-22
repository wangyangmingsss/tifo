# TIFO — 48-Faction Zero-Sum Territory War on X Layer

> **2026 FIFA World Cup · X Layer zkEVM · OKX Build X Hackathon**

TIFO turns World Cup fandom into an on-chain territory war. 48 national factions compete for control of a real-world map — every rally, capture, and defection is a verifiable transaction on X Layer.

## Core Mechanics

1. **Decay** — Idle territory bleeds power hourly. Stop rallying and you lose ground.
2. **Underdog Bonus** — The further behind a faction is, the more each rally counts. No region is ever locked.
3. **Defection** — Betray your old faction for the new owner's side: 80% power conversion + 20% finder's reward.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Network | X Layer Testnet (zkEVM L2, chainId 195) |
| Contracts | Solidity 0.8.24 + Foundry |
| Frontend | Next.js 14 + wagmi + RainbowKit + Tailwind |
| Map | D3-geo + World GeoJSON |
| Indexer | TypeScript + viem + PostgreSQL |
| Agent | MuleRun Correspondent (event → tweet) |
| Token | MockUSDT (faucet-enabled testnet token) |

## Repository Structure

```
tifo/
├── contracts/              # Foundry project
│   ├── src/
│   │   ├── FactionRegistry.sol
│   │   ├── TerritoryMap.sol
│   │   ├── WarChest.sol
│   │   ├── MatchOracle.sol
│   │   ├── MockUSDT.sol
│   │   └── libraries/
│   │       ├── TifoTypes.sol
│   │       └── PowerMath.sol
│   ├── test/Tifo.t.sol     # 25 test cases, ≥80% coverage
│   ├── script/
│   │   ├── Deploy.s.sol
│   │   ├── SeedMap.s.sol
│   │   └── SimulateWar.s.sol
│   └── deployments/
├── apps/
│   ├── web/                # Next.js frontend
│   ├── indexer/            # Event indexer + verifiability API
│   └── correspondent/      # MuleRun agent
├── packages/
│   ├── config/             # 48 faction config
│   └── abi/                # Contract ABIs
└── docs/
```

## Smart Contracts

| Contract | Purpose |
|----------|---------|
| `MockUSDT` | ERC-20 test token with faucet (1000 mUSDT / 12h cooldown) |
| `FactionRegistry` | Join/switch factions; switching costs a fee routed to WarChest |
| `TerritoryMap` | Core territory engine: rally, decay, underdog bonus, defection |
| `WarChest` | Prize pool, passive accrual, season settlement, pull-based claims |
| `MatchOracle` | Single-signer oracle pushing match events (GOAL/PENALTY/RED_CARD/WHISTLE) |
| `PowerMath` | Pure math library: hourly decay + underdog bonus |
| `TifoTypes` | Shared constants (48 factions, NO_FACTION=255) + custom errors |

## Build & Test

```bash
cd contracts
forge build
forge test -vvv        # 25 tests, all green
forge coverage         # Source contracts ≥80% line coverage
```

## Deploy to X Layer Testnet

```bash
export OPERATOR_PRIVATE_KEY=<your-key>

# 1. Deploy all contracts + wire them together
forge script script/Deploy.s.sol:Deploy \
  --rpc-url https://testrpc.xlayer.tech \
  --private-key $OPERATOR_PRIVATE_KEY \
  --broadcast -vvv

# 2. Seed 48 faction anchor regions
export MATCH_ORACLE=<oracle-address>
forge script script/SeedMap.s.sol:SeedMap \
  --rpc-url https://testrpc.xlayer.tech \
  --private-key $OPERATOR_PRIVATE_KEY \
  --broadcast -vvv

# 3. Simulate dense on-chain activity
export MOCK_USDT=<addr> FACTION_REGISTRY=<addr> TERRITORY_MAP=<addr> MATCH_ORACLE=<addr>
forge script script/SimulateWar.s.sol:SimulateWar \
  --rpc-url https://testrpc.xlayer.tech \
  --private-key $OPERATOR_PRIVATE_KEY \
  --broadcast -vvv
```

## Why X Layer

High-frequency, low-value rallies are the core mechanic — each user may submit dozens per session. On a high-gas L1 this would be economically impossible. X Layer's zkEVM L2 provides sub-cent transaction costs that make TIFO's continuous territory war viable, turning the technical choice into a product requirement.

## Deployed Contracts (X Layer Testnet)

| Contract | Address |
|----------|---------|
| MockUSDT | [`0x243549dBe315Bb930F2D32eBB7F883eEF123D110`](https://www.oklink.com/xlayer-test/address/0x243549dBe315Bb930F2D32eBB7F883eEF123D110) |
| WarChest | [`0x4941FF4271a4AF1b834b853AA5dEC4254295eb30`](https://www.oklink.com/xlayer-test/address/0x4941FF4271a4AF1b834b853AA5dEC4254295eb30) |
| FactionRegistry | [`0xfA0ad3bc7D00D1035Ed6333E5bb6e44E8f4F8c78`](https://www.oklink.com/xlayer-test/address/0xfA0ad3bc7D00D1035Ed6333E5bb6e44E8f4F8c78) |
| TerritoryMap | [`0x265F465eb1828853990DDACA6121C70E67dD025a`](https://www.oklink.com/xlayer-test/address/0x265F465eb1828853990DDACA6121C70E67dD025a) |
| MatchOracle | [`0x2EBD2f3B32544B9FDE1d95B7F40a103cd69F6Ab9`](https://www.oklink.com/xlayer-test/address/0x2EBD2f3B32544B9FDE1d95B7F40a103cd69F6Ab9) |

All contracts deployed on X Layer Testnet (chainId 195) with 200 regions initialized, 48 factions seeded, and dense simulation data on-chain.

## Design Decisions

- **Single-signer oracle**: Pragmatic hackathon choice. Production would use Chainlink Functions or UMA. Documented honestly.
- **`evm_version = "paris"`**: X Layer zkEVM historically doesn't support PUSH0 (Shanghai). Using Paris ensures compatibility.
- **No OpenZeppelin**: MockUSDT is self-contained to minimize dependencies and keep `forge build` clean.
- **Bounded loops**: `_largestForeignContribution` iterates 48 factions (bounded). `decay` caps at 168 hours. `getMapState` iterates regions (view-only, no on-chain gas).

## License

MIT
