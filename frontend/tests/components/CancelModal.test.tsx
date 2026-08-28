import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CancelModal } from '@/components/tracking/CancelModal';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('CancelModal Component', () => {
  it('displays free cancellation policy when canCancelWithoutCharge is true', () => {
    render(
      <CancelModal
        isOpen={true}
        onClose={vi.fn()}
        publicReference="RR-20260820-8942"
        canCancelWithoutCharge={true}
      />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByText(/Free Pre-Arrival Cancellation/i)).toBeInTheDocument();
  });

  it('displays ₹299 visit fee notice when technician has arrived', () => {
    render(
      <CancelModal
        isOpen={true}
        onClose={vi.fn()}
        publicReference="RR-20260820-8942"
        canCancelWithoutCharge={false}
        visitingChargeAmount={299}
      />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByText(/Visiting Charge Notice/i)).toBeInTheDocument();
    expect(screen.getByText(/299\.00/i)).toBeInTheDocument();
  });

  it('validates minimum 3-character reason on submit', async () => {
    const user = userEvent.setup();

    render(
      <CancelModal
        isOpen={true}
        onClose={vi.fn()}
        publicReference="RR-20260820-8942"
        canCancelWithoutCharge={true}
      />,
      { wrapper: createWrapper() }
    );

    const submitBtn = screen.getByRole('button', { name: /confirm cancellation/i });
    await user.click(submitBtn);

    expect(
      screen.getByText(/Please provide a cancellation reason \(at least 3 characters\)/i)
    ).toBeInTheDocument();
  });
});
