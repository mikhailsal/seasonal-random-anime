import type { JSX } from 'react';

export interface HeaderProps {
  seasonLabel: string;
  sidebarCollapsed: boolean;
  onToggleSidebar: () => void;
}

export function legacyAppUrl(): string {
  return `${import.meta.env.BASE_URL}legacy/`;
}

function SidebarToggle(
  props: Pick<HeaderProps, 'sidebarCollapsed' | 'onToggleSidebar'>
): JSX.Element {
  return (
    <button
      type="button"
      className="toggle-sidebar"
      title="Hide/Show settings"
      aria-expanded={!props.sidebarCollapsed}
      aria-controls="sidebar"
      onClick={props.onToggleSidebar}
    >
      ☰
    </button>
  );
}

export function Header(props: HeaderProps): JSX.Element {
  return (
    <header className="header">
      <SidebarToggle {...props} />
      <h1>🎌 Seasonal Random Anime</h1>
      <p>
        Discover your next anime adventure. Season: <span>{props.seasonLabel}</span>
      </p>
      <a className="legacy-link" href={legacyAppUrl()}>
        Legacy version
      </a>
    </header>
  );
}
