/**
 * Barrel export — re-exports all map layer modules for convenient importing.
 *
 * Usage in DeckGLMap.ts:
 *   import { createCablesLayer, createBasesLayer, ... } from './map-layers';
 */

// Shared types and utilities
export * from './types';
export {
  VIEW_PRESETS,
  MAP_INTERACTION_MODE,
  DARK_STYLE,
  LIGHT_STYLE,
  getOverlayColors,
  COLORS,
  refreshColors,
  MARKER_ICONS,
  BASES_ICON_MAPPING,
  NUCLEAR_ICON_MAPPING,
  DATACENTER_ICON_MAPPING,
  CONFLICT_ZONES_GEOJSON,
  createEmptyGhost,
  createGhostLayer,
  hexToRgba,
} from './shared';

// Domain layer factories
export * from './infrastructure-layers';
export * from './military-layers';
export * from './geopolitical-layers';
export * from './nature-layers';
export * from './finance-layers';
export * from './tech-layers';
export * from './happy-layers';
