'use client';

import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { FACTIONS, FACTION_COUNT } from '@/config/factions';
import { CONTRACTS } from '@/config/contracts';
import { TerritoryMapABI } from '@/config/abi/TerritoryMap';
import { useReadContract } from 'wagmi';
import { useMemo } from 'react';

/* ── Faction flag lookup ─────────────────────────────────────────────────── */

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

/* ── Rank badge helpers ──────────────────────────────────────────────────── */

const RANK_STYLES: Record<number, string> = {
  1: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40',
  2: 'bg-gray-300/20 text-gray-300 border-gray-400/40',
  3: 'bg-amber-700/20 text-amber-500 border-amber-600/40',
};

const RANK_LABELS: Record<number, string> = { 1: '\u{1F947}', 2: '\u{1F948}', 3: '\u{1F949}' };

/* ── Page ─────────────────────────────────────────────────────────────────── */

export default function LeaderboardPage() {
  /* ── On-chain data ─────────────────────────────────────────────────────── */

  const { data: rawCounts, isLoading } = useReadContract({
    address: CONTRACTS.TerritoryMap as `0x${string}`,
    abi: TerritoryMapABI,
    functionName: 'territoryCounts',
  });

  /* ── Derived ranking ───────────────────────────────────────────────────── */

  const ranked = useMemo(() => {
    const counts: bigint[] = (rawCounts as bigint[] | undefined) ?? [];
    return FACTIONS.map((f) => ({
      ...f,
      territories: f.id < counts.length ? Number(counts[f.id]) : 0,
    }))
      .sort((a, b) => b.territories - a.territories || a.id - b.id);
  }, [rawCounts]);

  const totalContested = useMemo(
    () => ranked.reduce((s, f) => s + f.territories, 0),
    [ranked],
  );

  /* ── UI ─────────────────────────────────────────────────────────────────── */

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <Navbar />

      <main className="pt-24 pb-16 px-4 max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">
            Faction Leaderboard
          </h1>
          <p className="mt-3 text-gray-400 text-sm">
            {FACTION_COUNT} factions competing &middot;{' '}
            <span className="text-white font-semibold">{totalContested}</span> regions contested
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-32">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
          </div>
        ) : (
          <>
            {/* ── Desktop table ──────────────────────────────────────────── */}
            <div className="hidden md:block overflow-x-auto rounded-xl border border-gray-800 bg-gray-900/50 backdrop-blur">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800 text-gray-500 text-xs uppercase tracking-wider">
                    <th className="px-4 py-3 text-left w-16">Rank</th>
                    <th className="px-4 py-3 text-left w-12">Flag</th>
                    <th className="px-4 py-3 text-left">Faction</th>
                    <th className="px-4 py-3 text-left w-20">Code</th>
                    <th className="px-4 py-3 text-left w-28">Conf.</th>
                    <th className="px-4 py-3 text-right w-28">Territories</th>
                    <th className="px-4 py-3 w-10" />
                  </tr>
                </thead>
                <tbody>
                  {ranked.map((f, i) => {
                    const rank = i + 1;
                    const isTop3 = rank <= 3;
                    return (
                      <tr
                        key={f.id}
                        className={`border-b border-gray-800/50 transition-colors hover:bg-gray-800/40 ${isTop3 ? 'bg-gray-900/80' : ''}`}
                      >
                        <td className="px-4 py-3">
                          {isTop3 ? (
                            <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full border text-sm font-bold ${RANK_STYLES[rank]}`}>
                              {RANK_LABELS[rank]}
                            </span>
                          ) : (
                            <span className="text-gray-500 font-mono">{rank}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-2xl">
                          {FACTION_FLAGS[f.anchor] ?? ''}
                        </td>
                        <td className="px-4 py-3">
                          <Link href={`/faction/${f.id}`} className="font-semibold text-white hover:text-amber-400 transition-colors">
                            {f.name}
                          </Link>
                        </td>
                        <td className="px-4 py-3 font-mono text-gray-400">{f.code}</td>
                        <td className="px-4 py-3 text-gray-400">{f.confederation}</td>
                        <td className="px-4 py-3 text-right font-bold tabular-nums">{f.territories}</td>
                        <td className="px-4 py-3">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: f.color }} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* ── Mobile card view ───────────────────────────────────────── */}
            <div className="md:hidden flex flex-col gap-3">
              {ranked.map((f, i) => {
                const rank = i + 1;
                const isTop3 = rank <= 3;
                return (
                  <Link
                    key={f.id}
                    href={`/faction/${f.id}`}
                    className={`flex items-center gap-3 rounded-xl border p-4 transition-colors hover:border-gray-600 ${
                      isTop3
                        ? 'border-amber-500/30 bg-gray-900/80'
                        : 'border-gray-800 bg-gray-900/40'
                    }`}
                  >
                    <span className="w-8 text-center font-bold text-sm text-gray-400">
                      {isTop3 ? RANK_LABELS[rank] : rank}
                    </span>
                    <span className="text-2xl">{FACTION_FLAGS[f.anchor] ?? ''}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white truncate">{f.name}</span>
                        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: f.color }} />
                      </div>
                      <span className="text-xs text-gray-500">{f.code} &middot; {f.confederation}</span>
                    </div>
                    <span className="font-bold text-lg tabular-nums">{f.territories}</span>
                  </Link>
                );
              })}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
