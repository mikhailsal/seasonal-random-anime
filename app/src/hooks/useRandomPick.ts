import { useCallback, useState } from 'react';
import { hasActiveFilters } from '../lib/filters';
import type { FilterState } from '../lib/filters';
import { pickRandomConsideringContinuity } from '../lib/selection';
import type { AnimeItem } from '../lib/types';
import type { AppServices } from '../services/context';
import { useServices } from '../services/context';

export interface RandomPickState {
  selected: AnimeItem | null;
  picking: boolean;
  notice: string | null;
}

export interface RandomPickApi extends RandomPickState {
  pick: () => Promise<void>;
}

export interface PickSources {
  items: readonly AnimeItem[];
  filtered: readonly AnimeItem[];
  filters: FilterState;
}

/** Legacy parity: filtered list when filters are active or non-empty; full list otherwise. */
export function resolvePickSource(sources: PickSources): readonly AnimeItem[] | null {
  const { items, filtered, filters } = sources;
  if (hasActiveFilters(filters)) {
    return filtered.length > 0 ? filtered : null;
  }
  return filtered.length > 0 ? filtered : items;
}

export const PICK_UX_DELAY_MS = 500;

async function performPick(sources: PickSources, services: AppServices): Promise<AnimeItem> {
  const source = resolvePickSource(sources);
  if (!source)
    throw new Error('No titles match your current filters. Adjust filters and try again.');
  await new Promise((r) => setTimeout(r, PICK_UX_DELAY_MS));
  const candidate = await pickRandomConsideringContinuity(source, {
    includeContinuations: sources.filters.includeContinuations,
    isContinuation: services.isContinuation
  });
  if (!candidate) throw new Error('No anime data loaded! Please load a season first.');
  const images = await services.loadImages(candidate);
  return { ...candidate, images, currentImageIndex: 0, galleryAugmented: true };
}

/** Random selection flow: UX delay, continuity avoidance, gallery augmentation. */
export function useRandomPick(sources: PickSources): RandomPickApi {
  const services = useServices();
  const [state, setState] = useState<RandomPickState>({
    selected: null,
    picking: false,
    notice: null
  });

  const pick = useCallback(async () => {
    if (sources.items.length === 0 && sources.filtered.length === 0) {
      setState((s) => ({ ...s, notice: 'No anime data loaded! Please load a season first.' }));
      return;
    }
    setState((s) => ({ ...s, picking: true, notice: null }));
    try {
      const selected = await performPick(sources, services);
      setState({ selected, picking: false, notice: null });
    } catch (err) {
      const notice = err instanceof Error ? err.message : 'Error loading anime. Please try again.';
      setState((s) => ({ ...s, picking: false, notice }));
    }
  }, [sources, services]);

  return { ...state, pick };
}
