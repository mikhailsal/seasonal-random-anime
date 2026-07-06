import { createContinuationChecker, hasPrequel } from './continuity';
import type { FetchLike } from '../lib/net';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

describe('continuity', () => {
  describe('hasPrequel', () => {
    it('detects a prequel relation with entries', () => {
      expect(
        hasPrequel({ data: [{ relation: 'Prequel', entry: [{ mal_id: 1, title: 'S1' }] }] })
      ).toBe(true);
    });

    it('ignores prequel relations without entries and other relations', () => {
      expect(hasPrequel({ data: [{ relation: 'Prequel', entry: [] }] })).toBe(false);
      expect(
        hasPrequel({ data: [{ relation: 'Sequel', entry: [{ mal_id: 2, title: 'S2' }] }] })
      ).toBe(false);
      expect(hasPrequel({ data: [] })).toBe(false);
    });
  });

  describe('createContinuationChecker', () => {
    it('caches results per MAL id', async () => {
      const fetchImpl = vi
        .fn<FetchLike>()
        .mockResolvedValue(
          jsonResponse({ data: [{ relation: 'Prequel', entry: [{ mal_id: 1, title: 'S1' }] }] })
        );
      const check = createContinuationChecker({ fetchImpl });
      await expect(check(10)).resolves.toBe(true);
      await expect(check(10)).resolves.toBe(true);
      expect(fetchImpl).toHaveBeenCalledTimes(1);
    });

    it('treats network failures as non-continuation without caching them', async () => {
      const fetchImpl = vi.fn<FetchLike>().mockRejectedValue(new Error('down'));
      const check = createContinuationChecker({ fetchImpl, retries: 1, baseDelayMs: 1 });
      await expect(check(11)).resolves.toBe(false);
      // The failure is not cached, so the next call re-checks the endpoint.
      await expect(check(11)).resolves.toBe(false);
      expect(fetchImpl).toHaveBeenCalledTimes(2);
    });

    it('recovers after a transient failure and then caches the success', async () => {
      const fetchImpl = vi
        .fn<FetchLike>()
        .mockRejectedValueOnce(new Error('down'))
        .mockResolvedValue(
          jsonResponse({ data: [{ relation: 'Prequel', entry: [{ mal_id: 1, title: 'S1' }] }] })
        );
      const check = createContinuationChecker({ fetchImpl, retries: 1, baseDelayMs: 1 });
      await expect(check(12)).resolves.toBe(false);
      await expect(check(12)).resolves.toBe(true);
      await expect(check(12)).resolves.toBe(true);
      expect(fetchImpl).toHaveBeenCalledTimes(2);
    });
  });
});
