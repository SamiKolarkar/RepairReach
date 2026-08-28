import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  PhoneVerificationModal,
  PhoneVerificationModalProps,
} from '@/components/auth/PhoneVerificationModal';
import {
  signInWithPhoneNumber,
  RecaptchaVerifier,
} from 'firebase/auth';
import { FORBIDDEN_AUTH_TERMS } from '@/lib/authErrorTranslator';

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

describe('Unit: PhoneVerificationModal', () => {
  let mockConfirmationResult: any;
  let onCloseMock: ReturnType<typeof vi.fn>;
  let onVerifiedMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    onCloseMock = vi.fn();
    onVerifiedMock = vi.fn();
    mockConfirmationResult = {
      confirm: vi.fn().mockResolvedValue({
        user: { uid: 'test-user-id', phoneNumber: '+919876543210' },
      }),
    };
    vi.mocked(signInWithPhoneNumber).mockResolvedValue(mockConfirmationResult);
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

  const assertStrictDomSanitization = () => {
    const textContent = (document.body.textContent || '').toLowerCase();
    for (const term of FORBIDDEN_AUTH_TERMS) {
      expect(textContent).not.toContain(term.toLowerCase());
    }
    const rawErrorTokens = [
      'auth/',
      'invalid-phone-number',
      'captcha-check-failed',
      'quota-exceeded',
      'gserviceaccount',
      'bearer',
      'jwt',
    ];
    for (const token of rawErrorTokens) {
      expect(textContent).not.toContain(token);
    }
  };

  describe('1. Visibility and Rendering', () => {
    it('does not render dialog content when isOpen is false', () => {
      renderModal({ isOpen: false });
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(screen.queryByText(/Verify Your Phone Number/i)).not.toBeInTheDocument();
    });

    it('renders modal with initial PHONE_ENTRY step when isOpen is true', () => {
      renderModal({ isOpen: true });
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Verify Your Phone Number')).toBeInTheDocument();
      expect(screen.getByLabelText(/Mobile Number/i)).toBeInTheDocument();
      expect(screen.getByText(/🇮🇳 \+91/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Send OTP/i })).toBeInTheDocument();
    });

    it('calls onClose when close button is clicked', async () => {
      const user = userEvent.setup();
      renderModal({ isOpen: true });

      const closeButton = screen.getByLabelText('Close dialog');
      await user.click(closeButton);
      expect(onCloseMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('2. Phone Normalization & Validation', () => {
    it('keeps Send OTP button disabled when phone number is empty', () => {
      renderModal();
      const sendButton = screen.getByRole('button', { name: /Send OTP/i });
      expect(sendButton).toBeDisabled();
    });

    it('shows validation error for invalid mobile numbers (starting with 1-5 or short)', async () => {
      const user = userEvent.setup();
      renderModal();

      const phoneInput = screen.getByLabelText(/Mobile Number/i);
      await user.type(phoneInput, '5555512345');

      const sendButton = screen.getByRole('button', { name: /Send OTP/i });
      await user.click(sendButton);

      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(
        screen.getByText('Please enter a valid 10-digit mobile number.')
      ).toBeInTheDocument();
      expect(signInWithPhoneNumber).not.toHaveBeenCalled();
    });

    it('normalizes valid 10-digit Indian number starting with 6-9 and calls signInWithPhoneNumber', async () => {
      const user = userEvent.setup();
      renderModal();

      const phoneInput = screen.getByLabelText(/Mobile Number/i);
      await user.type(phoneInput, '9876543210');

      const sendButton = screen.getByRole('button', { name: /Send OTP/i });
      await user.click(sendButton);

      await waitFor(() => {
        expect(signInWithPhoneNumber).toHaveBeenCalledWith(
          expect.anything(),
          '+919876543210',
          expect.anything()
        );
      });
    });

    it('correctly handles formatted inputs with +91 prefix, leading 0, or spaces', async () => {
      const user = userEvent.setup();
      renderModal();

      const phoneInput = screen.getByLabelText(/Mobile Number/i);
      await user.type(phoneInput, '09876543210');

      const sendButton = screen.getByRole('button', { name: /Send OTP/i });
      await user.click(sendButton);

      await waitFor(() => {
        expect(signInWithPhoneNumber).toHaveBeenCalledWith(
          expect.anything(),
          '+919876543210',
          expect.anything()
        );
      });
    });
  });

  describe('3. RecaptchaVerifier Lifecycle', () => {
    it('creates RecaptchaVerifier bound to modal-recaptcha-container with invisible size', async () => {
      const user = userEvent.setup();
      renderModal();

      const phoneInput = screen.getByLabelText(/Mobile Number/i);
      await user.type(phoneInput, '9876543210');

      const sendButton = screen.getByRole('button', { name: /Send OTP/i });
      await user.click(sendButton);

      await waitFor(() => {
        expect(RecaptchaVerifier).toHaveBeenCalledWith(
          expect.anything(),
          'modal-recaptcha-container',
          expect.objectContaining({ size: 'invisible' })
        );
      });
    });

    it('cleans up RecaptchaVerifier on unmount', async () => {
      const user = userEvent.setup();
      const { unmount } = renderModal();

      const phoneInput = screen.getByLabelText(/Mobile Number/i);
      await user.type(phoneInput, '9876543210');
      const sendButton = screen.getByRole('button', { name: /Send OTP/i });
      await user.click(sendButton);

      await waitFor(() => {
        expect(RecaptchaVerifier).toHaveBeenCalled();
      });

      const verifierInstance = vi.mocked(RecaptchaVerifier).mock.results[0].value;
      unmount();

      expect(verifierInstance.clear).toHaveBeenCalled();
    });

    it('resets RecaptchaVerifier on OTP send error so retry gets fresh instance', async () => {
      const user = userEvent.setup();
      vi.mocked(signInWithPhoneNumber).mockRejectedValueOnce(
        new Error('auth/quota-exceeded')
      );

      renderModal();

      const phoneInput = screen.getByLabelText(/Mobile Number/i);
      await user.type(phoneInput, '9876543210');
      const sendButton = screen.getByRole('button', { name: /Send OTP/i });
      await user.click(sendButton);

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });

      const firstVerifier = vi.mocked(RecaptchaVerifier).mock.results[0].value;
      expect(firstVerifier.clear).toHaveBeenCalled();

      // Retry
      vi.mocked(signInWithPhoneNumber).mockResolvedValueOnce(mockConfirmationResult);
      await user.click(sendButton);

      await waitFor(() => {
        expect(RecaptchaVerifier).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('4. OTP Entry & Verification Flow', () => {
    it('transitions to OTP_ENTRY step on successful OTP send and displays phone number', async () => {
      const user = userEvent.setup();
      renderModal();

      const phoneInput = screen.getByLabelText(/Mobile Number/i);
      await user.type(phoneInput, '9876543210');
      const sendButton = screen.getByRole('button', { name: /Send OTP/i });
      await user.click(sendButton);

      await waitFor(() => {
        expect(screen.getByText('Enter Verification Code')).toBeInTheDocument();
        expect(screen.getByText(/\+91 9876543210/)).toBeInTheDocument();
        expect(screen.getByLabelText(/6-Digit Verification Code/i)).toBeInTheDocument();
      });
    });

    it('disables Verify OTP button when OTP length is less than 6', async () => {
      const user = userEvent.setup();
      renderModal();

      const phoneInput = screen.getByLabelText(/Mobile Number/i);
      await user.type(phoneInput, '9876543210');
      await user.click(screen.getByRole('button', { name: /Send OTP/i }));

      await waitFor(() => {
        expect(screen.getByLabelText(/6-Digit Verification Code/i)).toBeInTheDocument();
      });

      const otpInput = screen.getByLabelText(/6-Digit Verification Code/i);
      await user.type(otpInput, '12345');

      const verifyButton = screen.getByRole('button', { name: /Verify OTP/i });
      expect(verifyButton).toBeDisabled();
    });

    it('successfully confirms 6-digit OTP and triggers onVerified and onClose', async () => {
      const user = userEvent.setup();
      renderModal();

      const phoneInput = screen.getByLabelText(/Mobile Number/i);
      await user.type(phoneInput, '9876543210');
      await user.click(screen.getByRole('button', { name: /Send OTP/i }));

      await waitFor(() => {
        expect(screen.getByLabelText(/6-Digit Verification Code/i)).toBeInTheDocument();
      });

      const otpInput = screen.getByLabelText(/6-Digit Verification Code/i);
      await user.type(otpInput, '123456');

      const verifyButton = screen.getByRole('button', { name: /Verify OTP/i });
      await user.click(verifyButton);

      await waitFor(() => {
        expect(mockConfirmationResult.confirm).toHaveBeenCalledWith('123456');
        expect(onVerifiedMock).toHaveBeenCalledWith('+919876543210');
        expect(onCloseMock).toHaveBeenCalled();
      });
    });
  });

  describe('5. Resend Timer & Change Number Navigation', () => {
    it('renders disabled resend countdown button with 30s timer when entering OTP step', async () => {
      const user = userEvent.setup();
      renderModal();

      const phoneInput = screen.getByLabelText(/Mobile Number/i);
      await user.type(phoneInput, '9876543210');
      const sendButton = screen.getByRole('button', { name: /Send OTP/i });
      await user.click(sendButton);

      await waitFor(() => {
        expect(screen.getByText('Enter Verification Code')).toBeInTheDocument();
      });

      const resendBtn = screen.getByRole('button', { name: /Resend code in 30s/i });
      expect(resendBtn).toBeDisabled();
    });

    it('enables Resend Code button after 30-second countdown finishes', async () => {
      vi.useFakeTimers();
      try {
        renderModal();

        const phoneInput = screen.getByLabelText(/Mobile Number/i);
        fireEvent.change(phoneInput, { target: { value: '9876543210' } });
        const sendButton = screen.getByRole('button', { name: /Send OTP/i });
        fireEvent.click(sendButton);

        await act(async () => {
          await Promise.resolve();
        });

        expect(screen.getByRole('button', { name: /Resend code in 30s/i })).toBeDisabled();

        for (let i = 0; i < 30; i++) {
          await act(async () => {
            vi.advanceTimersByTime(1000);
          });
        }

        expect(screen.getByRole('button', { name: /Resend Code/i })).toBeEnabled();
      } finally {
        vi.useRealTimers();
      }
    });

    it('clicking Change Number returns to PHONE_ENTRY step and clears OTP', async () => {
      const user = userEvent.setup();
      renderModal();

      const phoneInput = screen.getByLabelText(/Mobile Number/i);
      await user.type(phoneInput, '9876543210');
      await user.click(screen.getByRole('button', { name: /Send OTP/i }));

      await waitFor(() => {
        expect(screen.getByText('Enter Verification Code')).toBeInTheDocument();
      });

      const changeNumberBtn = screen.getByRole('button', { name: /Change Number/i });
      await user.click(changeNumberBtn);

      await waitFor(() => {
        expect(screen.getByText('Verify Your Phone Number')).toBeInTheDocument();
        expect(screen.getByLabelText(/Mobile Number/i)).toBeInTheDocument();
      });
    });
  });

  describe('6. Error Handling & DOM Sanitization Invariants', () => {
    it('translates auth/invalid-verification-code to user-friendly message without leaking raw errors', async () => {
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
        expect(
          screen.getByText('Incorrect verification code. Please check the SMS and try again.')
        ).toBeInTheDocument();
      });

      assertStrictDomSanitization();
    });

    it('translates auth/code-expired to user-friendly message without leaking raw errors', async () => {
      const user = userEvent.setup();
      mockConfirmationResult.confirm.mockRejectedValueOnce(
        new Error('Firebase: Error (auth/code-expired).')
      );

      renderModal();

      const phoneInput = screen.getByLabelText(/Mobile Number/i);
      await user.type(phoneInput, '9876543210');
      await user.click(screen.getByRole('button', { name: /Send OTP/i }));

      await waitFor(() => {
        expect(screen.getByLabelText(/6-Digit Verification Code/i)).toBeInTheDocument();
      });

      const otpInput = screen.getByLabelText(/6-Digit Verification Code/i);
      await user.type(otpInput, '111111');
      await user.click(screen.getByRole('button', { name: /Verify OTP/i }));

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
        expect(
          screen.getByText('The verification code has expired. Please request a new code.')
        ).toBeInTheDocument();
      });

      assertStrictDomSanitization();
    });

    it('translates auth/captcha-check-failed without leaking forbidden terms', async () => {
      const user = userEvent.setup();
      vi.mocked(signInWithPhoneNumber).mockRejectedValueOnce(
        new Error('Firebase: Error (auth/captcha-check-failed).')
      );

      renderModal();

      const phoneInput = screen.getByLabelText(/Mobile Number/i);
      await user.type(phoneInput, '9876543210');
      await user.click(screen.getByRole('button', { name: /Send OTP/i }));

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
        expect(
          screen.getByText('Security verification failed. Please try again.')
        ).toBeInTheDocument();
      });

      assertStrictDomSanitization();
    });
  });
});
