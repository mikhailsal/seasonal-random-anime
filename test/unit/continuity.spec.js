import { describe, it, expect } from 'vitest';
import { loadApp } from '../utils/loadApp.mjs';

describe('pickRandomConsideringContinuity (unit)', () => {
  it('returns an element from the source when includeContinuations=true', async () => {
    const { context } = await loadApp();
    context.includeContinuations = true;
    const src = [{ id: 1 }, { id: 2 }, { id: 3 }];
    const picked = await context.pickRandomConsideringContinuity(src);
    expect(src).toContainEqual(picked);
  });
});