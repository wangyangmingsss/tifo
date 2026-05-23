'use client';

import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { geoNaturalEarth1, geoPath } from 'd3-geo';
import { feature } from 'topojson-client';
import type { Topology, GeometryCollection } from 'topojson-specification';
import type { FeatureCollection, Feature, Geometry } from 'geojson';
import { FACTIONS, NO_FACTION } from '@/lib/factions';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface WorldMapProps {
  mapState: number[];
  onRegionClick: (regionId: number) => void;
  className?: string;
  mini?: boolean;
}

interface CountryProperties {
  name: string;
}

type CountryFeature = Feature<Geometry, CountryProperties> & { id: string };

/* ------------------------------------------------------------------ */
/*  Faction anchor ISO-alpha2 -> ISO-numeric mapping                   */
/* ------------------------------------------------------------------ */

const ANCHOR_ISO_NUMERIC: Record<number, string> = {
  0: '032',  1: '076',  2: '858',  3: '170',  4: '218',  5: '600',
  6: '250',  7: '724',  8: '826',  9: '276', 10: '620', 11: '528',
  12: '191', 13: '056', 14: '380', 15: '756', 16: '040', 17: '578',
  18: '616', 19: '203', 20: '840', 21: '484', 22: '124', 23: '591',
  24: '332', 25: '504', 26: '686', 27: '288', 28: '710', 29: '384',
  30: '566', 31: '012', 32: '818', 33: '132', 34: '180',
  35: '392', 36: '410', 37: '036', 38: '682', 39: '364',
  40: '634', 41: '860', 42: '400', 43: '368', 44: '554',
  45: '388', 46: '792', 47: '788',
};

/** Reverse: ISO-numeric string -> regionId for faction anchors */
const ANCHOR_NUMERIC_TO_REGION: Map<string, number> = new Map(
  Object.entries(ANCHOR_ISO_NUMERIC).map(([regionId, isoNum]) => [isoNum, Number(regionId)])
);

/* ------------------------------------------------------------------ */
/*  Build region mapping from TopoJSON countries                       */
/* ------------------------------------------------------------------ */

function buildCountryToRegionMap(countries: CountryFeature[]): Map<string, number> {
  const map = new Map<string, number>();
  let nextRegionId = 48;

  // First pass: assign anchor countries to their fixed region IDs
  for (const country of countries) {
    const isoNum = country.id;
    const regionId = ANCHOR_NUMERIC_TO_REGION.get(isoNum);
    if (regionId !== undefined) {
      map.set(isoNum, regionId);
    }
  }

  // Second pass: assign remaining countries region IDs 48+
  for (const country of countries) {
    const isoNum = country.id;
    if (!map.has(isoNum) && nextRegionId < 200) {
      map.set(isoNum, nextRegionId);
      nextRegionId++;
    }
  }

  return map;
}

/* ------------------------------------------------------------------ */
/*  Faction color lookup                                               */
/* ------------------------------------------------------------------ */

const UNOWNED_COLOR = '#1a2035';
const DARK_GRAY = '#2a2a3a';

function getFactionColor(factionId: number): string {
  if (factionId === NO_FACTION) return UNOWNED_COLOR;
  const faction = FACTIONS[factionId];
  if (!faction) return DARK_GRAY;
  // Special handling for very dark / white colors to keep them visible on dark bg
  if (faction.color === '#000000') return '#333333';
  if (faction.color === '#FFFFFF') return '#c8d0e0';
  if (faction.color === '#1A1A1A') return '#3a3a4a';
  return faction.color;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

const WORLD_ATLAS_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';

export function WorldMap({ mapState, onRegionClick, className, mini = false }: WorldMapProps) {
  const [topoData, setTopoData] = useState<Topology | null>(null);
  const [hoveredRegion, setHoveredRegion] = useState<number | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const svgRef = useRef<SVGSVGElement>(null);

  /* Fetch TopoJSON on mount */
  useEffect(() => {
    let cancelled = false;
    fetch(WORLD_ATLAS_URL)
      .then((res) => res.json())
      .then((data: Topology) => {
        if (!cancelled) setTopoData(data);
      })
      .catch((err) => console.error('Failed to load world map data:', err));
    return () => { cancelled = true; };
  }, []);

  /* Projection */
  const width = mini ? 400 : 960;
  const height = mini ? 200 : 500;

  const projection = useMemo(
    () =>
      geoNaturalEarth1()
        .scale(mini ? 65 : 153)
        .translate([width / 2, height / 2]),
    [mini, width, height]
  );

  const pathGenerator = useMemo(() => geoPath().projection(projection), [projection]);

  /* Convert TopoJSON -> GeoJSON features + build region map */
  const { countries, regionMap, regionToName } = useMemo(() => {
    if (!topoData) return { countries: [] as CountryFeature[], regionMap: new Map<string, number>(), regionToName: new Map<number, string>() };

    const geojson = feature(
      topoData,
      topoData.objects.countries as GeometryCollection<CountryProperties>
    ) as FeatureCollection<Geometry, CountryProperties>;

    const feats = geojson.features as CountryFeature[];
    const rMap = buildCountryToRegionMap(feats);

    const rToName = new Map<number, string>();
    for (const f of feats) {
      const rid = rMap.get(f.id);
      if (rid !== undefined) {
        rToName.set(rid, f.properties.name);
      }
    }

    return { countries: feats, regionMap: rMap, regionToName: rToName };
  }, [topoData]);

  /* Event handlers */
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (mini) return;
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    setTooltipPos({ x: e.clientX - rect.left + 12, y: e.clientY - rect.top - 8 });
  }, [mini]);

  const handleCountryHover = useCallback((regionId: number | null) => {
    if (mini) return;
    setHoveredRegion(regionId);
  }, [mini]);

  const handleCountryClick = useCallback((regionId: number) => {
    if (mini) return;
    onRegionClick(regionId);
  }, [mini, onRegionClick]);

  /* Tooltip info */
  const tooltipInfo = useMemo(() => {
    if (hoveredRegion === null) return null;
    const countryName = regionToName.get(hoveredRegion) ?? 'Unknown';
    const ownerId = mapState[hoveredRegion];
    const ownerFaction = ownerId !== undefined && ownerId !== NO_FACTION ? FACTIONS[ownerId] : null;
    return {
      name: countryName,
      owner: ownerFaction ? `${ownerFaction.flag} ${ownerFaction.name}` : 'Unclaimed',
      color: ownerFaction ? getFactionColor(ownerId) : UNOWNED_COLOR,
    };
  }, [hoveredRegion, mapState, regionToName]);

  /* Loading state */
  if (!topoData) {
    return (
      <div
        className={className}
        style={{
          width: mini ? 400 : '100%',
          height: mini ? 200 : 500,
          background: '#0a0f1e',
          borderRadius: 8,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#4a5580',
          fontSize: mini ? 12 : 16,
        }}
      >
        Loading map...
      </div>
    );
  }

  /* Render */
  return (
    <div
      className={className}
      style={{
        position: 'relative',
        width: mini ? 400 : '100%',
        maxWidth: mini ? 400 : 960,
        margin: '0 auto',
        userSelect: 'none',
      }}
    >
      <svg
        ref={svgRef}
        viewBox={`0 0 ${width} ${height}`}
        style={{
          width: '100%',
          height: 'auto',
          background: '#0a0f1e',
          borderRadius: mini ? 6 : 12,
          cursor: mini ? 'default' : 'pointer',
          display: 'block',
        }}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => handleCountryHover(null)}
      >
        {/* Defs for glow filter */}
        <defs>
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="1.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="hover-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Ocean background */}
        <rect x="0" y="0" width={width} height={height} fill="#0a0f1e" />

        {/* Graticule-like subtle grid lines - optional sphere outline */}
        <path
          d={pathGenerator({ type: 'Sphere' }) ?? ''}
          fill="none"
          stroke="#1a2540"
          strokeWidth={0.5}
        />

        {/* Countries */}
        {countries.map((country) => {
          const regionId = regionMap.get(country.id);
          if (regionId === undefined) return null;

          const ownerId = mapState[regionId] ?? NO_FACTION;
          const fillColor = getFactionColor(ownerId);
          const isHovered = hoveredRegion === regionId;
          const d = pathGenerator(country) ?? '';

          return (
            <path
              key={country.id}
              d={d}
              fill={fillColor}
              stroke={isHovered ? '#ffffff' : '#0e1529'}
              strokeWidth={isHovered ? 1.5 : 0.5}
              opacity={isHovered ? 1 : 0.85}
              filter={isHovered ? 'url(#hover-glow)' : undefined}
              style={{
                transition: 'fill 0.2s ease, stroke 0.2s ease, opacity 0.2s ease, stroke-width 0.2s ease',
              }}
              onMouseEnter={() => handleCountryHover(regionId)}
              onClick={() => handleCountryClick(regionId)}
            />
          );
        })}

        {/* Re-draw borders on top for crispness (thin lines) */}
        {countries.map((country) => {
          const regionId = regionMap.get(country.id);
          if (regionId === undefined) return null;
          const isHovered = hoveredRegion === regionId;
          if (isHovered) return null; // hovered country already has its own border
          const d = pathGenerator(country) ?? '';
          return (
            <path
              key={`border-${country.id}`}
              d={d}
              fill="none"
              stroke="#1c2844"
              strokeWidth={0.3}
              pointerEvents="none"
              filter="url(#glow)"
              style={{ opacity: 0.6 }}
            />
          );
        })}
      </svg>

      {/* Tooltip */}
      {!mini && hoveredRegion !== null && tooltipInfo && (
        <div
          style={{
            position: 'absolute',
            left: tooltipPos.x,
            top: tooltipPos.y,
            pointerEvents: 'none',
            background: 'rgba(10, 15, 30, 0.92)',
            border: `1px solid ${tooltipInfo.color}`,
            borderRadius: 8,
            padding: '8px 14px',
            color: '#e0e6f0',
            fontSize: 13,
            lineHeight: 1.5,
            zIndex: 100,
            whiteSpace: 'nowrap',
            boxShadow: `0 0 12px ${tooltipInfo.color}44, 0 4px 16px rgba(0,0,0,0.5)`,
            transform: 'translateY(-100%)',
          }}
        >
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2 }}>
            {tooltipInfo.name}
          </div>
          <div style={{ color: tooltipInfo.color, fontSize: 12 }}>
            {tooltipInfo.owner}
          </div>
        </div>
      )}
    </div>
  );
}
