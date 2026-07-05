import { toAnimeItem } from '../lib/mapAnime';
import type { Anime, AnimeItem } from '../lib/types';
import type { AppServices } from '../services/context';

export function makeAnime(overrides: Partial<Anime> = {}): Anime {
  return {
    mal_id: 1,
    url: 'https://myanimelist.net/anime/1',
    title: 'Test Anime',
    type: 'TV',
    episodes: 12,
    duration: '24 min per ep',
    score: 8.1,
    members: 120000,
    popularity: 42,
    synopsis: 'A test synopsis.',
    genres: [{ mal_id: 1, name: 'Action' }],
    images: {
      jpg: { image_url: 'https://cdn.test/1.jpg', large_image_url: 'https://cdn.test/1l.jpg' },
      webp: { image_url: 'https://cdn.test/1.webp', large_image_url: 'https://cdn.test/1l.webp' }
    },
    ...overrides
  };
}

export function makeItem(overrides: Partial<Anime> = {}): AnimeItem {
  return toAnimeItem(makeAnime(overrides));
}

export interface FakeServicesOptions {
  season?: Anime[];
  years?: number[];
  continuations?: Map<number, boolean>;
  images?: string[];
}

export function makeFakeServices(options: FakeServicesOptions = {}): AppServices {
  const { season = [makeAnime()], years = [2026, 2025], continuations, images } = options;
  return {
    getSeasonsIndex: () =>
      Promise.resolve({
        data: years.map((year) => ({ year, seasons: ['winter', 'spring', 'summer', 'fall'] }))
      }),
    loadSeason: () => Promise.resolve(season),
    isContinuation: (malId) => Promise.resolve(continuations?.get(malId) ?? false),
    loadImages: (item) =>
      Promise.resolve(images ?? item.images ?? ['https://cdn.test/fallback.jpg'])
  };
}
