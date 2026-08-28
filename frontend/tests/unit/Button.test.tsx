import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from '@/components/ui/Button';

describe('Button Primitive', () => {
  it('renders children correctly', () => {
    render(<Button>Click Me</Button>);
    expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument();
  });

  it('applies default 56px height and 48px touch target classes', () => {
    render(<Button>Standard Button</Button>);
    const btn = screen.getByRole('button');
    expect(btn).toHaveClass('h-[56px]');
    expect(btn).toHaveClass('min-h-[48px]');
  });

  it('renders primary variant with Deep Teal background', () => {
    render(<Button variant="primary">Primary</Button>);
    const btn = screen.getByRole('button');
    expect(btn).toHaveClass('bg-primary-container');
    expect(btn).toHaveClass('text-on-primary');
  });

  it('renders pill variant with rounded-full', () => {
    render(<Button variant="pill">Pill Button</Button>);
    const btn = screen.getByRole('button');
    expect(btn).toHaveClass('rounded-full');
  });

  it('renders outline variant correctly', () => {
    render(<Button variant="outline">Outline Button</Button>);
    const btn = screen.getByRole('button');
    expect(btn).toHaveClass('border-2');
  });

  it('renders loading spinner and disables button when isLoading is true', () => {
    render(<Button isLoading>Submit</Button>);
    const btn = screen.getByRole('button');
    expect(btn).toBeDisabled();
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  it('renders leftIcon and rightIcon properly', () => {
    render(
      <Button
        leftIcon={<span data-testid="left-icon">L</span>}
        rightIcon={<span data-testid="right-icon">R</span>}
      >
        With Icons
      </Button>
    );
    expect(screen.getByTestId('left-icon')).toBeInTheDocument();
    expect(screen.getByTestId('right-icon')).toBeInTheDocument();
  });

  it('handles click events when enabled', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Action</Button>);

    await user.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('does not trigger click when disabled', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();
    render(
      <Button disabled onClick={handleClick}>
        Disabled
      </Button>
    );

    await user.click(screen.getByRole('button'));
    expect(handleClick).not.toHaveBeenCalled();
  });
});
