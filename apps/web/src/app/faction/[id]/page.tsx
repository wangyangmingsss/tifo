'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useReadContract } from 'wagmi';
import { formatUnits } from 'viem';
import { CONTRACTS } from '@/lib/contracts';
import { FactionRegistryABI, WarChestABI } from '@/lib/abi';
import { getFaction } from '@/lib/factions';
import { fetchFaction } from '@/lib/api';

interface FactionData {
  factionId: number;
  territories: number[];
  totalRallies: number;
  totalCaptures: number;
  topContributors: { address: string; amount: string }[];
}

export default function FactionDetailPage() {
  const params = useParams();
  const factionId = Number(params.id);
  const faction = getFaction(factionId);

  const [apiData, setApiData] = useState<FactionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const data = await fetchFaction(factionId);
      if (data) setApiData(data);
    } catch { /* silent */ }
    setLoading(false);
  }, [factionId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // On-chain reads
  const { data: memberCount } = useReadContract({
    address: CONTRACTS.FactionRegistry,
    abi: FactionRegistryABI,
    functionName: 'memberCount',
    args: [factionId as unknown as number],
  });

  const { data: prizePool } = useReadContract({
    address: CONTRACTS.WarChest,
    abi: WarChestABI,
    functionName: 'factionPrizePool',
    args: [factionId as unknown as number],
  });

  const handleCopyLink = () => {
    const url = `${window.location.origin}/faction/${factionId}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!faction) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-6xl mb-4">?</p>
          <h1 className="text-2xl font-bold text-gray-300 mb-2">Faction Not Found</h1>
          <p className="text-gray-500 mb-6">Faction ID {factionId} does not exist.</p>
          <Link href="/leaderboard" className="text-amber-400 hover:text-amber-300 font-semibold">
            Back to Leaderboard
          </Link>
        </div>
      </div>
    );
  }

  const territories = apiData?.territories ?? [];
  const formattedPrize = prizePool ? formatUnits(prizePool as bigint, 6) : '0';
  const members = memberCount ? Number(memberCount) : 0;

  return (
    <div className="min-h-screen pt-24 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Back link */}
        <Link
          href="/leaderboard"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-amber-400 transition-colors mb-8"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          Back to Leaderboard
        </Link>

        {/* Header */}
        <div className="relative rounded-2xl border border-gray-800/60 bg-gray-900/40 backdrop-blur-sm p-8 mb-8 overflow-hidden">
          <div
            className="absolute inset-x-0 top-0 h-1.5"
            style={{ backgroundColor: faction.color }}
          />
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <span className="text-7xl">{faction.flag}</span>
            <div className="flex-1">
              <h1 className="text-3xl sm:text-4xl font-black text-white mb-1">
                {faction.name}
              </h1>
              <p className="text-lg text-gray-400 mb-2">{faction.nameZh}</p>
              <span className="inline-block px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-full border border-gray-700 text-gray-400 bg-gray-800/50">
                {faction.confederation}
              </span>
            </div>
            <button
              onClick={handleCopyLink}
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-gray-950 bg-gradient-to-r from-amber-400 to-amber-500 rounded-xl hover:shadow-lg hover:shadow-amber-500/25 hover:scale-[1.03] transition-all duration-200"
            >
              {copied ? (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                  Copied!
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186 9.566-5.314m-9.566 7.5 9.566 5.314m0 0a2.25 2.25 0 1 0 3.935 2.186 2.25 2.25 0 0 0-3.935-2.186Zm0-12.814a2.25 2.25 0 1 0 3.935-2.186 2.25 2.25 0 0 0-3.935 2.186Z" />
                  </svg>
                  Recruit
                </>
              )}
            </button>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
          {[
            { label: 'Territories Held', value: territories.length.toString() },
            { label: 'Prize Pool', value: `${Number(formattedPrize).toLocaleString()} mUSDT` },
            { label: 'Members', value: members.toLocaleString() },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-2xl border border-gray-800/60 bg-gray-900/40 backdrop-blur-sm p-6 text-center hover:border-amber-500/30 transition-colors"
            >
              <div className="text-2xl sm:text-3xl font-black text-white mb-1 font-mono tabular-nums">
                {loading ? '...' : s.value}
              </div>
              <div className="text-xs text-gray-500 uppercase tracking-wider font-medium">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Captured Regions */}
        <div className="rounded-2xl border border-gray-800/60 bg-gray-900/40 backdrop-blur-sm p-6 mb-8">
          <h2 className="text-lg font-bold text-white mb-4">
            Captured Regions
            <span className="ml-2 text-sm font-normal text-gray-500">({territories.length})</span>
          </h2>
          {loading ? (
            <p className="text-gray-500 text-sm">Loading...</p>
          ) : territories.length === 0 ? (
            <p className="text-gray-500 text-sm">No territories captured yet.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {territories.map((regionId: number) => (
                <span
                  key={regionId}
                  className="inline-flex items-center px-3 py-1.5 text-sm font-mono rounded-lg border border-gray-700/60 bg-gray-800/40 text-gray-300"
                >
                  Region #{regionId}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Top Contributors */}
        <div className="rounded-2xl border border-gray-800/60 bg-gray-900/40 backdrop-blur-sm p-6">
          <h2 className="text-lg font-bold text-white mb-4">Top Contributors</h2>
          {loading ? (
            <p className="text-gray-500 text-sm">Loading...</p>
          ) : !apiData?.topContributors || apiData.topContributors.length === 0 ? (
            <p className="text-gray-500 text-sm">No contributors yet.</p>
          ) : (
            <div className="space-y-3">
              {apiData.topContributors.map((c, i) => (
                <div
                  key={c.address}
                  className="flex items-center gap-4 p-3 rounded-xl border border-gray-800/40 bg-gray-800/20 hover:border-gray-700/60 transition-colors"
                >
                  <span className={`text-sm font-bold w-8 text-center ${
                    i === 0 ? 'text-amber-400' : i === 1 ? 'text-gray-300' : i === 2 ? 'text-amber-600' : 'text-gray-500'
                  }`}>
                    #{i + 1}
                  </span>
                  <span className="font-mono text-sm text-gray-300 flex-1 truncate">
                    {c.address.slice(0, 6)}...{c.address.slice(-4)}
                  </span>
                  <span className="text-sm font-semibold text-amber-400 font-mono tabular-nums">
                    {Number(formatUnits(BigInt(c.amount), 6)).toLocaleString()} mUSDT
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
