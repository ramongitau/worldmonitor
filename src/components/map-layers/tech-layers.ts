/**
 * Tech variant layer factories — TechHQ clusters, tech event clusters,
 * startup hubs, accelerators, and cloud regions.
 */
import { ScatterplotLayer, TextLayer } from '@deck.gl/layers';
import type { Layer } from '@deck.gl/core';
import {
  STARTUP_HUBS,
  ACCELERATORS,
  CLOUD_REGIONS,
} from '@/config';
import type { MapTechHQCluster, MapTechEventCluster } from '@/types';
import { COLORS, createEmptyGhost } from './shared';
import type { LayerContext } from './types';

/* ── Startup Hubs ── */

export function createStartupHubsLayer(): ScatterplotLayer {
  return new ScatterplotLayer({
    id: 'startup-hubs-layer',
    data: STARTUP_HUBS,
    getPosition: (d) => [d.lon, d.lat],
    getRadius: 10000,
    getFillColor: COLORS.startupHub,
    radiusMinPixels: 5,
    radiusMaxPixels: 12,
    pickable: true,
  });
}

/* ── Accelerators ── */

export function createAcceleratorsLayer(): ScatterplotLayer {
  return new ScatterplotLayer({
    id: 'accelerators-layer',
    data: ACCELERATORS,
    getPosition: (d) => [d.lon, d.lat],
    getRadius: 6000,
    getFillColor: COLORS.accelerator,
    radiusMinPixels: 3,
    radiusMaxPixels: 8,
    pickable: true,
  });
}

/* ── Cloud Regions ── */

export function createCloudRegionsLayer(): ScatterplotLayer {
  return new ScatterplotLayer({
    id: 'cloud-regions-layer',
    data: CLOUD_REGIONS,
    getPosition: (d) => [d.lon, d.lat],
    getRadius: 12000,
    getFillColor: COLORS.cloudRegion,
    radiusMinPixels: 4,
    radiusMaxPixels: 12,
    pickable: true,
  });
}

/* ── Tech HQ Clusters ── */

export function createTechHQClusterLayers(ctx: LayerContext): Layer[] {
  ctx.updateClusterData();
  const layers: Layer[] = [];
  const zoom = ctx.maplibreMap?.getZoom() || 2;

  layers.push(new ScatterplotLayer<MapTechHQCluster>({
    id: 'tech-hq-clusters-layer',
    data: ctx.techHQClusters,
    getPosition: d => [d.lon, d.lat],
    getRadius: d => 10000 + d.count * 1500,
    radiusMinPixels: 5,
    radiusMaxPixels: 18,
    getFillColor: d => {
      if (d.primaryType === 'faang') return [0, 220, 120, 200] as [number, number, number, number];
      if (d.primaryType === 'unicorn') return [255, 100, 200, 180] as [number, number, number, number];
      return [80, 160, 255, 180] as [number, number, number, number];
    },
    pickable: true,
    updateTriggers: { getRadius: ctx.state.zoom },
  }));

  const multiClusters = ctx.techHQClusters.filter(c => c.count > 1);
  if (multiClusters.length > 0) {
    layers.push(new TextLayer<MapTechHQCluster>({
      id: 'tech-hq-clusters-badge',
      data: multiClusters,
      getText: d => String(d.count),
      getPosition: d => [d.lon, d.lat],
      background: true,
      getBackgroundColor: [0, 0, 0, 180],
      backgroundPadding: [4, 2, 4, 2],
      getColor: [255, 255, 255, 255],
      getSize: 12,
      getPixelOffset: [0, -14],
      pickable: false,
      fontFamily: 'system-ui, sans-serif',
      fontWeight: 700,
    }));
  }

  if (zoom >= 3) {
    const singles = ctx.techHQClusters.filter(c => c.count === 1);
    if (singles.length > 0) {
      layers.push(new TextLayer<MapTechHQCluster>({
        id: 'tech-hq-clusters-label',
        data: singles,
        getText: d => d.items[0]?.company ?? '',
        getPosition: d => [d.lon, d.lat],
        getSize: 11,
        getColor: [220, 220, 220, 200],
        getPixelOffset: [0, 12],
        pickable: false,
        fontFamily: 'system-ui, sans-serif',
      }));
    }
  }

  layers.push(createEmptyGhost('tech-hq-clusters-layer'));
  return layers;
}

/* ── Tech Event Clusters ── */

export function createTechEventClusterLayers(ctx: LayerContext): Layer[] {
  ctx.updateClusterData();
  const layers: Layer[] = [];

  layers.push(new ScatterplotLayer<MapTechEventCluster>({
    id: 'tech-event-clusters-layer',
    data: ctx.techEventClusters,
    getPosition: d => [d.lon, d.lat],
    getRadius: d => 10000 + d.count * 1500,
    radiusMinPixels: 5,
    radiusMaxPixels: 18,
    getFillColor: d => {
      if (d.soonestDaysUntil <= 14) return [255, 220, 50, 200] as [number, number, number, number];
      return [80, 140, 255, 180] as [number, number, number, number];
    },
    pickable: true,
    updateTriggers: { getRadius: ctx.state.zoom },
  }));

  const multiClusters = ctx.techEventClusters.filter(c => c.count > 1);
  if (multiClusters.length > 0) {
    layers.push(new TextLayer<MapTechEventCluster>({
      id: 'tech-event-clusters-badge',
      data: multiClusters,
      getText: d => String(d.count),
      getPosition: d => [d.lon, d.lat],
      background: true,
      getBackgroundColor: [0, 0, 0, 180],
      backgroundPadding: [4, 2, 4, 2],
      getColor: [255, 255, 255, 255],
      getSize: 12,
      getPixelOffset: [0, -14],
      pickable: false,
      fontFamily: 'system-ui, sans-serif',
      fontWeight: 700,
    }));
  }

  layers.push(createEmptyGhost('tech-event-clusters-layer'));
  return layers;
}
