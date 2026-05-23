import { factionLabel, getFaction } from './factions';
import { config } from './config';

// Event type names matching MatchOracle.EventType enum
const MATCH_EVENT_TYPES: Record<number, string> = {
  0: 'GOAL',
  1: 'PENALTY',
  2: 'RED CARD',
  3: 'WHISTLE',
};

const MATCH_EVENT_EMOJI: Record<number, string> = {
  0: '⚽',
  1: '🎯',
  2: '🟥',
  3: '📣',
};

function oklinkTxUrl(txHash: string): string {
  return `https://www.oklink.com/xlayer-test/tx/${txHash}`;
}

function shortAddr(addr: string): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

// Randomize templates for variety
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ================================================================
// TerritoryCaptured tweet
// ================================================================
export function tweetTerritoryCaptured(params: {
  regionId: number;
  oldFaction: number;
  newFaction: number;
  captureCount: number;
  txHash: string;
}): string {
  const { regionId, oldFaction, newFaction, captureCount, txHash } = params;
  const newF = getFaction(newFaction);
  const oldF = getFaction(oldFaction);
  const url = oklinkTxUrl(txHash);

  const templates = [
    `⚔️ TERRITORY CAPTURED!\n\n${factionLabel(newFaction)} just seized Region #${regionId} from ${factionLabel(oldFaction)}!\n\nCapture #${captureCount} — the map is shifting.\n\n🔗 ${url}\n\n${config.projectHandle} @aspect_build #TIFO #XLayer #WorldCup2026`,

    `🏴 Region #${regionId} has FALLEN!\n\n${factionLabel(oldFaction)} loses ground to ${factionLabel(newFaction)}.\n\nThis region has changed hands ${captureCount} times. Can they hold it?\n\n🔗 ${url}\n\n${config.projectHandle} @aspect_build #TIFO`,

    `💥 FRONTLINE UPDATE\n\n${factionLabel(newFaction)} storms Region #${regionId}, overthrowing ${factionLabel(oldFaction)}!\n\nFlip count: ${captureCount}\n\nEvery capture is on-chain. Verify:\n${url}\n\n${config.projectHandle} #TIFO #XLayer`,
  ];

  return pick(templates);
}

// ================================================================
// Defected tweet
// ================================================================
export function tweetDefected(params: {
  user: string;
  regionId: number;
  fromFaction: number;
  toFaction: number;
  txHash: string;
}): string {
  const { user, regionId, fromFaction, toFaction, txHash } = params;
  const url = oklinkTxUrl(txHash);

  const templates = [
    `🗡️ BETRAYAL!\n\nA former ${factionLabel(fromFaction)} supporter has defected to ${factionLabel(toFaction)} in Region #${regionId}!\n\nLoyalty has a price. The map remembers.\n\n🔗 ${url}\n\n${config.projectHandle} @aspect_build #TIFO #Defection`,

    `🐍 DEFECTION ALERT\n\n${shortAddr(user)} switched sides from ${factionLabel(fromFaction)} → ${factionLabel(toFaction)} in Region #${regionId}.\n\n80% converted to new faction power. 20% finder's reward.\n\nTrust no one.\n\n🔗 ${url}\n\n${config.projectHandle} #TIFO`,

    `⚡ TRAITOR SPOTTED!\n\nRegion #${regionId}: Someone just abandoned ${factionLabel(fromFaction)} and joined ${factionLabel(toFaction)}.\n\nDefection strengthens the new owner — and weakens the old. Social warfare on-chain.\n\n🔗 ${url}\n\n${config.projectHandle} #TIFO #XLayer`,
  ];

  return pick(templates);
}

// ================================================================
// MatchEventPushed tweet
// ================================================================
export function tweetMatchEvent(params: {
  eventId: number;
  faction: number;
  eventType: number;
  regions: number[];
  boostApplied: string;
  txHash: string;
}): string {
  const { faction, eventType, regions, txHash } = params;
  const url = oklinkTxUrl(txHash);
  const emoji = MATCH_EVENT_EMOJI[eventType] || '📣';
  const typeName = MATCH_EVENT_TYPES[eventType] || 'EVENT';
  const regionList = regions.slice(0, 5).join(', ');

  const templates = [
    `${emoji} ${typeName}! ${factionLabel(faction)}\n\nPower surge across ${regions.length} region${regions.length > 1 ? 's' : ''} (${regionList})!\n\nThe map just shifted. Rally now or lose ground.\n\n🔗 ${url}\n\n${config.projectHandle} @aspect_build #TIFO #WorldCup2026`,

    `${emoji} MATCH EVENT: ${typeName}\n\n${factionLabel(faction)} receives a power boost across region${regions.length > 1 ? 's' : ''} ${regionList}.\n\nEvery match moment reshapes the territory war. This is TIFO.\n\n🔗 ${url}\n\n${config.projectHandle} #TIFO #XLayer`,

    `🌍 THE MAP IS MOVING!\n\n${emoji} ${factionLabel(faction)} — ${typeName}\n\n${regions.length} region${regions.length > 1 ? 's' : ''} surging with power. Is your faction ready to fight back?\n\n🔗 ${url}\n\n${config.projectHandle} @aspect_build #TIFO #WorldCup2026 #XLayer`,
  ];

  return pick(templates);
}

// ================================================================
// Countdown tweet (scheduled / manual)
// ================================================================
export function tweetCountdown(params: {
  daysUntilKickoff: number;
  top3: { name: string; territories: number }[];
}): string {
  const { daysUntilKickoff, top3 } = params;
  const leaderboard = top3
    .map((f, i) => `${['🥇', '🥈', '🥉'][i]} ${f.name}: ${f.territories} territories`)
    .join('\n');

  const templates = [
    `📅 ${daysUntilKickoff} days until kickoff!\n\nCurrent Territory Leaderboard:\n${leaderboard}\n\nIs your faction ready? Rally now before it's too late.\n\n${config.projectHandle} @aspect_build #TIFO #WorldCup2026 #XLayer`,

    `⏳ T-minus ${daysUntilKickoff} days to the World Cup!\n\nWho's winning the territory war?\n${leaderboard}\n\nEvery hour your land decays. Defend it or lose it.\n\n${config.projectHandle} #TIFO #XLayer #WorldCup2026`,

    `🏟️ ${daysUntilKickoff} days remain!\n\nThe map never sleeps. Current standings:\n${leaderboard}\n\nRally your nation. Hold your ground. The clock is ticking.\n\n${config.projectHandle} @aspect_build #TIFO #WorldCup2026`,
  ];

  return pick(templates);
}
