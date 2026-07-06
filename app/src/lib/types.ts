export type SeasonName = 'winter' | 'spring' | 'summer' | 'fall';

export const SEASON_NAMES: readonly SeasonName[] = ['winter', 'spring', 'summer', 'fall'];

export interface NamedEntity {
  mal_id?: number;
  name: string;
}

export interface ImageVariant {
  image_url?: string;
  small_image_url?: string;
  large_image_url?: string;
}

export interface ImageSet {
  jpg?: ImageVariant | undefined;
  webp?: ImageVariant | undefined;
}

export interface AiredRange {
  from?: string | null;
  to?: string | null;
}

export interface Broadcast {
  string?: string | null;
}

export interface Trailer {
  url?: string | null;
}

/** Raw anime payload from the Jikan v4 API. Fields may be absent or explicitly undefined. */
export interface Anime {
  mal_id?: number | undefined;
  url?: string | undefined;
  title?: string | undefined;
  title_english?: string | null;
  title_japanese?: string | null;
  type?: string | null;
  source?: string | null;
  episodes?: number | null;
  status?: string | null;
  aired?: AiredRange | null;
  duration?: string | null;
  rating?: string | null;
  score?: number | null;
  scored_by?: number | null;
  rank?: number | null;
  popularity?: number | null;
  members?: number | null;
  favorites?: number | null;
  synopsis?: string | null;
  background?: string | null;
  season?: string | null;
  year?: number | null;
  broadcast?: Broadcast | null;
  producers?: NamedEntity[] | undefined;
  licensors?: NamedEntity[] | undefined;
  studios?: NamedEntity[] | undefined;
  genres?: NamedEntity[] | undefined;
  explicit_genres?: NamedEntity[] | undefined;
  themes?: NamedEntity[] | undefined;
  demographics?: NamedEntity[] | undefined;
  trailer?: Trailer | null | undefined;
  images?: ImageSet | undefined;
}

/** App view model built from a raw Anime payload (mirrors the legacy SPA item shape). */
export interface AnimeItem {
  title: string;
  rating: number | 'N/A';
  popularity: string;
  episodes: number | 'N/A';
  type: string;
  genres: string[];
  description: string;
  images: string[] | null;
  currentImageIndex: number;
  link: string;
  galleryAugmented: boolean;
  apiData: Anime;
}

export interface SeasonIndexEntry {
  year: number;
  seasons: SeasonName[];
}

export interface SeasonIndexResponse {
  data: SeasonIndexEntry[];
}

export interface SeasonAnimePageResponse {
  data: Anime[];
  pagination?: {
    has_next_page?: boolean;
  };
}

export interface RelationEntry {
  mal_id: number;
  title: string;
}

export interface RelationEdge {
  relation: string;
  entry: RelationEntry[];
}

export interface RelationsResponse {
  data: RelationEdge[];
}

export interface PictureEntry {
  images?: ImageSet;
  jpg?: ImageVariant;
  webp?: ImageVariant;
}

export interface PicturesResponse {
  data: PictureEntry[];
}

export type RNG = () => number;
