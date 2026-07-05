import { useMemo, useState } from 'react';
import type { JSX } from 'react';
import { AnimeCard } from './components/AnimeCard';
import { FiltersSidebar } from './components/FiltersSidebar';
import { Header } from './components/Header';
import { capitalize } from './lib/format';
import { KNOWN_TYPES } from './lib/filters';
import type { AnimeItem, SeasonName } from './lib/types';
import { useFilters } from './hooks/useFilters';
import { useRandomPick } from './hooks/useRandomPick';
import { useSeasonData } from './hooks/useSeasonData';
import { useSeasonIndex } from './hooks/useSeasonIndex';
import { createDefaultServices, ServicesContext } from './services/context';
import type { AppServices } from './services/context';
import type { CheckboxOption } from './components/CheckboxGroup';

export function currentSeasonName(d = new Date()): SeasonName {
  const month = d.getMonth() + 1;
  if (month <= 3) return 'winter';
  if (month <= 6) return 'spring';
  if (month <= 9) return 'summer';
  return 'fall';
}

export function buildTypeOptions(items: readonly AnimeItem[]): CheckboxOption[] {
  const present = new Set(items.map((i) => i.type));
  const matched = KNOWN_TYPES.filter((t) => present.has(t));
  const finalTypes = matched.length > 0 ? matched : KNOWN_TYPES;
  return finalTypes.map((t) => ({ value: t, label: t }));
}

export function buildGenreOptions(items: readonly AnimeItem[]): CheckboxOption[] {
  const genres = new Set<string>();
  for (const item of items) for (const g of item.genres) genres.add(g);
  return [...genres].sort((a, b) => a.localeCompare(b)).map((g) => ({ value: g, label: g }));
}

interface AppState {
  year: number;
  season: SeasonName;
  setYear: (year: number) => void;
  setSeason: (season: SeasonName) => void;
  years: number[];
  items: AnimeItem[];
  loading: boolean;
  error: string | null;
  filters: ReturnType<typeof useFilters>;
  pick: ReturnType<typeof useRandomPick>;
}

function useAppState(): AppState {
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [season, setSeason] = useState<SeasonName>(() => currentSeasonName());
  const index = useSeasonIndex();
  const data = useSeasonData(year, season);
  const filters = useFilters(data.items);
  const sources = useMemo(
    () => ({ items: data.items, filtered: filters.filtered, filters: filters.state }),
    [data.items, filters.filtered, filters.state]
  );
  const pick = useRandomPick(sources);
  const years = index.years.length > 0 ? index.years : [year];
  return { year, season, setYear, setSeason, years, ...data, filters, pick };
}

function MainContent({ state }: { state: AppState }): JSX.Element {
  const { pick, error } = state;
  return (
    <main className="content">
      {pick.picking && <div className="loading">Selecting your anime...</div>}
      {error && <div className="notice">Failed to load season data: {error}</div>}
      {pick.notice && <div className="notice">{pick.notice}</div>}
      {pick.selected && !pick.picking && <AnimeCard item={pick.selected} />}
    </main>
  );
}

function AppSidebar(props: { state: AppState; seasonLabel: string }): JSX.Element {
  const { state, seasonLabel } = props;
  return (
    <FiltersSidebar
      year={state.year}
      years={state.years}
      season={state.season}
      onYearChange={state.setYear}
      onSeasonChange={state.setSeason}
      filters={state.filters}
      typeOptions={buildTypeOptions(state.items)}
      genreOptions={buildGenreOptions(state.items)}
      loading={state.loading}
      loadingLabel={`Loading ${seasonLabel} anime...`}
      picking={state.pick.picking}
      onPick={() => void state.pick.pick()}
    />
  );
}

function AppShell(): JSX.Element {
  const state = useAppState();
  const [collapsed, setCollapsed] = useState(false);
  const seasonLabel = `${capitalize(state.season)} ${String(state.year)}`;
  return (
    <div className={`app-root${collapsed ? ' sidebar-collapsed' : ''}`}>
      <Header
        seasonLabel={seasonLabel}
        sidebarCollapsed={collapsed}
        onToggleSidebar={() => {
          setCollapsed((c) => !c);
        }}
      />
      <div className="container">
        <div className="app-layout">
          <AppSidebar state={state} seasonLabel={seasonLabel} />
          <MainContent state={state} />
        </div>
      </div>
    </div>
  );
}

export function App({ services }: { services?: AppServices } = {}): JSX.Element {
  const value = useMemo(() => services ?? createDefaultServices(), [services]);
  return (
    <ServicesContext.Provider value={value}>
      <AppShell />
    </ServicesContext.Provider>
  );
}
