/**
 * Nature layer factories — earthquakes, natural events, fires,
 * weather alerts, and climate anomaly heatmap.
 */
import { ScatterplotLayer } from '@deck.gl/layers';
import { HeatmapLayer } from '@deck.gl/aggregation-layers';
import type { Earthquake } from '@/services/earthquakes';
import type { NaturalEvent } from '@/types';
import type { WeatherAlert } from '@/services/weather';
import type { LayerContext } from './types';

/* ── Earthquakes ── */

export function createEarthquakesLayer(earthquakes: Earthquake[]): ScatterplotLayer {
  return new ScatterplotLayer({
    id: 'earthquakes-layer',
    data: earthquakes,
    getPosition: (d) => [d.longitude, d.latitude],
    getRadius: (d) => Math.pow(2, d.magnitude || 1) * 3000,
    getFillColor: (d) => {
      const mag = d.magnitude || 0;
      if (mag >= 6) return [255, 50, 50, 220] as [number, number, number, number];
      if (mag >= 4) return [255, 140, 50, 200] as [number, number, number, number];
      return [255, 200, 50, 180] as [number, number, number, number];
    },
    radiusMinPixels: 3,
    radiusMaxPixels: 20,
    pickable: true,
  });
}

/* ── Natural Events (NASA EONET) ── */

export function createNaturalEventsLayer(events: NaturalEvent[]): ScatterplotLayer {
  return new ScatterplotLayer({
    id: 'natural-events-layer',
    data: events,
    getPosition: (d: NaturalEvent) => [d.lon, d.lat],
    getRadius: (d: NaturalEvent) => (d.magnitude || 1) * 5000,
    getFillColor: (d: NaturalEvent) => {
      if (d.category === 'wildfires') return [255, 100, 0, 200] as [number, number, number, number];
      if (d.category === 'volcanoes') return [255, 50, 50, 200] as [number, number, number, number];
      return [255, 200, 50, 180] as [number, number, number, number];
    },
    radiusMinPixels: 4,
    radiusMaxPixels: 14,
    pickable: true,
  });
}

/* ── Satellite Fires (NASA FIRMS) ── */

export function createFiresLayer(ctx: LayerContext): ScatterplotLayer {
  return new ScatterplotLayer({
    id: 'fires-layer',
    data: ctx.firmsFireData,
    getPosition: (d: (typeof ctx.firmsFireData)[0]) => [d.lon, d.lat],
    getRadius: (d: (typeof ctx.firmsFireData)[0]) => 3000 + d.frp * 100,
    getFillColor: (d: (typeof ctx.firmsFireData)[0]) => {
      if (d.brightness > 400) return [255, 50, 0, 220] as [number, number, number, number];
      if (d.brightness > 350) return [255, 100, 0, 200] as [number, number, number, number];
      return [255, 150, 50, 180] as [number, number, number, number];
    },
    radiusMinPixels: 2,
    radiusMaxPixels: 10,
    pickable: true,
  });
}

/* ── Weather Alerts ── */

export function createWeatherLayer(alerts: WeatherAlert[]): ScatterplotLayer {
  return new ScatterplotLayer({
    id: 'weather-layer',
    data: alerts,
    getPosition: (d) => [d.longitude, d.latitude],
    getRadius: 15000,
    radiusMinPixels: 4,
    radiusMaxPixels: 12,
    getFillColor: (d) => {
      const severity = d.severity || 'minor';
      switch (severity) {
        case 'extreme': return [255, 50, 50, 200] as [number, number, number, number];
        case 'severe': return [255, 140, 0, 200] as [number, number, number, number];
        case 'moderate': return [255, 220, 50, 180] as [number, number, number, number];
        default: return [100, 200, 255, 160] as [number, number, number, number];
      }
    },
    pickable: true,
  });
}

/* ── Climate Anomaly Heatmap ── */

export function createClimateHeatmapLayer(ctx: LayerContext): HeatmapLayer {
  return new HeatmapLayer({
    id: 'climate-anomalies-heatmap',
    data: ctx.climateAnomalies,
    getPosition: (d) => [d.lon, d.lat],
    getWeight: (d) => Math.abs(d.anomalyC || 0),
    radiusPixels: 40,
    intensity: 1,
    threshold: 0.1,
    colorRange: [
      [0, 100, 255, 100],
      [0, 200, 255, 150],
      [255, 255, 100, 180],
      [255, 150, 0, 200],
      [255, 50, 0, 220],
    ] as [number, number, number, number][],
    pickable: false,
  });
}
