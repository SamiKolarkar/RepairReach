import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
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
import { FORBIDDEN_AUTH_TERMS, AUTH_ERROR_MESSAGES, translateAuthError } from '@/lib/authErrorTranslator';

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

describe('Challenger 2 — Adversarial Stress Test: Profile Collection, OAuth & Security Invariants', () => {
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
          <Route path="/account" element={<div data-testid="account-page">Account Page</div>} />
        </Routes>
      </MemoryRouter>
    );
  };

  /**
   * Strict Forensic Invariant Validator:
   * Verifies that none of the 19 forbidden terms or raw error codes leak into user-visible text.
   */
  const assertAll19ForbiddenTermsAbsenceInVisibleDom = () => {
    const pageText = (document.body.textContent || '').toLowerCase();

    expect(FORBIDDEN_AUTH_TERMS.length).toBe(19);

    for (const term of FORBIDDEN_AUTH_TERMS) {
      const lower = term.toLowerCase();
      expect(pageText).not.toContain(lower);
    }

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
      'requires-recent-login',
      'user-not-found',
    ];

    for (const token of rawErrorTokens) {
      expect(pageText).not.toContain(token);
    }
  };

  /**
   * Helper to reach Step 3 (PROFILE_COLLECTION)
   */
  const reachProfileCollectionStep = async (userEventInstance: any, mockUserPayload: any = null) => {
    const mockUser = mockUserPayload || {
      uid: 'user-profile-test-uid',
      phoneNumber: '+919876543210',
      displayName: null,
    };
    mockConfirmationResult.confirm.mockResolvedValue({ user: mockUser });

    // Step 1: Send OTP
    const phoneInput = screen.getByLabelText(/phone number/i);
    await userEventInstance.type(phoneInput, '9876543210');
    await userEventInstance.click(screen.getByRole('button', { name: /send otp/i }));

    // Step 2: Verify OTP
    await waitFor(() => {
      expect(screen.getByLabelText(/6-digit verification code/i)).toBeInTheDocument();
    });
    const otpInput = screen.getByLabelText(/6-digit verification code/i);
    await userEventInstance.type(otpInput, '123456');
    await userEventInstance.click(screen.getByRole('button', { name: /verify otp/i }));

    // Step 3: Wait for PROFILE_COLLECTION form
    await waitFor(() => {
      expect(screen.getByText('Complete Your Profile')).toBeInTheDocument();
      expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    });

    return mockUser;
  };

  describe('1. Profile Collection — Full Name Edge Cases', () => {
    it('disables submit button when Full Name is empty', async () => {
      const user = userEvent.setup();
      renderLogin();

      await reachProfileCollectionStep(user);

      const completeBtn = screen.getByRole('button', { name: /complete profile/i });
      expect(completeBtn).toBeDisabled();
      expect(updateProfile).not.toHaveBeenCalled();

      assertAll19ForbiddenTermsAbsenceInVisibleDom();
    }, 15000);

    it('disables submit button when Full Name is 1 character', async () => {
      const user = userEvent.setup();
      renderLogin();

      await reachProfileCollectionStep(user);

      const nameInput = screen.getByLabelText(/full name/i);
      await user.type(nameInput, 'J');

      const completeBtn = screen.getByRole('button', { name: /complete profile/i });
      expect(completeBtn).toBeDisabled();
      expect(updateProfile).not.toHaveBeenCalled();

      assertAll19ForbiddenTermsAbsenceInVisibleDom();
    }, 15000);

    it('disables submit button when Full Name is whitespace-only', async () => {
      const user = userEvent.setup();
      renderLogin();

      await reachProfileCollectionStep(user);

      const nameInput = screen.getByLabelText(/full name/i);
      await user.type(nameInput, '     ');

      const completeBtn = screen.getByRole('button', { name: /complete profile/i });
      expect(completeBtn).toBeDisabled();
      expect(updateProfile).not.toHaveBeenCalled();

      assertAll19ForbiddenTermsAbsenceInVisibleDom();
    }, 15000);

    it('accepts multi-character emoji name and calls updateProfile with trimmed emoji name', async () => {
      const user = userEvent.setup();
      vi.mocked(updateProfile).mockResolvedValue(undefined);
      renderLogin();

      const mockUser = await reachProfileCollectionStep(user);

      const nameInput = screen.getByLabelText(/full name/i);
      await user.type(nameInput, '🚀 Kiran Dev');

      const completeBtn = screen.getByRole('button', { name: /complete profile/i });
      expect(completeBtn).not.toBeDisabled();
      await user.click(completeBtn);

      await waitFor(() => {
        expect(updateProfile).toHaveBeenCalledWith(mockUser, {
          displayName: '🚀 Kiran Dev',
        });
        expect(screen.getByTestId('home-page')).toBeInTheDocument();
      });

      assertAll19ForbiddenTermsAbsenceInVisibleDom();
    }, 15000);

    it('handles script tag payloads in Full Name safely without XSS execution or unescaped HTML', async () => {
      const user = userEvent.setup();
      vi.mocked(updateProfile).mockResolvedValue(undefined);
      const { container } = renderLogin();

      const mockUser = await reachProfileCollectionStep(user);

      const nameInput = screen.getByLabelText(/full name/i) as HTMLInputElement;
      const xssPayload = '<script>alert("XSS")</script>';
      await user.type(nameInput, xssPayload);

      expect(nameInput.value).toBe(xssPayload);

      const completeBtn = screen.getByRole('button', { name: /complete profile/i });
      expect(completeBtn).not.toBeDisabled();
      await user.click(completeBtn);

      await waitFor(() => {
        expect(updateProfile).toHaveBeenCalledWith(mockUser, {
          displayName: xssPayload,
        });
        expect(screen.getByTestId('home-page')).toBeInTheDocument();
      });

      // Assert script tag was never rendered as executable DOM node
      expect(container.querySelector('script')).toBeNull();
      assertAll19ForbiddenTermsAbsenceInVisibleDom();
    }, 15000);
  });

  describe('1. Profile Collection — Email Edge Cases', () => {
    const invalidEmailSamples = [
      'plainaddress',
      '#@%^%#$@#$@#.com',
      '@missingusername.com',
      'missingdomain@.com',
      'username@domain',
      'username@domain.c',
      'username@domain..com',
      'user name@domain.com',
    ];

    it.each(invalidEmailSamples)(
      'rejects invalid email string "%s" with validation error and halts updateProfile',
      async (invalidEmail) => {
        const user = userEvent.setup();
        renderLogin();

        await reachProfileCollectionStep(user);

        const nameInput = screen.getByLabelText(/full name/i);
        await user.type(nameInput, 'Pooja Hegde');

        const emailInput = screen.getByLabelText(/email address/i);
        await user.type(emailInput, invalidEmail);

        const completeBtn = screen.getByRole('button', { name: /complete profile/i });
        await user.click(completeBtn);

        expect(screen.getByRole('alert')).toBeInTheDocument();
        expect(screen.getByText('Please enter a valid email address.')).toBeInTheDocument();
        expect(updateProfile).not.toHaveBeenCalled();

        assertAll19ForbiddenTermsAbsenceInVisibleDom();
      },
      15000
    );

    it('succeeds when email input is empty (optional email field)', async () => {
      const user = userEvent.setup();
      vi.mocked(updateProfile).mockResolvedValue(undefined);
      renderLogin();

      const mockUser = await reachProfileCollectionStep(user);

      const nameInput = screen.getByLabelText(/full name/i);
      await user.type(nameInput, 'Vikram Vedha');

      const completeBtn = screen.getByRole('button', { name: /complete profile/i });
      await user.click(completeBtn);

      await waitFor(() => {
        expect(updateProfile).toHaveBeenCalledWith(mockUser, {
          displayName: 'Vikram Vedha',
        });
        expect(screen.getByTestId('home-page')).toBeInTheDocument();
      });

      assertAll19ForbiddenTermsAbsenceInVisibleDom();
    }, 15000);

    it('succeeds when email input contains only whitespace (treated as omitted email)', async () => {
      const user = userEvent.setup();
      vi.mocked(updateProfile).mockResolvedValue(undefined);
      renderLogin();

      const mockUser = await reachProfileCollectionStep(user);

      const nameInput = screen.getByLabelText(/full name/i);
      await user.type(nameInput, 'Ananya Panday');

      const emailInput = screen.getByLabelText(/email address/i);
      await user.type(emailInput, '     ');

      const completeBtn = screen.getByRole('button', { name: /complete profile/i });
      await user.click(completeBtn);

      await waitFor(() => {
        expect(updateProfile).toHaveBeenCalledWith(mockUser, {
          displayName: 'Ananya Panday',
        });
        expect(screen.getByTestId('home-page')).toBeInTheDocument();
      });

      assertAll19ForbiddenTermsAbsenceInVisibleDom();
    }, 15000);
  });

  describe('1. Profile Collection — updateProfile Failures', () => {
    it('handles network error during updateProfile and displays translated network error', async () => {
      const user = userEvent.setup();
      vi.mocked(updateProfile).mockRejectedValue(
        new Error('Firebase: Error (auth/network-request-failed).')
      );
      renderLogin();

      await reachProfileCollectionStep(user);

      const nameInput = screen.getByLabelText(/full name/i);
      await user.type(nameInput, 'Ramesh Gupta');

      const completeBtn = screen.getByRole('button', { name: /complete profile/i });
      await user.click(completeBtn);

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
        expect(screen.getByText(AUTH_ERROR_MESSAGES.NETWORK_ERROR)).toBeInTheDocument();
      });

      // Form remains editable and loading spinner is cleared
      expect(screen.getByRole('button', { name: /complete profile/i })).not.toBeDisabled();
      assertAll19ForbiddenTermsAbsenceInVisibleDom();
    }, 15000);

    it('handles user session revoked or requires-recent-login during updateProfile', async () => {
      const user = userEvent.setup();
      vi.mocked(updateProfile).mockRejectedValue(
        new Error('Firebase: Error (auth/requires-recent-login).')
      );
      renderLogin();

      await reachProfileCollectionStep(user);

      const nameInput = screen.getByLabelText(/full name/i);
      await user.type(nameInput, 'Siddharth Roy');

      const completeBtn = screen.getByRole('button', { name: /complete profile/i });
      await user.click(completeBtn);

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
        expect(screen.getByText(AUTH_ERROR_MESSAGES.REQUIRES_RECENT_LOGIN)).toBeInTheDocument();
      });

      assertAll19ForbiddenTermsAbsenceInVisibleDom();
    }, 15000);

    it('handles unauthenticated user when updateProfile throws user-not-found', async () => {
      const user = userEvent.setup();
      vi.mocked(updateProfile).mockRejectedValue(
        new Error('Firebase: Error (auth/user-not-found).')
      );
      renderLogin();

      await reachProfileCollectionStep(user);

      const nameInput = screen.getByLabelText(/full name/i);
      await user.type(nameInput, 'Deepak Hooda');

      const completeBtn = screen.getByRole('button', { name: /complete profile/i });
      await user.click(completeBtn);

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
        expect(screen.getByText(AUTH_ERROR_MESSAGES.USER_NOT_FOUND)).toBeInTheDocument();
      });

      assertAll19ForbiddenTermsAbsenceInVisibleDom();
    }, 15000);
  });

  describe('2. Google OAuth & Popup Behavior', () => {
    it('handles auth/popup-closed-by-user gracefully without crashing or leaking', async () => {
      const user = userEvent.setup();
      vi.mocked(signInWithPopup).mockRejectedValue(
        new Error('Firebase: Error (auth/popup-closed-by-user).')
      );
      renderLogin();

      const googleBtn = screen.getByRole('button', { name: /continue with google/i });
      await user.click(googleBtn);

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
        expect(screen.getByText(AUTH_ERROR_MESSAGES.POPUP_CLOSED_BY_USER)).toBeInTheDocument();
      });

      // UI returns to interactive state
      expect(googleBtn).not.toBeDisabled();
      assertAll19ForbiddenTermsAbsenceInVisibleDom();
    }, 15000);

    it('handles auth/popup-blocked gracefully with actionable user advice', async () => {
      const user = userEvent.setup();
      vi.mocked(signInWithPopup).mockRejectedValue(
        new Error('Firebase: Error (auth/popup-blocked).')
      );
      renderLogin();

      const googleBtn = screen.getByRole('button', { name: /continue with google/i });
      await user.click(googleBtn);

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
        expect(screen.getByText(AUTH_ERROR_MESSAGES.POPUP_BLOCKED)).toBeInTheDocument();
      });

      expect(googleBtn).not.toBeDisabled();
      assertAll19ForbiddenTermsAbsenceInVisibleDom();
    }, 15000);

    it('handles network failure during Google OAuth popup sign-in', async () => {
      const user = userEvent.setup();
      vi.mocked(signInWithPopup).mockRejectedValue(
        new TypeError('Failed to fetch from googleapis auth endpoint')
      );
      renderLogin();

      const googleBtn = screen.getByRole('button', { name: /continue with google/i });
      await user.click(googleBtn);

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
        expect(screen.getByText(AUTH_ERROR_MESSAGES.NETWORK_ERROR)).toBeInTheDocument();
      });

      assertAll19ForbiddenTermsAbsenceInVisibleDom();
    }, 15000);

    it('bypasses profile collection for Google user and navigates directly to destination', async () => {
      const user = userEvent.setup();
      const mockGoogleUser = {
        uid: 'google-uid-100',
        displayName: 'Google Full Name',
        email: 'googleuser@gmail.com',
      };
      vi.mocked(signInWithPopup).mockResolvedValue({ user: mockGoogleUser } as any);

      renderLogin({ from: '/account' });

      const googleBtn = screen.getByRole('button', { name: /continue with google/i });
      await user.click(googleBtn);

      await waitFor(() => {
        expect(signInWithPopup).toHaveBeenCalledWith(expect.anything(), expect.any(Object));
        // Profile collection step is bypassed completely
        expect(screen.queryByText('Complete Your Profile')).not.toBeInTheDocument();
        expect(screen.getByTestId('account-page')).toBeInTheDocument();
      });
    }, 15000);
  });

  describe('3. Information Leakage Invariant — All 19 Forbidden Terms Across Error States', () => {
    const errorScenariosWithLeakPayloads = [
      {
        name: 'Phone OTP - auth/invalid-phone-number with trace',
        action: 'phone',
        error: new Error('Firebase: Error (auth/invalid-phone-number) at securetoken.googleapis.com'),
        expectedMessage: AUTH_ERROR_MESSAGES.INVALID_PHONE_NUMBER,
      },
      {
        name: 'Phone OTP - auth/captcha-check-failed with recaptcha token',
        action: 'phone',
        error: new Error('Firebase: Error (auth/captcha-check-failed) recaptcha verification'),
        expectedMessage: AUTH_ERROR_MESSAGES.CAPTCHA_CHECK_FAILED,
      },
      {
        name: 'Phone OTP - auth/quota-exceeded with quota error',
        action: 'phone',
        error: new Error('Firebase: Error (auth/quota-exceeded)'),
        expectedMessage: AUTH_ERROR_MESSAGES.QUOTA_EXCEEDED,
      },
      {
        name: 'OTP Verify - auth/invalid-verification-code with jwt bearer',
        action: 'otp',
        error: new Error('Firebase: Error (auth/invalid-verification-code) bearer token failed'),
        expectedMessage: AUTH_ERROR_MESSAGES.INVALID_VERIFICATION_CODE,
      },
      {
        name: 'OTP Verify - auth/code-expired with code expired error',
        action: 'otp',
        error: new Error('Firebase: Error (auth/code-expired)'),
        expectedMessage: AUTH_ERROR_MESSAGES.CODE_EXPIRED,
      },
      {
        name: 'Profile Update - auth/network-request-failed with connection error',
        action: 'profile',
        error: new Error('Firebase: Error (auth/network-request-failed) connect to database failed'),
        expectedMessage: AUTH_ERROR_MESSAGES.NETWORK_ERROR,
      },
      {
        name: 'Google OAuth - auth/account-exists-with-different-credential',
        action: 'google',
        error: new Error('Firebase: Error (auth/account-exists-with-different-credential)'),
        expectedMessage: AUTH_ERROR_MESSAGES.ACCOUNT_EXISTS_WITH_DIFFERENT_CREDENTIAL,
      },
      {
        name: 'Google OAuth - auth/invalid-credential',
        action: 'google',
        error: new Error('Firebase: Error (auth/invalid-credential)'),
        expectedMessage: AUTH_ERROR_MESSAGES.INVALID_CREDENTIALS,
      },
    ];

    it.each(errorScenariosWithLeakPayloads)(
      'verifies 0 forbidden terms leak for scenario: $name',
      async ({ action, error, expectedMessage }) => {
        const user = userEvent.setup();

        if (action === 'google') {
          vi.mocked(signInWithPopup).mockRejectedValue(error);
          renderLogin();
          await user.click(screen.getByRole('button', { name: /continue with google/i }));

          await waitFor(() => {
            expect(screen.getByRole('alert')).toBeInTheDocument();
            expect(screen.getByText(expectedMessage)).toBeInTheDocument();
          });

          assertAll19ForbiddenTermsAbsenceInVisibleDom();
        } else if (action === 'phone') {
          vi.mocked(signInWithPhoneNumber).mockRejectedValue(error);
          renderLogin();
          await user.type(screen.getByLabelText(/phone number/i), '9876543210');
          await user.click(screen.getByRole('button', { name: /send otp/i }));

          await waitFor(() => {
            expect(screen.getByRole('alert')).toBeInTheDocument();
            expect(screen.getByText(expectedMessage)).toBeInTheDocument();
          });

          assertAll19ForbiddenTermsAbsenceInVisibleDom();
        } else if (action === 'otp') {
          renderLogin();
          await user.type(screen.getByLabelText(/phone number/i), '9876543210');
          await user.click(screen.getByRole('button', { name: /send otp/i }));

          await waitFor(() => {
            expect(screen.getByLabelText(/6-digit verification code/i)).toBeInTheDocument();
          });

          mockConfirmationResult.confirm.mockRejectedValue(error);

          await user.type(screen.getByLabelText(/6-digit verification code/i), '123456');
          await user.click(screen.getByRole('button', { name: /verify otp/i }));

          await waitFor(() => {
            expect(screen.getByRole('alert')).toBeInTheDocument();
            expect(screen.getByText(expectedMessage)).toBeInTheDocument();
          });

          assertAll19ForbiddenTermsAbsenceInVisibleDom();
        } else if (action === 'profile') {
          vi.mocked(updateProfile).mockRejectedValue(error);
          renderLogin();

          await reachProfileCollectionStep(user);

          await user.type(screen.getByLabelText(/full name/i), 'Test Invariant');
          await user.click(screen.getByRole('button', { name: /complete profile/i }));

          await waitFor(() => {
            expect(screen.getByRole('alert')).toBeInTheDocument();
            expect(screen.getByText(expectedMessage)).toBeInTheDocument();
          });

          assertAll19ForbiddenTermsAbsenceInVisibleDom();
        }
      },
      15000
    );

    it('exhaustively asserts each of all 19 forbidden terms is sanitized across all input casings', () => {
      expect(FORBIDDEN_AUTH_TERMS.length).toBe(19);

      for (const term of FORBIDDEN_AUTH_TERMS) {
        const variants = [
          term.toLowerCase(),
          term.toUpperCase(),
          term.charAt(0).toUpperCase() + term.slice(1),
        ];

        for (const variant of variants) {
          const result = translateAuthError(new Error(`Fatal system error: ${variant} occurred`));
          expect(result.toLowerCase()).not.toContain(term.toLowerCase());
          expect(result.length).toBeGreaterThan(0);
        }
      }
    });
  });
});
