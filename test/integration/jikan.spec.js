// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { fetchWithRetry } from '../utils/fetchWithRetry.mjs';

const BASE = 'https://api.jikan.moe/v4';

describe('Jikan API integration', () => {
  it('seasons index returns non-empty data array', async () => {
    const json = await fetchWithRetry(`${BASE}/seasons`, {
      retries: 3,
      baseDelayMs: 400,
      timeoutMs: 12000
    });
    expect(Array.isArray(json?.data)).toBe(true);
    expect((json?.data ?? []).length).toBeGreaterThan(0);
  }, 30000);

  it('season page returns items with title and images', async () => {
    // Use a recent, well-populated season to reduce flakiness.
    const json = await fetchWithRetry(`${BASE}/seasons/2024/spring?limit=10`, {
      retries: 3,
      baseDelayMs: 400,
      timeoutMs: 15000
    });
    expect(Array.isArray(json?.data)).toBe(true);
    expect((json?.data ?? []).length).toBeGreaterThan(0);
    const item = json.data[0];
    expect(typeof item.title).toBe('string');
    // Images are nested; accept either jpg or webp presence.
    expect(!!(item.images && (item.images.jpg || item.images.webp))).toBe(true);
  }, 30000);
});