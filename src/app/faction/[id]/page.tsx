'use client';

import { use, useMemo } from 'react';
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

/* ── Mock contributors ───────────────────────────────────────────────────── */

function generateMockContributors(factionId: number) {
  const base = factionId * 7 + 3;
  return Array.from({ length: 10 }, (_, i) => ({
    address: `0x${((base + i) * 0xABCDEF1234).toString(16).padStart(40, '0').slice(0, 40)}`,
    amount: ((10 - i) * 250 + factionId * 13) / 1,
  }));
}

/* ── Page ─────────────────────────────────────────────────────────────────── */

export default function FactionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: rawId } = use(params);
  const factionId = Number(rawId);
  const faction = getFactionById(factionId);

  /* ── On-chain reads ────────────────────────────────────────────────────── */

  const { data: rawCounts } = useReadContract({
    address: CONTRACTS.TerritoryMap as `0x${string}`,
    abi: TerritoryMapABI,
    functionName: 'territoryCounts',
  });

  const { data: mapState } = useReadContract({
    address: CONTRACTS.TerritoryMap as `0x${string}`,
    abi: TerritoryMapABI,
    functionName: 'getMapState',
  });

  const { data: rawPrizePool } = useReadContract({
    address: CONTRACTS.WarChest as `0x${string}`,
    abi: WarChestABI,
    functionName: 'factionPrizePool',
    args: [factionId],
  });

  const { data: rawMemberCount } = useReadContract({
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
  const mockContributors = useMemo(() => generateMockContributors(factionId), [factionId]);

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

        {/* ── Top contributors (mock) ────────────────────────────────────── */}
        <section>
          <h2 className="text-lg font-bold mb-4">Top Contributors</h2>
          <div className="rounded-xl border border-gray-800 bg-gray-900/50 backdrop-blur overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-gray-500 text-xs uppercase tracking-wider">
                  <th className="px-4 py-3 text-left w-10">#</th>
                  <th className="px-4 py-3 text-left">Address</th>
                  <th className="px-4 py-3 text-right">Contributed (USDT)</th>
                </tr>
              </thead>
              <tbody>
                {mockContributors.map((c, i) => (
                  <tr key={i} className="border-b border-gray-800/40 hover:bg-gray-800/30 transition-colors">
                    <td className="px-4 py-2.5 text-gray-500 font-mono">{i + 1}</td>
                    <td className="px-4 py-2.5 font-mono text-xs text-gray-300">
                      {c.address.slice(0, 6)}...{c.address.slice(-4)}
                    </td>
                    <td className="px-4 py-2.5 text-right font-semibold tabular-nums">{c.amount.toLocaleString()}</td>
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
