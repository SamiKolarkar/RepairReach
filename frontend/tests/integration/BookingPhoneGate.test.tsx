import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BookingForm } from '@/components/booking/BookingForm';
import { AuthContext, AuthContextType } from '@/context/AuthProvider';
import * as servicesApi from '@/api/services';
import {
  signInWithPhoneNumber,
  RecaptchaVerifier,
} from 'firebase/auth';
import { ServiceOffering, AvailabilitySlotsResponse, BookingConfirmationResponse } from '@/api/types';
import { FORBIDDEN_AUTH_TERMS } from '@/lib/authErrorTranslator';

// Mock services API
vi.mock('@/api/services');

// Mock firebase/auth
vi.mock('firebase/auth', () => {
  const MockRecaptchaVerifier = vi.fn().mockImplementation(function (
    this: any,
    _auth,
    container,
    options
  ) {
    this.container = container;
    this.options = options;
    this.clear = vi.fn();
    this.render = vi.fn().mockResolvedValue(1);
    this.verify = vi.fn().mockResolvedValue('recaptcha-token');
  });

  return {
    signInWithPhoneNumber: vi.fn(),
    RecaptchaVerifier: MockRecaptchaVerifier,
  };
});

// Mock @/lib/firebase
vi.mock('@/lib/firebase', () => ({
  auth: { currentUser: null },
  app: {},
}));

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
  ],
};

const mockBookingConfirmation: BookingConfirmationResponse = {
  publicReference: 'RR-20260820-8942',
  bookingId: 'bk_123',
  capabilityToken: 'cap_123',
  status: 'CONFIRMED',
  customer: {
    fullName: 'Jane Doe',
    phoneNumber: '+919876512345',
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
  serviceLocation: '456 Palm Grove, Mumbai',
  problemDescription: 'AC blowing warm air.',
  createdAt: '2026-08-20T08:30:00Z',
};

describe('Integration: Google OAuth Phone Verification Gate in Booking Flow', () => {
  let queryClient: QueryClient;
  let mockConfirmationResult: any;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    vi.clearAllMocks();

    mockConfirmationResult = {
      confirm: vi.fn().mockResolvedValue({
        user: { uid: 'google_user_1', phoneNumber: '+919876512345' },
      }),
    };
    vi.mocked(signInWithPhoneNumber).mockResolvedValue(mockConfirmationResult);
    vi.mocked(servicesApi.getServices).mockResolvedValue(mockServices);
    vi.mocked(servicesApi.getAvailabilitySlots).mockResolvedValue(mockAvailability);
    vi.mocked(servicesApi.createBooking).mockResolvedValue(mockBookingConfirmation);
  });

  const renderBookingFormWithAuth = (authContextValue: Partial<AuthContextType>) => {
    const fullAuthContext: AuthContextType = {
      user: null,
      loading: false,
      token: 'mock-jwt-token',
      isPhoneVerified: false,
      signOut: vi.fn(),
      getIdToken: vi.fn().mockResolvedValue('mock-jwt-token'),
      ...authContextValue,
    };

    return render(
      <QueryClientProvider client={queryClient}>
        <AuthContext.Provider value={fullAuthContext}>
          <BrowserRouter>
            <BookingForm />
          </BrowserRouter>
        </AuthContext.Provider>
      </QueryClientProvider>
    );
  };

  const assertStrictDomSanitization = () => {
    const textContent = (document.body.textContent || '').toLowerCase();
    for (const term of FORBIDDEN_AUTH_TERMS) {
      expect(textContent).not.toContain(term.toLowerCase());
    }
  };

  it('renders PhoneVerificationModal automatically for Google OAuth user without verified phone', async () => {
    const googleUser = {
      uid: 'google_user_1',
      displayName: 'Jane Doe',
      email: 'jane@example.com',
      phoneNumber: null,
      providerData: [{ providerId: 'google.com' }],
    } as any;

    renderBookingFormWithAuth({
      user: googleUser,
      isPhoneVerified: false,
    });

    // Gate modal should be visible
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Verify Your Phone Number')).toBeInTheDocument();
    expect(screen.getByLabelText(/Mobile Number/i)).toBeInTheDocument();
  }, 15000);

  it('completes the full phone verification gate flow and completes booking submission', async () => {
    const user = userEvent.setup();
    const googleUser = {
      uid: 'google_user_1',
      displayName: 'Jane Doe',
      email: 'jane@example.com',
      phoneNumber: null,
      providerData: [{ providerId: 'google.com' }],
    } as any;

    renderBookingFormWithAuth({
      user: googleUser,
      isPhoneVerified: false,
    });

    // 1. Modal is visible on landing
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    // 2. User enters phone and clicks Send OTP
    const phoneInput = screen.getByLabelText(/Mobile Number/i);
    await user.type(phoneInput, '9876512345');
    const sendOtpBtn = screen.getByRole('button', { name: /Send OTP/i });
    await user.click(sendOtpBtn);

    // 3. Transitions to OTP entry
    await waitFor(() => {
      expect(screen.getByText('Enter Verification Code')).toBeInTheDocument();
    });

    // 4. User enters 6-digit OTP and verifies
    const otpInput = screen.getByLabelText(/6-Digit Verification Code/i);
    await user.type(otpInput, '123456');
    const verifyOtpBtn = screen.getByRole('button', { name: /Verify OTP/i });
    await user.click(verifyOtpBtn);

    // 5. Modal closes and phone number is auto-populated in booking form
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      const formPhoneInput = screen.getByLabelText(/phone number/i);
      expect(formPhoneInput).toHaveValue('+919876512345');
    });

    // 6. Complete remaining booking form fields
    const addressInput = screen.getByLabelText(/service location/i);
    const problemInput = screen.getByLabelText(/problem description/i);
    fireEvent.change(addressInput, { target: { value: '456 Palm Grove, Mumbai 400001' } });
    fireEvent.change(problemInput, { target: { value: 'AC blowing warm air.' } });

    // Wait for availability slots
    await waitFor(() => {
      expect(screen.getByText('9:00 AM - 11:00 AM')).toBeInTheDocument();
    });

    const slotRadio = screen.getByDisplayValue('slot_1');
    await user.click(slotRadio);

    // 7. Submit booking form
    const submitBtn = screen.getByRole('button', { name: /Confirm Booking/i });
    await user.click(submitBtn);

    // 8. Verify booking was called with verified phone
    await waitFor(() => {
      expect(servicesApi.createBooking).toHaveBeenCalledTimes(1);
      const [payload] = vi.mocked(servicesApi.createBooking).mock.calls[0];
      expect(payload.phoneNumber).toBe('+919876512345');
      expect(payload.fullName).toBe('Jane Doe');
      expect(payload.locationAddress).toBe('456 Palm Grove, Mumbai 400001');
      expect(payload.problemDescription).toBe('AC blowing warm air.');
    });
  }, 15000);

  it('bypasses phone verification gate completely for phone-OTP users', async () => {
    const user = userEvent.setup();
    const phoneUser = {
      uid: 'phone_user_1',
      displayName: 'Rahul Sharma',
      phoneNumber: '+919876543210',
      providerData: [{ providerId: 'phone' }],
    } as any;

    renderBookingFormWithAuth({
      user: phoneUser,
      isPhoneVerified: true,
    });

    // Modal must NOT be open
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    // Phone number should be pre-filled from auth state
    const formPhoneInput = screen.getByLabelText(/phone number/i);
    expect(formPhoneInput).toHaveValue('+919876543210');

    // Fill form and submit directly
    const addressInput = screen.getByLabelText(/service location/i);
    const problemInput = screen.getByLabelText(/problem description/i);
    fireEvent.change(addressInput, { target: { value: '789 MG Road, Pune 411001' } });
    fireEvent.change(problemInput, { target: { value: 'AC water leakage fix.' } });

    await waitFor(() => {
      expect(screen.getByText('9:00 AM - 11:00 AM')).toBeInTheDocument();
    });

    const slotRadio = screen.getByDisplayValue('slot_1');
    await user.click(slotRadio);

    const submitBtn = screen.getByRole('button', { name: /Confirm Booking/i });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(servicesApi.createBooking).toHaveBeenCalledTimes(1);
      const [payload] = vi.mocked(servicesApi.createBooking).mock.calls[0];
      expect(payload.phoneNumber).toBe('+919876543210');
      expect(payload.fullName).toBe('Rahul Sharma');
    });
  }, 15000);

  it('allows user to dismiss modal, shows warning banner, and reopens modal when clicking Verify Now', async () => {
    const user = userEvent.setup();
    const googleUser = {
      uid: 'google_user_1',
      displayName: 'Jane Doe',
      phoneNumber: null,
      providerData: [{ providerId: 'google.com' }],
    } as any;

    renderBookingFormWithAuth({
      user: googleUser,
      isPhoneVerified: false,
    });

    // Close modal
    const closeButton = screen.getByLabelText('Close dialog');
    await user.click(closeButton);

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    // Warning banner is displayed
    expect(screen.getByText('Phone Verification Required')).toBeInTheDocument();
    const verifyNowBtn = screen.getByRole('button', { name: /Verify Now/i });
    expect(verifyNowBtn).toBeInTheDocument();

    // Clicking Verify Now reopens modal
    await user.click(verifyNowBtn);

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Verify Your Phone Number')).toBeInTheDocument();
    });
  }, 15000);

  it('blocks booking submission and reopens gate modal if unverified user attempts to submit', async () => {
    const user = userEvent.setup();
    const googleUser = {
      uid: 'google_user_1',
      displayName: 'Jane Doe',
      phoneNumber: null,
      providerData: [{ providerId: 'google.com' }],
    } as any;

    renderBookingFormWithAuth({
      user: googleUser,
      isPhoneVerified: false,
    });

    // Dismiss modal initially
    const closeButton = screen.getByLabelText('Close dialog');
    await user.click(closeButton);

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    // Attempt to submit booking form directly
    const submitBtn = screen.getByRole('button', { name: /Confirm Booking/i });
    await user.click(submitBtn);

    // Gate modal should reopen to block submission
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Verify Your Phone Number')).toBeInTheDocument();
    });

    expect(servicesApi.createBooking).not.toHaveBeenCalled();
  }, 15000);

  it('ensures zero forbidden terms leak into DOM during modal errors', async () => {
    const user = userEvent.setup();
    const googleUser = {
      uid: 'google_user_1',
      displayName: 'Jane Doe',
      phoneNumber: null,
      providerData: [{ providerId: 'google.com' }],
    } as any;

    vi.mocked(signInWithPhoneNumber).mockRejectedValueOnce(
      new Error('Firebase: Error (auth/quota-exceeded).')
    );

    renderBookingFormWithAuth({
      user: googleUser,
      isPhoneVerified: false,
    });

    const phoneInput = screen.getByLabelText(/Mobile Number/i);
    await user.type(phoneInput, '9876512345');
    const sendOtpBtn = screen.getByRole('button', { name: /Send OTP/i });
    await user.click(sendOtpBtn);

    await waitFor(() => {
      expect(
        screen.getByText('SMS service limit reached. Please try again later or contact support.')
      ).toBeInTheDocument();
    });

    assertStrictDomSanitization();
  }, 15000);
});
