export type JikanRelationEntry = { mal_id: number; title: string; };

export interface RelationEdge { relation: string; entry: JikanRelationEntry[]; }

export interface AnimeAPIPayload {
  mal_id?: number;
  url?: string;
  title?: string;
  title_english?: string;
  title_japanese?: string;
  type?: string;
  episodes?: number;
  duration?: string;
  score?: number;
  scored_by?: number;
  rank?: number;
  popularity?: number;
  synopsis?: string;
  images?: {
    webp?: { large_image_url?: string; image_url?: string };
    jpg?: { large_image_url?: string; image_url?: string };
  };
  [key: string]: any;
}

export interface AnimeItem {
  title: string;
  rating?: number;
  popularity?: string;
  episodes?: number;
  type?: string;
  genres: string[];
  description?: string;
  images?: string[] | null;
  currentImageIndex?: number;
  link?: string;
  apiData?: AnimeAPIPayload;
}

export interface DependencyFetch {
  fetchRelations?: (malId: number) => Promise<{ data: { relation: string; entry: { mal_id: number; title: string }[] }[] }>;
  fetchImages?: (malId: number) => Promise<string[]>;
}

export type RNG = () => number;

/**
 * Jikan / app-specific response types
 */

export type SeasonName = 'winter' | 'spring' | 'summer' | 'fall';

export interface SeasonIndexResponse {
  data: Array<{
    year: number;
    seasons: SeasonName[];
  }>;
}

/**
 * Minimal Anime type used by the service layer.
 * We reuse the API payload shape as a base so callers can
 * access raw fields when needed.
 */
export interface Anime extends AnimeAPIPayload {
  mal_id?: number;
  title?: string;
}

export interface SeasonAnimePageResponse {
  data: Anime[];
  pagination?: {
    has_next_page?: boolean;
  };
}