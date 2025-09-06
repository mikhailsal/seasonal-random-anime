import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchWithRetry } from './net';

describe('fetchWithRetry', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('retries on 429 twice then succeeds and calls onRetry with statuses', async () => {
    let call = 0;
    const successResp = { ok: true, status: 200, json: async () => ({ ok: true }) };

    const rawFetchImpl = (input: any, init?: any) => {
      call += 1;
      if (call <= 2) {
        return Promise.resolve({ ok: false, status: 429 } as unknown as Response);
      }
      return Promise.resolve(successResp as unknown as Response);
    };
    const fetchImpl = vi.fn(rawFetchImpl) as unknown as (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

    const onRetry = vi.fn();

    const p = fetchWithRetry('http://example', {
      fetchImpl,
      retries: 3,
      baseDelayMs: 500,
      jitter: false,
      onRetry,
    });

    // First attempt -> 429 -> onRetry should have been called once
    await Promise.resolve();
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(onRetry).toHaveBeenCalledWith(1, 429);

    // Advance first backoff (500ms)
    await vi.advanceTimersByTimeAsync(500);
    await Promise.resolve();

    // Second attempt -> 429 -> onRetry called second time
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(onRetry).toHaveBeenCalledTimes(2);
    expect(onRetry).toHaveBeenCalledWith(2, 429);

    // Advance second backoff (1000ms)
    await vi.advanceTimersByTimeAsync(1000);
    await Promise.resolve();

    // Third attempt -> success
    expect(fetchImpl).toHaveBeenCalledTimes(3);

    const res = await p;
    expect(res).toBeDefined();
    expect(onRetry).toHaveBeenCalledTimes(2);
  });

  it('does not retry on 400 and throws HTTP 400', async () => {
    // This test doesn't need fake timers - disable them for this specific test
    vi.useRealTimers();

    const rawFetchImpl = () => Promise.resolve({ ok: false, status: 400 } as unknown as Response);
    const fetchImpl = vi.fn(rawFetchImpl) as unknown as (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

    try {
      await fetchWithRetry('http://example', {
        fetchImpl,
        retries: 3,
        baseDelayMs: 10,
      });
      throw new Error('Expected to throw');
    } catch (error: any) {
      expect(error.message).toBe('HTTP 400');
    }

    expect(fetchImpl).toHaveBeenCalledTimes(1);

    // Restore fake timers for other tests
    vi.useFakeTimers();
  });

  it('aborts on timeoutMs and results in AbortError', async () => {
    // fetchImpl that listens to signal and rejects when aborted
    const rawFetchImpl = (input: any, init?: any) => {
      return new Promise((_res, rej) => {
        const signal = init?.signal;
        if (signal) {
          if (signal.aborted) {
            const e = new Error('AbortError') as any;
            e.name = 'AbortError';
            return rej(e);
          }
          signal.addEventListener('abort', () => {
            const e = new Error('AbortError') as any;
            e.name = 'AbortError';
            rej(e);
          });
        }
        // never resolve, simulating a hanging request
      });
    };
    const fetchImpl = vi.fn(rawFetchImpl) as unknown as (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

    const p = fetchWithRetry('http://example', {
      fetchImpl,
      timeoutMs: 100,
      retries: 2,
      baseDelayMs: 10,
    });

    // Create a promise that handles the rejection properly
    const resultPromise = p.catch(err => err);

    // advance time to trigger timeout abort
    await vi.advanceTimersByTimeAsync(100);
    await Promise.resolve();

    // Now properly await the rejection
    const result = await resultPromise;
    expect(result).toMatchObject({ name: 'AbortError' });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('retries on network error (rejected fetch) then succeeds', async () => {
    let attempt = 0;
    const rawFetchImpl = () => {
      attempt += 1;
      if (attempt === 1) {
        return Promise.reject(new Error('network'));
      }
      return Promise.resolve({ ok: true, status: 200, json: async () => ({}) } as unknown as Response);
    };
    const fetchImpl = vi.fn(rawFetchImpl) as unknown as (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

    const onRetry = vi.fn();

    const p = fetchWithRetry('http://example', {
      fetchImpl,
      retries: 2,
      baseDelayMs: 250,
      jitter: false,
      onRetry,
    });

    // after first rejection, onRetry should be called and backoff scheduled (250)
    await Promise.resolve();
    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(onRetry.mock.calls[0][1]).toBeInstanceOf(Error);

    await vi.advanceTimersByTimeAsync(250);
    await Promise.resolve();

    const res = await p;
    expect(res).toBeDefined();
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });
});