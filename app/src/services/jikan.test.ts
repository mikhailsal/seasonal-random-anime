import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getSeasons, getSeason, JIKAN_BASE } from './jikan';

describe('jikan service', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('constructs correct URL for getSeasons and getSeason with limit', async () => {
    const seasonsPayload = { data: [{ year: 2024, seasons: ['summer'] }] };
    const seasonPagePayload = { data: [{ mal_id: 1, title: 'A' }], pagination: { has_next_page: false } };

    const fetchImpl = vi.fn((input: any) => {
      const url = String(input);
      if (url === `${JIKAN_BASE}/seasons`) {
        return Promise.resolve({ ok: true, status: 200, json: async () => seasonsPayload } as unknown as Response);
      }
      if (url === `${JIKAN_BASE}/seasons/2024/summer?limit=5`) {
        return Promise.resolve({ ok: true, status: 200, json: async () => seasonPagePayload } as unknown as Response);
      }
      return Promise.resolve({ ok: false, status: 404 } as unknown as Response);
    }) as unknown as (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

    const res1 = await getSeasons({ fetchImpl });
    expect(res1).toEqual(seasonsPayload);
    expect(fetchImpl).toHaveBeenCalledWith(`${JIKAN_BASE}/seasons`, expect.anything());

    const res2 = await getSeason(2024, 'summer', { limit: 5, fetchImpl });
    expect(res2).toEqual(seasonPagePayload);
    expect(fetchImpl).toHaveBeenCalledWith(`${JIKAN_BASE}/seasons/2024/summer?limit=5`, expect.anything());
  });

  it('surfaces Error("HTTP 503") after max retries when all attempts return 503', async () => {
    const fetchImpl = vi.fn(() => Promise.resolve({ ok: false, status: 503 } as unknown as Response)) as unknown as (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
    const onRetry = vi.fn();

    const p = getSeasons({ fetchImpl, retries: 3, baseDelayMs: 10, onRetry });

    // Create a promise that handles the rejection properly
    const resultPromise = p.catch(err => err);

    // initial attempt
    await Promise.resolve();
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(onRetry).toHaveBeenCalledTimes(1); // called when 503 detected on attempt 1

    // advance first backoff (10ms)
    await vi.advanceTimersByTimeAsync(10);
    await Promise.resolve();
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(onRetry).toHaveBeenCalledTimes(2); // called on attempt 2

    // advance second backoff (20ms)
    await vi.advanceTimersByTimeAsync(20);
    await Promise.resolve();
    expect(fetchImpl).toHaveBeenCalledTimes(3);

    // Now properly await the rejection
    const result = await resultPromise;
    expect(result).toBeInstanceOf(Error);
    expect((result as Error).message).toBe('HTTP 503');

    // onRetry should have been called for attempts 1 and 2 (not for final failed attempt)
    expect(onRetry).toHaveBeenCalledTimes(2);
  });

  it('passes retries/baseDelayMs/timeoutMs down to fetchWithRetry (observable via onRetry and signal)', async () => {
    const recorded: any[] = [];
    let call = 0;
    const fetchImpl = vi.fn((input: any, init?: any) => {
      call += 1;
      recorded.push({ input: String(input), init });
      // fail first call with network error, succeed second
      if (call === 1) return Promise.reject(new Error('network'));
      return Promise.resolve({ ok: true, status: 200, json: async () => ({ data: [] }) } as unknown as Response);
    }) as unknown as (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

    const onRetry = vi.fn();

    const p = getSeasons({ fetchImpl, retries: 2, baseDelayMs: 123, timeoutMs: 111, onRetry });

    // after first rejection, onRetry should be called
    await Promise.resolve();
    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(recorded.length).toBeGreaterThan(0);
    // ensure the init.signal was passed into fetchImpl
    expect(recorded[0].init).toBeDefined();
    expect(recorded[0].init.signal).toBeDefined();

    // advance backoff 123ms
    await vi.advanceTimersByTimeAsync(123);
    await Promise.resolve();

    const res = await p;
    expect(res).toBeDefined();
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });
});