// source: worldmonitor/intelligence/v1/service.proto

import type { UcdpViolenceEvent } from '../../conflict/v1/service_client';
import type { UnrestEvent } from '../../unrest/v1/service_client';
import type { Earthquake } from '../../seismology/v1/service_client';

export interface GetRiskScoresRequest {
  region: string;
}

export interface GetRiskScoresResponse {
  ciiScores: CiiScore[];
  strategicRisks: StrategicRisk[];
}

export interface CiiScore {
  region: string;
  staticBaseline: number;
  dynamicScore: number;
  combinedScore: number;
  trend: TrendDirection;
  components?: CiiComponents;
  computedAt: number;
}

export interface CiiComponents {
  newsActivity: number;
  ciiContribution: number;
  geoConvergence: number;
  militaryActivity: number;
}

export interface StrategicRisk {
  region: string;
  level: SeverityLevel;
  score: number;
  factors: string[];
  trend: TrendDirection;
}

export interface GetPizzintStatusRequest {
  includeGdelt: boolean;
}

export interface GetPizzintStatusResponse {
  pizzint?: PizzintStatus;
  tensionPairs: GdeltTensionPair[];
}

export interface PizzintStatus {
  defconLevel: number;
  defconLabel: string;
  aggregateActivity: number;
  activeSpikes: number;
  locationsMonitored: number;
  locationsOpen: number;
  updatedAt: number;
  dataFreshness: DataFreshness;
  locations: PizzintLocation[];
}

export interface PizzintLocation {
  placeId: string;
  name: string;
  address: string;
  currentPopularity: number;
  percentageOfUsual: number;
  isSpike: boolean;
  spikeMagnitude: number;
  dataSource: string;
  recordedAt: string;
  dataFreshness: DataFreshness;
  isClosedNow: boolean;
  lat: number;
  lng: number;
}

export interface GdeltTensionPair {
  id: string;
  countries: string[];
  label: string;
  score: number;
  trend: TrendDirection;
  changePercent: number;
  region: string;
}

export interface ClassifyEventRequest {
  title: string;
  description: string;
  source: string;
  country: string;
}

export interface ClassifyEventResponse {
  classification?: EventClassification;
}

export interface EventClassification {
  category: string;
  subcategory: string;
  severity: SeverityLevel;
  confidence: number;
  analysis: string;
  entities: string[];
}

export interface GetCountryIntelBriefRequest {
  countryCode: string;
}

export interface GetCountryIntelBriefResponse {
  countryCode: string;
  countryName: string;
  brief: string;
  model: string;
  generatedAt: number;
}

export interface SearchGdeltDocumentsRequest {
  query: string;
  maxRecords: number;
  timespan: string;
  toneFilter: string;
  sort: string;
}

export interface SearchGdeltDocumentsResponse {
  articles: GdeltArticle[];
  query: string;
  error: string;
}

export interface GdeltArticle {
  title: string;
  url: string;
  source: string;
  date: string;
  image: string;
  language: string;
  tone: number;
}

export interface DeductSituationRequest {
  query: string;
  geoContext: string;
}

export interface DeductSituationResponse {
  analysis: string;
  model: string;
  provider: string;
}

export interface GetCiiHistoryRequest {
  region: string;
  days: number;
}

export interface CiiHistoryPoint {
  ts: number;
  score: number;
}

export interface GetCiiHistoryResponse {
  region: string;
  points: CiiHistoryPoint[];
}

export interface GetEventArchiveRequest {
  startAt: number;
  endAt: number;
  countryCode: string;
  eventTypes: string[];
  limit: number;
  offset: number;
}

export interface ArchivedEvent {
  id: string;
  occurredAt: number;
  type: string;
  conflict?: UcdpViolenceEvent;
  unrest?: UnrestEvent;
  earthquake?: Earthquake;
}

export interface GetEventArchiveResponse {
  events: ArchivedEvent[];
  totalCount: number;
}

export type SeverityLevel = "SEVERITY_LEVEL_UNSPECIFIED" | "SEVERITY_LEVEL_LOW" | "SEVERITY_LEVEL_MEDIUM" | "SEVERITY_LEVEL_HIGH";

export type TrendDirection = "TREND_DIRECTION_UNSPECIFIED" | "TREND_DIRECTION_RISING" | "TREND_DIRECTION_STABLE" | "TREND_DIRECTION_FALLING";

export type DataFreshness = "DATA_FRESHNESS_UNSPECIFIED" | "DATA_FRESHNESS_FRESH" | "DATA_FRESHNESS_STALE";

export interface FieldViolation {
  field: string;
  description: string;
}

export class ValidationError extends Error {
  violations: FieldViolation[];

  constructor(violations: FieldViolation[]) {
    super("Validation failed");
    this.name = "ValidationError";
    this.violations = violations;
  }
}

export class ApiError extends Error {
  statusCode: number;
  body: string;

  constructor(statusCode: number, message: string, body: string) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.body = body;
  }
}

export interface IntelligenceServiceClientOptions {
  fetch?: typeof fetch;
  defaultHeaders?: Record<string, string>;
}

export interface IntelligenceServiceCallOptions {
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

export class IntelligenceServiceClient {
  private baseURL: string;
  private fetchFn: typeof fetch;
  private defaultHeaders: Record<string, string>;

  constructor(baseURL: string, options?: IntelligenceServiceClientOptions) {
    this.baseURL = baseURL.replace(/\/+$/, "");
    this.fetchFn = options?.fetch ?? globalThis.fetch;
    this.defaultHeaders = { ...options?.defaultHeaders };
  }

  async getRiskScores(req: GetRiskScoresRequest, options?: IntelligenceServiceCallOptions): Promise<GetRiskScoresResponse> {
    let path = "/api/intelligence/v1/get-risk-scores";
    const params = new URLSearchParams();
    if (req.region != null && req.region !== "") params.set("region", String(req.region));
    const url = this.baseURL + path + (params.toString() ? "?" + params.toString() : "");

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...this.defaultHeaders,
      ...options?.headers,
    };

    const resp = await this.fetchFn(url, {
      method: "GET",
      headers,
      signal: options?.signal,
    });

    if (!resp.ok) {
      return this.handleError(resp);
    }

    return await resp.json() as GetRiskScoresResponse;
  }

  async getPizzintStatus(req: GetPizzintStatusRequest, options?: IntelligenceServiceCallOptions): Promise<GetPizzintStatusResponse> {
    let path = "/api/intelligence/v1/get-pizzint-status";
    const params = new URLSearchParams();
    if (req.includeGdelt) params.set("include_gdelt", String(req.includeGdelt));
    const url = this.baseURL + path + (params.toString() ? "?" + params.toString() : "");

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...this.defaultHeaders,
      ...options?.headers,
    };

    const resp = await this.fetchFn(url, {
      method: "GET",
      headers,
      signal: options?.signal,
    });

    if (!resp.ok) {
      return this.handleError(resp);
    }

    return await resp.json() as GetPizzintStatusResponse;
  }

  async classifyEvent(req: ClassifyEventRequest, options?: IntelligenceServiceCallOptions): Promise<ClassifyEventResponse> {
    let path = "/api/intelligence/v1/classify-event";
    const url = this.baseURL + path;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...this.defaultHeaders,
      ...options?.headers,
    };

    const resp = await this.fetchFn(url, {
      method: "POST",
      headers,
      body: JSON.stringify(req),
      signal: options?.signal,
    });

    if (!resp.ok) {
      return this.handleError(resp);
    }

    return await resp.json() as ClassifyEventResponse;
  }

  async getCountryIntelBrief(req: GetCountryIntelBriefRequest, options?: IntelligenceServiceCallOptions): Promise<GetCountryIntelBriefResponse> {
    const path = "/api/intelligence/v1/get-country-intel-brief";
    const params = new URLSearchParams();
    if (req.countryCode != null && req.countryCode !== "") params.set("country_code", req.countryCode);
    const url = this.baseURL + path + (params.toString() ? "?" + params.toString() : "");

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...this.defaultHeaders,
      ...options?.headers,
    };

    const resp = await this.fetchFn(url, {
      method: "GET",
      headers,
      signal: options?.signal,
    });

    if (!resp.ok) {
      return this.handleError(resp);
    }

    return await resp.json() as GetCountryIntelBriefResponse;
  }

  async searchGdeltDocuments(req: SearchGdeltDocumentsRequest, options?: IntelligenceServiceCallOptions): Promise<SearchGdeltDocumentsResponse> {
    let path = "/api/intelligence/v1/search-gdelt-documents";
    const params = new URLSearchParams();
    if (req.query != null && req.query !== "") params.set("query", String(req.query));
    if (req.maxRecords != null && req.maxRecords !== 0) params.set("max_records", String(req.maxRecords));
    if (req.timespan != null && req.timespan !== "") params.set("timespan", String(req.timespan));
    if (req.toneFilter != null && req.toneFilter !== "") params.set("tone_filter", String(req.toneFilter));
    if (req.sort != null && req.sort !== "") params.set("sort", String(req.sort));
    const url = this.baseURL + path + (params.toString() ? "?" + params.toString() : "");

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...this.defaultHeaders,
      ...options?.headers,
    };

    const resp = await this.fetchFn(url, {
      method: "GET",
      headers,
      signal: options?.signal,
    });

    if (!resp.ok) {
      return this.handleError(resp);
    }

    return await resp.json() as SearchGdeltDocumentsResponse;
  }

  async deductSituation(req: DeductSituationRequest, options?: IntelligenceServiceCallOptions): Promise<DeductSituationResponse> {
    let path = "/api/intelligence/v1/deduct-situation";
    const url = this.baseURL + path;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...this.defaultHeaders,
      ...options?.headers,
    };

    const resp = await this.fetchFn(url, {
      method: "POST",
      headers,
      body: JSON.stringify(req),
      signal: options?.signal,
    });

    if (!resp.ok) {
      return this.handleError(resp);
    }

    return await resp.json() as DeductSituationResponse;
  }

  async getCiiHistory(req: GetCiiHistoryRequest, options?: IntelligenceServiceCallOptions): Promise<GetCiiHistoryResponse> {
    const url = new URL(`${this.baseURL}/api/intelligence/v1/get-cii-history`);
    url.searchParams.append("region", req.region);
    url.searchParams.append("days", req.days.toString());

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...this.defaultHeaders,
      ...options?.headers,
    };

    const resp = await this.fetchFn(url.toString(), {
      method: "GET",
      headers,
      signal: options?.signal,
    });

    if (!resp.ok) {
      return this.handleError(resp);
    }

    return await resp.json() as GetCiiHistoryResponse;
  }

  async getEventArchive(req: GetEventArchiveRequest, options?: IntelligenceServiceCallOptions): Promise<GetEventArchiveResponse> {
    const url = new URL(`${this.baseURL}/api/intelligence/v1/get-event-archive`);
    url.searchParams.append("start_at", req.startAt.toString());
    url.searchParams.append("end_at", req.endAt.toString());
    url.searchParams.append("country_code", req.countryCode);
    req.eventTypes.forEach(t => url.searchParams.append("event_types", t));
    url.searchParams.append("limit", req.limit.toString());
    url.searchParams.append("offset", req.offset.toString());

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...this.defaultHeaders,
      ...options?.headers,
    };

    const resp = await this.fetchFn(url.toString(), {
      method: "GET",
      headers,
      signal: options?.signal,
    });

    if (!resp.ok) {
      return this.handleError(resp);
    }

    return await resp.json() as GetEventArchiveResponse;
  }

  private async handleError(resp: Response): Promise<never> {
    const body = await resp.text();
    if (resp.status === 400) {
      try {
        const parsed = JSON.parse(body);
        if (parsed.violations) {
          throw new ValidationError(parsed.violations);
        }
      } catch (e) {
        if (e instanceof ValidationError) throw e;
      }
    }
    throw new ApiError(resp.status, `Request failed with status ${resp.status}`, body);
  }
}

