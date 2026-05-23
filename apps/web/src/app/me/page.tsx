'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { FACTIONS, FACTION_COUNT, getFactionById, NO_FACTION } from '@/config/factions';
import { CONTRACTS, oklinkTx } from '@/config/contracts';
import { FactionRegistryABI } from '@/config/abi/FactionRegistry';
import { TerritoryMapABI } from '@/config/abi/TerritoryMap';
import { WarChestABI } from '@/config/abi/WarChest';
import { MockUSDTABI } from '@/config/abi/MockUSDT';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { formatEther } from 'viem';
import { useOkbPrice } from '@/hooks/useOkbPrice';

/* ── Flag map ────────────────────────────────────────────────────────────── */

function parseContractError(error: Error | null | undefined): string | null {
  if (!error) return null;
  const msg = error.message ?? '';
  const revertMap: Record<string, string> = {
    NotEnrolled: 'You must join a faction first',
    AlreadyEnrolled: 'You are already enrolled in a faction',
    InvalidFaction: 'This faction does not exist',
    TransferFailed: 'Token transfer failed',
    FaucetCooldown: 'Faucet is on cooldown — please wait 12 hours between claims',
  };
  for (const [reason, friendly] of Object.entries(revertMap)) {
    if (msg.includes(reason)) return friendly;
  }
  return msg.slice(0, 200);
}

const FACTION_FLAGS: Record<string, string> = {
  AR: '\u{1F1E6}\u{1F1F7}', BR: '\u{1F1E7}\u{1F1F7}', UY: '\u{1F1FA}\u{1F1FE}', CO: '\u{1F1E8}\u{1F1F4}', EC: '\u{1F1EA}\u{1F1E8}', PY: '\u{1F1F5}\u{1F1FE}',
  FR: '\u{1F1EB}\u{1F1F7}', ES: '\u{1F1EA}\u{1F1F8}', GB: '\u{1F1EC}\u{1F1E7}', DE: '\u{1F1E9}\u{1F1EA}', PT: '\u{1F1F5}\u{1F1F9}', NL: '\u{1F1F3}\u{1F1F1}',
  HR: '\u{1F1ED}\u{1F1F7}', BE: '\u{1F1E7}\u{1F1EA}', BA: '\u{1F1E7}\u{1F1E6}', CH: '\u{1F1E8}\u{1F1ED}', AT: '\u{1F1E6}\u{1F1F9}', NO: '\u{1F1F3}\u{1F1F4}',
  SE: '\u{1F1F8}\u{1F1EA}', CZ: '\u{1F1E8}\u{1F1FF}', US: '\u{1F1FA}\u{1F1F8}', MX: '\u{1F1F2}\u{1F1FD}', CA: '\u{1F1E8}\u{1F1E6}', PA: '\u{1F1F5}\u{1F1E6}',
  HT: '\u{1F1ED}\u{1F1F9}', MA: '\u{1F1F2}\u{1F1E6}', SN: '\u{1F1F8}\u{1F1F3}', GH: '\u{1F1EC}\u{1F1ED}', ZA: '\u{1F1FF}\u{1F1E6}', CI: '\u{1F1E8}\u{1F1EE}',
  DZ: '\u{1F1E9}\u{1F1FF}', EG: '\u{1F1EA}\u{1F1EC}', CV: '\u{1F1E8}\u{1F1FB}', CD: '\u{1F1E8}\u{1F1E9}', JP: '\u{1F1EF}\u{1F1F5}',
  KR: '\u{1F1F0}\u{1F1F7}', AU: '\u{1F1E6}\u{1F1FA}', SA: '\u{1F1F8}\u{1F1E6}', IR: '\u{1F1EE}\u{1F1F7}', QA: '\u{1F1F6}\u{1F1E6}', UZ: '\u{1F1FA}\u{1F1FF}',
  JO: '\u{1F1EF}\u{1F1F4}', IQ: '\u{1F1EE}\u{1F1F6}', NZ: '\u{1F1F3}\u{1F1FF}', CW: '\u{1F1E8}\u{1F1FC}', TR: '\u{1F1F9}\u{1F1F7}', TN: '\u{1F1F9}\u{1F1F3}',
};

/* ── Page component ──────────────────────────────────────────────────────── */

// PLACEHOLDER
export default function MePage() {
  const { address, isConnected } = useAccount();
  const { price: okbPrice } = useOkbPrice();

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

  /* ── Faucet tx ────────────────────────────────────────────────────────── */

  const { data: balanceRaw, isLoading: balLoading, refetch: refetchBalance } = useReadContract({
    address: CONTRACTS.MockUSDT as `0x${string}`,
    abi: MockUSDTABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });
  const mUsdtBalance = balanceRaw !== undefined ? Number(formatEther(balanceRaw as bigint)) : undefined;

  const { writeContract: claimFaucet, data: faucetHash, isPending: faucetPending, error: faucetError, reset: resetFaucetError } = useWriteContract();
  const { isLoading: faucetConfirming, isSuccess: faucetSuccess } = useWaitForTransactionReceipt({ hash: faucetHash });

  const handleFaucet = () => {
    resetFaucetError();
    claimFaucet({
      address: CONTRACTS.MockUSDT as `0x${string}`,
      abi: MockUSDTABI,
      functionName: 'faucet',
      args: [],
    });
  };

  // Refetch balance after faucet success
  useMemo(() => {
    if (faucetSuccess) refetchBalance();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [faucetSuccess]);

  /* ── WarChest passive yield reads ─────────────────────────────────── */

  const { data: passiveRate } = useReadContract({
    address: CONTRACTS.WarChest as `0x${string}`,
    abi: WarChestABI,
    functionName: 'passiveRatePerSecond',
    query: { enabled: !!address },
  });

  const { data: seasonStartRaw } = useReadContract({
    address: CONTRACTS.WarChest as `0x${string}`,
    abi: WarChestABI,
    functionName: 'seasonStart',
    query: { enabled: !!address },
  });

  const { data: isSettled } = useReadContract({
    address: CONTRACTS.WarChest as `0x${string}`,
    abi: WarChestABI,
    functionName: 'settled',
    query: { enabled: !!address },
  });

  /* ── Claim tx ─────────────────────────────────────────────────────── */

  const { writeContract: claimReward, data: claimHash, isPending: claimPending, error: claimError, reset: resetClaimError } = useWriteContract();
  const { isLoading: claimConfirming, isSuccess: claimSuccess } = useWaitForTransactionReceipt({ hash: claimHash });

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

  /* ── Passive yield estimation ──────────────────────────────────────── */

  const estimatedPassiveYield = useMemo(() => {
    if (!faction || !passiveRate || !seasonStartRaw) return '0';
    const rate = Number(passiveRate);
    if (rate === 0) return '0';
    // Estimate: for each territory held by the faction, passive accrues at rate per second
    // This is a rough estimate: territories * passiveRate * elapsed seconds since season start
    const seasonStart = Number(seasonStartRaw);
    const now = Math.floor(Date.now() / 1000);
    const elapsed = Math.max(0, now - seasonStart);
    // Approximate: faction's share = territories * passiveRate * elapsed
    // divided by 1e18 for token decimals
    const rawYield = BigInt(territoryCount) * BigInt(rate) * BigInt(elapsed);
    return Number(formatEther(rawYield)).toLocaleString(undefined, { maximumFractionDigits: 4 });
  }, [faction, passiveRate, seasonStartRaw, territoryCount]);

  const passiveRateFormatted = useMemo(() => {
    if (!passiveRate) return '0';
    // passiveRate per second * 3600 = per hour
    const hourly = BigInt(passiveRate as bigint) * BigInt(3600);
    return Number(formatEther(hourly)).toLocaleString(undefined, { maximumFractionDigits: 6 });
  }, [passiveRate]);

  const handleClaim = () => {
    if (!faction) return;
    resetClaimError();
    // Claim for all owned regions (up to first 50 to avoid gas limits)
    const regionIds: number[] = [];
    // Use rawCounts to figure out which regions this faction owns
    // For simplicity, claim for regions 0-199 (contract handles no-op for non-owned)
    for (let i = 0; i < 200 && regionIds.length < 50; i++) {
      regionIds.push(i);
    }
    claimReward({
      address: CONTRACTS.WarChest as `0x${string}`,
      abi: WarChestABI,
      functionName: 'claim',
      args: [regionIds],
    });
  };

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

        {/* ── FAUCET CARD ───────────────────────────────────────────────── */}
        <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-5 mb-8 backdrop-blur">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-base font-bold flex items-center gap-2">
                {'\u{1F6B0}'} Get Test Tokens
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                1,000 mUSDT per claim &middot; 12h cooldown
              </p>
            </div>
            <div className="text-right">
              <div className="text-sm font-mono text-gray-300">
                {balLoading ? '...' : mUsdtBalance !== undefined ? Math.floor(mUsdtBalance).toLocaleString() : '0'}
              </div>
              <div className="text-xs text-gray-500">mUSDT Balance</div>
            </div>
          </div>

          <button
            onClick={handleFaucet}
            disabled={faucetPending || faucetConfirming}
            className="w-full rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 px-5 py-3 font-bold text-white transition-all hover:scale-[1.01] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {faucetPending ? 'Signing...' : faucetConfirming ? 'Confirming...' : faucetSuccess ? 'Claimed!' : 'Claim 1,000 mUSDT'}
          </button>

          {faucetError && (
            <div className="mt-2 rounded-lg bg-red-950/40 border border-red-800/50 px-4 py-2">
              <p className="text-sm text-red-400">{parseContractError(faucetError)}</p>
            </div>
          )}
          {faucetSuccess && faucetHash && (
            <div className="mt-2 rounded-lg bg-green-950/30 border border-green-800/40 px-4 py-2">
              <p className="text-sm text-green-400">1,000 mUSDT claimed!</p>
              <a
                href={oklinkTx(faucetHash)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-amber-400 hover:text-amber-300 underline"
              >
                View on OKLink &rarr;
              </a>
            </div>
          )}
        </div>

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

            {/* Gas cost note */}
            {faction && okbPrice !== null && (
              <div className="rounded-lg bg-gray-800/40 border border-gray-700/50 px-4 py-3 mb-6">
                <p className="text-xs text-gray-400">
                  Rally gas cost: ~${(0.000021 * okbPrice) < 0.01 ? '<$0.01' : `$${(0.000021 * okbPrice).toFixed(3)}`} per transaction on X Layer
                </p>
              </div>
            )}

            {/* ── Passive Yield Card ─────────────────────────────────────── */}
            {faction && (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-6 mb-6">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{'\u{1F331}'}</span>
                  <div className="flex-1">
                    <h3 className="font-bold text-emerald-400 mb-1">Passive Yield (WarChest)</h3>
                    <p className="text-sm text-gray-400 mb-4">
                      Your faction earns passive rewards for every territory held. Yield accrues at{' '}
                      <span className="text-emerald-300 font-mono">{passiveRateFormatted}</span>{' '}
                      mUSDT per territory per hour.
                    </p>

                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="rounded-lg bg-gray-800/50 p-3">
                        <div className="text-xs text-gray-500 uppercase mb-1">Estimated Accrued</div>
                        <div className="text-lg font-bold tabular-nums text-emerald-400">{estimatedPassiveYield}</div>
                        <div className="text-xs text-gray-500">mUSDT (faction total)</div>
                      </div>
                      <div className="rounded-lg bg-gray-800/50 p-3">
                        <div className="text-xs text-gray-500 uppercase mb-1">Season Status</div>
                        <div className="text-lg font-bold tabular-nums">
                          {isSettled ? (
                            <span className="text-amber-400">Settled</span>
                          ) : (
                            <span className="text-emerald-400">Active</span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500">{isSettled ? 'Claim now!' : 'Accruing...'}</div>
                      </div>
                    </div>

                    {isSettled ? (
                      <div className="space-y-2">
                        <button
                          onClick={handleClaim}
                          disabled={claimPending || claimConfirming}
                          className="w-full rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 px-5 py-3 font-bold text-white transition-all hover:scale-[1.01] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {claimPending ? 'Signing...' : claimConfirming ? 'Confirming...' : claimSuccess ? 'Claimed!' : 'Claim Rewards'}
                        </button>
                        {claimError && (
                          <div className="rounded-lg bg-red-950/40 border border-red-800/50 px-4 py-2">
                            <p className="text-sm text-red-400">{parseContractError(claimError)}</p>
                          </div>
                        )}
                        {claimSuccess && claimHash && (
                          <div className="rounded-lg bg-green-950/30 border border-green-800/40 px-4 py-2">
                            <p className="text-sm text-green-400">Rewards claimed successfully!</p>
                            <a
                              href={oklinkTx(claimHash)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-amber-400 hover:text-amber-300 underline"
                            >
                              View on OKLink &rarr;
                            </a>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="rounded-lg bg-gray-800/30 border border-gray-700/50 px-4 py-3">
                        <p className="text-xs text-gray-400">
                          {'\u{23F3}'} Season is active. Rewards can be claimed after the season is settled.
                          Keep holding territories to maximize your yield!
                        </p>
                      </div>
                    )}
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
