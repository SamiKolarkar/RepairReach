import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BookingForm } from '@/components/booking/BookingForm';
import * as servicesApi from '@/api/services';
import { ServiceOffering, AvailabilitySlotsResponse, BookingConfirmationResponse } from '@/api/types';

vi.mock('@/api/services');

const mockServices: ServiceOffering[] = [
  {
    id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
    code: 'AC_REPAIR',
    name: 'AC Repair & Servicing',
    description: 'Complete cooling fix and gas check.',
    category: 'HOME_APPLIANCE',
    baseDurationMinutes: 60,
    supportsHomeService: true,
    supportsWorkshopRepair: true,
    priceEstimate: 'Starting at ₹499',
  },
];

const mockAvailability: AvailabilitySlotsResponse = {
  date: '2026-08-20',
  serviceId: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
  slots: [
    {
      slotId: 'slot_1',
      startTime: '2026-08-20T09:00:00+05:30',
      endTime: '2026-08-20T11:00:00+05:30',
      label: '9:00 AM - 11:00 AM',
      available: true,
    },
    {
      slotId: 'slot_2',
      startTime: '2026-08-20T11:00:00+05:30',
      endTime: '2026-08-20T13:00:00+05:30',
      label: '11:00 AM - 1:00 PM',
      available: true,
    },
  ],
};

const mockBookingConfirmation: BookingConfirmationResponse = {
  publicReference: 'RR-20260820-8942',
  bookingId: 'bk_123',
  capabilityToken: 'cap_123',
  status: 'CONFIRMED',
  customer: {
    fullName: 'Sarah Jenkins',
    phoneNumber: '+91 98765 12345',
  },
  service: {
    serviceId: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
    serviceName: 'AC Repair & Servicing',
  },
  scheduledSlot: {
    date: '2026-08-20',
    startTime: '2026-08-20T09:00:00+05:30',
    endTime: '2026-08-20T11:00:00+05:30',
  },
  serviceLocation: '123 Maple Street, Solapur',
  problemDescription: 'AC cooling stopped completely and making unusual buzzing noise.',
  createdAt: '2026-08-20T08:30:00Z',
};

describe('Integration: Customer Booking Journey', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    vi.clearAllMocks();

    vi.mocked(servicesApi.getServices).mockResolvedValue(mockServices);
    vi.mocked(servicesApi.getAvailabilitySlots).mockResolvedValue(mockAvailability);
    vi.mocked(servicesApi.createBooking).mockResolvedValue(mockBookingConfirmation);
  });

  it('completes the full booking submission flow successfully', async () => {
    const user = userEvent.setup();

    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <BookingForm />
        </BrowserRouter>
      </QueryClientProvider>
    );

    // Wait for services and availability slots to load
    await waitFor(() => {
      expect(screen.getByText('9:00 AM - 11:00 AM')).toBeInTheDocument();
    });

    // Fill Personal Details
    const nameInput = screen.getByLabelText(/full name/i);
    const phoneInput = screen.getByLabelText(/phone number/i);
    fireEvent.change(nameInput, { target: { value: 'Sarah Jenkins' } });
    fireEvent.change(phoneInput, { target: { value: '+91 98765 12345' } });

    // Fill Service Details
    const addressInput = screen.getByLabelText(/service location/i);
    const problemInput = screen.getByLabelText(/problem description/i);
    fireEvent.change(addressInput, { target: { value: '123 Maple Street, Solapur 413001' } });
    fireEvent.change(problemInput, {
      target: { value: 'AC cooling stopped completely and making unusual buzzing noise.' },
    });

    // Select Slot
    const slotRadio = screen.getByDisplayValue('slot_1');
    await user.click(slotRadio);

    // Submit Booking
    const submitButton = screen.getByRole('button', { name: /confirm booking/i });
    await user.click(submitButton);

    // Verify createBooking was invoked with genuine payload and Idempotency-Key
    await waitFor(() => {
      expect(servicesApi.createBooking).toHaveBeenCalledTimes(1);
      const [payload, idempotencyKey] = vi.mocked(servicesApi.createBooking).mock.calls[0];

      expect(payload.fullName).toBe('Sarah Jenkins');
      expect(payload.phoneNumber).toBe('+91 98765 12345');
      expect(payload.locationAddress).toBe('123 Maple Street, Solapur 413001');
      expect(payload.problemDescription).toBe(
        'AC cooling stopped completely and making unusual buzzing noise.'
      );
      expect(payload.slotId).toBe('slot_1');
      expect(idempotencyKey).toBeDefined();
      expect(typeof idempotencyKey).toBe('string');
      expect(idempotencyKey.length).toBeGreaterThan(10);
    });
  });
});
