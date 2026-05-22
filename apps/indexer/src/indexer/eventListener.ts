import {
  createPublicClient,
  http,
  parseAbiItem,
  Log,
  getAddress,
  encodeEventTopics,
  PublicClient,
  Chain,
} from 'viem';
import { config } from '../config';
import { getLastIndexedBlock, setLastIndexedBlock, transaction } from '../db/client';
import {
  handleFactionJoined,
  handleRallyPlaced,
  handleTerritoryCaptured,
  handleDefected,
  handleMatchEventPushed,
  handleRewardClaimed,
  handleSeasonSettled,
} from './handlers';
import { FactionRegistryABI } from '../abis/FactionRegistry';
import { TerritoryMapABI } from '../abis/TerritoryMap';
import { WarChestABI } from '../abis/WarChest';
import { MatchOracleABI } from '../abis/MatchOracle';

// X Layer Testnet chain definition
const xlayerTestnet: Chain = {
  id: 195,
  name: 'X Layer Testnet',
  nativeCurrency: { name: 'OKB', symbol: 'OKB', decimals: 18 },
  rpcUrls: {
    default: { http: [config.rpcUrl] },
  },
  blockExplorers: {
    default: { name: 'OKLink', url: 'https://www.oklink.com/xlayer-test' },
  },
};

// Event signatures for topic0 matching
const EVENT_SIGNATURES = {
  FactionJoined: parseAbiItem('event FactionJoined(address indexed user, uint8 indexed factionId, bool isSwitch)'),
  RallyPlaced: parseAbiItem('event RallyPlaced(address indexed user, uint16 indexed regionId, uint8 indexed faction, uint256 rawAmount, uint256 effectivePower, uint256 newFactionPower)'),
  TerritoryCaptured: parseAbiItem('event TerritoryCaptured(uint16 indexed regionId, uint8 indexed oldFaction, uint8 indexed newFaction, uint16 captureCount)'),
  Defected: parseAbiItem('event Defected(address indexed user, uint16 indexed regionId, uint8 fromFaction, uint8 indexed toFaction, uint256 convertedPower, uint256 finderReward)'),
  MatchEventPushed: parseAbiItem('event MatchEventPushed(uint256 indexed eventId, uint8 indexed faction, uint8 indexed eventType, uint16[] regions, uint256 boostApplied)'),
  RewardClaimed: parseAbiItem('event RewardClaimed(address indexed user, uint16 indexed regionId, uint8 indexed faction, uint256 amount)'),
  SeasonSettled: parseAbiItem('event SeasonSettled(uint256 totalScore, uint256 totalPool)'),
};

// Build topic0 -> handler mapping
function getTopicHandlerMap() {
  const map = new Map<string, { handler: (log: Log, ts: Date | null) => Promise<void>; name: string }>();

  const topics = {
    FactionJoined: encodeEventTopics({ abi: FactionRegistryABI, eventName: 'FactionJoined' })[0],
    RallyPlaced: encodeEventTopics({ abi: TerritoryMapABI, eventName: 'RallyPlaced' })[0],
    TerritoryCaptured: encodeEventTopics({ abi: TerritoryMapABI, eventName: 'TerritoryCaptured' })[0],
    Defected: encodeEventTopics({ abi: TerritoryMapABI, eventName: 'Defected' })[0],
    MatchEventPushed: encodeEventTopics({ abi: MatchOracleABI, eventName: 'MatchEventPushed' })[0],
    RewardClaimed: encodeEventTopics({ abi: WarChestABI, eventName: 'RewardClaimed' })[0],
    SeasonSettled: encodeEventTopics({ abi: WarChestABI, eventName: 'SeasonSettled' })[0],
  };

  map.set(topics.FactionJoined, { handler: handleFactionJoined, name: 'FactionJoined' });
  map.set(topics.RallyPlaced, { handler: handleRallyPlaced, name: 'RallyPlaced' });
  map.set(topics.TerritoryCaptured, { handler: handleTerritoryCaptured, name: 'TerritoryCaptured' });
  map.set(topics.Defected, { handler: handleDefected, name: 'Defected' });
  map.set(topics.MatchEventPushed, { handler: handleMatchEventPushed, name: 'MatchEventPushed' });
  map.set(topics.RewardClaimed, { handler: handleRewardClaimed, name: 'RewardClaimed' });
  map.set(topics.SeasonSettled, { handler: handleSeasonSettled, name: 'SeasonSettled' });

  return map;
}

export class EventIndexer {
  private client: PublicClient;
  private topicHandlerMap: Map<string, { handler: (log: Log, ts: Date | null) => Promise<void>; name: string }>;
  private running = false;
  private contractAddresses: `0x${string}`[];
  private blockTimestampCache = new Map<bigint, Date>();

  constructor() {
    this.client = createPublicClient({
      chain: xlayerTestnet,
      transport: http(config.rpcUrl, {
        retryCount: 3,
        retryDelay: 1000,
      }),
    });
    this.topicHandlerMap = getTopicHandlerMap();
    this.contractAddresses = [
      config.contracts.factionRegistry,
      config.contracts.territoryMap,
      config.contracts.warChest,
      config.contracts.matchOracle,
    ];
  }

  async getBlockTimestamp(blockNumber: bigint): Promise<Date | null> {
    if (this.blockTimestampCache.has(blockNumber)) {
      return this.blockTimestampCache.get(blockNumber)!;
    }
    try {
      const block = await this.client.getBlock({ blockNumber });
      const ts = new Date(Number(block.timestamp) * 1000);
      this.blockTimestampCache.set(blockNumber, ts);
      // Keep cache bounded
      if (this.blockTimestampCache.size > 1000) {
        const firstKey = this.blockTimestampCache.keys().next().value;
        if (firstKey !== undefined) this.blockTimestampCache.delete(firstKey);
      }
      return ts;
    } catch {
      return null;
    }
  }

  async processLogs(logs: Log[]): Promise<number> {
    let processed = 0;
    for (const log of logs) {
      const topic0 = log.topics[0];
      if (!topic0) continue;

      const entry = this.topicHandlerMap.get(topic0);
      if (!entry) continue;

      try {
        const ts = await this.getBlockTimestamp(log.blockNumber!);
        await entry.handler(log, ts);
        processed++;
      } catch (err) {
        console.error(`[indexer] Error processing ${entry.name} log at block ${log.blockNumber}, tx ${log.transactionHash}:`, err);
      }
    }
    return processed;
  }

  async pollOnce(): Promise<{ fromBlock: bigint; toBlock: bigint; logsProcessed: number }> {
    const lastIndexed = await getLastIndexedBlock();
    const latestBlock = await this.client.getBlockNumber();

    // 5-block confirmation buffer
    const safeBlock = latestBlock - BigInt(config.confirmationBlocks);
    if (safeBlock <= lastIndexed) {
      return { fromBlock: lastIndexed, toBlock: lastIndexed, logsProcessed: 0 };
    }

    const fromBlock = lastIndexed + 1n;
    // X Layer Testnet limits eth_getLogs to 100 blocks per request
    const maxChunk = 99n;
    const toBlock = safeBlock - fromBlock > maxChunk ? fromBlock + maxChunk : safeBlock;

    const logs = await this.client.getLogs({
      address: this.contractAddresses,
      fromBlock,
      toBlock,
    });

    // Sort logs by block number then log index
    logs.sort((a, b) => {
      if (a.blockNumber !== b.blockNumber) {
        return Number(a.blockNumber! - b.blockNumber!);
      }
      return (a.logIndex ?? 0) - (b.logIndex ?? 0);
    });

    const logsProcessed = await this.processLogs(logs);
    await setLastIndexedBlock(toBlock);

    return { fromBlock, toBlock, logsProcessed };
  }

  async start(): Promise<void> {
    this.running = true;
    console.log(`[indexer] Starting event indexer...`);
    console.log(`[indexer] Contracts: ${this.contractAddresses.join(', ')}`);
    console.log(`[indexer] Confirmation buffer: ${config.confirmationBlocks} blocks`);
    console.log(`[indexer] Poll interval: ${config.pollIntervalMs}ms`);

    while (this.running) {
      try {
        const result = await this.pollOnce();
        if (result.logsProcessed > 0) {
          console.log(
            `[indexer] Processed ${result.logsProcessed} events from block ${result.fromBlock} to ${result.toBlock}`
          );
        }
      } catch (err) {
        console.error('[indexer] Poll error:', err);
      }

      await new Promise((resolve) => setTimeout(resolve, config.pollIntervalMs));
    }
  }

  stop(): void {
    this.running = false;
    console.log('[indexer] Stopping...');
  }
}
