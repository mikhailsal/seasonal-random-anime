import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CheckboxGroup, nextSelection } from './CheckboxGroup';
import type { CheckboxOption } from './CheckboxGroup';

const options: CheckboxOption[] = [
  { value: 'TV', label: 'TV' },
  { value: 'Movie', label: 'Movie' },
  { value: 'OVA', label: 'OVA' }
];

describe('nextSelection', () => {
  it('adds a value to the current selection', () => {
    expect(nextSelection(options, new Set(['TV']), 'Movie', true)).toEqual(['TV', 'Movie']);
  });

  it('removes a value from the current selection', () => {
    expect(nextSelection(options, new Set(['TV', 'Movie']), 'TV', false)).toEqual(['Movie']);
  });

  it('treats null selection as everything checked', () => {
    expect(nextSelection(options, null, 'Movie', false)).toEqual(['TV', 'OVA']);
  });
});

describe('CheckboxGroup', () => {
  it('renders options with the correct checked state', () => {
    render(
      <CheckboxGroup idPrefix="t" options={options} selected={new Set(['TV'])} onChange={vi.fn()} />
    );
    expect(screen.getByLabelText('TV')).toBeChecked();
    expect(screen.getByLabelText('Movie')).not.toBeChecked();
  });

  it('checks everything when selected is null', () => {
    render(<CheckboxGroup idPrefix="t" options={options} selected={null} onChange={vi.fn()} />);
    for (const option of options) {
      expect(screen.getByLabelText(option.label)).toBeChecked();
    }
  });

  it('emits the recomputed selection on toggle', async () => {
    const onChange = vi.fn();
    render(
      <CheckboxGroup
        idPrefix="t"
        options={options}
        selected={new Set(['TV'])}
        onChange={onChange}
      />
    );
    await userEvent.click(screen.getByLabelText('Movie'));
    expect(onChange).toHaveBeenCalledWith(['TV', 'Movie']);
  });
});
