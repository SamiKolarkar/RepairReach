import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { FeedbackCard } from '@/components/feedback/FeedbackCard';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>{children}</BrowserRouter>
    </QueryClientProvider>
  );
};

describe('FeedbackCard Component', () => {
  it('renders rating header and 5 stars', () => {
    render(<FeedbackCard jobReference="job-123" />, { wrapper: createWrapper() });

    expect(screen.getByRole('heading', { name: /rate your experience/i })).toBeInTheDocument();
    expect(screen.getAllByRole('radio')).toHaveLength(5);
  });

  it('shows validation error when submitted without selecting stars', async () => {
    const user = userEvent.setup();
    render(<FeedbackCard jobReference="job-123" />, { wrapper: createWrapper() });

    const submitBtn = screen.getByRole('button', { name: /submit feedback/i });
    await user.click(submitBtn);

    expect(screen.getByText(/please select at least 1 star/i)).toBeInTheDocument();
  });

  it('allows selecting stars and typing comment', async () => {
    const user = userEvent.setup();
    render(<FeedbackCard jobReference="job-123" />, { wrapper: createWrapper() });

    const star5 = screen.getByRole('radio', { name: /rate 5 stars/i });
    await user.click(star5);

    const commentInput = screen.getByLabelText(/tell us more \(optional\)/i);
    await user.type(commentInput, 'Technician was quick, courteous, and fixed the AC promptly.');

    expect(star5).toHaveAttribute('aria-checked', 'true');
    expect(commentInput).toHaveValue(
      'Technician was quick, courteous, and fixed the AC promptly.'
    );
  });
});
