import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ContinuityFilter } from './ContinuityFilter';
import { DurationFilters, parseDurationInput } from './DurationFilters';
import { ImageGallery } from './ImageGallery';
import { SeasonControls } from './SeasonControls';
import { placeholderImageUrl } from '../lib/format';

describe('SeasonControls', () => {
  const baseProps = {
    year: 2026,
    years: [2026, 2025, 2024],
    season: 'summer' as const,
    onYearChange: () => {},
    onSeasonChange: () => {}
  };

  it('emits numeric year changes', async () => {
    const onYearChange = vi.fn();
    render(<SeasonControls {...baseProps} onYearChange={onYearChange} />);
    await userEvent.selectOptions(screen.getByLabelText('Select Year'), '2024');
    expect(onYearChange).toHaveBeenCalledWith(2024);
  });

  it('emits season changes and disables both selects when loading', async () => {
    const onSeasonChange = vi.fn();
    const { rerender } = render(<SeasonControls {...baseProps} onSeasonChange={onSeasonChange} />);
    await userEvent.selectOptions(screen.getByLabelText('Select Season'), 'winter');
    expect(onSeasonChange).toHaveBeenCalledWith('winter');
    rerender(<SeasonControls {...baseProps} disabled />);
    expect(screen.getByLabelText('Select Year')).toBeDisabled();
    expect(screen.getByLabelText('Select Season')).toBeDisabled();
  });
});

describe('ContinuityFilter', () => {
  it('reports checkbox toggles', async () => {
    const onChange = vi.fn();
    render(<ContinuityFilter includeContinuations={false} onChange={onChange} />);
    await userEvent.click(screen.getByRole('checkbox'));
    expect(onChange).toHaveBeenCalledWith(true);
  });
});

describe('DurationFilters', () => {
  it('reports shorts-toggle changes', async () => {
    const onIncludeShortsChange = vi.fn();
    render(
      <DurationFilters
        includeShorts={false}
        minDuration={null}
        maxDuration={null}
        onIncludeShortsChange={onIncludeShortsChange}
        onMinChange={() => {}}
        onMaxChange={() => {}}
      />
    );
    await userEvent.click(screen.getByRole('checkbox'));
    expect(onIncludeShortsChange).toHaveBeenCalledWith(true);
  });

  describe('parseDurationInput', () => {
    it('returns null for empty or whitespace-only input', () => {
      expect(parseDurationInput('')).toBeNull();
      expect(parseDurationInput('   ')).toBeNull();
    });

    it('parses integers and clamps negatives to zero', () => {
      expect(parseDurationInput('24')).toBe(24);
      expect(parseDurationInput('-5')).toBe(0);
      expect(parseDurationInput('12.9')).toBe(12);
    });

    it('returns null (not NaN) for non-numeric input', () => {
      expect(parseDurationInput('abc')).toBeNull();
      expect(parseDurationInput('e')).toBeNull();
    });
  });
});

describe('ImageGallery error fallback', () => {
  it('swaps to the placeholder image when the current image fails to load', () => {
    render(
      <ImageGallery
        images={['https://cdn.test/broken.jpg']}
        title="Fallback Title"
        preload={() => Promise.resolve()}
      />
    );
    const img = screen.getByRole('img', { name: 'Fallback Title' });
    expect(img).toHaveAttribute('src', 'https://cdn.test/broken.jpg');
    fireEvent.error(img);
    expect(img).toHaveAttribute('src', placeholderImageUrl('Fallback Title'));
  });

  it('renders the placeholder directly for an empty gallery', () => {
    render(<ImageGallery images={[]} title="Empty" preload={() => Promise.resolve()} />);
    expect(screen.getByRole('img', { name: 'Empty' })).toHaveAttribute(
      'src',
      placeholderImageUrl('Empty')
    );
  });

  it('clears the error fallback when a new gallery arrives', () => {
    const preload = () => Promise.resolve();
    const { rerender } = render(
      <ImageGallery images={['https://cdn.test/broken.jpg']} title="Show" preload={preload} />
    );
    fireEvent.error(screen.getByRole('img', { name: 'Show' }));
    expect(screen.getByRole('img', { name: 'Show' })).toHaveAttribute(
      'src',
      placeholderImageUrl('Show')
    );
    rerender(
      <ImageGallery images={['https://cdn.test/fine.jpg']} title="Show" preload={preload} />
    );
    expect(screen.getByRole('img', { name: 'Show' })).toHaveAttribute(
      'src',
      'https://cdn.test/fine.jpg'
    );
  });

  it('exposes the cycle action as an accessible button', () => {
    render(
      <ImageGallery
        images={['https://cdn.test/a.jpg', 'https://cdn.test/b.jpg']}
        title="Keyboard"
        preload={() => Promise.resolve()}
      />
    );
    expect(screen.getByRole('button', { name: 'Show next image of Keyboard' })).toBeInTheDocument();
  });
});
