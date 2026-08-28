import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
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

describe('Login Component — Adversarial Stress & Edge Case Suite', () => {
  let mockConfirmationResult: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockConfirmationResult = {
      confirm: vi.fn(),
    };
    vi.mocked(signInWithPhoneNumber).mockResolvedValue(mockConfirmationResult);
  });

  afterEach(() => {
    vi.useRealTimers();
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

  const assertNoForbiddenTermsInDom = () => {
    const pageText = document.body.textContent || '';
    for (const term of FORBIDDEN_AUTH_TERMS) {
      expect(pageText.toLowerCase()).not.toContain(term.toLowerCase());
    }
  };

  // =========================================================================
  // Section 1: Phone Validation & Formatting Edge Cases
  // =========================================================================
  describe('1. Phone Validation & Formatting Edge Cases', () => {
    const invalidPrefixCases = [
      { input: '0123456789', desc: 'starts with 0' },
      { input: '1234567890', desc: 'starts with 1' },
      { input: '2345678901', desc: 'starts with 2' },
      { input: '3456789012', desc: 'starts with 3' },
      { input: '4567890123', desc: 'starts with 4' },
      { input: '5678901234', desc: 'starts with 5' },
    ];

    invalidPrefixCases.forEach(({ input, desc }) => {
      it(`rejects 10-digit number with invalid prefix (${desc}: ${input})`, async () => {
        const user = userEvent.setup();
        renderLogin();

        const phoneInput = screen.getByLabelText(/phone number/i);
        await user.type(phoneInput, input);

        const sendOtpBtn = screen.getByRole('button', { name: /send otp/i });
        await user.click(sendOtpBtn);

        expect(screen.getByRole('alert')).toBeInTheDocument();
        expect(screen.getByText('Please enter a valid 10-digit mobile number.')).toBeInTheDocument();
        expect(signInWithPhoneNumber).not.toHaveBeenCalled();
        assertNoForbiddenTermsInDom();
      });
    });

    it('rejects short phone numbers (1 to 9 digits)', async () => {
      const user = userEvent.setup();
      renderLogin();

      const phoneInput = screen.getByLabelText(/phone number/i);
      await user.type(phoneInput, '987654321');

      const sendOtpBtn = screen.getByRole('button', { name: /send otp/i });
      await user.click(sendOtpBtn);

      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText('Please enter a valid 10-digit mobile number.')).toBeInTheDocument();
      expect(signInWithPhoneNumber).not.toHaveBeenCalled();
    });

    it('rejects all zeros number "0000000000"', async () => {
      const user = userEvent.setup();
      renderLogin();

      const phoneInput = screen.getByLabelText(/phone number/i);
      await user.type(phoneInput, '0000000000');

      const sendOtpBtn = screen.getByRole('button', { name: /send otp/i });
      await user.click(sendOtpBtn);

      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText('Please enter a valid 10-digit mobile number.')).toBeInTheDocument();
      expect(signInWithPhoneNumber).not.toHaveBeenCalled();
    });

    it('rejects input containing only letters or special characters', async () => {
      const user = userEvent.setup();
      renderLogin();

      const phoneInput = screen.getByLabelText(/phone number/i);
      await user.type(phoneInput, 'abcdefghij');

      const sendOtpBtn = screen.getByRole('button', { name: /send otp/i });
      await user.click(sendOtpBtn);

      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText('Please enter a valid 10-digit mobile number.')).toBeInTheDocument();
      expect(signInWithPhoneNumber).not.toHaveBeenCalled();
    });

    it('handles formatted numbers with brackets and spaces: "(987) 654-3210"', async () => {
      const user = userEvent.setup();
      renderLogin();

      const phoneInput = screen.getByLabelText(/phone number/i);
      await user.type(phoneInput, '(987) 654-3210');

      const sendOtpBtn = screen.getByRole('button', { name: /send otp/i });
      await user.click(sendOtpBtn);

      await waitFor(() => {
        expect(signInWithPhoneNumber).toHaveBeenCalledWith(
          expect.anything(),
          '+919876543210',
          expect.any(Object)
        );
      });
      expect(screen.getByText('Verify Mobile OTP')).toBeInTheDocument();
    });

    it('handles formatted numbers with +91 country prefix: "+91 98765 43210"', async () => {
      const user = userEvent.setup();
      renderLogin();

      const phoneInput = screen.getByLabelText(/phone number/i);
      await user.type(phoneInput, '+91 98765 43210');

      const sendOtpBtn = screen.getByRole('button', { name: /send otp/i });
      await user.click(sendOtpBtn);

      await waitFor(() => {
        expect(signInWithPhoneNumber).toHaveBeenCalledWith(
          expect.anything(),
          '+919876543210',
          expect.any(Object)
        );
      });
    });

    it('handles formatted numbers with dots: "98765.43210"', async () => {
      const user = userEvent.setup();
      renderLogin();

      const phoneInput = screen.getByLabelText(/phone number/i);
      await user.type(phoneInput, '98765.43210');

      const sendOtpBtn = screen.getByRole('button', { name: /send otp/i });
      await user.click(sendOtpBtn);

      await waitFor(() => {
        expect(signInWithPhoneNumber).toHaveBeenCalledWith(
          expect.anything(),
          '+919876543210',
          expect.any(Object)
        );
      });
    });

    const validPrefixes = ['6123456789', '7123456789', '8123456789', '9123456789'];
    validPrefixes.forEach((validNum) => {
      it(`handles valid number starting with valid prefix ${validNum[0]}: "${validNum}"`, async () => {
        const user = userEvent.setup();
        renderLogin();

        const phoneInput = screen.getByLabelText(/phone number/i);
        await user.type(phoneInput, validNum);
        const sendOtpBtn = screen.getByRole('button', { name: /send otp/i });
        await user.click(sendOtpBtn);

        await waitFor(() => {
          expect(signInWithPhoneNumber).toHaveBeenCalledWith(
            expect.anything(),
            `+91${validNum}`,
            expect.any(Object)
          );
        });
      });
    });

    it('prevents multiple simultaneous calls on rapid repeated clicks of "Send OTP"', async () => {
      let resolveAuth: any;
      vi.mocked(signInWithPhoneNumber).mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveAuth = resolve;
          })
      );

      const user = userEvent.setup();
      renderLogin();

      const phoneInput = screen.getByLabelText(/phone number/i);
      await user.type(phoneInput, '9876543210');

      const sendOtpBtn = screen.getByRole('button', { name: /send otp/i });

      // Click button
      await user.click(sendOtpBtn);
      expect(sendOtpBtn).toBeDisabled();

      // Fire another click event while loading
      fireEvent.click(sendOtpBtn);
      fireEvent.click(sendOtpBtn);

      // Verify signInWithPhoneNumber was only triggered once
      expect(signInWithPhoneNumber).toHaveBeenCalledTimes(1);

      // Resolve the pending promise
      act(() => {
        resolveAuth(mockConfirmationResult);
      });

      await waitFor(() => {
        expect(screen.getByText('Verify Mobile OTP')).toBeInTheDocument();
      });
    });
  });

  // =========================================================================
  // Section 2: OTP Entry & Verification Stress Tests
  // =========================================================================
  describe('2. OTP Entry & Verification Stress Tests', () => {
    it('handles invalid 6-digit OTP error (auth/invalid-verification-code)', async () => {
      const user = userEvent.setup();
      mockConfirmationResult.confirm.mockRejectedValue(
        new Error('Firebase: Error (auth/invalid-verification-code).')
      );

      renderLogin();

      await user.type(screen.getByLabelText(/phone number/i), '9876543210');
      await user.click(screen.getByRole('button', { name: /send otp/i }));

      await waitFor(() => {
        expect(screen.getByLabelText(/6-digit verification code/i)).toBeInTheDocument();
      });

      const otpInput = screen.getByLabelText(/6-digit verification code/i);
      await user.type(otpInput, '000000');

      const verifyBtn = screen.getByRole('button', { name: /verify otp/i });
      await user.click(verifyBtn);

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
        expect(
          screen.getByText(AUTH_ERROR_MESSAGES.INVALID_VERIFICATION_CODE)
        ).toBeInTheDocument();
      });

      assertNoForbiddenTermsInDom();
    });

    it('handles expired OTP error (auth/code-expired)', async () => {
      const user = userEvent.setup();
      mockConfirmationResult.confirm.mockRejectedValue(
        new Error('Firebase: Error (auth/code-expired).')
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
        expect(screen.getByRole('alert')).toBeInTheDocument();
        expect(
          screen.getByText(AUTH_ERROR_MESSAGES.CODE_EXPIRED)
        ).toBeInTheDocument();
      });

      assertNoForbiddenTermsInDom();
    });

    it('handles network failure during confirm() without crashing or leaking technical errors', async () => {
      const user = userEvent.setup();
      mockConfirmationResult.confirm.mockRejectedValue(
        new TypeError('Failed to fetch: Network request failed')
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
        expect(screen.getByRole('alert')).toBeInTheDocument();
        expect(
          screen.getByText(AUTH_ERROR_MESSAGES.NETWORK_ERROR)
        ).toBeInTheDocument();
      });

      assertNoForbiddenTermsInDom();
    });

    it('prevents multiple simultaneous calls on rapid repeated clicks of "Verify OTP"', async () => {
      let resolveConfirm: any;
      mockConfirmationResult.confirm.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveConfirm = resolve;
          })
      );

      const user = userEvent.setup();
      renderLogin();

      await user.type(screen.getByLabelText(/phone number/i), '9876543210');
      await user.click(screen.getByRole('button', { name: /send otp/i }));

      await waitFor(() => {
        expect(screen.getByLabelText(/6-digit verification code/i)).toBeInTheDocument();
      });

      const otpInput = screen.getByLabelText(/6-digit verification code/i);
      await user.type(otpInput, '123456');

      const verifyBtn = screen.getByRole('button', { name: /verify otp/i });
      await user.click(verifyBtn);

      expect(verifyBtn).toBeDisabled();

      // Rapid clicks while verifying
      fireEvent.click(verifyBtn);
      fireEvent.click(verifyBtn);

      expect(mockConfirmationResult.confirm).toHaveBeenCalledTimes(1);

      // Resolve
      act(() => {
        resolveConfirm({
          user: { uid: 'u1', displayName: 'Existing User', phoneNumber: '+919876543210' },
        });
      });

      await waitFor(() => {
        expect(screen.getByTestId('home-page')).toBeInTheDocument();
      });
    });

    it('supports "Change Number" navigation, clearing OTP and error, and allowing full retry', async () => {
      const user = userEvent.setup();
      renderLogin();

      // Step 1: Send OTP for 9876543210
      await user.type(screen.getByLabelText(/phone number/i), '9876543210');
      await user.click(screen.getByRole('button', { name: /send otp/i }));

      await waitFor(() => {
        expect(screen.getByText('Verify Mobile OTP')).toBeInTheDocument();
      });

      // Type some OTP
      const otpInput = screen.getByLabelText(/6-digit verification code/i);
      await user.type(otpInput, '123');

      // Click Change Number
      const changeNumBtn = screen.getByRole('button', { name: /change number/i });
      await user.click(changeNumBtn);

      // Back to PHONE_ENTRY
      expect(screen.getByText('Sign in with Phone')).toBeInTheDocument();
      const phoneInput = screen.getByLabelText(/phone number/i) as HTMLInputElement;

      // User changes phone number
      await user.clear(phoneInput);
      await user.type(phoneInput, '9123456789');

      // Submit new phone
      await user.click(screen.getByRole('button', { name: /send otp/i }));

      await waitFor(() => {
        expect(signInWithPhoneNumber).toHaveBeenCalledWith(
          expect.anything(),
          '+919123456789',
          expect.any(Object)
        );
        expect(screen.getByText('Verify Mobile OTP')).toBeInTheDocument();
        expect(screen.getByText('+91 9123456789')).toBeInTheDocument();
      });
    });
  });

  // =========================================================================
  // Section 3: Timer Countdown & Resend Code Lifecycle
  // =========================================================================
  describe('3. Timer Countdown & Resend Code Lifecycle', () => {
    it('accurately counts down from 30s to 0s, enables Resend Code button, and resets OTP on resend', async () => {
      vi.useFakeTimers();
      renderLogin();

      // Fill phone and click send using fireEvent to avoid userEvent timer interaction
      const phoneInput = screen.getByLabelText(/phone number/i);
      fireEvent.change(phoneInput, { target: { value: '9876543210' } });

      const sendOtpBtn = screen.getByRole('button', { name: /send otp/i });
      fireEvent.click(sendOtpBtn);

      // Fast-forward initial async promise
      await act(async () => {
        await Promise.resolve();
      });

      expect(screen.getByText('Verify Mobile OTP')).toBeInTheDocument();

      // Check initial 30s countdown state
      const resendBtn = screen.getByRole('button', { name: /resend code in 30s/i });
      expect(resendBtn).toBeDisabled();

      // Type some OTP
      const otpInput = screen.getByLabelText(/6-digit verification code/i) as HTMLInputElement;
      fireEvent.change(otpInput, { target: { value: '123456' } });
      expect(otpInput.value).toBe('123456');

      // Advance timer by 15 seconds (1s at a time to allow React effect re-scheduling)
      for (let i = 0; i < 15; i++) {
        act(() => {
          vi.advanceTimersByTime(1000);
        });
      }
      expect(screen.getByRole('button', { name: /resend code in 15s/i })).toBeDisabled();

      // Advance timer by another 15 seconds (total 30s)
      for (let i = 0; i < 15; i++) {
        act(() => {
          vi.advanceTimersByTime(1000);
        });
      }

      // Countdown finished: button becomes "Resend Code" and is enabled
      const activeResendBtn = screen.getByRole('button', { name: /resend code$/i });
      expect(activeResendBtn).not.toBeDisabled();

      // Click "Resend Code"
      fireEvent.click(activeResendBtn);

      await act(async () => {
        await Promise.resolve();
      });

      // Verify OTP input is cleared and new 30s countdown is initiated
      expect(otpInput.value).toBe('');
      expect(screen.getByRole('button', { name: /resend code in 30s/i })).toBeDisabled();
      expect(signInWithPhoneNumber).toHaveBeenCalledTimes(2);
    });

    it('safely cleans up countdown timer on component unmount without memory leaks', async () => {
      vi.useFakeTimers();

      const { unmount } = renderLogin();

      const phoneInput = screen.getByLabelText(/phone number/i);
      fireEvent.change(phoneInput, { target: { value: '9876543210' } });
      fireEvent.click(screen.getByRole('button', { name: /send otp/i }));

      await act(async () => {
        await Promise.resolve();
      });

      expect(screen.getByText('Verify Mobile OTP')).toBeInTheDocument();

      // Unmount while countdown is running
      expect(() => {
        unmount();
        act(() => {
          vi.advanceTimersByTime(30000);
        });
      }).not.toThrow();
    });
  });

  // =========================================================================
  // Section 4: First-time Profile Collection Edge Cases & Rapid Submissions
  // =========================================================================
  describe('4. First-time Profile Collection Edge Cases & Rapid Submissions', () => {
    const renderAndReachProfile = async () => {
      const user = userEvent.setup();
      const mockNewUser = {
        uid: 'user-stress-new',
        phoneNumber: '+919876543210',
        displayName: '',
      };
      mockConfirmationResult.confirm.mockResolvedValue({ user: mockNewUser });

      renderLogin();

      const phoneInput = screen.getByLabelText(/phone number/i);
      fireEvent.change(phoneInput, { target: { value: '9876543210' } });
      fireEvent.click(screen.getByRole('button', { name: /send otp/i }));

      await waitFor(() => {
        expect(screen.getByLabelText(/6-digit verification code/i)).toBeInTheDocument();
      });

      const otpInput = screen.getByLabelText(/6-digit verification code/i);
      fireEvent.change(otpInput, { target: { value: '123456' } });
      fireEvent.click(screen.getByRole('button', { name: /verify otp/i }));

      await waitFor(() => {
        expect(screen.getByText('Complete Your Profile')).toBeInTheDocument();
      });

      return { user, mockNewUser };
    };

    it('rejects single character full name with validation error', async () => {
      await renderAndReachProfile();

      const nameInput = screen.getByLabelText(/full name/i);
      fireEvent.change(nameInput, { target: { value: 'A' } });

      const submitBtn = screen.getByRole('button', { name: /complete profile/i });
      expect(submitBtn).toBeDisabled();

      fireEvent.submit(nameInput.closest('form')!);

      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(
        screen.getByText('Please enter your full name (at least 2 characters).')
      ).toBeInTheDocument();
      expect(updateProfile).not.toHaveBeenCalled();
    });

    it('rejects whitespace-only full name with validation error', async () => {
      await renderAndReachProfile();

      const nameInput = screen.getByLabelText(/full name/i);
      fireEvent.change(nameInput, { target: { value: '     ' } });

      const submitBtn = screen.getByRole('button', { name: /complete profile/i });
      expect(submitBtn).toBeDisabled();

      fireEvent.submit(nameInput.closest('form')!);

      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(
        screen.getByText('Please enter your full name (at least 2 characters).')
      ).toBeInTheDocument();
      expect(updateProfile).not.toHaveBeenCalled();
    });

    it('handles complex full names with special characters (Dr. Jean-Luc O\'Connor-Smith III)', async () => {
      const { mockNewUser } = await renderAndReachProfile();
      vi.mocked(updateProfile).mockResolvedValue(undefined);

      const nameInput = screen.getByLabelText(/full name/i);
      fireEvent.change(nameInput, { target: { value: "Dr. Jean-Luc O'Connor-Smith III" } });

      const submitBtn = screen.getByRole('button', { name: /complete profile/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(updateProfile).toHaveBeenCalledWith(mockNewUser, {
          displayName: "Dr. Jean-Luc O'Connor-Smith III",
        });
        expect(screen.getByTestId('home-page')).toBeInTheDocument();
      });
    });

    const malformedEmails = [
      'plainaddress',
      '#@%^%#$@#$@#.com',
      '@missingusername.com',
      'username@.com',
      'username@domain',
    ];

    malformedEmails.forEach((badEmail) => {
      it(`rejects malformed email "${badEmail}" in profile form`, async () => {
        await renderAndReachProfile();

        const nameInput = screen.getByLabelText(/full name/i);
        const emailInput = screen.getByLabelText(/email address/i);

        fireEvent.change(nameInput, { target: { value: 'John Doe' } });
        fireEvent.change(emailInput, { target: { value: badEmail } });

        const submitBtn = screen.getByRole('button', { name: /complete profile/i });
        fireEvent.click(submitBtn);

        expect(screen.getByRole('alert')).toBeInTheDocument();
        expect(screen.getByText('Please enter a valid email address.')).toBeInTheDocument();
        expect(updateProfile).not.toHaveBeenCalled();
      });
    });

    it('prevents multiple simultaneous calls on rapid clicks of "Complete Profile"', async () => {
      let resolveUpdate: any;
      vi.mocked(updateProfile).mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveUpdate = resolve;
          })
      );

      await renderAndReachProfile();

      const nameInput = screen.getByLabelText(/full name/i);
      fireEvent.change(nameInput, { target: { value: 'Rajesh Sharma' } });
      const submitBtn = screen.getByRole('button', { name: /complete profile/i });

      fireEvent.click(submitBtn);
      expect(submitBtn).toBeDisabled();

      // Rapid clicks while loading
      fireEvent.click(submitBtn);
      fireEvent.click(submitBtn);

      expect(updateProfile).toHaveBeenCalledTimes(1);

      act(() => {
        resolveUpdate();
      });

      await waitFor(() => {
        expect(screen.getByTestId('home-page')).toBeInTheDocument();
      });
    });

    it('handles network failure during updateProfile() gracefully without raw leak', async () => {
      await renderAndReachProfile();
      vi.mocked(updateProfile).mockRejectedValue(
        new Error('Firebase: Error (auth/network-request-failed).')
      );

      const nameInput = screen.getByLabelText(/full name/i);
      fireEvent.change(nameInput, { target: { value: 'Rajesh Sharma' } });
      const submitBtn = screen.getByRole('button', { name: /complete profile/i });

      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
        expect(
          screen.getByText(AUTH_ERROR_MESSAGES.NETWORK_ERROR)
        ).toBeInTheDocument();
      });

      assertNoForbiddenTermsInDom();
    });
  });

  // =========================================================================
  // Section 5: Unhandled Rejection & DOM Forensics Under Diverse Failures
  // =========================================================================
  describe('5. DOM Forensics & Sanitization Under Diverse Firebase Failures', () => {
    const errorScenarios = [
      {
        code: 'auth/user-disabled',
        msg: 'Firebase: Error (auth/user-disabled).',
        expected: AUTH_ERROR_MESSAGES.USER_DISABLED,
      },
      {
        code: 'auth/operation-not-allowed',
        msg: 'Firebase: Error (auth/operation-not-allowed).',
        expected: AUTH_ERROR_MESSAGES.OPERATION_NOT_ALLOWED,
      },
      {
        code: 'auth/popup-blocked',
        msg: 'Firebase: Error (auth/popup-blocked).',
        expected: AUTH_ERROR_MESSAGES.POPUP_BLOCKED,
      },
      {
        code: 'auth/invalid-app-credential',
        msg: 'Firebase: Error (auth/invalid-app-credential).',
        expected: AUTH_ERROR_MESSAGES.CAPTCHA_CHECK_FAILED,
      },
      {
        code: 'auth/captcha-check-failed',
        msg: 'Firebase: Error (auth/captcha-check-failed).',
        expected: AUTH_ERROR_MESSAGES.CAPTCHA_CHECK_FAILED,
      },
      {
        code: 'auth/unknown-code',
        msg: 'Firebase: Error (auth/unknown-code).',
        expected: AUTH_ERROR_MESSAGES.FALLBACK,
      },
    ];

    errorScenarios.forEach(({ code, msg, expected }) => {
      it(`sanitizes error ${code} properly into friendly message "${expected}"`, async () => {
        const user = userEvent.setup();
        vi.mocked(signInWithPhoneNumber).mockRejectedValue(new Error(msg));

        renderLogin();

        await user.type(screen.getByLabelText(/phone number/i), '9876543210');
        await user.click(screen.getByRole('button', { name: /send otp/i }));

        await waitFor(() => {
          expect(screen.getByRole('alert')).toBeInTheDocument();
          expect(screen.getByText(expected)).toBeInTheDocument();
        });

        assertNoForbiddenTermsInDom();
      });
    });
  });
});
