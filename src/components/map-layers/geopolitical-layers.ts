/**
 * Geopolitical layer factories — conflict zones, hotspots, protests,
 * UCDP events, Iran events, GPS jamming, AIS, displacement, cyber threats.
 */
import { GeoJsonLayer, ScatterplotLayer, TextLayer } from '@deck.gl/layers';
import { ArcLayer } from '@deck.gl/layers';
import type { Layer } from '@deck.gl/core';
import { getCurrentTheme } from '@/utils/index';
import type {
  MapProtestCluster,
  CyberThreat,
  UcdpGeoEvent,
} from '@/types';
import type { IranEvent } from '@/services/conflict';
import {
  COLORS,
  CONFLICT_ZONES_GEOJSON,
  createEmptyGhost,
} from './shared';
import type { LayerContext } from './types';

/* ── Conflict Zones ── */

export function createConflictZonesLayer(): GeoJsonLayer {
  return new GeoJsonLayer({
    id: 'conflict-zones-layer',
    data: CONFLICT_ZONES_GEOJSON,
    filled: true,
    stroked: true,
    getFillColor: () => COLORS.conflict,
    getLineColor: () => getCurrentTheme() === 'light'
      ? [255, 0, 0, 120] as [number, number, number, number]
      : [255, 0, 0, 180] as [number, number, number, number],
    getLineWidth: 2,
    lineWidthMinPixels: 1,
    pickable: true,
  });
}

/* ── Hotspots ── */

export function createHotspotsLayers(ctx: LayerContext): Layer[] {
  const zoom = ctx.maplibreMap?.getZoom() || 2;
  const zoomScale = Math.min(1, (zoom - 1) / 3);
  const maxPx = 6 + Math.round(14 * zoomScale);
  const baseOpacity = zoom < 2.5 ? 0.5 : zoom < 4 ? 0.7 : 1.0;
  const layers: Layer[] = [];

  layers.push(new ScatterplotLayer({
    id: 'hotspots-layer',
    data: ctx.hotspots,
    getPosition: (d) => [d.lon, d.lat],
    getRadius: (d) => {
      const score = d.escalationScore || 1;
      return 10000 + score * 5000;
    },
    getFillColor: (d) => {
      const score = d.escalationScore || 1;
      const a = Math.round((score >= 4 ? 200 : score >= 2 ? 200 : 180) * baseOpacity);
      if (score >= 4) return [255, 68, 68, a] as [number, number, number, number];
      if (score >= 2) return [255, 165, 0, a] as [number, number, number, number];
      return [255, 255, 0, a] as [number, number, number, number];
    },
    radiusMinPixels: 4,
    radiusMaxPixels: maxPx,
    pickable: true,
    stroked: true,
    getLineColor: (d) =>
      d.hasBreaking ? [255, 255, 255, 255] as [number, number, number, number] : [0, 0, 0, 0] as [number, number, number, number],
    lineWidthMinPixels: 2,
  }));

  const highHotspots = ctx.hotspots.filter(h => h.level === 'high' || h.hasBreaking);
  if (highHotspots.length > 0) {
    const pulse = 1.0 + 0.8 * (0.5 + 0.5 * Math.sin((ctx.pulseTime || Date.now()) / 400));
    layers.push(new ScatterplotLayer({
      id: 'hotspots-pulse',
      data: highHotspots,
      getPosition: (d) => [d.lon, d.lat],
      getRadius: (d) => {
        const score = d.escalationScore || 1;
        return 10000 + score * 5000;
      },
      radiusScale: pulse,
      radiusMinPixels: 6,
      radiusMaxPixels: 30,
      stroked: true,
      filled: false,
      getLineColor: (d) => {
        const a = Math.round(120 * baseOpacity);
        return d.hasBreaking ? [255, 50, 50, a] as [number, number, number, number] : [255, 165, 0, a] as [number, number, number, number];
      },
      lineWidthMinPixels: 1.5,
      pickable: false,
      updateTriggers: { radiusScale: ctx.pulseTime },
    }));
  }

  layers.push(createEmptyGhost('hotspots-layer'));
  return layers;
}

/* ── Protest Clusters ── */

export function createProtestClusterLayers(ctx: LayerContext): Layer[] {
  ctx.updateClusterData();
  const layers: Layer[] = [];

  layers.push(new ScatterplotLayer<MapProtestCluster>({
    id: 'protest-clusters-layer',
    data: ctx.protestClusters,
    getPosition: d => [d.lon, d.lat],
    getRadius: d => 15000 + d.count * 2000,
    radiusMinPixels: 6,
    radiusMaxPixels: 22,
    getFillColor: d => {
      if (d.hasRiot) return [220, 40, 40, 200] as [number, number, number, number];
      if (d.maxSeverity === 'high') return [255, 80, 60, 180] as [number, number, number, number];
      if (d.maxSeverity === 'medium') return [255, 160, 40, 160] as [number, number, number, number];
      return [255, 220, 80, 140] as [number, number, number, number];
    },
    pickable: true,
    updateTriggers: { getRadius: ctx.state.zoom, getFillColor: ctx.state.zoom },
  }));

  const multiClusters = ctx.protestClusters.filter(c => c.count > 1);
  if (multiClusters.length > 0) {
    layers.push(new TextLayer<MapProtestCluster>({
      id: 'protest-clusters-badge',
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

  const pulseClusters = ctx.protestClusters.filter(c => c.maxSeverity === 'high' || c.hasRiot);
  if (pulseClusters.length > 0) {
    const pulse = 1.0 + 0.8 * (0.5 + 0.5 * Math.sin((ctx.pulseTime || Date.now()) / 400));
    layers.push(new ScatterplotLayer<MapProtestCluster>({
      id: 'protest-clusters-pulse',
      data: pulseClusters,
      getPosition: d => [d.lon, d.lat],
      getRadius: d => 15000 + d.count * 2000,
      radiusScale: pulse,
      radiusMinPixels: 8,
      radiusMaxPixels: 30,
      stroked: true,
      filled: false,
      getLineColor: d => d.hasRiot ? [220, 40, 40, 120] as [number, number, number, number] : [255, 80, 60, 100] as [number, number, number, number],
      lineWidthMinPixels: 1.5,
      pickable: false,
      updateTriggers: { radiusScale: ctx.pulseTime },
    }));
  }

  layers.push(createEmptyGhost('protest-clusters-layer'));
  return layers;
}

/* ── Iran Events ── */

export function createIranEventsLayer(ctx: LayerContext): ScatterplotLayer {
  return new ScatterplotLayer({
    id: 'iran-events-layer',
    data: ctx.iranEvents,
    getPosition: (d: IranEvent) => [d.longitude, d.latitude],
    getRadius: (d: IranEvent) => 8000 + (Number(d.severity) || 1) * 3000,
    getFillColor: (d: IranEvent) => {
      const s = Number(d.severity);
      if (s >= 4) return [255, 0, 0, 180] as [number, number, number, number];
      if (s >= 2) return [255, 120, 0, 160] as [number, number, number, number];
      return [255, 165, 0, 180] as [number, number, number, number];
    },
    radiusMinPixels: 5,
    radiusMaxPixels: 14,
    pickable: true,
  });
}

/* ── UCDP Georeferenced Events ── */

export function createUcdpEventsLayer(events: UcdpGeoEvent[]): ScatterplotLayer {
  return new ScatterplotLayer({
    id: 'ucdp-events-layer',
    data: events,
    getPosition: (d) => [d.longitude, d.latitude],
    getRadius: (d) => 8000 + (d.best || 1) * 500,
    getFillColor: (d) => {
      if (d.type_of_violence === 1) return COLORS.ucdpStateBased;
      if (d.type_of_violence === 2) return COLORS.ucdpNonState;
      return COLORS.ucdpOneSided;
    },
    radiusMinPixels: 4,
    radiusMaxPixels: 14,
    pickable: true,
  });
}

/* ── Cyber Threats (IOC) ── */

export function createCyberThreatsLayer(ctx: LayerContext): ScatterplotLayer<CyberThreat> {
  return new ScatterplotLayer<CyberThreat>({
    id: 'cyber-threats-layer',
    data: ctx.cyberThreats,
    getPosition: (d) => [d.lon, d.lat],
    getRadius: (d) => {
      const severity = d.severity || 'medium';
      switch (severity) {
        case 'critical': return 20000;
        case 'high': return 15000;
        case 'medium': return 10000;
        default: return 8000;
      }
    },
    getFillColor: (d) => {
      const severity = d.severity || 'medium';
      switch (severity) {
        case 'critical': return [255, 50, 50, 220] as [number, number, number, number];
        case 'high': return [255, 100, 50, 200] as [number, number, number, number];
        case 'medium': return [255, 180, 50, 180] as [number, number, number, number];
        default: return [200, 200, 100, 160] as [number, number, number, number];
      }
    },
    radiusMinPixels: 4,
    radiusMaxPixels: 12,
    pickable: true,
  });
}

/* ── AIS Density ── */

export function createAisDensityLayer(ctx: LayerContext): ScatterplotLayer {
  return new ScatterplotLayer({
    id: 'ais-density-layer',
    data: ctx.aisDensity,
    getPosition: (d) => [d.lon, d.lat],
    getRadius: (d) => d.radius || 15000,
    getFillColor: (d) => {
      const density = d.density || 0;
      if (density >= 100) return [255, 50, 50, 180] as [number, number, number, number];
      if (density >= 50) return [255, 150, 50, 160] as [number, number, number, number];
      if (density >= 20) return [255, 220, 80, 140] as [number, number, number, number];
      return [100, 200, 255, 120] as [number, number, number, number];
    },
    radiusMinPixels: 4,
    radiusMaxPixels: 16,
    pickable: true,
  });
}

/* ── AIS Disruptions (spoofing/jamming) ── */

export function createAisDisruptionsLayer(ctx: LayerContext): ScatterplotLayer {
  return new ScatterplotLayer({
    id: 'ais-disruptions-layer',
    data: ctx.aisDisruptionEvents,
    getPosition: (d) => [d.lon, d.lat],
    getRadius: 15000,
    getFillColor: (d) => {
      switch (d.type) {
        case 'spoofing': return [255, 50, 50, 200] as [number, number, number, number];
        case 'jamming': return [255, 165, 0, 200] as [number, number, number, number];
        case 'anomaly': return [255, 220, 50, 180] as [number, number, number, number];
        default: return [200, 200, 200, 160] as [number, number, number, number];
      }
    },
    radiusMinPixels: 5,
    radiusMaxPixels: 12,
    pickable: true,
  });
}

/* ── GPS/GNSS Jamming ── */

export function createGpsJammingLayer(ctx: LayerContext): ScatterplotLayer {
  return new ScatterplotLayer({
    id: 'gps-jamming-layer',
    data: ctx.gpsJammingHexes,
    getPosition: (d) => [d.lon, d.lat],
    getRadius: (d) => d.radius || 30000,
    getFillColor: (d) => {
      const level = d.level || 0;
      if (level >= 3) return [255, 50, 50, 180] as [number, number, number, number];
      return [255, 165, 0, 140] as [number, number, number, number];
    },
    radiusMinPixels: 4,
    radiusMaxPixels: 15,
    pickable: true,
  });
}

/* ── Internet Outages ── */

export function createOutagesLayer(outages: import('@/types').InternetOutage[]): ScatterplotLayer {
  return new ScatterplotLayer({
    id: 'outages-layer',
    data: outages,
    getPosition: (d) => [d.lon, d.lat],
    getRadius: 15000,
    getFillColor: COLORS.outage,
    radiusMinPixels: 4,
    radiusMaxPixels: 10,
    pickable: true,
  });
}

/* ── Displacement Flows (arcs) ── */

export function createDisplacementArcsLayer(ctx: LayerContext): ArcLayer {
  return new ArcLayer({
    id: 'displacement-arcs-layer',
    data: ctx.displacementFlows,
    getSourcePosition: (d) => [d.originLon, d.originLat],
    getTargetPosition: (d) => [d.destLon, d.destLat],
    getSourceColor: [255, 100, 50, 180] as [number, number, number, number],
    getTargetColor: [100, 200, 255, 180] as [number, number, number, number],
    getWidth: (d) => Math.max(1, Math.log10(d.count || 1) * 2),
    widthMinPixels: 1,
    widthMaxPixels: 6,
    pickable: true,
  });
}
