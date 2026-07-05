import { parseDurationToMinutes } from './duration';
import type { AnimeItem } from './types';

export type EpisodeRangeId = 'lt10' | '10to16' | '17to28' | 'gt28';

export interface EpisodeRange {
  id: EpisodeRangeId;
  label: string;
}

export const KNOWN_TYPES: readonly string[] = ['TV', 'Movie', 'OVA', 'ONA', 'Special', 'Music'];

export const EPISODE_RANGES: readonly EpisodeRange[] = [
  { id: 'lt10', label: '< 10 episodes' },
  { id: '10to16', label: '10–16 episodes' },
  { id: '17to28', label: '17–28 episodes' },
  { id: 'gt28', label: '> 28 episodes' }
];

export const DEFAULT_TYPE_FILTERS: readonly string[] = ['TV', 'OVA', 'ONA'];

export const DEFAULT_GENRE_FILTERS: readonly string[] = [
  'Action',
  'Adventure',
  'Comedy',
  'Drama',
  'Fantasy',
  'Mystery',
  'Gourmet',
  'Romance',
  'Sci-Fi',
  'Slice of Life',
  'Sports',
  'Supernatural',
  'Suspense'
];

export const DEFAULT_EPISODE_FILTERS: readonly EpisodeRangeId[] = ['10to16', '17to28'];

/**
 * Filter state. A `null` set means "no restriction" (legacy "All" semantics),
 * while an empty set rejects everything.
 */
export interface FilterState {
  types: ReadonlySet<string> | null;
  genres: ReadonlySet<string> | null;
  episodes: ReadonlySet<EpisodeRangeId> | null;
  excludeShorts: boolean;
  minDurationMin: number | null;
  maxDurationMin: number | null;
  includeContinuations: boolean;
}

export function defaultFilterState(): FilterState {
  return {
    types: new Set(DEFAULT_TYPE_FILTERS),
    genres: new Set(DEFAULT_GENRE_FILTERS),
    episodes: new Set(DEFAULT_EPISODE_FILTERS),
    excludeShorts: true,
    minDurationMin: null,
    maxDurationMin: null,
    includeContinuations: false
  };
}

export function allFilterState(base: FilterState): FilterState {
  return { ...base, types: null, genres: null, episodes: null, excludeShorts: false };
}

export function noneFilterState(base: FilterState): FilterState {
  return { ...base, types: new Set(), genres: new Set(), episodes: new Set(), excludeShorts: true };
}

function matchesTypes(item: AnimeItem, types: FilterState['types']): boolean {
  if (types === null) return true;
  if (types.size === 0) return false;
  return types.has(item.type);
}

/** Legacy semantics: every genre of the item must be within the selected set. */
function matchesGenres(item: AnimeItem, genres: FilterState['genres']): boolean {
  if (genres === null) return true;
  if (genres.size === 0) return false;
  if (item.genres.length === 0) return false;
  return item.genres.every((g) => genres.has(g));
}

function episodesInRange(ep: number, id: EpisodeRangeId): boolean {
  if (id === 'lt10') return ep < 10;
  if (id === '10to16') return ep >= 10 && ep <= 16;
  if (id === '17to28') return ep >= 17 && ep <= 28;
  return ep > 28;
}

function matchesEpisodes(item: AnimeItem, episodes: FilterState['episodes']): boolean {
  if (episodes === null) return true;
  if (episodes.size === 0) return false;
  const ep = typeof item.episodes === 'number' ? item.episodes : item.apiData.episodes;
  if (typeof ep !== 'number') return false;
  return [...episodes].some((id) => episodesInRange(ep, id));
}

function matchesDuration(item: AnimeItem, state: FilterState): boolean {
  const minutes = parseDurationToMinutes(item.apiData.duration);
  if (state.excludeShorts && typeof minutes === 'number' && minutes < 15) return false;
  if (
    state.minDurationMin !== null &&
    typeof minutes === 'number' &&
    minutes < state.minDurationMin
  )
    return false;
  if (
    state.maxDurationMin !== null &&
    typeof minutes === 'number' &&
    minutes > state.maxDurationMin
  )
    return false;
  return true;
}

export function matchesFilters(item: AnimeItem, state: FilterState): boolean {
  return (
    matchesTypes(item, state.types) &&
    matchesGenres(item, state.genres) &&
    matchesEpisodes(item, state.episodes) &&
    matchesDuration(item, state)
  );
}

export function applyFilters(items: readonly AnimeItem[], state: FilterState): AnimeItem[] {
  return items.filter((item) => matchesFilters(item, state));
}

/** Legacy "anyFilterActive" check used to decide the random-pick source list. */
export function hasActiveFilters(state: FilterState): boolean {
  return (
    state.types !== null ||
    state.genres !== null ||
    state.episodes !== null ||
    state.excludeShorts ||
    typeof state.minDurationMin === 'number' ||
    typeof state.maxDurationMin === 'number'
  );
}
