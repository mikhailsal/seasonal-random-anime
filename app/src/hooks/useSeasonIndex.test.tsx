import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { fallbackYears, useSeasonIndex } from './useSeasonIndex';
import { makeFakeServices } from '../test/fixtures';
import type { AppServices } from '../services/context';
import { ServicesContext } from '../services/context';

function renderIndex(services: AppServices) {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <ServicesContext.Provider value={services}>{children}</ServicesContext.Provider>
  );
  return renderHook(() => useSeasonIndex(), { wrapper });
}

describe('fallbackYears', () => {
  it('spans next year down to 2000, descending', () => {
    const years = fallbackYears(new Date(2026, 6, 6));
    expect(years[0]).toBe(2027);
    expect(years.at(-1)).toBe(2000);
    expect(years).toHaveLength(28);
  });
});

describe('useSeasonIndex', () => {
  it('returns the API years sorted descending', async () => {
    const services = makeFakeServices({ years: [2024, 2026, 2025] });
    const { result } = renderIndex(services);
    expect(result.current.loading).toBe(true);
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.years).toEqual([2026, 2025, 2024]);
  });

  it('falls back to generated years when the index is empty', async () => {
    const services = makeFakeServices({ years: [] });
    const { result } = renderIndex(services);
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.years).toEqual(fallbackYears());
  });

  it('falls back to generated years when the request fails', async () => {
    const services = {
      ...makeFakeServices(),
      getSeasonsIndex: () => Promise.reject(new Error('HTTP 503'))
    };
    const { result } = renderIndex(services);
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.years).toEqual(fallbackYears());
  });
});
