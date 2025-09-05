export interface SelectionDeps {
  fetchRelations?: (malId: number) => Promise<{ data: { relation: string; entry: { mal_id: number; title: string }[] }[] }>;
}

export type RNG = () => number;

/**
 * Pick a random item from the source, with an optional dependency-based check to avoid continuations.
 * - If includeContinuations is true, returns any random element from the source (no network access).
 * - Otherwise, attempts to detect continuations via provided deps.fetchRelations and retries a few times.
 * - The function is pure w.r.t DOM; it does not render anything.
 */
export async function pickRandomConsideringContinuity<T extends { apiData?: any }>(
  source: T[],
  options?: { deps?: SelectionDeps; rng?: RNG; includeContinuations?: boolean }
): Promise<T> {
  const { deps, rng = Math.random, includeContinuations = false } = options ?? {};

  if (!source || source.length === 0) return null as any;

  if (includeContinuations) {
    return source[Math.floor(rng() * source.length)];
  }

  const maxAttempts = Math.min(20, Math.max(20, source.length * 2));
  for (let i = 0; i < maxAttempts; i++) {
    const candidate = source[Math.floor(rng() * source.length)];
    const malId = (candidate as any)?.apiData?.mal_id ?? (candidate as any)?.mal_id;
    let isCont = false;

    if (deps?.fetchRelations && malId != null) {
      try {
        const relResp = await deps.fetchRelations(malId);
        const hasPrequel = Array.isArray(relResp?.data)
          && relResp.data.some(rel => typeof rel?.relation === 'string' && rel.relation.toLowerCase() === 'prequel');
        isCont = hasPrequel;
      } catch {
        isCont = false;
      }
    }

    if (!isCont) return candidate;
    await new Promise(r => setTimeout(r, 150));
  }

  return source[Math.floor(rng() * source.length)];
}

export default pickRandomConsideringContinuity;