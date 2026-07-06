import { useEffect, useState } from 'react';
import type { AppServices } from '../services/context';
import { useServices } from '../services/context';

export interface SeasonIndexState {
  years: number[];
  loading: boolean;
}

export function fallbackYears(now = new Date()): number[] {
  const years: number[] = [];
  for (let y = now.getFullYear() + 1; y >= 2000; y--) years.push(y);
  return years;
}

async function resolveYears(services: AppServices): Promise<number[]> {
  try {
    const index = await services.getSeasonsIndex();
    const years = index.data.map((entry) => entry.year).sort((a, b) => b - a);
    return years.length > 0 ? years : fallbackYears();
  } catch {
    return fallbackYears();
  }
}

/** Load the list of selectable years from the Jikan seasons index. */
export function useSeasonIndex(): SeasonIndexState {
  const services = useServices();
  const [state, setState] = useState<SeasonIndexState>({ years: [], loading: true });

  useEffect(() => {
    let cancelled = false;
    void resolveYears(services).then((years) => {
      if (!cancelled) setState({ years, loading: false });
    });
    return () => {
      cancelled = true;
    };
  }, [services]);

  return state;
}
