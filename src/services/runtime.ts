const DEFAULT_REMOTE_HOSTS: Record<string, string> = {
  tech: 'https://tech.worldmonitor.app',
  full: 'https://worldmonitor.app',
  world: 'https://worldmonitor.app',
};

const DEFAULT_LOCAL_API_BASE = 'http://127.0.0.1:46123';
const FORCE_DESKTOP_RUNTIME = import.meta.env.VITE_DESKTOP_RUNTIME === '1';

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/$/, '');
}

type RuntimeProbe = {
  hasTauriGlobals: boolean;
  userAgent: string;
  locationProtocol: string;
  locationHost: string;
  locationOrigin: string;
};

export function detectDesktopRuntime(probe: RuntimeProbe): boolean {
  const tauriInUserAgent = probe.userAgent.includes('Tauri');
  const secureLocalhostOrigin = (
    probe.locationProtocol === 'https:' && (
      probe.locationHost === 'localhost' ||
      probe.locationHost.startsWith('localhost:') ||
      probe.locationHost === '127.0.0.1' ||
      probe.locationHost.startsWith('127.0.0.1:')
    )
  );

  // Tauri production windows can expose tauri-like hosts/schemes without
  // always exposing bridge globals at first paint.
  const tauriLikeLocation = (
    probe.locationProtocol === 'tauri:' ||
    probe.locationProtocol === 'asset:' ||
    probe.locationHost === 'tauri.localhost' ||
    probe.locationHost.endsWith('.tauri.localhost') ||
    probe.locationOrigin.startsWith('tauri://') ||
    secureLocalhostOrigin
  );

  return probe.hasTauriGlobals || tauriInUserAgent || tauriLikeLocation;
}

export function isDesktopRuntime(): boolean {
  if (FORCE_DESKTOP_RUNTIME) {
    return true;
  }

  if (typeof window === 'undefined') {
    return false;
  }

  return detectDesktopRuntime({
    hasTauriGlobals: '__TAURI_INTERNALS__' in window || '__TAURI__' in window,
    userAgent: window.navigator?.userAgent ?? '',
    locationProtocol: window.location?.protocol ?? '',
    locationHost: window.location?.host ?? '',
    locationOrigin: window.location?.origin ?? '',
  });
}

export function getApiBaseUrl(): string {
  if (!isDesktopRuntime()) {
    return '';
  }

  const configuredBaseUrl = import.meta.env.VITE_TAURI_API_BASE_URL;
  if (configuredBaseUrl) {
    return normalizeBaseUrl(configuredBaseUrl);
  }

  return DEFAULT_LOCAL_API_BASE;
}

export function getRemoteApiBaseUrl(): string {
  const configuredRemoteBase = import.meta.env.VITE_TAURI_REMOTE_API_BASE_URL;
  if (configuredRemoteBase) {
    return normalizeBaseUrl(configuredRemoteBase);
  }

  const variant = import.meta.env.VITE_VARIANT || 'full';
  return DEFAULT_REMOTE_HOSTS[variant] ?? DEFAULT_REMOTE_HOSTS.full ?? 'https://worldmonitor.app';
}

export function toRuntimeUrl(path: string): string {
  if (!path.startsWith('/')) {
    return path;
  }

  const baseUrl = getApiBaseUrl();
  if (!baseUrl) {
    return path;
  }

  return `${baseUrl}${path}`;
}

const APP_HOSTS = new Set([
  'worldmonitor.app',
  'www.worldmonitor.app',
  'tech.worldmonitor.app',
  'localhost',
  '127.0.0.1',
]);

function isAppOriginUrl(urlStr: string): boolean {
  try {
    const u = new URL(urlStr);
    const host = u.hostname;
    return APP_HOSTS.has(host) || host.endsWith('.worldmonitor.app');
  } catch {
    return false;
  }
}

function getApiTargetFromRequestInput(input: RequestInfo | URL): string | null {
  if (typeof input === 'string') {
    if (input.startsWith('/')) return input;
    if (isAppOriginUrl(input)) {
      const u = new URL(input);
      return `${u.pathname}${u.search}`;
    }
    return null;
  }

  if (input instanceof URL) {
    if (isAppOriginUrl(input.href)) {
      return `${input.pathname}${input.search}`;
    }
    return null;
  }

  if (isAppOriginUrl(input.url)) {
    const u = new URL(input.url);
    return `${u.pathname}${u.search}`;
  }
  return null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export type SmartPollReason = 'interval' | 'resume' | 'manual' | 'startup';

export interface SmartPollContext {
  signal?: AbortSignal;
  reason: SmartPollReason;
  isHidden: boolean;
}

export interface SmartPollOptions {
  intervalMs: number;
  hiddenIntervalMs?: number;
  hiddenMultiplier?: number;
  pauseWhenHidden?: boolean;
  refreshOnVisible?: boolean;
  runImmediately?: boolean;
  shouldRun?: () => boolean;
  maxBackoffMultiplier?: number;
  jitterFraction?: number;
  minIntervalMs?: number;
  onError?: (error: unknown) => void;
  visibilityDebounceMs?: number;
}

export interface SmartPollLoopHandle {
  stop: () => void;
  trigger: () => void;
  isActive: () => boolean;
}

function isAbortError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const name = (error as { name?: string }).name;
  return name === 'AbortError';
}

function hasVisibilityApi(): boolean {
  return typeof document !== 'undefined'
    && typeof document.addEventListener === 'function'
    && typeof document.removeEventListener === 'function';
}

function isDocumentHidden(): boolean {
  return hasVisibilityApi() && document.visibilityState === 'hidden';
}

export function startSmartPollLoop(
  poll: (ctx: SmartPollContext) => Promise<boolean | void> | boolean | void,
  opts: SmartPollOptions,
): SmartPollLoopHandle {
  const intervalMs = Math.max(1_000, Math.round(opts.intervalMs));
  const hiddenMultiplier = Math.max(1, opts.hiddenMultiplier ?? 10);
  const pauseWhenHidden = opts.pauseWhenHidden ?? false;
  const refreshOnVisible = opts.refreshOnVisible ?? true;
  const runImmediately = opts.runImmediately ?? false;
  const shouldRun = opts.shouldRun;
  const onError = opts.onError;
  const maxBackoffMultiplier = Math.max(1, opts.maxBackoffMultiplier ?? 4);
  const jitterFraction = Math.max(0, opts.jitterFraction ?? 0.1);
  const minIntervalMs = Math.max(250, opts.minIntervalMs ?? 1_000);
  const hiddenIntervalMs = opts.hiddenIntervalMs !== undefined
    ? Math.max(minIntervalMs, Math.round(opts.hiddenIntervalMs))
    : undefined;

  const visibilityDebounceMs = Math.max(0, opts.visibilityDebounceMs ?? 300);

  let active = true;
  let timerId: ReturnType<typeof setTimeout> | null = null;
  let visibilityDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  let inFlight = false;
  let backoffMultiplier = 1;
  let activeController: AbortController | null = null;

  const clearTimer = () => {
    if (!timerId) return;
    clearTimeout(timerId);
    timerId = null;
  };

  const baseDelayMs = (hidden: boolean): number | null => {
    if (hidden) {
      if (pauseWhenHidden) return null;
      return hiddenIntervalMs ?? (intervalMs * hiddenMultiplier);
    }
    return intervalMs * backoffMultiplier;
  };

  const computeDelay = (baseMs: number): number => {
    const jitterRange = baseMs * jitterFraction;
    const jittered = baseMs + ((Math.random() * 2 - 1) * jitterRange);
    return Math.max(minIntervalMs, Math.round(jittered));
  };

  const scheduleNext = () => {
    if (!active) return;
    clearTimer();
    const base = baseDelayMs(isDocumentHidden());
    if (base === null) return;
    timerId = setTimeout(() => {
      timerId = null;
      void runOnce('interval');
    }, computeDelay(base));
  };

  const runOnce = async (reason: SmartPollReason): Promise<void> => {
    if (!active) return;

    const hidden = isDocumentHidden();
    if (hidden && pauseWhenHidden) {
      scheduleNext();
      return;
    }
    if (shouldRun && !shouldRun()) {
      scheduleNext();
      return;
    }
    if (inFlight) {
      scheduleNext();
      return;
    }

    inFlight = true;
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    activeController = controller;

    try {
      const result = await poll({
        signal: controller?.signal,
        reason,
        isHidden: hidden,
      });

      if (result === false) {
        backoffMultiplier = Math.min(backoffMultiplier * 2, maxBackoffMultiplier);
      } else {
        backoffMultiplier = 1;
      }
    } catch (error) {
      if (!controller?.signal.aborted && !isAbortError(error)) {
        backoffMultiplier = Math.min(backoffMultiplier * 2, maxBackoffMultiplier);
        if (onError) onError(error);
      }
    } finally {
      if (activeController === controller) activeController = null;
      inFlight = false;
      scheduleNext();
    }
  };

  const clearVisibilityDebounce = () => {
    if (visibilityDebounceTimer) {
      clearTimeout(visibilityDebounceTimer);
      visibilityDebounceTimer = null;
    }
  };

  const handleVisibilityChange = () => {
    if (!active) return;
    const hidden = isDocumentHidden();

    if (hidden) {
      if (pauseWhenHidden) {
        clearTimer();
        activeController?.abort();
        return;
      }
      scheduleNext();
      return;
    }

    if (refreshOnVisible) {
      clearTimer();
      void runOnce('resume');
      return;
    }

    scheduleNext();
  };

  const onVisibilityChange = () => {
    if (!active) return;
    // Debounce rapid visibility toggles (e.g. fast alt-tab) to prevent
    // request bursts. Hidden→pause is applied immediately so we don't
    // keep polling after the tab disappears.
    if (visibilityDebounceMs > 0 && !isDocumentHidden()) {
      clearVisibilityDebounce();
      visibilityDebounceTimer = setTimeout(handleVisibilityChange, visibilityDebounceMs);
      return;
    }
    handleVisibilityChange();
  };

  if (hasVisibilityApi()) {
    document.addEventListener('visibilitychange', onVisibilityChange);
  }

  if (runImmediately) {
    void runOnce('startup');
  } else {
    scheduleNext();
  }

  return {
    stop: () => {
      if (!active) return;
      active = false;
      clearTimer();
      clearVisibilityDebounce();
      activeController?.abort();
      activeController = null;
      if (hasVisibilityApi()) {
        document.removeEventListener('visibilitychange', onVisibilityChange);
      }
    },
    trigger: () => {
      if (!active) return;
      clearTimer();
      void runOnce('manual');
    },
    isActive: () => active,
  };
}

function isLocalOnlyApiTarget(target: string): boolean {
  // Security boundary: endpoints that can carry local secrets must use the
  // `/api/local-*` prefix so cloud fallback is automatically blocked.
  return target.startsWith('/api/local-');
}

function isKeyFreeApiTarget(target: string): boolean {
  return target.startsWith('/api/register-interest');
}

async function fetchLocalWithStartupRetry(
  nativeFetch: typeof window.fetch,
  localUrl: string,
  init?: RequestInit,
): Promise<Response> {
  const maxAttempts = 4;
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await nativeFetch(localUrl, init);
    } catch (error) {
      lastError = error;

      // Preserve caller intent for aborted requests.
      if (init?.signal?.aborted) {
        throw error;
      }

      if (attempt === maxAttempts) {
        break;
      }

      await sleep(125 * attempt);
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error('Local API unavailable');
}

export function installRuntimeFetchPatch(): void {
  if (!isDesktopRuntime() || typeof window === 'undefined' || (window as unknown as Record<string, unknown>).__wmFetchPatched) {
    return;
  }

  const nativeFetch = window.fetch.bind(window);
  const localBase = getApiBaseUrl();
  let localApiToken: string | null = null;

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const target = getApiTargetFromRequestInput(input);
    const debug = localStorage.getItem('wm-debug-log') === '1';

    if (!target?.startsWith('/api/')) {
      if (debug) {
        const raw = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
        console.log(`[fetch] passthrough → ${raw.slice(0, 120)}`);
      }
      return nativeFetch(input, init);
    }

    if (!localApiToken) {
      try {
        const { tryInvokeTauri } = await import('@/services/tauri-bridge');
        localApiToken = await tryInvokeTauri<string>('get_local_api_token');
      } catch { /* token unavailable — sidecar may not require it */ }
    }

    const headers = new Headers(init?.headers);
    if (localApiToken) {
      headers.set('Authorization', `Bearer ${localApiToken}`);
    }
    const localInit = { ...init, headers };

    const localUrl = `${localBase}${target}`;
    if (debug) console.log(`[fetch] intercept → ${target}`);
    let allowCloudFallback = !isLocalOnlyApiTarget(target);

    if (allowCloudFallback && !isKeyFreeApiTarget(target)) {
      try {
        const { getSecretState, secretsReady } = await import('@/services/runtime-config');
        await Promise.race([secretsReady, new Promise<void>(r => setTimeout(r, 2000))]);
        const wmKeyState = getSecretState('WORLDMONITOR_API_KEY');
        if (!wmKeyState.present || !wmKeyState.valid) {
          allowCloudFallback = false;
        }
      } catch {
        allowCloudFallback = false;
      }
    }

    const cloudFallback = async () => {
      if (!allowCloudFallback) {
        throw new Error(`Cloud fallback blocked for ${target}`);
      }
      const cloudUrl = `${getRemoteApiBaseUrl()}${target}`;
      if (debug) console.log(`[fetch] cloud fallback → ${cloudUrl}`);
      const cloudHeaders = new Headers(init?.headers);
      if (/^\/api\/[^/]+\/v1\//.test(target)) {
        const { getRuntimeConfigSnapshot } = await import('@/services/runtime-config');
        const wmKeyValue = getRuntimeConfigSnapshot().secrets['WORLDMONITOR_API_KEY']?.value;
        if (wmKeyValue) {
          cloudHeaders.set('X-WorldMonitor-Key', wmKeyValue);
        }
      }
      return nativeFetch(cloudUrl, { ...init, headers: cloudHeaders });
    };

    try {
      const t0 = performance.now();
      const response = await fetchLocalWithStartupRetry(nativeFetch, localUrl, localInit);
      if (debug) console.log(`[fetch] ${target} → ${response.status} (${Math.round(performance.now() - t0)}ms)`);
      if (!response.ok) {
        if (!allowCloudFallback) {
          if (debug) console.log(`[fetch] local-only endpoint ${target} returned ${response.status}; skipping cloud fallback`);
          return response;
        }
        if (debug) console.log(`[fetch] local ${response.status}, falling back to cloud`);
        return cloudFallback();
      }
      return response;
    } catch (error) {
      if (debug) console.warn(`[runtime] Local API unavailable for ${target}`, error);
      if (!allowCloudFallback) {
        throw error;
      }
      return cloudFallback();
    }
  };

  (window as unknown as Record<string, unknown>).__wmFetchPatched = true;
}
