import type { JSX } from 'react';
import { SEASON_NAMES } from '../lib/types';
import type { SeasonName } from '../lib/types';
import { capitalize } from '../lib/format';

export interface SeasonControlsProps {
  year: number;
  years: readonly number[];
  season: SeasonName;
  onYearChange: (year: number) => void;
  onSeasonChange: (season: SeasonName) => void;
  disabled?: boolean;
}

function YearSelect(props: SeasonControlsProps): JSX.Element {
  return (
    <select
      aria-label="Select Year"
      value={props.year}
      disabled={props.disabled ?? false}
      onChange={(e) => {
        props.onYearChange(Number.parseInt(e.target.value, 10));
      }}
    >
      {props.years.map((y) => (
        <option key={y} value={y}>
          {y}
        </option>
      ))}
    </select>
  );
}

function SeasonSelect(props: SeasonControlsProps): JSX.Element {
  return (
    <select
      aria-label="Select Season"
      value={props.season}
      disabled={props.disabled ?? false}
      onChange={(e) => {
        props.onSeasonChange(e.target.value as SeasonName);
      }}
    >
      {SEASON_NAMES.map((s) => (
        <option key={s} value={s}>
          {capitalize(s)}
        </option>
      ))}
    </select>
  );
}

export function SeasonControls(props: SeasonControlsProps): JSX.Element {
  return (
    <div className="season-controls">
      <YearSelect {...props} />
      <SeasonSelect {...props} />
    </div>
  );
}
