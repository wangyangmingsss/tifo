'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useReadContract } from 'wagmi';
import Navbar from '@/components/Navbar';
import WorldMap, { generateMockMapState } from '@/components/WorldMap';
import RegionSidebar from '@/components/RegionSidebar';
import MapLegend from '@/components/MapLegend';
import { NO_FACTION } from '@/config/factions';
import { CONTRACTS } from '@/config/contracts';
import { TerritoryMapABI } from '@/config/abi/TerritoryMap';
import { regionIdToCountry } from '@/config/regionMapping';

export default function MapPage() {
  const [selectedRegionId, setSelectedRegionId] = useState<number | null>(null);
  const [selectedCountryId, setSelectedCountryId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Poll on-chain getMapState() every 15 seconds for real-time map rendering
  const { data: onChainMapState, isLoading, isError } = useReadContract({
    address: CONTRACTS.TerritoryMap,
    abi: TerritoryMapABI,
    functionName: 'getMapState',
    query: {
      refetchInterval: 15_000,
    },
  });

  // Convert uint8[] (regionId → factionId) to Record<countryNumericId, factionId>
  const mapState = useMemo(() => {
    if (!onChainMapState || isError) {
      // Fallback to mock data if chain read fails
      return generateMockMapState();
    }
    const state: Record<string, number> = {};
    const owners = onChainMapState as number[];
    for (let regionId = 0; regionId < owners.length; regionId++) {
      const countryId = regionIdToCountry[regionId];
      if (countryId && owners[regionId] !== NO_FACTION) {
        state[countryId] = owners[regionId];
      }
    }
    return state;
  }, [onChainMapState, isError]);

  // Compute territory counts for legend
  const territoryCounts = useMemo(() => {
    const counts: Record<number, number> = {};
    for (const factionId of Object.values(mapState)) {
      if (factionId !== NO_FACTION) {
        counts[factionId] = (counts[factionId] ?? 0) + 1;
      }
    }
    return counts;
  }, [mapState]);

  const handleSelectRegion = useCallback((regionId: number, countryId: string) => {
    setSelectedRegionId(regionId);
    setSelectedCountryId(countryId);
    setSidebarOpen(true);
  }, []);

  const handleCloseSidebar = useCallback(() => {
    setSidebarOpen(false);
    // Delay clearing selection so slide-out animation can play
    setTimeout(() => {
      setSelectedRegionId(null);
      setSelectedCountryId(null);
    }, 300);
  }, []);

  // Get owner faction for selected region
  const ownerFactionId = selectedCountryId ? (mapState[selectedCountryId] ?? NO_FACTION) : NO_FACTION;

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-[#0a0a1a]">
      <Navbar />

      {/* Map area - below the fixed navbar (h-14 = 56px) */}
      <div className="flex-1 relative mt-14">
        <WorldMap mapState={mapState} onSelectRegion={handleSelectRegion} />

        <MapLegend territoryCounts={territoryCounts} />

        {/* Sidebar */}
        {sidebarOpen && selectedRegionId !== null && (
          <RegionSidebar
            regionId={selectedRegionId}
            ownerFactionId={ownerFactionId}
            onClose={handleCloseSidebar}
          />
        )}
      </div>
    </div>
  );
}
