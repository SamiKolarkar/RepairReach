import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
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
import { FORBIDDEN_AUTH_TERMS, AUTH_ERROR_MESSAGES } from '@/lib/authErrorTranslator';
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
    id: 'srv_1',
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
  date: '2026-08-27',
  serviceId: 'srv_1',
  slots: [
    {
      slotId: 'slot_101',
      startTime: '2026-08-27T10:00:00+05:30',
      endTime: '2026-08-27T12:00:00+05:30',
      label: '10:00 AM - 12:00 PM',
      available: true,
    },
  ],
};

const mockBookingConfirmation: BookingConfirmationResponse = {
  publicReference: 'RR-20260827-9999',
  bookingId: 'bk_999',
  capabilityToken: 'cap_999',
  status: 'CONFIRMED',
  customer: {
    fullName: 'Adversarial Tester',
    phoneNumber: '+919876543210',
  },
  service: {
    serviceId: 'srv_1',
    serviceName: 'AC Repair & Servicing',
  },
  scheduledSlot: {
    date: '2026-08-27',
    startTime: '2026-08-27T10:00:00+05:30',
    endTime: '2026-08-27T12:00:00+05:30',
  },
  serviceLocation: '99 Challenger Highway, Bengaluru',
  problemDescription: 'Adversarial stress test.',
  createdAt: '2026-08-27T10:00:00Z',
};

describe('Adversarial & Edge-Case Suite: Phone Gate Flow', () => {
  let mockConfirmationResult: any;
  let onCloseMock: ReturnType<typeof vi.fn>;
  let onVerifiedMock: ReturnType<typeof vi.fn>;
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    onCloseMock = vi.fn();
    onVerifiedMock = vi.fn();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });

    mockConfirmationResult = {
      confirm: vi.fn().mockResolvedValue({
        user: { uid: 'adv-uid-1', phoneNumber: '+919876543210' },
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

  const assertZeroForbiddenTermsInDom = () => {
    const textContent = (document.body.textContent || '').toLowerCase();
    for (const term of FORBIDDEN_AUTH_TERMS) {
      expect(textContent).not.toContain(term.toLowerCase());
    }
  };

  describe('1. Phone Input Boundaries & Fuzzing', () => {
    it.each([
      ['empty string', ''],
      ['whitespace only', '   '],
      ['tab and newline', '\t\n '],
    ])('disables Send OTP button when phone is %s', (_label, inputVal) => {
      renderModal();
      const phoneInput = screen.getByLabelText(/Mobile Number/i);
      fireEvent.change(phoneInput, { target: { value: inputVal } });
      const sendBtn = screen.getByRole('button', { name: /Send OTP/i });
      expect(sendBtn).toBeDisabled();
      expect(signInWithPhoneNumber).not.toHaveBeenCalled();
    });

    it.each([
      ['single digit', '9'],
      ['5 digits', '98765'],
      ['8 digits', '98765432'],
      ['9 digits', '987654321'],
    ])('shows validation error and rejects short input: %s (%s)', async (_label, shortInput) => {
      const user = userEvent.setup();
      renderModal();
      const phoneInput = screen.getByLabelText(/Mobile Number/i);
      await user.type(phoneInput, shortInput);
      const sendBtn = screen.getByRole('button', { name: /Send OTP/i });
      await user.click(sendBtn);

      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText('Please enter a valid 10-digit mobile number.')).toBeInTheDocument();
      expect(signInWithPhoneNumber).not.toHaveBeenCalled();
    });

    it.each([
      ['starts with 1', '1234567890'],
      ['starts with 2', '2345678901'],
      ['starts with 3', '3456789012'],
      ['starts with 4', '4567890123'],
      ['starts with 5', '5678901234'],
      ['starts with 0 (10 digits)', '0123456789'],
    ])('rejects non-standard Indian mobile prefixes: %s (%s)', async (_label, invalidPrefixInput) => {
      const user = userEvent.setup();
      renderModal();
      const phoneInput = screen.getByLabelText(/Mobile Number/i);
      await user.type(phoneInput, invalidPrefixInput);
      const sendBtn = screen.getByRole('button', { name: /Send OTP/i });
      await user.click(sendBtn);

      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText('Please enter a valid 10-digit mobile number.')).toBeInTheDocument();
      expect(signInWithPhoneNumber).not.toHaveBeenCalled();
    });

    it.each([
      ['starts with 6', '6123456789', '+916123456789'],
      ['starts with 7', '7123456789', '+917123456789'],
      ['starts with 8', '8123456789', '+918123456789'],
      ['starts with 9', '9123456789', '+919123456789'],
      ['formatted with spaces', '98765 43210', '+919876543210'],
      ['formatted with hyphens', '9876-543-210', '+919876543210'],
      ['formatted with leading 0 (11 chars)', '09876543210', '+919876543210'],
      ['formatted with 91 prefix (12 chars)', '919876543210', '+919876543210'],
      ['formatted with +91 prefix and spaces', '+91 98765 43210', '+919876543210'],
      ['noisy non-numeric characters', '987#65$432%10', '+919876543210'],
    ])('normalizes valid input: %s (%s) -> %s', async (_label, inputVal, expectedNormalized) => {
      const user = userEvent.setup();
      renderModal();
      const phoneInput = screen.getByLabelText(/Mobile Number/i);
      await user.type(phoneInput, inputVal);
      const sendBtn = screen.getByRole('button', { name: /Send OTP/i });
      await user.click(sendBtn);

      await waitFor(() => {
        expect(signInWithPhoneNumber).toHaveBeenCalledWith(
          expect.anything(),
          expectedNormalized,
          expect.anything()
        );
      });
    });

    it('clears phone error immediately when user types in phone field', async () => {
      const user = userEvent.setup();
      renderModal();
      const phoneInput = screen.getByLabelText(/Mobile Number/i);
      await user.type(phoneInput, '5555512345');
      const sendBtn = screen.getByRole('button', { name: /Send OTP/i });
      await user.click(sendBtn);

      expect(screen.getByRole('alert')).toBeInTheDocument();

      // Type more
      await user.type(phoneInput, '9');
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
  });

  describe('2. OTP Input Boundaries & Sanitization', () => {
    it('strips non-numeric characters from OTP input in real-time', async () => {
      const user = userEvent.setup();
      renderModal();

      const phoneInput = screen.getByLabelText(/Mobile Number/i);
      await user.type(phoneInput, '9876543210');
      await user.click(screen.getByRole('button', { name: /Send OTP/i }));

      await waitFor(() => {
        expect(screen.getByLabelText(/6-Digit Verification Code/i)).toBeInTheDocument();
      });

      const otpInput = screen.getByLabelText(/6-Digit Verification Code/i);
      // Type alphabetic and special characters
      await user.type(otpInput, '12ab$#34');
      expect(otpInput).toHaveValue('1234');
      expect(screen.getByRole('button', { name: /Verify OTP/i })).toBeDisabled();
    });

    it('limits OTP input strictly to 6 digits maximum', async () => {
      const user = userEvent.setup();
      renderModal();

      const phoneInput = screen.getByLabelText(/Mobile Number/i);
      await user.type(phoneInput, '9876543210');
      await user.click(screen.getByRole('button', { name: /Send OTP/i }));

      await waitFor(() => {
        expect(screen.getByLabelText(/6-Digit Verification Code/i)).toBeInTheDocument();
      });

      const otpInput = screen.getByLabelText(/6-Digit Verification Code/i);
      await user.type(otpInput, '1234567890');
      expect(otpInput).toHaveValue('123456');
    });

    it('clears OTP error immediately when user modifies the OTP field', async () => {
      const user = userEvent.setup();
      mockConfirmationResult.confirm.mockRejectedValueOnce(
        new Error('Firebase: Error (auth/invalid-verification-code).')
      );

      renderModal();
      const phoneInput = screen.getByLabelText(/Mobile Number/i);
      await user.type(phoneInput, '9876543210');
      await user.click(screen.getByRole('button', { name: /Send OTP/i }));

      await waitFor(() => {
        expect(screen.getByLabelText(/6-Digit Verification Code/i)).toBeInTheDocument();
      });

      const otpInput = screen.getByLabelText(/6-Digit Verification Code/i);
      await user.type(otpInput, '000000');
      await user.click(screen.getByRole('button', { name: /Verify OTP/i }));

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });

      await user.clear(otpInput);
      await user.type(otpInput, '1');
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
  });

  describe('3. Concurrency, Debouncing & Rapid-Click Stress Tests', () => {
    it('prevents multiple simultaneous signInWithPhoneNumber invocations on rapid Send OTP clicks', async () => {
      // Delay resolve to simulate real network latency
      let resolveSdk: (val: any) => void;
      const delayedPromise = new Promise((res) => {
        resolveSdk = res;
      });
      vi.mocked(signInWithPhoneNumber).mockReturnValueOnce(delayedPromise as any);

      renderModal();
      const phoneInput = screen.getByLabelText(/Mobile Number/i);
      fireEvent.change(phoneInput, { target: { value: '9876543210' } });

      const sendBtn = screen.getByRole('button', { name: /Send OTP/i });

      // Click rapidly 5 times
      fireEvent.click(sendBtn);
      fireEvent.click(sendBtn);
      fireEvent.click(sendBtn);
      fireEvent.click(sendBtn);
      fireEvent.click(sendBtn);

      // Verify button immediately enters loading state and is disabled
      expect(sendBtn).toBeDisabled();
      expect(screen.getByText('Sending OTP...')).toBeInTheDocument();
      expect(signInWithPhoneNumber).toHaveBeenCalledTimes(1);

      // Resolve the async network request
      await act(async () => {
        resolveSdk!(mockConfirmationResult);
      });

      // After resolution, moves to OTP entry
      await waitFor(() => {
        expect(screen.getByText('Enter Verification Code')).toBeInTheDocument();
      });
    });

    it('prevents multiple simultaneous confirmationResult.confirm invocations on rapid Verify OTP clicks', async () => {
      let resolveConfirm: (val: any) => void;
      const delayedConfirmPromise = new Promise((res) => {
        resolveConfirm = res;
      });
      mockConfirmationResult.confirm.mockReturnValueOnce(delayedConfirmPromise);

      renderModal();
      const phoneInput = screen.getByLabelText(/Mobile Number/i);
      fireEvent.change(phoneInput, { target: { value: '9876543210' } });
      fireEvent.click(screen.getByRole('button', { name: /Send OTP/i }));

      await waitFor(() => {
        expect(screen.getByLabelText(/6-Digit Verification Code/i)).toBeInTheDocument();
      });

      const otpInput = screen.getByLabelText(/6-Digit Verification Code/i);
      fireEvent.change(otpInput, { target: { value: '123456' } });

      const verifyBtn = screen.getByRole('button', { name: /Verify OTP/i });

      // Click rapidly 5 times
      fireEvent.click(verifyBtn);
      fireEvent.click(verifyBtn);
      fireEvent.click(verifyBtn);
      fireEvent.click(verifyBtn);
      fireEvent.click(verifyBtn);

      expect(verifyBtn).toBeDisabled();
      expect(screen.getByText('Verifying...')).toBeInTheDocument();
      expect(mockConfirmationResult.confirm).toHaveBeenCalledTimes(1);

      await act(async () => {
        resolveConfirm!({ user: { uid: 'adv-uid-1' } });
      });

      await waitFor(() => {
        expect(onVerifiedMock).toHaveBeenCalledWith('+919876543210');
        expect(onCloseMock).toHaveBeenCalled();
      });
    });
  });

  describe('4. Timer Accuracy & Resend OTP Workflow', () => {
    it('accurately counts down from 30s to 0s and enables Resend Code button', async () => {
      vi.useFakeTimers();
      try {
        renderModal();

        const phoneInput = screen.getByLabelText(/Mobile Number/i);
        fireEvent.change(phoneInput, { target: { value: '9876543210' } });
        fireEvent.click(screen.getByRole('button', { name: /Send OTP/i }));

        await act(async () => {
          await Promise.resolve();
        });

        // 30s
        expect(screen.getByRole('button', { name: /Resend code in 30s/i })).toBeDisabled();

        // Advance 15s
        for (let i = 0; i < 15; i++) {
          await act(async () => {
            vi.advanceTimersByTime(1000);
          });
        }
        expect(screen.getByRole('button', { name: /Resend code in 15s/i })).toBeDisabled();

        // Advance remaining 15s
        for (let i = 0; i < 15; i++) {
          await act(async () => {
            vi.advanceTimersByTime(1000);
          });
        }

        // At 0s, button is enabled with "Resend Code"
        const resendBtn = screen.getByRole('button', { name: /Resend Code/i });
        expect(resendBtn).toBeEnabled();

        // Click Resend Code
        fireEvent.click(resendBtn);
        await act(async () => {
          await Promise.resolve();
        });

        // Should call signInWithPhoneNumber a second time with isResend = true
        expect(signInWithPhoneNumber).toHaveBeenCalledTimes(2);

        // Timer resets back to 30s
        expect(screen.getByRole('button', { name: /Resend code in 30s/i })).toBeDisabled();
      } finally {
        vi.useRealTimers();
      }
    });

    it('Change Number resets state and allows sending OTP to a completely different phone number', async () => {
      const user = userEvent.setup();
      renderModal();

      // Step 1: Send OTP to first number
      const phoneInput = screen.getByLabelText(/Mobile Number/i);
      await user.type(phoneInput, '9876543210');
      await user.click(screen.getByRole('button', { name: /Send OTP/i }));

      await waitFor(() => {
        expect(screen.getByText('Enter Verification Code')).toBeInTheDocument();
        expect(screen.getByText(/\+91 9876543210/)).toBeInTheDocument();
      });

      // Step 2: User types partial OTP
      const otpInput = screen.getByLabelText(/6-Digit Verification Code/i);
      await user.type(otpInput, '123');

      // Step 3: Click Change Number
      const changeNumBtn = screen.getByRole('button', { name: /Change Number/i });
      await user.click(changeNumBtn);

      // Step 4: Verify we are back on PHONE_ENTRY
      await waitFor(() => {
        expect(screen.getByText('Verify Your Phone Number')).toBeInTheDocument();
        expect(screen.getByLabelText(/Mobile Number/i)).toBeInTheDocument();
      });

      // Step 5: Change number to a new one
      const phoneInputAgain = screen.getByLabelText(/Mobile Number/i);
      await user.clear(phoneInputAgain);
      await user.type(phoneInputAgain, '7890123456');

      await user.click(screen.getByRole('button', { name: /Send OTP/i }));

      await waitFor(() => {
        expect(signInWithPhoneNumber).toHaveBeenLastCalledWith(
          expect.anything(),
          '+917890123456',
          expect.anything()
        );
        expect(screen.getByText(/\+91 7890123456/)).toBeInTheDocument();
      });

      // Verify OTP field is freshly empty
      const freshOtpInput = screen.getByLabelText(/6-Digit Verification Code/i);
      expect(freshOtpInput).toHaveValue('');
    });

    it('resets entire modal state when isOpen flips from true -> false -> true', async () => {
      const { rerender } = renderModal({ isOpen: true });

      const phoneInput = screen.getByLabelText(/Mobile Number/i);
      fireEvent.change(phoneInput, { target: { value: '9876543210' } });
      fireEvent.click(screen.getByRole('button', { name: /Send OTP/i }));

      await waitFor(() => {
        expect(screen.getByText('Enter Verification Code')).toBeInTheDocument();
      });

      // Close modal
      rerender(<PhoneVerificationModal isOpen={false} onClose={onCloseMock} onVerified={onVerifiedMock} />);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

      // Re-open modal
      rerender(<PhoneVerificationModal isOpen={true} onClose={onCloseMock} onVerified={onVerifiedMock} />);

      // Should be back to PHONE_ENTRY with clean inputs
      expect(screen.getByText('Verify Your Phone Number')).toBeInTheDocument();
      const cleanPhoneInput = screen.getByLabelText(/Mobile Number/i);
      expect(cleanPhoneInput).toHaveValue('');
      expect(screen.getByRole('button', { name: /Send OTP/i })).toBeDisabled();
    });
  });

  describe('5. Booking Form Phone Gate Integration & Boundary Hardening', () => {
    it('blocks booking submission and displays warning banner if modal is dismissed unverified', async () => {
      const user = userEvent.setup();
      const googleUser = {
        uid: 'google_unverified_user',
        displayName: 'Alice In Wonderland',
        phoneNumber: null,
        providerData: [{ providerId: 'google.com' }],
      } as any;

      renderBookingFormWithAuth({
        user: googleUser,
        isPhoneVerified: false,
      });

      // Modal pops up on load
      expect(screen.getByRole('dialog')).toBeInTheDocument();

      // Dismiss modal
      const closeBtn = screen.getByLabelText('Close dialog');
      await user.click(closeBtn);

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });

      // Warning banner is displayed prominently
      expect(screen.getByText('Phone Verification Required')).toBeInTheDocument();

      // Fill in all required booking form fields
      const addressInput = screen.getByLabelText(/service location/i);
      const problemInput = screen.getByLabelText(/problem description/i);
      fireEvent.change(addressInput, { target: { value: '123 Wonderland Ave, Bengaluru' } });
      fireEvent.change(problemInput, { target: { value: 'AC completely broken' } });

      await waitFor(() => {
        expect(screen.getByText('10:00 AM - 12:00 PM')).toBeInTheDocument();
      });
      const slotRadio = screen.getByDisplayValue('slot_101');
      await user.click(slotRadio);

      // Attempt submit
      const confirmBookingBtn = screen.getByRole('button', { name: /Confirm Booking/i });
      await user.click(confirmBookingBtn);

      // Gate modal MUST re-open to block submission
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getByText('Verify Your Phone Number')).toBeInTheDocument();
      });

      // Verify backend API was never called
      expect(servicesApi.createBooking).not.toHaveBeenCalled();
    });

    it('completes verification from warning banner, dismisses banner, auto-fills phone, and successfully books', async () => {
      const user = userEvent.setup();
      const googleUser = {
        uid: 'google_unverified_user',
        displayName: 'Bob Builder',
        phoneNumber: null,
        providerData: [{ providerId: 'google.com' }],
      } as any;

      renderBookingFormWithAuth({
        user: googleUser,
        isPhoneVerified: false,
      });

      // Dismiss initial modal
      await user.click(screen.getByLabelText('Close dialog'));
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });

      // Click "Verify Now" on warning banner
      const verifyNowBtn = screen.getByRole('button', { name: /Verify Now/i });
      await user.click(verifyNowBtn);

      // Modal reopens
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Perform verification
      const phoneInput = screen.getByLabelText(/Mobile Number/i);
      await user.type(phoneInput, '9876543210');
      await user.click(screen.getByRole('button', { name: /Send OTP/i }));

      await waitFor(() => {
        expect(screen.getByLabelText(/6-Digit Verification Code/i)).toBeInTheDocument();
      });

      const otpInput = screen.getByLabelText(/6-Digit Verification Code/i);
      await user.type(otpInput, '654321');
      await user.click(screen.getByRole('button', { name: /Verify OTP/i }));

      // Modal dismissed, banner removed, phone populated
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        expect(screen.queryByText('Phone Verification Required')).not.toBeInTheDocument();
        expect(screen.getByLabelText(/phone number/i)).toHaveValue('+919876543210');
      });

      // Fill in remaining fields and submit
      const addressInput = screen.getByLabelText(/service location/i);
      const problemInput = screen.getByLabelText(/problem description/i);
      fireEvent.change(addressInput, { target: { value: '456 Builder Lane, Bengaluru' } });
      fireEvent.change(problemInput, { target: { value: 'Fix AC immediately' } });

      await waitFor(() => {
        expect(screen.getByText('10:00 AM - 12:00 PM')).toBeInTheDocument();
      });
      await user.click(screen.getByDisplayValue('slot_101'));

      await user.click(screen.getByRole('button', { name: /Confirm Booking/i }));

      await waitFor(() => {
        expect(servicesApi.createBooking).toHaveBeenCalledTimes(1);
        const [payload] = vi.mocked(servicesApi.createBooking).mock.calls[0];
        expect(payload.phoneNumber).toBe('+919876543210');
        expect(payload.fullName).toBe('Bob Builder');
      });
    });
  });

  describe('6. ReCAPTCHA Failure & Security Sanitization', () => {
    it('handles ReCAPTCHA expiration callback cleanly', async () => {
      const user = userEvent.setup();
      renderModal();

      const phoneInput = screen.getByLabelText(/Mobile Number/i);
      await user.type(phoneInput, '9876543210');
      await user.click(screen.getByRole('button', { name: /Send OTP/i }));

      await waitFor(() => {
        expect(RecaptchaVerifier).toHaveBeenCalled();
      });

      // Simulate recaptcha expiry callback
      const optionsArg = vi.mocked(RecaptchaVerifier).mock.calls[0][2];
      act(() => {
        optionsArg['expired-callback']();
      });

      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText('Security verification expired. Please try again.')).toBeInTheDocument();
      assertZeroForbiddenTermsInDom();
    });

    it.each([
      ['auth/invalid-phone-number', AUTH_ERROR_MESSAGES.INVALID_PHONE_NUMBER],
      ['auth/missing-phone-number', AUTH_ERROR_MESSAGES.MISSING_PHONE_NUMBER],
      ['auth/quota-exceeded', AUTH_ERROR_MESSAGES.QUOTA_EXCEEDED],
      ['auth/too-many-requests', AUTH_ERROR_MESSAGES.RATE_LIMIT],
      ['auth/network-request-failed', AUTH_ERROR_MESSAGES.NETWORK_ERROR],
      ['auth/internal-error', AUTH_ERROR_MESSAGES.FALLBACK],
      ['random technical error with bearer token and jwt', AUTH_ERROR_MESSAGES.FALLBACK],
    ])('sanitizes error code %s without leaking internal tokens', async (errorCode, expectedSubstring) => {
      const user = userEvent.setup();
      vi.mocked(signInWithPhoneNumber).mockRejectedValueOnce(
        new Error(`Firebase: Error (${errorCode}).`)
      );

      renderModal();
      const phoneInput = screen.getByLabelText(/Mobile Number/i);
      await user.type(phoneInput, '9876543210');
      await user.click(screen.getByRole('button', { name: /Send OTP/i }));

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
        expect(screen.getByText(expectedSubstring)).toBeInTheDocument();
      });

      assertZeroForbiddenTermsInDom();
    });
  });
});
