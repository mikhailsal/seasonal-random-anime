import { act, renderHook } from '@testing-library/react';
import { useFilters } from './useFilters';
import { DEFAULT_GENRE_FILTERS } from '../lib/filters';
import { makeItem } from '../test/fixtures';
import type { AnimeItem } from '../lib/types';

// Default filters (TV/OVA/ONA, default genres, 10-16/17-28 eps, no shorts)
// match only the first fixture item.
function items(): AnimeItem[] {
  return [
    makeItem({ mal_id: 1, type: 'TV', episodes: 12 }),
    makeItem({ mal_id: 2, type: 'Movie', episodes: 1 }),
    makeItem({ mal_id: 3, type: 'TV', episodes: 12, genres: [{ mal_id: 9, name: 'Horror' }] }),
    makeItem({ mal_id: 4, type: 'ONA', episodes: 12, duration: '5 min per ep' })
  ];
}

function renderFilters(list: AnimeItem[] = items()) {
  return renderHook(({ data }) => useFilters(data), { initialProps: { data: list } });
}

describe('useFilters', () => {
  it('starts from the default filter state with a live match count', () => {
    const { result } = renderFilters();
    expect(result.current.state.types).toEqual(new Set(['TV', 'OVA', 'ONA']));
    expect(result.current.state.excludeShorts).toBe(true);
    expect(result.current.matchCount).toBe(1);
    expect(result.current.filtered.map((i) => i.apiData.mal_id)).toEqual([1]);
  });

  it('recomputes matches when the item list changes', () => {
    const { result, rerender } = renderFilters();
    expect(result.current.matchCount).toBe(1);
    rerender({ data: [] });
    expect(result.current.matchCount).toBe(0);
  });

  it('setTypes replaces the type selection', () => {
    const { result } = renderFilters();
    act(() => {
      result.current.setTypes(['Movie']);
    });
    expect(result.current.state.types).toEqual(new Set(['Movie']));
    expect(result.current.matchCount).toBe(0);
  });

  it('setGenres and setEpisodes replace their selections', () => {
    const { result } = renderFilters();
    act(() => {
      result.current.setGenres(['Horror']);
    });
    // Only the Horror-tagged TV item survives a Horror-only genre set.
    expect(result.current.filtered.map((i) => i.apiData.mal_id)).toEqual([3]);
    act(() => {
      result.current.setGenres([...DEFAULT_GENRE_FILTERS]);
      result.current.setEpisodes(['lt10']);
    });
    expect(result.current.state.episodes).toEqual(new Set(['lt10']));
    expect(result.current.matchCount).toBe(0);
  });

  it('setIncludeShorts toggles the excludeShorts flag (inverted)', () => {
    const { result } = renderFilters();
    act(() => {
      result.current.setIncludeShorts(true);
    });
    expect(result.current.state.excludeShorts).toBe(false);
    // The 5-minute ONA now passes the shorts gate but fails no other default
    // filter, so it joins the matches.
    expect(result.current.matchCount).toBe(2);
    act(() => {
      result.current.setIncludeShorts(false);
    });
    expect(result.current.state.excludeShorts).toBe(true);
    expect(result.current.matchCount).toBe(1);
  });

  it('applies and clears min/max duration bounds', () => {
    const { result } = renderFilters();
    act(() => {
      result.current.selectAll();
      result.current.setMinDuration(30);
    });
    expect(result.current.matchCount).toBe(0);
    act(() => {
      result.current.setMinDuration(null);
      result.current.setMaxDuration(10);
    });
    // Only the 5-minute short stays under a 10-minute cap.
    expect(result.current.matchCount).toBe(1);
    act(() => {
      result.current.setMaxDuration(null);
    });
    expect(result.current.matchCount).toBe(4);
  });

  it('selectAll lifts every restriction; selectNone rejects everything', () => {
    const { result } = renderFilters();
    act(() => {
      result.current.selectAll();
    });
    expect(result.current.state.types).toBeNull();
    expect(result.current.state.genres).toBeNull();
    expect(result.current.state.episodes).toBeNull();
    expect(result.current.state.excludeShorts).toBe(false);
    expect(result.current.matchCount).toBe(4);
    act(() => {
      result.current.selectNone();
    });
    expect(result.current.state.types?.size).toBe(0);
    expect(result.current.matchCount).toBe(0);
  });

  it('resetDefaults restores defaults but preserves includeContinuations', () => {
    const { result } = renderFilters();
    act(() => {
      result.current.setIncludeContinuations(true);
      result.current.selectNone();
    });
    act(() => {
      result.current.resetDefaults();
    });
    expect(result.current.state.types).toEqual(new Set(['TV', 'OVA', 'ONA']));
    expect(result.current.state.includeContinuations).toBe(true);
    expect(result.current.matchCount).toBe(1);
  });
});
