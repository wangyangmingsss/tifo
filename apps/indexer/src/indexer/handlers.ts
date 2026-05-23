import { Log, decodeEventLog, formatEther } from 'viem';
import { query } from '../db/client';
import { FactionRegistryABI } from '../abis/FactionRegistry';
import { TerritoryMapABI } from '../abis/TerritoryMap';
import { WarChestABI } from '../abis/WarChest';
import { MatchOracleABI } from '../abis/MatchOracle';

// ---------- FactionJoined ----------
export async function handleFactionJoined(log: Log, timestamp: Date | null) {
  const decoded = decodeEventLog({
    abi: FactionRegistryABI,
    data: log.data,
    topics: log.topics,
    eventName: 'FactionJoined',
  });

  await query(
    `INSERT INTO faction_joins (user_address, faction_id, is_switch, block_number, tx_hash, log_index, timestamp)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (tx_hash, log_index) DO NOTHING`,
    [
      decoded.args.user.toLowerCase(),
      decoded.args.factionId,
      decoded.args.isSwitch,
      Number(log.blockNumber),
      log.transactionHash,
      log.logIndex,
      timestamp,
    ]
  );
}

// ---------- RallyPlaced ----------
export async function handleRallyPlaced(log: Log, timestamp: Date | null) {
  const decoded = decodeEventLog({
    abi: TerritoryMapABI,
    data: log.data,
    topics: log.topics,
    eventName: 'RallyPlaced',
  });

  const userAddr = decoded.args.user.toLowerCase();
  const regionId = decoded.args.regionId;
  const factionId = decoded.args.faction;
  const rawAmount = decoded.args.rawAmount.toString();

  await query(
    `INSERT INTO rallies (user_address, region_id, faction_id, raw_amount, effective_power, new_faction_power, block_number, tx_hash, log_index, timestamp)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     ON CONFLICT (tx_hash, log_index) DO NOTHING`,
    [
      userAddr,
      regionId,
      factionId,
      rawAmount,
      decoded.args.effectivePower.toString(),
      decoded.args.newFactionPower.toString(),
      Number(log.blockNumber),
      log.transactionHash,
      log.logIndex,
      timestamp,
    ]
  );

  // Upsert into contributions table (per-user per-region per-faction aggregation)
  await query(
    `INSERT INTO contributions (user_address, region_id, faction_id, total_contributed, rally_count, last_rally_block, last_rally_tx, updated_at)
     VALUES ($1, $2, $3, $4, 1, $5, $6, NOW())
     ON CONFLICT (user_address, region_id, faction_id)
     DO UPDATE SET
       total_contributed = (contributions.total_contributed::numeric + $4::numeric)::text,
       rally_count = contributions.rally_count + 1,
       last_rally_block = $5,
       last_rally_tx = $6,
       updated_at = NOW()`,
    [
      userAddr,
      regionId,
      factionId,
      rawAmount,
      Number(log.blockNumber),
      log.transactionHash,
    ]
  );
}

// ---------- TerritoryCaptured ----------
export async function handleTerritoryCaptured(log: Log, timestamp: Date | null) {
  const decoded = decodeEventLog({
    abi: TerritoryMapABI,
    data: log.data,
    topics: log.topics,
    eventName: 'TerritoryCaptured',
  });

  await query(
    `INSERT INTO captures (region_id, old_faction, new_faction, capture_count, block_number, tx_hash, log_index, timestamp)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (tx_hash, log_index) DO NOTHING`,
    [
      decoded.args.regionId,
      decoded.args.oldFaction,
      decoded.args.newFaction,
      decoded.args.captureCount,
      Number(log.blockNumber),
      log.transactionHash,
      log.logIndex,
      timestamp,
    ]
  );
}

// ---------- Defected ----------
export async function handleDefected(log: Log, timestamp: Date | null) {
  const decoded = decodeEventLog({
    abi: TerritoryMapABI,
    data: log.data,
    topics: log.topics,
    eventName: 'Defected',
  });

  await query(
    `INSERT INTO defections (user_address, region_id, from_faction, to_faction, converted_power, finder_reward, block_number, tx_hash, log_index, timestamp)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     ON CONFLICT (tx_hash, log_index) DO NOTHING`,
    [
      decoded.args.user.toLowerCase(),
      decoded.args.regionId,
      decoded.args.fromFaction,
      decoded.args.toFaction,
      decoded.args.convertedPower.toString(),
      decoded.args.finderReward.toString(),
      Number(log.blockNumber),
      log.transactionHash,
      log.logIndex,
      timestamp,
    ]
  );
}

// ---------- MatchEventPushed ----------
export async function handleMatchEventPushed(log: Log, timestamp: Date | null) {
  const decoded = decodeEventLog({
    abi: MatchOracleABI,
    data: log.data,
    topics: log.topics,
    eventName: 'MatchEventPushed',
  });

  await query(
    `INSERT INTO match_events (event_id, faction_id, event_type, regions, boost_applied, block_number, tx_hash, log_index, timestamp)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     ON CONFLICT (tx_hash, log_index) DO NOTHING`,
    [
      Number(decoded.args.eventId),
      decoded.args.faction,
      decoded.args.eventType,
      decoded.args.regions.map(Number),
      decoded.args.boostApplied.toString(),
      Number(log.blockNumber),
      log.transactionHash,
      log.logIndex,
      timestamp,
    ]
  );
}

// ---------- RewardClaimed ----------
export async function handleRewardClaimed(log: Log, timestamp: Date | null) {
  const decoded = decodeEventLog({
    abi: WarChestABI,
    data: log.data,
    topics: log.topics,
    eventName: 'RewardClaimed',
  });

  await query(
    `INSERT INTO reward_claims (user_address, region_id, faction_id, amount, block_number, tx_hash, log_index, timestamp)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (tx_hash, log_index) DO NOTHING`,
    [
      decoded.args.user.toLowerCase(),
      decoded.args.regionId,
      decoded.args.faction,
      decoded.args.amount.toString(),
      Number(log.blockNumber),
      log.transactionHash,
      log.logIndex,
      timestamp,
    ]
  );
}

// ---------- SeasonSettled ----------
export async function handleSeasonSettled(log: Log, timestamp: Date | null) {
  const decoded = decodeEventLog({
    abi: WarChestABI,
    data: log.data,
    topics: log.topics,
    eventName: 'SeasonSettled',
  });

  await query(
    `INSERT INTO season_settled (total_score, total_pool, block_number, tx_hash, log_index, timestamp)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (tx_hash, log_index) DO NOTHING`,
    [
      decoded.args.totalScore.toString(),
      decoded.args.totalPool.toString(),
      Number(log.blockNumber),
      log.transactionHash,
      log.logIndex,
      timestamp,
    ]
  );
}

// ---------- Refresh stats table ----------
// Call periodically (e.g. after each poll batch) to persist aggregated stats
export async function refreshStats(): Promise<void> {
  try {
    await query(`
      INSERT INTO stats (key, value, updated_at) VALUES
        ('total_rallies',       (SELECT COUNT(*)::text FROM rallies),       NOW()),
        ('total_captures',      (SELECT COUNT(*)::text FROM captures),      NOW()),
        ('total_defections',    (SELECT COUNT(*)::text FROM defections),    NOW()),
        ('total_match_events',  (SELECT COUNT(*)::text FROM match_events),  NOW()),
        ('total_faction_joins', (SELECT COUNT(*)::text FROM faction_joins), NOW()),
        ('total_reward_claims', (SELECT COUNT(*)::text FROM reward_claims), NOW()),
        ('unique_users',        (SELECT COUNT(DISTINCT user_address)::text FROM (
                                   SELECT user_address FROM rallies
                                   UNION SELECT user_address FROM faction_joins
                                 ) u), NOW()),
        ('active_factions',     (SELECT COUNT(DISTINCT faction_id)::text FROM faction_joins), NOW()),
        ('last_stats_refresh',  EXTRACT(EPOCH FROM NOW())::bigint::text,   NOW())
      ON CONFLICT (key) DO UPDATE SET
        value = EXCLUDED.value,
        updated_at = EXCLUDED.updated_at
    `);
  } catch (err) {
    console.error('[handlers] Failed to refresh stats:', err);
  }
}
