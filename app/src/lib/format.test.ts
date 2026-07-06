import { capitalize, formatAired, placeholderImageUrl } from './format';

describe('format', () => {
  it('capitalize uppercases the first letter', () => {
    expect(capitalize('spring')).toBe('Spring');
  });

  describe('formatAired', () => {
    it('formats from/to dates', () => {
      const out = formatAired({
        from: '2025-01-05T00:00:00+00:00',
        to: '2025-03-30T00:00:00+00:00'
      });
      expect(out).toContain(new Date('2025-01-05T00:00:00+00:00').toLocaleDateString());
      expect(out).toContain(' - ');
    });

    it('marks missing end date as Ongoing', () => {
      expect(formatAired({ from: '2025-01-05T00:00:00+00:00', to: null })).toContain('Ongoing');
    });

    it('handles null aired', () => {
      expect(formatAired(null)).toBe('N/A');
      expect(formatAired({ from: null, to: null })).toBe('N/A - Ongoing');
    });
  });

  it('placeholderImageUrl uses the first two words of the title', () => {
    expect(placeholderImageUrl('Some Long Anime Title')).toContain(encodeURIComponent('Some Long'));
  });
});
