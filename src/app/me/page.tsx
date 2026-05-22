'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { FACTIONS, FACTION_COUNT, getFactionById, NO_FACTION } from '@/config/factions';
import { CONTRACTS } from '@/config/contracts';
import { FactionRegistryABI } from '@/config/abi/FactionRegistry';
import { TerritoryMapABI } from '@/config/abi/TerritoryMap';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';

/* ── Flag map ────────────────────────────────────────────────────────────── */

function parseContractError(error: Error | null | undefined): string | null {
  if (!error) return null;
  const msg = error.message ?? '';
  const revertMap: Record<string, string> = {
    NotEnrolled: 'You must join a faction first',
    AlreadyEnrolled: 'You are already enrolled in a faction',
    InvalidFaction: 'This faction does not exist',
    TransferFailed: 'Token transfer failed',
  };
  for (const [reason, friendly] of Object.entries(revertMap)) {
    if (msg.includes(reason)) return friendly;
  }
  return msg.slice(0, 200);
}

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

/* ── Page component ──────────────────────────────────────────────────────── */

// PLACEHOLDER
export default function MePage() {
  const { address, isConnected } = useAccount();

  /* ── On-chain reads (only when connected) ──────────────────────────────── */

  const { data: isEnrolled, isLoading: enrollLoading } = useReadContract({
    address: CONTRACTS.FactionRegistry as `0x${string}`,
    abi: FactionRegistryABI,
    functionName: 'isEnrolled',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const { data: rawFactionId } = useReadContract({
    address: CONTRACTS.FactionRegistry as `0x${string}`,
    abi: FactionRegistryABI,
    functionName: 'factionOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address && !!isEnrolled },
  });

  const { data: rawCounts } = useReadContract({
    address: CONTRACTS.TerritoryMap as `0x${string}`,
    abi: TerritoryMapABI,
    functionName: 'territoryCounts',
    query: { enabled: !!isEnrolled },
  });

  /* ── Join faction tx ───────────────────────────────────────────────────── */

  const { writeContract: joinFaction, data: joinHash, isPending: joinPending, error: joinError, reset: resetJoinError } = useWriteContract();
  const { isLoading: joinConfirming, isSuccess: joinSuccess } = useWaitForTransactionReceipt({ hash: joinHash });

  /* ── Defect tx ─────────────────────────────────────────────────────────── */

  const { writeContract: defect, data: defectHash, isPending: defectPending, error: defectError, reset: resetDefectError } = useWriteContract();
  const { isLoading: defectConfirming } = useWaitForTransactionReceipt({ hash: defectHash });

  /* ── Derived ───────────────────────────────────────────────────────────── */

  const factionId = rawFactionId !== undefined ? Number(rawFactionId) : undefined;
  const faction = factionId !== undefined && factionId !== NO_FACTION ? getFactionById(factionId) : undefined;

  const territoryCount = useMemo(() => {
    if (!faction || !rawCounts) return 0;
    const counts = rawCounts as bigint[];
    return faction.id < counts.length ? Number(counts[faction.id]) : 0;
  }, [rawCounts, faction]);

  // Mock contribution stats
  const mockTotalContributed = 1250;
  const mockRegionsParticipated = 7;

  /* ── Faction selector state ────────────────────────────────────────────── */

  const [selectedFaction, setSelectedFaction] = useState<number | null>(null);

  const handleJoin = () => {
    if (selectedFaction === null) return;
    joinFaction({
      address: CONTRACTS.FactionRegistry as `0x${string}`,
      abi: FactionRegistryABI,
      functionName: 'joinFaction',
      args: [selectedFaction],
    });
  };

  const handleDefect = (regionId: number) => {
    defect({
      address: CONTRACTS.TerritoryMap as `0x${string}`,
      abi: TerritoryMapABI,
      functionName: 'defect',
      args: [regionId],
    });
  };

  /* ── Share on X ────────────────────────────────────────────────────────── */

  const shareText = faction
    ? encodeURIComponent(
        `I'm fighting for ${faction.name} in TIFO! ${territoryCount} territories held. Join the war on X Layer! @0xWangyangming`,
      )
    : '';

  /* ── Not connected ─────────────────────────────────────────────────────── */

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gray-950 text-white">
        <Navbar />
        <div className="flex flex-col items-center justify-center pt-32 gap-6">
          <div className="text-6xl">{'\u{1F512}'}</div>
          <h1 className="text-2xl font-bold">Connect Your Wallet</h1>
          <p className="text-gray-400 text-sm max-w-md text-center">
            Connect your wallet to view your war record and manage your faction membership.
          </p>
        </div>
      </div>
    );
  }

  /* ── UI ─────────────────────────────────────────────────────────────────── */

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <Navbar />

      <main className="pt-24 pb-16 px-4 max-w-4xl mx-auto">
        <h1 className="text-3xl sm:text-4xl font-black tracking-tight mb-2 bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">
          War Record
        </h1>
        <p className="text-gray-500 text-sm font-mono mb-8">
          {address?.slice(0, 6)}...{address?.slice(-4)}
        </p>

        {/* ── LOADING ────────────────────────────────────────────────────── */}
        {enrollLoading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-gray-400">Checking enrollment...</p>
          </div>
        ) : !isEnrolled && !joinSuccess ? (
          <section>
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-6 mb-8">
              <h2 className="text-xl font-bold mb-2">Join a Faction</h2>
              <p className="text-gray-400 text-sm mb-6">
                Choose your allegiance. Pick one of {FACTION_COUNT} national teams to begin your conquest.
              </p>

              {/* Faction selector grid */}
              <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2 mb-6">
                {FACTIONS.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setSelectedFaction(f.id)}
                    className={`flex flex-col items-center gap-1 rounded-lg border p-2 transition-all text-xs ${
                      selectedFaction === f.id
                        ? 'border-amber-500 bg-amber-500/10 scale-105'
                        : 'border-gray-800 bg-gray-900/40 hover:border-gray-600'
                    }`}
                    title={f.name}
                  >
                    <span className="text-xl">{FACTION_FLAGS[f.anchor] ?? ''}</span>
                    <span className="truncate w-full text-center text-gray-400">{f.code}</span>
                  </button>
                ))}
              </div>

              {selectedFaction !== null && (
                <div className="space-y-3">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{FACTION_FLAGS[FACTIONS[selectedFaction].anchor] ?? ''}</span>
                      <span className="font-semibold">{FACTIONS[selectedFaction].name}</span>
                    </div>
                    <button
                      onClick={() => { resetJoinError(); handleJoin(); }}
                      disabled={joinPending || joinConfirming}
                      className="ml-auto rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 px-6 py-3 font-bold text-gray-950 transition-all hover:scale-[1.03] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {joinPending || joinConfirming ? 'Confirming...' : 'Join Faction'}
                    </button>
                  </div>
                  {joinError && (
                    <div className="rounded-lg bg-red-950/40 border border-red-800/50 px-4 py-2">
                      <p className="text-sm text-red-400">{parseContractError(joinError)}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>
        ) : (
          /* ── ENROLLED ────────────────────────────────────────────────── */
          <section>
            {/* Faction info card */}
            {faction && (
              <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-6 mb-6 backdrop-blur">
                <div className="flex items-center gap-4 mb-4">
                  <div
                    className="flex items-center justify-center w-16 h-16 rounded-xl text-3xl border"
                    style={{ borderColor: faction.color, backgroundColor: faction.color + '18' }}
                  >
                    {FACTION_FLAGS[faction.anchor] ?? ''}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-bold" style={{ color: faction.color }}>{faction.name}</h2>
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: faction.color }} />
                    </div>
                    <p className="text-sm text-gray-400">{faction.code} &middot; {faction.confederation}</p>
                  </div>
                  <Link
                    href={`/faction/${faction.id}`}
                    className="ml-auto text-sm text-amber-400 hover:underline hidden sm:block"
                  >
                    View Faction &rarr;
                  </Link>
                </div>

                {/* Mock stats */}
                <div className="grid grid-cols-3 gap-4 mt-4">
                  <div className="rounded-lg bg-gray-800/50 p-3 text-center">
                    <div className="text-lg font-bold tabular-nums">{mockTotalContributed.toLocaleString()}</div>
                    <div className="text-xs text-gray-500 uppercase">USDT Contributed</div>
                  </div>
                  <div className="rounded-lg bg-gray-800/50 p-3 text-center">
                    <div className="text-lg font-bold tabular-nums">{mockRegionsParticipated}</div>
                    <div className="text-xs text-gray-500 uppercase">Regions Rallied</div>
                  </div>
                  <div className="rounded-lg bg-gray-800/50 p-3 text-center">
                    <div className="text-lg font-bold tabular-nums" style={{ color: faction.color }}>{territoryCount}</div>
                    <div className="text-xs text-gray-500 uppercase">Faction Territories</div>
                  </div>
                </div>
              </div>
            )}

            {/* Defection alert (mock: show if faction territories < 5) */}
            {faction && territoryCount < 5 && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-5 mb-6">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{'\u{26A0}\uFE0F'}</span>
                  <div className="flex-1">
                    <h3 className="font-bold text-red-400 mb-1">Defection Opportunity</h3>
                    <p className="text-sm text-gray-400 mb-3">
                      Some of your contributions are in regions now owned by other factions.
                      You can defect to reclaim your stake.
                    </p>
                    <button
                      onClick={() => { resetDefectError(); handleDefect(0); }}
                      disabled={defectPending || defectConfirming}
                      className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-400 transition-colors hover:bg-red-500/20 disabled:opacity-50"
                    >
                      {defectPending || defectConfirming ? 'Processing...' : 'Defect & Reclaim'}
                    </button>
                    {defectError && (
                      <div className="mt-2 rounded-lg bg-red-950/40 border border-red-800/50 px-4 py-2">
                        <p className="text-sm text-red-400">{parseContractError(defectError)}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Share on X */}
            {faction && (
              <a
                href={`https://twitter.com/intent/tweet?text=${shareText}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl border border-gray-700 bg-gray-900/60 px-5 py-3 text-sm font-semibold text-white transition-colors hover:border-gray-500 hover:bg-gray-800"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
                Share on X
              </a>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
