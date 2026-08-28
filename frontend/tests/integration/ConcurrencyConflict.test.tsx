import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BookingForm } from '@/components/booking/BookingForm';
import * as servicesApi from '@/api/services';
import {
  ServiceOffering,
  AvailabilitySlotsResponse,
  BookingConfirmationResponse,
  ProblemDetails,
} from '@/api/types';

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
  ],
};

const mockConflictError: ProblemDetails = {
  type: 'https://api.repairreach.in/problems/slot-unavailable',
  title: 'Selected slot is no longer available',
  status: 409,
  code: 'SLOT_UNAVAILABLE',
  detail: 'The slot 9:00 AM - 11:00 AM was just confirmed by another customer.',
  alternatives: [
    {
      slotId: 'slot_alt_2',
      startTime: '2026-08-20T11:00:00+05:30',
      endTime: '2026-08-20T13:00:00+05:30',
      label: '11:00 AM - 1:00 PM',
    },
    {
      slotId: 'slot_alt_3',
      startTime: '2026-08-20T16:00:00+05:30',
      endTime: '2026-08-20T18:00:00+05:30',
      label: '4:00 PM - 6:00 PM',
    },
  ],
};

const mockSuccessConfirmation: BookingConfirmationResponse = {
  publicReference: 'RR-20260820-9999',
  bookingId: 'bk_alt_success',
  capabilityToken: 'cap_alt',
  status: 'CONFIRMED',
  customer: {
    fullName: 'Rahul Sharma',
    phoneNumber: '+91 98765 00000',
  },
  service: {
    serviceId: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
    serviceName: 'AC Repair & Servicing',
  },
  scheduledSlot: {
    date: '2026-08-20',
    startTime: '2026-08-20T11:00:00+05:30',
    endTime: '2026-08-20T13:00:00+05:30',
  },
  serviceLocation: '456 Station Road, Solapur',
  problemDescription: 'Washing machine leaking water during spin cycle.',
  createdAt: '2026-08-20T08:35:00Z',
};

describe('Integration: Concurrency Conflict Handling (409 SLOT_UNAVAILABLE)', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    vi.clearAllMocks();

    vi.mocked(servicesApi.getServices).mockResolvedValue(mockServices);
    vi.mocked(servicesApi.getAvailabilitySlots).mockResolvedValue(mockAvailability);
  });

  it('handles 409 conflict, preserves form inputs, renders alternatives, and allows successful retry', async () => {
    const user = userEvent.setup();

    // First call rejects with 409 conflict, second call succeeds
    vi.mocked(servicesApi.createBooking)
      .mockRejectedValueOnce(mockConflictError)
      .mockResolvedValueOnce(mockSuccessConfirmation);

    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <BookingForm />
        </BrowserRouter>
      </QueryClientProvider>
    );

    // Fill form
    await waitFor(() => expect(screen.getByText('9:00 AM - 11:00 AM')).toBeInTheDocument(), {
      timeout: 10000,
    });

    const nameInput = screen.getByLabelText(/full name/i);
    const phoneInput = screen.getByLabelText(/phone number/i);
    const addressInput = screen.getByLabelText(/service location/i);
    const problemInput = screen.getByLabelText(/problem description/i);

    fireEvent.change(nameInput, { target: { value: 'Rahul Sharma' } });
    fireEvent.change(phoneInput, { target: { value: '+91 98765 00000' } });
    fireEvent.change(addressInput, { target: { value: '456 Station Road, Solapur' } });
    fireEvent.change(problemInput, {
      target: { value: 'Washing machine leaking water during spin cycle.' },
    });

    // Select initial slot
    const slotRadio = screen.getByDisplayValue('slot_1');
    await user.click(slotRadio);

    // Submit booking (will receive 409)
    const submitBtn = screen.getByRole('button', { name: /confirm booking/i });
    await user.click(submitBtn);

    // Verify 409 inline alternative banner is displayed
    await waitFor(
      () => {
        expect(screen.getByText(/slot just taken by another customer/i)).toBeInTheDocument();
        expect(screen.getByText('11:00 AM - 1:00 PM')).toBeInTheDocument();
        expect(screen.getByText('4:00 PM - 6:00 PM')).toBeInTheDocument();
      },
      { timeout: 10000 }
    );

    // Verify that user-entered form data was NOT erased
    expect(nameInput).toHaveValue('Rahul Sharma');
    expect(phoneInput).toHaveValue('+91 98765 00000');
    expect(addressInput).toHaveValue('456 Station Road, Solapur');
    expect(problemInput).toHaveValue('Washing machine leaking water during spin cycle.');

    // Click alternative slot
    const altBtn = screen.getByRole('button', { name: /11:00 AM - 1:00 PM/i });
    await user.click(altBtn);

    // Resubmit form with alternative slot
    await user.click(submitBtn);

    // Verify second createBooking call was made with alternative slot
    await waitFor(
      () => {
        expect(servicesApi.createBooking).toHaveBeenCalledTimes(2);
        const secondCallPayload = vi.mocked(servicesApi.createBooking).mock.calls[1][0];
        expect(secondCallPayload.slotId).toBe('slot_alt_2');
        expect(secondCallPayload.fullName).toBe('Rahul Sharma');
      },
      { timeout: 10000 }
    );
  });
});
