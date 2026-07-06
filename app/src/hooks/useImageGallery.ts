import { useCallback, useEffect, useRef, useState } from 'react';

export type ImagePreloader = (url: string) => Promise<void>;

export interface GalleryApi {
  index: number;
  count: number;
  loading: boolean;
  cycle: () => void;
}

function browserPreload(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      resolve();
    };
    img.onerror = () => {
      reject(new Error(`Failed to load ${url}`));
    };
    img.src = url;
  });
}

interface CycleContext {
  images: readonly string[];
  index: number;
  preload: ImagePreloader;
  setIndex: (index: number) => void;
  setLoading: (loading: boolean) => void;
  /** Latest images reference; used to drop preloads that finish after the gallery changed. */
  currentImages: () => readonly string[];
}

function advanceGallery(ctx: CycleContext): void {
  if (ctx.images.length <= 1) return;
  const next = (ctx.index + 1) % ctx.images.length;
  const url = ctx.images[next];
  if (!url) return;
  ctx.setLoading(true);
  ctx
    .preload(url)
    .catch(() => undefined)
    .finally(() => {
      if (ctx.currentImages() === ctx.images) ctx.setIndex(next);
      ctx.setLoading(false);
    });
}

/**
 * Click-to-cycle image gallery (legacy parity): preload the next image while
 * showing a loading overlay, then advance; on error advance the counter anyway.
 */
export function useImageGallery(
  images: readonly string[],
  preload: ImagePreloader = browserPreload
): GalleryApi {
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const imagesRef = useRef(images);
  useEffect(() => {
    imagesRef.current = images;
  }, [images]);
  // Reset during render when the gallery changes (React "adjust state" pattern).
  const [prevImages, setPrevImages] = useState(images);
  if (prevImages !== images) {
    setPrevImages(images);
    setIndex(0);
  }

  const cycle = useCallback(() => {
    const currentImages = (): readonly string[] => imagesRef.current;
    advanceGallery({ images, index, preload, setIndex, setLoading, currentImages });
  }, [images, index, preload]);

  return { index, count: images.length, loading, cycle };
}
