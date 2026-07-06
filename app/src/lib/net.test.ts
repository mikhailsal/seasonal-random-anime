import { fetchWithRetry } from './net';
import type { FetchLike } from './net';

function jsonResponse(status: number, body: unknown = {}): Response {
  return new Response(JSON.stringify(body), { status });
}

describe('fetchWithRetry', () => {
  it('returns the response on first success', async () => {
    const fetchImpl: FetchLike = vi.fn().mockResolvedValue(jsonResponse(200, { ok: true }));
    const res = await fetchWithRetry('https://x.test/', { fetchImpl });
    expect(res.status).toBe(200);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('retries on 429 and succeeds', async () => {
    const fetchImpl = vi
      .fn<FetchLike>()
      .mockResolvedValueOnce(jsonResponse(429))
      .mockResolvedValueOnce(jsonResponse(200));
    const onRetry = vi.fn();
    const res = await fetchWithRetry('https://x.test/', {
      fetchImpl,
      baseDelayMs: 1,
      onRetry
    });
    expect(res.status).toBe(200);
    expect(onRetry).toHaveBeenCalledWith(1, 429);
  });

  it('throws HTTP error after exhausting retries on retryable status', async () => {
    const fetchImpl: FetchLike = vi.fn().mockResolvedValue(jsonResponse(503));
    await expect(
      fetchWithRetry('https://x.test/', { fetchImpl, retries: 2, baseDelayMs: 1 })
    ).rejects.toThrow('HTTP 503');
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('does not retry on plain 404', async () => {
    const fetchImpl: FetchLike = vi.fn().mockResolvedValue(jsonResponse(404));
    await expect(fetchWithRetry('https://x.test/', { fetchImpl })).rejects.toThrow('HTTP 404');
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('retries network errors and eventually throws the last one', async () => {
    const fetchImpl: FetchLike = vi.fn().mockRejectedValue(new Error('ECONNRESET'));
    await expect(
      fetchWithRetry('https://x.test/', { fetchImpl, retries: 2, baseDelayMs: 1 })
    ).rejects.toThrow('ECONNRESET');
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('propagates timeout aborts without retrying', async () => {
    const abort = new Error('aborted');
    abort.name = 'AbortError';
    const fetchImpl: FetchLike = vi.fn().mockRejectedValue(abort);
    await expect(fetchWithRetry('https://x.test/', { fetchImpl })).rejects.toMatchObject({
      name: 'AbortError'
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('supports jitter in the backoff', async () => {
    const fetchImpl = vi
      .fn<FetchLike>()
      .mockResolvedValueOnce(jsonResponse(429))
      .mockResolvedValueOnce(jsonResponse(200));
    const res = await fetchWithRetry('https://x.test/', {
      fetchImpl,
      baseDelayMs: 1,
      jitter: true
    });
    expect(res.status).toBe(200);
  });
});
