import { useEffect, useState } from 'react';
import { toAnimeItem } from '../lib/mapAnime';
import type { AnimeItem, SeasonName } from '../lib/types';
import type { AppServices } from '../services/context';
import { useServices } from '../services/context';

export interface SeasonDataState {
  items: AnimeItem[];
  loading: boolean;
  error: string | null;
}

export const SEASON_LOAD_DEBOUNCE_MS = 200;

interface SeasonResult {
  key: string;
  items: AnimeItem[];
  error: string | null;
}

async function loadSeasonResult(
  services: AppServices,
  key: string,
  year: number,
  season: SeasonName
): Promise<SeasonResult> {
  try {
    const raw = await services.loadSeason(year, season);
    return { key, items: raw.map(toAnimeItem), error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load season data.';
    return { key, items: [], error: message };
  }
}

/** Load a season's anime list, debounced on year/season changes (legacy parity: 200ms). */
export function useSeasonData(year: number, season: SeasonName): SeasonDataState {
  const services = useServices();
  const [result, setResult] = useState<SeasonResult | null>(null);
  const key = `${String(year)}/${season}`;

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      void loadSeasonResult(services, key, year, season).then((res) => {
        if (!cancelled) setResult(res);
      });
    }, SEASON_LOAD_DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [services, key, year, season]);

  const current = result?.key === key ? result : null;
  return { items: current?.items ?? [], loading: current === null, error: current?.error ?? null };
}
