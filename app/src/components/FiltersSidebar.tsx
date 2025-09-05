import React from 'react';
import { SeasonName } from '../lib/types';

export type FiltersSidebarProps = {
  year: number;
  years: number[];
  season: SeasonName;
  onYearChange: (y: number) => void;
  onSeasonChange: (s: SeasonName) => void;
  disabled?: boolean;
};

const SEASONS: SeasonName[] = ['winter', 'spring', 'summer', 'fall'];

export function FiltersSidebar({ year, years, season, onYearChange, onSeasonChange, disabled }: FiltersSidebarProps) {
  return (
    <div aria-label="filters-sidebar">
      <label style={{ display: 'block', marginBottom: 8 }}>
        Year:{' '}
        <select
          aria-label="year-select"
          value={year}
          onChange={(e) => onYearChange(Number(e.target.value))}
          disabled={disabled}
        >
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </label>
      <label style={{ display: 'block', marginBottom: 8 }}>
        Season:{' '}
        <select
          aria-label="season-select"
          value={season}
          onChange={(e) => onSeasonChange(e.target.value as SeasonName)}
          disabled={disabled}
        >
          {SEASONS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}