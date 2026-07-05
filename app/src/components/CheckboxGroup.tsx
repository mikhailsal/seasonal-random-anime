import type { JSX } from 'react';

export interface CheckboxOption {
  value: string;
  label: string;
}

export interface CheckboxGroupProps {
  idPrefix: string;
  options: readonly CheckboxOption[];
  /** `null` means "everything selected" (legacy "All" semantics). */
  selected: ReadonlySet<string> | null;
  onChange: (values: string[]) => void;
  disabled?: boolean;
}

function isChecked(selected: ReadonlySet<string> | null, value: string): boolean {
  return selected === null || selected.has(value);
}

export function nextSelection(
  options: readonly CheckboxOption[],
  selected: ReadonlySet<string> | null,
  value: string,
  checked: boolean
): string[] {
  const current = new Set(options.filter((o) => isChecked(selected, o.value)).map((o) => o.value));
  if (checked) current.add(value);
  else current.delete(value);
  return options.map((o) => o.value).filter((v) => current.has(v));
}

export function CheckboxGroup(props: CheckboxGroupProps): JSX.Element {
  const { idPrefix, options, selected, onChange, disabled = false } = props;
  return (
    <div className="checkbox-list" role="group">
      {options.map((option) => (
        <label key={option.value} htmlFor={`${idPrefix}-${option.value}`}>
          <input
            type="checkbox"
            id={`${idPrefix}-${option.value}`}
            value={option.value}
            checked={isChecked(selected, option.value)}
            disabled={disabled}
            onChange={(e) => {
              onChange(nextSelection(options, selected, option.value, e.target.checked));
            }}
          />{' '}
          {option.label}
        </label>
      ))}
    </div>
  );
}
