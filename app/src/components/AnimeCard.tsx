import type { JSX } from 'react';
import type { AnimeItem } from '../lib/types';
import { ApiDetails } from './ApiDetails';
import { ImageGallery } from './ImageGallery';
import type { ImagePreloader } from '../hooks/useImageGallery';

export interface AnimeCardProps {
  item: AnimeItem;
  preloadImage?: ImagePreloader;
}

function StatBlock(props: { value: string; label: string }): JSX.Element {
  return (
    <div className="stat">
      <div className="stat-value">{props.value}</div>
      <div className="stat-label">{props.label}</div>
    </div>
  );
}

function CardHeader({ item }: { item: AnimeItem }): JSX.Element {
  const title = item.apiData.title ?? item.title;
  return (
    <div className="anime-header">
      <div className="anime-title">{title}</div>
      <div className="anime-stats">
        <StatBlock value={`⭐ ${String(item.rating)}`} label="Rating" />
        <StatBlock value={`👥 ${item.popularity}`} label="Popularity" />
        <StatBlock value={`📺 ${String(item.episodes)}`} label="Episodes" />
      </div>
    </div>
  );
}

function GenreTags({ genres }: { genres: string[] }): JSX.Element {
  return (
    <div className="genres">
      {genres.map((genre) => (
        <span className="genre-tag" key={genre}>
          {genre}
        </span>
      ))}
    </div>
  );
}

function ActionLinks({ item }: { item: AnimeItem }): JSX.Element {
  const trailerUrl = item.apiData.trailer?.url;
  const malLink = item.apiData.url ?? item.link;
  return (
    <div className="anime-actions">
      {trailerUrl && (
        <a href={trailerUrl} target="_blank" rel="noreferrer" className="trailer-link">
          🎬 Watch Trailer
        </a>
      )}
      <a href={malLink} target="_blank" rel="noreferrer" className="mal-link">
        View on MyAnimeList
      </a>
    </div>
  );
}

export function AnimeCard({ item, preloadImage }: AnimeCardProps): JSX.Element {
  const title = item.apiData.title ?? item.title;
  return (
    <article className="anime-card" data-testid="anime-card">
      <CardHeader item={item} />
      <div className="anime-content">
        <ImageGallery images={item.images ?? []} title={title} preload={preloadImage} />
        <div className="anime-details">
          <GenreTags genres={item.genres} />
          <ActionLinks item={item} />
        </div>
        <ApiDetails api={item.apiData} />
      </div>
    </article>
  );
}
