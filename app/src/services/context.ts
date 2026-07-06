import { createContext, useContext } from 'react';
import type { Anime, AnimeItem, SeasonIndexResponse, SeasonName } from '../lib/types';
import type { ContinuationChecker } from '../lib/selection';
import { getSeasonsIndex, loadFullSeason } from './jikan';
import { createContinuationChecker } from './continuity';
import { loadAnimeImages } from './gallery';

/** Injectable service boundary so components/hooks stay testable (DIP). */
export interface AppServices {
  getSeasonsIndex: () => Promise<SeasonIndexResponse>;
  loadSeason: (year: number, season: SeasonName) => Promise<Anime[]>;
  isContinuation: ContinuationChecker;
  loadImages: (item: AnimeItem) => Promise<string[]>;
}

export function createDefaultServices(): AppServices {
  return {
    getSeasonsIndex: () => getSeasonsIndex(),
    loadSeason: (year, season) => loadFullSeason(year, season),
    isContinuation: createContinuationChecker(),
    loadImages: (item) => loadAnimeImages(item)
  };
}

export const ServicesContext = createContext<AppServices | null>(null);

export function useServices(): AppServices {
  const services = useContext(ServicesContext);
  if (!services) throw new Error('ServicesContext is not provided');
  return services;
}
