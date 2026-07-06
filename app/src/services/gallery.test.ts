import { loadAnimeImages } from './gallery';
import { makeItem } from '../test/fixtures';
import type { PicturesResponse } from '../lib/types';

describe('loadAnimeImages', () => {
  const noPrefetch = () => undefined;

  it('returns existing images when already augmented', async () => {
    const item = { ...makeItem(), galleryAugmented: true, images: ['https://c.t/keep.jpg'] };
    const fetchPictures = vi.fn();
    const images = await loadAnimeImages(item, { fetchPictures, prefetch: noPrefetch });
    expect(images).toEqual(['https://c.t/keep.jpg']);
    expect(fetchPictures).not.toHaveBeenCalled();
  });

  it('merges seeded, api and pictures images best-quality-first', async () => {
    const pictures: PicturesResponse = {
      data: [
        {
          images: {
            webp: { large_image_url: 'https://c.t/g1l.webp' },
            jpg: { image_url: 'https://c.t/g1.jpg' }
          }
        }
      ]
    };
    const item = makeItem();
    const images = await loadAnimeImages(item, {
      fetchPictures: () => Promise.resolve(pictures),
      prefetch: noPrefetch
    });
    expect(images[0]).toBe('https://cdn.test/1l.webp');
    expect(images).toContain('https://c.t/g1l.webp');
  });

  it('falls back to a placeholder when nothing is available', async () => {
    const item = makeItem({ images: undefined, mal_id: undefined });
    item.images = null;
    const images = await loadAnimeImages(item, { prefetch: noPrefetch });
    expect(images).toHaveLength(1);
    expect(images[0]).toContain('via.placeholder.com');
  });

  it('ignores pictures endpoint failures', async () => {
    const item = makeItem();
    const images = await loadAnimeImages(item, {
      fetchPictures: () => Promise.reject(new Error('429')),
      prefetch: noPrefetch
    });
    expect(images.length).toBeGreaterThan(0);
  });

  it('prefetches every returned image', async () => {
    const prefetch = vi.fn();
    const item = makeItem();
    const images = await loadAnimeImages(item, {
      fetchPictures: () => Promise.resolve({ data: [] }),
      prefetch
    });
    expect(prefetch).toHaveBeenCalledTimes(images.length);
  });
});
