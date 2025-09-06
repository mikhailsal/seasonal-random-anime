# Seasonal Random Anime Application Analysis

## Overview

This document provides a comprehensive analysis of the current Seasonal Random Anime application, identifying all features in the original SPA and comparing them with the in-progress React rewrite.

## Original SPA Features (index.html)

### Core Functionality

#### 1. Seasonal Anime Browser
- **Year Selection**: Dropdown with available years (dynamically loaded from Jikan API)
- **Season Selection**: Winter/Spring/Summer/Fall dropdown
- **Season Loading**: Progressive loading with pagination (up to 5 pages)
- **Season Metadata**: Automatic current season determination

#### 2. Advanced Filtering System

**Type Filters** (static checkboxes):
- TV, Movie, OVA, ONA, Special, Music

**Genre Filters** (dynamic from current season):
- Dynamically populated from animeList.genres
- Supported genres include: Action, Adventure, Comedy, Drama, Fantasy, Mystery, etc.

**Episode Filters**:
- < 10 episodes
- 10-16 episodes
- 17-28 episodes
- > 28 episodes

**Duration Filters**:
- Include/exclude shorts (< 15 minutes)
- Min/Max duration inputs (converted to minutes from API strings)

**Continuity Filter**:
- Option to include sequels/continuations
- Default: exclude continuations
- Uses MAL relations API to detect prequels

#### 3. Random Selection Engine

**Core Algorithm**:
- Validates filtered anime list
- Respects active filters before picking
- Skips filtered results if no matches

**Continuity Avoidance**:
- Fetches MAL relations to detect prequels
- Retries up to 20 attempts to avoid continuations
- Respects rate limits (150ms delay between attempts)

#### 4. Rich Anime Display Cards

**Visual Elements**:
- Anime title with stats header
- Rating, Popularity, Episode count badges
- Genre tags with custom styling
- Description/synopsis section
- Multiple image display with cycling

**API Data Integration**:
- Comprehensive statistics section
- Background information
- Studios, Producers, Licensors
- Themes, Demographics, Explicit Genres
- Full airing dates and broadcast info

#### 5. Image Management System

**Image Loading Strategy**:
- Progressive loading on demand
- Multiple image sources: WebP/JPG large/small variants
- Gallery augmentation from extra API endpoints
- Local image caching
- Fallback placeholder images

**Interactive Features**:
- Click-to-cycle through image gallery
- Loading overlay with spinner
- Error handling with fallbacks
- Counter display (1/n images)

#### 6. UI/UX Features

**Responsive Design**:
- Two-pane layout: sidebar + main content
- Collapsible sidebar (toggle button)
- Mobile-optimized breakpoint handling

**User Experience**:
- Loading states throughout
- Smooth CSS animations (fadeIn, hover effects)
- Copy/paste friendly layout
- Keyboard navigation support

**Performance**:
- Debounced filter updates
- Rate limiting aware API calls
- Progressive data loading
- Gentle delays to respect API limits

## React Application State (app/src/)

### Current Implementation

#### App Component (`App.tsx`)
```typescript
- Basic seasonal controls (year/season dropdowns)
- Simple loading/error states
- Minimal anime selection flow
- Limited dependency injection support
```

#### FiltersSidebar Component (`FiltersSidebar.tsx`)
```typescript
- Year dropdown with options array
- Season dropdown (fixed 4 options)
- No filter checkboxes yet
```

#### AnimeCard Component (`AnimeCard.tsx`)
```typescript
- Title, image, synopsis display
- No stats, genres, or interactions
```

### Services Layer

#### Jikan Service (`services/jikan.ts`)
```typescript
- getSeasons(): Fetches available seasons index
- getSeason(): Fetches anime for specific season/year
- Robust retry logic with exponential backoff
- Configurable timeout and retry settings
```

### Utility Libraries

#### Duration Parser (`lib/duration.ts`)
```typescript
- parseDurationToMinutes(): Converts "24 min per ep" style strings
- Handles hours + minutes combinations
```

#### Selection Logic (`lib/selection.ts`)
```typescript
export async function pickRandomConsideringContinuity<T>(
  source: T[],
  options?: { deps?: SelectionDeps; rng?: RNG; includeContinuations?: boolean }
): Promise<T>
- More advanced than SPA implementation
- Includes actual relations API integration (not using search text matching)
```

#### Data Parser (`lib/parseAnimeData.ts`)
```typescript
- Legacy data format parser
- Supports original text-based anime data
- Fixed format with regex matching
```

## Functional Gaps Analysis

### Missing in React

#### 1. Complete Filtering System
- Type checkboxes not implemented
- Genre checkboxes missing
- Episode range filters not added
- Duration controls missing
- Continuity checkbox not present

#### 2. Rich Anime Display
- Stats display (rating/popularity/episodes)
- Genre tags styling
- Interactions (url links, trailer links)
- Gallery image cycling
- API data sections (statistics, background, studios)

#### 3. Advanced Features
- Progressive image loading
- Rate limiting handling in UI
- Real-time match counts
- Bulk filter operations (All/None/Defaults)

#### 4. UI Polish
- Responsive sidebar toggle
- Loading overlays
- Error boundaries
- Animation effects

## Implementation Roadmap

### Phase 1: Core Infrastructure
1. Extend FiltersSidebar with type checkboxes
2. Implement genre filtering
3. Add episode range filters
4. Build match count display

### Phase 2: Enhanced Selection
1. Add duration filters
2. Implement continuity filter
3. Integrate Jikan relations API
4. Add rate limiting UX

### Phase 3: Rich Display
1. Extend AnimeCard with stats
2. Add genre tags
3. Implement image gallery cycling
4. Add API data sections

### Phase 4: Polish
1. Responsive sidebar
2. Loading states
3. Animations and interactions
4. Error handling

## Technical Notes

### API Usage
- Jikan v4 endpoints relied upon
- Rate limiting at 3 requests/second
- Relations fetching adds 150ms delays
- Gallery augmentation needs additional requests

### Architecture Decisions
- Dependency injection pattern established
- Separation of services and UI logic
- TypeScript types well-defined
- Test infrastructure present

### Data Flow
- Seasonal data loaded once per season change
- Filters applied client-side
- Images loaded on-demand
- Relations checked during random selection

This analysis provides a complete understanding of the original SPA's capabilities and guides the React rewrite process.
