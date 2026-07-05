import type { AnimeItem, RNG } from './types';

export type ContinuationChecker = (malId: number) => Promise<boolean>;

export interface SelectionOptions {
  rng?: RNG;
  includeContinuations?: boolean;
  isContinuation?: ContinuationChecker;
  /** Delay between retry attempts (legacy: 150ms). Injectable for tests. */
  delayMs?: number;
  sleep?: (ms: number) => Promise<void>;
}

const defaultSleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

function randomOf<T>(source: readonly T[], rng: RNG): T {
  const index = Math.floor(rng() * source.length);
  return source[index] as T;
}

async function checkContinuation(
  item: AnimeItem,
  isContinuation: ContinuationChecker | undefined
): Promise<boolean> {
  const malId = item.apiData.mal_id;
  if (!isContinuation || malId == null) return false;
  try {
    return await isContinuation(malId);
  } catch {
    return false;
  }
}

/**
 * Pick a random anime; unless continuations are included, retry (up to 20
 * attempts, legacy parity) to avoid titles that have a prequel.
 */
export async function pickRandomConsideringContinuity(
  source: readonly AnimeItem[],
  options: SelectionOptions = {}
): Promise<AnimeItem | null> {
  const { rng = Math.random, includeContinuations = false, isContinuation } = options;
  const { delayMs = 150, sleep = defaultSleep } = options;
  if (source.length === 0) return null;
  if (includeContinuations) return randomOf(source, rng);

  const maxAttempts = Math.min(20, Math.max(20, source.length * 2));
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const candidate = randomOf(source, rng);
    const isCont = await checkContinuation(candidate, isContinuation);
    if (!isCont) return candidate;
    await sleep(delayMs);
  }
  return randomOf(source, rng);
}
