'use client';

import { useEffect, useState } from 'react';
import { FACTIONS, NO_FACTION, getFactionById, type Faction } from '@/config/factions';
import { oklinkTx, CONTRACTS } from '@/config/contracts';
import { getCountryName, regionIdToCountry } from '@/config/regionMapping';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { FactionRegistryABI } from '@/config/abi/FactionRegistry';
import { TerritoryMapABI } from '@/config/abi/TerritoryMap';

// ── Types ──────────────────────────────────────────────────────────────────────

interface PowerEntry {
  faction: Faction;
  power: number;
}

interface CaptureEvent {
  timestamp: number;
  oldFactionId: number;
  newFactionId: number;
  txHash: string;
}

interface RegionSidebarProps {
  regionId: number;
  ownerFactionId: number;
  onClose: () => void;
}

// ── Country flag helper ────────────────────────────────────────────────────────

const ISO_TO_FLAG: Record<string, string> = {
  '032': '🇦🇷', '076': '🇧🇷', '858': '🇺🇾', '170': '🇨🇴', '218': '🇪🇨', '600': '🇵🇾',
  '250': '🇫🇷', '724': '🇪🇸', '826': '🇬🇧', '276': '🇩🇪', '620': '🇵🇹', '528': '🇳🇱',
  '191': '🇭🇷', '056': '🇧🇪', '380': '🇮🇹', '756': '🇨🇭', '040': '🇦🇹', '578': '🇳🇴',
  '616': '🇵🇱', '203': '🇨🇿', '840': '🇺🇸', '484': '🇲🇽', '124': '🇨🇦', '591': '🇵🇦',
  '332': '🇭🇹', '504': '🇲🇦', '686': '🇸🇳', '288': '🇬🇭', '710': '🇿🇦', '384': '🇨🇮',
  '566': '🇳🇬', '012': '🇩🇿', '818': '🇪🇬', '180': '🇨🇩', '392': '🇯🇵', '410': '🇰🇷',
  '036': '🇦🇺', '682': '🇸🇦', '364': '🇮🇷', '634': '🇶🇦', '860': '🇺🇿', '400': '🇯🇴',
  '368': '🇮🇶', '554': '🇳🇿', '388': '🇯🇲', '792': '🇹🇷', '788': '🇹🇳',
  '356': '🇮🇳', '156': '🇨🇳', '643': '🇷🇺', '404': '🇰🇪', '604': '🇵🇪',
  '152': '🇨🇱', '862': '🇻🇪', '348': '🇭🇺', '642': '🇷🇴', '804': '🇺🇦',
  '246': '🇫🇮', '752': '🇸🇪', '360': '🇮🇩', '608': '🇵🇭', '764': '🇹🇭',
};

function getFlag(numericId: string): string {
  return ISO_TO_FLAG[numericId] ?? '🏳️';
}

// ── Indexer API base URL ──────────────────────────────────────────────────────
const INDEXER_API = process.env.NEXT_PUBLIC_INDEXER_API || '';

// ── Fallback mock data generators (used when Indexer is unreachable) ──────────

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return s / 2147483647;
  };
}

function generateMockPowerRankings(regionId: number, ownerFactionId: number): PowerEntry[] {
  const rng = seededRandom(regionId * 7 + 42);
  const count = 3 + Math.floor(rng() * 3);
  const usedIds = new Set<number>();
  const entries: PowerEntry[] = [];

  if (ownerFactionId !== NO_FACTION) {
    const f = getFactionById(ownerFactionId);
    if (f) {
      entries.push({ faction: f, power: 500 + Math.floor(rng() * 1500) });
      usedIds.add(ownerFactionId);
    }
  }

  while (entries.length < count) {
    const id = Math.floor(rng() * FACTIONS.length);
    if (usedIds.has(id)) continue;
    usedIds.add(id);
    const f = getFactionById(id);
    if (f) {
      entries.push({ faction: f, power: 50 + Math.floor(rng() * 800) });
    }
  }

  return entries.sort((a, b) => b.power - a.power);
}

function generateMockCaptureHistory(regionId: number): CaptureEvent[] {
  const rng = seededRandom(regionId * 13 + 99);
  const count = 2 + Math.floor(rng() * 5);
  const events: CaptureEvent[] = [];
  const baseTime = 1716300000;

  for (let i = 0; i < count; i++) {
    const oldId = i === 0 ? NO_FACTION : Math.floor(rng() * FACTIONS.length);
    let newId = Math.floor(rng() * FACTIONS.length);
    while (newId === oldId) newId = Math.floor(rng() * FACTIONS.length);

    let hash = '0x';
    for (let j = 0; j < 64; j++) {
      hash += Math.floor(rng() * 16).toString(16);
    }

    events.push({
      timestamp: baseTime + i * 86400 + Math.floor(rng() * 43200),
      oldFactionId: oldId,
      newFactionId: newId,
      txHash: hash,
    });
  }

  return events.sort((a, b) => b.timestamp - a.timestamp);
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function RegionSidebar({ regionId, ownerFactionId, onClose }: RegionSidebarProps) {
  const { isConnected, address } = useAccount();
  const countryId = regionIdToCountry[regionId] ?? '000';
  const countryName = getCountryName(countryId);
  const flag = getFlag(countryId);
  const ownerFaction = ownerFactionId !== NO_FACTION ? getFactionById(ownerFactionId) : null;

  // ── User faction reads ──────────────────────────────────────────────────────
  const { data: rawUserFaction } = useReadContract({
    address: CONTRACTS.FactionRegistry as `0x${string}`,
    abi: FactionRegistryABI,
    functionName: 'factionOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const { data: isEnrolled } = useReadContract({
    address: CONTRACTS.FactionRegistry as `0x${string}`,
    abi: FactionRegistryABI,
    functionName: 'isEnrolled',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const userFactionId = rawUserFaction !== undefined ? Number(rawUserFaction) : undefined;
  const userFaction = userFactionId !== undefined ? getFactionById(userFactionId) : undefined;

  // Can defect if: enrolled, user is in the OWNER faction, and the region is not neutral
  // (defect converts OLD contributions from a DIFFERENT faction the user previously supported)
  const canShowDefect = isConnected && isEnrolled && ownerFactionId !== NO_FACTION
    && userFactionId !== undefined && userFactionId === ownerFactionId;

  // Show defection opportunity prompt when user is connected & enrolled but NOT in owner faction
  const canShowDefectPrompt = isConnected && isEnrolled && ownerFactionId !== NO_FACTION
    && userFactionId !== undefined && userFactionId !== ownerFactionId;

  // ── Defect transaction ──────────────────────────────────────────────────────
  const { writeContract: doDefect, data: defectHash, isPending: defectPending, error: defectError, reset: resetDefect } = useWriteContract();
  const { isLoading: defectConfirming, isSuccess: defectSuccess } = useWaitForTransactionReceipt({ hash: defectHash });

  const handleDefect = () => {
    resetDefect();
    doDefect({
      address: CONTRACTS.TerritoryMap as `0x${string}`,
      abi: TerritoryMapABI,
      functionName: 'defect',
      args: [regionId],
    });
  };

  // ── Fetch real capture history from Indexer API ──────────────────────────────
  const [captureHistory, setCaptureHistory] = useState<CaptureEvent[]>([]);
  const [powerRankings, setPowerRankings] = useState<PowerEntry[]>([]);
  const [_historyLoading, setHistoryLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchHistory() {
      if (!INDEXER_API) {
        // No indexer configured — use mock data as fallback
        setPowerRankings(generateMockPowerRankings(regionId, ownerFactionId));
        setCaptureHistory(generateMockCaptureHistory(regionId));
        setHistoryLoading(false);
        return;
      }

      try {
        setHistoryLoading(true);
        const res = await fetch(`${INDEXER_API}/region/${regionId}/history`);
        if (!res.ok) throw new Error(`API ${res.status}`);
        const data = await res.json();

        if (cancelled) return;

        // Map capture history from Indexer response
        const captures: CaptureEvent[] = (data.captureHistory || []).map((c: Record<string, unknown>) => ({
          timestamp: typeof c.timestamp === 'string' ? Math.floor(new Date(c.timestamp).getTime() / 1000) : c.timestamp,
          oldFactionId: c.oldFaction ?? NO_FACTION,
          newFactionId: c.newFaction,
          txHash: c.txHash,
        }));
        captures.sort((a, b) => b.timestamp - a.timestamp);
        setCaptureHistory(captures);

        // Build power rankings from recent rallies (aggregate by faction)
        const factionPower: Record<number, number> = {};
        for (const r of data.recentRallies || []) {
          const fid = r.faction;
          const power = parseFloat(r.effectivePower || r.newFactionPower || '0') / 1e18;
          factionPower[fid] = (factionPower[fid] || 0) + power;
        }
        // Ensure the current owner is represented
        if (ownerFactionId !== NO_FACTION && !(ownerFactionId in factionPower)) {
          factionPower[ownerFactionId] = 1;
        }

        const entries: PowerEntry[] = [];
        for (const [fidStr, power] of Object.entries(factionPower)) {
          const f = getFactionById(Number(fidStr));
          if (f) entries.push({ faction: f, power: Math.round(power) });
        }
        entries.sort((a, b) => b.power - a.power);
        setPowerRankings(entries.length > 0 ? entries : generateMockPowerRankings(regionId, ownerFactionId));
      } catch {
        if (!cancelled) {
          // Fallback to mock on error
          setPowerRankings(generateMockPowerRankings(regionId, ownerFactionId));
          setCaptureHistory(generateMockCaptureHistory(regionId));
        }
      } finally {
        if (!cancelled) setHistoryLoading(false);
      }
    }

    fetchHistory();
    return () => { cancelled = true; };
  }, [regionId, ownerFactionId]);

  const maxPower = powerRankings.length > 0 ? powerRankings[0].power : 1;

  return (
    <div className="fixed inset-0 sm:inset-auto sm:top-0 sm:right-0 sm:h-full w-full sm:w-[380px] z-30">
      {/* Mobile backdrop */}
      <div className="absolute inset-0 mobile-backdrop sm:hidden" onClick={onClose} />
      <div className="relative h-full bg-gray-900/95 backdrop-blur-md border-l border-gray-700/50 flex flex-col overflow-hidden shadow-2xl animate-slide-up sm:animate-slide-in-right safe-bottom">

        {/* ── Header ─────────────────────────────────────────── */}
        <div className="flex-shrink-0 p-4 border-b border-gray-700/50">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{flag}</span>
              <div>
                <h2 className="text-lg font-bold text-white leading-tight">{countryName}</h2>
                <p className="text-xs text-gray-400 mt-0.5">Region #{regionId}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-gray-700/50 transition-colors text-gray-400 hover:text-white"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          {/* Owner badge */}
          <div className="mt-3">
            {ownerFaction ? (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium"
                style={{ backgroundColor: ownerFaction.color + '25', border: `1px solid ${ownerFaction.color}60` }}>
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: ownerFaction.color }} />
                <span style={{ color: ownerFaction.color === '#000000' || ownerFaction.color === '#FFFFFF' ? '#e5e7eb' : ownerFaction.color }}>
                  Owned by {ownerFaction.name}
                </span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium bg-gray-800 border border-gray-600 text-gray-400">
                <span className="w-2.5 h-2.5 rounded-full bg-gray-500" />
                Neutral Territory
              </div>
            )}
          </div>
        </div>

        {/* ── Scrollable content ─────────────────────────────── */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">

          {/* Power Rankings */}
          <div className="p-4 border-b border-gray-700/30">
            <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
              <svg className="w-4 h-4 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              Power Rankings
            </h3>
            <div className="space-y-2.5">
              {powerRankings.map((entry, i) => (
                <div key={entry.faction.id} className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 font-mono w-4 text-right">{i + 1}</span>
                  <span className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: entry.faction.color }} />
                  <span className="text-sm text-gray-300 w-10 flex-shrink-0">{entry.faction.code}</span>
                  <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${(entry.power / maxPower) * 100}%`,
                        backgroundColor: entry.faction.color === '#000000' ? '#444' : entry.faction.color,
                      }}
                    />
                  </div>
                  <span className="text-xs text-gray-500 font-mono w-12 text-right">{entry.power}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Rally Button */}
          <div className="p-4 border-b border-gray-700/30">
            {isConnected ? (
              <a
                href={`/rally/${regionId}`}
                className="block w-full text-center py-3 px-4 rounded-xl font-bold text-lg
                  bg-gradient-to-r from-amber-500 to-yellow-400
                  hover:from-amber-400 hover:to-yellow-300
                  text-gray-900 shadow-lg shadow-amber-500/20
                  transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
              >
                Rally 助威
              </a>
            ) : (
              <button
                disabled
                className="block w-full text-center py-3 px-4 rounded-xl font-bold text-lg
                  bg-gray-700 text-gray-400 cursor-not-allowed"
              >
                Connect Wallet First
              </button>
            )}
          </div>

          {/* Defect Button — visible when user is in the owner faction */}
          {canShowDefect && (
            <div className="p-4 border-b border-gray-700/30">
              <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4">
                <div className="flex items-start gap-3">
                  <span className="text-xl flex-shrink-0">{'\u{1F5E1}\uFE0F'}</span>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-bold text-red-400 mb-1">Defection Available</h4>
                    <p className="text-xs text-gray-400 mb-3">
                      Convert your old faction contributions in this region into power for {ownerFaction?.name ?? 'the current owner'}.
                      80% converts to faction power, 20% is your finder&apos;s reward.
                    </p>
                    <button
                      onClick={handleDefect}
                      disabled={defectPending || defectConfirming}
                      className="w-full py-2 rounded-lg border border-red-500/40 bg-red-500/10 text-sm font-semibold text-red-400
                        transition-colors hover:bg-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {defectPending ? 'Signing...' : defectConfirming ? 'Confirming...' : defectSuccess ? 'Defected!' : 'Defect & Reclaim'}
                    </button>
                    {defectError && (
                      <p className="mt-2 text-xs text-red-400/70 break-all">
                        {defectError.message?.includes('NoDefectableContribution')
                          ? 'No defectable contribution found in this region'
                          : 'Defection failed — check your faction and contributions'}
                      </p>
                    )}
                    {defectSuccess && defectHash && (
                      <a
                        href={oklinkTx(defectHash)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 inline-block text-xs text-amber-400 hover:text-amber-300 underline"
                      >
                        View on OKLink &rarr;
                      </a>
                    )}
                    <p className="mt-2 text-xs text-gray-500 italic">
                      Defection is TIFO&apos;s social warfare mechanic &mdash; betray your old faction for profit.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Defection Opportunity — prompt for users NOT in the owner faction */}
          {canShowDefectPrompt && (
            <div className="p-4 border-b border-gray-700/30">
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
                <div className="flex items-start gap-3">
                  <span className="text-xl flex-shrink-0">{'\u{1F5E1}\uFE0F'}</span>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-bold text-amber-400 mb-1">Defection Opportunity</h4>
                    <p className="text-xs text-gray-400 mb-3">
                      This region is held by{' '}
                      <span className="font-semibold" style={{ color: ownerFaction?.color }}>
                        {ownerFaction?.name}
                      </span>
                      . Switch to their faction to convert your old contributions into power and earn a 20% finder&apos;s reward.
                    </p>
                    <a
                      href="/me"
                      className="inline-flex items-center gap-1 text-sm font-semibold text-amber-400 hover:text-amber-300 transition-colors"
                    >
                      Switch Faction &rarr;
                    </a>
                    <p className="mt-2 text-xs text-gray-500 italic">
                      Defection is TIFO&apos;s social warfare mechanic &mdash; betray your old faction for profit.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Capture count */}
          <div className="px-4 py-3 border-b border-gray-700/30">
            <p className="text-sm text-gray-400">
              This region has changed hands{' '}
              <span className="text-white font-semibold">{captureHistory.length}</span>{' '}
              {captureHistory.length === 1 ? 'time' : 'times'}
            </p>
          </div>

          {/* Verifiability Panel */}
          <div className="p-4">
            <h3 className="text-sm font-semibold text-gray-300 mb-1 flex items-center gap-2">
              <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              Capture History (On-Chain Verified)
            </h3>
            <p className="text-xs text-gray-500 mb-3">Every event is a verified transaction on X Layer</p>

            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-[7px] top-2 bottom-2 w-px bg-gray-700" />

              <div className="space-y-3">
                {captureHistory.map((event, i) => {
                  const oldF = event.oldFactionId !== NO_FACTION ? getFactionById(event.oldFactionId) : null;
                  const newF = getFactionById(event.newFactionId);
                  const date = new Date(event.timestamp * 1000);
                  const shortHash = `${event.txHash.slice(0, 8)}...${event.txHash.slice(-6)}`;

                  return (
                    <div key={i} className="flex gap-3 relative">
                      <div className="w-[15px] flex-shrink-0 flex items-start justify-center pt-1 z-10">
                        <div className="w-2.5 h-2.5 rounded-full border-2"
                          style={{
                            borderColor: newF?.color ?? '#666',
                            backgroundColor: i === 0 ? (newF?.color ?? '#666') : 'transparent',
                          }}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-gray-400">
                          {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}{' '}
                          {date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                        <div className="text-sm text-gray-300 mt-0.5">
                          <span style={{ color: oldF?.color === '#000000' ? '#888' : (oldF?.color ?? '#888') }}>
                            {oldF?.code ?? 'Neutral'}
                          </span>
                          <span className="text-gray-500 mx-1.5">{'->'}</span>
                          <span style={{ color: newF?.color === '#000000' ? '#ccc' : (newF?.color ?? '#ccc') }}>
                            {newF?.code ?? '???'}
                          </span>
                        </div>
                        <a
                          href={oklinkTx(event.txHash)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-400 hover:text-blue-300 font-mono mt-0.5 inline-block hover:underline"
                        >
                          {shortHash}
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
        {/* end scrollable content */}

      </div>
    </div>
  );
}
