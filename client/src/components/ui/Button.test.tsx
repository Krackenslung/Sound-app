import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from './Button';

describe('Button', () => {
  it('renders primary by default and handles clicks', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Play</Button>);
    const btn = screen.getByRole('button', { name: 'Play' });
    expect(btn).toHaveClass('bg-accent', 'rounded-full');
    expect(btn).toHaveAttribute('type', 'button');
    await userEvent.click(btn);
    expect(onClick).toHaveBeenCalledOnce();
  });

  it.each([
    ['secondary', 'border-border'],
    ['ghost', 'text-text-secondary'],
  ] as const)('applies %s variant styles', (variant, cls) => {
    render(<Button variant={variant}>X</Button>);
    expect(screen.getByRole('button')).toHaveClass(cls);
  });
});
