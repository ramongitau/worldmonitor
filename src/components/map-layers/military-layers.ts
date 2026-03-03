/**
 * Military layer factories — bases, nuclear, flights, vessels, clusters,
 * APT groups, and waterways.
 */
import { ScatterplotLayer, IconLayer, TextLayer } from '@deck.gl/layers';
import type { Layer } from '@deck.gl/core';
import {
  MILITARY_BASES,
  NUCLEAR_FACILITIES,
  STRATEGIC_WATERWAYS,
  APT_GROUPS,
} from '@/config';
import type {
  MilitaryBaseEnriched,
  MilitaryFlight,
  MilitaryFlightCluster,
  MilitaryVessel,
  MilitaryVesselCluster,
} from '@/types';
import type { MilitaryBaseCluster as ServerBaseCluster } from '@/services/military-bases';
import {
  COLORS,
  MARKER_ICONS,
  BASES_ICON_MAPPING,
  NUCLEAR_ICON_MAPPING,
} from './shared';
import type { LayerContext } from './types';

/* ── Base Color Helper ── */

export function getBaseColor(type: string, a: number): [number, number, number, number] {
  switch (type) {
    case 'us-nato': return [68, 136, 255, a];
    case 'russia': return [255, 68, 68, a];
    case 'china': return [255, 136, 68, a];
    case 'uk': return [68, 170, 255, a];
    case 'france': return [0, 85, 164, a];
    case 'india': return [255, 153, 51, a];
    case 'japan': return [188, 0, 45, a];
    default: return [136, 136, 136, a];
  }
}

/* ── Military Bases (icon layer) ── */

export function createBasesLayer(ctx: LayerContext): IconLayer {
  const highlightedBases = ctx.highlightedAssets.base;
  const zoom = ctx.maplibreMap?.getZoom() || 3;
  const alphaScale = Math.min(1, (zoom - 2.5) / 2.5);
  const a = Math.round(160 * Math.max(0.3, alphaScale));
  const data = ctx.serverBasesLoaded ? ctx.serverBases : MILITARY_BASES as MilitaryBaseEnriched[];

  return new IconLayer({
    id: 'bases-layer',
    data,
    getPosition: (d) => [d.lon, d.lat],
    getIcon: () => 'triangleUp',
    iconAtlas: MARKER_ICONS.triangleUp,
    iconMapping: BASES_ICON_MAPPING,
    getSize: (d) => highlightedBases.has(d.id) ? 16 : 11,
    getColor: (d) => {
      if (highlightedBases.has(d.id)) {
        return [255, 100, 100, 220] as [number, number, number, number];
      }
      return getBaseColor(d.type, a);
    },
    sizeScale: 1,
    sizeMinPixels: 6,
    sizeMaxPixels: 16,
    pickable: true,
  });
}

/* ── Base Clusters ── */

export function createBasesClusterLayer(ctx: LayerContext): Layer[] {
  if (!ctx.serverBaseClusters || ctx.serverBaseClusters.length === 0) return [];
  const zoom = ctx.maplibreMap?.getZoom() || 3;
  const alphaScale = Math.min(1, (zoom - 2.5) / 2.5);
  const a = Math.round(180 * Math.max(0.3, alphaScale));

  const scatterLayer = new ScatterplotLayer<ServerBaseCluster>({
    id: 'bases-cluster-layer',
    data: ctx.serverBaseClusters,
    getPosition: (d) => [d.longitude, d.latitude],
    getRadius: (d) => Math.max(8000, Math.log2(d.count) * 6000),
    getFillColor: (d) => getBaseColor(d.dominantType, a),
    radiusMinPixels: 10,
    radiusMaxPixels: 40,
    pickable: true,
  });

  const textLayer = new TextLayer<ServerBaseCluster>({
    id: 'bases-cluster-text',
    data: ctx.serverBaseClusters,
    getPosition: (d) => [d.longitude, d.latitude],
    getText: (d) => String(d.count),
    getSize: 12,
    getColor: [255, 255, 255, 220],
    fontWeight: 'bold',
    getTextAnchor: 'middle',
    getAlignmentBaseline: 'center',
  });

  return [scatterLayer, textLayer];
}

/* ── Nuclear Facilities ── */

export function createNuclearLayer(ctx: LayerContext): IconLayer {
  const highlightedNuclear = ctx.highlightedAssets.nuclear;
  const data = NUCLEAR_FACILITIES.filter(f => f.status !== 'decommissioned');

  return new IconLayer({
    id: 'nuclear-layer',
    data,
    getPosition: (d) => [d.lon, d.lat],
    getIcon: () => 'hexagon',
    iconAtlas: MARKER_ICONS.hexagon,
    iconMapping: NUCLEAR_ICON_MAPPING,
    getSize: (d) => highlightedNuclear.has(d.id) ? 15 : 11,
    getColor: (d) => {
      if (highlightedNuclear.has(d.id)) {
        return [255, 100, 100, 220] as [number, number, number, number];
      }
      if (d.status === 'contested') {
        return [255, 50, 50, 200] as [number, number, number, number];
      }
      return [255, 220, 0, 200] as [number, number, number, number];
    },
    sizeScale: 1,
    sizeMinPixels: 6,
    sizeMaxPixels: 15,
    pickable: true,
  });
}

/* ── Military Flights ── */

export function createMilitaryFlightsLayer(flights: MilitaryFlight[]): ScatterplotLayer {
  return new ScatterplotLayer({
    id: 'military-flights-layer',
    data: flights,
    getPosition: (d) => [d.lon, d.lat],
    getRadius: 8000,
    getFillColor: COLORS.flightMilitary,
    radiusMinPixels: 4,
    radiusMaxPixels: 12,
    pickable: true,
  });
}

/* ── Military Flight Clusters ── */

export function createMilitaryFlightClustersLayer(clusters: MilitaryFlightCluster[]): ScatterplotLayer {
  return new ScatterplotLayer({
    id: 'military-flight-clusters-layer',
    data: clusters,
    getPosition: (d) => [d.lon, d.lat],
    getRadius: (d) => 15000 + (d.flightCount || 1) * 3000,
    getFillColor: (d) => {
      const activity = d.activityType || 'unknown';
      if (activity === 'exercise' || activity === 'patrol') return [100, 150, 255, 200] as [number, number, number, number];
      if (activity === 'transport') return [255, 200, 100, 180] as [number, number, number, number];
      return [150, 150, 200, 160] as [number, number, number, number];
    },
    radiusMinPixels: 8,
    radiusMaxPixels: 25,
    pickable: true,
  });
}

/* ── Military Vessels ── */

export function createMilitaryVesselsLayer(vessels: MilitaryVessel[]): ScatterplotLayer {
  return new ScatterplotLayer({
    id: 'military-vessels-layer',
    data: vessels,
    getPosition: (d) => [d.lon, d.lat],
    getRadius: 6000,
    getFillColor: (d) => {
      if (d.usniSource) return [255, 160, 60, 160] as [number, number, number, number];
      return COLORS.vesselMilitary;
    },
    radiusMinPixels: 4,
    radiusMaxPixels: 10,
    pickable: true,
    stroked: true,
    getLineColor: (d) => {
      if (d.usniSource) return [255, 180, 80, 200] as [number, number, number, number];
      return [0, 0, 0, 0] as [number, number, number, number];
    },
    lineWidthMinPixels: 2,
  });
}

/* ── Military Vessel Clusters ── */

export function createMilitaryVesselClustersLayer(clusters: MilitaryVesselCluster[]): ScatterplotLayer {
  return new ScatterplotLayer({
    id: 'military-vessel-clusters-layer',
    data: clusters,
    getPosition: (d) => [d.lon, d.lat],
    getRadius: (d) => 15000 + (d.vesselCount || 1) * 3000,
    getFillColor: (d) => {
      const activity = d.activityType || 'unknown';
      if (activity === 'exercise' || activity === 'deployment') return [255, 100, 100, 200] as [number, number, number, number];
      if (activity === 'transit') return [255, 180, 100, 180] as [number, number, number, number];
      return [200, 150, 150, 160] as [number, number, number, number];
    },
    radiusMinPixels: 8,
    radiusMaxPixels: 25,
    pickable: true,
  });
}

/* ── Waterways ── */

export function createWaterwaysLayer(): ScatterplotLayer {
  return new ScatterplotLayer({
    id: 'waterways-layer',
    data: STRATEGIC_WATERWAYS,
    getPosition: (d) => [d.lon, d.lat],
    getRadius: 10000,
    getFillColor: [100, 150, 255, 180] as [number, number, number, number],
    radiusMinPixels: 5,
    radiusMaxPixels: 12,
    pickable: true,
  });
}

/* ── APT Groups ── */

export function createAPTGroupsLayer(): ScatterplotLayer {
  return new ScatterplotLayer({
    id: 'apt-groups-layer',
    data: APT_GROUPS,
    getPosition: (d) => [d.lon, d.lat],
    getRadius: 6000,
    getFillColor: [255, 140, 0, 140] as [number, number, number, number],
    radiusMinPixels: 4,
    radiusMaxPixels: 8,
    pickable: true,
    stroked: false,
  });
}
