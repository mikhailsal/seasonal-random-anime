import { describe, it, expect } from 'vitest';
import { loadApp } from '../utils/loadApp.mjs';

describe('parseDurationToMinutes (unit)', () => {
  it('parses minutes only', async () => {
    const { context } = await loadApp();
    expect(context.parseDurationToMinutes('24 min per ep')).toBe(24);
  });

  it('parses hours and minutes', async () => {
    const { context } = await loadApp();
    expect(context.parseDurationToMinutes('1 hr 30 min')).toBe(90);
  });

  it('parses hours only', async () => {
    const { context } = await loadApp();
    expect(context.parseDurationToMinutes('2 hr')).toBe(120);
  });

  it('returns null for unknown/empty', async () => {
    const { context } = await loadApp();
    expect(context.parseDurationToMinutes(null)).toBeNull();
    expect(context.parseDurationToMinutes(undefined)).toBeNull();
    expect(context.parseDurationToMinutes('unknown')).toBeNull();
  });
});