// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import { fetchWithRetry } from '../utils/fetchWithRetry.mjs';

function jsonResponse(status, body = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

describe('fetchWithRetry', () => {
  it('returns parsed JSON on first success', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(200, { ok: true }));
    const json = await fetchWithRetry('https://x.test/', { fetchImpl });
    expect(json).toEqual({ ok: true });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('retries on 429 and succeeds', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(429))
      .mockResolvedValueOnce(jsonResponse(200, { data: [1] }));
    const onRetry = vi.fn();
    const json = await fetchWithRetry('https://x.test/', {
      fetchImpl,
      baseDelayMs: 1,
      onRetry
    });
    expect(json).toEqual({ data: [1] });
    expect(onRetry).toHaveBeenCalledWith(1, expect.objectContaining({ message: 'HTTP 429 Too Many Requests' }));
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('retries on 504 with server-error backoff base', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(504))
      .mockResolvedValueOnce(jsonResponse(200, { data: [] }));
    const onRetry = vi.fn();
    const json = await fetchWithRetry('https://x.test/', {
      fetchImpl,
      baseDelayMs: 1,
      serverErrorBaseDelayMs: 2,
      onRetry
    });
    expect(json).toEqual({ data: [] });
    expect(onRetry).toHaveBeenCalledWith(1, expect.objectContaining({ message: 'HTTP 504' }));
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('throws after exhausting retries on 503', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(503));
    await expect(
      fetchWithRetry('https://x.test/', { fetchImpl, retries: 2, baseDelayMs: 1, serverErrorBaseDelayMs: 1 })
    ).rejects.toThrow('HTTP 503');
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });

  it('does not retry on plain 404', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(404));
    await expect(fetchWithRetry('https://x.test/', { fetchImpl, retries: 3 })).rejects.toThrow(
      'HTTP 404'
    );
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('retries network errors then throws the last one', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error('ECONNRESET'));
    await expect(
      fetchWithRetry('https://x.test/', { fetchImpl, retries: 2, baseDelayMs: 1 })
    ).rejects.toThrow('ECONNRESET');
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });

  it('does not retry AbortError timeouts', async () => {
    const abort = new Error('aborted');
    abort.name = 'AbortError';
    const fetchImpl = vi.fn().mockRejectedValue(abort);
    await expect(fetchWithRetry('https://x.test/', { fetchImpl, retries: 3 })).rejects.toMatchObject({
      name: 'AbortError',
      message: 'timeout'
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
});
