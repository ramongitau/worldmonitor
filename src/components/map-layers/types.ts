/**
 * Shared types for map layer factory modules.
 *
 * Each factory function receives a `LayerContext` that provides access to the
 * DeckGLMap state, data stores, and helper methods without coupling to the
 * class instance directly.
 */
import type { Layer } from '@deck.gl/core';
import type maplibregl from 'maplibre-gl';
import type {
  MapLayers,
  Hotspot,
  InternetOutage,
  AisDisruptionEvent,
  AisDensityZone,
  RepairShip,
  MilitaryFlight,
  MilitaryVessel,
  MilitaryFlightCluster,
  MilitaryVesselCluster,
  NaturalEvent,
  UcdpGeoEvent,
  MapProtestCluster,
  MapTechHQCluster,
  MapTechEventCluster,
  MapDatacenterCluster,
  CyberThreat,
  CableHealthRecord,
  NewsItem,
} from '@/types';
import type { IranEvent } from '@/services/conflict';
import type { GpsJamHex } from '@/services/gps-interference';
import type { DisplacementFlow } from '@/services/displacement';
import type { Earthquake } from '@/services/earthquakes';
import type { FeatureCollection, Geometry } from 'geojson';

export type TimeRange = '1h' | '6h' | '24h' | '48h' | '7d' | 'all';
export type DeckMapView = 'global' | 'america' | 'mena' | 'eu' | 'asia' | 'latam' | 'africa' | 'oceania';

export interface CountryClickPayload {
  lat: number;
  lon: number;
  code?: string;
  name?: string;
}

export interface DeckMapState {
  zoom: number;
  pan: { x: number; y: number };
  view: DeckMapView;
  layers: MapLayers;
  timeRange: TimeRange;
}

export interface HotspotWithBreaking extends Hotspot {
  hasBreaking?: boolean;
}

export interface TechEventMarker {
  id: string;
  title: string;
  location: string;
  lat: number;
  lng: number;
  country: string;
  startDate: string;
  endDate: string;
  url: string | null;
  daysUntil: number;
}

/**
 * Context object passed to layer factory functions.
 * Provides read-only access to the DeckGLMap's state and data.
 */
export interface LayerContext {
  // Map references
  maplibreMap: maplibregl.Map | null;
  state: DeckMapState;

  // Layer cache for stable layer IDs
  layerCache: Map<string, Layer>;

  // Server bases
  serverBasesLoaded?: boolean;
  serverBases?: any[];
  serverBaseClusters?: any[];


  // Highlighted assets
  highlightedAssets: {
    cable: Set<string>;
    pipeline: Set<string>;
    datacenter: Set<string>;
    base: Set<string>;
    nuclear: Set<string>;
  };

  // Live data status/health
  healthByCableId: Record<string, CableHealthRecord>;

  // Geopolitical data
  hotspots: HotspotWithBreaking[];
  conflictZones: any[];
  ucdpEvents: UcdpGeoEvent[];
  militaryFlights: MilitaryFlight[];
  militaryVessels: MilitaryVessel[];
  flightClusters: MilitaryFlightCluster[];
  vesselClusters: MilitaryVesselCluster[];
  iranEvents: IranEvent[];
  protestClusters: MapProtestCluster[];
  cyberThreats: CyberThreat[];
  repairShips: RepairShip[];

  // Infrastructure data
  aisDisruptionEvents: AisDisruptionEvent[];
  aisDensity: AisDensityZone[];
  gpsJammingHexes: GpsJamHex[];
  displacementFlows: DisplacementFlow[];

  // Nature data
  earthquakes: Earthquake[];
  naturalEvents: NaturalEvent[];
  firmsFireData: Array<{ lat: number; lon: number; brightness: number; frp: number; confidence: number; region: string; acq_date: string; daynight: string }>;
  weatherAlerts: any[];
  climateAnomalies: any[];
  outages: InternetOutage[];

  // Tech data
  techEvents: TechEventMarker[];
  techHQClusters: MapTechHQCluster[];
  techEventClusters: MapTechEventCluster[];

  // Finance data
  tradeRouteSegments: any[];

  // Happy variant data
  positiveEvents: any[];
  kindnessPoints: any[];
  happinessScores: Map<string, number>;
  speciesRecoveryZones: any[];
  renewableInstallations: any[];
  countriesGeoJsonData: FeatureCollection<Geometry> | null;

  // Datacenter data
  datacenterClusters: MapDatacenterCluster[];

  // News data
  newsLocations: Array<{ lat: number; lon: number; title: string; threatLevel: string; timestamp?: Date }>;
  newsLocationFirstSeen: Map<string, number>;
  news: NewsItem[];

  // Animation state
  pulseTime: number;

  // Signature tracking for caching
  lastCableHighlightSignature: string;
  lastCableHealthSignature: string;
  lastPipelineHighlightSignature: string;

  // Helper methods
  isLayerVisible(layerKey: keyof MapLayers): boolean;
  filterByTime<T>(items: T[], getTime: (item: T) => Date | string | number | undefined | null): T[];
  hexToRgba(hex: string, alpha: number): [number, number, number, number];
  getSetSignature(set: Set<string>): string;
  updateClusterData(): void;
  createEmptyGhost(id: string): Layer;
  createGhostLayer<T>(id: string, data: T[], getPosition: (d: T) => [number, number], opts?: { radiusMinPixels?: number }): Layer;
}
