import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App, buildGenreOptions, buildTypeOptions, currentSeasonName } from './App';
import { makeAnime, makeFakeServices, makeItem } from './test/fixtures';
import type { Anime } from './lib/types';

function seasonFixture(): Anime[] {
  return [
    makeAnime({ mal_id: 1, title: 'TV Action', type: 'TV', episodes: 12 }),
    makeAnime({
      mal_id: 2,
      title: 'Long Runner',
      type: 'TV',
      episodes: 50,
      genres: [{ mal_id: 2, name: 'Comedy' }]
    }),
    makeAnime({
      mal_id: 3,
      title: 'Horror Movie',
      type: 'Movie',
      episodes: 1,
      genres: [{ mal_id: 3, name: 'Horror' }]
    }),
    makeAnime({
      mal_id: 4,
      title: 'Short Show',
      type: 'ONA',
      episodes: 12,
      duration: '5 min per ep'
    })
  ];
}

const findMatchCount = () => screen.findByTestId('match-count', {}, { timeout: 3000 });

async function renderLoadedApp(services = makeFakeServices({ season: seasonFixture() })) {
  render(<App services={services} />);
  await findMatchCount();
  return services;
}

describe('helpers', () => {
  it('currentSeasonName maps months to seasons', () => {
    expect(currentSeasonName(new Date(2026, 0, 15))).toBe('winter');
    expect(currentSeasonName(new Date(2026, 4, 15))).toBe('spring');
    expect(currentSeasonName(new Date(2026, 7, 15))).toBe('summer');
    expect(currentSeasonName(new Date(2026, 10, 15))).toBe('fall');
  });

  it('buildTypeOptions keeps known present types and falls back to all', () => {
    const items = [makeItem({ type: 'TV' }), makeItem({ type: 'Movie' })];
    expect(buildTypeOptions(items).map((o) => o.value)).toEqual(['TV', 'Movie']);
    expect(buildTypeOptions([makeItem({ type: 'Weird' })]).map((o) => o.value)).toEqual([
      'TV',
      'Movie',
      'OVA',
      'ONA',
      'Special',
      'Music'
    ]);
  });

  it('buildGenreOptions collects sorted unique genres', () => {
    const items = [
      makeItem({ genres: [{ name: 'Drama' }, { name: 'Action' }] }),
      makeItem({ genres: [{ name: 'Action' }] })
    ];
    expect(buildGenreOptions(items).map((o) => o.value)).toEqual(['Action', 'Drama']);
  });
});

describe('App (functional)', () => {
  it('loads the season and shows the default match count', async () => {
    await renderLoadedApp();
    // Defaults: TV/OVA/ONA + default genres + 10-16/17-28 episodes + exclude shorts
    // -> only "TV Action" (12 eps, Action) matches.
    expect((await findMatchCount()).textContent).toBe('1');
    expect(screen.getByText('🎌 Seasonal Random Anime')).toBeInTheDocument();
  });

  it('links to the legacy version', async () => {
    await renderLoadedApp();
    expect(screen.getByRole('link', { name: 'Legacy version' })).toHaveAttribute(
      'href',
      expect.stringContaining('legacy/')
    );
  });

  it('updates the match count when filters change', async () => {
    await renderLoadedApp();
    // Unchecking the TV type removes the only default match.
    await userEvent.click(screen.getByLabelText('TV'));
    expect((await findMatchCount()).textContent).toBe('0');
  });

  it('supports All / None / Defaults bulk actions', async () => {
    await renderLoadedApp();
    await userEvent.click(screen.getByRole('button', { name: 'All' }));
    expect((await findMatchCount()).textContent).toBe('4');
    await userEvent.click(screen.getByRole('button', { name: 'None' }));
    expect((await findMatchCount()).textContent).toBe('0');
    await userEvent.click(screen.getByRole('button', { name: 'Defaults' }));
    expect((await findMatchCount()).textContent).toBe('1');
  });

  it('applies duration bounds from the inputs', async () => {
    await renderLoadedApp();
    await userEvent.click(screen.getByRole('button', { name: 'All' }));
    await userEvent.type(screen.getByLabelText('Min'), '10');
    expect((await findMatchCount()).textContent).toBe('3');
    await userEvent.type(screen.getByLabelText('Max'), '20');
    expect((await findMatchCount()).textContent).toBe('0');
  });

  it('picks a random anime and renders the full card', async () => {
    await renderLoadedApp();
    await userEvent.click(screen.getByRole('button', { name: /Pick Random Anime/ }));
    const card = await screen.findByTestId('anime-card', {}, { timeout: 5000 });
    expect(within(card).getByText('TV Action')).toBeInTheDocument();
    expect(within(card).getByText('📈 Statistics')).toBeInTheDocument();
    expect(within(card).getByRole('link', { name: /View on MyAnimeList/ })).toBeInTheDocument();
  });

  it('shows a notice when no titles match the filters', async () => {
    await renderLoadedApp();
    await userEvent.click(screen.getByRole('button', { name: 'None' }));
    await userEvent.click(screen.getByRole('button', { name: /Pick Random Anime/ }));
    expect(
      await screen.findByText(/No titles match your current filters/, {}, { timeout: 3000 })
    ).toBeInTheDocument();
  });

  it('avoids continuations when picking (default off)', async () => {
    const continuations = new Map([
      [1, true],
      [2, true],
      [3, true],
      [4, true]
    ]);
    continuations.set(1, false);
    const services = makeFakeServices({ season: seasonFixture(), continuations });
    await renderLoadedApp(services);
    await userEvent.click(screen.getByRole('button', { name: 'All' }));
    await userEvent.click(screen.getByRole('button', { name: /Pick Random Anime/ }));
    const card = await screen.findByTestId('anime-card', {}, { timeout: 5000 });
    expect(within(card).getByText('TV Action')).toBeInTheDocument();
  });

  it('toggles the sidebar collapsed state', async () => {
    await renderLoadedApp();
    const toggle = screen.getByRole('button', { name: '☰' });
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await userEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
  });

  it('shows an error message when the season fails to load', async () => {
    const services = makeFakeServices();
    services.loadSeason = () => Promise.reject(new Error('HTTP 500'));
    render(<App services={services} />);
    expect(
      await screen.findByText(/Failed to load season data/, {}, { timeout: 3000 })
    ).toBeInTheDocument();
  });
});
