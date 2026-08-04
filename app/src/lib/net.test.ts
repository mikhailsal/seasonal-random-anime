import { fetchWithRetry, parseResponseError, parseRetryAfterHeader, HttpError } from './net';
import type { FetchLike } from './net';

function jsonResponse(status: number, body: unknown = {}, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), { status, headers });
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
    expect(onRetry).toHaveBeenCalledWith(1, expect.objectContaining({ status: 429 }));
  });

  it('throws detailed HTTP error after exhausting retries on retryable status', async () => {
    const fetchImpl: FetchLike = vi.fn().mockResolvedValue(
      jsonResponse(503, { status: 503, type: 'ServiceUnavailable', message: 'Jikan API is under maintenance' })
    );
    await expect(
      fetchWithRetry('https://x.test/', { fetchImpl, retries: 2, baseDelayMs: 1 })
    ).rejects.toThrow('HTTP 503: Jikan API is under maintenance');
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('does not retry on plain 404 and includes details', async () => {
    const fetchImpl: FetchLike = vi.fn().mockResolvedValue(
      jsonResponse(404, { message: 'Anime not found' })
    );
    await expect(fetchWithRetry('https://x.test/', { fetchImpl })).rejects.toThrow('HTTP 404: Anime not found');
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

  it('respects Retry-After headers when retrying on 429', async () => {
    const fetchImpl = vi
      .fn<FetchLike>()
      .mockResolvedValueOnce(jsonResponse(429, { message: 'You are being rate limited.' }, { 'retry-after': '1' }))
      .mockResolvedValueOnce(jsonResponse(200));
    const start = Date.now();
    const res = await fetchWithRetry('https://x.test/', {
      fetchImpl,
      baseDelayMs: 1
    });
    const elapsed = Date.now() - start;
    expect(res.status).toBe(200);
    // Should have waited at least ~1000ms due to Retry-After: 1
    expect(elapsed).toBeGreaterThanOrEqual(900);
  });
});

describe('parseRetryAfterHeader', () => {
  it('parses numeric seconds', () => {
    expect(parseRetryAfterHeader('3')).toBe(3000);
    expect(parseRetryAfterHeader('0.5')).toBe(500);
    expect(parseRetryAfterHeader('0')).toBe(0);
  });

  it('returns undefined for invalid or empty inputs', () => {
    expect(parseRetryAfterHeader(null)).toBeUndefined();
    expect(parseRetryAfterHeader(undefined)).toBeUndefined();
    expect(parseRetryAfterHeader('')).toBeUndefined();
    expect(parseRetryAfterHeader('invalid')).toBeUndefined();
  });
});

describe('parseResponseError', () => {
  it('extracts message and error fields from JSON', async () => {
    const res = jsonResponse(429, {
      status: 429,
      type: 'RateLimitException',
      message: 'You are being rate limited.',
      error: 'Too Many Requests'
    });
    const err = await parseResponseError(res);
    expect(err).toBeInstanceOf(HttpError);
    expect(err.status).toBe(429);
    expect(err.message).toBe('HTTP 429 Too Many Requests: You are being rate limited.');
  });

  it('handles JSON with only message field', async () => {
    const res = jsonResponse(500, { message: 'Database connection failed' });
    const err = await parseResponseError(res);
    expect(err.message).toBe('HTTP 500: Database connection failed');
  });

  it('handles HTML/text fallback responses', async () => {
    const res = new Response('<html><body>Service Temporarily Unavailable</body></html>', { status: 503 });
    const err = await parseResponseError(res);
    expect(err.message).toBe('HTTP 503: Service Temporarily Unavailable');
  });
});
