import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { App, AppDeps } from './App';
import { Anime } from './lib/types';

function makeAnime(id: number, title: string): Anime {
  return { mal_id: id, title, images: { jpg: { image_url: 'https://example.com/x.jpg' } }, synopsis: 'test' };
}

describe('App UI', () => {
  it('loads items and picks a random anime', async () => {
    const user = userEvent.setup();

    const dataset = [makeAnime(1, 'A'), makeAnime(2, 'B'), makeAnime(3, 'C')];

    const deps: Partial<AppDeps> = {
      services: {
        getSeason: vi.fn().mockResolvedValue({ data: dataset })
      },
      selectors: {
        pickRandomConsideringContinuity: vi.fn((list: Anime[]) => list[1] ?? null)
      }
    };

    render(<App deps={deps} />);

    expect(await screen.findByText(/Loaded: 3/)).toBeInTheDocument();

    const btn = screen.getByRole('button', { name: /pick random/i });
    await user.click(btn);

    expect(screen.getByLabelText('anime-card')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'B' })).toBeInTheDocument();
  });

  it('shows loading and error states', async () => {
    const deps: Partial<AppDeps> = {
      services: {
        getSeason: vi.fn().mockRejectedValue(new Error('boom'))
      },
      selectors: {
        pickRandomConsideringContinuity: vi.fn(() => null)
      }
    };

    render(<App deps={deps} />);

    // Loading then error
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
    expect(await screen.findByText(/Error: boom/)).toBeInTheDocument();

    // Random button disabled when no items
    const btn = screen.getByRole('button', { name: /pick random/i });
    expect(btn).toBeDisabled();
  });

  it('changes season/year and refetches', async () => {
    const user = userEvent.setup();
    const getSeason = vi
      .fn()
      .mockResolvedValueOnce({ data: [makeAnime(10, 'X')] })
      .mockResolvedValueOnce({ data: [makeAnime(20, 'Y')] });

    const deps: Partial<AppDeps> = {
      services: { getSeason },
      selectors: { pickRandomConsideringContinuity: vi.fn(() => null) }
    };

    render(<App deps={deps} />);

    expect(await screen.findByText(/Loaded: 1/)).toBeInTheDocument();

    const seasonSelect = screen.getByLabelText('season-select');
    await user.selectOptions(seasonSelect, 'spring');

    expect(await screen.findByText(/Loaded: 1/)).toBeInTheDocument(); // second load
    expect(getSeason).toHaveBeenCalledTimes(2);
  });
});