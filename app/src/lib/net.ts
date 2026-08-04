export type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export interface FetchWithRetryOptions {
  /** Per-attempt timeout in milliseconds (default 10000). */
  timeoutMs?: number;
  /** Total attempts (default 3). */
  retries?: number;
  /** Base backoff in ms, doubled each attempt (default 500). */
  baseDelayMs?: number;
  /** Add random(0..baseDelayMs) to each delay (default false). */
  jitter?: boolean;
  /** HTTP statuses to retry on (default [429, 502, 503, 504]). */
  retryOn?: readonly number[];
  fetchImpl?: FetchLike;
  /** Invoked before sleeping when an attempt decides to retry. */
  onRetry?: (attempt: number, errorOrStatus: number | Error) => void;
}

export class HttpError extends Error {
  readonly status: number;
  readonly statusText?: string;
  readonly responseBody?: unknown;

  constructor(status: number, message: string, statusText?: string, responseBody?: unknown) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.statusText = statusText;
    this.responseBody = responseBody;
  }
}

type AttemptResult =
  | { ok: true; response: Response }
  | { ok: false; reason: Error; retryable: boolean; retryAfterMs?: number };

interface AttemptContext {
  fetchImpl: FetchLike;
  input: RequestInfo | URL;
  init: RequestInit;
  timeoutMs: number;
  retryOn: readonly number[];
}

const delay = (ms: number): Promise<void> => new Promise((res) => setTimeout(res, ms));

// A bare `fetch` reference throws "Illegal invocation" in browsers; keep it bound.
const boundFetch: FetchLike = (input, init) => fetch(input, init);

function isAbortError(err: unknown): boolean {
  return err instanceof Error && err.name === 'AbortError';
}

function abortError(): Error {
  const err = new Error('AbortError');
  err.name = 'AbortError';
  return err;
}

function backoffMs(attempt: number, baseDelayMs: number, jitter: boolean): number {
  const extra = jitter ? Math.floor(Math.random() * baseDelayMs) : 0;
  return baseDelayMs * 2 ** (attempt - 1) + extra;
}

export function parseRetryAfterHeader(headerValue: string | null | undefined): number | undefined {
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

export async function parseResponseError(response: Response): Promise<HttpError> {
  const status = response.status;
  const statusText = response.statusText;
  const effectiveStatusText = statusText || (status === 429 ? 'Too Many Requests' : '');

  let responseBody: unknown = undefined;
  let detailMessage: string | null = null;

  try {
    const text = await response.clone().text();
    if (text) {
      try {
        const json = JSON.parse(text) as Record<string, unknown>;
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
    // Ignore error reading response body
  }

  let fullMessage: string;
  if (detailMessage) {
    fullMessage = effectiveStatusText
      ? `HTTP ${status} ${effectiveStatusText}: ${detailMessage}`
      : `HTTP ${status}: ${detailMessage}`;
  } else {
    fullMessage = effectiveStatusText
      ? `HTTP ${status} ${effectiveStatusText}`
      : `HTTP ${status}`;
  }

  return new HttpError(status, fullMessage, statusText, responseBody);
}

async function fetchOnce(ctx: AttemptContext): Promise<Response> {
  const controller = new AbortController();
  const timeoutHandle = setTimeout(() => {
    controller.abort();
  }, ctx.timeoutMs);
  try {
    return await ctx.fetchImpl(ctx.input, { ...ctx.init, signal: controller.signal });
  } finally {
    clearTimeout(timeoutHandle);
  }
}

async function attemptFetch(ctx: AttemptContext): Promise<AttemptResult> {
  try {
    const response = await fetchOnce(ctx);
    if (response.ok) return { ok: true, response };

    const retryAfterMs = parseRetryAfterHeader(response.headers?.get?.('retry-after'));
    const error = await parseResponseError(response);

    return {
      ok: false,
      reason: error,
      retryable: ctx.retryOn.includes(response.status),
      retryAfterMs
    };
  } catch (err) {
    if (isAbortError(err)) throw abortError();
    const error = err instanceof Error ? err : new Error(String(err));
    return { ok: false, reason: error, retryable: true };
  }
}

interface RetryPlan {
  retries: number;
  baseDelayMs: number;
  jitter: boolean;
  onRetry?: FetchWithRetryOptions['onRetry'];
}

function splitOptions(
  input: RequestInfo | URL,
  init: (RequestInit & FetchWithRetryOptions) | undefined
): { ctx: AttemptContext; plan: RetryPlan } {
  const {
    timeoutMs = 10000,
    retries = 3,
    baseDelayMs = 500,
    jitter = false,
    retryOn = [429, 502, 503, 504],
    fetchImpl = boundFetch,
    onRetry,
    ...fetchInit
  } = init ?? {};
  return {
    ctx: { fetchImpl, input, init: fetchInit, timeoutMs, retryOn },
    plan: { retries, baseDelayMs, jitter, onRetry }
  };
}

/**
 * Perform a fetch with abort/timeout support, exponential backoff, rate limit respect, and retries.
 * Non-retryable HTTP statuses or exhausted retries throw `HttpError` containing API error details.
 */
export async function fetchWithRetry(
  input: RequestInfo | URL,
  init?: RequestInit & FetchWithRetryOptions
): Promise<Response> {
  const { ctx, plan } = splitOptions(input, init);
  let lastReason: Error = new Error('Unknown fetch error');
  for (let attempt = 1; attempt <= plan.retries; attempt++) {
    const result = await attemptFetch(ctx);
    if (result.ok) return result.response;
    lastReason = result.reason;
    if (!result.retryable || attempt === plan.retries) break;
    plan.onRetry?.(attempt, result.reason);

    const backoff = backoffMs(attempt, plan.baseDelayMs, plan.jitter);
    const min429Delay = result.reason instanceof HttpError && result.reason.status === 429 && plan.baseDelayMs >= 100 ? 1000 : 0;
    const delayMs = Math.max(backoff, result.retryAfterMs ?? 0, min429Delay);
    await delay(delayMs);
  }
  throw lastReason;
}
