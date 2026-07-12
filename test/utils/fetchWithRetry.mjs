const DEFAULT_RETRY_ON = Object.freeze([429, 502, 503, 504]);

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function isAbortError(err) {
  return err instanceof Error && err.name === 'AbortError';
}

function backoffMs(attempt, baseDelayMs, jitter, maxDelayMs) {
  const exponential = Math.min(baseDelayMs * 2 ** attempt, maxDelayMs);
  if (!jitter) return exponential;
  return Math.min(exponential + Math.floor(Math.random() * baseDelayMs), maxDelayMs);
}

function httpError(status) {
  return new Error(status === 429 ? 'HTTP 429 Too Many Requests' : `HTTP ${status}`);
}

/**
 * Fetch JSON with timeout, selective retries, and exponential backoff.
 * Retries only on configured statuses (default 429/502/503/504) and network errors.
 * Non-retryable HTTP statuses (e.g. 404) fail immediately. Timeouts (AbortError) are not retried.
 *
 * @param {string} url
 * @param {object} [options]
 * @param {number} [options.retries=5] Extra attempts after the first (total = retries + 1).
 * @param {number} [options.baseDelayMs=400] Backoff base for 429 / network errors.
 * @param {number} [options.serverErrorBaseDelayMs=2000] Backoff base for 5xx responses.
 * @param {number} [options.maxDelayMs=8000] Cap on any single backoff delay.
 * @param {number} [options.timeoutMs=15000] Per-attempt timeout in ms.
 * @param {readonly number[]} [options.retryOn] HTTP statuses that trigger a retry.
 * @param {boolean} [options.jitter=false] Add 0..baseDelayMs jitter to each delay.
 * @param {typeof fetch} [options.fetchImpl] Injectable fetch (for unit tests).
 * @param {(attempt: number, err: Error) => void} [options.onRetry]
 * @returns {Promise<any>} Parsed JSON body
 */
export async function fetchWithRetry(
  url,
  {
    retries = 5,
    baseDelayMs = 400,
    serverErrorBaseDelayMs = 2000,
    maxDelayMs = 8000,
    timeoutMs = 15000,
    retryOn = DEFAULT_RETRY_ON,
    jitter = false,
    fetchImpl = globalThis.fetch.bind(globalThis),
    onRetry
  } = {}
) {
  let lastErr = new Error('fetchWithRetry failed without an error');

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetchImpl(url, { signal: controller.signal });

      if (res.ok) {
        return await res.json();
      }

      const err = httpError(res.status);
      lastErr = err;

      if (!retryOn.includes(res.status) || attempt === retries) {
        throw err;
      }

      onRetry?.(attempt + 1, err);
      const base = res.status >= 500 ? serverErrorBaseDelayMs : baseDelayMs;
      await delay(backoffMs(attempt, base, jitter, maxDelayMs));
    } catch (e) {
      if (isAbortError(e)) {
        const abort = new Error('timeout');
        abort.name = 'AbortError';
        throw abort;
      }

      // Non-retryable / exhausted HTTP errors thrown above.
      if (e instanceof Error && e.message.startsWith('HTTP ')) {
        throw e;
      }

      lastErr = e instanceof Error ? e : new Error(String(e));
      if (attempt === retries) break;

      onRetry?.(attempt + 1, lastErr);
      await delay(backoffMs(attempt, baseDelayMs, jitter, maxDelayMs));
    } finally {
      clearTimeout(timer);
    }
  }

  throw lastErr;
}

export { DEFAULT_RETRY_ON };
