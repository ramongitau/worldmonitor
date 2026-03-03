import type { IntelligenceServiceHandler } from '../../../../src/generated/server/worldmonitor/intelligence/v1/service_server';

import { getRiskScores } from './get-risk-scores';
import { getPizzintStatus } from './get-pizzint-status';
import { classifyEvent } from './classify-event';
import { getCountryIntelBrief } from './get-country-intel-brief';
import { searchGdeltDocuments } from './search-gdelt-documents';
import { deductSituation } from './deduct-situation';
import { getCiiHistory } from './cii-history';
import { getEventArchive } from './get-event-archive';

export const intelligenceHandler: IntelligenceServiceHandler = {
  getRiskScores,
  getPizzintStatus,
  classifyEvent,
  getCountryIntelBrief,
  searchGdeltDocuments,
  deductSituation,
  getCiiHistory,
  getEventArchive,
};
