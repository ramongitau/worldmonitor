import type {
  ServerContext,
  GetCiiHistoryRequest,
  GetCiiHistoryResponse,
  CiiHistoryPoint,
} from '../../../../src/generated/server/worldmonitor/intelligence/v1/service_server';

import { zRangeByScore } from '../../../_shared/redis';

/**
 * getCiiHistory retrieves historical CII scores from Redis ZSET.
 */
export async function getCiiHistory(
  _ctx: ServerContext,
  req: GetCiiHistoryRequest,
): Promise<GetCiiHistoryResponse> {
  const country = req.region;
  const days = req.days || 7;
  const now = Date.now();
  const startTime = now - days * 24 * 60 * 60 * 1000;

  try {
    const rawPoints = await zRangeByScore(`cii:history:${country}`, startTime, now);
    const points: CiiHistoryPoint[] = rawPoints.map((p) => JSON.parse(p));

    return {
      region: country,
      points: points.sort((a, b) => a.ts - b.ts),
    };
  } catch (err) {
    console.error(`[cii-history] Failed to fetch history for ${country}:`, err);
    return {
      region: country,
      points: [],
    };
  }
}
