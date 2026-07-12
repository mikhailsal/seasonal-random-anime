// @vitest-environment node
import { describe, it, expect, beforeAll } from 'vitest';
import { fetchWithRetry } from '../utils/fetchWithRetry.mjs';

const BASE = 'https://api.jikan.moe/v4';

const RETRY_OPTS = {
  retries: 5,
  baseDelayMs: 800,
  serverErrorBaseDelayMs: 2000,
  maxDelayMs: 8000,
  timeoutMs: 15000
};

const PROBE_OPTS = {
  retries: 2,
  baseDelayMs: 500,
  serverErrorBaseDelayMs: 1500,
  maxDelayMs: 4000,
  timeoutMs: 10000
};

async function probe(url) {
  try {
    await fetchWithRetry(url, PROBE_OPTS);
    return true;
  } catch {
    return false;
  }
}

const pause = (ms) => new Promise((r) => setTimeout(r, ms));

describe('Jikan API integration', () => {
  let seasonsUp = false;
  let currentSeasonUp = false;

  beforeAll(async () => {
    seasonsUp = await probe(`${BASE}/seasons`);
    // Brief pause to stay under Jikan's public rate limit (~3 req/s).
    await pause(400);
    currentSeasonUp = await probe(`${BASE}/seasons/now?limit=1`);
    if (!seasonsUp || !currentSeasonUp) {
      console.warn(
        `[jikan] skipping live assertions (seasons=${seasonsUp}, now=${currentSeasonUp})`
      );
    }
  }, 60000);

  it('seasons index returns non-empty data array', async ({ skip }) => {
    if (!seasonsUp) skip();
    await pause(350);
    const json = await fetchWithRetry(`${BASE}/seasons`, RETRY_OPTS);
    expect(Array.isArray(json?.data)).toBe(true);
    expect((json?.data ?? []).length).toBeGreaterThan(0);
  }, 60000);

  it('current season page returns items with title and images', async ({ skip }) => {
    if (!currentSeasonUp) skip();
    await pause(350);
    // Prefer /seasons/now: year/season scrapes frequently return 504 when MAL
    // refuses Jikan's connection, while "now" stays cache-friendly.
    const json = await fetchWithRetry(`${BASE}/seasons/now?limit=10`, {
      ...RETRY_OPTS,
      retries: 6,
      serverErrorBaseDelayMs: 2500
    });
    expect(Array.isArray(json?.data)).toBe(true);
    expect((json?.data ?? []).length).toBeGreaterThan(0);
    const item = json.data[0];
    expect(typeof item.title).toBe('string');
    // Images are nested; accept either jpg or webp presence.
    expect(!!(item.images && (item.images.jpg || item.images.webp))).toBe(true);
  }, 90000);
});
