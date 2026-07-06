import type { JSX, ReactNode } from 'react';
import { EPISODE_RANGES } from '../lib/filters';
import type { EpisodeRangeId } from '../lib/filters';
import type { SeasonName } from '../lib/types';
import type { FiltersApi } from '../hooks/useFilters';
import { CheckboxGroup } from './CheckboxGroup';
import type { CheckboxOption } from './CheckboxGroup';
import { ContinuityFilter } from './ContinuityFilter';
import { DurationFilters } from './DurationFilters';
import { MatchActions } from './MatchActions';
import { SeasonControls } from './SeasonControls';

export interface FiltersSidebarProps {
  year: number;
  years: readonly number[];
  season: SeasonName;
  onYearChange: (year: number) => void;
  onSeasonChange: (season: SeasonName) => void;
  filters: FiltersApi;
  typeOptions: readonly CheckboxOption[];
  genreOptions: readonly CheckboxOption[];
  loading: boolean;
  loadingLabel: string;
  picking: boolean;
  onPick: () => void;
}

function FilterSection(props: { title: string; children: ReactNode }): JSX.Element {
  return (
    <div className="settings-group filter-section">
      <h3>{props.title}</h3>
      {props.children}
    </div>
  );
}

function PickerSection(props: FiltersSidebarProps): JSX.Element {
  return (
    <div className="picker-section">
      <SeasonControls
        year={props.year}
        years={props.years}
        season={props.season}
        onYearChange={props.onYearChange}
        onSeasonChange={props.onSeasonChange}
        disabled={props.loading}
      />
      <button
        type="button"
        className="pick-button"
        disabled={props.loading || props.picking}
        onClick={props.onPick}
      >
        {props.picking ? '🔄 Loading...' : '🎲 Pick Random Anime'}
      </button>
    </div>
  );
}

function TypeAndDurationSections(props: FiltersSidebarProps): JSX.Element {
  const { filters } = props;
  return (
    <>
      <FilterSection title="Type">
        <CheckboxGroup
          idPrefix="type"
          options={props.typeOptions}
          selected={filters.state.types}
          onChange={filters.setTypes}
        />
      </FilterSection>
      <FilterSection title="Duration">
        <DurationFilters
          includeShorts={!filters.state.excludeShorts}
          minDuration={filters.state.minDurationMin}
          maxDuration={filters.state.maxDurationMin}
          onIncludeShortsChange={filters.setIncludeShorts}
          onMinChange={filters.setMinDuration}
          onMaxChange={filters.setMaxDuration}
        />
      </FilterSection>
    </>
  );
}

function EpisodeSection({ filters }: { filters: FiltersApi }): JSX.Element {
  return (
    <FilterSection title="Episodes">
      <CheckboxGroup
        idPrefix="ep"
        options={EPISODE_RANGES.map((r) => ({ value: r.id, label: r.label }))}
        selected={filters.state.episodes}
        onChange={(values) => {
          filters.setEpisodes(values as EpisodeRangeId[]);
        }}
      />
    </FilterSection>
  );
}

function GenreSection(props: FiltersSidebarProps): JSX.Element {
  const { filters } = props;
  return (
    <FilterSection title="Genres">
      <div className="genre-list">
        <CheckboxGroup
          idPrefix="genre"
          options={props.genreOptions}
          selected={filters.state.genres}
          onChange={filters.setGenres}
        />
      </div>
      <MatchActions
        matchCount={filters.matchCount}
        onAll={filters.selectAll}
        onNone={filters.selectNone}
        onDefaults={filters.resetDefaults}
      />
    </FilterSection>
  );
}

function SettingsBody(props: FiltersSidebarProps): JSX.Element {
  return (
    <div>
      <TypeAndDurationSections {...props} />
      <FilterSection title="Series continuity">
        <ContinuityFilter
          includeContinuations={props.filters.state.includeContinuations}
          onChange={props.filters.setIncludeContinuations}
        />
      </FilterSection>
      <EpisodeSection filters={props.filters} />
      <GenreSection {...props} />
    </div>
  );
}

export function FiltersSidebar(props: FiltersSidebarProps): JSX.Element {
  return (
    <aside id="sidebar" className="sidebar">
      <PickerSection {...props} />
      {props.loading && (
        <div className="loading" role="status">
          {props.loadingLabel}
        </div>
      )}
      {!props.loading && <SettingsBody {...props} />}
    </aside>
  );
}
