import type { JSX } from 'react';

export interface MatchActionsProps {
  matchCount: number;
  onAll: () => void;
  onNone: () => void;
  onDefaults: () => void;
  disabled?: boolean;
}

interface ActionSpec {
  label: string;
  title: string;
  onClick: () => void;
}

function actionSpecs(props: MatchActionsProps): ActionSpec[] {
  return [
    { label: 'All', title: 'Select all types and genres', onClick: props.onAll },
    { label: 'None', title: 'Uncheck all types and genres', onClick: props.onNone },
    { label: 'Defaults', title: 'Reset to defaults', onClick: props.onDefaults }
  ];
}

export function MatchActions(props: MatchActionsProps): JSX.Element {
  const disabled = props.disabled ?? false;
  return (
    <div className="match-row">
      <span className="match-count">
        Matches: <span data-testid="match-count">{props.matchCount}</span>
      </span>
      <div className="match-actions">
        {actionSpecs(props).map((action) => (
          <button
            key={action.label}
            type="button"
            className="clear-btn"
            title={action.title}
            disabled={disabled}
            onClick={action.onClick}
          >
            {action.label}
          </button>
        ))}
      </div>
    </div>
  );
}
