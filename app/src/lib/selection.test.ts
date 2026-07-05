import { pickRandomConsideringContinuity } from './selection';
import { makeItem } from '../test/fixtures';

const noSleep = () => Promise.resolve();

describe('pickRandomConsideringContinuity', () => {
  const items = [makeItem({ mal_id: 1 }), makeItem({ mal_id: 2 }), makeItem({ mal_id: 3 })];

  it('returns null for an empty source', async () => {
    await expect(pickRandomConsideringContinuity([], {})).resolves.toBeNull();
  });

  it('returns any random item when continuations are included (no checker calls)', async () => {
    const isContinuation = vi.fn();
    const pick = await pickRandomConsideringContinuity(items, {
      includeContinuations: true,
      isContinuation,
      rng: () => 0.5
    });
    expect(pick?.apiData.mal_id).toBe(2);
    expect(isContinuation).not.toHaveBeenCalled();
  });

  it('skips continuations and returns a non-continuation', async () => {
    const rngValues = [0, 0.5, 0.9];
    let call = 0;
    const isContinuation = (malId: number) => Promise.resolve(malId === 1);
    const pick = await pickRandomConsideringContinuity(items, {
      rng: () => rngValues[call++ % rngValues.length] ?? 0,
      isContinuation,
      sleep: noSleep
    });
    expect(pick?.apiData.mal_id).toBe(2);
  });

  it('falls back to any item after exhausting attempts', async () => {
    const isContinuation = vi.fn().mockResolvedValue(true);
    const pick = await pickRandomConsideringContinuity(items, {
      rng: () => 0,
      isContinuation,
      sleep: noSleep
    });
    expect(pick?.apiData.mal_id).toBe(1);
    expect(isContinuation).toHaveBeenCalledTimes(20);
  });

  it('treats checker errors as non-continuation (legacy parity)', async () => {
    const isContinuation = vi.fn().mockRejectedValue(new Error('boom'));
    const pick = await pickRandomConsideringContinuity(items, {
      rng: () => 0,
      isContinuation,
      sleep: noSleep
    });
    expect(pick?.apiData.mal_id).toBe(1);
  });
});
