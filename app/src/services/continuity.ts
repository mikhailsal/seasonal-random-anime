import type { RelationsResponse } from '../lib/types';
import type { ContinuationChecker } from '../lib/selection';
import { getRelations } from './jikan';
import type { JikanOptions } from './jikan';

export function hasPrequel(relations: RelationsResponse): boolean {
  return relations.data.some(
    (rel) => rel.relation.toLowerCase() === 'prequel' && rel.entry.length > 0
  );
}

/**
 * Create a memoized continuation checker backed by the Jikan relations
 * endpoint (legacy parity: cache by MAL id, treat errors as "not a continuation").
 */
export function createContinuationChecker(options: JikanOptions = {}): ContinuationChecker {
  const cache = new Map<number, boolean>();
  return async (malId: number): Promise<boolean> => {
    const cached = cache.get(malId);
    if (cached !== undefined) return cached;
    let isCont: boolean;
    try {
      isCont = hasPrequel(await getRelations(malId, options));
    } catch {
      isCont = false;
    }
    cache.set(malId, isCont);
    return isCont;
  };
}
