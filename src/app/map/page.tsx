'use client';

import { useState, useCallback, useMemo } from 'react';
import Navbar from '@/components/Navbar';
import WorldMap, { generateMockMapState } from '@/components/WorldMap';
import RegionSidebar from '@/components/RegionSidebar';
import MapLegend from '@/components/MapLegend';
import { NO_FACTION } from '@/config/factions';

export default function MapPage() {
  const [selectedRegionId, setSelectedRegionId] = useState<number | null>(null);
  const [selectedCountryId, setSelectedCountryId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Generate mock map state once
  const mapState = useMemo(() => generateMockMapState(), []);

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
