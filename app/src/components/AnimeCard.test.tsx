import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AnimeCard } from './AnimeCard';
import { makeItem } from '../test/fixtures';

function fullItem() {
  const item = makeItem({
    title: 'Great Show',
    title_english: 'Great Show EN',
    title_japanese: 'グレート',
    source: 'Manga',
    status: 'Finished Airing',
    aired: { from: '2026-01-05T00:00:00+00:00', to: '2026-03-30T00:00:00+00:00' },
    rating: 'PG-13',
    season: 'winter',
    year: 2026,
    broadcast: { string: 'Sundays at 00:00 (JST)' },
    background: 'Some production background.',
    scored_by: 5000,
    rank: 12,
    favorites: 300,
    studios: [{ mal_id: 1, name: 'Studio A' }],
    producers: [{ mal_id: 2, name: 'Producer B' }],
    licensors: [{ mal_id: 3, name: 'Licensor C' }],
    themes: [{ mal_id: 4, name: 'Isekai' }],
    demographics: [{ mal_id: 5, name: 'Shounen' }],
    explicit_genres: [],
    trailer: { url: 'https://youtube.com/watch?v=abc' }
  });
  item.images = ['https://c.t/a.jpg', 'https://c.t/b.jpg'];
  return item;
}

describe('AnimeCard', () => {
  it('renders header stats, genres, links and API detail sections', () => {
    render(<AnimeCard item={fullItem()} />);
    expect(screen.getByText('Great Show')).toBeInTheDocument();
    expect(screen.getByText('⭐ 8.1')).toBeInTheDocument();
    expect(screen.getByText('📺 12')).toBeInTheDocument();
    // Genre appears both as a card tag and in the API genres section.
    expect(screen.getAllByText('Action').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByRole('link', { name: /View on MyAnimeList/ })).toHaveAttribute(
      'href',
      'https://myanimelist.net/anime/1'
    );
    expect(screen.getByRole('link', { name: /Watch Trailer/ })).toHaveAttribute(
      'href',
      'https://youtube.com/watch?v=abc'
    );
    expect(screen.getByText('📈 Statistics')).toBeInTheDocument();
    expect(screen.getByText('📝 Synopsis')).toBeInTheDocument();
    expect(screen.getByText('🎬 Background')).toBeInTheDocument();
    expect(screen.getByText('Studio A')).toBeInTheDocument();
    expect(screen.getByText('Producer B')).toBeInTheDocument();
    expect(screen.getByText('Licensor C')).toBeInTheDocument();
    expect(screen.getByText('Isekai')).toBeInTheDocument();
    expect(screen.getByText('Shounen')).toBeInTheDocument();
    expect(screen.getByText('English Title')).toBeInTheDocument();
    expect(screen.getByText('Broadcast')).toBeInTheDocument();
  });

  it('omits the trailer link when absent', () => {
    const item = makeItem({ trailer: null });
    render(<AnimeCard item={item} />);
    expect(screen.queryByRole('link', { name: /Watch Trailer/ })).not.toBeInTheDocument();
  });

  it('cycles images on click with a counter', async () => {
    const item = fullItem();
    const preload = vi.fn().mockResolvedValue(undefined);
    render(<AnimeCard item={item} preloadImage={preload} />);
    expect(screen.getByText('1 / 2')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('img', { name: 'Great Show' }));
    expect(await screen.findByText('2 / 2')).toBeInTheDocument();
    expect(preload).toHaveBeenCalledWith('https://c.t/b.jpg');
    await userEvent.click(screen.getByRole('img', { name: 'Great Show' }));
    expect(await screen.findByText('1 / 2')).toBeInTheDocument();
  });

  it('advances the counter even when preloading fails (legacy parity)', async () => {
    const item = fullItem();
    const preload = vi.fn().mockRejectedValue(new Error('broken'));
    render(<AnimeCard item={item} preloadImage={preload} />);
    await userEvent.click(screen.getByRole('img', { name: 'Great Show' }));
    expect(await screen.findByText('2 / 2')).toBeInTheDocument();
  });
});
