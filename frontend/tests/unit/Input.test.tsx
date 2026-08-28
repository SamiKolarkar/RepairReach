import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Input } from '@/components/ui/Input';

describe('Input Primitive', () => {
  it('renders label associated with input', () => {
    render(<Input label="Full Name" id="full-name" />);
    const label = screen.getByText('Full Name');
    const input = screen.getByLabelText('Full Name');
    expect(label).toHaveAttribute('for', 'full-name');
    expect(input).toBeInTheDocument();
  });

  it('enforces 56px height styling and 48px min-height', () => {
    render(<Input label="Phone" />);
    const input = screen.getByRole('textbox');
    expect(input).toHaveClass('h-[56px]');
    expect(input).toHaveClass('min-h-[48px]');
  });

  it('displays error message and sets aria-invalid on error', () => {
    render(<Input label="Phone" error="Phone number is required" />);
    const input = screen.getByRole('textbox');
    const errorMsg = screen.getByRole('alert');

    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(errorMsg).toHaveTextContent('Phone number is required');
  });

  it('renders left icon if provided', () => {
    render(<Input label="Location" leftIcon="location_on" />);
    expect(screen.getByText('location_on')).toBeInTheDocument();
  });

  it('handles typing and user input correctly', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<Input label="Customer Name" onChange={handleChange} />);

    const input = screen.getByRole('textbox');
    await user.type(input, 'Sarah Jenkins');

    expect(handleChange).toHaveBeenCalled();
    expect(input).toHaveValue('Sarah Jenkins');
  });
});
