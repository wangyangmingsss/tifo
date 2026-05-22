'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import * as d3Geo from 'd3-geo';
import { feature } from 'topojson-client';
import type { Topology, GeometryCollection } from 'topojson-specification';
import type { FeatureCollection, Geometry } from 'geojson';
import type { GeoPermissibleObjects } from 'd3-geo';
import { FACTIONS } from '@/config/factions';
import { factionAnchorRegions, countryToRegionId } from '@/config/regionMapping';

// Build a lookup: countryNumericId -> factionColor
// Anchor countries get their faction color; others get a random faction for demo
function buildColorMap(): Record<string, string> {
  const map: Record<string, string> = {};

  // Assign anchor countries their faction color
  FACTIONS.forEach((faction) => {
    const anchorRegion = factionAnchorRegions[faction.id];
    // Find the country ID for this region
    for (const [countryId, regionId] of Object.entries(countryToRegionId)) {
      if (regionId === anchorRegion) {
        map[countryId] = faction.color;
        break;
      }
    }
  });

  // For non-anchor countries, assign a pseudo-random faction color for demo
  // Use a seeded approach for consistency
  for (const [countryId] of Object.entries(countryToRegionId)) {
    if (!map[countryId]) {
      const seed = parseInt(countryId, 10);
      const factionIdx = seed % FACTIONS.length;
      map[countryId] = FACTIONS[factionIdx].color;
    }
  }

  return map;
}

const COLOR_MAP = buildColorMap();

interface CountryFeature {
  type: 'Feature';
  id: string;
  geometry: Geometry;
  properties: Record<string, unknown>;
}

export default function WorldMapPreview() {
  const svgRef = useRef<SVGSVGElement>(null);
  const [features, setFeatures] = useState<CountryFeature[]>([]);
  const router = useRouter();

  // Load topojson
  useEffect(() => {
    fetch('/data/countries-110m.json')
      .then((r) => r.json())
      .then((topo: Topology) => {
        const geojson = feature(
          topo,
          topo.objects.countries as GeometryCollection,
        ) as FeatureCollection;
        setFeatures(geojson.features as CountryFeature[]);
      })
      .catch(console.error);
  }, []);

  // Render
  const width = 800;
  const height = 420;

  const projection = d3Geo
    .geoNaturalEarth1()
    .fitSize([width, height], { type: 'Sphere' } as unknown as GeoPermissibleObjects);

  const path = d3Geo.geoPath(projection);

  return (
    <div
      onClick={() => router.push('/map')}
      className="relative cursor-pointer group rounded-2xl overflow-hidden border border-gray-800 bg-gray-900/40 backdrop-blur-sm transition-all duration-500 hover:border-amber-500/50 hover:shadow-[0_0_60px_rgba(245,158,11,0.12)]"
    >
      {/* Pulse glow overlay */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 bg-gradient-to-br from-amber-500/5 via-transparent to-orange-500/5 pointer-events-none" />

      <svg
        ref={svgRef}
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto"
        style={{ display: 'block' }}
      >
        {/* Ocean */}
        <rect width={width} height={height} fill="#0a0f1a" />

        {/* Graticule */}
        <path
          d={path(d3Geo.geoGraticule10()) || ''}
          fill="none"
          stroke="rgba(255,255,255,0.04)"
          strokeWidth={0.5}
        />

        {/* Countries */}
        {features.map((f) => {
          const countryId = String(f.id);
          const fill = COLOR_MAP[countryId] || '#1e293b';
          return (
            <path
              key={countryId}
              d={path(f) || ''}
              fill={fill}
              fillOpacity={0.7}
              stroke="rgba(0,0,0,0.6)"
              strokeWidth={0.5}
              className="transition-all duration-300 hover:fill-opacity-100"
            />
          );
        })}

        {/* Sphere outline */}
        <path
          d={path({ type: 'Sphere' } as unknown as GeoPermissibleObjects) || ''}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={1}
        />
      </svg>

      {/* Click hint */}
      <div className="absolute bottom-3 right-3 px-3 py-1.5 rounded-full bg-gray-900/80 border border-gray-700 text-xs text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300 backdrop-blur-sm">
        Click to explore map &rarr;
      </div>
    </div>
  );
}
