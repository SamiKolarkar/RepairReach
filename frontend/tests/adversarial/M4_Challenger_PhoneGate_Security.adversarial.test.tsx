import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  PhoneVerificationModal,
  PhoneVerificationModalProps,
} from '@/components/auth/PhoneVerificationModal';
import { BookingForm } from '@/components/booking/BookingForm';
import { AuthContext, AuthContextType } from '@/context/AuthProvider';
import * as servicesApi from '@/api/services';
import {
  signInWithPhoneNumber,
  RecaptchaVerifier,
} from 'firebase/auth';
import {
  FORBIDDEN_AUTH_TERMS,
  translateAuthError,
  AUTH_ERROR_MESSAGES,
} from '@/lib/authErrorTranslator';
import { ServiceOffering, AvailabilitySlotsResponse, BookingConfirmationResponse } from '@/api/types';

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
    id: 'service_1',
    code: 'AC_REPAIR',
    name: 'AC Repair',
    description: 'Cooling check',
    category: 'HOME_APPLIANCE',
    baseDurationMinutes: 60,
    supportsHomeService: true,
    supportsWorkshopRepair: true,
    priceEstimate: '₹499',
  },
];

const mockAvailability: AvailabilitySlotsResponse = {
  date: '2026-08-20',
  serviceId: 'service_1',
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
  publicReference: 'RR-20260820-9999',
  bookingId: 'bk_999',
  capabilityToken: 'cap_999',
  status: 'CONFIRMED',
  customer: {
    fullName: 'Test Challenger',
    phoneNumber: '+919876543210',
  },
  service: {
    serviceId: 'service_1',
    serviceName: 'AC Repair',
  },
  scheduledSlot: {
    date: '2026-08-20',
    startTime: '2026-08-20T09:00:00+05:30',
    endTime: '2026-08-20T11:00:00+05:30',
  },
  serviceLocation: '123 Test Street, Bangalore',
  problemDescription: 'General service needed.',
  createdAt: '2026-08-20T08:30:00Z',
};

describe('Empirical Challenger: Milestone 4 Security & Sanitization Suite', () => {
  let queryClient: QueryClient;
  let mockConfirmationResult: any;
  let onCloseMock: ReturnType<typeof vi.fn>;
  let onVerifiedMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    vi.clearAllMocks();
    onCloseMock = vi.fn();
    onVerifiedMock = vi.fn();

    mockConfirmationResult = {
      confirm: vi.fn().mockResolvedValue({
        user: { uid: 'user_challenger_1', phoneNumber: '+919876543210' },
      }),
    };
    vi.mocked(signInWithPhoneNumber).mockResolvedValue(mockConfirmationResult);
    vi.mocked(servicesApi.getServices).mockResolvedValue(mockServices);
    vi.mocked(servicesApi.getAvailabilitySlots).mockResolvedValue(mockAvailability);
    vi.mocked(servicesApi.createBooking).mockResolvedValue(mockBookingConfirmation);
  });

  const renderModal = (props?: Partial<PhoneVerificationModalProps>) => {
    const defaultProps: PhoneVerificationModalProps = {
      isOpen: true,
      onClose: onCloseMock,
      onVerified: onVerifiedMock,
      ...props,
    };
    return render(<PhoneVerificationModal {...defaultProps} />);
  };

  const renderBookingGate = (authContextValue: Partial<AuthContextType>) => {
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

  const assertZeroInformationLeakage = (contextDescription: string) => {
    const bodyText = (document.body.textContent || '').toLowerCase();

    for (const term of FORBIDDEN_AUTH_TERMS) {
      const termLower = term.toLowerCase();
      expect(
        bodyText.includes(termLower),
        `Information Leakage detected in textContent for forbidden term "${term}" during: ${contextDescription}`
      ).toBe(false);
    }

    const technicalTokens = [
      'auth/',
      'internal-error',
      'invalid-phone-number',
      'invalid-verification-code',
      'captcha-check-failed',
      'quota-exceeded',
      'gserviceaccount',
      'googleapis',
      'securetoken',
      'jwk',
      'bearer',
    ];

    for (const token of technicalTokens) {
      expect(
        bodyText.includes(token),
        `Technical error token "${token}" leaked into textContent during: ${contextDescription}`
      ).toBe(false);
    }
  };

  // =========================================================================
  // 1. Phone Input Normalisation Matrix
  // =========================================================================
  describe('1. Phone Input Normalisation Across Indian Number Formats', () => {
    const normalisationMatrix = [
      { input: '+919876543210', expectedE164: '+919876543210', desc: 'Standard E.164 with +91' },
      { input: '919876543210', expectedE164: '+919876543210', desc: '12-digit number starting with 91' },
      { input: '09876543210', expectedE164: '+919876543210', desc: '11-digit number with leading 0' },
      { input: '98765 43210', expectedE164: '+919876543210', desc: '10-digit number with space' },
      { input: '+91-98765-43210', expectedE164: '+919876543210', desc: 'E.164 with hyphens' },
      { input: '+91 98765 43210', expectedE164: '+919876543210', desc: 'E.164 with spaces' },
      { input: '9876543210', expectedE164: '+919876543210', desc: 'Plain 10-digit number' },
      { input: '6123456789', expectedE164: '+916123456789', desc: 'Valid prefix starting with 6' },
      { input: '7123456789', expectedE164: '+917123456789', desc: 'Valid prefix starting with 7' },
      { input: '8123456789', expectedE164: '+918123456789', desc: 'Valid prefix starting with 8' },
      { input: '9123456789', expectedE164: '+919123456789', desc: 'Valid prefix starting with 9' },
      { input: '06123456789', expectedE164: '+916123456789', desc: 'Prefix 6 with leading 0' },
      { input: '918123456789', expectedE164: '+918123456789', desc: 'Prefix 8 with leading 91' },
      { input: '"+919876543210"', expectedE164: '+919876543210', desc: 'Quoted number with +91 prefix' },
    ];

    normalisationMatrix.forEach(({ input, expectedE164, desc }) => {
      it(`normalises "${input}" (${desc}) to "${expectedE164}"`, async () => {
        const { unmount } = renderModal();

        const phoneInput = screen.getByLabelText(/Mobile Number/i);
        fireEvent.change(phoneInput, { target: { value: input } });

        const sendBtn = screen.getByRole('button', { name: /Send OTP/i });
        fireEvent.click(sendBtn);

        await waitFor(() => {
          expect(signInWithPhoneNumber).toHaveBeenCalledWith(
            expect.anything(),
            expectedE164,
            expect.anything()
          );
        });

        assertZeroInformationLeakage(`Normalisation of ${input}`);
        unmount();
      });
    });
  });

  // =========================================================================
  // 2. Rejection of Invalid Numbers
  // =========================================================================
  describe('2. Strict Rejection of Invalid Phone Numbers', () => {
    const invalidPhoneMatrix = [
      // Starting with invalid prefixes 0-5
      { input: '0123456789', desc: '10 digits starting with 0' },
      { input: '1234567890', desc: '10 digits starting with 1' },
      { input: '2345678901', desc: '10 digits starting with 2' },
      { input: '3456789012', desc: '10 digits starting with 3' },
      { input: '4567890123', desc: '10 digits starting with 4' },
      { input: '5678901234', desc: '10 digits starting with 5' },
      { input: '0000000000', desc: 'All zeros' },
      { input: '05555555555', desc: '11 digits starting with 05' },
      { input: '+915555555555', desc: '12 digits with +91 and 5' },
      { input: '915555555555', desc: '12 digits with 91 and 5' },
      { input: '+910123456789', desc: 'Prefix 0 with +91' },
      { input: '+911234567890', desc: 'Prefix 1 with +91' },
      { input: '+912345678901', desc: 'Prefix 2 with +91' },
      { input: '+913456789012', desc: 'Prefix 3 with +91' },
      { input: '+914567890123', desc: 'Prefix 4 with +91' },

      // Letters and alphanumeric
      { input: 'abcdefghij', desc: 'All letters' },
      { input: '98765abcde', desc: 'Mixed digits and letters (5 digits)' },
      { input: '987654321x', desc: '9 digits with letter' },
      { input: 'phone12345', desc: 'Word prefix with 5 digits' },

      // Special characters & injection vectors
      { input: '!@#$%^&*()', desc: 'Special symbols' },
      { input: '<script>alert(1)</script>', desc: 'XSS script injection' },
      { input: "' OR '1'='1", desc: 'SQL injection payload' },
      { input: 'SELECT * FROM users', desc: 'SQL text query' },
      { input: ';;;;;;;;;;', desc: 'Semicolons' },

      // Length boundaries
      { input: '98765', desc: '5 digits (too short)' },
      { input: '987654321', desc: '9 digits (too short)' },
      { input: '98765432101234', desc: '14 digits (too long)' },
      { input: '9', desc: 'Single digit' },
    ];

    invalidPhoneMatrix.forEach(({ input, desc }) => {
      it(`rejects invalid input "${input}" (${desc}) without calling Firebase SDK`, async () => {
        const { unmount } = renderModal();

        const phoneInput = screen.getByLabelText(/Mobile Number/i);
        fireEvent.change(phoneInput, { target: { value: input } });

        const sendBtn = screen.getByRole('button', { name: /Send OTP/i });
        fireEvent.click(sendBtn);

        // Verification SDK should NEVER be invoked
        expect(signInWithPhoneNumber).not.toHaveBeenCalled();

        // If button is clickable, error alert must be shown
        if (!sendBtn.hasAttribute('disabled')) {
          expect(screen.getByRole('alert')).toBeInTheDocument();
          expect(
            screen.getByText('Please enter a valid 10-digit mobile number.')
          ).toBeInTheDocument();
        }

        assertZeroInformationLeakage(`Invalid phone rejection for ${input}`);
        unmount();
      });
    });

    it('keeps Send OTP button disabled when input is empty or whitespace', () => {
      renderModal();
      const sendBtn = screen.getByRole('button', { name: /Send OTP/i });
      expect(sendBtn).toBeDisabled();

      const phoneInput = screen.getByLabelText(/Mobile Number/i);
      fireEvent.change(phoneInput, { target: { value: '    ' } });
      expect(sendBtn).toBeDisabled();
    });
  });

  // =========================================================================
  // 3. Firebase Error Codes in Modal Flow
  // =========================================================================
  describe('3. Firebase Error Codes in Modal Flow and Error Translation', () => {
    const errorScenarios = [
      {
        code: 'auth/invalid-phone-number',
        stage: 'PHONE_SEND' as const,
        rawError: new Error('Firebase: Error (auth/invalid-phone-number).'),
        expectedMessage: 'Please enter a valid 10-digit mobile number.',
      },
      {
        code: 'auth/invalid-verification-code',
        stage: 'OTP_CONFIRM' as const,
        rawError: new Error('Firebase: Error (auth/invalid-verification-code).'),
        expectedMessage: 'Incorrect verification code. Please check the SMS and try again.',
      },
      {
        code: 'auth/code-expired',
        stage: 'OTP_CONFIRM' as const,
        rawError: new Error('Firebase: Error (auth/code-expired).'),
        expectedMessage: 'The verification code has expired. Please request a new code.',
      },
      {
        code: 'auth/quota-exceeded',
        stage: 'PHONE_SEND' as const,
        rawError: new Error('Firebase: Error (auth/quota-exceeded).'),
        expectedMessage: 'SMS service limit reached. Please try again later or contact support.',
      },
      {
        code: 'auth/captcha-check-failed',
        stage: 'PHONE_SEND' as const,
        rawError: new Error('Firebase: Error (auth/captcha-check-failed).'),
        expectedMessage: 'Security verification failed. Please try again.',
      },
      {
        code: 'auth/too-many-requests',
        stage: 'PHONE_SEND' as const,
        rawError: new Error('Firebase: Error (auth/too-many-requests).'),
        expectedMessage: 'Too many requests. Please wait a few moments and try again.',
      },
      {
        code: 'auth/network-request-failed',
        stage: 'PHONE_SEND' as const,
        rawError: new Error('Firebase: Error (auth/network-request-failed).'),
        expectedMessage: 'Unable to connect to the server. Please check your internet connection and try again.',
      },
      {
        code: 'auth/session-expired',
        stage: 'OTP_CONFIRM' as const,
        rawError: new Error('Firebase: Error (auth/session-expired).'),
        expectedMessage: 'The verification session has expired. Please request a new code.',
      },
    ];

    errorScenarios.forEach(({ code, stage, rawError, expectedMessage }) => {
      it(`translates "${code}" during ${stage} to "${expectedMessage}" with zero info leak`, async () => {
        if (stage === 'PHONE_SEND') {
          vi.mocked(signInWithPhoneNumber).mockRejectedValueOnce(rawError);
        } else {
          mockConfirmationResult.confirm.mockRejectedValueOnce(rawError);
        }

        const { unmount } = renderModal();

        const phoneInput = screen.getByLabelText(/Mobile Number/i);
        fireEvent.change(phoneInput, { target: { value: '9876543210' } });
        const sendBtn = screen.getByRole('button', { name: /Send OTP/i });
        fireEvent.click(sendBtn);

        if (stage === 'OTP_CONFIRM') {
          await waitFor(() => {
            expect(screen.getByLabelText(/6-Digit Verification Code/i)).toBeInTheDocument();
          });

          const otpInput = screen.getByLabelText(/6-Digit Verification Code/i);
          fireEvent.change(otpInput, { target: { value: '123456' } });
          const verifyBtn = screen.getByRole('button', { name: /Verify OTP/i });
          fireEvent.click(verifyBtn);
        }

        await waitFor(() => {
          expect(screen.getByRole('alert')).toBeInTheDocument();
          expect(screen.getByText(expectedMessage)).toBeInTheDocument();
        });

        assertZeroInformationLeakage(`Error state for ${code}`);
        unmount();
      });
    });
  });

  // =========================================================================
  // 4. Exhaustive DOM Scan for all 19 FORBIDDEN_AUTH_TERMS
  // =========================================================================
  describe('4. Exhaustive DOM Leak Verification for all 19 Forbidden Terms', () => {
    it('verifies translateAuthError sanitizes all 19 forbidden terms across complex objects & strings', () => {
      FORBIDDEN_AUTH_TERMS.forEach((term) => {
        const rawMsg = `Error from ${term} server at https://securetoken.google.com/jwk`;
        const translated = translateAuthError(rawMsg);
        const translatedLower = translated.toLowerCase();

        FORBIDDEN_AUTH_TERMS.forEach((forbidden) => {
          expect(
            translatedLower.includes(forbidden.toLowerCase()),
            `translateAuthError leaked forbidden term "${forbidden}" when input was "${rawMsg}"`
          ).toBe(false);
        });
      });
    });

    it('exhaustively asserts zero forbidden terms leak across simulated adversarial error payloads in modal DOM', async () => {
      const adversarialPayloads = [
        { code: 'auth/internal-error', message: 'Internal error in gserviceaccount jwk verification' },
        { code: 'auth/invalid-credential', message: 'Bearer token jwt postgres psql failed' },
        { code: 'auth/custom-supabase-brevo', message: 'supabase authapierror brevo smtp quota' },
        { code: 'auth/user-already-registered', message: 'user already registered with firebase' },
        { code: 'auth/rate-limit', message: 'rate limit invalid login credentials' },
      ];

      for (const payload of adversarialPayloads) {
        vi.mocked(signInWithPhoneNumber).mockRejectedValueOnce(payload);

        const { unmount } = renderModal();

        const phoneInput = screen.getByLabelText(/Mobile Number/i);
        fireEvent.change(phoneInput, { target: { value: '9876543210' } });
        const sendBtn = screen.getByRole('button', { name: /Send OTP/i });
        fireEvent.click(sendBtn);

        await waitFor(() => {
          expect(screen.getByRole('alert')).toBeInTheDocument();
        });

        assertZeroInformationLeakage(`Adversarial payload ${JSON.stringify(payload)}`);
        unmount();
      }
    });
  });

  // =========================================================================
  // 5. Booking Form Gate Adversarial Invariants
  // =========================================================================
  describe('5. Booking Gate Integration Adversarial Scenarios', () => {
    it('prevents booking bypass if Google user closes modal and clicks Confirm Booking', async () => {
      const googleUser = {
        uid: 'google_adversary_1',
        displayName: 'Adversary User',
        phoneNumber: null,
        providerData: [{ providerId: 'google.com' }],
      } as any;

      renderBookingGate({
        user: googleUser,
        isPhoneVerified: false,
      });

      // Modal appears initially
      expect(screen.getByRole('dialog')).toBeInTheDocument();

      // Adversary closes modal
      const closeBtn = screen.getByLabelText('Close dialog');
      fireEvent.click(closeBtn);

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });

      // Warning alert is visible
      expect(screen.getByText('Phone Verification Required')).toBeInTheDocument();

      // Adversary attempts to submit the form
      const submitBtn = screen.getByRole('button', { name: /Confirm Booking/i });
      fireEvent.click(submitBtn);

      // Gate modal intercepts and reopens immediately
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getByText('Verify Your Phone Number')).toBeInTheDocument();
      });

      // Backend booking API was NEVER invoked
      expect(servicesApi.createBooking).not.toHaveBeenCalled();
    });

    it('allows phone-verified users to submit without gate modal appearing at any point', async () => {
      const phoneUser = {
        uid: 'phone_verified_user_1',
        displayName: 'Verified User',
        phoneNumber: '+919876543210',
        providerData: [{ providerId: 'phone' }],
      } as any;

      renderBookingGate({
        user: phoneUser,
        isPhoneVerified: true,
      });

      // Gate modal MUST NOT be present
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(screen.queryByText('Phone Verification Required')).not.toBeInTheDocument();

      // Verify phone input is prefilled with verified phone
      const phoneInput = screen.getByLabelText(/phone number/i);
      expect(phoneInput).toHaveValue('+919876543210');

      // Fill in required fields
      const addressInput = screen.getByLabelText(/service location/i);
      const problemInput = screen.getByLabelText(/problem description/i);
      fireEvent.change(addressInput, { target: { value: '456 MG Road, Pune' } });
      fireEvent.change(problemInput, { target: { value: 'AC inspection required' } });

      await waitFor(() => {
        expect(screen.getByText('9:00 AM - 11:00 AM')).toBeInTheDocument();
      });

      const slotRadio = screen.getByDisplayValue('slot_1');
      fireEvent.click(slotRadio);

      const submitBtn = screen.getByRole('button', { name: /Confirm Booking/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(servicesApi.createBooking).toHaveBeenCalledTimes(1);
        const [payload] = vi.mocked(servicesApi.createBooking).mock.calls[0];
        expect(payload.phoneNumber).toBe('+919876543210');
        expect(payload.fullName).toBe('Verified User');
      });

      assertZeroInformationLeakage('Phone-verified booking flow');
    });
  });
});
