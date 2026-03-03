import type {
  ServerContext,
  GetRiskScoresRequest,
  GetRiskScoresResponse,
} from '../../../../src/generated/server/worldmonitor/intelligence/v1/service_server';

import {
  fetchACLEDProtests,
  computeCIIScores,
  computeStrategicRisks,
} from './_shared';

import { getCachedJson, setCachedJson, cachedFetchJson } from '../../../_shared/redis';

// Re-exported from _shared for RPC handler
export { computeCIIScores, computeStrategicRisks, fetchACLEDProtests };

// ========================================================================
// Cache keys
// ========================================================================

const RISK_CACHE_KEY = 'risk:scores:sebuf:v1';
const RISK_STALE_CACHE_KEY = 'risk:scores:sebuf:stale:v1';
const RISK_CACHE_TTL = 600;
const RISK_STALE_TTL = 3600;

// ========================================================================
// RPC handler
// ========================================================================

export async function getRiskScores(
  _ctx: ServerContext,
  _req: GetRiskScoresRequest,
): Promise<GetRiskScoresResponse> {
  try {
    const result = await cachedFetchJson<GetRiskScoresResponse>(
      RISK_CACHE_KEY,
      RISK_CACHE_TTL,
      async () => {
        const protests = await fetchACLEDProtests();
        const ciiScores = computeCIIScores(protests);
        const strategicRisks = computeStrategicRisks(ciiScores);
        const r: GetRiskScoresResponse = { ciiScores, strategicRisks };
        await setCachedJson(RISK_STALE_CACHE_KEY, r, RISK_STALE_TTL).catch(() => {});
        return r;
      },
    );
    if (result) return result;
  } catch { /* upstream failed — fall through to stale */ }

  const stale = (await getCachedJson(RISK_STALE_CACHE_KEY)) as GetRiskScoresResponse | null;
  if (stale) return stale;
  const ciiScores = computeCIIScores([]);
  return { ciiScores, strategicRisks: computeStrategicRisks(ciiScores) };
}
