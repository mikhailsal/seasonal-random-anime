import { fetchWithRetry } from '../lib/net';
import type { FetchWithRetryOptions } from '../lib/net';
import type {
  Anime,
  PicturesResponse,
  RelationsResponse,
  SeasonAnimePageResponse,
  SeasonIndexResponse,
  SeasonName
} from '../lib/types';

export const JIKAN_BASE = 'https://api.jikan.moe/v4';

export type JikanOptions = Pick<
  FetchWithRetryOptions,
  'fetchImpl' | 'retries' | 'baseDelayMs' | 'timeoutMs' | 'onRetry'
>;

async function getJson<T>(url: string, options: JikanOptions = {}): Promise<T> {
  const res = await fetchWithRetry(url, options);
  return res.json() as Promise<T>;
}

export function getSeasonsIndex(options?: JikanOptions): Promise<SeasonIndexResponse> {
  return getJson<SeasonIndexResponse>(`${JIKAN_BASE}/seasons`, options);
}

export function getSeasonPage(
  year: number,
  season: SeasonName,
  params: { page?: number; limit?: number } & JikanOptions = {}
): Promise<SeasonAnimePageResponse> {
  const { page = 1, limit = 25, ...options } = params;
  const url = `${JIKAN_BASE}/seasons/${String(year)}/${season}?page=${String(page)}&limit=${String(limit)}`;
  return getJson<SeasonAnimePageResponse>(url, options);
}

export function getRelations(malId: number, options?: JikanOptions): Promise<RelationsResponse> {
  return getJson<RelationsResponse>(`${JIKAN_BASE}/anime/${String(malId)}/relations`, options);
}

export function getPictures(malId: number, options?: JikanOptions): Promise<PicturesResponse> {
  return getJson<PicturesResponse>(`${JIKAN_BASE}/anime/${String(malId)}/pictures`, options);
}

export interface LoadSeasonOptions extends JikanOptions {
  maxPages?: number;
  pageDelayMs?: number;
  sleep?: (ms: number) => Promise<void>;
}

const defaultSleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

/**
 * Progressively load a season: paginate up to `maxPages` pages of 25 items
 * with a gentle delay between pages (legacy parity: 5 pages, 350ms).
 */
export async function loadFullSeason(
  year: number,
  season: SeasonName,
  options: LoadSeasonOptions = {}
): Promise<Anime[]> {
  const { maxPages = 5, pageDelayMs = 350, sleep = defaultSleep, ...jikan } = options;
  const aggregated: Anime[] = [];
  let page = 1;
  let hasNext = true;
  while (hasNext && page <= maxPages) {
    const resp = await getSeasonPage(year, season, { page, limit: 25, ...jikan });
    aggregated.push(...resp.data);
    hasNext = resp.pagination?.has_next_page === true;
    page += 1;
    if (hasNext && page <= maxPages) await sleep(pageDelayMs);
  }
  return aggregated;
}
