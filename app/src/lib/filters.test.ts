import {
  allFilterState,
  applyFilters,
  defaultFilterState,
  hasActiveFilters,
  matchesFilters,
  noneFilterState
} from './filters';
import type { FilterState } from './filters';
import { makeItem } from '../test/fixtures';

function unrestricted(): FilterState {
  return { ...allFilterState(defaultFilterState()), excludeShorts: false };
}

describe('filters', () => {
  describe('type filter', () => {
    it('accepts items whose type is selected', () => {
      const state = { ...unrestricted(), types: new Set(['TV']) };
      expect(matchesFilters(makeItem({ type: 'TV' }), state)).toBe(true);
      expect(matchesFilters(makeItem({ type: 'Movie' }), state)).toBe(false);
    });

    it('rejects everything when the set is empty', () => {
      const state = { ...unrestricted(), types: new Set<string>() };
      expect(matchesFilters(makeItem({ type: 'TV' }), state)).toBe(false);
    });

    it('accepts everything when null', () => {
      expect(matchesFilters(makeItem({ type: 'Music' }), unrestricted())).toBe(true);
    });
  });

  describe('genre filter (legacy semantics: all item genres must be selected)', () => {
    const genres = (...names: string[]) => names.map((name, i) => ({ mal_id: i + 1, name }));

    it('accepts when every genre of the item is selected', () => {
      const state = { ...unrestricted(), genres: new Set(['Action', 'Comedy']) };
      expect(matchesFilters(makeItem({ genres: genres('Action', 'Comedy') }), state)).toBe(true);
    });

    it('rejects when one item genre is not selected', () => {
      const state = { ...unrestricted(), genres: new Set(['Action']) };
      expect(matchesFilters(makeItem({ genres: genres('Action', 'Horror') }), state)).toBe(false);
    });

    it('rejects items without genres when a genre set is active', () => {
      const state = { ...unrestricted(), genres: new Set(['Action']) };
      expect(matchesFilters(makeItem({ genres: [] }), state)).toBe(false);
    });
  });

  describe('episode ranges', () => {
    const withEpisodes = (episodes: FilterState['episodes']) => ({ ...unrestricted(), episodes });

    it.each([
      [5, 'lt10', true],
      [10, '10to16', true],
      [16, '10to16', true],
      [17, '17to28', true],
      [28, '17to28', true],
      [29, 'gt28', true],
      [12, 'lt10', false]
    ] as const)('episodes=%i range=%s -> %s', (episodes, range, expected) => {
      const state = withEpisodes(new Set([range]));
      expect(matchesFilters(makeItem({ episodes }), state)).toBe(expected);
    });

    it('rejects items with unknown episode counts when active', () => {
      const state = withEpisodes(new Set(['lt10']));
      expect(matchesFilters(makeItem({ episodes: null }), state)).toBe(false);
    });
  });

  describe('duration filter', () => {
    it('excludes shorts when excludeShorts is set', () => {
      const state = { ...unrestricted(), excludeShorts: true };
      expect(matchesFilters(makeItem({ duration: '5 min per ep' }), state)).toBe(false);
      expect(matchesFilters(makeItem({ duration: '24 min per ep' }), state)).toBe(true);
    });

    it('keeps items with unknown duration even when excluding shorts', () => {
      const state = { ...unrestricted(), excludeShorts: true };
      expect(matchesFilters(makeItem({ duration: null }), state)).toBe(true);
    });

    it('applies min and max duration bounds', () => {
      const state = { ...unrestricted(), minDurationMin: 20, maxDurationMin: 30 };
      expect(matchesFilters(makeItem({ duration: '24 min per ep' }), state)).toBe(true);
      expect(matchesFilters(makeItem({ duration: '10 min per ep' }), state)).toBe(false);
      expect(matchesFilters(makeItem({ duration: '1 hr' }), state)).toBe(false);
    });
  });

  describe('bulk states', () => {
    it('defaultFilterState uses opinionated defaults', () => {
      const state = defaultFilterState();
      expect(state.types).toEqual(new Set(['TV', 'OVA', 'ONA']));
      expect(state.episodes).toEqual(new Set(['10to16', '17to28']));
      expect(state.excludeShorts).toBe(true);
      expect(state.includeContinuations).toBe(false);
    });

    it('allFilterState removes restrictions and includes shorts', () => {
      const state = allFilterState(defaultFilterState());
      expect(state.types).toBeNull();
      expect(state.genres).toBeNull();
      expect(state.episodes).toBeNull();
      expect(state.excludeShorts).toBe(false);
    });

    it('noneFilterState empties selections and excludes shorts', () => {
      const state = noneFilterState(allFilterState(defaultFilterState()));
      expect(state.types?.size).toBe(0);
      expect(state.genres?.size).toBe(0);
      expect(state.episodes?.size).toBe(0);
      expect(state.excludeShorts).toBe(true);
    });
  });

  describe('applyFilters and hasActiveFilters', () => {
    it('filters a list and counts matches', () => {
      const items = [
        makeItem({ mal_id: 1, type: 'TV', episodes: 12 }),
        makeItem({ mal_id: 2, type: 'Movie', episodes: 1 })
      ];
      const state = { ...unrestricted(), types: new Set(['TV']) };
      expect(applyFilters(items, state)).toHaveLength(1);
    });

    it('hasActiveFilters mirrors legacy anyFilterActive', () => {
      expect(hasActiveFilters(defaultFilterState())).toBe(true);
      expect(hasActiveFilters(unrestricted())).toBe(false);
      expect(hasActiveFilters({ ...unrestricted(), minDurationMin: 10 })).toBe(true);
      expect(hasActiveFilters({ ...unrestricted(), excludeShorts: true })).toBe(true);
    });
  });
});
