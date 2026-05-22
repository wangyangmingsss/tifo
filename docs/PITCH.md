# TIFO — One-Page Pitch

> **48-Faction Zero-Sum On-Chain Territory War · 2026 FIFA World Cup · X Layer**

---

## The Problem

5 billion fans watch the World Cup. Their passion generates countless social media posts, heated debates, and collective identity — but none of it is ownable, verifiable, or economically meaningful on-chain.

Prediction markets reduce football to binary "who wins?" outcomes. Fan tokens are passive holdings with zero gameplay. There is no protocol where supporting your nation is an **active, contested, strategic act** visible on a shared map.

## The Solution

**TIFO** turns World Cup fandom into a zero-sum territory war on a real-world map. 48 national factions compete for 200 map regions by committing tokens (**rallying**). The map is never static — territory decays, gets flipped by defectors, and surges when real goals are scored on-chain.

This is not prediction. This is not staking. This is territorial warfare where **every move is a verifiable X Layer transaction**.

## Three Novel Mechanics

| Mechanic | What It Does | Why It Matters |
|----------|-------------|----------------|
| **Decay** | Power bleeds 1%/hour. Stop playing → lose your land. | Forces continuous engagement. Whales can't buy-and-hold. |
| **Underdog Bonus** | The further behind you are, the more each rally counts (+50% max). | No region is ever locked. Comebacks are always possible. |
| **Defection** | Betray your old faction: 80% converts to new owner's power, 20% is your reward. | SocialFi's first betrayal mechanic. Creates drama, memes, and organic content. |

These three mechanics together break the "whoever spends most wins" criticism. They produce real strategic depth: consolidate vs. expand, attack loudly vs. defend quietly, stay loyal vs. defect for profit.

## Revenue Model

Every `rally()` pays 2% to the **WarChest**. At season settlement, the WarChest distributes to winning factions proportional to contribution. The protocol earns from volume, not from users losing:

```
Daily volume target:  10,000 rallies × $5 avg = $50,000
Protocol revenue:     $50,000 × 2%             = $1,000/day
```

Revenue scales linearly with engagement. Every goal is a monetization event — it triggers `pushMatchEvent()`, which surges the map and drives a wave of rallies.

## Why X Layer — Not Just "A Chain We Picked"

TIFO's `rally()` is a high-frequency micro-transaction. A fan might rally 5–10 times during a single match, spending $1–5 each time.

| Requirement | X Layer Delivers |
|------------|-----------------|
| Sub-cent gas | ~$0.001 per tx — micro-rallies are economically viable |
| Fast finality | Map updates feel instant for real-time visualization |
| EVM compatibility | Standard Foundry + wagmi/viem + OKLink toolchain |
| zkEVM security | Ethereum-grade security via zero-knowledge proofs |

On Ethereum mainnet, a $2 rally with $5 gas makes no sense. On X Layer, a fan can rally 50 times for less than a cent in gas. **The product is only possible because the chain is cheap enough.**

## What's Built (Completeness)

| Component | Status |
|-----------|--------|
| 5 smart contracts + 2 libraries | Deployed & source-verified on OKLink |
| 200 contested regions, 48 faction anchors | Seeded on-chain |
| SimulateWar script | 300+ dense transactions for judging window |
| Next.js 14 frontend | Interactive D3-geo world map, rally panel, faction pages, leaderboard |
| OKX Wallet integration | First-class connector via RainbowKit |
| Event Indexer | viem + PostgreSQL, 7 event types, 5 REST endpoints |
| Verifiability panel | Click any region → full capture history → direct OKLink tx links |
| War Correspondent agent | Auto-tweet captures, defections, match events to X |
| Dynamic OG images | Faction + profile cards for social sharing |

## On-Chain Verifiability

The entire map state is **reconstructable from event logs alone**. `rally()` emits `RallyPlaced` with raw amount, effective power, and new faction total. Combined with `TerritoryCaptured` and `Defected`, every pixel on the map traces back to a transaction.

The frontend verifiability panel lets judges click any region → see the complete ownership timeline → jump to OKLink for each transaction. "Everything you see is on-chain" is not a claim — it's a clickable proof.

## What Happens at Kickoff (June 11, 2026)

The protocol is production-ready. When the World Cup begins:

1. `MatchOracle` switches from simulation scripts to a live Football-Data API feed
2. Every real goal triggers `pushMatchEvent()` — the map surges in real time
3. The War Correspondent auto-tweets every capture and goal surge
4. The mechanics are identical; only the data source changes

The dense simulation data visible during judging proves the system works at full load. Opening day simply swaps the input.

## Composability — TIFO as an X Layer Primitive

`getMapState()` and `territoryCounts()` are public view functions. Anyone on X Layer can build on top of TIFO's live territory data:

- Derivative betting on faction territory counts
- NFT minting gated by faction membership
- Leaderboard integrations for other World Cup dApps

TIFO is not just a game — it's **an on-chain attention layer for the World Cup**, deployable as infrastructure.

## Team

Built by a solo developer with Mulerun AI agents for rapid iteration. The entire codebase — contracts, frontend, indexer, correspondent, deployment scripts, and documentation — was produced in a focused sprint.

---

*Built for OKX Build X Hackathon · XCup 2026 · X Layer Testnet (chainId 195)*

**Contracts:** [OKLink verified](https://www.oklink.com/xlayer-test/address/0x4987CFAF2CA1650887786C83746CcEC4d4941331) · **X:** [@0xWangyangming](https://x.com/0xWangyangming) · **Repo:** [github.com/wangyangmingsss/tifo](https://github.com/wangyangmingsss/tifo)
