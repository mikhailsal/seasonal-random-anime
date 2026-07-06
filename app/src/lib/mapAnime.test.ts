import { toAnimeItem } from './mapAnime';
import { makeAnime } from '../test/fixtures';

describe('toAnimeItem', () => {
  it('maps a full payload (legacy parity)', () => {
    const item = toAnimeItem(makeAnime());
    expect(item.title).toBe('Test Anime');
    expect(item.rating).toBe(8.1);
    expect(item.popularity).toBe((120000).toLocaleString());
    expect(item.episodes).toBe(12);
    expect(item.type).toBe('TV');
    expect(item.genres).toEqual(['Action']);
    expect(item.link).toBe('https://myanimelist.net/anime/1');
    expect(item.images).toEqual([
      'https://cdn.test/1l.jpg',
      'https://cdn.test/1.jpg',
      'https://cdn.test/1l.webp'
    ]);
  });

  it('falls back through title variants', () => {
    expect(toAnimeItem(makeAnime({ title: undefined, title_english: 'EN' })).title).toBe('EN');
    expect(
      toAnimeItem(makeAnime({ title: undefined, title_english: null, title_japanese: 'JP' })).title
    ).toBe('JP');
    expect(
      toAnimeItem(makeAnime({ title: undefined, title_english: null, title_japanese: null })).title
    ).toBe('Untitled');
  });

  it('uses popularity rank when members missing and N/A when both missing', () => {
    expect(toAnimeItem(makeAnime({ members: null, popularity: 7 })).popularity).toBe('#7');
    expect(toAnimeItem(makeAnime({ members: null, popularity: null })).popularity).toBe('N/A');
  });

  it('handles missing optional fields', () => {
    const item = toAnimeItem(
      makeAnime({
        score: null,
        episodes: null,
        type: null,
        synopsis: null,
        genres: undefined,
        images: undefined,
        url: undefined,
        mal_id: 5
      })
    );
    expect(item.rating).toBe('N/A');
    expect(item.episodes).toBe('N/A');
    expect(item.type).toBe('Unknown');
    expect(item.description).toBe('No description available.');
    expect(item.genres).toEqual([]);
    expect(item.images).toBeNull();
    expect(item.link).toBe('https://myanimelist.net/anime/5');
  });

  it('falls back to "#" link when no url or mal_id', () => {
    expect(toAnimeItem(makeAnime({ url: undefined, mal_id: undefined })).link).toBe('#');
  });
});
