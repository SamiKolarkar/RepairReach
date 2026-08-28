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
import { FORBIDDEN_AUTH_TERMS } from '@/lib/authErrorTranslator';

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

describe('Milestone 3 Adversarial State Transition & Lifecycle Challenge', () => {
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
          <Route path="/dashboard" element={<div data-testid="dashboard-page">Dashboard Page</div>} />
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

  describe('1. State Transition: PHONE_ENTRY -> OTP_ENTRY -> PROFILE_COLLECTION -> Redirect', () => {
    it('executes the full end-to-end first-time user journey through all 3 states', async () => {
      const user = userEvent.setup();
      const mockFirstTimeUser = {
        uid: 'usr-first-time-999',
        phoneNumber: '+919876543210',
        displayName: null,
        email: null,
      };
      mockConfirmationResult.confirm.mockResolvedValue({ user: mockFirstTimeUser });
      vi.mocked(updateProfile).mockResolvedValue(undefined);

      renderLogin({ from: { pathname: '/dashboard' } });

      // State 1: PHONE_ENTRY
      expect(screen.getByText('Sign in with Phone')).toBeInTheDocument();
      const phoneInput = screen.getByLabelText(/phone number/i);
      await user.type(phoneInput, '9876543210');

      const sendOtpBtn = screen.getByRole('button', { name: /send otp/i });
      await user.click(sendOtpBtn);

      // State 2: OTP_ENTRY
      await waitFor(() => {
        expect(screen.getByText('Verify Mobile OTP')).toBeInTheDocument();
      });
      expect(screen.getByText('+91 9876543210')).toBeInTheDocument();

      const otpInput = screen.getByLabelText(/6-digit verification code/i);
      await user.type(otpInput, '654321');

      const verifyOtpBtn = screen.getByRole('button', { name: /verify otp/i });
      await user.click(verifyOtpBtn);

      // State 3: PROFILE_COLLECTION
      await waitFor(() => {
        expect(screen.getByText('Complete Your Profile')).toBeInTheDocument();
      });

      const nameInput = screen.getByLabelText(/full name/i);
      const emailInput = screen.getByLabelText(/email address/i);

      await user.type(nameInput, 'Amitabh Bachan');
      await user.type(emailInput, 'amitabh@example.com');

      const completeProfileBtn = screen.getByRole('button', { name: /complete profile/i });
      await user.click(completeProfileBtn);

      // Redirect destination reached
      await waitFor(() => {
        expect(updateProfile).toHaveBeenCalledWith(mockFirstTimeUser, {
          displayName: 'Amitabh Bachan',
        });
        expect(screen.getByTestId('dashboard-page')).toBeInTheDocument();
      });
    }, 15000);

    it('treats whitespace-only displayName as first-time user and prompts PROFILE_COLLECTION', async () => {
      const user = userEvent.setup();
      const mockWhitespaceUser = {
        uid: 'usr-ws-1',
        phoneNumber: '+919876543210',
        displayName: '   ',
      };
      mockConfirmationResult.confirm.mockResolvedValue({ user: mockWhitespaceUser });

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
    }, 15000);
  });

  describe('2. State Transition: PHONE_ENTRY -> OTP_ENTRY -> Direct Redirect (Existing User)', () => {
    it('bypasses PROFILE_COLLECTION when user already has non-empty displayName', async () => {
      const user = userEvent.setup();
      const mockExistingUser = {
        uid: 'usr-existing-888',
        phoneNumber: '+919876543210',
        displayName: 'Vikram Malhotra',
      };
      mockConfirmationResult.confirm.mockResolvedValue({ user: mockExistingUser });

      renderLogin({ from: '/book' });

      await user.type(screen.getByLabelText(/phone number/i), '9876543210');
      await user.click(screen.getByRole('button', { name: /send otp/i }));

      await waitFor(() => {
        expect(screen.getByLabelText(/6-digit verification code/i)).toBeInTheDocument();
      });

      await user.type(screen.getByLabelText(/6-digit verification code/i), '123456');
      await user.click(screen.getByRole('button', { name: /verify otp/i }));

      await waitFor(() => {
        expect(screen.queryByText('Complete Your Profile')).not.toBeInTheDocument();
        expect(screen.getByTestId('book-page')).toBeInTheDocument();
      });
      expect(updateProfile).not.toHaveBeenCalled();
    }, 15000);
  });

  describe('3. Back Navigation & Input State Persistence', () => {
    it('preserves phone input and resets OTP when navigating back via "Change Number"', async () => {
      const user = userEvent.setup();
      renderLogin();

      const phoneInput = screen.getByLabelText(/phone number/i) as HTMLInputElement;
      await user.type(phoneInput, '9876543210');
      await user.click(screen.getByRole('button', { name: /send otp/i }));

      await waitFor(() => {
        expect(screen.getByText('Verify Mobile OTP')).toBeInTheDocument();
      });

      // Type some OTP
      const otpInput = screen.getByLabelText(/6-digit verification code/i) as HTMLInputElement;
      await user.type(otpInput, '123');

      // Click "Change Number"
      const changeNumBtn = screen.getByRole('button', { name: /change number/i });
      await user.click(changeNumBtn);

      // Verify returned to PHONE_ENTRY and phone value is preserved
      expect(screen.getByText('Sign in with Phone')).toBeInTheDocument();
      const returnedPhoneInput = screen.getByLabelText(/phone number/i) as HTMLInputElement;
      expect(returnedPhoneInput.value).toBe('9876543210');

      // Edit phone number to a new number
      await user.clear(returnedPhoneInput);
      await user.type(returnedPhoneInput, '9123456789');
      await user.click(screen.getByRole('button', { name: /send otp/i }));

      // Verify OTP_ENTRY displays the updated phone number
      await waitFor(() => {
        expect(screen.getByText('Verify Mobile OTP')).toBeInTheDocument();
        expect(screen.getByText('+91 9123456789')).toBeInTheDocument();
      });

      expect(signInWithPhoneNumber).toHaveBeenCalledWith(
        expect.anything(),
        '+919123456789',
        expect.any(Object)
      );
    }, 15000);

    it('clears errors when navigating back via "Change Number"', async () => {
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

      await user.type(screen.getByLabelText(/6-digit verification code/i), '000000');
      await user.click(screen.getByRole('button', { name: /verify otp/i }));

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });

      // Click "Change Number"
      await user.click(screen.getByRole('button', { name: /change number/i }));

      // Alert should be cleared
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    }, 15000);
  });

  describe('4. Resend Countdown Timer & Resend OTP Action', () => {
    it('decrements resend countdown and enables Resend Code after countdown reaches 0', async () => {
      vi.useFakeTimers();

      renderLogin();

      const phoneInput = screen.getByLabelText(/phone number/i);
      fireEvent.change(phoneInput, { target: { value: '9876543210' } });
      fireEvent.click(screen.getByRole('button', { name: /send otp/i }));

      await act(async () => {
        await Promise.resolve();
      });

      expect(screen.getByText('Verify Mobile OTP')).toBeInTheDocument();
      const resendBtn = screen.getByRole('button', { name: /resend code in 30s/i });
      expect(resendBtn).toBeDisabled();

      // Step through 10 seconds
      for (let i = 0; i < 10; i++) {
        act(() => {
          vi.advanceTimersByTime(1000);
        });
      }
      expect(screen.getByRole('button', { name: /resend code in 20s/i })).toBeDisabled();

      // Step through remaining 20 seconds
      for (let i = 0; i < 20; i++) {
        act(() => {
          vi.advanceTimersByTime(1000);
        });
      }

      const enabledResendBtn = screen.getByRole('button', { name: /^resend code$/i });
      expect(enabledResendBtn).toBeEnabled();

      // Click Resend Code
      fireEvent.click(enabledResendBtn);

      await act(async () => {
        await Promise.resolve();
      });

      // Second signInWithPhoneNumber call made and timer reset to 30s
      expect(signInWithPhoneNumber).toHaveBeenCalledTimes(2);
      expect(screen.getByRole('button', { name: /resend code in 30s/i })).toBeDisabled();
    });

    it('clears OTP input field when Resend Code is clicked', async () => {
      vi.useFakeTimers();

      renderLogin();

      const phoneInput = screen.getByLabelText(/phone number/i);
      fireEvent.change(phoneInput, { target: { value: '9876543210' } });
      fireEvent.click(screen.getByRole('button', { name: /send otp/i }));

      await act(async () => {
        await Promise.resolve();
      });

      const otpInput = screen.getByLabelText(/6-digit verification code/i) as HTMLInputElement;
      fireEvent.change(otpInput, { target: { value: '123456' } });
      expect(otpInput.value).toBe('123456');

      // Step through all 30 seconds
      for (let i = 0; i < 30; i++) {
        act(() => {
          vi.advanceTimersByTime(1000);
        });
      }

      const resendBtn = screen.getByRole('button', { name: /^resend code$/i });
      fireEvent.click(resendBtn);

      await act(async () => {
        await Promise.resolve();
      });

      // OTP should be cleared
      expect(otpInput.value).toBe('');
    });
  });

  describe('5. Google OAuth Popup Flow', () => {
    it('triggers signInWithPopup with GoogleAuthProvider instance', async () => {
      const user = userEvent.setup();
      const mockGoogleUser = {
        uid: 'usr-google-42',
        displayName: 'Sundar Pichai',
        email: 'sundar@google.com',
      };
      vi.mocked(signInWithPopup).mockResolvedValue({ user: mockGoogleUser } as any);

      renderLogin({ from: '/book' });

      const googleBtn = screen.getByRole('button', { name: /continue with google/i });
      await user.click(googleBtn);

      await waitFor(() => {
        expect(signInWithPopup).toHaveBeenCalledTimes(1);
        expect(signInWithPopup).toHaveBeenCalledWith(
          expect.anything(),
          expect.any(Object)
        );
        expect(screen.getByTestId('book-page')).toBeInTheDocument();
      });
    }, 15000);

    it('handles popup-blocked error safely without leaking raw code', async () => {
      const user = userEvent.setup();
      vi.mocked(signInWithPopup).mockRejectedValue(
        new Error('Firebase: Error (auth/popup-blocked).')
      );

      renderLogin();

      await user.click(screen.getByRole('button', { name: /continue with google/i }));

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
        expect(
          screen.getByText('Sign-in popup was blocked by your browser. Please allow popups and try again.')
        ).toBeInTheDocument();
      });

      assertNoForbiddenTermsInDom();
    }, 15000);
  });

  describe('6. RecaptchaVerifier Lifecycle & Cleanup', () => {
    it('creates RecaptchaVerifier on demand and clears it on component unmount', async () => {
      const user = userEvent.setup();
      let clearSpy: any;

      vi.mocked(RecaptchaVerifier).mockImplementationOnce(function (this: any, _auth, container, options) {
        this.container = container;
        this.options = options;
        clearSpy = vi.fn();
        this.clear = clearSpy;
        this.render = vi.fn().mockResolvedValue(1);
      } as any);

      const { unmount } = renderLogin();

      await user.type(screen.getByLabelText(/phone number/i), '9876543210');
      await user.click(screen.getByRole('button', { name: /send otp/i }));

      await waitFor(() => {
        expect(RecaptchaVerifier).toHaveBeenCalledTimes(1);
      });

      unmount();

      expect(clearSpy).toHaveBeenCalled();
    }, 15000);

    it('reuses existing RecaptchaVerifier instance across multiple phone submissions without remount', async () => {
      const user = userEvent.setup();
      renderLogin();

      await user.type(screen.getByLabelText(/phone number/i), '9876543210');
      await user.click(screen.getByRole('button', { name: /send otp/i }));

      await waitFor(() => {
        expect(RecaptchaVerifier).toHaveBeenCalledTimes(1);
      });

      // Change number and send again
      await user.click(screen.getByRole('button', { name: /change number/i }));
      await user.click(screen.getByRole('button', { name: /send otp/i }));

      await waitFor(() => {
        // Should reuse the verifier instance, not recreate
        expect(RecaptchaVerifier).toHaveBeenCalledTimes(1);
      });
    }, 15000);

    it('clears RecaptchaVerifier on error so subsequent retry gets a fresh instance', async () => {
      const user = userEvent.setup();
      let verifierInstances: any[] = [];

      vi.mocked(RecaptchaVerifier).mockImplementation(function (this: any, _auth, container, options) {
        this.container = container;
        this.options = options;
        this.clear = vi.fn();
        verifierInstances.push(this);
      } as any);

      vi.mocked(signInWithPhoneNumber)
        .mockRejectedValueOnce(new Error('Firebase: Error (auth/invalid-app-credential).'))
        .mockResolvedValueOnce(mockConfirmationResult);

      renderLogin();

      await user.type(screen.getByLabelText(/phone number/i), '9876543210');
      await user.click(screen.getByRole('button', { name: /send otp/i }));

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });

      expect(verifierInstances[0].clear).toHaveBeenCalled();

      // Retry
      await user.click(screen.getByRole('button', { name: /send otp/i }));

      await waitFor(() => {
        expect(RecaptchaVerifier).toHaveBeenCalledTimes(2);
      });
    }, 15000);
  });

  describe('7. Verification Session Safeguard', () => {
    it('verifies valid OTP input through confirmationResult.confirm', async () => {
      const user = userEvent.setup();
      renderLogin();

      await user.type(screen.getByLabelText(/phone number/i), '9876543210');
      await user.click(screen.getByRole('button', { name: /send otp/i }));

      await waitFor(() => {
        expect(screen.getByText('Verify Mobile OTP')).toBeInTheDocument();
      });

      const otpInput = screen.getByLabelText(/6-digit verification code/i);
      await user.type(otpInput, '123456');

      await user.click(screen.getByRole('button', { name: /verify otp/i }));
      expect(mockConfirmationResult.confirm).toHaveBeenCalledWith('123456');
    }, 15000);
  });
});
