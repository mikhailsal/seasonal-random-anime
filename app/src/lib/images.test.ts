import {
  buildGallery,
  collectFromImageSet,
  collectFromPictures,
  considerCandidate,
  createImageCollector,
  normalizeImageKey,
  seedExistingImages
} from './images';

describe('images', () => {
  describe('normalizeImageKey', () => {
    it('strips resize segments, extension and large marker', () => {
      expect(normalizeImageKey('https://cdn.myanimelist.net/r/120x120/images/anime/1/2l.jpg')).toBe(
        '/images/anime/1/2'
      );
      expect(normalizeImageKey('https://cdn.myanimelist.net/images/anime/1/2.webp')).toBe(
        '/images/anime/1/2'
      );
    });

    it('returns the raw string for invalid URLs', () => {
      expect(normalizeImageKey('not a url')).toBe('not a url');
    });
  });

  describe('considerCandidate', () => {
    it('keeps the best quality per normalized key', () => {
      const collector = createImageCollector();
      considerCandidate(collector, 'https://cdn.test/images/1.jpg', 'jpg');
      considerCandidate(collector, 'https://cdn.test/images/1l.webp', 'webp_large');
      expect(buildGallery(collector)).toEqual(['https://cdn.test/images/1l.webp']);
    });

    it('ignores null/undefined urls', () => {
      const collector = createImageCollector();
      considerCandidate(collector, null, 'jpg');
      considerCandidate(collector, undefined, 'jpg');
      expect(buildGallery(collector)).toEqual([]);
    });
  });

  it('collectFromImageSet picks all variants', () => {
    const collector = createImageCollector();
    collectFromImageSet(collector, {
      jpg: { image_url: 'https://c.t/a.jpg', large_image_url: 'https://c.t/al.jpg' },
      webp: { image_url: 'https://c.t/b.webp', large_image_url: 'https://c.t/bl.webp' }
    });
    expect(buildGallery(collector)).toEqual(['https://c.t/bl.webp', 'https://c.t/al.jpg']);
  });

  it('collectFromPictures supports flattened and nested shapes and caps at 20 keys', () => {
    const collector = createImageCollector();
    const pictures = Array.from({ length: 30 }, (_, i) => ({
      jpg: { image_url: `https://c.t/p${String(i)}.jpg` }
    }));
    collectFromPictures(collector, pictures);
    expect(collector.size).toBe(20);
  });

  it('buildGallery sorts best-first and caps at 15', () => {
    const collector = createImageCollector();
    for (let i = 0; i < 18; i++) {
      considerCandidate(collector, `https://c.t/x${String(i)}.jpg`, 'jpg');
    }
    considerCandidate(collector, 'https://c.t/best.webp', 'webp_large');
    const gallery = buildGallery(collector);
    expect(gallery).toHaveLength(15);
    expect(gallery[0]).toBe('https://c.t/best.webp');
  });

  it('seedExistingImages ranks webp urls as webp_large', () => {
    const collector = createImageCollector();
    seedExistingImages(collector, ['https://c.t/s.webp', 'https://c.t/other.jpg']);
    const gallery = buildGallery(collector);
    expect(gallery[0]).toBe('https://c.t/s.webp');
  });
});
