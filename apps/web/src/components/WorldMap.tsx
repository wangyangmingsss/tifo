'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import * as d3 from 'd3';
import * as topojson from 'topojson-client';
import type { Topology, GeometryCollection } from 'topojson-specification';
import { NO_FACTION, getFactionById } from '@/config/factions';
import { countryToRegionId, getCountryName } from '@/config/regionMapping';

// ── Types ──────────────────────────────────────────────────────────────────────

interface WorldMapProps {
  mapState: Record<string, number>; // countryNumericId -> factionId
  onSelectRegion: (regionId: number, countryId: string) => void;
}

interface CountryFeature {
  id: string;
  properties: { name: string };
  type: 'Feature';
  geometry: GeoJSON.Geometry;
}

// ── Mock map state generator ───────────────────────────────────────────────────
// PLACEHOLDER: generateMockMapState
// PLACEHOLDER: faction color resolver
// PLACEHOLDER: tooltip logic
// PLACEHOLDER: main component

export function generateMockMapState(): Record<string, number> {
  const state: Record<string, number> = {};

  // Geographic clustering: factions own regions near their anchor
  const clusters: Record<number, string[]> = {
    0:  ['032','152','068','600','858','238'], // ARG -> South America south
    1:  ['076','740','328','862'],              // BRA -> Brazil + neighbors
    3:  ['170','218','591','188'],              // COL
    6:  ['250','442','056','756'],              // FRA -> Western Europe
    7:  ['724','620','010'],                    // ESP + POR
    8:  ['826','372'],                          // ENG -> UK + Ireland
    9:  ['276','040','203','756'],              // GER -> Central Europe (CHE shared)
    11: ['528','208'],                          // NED -> Benelux + Denmark
    14: ['380','300','196'],                    // ITA -> Med
    20: ['840','124'],                          // USA + CAN
    21: ['484','320','340','222'],              // MEX -> Central America
    25: ['504','732','478'],                    // MAR -> North Africa west
    30: ['566','288','384','768','204'],        // NGA -> West Africa
    31: ['012','788','434'],                    // ALG -> North Africa
    32: ['818','729','728'],                    // EGY -> NE Africa
    35: ['392','410','408'],                    // JPN + Korea
    36: ['410'],                                // KOR (already in JPN cluster, skip dupe)
    37: ['036','554','598','540'],              // AUS -> Oceania
    38: ['682','512','784','414'],              // KSA -> Gulf
    39: ['364','004','586'],                    // IRN -> West Asia
    46: ['792','268'],                          // TUR -> Turkey + Georgia
    28: ['710','072','516','748','426'],        // RSA -> Southern Africa
    34: ['180','120','108','178'],              // COD -> Central Africa
    43: ['368','760','400','422'],              // IRQ -> Levant
  };

  for (const [factionIdStr, countries] of Object.entries(clusters)) {
    const factionId = Number(factionIdStr);
    for (const cid of countries) {
      state[cid] = factionId;
    }
  }

  return state;
}

function getColorForCountry(countryId: string, mapState: Record<string, number>): string {
  const factionId = mapState[countryId];
  if (factionId === undefined || factionId === NO_FACTION) return '#1a1a2e';
  const faction = getFactionById(factionId);
  if (!faction) return '#1a1a2e';
  // For very dark or very light colors, slightly adjust for visibility on dark bg
  if (faction.color === '#000000') return '#2a2a3e';
  if (faction.color === '#FFFFFF') return '#d4d4e0';
  return faction.color;
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function WorldMap({ mapState, onSelectRegion }: WorldMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState(false);

  const handleClick = useCallback(
    (countryId: string) => {
      const regionId = countryToRegionId[countryId];
      if (regionId !== undefined) {
        onSelectRegion(regionId, countryId);
      }
    },
    [onSelectRegion],
  );

  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;

    const container = containerRef.current;
    const svg = d3.select(svgRef.current);
    const tooltip = d3.select(tooltipRef.current);

    const width = container.clientWidth;
    const height = container.clientHeight;

    svg.attr('viewBox', `0 0 ${width} ${height}`);

    const projection = d3.geoNaturalEarth1()
      .fitSize([width, height], { type: 'Sphere' } as d3.GeoPermissibleObjects);

    const path = d3.geoPath().projection(projection);

    // Zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([1, 8])
      .on('zoom', (event) => {
        g.attr('transform', event.transform.toString());
      });

    svg.call(zoom);

    const g = svg.select<SVGGElement>('g.map-group').empty()
      ? svg.append('g').attr('class', 'map-group')
      : svg.select<SVGGElement>('g.map-group');

    // Fetch and render TopoJSON
    d3.json<Topology>('/data/countries-50m.json').then((topo) => {
      if (!topo) return;

      const countriesGeo = topojson.feature(
        topo,
        topo.objects.countries as GeometryCollection,
      );

      const features = (countriesGeo as GeoJSON.FeatureCollection).features as unknown as CountryFeature[];

      // Borders
      const borders = topojson.mesh(
        topo,
        topo.objects.countries as GeometryCollection,
        (a, b) => a !== b,
      );

      // Draw countries
      g.selectAll('path.country')
        .data(features, (d: unknown) => (d as CountryFeature).id)
        .join(
          (enter) =>
            enter
              .append('path')
              .attr('class', 'country')
              .attr('d', (d) => path(d as unknown as d3.GeoPermissibleObjects) ?? '')
              .attr('fill', (d) => getColorForCountry(d.id, mapState))
              .attr('stroke', '#0d0d1a')
              .attr('stroke-width', 0.5)
              .style('cursor', 'pointer')
              .style('transition', 'fill 0.6s ease')
              .on('click', (_event, d) => {
                handleClick(d.id);
              })
              .on('mouseover', (event, d) => {
                const factionId = mapState[d.id];
                const faction = factionId !== undefined && factionId !== NO_FACTION ? getFactionById(factionId) : null;
                const name = getCountryName(d.id);

                d3.select(event.currentTarget as Element)
                  .attr('stroke', '#fbbf24')
                  .attr('stroke-width', 1.5)
                  .raise();

                tooltip
                  .style('opacity', '1')
                  .html(
                    `<div class="font-semibold">${name}</div>` +
                    `<div class="text-xs text-gray-400">${faction ? `Owned by ${faction.name}` : 'Neutral'}</div>`,
                  );
              })
              .on('mousemove', (event) => {
                const [x, y] = d3.pointer(event, container);
                tooltip
                  .style('left', `${x + 12}px`)
                  .style('top', `${y - 10}px`);
              })
              .on('mouseout', (event) => {
                d3.select(event.currentTarget as Element)
                  .attr('stroke', '#0d0d1a')
                  .attr('stroke-width', 0.5);
                tooltip.style('opacity', '0');
              })
              .on('touchstart', (event, d) => {
                event.preventDefault();
                const factionId = mapState[d.id];
                const faction = factionId !== undefined && factionId !== NO_FACTION ? getFactionById(factionId) : null;
                const name = getCountryName(d.id);

                d3.select(event.currentTarget as Element)
                  .attr('stroke', '#fbbf24')
                  .attr('stroke-width', 1.5)
                  .raise();

                tooltip
                  .style('opacity', '1')
                  .html(
                    `<div class="font-semibold">${name}</div>` +
                    `<div class="text-xs text-gray-400">${faction ? `Owned by ${faction.name}` : 'Neutral'}</div>`,
                  );

                const touch = event.touches[0];
                if (touch) {
                  const rect = container.getBoundingClientRect();
                  tooltip
                    .style('left', `${touch.clientX - rect.left + 12}px`)
                    .style('top', `${touch.clientY - rect.top - 10}px`);
                }
              }, { passive: false } as never)
              .on('touchend', (event, d) => {
                event.preventDefault();
                d3.select(event.currentTarget as Element)
                  .attr('stroke', '#0d0d1a')
                  .attr('stroke-width', 0.5);
                tooltip.style('opacity', '0');
                handleClick(d.id);
              }, { passive: false } as never),
          (update) =>
            update
              .transition()
              .duration(600)
              .attr('fill', (d) => getColorForCountry(d.id, mapState)),
        );

      // Borders
      g.selectAll('path.border').remove();
      g.append('path')
        .datum(borders)
        .attr('class', 'border')
        .attr('d', path)
        .attr('fill', 'none')
        .attr('stroke', '#0d0d1a')
        .attr('stroke-width', 0.3)
        .style('pointer-events', 'none');

      // Sphere outline
      g.selectAll('path.sphere').remove();
      g.insert('path', ':first-child')
        .datum({ type: 'Sphere' } as d3.GeoPermissibleObjects)
        .attr('class', 'sphere')
        .attr('d', path)
        .attr('fill', '#0a0a1a')
        .attr('stroke', '#1e293b')
        .attr('stroke-width', 0.5);

      // Graticule
      g.selectAll('path.graticule').remove();
      const graticule = d3.geoGraticule10();
      g.insert('path', 'path.country')
        .datum(graticule)
        .attr('class', 'graticule')
        .attr('d', path)
        .attr('fill', 'none')
        .attr('stroke', '#1e293b')
        .attr('stroke-width', 0.2)
        .style('pointer-events', 'none');

      setLoaded(true);
    });

    // Resize
    const resizeObserver = new ResizeObserver(() => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      svg.attr('viewBox', `0 0 ${w} ${h}`);
      projection.fitSize([w, h], { type: 'Sphere' } as d3.GeoPermissibleObjects);
      g.selectAll<SVGPathElement, CountryFeature>('path.country')
        .attr('d', (d) => path(d as unknown as d3.GeoPermissibleObjects) ?? '');
      g.selectAll('path.border').attr('d', path as never);
      g.selectAll('path.sphere').attr('d', path as never);
      g.selectAll('path.graticule').attr('d', path as never);
    });

    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, [mapState, handleClick]);

  return (
    <div ref={containerRef} className="relative w-full h-full bg-[#0a0a1a] overflow-hidden">
      <svg
        ref={svgRef}
        className="w-full h-full"
        style={{ display: 'block' }}
      />
      {/* Tooltip */}
      <div
        ref={tooltipRef}
        className="absolute z-50 pointer-events-none px-3 py-2 rounded-lg bg-gray-800/95 border border-gray-600/50 shadow-xl text-sm text-white backdrop-blur-sm"
        style={{ opacity: 0, transition: 'opacity 0.15s' }}
      />
      {/* Loading overlay */}
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#0a0a1a]">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-gray-400">Loading world map...</span>
          </div>
        </div>
      )}
    </div>
  );
}
