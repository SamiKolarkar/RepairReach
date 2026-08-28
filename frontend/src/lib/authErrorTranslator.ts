/**
 * Safe user-facing error translator for Firebase authentication errors.
 * Ensures internal system details, third-party provider names,
 * credentials, and raw technical error codes are never exposed to users.
 */

export const AUTH_ERROR_MESSAGES = {
  // Phone OTP & Verification
  INVALID_PHONE_NUMBER: 'Please enter a valid 10-digit mobile number.',
  MISSING_PHONE_NUMBER: 'Please enter your mobile phone number.',
  INVALID_VERIFICATION_CODE: 'Incorrect verification code. Please check the SMS and try again.',
  CODE_EXPIRED: 'The verification code has expired. Please request a new code.',
  MISSING_VERIFICATION_CODE: 'Please enter the verification code sent to your phone.',
  CAPTCHA_CHECK_FAILED: 'Security verification failed. Please try again.',
  SESSION_EXPIRED: 'The verification session has expired. Please request a new code.',

  // Rate Limits & Quotas
  RATE_LIMIT: 'Too many requests. Please wait a few moments and try again.',
  QUOTA_EXCEEDED: 'SMS service limit reached. Please try again later or contact support.',

  // Google OAuth & Popups
  POPUP_CLOSED_BY_USER: 'Sign-in popup was closed before completing. Please try again.',
  POPUP_BLOCKED: 'Sign-in popup was blocked by your browser. Please allow popups and try again.',
  CANCELLED_POPUP_REQUEST: 'Sign-in process was cancelled. Please try again.',
  ACCOUNT_EXISTS_WITH_DIFFERENT_CREDENTIAL: 'An account already exists with this email using a different sign-in method.',
  CREDENTIAL_ALREADY_IN_USE: 'This phone number or credential is already linked to another account.',

  // Account & Provider States
  USER_DISABLED: 'This account has been disabled. Please contact support.',
  USER_NOT_FOUND: 'Account not found. Please sign up or try another sign-in method.',
  OPERATION_NOT_ALLOWED: 'This sign-in method is currently disabled. Please contact support.',
  UNAUTHORIZED_DOMAIN: 'This domain is not authorized for authentication. Please contact support.',
  REQUIRES_RECENT_LOGIN: 'Please sign in again to complete this action.',

  // Network & System
  NETWORK_ERROR: 'Unable to connect to the server. Please check your internet connection and try again.',
  STORAGE_UNSUPPORTED: 'Browser storage is disabled or unsupported. Please enable cookies and try again.',

  // Legacy / Email-Password & Fallbacks
  INVALID_CREDENTIALS: 'Incorrect email or password. Please try again.',
  USER_ALREADY_EXISTS: 'An account with this email already exists.',
  EMAIL_NOT_CONFIRMED: 'Please confirm your email address before signing in.',
  WEAK_PASSWORD: 'Password should be at least 6 characters.',
  SIGNUP_DISABLED: 'Sign up is currently unavailable. Please try again later.',
  OTP_EXPIRED: 'The verification code or link has expired. Please request a new one.',
  SMTP_OR_DELIVERY_FAILURE: 'Unable to send verification message. Please try again later or contact support.',
  FALLBACK: 'Something went wrong. Please try again.',
} as const;

/**
 * List of prohibited internal keywords that must never appear in user-facing auth strings.
 */
export const FORBIDDEN_AUTH_TERMS = [
  'firebase',
  'recaptcha',
  'auth/',
  'internal-error',
  'gserviceaccount',
  'supabase',
  'authapierror',
  'rate limit',
  'user already registered',
  'invalid login credentials',
  'brevo',
  'smtp',
  'googleapis',
  'securetoken',
  'jwk',
  'jwt',
  'bearer',
  'postgres',
  'psql',
] as const;

/**
 * Translates any unknown error from Firebase auth into a friendly, sanitized user message.
 *
 * @param error - The raw error caught from Firebase or network operations
 * @returns A safe, human-readable string suitable for display in the UI
 */
export function translateAuthError(error: unknown): string {
  if (error === null || error === undefined) {
    return AUTH_ERROR_MESSAGES.FALLBACK;
  }

  let code = '';
  let message = '';
  let status: number | undefined;
  let name = '';

  // 1. Handle string inputs
  if (typeof error === 'string') {
    const trimmed = error.trim();
    if (!trimmed) {
      return AUTH_ERROR_MESSAGES.FALLBACK;
    }
    if (trimmed === '{}') {
      return AUTH_ERROR_MESSAGES.SMTP_OR_DELIVERY_FAILURE;
    }

    // Check if the string is serialized JSON
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (parsed && typeof parsed === 'object') {
          code = String(parsed.code || parsed.errorCode || parsed.error || '').toLowerCase();
          message = String(parsed.message || parsed.error_description || parsed.msg || parsed.detail || '');
          status = typeof parsed.status === 'number' ? parsed.status : undefined;
          name = String(parsed.name || '');
        }
      } catch {
        message = trimmed;
      }
    } else {
      message = trimmed;
      code = trimmed.toLowerCase();
    }
  } else if (error instanceof Error) {
    // 2. Handle Error instances (FirebaseError, Error, TypeError, etc.)
    name = error.name || '';
    message = error.message || '';
    const errObj = error as unknown as Record<string, unknown>;
    if (typeof errObj.code === 'string') code = errObj.code.toLowerCase();
    if (typeof errObj.status === 'number') status = errObj.status;
    else if (typeof errObj.statusCode === 'number') status = errObj.statusCode;
  } else if (typeof error === 'object') {
    // 3. Handle plain object inputs
    const errObj = error as Record<string, unknown>;

    // Empty object `{}` is commonly returned on delivery failures
    if (Object.keys(errObj).length === 0) {
      return AUTH_ERROR_MESSAGES.SMTP_OR_DELIVERY_FAILURE;
    }

    if (typeof errObj.code === 'string') code = errObj.code.toLowerCase();
    else if (typeof errObj.error === 'string') code = errObj.error.toLowerCase();
    else if (typeof errObj.errorCode === 'string') code = errObj.errorCode.toLowerCase();

    if (typeof errObj.message === 'string') message = errObj.message;
    else if (typeof errObj.error_description === 'string') message = errObj.error_description;
    else if (typeof errObj.msg === 'string') message = errObj.msg;
    else if (typeof errObj.detail === 'string') message = errObj.detail;

    if (typeof errObj.status === 'number') status = errObj.status;
    else if (typeof errObj.statusCode === 'number') status = errObj.statusCode;

    if (typeof errObj.name === 'string') name = errObj.name;
  } else if (typeof error === 'number') {
    if (error === 429) {
      return AUTH_ERROR_MESSAGES.RATE_LIMIT;
    }
    return AUTH_ERROR_MESSAGES.FALLBACK;
  }

  // Extract firebase auth/ code from code or message if present
  // e.g. "Firebase: Error (auth/invalid-phone-number)." -> "auth/invalid-phone-number"
  const authCodeMatch = (code + ' ' + message).match(/auth\/[a-z0-9-]+/i);
  const extractedAuthCode = authCodeMatch ? authCodeMatch[0].toLowerCase() : '';

  const normalizedMessage = message.trim().toLowerCase();
  const normalizedCode = code.trim().toLowerCase();

  const hasInMsg = (...terms: string[]) =>
    terms.some((term) => normalizedMessage.includes(term.toLowerCase()));

  const hasInCode = (...codes: string[]) =>
    codes.some((c) => {
      const cLower = c.toLowerCase();
      if (normalizedCode === cLower) return true;
      if (extractedAuthCode === cLower) return true;
      if (cLower.startsWith('auth/') && normalizedCode.includes(cLower)) return true;
      return false;
    });

  let result: string = AUTH_ERROR_MESSAGES.FALLBACK;

  // 1. Delivery / SMTP Failures
  if (
    message === '{}' ||
    normalizedMessage === '{}' ||
    hasInMsg(
      'smtp',
      'brevo',
      'custom smtp',
      'email delivery failed',
      'error sending confirmation email',
      'error sending email',
      'failed to send email',
      'unable to send email',
      'api key'
    ) ||
    hasInCode('smtp', 'brevo', 'email_provider_disabled')
  ) {
    result = AUTH_ERROR_MESSAGES.SMTP_OR_DELIVERY_FAILURE;
  }
  // 2. Phone Number Format & Missing Phone
  else if (
    hasInCode('auth/invalid-phone-number', 'invalid-phone-number') ||
    hasInMsg('invalid-phone-number', 'invalid phone number', 'phone number is invalid')
  ) {
    result = AUTH_ERROR_MESSAGES.INVALID_PHONE_NUMBER;
  } else if (
    hasInCode('auth/missing-phone-number', 'missing-phone-number') ||
    hasInMsg('missing-phone-number', 'missing phone number', 'phone number is required')
  ) {
    result = AUTH_ERROR_MESSAGES.MISSING_PHONE_NUMBER;
  }
  // 3. OTP & Verification Codes
  else if (
    hasInCode('auth/invalid-verification-code', 'invalid-verification-code') ||
    hasInMsg(
      'invalid-verification-code',
      'invalid verification code',
      'invalid code',
      'incorrect code',
      'incorrect verification code'
    )
  ) {
    result = AUTH_ERROR_MESSAGES.INVALID_VERIFICATION_CODE;
  } else if (
    hasInCode(
      'auth/code-expired',
      'code-expired',
      'otp_expired',
      'token_expired',
      'bad_code_verifier',
      'otp_disabled'
    ) ||
    hasInMsg(
      'code-expired',
      'verification code expired',
      'token has expired',
      'otp expired',
      'token expired',
      'email link is invalid or has expired',
      'invalid or expired otp',
      'token has expired or is invalid'
    )
  ) {
    result = AUTH_ERROR_MESSAGES.CODE_EXPIRED;
  } else if (
    hasInCode('auth/missing-verification-code', 'missing-verification-code') ||
    hasInMsg('missing-verification-code', 'missing verification code')
  ) {
    result = AUTH_ERROR_MESSAGES.MISSING_VERIFICATION_CODE;
  } else if (
    hasInCode(
      'auth/session-expired',
      'session-expired',
      'auth/invalid-verification-id',
      'invalid-verification-id'
    ) ||
    hasInMsg('session-expired', 'verification session has expired', 'invalid-verification-id', 'invalid verification id')
  ) {
    result = AUTH_ERROR_MESSAGES.SESSION_EXPIRED;
  }
  // 4. Captcha / App Check / App Verification
  else if (
    hasInCode(
      'auth/captcha-check-failed',
      'captcha-check-failed',
      'auth/invalid-app-credential',
      'invalid-app-credential',
      'auth/app-not-authorized',
      'app-not-authorized',
      'auth/app-not-verified',
      'app-not-verified'
    ) ||
    hasInMsg('captcha-check-failed', 'captcha check failed', 'recaptcha', 'app check failed', 'invalid app credential')
  ) {
    result = AUTH_ERROR_MESSAGES.CAPTCHA_CHECK_FAILED;
  }
  // 5. Quotas & Rate Limits
  else if (
    hasInCode('auth/quota-exceeded', 'quota-exceeded', 'sms_quota_exceeded', 'quota_exceeded') ||
    hasInMsg('quota-exceeded', 'sms quota exceeded', 'quota exceeded')
  ) {
    result = AUTH_ERROR_MESSAGES.QUOTA_EXCEEDED;
  } else if (
    status === 429 ||
    hasInCode(
      'auth/too-many-requests',
      'too-many-requests',
      'over_email_send_rate_limit',
      'over_request_rate_limit',
      'over_sms_send_rate_limit',
      'rate_limit_exceeded',
      'too_many_requests'
    ) ||
    hasInMsg(
      'too-many-requests',
      'rate limit',
      'too many requests',
      'over_email_send_rate_limit',
      'over_request_rate_limit',
      'for security purposes'
    )
  ) {
    result = AUTH_ERROR_MESSAGES.RATE_LIMIT;
  }
  // 6. Google OAuth Popup Handlers
  else if (
    hasInCode('auth/popup-closed-by-user', 'popup-closed-by-user') ||
    hasInMsg('popup-closed-by-user', 'popup closed by user', 'popup closed')
  ) {
    result = AUTH_ERROR_MESSAGES.POPUP_CLOSED_BY_USER;
  } else if (
    hasInCode('auth/popup-blocked', 'popup-blocked') ||
    hasInMsg('popup-blocked', 'popup blocked', 'popup was blocked')
  ) {
    result = AUTH_ERROR_MESSAGES.POPUP_BLOCKED;
  } else if (
    hasInCode('auth/cancelled-popup-request', 'cancelled-popup-request') ||
    hasInMsg('cancelled-popup-request', 'cancelled popup request', 'popup request was cancelled')
  ) {
    result = AUTH_ERROR_MESSAGES.CANCELLED_POPUP_REQUEST;
  }
  // 7. Credential Conflicts & Linking
  else if (
    hasInCode('auth/account-exists-with-different-credential', 'account-exists-with-different-credential') ||
    hasInMsg('account-exists-with-different-credential', 'account exists with different credential')
  ) {
    result = AUTH_ERROR_MESSAGES.ACCOUNT_EXISTS_WITH_DIFFERENT_CREDENTIAL;
  } else if (
    hasInCode(
      'auth/credential-already-in-use',
      'credential-already-in-use',
      'auth/phone-number-already-exists',
      'phone-number-already-exists'
    ) ||
    hasInMsg(
      'credential-already-in-use',
      'credential already in use',
      'phone number already in use',
      'phone number already exists'
    )
  ) {
    result = AUTH_ERROR_MESSAGES.CREDENTIAL_ALREADY_IN_USE;
  } else if (
    hasInCode(
      'auth/email-already-in-use',
      'email-already-in-use',
      'user_already_exists',
      'identity_already_exists',
      'user_already_registered'
    ) ||
    hasInMsg(
      'email-already-in-use',
      'user already registered',
      'user already exists',
      'account with this email already exists',
      'email address already in use',
      'identity already exists'
    )
  ) {
    result = AUTH_ERROR_MESSAGES.USER_ALREADY_EXISTS;
  }
  // 8. Network / Connection Errors
  else if (
    name === 'AuthRetryableFetchError' ||
    (name === 'TypeError' && hasInMsg('fetch', 'network', 'connect')) ||
    hasInCode('auth/network-request-failed', 'network-request-failed', 'network_error', 'fetch_error', 'auth/timeout', 'timeout') ||
    hasInMsg(
      'network-request-failed',
      'failed to fetch',
      'network error',
      'networkrequestfailed',
      'unable to connect',
      'connection refused',
      'err_connection_refused',
      'timeout'
    )
  ) {
    result = AUTH_ERROR_MESSAGES.NETWORK_ERROR;
  }
  // 9. Account & Provider States
  else if (
    hasInCode('auth/user-disabled', 'user-disabled') ||
    hasInMsg('user-disabled', 'user has been disabled', 'user disabled')
  ) {
    result = AUTH_ERROR_MESSAGES.USER_DISABLED;
  } else if (
    hasInCode('auth/user-not-found', 'user-not-found', 'user_not_found') ||
    hasInMsg('user-not-found', 'user not found')
  ) {
    result = AUTH_ERROR_MESSAGES.USER_NOT_FOUND;
  } else if (
    hasInCode('auth/operation-not-allowed', 'operation-not-allowed') ||
    hasInMsg('operation-not-allowed', 'operation not allowed')
  ) {
    result = AUTH_ERROR_MESSAGES.OPERATION_NOT_ALLOWED;
  } else if (
    hasInCode('auth/unauthorized-domain', 'unauthorized-domain') ||
    hasInMsg('unauthorized-domain', 'unauthorized domain')
  ) {
    result = AUTH_ERROR_MESSAGES.UNAUTHORIZED_DOMAIN;
  } else if (
    hasInCode('auth/requires-recent-login', 'requires-recent-login') ||
    hasInMsg('requires-recent-login', 'requires recent login')
  ) {
    result = AUTH_ERROR_MESSAGES.REQUIRES_RECENT_LOGIN;
  } else if (
    hasInCode('auth/web-storage-unsupported', 'web-storage-unsupported') ||
    hasInMsg('web-storage-unsupported', 'web storage is unsupported', 'storage unsupported')
  ) {
    result = AUTH_ERROR_MESSAGES.STORAGE_UNSUPPORTED;
  }
  // 10. Credentials, Password & Legacy Auth
  else if (
    hasInCode(
      'auth/wrong-password',
      'auth/invalid-credential',
      'auth/invalid-login-credentials',
      'auth/invalid-email',
      'wrong-password',
      'invalid-credential',
      'invalid_credentials',
      'invalid_grant',
      'bad_jwt'
    ) ||
    hasInMsg(
      'invalid login credentials',
      'invalid email or password',
      'invalid credentials',
      'invalid username or password',
      'invalid grant',
      'wrong password',
      'invalid email'
    )
  ) {
    result = AUTH_ERROR_MESSAGES.INVALID_CREDENTIALS;
  } else if (
    hasInCode('auth/weak-password', 'weak-password', 'weak_password', 'password_too_short') ||
    hasInMsg(
      'password should be at least 6 characters',
      'password should be at least 8 characters',
      'weak password',
      'password is too weak',
      'password is too short',
      'password must be at least'
    )
  ) {
    result = AUTH_ERROR_MESSAGES.WEAK_PASSWORD;
  } else if (
    hasInCode('email_not_confirmed', 'email_address_not_confirmed') ||
    hasInMsg('email not confirmed', 'email address not confirmed', 'please confirm your email', 'please verify your email')
  ) {
    result = AUTH_ERROR_MESSAGES.EMAIL_NOT_CONFIRMED;
  } else if (
    hasInCode('signup_disabled', 'signups_not_allowed') ||
    hasInMsg(
      'signup is disabled',
      'signups not allowed',
      'signup disabled',
      'signups are disabled',
      'signups not allowed for otp',
      'signups not allowed for this instance'
    )
  ) {
    result = AUTH_ERROR_MESSAGES.SIGNUP_DISABLED;
  } else if (
    hasInCode('auth/internal-error', 'internal-error', 'internal_error') ||
    hasInMsg('internal-error', 'internal error')
  ) {
    result = AUTH_ERROR_MESSAGES.FALLBACK;
  }

  // Secondary Defense-in-depth Sanitizer check:
  // Ensure the returned string never contains forbidden technical terms
  const resultLower = result.toLowerCase();
  for (const forbidden of FORBIDDEN_AUTH_TERMS) {
    if (resultLower.includes(forbidden.toLowerCase())) {
      return AUTH_ERROR_MESSAGES.FALLBACK;
    }
  }

  return result;
}
