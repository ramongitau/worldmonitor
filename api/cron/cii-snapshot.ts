import { fetchACLEDProtests, computeCIIScores, TIER1_COUNTRIES } from '../../server/worldmonitor/intelligence/v1/_shared';
import { zAdd } from '../../server/_shared/redis';

/**
 * CII Snapshot Cron
 * Runs every 6 hours (configured in vercel.json or similar)
 * Fetches latest ACLED data, computes CII, and stores in Redis ZSET for history.
 */
export default async function handler(req: Request) {
  // Simple auth check via header (matching warm-aviation-cache.ts pattern)
  const auth = req.headers.get('x-worldmonitor-cron-secret');
  if (process.env.CRON_SECRET && auth !== process.env.CRON_SECRET) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    console.log('[cron] Starting CII snapshot...');
    const protests = await fetchACLEDProtests();
    const scores = computeCIIScores(protests);
    const now = Date.now();

    // Store in Redis ZSET: cii:history:{countryCode}
    // Member: JSON-stringified {ts, score}
    // Score: timestamp (for ZRANGEBYSCORE)
    // TTL: 30 days (default)
    const TTL_30_DAYS = 30 * 24 * 60 * 60;

    for (const score of scores) {
      const countryCode = score.region;
      if (!TIER1_COUNTRIES[countryCode]) continue;

      const record = JSON.stringify({
        ts: now,
        score: score.combinedScore,
      });

      await zAdd(`cii:history:${countryCode}`, now, record, TTL_30_DAYS);
    }

    console.log(`[cron] Successfully snapshotted CII for ${scores.length} countries.`);
    return new Response(JSON.stringify({ success: true, count: scores.length }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[cron] CII snapshot failed:', err);
    return new Response('Internal Server Error', { status: 500 });
  }
}

export const config = {
  runtime: 'edge',
};
