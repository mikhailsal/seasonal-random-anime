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

export function parseRetryAfterHeader(headerValue) {
  if (!headerValue) return undefined;
  const seconds = parseFloat(headerValue);
  if (!isNaN(seconds) && seconds >= 0) {
    return Math.ceil(seconds * 1000);
  }
  const dateMs = Date.parse(headerValue);
  if (!isNaN(dateMs)) {
    const diff = dateMs - Date.now();
    return diff > 0 ? diff : 0;
  }
  return undefined;
}

export async function parseResponseError(res) {
  const status = res.status;
  const statusText = res.statusText;
  const effectiveStatusText = statusText || (status === 429 ? 'Too Many Requests' : '');

  let responseBody = undefined;
  let detailMessage = null;

  try {
    const text = await res.clone().text();
    if (text) {
      try {
        const json = JSON.parse(text);
        responseBody = json;
        const message = typeof json.message === 'string' && json.message.trim() ? json.message.trim() : null;
        const error = typeof json.error === 'string' && json.error.trim() ? json.error.trim() : null;
        const type = typeof json.type === 'string' && json.type.trim() ? json.type.trim() : null;

        if (
          message &&
          error &&
          message !== error &&
          error !== statusText &&
          error !== effectiveStatusText
        ) {
          detailMessage = `${error} - ${message}`;
        } else if (message) {
          detailMessage = message;
        } else if (error && error !== effectiveStatusText) {
          detailMessage = error;
        } else if (type) {
          detailMessage = type;
        }
      } catch {
        const cleanText = text.replace(/<[^>]*>/g, '').trim();
        if (cleanText && cleanText.length > 0 && cleanText.length < 300) {
          detailMessage = cleanText;
        }
      }
    }
  } catch {
    // Ignore error reading body
  }

  let fullMessage;
  if (detailMessage) {
    fullMessage = effectiveStatusText
      ? `HTTP ${status} ${effectiveStatusText}: ${detailMessage}`
      : `HTTP ${status}: ${detailMessage}`;
  } else {
    fullMessage = effectiveStatusText
      ? `HTTP ${status} ${effectiveStatusText}`
      : `HTTP ${status}`;
  }

  const err = new Error(fullMessage);
  err.status = status;
  err.statusText = statusText;
  err.responseBody = responseBody;
  return err;
}

/**
 * Fetch JSON with timeout, selective retries, exponential backoff, and rate limit respect.
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

      const retryAfterMs = parseRetryAfterHeader(res.headers?.get?.('retry-after'));
      const err = await parseResponseError(res);
      lastErr = err;

      if (!retryOn.includes(res.status) || attempt === retries) {
        throw err;
      }

      onRetry?.(attempt + 1, err);
      const base = res.status >= 500 ? serverErrorBaseDelayMs : baseDelayMs;
      const calculatedBackoff = backoffMs(attempt, base, jitter, maxDelayMs);
      const min429Delay = res.status === 429 && baseDelayMs >= 100 ? 1000 : 0;
      const delayMs = Math.max(calculatedBackoff, retryAfterMs ?? 0, min429Delay);
      await delay(delayMs);
    } catch (e) {
      if (isAbortError(e)) {
        const abort = new Error('timeout');
        abort.name = 'AbortError';
        throw abort;
      }

      // Non-retryable / exhausted HTTP errors thrown above.
      if (e instanceof Error && (e.status || e.message.startsWith('HTTP '))) {
        throw e;
      }

      lastErr = e instanceof Error ? e : new Error(String(e));
      if (attempt === retries) break;

      onRetry?.(attempt + 1, lastErr);
      const calculatedBackoff = backoffMs(attempt, baseDelayMs, jitter, maxDelayMs);
      await delay(calculatedBackoff);
    } finally {
      clearTimeout(timer);
    }
  }

  throw lastErr;
}

export { DEFAULT_RETRY_ON };
