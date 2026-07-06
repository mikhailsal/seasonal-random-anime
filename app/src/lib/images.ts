import type { ImageSet, PictureEntry } from './types';

export type ImageQualityHint = 'webp_large' | 'webp' | 'jpg_large' | 'jpg';

interface RankedCandidate {
  url: string;
  rank: number;
}

const HINT_RANKS: Record<ImageQualityHint, number> = {
  webp_large: 3,
  webp: 2,
  jpg_large: 1,
  jpg: 0
};

export const GALLERY_CAP = 15;

/** Collects unique image candidates keeping the best quality variant per image. */
export type ImageCollector = Map<string, RankedCandidate>;

export function createImageCollector(): ImageCollector {
  return new Map<string, RankedCandidate>();
}

/**
 * Normalize a URL to a dedupe key: strips MAL resize segments, the file
 * extension, and the trailing "l" large-variant marker (legacy parity).
 */
export function normalizeImageKey(url: string): string {
  try {
    const parsed = new URL(url);
    let path = parsed.pathname;
    path = path.replace(/\/r\/[^/]+/g, '');
    path = path.replace(/\.[a-zA-Z0-9]+$/, '');
    path = path.replace(/l$/, '');
    return path.toLowerCase();
  } catch {
    return url;
  }
}

export function considerCandidate(
  collector: ImageCollector,
  url: string | null | undefined,
  hint: ImageQualityHint
): void {
  if (!url) return;
  const key = normalizeImageKey(url);
  const rank = HINT_RANKS[hint];
  const current = collector.get(key);
  if (!current || rank > current.rank) {
    collector.set(key, { url, rank });
  }
}

export function collectFromImageSet(collector: ImageCollector, images: ImageSet | undefined): void {
  considerCandidate(collector, images?.webp?.large_image_url, 'webp_large');
  considerCandidate(collector, images?.webp?.image_url, 'webp');
  considerCandidate(collector, images?.jpg?.large_image_url, 'jpg_large');
  considerCandidate(collector, images?.jpg?.image_url, 'jpg');
}

function pictureImageSet(pic: PictureEntry): ImageSet {
  return pic.images ?? { jpg: pic.jpg, webp: pic.webp };
}

export function collectFromPictures(collector: ImageCollector, pictures: PictureEntry[]): void {
  for (const pic of pictures) {
    collectFromImageSet(collector, pictureImageSet(pic));
    if (collector.size >= 20) break;
  }
}

export function seedExistingImages(collector: ImageCollector, urls: readonly string[]): void {
  for (const url of urls) {
    const hint: ImageQualityHint = /\.webp(\?|$)/.test(url) ? 'webp_large' : 'jpg_large';
    considerCandidate(collector, url, hint);
  }
}

/** Build the final gallery: best quality first, capped (legacy parity). */
export function buildGallery(collector: ImageCollector): string[] {
  return [...collector.values()]
    .sort((a, b) => b.rank - a.rank)
    .map((c) => c.url)
    .slice(0, GALLERY_CAP);
}
