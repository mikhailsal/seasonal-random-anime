import type { JSX } from 'react';

export interface ContinuityFilterProps {
  includeContinuations: boolean;
  onChange: (include: boolean) => void;
  disabled?: boolean;
}

export function ContinuityFilter(props: ContinuityFilterProps): JSX.Element {
  return (
    <>
      <label>
        <input
          type="checkbox"
          checked={props.includeContinuations}
          disabled={props.disabled ?? false}
          onChange={(e) => {
            props.onChange(e.target.checked);
          }}
        />{' '}
        Include continuations (Season 2+, sequels)
      </label>
      <div className="muted">
        When off (default), random picks avoid titles that have a prequel.
      </div>
    </>
  );
}
