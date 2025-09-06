import { getSeason } from './jikan';

describe('Jikan API Integration (Real)', () => {
  it('can fetch real data from API', async () => {
    const response = await getSeason(2025, 'spring', { limit: 5 });
    expect(response.data).toBeDefined();
    expect(Array.isArray(response.data)).toBe(true);
    expect(response.data!.length).toBeGreaterThan(0);
    expect(response.data![0]).toHaveProperty('title');
    expect(response.data![0]).toHaveProperty('mal_id');
  });
});
