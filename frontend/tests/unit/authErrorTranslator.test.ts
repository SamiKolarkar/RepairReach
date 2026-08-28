import { describe, it, expect } from 'vitest';
import {
  translateAuthError,
  AUTH_ERROR_MESSAGES,
  FORBIDDEN_AUTH_TERMS,
} from '@/lib/authErrorTranslator';

describe('authErrorTranslator', () => {
  describe('Phone Number & OTP Errors', () => {
    it('translates code auth/invalid-phone-number', () => {
      expect(translateAuthError({ code: 'auth/invalid-phone-number' })).toBe(
        AUTH_ERROR_MESSAGES.INVALID_PHONE_NUMBER
      );
    });

    it('translates Firebase error message with auth/invalid-phone-number', () => {
      expect(
        translateAuthError(
          new Error('Firebase: Error (auth/invalid-phone-number).')
        )
      ).toBe(AUTH_ERROR_MESSAGES.INVALID_PHONE_NUMBER);
    });

    it('translates raw string auth/invalid-phone-number', () => {
      expect(translateAuthError('auth/invalid-phone-number')).toBe(
        AUTH_ERROR_MESSAGES.INVALID_PHONE_NUMBER
      );
    });

    it('translates code auth/missing-phone-number', () => {
      expect(translateAuthError({ code: 'auth/missing-phone-number' })).toBe(
        AUTH_ERROR_MESSAGES.MISSING_PHONE_NUMBER
      );
    });

    it('translates code auth/invalid-verification-code', () => {
      expect(translateAuthError({ code: 'auth/invalid-verification-code' })).toBe(
        AUTH_ERROR_MESSAGES.INVALID_VERIFICATION_CODE
      );
    });

    it('translates Firebase message with invalid verification code', () => {
      expect(
        translateAuthError(
          new Error('Firebase: Error (auth/invalid-verification-code).')
        )
      ).toBe(AUTH_ERROR_MESSAGES.INVALID_VERIFICATION_CODE);
    });

    it('translates code auth/code-expired', () => {
      expect(translateAuthError({ code: 'auth/code-expired' })).toBe(
        AUTH_ERROR_MESSAGES.CODE_EXPIRED
      );
    });

    it('translates legacy otp_expired code', () => {
      expect(translateAuthError({ code: 'otp_expired' })).toBe(
        AUTH_ERROR_MESSAGES.CODE_EXPIRED
      );
    });

    it('translates code auth/missing-verification-code', () => {
      expect(translateAuthError({ code: 'auth/missing-verification-code' })).toBe(
        AUTH_ERROR_MESSAGES.MISSING_VERIFICATION_CODE
      );
    });

    it('translates code auth/session-expired', () => {
      expect(translateAuthError({ code: 'auth/session-expired' })).toBe(
        AUTH_ERROR_MESSAGES.SESSION_EXPIRED
      );
    });

    it('translates code auth/invalid-verification-id', () => {
      expect(translateAuthError({ code: 'auth/invalid-verification-id' })).toBe(
        AUTH_ERROR_MESSAGES.SESSION_EXPIRED
      );
    });

    it('translates code auth/captcha-check-failed', () => {
      expect(translateAuthError({ code: 'auth/captcha-check-failed' })).toBe(
        AUTH_ERROR_MESSAGES.CAPTCHA_CHECK_FAILED
      );
    });

    it('translates code auth/invalid-app-credential', () => {
      expect(translateAuthError({ code: 'auth/invalid-app-credential' })).toBe(
        AUTH_ERROR_MESSAGES.CAPTCHA_CHECK_FAILED
      );
    });

    it('translates code auth/app-not-authorized', () => {
      expect(translateAuthError({ code: 'auth/app-not-authorized' })).toBe(
        AUTH_ERROR_MESSAGES.CAPTCHA_CHECK_FAILED
      );
    });

    it('translates code auth/app-not-verified', () => {
      expect(translateAuthError({ code: 'auth/app-not-verified' })).toBe(
        AUTH_ERROR_MESSAGES.CAPTCHA_CHECK_FAILED
      );
    });
  });

  describe('Rate Limiting & Quota', () => {
    it('translates code auth/quota-exceeded', () => {
      expect(translateAuthError({ code: 'auth/quota-exceeded' })).toBe(
        AUTH_ERROR_MESSAGES.QUOTA_EXCEEDED
      );
    });

    it('translates Firebase message with quota-exceeded', () => {
      expect(
        translateAuthError('Firebase: Error (auth/quota-exceeded).')
      ).toBe(AUTH_ERROR_MESSAGES.QUOTA_EXCEEDED);
    });

    it('translates code auth/too-many-requests', () => {
      expect(translateAuthError({ code: 'auth/too-many-requests' })).toBe(
        AUTH_ERROR_MESSAGES.RATE_LIMIT
      );
    });

    it('translates code over_email_send_rate_limit', () => {
      expect(translateAuthError({ code: 'over_email_send_rate_limit' })).toBe(
        AUTH_ERROR_MESSAGES.RATE_LIMIT
      );
    });

    it('translates code over_sms_send_rate_limit', () => {
      expect(translateAuthError({ code: 'over_sms_send_rate_limit' })).toBe(
        AUTH_ERROR_MESSAGES.RATE_LIMIT
      );
    });

    it('translates status 429', () => {
      expect(translateAuthError({ status: 429, message: 'Too many requests' })).toBe(
        AUTH_ERROR_MESSAGES.RATE_LIMIT
      );
    });

    it('translates number 429 directly', () => {
      expect(translateAuthError(429)).toBe(AUTH_ERROR_MESSAGES.RATE_LIMIT);
    });

    it('translates message containing for security purposes', () => {
      expect(
        translateAuthError({
          message: 'For security purposes, you can only request this once every 60 seconds',
        })
      ).toBe(AUTH_ERROR_MESSAGES.RATE_LIMIT);
    });
  });

  describe('Google OAuth & Popup Errors', () => {
    it('translates code auth/popup-closed-by-user', () => {
      expect(translateAuthError({ code: 'auth/popup-closed-by-user' })).toBe(
        AUTH_ERROR_MESSAGES.POPUP_CLOSED_BY_USER
      );
    });

    it('translates Firebase message with popup-closed-by-user', () => {
      expect(
        translateAuthError(new Error('Firebase: Error (auth/popup-closed-by-user).'))
      ).toBe(AUTH_ERROR_MESSAGES.POPUP_CLOSED_BY_USER);
    });

    it('translates code auth/popup-blocked', () => {
      expect(translateAuthError({ code: 'auth/popup-blocked' })).toBe(
        AUTH_ERROR_MESSAGES.POPUP_BLOCKED
      );
    });

    it('translates code auth/cancelled-popup-request', () => {
      expect(translateAuthError({ code: 'auth/cancelled-popup-request' })).toBe(
        AUTH_ERROR_MESSAGES.CANCELLED_POPUP_REQUEST
      );
    });

    it('translates code auth/account-exists-with-different-credential', () => {
      expect(
        translateAuthError({ code: 'auth/account-exists-with-different-credential' })
      ).toBe(AUTH_ERROR_MESSAGES.ACCOUNT_EXISTS_WITH_DIFFERENT_CREDENTIAL);
    });

    it('translates code auth/credential-already-in-use', () => {
      expect(translateAuthError({ code: 'auth/credential-already-in-use' })).toBe(
        AUTH_ERROR_MESSAGES.CREDENTIAL_ALREADY_IN_USE
      );
    });

    it('translates code auth/phone-number-already-exists', () => {
      expect(translateAuthError({ code: 'auth/phone-number-already-exists' })).toBe(
        AUTH_ERROR_MESSAGES.CREDENTIAL_ALREADY_IN_USE
      );
    });
  });

  describe('User & Provider Lifecycle States', () => {
    it('translates code auth/user-disabled', () => {
      expect(translateAuthError({ code: 'auth/user-disabled' })).toBe(
        AUTH_ERROR_MESSAGES.USER_DISABLED
      );
    });

    it('translates code auth/user-not-found', () => {
      expect(translateAuthError({ code: 'auth/user-not-found' })).toBe(
        AUTH_ERROR_MESSAGES.USER_NOT_FOUND
      );
    });

    it('translates code auth/operation-not-allowed', () => {
      expect(translateAuthError({ code: 'auth/operation-not-allowed' })).toBe(
        AUTH_ERROR_MESSAGES.OPERATION_NOT_ALLOWED
      );
    });

    it('translates code auth/unauthorized-domain', () => {
      expect(translateAuthError({ code: 'auth/unauthorized-domain' })).toBe(
        AUTH_ERROR_MESSAGES.UNAUTHORIZED_DOMAIN
      );
    });

    it('translates code auth/requires-recent-login', () => {
      expect(translateAuthError({ code: 'auth/requires-recent-login' })).toBe(
        AUTH_ERROR_MESSAGES.REQUIRES_RECENT_LOGIN
      );
    });

    it('translates code auth/web-storage-unsupported', () => {
      expect(translateAuthError({ code: 'auth/web-storage-unsupported' })).toBe(
        AUTH_ERROR_MESSAGES.STORAGE_UNSUPPORTED
      );
    });

    it('translates code auth/internal-error to fallback', () => {
      expect(translateAuthError({ code: 'auth/internal-error' })).toBe(
        AUTH_ERROR_MESSAGES.FALLBACK
      );
    });
  });

  describe('Invalid Credentials & Legacy Auth', () => {
    it('translates code invalid_credentials', () => {
      expect(translateAuthError({ code: 'invalid_credentials' })).toBe(
        AUTH_ERROR_MESSAGES.INVALID_CREDENTIALS
      );
    });

    it('translates code auth/wrong-password', () => {
      expect(translateAuthError({ code: 'auth/wrong-password' })).toBe(
        AUTH_ERROR_MESSAGES.INVALID_CREDENTIALS
      );
    });

    it('translates code auth/invalid-credential', () => {
      expect(translateAuthError({ code: 'auth/invalid-credential' })).toBe(
        AUTH_ERROR_MESSAGES.INVALID_CREDENTIALS
      );
    });

    it('translates message Invalid login credentials', () => {
      expect(translateAuthError({ message: 'Invalid login credentials' })).toBe(
        AUTH_ERROR_MESSAGES.INVALID_CREDENTIALS
      );
    });

    it('translates code auth/invalid-email', () => {
      expect(translateAuthError({ code: 'auth/invalid-email' })).toBe(
        AUTH_ERROR_MESSAGES.INVALID_CREDENTIALS
      );
    });

    it('translates code auth/email-already-in-use', () => {
      expect(translateAuthError({ code: 'auth/email-already-in-use' })).toBe(
        AUTH_ERROR_MESSAGES.USER_ALREADY_EXISTS
      );
    });

    it('translates code user_already_exists', () => {
      expect(translateAuthError({ code: 'user_already_exists' })).toBe(
        AUTH_ERROR_MESSAGES.USER_ALREADY_EXISTS
      );
    });

    it('translates code weak_password', () => {
      expect(translateAuthError({ code: 'weak_password' })).toBe(
        AUTH_ERROR_MESSAGES.WEAK_PASSWORD
      );
    });

    it('translates code auth/weak-password', () => {
      expect(translateAuthError({ code: 'auth/weak-password' })).toBe(
        AUTH_ERROR_MESSAGES.WEAK_PASSWORD
      );
    });

    it('translates code email_not_confirmed', () => {
      expect(translateAuthError({ code: 'email_not_confirmed' })).toBe(
        AUTH_ERROR_MESSAGES.EMAIL_NOT_CONFIRMED
      );
    });

    it('translates code signup_disabled', () => {
      expect(translateAuthError({ code: 'signup_disabled' })).toBe(
        AUTH_ERROR_MESSAGES.SIGNUP_DISABLED
      );
    });
  });

  describe('Delivery Failures & Network Errors', () => {
    it('translates empty object {}', () => {
      expect(translateAuthError({})).toBe(
        AUTH_ERROR_MESSAGES.SMTP_OR_DELIVERY_FAILURE
      );
    });

    it('translates string "{}"', () => {
      expect(translateAuthError('{}')).toBe(
        AUTH_ERROR_MESSAGES.SMTP_OR_DELIVERY_FAILURE
      );
    });

    it('translates error mentioning Brevo or SMTP', () => {
      const result = translateAuthError({
        message: 'Email delivery failed. Brevo API key error or custom SMTP issue.',
      });
      expect(result).toBe(AUTH_ERROR_MESSAGES.SMTP_OR_DELIVERY_FAILURE);
      expect(result).not.toContain('Brevo');
      expect(result).not.toContain('SMTP');
    });

    it('translates code auth/network-request-failed', () => {
      expect(translateAuthError({ code: 'auth/network-request-failed' })).toBe(
        AUTH_ERROR_MESSAGES.NETWORK_ERROR
      );
    });

    it('translates Firebase message with network-request-failed', () => {
      expect(
        translateAuthError(
          new Error('Firebase: A network AuthError (auth/network-request-failed) has occurred')
        )
      ).toBe(AUTH_ERROR_MESSAGES.NETWORK_ERROR);
    });

    it('translates TypeError: Failed to fetch', () => {
      expect(translateAuthError(new TypeError('Failed to fetch'))).toBe(
        AUTH_ERROR_MESSAGES.NETWORK_ERROR
      );
    });

    it('translates network connection refused error', () => {
      expect(
        translateAuthError({
          message: 'net::ERR_CONNECTION_REFUSED',
        })
      ).toBe(AUTH_ERROR_MESSAGES.NETWORK_ERROR);
    });
  });

  describe('Serialized JSON Strings', () => {
    it('parses JSON string with error code auth/invalid-phone-number', () => {
      expect(
        translateAuthError('{"code": "auth/invalid-phone-number", "message": "Invalid phone format"}')
      ).toBe(AUTH_ERROR_MESSAGES.INVALID_PHONE_NUMBER);
    });

    it('parses JSON string with auth/quota-exceeded', () => {
      expect(
        translateAuthError('{"code": "auth/quota-exceeded", "message": "SMS quota exceeded"}')
      ).toBe(AUTH_ERROR_MESSAGES.QUOTA_EXCEEDED);
    });
  });

  describe('Fallback for Unrecognized Errors', () => {
    it('returns fallback for null', () => {
      expect(translateAuthError(null)).toBe(AUTH_ERROR_MESSAGES.FALLBACK);
    });

    it('returns fallback for undefined', () => {
      expect(translateAuthError(undefined)).toBe(AUTH_ERROR_MESSAGES.FALLBACK);
    });

    it('returns fallback for empty string', () => {
      expect(translateAuthError('')).toBe(AUTH_ERROR_MESSAGES.FALLBACK);
    });

    it('returns fallback for whitespace string', () => {
      expect(translateAuthError('   ')).toBe(AUTH_ERROR_MESSAGES.FALLBACK);
    });

    it('returns fallback for arbitrary unexpected error objects', () => {
      expect(
        translateAuthError(new Error('PostgreSQL database syntax error in trigger'))
      ).toBe(AUTH_ERROR_MESSAGES.FALLBACK);
    });

    it('returns fallback for unknown object structures', () => {
      expect(translateAuthError({ weirdField: 42 })).toBe(
        AUTH_ERROR_MESSAGES.FALLBACK
      );
    });

    it('returns fallback for arbitrary number input (not 429)', () => {
      expect(translateAuthError(500)).toBe(AUTH_ERROR_MESSAGES.FALLBACK);
    });
  });

  describe('Forbidden Words Invariant & Sanitization', () => {
    it('guarantees no message in AUTH_ERROR_MESSAGES contains forbidden technical words', () => {
      const allSampleOutputs = Object.values(AUTH_ERROR_MESSAGES);
      for (const msg of allSampleOutputs) {
        const lower = msg.toLowerCase();
        for (const forbidden of FORBIDDEN_AUTH_TERMS) {
          expect(lower).not.toContain(forbidden.toLowerCase());
        }
      }
    });

    it('guarantees translated output for various error types never contains forbidden words', () => {
      const sampleInputs = [
        'Invalid login credentials',
        'User already registered',
        'Email rate limit exceeded',
        'Firebase: Error (auth/invalid-phone-number).',
        'Firebase: Error (auth/invalid-verification-code).',
        'Firebase: Error (auth/code-expired).',
        'Firebase: Error (auth/quota-exceeded).',
        'Firebase: Error (auth/captcha-check-failed).',
        'Firebase: Error (auth/popup-closed-by-user).',
        'Firebase: Error (auth/account-exists-with-different-credential).',
        'Firebase: Error (auth/internal-error).',
        'AuthApiError: something broke in supabase',
        'Supabase Custom SMTP connection failed',
        'Brevo API key invalid',
        'serviceaccount@gserviceaccount.com jwt verification error',
        'https://securetoken.google.com/test-project jwk error',
        { code: 'auth/invalid-phone-number', message: 'Firebase: Error (auth/invalid-phone-number).' },
        { code: 'auth/quota-exceeded', message: 'Firebase: Quota exceeded' },
        { code: 'auth/captcha-check-failed', message: 'Recaptcha verification failed' },
        { code: 'auth/internal-error', message: 'Internal error in gserviceaccount' },
        { code: 'over_email_send_rate_limit', message: 'Email rate limit exceeded' },
        { message: 'Brevo SMTP error' },
        new Error('Firebase: Error (auth/too-many-requests). Rate limit reached'),
        new Error('Supabase AuthApiError: rate limit exceeded'),
      ];

      for (const input of sampleInputs) {
        const translated = translateAuthError(input);
        const lower = translated.toLowerCase();
        for (const forbidden of FORBIDDEN_AUTH_TERMS) {
          expect(lower).not.toContain(forbidden.toLowerCase());
        }
      }
    });
  });
});
