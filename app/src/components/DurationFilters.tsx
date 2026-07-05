import type { JSX } from 'react';

export interface DurationFiltersProps {
  includeShorts: boolean;
  minDuration: number | null;
  maxDuration: number | null;
  onIncludeShortsChange: (include: boolean) => void;
  onMinChange: (minutes: number | null) => void;
  onMaxChange: (minutes: number | null) => void;
  disabled?: boolean;
}

export function parseDurationInput(raw: string): number | null {
  const trimmed = raw.trim();
  if (trimmed === '') return null;
  return Math.max(0, Number.parseInt(trimmed, 10));
}

interface MinutesInputProps {
  id: string;
  label: string;
  value: number | null;
  onChange: (minutes: number | null) => void;
  disabled: boolean;
}

function MinutesInput(props: MinutesInputProps): JSX.Element {
  return (
    <>
      <label htmlFor={props.id} className="muted">
        {props.label}
      </label>
      <input
        id={props.id}
        type="number"
        min={0}
        placeholder="minutes"
        value={props.value ?? ''}
        disabled={props.disabled}
        onChange={(e) => {
          props.onChange(parseDurationInput(e.target.value));
        }}
      />
    </>
  );
}

function IncludeShortsToggle(props: DurationFiltersProps): JSX.Element {
  return (
    <label>
      <input
        type="checkbox"
        checked={props.includeShorts}
        disabled={props.disabled ?? false}
        onChange={(e) => {
          props.onIncludeShortsChange(e.target.checked);
        }}
      />{' '}
      Include shorts (&lt; 15 min)
    </label>
  );
}

export function DurationFilters(props: DurationFiltersProps): JSX.Element {
  const disabled = props.disabled ?? false;
  return (
    <div className="duration-controls" role="group" aria-labelledby="durationFiltersLabel">
      <IncludeShortsToggle {...props} />
      <div className="duration-row">
        <MinutesInput
          id="minDurationInput"
          label="Min"
          value={props.minDuration}
          onChange={props.onMinChange}
          disabled={disabled}
        />
        <MinutesInput
          id="maxDurationInput"
          label="Max"
          value={props.maxDuration}
          onChange={props.onMaxChange}
          disabled={disabled}
        />
      </div>
    </div>
  );
}
