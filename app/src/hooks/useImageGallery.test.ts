import { act, renderHook, waitFor } from '@testing-library/react';
import { useImageGallery } from './useImageGallery';
import type { ImagePreloader } from './useImageGallery';

const TWO_IMAGES = ['https://cdn.test/a.jpg', 'https://cdn.test/b.jpg'];

/** A preloader whose resolution is controlled by the test. */
function manualPreloader(): { preload: ImagePreloader; resolve: () => void; reject: () => void } {
  let settle: { resolve: () => void; reject: (err: Error) => void } | null = null;
  return {
    preload: () =>
      new Promise<void>((resolve, reject) => {
        settle = { resolve, reject };
      }),
    resolve: () => settle?.resolve(),
    reject: () => settle?.reject(new Error('preload failed'))
  };
}

describe('useImageGallery', () => {
  it('advances to the next image after the preload resolves', async () => {
    const { preload, resolve } = manualPreloader();
    const { result } = renderHook(() => useImageGallery(TWO_IMAGES, preload));
    act(() => {
      result.current.cycle();
    });
    expect(result.current.loading).toBe(true);
    expect(result.current.index).toBe(0);
    act(resolve);
    await waitFor(() => {
      expect(result.current.index).toBe(1);
    });
    expect(result.current.loading).toBe(false);
  });

  it('wraps around to the first image', async () => {
    const preload: ImagePreloader = () => Promise.resolve();
    const { result } = renderHook(() => useImageGallery(TWO_IMAGES, preload));
    act(() => {
      result.current.cycle();
    });
    await waitFor(() => {
      expect(result.current.index).toBe(1);
    });
    act(() => {
      result.current.cycle();
    });
    await waitFor(() => {
      expect(result.current.index).toBe(0);
    });
  });

  it('advances even when the preload fails (legacy parity)', async () => {
    const { preload, reject } = manualPreloader();
    const { result } = renderHook(() => useImageGallery(TWO_IMAGES, preload));
    act(() => {
      result.current.cycle();
    });
    act(reject);
    await waitFor(() => {
      expect(result.current.index).toBe(1);
    });
    expect(result.current.loading).toBe(false);
  });

  it('does nothing for gallery of one or zero images', () => {
    const preload = vi.fn<ImagePreloader>(() => Promise.resolve());
    const single = renderHook(() => useImageGallery(['https://cdn.test/a.jpg'], preload));
    act(() => {
      single.result.current.cycle();
    });
    expect(single.result.current.index).toBe(0);
    const empty = renderHook(() => useImageGallery([], preload));
    act(() => {
      empty.result.current.cycle();
    });
    expect(empty.result.current.index).toBe(0);
    expect(preload).not.toHaveBeenCalled();
  });

  it('drops a stale preload that resolves after the gallery changed', async () => {
    const { preload, resolve } = manualPreloader();
    const { result, rerender } = renderHook(({ images }) => useImageGallery(images, preload), {
      initialProps: { images: TWO_IMAGES }
    });
    act(() => {
      result.current.cycle();
    });
    expect(result.current.loading).toBe(true);
    const next = ['https://cdn.test/x.jpg', 'https://cdn.test/y.jpg', 'https://cdn.test/z.jpg'];
    rerender({ images: next });
    expect(result.current.index).toBe(0);
    act(resolve);
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    // The advance computed against the old gallery must not apply to the new one.
    expect(result.current.index).toBe(0);
    expect(result.current.count).toBe(3);
  });

  it('resets the index when the image list changes', async () => {
    const preload: ImagePreloader = () => Promise.resolve();
    const { result, rerender } = renderHook(({ images }) => useImageGallery(images, preload), {
      initialProps: { images: TWO_IMAGES }
    });
    act(() => {
      result.current.cycle();
    });
    await waitFor(() => {
      expect(result.current.index).toBe(1);
    });
    const next = ['https://cdn.test/c.jpg', 'https://cdn.test/d.jpg', 'https://cdn.test/e.jpg'];
    rerender({ images: next });
    expect(result.current.index).toBe(0);
    expect(result.current.count).toBe(3);
  });

  it('default browser preloader resolves on image load and rejects on error', async () => {
    class FakeImage {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      set src(value: string) {
        queueMicrotask(() => {
          if (value.includes('bad')) this.onerror?.();
          else this.onload?.();
        });
      }
    }
    vi.stubGlobal('Image', FakeImage);
    try {
      const { result } = renderHook(() => useImageGallery(TWO_IMAGES));
      act(() => {
        result.current.cycle();
      });
      await waitFor(() => {
        expect(result.current.index).toBe(1);
      });

      // The array must be referentially stable across renders, exactly like
      // callers must keep it stable in the app.
      const withBadImage = ['https://cdn.test/a.jpg', 'https://cdn.test/bad.jpg'];
      const failing = renderHook(() => useImageGallery(withBadImage));
      act(() => {
        failing.result.current.cycle();
      });
      // The rejection is swallowed and the gallery still advances.
      await waitFor(() => {
        expect(failing.result.current.index).toBe(1);
      });
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
