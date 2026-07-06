import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { createDefaultServices, ServicesContext, useServices } from './context';
import { makeAnime, makeFakeServices, makeItem } from '../test/fixtures';

function jikanRouter(url: string): Response {
  if (url.endsWith('/seasons')) {
    return Response.json({ data: [{ year: 2026, seasons: ['summer'] }] });
  }
  if (url.includes('/relations')) {
    return Response.json({
      data: [{ relation: 'Prequel', entry: [{ mal_id: 99, title: 'S1' }] }]
    });
  }
  if (url.includes('/pictures')) {
    return Response.json({
      data: [{ images: { jpg: { large_image_url: 'https://cdn.test/extra.jpg' } } }]
    });
  }
  if (url.includes('/seasons/')) {
    return Response.json({
      data: [makeAnime({ mal_id: 1 })],
      pagination: { has_next_page: false }
    });
  }
  throw new Error(`Unexpected URL: ${url}`);
}

describe('useServices', () => {
  it('throws when no provider is mounted', () => {
    expect(() => renderHook(() => useServices())).toThrow('ServicesContext is not provided');
  });

  it('returns the provided services', () => {
    const services = makeFakeServices();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <ServicesContext.Provider value={services}>{children}</ServicesContext.Provider>
    );
    const { result } = renderHook(() => useServices(), { wrapper });
    expect(result.current).toBe(services);
  });
});

describe('createDefaultServices', () => {
  beforeEach(() => {
    const toUrl = (input: RequestInfo | URL): string => {
      if (typeof input === 'string') return input;
      return input instanceof URL ? input.href : input.url;
    };
    vi.stubGlobal(
      'fetch',
      vi.fn((input: RequestInfo | URL) => Promise.resolve(jikanRouter(toUrl(input))))
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('wires each service to the corresponding Jikan endpoint', async () => {
    const services = createDefaultServices();
    const index = await services.getSeasonsIndex();
    expect(index.data[0]?.year).toBe(2026);

    const season = await services.loadSeason(2026, 'summer');
    expect(season.map((a) => a.mal_id)).toEqual([1]);

    await expect(services.isContinuation(1)).resolves.toBe(true);

    const images = await services.loadImages(makeItem({ mal_id: 1 }));
    expect(images.length).toBeGreaterThan(0);
    expect(images).toContain('https://cdn.test/extra.jpg');
  });
});
