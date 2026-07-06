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

type AttemptResult =
  { ok: true; response: Response } | { ok: false; reason: number | Error; retryable: boolean };

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
    return {
      ok: false,
      reason: response.status,
      retryable: ctx.retryOn.includes(response.status)
    };
  } catch (err) {
    // Timeout aborts propagate immediately; network errors are retryable.
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

function toThrowable(reason: number | Error): Error {
  return typeof reason === 'number' ? new Error(`HTTP ${String(reason)}`) : reason;
}

/**
 * Perform a fetch with abort/timeout support, exponential backoff and retries.
 * Non-retryable HTTP statuses (e.g. plain 4xx) throw immediately as `HTTP <status>`.
 */
export async function fetchWithRetry(
  input: RequestInfo | URL,
  init?: RequestInit & FetchWithRetryOptions
): Promise<Response> {
  const { ctx, plan } = splitOptions(input, init);
  let lastReason: number | Error = new Error('Unknown fetch error');
  for (let attempt = 1; attempt <= plan.retries; attempt++) {
    const result = await attemptFetch(ctx);
    if (result.ok) return result.response;
    lastReason = result.reason;
    if (!result.retryable || attempt === plan.retries) break;
    plan.onRetry?.(attempt, result.reason);
    await delay(backoffMs(attempt, plan.baseDelayMs, plan.jitter));
  }
  throw toThrowable(lastReason);
}
