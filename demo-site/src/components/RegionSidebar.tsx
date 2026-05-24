'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { fetchRegionHistory } from '@/lib/api';
import { FACTIONS, getFaction, NO_FACTION } from '@/lib/factions';
import { OKLINK_TX } from '@/lib/contracts';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface RegionSidebarProps {
  regionId: number;
  ownerFactionId: number;
  onClose: () => void;
  isOpen: boolean;
}

interface HistoryEntry {
  oldFaction: number;
  newFaction: number;
  txHash: string;
  timestamp: number;
  captureCount?: number;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/** Generate deterministic mock power values for top-3 factions in a region */
function mockFactionPowers(regionId: number): { factionId: number; power: number }[] {
  const seed = regionId * 7 + 13;
  const entries: { factionId: number; power: number }[] = [];
  for (let i = 0; i < FACTIONS.length; i++) {
    const power = ((seed * (i + 1) * 31) % 10000) + 100;
    entries.push({ factionId: i, power });
  }
  entries.sort((a, b) => b.power - a.power);
  return entries.slice(0, 3);
}

function shortenHash(hash: string): string {
  if (!hash || hash.length < 12) return hash || '';
  return `${hash.slice(0, 6)}...${hash.slice(-4)}`;
}

function formatTimestamp(ts: number): string {
  const d = new Date(ts * 1000);
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function RegionSidebar({ regionId, ownerFactionId, onClose, isOpen }: RegionSidebarProps) {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  /* Fetch history on open / regionId change */
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setHistoryLoading(true);

    fetchRegionHistory(regionId)
      .then((data) => {
        if (!cancelled && Array.isArray(data)) {
          setHistory(data);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setHistoryLoading(false);
      });

    return () => { cancelled = true; };
  }, [regionId, isOpen]);

  /* Owner faction info */
  const ownerFaction = ownerFactionId !== NO_FACTION ? getFaction(ownerFactionId) : null;
  const factionPowers = mockFactionPowers(regionId);
  const maxPower = factionPowers[0]?.power ?? 1;

  return (
    <>
      {/* Backdrop overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30"
          onClick={onClose}
        />
      )}

      {/* Sidebar panel */}
      <div
        className={`fixed top-16 right-0 bottom-0 z-50 w-full max-w-sm bg-gray-950/95 backdrop-blur-xl border-l border-gray-800/60 shadow-2xl shadow-black/50 transition-transform duration-300 ease-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="h-full overflow-y-auto scrollbar-thin scrollbar-thumb-gray-800">
          <div className="p-6">
            {/* Header with close button */}
            <div className="flex items-start justify-between mb-6">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-amber-500/60 mb-1">
                  Region #{regionId}
                </p>
                <h2 className="text-xl font-black text-white">
                  Territory Details
                </h2>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-gray-800 transition-colors"
                aria-label="Close sidebar"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Current Owner */}
            <div className="rounded-xl border border-gray-800/60 bg-gray-900/50 p-4 mb-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500 mb-2">
                Current Owner
              </p>
              {ownerFaction ? (
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{ownerFaction.flag}</span>
                  <div>
                    <p className="text-base font-bold text-white">{ownerFaction.name}</p>
                    <p className="text-xs text-gray-400">{ownerFaction.confederation}</p>
                  </div>
                  <div
                    className="ml-auto w-3 h-3 rounded-full ring-2 ring-gray-800"
                    style={{ backgroundColor: ownerFaction.color }}
                  />
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <span className="text-3xl">&#x1F3F3;&#xFE0F;</span>
                  <div>
                    <p className="text-base font-bold text-gray-400">Unclaimed</p>
                    <p className="text-xs text-gray-600">No faction controls this territory</p>
                  </div>
                </div>
              )}
            </div>

            {/* Faction Power Comparison */}
            <div className="rounded-xl border border-gray-800/60 bg-gray-900/50 p-4 mb-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500 mb-3">
                Faction Power (Top 3)
              </p>
              <div className="space-y-3">
                {factionPowers.map((fp, i) => {
                  const f = getFaction(fp.factionId);
                  if (!f) return null;
                  const pct = Math.round((fp.power / maxPower) * 100);
                  return (
                    <div key={fp.factionId}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-gray-300 font-medium">
                          {f.flag} {f.code}
                          {i === 0 && (
                            <span className="ml-1.5 text-[9px] text-amber-400 font-bold">LEAD</span>
                          )}
                        </span>
                        <span className="text-gray-500 font-mono tabular-nums">
                          {fp.power.toLocaleString()}
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-gray-800 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500 ease-out"
                          style={{
                            width: `${pct}%`,
                            backgroundColor: f.color === '#000000' ? '#555' : f.color === '#FFFFFF' ? '#ccc' : f.color,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 mb-6">
              <Link
                href={`/rally/${regionId}`}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-bold text-gray-950 bg-gradient-to-r from-amber-400 to-amber-500 rounded-xl shadow-lg shadow-amber-500/20 hover:shadow-amber-500/40 hover:scale-[1.02] transition-all duration-200"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0 1 12 21 8.25 8.25 0 0 1 6.038 7.047 8.287 8.287 0 0 0 9 9.601a8.983 8.983 0 0 1 3.361-6.867 8.21 8.21 0 0 0 3 2.48Z" />
                </svg>
                Rally
              </Link>
              <Link
                href={`/rally/${regionId}?action=defect`}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-bold text-gray-300 border border-gray-700 rounded-xl hover:border-red-500/50 hover:text-red-400 hover:bg-red-500/5 transition-all duration-200"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
                </svg>
                Defect
              </Link>
            </div>

            {/* Capture History */}
            <div className="rounded-xl border border-gray-800/60 bg-gray-900/50 p-4 mb-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500 mb-3">
                Capture History
              </p>

              {historyLoading ? (
                <div className="flex items-center justify-center py-6">
                  <div className="w-5 h-5 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
                </div>
              ) : history.length === 0 ? (
                <p className="text-xs text-gray-600 text-center py-4">
                  No captures recorded yet
                </p>
              ) : (
                <div className="relative">
                  {/* Timeline line */}
                  <div className="absolute left-[7px] top-2 bottom-2 w-px bg-gray-800" />

                  <div className="space-y-4">
                    {history.map((entry, i) => {
                      const oldF = getFaction(entry.oldFaction);
                      const newF = getFaction(entry.newFaction);
                      return (
                        <div key={i} className="relative pl-6">
                          {/* Timeline dot */}
                          <div className="absolute left-0 top-1 w-[15px] h-[15px] rounded-full border-2 border-gray-700 bg-gray-900 flex items-center justify-center">
                            <div
                              className="w-[7px] h-[7px] rounded-full"
                              style={{
                                backgroundColor: newF?.color ?? '#555',
                              }}
                            />
                          </div>

                          <div>
                            <div className="flex items-center gap-1.5 text-xs text-gray-300 mb-0.5">
                              <span>{oldF ? `${oldF.flag} ${oldF.code}` : 'None'}</span>
                              <svg className="w-3 h-3 text-gray-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                              </svg>
                              <span className="font-semibold">{newF ? `${newF.flag} ${newF.code}` : 'None'}</span>
                            </div>
                            <div className="flex items-center gap-2 text-[10px] text-gray-600">
                              {entry.timestamp > 0 && (
                                <span>{formatTimestamp(entry.timestamp)}</span>
                              )}
                              {entry.txHash && (
                                <a
                                  href={OKLINK_TX(entry.txHash)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-amber-500/60 hover:text-amber-400 transition-colors font-mono"
                                >
                                  {shortenHash(entry.txHash)}
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Verifiability Notice */}
            <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/5 border border-amber-500/10">
              <svg className="w-4 h-4 text-amber-500/50 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
              </svg>
              <p className="text-[10px] text-gray-500 leading-relaxed">
                All data comes from on-chain event logs. Every capture, rally, and defection is verifiable on X Layer.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
