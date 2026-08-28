import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StarRating } from '@/components/ui/StarRating';

describe('StarRating Primitive', () => {
  it('renders radiogroup with 5 star buttons by default', () => {
    render(<StarRating value={3} />);
    const group = screen.getByRole('radiogroup');
    const radios = screen.getAllByRole('radio');

    expect(group).toBeInTheDocument();
    expect(radios).toHaveLength(5);
  });

  it('marks checked state for the selected rating', () => {
    render(<StarRating value={4} />);
    const star4 = screen.getByRole('radio', { name: /rate 4 stars/i });
    expect(star4).toHaveAttribute('aria-checked', 'true');
  });

  it('triggers onChange when star is clicked', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<StarRating value={0} onChange={handleChange} />);

    const star5 = screen.getByRole('radio', { name: /rate 5 stars/i });
    await user.click(star5);

    expect(handleChange).toHaveBeenCalledWith(5);
  });

  it('supports keyboard navigation', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<StarRating value={2} onChange={handleChange} />);

    const star2 = screen.getByRole('radio', { name: /rate 2 stars/i });
    star2.focus();
    await user.keyboard('{ArrowRight}');

    expect(handleChange).toHaveBeenCalledWith(3);
  });

  it('renders in readOnly mode with role="img"', () => {
    render(<StarRating value={5} readOnly />);
    expect(screen.getByRole('img')).toBeInTheDocument();
    expect(screen.queryByRole('radiogroup')).not.toBeInTheDocument();
  });
});
