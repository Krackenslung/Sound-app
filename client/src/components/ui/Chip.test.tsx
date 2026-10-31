import { render, screen } from '@testing-library/react';
import { Chip } from './Chip';

describe('Chip', () => {
  it('reflects selected state via aria-pressed and styles', () => {
    const { rerender } = render(<Chip>Tracks</Chip>);
    const chip = screen.getByRole('button', { name: 'Tracks' });
    expect(chip).toHaveAttribute('aria-pressed', 'false');
    expect(chip).toHaveClass('bg-surface-2');
    rerender(<Chip selected>Tracks</Chip>);
    expect(chip).toHaveAttribute('aria-pressed', 'true');
    expect(chip).toHaveClass('bg-text-primary', 'text-bg');
  });
});
