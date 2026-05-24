'use client';

import { useState, useEffect, useCallback } from 'react';
import { WorldMap } from '@/components/WorldMap';
import { RegionSidebar } from '@/components/RegionSidebar';
import { fetchMapState } from '@/lib/api';
import { NO_FACTION } from '@/lib/factions';
import { CONTRACTS } from '@/lib/contracts';
import { TerritoryMapABI } from '@/lib/abi';
import { useReadContract } from 'wagmi';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface MapRegion {
  regionId: number;
  ownerFaction: number;
  captureCount: number;
}

interface MapStateResponse {
  regionCount: number;
  regions: MapRegion[];
}

/* ------------------------------------------------------------------ */
/*  Page Component                                                     */
/* ------------------------------------------------------------------ */

export default function MapPage() {
  /* Map ownership state */
  const [mapOwners, setMapOwners] = useState<number[]>(() => new Array(200).fill(NO_FACTION));

  /* Sidebar state */
  const [selectedRegion, setSelectedRegion] = useState<number | null>(null);

  /* ── On-chain fallback via wagmi ── */
  const { data: onChainState } = useReadContract({
    address: CONTRACTS.TerritoryMap,
    abi: TerritoryMapABI,
    functionName: 'getMapState',
  });

  /* ── API polling (primary source) ── */
  const loadMapFromAPI = useCallback(async () => {
    try {
      const data: MapStateResponse | null = await fetchMapState();
      if (data && data.regions) {
        const owners = new Array(200).fill(NO_FACTION);
        data.regions.forEach((r) => {
          if (r.regionId >= 0 && r.regionId < 200) {
            owners[r.regionId] = r.ownerFaction ?? NO_FACTION;
          }
        });
        setMapOwners(owners);
        return true;
      }
    } catch { /* silent */ }
    return false;
  }, []);

  /* Initial load + 15s polling */
  useEffect(() => {
    loadMapFromAPI();
    const interval = setInterval(loadMapFromAPI, 15_000);
    return () => clearInterval(interval);
  }, [loadMapFromAPI]);

  /* Apply on-chain data as fallback when API has not populated owners */
  useEffect(() => {
    if (!onChainState) return;
    const chainData = onChainState as number[];
    if (!chainData.length) return;

    setMapOwners((prev) => {
      // Only use chain data for regions still at NO_FACTION in our state
      const merged = [...prev];
      let changed = false;
      for (let i = 0; i < chainData.length && i < 200; i++) {
        const chainOwner = Number(chainData[i]);
        if (prev[i] === NO_FACTION && chainOwner !== NO_FACTION) {
          merged[i] = chainOwner;
          changed = true;
        }
      }
      return changed ? merged : prev;
    });
  }, [onChainState]);

  /* ── Region click handler ── */
  const handleRegionClick = useCallback((regionId: number) => {
    setSelectedRegion(regionId);
  }, []);

  const handleCloseSidebar = useCallback(() => {
    setSelectedRegion(null);
  }, []);

  /* ── Render ── */
  const ownerFactionId = selectedRegion !== null ? (mapOwners[selectedRegion] ?? NO_FACTION) : NO_FACTION;

  return (
    <div className="relative" style={{ height: 'calc(100vh - 64px)', marginTop: 64 }}>
      {/* Background grain */}
      <div className="pointer-events-none fixed inset-0 z-0 bg-gray-950" />

      {/* Full-screen map */}
      <div className="relative z-10 h-full flex items-center justify-center bg-[#0a0f1e]">
        <WorldMap
          mapState={mapOwners}
          onRegionClick={handleRegionClick}
          className="w-full h-full"
        />
      </div>

      {/* Region detail sidebar */}
      {selectedRegion !== null && (
        <RegionSidebar
          regionId={selectedRegion}
          ownerFactionId={ownerFactionId}
          isOpen={selectedRegion !== null}
          onClose={handleCloseSidebar}
        />
      )}
    </div>
  );
}
