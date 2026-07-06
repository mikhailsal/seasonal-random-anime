import type { JSX, ReactNode } from 'react';
import { formatAired } from '../lib/format';
import type { Anime, NamedEntity } from '../lib/types';

interface LabeledValue {
  label: string;
  value: string;
}

function ApiSection(props: { title: string; children: ReactNode }): JSX.Element {
  return (
    <div className="api-section">
      <h3>{props.title}</h3>
      {props.children}
    </div>
  );
}

function ApiGrid({ entries }: { entries: LabeledValue[] }): JSX.Element {
  return (
    <div className="api-grid">
      {entries.map((entry) => (
        <div className="api-item" key={entry.label}>
          <div className="api-label">{entry.label}</div>
          <div className="api-value">{entry.value}</div>
        </div>
      ))}
    </div>
  );
}

function TextSection(props: { title: string; text: string }): JSX.Element {
  return (
    <ApiSection title={props.title}>
      <div className="synopsis-text">{props.text}</div>
    </ApiSection>
  );
}

function TagList({ entities }: { entities: NamedEntity[] }): JSX.Element {
  return (
    <div className="tag-list">
      {entities.map((entity) => (
        <span className="api-tag" key={String(entity.mal_id ?? entity.name)}>
          {entity.name}
        </span>
      ))}
    </div>
  );
}

function statEntries(api: Anime): LabeledValue[] {
  const entries: (LabeledValue | null)[] = [
    api.score ? { label: 'MAL Score', value: `⭐ ${String(api.score)}/10` } : null,
    api.scored_by ? { label: 'Scored By', value: `${api.scored_by.toLocaleString()} users` } : null,
    api.rank ? { label: 'Rank', value: `#${String(api.rank)}` } : null,
    api.popularity ? { label: 'Popularity Rank', value: `#${String(api.popularity)}` } : null,
    api.members ? { label: 'Members', value: api.members.toLocaleString() } : null,
    api.favorites ? { label: 'Favorites', value: `❤️ ${api.favorites.toLocaleString()}` } : null
  ];
  return entries.filter((e): e is LabeledValue => e !== null);
}

function info(label: string, value: string | null | undefined): LabeledValue | null {
  return value ? { label, value } : null;
}

function titleInfoEntries(api: Anime): (LabeledValue | null)[] {
  return [
    info('English Title', api.title_english),
    info('Japanese Title', api.title_japanese),
    info('Type', api.type),
    info('Source', api.source),
    info('Status', api.status)
  ];
}

function airingInfoEntries(api: Anime): (LabeledValue | null)[] {
  return [
    api.aired ? { label: 'Aired', value: formatAired(api.aired) } : null,
    info('Duration', api.duration),
    info('Age Rating', api.rating),
    api.season && api.year ? { label: 'Season', value: `${api.season} ${String(api.year)}` } : null,
    info('Broadcast', api.broadcast?.string)
  ];
}

function infoEntries(api: Anime): LabeledValue[] {
  const entries = [...titleInfoEntries(api), ...airingInfoEntries(api)];
  return entries.filter((e): e is LabeledValue => e !== null);
}

interface TagSectionSpec {
  title: string;
  pick: (api: Anime) => NamedEntity[] | undefined;
}

const TAG_SECTIONS: readonly TagSectionSpec[] = [
  { title: '🏢 Studios', pick: (api) => api.studios },
  { title: '🎭 Producers', pick: (api) => api.producers },
  { title: '📺 Licensors', pick: (api) => api.licensors },
  { title: '🎯 Genres (API)', pick: (api) => api.genres },
  { title: '🎨 Themes', pick: (api) => api.themes },
  { title: '👥 Demographics', pick: (api) => api.demographics },
  { title: '🔞 Explicit Genres', pick: (api) => api.explicit_genres }
];

function TagSections({ api }: { api: Anime }): JSX.Element {
  return (
    <>
      {TAG_SECTIONS.map(({ title, pick }) => {
        const entities = pick(api);
        if (!entities || entities.length === 0) return null;
        return (
          <ApiSection title={title} key={title}>
            <TagList entities={entities} />
          </ApiSection>
        );
      })}
    </>
  );
}

export function ApiDetails({ api }: { api: Anime }): JSX.Element {
  return (
    <div className="api-details">
      <ApiSection title="📈 Statistics">
        <ApiGrid entries={statEntries(api)} />
      </ApiSection>
      {api.synopsis && <TextSection title="📝 Synopsis" text={api.synopsis} />}
      {api.background && <TextSection title="🎬 Background" text={api.background} />}
      <TagSections api={api} />
      <ApiSection title="📊 Detailed Information from MyAnimeList">
        <ApiGrid entries={infoEntries(api)} />
      </ApiSection>
    </div>
  );
}
