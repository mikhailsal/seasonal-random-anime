import { describe, it, expect } from 'vitest';
import { loadApp } from '../utils/loadApp.mjs';

describe('displayAnime (unit DOM)', () => {
  it('renders basic card content', async () => {
    const { context, document } = await loadApp();
    document.body.innerHTML = '<div id="animeCard"></div>';

    const anime = {
      title: 'Render Test',
      rating: 8.2,
      popularity: '100K',
      episodes: 12,
      genres: ['Action', 'Comedy'],
      images: ['https://via.placeholder.com/200x280/000000/ffffff?text=Test'],
      currentImageIndex: 0,
      link: 'https://example.com',
      apiData: { url: 'https://example.com', title: 'Render Test' }
    };

    context.displayAnime(anime);

    const titleEl = document.querySelector('.anime-title');
    const imgEl = document.querySelector('.anime-image');
    expect(titleEl?.textContent).toContain('Render Test');
    expect(imgEl).toBeTruthy();
  });
});