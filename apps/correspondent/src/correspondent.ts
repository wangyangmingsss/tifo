import {
  createPublicClient,
  http,
  decodeEventLog,
  parseAbiItem,
  encodeEventTopics,
  Log,
  Chain,
  PublicClient,
} from 'viem';
import { config } from './config';
import { publishTweet } from './twitter';
import { tweetTerritoryCaptured, tweetDefected, tweetMatchEvent, tweetCountdown } from './templates';
import { getFaction } from './factions';
import { enhanceTweet } from './deepseek';

// ── ABIs (only events we care about) ──────────────────────────────

const TerritoryMapEvents = [
  {
    type: 'event' as const,
    name: 'TerritoryCaptured' as const,
    inputs: [
      { name: 'regionId', type: 'uint16' as const, indexed: true },
      { name: 'oldFaction', type: 'uint8' as const, indexed: true },
      { name: 'newFaction', type: 'uint8' as const, indexed: true },
      { name: 'captureCount', type: 'uint16' as const, indexed: false },
    ],
  },
  {
    type: 'event' as const,
    name: 'Defected' as const,
    inputs: [
      { name: 'user', type: 'address' as const, indexed: true },
      { name: 'regionId', type: 'uint16' as const, indexed: true },
      { name: 'fromFaction', type: 'uint8' as const, indexed: false },
      { name: 'toFaction', type: 'uint8' as const, indexed: true },
      { name: 'convertedPower', type: 'uint256' as const, indexed: false },
      { name: 'finderReward', type: 'uint256' as const, indexed: false },
    ],
  },
] as const;

const MatchOracleEvents = [
  {
    type: 'event' as const,
    name: 'MatchEventPushed' as const,
    inputs: [
      { name: 'eventId', type: 'uint256' as const, indexed: true },
      { name: 'faction', type: 'uint8' as const, indexed: true },
      { name: 'eventType', type: 'uint8' as const, indexed: true },
      { name: 'regions', type: 'uint16[]' as const, indexed: false },
      { name: 'boostApplied', type: 'uint256' as const, indexed: false },
    ],
  },
] as const;

// ── ABI for territoryCounts view (used by countdown) ──────────────
const TerritoryMapView = [
  {
    type: 'function' as const,
    name: 'territoryCounts' as const,
    inputs: [],
    outputs: [{ name: '', type: 'uint256[]' as const }],
    stateMutability: 'view' as const,
  },
] as const;

// ── World Cup 2026 kickoff date (June 11, 2026 UTC) ──────────────
const WORLD_CUP_KICKOFF = new Date('2026-06-11T00:00:00Z');
const COUNTDOWN_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours

// ── X Layer Testnet chain ──────────────────────────────────────────

const xlayerTestnet: Chain = {
  id: 195,
  name: 'X Layer Testnet',
  nativeCurrency: { name: 'OKB', symbol: 'OKB', decimals: 18 },
  rpcUrls: { default: { http: [config.rpcUrl] } },
  blockExplorers: { default: { name: 'OKLink', url: 'https://www.oklink.com/xlayer-test' } },
};

// ── Topic0 mapping ─────────────────────────────────────────────────

type EventKind = 'TerritoryCaptured' | 'Defected' | 'MatchEventPushed';

function buildTopicMap(): Map<string, EventKind> {
  const map = new Map<string, EventKind>();

  const capturedTopic = encodeEventTopics({ abi: TerritoryMapEvents, eventName: 'TerritoryCaptured' })[0];
  const defectedTopic = encodeEventTopics({ abi: TerritoryMapEvents, eventName: 'Defected' })[0];
  const matchTopic = encodeEventTopics({ abi: MatchOracleEvents, eventName: 'MatchEventPushed' })[0];

  map.set(capturedTopic, 'TerritoryCaptured');
  map.set(defectedTopic, 'Defected');
  map.set(matchTopic, 'MatchEventPushed');

  return map;
}

// ── Rate limiting ──────────────────────────────────────────────────

class RateLimiter {
  private timestamps: number[] = [];
  private maxPerWindow: number;
  private windowMs: number;

  constructor(maxPerWindow: number, windowMs: number) {
    this.maxPerWindow = maxPerWindow;
    this.windowMs = windowMs;
  }

  canProceed(): boolean {
    const now = Date.now();
    this.timestamps = this.timestamps.filter((t) => now - t < this.windowMs);
    return this.timestamps.length < this.maxPerWindow;
  }

  record(): void {
    this.timestamps.push(Date.now());
  }
}

// ── Main Correspondent ─────────────────────────────────────────────

export class Correspondent {
  private client: PublicClient;
  private topicMap: Map<string, EventKind>;
  private running = false;
  private lastProcessedBlock: bigint;
  private rateLimiter: RateLimiter;
  private tweetCount = 0;
  private lastCountdownTime = 0;

  constructor() {
    this.client = createPublicClient({
      chain: xlayerTestnet,
      transport: http(config.rpcUrl, { retryCount: 3, retryDelay: 1000 }),
    });
    this.topicMap = buildTopicMap();
    this.lastProcessedBlock = config.startBlock;
    // X API free tier: ~17 tweets/15min; we stay well under
    this.rateLimiter = new RateLimiter(10, 15 * 60 * 1000);
  }

  private async handleLog(log: Log): Promise<void> {
    const topic0 = log.topics[0];
    if (!topic0) return;

    const kind = this.topicMap.get(topic0);
    if (!kind) return;

    let tweetText: string;

    try {
      switch (kind) {
        case 'TerritoryCaptured': {
          const decoded = decodeEventLog({
            abi: TerritoryMapEvents,
            data: log.data,
            topics: log.topics,
            eventName: 'TerritoryCaptured',
          });
          tweetText = tweetTerritoryCaptured({
            regionId: decoded.args.regionId,
            oldFaction: decoded.args.oldFaction,
            newFaction: decoded.args.newFaction,
            captureCount: decoded.args.captureCount,
            txHash: log.transactionHash!,
          });
          break;
        }
        case 'Defected': {
          const decoded = decodeEventLog({
            abi: TerritoryMapEvents,
            data: log.data,
            topics: log.topics,
            eventName: 'Defected',
          });
          tweetText = tweetDefected({
            user: decoded.args.user,
            regionId: decoded.args.regionId,
            fromFaction: decoded.args.fromFaction,
            toFaction: decoded.args.toFaction,
            txHash: log.transactionHash!,
          });
          break;
        }
        case 'MatchEventPushed': {
          const decoded = decodeEventLog({
            abi: MatchOracleEvents,
            data: log.data,
            topics: log.topics,
            eventName: 'MatchEventPushed',
          });
          tweetText = tweetMatchEvent({
            eventId: Number(decoded.args.eventId),
            faction: decoded.args.faction,
            eventType: decoded.args.eventType,
            regions: decoded.args.regions.map(Number),
            boostApplied: decoded.args.boostApplied.toString(),
            txHash: log.transactionHash!,
          });
          break;
        }
        default:
          return;
      }
    } catch (err) {
      console.error(`[correspondent] Failed to decode ${kind} event:`, err);
      return;
    }

    // Rate limit check
    if (!this.rateLimiter.canProceed()) {
      console.warn(`[correspondent] Rate limited — skipping tweet for ${kind}`);
      return;
    }

    this.rateLimiter.record();
    this.tweetCount++;
    console.log(`[correspondent] Event: ${kind} at block ${log.blockNumber} — generating tweet #${this.tweetCount}`);

    // Optionally enhance with DeepSeek AI before posting
    const finalText = await enhanceTweet(tweetText);
    await publishTweet(finalText);
  }

  // ── Countdown tweet (once per 24h) ──────────────────────────────
  private async checkCountdown(): Promise<void> {
    const now = Date.now();
    if (now - this.lastCountdownTime < COUNTDOWN_INTERVAL_MS) return;

    const daysUntilKickoff = Math.ceil(
      (WORLD_CUP_KICKOFF.getTime() - now) / (1000 * 60 * 60 * 24),
    );

    // Only post countdown if kickoff is in the future
    if (daysUntilKickoff <= 0) return;

    // Rate limit check
    if (!this.rateLimiter.canProceed()) {
      console.warn('[correspondent] Rate limited — skipping countdown tweet');
      return;
    }

    try {
      const counts = (await this.client.readContract({
        address: config.contracts.territoryMap,
        abi: TerritoryMapView,
        functionName: 'territoryCounts',
      })) as bigint[];

      // Build top-3 leaderboard
      const ranked = counts
        .map((c, i) => ({ id: i, territories: Number(c) }))
        .filter((f) => f.territories > 0)
        .sort((a, b) => b.territories - a.territories)
        .slice(0, 3)
        .map((f) => ({
          name: getFaction(f.id).name,
          territories: f.territories,
        }));

      if (ranked.length === 0) return; // no territory data yet

      const text = tweetCountdown({ daysUntilKickoff, top3: ranked });

      // Optionally enhance with DeepSeek AI
      const finalText = await enhanceTweet(text);

      this.rateLimiter.record();
      this.tweetCount++;
      this.lastCountdownTime = now;
      console.log(`[correspondent] Countdown tweet: ${daysUntilKickoff} days until kickoff — tweet #${this.tweetCount}`);
      await publishTweet(finalText);
    } catch (err) {
      console.error('[correspondent] Failed to generate countdown tweet:', err);
    }
  }

  async pollOnce(): Promise<number> {
    const latestBlock = await this.client.getBlockNumber();
    const safeBlock = latestBlock - BigInt(config.confirmationBlocks);

    if (safeBlock <= this.lastProcessedBlock) return 0;

    const fromBlock = this.lastProcessedBlock + 1n;
    // X Layer limits getLogs to 100 blocks
    const maxChunk = 99n;
    const toBlock = safeBlock - fromBlock > maxChunk ? fromBlock + maxChunk : safeBlock;

    const logs = await this.client.getLogs({
      address: [config.contracts.territoryMap, config.contracts.matchOracle],
      fromBlock,
      toBlock,
    });

    // Sort chronologically
    logs.sort((a, b) => {
      if (a.blockNumber !== b.blockNumber) return Number(a.blockNumber! - b.blockNumber!);
      return (a.logIndex ?? 0) - (b.logIndex ?? 0);
    });

    // Filter to only the 3 event types we care about
    let processed = 0;
    for (const log of logs) {
      const topic0 = log.topics[0];
      if (topic0 && this.topicMap.has(topic0)) {
        await this.handleLog(log);
        processed++;
      }
    }

    this.lastProcessedBlock = toBlock;
    return processed;
  }

  async start(): Promise<void> {
    this.running = true;
    console.log('[correspondent] Starting TIFO War Correspondent...');
    console.log(`[correspondent] Watching: TerritoryCaptured, Defected, MatchEventPushed`);
    console.log(`[correspondent] Mode: ${config.dryRun ? 'DRY RUN (no tweets posted)' : 'LIVE (tweets will be posted)'}`);
    console.log(`[correspondent] Starting from block: ${this.lastProcessedBlock}`);

    // Fire initial countdown check on startup
    await this.checkCountdown();

    while (this.running) {
      try {
        const count = await this.pollOnce();
        if (count > 0) {
          console.log(`[correspondent] Processed ${count} events, total tweets: ${this.tweetCount}`);
        }
        // Check countdown once per cycle (internally gated to 24h)
        await this.checkCountdown();
      } catch (err) {
        console.error('[correspondent] Poll error:', err);
      }

      await new Promise((resolve) => setTimeout(resolve, config.pollIntervalMs));
    }
  }

  stop(): void {
    this.running = false;
    console.log(`[correspondent] Stopped. Total tweets sent: ${this.tweetCount}`);
  }
}
