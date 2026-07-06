import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { SEASON_LOAD_DEBOUNCE_MS, useSeasonData } from './useSeasonData';
import type { SeasonName } from '../lib/types';
import { makeAnime, makeFakeServices } from '../test/fixtures';
import type { AppServices } from '../services/context';
import { ServicesContext } from '../services/context';

interface Props {
  year: number;
  season: SeasonName;
}

function renderSeason(services: AppServices, initial: Props = { year: 2026, season: 'summer' }) {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <ServicesContext.Provider value={services}>{children}</ServicesContext.Provider>
  );
  return renderHook(({ year, season }: Props) => useSeasonData(year, season), {
    wrapper,
    initialProps: initial
  });
}

const flushDebounce = () =>
  act(() => new Promise((r) => setTimeout(r, SEASON_LOAD_DEBOUNCE_MS + 50)));

describe('useSeasonData', () => {
  it('loads and maps the season after the debounce window', async () => {
    const services = makeFakeServices({ season: [makeAnime({ mal_id: 5, title: 'Loaded' })] });
    const { result } = renderSeason(services);
    expect(result.current.loading).toBe(true);
    expect(result.current.items).toEqual([]);
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.items.map((i) => i.title)).toEqual(['Loaded']);
    expect(result.current.error).toBeNull();
  });

  it('debounces rapid year/season changes into a single request', async () => {
    const loadSeason = vi.fn<AppServices['loadSeason']>(() => Promise.resolve([makeAnime()]));
    const services = { ...makeFakeServices(), loadSeason };
    const { rerender } = renderSeason(services);
    rerender({ year: 2025, season: 'summer' });
    rerender({ year: 2024, season: 'winter' });
    await flushDebounce();
    expect(loadSeason).toHaveBeenCalledTimes(1);
    expect(loadSeason).toHaveBeenCalledWith(2024, 'winter');
  });

  it('returns to the loading state when the key changes after a completed load', async () => {
    const services = makeFakeServices();
    const { result, rerender } = renderSeason(services);
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    rerender({ year: 2020, season: 'fall' });
    expect(result.current.loading).toBe(true);
    expect(result.current.items).toEqual([]);
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
  });

  it('discards stale responses that resolve after a newer request started', async () => {
    let resolveSlow: ((value: ReturnType<typeof makeAnime>[]) => void) | null = null;
    const loadSeason = vi.fn((year: number) => {
      if (year === 2026) {
        return new Promise<ReturnType<typeof makeAnime>[]>((r) => {
          resolveSlow = r;
        });
      }
      return Promise.resolve([makeAnime({ title: 'Fresh' })]);
    });
    const services = { ...makeFakeServices(), loadSeason };
    const { result, rerender } = renderSeason(services);
    await flushDebounce();
    rerender({ year: 2025, season: 'summer' });
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    // The slow 2026 response arrives last but must not overwrite 2025 data.
    act(() => {
      resolveSlow?.([makeAnime({ title: 'Stale' })]);
    });
    await flushDebounce();
    expect(result.current.items.map((i) => i.title)).toEqual(['Fresh']);
  });

  it('exposes the error message and stops loading on failure', async () => {
    const services = {
      ...makeFakeServices(),
      loadSeason: () => Promise.reject(new Error('HTTP 429'))
    };
    const { result } = renderSeason(services);
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.error).toBe('HTTP 429');
    expect(result.current.items).toEqual([]);
  });

  it('falls back to a generic message for non-Error rejections', async () => {
    const services = {
      ...makeFakeServices(),
      // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors -- the generic-fallback path needs a non-Error rejection
      loadSeason: () => Promise.reject('boom')
    };
    const { result } = renderSeason(services);
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.error).toBe('Failed to load season data.');
  });
});
