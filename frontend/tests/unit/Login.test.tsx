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

describe('Login Component (Phone OTP & Google OAuth)', () => {
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

  const assertNoForbiddenTermsInDom = () => {
    const pageText = document.body.textContent || '';
    for (const term of FORBIDDEN_AUTH_TERMS) {
      expect(pageText.toLowerCase()).not.toContain(term.toLowerCase());
    }
  };

  describe('1. Initial Rendering (PHONE_ENTRY)', () => {
    it('renders phone input, country prefix badge, Send OTP button, and Google OAuth button', () => {
      renderLogin();

      expect(screen.getByText('Sign in with Phone')).toBeInTheDocument();
      expect(screen.getByLabelText(/phone number/i)).toBeInTheDocument();
      expect(screen.getByText('🇮🇳 +91')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /send otp/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /continue with google/i })).toBeInTheDocument();
    });

    it('contains the #recaptcha-container element in the DOM', () => {
      const { container } = renderLogin();
      const recaptchaDiv = container.querySelector('#recaptcha-container');
      expect(recaptchaDiv).toBeInTheDocument();
    });

    it('disables the Send OTP button when phone input is empty', () => {
      renderLogin();
      const sendOtpBtn = screen.getByRole('button', { name: /send otp/i });
      expect(sendOtpBtn).toBeDisabled();
    });
  });

  describe('2. Phone Number Validation & Normalization', () => {
    it('shows validation error when phone number has fewer than 10 digits', async () => {
      const user = userEvent.setup();
      renderLogin();

      const phoneInput = screen.getByLabelText(/phone number/i);
      await user.type(phoneInput, '98765');

      const sendOtpBtn = screen.getByRole('button', { name: /send otp/i });
      await user.click(sendOtpBtn);

      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText('Please enter a valid 10-digit mobile number.')).toBeInTheDocument();
      expect(signInWithPhoneNumber).not.toHaveBeenCalled();
    });

    it('shows validation error when 10-digit phone starts with invalid prefix (0-5)', async () => {
      const user = userEvent.setup();
      renderLogin();

      const phoneInput = screen.getByLabelText(/phone number/i);
      await user.type(phoneInput, '5123456789');

      const sendOtpBtn = screen.getByRole('button', { name: /send otp/i });
      await user.click(sendOtpBtn);

      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText('Please enter a valid 10-digit mobile number.')).toBeInTheDocument();
      expect(signInWithPhoneNumber).not.toHaveBeenCalled();
    });

    it('normalizes 12-digit numbers starting with 91 to 10 digits', async () => {
      const user = userEvent.setup();
      renderLogin();

      const phoneInput = screen.getByLabelText(/phone number/i);
      await user.type(phoneInput, '919876543210');

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

    it('normalizes 11-digit numbers starting with leading 0 to 10 digits', async () => {
      const user = userEvent.setup();
      renderLogin();

      const phoneInput = screen.getByLabelText(/phone number/i);
      await user.type(phoneInput, '09876543210');

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

    it('clears validation error when user modifies phone input', async () => {
      const user = userEvent.setup();
      renderLogin();

      const phoneInput = screen.getByLabelText(/phone number/i);
      await user.type(phoneInput, '12345');
      await user.click(screen.getByRole('button', { name: /send otp/i }));

      expect(screen.getByRole('alert')).toBeInTheDocument();

      await user.type(phoneInput, '6');
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
  });

  describe('3. Phone OTP Request & Step Transition (OTP_ENTRY)', () => {
    it('sends OTP with RecaptchaVerifier and transitions to OTP_ENTRY view', async () => {
      const user = userEvent.setup();
      renderLogin();

      const phoneInput = screen.getByLabelText(/phone number/i);
      await user.type(phoneInput, '9876543210');

      const sendOtpBtn = screen.getByRole('button', { name: /send otp/i });
      await user.click(sendOtpBtn);

      await waitFor(() => {
        expect(signInWithPhoneNumber).toHaveBeenCalledTimes(1);
        expect(signInWithPhoneNumber).toHaveBeenCalledWith(
          expect.anything(),
          '+919876543210',
          expect.any(Object)
        );
      });

      expect(screen.getByText('Verify Mobile OTP')).toBeInTheDocument();
      expect(screen.getByText('+91 9876543210')).toBeInTheDocument();
      expect(screen.getByLabelText(/6-digit verification code/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /verify otp/i })).toBeInTheDocument();
    });

    it('handles reCAPTCHA expired-callback gracefully', async () => {
      let expiredCb: (() => void) | undefined;
      vi.mocked(RecaptchaVerifier).mockImplementationOnce(function (this: any, _auth, container, options) {
        this.container = container;
        this.options = options;
        this.clear = vi.fn();
        expiredCb = options?.['expired-callback'];
      } as any);

      const user = userEvent.setup();
      renderLogin();

      const phoneInput = screen.getByLabelText(/phone number/i);
      await user.type(phoneInput, '9876543210');
      await user.click(screen.getByRole('button', { name: /send otp/i }));

      expect(expiredCb).toBeDefined();
      act(() => {
        if (expiredCb) expiredCb();
      });

      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText('Security verification expired. Please try again.')).toBeInTheDocument();
    });

    it('resets reCAPTCHA verifier on signInWithPhoneNumber failure so subsequent retry gets a fresh instance', async () => {
      const user = userEvent.setup();
      vi.mocked(signInWithPhoneNumber)
        .mockRejectedValueOnce(new Error('Firebase: Error (auth/captcha-check-failed).'))
        .mockResolvedValueOnce(mockConfirmationResult);

      renderLogin();

      const phoneInput = screen.getByLabelText(/phone number/i);
      await user.type(phoneInput, '9876543210');
      const sendOtpBtn = screen.getByRole('button', { name: /send otp/i });

      // First attempt fails
      await user.click(sendOtpBtn);
      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
        expect(screen.getByText('Security verification failed. Please try again.')).toBeInTheDocument();
      });

      // Second attempt creates fresh verifier and succeeds
      await user.click(sendOtpBtn);
      await waitFor(() => {
        expect(signInWithPhoneNumber).toHaveBeenCalledTimes(2);
        expect(screen.getByText('Verify Mobile OTP')).toBeInTheDocument();
      });
    });
  });

  describe('4. OTP Verification — Existing User vs New User', () => {
    it('verifies valid OTP and redirects existing user with displayName directly to home', async () => {
      const user = userEvent.setup();
      const mockUser = {
        uid: 'user-existing-1',
        phoneNumber: '+919876543210',
        displayName: 'Sarah Jenkins',
      };
      mockConfirmationResult.confirm.mockResolvedValue({ user: mockUser });

      renderLogin();

      // Step 1: Send OTP
      const phoneInput = screen.getByLabelText(/phone number/i);
      await user.type(phoneInput, '9876543210');
      await user.click(screen.getByRole('button', { name: /send otp/i }));

      // Step 2: Enter OTP
      await waitFor(() => {
        expect(screen.getByLabelText(/6-digit verification code/i)).toBeInTheDocument();
      });

      const otpInput = screen.getByLabelText(/6-digit verification code/i);
      await user.type(otpInput, '123456');

      const verifyBtn = screen.getByRole('button', { name: /verify otp/i });
      await user.click(verifyBtn);

      await waitFor(() => {
        expect(mockConfirmationResult.confirm).toHaveBeenCalledWith('123456');
        expect(screen.getByTestId('home-page')).toBeInTheDocument();
      });
    });

    it('rejects incomplete OTP with disabled submit button', async () => {
      const user = userEvent.setup();
      renderLogin();

      // Send OTP
      const phoneInput = screen.getByLabelText(/phone number/i);
      await user.type(phoneInput, '9876543210');
      await user.click(screen.getByRole('button', { name: /send otp/i }));

      await waitFor(() => {
        expect(screen.getByLabelText(/6-digit verification code/i)).toBeInTheDocument();
      });

      const otpInput = screen.getByLabelText(/6-digit verification code/i);
      await user.type(otpInput, '123');

      const verifyBtn = screen.getByRole('button', { name: /verify otp/i });
      expect(verifyBtn).toBeDisabled();
      expect(mockConfirmationResult.confirm).not.toHaveBeenCalled();
    });

    it('strips non-digits and truncates pasted OTP to 6 digits', async () => {
      const user = userEvent.setup();
      renderLogin();

      await user.type(screen.getByLabelText(/phone number/i), '9876543210');
      await user.click(screen.getByRole('button', { name: /send otp/i }));

      await waitFor(() => {
        expect(screen.getByLabelText(/6-digit verification code/i)).toBeInTheDocument();
      });

      const otpInput = screen.getByLabelText(/6-digit verification code/i) as HTMLInputElement;
      await user.type(otpInput, '12ab34cd5678');

      expect(otpInput.value).toBe('123456');
    });
  });

  describe('5. First-time User Profile Collection', () => {
    it('transitions to PROFILE_COLLECTION when authenticated user has no displayName', async () => {
      const user = userEvent.setup();
      const mockNewUser = {
        uid: 'user-new-2',
        phoneNumber: '+919876543210',
        displayName: null,
      };
      mockConfirmationResult.confirm.mockResolvedValue({ user: mockNewUser });

      renderLogin();

      // Send OTP
      const phoneInput = screen.getByLabelText(/phone number/i);
      await user.type(phoneInput, '9876543210');
      await user.click(screen.getByRole('button', { name: /send otp/i }));

      // Enter OTP
      await waitFor(() => {
        expect(screen.getByLabelText(/6-digit verification code/i)).toBeInTheDocument();
      });

      const otpInput = screen.getByLabelText(/6-digit verification code/i);
      await user.type(otpInput, '654321');
      await user.click(screen.getByRole('button', { name: /verify otp/i }));

      // Expect transition to PROFILE_COLLECTION
      await waitFor(() => {
        expect(screen.getByText('Complete Your Profile')).toBeInTheDocument();
        expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /complete profile/i })).toBeInTheDocument();
      });
    });

    it('validates Full Name and updates profile before redirecting', async () => {
      const user = userEvent.setup();
      const mockNewUser = {
        uid: 'user-new-3',
        phoneNumber: '+919876543210',
        displayName: '',
      };
      mockConfirmationResult.confirm.mockResolvedValue({ user: mockNewUser });
      vi.mocked(updateProfile).mockResolvedValue(undefined);

      renderLogin();

      // Complete OTP flow
      await user.type(screen.getByLabelText(/phone number/i), '9876543210');
      await user.click(screen.getByRole('button', { name: /send otp/i }));

      await waitFor(() => {
        expect(screen.getByLabelText(/6-digit verification code/i)).toBeInTheDocument();
      });
      await user.type(screen.getByLabelText(/6-digit verification code/i), '112233');
      await user.click(screen.getByRole('button', { name: /verify otp/i }));

      await waitFor(() => {
        expect(screen.getByText('Complete Your Profile')).toBeInTheDocument();
      });

      // Submit Profile Details
      const nameInput = screen.getByLabelText(/full name/i);
      const emailInput = screen.getByLabelText(/email address/i);

      await user.type(nameInput, 'Rajesh Sharma');
      await user.type(emailInput, 'rajesh@example.com');

      const completeBtn = screen.getByRole('button', { name: /complete profile/i });
      await user.click(completeBtn);

      await waitFor(() => {
        expect(updateProfile).toHaveBeenCalledWith(mockNewUser, {
          displayName: 'Rajesh Sharma',
        });
        expect(screen.getByTestId('home-page')).toBeInTheDocument();
      });
    });

    it('allows profile submission without optional email', async () => {
      const user = userEvent.setup();
      const mockNewUser = {
        uid: 'user-new-no-email',
        phoneNumber: '+919876543210',
        displayName: '',
      };
      mockConfirmationResult.confirm.mockResolvedValue({ user: mockNewUser });
      vi.mocked(updateProfile).mockResolvedValue(undefined);

      renderLogin();

      await user.type(screen.getByLabelText(/phone number/i), '9876543210');
      await user.click(screen.getByRole('button', { name: /send otp/i }));

      await waitFor(() => {
        expect(screen.getByLabelText(/6-digit verification code/i)).toBeInTheDocument();
      });
      await user.type(screen.getByLabelText(/6-digit verification code/i), '112233');
      await user.click(screen.getByRole('button', { name: /verify otp/i }));

      await waitFor(() => {
        expect(screen.getByText('Complete Your Profile')).toBeInTheDocument();
      });

      // Enter only Full Name
      await user.type(screen.getByLabelText(/full name/i), 'Kiran Patel');
      const completeBtn = screen.getByRole('button', { name: /complete profile/i });
      await user.click(completeBtn);

      await waitFor(() => {
        expect(updateProfile).toHaveBeenCalledWith(mockNewUser, {
          displayName: 'Kiran Patel',
        });
        expect(screen.getByTestId('home-page')).toBeInTheDocument();
      });
    });

    it('rejects invalid email in profile collection with validation error', async () => {
      const user = userEvent.setup();
      const mockNewUser = {
        uid: 'user-new-4',
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
      await user.type(screen.getByLabelText(/6-digit verification code/i), '112233');
      await user.click(screen.getByRole('button', { name: /verify otp/i }));

      await waitFor(() => {
        expect(screen.getByText('Complete Your Profile')).toBeInTheDocument();
      });

      await user.type(screen.getByLabelText(/full name/i), 'Rajesh Sharma');
      await user.type(screen.getByLabelText(/email address/i), 'invalid-email-format');

      await user.click(screen.getByRole('button', { name: /complete profile/i }));

      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText('Please enter a valid email address.')).toBeInTheDocument();
      expect(updateProfile).not.toHaveBeenCalled();
    });
  });

  describe('6. Google OAuth Sign-in Flow', () => {
    it('calls signInWithPopup with GoogleAuthProvider and navigates to destination on success', async () => {
      const user = userEvent.setup();
      const mockGoogleUser = {
        uid: 'google-user-1',
        displayName: 'Google User',
        email: 'google@gmail.com',
      };
      vi.mocked(signInWithPopup).mockResolvedValue({ user: mockGoogleUser } as any);

      renderLogin({ from: { pathname: '/book' } });

      const googleBtn = screen.getByRole('button', { name: /continue with google/i });
      await user.click(googleBtn);

      await waitFor(() => {
        expect(signInWithPopup).toHaveBeenCalledWith(expect.anything(), expect.any(Object));
        expect(screen.getByTestId('book-page')).toBeInTheDocument();
      });
    });

    it('handles Google OAuth popup-closed-by-user without breaking UI', async () => {
      const user = userEvent.setup();
      vi.mocked(signInWithPopup).mockRejectedValue(
        new Error('Firebase: Error (auth/popup-closed-by-user).')
      );

      renderLogin();

      await user.click(screen.getByRole('button', { name: /continue with google/i }));

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
        expect(
          screen.getByText('Sign-in popup was closed before completing. Please try again.')
        ).toBeInTheDocument();
      });

      assertNoForbiddenTermsInDom();
    });
  });

  describe('7. Error Handling & Sanitization Invariant', () => {
    it('sanitizes and translates auth/invalid-phone-number error without raw code leak', async () => {
      const user = userEvent.setup();
      vi.mocked(signInWithPhoneNumber).mockRejectedValue(
        new Error('Firebase: Error (auth/invalid-phone-number).')
      );

      renderLogin();

      await user.type(screen.getByLabelText(/phone number/i), '9876543210');
      await user.click(screen.getByRole('button', { name: /send otp/i }));

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
        expect(
          screen.getByText('Please enter a valid 10-digit mobile number.')
        ).toBeInTheDocument();
      });

      assertNoForbiddenTermsInDom();
    });

    it('sanitizes and translates auth/invalid-verification-code error', async () => {
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

      await user.type(screen.getByLabelText(/6-digit verification code/i), '999999');
      await user.click(screen.getByRole('button', { name: /verify otp/i }));

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
        expect(
          screen.getByText(
            'Incorrect verification code. Please check the SMS and try again.'
          )
        ).toBeInTheDocument();
      });

      assertNoForbiddenTermsInDom();
    });

    it('sanitizes and translates auth/code-expired error', async () => {
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
          screen.getByText('The verification code has expired. Please request a new code.')
        ).toBeInTheDocument();
      });

      assertNoForbiddenTermsInDom();
    });

    it('sanitizes and translates auth/quota-exceeded error', async () => {
      const user = userEvent.setup();
      vi.mocked(signInWithPhoneNumber).mockRejectedValue(
        new Error('Firebase: Error (auth/quota-exceeded).')
      );

      renderLogin();

      await user.type(screen.getByLabelText(/phone number/i), '9876543210');
      await user.click(screen.getByRole('button', { name: /send otp/i }));

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
        expect(
          screen.getByText('SMS service limit reached. Please try again later or contact support.')
        ).toBeInTheDocument();
      });

      assertNoForbiddenTermsInDom();
    });

    it('sanitizes and translates auth/too-many-requests error', async () => {
      const user = userEvent.setup();
      vi.mocked(signInWithPhoneNumber).mockRejectedValue(
        new Error('Firebase: Error (auth/too-many-requests).')
      );

      renderLogin();

      await user.type(screen.getByLabelText(/phone number/i), '9876543210');
      await user.click(screen.getByRole('button', { name: /send otp/i }));

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
        expect(
          screen.getByText('Too many requests. Please wait a few moments and try again.')
        ).toBeInTheDocument();
      });

      assertNoForbiddenTermsInDom();
    });
  });

  describe('8. Navigation, Resend Timer & State Reset Actions', () => {
    it('allows user to click "Change Number" from OTP_ENTRY to return to PHONE_ENTRY', async () => {
      const user = userEvent.setup();
      renderLogin();

      await user.type(screen.getByLabelText(/phone number/i), '9876543210');
      await user.click(screen.getByRole('button', { name: /send otp/i }));

      await waitFor(() => {
        expect(screen.getByText('Verify Mobile OTP')).toBeInTheDocument();
      });

      const changeNumBtn = screen.getByRole('button', { name: /change number/i });
      await user.click(changeNumBtn);

      expect(screen.getByText('Sign in with Phone')).toBeInTheDocument();
      expect(screen.getByLabelText(/phone number/i)).toBeInTheDocument();
    });

    it('renders disabled resend countdown button when transitioning to OTP_ENTRY', async () => {
      const user = userEvent.setup();
      renderLogin();

      await user.type(screen.getByLabelText(/phone number/i), '9876543210');
      await user.click(screen.getByRole('button', { name: /send otp/i }));

      await waitFor(() => {
        expect(screen.getByText('Verify Mobile OTP')).toBeInTheDocument();
      });

      const resendBtn = screen.getByRole('button', { name: /resend code in 30s/i });
      expect(resendBtn).toBeDisabled();
    });

    it('redirects to location.state.from on successful verification when provided as object with search', async () => {
      const user = userEvent.setup();
      const mockUser = {
        uid: 'user-book-search-1',
        phoneNumber: '+919876543210',
        displayName: 'Alice Johnson',
      };
      mockConfirmationResult.confirm.mockResolvedValue({ user: mockUser });

      renderLogin({ from: { pathname: '/book', search: '?serviceId=refrigerator' } });

      await user.type(screen.getByLabelText(/phone number/i), '9876543210');
      await user.click(screen.getByRole('button', { name: /send otp/i }));

      await waitFor(() => {
        expect(screen.getByLabelText(/6-digit verification code/i)).toBeInTheDocument();
      });

      await user.type(screen.getByLabelText(/6-digit verification code/i), '123456');
      await user.click(screen.getByRole('button', { name: /verify otp/i }));

      await waitFor(() => {
        expect(screen.getByTestId('book-page')).toBeInTheDocument();
      });
    });

    it('redirects to location.state.from on successful verification when provided as string', async () => {
      const user = userEvent.setup();
      const mockUser = {
        uid: 'user-book-str-1',
        phoneNumber: '+919876543210',
        displayName: 'Alice Johnson',
      };
      mockConfirmationResult.confirm.mockResolvedValue({ user: mockUser });

      renderLogin({ from: '/book' });

      await user.type(screen.getByLabelText(/phone number/i), '9876543210');
      await user.click(screen.getByRole('button', { name: /send otp/i }));

      await waitFor(() => {
        expect(screen.getByLabelText(/6-digit verification code/i)).toBeInTheDocument();
      });

      await user.type(screen.getByLabelText(/6-digit verification code/i), '123456');
      await user.click(screen.getByRole('button', { name: /verify otp/i }));

      await waitFor(() => {
        expect(screen.getByTestId('book-page')).toBeInTheDocument();
      });
    });
  });
});
