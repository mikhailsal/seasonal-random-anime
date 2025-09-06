import React from 'react';
import { Anime, SeasonName } from './lib/types';
import { getSeason as realGetSeason } from './services/jikan';
import { pickRandomConsideringContinuity as realPick } from './lib/selection';
import { AnimeCard } from './components/AnimeCard';
import { FiltersSidebar } from './components/FiltersSidebar';

export type AppDeps = {
  services: {
    getSeason: (year: number, season: SeasonName, opts?: { limit?: number }) => Promise<{ data: Anime[] }>;
  };
  selectors: {
    pickRandomConsideringContinuity: (list: Anime[], opts?: { rng?: () => number }) => Promise<Anime | null>;
  };
  rng?: () => number;
};

const defaultDeps: AppDeps = {
  services: {
    async getSeason(year, season, opts) {
      const limit = opts?.limit ?? 24;
      const res = await realGetSeason(year, season, { limit });
      return { data: res.data };
    }
  },
  selectors: {
    pickRandomConsideringContinuity: async (list, opts) => {
      const pick = await realPick(list, { rng: opts?.rng });
      return pick;
    }
  },
  rng: Math.random
};

function currentSeasonName(d = new Date()): SeasonName {
  const m = d.getUTCMonth() + 1;
  if (m >= 1 && m <= 3) return 'winter';
  if (m >= 4 && m <= 6) return 'spring';
  if (m >= 7 && m <= 9) return 'summer';
  return 'fall';
}

function yearsBack(from: number, back: number): number[] {
  return Array.from({ length: back + 1 }, (_, i) => from - i);
}

export function App(props: { deps?: Partial<AppDeps> } = {}) {
  const deps: AppDeps = React.useMemo(() => {
    return {
      services: { ...defaultDeps.services, ...(props.deps?.services || {}) },
      selectors: { ...defaultDeps.selectors, ...(props.deps?.selectors || {}) },
      rng: props.deps?.rng ?? defaultDeps.rng
    };
  }, [props.deps]);

  const now = new Date();
  const [year, setYear] = React.useState(now.getUTCFullYear());
  const [season, setSeason] = React.useState<SeasonName>(currentSeasonName(now));
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [items, setItems] = React.useState<Anime[]>([]);
  const [selected, setSelected] = React.useState<Anime | null>(null);

  const yearOptions = React.useMemo(() => yearsBack(now.getUTCFullYear(), 9), [now]);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      setSelected(null);
      try {
        const res = await deps.services.getSeason(year, season, { limit: 24 });
        if (!cancelled) {
          setItems(res.data || []);
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Failed to load');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [year, season, deps.services]);

  async function onRandom() {
    if (!items.length) return;
    const pick = await deps.selectors.pickRandomConsideringContinuity(items, { rng: deps.rng });
    if (pick) setSelected(pick);
  }

  return (
    <main style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 16, padding: 16, fontFamily: 'system-ui, sans-serif' }}>
      <aside>
        <h1 style={{ marginTop: 0 }}>Seasonal Random Anime (React)</h1>
        <FiltersSidebar
          year={year}
          years={yearOptions}
          season={season}
          onYearChange={setYear}
          onSeasonChange={setSeason}
          disabled={loading}
        />
        <div style={{ marginTop: 12 }}>
          <button onClick={onRandom} disabled={loading || items.length === 0} aria-label="pick-random">
            Pick Random
          </button>
        </div>
        <div style={{ marginTop: 12, color: '#666' }} aria-live="polite">
          {loading ? 'Loading…' : error ? `Error: ${error}` : `Loaded: ${items.length}`}
        </div>
      </aside>
      <section>
        {selected ? (
          <AnimeCard
            title={selected.title}
            imageUrl={selected.images?.jpg?.image_url || selected.images?.webp?.image_url || null}
            synopsis={selected.synopsis || null}
          />
        ) : (
          <p style={{ color: '#666' }}>No selection yet. Click “Pick Random”.</p>
        )}
      </section>
    </main>
  );
}
