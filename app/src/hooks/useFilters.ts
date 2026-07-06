import { useMemo, useState } from 'react';
import { allFilterState, applyFilters, defaultFilterState, noneFilterState } from '../lib/filters';
import type { EpisodeRangeId, FilterState } from '../lib/filters';
import type { AnimeItem } from '../lib/types';

export interface FiltersApi {
  state: FilterState;
  filtered: AnimeItem[];
  matchCount: number;
  setTypes: (values: string[]) => void;
  setGenres: (values: string[]) => void;
  setEpisodes: (values: EpisodeRangeId[]) => void;
  setIncludeShorts: (include: boolean) => void;
  setMinDuration: (minutes: number | null) => void;
  setMaxDuration: (minutes: number | null) => void;
  setIncludeContinuations: (include: boolean) => void;
  selectAll: () => void;
  selectNone: () => void;
  resetDefaults: () => void;
}

type Updater = (s: FilterState) => FilterState;
type SetFilterState = React.Dispatch<React.SetStateAction<FilterState>>;

const withTypes =
  (values: string[]): Updater =>
  (s) => ({ ...s, types: new Set(values) });
const withGenres =
  (values: string[]): Updater =>
  (s) => ({ ...s, genres: new Set(values) });
const withEpisodes =
  (values: EpisodeRangeId[]): Updater =>
  (s) => ({ ...s, episodes: new Set(values) });
const withIncludeShorts =
  (include: boolean): Updater =>
  (s) => ({ ...s, excludeShorts: !include });
const withMinDuration =
  (minutes: number | null): Updater =>
  (s) => ({ ...s, minDurationMin: minutes });
const withMaxDuration =
  (minutes: number | null): Updater =>
  (s) => ({ ...s, maxDurationMin: minutes });
const withIncludeContinuations =
  (include: boolean): Updater =>
  (s) => ({ ...s, includeContinuations: include });
const withDefaults = (): Updater => (s) => ({
  ...defaultFilterState(),
  includeContinuations: s.includeContinuations
});

function bind<A extends unknown[]>(
  set: SetFilterState,
  make: (...args: A) => Updater
): (...args: A) => void {
  return (...args: A) => {
    set(make(...args));
  };
}

function useFilterSetters(
  set: SetFilterState
): Omit<FiltersApi, 'state' | 'filtered' | 'matchCount'> {
  return useMemo(
    () => ({
      setTypes: bind(set, withTypes),
      setGenres: bind(set, withGenres),
      setEpisodes: bind(set, withEpisodes),
      setIncludeShorts: bind(set, withIncludeShorts),
      setMinDuration: bind(set, withMinDuration),
      setMaxDuration: bind(set, withMaxDuration),
      setIncludeContinuations: bind(set, withIncludeContinuations),
      selectAll: bind(set, () => allFilterState),
      selectNone: bind(set, () => noneFilterState),
      resetDefaults: bind(set, withDefaults)
    }),
    [set]
  );
}

/** Filter state management with live match counting (legacy parity semantics). */
export function useFilters(items: readonly AnimeItem[]): FiltersApi {
  const [state, setState] = useState<FilterState>(defaultFilterState);
  const setters = useFilterSetters(setState);
  const filtered = useMemo(() => applyFilters(items, state), [items, state]);
  return { state, filtered, matchCount: filtered.length, ...setters };
}
