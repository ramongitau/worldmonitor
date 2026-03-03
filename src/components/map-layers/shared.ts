/**
 * Shared constants, colors, icons, and utility layer factories
 * extracted from DeckGLMap.ts for reuse across domain modules.
 */
import { ScatterplotLayer } from '@deck.gl/layers';
import { getCurrentTheme } from '@/utils/index';
import { CONFLICT_ZONES, SITE_VARIANT } from '@/config';

// View presets with longitude, latitude, zoom
import type { DeckMapView } from './types';

export const VIEW_PRESETS: Record<DeckMapView, { longitude: number; latitude: number; zoom: number }> = {
  global: { longitude: 0, latitude: 20, zoom: 1.5 },
  america: { longitude: -95, latitude: 38, zoom: 3 },
  mena: { longitude: 45, latitude: 28, zoom: 3.5 },
  eu: { longitude: 15, latitude: 50, zoom: 3.5 },
  asia: { longitude: 105, latitude: 35, zoom: 3 },
  latam: { longitude: -60, latitude: -15, zoom: 3 },
  africa: { longitude: 20, latitude: 5, zoom: 3 },
  oceania: { longitude: 135, latitude: -25, zoom: 3.5 },
};

// Map interaction mode
export type MapInteractionMode = 'flat' | '3d';
export const MAP_INTERACTION_MODE: MapInteractionMode =
  import.meta.env.VITE_MAP_INTERACTION_MODE === 'flat' ? 'flat' : '3d';

// Theme-aware basemap vector style URLs
export const DARK_STYLE = SITE_VARIANT === 'happy'
  ? '/map-styles/happy-dark.json'
  : 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';
export const LIGHT_STYLE = SITE_VARIANT === 'happy'
  ? '/map-styles/happy-light.json'
  : 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json';

/**
 * Theme-aware overlay colors — refreshed on each buildLayers() call.
 */
export function getOverlayColors() {
  const isLight = getCurrentTheme() === 'light';
  return {
    hotspotHigh: [255, 68, 68, 200] as [number, number, number, number],
    hotspotElevated: [255, 165, 0, 200] as [number, number, number, number],
    hotspotLow: [255, 255, 0, 180] as [number, number, number, number],
    conflict: isLight
      ? [255, 0, 0, 60] as [number, number, number, number]
      : [255, 0, 0, 100] as [number, number, number, number],
    base: [0, 150, 255, 200] as [number, number, number, number],
    nuclear: isLight
      ? [180, 120, 0, 220] as [number, number, number, number]
      : [255, 215, 0, 200] as [number, number, number, number],
    datacenter: isLight
      ? [13, 148, 136, 200] as [number, number, number, number]
      : [0, 255, 200, 180] as [number, number, number, number],
    cable: [0, 200, 255, 150] as [number, number, number, number],
    cableHighlight: [255, 100, 100, 200] as [number, number, number, number],
    cableFault: [255, 50, 50, 220] as [number, number, number, number],
    cableDegraded: [255, 165, 0, 200] as [number, number, number, number],
    earthquake: [255, 100, 50, 200] as [number, number, number, number],
    vesselMilitary: [255, 100, 100, 220] as [number, number, number, number],
    flightMilitary: [255, 50, 50, 220] as [number, number, number, number],
    protest: [255, 150, 0, 200] as [number, number, number, number],
    outage: [255, 50, 50, 180] as [number, number, number, number],
    weather: [100, 150, 255, 180] as [number, number, number, number],
    startupHub: isLight
      ? [22, 163, 74, 220] as [number, number, number, number]
      : [0, 255, 150, 200] as [number, number, number, number],
    techHQ: [100, 200, 255, 200] as [number, number, number, number],
    accelerator: isLight
      ? [180, 120, 0, 220] as [number, number, number, number]
      : [255, 200, 0, 200] as [number, number, number, number],
    cloudRegion: [150, 100, 255, 180] as [number, number, number, number],
    stockExchange: isLight
      ? [20, 120, 200, 220] as [number, number, number, number]
      : [80, 200, 255, 210] as [number, number, number, number],
    financialCenter: isLight
      ? [0, 150, 110, 215] as [number, number, number, number]
      : [0, 220, 150, 200] as [number, number, number, number],
    centralBank: isLight
      ? [180, 120, 0, 220] as [number, number, number, number]
      : [255, 210, 80, 210] as [number, number, number, number],
    commodityHub: isLight
      ? [190, 95, 40, 220] as [number, number, number, number]
      : [255, 150, 80, 200] as [number, number, number, number],
    gulfInvestmentSA: [0, 168, 107, 220] as [number, number, number, number],
    gulfInvestmentUAE: [255, 0, 100, 220] as [number, number, number, number],
    ucdpStateBased: [255, 50, 50, 200] as [number, number, number, number],
    ucdpNonState: [255, 165, 0, 200] as [number, number, number, number],
    ucdpOneSided: [255, 255, 0, 200] as [number, number, number, number],
  };
}

export type OverlayColors = ReturnType<typeof getOverlayColors>;

// Mutable color state — refreshed on every buildLayers()
export let COLORS = getOverlayColors();
export function refreshColors(): void {
  COLORS = getOverlayColors();
}

// SVG icons as data URLs for different marker shapes
export const MARKER_ICONS = {
  square: 'data:image/svg+xml;base64,' + btoa(`<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><rect x="2" y="2" width="28" height="28" rx="3" fill="white"/></svg>`),
  diamond: 'data:image/svg+xml;base64,' + btoa(`<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><polygon points="16,2 30,16 16,30 2,16" fill="white"/></svg>`),
  triangleUp: 'data:image/svg+xml;base64,' + btoa(`<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><polygon points="16,2 30,28 2,28" fill="white"/></svg>`),
  hexagon: 'data:image/svg+xml;base64,' + btoa(`<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><polygon points="16,2 28,9 28,23 16,30 4,23 4,9" fill="white"/></svg>`),
  circle: 'data:image/svg+xml;base64,' + btoa(`<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><circle cx="16" cy="16" r="14" fill="white"/></svg>`),
  star: 'data:image/svg+xml;base64,' + btoa(`<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><polygon points="16,2 20,12 30,12 22,19 25,30 16,23 7,30 10,19 2,12 12,12" fill="white"/></svg>`),
};

export const BASES_ICON_MAPPING = { triangleUp: { x: 0, y: 0, width: 32, height: 32, mask: true } };
export const NUCLEAR_ICON_MAPPING = { hexagon: { x: 0, y: 0, width: 32, height: 32, mask: true } };
export const DATACENTER_ICON_MAPPING = { square: { x: 0, y: 0, width: 32, height: 32, mask: true } };

// Pre-built GeoJSON for conflict zones
export const CONFLICT_ZONES_GEOJSON: GeoJSON.FeatureCollection = {
  type: 'FeatureCollection',
  features: CONFLICT_ZONES.map(zone => ({
    type: 'Feature' as const,
    properties: { id: zone.id, name: zone.name, intensity: zone.intensity },
    geometry: { type: 'Polygon' as const, coordinates: [zone.coords] },
  })),
};

/**
 * Creates a transparent "ghost" ScatterplotLayer that keeps a stable layer ID
 * for deck.gl interleaved mode without rendering anything visible.
 */
export function createEmptyGhost(id: string): ScatterplotLayer {
  return new ScatterplotLayer({ id, data: [], getPosition: () => [0, 0] });
}

/**
 * Creates a transparent ScatterplotLayer at the same coordinates as real data
 * — used as a click-target enlargement (bigger hit area).
 */
export function createGhostLayer<T>(
  id: string,
  data: T[],
  getPosition: (d: T) => [number, number],
  opts: { radiusMinPixels?: number } = {},
): ScatterplotLayer<T> {
  return new ScatterplotLayer<T>({
    id,
    data,
    getPosition,
    getRadius: 10000,
    getFillColor: [0, 0, 0, 0],
    radiusMinPixels: opts.radiusMinPixels || 8,
    pickable: true,
  });
}

/**
 * Convert a hex color string to an RGBA tuple.
 */
export function hexToRgba(hex: string, alpha: number): [number, number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return [0, 0, 0, alpha];
  return [
    parseInt(result[1]!, 16),
    parseInt(result[2]!, 16),
    parseInt(result[3]!, 16),
    alpha,
  ];
}
