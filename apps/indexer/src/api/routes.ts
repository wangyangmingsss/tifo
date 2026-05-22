import { Router, Request, Response } from 'express';
import { createPublicClient, http, formatEther } from 'viem';
import { query } from '../db/client';
import { config } from '../config';
import { TerritoryMapABI } from '../abis/TerritoryMap';
import { FactionRegistryABI } from '../abis/FactionRegistry';
import { WarChestABI } from '../abis/WarChest';

// Shared viem client for on-chain reads
const client = createPublicClient({
  transport: http(config.rpcUrl),
});

const router = Router();

// ---------- GET /healthz ----------
router.get('/healthz', async (_req: Request, res: Response) => {
  try {
    const dbResult = await query('SELECT 1');
    const blockNumber = await client.getBlockNumber();
    const lastIndexed = await query(
      `SELECT value FROM indexer_state WHERE key = 'last_indexed_block'`
    );
    res.json({
      status: 'ok',
      chainBlockNumber: blockNumber.toString(),
      lastIndexedBlock: lastIndexed.rows[0]?.value || '0',
      database: 'connected',
    });
  } catch (err: any) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// ---------- GET /map/state ----------
// Returns current map ownership from on-chain + indexed stats
router.get('/map/state', async (_req: Request, res: Response) => {
  try {
    // Read directly from chain for real-time accuracy
    const mapState = await client.readContract({
      address: config.contracts.territoryMap,
      abi: TerritoryMapABI,
      functionName: 'getMapState',
    });

    // Get region count
    const regionCount = await client.readContract({
      address: config.contracts.territoryMap,
      abi: TerritoryMapABI,
      functionName: 'regionCount',
    });

    // Get capture counts from indexed data
    const captureStats = await query(
      `SELECT region_id, COUNT(*) as capture_count
       FROM captures
       GROUP BY region_id
       ORDER BY region_id`
    );

    const captureMap: Record<number, number> = {};
    for (const row of captureStats.rows) {
      captureMap[row.region_id] = parseInt(row.capture_count);
    }

    const regions = (mapState as number[]).map((ownerFaction: number, i: number) => ({
      regionId: i,
      ownerFaction: ownerFaction === 255 ? null : ownerFaction,
      captureCount: captureMap[i] || 0,
    }));

    res.json({
      regionCount: Number(regionCount),
      regions,
    });
  } catch (err: any) {
    console.error('[api] /map/state error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ---------- GET /region/:id/history ----------
// Full capture history for a region with tx hashes (verifiability panel)
router.get('/region/:id/history', async (req: Request, res: Response) => {
  try {
    const regionId = parseInt(req.params.id, 10);
    if (isNaN(regionId)) {
      res.status(400).json({ error: 'Invalid region ID' });
      return;
    }

    // Capture history
    const captures = await query(
      `SELECT old_faction, new_faction, capture_count, block_number, tx_hash, timestamp
       FROM captures
       WHERE region_id = $1
       ORDER BY block_number ASC, log_index ASC`,
      [regionId]
    );

    // Rally history (recent 50)
    const rallies = await query(
      `SELECT user_address, faction_id, raw_amount, effective_power, new_faction_power, block_number, tx_hash, timestamp
       FROM rallies
       WHERE region_id = $1
       ORDER BY block_number DESC, log_index DESC
       LIMIT 50`,
      [regionId]
    );

    // Defection history
    const defections = await query(
      `SELECT user_address, from_faction, to_faction, converted_power, finder_reward, block_number, tx_hash, timestamp
       FROM defections
       WHERE region_id = $1
       ORDER BY block_number DESC, log_index DESC
       LIMIT 20`,
      [regionId]
    );

    // Current on-chain state
    const regionData = await client.readContract({
      address: config.contracts.territoryMap,
      abi: TerritoryMapABI,
      functionName: 'regions',
      args: [regionId],
    });

    const [ownerFaction, lastUpdate, captureCount] = regionData as [number, bigint, number];

    res.json({
      regionId,
      currentOwner: ownerFaction === 255 ? null : ownerFaction,
      lastUpdate: Number(lastUpdate),
      totalCaptures: captureCount,
      captureHistory: captures.rows.map((r) => ({
        oldFaction: r.old_faction,
        newFaction: r.new_faction,
        captureCount: r.capture_count,
        blockNumber: r.block_number,
        txHash: r.tx_hash,
        oklinkUrl: `https://www.oklink.com/xlayer-test/tx/${r.tx_hash}`,
        timestamp: r.timestamp,
      })),
      recentRallies: rallies.rows.map((r) => ({
        user: r.user_address,
        faction: r.faction_id,
        rawAmount: r.raw_amount,
        effectivePower: r.effective_power,
        newFactionPower: r.new_faction_power,
        blockNumber: r.block_number,
        txHash: r.tx_hash,
        oklinkUrl: `https://www.oklink.com/xlayer-test/tx/${r.tx_hash}`,
        timestamp: r.timestamp,
      })),
      defections: defections.rows.map((r) => ({
        user: r.user_address,
        fromFaction: r.from_faction,
        toFaction: r.to_faction,
        convertedPower: r.converted_power,
        finderReward: r.finder_reward,
        blockNumber: r.block_number,
        txHash: r.tx_hash,
        oklinkUrl: `https://www.oklink.com/xlayer-test/tx/${r.tx_hash}`,
        timestamp: r.timestamp,
      })),
    });
  } catch (err: any) {
    console.error('[api] /region/:id/history error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ---------- GET /leaderboard ----------
router.get('/leaderboard', async (_req: Request, res: Response) => {
  try {
    // Read live territory counts from chain
    const counts = await client.readContract({
      address: config.contracts.territoryMap,
      abi: TerritoryMapABI,
      functionName: 'territoryCounts',
    });

    // Get rally counts and total power from indexed data
    const rallyStats = await query(
      `SELECT faction_id,
              COUNT(*) as rally_count,
              COUNT(DISTINCT user_address) as unique_supporters
       FROM rallies
       GROUP BY faction_id
       ORDER BY faction_id`
    );

    const captureStats = await query(
      `SELECT new_faction as faction_id, COUNT(*) as captures_won
       FROM captures
       GROUP BY new_faction
       ORDER BY new_faction`
    );

    const rallyMap: Record<number, { rallyCount: number; uniqueSupporters: number }> = {};
    for (const row of rallyStats.rows) {
      rallyMap[row.faction_id] = {
        rallyCount: parseInt(row.rally_count),
        uniqueSupporters: parseInt(row.unique_supporters),
      };
    }

    const captureMap: Record<number, number> = {};
    for (const row of captureStats.rows) {
      captureMap[row.faction_id] = parseInt(row.captures_won);
    }

    const leaderboard = (counts as bigint[]).map((count: bigint, factionId: number) => ({
      factionId,
      territoriesHeld: Number(count),
      totalRallies: rallyMap[factionId]?.rallyCount || 0,
      uniqueSupporters: rallyMap[factionId]?.uniqueSupporters || 0,
      capturesWon: captureMap[factionId] || 0,
    }));

    // Sort by territories held descending
    leaderboard.sort((a, b) => b.territoriesHeld - a.territoriesHeld);

    res.json({ leaderboard });
  } catch (err: any) {
    console.error('[api] /leaderboard error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ---------- GET /faction/:id ----------
router.get('/faction/:id', async (req: Request, res: Response) => {
  try {
    const factionId = parseInt(req.params.id, 10);
    if (isNaN(factionId) || factionId < 0 || factionId >= 48) {
      res.status(400).json({ error: 'Invalid faction ID (must be 0-47)' });
      return;
    }

    // Member count from chain
    const memberCount = await client.readContract({
      address: config.contracts.factionRegistry,
      abi: FactionRegistryABI,
      functionName: 'memberCount',
      args: [factionId],
    });

    // Territory count from chain
    const counts = await client.readContract({
      address: config.contracts.territoryMap,
      abi: TerritoryMapABI,
      functionName: 'territoryCounts',
    });
    const territoriesHeld = Number((counts as bigint[])[factionId]);

    // Prize pool from chain
    const prizePool = await client.readContract({
      address: config.contracts.warChest,
      abi: WarChestABI,
      functionName: 'factionPrizePool',
      args: [factionId],
    });

    // Top contributors from indexed data
    const topContributors = await query(
      `SELECT user_address,
              COUNT(*) as rally_count,
              SUM(raw_amount::numeric) as total_contributed
       FROM rallies
       WHERE faction_id = $1
       GROUP BY user_address
       ORDER BY total_contributed DESC
       LIMIT 20`,
      [factionId]
    );

    // Recent members
    const recentMembers = await query(
      `SELECT user_address, is_switch, block_number, tx_hash, timestamp
       FROM faction_joins
       WHERE faction_id = $1
       ORDER BY block_number DESC
       LIMIT 20`,
      [factionId]
    );

    // Recent captures
    const recentCaptures = await query(
      `SELECT region_id, old_faction, capture_count, block_number, tx_hash, timestamp
       FROM captures
       WHERE new_faction = $1
       ORDER BY block_number DESC
       LIMIT 10`,
      [factionId]
    );

    // Rally stats
    const rallyStats = await query(
      `SELECT COUNT(*) as total_rallies,
              COUNT(DISTINCT user_address) as unique_ralliers,
              COUNT(DISTINCT region_id) as regions_rallied
       FROM rallies
       WHERE faction_id = $1`,
      [factionId]
    );

    // Defection stats
    const defectionIn = await query(
      `SELECT COUNT(*) as count FROM defections WHERE to_faction = $1`,
      [factionId]
    );
    const defectionOut = await query(
      `SELECT COUNT(*) as count FROM defections WHERE from_faction = $1`,
      [factionId]
    );

    res.json({
      factionId,
      memberCount: Number(memberCount),
      territoriesHeld,
      prizePool: prizePool.toString(),
      prizePoolFormatted: formatEther(prizePool as bigint),
      stats: {
        totalRallies: parseInt(rallyStats.rows[0]?.total_rallies || '0'),
        uniqueRalliers: parseInt(rallyStats.rows[0]?.unique_ralliers || '0'),
        regionsRallied: parseInt(rallyStats.rows[0]?.regions_rallied || '0'),
        defectionsIn: parseInt(defectionIn.rows[0]?.count || '0'),
        defectionsOut: parseInt(defectionOut.rows[0]?.count || '0'),
      },
      topContributors: topContributors.rows.map((r) => ({
        user: r.user_address,
        rallyCount: parseInt(r.rally_count),
        totalContributed: r.total_contributed,
      })),
      recentMembers: recentMembers.rows.map((r) => ({
        user: r.user_address,
        isSwitch: r.is_switch,
        blockNumber: r.block_number,
        txHash: r.tx_hash,
        timestamp: r.timestamp,
      })),
      recentCaptures: recentCaptures.rows.map((r) => ({
        regionId: r.region_id,
        oldFaction: r.old_faction,
        captureCount: r.capture_count,
        blockNumber: r.block_number,
        txHash: r.tx_hash,
        oklinkUrl: `https://www.oklink.com/xlayer-test/tx/${r.tx_hash}`,
        timestamp: r.timestamp,
      })),
    });
  } catch (err: any) {
    console.error('[api] /faction/:id error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ---------- GET /stats ----------
router.get('/stats', async (_req: Request, res: Response) => {
  try {
    // On-chain data
    const regionCount = await client.readContract({
      address: config.contracts.territoryMap,
      abi: TerritoryMapABI,
      functionName: 'regionCount',
    });

    const blockNumber = await client.getBlockNumber();

    // Indexed stats
    const totalRallies = await query(`SELECT COUNT(*) as count FROM rallies`);
    const totalCaptures = await query(`SELECT COUNT(*) as count FROM captures`);
    const totalDefections = await query(`SELECT COUNT(*) as count FROM defections`);
    const totalMatchEvents = await query(`SELECT COUNT(*) as count FROM match_events`);
    const totalFactionJoins = await query(`SELECT COUNT(*) as count FROM faction_joins`);
    const totalRewardClaims = await query(`SELECT COUNT(*) as count FROM reward_claims`);

    const uniqueUsers = await query(
      `SELECT COUNT(DISTINCT user_address) as count FROM (
        SELECT user_address FROM rallies
        UNION
        SELECT user_address FROM faction_joins
       ) combined`
    );

    const activeFactions = await query(
      `SELECT COUNT(DISTINCT faction_id) as count FROM faction_joins`
    );

    // Most contested regions
    const mostContested = await query(
      `SELECT region_id, COUNT(*) as capture_count
       FROM captures
       GROUP BY region_id
       ORDER BY capture_count DESC
       LIMIT 10`
    );

    // Recent activity
    const recentCaptures = await query(
      `SELECT region_id, old_faction, new_faction, tx_hash, timestamp
       FROM captures
       ORDER BY block_number DESC
       LIMIT 5`
    );

    // Season settlement status
    const seasonSettled = await query(`SELECT COUNT(*) as count FROM season_settled`);

    // Last indexed block
    const lastIndexed = await query(
      `SELECT value FROM indexer_state WHERE key = 'last_indexed_block'`
    );

    res.json({
      chain: {
        chainId: config.chainId,
        network: 'X Layer Testnet',
        currentBlock: blockNumber.toString(),
        lastIndexedBlock: lastIndexed.rows[0]?.value || '0',
        regionCount: Number(regionCount),
      },
      totals: {
        rallies: parseInt(totalRallies.rows[0].count),
        captures: parseInt(totalCaptures.rows[0].count),
        defections: parseInt(totalDefections.rows[0].count),
        matchEvents: parseInt(totalMatchEvents.rows[0].count),
        factionJoins: parseInt(totalFactionJoins.rows[0].count),
        rewardClaims: parseInt(totalRewardClaims.rows[0].count),
        uniqueUsers: parseInt(uniqueUsers.rows[0].count),
        activeFactions: parseInt(activeFactions.rows[0].count),
      },
      seasonSettled: parseInt(seasonSettled.rows[0].count) > 0,
      mostContestedRegions: mostContested.rows.map((r) => ({
        regionId: r.region_id,
        captureCount: parseInt(r.capture_count),
      })),
      recentCaptures: recentCaptures.rows.map((r) => ({
        regionId: r.region_id,
        oldFaction: r.old_faction,
        newFaction: r.new_faction,
        txHash: r.tx_hash,
        oklinkUrl: `https://www.oklink.com/xlayer-test/tx/${r.tx_hash}`,
        timestamp: r.timestamp,
      })),
      verifiabilityNote:
        'Every number here is reconstructed from on-chain event logs on X Layer (chainId 195). Verify any transaction via OKLink.',
    });
  } catch (err: any) {
    console.error('[api] /stats error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
