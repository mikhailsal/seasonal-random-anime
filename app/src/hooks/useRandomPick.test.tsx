import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { resolvePickSource, useRandomPick } from './useRandomPick';
import type { PickSources } from './useRandomPick';
import { allFilterState, defaultFilterState } from '../lib/filters';
import { makeFakeServices, makeItem } from '../test/fixtures';
import type { AppServices } from '../services/context';
import { ServicesContext } from '../services/context';

const unrestricted = () => ({ ...allFilterState(defaultFilterState()), excludeShorts: false });

function sources(overrides: Partial<PickSources> = {}): PickSources {
  const item = makeItem({ mal_id: 1, title: 'Picked' });
  return { items: [item], filtered: [item], filters: defaultFilterState(), ...overrides };
}

function renderPick(src: PickSources, services: AppServices = makeFakeServices()) {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <ServicesContext.Provider value={services}>{children}</ServicesContext.Provider>
  );
  return renderHook(() => useRandomPick(src), { wrapper });
}

describe('resolvePickSource', () => {
  const item = makeItem();

  it('uses the filtered list when filters are active', () => {
    expect(resolvePickSource(sources({ filtered: [item] }))).toEqual([item]);
  });

  it('returns null when filters are active but nothing matches', () => {
    expect(resolvePickSource(sources({ filtered: [] }))).toBeNull();
  });

  it('falls back to the full list when no filters are active', () => {
    const src = sources({ filtered: [], filters: unrestricted() });
    expect(resolvePickSource(src)).toEqual(src.items);
  });
});

describe('useRandomPick', () => {
  it('shows the picking state, then the selected anime with an augmented gallery', async () => {
    const services = makeFakeServices({ images: ['https://cdn.test/g1.jpg'] });
    const { result } = renderPick(sources(), services);
    act(() => {
      void result.current.pick();
    });
    expect(result.current.picking).toBe(true);
    await waitFor(
      () => {
        expect(result.current.selected).not.toBeNull();
      },
      { timeout: 3000 }
    );
    expect(result.current.picking).toBe(false);
    expect(result.current.notice).toBeNull();
    expect(result.current.selected?.title).toBe('Picked');
    expect(result.current.selected?.images).toEqual(['https://cdn.test/g1.jpg']);
    expect(result.current.selected?.galleryAugmented).toBe(true);
    expect(result.current.selected?.currentImageIndex).toBe(0);
  });

  it('notices immediately when no season data is loaded at all', async () => {
    const { result } = renderPick(sources({ items: [], filtered: [] }));
    await act(() => result.current.pick());
    expect(result.current.notice).toBe('No anime data loaded! Please load a season first.');
    expect(result.current.picking).toBe(false);
  });

  it('notices when active filters match nothing', async () => {
    const { result } = renderPick(sources({ filtered: [] }));
    await act(() => result.current.pick());
    expect(result.current.notice).toMatch(/No titles match your current filters/);
    expect(result.current.selected).toBeNull();
  });

  it('surfaces errors from the image loader and keeps the previous selection', async () => {
    const services = makeFakeServices();
    let fail = false;
    services.loadImages = (item) =>
      fail ? Promise.reject(new Error('HTTP 500')) : Promise.resolve(item.images ?? []);
    const { result } = renderPick(sources(), services);
    await act(() => result.current.pick());
    expect(result.current.selected).not.toBeNull();
    fail = true;
    await act(() => result.current.pick());
    expect(result.current.notice).toBe('HTTP 500');
    expect(result.current.selected?.title).toBe('Picked');
    expect(result.current.picking).toBe(false);
  });

  it('falls back to a generic notice for non-Error rejections', async () => {
    const services = makeFakeServices();
    // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors -- the generic-fallback path needs a non-Error rejection
    services.loadImages = () => Promise.reject('boom');
    const { result } = renderPick(sources(), services);
    await act(() => result.current.pick());
    expect(result.current.notice).toBe('Error loading anime. Please try again.');
  });

  it('passes the continuity checker through to the selection', async () => {
    const item = makeItem({ mal_id: 7 });
    const isContinuation = vi.fn((malId: number) => Promise.resolve(malId !== 7));
    const services = { ...makeFakeServices(), isContinuation };
    const { result } = renderPick(sources({ items: [item], filtered: [item] }), services);
    await act(() => result.current.pick());
    expect(isContinuation).toHaveBeenCalledWith(7);
    expect(result.current.selected?.apiData.mal_id).toBe(7);
  });
});
