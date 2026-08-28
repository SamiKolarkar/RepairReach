import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TrackingPage } from '@/pages/TrackingPage';
import * as servicesApi from '@/api/services';
import { BookingTrackingResponse } from '@/api/types';

vi.mock('@/api/services');

const mockTrackingConfirmed: BookingTrackingResponse = {
  publicReference: 'RR-20260820-8942',
  bookingState: 'CONFIRMED',
  jobStatus: 'SCHEDULED',
  customerName: 'Sarah Jenkins',
  customerPhone: '+91 98765 12345',
  serviceName: 'AC Repair & Servicing',
  serviceLocation: '123 Maple Street, Apt 4B, Solapur',
  problemDescription: 'AC cooling stopped completely.',
  scheduledDate: '2026-08-20',
  scheduledStartTime: '11:00 AM',
  scheduledEndTime: '1:00 PM',
  canCancel: true,
  canCancelWithoutCharge: true,
  visitingChargeAmount: 299,
  updatedAt: '2026-08-20T08:30:00Z',
};

const mockTrackingArrived: BookingTrackingResponse = {
  ...mockTrackingConfirmed,
  jobStatus: 'ARRIVED',
  canCancel: true,
  canCancelWithoutCharge: false,
  technician: {
    assigned: true,
    technicianName: 'Ramesh Kulkarni',
    technicianPhone: '+91 98220 11223',
  },
};

describe('Integration: Tracking & Status Timeline Flow', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    vi.clearAllMocks();
  });

  it('renders booking summary, live timeline, and pre-arrival cancellation button', async () => {
    vi.mocked(servicesApi.getBookingByReference).mockResolvedValue(mockTrackingConfirmed);

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/booking/RR-20260820-8942']}>
          <Routes>
            <Route path="/booking/:publicReference" element={<TrackingPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Booking Confirmed')).toBeInTheDocument();
      expect(screen.getByText('RR-20260820-8942')).toBeInTheDocument();
      expect(screen.getByText('Sarah Jenkins')).toBeInTheDocument();
      expect(screen.getByText('AC Repair & Servicing')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /cancel booking/i })).toBeInTheDocument();
    });
  });

  it('displays assigned technician details when job reaches ARRIVED status', async () => {
    vi.mocked(servicesApi.getBookingByReference).mockResolvedValue(mockTrackingArrived);

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/booking/RR-20260820-8942']}>
          <Routes>
            <Route path="/booking/:publicReference" element={<TrackingPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/Technician: Ramesh Kulkarni/i)).toBeInTheDocument();
      expect(screen.getByText('+91 98220 11223')).toBeInTheDocument();
    });
  });
});
