import { parseDurationToMinutes } from './duration';

describe('parseDurationToMinutes', () => {
  it('parses "24 min per ep"', () => {
    expect(parseDurationToMinutes('24 min per ep')).toBe(24);
  });

  it('parses hours and minutes combined', () => {
    expect(parseDurationToMinutes('1 hr 30 min')).toBe(90);
  });

  it('parses hours only', () => {
    expect(parseDurationToMinutes('2 hr')).toBe(120);
  });

  it('returns null for unknown formats', () => {
    expect(parseDurationToMinutes('Unknown')).toBeNull();
  });

  it('returns null for null/undefined/empty', () => {
    expect(parseDurationToMinutes(null)).toBeNull();
    expect(parseDurationToMinutes(undefined)).toBeNull();
    expect(parseDurationToMinutes('')).toBeNull();
  });
});
