# TIFO -- One-Page Pitch

## Problem

5 billion fans watch the World Cup. That passion has no on-chain expression.

Prediction markets reduce football to a binary "who wins?" question. Fan tokens are passive holdings with no gameplay. There is no protocol where supporting your nation is an active, contested, strategic act that plays out on a shared map visible to everyone.

## Solution

**TIFO** is a zero-sum territory war on a real-world map. 48 national factions compete for 200 regions by committing tokens (rallying). The map is alive: territory decays, gets flipped by defectors, and surges when real goals are scored.

This is not a prediction market. This is not staking. This is territorial warfare where every move is a verifiable on-chain transaction.

## Three Novel Mechanics

### 1. Decay -- Active Play Required

Territory power bleeds 1% per hour. Stop playing and you lose your land. Whales cannot buy and hold -- they must actively defend. This creates a use-it-or-lose-it dynamic that drives continuous engagement and transaction volume.

### 2. Underdog Bonus -- Comebacks Always Possible

The further behind your faction is in a region, the more each rally counts (up to +50%). No region is ever permanently locked. A coordinated underdog push can always flip even the most dominant territory. This prevents runaway winners and keeps every faction in the game.

### 3. Defection -- Social Betrayal as Game Mechanic

When a region is captured, previous contributors can defect to the new owner: 80% of their stale contribution converts to fresh power for the conqueror, and the defector keeps 20% as a reward. This is SocialFi's first betrayal mechanic -- it creates drama, accelerates map volatility, and generates organic social content ("X player defected from Brazil to Argentina!").

## Business Model

Every rally pays a 2% protocol fee to the WarChest. At season settlement, the WarChest distributes to faction members proportional to their contribution. The protocol earns from volume, not from users losing:

```
Daily volume target: 10,000 rallies x $5 avg = $50,000
Protocol revenue:    $50,000 x 2% = $1,000/day
```

Revenue scales linearly with engagement. Match events (goals, upsets) create volume spikes -- every goal is a monetization event.

## X Layer Advantage

TIFO's `rally()` is a high-frequency micro-transaction. A fan might rally 5-10 times during a single match, spending $1-5 each time. This requires:

- Sub-cent gas (X Layer zkEVM delivers ~0.001 USD per tx)
- Fast finality (map updates must feel instant)
- EVM compatibility (standard Foundry + wagmi toolchain)

X Layer is not just "a chain we picked" -- it is the only L2 where TIFO's unit economics work. On Ethereum mainnet, a $2 rally with a $5 gas fee makes no sense.

## Traction

- 5 smart contracts deployed and verified on X Layer Testnet (chainId 195)
- 200 contested map regions seeded with 48 faction anchors
- Simulation scripts generate 200+ dense transactions for demo review
- Full frontend: interactive D3-geo world map with real-time faction coloring
- OKX Wallet integrated as first-class connector

**Demo**: [localhost:3000](http://localhost:3000) (development) | Contract addresses in `contracts/deployments/xlayer-testnet.json`

## What Happens at Kickoff (June 11, 2026)

The protocol is production-ready. When the World Cup begins:

1. `MatchOracle` switches from simulation scripts to a live Football-Data API feed
2. Every real goal triggers `pushMatchEvent()` -- the map surges in real time
3. The mechanics are identical; only the data source changes

The dense simulation data visible during judging proves the system works at full load. Opening day simply swaps the input.

## Team

Built by a solo developer with Mulerun AI agents for rapid iteration. The entire codebase -- contracts, frontend, deployment scripts, and this documentation -- was produced in a single focused sprint.

---

*Built for OKX Build X Hackathon | XCup 2026 | X Layer Testnet*
