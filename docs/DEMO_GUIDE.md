# TIFO - 2026 World Cup On-Chain Territory War | Demo Guide

> **Website**: http://76.13.189.224/
> **Chain**: X Layer Testnet (Chain ID: 1952)
> **Token**: MockUSDT (mUSDT, free to claim via faucet)

---

## 1. Prerequisites

### 1.1 Install Wallet

- Recommended: **OKX Wallet** (first-class support in this project)
- Also supports MetaMask and other wallets via RainbowKit
- Download OKX Wallet browser extension: https://www.okx.com/web3

### 1.2 Add X Layer Testnet

The wallet will prompt you to add the network when you connect. Manual configuration:

| Parameter | Value |
|-----------|-------|
| Network Name | X Layer Testnet |
| RPC URL | https://testrpc.xlayer.tech |
| Chain ID | 1952 |
| Currency Symbol | OKB |
| Block Explorer | https://www.oklink.com/xlayer-test |

### 1.3 Get Test OKB (Gas)

You need a small amount of test OKB to pay for gas fees. X Layer Testnet gas costs are extremely low (~$0.001 per transaction).

---

## 2. Page-by-Page Walkthrough

### 2.1 Landing Page (`/`)

The homepage introduces the project concept:

- **Title**: "TIFO — 2026 World Cup On-Chain Territory War"
- **Subtitle**: "48 nations. 200 regions. One map. Every rally is an on-chain transaction."
- **Live Stats Panel**: Animated counters showing Total Rallies, Total Captures, Active Factions, Unique Users (auto-refreshes every 30 seconds)
- **Call-to-Action Buttons**:
  - **"Choose Your Nation"** — navigates to the map page
  - **"View Leaderboard"** — navigates to the leaderboard
- **How It Works**: 4-step guide (Connect & Choose → Rally → Conquer → Defect)
- **Game Mechanics Cards**:
  - **Decay** — Territory power bleeds 1% per hour; idle regions are lost
  - **Underdog Bonus** — Losing factions get up to +50% rally amplification
  - **Defection** — Switch sides and convert old contributions (80% power + 20% finder's reward)

---

### 2.2 Connect Wallet

1. Click the **"Connect Wallet"** button in the top-right corner of the navigation bar
2. Select your wallet (OKX Wallet, MetaMask, etc.)
3. Approve the connection in the wallet popup
4. If you are not on X Layer Testnet, a **"Wrong Network"** warning will appear — switch networks in your wallet

Once connected, your wallet address and chain icon appear in the top-right corner.

---

### 2.3 My Profile Page (`/me`)

This page has three states depending on your status:

#### State 1: Not Connected
- Shows "Connect Your Wallet" message with instructions

#### State 2: Connected but Not Enrolled
- Displays **"Choose Your Faction"** with a grid of 48 nation buttons
- Each button shows: flag + 3-letter FIFA code + Chinese name (e.g. Argentina ARG)
- **Wrong Network warning** appears if not on X Layer Testnet (Chain ID: 1952)

**How to join a faction:**
1. Click on your chosen nation's button
2. A wallet popup appears — click confirm to sign the transaction
3. Wait for on-chain confirmation (a few seconds)
4. A confirmation message appears with an OKLink explorer link
5. Page refreshes to show your profile dashboard

> First join is **free** (gas only). Switching factions later costs **100 mUSDT**.

#### State 3: Enrolled — Profile Dashboard
- **My Faction**: Flag + name + Chinese name with colored accent bar
- **MockUSDT Balance**: Large monospace display of your current balance
  - **"Claim 1000 mUSDT"** button — claim free test tokens (12-hour cooldown)
  - Shows current allowance for TerritoryMap contract
- **War Record**: Wallet address (truncated) and Faction ID
- **Defection Info Card**: Explains defection mechanic with "Explore Map" link
- **Share on X**: Pre-filled tweet to recruit others

---

### 2.4 Claim Test Tokens (Faucet)

On the My Profile page after joining a faction:

1. Find the **"MockUSDT Balance"** section
2. Click **"Claim 1000 mUSDT"**
3. Confirm the transaction in your wallet
4. After confirmation, balance updates to show 1000 mUSDT

**Limits**: 1000 mUSDT per claim, once every 12 hours.

---

### 2.5 Territory Map (`/map`)

An interactive world map built with D3-geo showing 200 contestable regions:

- Each region is colored by the faction that currently controls it
- Supports **zoom** (scroll) and **pan** (drag) interactions
- Data auto-refreshes every 15 seconds from the indexer API, with on-chain fallback

**How to use:**
1. Navigate to the Map page
2. Browse the territory distribution
3. **Click any region** — a sidebar slides in showing:
   - Region number and current controlling faction
   - Power bars for each faction in that region
   - Capture history
   - **"Rally"** button to enter the rally page
   - **"Defect"** entry if defection opportunities exist

---

### 2.6 Rally / Bet (Core Gameplay) (`/rally/[regionId]`)

Rally is the primary action — commit mUSDT to boost your faction's power in a region.

1. From the map, click a region then click **"Rally"**
2. The Rally panel shows:
   - Current region info and ownership status
   - **Amount slider** — choose how much mUSDT to commit
   - **Underdog Bonus preview** — shows amplification % if your faction is weaker
   - **Power Change prediction** — preview the effect of your rally
3. Drag the slider to set your rally amount
4. If balance is zero, an **inline faucet** button appears
5. **First time**: Click **"Approve"** to authorize the TerritoryMap contract to spend your mUSDT → confirm in wallet
6. After approval, click **"Rally"** → confirm in wallet
7. If your faction's power exceeds the current owner → **Territory Capture** occurs
   - Otherwise, your faction's power in that region increases

**Economics:**
- 2% of each rally goes to the WarChest prize pool
- Underdog factions get up to +50% power amplification
- Power decays 1% per hour — continuous rallying is needed to hold territory

---

### 2.7 Defection

Available from the Rally page or map sidebar when your faction has stale contributions in a region that changed hands:

- **80%** of your old contribution converts to power for the new controlling faction
- **20%** goes to you as a finder's reward (credited under your new faction)
- This is a strategic move to consolidate territory control

---

### 2.8 Leaderboard (`/leaderboard`)

Displays all 48 factions ranked by territorial dominance:

- **Top 3** shown with gold / silver / bronze badges
- **Search bar**: Filter by name, Chinese name, or FIFA code
- **Sortable columns** (click column header to sort):

| Column | Description |
|--------|-------------|
| Rank | Current ranking position |
| Faction | Flag + nation name |
| Territories | Number of regions currently held |
| Rallies | Total rally transactions for this faction |
| Supporters | Unique wallet addresses that rallied |
| Captures | Number of territory captures won |

- Data auto-refreshes every 30 seconds
- **Click any row** to navigate to that faction's detail page

---

### 2.9 Faction Detail Page (`/faction/[id]`)

Accessed by clicking a faction in the leaderboard. Shows:

- **Header**: Large flag, faction name (English + Chinese), confederation badge, Recruit (copy link) button
- **Stats Grid** (6 cards):
  - Territories Held — from on-chain data
  - Prize Pool — from WarChest contract (in mUSDT)
  - Members — from FactionRegistry contract
  - Total Rallies — from indexed data
  - Regions Rallied — unique regions this faction has rallied in
  - Captures Won — number of recent territory captures
- **Recent Captures**: List of captured regions with links to OKLink for on-chain verification
- **Top Contributors**: Ranked by total mUSDT contributed, showing wallet address (truncated), rally count, and total contribution amount

---

## 3. Recommended Demo Flow

```
Step 1: Landing Page
  Walk through the project concept, live stats, and game mechanics

Step 2: Connect Wallet
  OKX Wallet → Switch to X Layer Testnet

Step 3: Join a Faction (/me)
  Select a national team → Sign the on-chain transaction

Step 4: Claim Test Tokens (/me)
  Click "Claim 1000 mUSDT" → Confirm transaction

Step 5: Explore the Map (/map)
  Browse territory distribution → Click regions to view details

Step 6: Rally on a Region
  Select target region → Set amount → Approve → Rally

Step 7: Observe Territory Changes
  Refresh the map to see if ownership flipped

Step 8: Check the Leaderboard (/leaderboard)
  Verify faction ranking changes → Click into faction details

Step 9: Review Profile (/me)
  Confirm contribution data is updated
```

---

## 4. Feature Status

| Feature | Status | Description |
|---------|--------|-------------|
| Landing Page | Implemented | Project intro, live stats, game mechanics |
| Wallet Connection | Implemented | OKX Wallet priority, RainbowKit multi-wallet support |
| Join Faction | Implemented | 48 national teams, on-chain enrollment |
| Switch Faction | Implemented | 100 mUSDT fee to WarChest |
| Faucet | Implemented | 1000 mUSDT per 12 hours |
| Territory Map | Implemented | D3-geo world map, real-time coloring, zoom/pan |
| Rally | Implemented | Amount slider, Approve + Rally two-step transaction |
| Territory Capture | Implemented | Power exceeds owner → flip, recorded on-chain |
| Underdog Bonus | Implemented | Up to +50% rally amplification for weaker factions |
| Decay | Implemented | 1% power loss per hour, 168-hour cap |
| Defection | Implemented | 80/20 power conversion |
| Leaderboard | Implemented | 48 factions, sortable, searchable, 30s auto-refresh |
| Faction Detail | Implemented | Stats, recent captures, top contributors |
| Region History | Implemented | Full capture/rally/defection timeline with OKLink links |
| OKLink Verification | Implemented | All transactions link to OKLink block explorer |
| Dynamic OG Images | Implemented | Social sharing cards for faction and profile pages |
| Share on X | Implemented | One-click tweet with faction war record |
| Event Indexer | Implemented | PostgreSQL, 7 event types, REST API |
| War Correspondent | Implemented | Auto-tweet agent (DRY_RUN mode) |

---

## 5. Smart Contract Addresses (X Layer Testnet)

| Contract | Address |
|----------|---------|
| MockUSDT | `0x212E0207999B982b2F4B8f91cA421D94dc8438e3` |
| FactionRegistry | `0x80449696e9F2DBEBC7F154805320f49ae5aA6E23` |
| TerritoryMap | `0x4987CFAF2CA1650887786C83746CcEC4d4941331` |
| WarChest | `0x2E587e2E830D637B80e3a23db7001a92582f1352` |
| MatchOracle | `0x57E585543940cCfAB71141d84A419C3F7872d5be` |

All contracts are verified on OKLink. Source code and interaction history are publicly viewable.

---

## 6. Architecture Overview

```
User (OKX Wallet / MetaMask)
    |
    v
Next.js 14 Frontend (React + D3-geo + wagmi v2 + RainbowKit)
    |
    |-- On-chain reads/writes --> X Layer Testnet (5 smart contracts)
    |                                |
    |                                v
    |                         Event Indexer (viem + PostgreSQL)
    |                                |
    |                                v
    '-- API requests ----------> Express REST API (/api/*)
                                     |
                                     v
                              War Correspondent (Auto-Tweet + DeepSeek AI)
```

**Data flow**: On-chain transactions are indexed every 3 seconds into PostgreSQL. The REST API serves this data to the frontend. All data is publicly verifiable on X Layer via OKLink.

---

## 7. Current On-Chain Activity

| Metric | Value |
|--------|-------|
| Total Regions | 200 |
| Active Factions | 39 |
| Total Rallies | 1,300+ |
| Territory Captures | 186 |
| Match Events | 70 |
| Unique Users | 72 |
| Faction Joins | 71 |
