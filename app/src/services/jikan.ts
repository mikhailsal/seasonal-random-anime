import { fetchWithRetry, FetchWithRetryOptions } from '../lib/net';
import type { SeasonIndexResponse, SeasonAnimePageResponse } from '../lib/types';

export const JIKAN_BASE = 'https://api.jikan.moe/v4';

export type JikanOptions = {
  fetchImpl?: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
  retries?: number;
  baseDelayMs?: number;
  timeoutMs?: number;
  // expose onRetry for tests/observability
  onRetry?: (attempt: number, errOrStatus: number | Error) => void;
};

export async function getSeasons(options?: JikanOptions): Promise<SeasonIndexResponse> {
  const { fetchImpl, retries, baseDelayMs, timeoutMs, onRetry } = options || {};
  const res = await fetchWithRetry(`${JIKAN_BASE}/seasons`, {
    fetchImpl,
    retries,
    baseDelayMs,
    timeoutMs,
    onRetry,
  } as FetchWithRetryOptions);
  return res.json() as Promise<SeasonIndexResponse>;
}

export async function getSeason(
  year: number,
  season: 'winter' | 'spring' | 'summer' | 'fall',
  params?: { limit?: number } & JikanOptions
): Promise<SeasonAnimePageResponse> {
  const { limit } = params || {};
  const { fetchImpl, retries, baseDelayMs, timeoutMs, onRetry } = params || {};
  const qs = typeof limit === 'number' ? `?limit=${encodeURIComponent(String(limit))}` : '';
  const res = await fetchWithRetry(`${JIKAN_BASE}/seasons/${year}/${season}${qs}`, {
    fetchImpl,
    retries,
    baseDelayMs,
    timeoutMs,
    onRetry,
  } as FetchWithRetryOptions);
  return res.json() as Promise<SeasonAnimePageResponse>;
}