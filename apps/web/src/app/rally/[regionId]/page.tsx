'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { parseUnits, formatUnits } from 'viem';
import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from 'wagmi';
import { CONTRACTS, OKLINK_TX } from '@/lib/contracts';
import { MockUSDTABI, TerritoryMapABI, FactionRegistryABI } from '@/lib/abi';
import { getFaction, NO_FACTION } from '@/lib/factions';

/* ── Helpers ── */
const DECIMALS = 18;
const toWei = (v: number) => parseUnits(v.toString(), DECIMALS);

/* placeholder: Spinner */
function Spinner() {
  return (
    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  );
}

/* placeholder: StepIndicator */
function StepIndicator({ step, current, label }: { step: number; current: number; label: string }) {
  const done = current > step;
  const active = current === step;
  return (
    <div className="flex items-center gap-3">
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-colors ${
          done
            ? 'bg-amber-500 border-amber-500 text-gray-950'
            : active
            ? 'border-amber-500 text-amber-400'
            : 'border-gray-700 text-gray-600'
        }`}
      >
        {done ? (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          step
        )}
      </div>
      <span className={`text-sm font-medium ${active ? 'text-white' : done ? 'text-gray-400' : 'text-gray-600'}`}>
        {label}
      </span>
    </div>
  );
}

/* ── Main Page ── */
export default function RallyPage() {
  const params = useParams();
  const regionId = Number(params.regionId);
  const { address, isConnected } = useAccount();

  const [amount, setAmount] = useState(100);
  const [txStep, setTxStep] = useState<1 | 2>(1);
  const [successHash, setSuccessHash] = useState<string | null>(null);

  /* placeholder: contract reads */
  // -- MockUSDT balance --
  const { data: rawBalance } = useReadContract({
    address: CONTRACTS.MockUSDT,
    abi: MockUSDTABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  // -- MockUSDT allowance --
  const { data: rawAllowance, refetch: refetchAllowance } = useReadContract({
    address: CONTRACTS.MockUSDT,
    abi: MockUSDTABI,
    functionName: 'allowance',
    args: address ? [address, CONTRACTS.TerritoryMap] : undefined,
    query: { enabled: !!address },
  });

  // -- User faction --
  const { data: isEnrolled } = useReadContract({
    address: CONTRACTS.FactionRegistry,
    abi: FactionRegistryABI,
    functionName: 'isEnrolled',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const { data: userFactionId } = useReadContract({
    address: CONTRACTS.FactionRegistry,
    abi: FactionRegistryABI,
    functionName: 'factionOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  // -- Region info --
  const { data: regionData } = useReadContract({
    address: CONTRACTS.TerritoryMap,
    abi: TerritoryMapABI,
    functionName: 'regions',
    args: [regionId as unknown as number],
  });

  // -- Effective power for user's faction --
  const { data: userFactionPower, refetch: refetchUserPower } = useReadContract({
    address: CONTRACTS.TerritoryMap,
    abi: TerritoryMapABI,
    functionName: 'effectivePower',
    args: userFactionId !== undefined ? [regionId as unknown as number, userFactionId as number] : undefined,
    query: { enabled: userFactionId !== undefined && userFactionId !== NO_FACTION },
  });

  // -- Effective power for owner faction --
  const ownerFactionId = regionData ? (regionData as [number, bigint, number])[0] : undefined;

  const { data: ownerFactionPower } = useReadContract({
    address: CONTRACTS.TerritoryMap,
    abi: TerritoryMapABI,
    functionName: 'effectivePower',
    args: ownerFactionId !== undefined ? [regionId as unknown as number, ownerFactionId as number] : undefined,
    query: { enabled: ownerFactionId !== undefined && ownerFactionId !== NO_FACTION },
  });

  /* placeholder: derived values */
  const balance = rawBalance !== undefined ? rawBalance as bigint : 0n;
  const allowance = rawAllowance !== undefined ? rawAllowance as bigint : 0n;
  const amountWei = toWei(amount);
  const needsApproval = allowance < amountWei;
  const userFaction = userFactionId !== undefined ? getFaction(Number(userFactionId)) : undefined;
  const ownerFaction = ownerFactionId !== undefined ? getFaction(Number(ownerFactionId)) : undefined;

  // Underdog bonus: if user faction has less power than owner, show percentage
  const userPower = userFactionPower !== undefined ? (userFactionPower as bigint) : 0n;
  const ownerPower = ownerFactionPower !== undefined ? (ownerFactionPower as bigint) : 0n;
  const isUnderdog =
    userFaction &&
    ownerFaction &&
    Number(userFactionId) !== Number(ownerFactionId) &&
    userPower < ownerPower;
  const underdogPct =
    isUnderdog && ownerPower > 0n
      ? Math.min(50, Math.round(Number(((ownerPower - userPower) * 100n) / ownerPower)))
      : 0;

  // Estimated power added (raw + underdog bonus)
  const estimatedPower = amountWei + (amountWei * BigInt(underdogPct)) / 100n;

  /* placeholder: write hooks */
  // -- Approve --
  const {
    writeContract: approveWrite,
    data: approveTxHash,
    isPending: approveIsPending,
    error: approveError,
    reset: resetApprove,
  } = useWriteContract();

  const { isLoading: approveIsConfirming, isSuccess: approveIsSuccess } =
    useWaitForTransactionReceipt({ hash: approveTxHash });

  // -- Rally --
  const {
    writeContract: rallyWrite,
    data: rallyTxHash,
    isPending: rallyIsPending,
    error: rallyError,
    reset: resetRally,
  } = useWriteContract();

  const { isLoading: rallyIsConfirming, isSuccess: rallyIsSuccess } =
    useWaitForTransactionReceipt({ hash: rallyTxHash });

  /* placeholder: effects */
  // After approval confirmed, advance to step 2
  useEffect(() => {
    if (approveIsSuccess) {
      refetchAllowance();
      setTxStep(2);
    }
  }, [approveIsSuccess, refetchAllowance]);

  // After rally confirmed, show success
  useEffect(() => {
    if (rallyIsSuccess && rallyTxHash) {
      setSuccessHash(rallyTxHash);
      refetchUserPower();
    }
  }, [rallyIsSuccess, rallyTxHash, refetchUserPower]);

  // Auto-set step based on allowance
  useEffect(() => {
    if (!needsApproval) setTxStep(2);
    else setTxStep(1);
  }, [needsApproval]);

  /* placeholder: handlers */
  const handleApprove = () => {
    resetApprove();
    approveWrite({
      address: CONTRACTS.MockUSDT,
      abi: MockUSDTABI,
      functionName: 'approve',
      args: [CONTRACTS.TerritoryMap, amountWei],
    });
  };

  const handleRally = () => {
    resetRally();
    rallyWrite({
      address: CONTRACTS.TerritoryMap,
      abi: TerritoryMapABI,
      functionName: 'rally',
      args: [regionId, amountWei],
    });
  };

  const handleReset = () => {
    setSuccessHash(null);
    resetApprove();
    resetRally();
    refetchAllowance();
    refetchUserPower();
  };

  /* placeholder: render */
  return (
    <div className="min-h-screen pt-24 pb-16 px-4 sm:px-6 lg:px-8">
      {/* Background effects */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute -top-40 -left-40 h-[600px] w-[600px] rounded-full bg-amber-500/5 blur-3xl" />
        <div className="absolute -bottom-60 -right-40 h-[500px] w-[500px] rounded-full bg-amber-400/5 blur-3xl" />
      </div>

      <div className="relative z-10 max-w-lg mx-auto">
        {/* Back link */}
        <Link
          href="/map"
          className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-amber-400 transition-colors mb-6"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          Back to Map
        </Link>

        {/* Main card */}
        <div className="rounded-2xl border border-gray-800/60 bg-gray-900/60 backdrop-blur-sm shadow-2xl shadow-amber-500/5 overflow-hidden">
          {/* Header */}
          <div className="px-6 py-5 border-b border-gray-800/60 bg-gradient-to-r from-amber-500/5 to-transparent">
            <h1 className="text-2xl font-black tracking-tight">
              Rally Region <span className="text-amber-400">#{regionId}</span>
            </h1>
            {ownerFaction ? (
              <p className="text-sm text-gray-400 mt-1">
                Current owner: <span style={{ color: ownerFaction.color }}>{ownerFaction.flag} {ownerFaction.name}</span>
              </p>
            ) : ownerFactionId === NO_FACTION ? (
              <p className="text-sm text-gray-500 mt-1">Unclaimed territory</p>
            ) : (
              <p className="text-sm text-gray-600 mt-1">Loading region data...</p>
            )}
          </div>

          <div className="p-6 space-y-6">
            {/* Not connected */}
            {!isConnected && (
              <div className="text-center py-8">
                <p className="text-gray-400 mb-2">Connect your wallet to rally.</p>
              </div>
            )}

            {/* Connected but not enrolled */}
            {isConnected && isEnrolled === false && (
              <div className="text-center py-8 space-y-4">
                <div className="w-16 h-16 mx-auto rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                  <svg className="w-8 h-8 text-amber-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                  </svg>
                </div>
                <p className="text-gray-300 font-semibold">Join a faction first</p>
                <p className="text-sm text-gray-500">You need to pick a nation before you can rally.</p>
                <Link
                  href="/map"
                  className="inline-flex items-center justify-center px-6 py-2.5 text-sm font-bold text-gray-950 bg-gradient-to-r from-amber-400 to-amber-500 rounded-xl hover:shadow-amber-500/30 hover:shadow-lg transition-all"
                >
                  Choose Your Nation
                </Link>
              </div>
            )}

            {/* Connected + enrolled: rally form */}
            {isConnected && isEnrolled && !successHash && (
              <>
                {/* Your faction */}
                {userFaction && (
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-800/40 border border-gray-700/50">
                    <span className="text-2xl">{userFaction.flag}</span>
                    <div>
                      <p className="text-sm font-semibold text-white">{userFaction.name}</p>
                      <p className="text-xs text-gray-500">Your faction</p>
                    </div>
                  </div>
                )}

                {/* Balance */}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Your mUSDT Balance</span>
                  <span className="text-white font-mono">
                    {formatUnits(balance, DECIMALS)} mUSDT
                  </span>
                </div>

                {/* Slider */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-gray-300">Rally Amount</label>
                    <span className="text-sm font-bold text-amber-400 font-mono">{amount} mUSDT</span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={1000}
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    className="w-full h-2 rounded-full appearance-none cursor-pointer bg-gray-800 accent-amber-500"
                  />
                  <div className="flex justify-between text-xs text-gray-600 mt-1">
                    <span>1</span>
                    <span>1000</span>
                  </div>
                </div>

                {/* Power info */}
                <div className="space-y-2 p-4 rounded-xl bg-gray-800/30 border border-gray-700/40">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Your faction power</span>
                    <span className="text-white font-mono">{formatUnits(userPower, DECIMALS)}</span>
                  </div>
                  {ownerFaction && Number(userFactionId) !== Number(ownerFactionId) && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Owner power ({ownerFaction.code})</span>
                      <span className="text-white font-mono">{formatUnits(ownerPower, DECIMALS)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Estimated power added</span>
                    <span className="text-amber-400 font-mono font-semibold">
                      +{formatUnits(estimatedPower, DECIMALS)}
                    </span>
                  </div>
                  {underdogPct > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-emerald-400">Underdog bonus</span>
                      <span className="text-emerald-400 font-bold">+{underdogPct}%</span>
                    </div>
                  )}
                </div>

                {/* Step indicators */}
                <div className="flex items-center gap-6">
                  <StepIndicator step={1} current={txStep} label="Approve mUSDT" />
                  <div className="flex-1 h-px bg-gray-800" />
                  <StepIndicator step={2} current={txStep} label="Rally" />
                </div>

                {/* Action buttons */}
                {txStep === 1 && (
                  <button
                    onClick={handleApprove}
                    disabled={approveIsPending || approveIsConfirming || balance < amountWei}
                    className="w-full py-3.5 rounded-xl font-bold text-gray-950 bg-gradient-to-r from-amber-400 to-amber-500 shadow-lg shadow-amber-500/20 hover:shadow-amber-500/40 hover:scale-[1.02] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
                  >
                    {approveIsPending || approveIsConfirming ? (
                      <>
                        <Spinner />
                        {approveIsPending ? 'Confirm in Wallet...' : 'Confirming...'}
                      </>
                    ) : balance < amountWei ? (
                      'Insufficient mUSDT Balance'
                    ) : (
                      'Approve mUSDT'
                    )}
                  </button>
                )}

                {txStep === 2 && (
                  <button
                    onClick={handleRally}
                    disabled={rallyIsPending || rallyIsConfirming || balance < amountWei}
                    className="w-full py-3.5 rounded-xl font-bold text-gray-950 bg-gradient-to-r from-amber-400 to-amber-500 shadow-lg shadow-amber-500/20 hover:shadow-amber-500/40 hover:scale-[1.02] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
                  >
                    {rallyIsPending || rallyIsConfirming ? (
                      <>
                        <Spinner />
                        {rallyIsPending ? 'Confirm in Wallet...' : 'Confirming...'}
                      </>
                    ) : balance < amountWei ? (
                      'Insufficient mUSDT Balance'
                    ) : (
                      `Rally ${amount} mUSDT`
                    )}
                  </button>
                )}

                {/* Error display */}
                {(approveError || rallyError) && (
                  <div className="p-4 rounded-xl border border-red-500/30 bg-red-500/5">
                    <p className="text-sm text-red-400 font-semibold mb-1">Transaction Failed</p>
                    <p className="text-xs text-gray-400 break-words">
                      {(() => {
                        const err = approveError || rallyError;
                        const msg = err?.message || String(err);
                        if (msg.includes('User rejected') || msg.includes('user rejected') || msg.includes('denied'))
                          return 'Transaction was rejected by the user.';
                        if (msg.length > 200) return msg.slice(0, 180) + '...';
                        return msg;
                      })()}
                    </p>
                    <button
                      onClick={() => { resetApprove(); resetRally(); }}
                      className="mt-2 text-xs text-red-400 hover:text-red-300 font-semibold underline"
                    >
                      Dismiss and try again
                    </button>
                  </div>
                )}
              </>
            )}

            {/* Success state */}
            {successHash && (
              <div className="text-center py-8 space-y-4">
                <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
                  <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-lg font-bold text-white">Rally Successful!</p>
                <p className="text-sm text-gray-400">
                  You committed {amount} mUSDT to Region #{regionId}
                </p>
                <a
                  href={OKLINK_TX(successHash)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-amber-400 hover:text-amber-300 transition-colors"
                >
                  View on OKLink
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-4.5-4.5h6m0 0v6m0-6L9.75 14.25" />
                  </svg>
                </a>
                <div className="pt-2">
                  <button
                    onClick={handleReset}
                    className="px-6 py-2.5 text-sm font-semibold text-amber-400 border border-amber-500/30 rounded-xl hover:bg-amber-500/10 hover:border-amber-500/50 transition-all"
                  >
                    Rally Again
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
