import { useState } from 'react';
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

export function ImageGallery({ images, title, preload }: ImageGalleryProps): JSX.Element {
  const gallery = useImageGallery(images, preload);
  const [errored, setErrored] = useState(false);
  const src = errored
    ? placeholderImageUrl(title)
    : (images[gallery.index] ?? placeholderImageUrl(title));
  return (
    <div className="anime-image-container">
      <LoadingOverlay active={gallery.loading} />
      <img
        src={src}
        alt={title}
        className="anime-image"
        onClick={gallery.cycle}
        onError={() => {
          setErrored(true);
        }}
      />
      <div className="image-counter">
        {gallery.index + 1} / {gallery.count}
      </div>
    </div>
  );
}
