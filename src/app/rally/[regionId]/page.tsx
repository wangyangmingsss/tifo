'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther, formatEther } from 'viem';
import Navbar from '@/components/Navbar';
import GasCostBadge from '@/components/GasCostBadge';
import { useOkbPrice } from '@/hooks/useOkbPrice';
import { CONTRACTS, oklinkTx } from '@/config/contracts';
import { TerritoryMapABI } from '@/config/abi/TerritoryMap';
import { FactionRegistryABI } from '@/config/abi/FactionRegistry';
import { MockUSDTABI } from '@/config/abi/MockUSDT';
import { regionIdToCountry, getCountryName, isValidRegion } from '@/config/regionMapping';
import { getFactionById, NO_FACTION } from '@/config/factions';

// ---------------------------------------------------------------------------
// Parse Solidity revert reasons into user-friendly messages
// ---------------------------------------------------------------------------
const REVERT_MAP: Record<string, string> = {
  NotEnrolled: 'You must join a faction first',
  ZeroAmount: 'Amount must be greater than zero',
  InvalidRegion: 'This region does not exist',
  InsufficientBalance: 'Insufficient mUSDT balance',
  InsufficientAllowance: 'Token approval required',
  TransferFailed: 'Token transfer failed. Check your balance and approval.',
};

function parseContractError(error: Error | string): string {
  const msg = typeof error === 'string' ? error : error.message ?? '';
  for (const [reason, friendly] of Object.entries(REVERT_MAP)) {
    if (msg.includes(reason)) return friendly;
  }
  return msg.slice(0, 200);
}

// ---------------------------------------------------------------------------
// Underdog bonus calculation (mirrors contract logic client-side)
// ---------------------------------------------------------------------------
function calcEffectiveAmount(
  amount: bigint,
  attackerPower: bigint,
  ownerPower: bigint,
): { effective: bigint; bonusBps: bigint } {
  if (attackerPower < ownerPower && ownerPower > 0n) {
    let deficitBps = ((ownerPower - attackerPower) * 5000n) / ownerPower;
    if (deficitBps > 5000n) deficitBps = 5000n;
    const effective = (amount * (10000n + deficitBps)) / 10000n;
    return { effective, bonusBps: deficitBps };
  }
  return { effective: amount, bonusBps: 0n };
}

function fmtPower(v: bigint | undefined): string {
  if (v === undefined) return '...';
  const n = Number(formatEther(v));
  if (n === 0) return '0';
  if (n < 0.01) return '<0.01';
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------
export default function RallyPage({ params }: { params: { regionId: string } }) {
  const regionId = Number(params.regionId);
  const valid = isValidRegion(regionId);
  const countryIso = regionIdToCountry[regionId];
  const regionName = countryIso ? getCountryName(countryIso) : `Region ${regionId}`;

  // -- OKB price for gas estimate --
  const { price: okbPrice } = useOkbPrice();

  // -- local state --
  const [amount, setAmount] = useState(0);
  const [phase, setPhase] = useState<'idle' | 'approving' | 'rallying' | 'confirming' | 'done' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  // -- wallet --
  const { address, isConnected } = useAccount();

  // -- contract reads --
  const { data: regionData, isLoading: regionLoading } = useReadContract({
    address: CONTRACTS.TerritoryMap as `0x${string}`,
    abi: TerritoryMapABI,
    functionName: 'regions',
    args: [regionId],
  });

  const ownerFactionId = regionData ? Number((regionData as [number, bigint, number])[0]) : NO_FACTION;
  const ownerFaction = getFactionById(ownerFactionId);

  const { data: userFactionId } = useReadContract({
    address: CONTRACTS.FactionRegistry as `0x${string}`,
    abi: FactionRegistryABI,
    functionName: 'factionOf',
    args: [address!],
    query: { enabled: !!address },
  });

  const { data: isEnrolled } = useReadContract({
    address: CONTRACTS.FactionRegistry as `0x${string}`,
    abi: FactionRegistryABI,
    functionName: 'isEnrolled',
    args: [address!],
    query: { enabled: !!address },
  });

  const userFaction = userFactionId !== undefined ? getFactionById(Number(userFactionId)) : undefined;
  const enrolled = Boolean(isEnrolled);

  const { data: balanceRaw, isLoading: balLoading } = useReadContract({
    address: CONTRACTS.MockUSDT as `0x${string}`,
    abi: MockUSDTABI,
    functionName: 'balanceOf',
    args: [address!],
    query: { enabled: !!address },
  });

  const { data: allowanceRaw, refetch: refetchAllowance } = useReadContract({
    address: CONTRACTS.MockUSDT as `0x${string}`,
    abi: MockUSDTABI,
    functionName: 'allowance',
    args: [address!, CONTRACTS.TerritoryMap as `0x${string}`],
    query: { enabled: !!address },
  });

  const balance = balanceRaw as bigint | undefined;
  const allowance = allowanceRaw as bigint | undefined;
  const maxAmount = balance ? Number(formatEther(balance)) : 0;

  // -- power reads --
  const { data: ownerPowerRaw } = useReadContract({
    address: CONTRACTS.TerritoryMap as `0x${string}`,
    abi: TerritoryMapABI,
    functionName: 'effectivePower',
    args: [regionId, ownerFactionId],
    query: { enabled: ownerFactionId !== NO_FACTION },
  });

  const { data: attackerPowerRaw } = useReadContract({
    address: CONTRACTS.TerritoryMap as `0x${string}`,
    abi: TerritoryMapABI,
    functionName: 'effectivePower',
    args: [regionId, Number(userFactionId ?? 0)],
    query: { enabled: userFactionId !== undefined && Number(userFactionId) !== NO_FACTION },
  });

  const ownerPower = ownerPowerRaw as bigint | undefined;
  const attackerPower = attackerPowerRaw as bigint | undefined;

  // -- preview calculation --
  const preview = useMemo(() => {
    const amtWei = parseEther(String(amount));
    const aPow = attackerPower ?? 0n;
    const oPow = ownerPower ?? 0n;
    const { effective, bonusBps } = calcEffectiveAmount(amtWei, aPow, oPow);
    const newAttackerPower = aPow + effective;
    const willCapture = amount > 0 && newAttackerPower > oPow;
    const bonusPct = Number(bonusBps) / 100;
    return { effective, bonusBps, newAttackerPower, willCapture, bonusPct };
  }, [amount, attackerPower, ownerPower]);

  // -- write contract hooks --
  const { writeContract: doApprove, data: approveTxHash, reset: resetApprove } = useWriteContract();
  const { writeContract: doRally, data: rallyTxHash, reset: resetRally } = useWriteContract();

  const { isSuccess: approveSuccess } = useWaitForTransactionReceipt({
    hash: approveTxHash,
  });

  const { isLoading: rallyConfirming, isSuccess: rallySuccess } = useWaitForTransactionReceipt({
    hash: rallyTxHash,
  });

  // -- transition: approval confirmed -> send rally --
  useEffect(() => {
    if (approveSuccess && phase === 'approving') {
      refetchAllowance();
      const amtWei = parseEther(String(amount));
      setPhase('rallying');
      doRally({
        address: CONTRACTS.TerritoryMap as `0x${string}`,
        abi: TerritoryMapABI,
        functionName: 'rally',
        args: [regionId, amtWei],
      }, {
        onError: (err) => {
          setPhase('error');
          setErrorMsg(parseContractError(err));
        },
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [approveSuccess]);

  // -- transition: rally confirmed -> done --
  useEffect(() => {
    if (rallySuccess && (phase === 'rallying' || phase === 'confirming')) {
      setPhase('done');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rallySuccess]);

  useEffect(() => {
    if (rallyConfirming && phase === 'rallying') {
      setPhase('confirming');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rallyConfirming]);

  // -- action handler --
  const handleSubmit = () => {
    if (amount <= 0 || !address) return;
    setErrorMsg('');
    const amtWei = parseEther(String(amount));
    const needsApproval = !allowance || allowance < amtWei;

    if (needsApproval) {
      setPhase('approving');
      doApprove({
        address: CONTRACTS.MockUSDT as `0x${string}`,
        abi: MockUSDTABI,
        functionName: 'approve',
        args: [CONTRACTS.TerritoryMap as `0x${string}`, amtWei],
      }, {
        onError: (err) => {
          setPhase('error');
          setErrorMsg(parseContractError(err));
        },
      });
    } else {
      setPhase('rallying');
      doRally({
        address: CONTRACTS.TerritoryMap as `0x${string}`,
        abi: TerritoryMapABI,
        functionName: 'rally',
        args: [regionId, amtWei],
      }, {
        onError: (err) => {
          setPhase('error');
          setErrorMsg(parseContractError(err));
        },
      });
    }
  };

  const handleReset = () => {
    setPhase('idle');
    setAmount(0);
    setErrorMsg('');
    resetApprove();
    resetRally();
  };

  // -- button label & disabled --
  const needsApproval = allowance !== undefined && parseEther(String(amount)) > allowance;
  const btnLabel = (() => {
    switch (phase) {
      case 'approving': return 'Approving...';
      case 'rallying': return 'Sending Rally...';
      case 'confirming': return 'Confirming...';
      case 'done': return 'Success!';
      case 'error': return 'Try Again';
      default: return needsApproval ? 'Approve mUSDT' : 'Rally!';
    }
  })();

  const btnDisabled =
    phase === 'approving' || phase === 'rallying' || phase === 'confirming' ||
    (phase === 'idle' && (amount <= 0 || !isConnected || !enrolled));

  const isDefending = userFactionId !== undefined && Number(userFactionId) === ownerFactionId && ownerFactionId !== NO_FACTION;

  // -------------------------------------------------------------------------
  // RENDER
  // -------------------------------------------------------------------------
  if (!valid) {
    return (
      <div className="min-h-screen bg-gray-950 text-white">
        <Navbar />
        <div className="pt-20 flex flex-col items-center justify-center gap-4">
          <p className="text-xl text-red-400">Invalid region ID</p>
          <Link href="/map" className="text-amber-400 hover:underline">&larr; Back to Map</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <Navbar />

      <main className="pt-20 pb-12 px-4 max-w-lg mx-auto flex flex-col gap-6">
        {/* Back link */}
        <Link href="/map" className="text-sm text-gray-400 hover:text-white transition-colors flex items-center gap-1">
          <span>&larr;</span> Back to Map
        </Link>

        {/* Header card */}
        <div className="rounded-2xl bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700/50 p-6">
          <h1 className="text-2xl font-bold mb-1">Rally for {regionName}</h1>
          <p className="text-sm text-gray-400">Region #{regionId}</p>

          {/* Owner badge */}
          <div className="mt-4 flex items-center gap-2">
            <span className="text-xs text-gray-500 uppercase tracking-wide">Current Owner</span>
            {regionLoading ? (
              <span className="text-gray-500 text-sm">Loading...</span>
            ) : ownerFactionId === NO_FACTION ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-700 text-gray-300 text-sm font-medium">
                Unclaimed
              </span>
            ) : (
              <span
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-medium"
                style={{ backgroundColor: (ownerFaction?.color ?? '#808080') + '30', color: ownerFaction?.color ?? '#ccc', border: `1px solid ${ownerFaction?.color ?? '#808080'}50` }}
              >
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: ownerFaction?.color }} />
                {ownerFaction?.name ?? 'Unknown'}
              </span>
            )}
          </div>

          {/* User faction */}
          {isConnected && (
            <div className="mt-3 flex items-center gap-2">
              <span className="text-xs text-gray-500 uppercase tracking-wide">Your Faction</span>
              {!enrolled ? (
                <span className="text-amber-400 text-sm">Not enrolled &mdash; <Link href="/profile" className="underline">join a faction</Link></span>
              ) : userFaction ? (
                <span
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-medium"
                  style={{ backgroundColor: userFaction.color + '30', color: userFaction.color, border: `1px solid ${userFaction.color}50` }}
                >
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: userFaction.color }} />
                  {userFaction.name}
                </span>
              ) : (
                <span className="text-gray-500 text-sm">Loading...</span>
              )}
            </div>
          )}
        </div>

        {/* Wallet not connected */}
        {!isConnected ? (
          <div className="rounded-2xl border border-gray-700/50 bg-gray-900 p-6 text-center">
            <p className="text-gray-400">Connect your wallet to rally.</p>
          </div>
        ) : !enrolled ? (
          <div className="rounded-2xl border border-amber-700/40 bg-amber-950/30 p-6 text-center">
            <p className="text-amber-300">You must join a faction before rallying.</p>
            <Link href="/profile" className="mt-2 inline-block text-amber-400 underline text-sm">Go to Profile</Link>
          </div>
        ) : (
          <>
            {/* Slider card */}
            <div className="rounded-2xl bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700/50 p-6">
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-medium text-gray-300">Rally Amount (mUSDT)</label>
                <span className="text-xs text-gray-500">
                  Balance: {balLoading ? '...' : Math.floor(maxAmount).toLocaleString()}
                </span>
              </div>

              <input
                type="range"
                min={0}
                max={Math.floor(maxAmount)}
                step={1}
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                disabled={phase !== 'idle' && phase !== 'error'}
                className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-amber-500 bg-gray-700"
              />

              <div className="mt-3 flex items-center gap-3">
                <input
                  type="number"
                  min={0}
                  max={Math.floor(maxAmount)}
                  value={amount}
                  onChange={(e) => {
                    const v = Math.min(Number(e.target.value) || 0, Math.floor(maxAmount));
                    setAmount(Math.max(0, v));
                  }}
                  disabled={phase !== 'idle' && phase !== 'error'}
                  className="w-28 px-3 py-2 rounded-lg bg-gray-800 border border-gray-600 text-white text-center text-lg font-mono focus:outline-none focus:border-amber-500 transition-colors"
                />
                <span className="text-gray-400 text-sm">mUSDT</span>
                <button
                  onClick={() => setAmount(Math.floor(maxAmount))}
                  disabled={phase !== 'idle' && phase !== 'error'}
                  className="ml-auto text-xs text-amber-400 hover:text-amber-300 transition-colors disabled:opacity-40"
                >
                  MAX
                </button>
              </div>

              {maxAmount === 0 && !balLoading && (
                <p className="mt-2 text-xs text-red-400">Your mUSDT balance is zero. Use the faucet first.</p>
              )}
            </div>

            {/* Preview panel */}
            <div className="rounded-2xl bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700/50 p-6 space-y-4">
              <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">Power Preview</h2>

              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-xl bg-gray-800/60 p-4">
                  <p className="text-xs text-gray-500 mb-1">{ownerFaction?.code ?? 'Owner'} Power</p>
                  <p className="text-lg font-bold" style={{ color: ownerFaction?.color ?? '#aaa' }}>
                    {fmtPower(ownerPower)}
                  </p>
                </div>
                <div className="rounded-xl bg-gray-800/60 p-4">
                  <p className="text-xs text-gray-500 mb-1">{userFaction?.code ?? 'You'} Power</p>
                  <p className="text-lg font-bold" style={{ color: userFaction?.color ?? '#aaa' }}>
                    {fmtPower(attackerPower)}
                  </p>
                </div>
              </div>

              {amount > 0 && (
                <div
                  className="rounded-xl border p-4 space-y-3"
                  style={{
                    borderColor: preview.willCapture ? '#22c55e50' : '#f59e0b40',
                    backgroundColor: preview.willCapture ? '#22c55e08' : '#f59e0b08',
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">Estimated New Power</span>
                    <span className="text-lg font-bold" style={{ color: userFaction?.color ?? '#eee' }}>
                      {fmtPower(preview.newAttackerPower)}
                    </span>
                  </div>

                  {preview.bonusBps > 0n && (
                    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
                      preview.bonusPct >= 30
                        ? 'bg-green-900/40 shadow-[0_0_15px_rgba(34,197,94,0.15)]'
                        : 'bg-amber-900/30'
                    }`}>
                      <span className={`text-xs font-semibold ${
                        preview.bonusPct >= 30 ? 'text-green-400' : 'text-amber-400'
                      }`}>
                        +{preview.bonusPct.toFixed(1)}% Underdog Bonus
                      </span>
                      <span className="text-xs text-gray-500 ml-auto">
                        +{fmtPower(preview.effective - parseEther(String(amount)))} bonus
                      </span>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    {preview.willCapture ? (
                      <>
                        <span className="inline-block w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                        <span className="text-sm font-semibold text-green-400">Will capture this region!</span>
                      </>
                    ) : isDefending ? (
                      <>
                        <span className="inline-block w-2 h-2 rounded-full bg-blue-400" />
                        <span className="text-sm text-blue-300">Reinforcing your territory</span>
                      </>
                    ) : (
                      <>
                        <span className="inline-block w-2 h-2 rounded-full bg-amber-400" />
                        <span className="text-sm text-amber-300">Not enough to capture yet</span>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Action button */}
            <button
              onClick={phase === 'error' || phase === 'done' ? handleReset : handleSubmit}
              disabled={btnDisabled}
              className={`w-full py-4 rounded-2xl text-lg font-bold transition-all duration-200 ${
                phase === 'done'
                  ? 'bg-green-600 hover:bg-green-500 text-white'
                  : phase === 'error'
                  ? 'bg-red-700 hover:bg-red-600 text-white'
                  : btnDisabled
                  ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black shadow-lg shadow-amber-500/20'
              }`}
            >
              {btnLabel}
            </button>

            {/* Gas cost estimate */}
            <div className="flex justify-center">
              <GasCostBadge okbPrice={okbPrice} />
            </div>

            {/* Error message */}
            {phase === 'error' && errorMsg && (
              <div className="rounded-xl bg-red-950/40 border border-red-800/50 p-4">
                <p className="text-sm text-red-400 break-all">{errorMsg}</p>
              </div>
            )}

            {/* Success panel */}
            {phase === 'done' && rallyTxHash && (
              <div className="rounded-xl bg-green-950/30 border border-green-800/40 p-4 space-y-2">
                <p className="text-green-400 font-semibold">Rally submitted successfully!</p>
                <a
                  href={oklinkTx(rallyTxHash)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-amber-400 hover:text-amber-300 underline break-all"
                >
                  View on OKLink &rarr;
                </a>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
