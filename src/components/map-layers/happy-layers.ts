/**
 * Happy variant layer factories — positive events, kindness, happiness
 * choropleth, species recovery, and renewable installations.
 */
import { GeoJsonLayer, ScatterplotLayer } from '@deck.gl/layers';
import type { Layer } from '@deck.gl/core';
import type { PositiveGeoEvent } from '@/services/positive-events-geo';
import type { KindnessPoint } from '@/services/kindness-data';
import type { RenewableInstallation } from '@/services/renewable-installations';
import type { LayerContext } from './types';

/* ── Category Color Helper ── */

function getCategoryColor(category: string): [number, number, number, number] {
  switch (category) {
    case 'nature-wildlife':
    case 'humanity-kindness':
      return [34, 197, 94, 200]; // green
    case 'science-health':
    case 'innovation-tech':
    case 'climate-wins':
      return [234, 179, 8, 200]; // gold
    case 'culture-community':
      return [139, 92, 246, 200]; // purple
    default:
      return [34, 197, 94, 200]; // green default
  }
}

/* ── Positive Events ── */

export function createPositiveEventsLayers(ctx: LayerContext): Layer[] {
  const layers: Layer[] = [];

  layers.push(new ScatterplotLayer({
    id: 'positive-events-layer',
    data: ctx.positiveEvents,
    getPosition: (d: PositiveGeoEvent) => [d.lon, d.lat],
    getRadius: 12000,
    getFillColor: (d: PositiveGeoEvent) => getCategoryColor(d.category),
    radiusMinPixels: 5,
    radiusMaxPixels: 10,
    pickable: true,
  }));

  const significantEvents = ctx.positiveEvents.filter(e => e.count > 8);
  if (significantEvents.length > 0) {
    const pulse = 1.0 + 0.4 * (0.5 + 0.5 * Math.sin((ctx.pulseTime || Date.now()) / 800));
    layers.push(new ScatterplotLayer({
      id: 'positive-events-pulse',
      data: significantEvents,
      getPosition: (d: PositiveGeoEvent) => [d.lon, d.lat],
      getRadius: 15000,
      radiusScale: pulse,
      radiusMinPixels: 8,
      radiusMaxPixels: 24,
      stroked: true,
      filled: false,
      getLineColor: (d: PositiveGeoEvent) => getCategoryColor(d.category),
      lineWidthMinPixels: 1.5,
      pickable: false,
      updateTriggers: { radiusScale: ctx.pulseTime },
    }));
  }

  return layers;
}

/* ── Kindness Points ── */

export function createKindnessLayers(ctx: LayerContext): Layer[] {
  const layers: Layer[] = [];
  if (ctx.kindnessPoints.length === 0) return layers;

  layers.push(new ScatterplotLayer<KindnessPoint>({
    id: 'kindness-layer',
    data: ctx.kindnessPoints,
    getPosition: (d: KindnessPoint) => [d.lon, d.lat],
    getRadius: 12000,
    getFillColor: [74, 222, 128, 200] as [number, number, number, number],
    radiusMinPixels: 5,
    radiusMaxPixels: 10,
    pickable: true,
  }));

  const pulse = 1.0 + 0.4 * (0.5 + 0.5 * Math.sin((ctx.pulseTime || Date.now()) / 800));
  layers.push(new ScatterplotLayer<KindnessPoint>({
    id: 'kindness-pulse',
    data: ctx.kindnessPoints,
    getPosition: (d: KindnessPoint) => [d.lon, d.lat],
    getRadius: 14000,
    radiusScale: pulse,
    radiusMinPixels: 6,
    radiusMaxPixels: 18,
    stroked: true,
    filled: false,
    getLineColor: [74, 222, 128, 80] as [number, number, number, number],
    lineWidthMinPixels: 1,
    pickable: false,
    updateTriggers: { radiusScale: ctx.pulseTime },
  }));

  return layers;
}

/* ── Happiness Choropleth ── */

export function createHappinessChoroplethLayer(ctx: LayerContext): GeoJsonLayer | null {
  if (!ctx.countriesGeoJsonData || ctx.happinessScores.size === 0) return null;
  const scores = ctx.happinessScores;
  return new GeoJsonLayer({
    id: 'happiness-choropleth-layer',
    data: ctx.countriesGeoJsonData,
    filled: true,
    stroked: true,
    getFillColor: (feature: { properties?: Record<string, unknown> }) => {
      const code = feature.properties?.['ISO3166-1-Alpha-2'] as string | undefined;
      const score = code ? scores.get(code) : undefined;
      if (score == null) return [0, 0, 0, 0] as [number, number, number, number];
      const t = score / 10;
      return [
        Math.round(40 + (1 - t) * 180),
        Math.round(180 + t * 60),
        Math.round(40 + (1 - t) * 100),
        140,
      ] as [number, number, number, number];
    },
    getLineColor: [100, 100, 100, 60] as [number, number, number, number],
    getLineWidth: 1,
    lineWidthMinPixels: 0.5,
    pickable: true,
    updateTriggers: { getFillColor: [scores.size] },
  });
}

/* ── Species Recovery ── */

export function createSpeciesRecoveryLayer(ctx: LayerContext): ScatterplotLayer {
  return new ScatterplotLayer({
    id: 'species-recovery-layer',
    data: ctx.speciesRecoveryZones,
    getPosition: (d: (typeof ctx.speciesRecoveryZones)[number]) => [d.recoveryZone.lon, d.recoveryZone.lat],
    getRadius: 50000,
    radiusMinPixels: 8,
    radiusMaxPixels: 25,
    getFillColor: [74, 222, 128, 120] as [number, number, number, number],
    stroked: true,
    getLineColor: [74, 222, 128, 200] as [number, number, number, number],
    lineWidthMinPixels: 1.5,
    pickable: true,
  });
}

/* ── Renewable Installations ── */

export function createRenewableInstallationsLayer(ctx: LayerContext): ScatterplotLayer {
  const typeColors: Record<string, [number, number, number, number]> = {
    solar: [255, 200, 50, 200],
    wind: [100, 200, 255, 200],
    hydro: [0, 180, 180, 200],
    geothermal: [255, 150, 80, 200],
  };
  const typeLineColors: Record<string, [number, number, number, number]> = {
    solar: [255, 200, 50, 255],
    wind: [100, 200, 255, 255],
    hydro: [0, 180, 180, 255],
    geothermal: [255, 150, 80, 255],
  };
  return new ScatterplotLayer({
    id: 'renewable-installations-layer',
    data: ctx.renewableInstallations,
    getPosition: (d: RenewableInstallation) => [d.lon, d.lat],
    getRadius: 30000,
    radiusMinPixels: 5,
    radiusMaxPixels: 18,
    getFillColor: (d: RenewableInstallation) => typeColors[d.type] ?? [200, 200, 200, 200] as [number, number, number, number],
    stroked: true,
    getLineColor: (d: RenewableInstallation) => typeLineColors[d.type] ?? [200, 200, 200, 255] as [number, number, number, number],
    lineWidthMinPixels: 1,
    pickable: true,
  });
}
