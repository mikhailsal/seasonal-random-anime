import { getPictures, getRelations, getSeasonPage, getSeasonsIndex, loadFullSeason } from './jikan';
import type { FetchLike } from '../lib/net';
import { makeAnime } from '../test/fixtures';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

describe('jikan service', () => {
  it('getSeasonsIndex hits /seasons', async () => {
    const fetchImpl = vi
      .fn<FetchLike>()
      .mockResolvedValue(jsonResponse({ data: [{ year: 2026, seasons: ['winter'] }] }));
    const res = await getSeasonsIndex({ fetchImpl });
    expect(res.data[0]?.year).toBe(2026);
    expect(fetchImpl).toHaveBeenCalledWith('https://api.jikan.moe/v4/seasons', expect.any(Object));
  });

  it('getSeasonPage builds page/limit query', async () => {
    const fetchImpl = vi.fn<FetchLike>().mockResolvedValue(jsonResponse({ data: [] }));
    await getSeasonPage(2026, 'summer', { page: 3, limit: 25, fetchImpl });
    expect(fetchImpl).toHaveBeenCalledWith(
      'https://api.jikan.moe/v4/seasons/2026/summer?page=3&limit=25',
      expect.any(Object)
    );
  });

  it('getRelations and getPictures target the anime endpoints', async () => {
    const fetchImpl = vi
      .fn<FetchLike>()
      .mockImplementation(() => Promise.resolve(jsonResponse({ data: [] })));
    await getRelations(42, { fetchImpl });
    await getPictures(42, { fetchImpl });
    expect(fetchImpl).toHaveBeenCalledWith(
      'https://api.jikan.moe/v4/anime/42/relations',
      expect.any(Object)
    );
    expect(fetchImpl).toHaveBeenCalledWith(
      'https://api.jikan.moe/v4/anime/42/pictures',
      expect.any(Object)
    );
  });

  describe('loadFullSeason', () => {
    it('aggregates pages until has_next_page is false', async () => {
      const fetchImpl = vi
        .fn<FetchLike>()
        .mockResolvedValueOnce(
          jsonResponse({ data: [makeAnime({ mal_id: 1 })], pagination: { has_next_page: true } })
        )
        .mockResolvedValueOnce(
          jsonResponse({ data: [makeAnime({ mal_id: 2 })], pagination: { has_next_page: false } })
        );
      const items = await loadFullSeason(2026, 'summer', {
        fetchImpl,
        sleep: () => Promise.resolve()
      });
      expect(items.map((a) => a.mal_id)).toEqual([1, 2]);
      expect(fetchImpl).toHaveBeenCalledTimes(2);
    });

    it('de-duplicates items by mal_id across pages, keeping the first occurrence', async () => {
      const first = makeAnime({ mal_id: 1, title: 'First Occurrence' });
      const duplicate = makeAnime({ mal_id: 1, title: 'Shifted Duplicate' });
      const fetchImpl = vi
        .fn<FetchLike>()
        .mockResolvedValueOnce(
          jsonResponse({
            data: [first, makeAnime({ mal_id: 2 })],
            pagination: { has_next_page: true }
          })
        )
        .mockResolvedValueOnce(
          jsonResponse({
            data: [duplicate, makeAnime({ mal_id: 3 })],
            pagination: { has_next_page: false }
          })
        );
      const items = await loadFullSeason(2026, 'summer', {
        fetchImpl,
        sleep: () => Promise.resolve()
      });
      expect(items.map((a) => a.mal_id)).toEqual([1, 2, 3]);
      expect(items[0]?.title).toBe('First Occurrence');
    });

    it('keeps items without a mal_id even if several appear', async () => {
      const fetchImpl = vi.fn<FetchLike>().mockResolvedValue(
        jsonResponse({
          data: [makeAnime({ mal_id: undefined }), makeAnime({ mal_id: undefined })],
          pagination: { has_next_page: false }
        })
      );
      const items = await loadFullSeason(2026, 'summer', {
        fetchImpl,
        sleep: () => Promise.resolve()
      });
      expect(items).toHaveLength(2);
    });

    it('caps pagination at maxPages (legacy: 5)', async () => {
      let page = 0;
      const fetchImpl = vi.fn<FetchLike>().mockImplementation(() => {
        page += 1;
        return Promise.resolve(
          jsonResponse({
            data: [makeAnime({ mal_id: page })],
            pagination: { has_next_page: true }
          })
        );
      });
      const items = await loadFullSeason(2026, 'summer', {
        fetchImpl,
        sleep: () => Promise.resolve()
      });
      expect(fetchImpl).toHaveBeenCalledTimes(5);
      expect(items.map((a) => a.mal_id)).toEqual([1, 2, 3, 4, 5]);
    });
  });
});
