import {
  buildGallery,
  collectFromImageSet,
  collectFromPictures,
  createImageCollector,
  seedExistingImages
} from '../lib/images';
import { placeholderImageUrl } from '../lib/format';
import type { AnimeItem, PicturesResponse } from '../lib/types';
import { getPictures } from './jikan';
import type { JikanOptions } from './jikan';

export interface GalleryDeps extends JikanOptions {
  fetchPictures?: (malId: number) => Promise<PicturesResponse>;
  /** Prefetch hook to warm the browser cache; defaults to `new Image()`. */
  prefetch?: (url: string) => void;
}

function defaultPrefetch(url: string): void {
  const img = new Image();
  img.src = url;
}

async function fetchGalleryPictures(
  malId: number | undefined,
  deps: GalleryDeps
): Promise<PicturesResponse | null> {
  if (malId == null) return null;
  const fetcher = deps.fetchPictures ?? ((id: number) => getPictures(id, deps));
  try {
    return await fetcher(malId);
  } catch {
    return null;
  }
}

/**
 * Augment an anime's image gallery from the Jikan pictures endpoint
 * (legacy parity: dedupe by normalized URL, best quality first, cap 15,
 * placeholder fallback, prefetch to warm the cache).
 */
export async function loadAnimeImages(item: AnimeItem, deps: GalleryDeps = {}): Promise<string[]> {
  if (item.galleryAugmented && item.images !== null && item.images.length > 0) {
    return item.images;
  }
  const collector = createImageCollector();
  seedExistingImages(collector, item.images ?? []);
  collectFromImageSet(collector, item.apiData.images);
  const pictures = await fetchGalleryPictures(item.apiData.mal_id, deps);
  if (pictures) collectFromPictures(collector, pictures.data);

  const gallery = buildGallery(collector);
  const images = gallery.length > 0 ? gallery : [placeholderImageUrl(item.title)];
  const prefetch = deps.prefetch ?? defaultPrefetch;
  for (const url of images) prefetch(url);
  return images;
}
