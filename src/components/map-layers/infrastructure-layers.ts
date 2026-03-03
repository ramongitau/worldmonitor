/**
 * Infrastructure layer factories — cables, pipelines, ports, datacenters,
 * spaceports, irradiators, cable advisories, and repair ships.
 */
import { ScatterplotLayer, PathLayer, IconLayer, TextLayer } from '@deck.gl/layers';
import type { Layer } from '@deck.gl/core';
import {
  UNDERSEA_CABLES,
  PIPELINES,
  PIPELINE_COLORS,
  AI_DATA_CENTERS,
  PORTS,
  SPACEPORTS,
  GAMMA_IRRADIATORS,
} from '@/config';
import type { CableAdvisory, MapDatacenterCluster, RepairShip } from '@/types';
import type { AirportDelayAlert } from '@/services/aviation';
import {
  COLORS,
  MARKER_ICONS,
  DATACENTER_ICON_MAPPING,
  hexToRgba,
  createEmptyGhost,
} from './shared';
import type { LayerContext } from './types';

/* ── Undersea Cables ── */

export function createCablesLayer(ctx: LayerContext): PathLayer {
  const highlightedCables = ctx.highlightedAssets.cable;
  const cacheKey = 'cables-layer';
  const cached = ctx.layerCache.get(cacheKey) as PathLayer | undefined;
  const highlightSignature = ctx.getSetSignature(highlightedCables);
  const healthSignature = Object.keys(ctx.healthByCableId).sort().join(',');
  if (cached && highlightSignature === ctx.lastCableHighlightSignature && healthSignature === ctx.lastCableHealthSignature) return cached;

  const health = ctx.healthByCableId;
  const layer = new PathLayer({
    id: cacheKey,
    data: ctx.filterByTime(UNDERSEA_CABLES, () => null),
    getPath: (d: any) => d.points,
    getColor: (d: any) => {
      if (highlightedCables.has(d.id)) return COLORS.cableHighlight;
      const h = health[d.id];
      if (h?.status === 'fault') return COLORS.cableFault;
      if (h?.status === 'degraded') return COLORS.cableDegraded;
      return COLORS.cable;
    },
    getWidth: (d: any) => {
      if (highlightedCables.has(d.id)) return 3;
      const h = health[d.id];
      if (h?.status === 'fault') return 2.5;
      if (h?.status === 'degraded') return 2;
      return 1;
    },
    widthMinPixels: 1,
    widthMaxPixels: 5,
    pickable: true,
    updateTriggers: { highlighted: highlightSignature, health: healthSignature },
  });

  ctx.lastCableHighlightSignature = highlightSignature;
  ctx.lastCableHealthSignature = healthSignature;
  ctx.layerCache.set(cacheKey, layer);
  return layer;
}

/* ── Pipelines ── */

export function createPipelinesLayer(ctx: LayerContext): PathLayer {
  const highlightedPipelines = ctx.highlightedAssets.pipeline;
  const cacheKey = 'pipelines-layer';
  const cached = ctx.layerCache.get(cacheKey) as PathLayer | undefined;
  const highlightSignature = ctx.getSetSignature(highlightedPipelines);
  if (cached && highlightSignature === ctx.lastPipelineHighlightSignature) return cached;

  const layer = new PathLayer({
    id: cacheKey,
    data: PIPELINES,
    getPath: (d: any) => d.points,
    getColor: (d: any) => {
      if (highlightedPipelines.has(d.id)) {
        return [255, 100, 100, 200] as [number, number, number, number];
      }
      const colorKey = d.type as keyof typeof PIPELINE_COLORS;
      const hex = PIPELINE_COLORS[colorKey] || '#666666';
      return hexToRgba(hex, 150);
    },
    getWidth: (d: any) => highlightedPipelines.has(d.id) ? 3 : 1.5,
    widthMinPixels: 1,
    widthMaxPixels: 4,
    pickable: true,
    updateTriggers: { highlighted: highlightSignature },
  });

  ctx.lastPipelineHighlightSignature = highlightSignature;
  ctx.layerCache.set(cacheKey, layer);
  return layer;
}

/* ── Ports ── */

export function createPortsLayer(): ScatterplotLayer {
  return new ScatterplotLayer({
    id: 'ports-layer',
    data: PORTS,
    getPosition: (d: any) => [d.lon, d.lat],
    getRadius: 6000,
    getFillColor: (d: any) => {
      switch (d.type) {
        case 'naval': return [100, 150, 255, 200] as [number, number, number, number];
        case 'oil': return [255, 140, 0, 200] as [number, number, number, number];
        case 'lng': return [255, 200, 50, 200] as [number, number, number, number];
        case 'container': return [0, 200, 255, 180] as [number, number, number, number];
        case 'mixed': return [150, 200, 150, 180] as [number, number, number, number];
        case 'bulk': return [180, 150, 120, 180] as [number, number, number, number];
        default: return [0, 200, 255, 160] as [number, number, number, number];
      }
    },
    radiusMinPixels: 4,
    radiusMaxPixels: 10,
    pickable: true,
  });
}

/* ── Datacenters (icon layer at zoom >= 5) ── */

export function createDatacentersLayer(ctx: LayerContext): IconLayer {
  const highlightedDCs = ctx.highlightedAssets.datacenter;
  const data = AI_DATA_CENTERS.filter(dc => dc.status !== 'decommissioned');

  return new IconLayer({
    id: 'datacenters-layer',
    data,
    getPosition: (d: any) => [d.lon, d.lat],
    getIcon: () => 'square',
    iconAtlas: MARKER_ICONS.square,
    iconMapping: DATACENTER_ICON_MAPPING,
    getSize: (d: any) => highlightedDCs.has(d.id) ? 15 : 11,
    getColor: (d: any) => {
      if (highlightedDCs.has(d.id)) {
        return [255, 100, 100, 220] as [number, number, number, number];
      }
      if (d.status === 'planned') return [0, 200, 255, 180] as [number, number, number, number];
      return COLORS.datacenter;
    },
    sizeScale: 1,
    sizeMinPixels: 6,
    sizeMaxPixels: 15,
    pickable: true,
  });
}

/* ── Datacenter clusters (at zoom < 5) ── */

export function createDatacenterClusterLayers(ctx: LayerContext): Layer[] {
  ctx.updateClusterData();
  const layers: Layer[] = [];

  layers.push(new ScatterplotLayer<MapDatacenterCluster>({
    id: 'datacenter-clusters-layer',
    data: ctx.datacenterClusters,
    getPosition: (d: MapDatacenterCluster) => [d.lon, d.lat],
    getRadius: (d: MapDatacenterCluster) => 15000 + d.count * 2000,
    radiusMinPixels: 6,
    radiusMaxPixels: 20,
    getFillColor: (d: MapDatacenterCluster) => {
      if (d.majorityExisting) return [160, 80, 255, 180] as [number, number, number, number];
      return [80, 160, 255, 180] as [number, number, number, number];
    },
    pickable: true,
    updateTriggers: { getRadius: ctx.state.zoom },
  }));

  const multiClusters = ctx.datacenterClusters.filter(c => c.count > 1);
  if (multiClusters.length > 0) {
    layers.push(new TextLayer<MapDatacenterCluster>({
      id: 'datacenter-clusters-badge',
      data: multiClusters,
      getText: (d: MapDatacenterCluster) => String(d.count),
      getPosition: (d: MapDatacenterCluster) => [d.lon, d.lat],
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

  layers.push(createEmptyGhost('datacenter-clusters-layer'));
  return layers;
}

/* ── Irradiators ── */

export function createIrradiatorsLayer(): ScatterplotLayer {
  return new ScatterplotLayer({
    id: 'irradiators-layer',
    data: GAMMA_IRRADIATORS,
    getPosition: (d: any) => [d.lon, d.lat],
    getRadius: 6000,
    getFillColor: [255, 100, 255, 180] as [number, number, number, number],
    radiusMinPixels: 4,
    radiusMaxPixels: 10,
    pickable: true,
  });
}

/* ── Spaceports ── */

export function createSpaceportsLayer(): ScatterplotLayer {
  return new ScatterplotLayer({
    id: 'spaceports-layer',
    data: SPACEPORTS,
    getPosition: (d: any) => [d.lon, d.lat],
    getRadius: 10000,
    getFillColor: [200, 100, 255, 200] as [number, number, number, number],
    radiusMinPixels: 5,
    radiusMaxPixels: 12,
    pickable: true,
  });
}

/* ── Cable Advisories ── */

export function createCableAdvisoriesLayer(advisories: CableAdvisory[]): ScatterplotLayer {
  return new ScatterplotLayer({
    id: 'cable-advisories-layer',
    data: advisories,
    getPosition: (d: CableAdvisory) => [d.lon, d.lat],
    getRadius: 15000,
    radiusMinPixels: 5,
    radiusMaxPixels: 12,
    getFillColor: (d: CableAdvisory) => {
      switch (d.severity) {
        case 'critical' as any: return [255, 50, 50, 200] as [number, number, number, number];
        case 'major' as any: return [255, 165, 0, 200] as [number, number, number, number];
        default: return [255, 200, 50, 180] as [number, number, number, number];
      }
    },
    pickable: true,
  });
}

/* ── Repair Ships ── */

export function createRepairShipsLayer(ctx: LayerContext): ScatterplotLayer {
  return new ScatterplotLayer({
    id: 'repair-ships-layer',
    data: ctx.repairShips,
    getPosition: (d: RepairShip) => [d.lon, d.lat],
    getRadius: 10000,
    getFillColor: [100, 200, 255, 200] as [number, number, number, number],
    radiusMinPixels: 4,
    radiusMaxPixels: 10,
    pickable: true,
  });
}

/* ── Flight Delays ── */

export function createFlightDelaysLayer(delays: AirportDelayAlert[]): ScatterplotLayer {
  return new ScatterplotLayer({
    id: 'flight-delays-layer',
    data: delays,
    getPosition: (d: AirportDelayAlert) => [d.lon, d.lat],
    getRadius: (d: AirportDelayAlert) => {
      const severity = (d as any).delayIndex ?? 1;
      if (severity >= 4) return 25000;
      if (severity >= 3) return 20000;
      if (severity >= 2) return 15000;
      return 10000;
    },
    getFillColor: (d: AirportDelayAlert) => {
      const severity = (d as any).delayIndex ?? 1;
      if (severity >= 4) return [255, 50, 50, 200] as [number, number, number, number];
      if (severity >= 3) return [255, 165, 0, 200] as [number, number, number, number];
      return [255, 220, 50, 180] as [number, number, number, number];
    },
    radiusMinPixels: 4,
    radiusMaxPixels: 14,
    pickable: true,
  });
}
