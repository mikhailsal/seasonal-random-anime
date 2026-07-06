import type { Page, Route } from '@playwright/test';

const CORS_HEADERS = { 'access-control-allow-origin': '*' };

function fulfillJson(route: Route, json: unknown): Promise<void> {
  return route.fulfill({ json, headers: CORS_HEADERS });
}

interface AnimeFixture {
  mal_id: number;
  title: string;
  type: string;
  episodes: number | null;
  duration: string;
  genres: { mal_id: number; name: string }[];
  [key: string]: unknown;
}

function anime(overrides: Partial<AnimeFixture> & { mal_id: number; title: string }): AnimeFixture {
  return {
    url: `https://myanimelist.net/anime/${String(overrides.mal_id)}`,
    type: 'TV',
    episodes: 12,
    duration: '24 min per ep',
    score: 8.1,
    members: 120000,
    popularity: 42,
    synopsis: 'A test synopsis.',
    genres: [{ mal_id: 1, name: 'Action' }],
    studios: [{ mal_id: 10, name: 'Studio E2E' }],
    trailer: { url: 'https://youtube.com/watch?v=e2e' },
    images: {
      jpg: {
        image_url: 'https://cdn.test/img.jpg',
        large_image_url: 'https://cdn.test/imgl.jpg'
      }
    },
    aired: { from: '2026-07-01T00:00:00+00:00', to: null },
    ...overrides
  };
}

export const SEASON_FIXTURE: AnimeFixture[] = [
  anime({ mal_id: 1, title: 'Default Match' }),
  anime({
    mal_id: 2,
    title: 'Comedy Long Runner',
    episodes: 50,
    genres: [{ mal_id: 2, name: 'Comedy' }]
  }),
  anime({
    mal_id: 3,
    title: 'Horror Movie',
    type: 'Movie',
    episodes: 1,
    genres: [{ mal_id: 3, name: 'Horror' }]
  }),
  anime({ mal_id: 4, title: 'Short ONA', type: 'ONA', duration: '5 min per ep' })
];

const TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGNgYGBgAAAABQABh6FO1AAAAABJRU5ErkJggg==',
  'base64'
);

export interface MockJikanOptions {
  prequelIds?: number[];
}

/** Intercept all Jikan/CDN traffic with deterministic fixtures. */
export async function mockJikan(page: Page, options: MockJikanOptions = {}): Promise<void> {
  const prequelIds = new Set(options.prequelIds ?? []);

  await page.route('https://api.jikan.moe/v4/seasons', (route) =>
    fulfillJson(route, {
      data: [2026, 2025, 2024].map((year) => ({
        year,
        seasons: ['winter', 'spring', 'summer', 'fall']
      }))
    })
  );
  await page.route('https://api.jikan.moe/v4/seasons/**', (route) =>
    fulfillJson(route, { data: SEASON_FIXTURE, pagination: { has_next_page: false } })
  );
  await page.route(/https:\/\/api\.jikan\.moe\/v4\/anime\/(\d+)\/relations/, (route) => {
    const match = /anime\/(\d+)\/relations/.exec(route.request().url());
    const malId = Number(match?.[1] ?? 0);
    const data = prequelIds.has(malId)
      ? [{ relation: 'Prequel', entry: [{ mal_id: 100, title: 'Season 1' }] }]
      : [];
    return fulfillJson(route, { data });
  });
  await page.route(/https:\/\/api\.jikan\.moe\/v4\/anime\/\d+\/pictures/, (route) =>
    fulfillJson(route, {
      data: [
        { images: { jpg: { large_image_url: 'https://cdn.test/gallery1.jpg' } } },
        { images: { jpg: { large_image_url: 'https://cdn.test/gallery2.jpg' } } }
      ]
    })
  );
  await page.route('https://cdn.test/**', (route) =>
    route.fulfill({ contentType: 'image/png', body: TINY_PNG, headers: CORS_HEADERS })
  );
  await page.route('https://via.placeholder.com/**', (route) =>
    route.fulfill({ contentType: 'image/png', body: TINY_PNG, headers: CORS_HEADERS })
  );
}
