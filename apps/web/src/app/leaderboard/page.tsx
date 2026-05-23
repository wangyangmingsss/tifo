'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useReadContract } from 'wagmi';
import { CONTRACTS } from '@/lib/contracts';
import { TerritoryMapABI } from '@/lib/abi';
import { getFaction } from '@/lib/factions';
import { fetchLeaderboard } from '@/lib/api';

type SortKey = 'territories' | 'rallies' | 'supporters' | 'captures';

interface LeaderboardEntry {
  factionId: number;
  territoriesHeld: number;
  totalRallies: number;
  uniqueSupporters: number;
  capturesWon: number;
}

export default function LeaderboardPage() {
  const [data, setData] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('territories');
  const [sortAsc, setSortAsc] = useState(false);

  // On-chain territory counts as supplement
  const { data: territoryCounts } = useReadContract({
    address: CONTRACTS.TerritoryMap,
    abi: TerritoryMapABI,
    functionName: 'territoryCounts',
  });

  const loadData = useCallback(async () => {
    try {
      const res = await fetchLeaderboard();
      if (res && Array.isArray(res)) {
        setData(res);
      }
    } catch { /* silent */ }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30_000);
    return () => clearInterval(interval);
  }, [loadData]);

  // Merge on-chain territory counts if available
  const enrichedData = useMemo(() => {
    if (!territoryCounts) return data;
    const counts = territoryCounts as bigint[];
    return data.map((entry) => ({
      ...entry,
      territoriesHeld: counts[entry.factionId]
        ? Number(counts[entry.factionId])
        : entry.territoriesHeld,
    }));
  }, [data, territoryCounts]);

  // Filter
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return enrichedData;
    return enrichedData.filter((entry) => {
      const faction = getFaction(entry.factionId);
      if (!faction) return false;
      return (
        faction.name.toLowerCase().includes(q) ||
        faction.nameZh.includes(q) ||
        faction.code.toLowerCase().includes(q)
      );
    });
  }, [enrichedData, search]);

  // Sort
  const sorted = useMemo(() => {
    const keyMap: Record<SortKey, keyof LeaderboardEntry> = {
      territories: 'territoriesHeld',
      rallies: 'totalRallies',
      supporters: 'uniqueSupporters',
      captures: 'capturesWon',
    };
    const field = keyMap[sortKey];
    return [...filtered].sort((a, b) => {
      const diff = (a[field] ?? 0) - (b[field] ?? 0);
      return sortAsc ? diff : -diff;
    });
  }, [filtered, sortKey, sortAsc]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(false);
    }
  };

  const SortIcon = ({ active, asc }: { active: boolean; asc: boolean }) => (
    <svg
      className={`w-3 h-3 inline ml-1 ${active ? 'text-amber-400' : 'text-gray-600'}`}
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      viewBox="0 0 24 24"
    >
      {asc ? (
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
      ) : (
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
      )}
    </svg>
  );

  const rankStyle = (rank: number) => {
    if (rank === 1) return 'text-amber-400 font-black';
    if (rank === 2) return 'text-gray-300 font-bold';
    if (rank === 3) return 'text-amber-600 font-bold';
    return 'text-gray-500 font-medium';
  };

  const rankBadge = (rank: number) => {
    if (rank === 1) return 'border-amber-500/40 bg-amber-500/5';
    if (rank === 2) return 'border-gray-400/30 bg-gray-400/5';
    if (rank === 3) return 'border-amber-700/30 bg-amber-700/5';
    return 'border-gray-800/60 bg-gray-900/40';
  };

  return (
    <div className="min-h-screen pt-24 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-3xl sm:text-4xl font-black text-white mb-2">
            Faction <span className="text-amber-400">Leaderboard</span>
          </h1>
          <p className="text-gray-500 text-sm max-w-md mx-auto">
            48 nations ranked by territorial dominance. Updated every 30 seconds.
          </p>
        </div>

        {/* Search */}
        <div className="max-w-md mx-auto mb-8">
          <div className="relative">
            <svg
              className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search faction..."
              className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-gray-800 bg-gray-900/60 text-gray-200 placeholder-gray-600 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 transition-colors"
            />
          </div>
        </div>

        {loading ? (
          <div className="text-center py-20">
            <div className="inline-block w-8 h-8 border-2 border-gray-700 border-t-amber-400 rounded-full animate-spin" />
            <p className="mt-4 text-sm text-gray-500">Loading leaderboard...</p>
          </div>
        ) : (
          <>
            {/* Table header */}
            <div className="hidden sm:grid sm:grid-cols-[4rem_1fr_7rem_6rem_6rem_6rem] gap-2 px-4 py-3 text-xs font-bold uppercase tracking-wider text-gray-500 border-b border-gray-800/60 mb-2">
              <div>Rank</div>
              <div>Faction</div>
              <button onClick={() => handleSort('territories')} className="text-left hover:text-amber-400 transition-colors">
                Territories <SortIcon active={sortKey === 'territories'} asc={sortAsc} />
              </button>
              <button onClick={() => handleSort('rallies')} className="text-left hover:text-amber-400 transition-colors">
                Rallies <SortIcon active={sortKey === 'rallies'} asc={sortAsc} />
              </button>
              <button onClick={() => handleSort('supporters')} className="text-left hover:text-amber-400 transition-colors">
                Supporters <SortIcon active={sortKey === 'supporters'} asc={sortAsc} />
              </button>
              <button onClick={() => handleSort('captures')} className="text-left hover:text-amber-400 transition-colors">
                Captures <SortIcon active={sortKey === 'captures'} asc={sortAsc} />
              </button>
            </div>

            {/* Rows */}
            <div className="space-y-2">
              {sorted.map((entry, idx) => {
                const faction = getFaction(entry.factionId);
                if (!faction) return null;
                const rank = idx + 1;

                return (
                  <Link
                    key={entry.factionId}
                    href={`/faction/${entry.factionId}`}
                    className={`group grid grid-cols-[3rem_1fr] sm:grid-cols-[4rem_1fr_7rem_6rem_6rem_6rem] gap-2 items-center px-4 py-3.5 rounded-xl border ${rankBadge(rank)} hover:border-amber-500/30 transition-all duration-200`}
                  >
                    {/* Rank */}
                    <span className={`text-lg tabular-nums ${rankStyle(rank)}`}>
                      {rank === 1 ? '\uD83E\uDD47' : rank === 2 ? '\uD83E\uDD48' : rank === 3 ? '\uD83E\uDD49' : `#${rank}`}
                    </span>

                    {/* Faction */}
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-2xl flex-shrink-0">{faction.flag}</span>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-white truncate group-hover:text-amber-400 transition-colors">
                          {faction.name}
                        </p>
                        <p className="text-[10px] text-gray-500 sm:hidden">
                          {entry.territoriesHeld} territories
                        </p>
                      </div>
                      <div
                        className="hidden sm:block w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: faction.color }}
                      />
                    </div>

                    {/* Stats (hidden on mobile, shown on sm+) */}
                    <span className="hidden sm:block text-sm font-mono tabular-nums text-gray-300 font-semibold">
                      {entry.territoriesHeld}
                    </span>
                    <span className="hidden sm:block text-sm font-mono tabular-nums text-gray-400">
                      {entry.totalRallies.toLocaleString()}
                    </span>
                    <span className="hidden sm:block text-sm font-mono tabular-nums text-gray-400">
                      {entry.uniqueSupporters.toLocaleString()}
                    </span>
                    <span className="hidden sm:block text-sm font-mono tabular-nums text-gray-400">
                      {entry.capturesWon.toLocaleString()}
                    </span>
                  </Link>
                );
              })}
            </div>

            {sorted.length === 0 && (
              <div className="text-center py-16">
                <p className="text-gray-500 text-sm">No factions match your search.</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
