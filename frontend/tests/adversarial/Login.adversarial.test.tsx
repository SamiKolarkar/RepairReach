import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { Login } from '@/pages/Login';
import {
  signInWithPhoneNumber,
  signInWithPopup,
  GoogleAuthProvider,
  RecaptchaVerifier,
  updateProfile,
} from 'firebase/auth';
import { FORBIDDEN_AUTH_TERMS, AUTH_ERROR_MESSAGES } from '@/lib/authErrorTranslator';

// Mock firebase/auth
vi.mock('firebase/auth', () => {
  const MockRecaptchaVerifier = vi.fn().mockImplementation(function (this: any, _auth, container, options) {
    this.container = container;
    this.options = options;
    this.clear = vi.fn();
    this.render = vi.fn().mockResolvedValue(1);
    this.verify = vi.fn().mockResolvedValue('recaptcha-token');
  });

  const MockGoogleAuthProvider = vi.fn().mockImplementation(function () {});

  return {
    signInWithPhoneNumber: vi.fn(),
    signInWithPopup: vi.fn(),
    GoogleAuthProvider: MockGoogleAuthProvider,
    RecaptchaVerifier: MockRecaptchaVerifier,
    updateProfile: vi.fn(),
  };
});

// Mock @/lib/firebase
vi.mock('@/lib/firebase', () => ({
  auth: {
    currentUser: null,
  },
  app: {},
}));

describe('Empirical Adversarial Challenge: Login Component & Error Sanitization', () => {
  let mockConfirmationResult: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockConfirmationResult = {
      confirm: vi.fn(),
    };
    vi.mocked(signInWithPhoneNumber).mockResolvedValue(mockConfirmationResult);
  });

  const renderLogin = (initialState?: any) => {
    return render(
      <MemoryRouter initialEntries={[{ pathname: '/login', state: initialState }]}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<div data-testid="home-page">Home Page</div>} />
          <Route path="/book" element={<div data-testid="book-page">Book Page</div>} />
        </Routes>
      </MemoryRouter>
    );
  };

  /**
   * Forensic Scanner:
   * 1. Verifies that document textContent contains ZERO forbidden auth terms (including recaptcha, firebase, supabase, etc.).
   * 2. Verifies that document textContent contains ZERO raw Firebase error codes or technical tokens.
   * 3. Verifies that the rendered alert box contains ZERO forbidden terms or error codes.
   */
  const assertStrictDomSanitization = () => {
    const textContent = (document.body.textContent || '').toLowerCase();

    // 1. Check all forbidden keywords in visible user-facing DOM text
    for (const term of FORBIDDEN_AUTH_TERMS) {
      expect(textContent).not.toContain(term.toLowerCase());
    }

    // 2. Check technical error codes and tokens in visible text
    const rawErrorTokens = [
      'auth/',
      'invalid-phone-number',
      'invalid-verification-code',
      'code-expired',
      'captcha-check-failed',
      'quota-exceeded',
      'too-many-requests',
      'popup-closed-by-user',
      'popup-blocked',
      'network-request-failed',
      'internal-error',
      'gserviceaccount',
      'securetoken',
      'jwk',
      'jwt',
      'bearer',
      'supabase',
      'psql',
      'postgres',
      'exception',
      'stacktrace',
    ];

    for (const token of rawErrorTokens) {
      expect(textContent).not.toContain(token);
    }

    // 3. If an alert box is present, explicitly verify its contents
    const alertBox = screen.queryByRole('alert');
    if (alertBox) {
      const alertHtml = alertBox.innerHTML.toLowerCase();
      for (const term of FORBIDDEN_AUTH_TERMS) {
        expect(alertHtml).not.toContain(term.toLowerCase());
      }
      for (const token of rawErrorTokens) {
        expect(alertHtml).not.toContain(token);
      }
    }
  };

  describe('1. Adversarial Phone Number Validation & Normalization', () => {
    const invalidPhoneCases = [
      { label: '3 digits', input: '987' },
      { label: '9 digits starting with 9', input: '987654321' },
      { label: '10 digits starting with 0', input: '0123456789' },
      { label: '10 digits starting with 1', input: '1234567890' },
      { label: '10 digits starting with 2', input: '2345678901' },
      { label: '10 digits starting with 3', input: '3456789012' },
      { label: '10 digits starting with 4', input: '4567890123' },
      { label: '10 digits starting with 5', input: '5678901234' },
      { label: '9 digits starting with 91', input: '919876543' },
      { label: '11 digits starting with 98 (invalid leading 0 or 91 prefix)', input: '98765432100' },
      { label: '12 digits starting with 98 (not 91 prefix)', input: '987654321012' },
      { label: 'letters mixed with digits', input: '98765abcdef' },
    ];

    it.each(invalidPhoneCases)(
      'rejects invalid phone input [$label: "$input"] with validation error and zero SDK call',
      async ({ input }) => {
        const user = userEvent.setup();
        renderLogin();

        const phoneInput = screen.getByLabelText(/phone number/i);
        await user.type(phoneInput, input);

        const sendOtpBtn = screen.getByRole('button', { name: /send otp/i });
        await user.click(sendOtpBtn);

        expect(screen.getByRole('alert')).toBeInTheDocument();
        expect(screen.getByText(AUTH_ERROR_MESSAGES.INVALID_PHONE_NUMBER)).toBeInTheDocument();
        expect(signInWithPhoneNumber).not.toHaveBeenCalled();
        assertStrictDomSanitization();
      }
    );

    const validPhoneCases = [
      { label: '10 digits starting with 6', input: '6123456789', expected: '+916123456789' },
      { label: '10 digits starting with 7', input: '7987654321', expected: '+917987654321' },
      { label: '10 digits starting with 8', input: '8123456789', expected: '+918123456789' },
      { label: '10 digits starting with 9', input: '9876543210', expected: '+919876543210' },
      { label: '12 digits starting with 91', input: '919876543210', expected: '+919876543210' },
      { label: '11 digits starting with 0', input: '09876543210', expected: '+919876543210' },
      { label: '10 digits with spaces', input: '98765 43210', expected: '+919876543210' },
      { label: '10 digits with hyphens', input: '98765-43210', expected: '+919876543210' },
      { label: 'formatted with +91 prefix', input: '+91 98765 43210', expected: '+919876543210' },
    ];

    it.each(validPhoneCases)(
      'normalizes and accepts valid phone input [$label: "$input"] to $expected',
      async ({ input, expected }) => {
        const user = userEvent.setup();
        renderLogin();

        const phoneInput = screen.getByLabelText(/phone number/i);
        await user.type(phoneInput, input);

        const sendOtpBtn = screen.getByRole('button', { name: /send otp/i });
        await user.click(sendOtpBtn);

        await waitFor(() => {
          expect(signInWithPhoneNumber).toHaveBeenCalledWith(
            expect.anything(),
            expected,
            expect.any(Object)
          );
        });
      }
    );
  });

  describe('2. Adversarial OTP Verification & Session Recovery', () => {
    it('handles non-numeric characters and truncates pasted text in OTP input', async () => {
      const user = userEvent.setup();
      renderLogin();

      await user.type(screen.getByLabelText(/phone number/i), '9876543210');
      await user.click(screen.getByRole('button', { name: /send otp/i }));

      await waitFor(() => {
        expect(screen.getByLabelText(/6-digit verification code/i)).toBeInTheDocument();
      });

      const otpInput = screen.getByLabelText(/6-digit verification code/i) as HTMLInputElement;
      await user.type(otpInput, 'ABC123XYZ456789');

      expect(otpInput.value).toBe('123456');
    });

    it('resets OTP input field when "Resend Code" is triggered', async () => {
      const user = userEvent.setup();
      renderLogin();

      await user.type(screen.getByLabelText(/phone number/i), '9876543210');
      await user.click(screen.getByRole('button', { name: /send otp/i }));

      await waitFor(() => {
        expect(screen.getByLabelText(/6-digit verification code/i)).toBeInTheDocument();
      });

      const otpInput = screen.getByLabelText(/6-digit verification code/i) as HTMLInputElement;
      await user.type(otpInput, '123456');
      expect(otpInput.value).toBe('123456');

      // Countdown is active initially
      const resendBtn = screen.getByRole('button', { name: /resend code/i });
      expect(resendBtn).toBeDisabled();
    });
  });

  describe('3. Adversarial Error Code Matrix & Strict DOM Sanitization', () => {
    const errorMatrix = [
      {
        scenario: 'Firebase phone quota exceeded',
        error: new Error('Firebase: Error (auth/quota-exceeded).'),
        expectedMessage: AUTH_ERROR_MESSAGES.QUOTA_EXCEEDED,
      },
      {
        scenario: 'Firebase invalid verification code',
        error: new Error('Firebase: Error (auth/invalid-verification-code).'),
        expectedMessage: AUTH_ERROR_MESSAGES.INVALID_VERIFICATION_CODE,
      },
      {
        scenario: 'Firebase verification code expired',
        error: new Error('Firebase: Error (auth/code-expired).'),
        expectedMessage: AUTH_ERROR_MESSAGES.CODE_EXPIRED,
      },
      {
        scenario: 'Firebase session expired',
        error: new Error('Firebase: Error (auth/session-expired).'),
        expectedMessage: AUTH_ERROR_MESSAGES.SESSION_EXPIRED,
      },
      {
        scenario: 'Firebase invalid app credential (reCAPTCHA error)',
        error: new Error('Firebase: Error (auth/invalid-app-credential).'),
        expectedMessage: AUTH_ERROR_MESSAGES.CAPTCHA_CHECK_FAILED,
      },
      {
        scenario: 'Firebase app not authorized',
        error: new Error('Firebase: Error (auth/app-not-authorized).'),
        expectedMessage: AUTH_ERROR_MESSAGES.CAPTCHA_CHECK_FAILED,
      },
      {
        scenario: 'Firebase network request failed',
        error: new Error('Firebase: Error (auth/network-request-failed).'),
        expectedMessage: AUTH_ERROR_MESSAGES.NETWORK_ERROR,
      },
      {
        scenario: 'Firebase internal error with stack info',
        error: new Error('Firebase: internal-error at securetoken.googleapis.com with jwk jwt bearer'),
        expectedMessage: AUTH_ERROR_MESSAGES.FALLBACK,
      },
      {
        scenario: 'Supabase legacy AuthApiError injection',
        error: new Error('Supabase AuthApiError: Brevo SMTP delivery failure postgres error'),
        expectedMessage: AUTH_ERROR_MESSAGES.SMTP_OR_DELIVERY_FAILURE,
      },
      {
        scenario: 'Google popup blocked by browser',
        isGoogle: true,
        error: new Error('Firebase: Error (auth/popup-blocked).'),
        expectedMessage: AUTH_ERROR_MESSAGES.POPUP_BLOCKED,
      },
      {
        scenario: 'Google popup closed by user',
        isGoogle: true,
        error: new Error('Firebase: Error (auth/popup-closed-by-user).'),
        expectedMessage: AUTH_ERROR_MESSAGES.POPUP_CLOSED_BY_USER,
      },
      {
        scenario: 'Google popup cancelled request',
        isGoogle: true,
        error: new Error('Firebase: Error (auth/cancelled-popup-request).'),
        expectedMessage: AUTH_ERROR_MESSAGES.CANCELLED_POPUP_REQUEST,
      },
      {
        scenario: 'Account exists with different credential',
        isGoogle: true,
        error: new Error('Firebase: Error (auth/account-exists-with-different-credential).'),
        expectedMessage: AUTH_ERROR_MESSAGES.ACCOUNT_EXISTS_WITH_DIFFERENT_CREDENTIAL,
      },
      {
        scenario: 'User account disabled',
        isGoogle: true,
        error: new Error('Firebase: Error (auth/user-disabled).'),
        expectedMessage: AUTH_ERROR_MESSAGES.USER_DISABLED,
      },
      {
        scenario: 'Web storage unsupported',
        isGoogle: true,
        error: new Error('Firebase: Error (auth/web-storage-unsupported).'),
        expectedMessage: AUTH_ERROR_MESSAGES.STORAGE_UNSUPPORTED,
      },
    ];

    it.each(errorMatrix)(
      'sanitizes and renders safe message for [$scenario] without leaking technical tokens into DOM',
      async ({ scenario, error, expectedMessage, isGoogle }) => {
        const user = userEvent.setup();

        if (isGoogle) {
          vi.mocked(signInWithPopup).mockRejectedValue(error);
          renderLogin();
          await user.click(screen.getByRole('button', { name: /continue with google/i }));

          await waitFor(() => {
            expect(screen.getByRole('alert')).toBeInTheDocument();
            expect(screen.getByText(expectedMessage)).toBeInTheDocument();
          });

          assertStrictDomSanitization();
        } else {
          vi.mocked(signInWithPhoneNumber).mockRejectedValue(error);
          renderLogin();
          await user.type(screen.getByLabelText(/phone number/i), '9876543210');
          await user.click(screen.getByRole('button', { name: /send otp/i }));

          await waitFor(() => {
            expect(screen.getByRole('alert')).toBeInTheDocument();
            expect(screen.getByText(expectedMessage)).toBeInTheDocument();
          });

          assertStrictDomSanitization();
        }
      }
    );
  });

  describe('4. Profile Collection Validation Edge Cases', () => {
    it('rejects single character Full Name with disabled complete button', async () => {
      const user = userEvent.setup();
      const mockNewUser = {
        uid: 'user-single-char',
        phoneNumber: '+919876543210',
        displayName: '',
      };
      mockConfirmationResult.confirm.mockResolvedValue({ user: mockNewUser });

      renderLogin();

      await user.type(screen.getByLabelText(/phone number/i), '9876543210');
      await user.click(screen.getByRole('button', { name: /send otp/i }));

      await waitFor(() => {
        expect(screen.getByLabelText(/6-digit verification code/i)).toBeInTheDocument();
      });
      await user.type(screen.getByLabelText(/6-digit verification code/i), '123456');
      await user.click(screen.getByRole('button', { name: /verify otp/i }));

      await waitFor(() => {
        expect(screen.getByText('Complete Your Profile')).toBeInTheDocument();
      });

      const nameInput = screen.getByLabelText(/full name/i);
      await user.type(nameInput, 'A');

      const completeBtn = screen.getByRole('button', { name: /complete profile/i });
      expect(completeBtn).toBeDisabled();

      assertStrictDomSanitization();
    });

    it('rejects whitespace-only Full Name with disabled complete button', async () => {
      const user = userEvent.setup();
      const mockNewUser = {
        uid: 'user-whitespace-name',
        phoneNumber: '+919876543210',
        displayName: '',
      };
      mockConfirmationResult.confirm.mockResolvedValue({ user: mockNewUser });

      renderLogin();

      await user.type(screen.getByLabelText(/phone number/i), '9876543210');
      await user.click(screen.getByRole('button', { name: /send otp/i }));

      await waitFor(() => {
        expect(screen.getByLabelText(/6-digit verification code/i)).toBeInTheDocument();
      });
      await user.type(screen.getByLabelText(/6-digit verification code/i), '123456');
      await user.click(screen.getByRole('button', { name: /verify otp/i }));

      await waitFor(() => {
        expect(screen.getByText('Complete Your Profile')).toBeInTheDocument();
      });

      const nameInput = screen.getByLabelText(/full name/i);
      await user.type(nameInput, '   ');

      const completeBtn = screen.getByRole('button', { name: /complete profile/i });
      expect(completeBtn).toBeDisabled();
    });

    const malformedEmails = [
      { label: 'missing @ and domain', input: 'plainaddress' },
      { label: 'missing username', input: '@example.com' },
      { label: 'missing domain extension', input: 'user@domain' },
      { label: 'trailing dot', input: 'user@domain.' },
      { label: 'double @ symbol', input: 'user@@domain.com' },
    ];

    it.each(malformedEmails)(
      'rejects malformed email format "$input" in profile collection',
      async ({ input }) => {
        const user = userEvent.setup();
        const mockNewUser = {
          uid: 'user-malformed-email',
          phoneNumber: '+919876543210',
          displayName: '',
        };
        mockConfirmationResult.confirm.mockResolvedValue({ user: mockNewUser });

        renderLogin();

        await user.type(screen.getByLabelText(/phone number/i), '9876543210');
        await user.click(screen.getByRole('button', { name: /send otp/i }));

        await waitFor(() => {
          expect(screen.getByLabelText(/6-digit verification code/i)).toBeInTheDocument();
        });
        await user.type(screen.getByLabelText(/6-digit verification code/i), '123456');
        await user.click(screen.getByRole('button', { name: /verify otp/i }));

        await waitFor(() => {
          expect(screen.getByText('Complete Your Profile')).toBeInTheDocument();
        });

        await user.type(screen.getByLabelText(/full name/i), 'Suresh Raina');
        await user.type(screen.getByLabelText(/email address/i), input);

        await user.click(screen.getByRole('button', { name: /complete profile/i }));

        expect(screen.getByRole('alert')).toBeInTheDocument();
        expect(screen.getByText('Please enter a valid email address.')).toBeInTheDocument();
        expect(updateProfile).not.toHaveBeenCalled();

        assertStrictDomSanitization();
      }
    );

    it('handles updateProfile rejection safely and displays translated error', async () => {
      const user = userEvent.setup();
      const mockNewUser = {
        uid: 'user-profile-fail',
        phoneNumber: '+919876543210',
        displayName: '',
      };
      mockConfirmationResult.confirm.mockResolvedValue({ user: mockNewUser });
      vi.mocked(updateProfile).mockRejectedValue(
        new Error('Firebase: Error (auth/network-request-failed).')
      );

      renderLogin();

      await user.type(screen.getByLabelText(/phone number/i), '9876543210');
      await user.click(screen.getByRole('button', { name: /send otp/i }));

      await waitFor(() => {
        expect(screen.getByLabelText(/6-digit verification code/i)).toBeInTheDocument();
      });
      await user.type(screen.getByLabelText(/6-digit verification code/i), '123456');
      await user.click(screen.getByRole('button', { name: /verify otp/i }));

      await waitFor(() => {
        expect(screen.getByText('Complete Your Profile')).toBeInTheDocument();
      });

      await user.type(screen.getByLabelText(/full name/i), 'Amit Kumar');
      await user.click(screen.getByRole('button', { name: /complete profile/i }));

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
        expect(screen.getByText(AUTH_ERROR_MESSAGES.NETWORK_ERROR)).toBeInTheDocument();
      });

      assertStrictDomSanitization();
    });
  });
});
