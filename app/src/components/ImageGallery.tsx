import { useCallback, useState } from 'react';
import type { JSX } from 'react';
import { placeholderImageUrl } from '../lib/format';
import { useImageGallery } from '../hooks/useImageGallery';
import type { ImagePreloader } from '../hooks/useImageGallery';

export interface ImageGalleryProps {
  images: readonly string[];
  title: string;
  preload?: ImagePreloader | undefined;
}

function LoadingOverlay({ active }: { active: boolean }): JSX.Element {
  return (
    <div className={`image-loading-overlay${active ? ' active' : ''}`}>
      <div className="image-spinner" />
    </div>
  );
}

interface GalleryImageProps {
  src: string;
  title: string;
  onCycle: () => void;
  onError: () => void;
}

function GalleryImage(props: GalleryImageProps): JSX.Element {
  return (
    <button
      type="button"
      className="image-button"
      aria-label={`Show next image of ${props.title}`}
      onClick={props.onCycle}
    >
      <img src={props.src} alt={props.title} className="anime-image" onError={props.onError} />
    </button>
  );
}

/** Placeholder fallback after a load error, reset whenever a new gallery arrives. */
function useErrorFallback(images: readonly string[]): {
  errored: boolean;
  markErrored: () => void;
} {
  const [errored, setErrored] = useState(false);
  // Reset during render when the gallery changes (React "adjust state" pattern).
  const [prevImages, setPrevImages] = useState(images);
  if (prevImages !== images) {
    setPrevImages(images);
    setErrored(false);
  }
  const markErrored = useCallback(() => {
    setErrored(true);
  }, []);
  return { errored, markErrored };
}

export function ImageGallery({ images, title, preload }: ImageGalleryProps): JSX.Element {
  const gallery = useImageGallery(images, preload);
  const { errored, markErrored } = useErrorFallback(images);
  const src = errored
    ? placeholderImageUrl(title)
    : (images[gallery.index] ?? placeholderImageUrl(title));
  return (
    <div className="anime-image-container">
      <LoadingOverlay active={gallery.loading} />
      <GalleryImage src={src} title={title} onCycle={gallery.cycle} onError={markErrored} />
      <div className="image-counter">
        {gallery.index + 1} / {gallery.count}
      </div>
    </div>
  );
}
