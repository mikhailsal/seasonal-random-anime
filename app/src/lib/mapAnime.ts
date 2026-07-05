import type { Anime, AnimeItem } from './types';

function pushUnique(urls: string[], url: string | null | undefined): void {
  if (url && !urls.includes(url)) urls.push(url);
}

function seedImageUrls(anime: Anime): string[] {
  const urls: string[] = [];
  pushUnique(urls, anime.images?.jpg?.large_image_url);
  pushUnique(urls, anime.images?.jpg?.image_url);
  pushUnique(urls, anime.images?.webp?.large_image_url);
  return urls;
}

function popularityLabel(anime: Anime): string {
  if (typeof anime.members === 'number') return anime.members.toLocaleString();
  if (anime.popularity != null) return `#${String(anime.popularity)}`;
  return 'N/A';
}

function malLink(anime: Anime): string {
  if (anime.url) return anime.url;
  if (anime.mal_id != null) return `https://myanimelist.net/anime/${String(anime.mal_id)}`;
  return '#';
}

/** Convert a raw Jikan payload into the app view model (legacy SPA parity). */
export function toAnimeItem(anime: Anime): AnimeItem {
  const images = seedImageUrls(anime);
  return {
    title: anime.title ?? anime.title_english ?? anime.title_japanese ?? 'Untitled',
    rating: typeof anime.score === 'number' ? anime.score : 'N/A',
    popularity: popularityLabel(anime),
    episodes: typeof anime.episodes === 'number' ? anime.episodes : 'N/A',
    type: anime.type ?? 'Unknown',
    genres: (anime.genres ?? []).map((g) => g.name).filter(Boolean),
    description: anime.synopsis ?? 'No description available.',
    images: images.length > 0 ? images : null,
    currentImageIndex: 0,
    link: malLink(anime),
    galleryAugmented: false,
    apiData: anime
  };
}
