'use client';

import { useState } from 'react';
import { FACTIONS, type Faction } from '@/config/factions';

interface MapLegendProps {
  /** Map from factionId -> number of territories owned */
  territoryCounts: Record<number, number>;
}

export default function MapLegend({ territoryCounts }: MapLegendProps) {
  const [collapsed, setCollapsed] = useState(false);

  // Sort factions by territory count descending, take top 10
  const ranked: { faction: Faction; count: number }[] = FACTIONS
    .map((f) => ({ faction: f, count: territoryCounts[f.id] ?? 0 }))
    .filter((e) => e.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return (
    <div className="absolute bottom-4 left-4 z-20">
      <div className="bg-gray-900/90 backdrop-blur-sm border border-gray-700/50 rounded-lg overflow-hidden shadow-xl">
        {/* Header */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center justify-between w-full px-3 py-2 text-xs font-semibold text-gray-300 hover:bg-gray-800/50 transition-colors"
        >
          <span>Territory Leaders</span>
          <svg
            className={`w-3.5 h-3.5 ml-2 transition-transform ${collapsed ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Legend items */}
        {!collapsed && (
          <div className="px-3 pb-2 space-y-1">
            {ranked.map(({ faction, count }, i) => (
              <div key={faction.id} className="flex items-center gap-2 text-xs">
                <span className="text-gray-500 w-4 text-right font-mono">{i + 1}</span>
                <span
                  className="w-3 h-3 rounded-sm flex-shrink-0 border border-white/10"
                  style={{ backgroundColor: faction.color }}
                />
                <span className="text-gray-300 truncate flex-1">{faction.code}</span>
                <span className="text-gray-500 font-mono">{count}</span>
              </div>
            ))}
            <div className="flex items-center gap-2 text-xs pt-1 border-t border-gray-700/50">
              <span className="w-4" />
              <span
                className="w-3 h-3 rounded-sm flex-shrink-0 border border-white/10"
                style={{ backgroundColor: '#1a1a2e' }}
              />
              <span className="text-gray-500">Neutral</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
