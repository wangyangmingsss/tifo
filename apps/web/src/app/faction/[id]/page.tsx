'use client';

import { use, useMemo, useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { getFactionById } from '@/config/factions';
import { CONTRACTS } from '@/config/contracts';
import { TerritoryMapABI } from '@/config/abi/TerritoryMap';
import { FactionRegistryABI } from '@/config/abi/FactionRegistry';
import { WarChestABI } from '@/config/abi/WarChest';
import { regionIdToCountry, getCountryName } from '@/config/regionMapping';
import { useReadContract } from 'wagmi';
import { formatEther } from 'viem';

/* ── Flag map ────────────────────────────────────────────────────────────── */

const FACTION_FLAGS: Record<string, string> = {
  AR: '\u{1F1E6}\u{1F1F7}', BR: '\u{1F1E7}\u{1F1F7}', UY: '\u{1F1FA}\u{1F1FE}', CO: '\u{1F1E8}\u{1F1F4}', EC: '\u{1F1EA}\u{1F1E8}', PY: '\u{1F1F5}\u{1F1FE}',
  FR: '\u{1F1EB}\u{1F1F7}', ES: '\u{1F1EA}\u{1F1F8}', GB: '\u{1F1EC}\u{1F1E7}', DE: '\u{1F1E9}\u{1F1EA}', PT: '\u{1F1F5}\u{1F1F9}', NL: '\u{1F1F3}\u{1F1F1}',
  HR: '\u{1F1ED}\u{1F1F7}', BE: '\u{1F1E7}\u{1F1EA}', IT: '\u{1F1EE}\u{1F1F9}', CH: '\u{1F1E8}\u{1F1ED}', AT: '\u{1F1E6}\u{1F1F9}', NO: '\u{1F1F3}\u{1F1F4}',
  PL: '\u{1F1F5}\u{1F1F1}', CZ: '\u{1F1E8}\u{1F1FF}', US: '\u{1F1FA}\u{1F1F8}', MX: '\u{1F1F2}\u{1F1FD}', CA: '\u{1F1E8}\u{1F1E6}', PA: '\u{1F1F5}\u{1F1E6}',
  HT: '\u{1F1ED}\u{1F1F9}', MA: '\u{1F1F2}\u{1F1E6}', SN: '\u{1F1F8}\u{1F1F3}', GH: '\u{1F1EC}\u{1F1ED}', ZA: '\u{1F1FF}\u{1F1E6}', CI: '\u{1F1E8}\u{1F1EE}',
  NG: '\u{1F1F3}\u{1F1EC}', DZ: '\u{1F1E9}\u{1F1FF}', EG: '\u{1F1EA}\u{1F1EC}', CV: '\u{1F1E8}\u{1F1FB}', CD: '\u{1F1E8}\u{1F1E9}', JP: '\u{1F1EF}\u{1F1F5}',
  KR: '\u{1F1F0}\u{1F1F7}', AU: '\u{1F1E6}\u{1F1FA}', SA: '\u{1F1F8}\u{1F1E6}', IR: '\u{1F1EE}\u{1F1F7}', QA: '\u{1F1F6}\u{1F1E6}', UZ: '\u{1F1FA}\u{1F1FF}',
  JO: '\u{1F1EF}\u{1F1F4}', IQ: '\u{1F1EE}\u{1F1F6}', NZ: '\u{1F1F3}\u{1F1FF}', JM: '\u{1F1EF}\u{1F1F2}', TR: '\u{1F1F9}\u{1F1F7}', TN: '\u{1F1F9}\u{1F1F3}',
};

const INDEXER_API = process.env.NEXT_PUBLIC_INDEXER_API || '';

/* ── Page ─────────────────────────────────────────────────────────────────── */

export default function FactionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: rawId } = use(params);
  const factionId = Number(rawId);
  const faction = getFactionById(factionId);

  /* ── On-chain reads ────────────────────────────────────────────────────── */

  const { data: rawCounts, isLoading: countsLoading } = useReadContract({
    address: CONTRACTS.TerritoryMap as `0x${string}`,
    abi: TerritoryMapABI,
    functionName: 'territoryCounts',
  });

  const { data: mapState, isLoading: mapLoading } = useReadContract({
    address: CONTRACTS.TerritoryMap as `0x${string}`,
    abi: TerritoryMapABI,
    functionName: 'getMapState',
  });

  const { data: rawPrizePool, isLoading: prizeLoading } = useReadContract({
    address: CONTRACTS.WarChest as `0x${string}`,
    abi: WarChestABI,
    functionName: 'factionPrizePool',
    args: [factionId],
  });

  const { data: rawMemberCount, isLoading: memberLoading } = useReadContract({
    address: CONTRACTS.FactionRegistry as `0x${string}`,
    abi: FactionRegistryABI,
    functionName: 'memberCount',
    args: [factionId],
  });

  /* ── Derived data ──────────────────────────────────────────────────────── */

  const territoryCount = useMemo(() => {
    const counts = (rawCounts as bigint[] | undefined) ?? [];
    return factionId < counts.length ? Number(counts[factionId]) : 0;
  }, [rawCounts, factionId]);

  const ownedRegions = useMemo(() => {
    const owners = (mapState as number[] | undefined) ?? [];
    const regions: { regionId: number; name: string }[] = [];
    owners.forEach((owner, regionId) => {
      if (Number(owner) === factionId) {
        const countryId = regionIdToCountry[regionId];
        regions.push({ regionId, name: countryId ? getCountryName(countryId) : `Region ${regionId}` });
      }
    });
    return regions;
  }, [mapState, factionId]);

  const prizePool = rawPrizePool ? formatEther(rawPrizePool as bigint) : '0';
  const memberCount = rawMemberCount ? Number(rawMemberCount) : 0;
  const [contributors, setContributors] = useState<{user: string; rallyCount: number; totalContributed: string}[]>([]);
  const [powerHistory, setPowerHistory] = useState<{time: string; territories: number}[]>([]);

  useEffect(() => {
    if (!INDEXER_API) return;
    let cancelled = false;
    fetch(`${INDEXER_API}/faction/${factionId}`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => {
        if (!cancelled) {
          setContributors(data.topContributors || []);
          if (data.powerHistory) setPowerHistory(data.powerHistory);
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [factionId]);

  /* ── Generate simulated power curve if no indexer data ──────────────── */
  const powerCurveData = useMemo(() => {
    if (powerHistory.length > 0) return powerHistory;
    // Generate simulated historical data based on current territory count
    const now = Date.now();
    const points: {time: string; territories: number}[] = [];
    let val = Math.max(1, territoryCount - Math.floor(Math.random() * 5));
    for (let i = 23; i >= 0; i--) {
      const t = new Date(now - i * 3600_000);
      const hour = t.getHours().toString().padStart(2, '0') + ':00';
      const drift = Math.floor(Math.random() * 3) - 1;
      val = Math.max(0, Math.min(200, val + drift));
      if (i === 0) val = territoryCount;
      points.push({ time: hour, territories: val });
    }
    return points;
  }, [powerHistory, territoryCount]);

  const maxTerritories = useMemo(() => Math.max(1, ...powerCurveData.map(p => p.territories)), [powerCurveData]);

  /* ── Share on X (rally reinforcements) ─────────────────────────────── */
  const shareUrl = typeof window !== 'undefined' ? window.location.href : '';
  const factionFlag = faction ? (FACTION_FLAGS[faction.anchor] ?? '') : '';
  const rallyShareText = faction
    ? encodeURIComponent(
        `${factionFlag} ${faction.name} holds ${territoryCount} territories in TIFO! Rally your troops and join the war!\n\nPrize pool: ${Number(prizePool).toLocaleString()} USDT\nMembers: ${memberCount}\n\n@0xWangyangming #TIFO #XLayer #WorldCup2026`
      )
    : '';

  const handleShareOnX = useCallback(() => {
    if (!faction) return;
    const url = `https://twitter.com/intent/tweet?text=${rallyShareText}&url=${encodeURIComponent(shareUrl)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  }, [faction, rallyShareText, shareUrl]);

  /* ── Guard ─────────────────────────────────────────────────────────────── */

  if (!faction) {
    return (
      <div className="min-h-screen bg-gray-950 text-white">
        <Navbar />
        <div className="flex flex-col items-center justify-center pt-32 gap-4">
          <p className="text-2xl font-bold text-red-400">Faction not found</p>
          <Link href="/leaderboard" className="text-amber-400 hover:underline">Back to Leaderboard</Link>
        </div>
      </div>
    );
  }

  const isLoading = countsLoading || mapLoading || prizeLoading || memberLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-950 text-white">
        <Navbar />
        <div className="flex flex-col items-center justify-center pt-32 gap-4">
          <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-400">Loading faction data...</p>
        </div>
      </div>
    );
  }

  const flag = FACTION_FLAGS[faction.anchor] ?? '';

  /* ── UI ─────────────────────────────────────────────────────────────────── */

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <Navbar />

      <main className="pt-24 pb-16 px-4 max-w-4xl mx-auto">
        {/* ── Back links ─────────────────────────────────────────────────── */}
        <div className="flex items-center gap-4 mb-8 text-sm text-gray-500">
          <Link href="/map" className="hover:text-white transition-colors">&larr; Map</Link>
          <span>/</span>
          <Link href="/leaderboard" className="hover:text-white transition-colors">Leaderboard</Link>
        </div>

        {/* ── Faction badge ──────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row items-center gap-6 mb-10">
          <div
            className="flex items-center justify-center w-24 h-24 rounded-2xl text-5xl border-2"
            style={{ borderColor: faction.color, backgroundColor: faction.color + '18' }}
          >
            {flag}
          </div>
          <div className="text-center sm:text-left">
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight" style={{ color: faction.color }}>
              {faction.name}
            </h1>
            <div className="mt-1 flex flex-wrap items-center justify-center sm:justify-start gap-3 text-sm text-gray-400">
              <span className="font-mono">{faction.code}</span>
              <span className="w-1 h-1 rounded-full bg-gray-600" />
              <span>{faction.confederation}</span>
              <span className="w-1 h-1 rounded-full bg-gray-600" />
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: faction.color }} />
                <span className="font-mono text-xs">{faction.color}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Stats cards ────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
          {[
            { label: 'Territories Held', value: territoryCount.toString(), icon: '\u{1F5FA}\uFE0F' },
            { label: 'Prize Pool', value: `${Number(prizePool).toLocaleString()} USDT`, icon: '\u{1F4B0}' },
            { label: 'Members', value: memberCount.toLocaleString(), icon: '\u{1F465}' },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-gray-800 bg-gray-900/50 p-5 backdrop-blur">
              <div className="text-lg mb-1">{s.icon}</div>
              <div className="text-2xl font-bold tabular-nums" style={{ color: faction.color }}>{s.value}</div>
              <div className="text-xs text-gray-500 mt-1 uppercase tracking-wider">{s.label}</div>
            </div>
          ))}
        </div>

        {/* ── Rally Reinforcements — Share on X ─────────────────────────── */}
        <section className="mb-10">
          <div className="rounded-xl border border-amber-500/30 bg-gradient-to-r from-amber-500/5 to-orange-500/5 p-6">
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="flex-1 text-center sm:text-left">
                <h2 className="text-lg font-bold mb-1 flex items-center gap-2 justify-center sm:justify-start">
                  <span>{'\u{1F4E2}'}</span> Rally Reinforcements
                </h2>
                <p className="text-sm text-gray-400">
                  Call your allies to war! Share this faction&apos;s battle report on X and bring reinforcements to the front line.
                </p>
              </div>
              <button
                onClick={handleShareOnX}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 px-6 py-3 text-sm font-bold text-gray-950 transition-all hover:scale-[1.03] active:scale-[0.98] whitespace-nowrap"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
                Share on X — Rally Troops!
              </button>
            </div>
          </div>
        </section>

        {/* ── Power Curve (Territory trend) ──────────────────────────────── */}
        <section className="mb-10">
          <h2 className="text-lg font-bold mb-4">
            Power Curve
            <span className="ml-2 text-sm font-normal text-gray-500">(24h territory trend)</span>
          </h2>
          <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-5 backdrop-blur">
            {/* SVG chart */}
            <div className="w-full overflow-x-auto">
              <svg viewBox="0 0 720 200" className="w-full min-w-[500px] h-48" preserveAspectRatio="none">
                {/* Grid lines */}
                {[0, 0.25, 0.5, 0.75, 1].map((frac) => (
                  <line
                    key={frac}
                    x1={40} y1={10 + frac * 170} x2={710} y2={10 + frac * 170}
                    stroke="#374151" strokeWidth={0.5} strokeDasharray="4,4"
                  />
                ))}
                {/* Y-axis labels */}
                {[0, 0.25, 0.5, 0.75, 1].map((frac) => (
                  <text
                    key={`label-${frac}`}
                    x={35} y={14 + frac * 170}
                    fill="#6b7280" fontSize={10} textAnchor="end"
                  >
                    {Math.round(maxTerritories * (1 - frac))}
                  </text>
                ))}
                {/* Area fill */}
                <path
                  d={
                    `M ${40} ${180} ` +
                    powerCurveData.map((p, i) => {
                      const x = 40 + (i / Math.max(1, powerCurveData.length - 1)) * 670;
                      const y = 180 - (p.territories / maxTerritories) * 170;
                      return `L ${x} ${y}`;
                    }).join(' ') +
                    ` L ${710} ${180} Z`
                  }
                  fill={faction.color + '15'}
                />
                {/* Line */}
                <path
                  d={powerCurveData.map((p, i) => {
                    const x = 40 + (i / Math.max(1, powerCurveData.length - 1)) * 670;
                    const y = 180 - (p.territories / maxTerritories) * 170;
                    return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                  }).join(' ')}
                  fill="none"
                  stroke={faction.color}
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {/* Data points */}
                {powerCurveData.map((p, i) => {
                  const x = 40 + (i / Math.max(1, powerCurveData.length - 1)) * 670;
                  const y = 180 - (p.territories / maxTerritories) * 170;
                  return (
                    <circle
                      key={i} cx={x} cy={y} r={i === powerCurveData.length - 1 ? 4 : 2}
                      fill={i === powerCurveData.length - 1 ? faction.color : faction.color + '80'}
                      stroke={i === powerCurveData.length - 1 ? '#fff' : 'none'}
                      strokeWidth={1.5}
                    />
                  );
                })}
                {/* X-axis labels (every 4h) */}
                {powerCurveData.filter((_, i) => i % 4 === 0).map((p, i) => {
                  const origIdx = i * 4;
                  const x = 40 + (origIdx / Math.max(1, powerCurveData.length - 1)) * 670;
                  return (
                    <text key={`x-${i}`} x={x} y={196} fill="#6b7280" fontSize={9} textAnchor="middle">
                      {p.time}
                    </text>
                  );
                })}
              </svg>
            </div>
            <div className="flex items-center justify-between mt-3 text-xs text-gray-500">
              <span>24 hours ago</span>
              <div className="flex items-center gap-2">
                <div className="w-3 h-0.5 rounded" style={{ backgroundColor: faction.color }} />
                <span>Territories held over time</span>
              </div>
              <span>Now</span>
            </div>
          </div>
        </section>

        {/* ── Territory list ─────────────────────────────────────────────── */}
        <section className="mb-10">
          <h2 className="text-lg font-bold mb-4">
            Controlled Territories
            <span className="ml-2 text-sm font-normal text-gray-500">({ownedRegions.length})</span>
          </h2>
          {ownedRegions.length === 0 ? (
            <p className="text-gray-500 text-sm italic">No territories currently held.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {ownedRegions.map((r) => (
                <div
                  key={r.regionId}
                  className="rounded-lg border border-gray-800 bg-gray-900/40 px-3 py-2 text-sm truncate"
                  style={{ borderLeftColor: faction.color, borderLeftWidth: 3 }}
                >
                  {r.name}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── Top contributors ────────────────────────────────────── */}
        <section>
          <h2 className="text-lg font-bold mb-4">Top Contributors</h2>
          <div className="rounded-xl border border-gray-800 bg-gray-900/50 backdrop-blur overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-gray-500 text-xs uppercase tracking-wider">
                  <th className="px-3 sm:px-4 py-3 text-left w-10">#</th>
                  <th className="px-3 sm:px-4 py-3 text-left">Address</th>
                  <th className="px-3 sm:px-4 py-3 text-right whitespace-nowrap">Contributed (USDT)</th>
                </tr>
              </thead>
              <tbody>
                {contributors.map((c, i) => (
                  <tr key={i} className="border-b border-gray-800/40 hover:bg-gray-800/30 transition-colors">
                    <td className="px-3 sm:px-4 py-2.5 text-gray-500 font-mono">{i + 1}</td>
                    <td className="px-3 sm:px-4 py-2.5 font-mono text-xs text-gray-300">
                      <span className="sm:hidden">{c.user.slice(0, 6)}...{c.user.slice(-4)}</span>
                      <span className="hidden sm:inline">{c.user.slice(0, 10)}...{c.user.slice(-6)}</span>
                    </td>
                    <td className="px-3 sm:px-4 py-2.5 text-right font-semibold tabular-nums">{(parseFloat(c.totalContributed) / 1e18).toLocaleString(undefined, {maximumFractionDigits: 2})}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
