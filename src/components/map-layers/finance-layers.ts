/**
 * Finance layer factories — stock exchanges, financial centers,
 * central banks, commodity hubs, gulf investments, economic centers,
 * trade routes, chokepoints, and critical minerals.
 */
import { ScatterplotLayer, PathLayer } from '@deck.gl/layers';
import {
  ECONOMIC_CENTERS,
  STOCK_EXCHANGES,
  FINANCIAL_CENTERS,
  CENTRAL_BANKS,
  COMMODITY_HUBS,
  GULF_INVESTMENTS,
  CRITICAL_MINERALS,
} from '@/config';
import type { GulfInvestment } from '@/types';
import { COLORS } from './shared';
import type { LayerContext } from './types';

/* ── Economic Centers ── */

export function createEconomicCentersLayer(): ScatterplotLayer {
  return new ScatterplotLayer({
    id: 'economic-centers-layer',
    data: ECONOMIC_CENTERS,
    getPosition: (d) => [d.lon, d.lat],
    getRadius: 8000,
    getFillColor: [255, 215, 0, 180] as [number, number, number, number],
    radiusMinPixels: 4,
    radiusMaxPixels: 10,
    pickable: true,
  });
}

/* ── Stock Exchanges ── */

export function createStockExchangesLayer(): ScatterplotLayer {
  return new ScatterplotLayer({
    id: 'stock-exchanges-layer',
    data: STOCK_EXCHANGES,
    getPosition: (d) => [d.lon, d.lat],
    getRadius: (d) => d.tier === 'mega' ? 18000 : d.tier === 'major' ? 14000 : 11000,
    getFillColor: (d) => {
      if (d.tier === 'mega') return [255, 215, 80, 220] as [number, number, number, number];
      if (d.tier === 'major') return COLORS.stockExchange;
      return [140, 210, 255, 190] as [number, number, number, number];
    },
    radiusMinPixels: 5,
    radiusMaxPixels: 14,
    pickable: true,
  });
}

/* ── Financial Centers ── */

export function createFinancialCentersLayer(): ScatterplotLayer {
  return new ScatterplotLayer({
    id: 'financial-centers-layer',
    data: FINANCIAL_CENTERS,
    getPosition: (d) => [d.lon, d.lat],
    getRadius: (d) => d.type === 'global' ? 17000 : d.type === 'regional' ? 13000 : 10000,
    getFillColor: (d) => {
      if (d.type === 'global') return COLORS.financialCenter;
      if (d.type === 'regional') return [0, 190, 130, 185] as [number, number, number, number];
      return [0, 150, 110, 165] as [number, number, number, number];
    },
    radiusMinPixels: 4,
    radiusMaxPixels: 12,
    pickable: true,
  });
}

/* ── Central Banks ── */

export function createCentralBanksLayer(): ScatterplotLayer {
  return new ScatterplotLayer({
    id: 'central-banks-layer',
    data: CENTRAL_BANKS,
    getPosition: (d) => [d.lon, d.lat],
    getRadius: (d) => d.type === 'major' ? 15000 : d.type === 'supranational' ? 17000 : 12000,
    getFillColor: (d) => {
      if (d.type === 'major') return COLORS.centralBank;
      if (d.type === 'supranational') return [255, 235, 140, 220] as [number, number, number, number];
      return [235, 180, 80, 185] as [number, number, number, number];
    },
    radiusMinPixels: 4,
    radiusMaxPixels: 12,
    pickable: true,
  });
}

/* ── Commodity Hubs ── */

export function createCommodityHubsLayer(): ScatterplotLayer {
  return new ScatterplotLayer({
    id: 'commodity-hubs-layer',
    data: COMMODITY_HUBS,
    getPosition: (d) => [d.lon, d.lat],
    getRadius: (d) => d.type === 'exchange' ? 14000 : d.type === 'port' ? 12000 : 10000,
    getFillColor: (d) => {
      if (d.type === 'exchange') return COLORS.commodityHub;
      if (d.type === 'port') return [80, 170, 255, 190] as [number, number, number, number];
      return [255, 110, 80, 185] as [number, number, number, number];
    },
    radiusMinPixels: 4,
    radiusMaxPixels: 11,
    pickable: true,
  });
}

/* ── Gulf FDI Investments ── */

export function createGulfInvestmentsLayer(): ScatterplotLayer<GulfInvestment> {
  return new ScatterplotLayer<GulfInvestment>({
    id: 'gulf-investments-layer',
    data: GULF_INVESTMENTS,
    getPosition: (d: GulfInvestment) => [d.lon, d.lat],
    getRadius: (d: GulfInvestment) => {
      if (!d.investmentUSD) return 20000;
      if (d.investmentUSD >= 50000) return 70000;
      if (d.investmentUSD >= 10000) return 55000;
      if (d.investmentUSD >= 1000) return 40000;
      return 25000;
    },
    getFillColor: (d: GulfInvestment) =>
      d.investingCountry === 'SA' ? COLORS.gulfInvestmentSA : COLORS.gulfInvestmentUAE,
    getLineColor: [255, 255, 255, 80] as [number, number, number, number],
    lineWidthMinPixels: 1,
    radiusMinPixels: 5,
    radiusMaxPixels: 28,
    pickable: true,
  });
}

/* ── Critical Minerals ── */

export function createMineralsLayer(): ScatterplotLayer {
  return new ScatterplotLayer({
    id: 'minerals-layer',
    data: CRITICAL_MINERALS,
    getPosition: (d) => [d.lon, d.lat],
    getRadius: 8000,
    getFillColor: (d) => {
      switch (d.mineral) {
        case 'Lithium': return [0, 200, 255, 200] as [number, number, number, number];
        case 'Cobalt': return [100, 100, 255, 200] as [number, number, number, number];
        case 'Rare Earths': return [255, 100, 200, 200] as [number, number, number, number];
        case 'Nickel': return [100, 255, 100, 200] as [number, number, number, number];
        default: return [200, 200, 200, 200] as [number, number, number, number];
      }
    },
    radiusMinPixels: 5,
    radiusMaxPixels: 12,
    pickable: true,
  });
}

/* ── Trade Routes ── */

export function createTradeRoutesLayer(ctx: LayerContext): PathLayer {
  return new PathLayer({
    id: 'trade-routes-layer',
    data: ctx.tradeRouteSegments,
    getPath: (d) => [d.sourcePosition, d.targetPosition],
    getColor: [100, 200, 255, 120] as [number, number, number, number],
    getWidth: 1.5,
    widthMinPixels: 1,
    widthMaxPixels: 3,
    pickable: true,
  });
}

/* ── Trade Chokepoints ── */

export function createTradeChokepointsLayer(ctx: LayerContext): ScatterplotLayer {
  // Extract unique chokepoints from trade route data
  const chokepoints = ctx.tradeRouteSegments
    .filter(seg => seg.totalSegments > 1) // Heuristic or check against known chokepoints
    .map(seg => ({
      name: seg.routeName,
      lat: seg.sourcePosition[1],
      lon: seg.sourcePosition[0],
    }));

  return new ScatterplotLayer({
    id: 'trade-chokepoints-layer',
    data: chokepoints,
    getPosition: (d) => [d.lon, d.lat],
    getRadius: 15000,
    getFillColor: [255, 200, 50, 200] as [number, number, number, number],
    radiusMinPixels: 5,
    radiusMaxPixels: 12,
    pickable: true,
  });
}
