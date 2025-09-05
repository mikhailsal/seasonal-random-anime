import { AnimeItem } from './types';

export function parseAnimeData(text: string): AnimeItem[] {
  if (!text) return [];

  const lines = text.split('\n');
  const anime: AnimeItem[] = [];
  let current: Partial<AnimeItem> & { genres: string[] } = { genres: [] };

  for (let raw of lines) {
    let line = raw.trim();

    // Skip header/footer noise from legacy data
    if (!line || line.startsWith('WINTER 2025') || line.startsWith('Rating >') || line.startsWith('TOTAL:') || line.startsWith('[Continue')) continue;

    // Start a new entry
    if (/^\d+\.\s/.test(line)) {
      if (current.title) anime.push(current as AnimeItem);
      current = {
        title: line.replace(/^\d+\.\s/, '').trim(),
        genres: []
      };
      continue;
    }

    // Core fields can appear on a single line (legacy format)
    if (line.includes('Rating:') && line.includes('Popularity:') && line.includes('Episodes:')) {
      const ratingMatch = line.match(/Rating:\s*([\d.]+)/);
      const popularityMatch = line.match(/Popularity:\s*([^|]+)/);
      const episodesMatch = line.match(/Episodes:\s*(\d+)/);

      if (ratingMatch) current.rating = parseFloat(ratingMatch[1]);
      if (popularityMatch) current.popularity = popularityMatch[1].trim();
      if (episodesMatch) current.episodes = parseInt(episodesMatch[1], 10);
      continue;
    }

    // Genres
    if (line.startsWith('Genres:')) {
      const genresText = line.replace('Genres:', '').trim();
      current.genres = genresText.split(',').map(g => g.trim()).filter(g => g);
      continue;
    }

    // Description
    if (line.startsWith('Description:')) {
      current.description = line.replace('Description:', '').trim();
      continue;
    }

    // Image: skip (data loaded later in other flows)
    if (line.startsWith('Image:')) {
      continue;
    }

    // Link
    if (line.startsWith('Link:')) {
      current.link = line.replace('Link:', '').trim();
      continue;
    }

    // Other lines are ignored for parity with legacy data
  }

  // Push last entry if present
  if (current.title) anime.push(current as AnimeItem);

  // Normalize to the AnimeItem shape expected by the rest of the app
  return anime.map(a => ({
    title: a.title,
    rating: a.rating,
    popularity: a.popularity,
    episodes: a.episodes,
    genres: a.genres ?? [],
    description: a.description,
    link: a.link,
    // Other fields (images, apiData, etc.) are intentionally omitted for parity tests
  })) as AnimeItem[];
}