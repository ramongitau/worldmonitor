import { type ArchivedEvent, type GetEventArchiveRequest, type GetEventArchiveResponse, type ServerContext } from '../../../../src/generated/server/worldmonitor/intelligence/v1/service_server';
import { zRangeByScore, getCachedJsonBatch } from '../../../_shared/redis';

const RELAY_ENV_PREFIX = process.env.RELAY_ENV ? `${process.env.RELAY_ENV}:` : '';
const EVENT_ARCHIVE_DATA_KEY = `${RELAY_ENV_PREFIX}archive:data:v1`;
const EVENT_ARCHIVE_INDEX_KEY = `${RELAY_ENV_PREFIX}archive:index:v1`;

export async function getEventArchive(
  ctx: ServerContext,
  req: GetEventArchiveRequest
): Promise<GetEventArchiveResponse> {
  const startTime = req.startAt || 0;
  const endTime = req.endAt || Date.now();
  const limit = Math.min(req.limit || 50, 500);
  const offset = req.offset || 0;
  
  // 1. Get IDs from Sorted Set (indexed by occurredAt)
  // Redis zRangeByScore returns members with scores in [min, max]
  const storageIds = await zRangeByScore(
    EVENT_ARCHIVE_INDEX_KEY,
    startTime,
    endTime,
    { limit: { offset, count: limit }, rev: true }
  );

  if (!storageIds || storageIds.length === 0) {
    return { events: [], totalCount: 0 };
  }

  // 2. Fetch full event data from Hash
  const rawEvents = await getCachedJsonBatch<ArchivedEvent>(
    EVENT_ARCHIVE_DATA_KEY,
    storageIds
  );

  // 3. Filter by type if requested
  let events = rawEvents.filter((e: ArchivedEvent | null): e is ArchivedEvent => !!e);
  if (req.eventTypes && req.eventTypes.length > 0) {
    const allowedTypes = new Set(req.eventTypes.map((t: string) => t.toLowerCase()));
    events = events.filter((e: ArchivedEvent) => allowedTypes.has(e.type.toLowerCase()));
  }

  // Note: totalCount is an estimate or we'd need another redis call (ZCOUNT)
  // For now, let's just return the length of the current batch as a placeholder or 0
  return { events, totalCount: events.length };
}
