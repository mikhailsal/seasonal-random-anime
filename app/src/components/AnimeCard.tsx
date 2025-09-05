import React from 'react';

export type AnimeCardProps = {
  title?: string | null;
  imageUrl?: string | null;
  synopsis?: string | null;
};

export function AnimeCard({ title, imageUrl, synopsis }: AnimeCardProps) {
  return (
    <article aria-label="anime-card" style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
      {imageUrl ? (
        <img src={imageUrl} alt={title || 'anime image'} style={{ width: 120, height: 'auto', objectFit: 'cover' }} />
      ) : null}
      <div>
        <h2 style={{ margin: '0 0 8px 0' }}>{title}</h2>
        {synopsis ? <p style={{ margin: 0 }}>{synopsis}</p> : <p style={{ margin: 0, color: '#666' }}>No synopsis</p>}
      </div>
    </article>
  );
}