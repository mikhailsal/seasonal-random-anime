import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { FiltersSidebar } from './FiltersSidebar';

describe('FiltersSidebar', () => {
  it('renders selects and emits changes', async () => {
    const user = userEvent.setup();
    const onYear = vi.fn();
    const onSeason = vi.fn();

    render(
      <FiltersSidebar
        year={2024}
        years={[2024, 2023, 2022]}
        season="summer"
        onYearChange={onYear}
        onSeasonChange={onSeason}
      />
    );

    const yearSelect = screen.getByLabelText('year-select') as HTMLSelectElement;
    const seasonSelect = screen.getByLabelText('season-select') as HTMLSelectElement;

    expect(yearSelect.value).toBe('2024');
    expect(seasonSelect.value).toBe('summer');

    await user.selectOptions(yearSelect, '2023');
    await user.selectOptions(seasonSelect, 'spring');

    expect(onYear).toHaveBeenCalledWith(2023);
    expect(onSeason).toHaveBeenCalledWith('spring');
  });

  it('disables inputs when disabled', () => {
    render(
      <FiltersSidebar
        year={2024}
        years={[2024]}
        season="summer"
        onYearChange={() => {}}
        onSeasonChange={() => {}}
        disabled
      />
    );
    expect(screen.getByLabelText('year-select')).toBeDisabled();
    expect(screen.getByLabelText('season-select')).toBeDisabled();
  });
});