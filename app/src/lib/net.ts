/**
 * Generic retrying fetch utility for the app.
 *
 * Usage:
 * import { fetchWithRetry } from './lib/net';
 */
export type FetchWithRetryOptions = {
  timeoutMs?: number;
  retries?: number;
  baseDelayMs?: number;
  jitter?: boolean;
  retryOn?: number[];
  fetchImpl?: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
  onRetry?: (attempt: number, errorOrStatus: number | Error) => void;
};

function defaultFetch(input: RequestInfo | URL, init?: RequestInit) {
  return fetch(input, init);
}

function delay(ms: number) {
  return new Promise<void>((res) => setTimeout(res, ms));
}

/**
 * Perform a fetch request with abort/timeout support, exponential backoff and retries.
 *
 * - timeoutMs: per-attempt timeout in milliseconds (default 10000)
 * - retries: total attempts (default 3)
 * - baseDelayMs: base backoff in ms (default 500)
 * - jitter: add random(0..baseDelayMs) to each delay (default false)
 * - retryOn: list of HTTP statuses to retry on (default [429,502,503,504])
 *
 * The function will not retry on 4xx responses unless they're included in retryOn.
 * Network errors (rejected fetch) will be retried (except AbortError / timeout abort).
 *
 * onRetry is invoked when an attempt decides to retry with (attemptNumber, statusOrError).
 */
export async function fetchWithRetry(
  input: RequestInfo | URL,
  init?: RequestInit & FetchWithRetryOptions
): Promise<Response> {
  const {
    timeoutMs = 10000,
    retries = 3,
    baseDelayMs = 500,
    jitter = false,
    retryOn = [429, 502, 503, 504],
    fetchImpl = defaultFetch,
    onRetry,
    // Remove our custom props from the init passed to fetch
    ...fetchInitRest
  } = (init || {}) as any;

  let lastError: Error | null = null;
  let lastStatus: number | null = null;

  for (let attempt = 1; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const signal = controller.signal;
    const timeoutHandle = setTimeout(() => controller.abort(), timeoutMs);

    let response: Response | null = null;

    try {
      response = await fetchImpl(input, { ...(fetchInitRest as RequestInit), signal });
      clearTimeout(timeoutHandle);
    } catch (err: any) {
      clearTimeout(timeoutHandle);

      // If aborted due to timeout, propagate abort (do not retry)
      if (err && (err.name === 'AbortError' || err instanceof DOMException && (err as DOMException).name === 'AbortError')) {
        // normalize message
        const abortErr = new Error('AbortError');
        (abortErr as any).name = 'AbortError';
        throw abortErr;
      }

      // Network error - retry unless attempts exhausted
      lastError = err instanceof Error ? err : new Error(String(err));

      // Decide whether to retry: only retry if we have more attempts left
      if (attempt < retries) {
        onRetry?.(attempt, lastError);
        const backoff = baseDelayMs * Math.pow(2, attempt - 1);
        const extra = jitter ? Math.floor(Math.random() * baseDelayMs) : 0;
        await delay(backoff + extra);
        continue;
      }

      // Exhausted attempts -> throw last network error
      throw lastError;
    }

    if (response && (response as any).ok) {
      return response;
    }

    const status = (response as any).status;
    lastStatus = status;

    // If status is explicitly retryable
    if (retryOn.includes(status)) {
      // compute delay only if we will attempt again
      if (attempt < retries) {
        // call onRetry before sleeping/retrying
        onRetry?.(attempt, status);
        const backoff = baseDelayMs * Math.pow(2, attempt - 1);
        const extra = jitter ? Math.floor(Math.random() * baseDelayMs) : 0;
        await delay(backoff + extra);
        continue;
      }
      // exhausted attempts -> throw HTTP error
      throw new Error(`HTTP ${status}`);
    }

    // Do not retry on other 4xx
    if (status >= 400 && status < 500) {
      const error = new Error(`HTTP ${status}`);
      throw error;
    }

    // Other statuses (non-ok, non-4xx) -> treat as error and do not retry unless explicitly listed
    throw new Error(`HTTP ${status}`);
  }

  // Defensive fallback (shouldn't reach here)
  if (lastStatus != null) throw new Error(`HTTP ${lastStatus}`);
  throw lastError ?? new Error('Unknown fetch error');
}