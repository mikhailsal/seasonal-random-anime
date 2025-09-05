import { describe, it, expect } from 'vitest';
import { loadApp } from '../utils/loadApp.mjs';

const sample = `
1. Sample Anime
Rating: 8.70 | Popularity: 617K | Episodes: 13
Genres: Action, Comedy
Description: A great show.
Image: https://example.com/image.jpg
Link: https://myanimelist.net/anime/12345
`;

describe('parseAnimeData (unit)', () => {
  it('parses legacy text format', async () => {
    const { context } = await loadApp();
    const list = context.parseAnimeData(sample);
    expect(Array.isArray(list)).toBe(true);
    expect(list.length).toBe(1);
    const a = list[0];
    expect(a.title).toBe('Sample Anime');
    expect(a.rating).toBeCloseTo(8.7);
    expect(String(a.popularity)).toContain('617');
    expect(a.episodes).toBe(13);
    expect(a.genres).toEqual(['Action', 'Comedy']);
    expect(a.description).toBe('A great show.');
    expect(a.link).toBe('https://myanimelist.net/anime/12345');
  });
});