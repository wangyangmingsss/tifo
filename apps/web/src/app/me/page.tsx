'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { formatUnits } from 'viem';
import { CONTRACTS, OKLINK_TX } from '@/lib/contracts';
import { FactionRegistryABI, MockUSDTABI } from '@/lib/abi';
import { FACTIONS, getFaction } from '@/lib/factions';

export default function MePage() {
  const { address, isConnected, chain } = useAccount();
  const [selectedFaction, setSelectedFaction] = useState<number | null>(null);

  // ── Contract reads ──
  const { data: isEnrolled, refetch: refetchEnrolled } = useReadContract({
    address: CONTRACTS.FactionRegistry,
    abi: FactionRegistryABI,
    functionName: 'isEnrolled',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const { data: factionId, refetch: refetchFaction } = useReadContract({
    address: CONTRACTS.FactionRegistry,
    abi: FactionRegistryABI,
    functionName: 'factionOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address && !!isEnrolled },
  });

  const { data: balance, refetch: refetchBalance } = useReadContract({
    address: CONTRACTS.MockUSDT,
    abi: MockUSDTABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const { data: allowance } = useReadContract({
    address: CONTRACTS.MockUSDT,
    abi: MockUSDTABI,
    functionName: 'allowance',
    args: address ? [address, CONTRACTS.TerritoryMap] : undefined,
    query: { enabled: !!address },
  });

  // ── Write hooks ──
  const {
    writeContract: joinFaction,
    data: joinHash,
    isPending: joinPending,
    error: joinError,
    reset: resetJoin,
  } = useWriteContract();

  const {
    writeContract: claimFaucet,
    data: faucetHash,
    isPending: faucetPending,
    error: faucetError,
    reset: resetFaucet,
  } = useWriteContract();

  // ── Wait for receipts ──
  const { isLoading: joinConfirming, isSuccess: joinSuccess } = useWaitForTransactionReceipt({ hash: joinHash });
  const { isLoading: faucetConfirming, isSuccess: faucetSuccess } = useWaitForTransactionReceipt({ hash: faucetHash });

  // Refresh after join
  useEffect(() => {
    if (joinSuccess) {
      refetchEnrolled();
      refetchFaction();
    }
  }, [joinSuccess, refetchEnrolled, refetchFaction]);

  // Refresh after faucet
  useEffect(() => {
    if (faucetSuccess) {
      refetchBalance();
    }
  }, [faucetSuccess, refetchBalance]);

  const myFaction = factionId !== undefined ? getFaction(Number(factionId)) : undefined;
  // MockUSDT has 18 decimals
  const formattedBalance = balance ? Number(formatUnits(balance as bigint, 18)).toLocaleString(undefined, { maximumFractionDigits: 2 }) : '0';
  const formattedAllowance = allowance ? Number(formatUnits(allowance as bigint, 18)).toLocaleString(undefined, { maximumFractionDigits: 2 }) : '0';

  // Wrong chain warning
  const isWrongChain = isConnected && chain?.id !== 1952;

  // Helper to extract readable error message
  function formatError(err: Error | null): string | null {
    if (!err) return null;
    const msg = err.message || String(err);
    // User rejected
    if (msg.includes('User rejected') || msg.includes('user rejected') || msg.includes('denied')) {
      return 'Transaction was rejected by the user.';
    }
    // Extract revert reason if present
    const revertMatch = msg.match(/reason:\s*(.+?)(?:\n|$)/i) || msg.match(/reverted with.*?:\s*(.+?)(?:\n|$)/i);
    if (revertMatch) return `Contract error: ${revertMatch[1].trim()}`;
    // Cooldown / already enrolled
    if (msg.includes('AlreadyInFaction')) return 'You are already in a faction. Switching costs a fee.';
    // Generic shortened
    if (msg.length > 200) return msg.slice(0, 180) + '...';
    return msg;
  }

  // ── Not Connected ──
  if (!isConnected) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gray-800/50 border border-gray-700/50 flex items-center justify-center">
            <svg className="w-10 h-10 text-amber-500/60" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2.25 2.25 0 0 0-2.25-2.25H15a3 3 0 1 1-6 0H5.25A2.25 2.25 0 0 0 3 12m18 0v6a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 0 0-2.25-2.25H5.25A2.25 2.25 0 0 0 3 9m18 0V6a2.25 2.25 0 0 0-2.25-2.25H5.25A2.25 2.25 0 0 0 3 6v3" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Connect Your Wallet</h1>
          <p className="text-gray-500 max-w-sm mx-auto">
            Connect your wallet using the button in the top-right corner to view your war record, claim mUSDT, and join a faction.
          </p>
        </div>
      </div>
    );
  }

  // ── Connected but Not Enrolled: Faction Picker ──
  if (!isEnrolled) {
    return (
      <div className="min-h-screen pt-24 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <h1 className="text-3xl sm:text-4xl font-black text-white mb-2">
              Choose Your <span className="text-amber-400">Faction</span>
            </h1>
            <p className="text-gray-500 text-sm max-w-md mx-auto">
              Pick your nation and join the war. This choice defines your allegiance on the battlefield.
            </p>
          </div>

          {/* Wrong chain warning */}
          {isWrongChain && (
            <div className="max-w-lg mx-auto mb-6 p-4 rounded-xl border border-red-500/30 bg-red-500/5 text-center">
              <p className="text-sm text-red-400 font-semibold mb-1">Wrong Network</p>
              <p className="text-xs text-gray-400">
                Please switch to <span className="text-white font-bold">X Layer Testnet</span> (Chain ID: 1952) in your wallet to proceed.
              </p>
            </div>
          )}

          {/* Transaction status */}
          {joinHash && (
            <div className="max-w-lg mx-auto mb-6 p-4 rounded-xl border border-amber-500/30 bg-amber-500/5 text-center">
              <p className="text-sm text-amber-400 font-semibold mb-1">
                {joinConfirming ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" /><path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" /></svg>
                    Confirming transaction on-chain...
                  </span>
                ) : joinSuccess ? (
                  'Faction joined successfully!'
                ) : (
                  'Transaction submitted, waiting for confirmation...'
                )}
              </p>
              <a
                href={OKLINK_TX(joinHash)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-amber-500/70 hover:text-amber-400 underline font-mono"
              >
                View on OKLink
              </a>
            </div>
          )}

          {/* Error display */}
          {joinError && (
            <div className="max-w-lg mx-auto mb-6 p-4 rounded-xl border border-red-500/30 bg-red-500/5">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                </svg>
                <div>
                  <p className="text-sm text-red-400 font-semibold mb-1">Transaction Failed</p>
                  <p className="text-xs text-gray-400 break-words">{formatError(joinError)}</p>
                </div>
              </div>
              <button
                onClick={() => { resetJoin(); setSelectedFaction(null); }}
                className="mt-3 text-xs text-red-400 hover:text-red-300 font-semibold underline"
              >
                Dismiss and try again
              </button>
            </div>
          )}

          {/* Pending indicator */}
          {joinPending && (
            <div className="max-w-lg mx-auto mb-6 p-4 rounded-xl border border-amber-500/30 bg-amber-500/5 text-center">
              <p className="text-sm text-amber-400 font-semibold flex items-center justify-center gap-2">
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" /><path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" /></svg>
                {selectedFaction !== null ? (
                  <>Confirm in your wallet to join {getFaction(selectedFaction)?.flag} {getFaction(selectedFaction)?.name}...</>
                ) : (
                  <>Confirm in your wallet...</>
                )}
              </p>
            </div>
          )}

          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
            {FACTIONS.map((f) => (
              <button
                key={f.id}
                disabled={joinPending || joinConfirming || isWrongChain}
                onClick={() => {
                  resetJoin();
                  setSelectedFaction(f.id);
                  joinFaction({
                    address: CONTRACTS.FactionRegistry,
                    abi: FactionRegistryABI,
                    functionName: 'joinFaction',
                    args: [f.id],
                  });
                }}
                className={`group relative flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed ${
                  selectedFaction === f.id && (joinPending || joinConfirming)
                    ? 'border-amber-500/60 bg-amber-500/10 ring-2 ring-amber-500/30'
                    : 'border-gray-800/60 bg-gray-900/40 hover:border-amber-500/40 hover:bg-gray-800/40'
                }`}
              >
                <span className="text-3xl">{f.flag}</span>
                <span className="text-[10px] font-bold text-gray-400 group-hover:text-amber-400 transition-colors truncate w-full text-center">
                  {f.code}
                </span>
                <span className="text-[9px] text-gray-600 truncate w-full text-center">
                  {f.nameZh}
                </span>
                <div
                  className="absolute inset-x-0 bottom-0 h-0.5 rounded-b-xl opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ backgroundColor: f.color }}
                />
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Enrolled: Profile Dashboard ──
  const shareText = myFaction
    ? `I'm fighting for ${myFaction.flag} ${myFaction.name} in TIFO - the 2026 World Cup On-Chain Territory War! Join me on X Layer!`
    : '';
  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`;

  return (
    <div className="min-h-screen pt-24 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {/* Wrong chain warning */}
        {isWrongChain && (
          <div className="mb-6 p-4 rounded-xl border border-red-500/30 bg-red-500/5 text-center">
            <p className="text-sm text-red-400 font-semibold mb-1">Wrong Network</p>
            <p className="text-xs text-gray-400">
              Please switch to <span className="text-white font-bold">X Layer Testnet</span> (Chain ID: 1952) in your wallet.
            </p>
          </div>
        )}

        {/* My Faction Header */}
        {myFaction && (
          <div className="relative rounded-2xl border border-gray-800/60 bg-gray-900/40 backdrop-blur-sm p-8 mb-8 overflow-hidden">
            <div
              className="absolute inset-x-0 top-0 h-1.5"
              style={{ backgroundColor: myFaction.color }}
            />
            <div className="flex items-center gap-6">
              <span className="text-6xl">{myFaction.flag}</span>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider font-bold mb-1">My Faction</p>
                <h1 className="text-2xl sm:text-3xl font-black text-white">{myFaction.name}</h1>
                <p className="text-gray-400 text-sm">{myFaction.nameZh}</p>
              </div>
            </div>
          </div>
        )}

        {/* Balance & Faucet */}
        <div className="rounded-2xl border border-gray-800/60 bg-gray-900/40 backdrop-blur-sm p-6 mb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider font-bold mb-1">MockUSDT Balance</p>
              <p className="text-3xl font-black text-white font-mono tabular-nums">
                {formattedBalance} <span className="text-lg text-gray-500">mUSDT</span>
              </p>
              <p className="text-xs text-gray-600 mt-1">
                Allowance for TerritoryMap: {formattedAllowance} mUSDT
              </p>
            </div>
            <button
              disabled={faucetPending || faucetConfirming || isWrongChain}
              onClick={() => {
                resetFaucet();
                claimFaucet({
                  address: CONTRACTS.MockUSDT,
                  abi: MockUSDTABI,
                  functionName: 'faucet',
                });
              }}
              className="flex items-center gap-2 px-6 py-3 text-sm font-bold text-gray-950 bg-gradient-to-r from-amber-400 to-amber-500 rounded-xl hover:shadow-lg hover:shadow-amber-500/25 hover:scale-[1.03] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {faucetPending ? (
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" /><path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" /></svg>
                  Confirm in wallet...
                </span>
              ) : faucetConfirming ? (
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" /><path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" /></svg>
                  Confirming...
                </span>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                  </svg>
                  Claim 1000 mUSDT
                </>
              )}
            </button>
          </div>

          {faucetHash && (
            <div className="mt-4 p-3 rounded-xl border border-amber-500/20 bg-amber-500/5">
              <p className="text-sm text-amber-400 font-semibold">
                {faucetSuccess ? 'Faucet claimed successfully!' : faucetConfirming ? 'Confirming on-chain...' : 'Transaction submitted...'}
              </p>
              <a
                href={OKLINK_TX(faucetHash)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-amber-500/70 hover:text-amber-400 underline font-mono"
              >
                View on OKLink
              </a>
            </div>
          )}

          {faucetError && (
            <div className="mt-4 p-3 rounded-xl border border-red-500/20 bg-red-500/5">
              <p className="text-sm text-red-400 font-semibold mb-1">Faucet Failed</p>
              <p className="text-xs text-gray-400 break-words">{formatError(faucetError)}</p>
              <button onClick={resetFaucet} className="mt-2 text-xs text-red-400 hover:text-red-300 font-semibold underline">
                Dismiss
              </button>
            </div>
          )}
        </div>

        {/* Contribution Stats */}
        <div className="rounded-2xl border border-gray-800/60 bg-gray-900/40 backdrop-blur-sm p-6 mb-6">
          <h2 className="text-lg font-bold text-white mb-4">War Record</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-xl border border-gray-800/40 bg-gray-800/20 text-center">
              <p className="text-xs text-gray-500 uppercase tracking-wider font-bold mb-1">Wallet</p>
              <p className="text-sm font-mono text-gray-300 truncate">
                {address?.slice(0, 6)}...{address?.slice(-4)}
              </p>
            </div>
            <div className="p-4 rounded-xl border border-gray-800/40 bg-gray-800/20 text-center">
              <p className="text-xs text-gray-500 uppercase tracking-wider font-bold mb-1">Faction ID</p>
              <p className="text-sm font-mono text-gray-300">
                {factionId !== undefined ? String(Number(factionId)) : '--'}
              </p>
            </div>
          </div>
        </div>

        {/* Defection hint */}
        <div className="rounded-2xl border border-purple-500/20 bg-purple-500/5 backdrop-blur-sm p-6 mb-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-bold text-purple-300 mb-1">Defection Available</h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                Feeling strategic? You can defect from your current faction on contested territories.
                Your rallied power converts to your new faction. Visit the map to find defection opportunities.
              </p>
              <Link href="/map" className="inline-flex items-center gap-1 mt-2 text-xs text-purple-400 hover:text-purple-300 font-semibold">
                Explore Map
                <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </Link>
            </div>
          </div>
        </div>

        {/* Share on X */}
        <div className="text-center">
          <a
            href={twitterUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 text-sm font-bold border border-gray-700 rounded-xl hover:border-amber-500/30 hover:bg-gray-800/40 transition-all duration-200 text-gray-300 hover:text-white"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
            Share on X
          </a>
        </div>
      </div>
    </div>
  );
}
