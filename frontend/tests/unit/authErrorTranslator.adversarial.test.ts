import { describe, it, expect } from 'vitest';
import {
  translateAuthError,
  AUTH_ERROR_MESSAGES,
  FORBIDDEN_AUTH_TERMS,
} from '@/lib/authErrorTranslator';

describe('Adversarial & Fuzzing Challenge: authErrorTranslator', () => {
  // Helper to verify forbidden terms invariant
  function assertNoForbiddenTerms(output: string, context?: string) {
    expect(typeof output).toBe('string');
    expect(output.length).toBeGreaterThan(0);
    const lower = output.toLowerCase();
    for (const term of FORBIDDEN_AUTH_TERMS) {
      if (lower.includes(term.toLowerCase())) {
        throw new Error(
          `Invariant Violated in [${context}]: output "${output}" contains forbidden term "${term}"`
        );
      }
    }
  }

  describe('1. Malformed and Edge-case Primitive Inputs', () => {
    const primitives: Array<{ label: string; value: any; expectedFallback?: boolean }> = [
      { label: 'null', value: null, expectedFallback: true },
      { label: 'undefined', value: undefined, expectedFallback: true },
      { label: 'empty string', value: '', expectedFallback: true },
      { label: 'whitespace only (spaces)', value: '   ', expectedFallback: true },
      { label: 'whitespace only (tabs/newlines)', value: '\t\n\r\f\v', expectedFallback: true },
      { label: 'boolean true', value: true, expectedFallback: true },
      { label: 'boolean false', value: false, expectedFallback: true },
      { label: 'number 0', value: 0, expectedFallback: true },
      { label: 'number -1', value: -1, expectedFallback: true },
      { label: 'number 500', value: 500, expectedFallback: true },
      { label: 'number NaN', value: NaN, expectedFallback: true },
      { label: 'number Infinity', value: Infinity, expectedFallback: true },
      { label: 'number -Infinity', value: -Infinity, expectedFallback: true },
      { label: 'BigInt 0n', value: 0n, expectedFallback: true },
      { label: 'BigInt large', value: 9007199254740991n, expectedFallback: true },
      { label: 'Symbol()', value: Symbol('some-symbol'), expectedFallback: true },
      { label: 'Symbol(auth/user-not-found)', value: Symbol('auth/user-not-found'), expectedFallback: true },
      { label: 'Empty function', value: () => {}, expectedFallback: true },
      { label: 'Function returning error', value: function () { return 'auth/user-not-found'; }, expectedFallback: true },
      { label: 'Async function', value: async () => {}, expectedFallback: true },
    ];

    it.each(primitives)('handles primitive input: $label gracefully without throwing', ({ label, value, expectedFallback }) => {
      let result: string;
      expect(() => {
        result = translateAuthError(value);
      }).not.toThrow();

      assertNoForbiddenTerms(result!, `Primitive: ${label}`);
      if (expectedFallback) {
        expect(result!).toBe(AUTH_ERROR_MESSAGES.FALLBACK);
      }
    });

    it('handles numeric status 429 correctly', () => {
      const result = translateAuthError(429);
      expect(result).toBe(AUTH_ERROR_MESSAGES.RATE_LIMIT);
      assertNoForbiddenTerms(result, 'numeric 429');
    });
  });

  describe('2. Structural & Cyclic Object Fuzzing', () => {
    it('handles empty object {} as delivery failure', () => {
      const result = translateAuthError({});
      expect(result).toBe(AUTH_ERROR_MESSAGES.SMTP_OR_DELIVERY_FAILURE);
      assertNoForbiddenTerms(result, 'empty object');
    });

    it('handles string "{}" as delivery failure', () => {
      const result = translateAuthError('{}');
      expect(result).toBe(AUTH_ERROR_MESSAGES.SMTP_OR_DELIVERY_FAILURE);
      assertNoForbiddenTerms(result, 'string "{}"');
    });

    it('handles Object.create(null)', () => {
      const nullProto = Object.create(null);
      const result = translateAuthError(nullProto);
      expect(result).toBe(AUTH_ERROR_MESSAGES.SMTP_OR_DELIVERY_FAILURE);
      assertNoForbiddenTerms(result, 'Object.create(null)');
    });

    it('handles Object.create(null) with code property', () => {
      const nullProto = Object.create(null);
      nullProto.code = 'auth/invalid-phone-number';
      const result = translateAuthError(nullProto);
      expect(result).toBe(AUTH_ERROR_MESSAGES.INVALID_PHONE_NUMBER);
      assertNoForbiddenTerms(result, 'Object.create(null) with code');
    });

    it('handles simple self-referencing cyclic object', () => {
      const cyclic: any = { code: 'auth/user-not-found' };
      cyclic.self = cyclic;
      const result = translateAuthError(cyclic);
      expect(result).toBe(AUTH_ERROR_MESSAGES.USER_NOT_FOUND);
      assertNoForbiddenTerms(result, 'simple cyclic');
    });

    it('handles deep multi-node cyclic graph', () => {
      const nodeA: any = { name: 'nodeA' };
      const nodeB: any = { name: 'nodeB', parent: nodeA };
      const nodeC: any = { name: 'nodeC', next: nodeB, code: 'auth/too-many-requests' };
      nodeA.child = nodeC;

      const result = translateAuthError(nodeC);
      expect(result).toBe(AUTH_ERROR_MESSAGES.RATE_LIMIT);
      assertNoForbiddenTerms(result, 'deep cyclic');
    });

    it('handles arrays and nested arrays', () => {
      expect(translateAuthError([])).toBe(AUTH_ERROR_MESSAGES.SMTP_OR_DELIVERY_FAILURE);
      expect(translateAuthError([1, 2, 3])).toBe(AUTH_ERROR_MESSAGES.FALLBACK);
      expect(translateAuthError([['auth/invalid-phone-number']])).toBe(AUTH_ERROR_MESSAGES.FALLBACK);
    });

    it('handles objects with non-string code and message fields', () => {
      const weirdObject = {
        code: 12345,
        message: { detail: 'nested object' },
        status: '429', // string instead of number
        name: [1, 2, 3],
      };
      const result = translateAuthError(weirdObject);
      assertNoForbiddenTerms(result, 'weird non-string fields');
      expect(result).toBe(AUTH_ERROR_MESSAGES.FALLBACK);
    });

    it('handles objects with null code and message fields', () => {
      const nullFields = {
        code: null,
        message: null,
        status: null,
      };
      const result = translateAuthError(nullFields);
      assertNoForbiddenTerms(result, 'null fields');
      expect(result).toBe(AUTH_ERROR_MESSAGES.FALLBACK);
    });
  });

  describe('3. Custom Error Subclasses & Prototype Chains', () => {
    class CustomFirebaseError extends Error {
      code: string;
      customMetadata: Record<string, any>;

      constructor(message: string, code: string) {
        super(message);
        this.name = 'FirebaseError';
        this.code = code;
        this.customMetadata = { provider: 'phone' };
        Object.setPrototypeOf(this, CustomFirebaseError.prototype);
      }
    }

    class AuthApiError extends Error {
      status: number;
      constructor(message: string, status: number) {
        super(message);
        this.name = 'AuthApiError';
        this.status = status;
      }
    }

    class ChainedError extends Error {
      cause: Error;
      constructor(message: string, cause: Error) {
        super(message);
        this.cause = cause;
      }
    }

    it('correctly maps CustomFirebaseError instance', () => {
      const err = new CustomFirebaseError(
        'Firebase: Error (auth/invalid-verification-code).',
        'auth/invalid-verification-code'
      );
      const result = translateAuthError(err);
      expect(result).toBe(AUTH_ERROR_MESSAGES.INVALID_VERIFICATION_CODE);
      assertNoForbiddenTerms(result, 'CustomFirebaseError');
    });

    it('correctly handles AuthApiError with status 429', () => {
      const err = new AuthApiError('Supabase AuthApiError: Rate limit exceeded', 429);
      const result = translateAuthError(err);
      expect(result).toBe(AUTH_ERROR_MESSAGES.RATE_LIMIT);
      assertNoForbiddenTerms(result, 'AuthApiError 429');
    });

    it('handles standard DOMException or TypeError', () => {
      const typeErr = new TypeError('Failed to fetch');
      const result = translateAuthError(typeErr);
      expect(result).toBe(AUTH_ERROR_MESSAGES.NETWORK_ERROR);
      assertNoForbiddenTerms(result, 'TypeError failed to fetch');
    });

    it('handles ChainedError with unknown message', () => {
      const cause = new Error('Database connection failed');
      const chained = new ChainedError('Operation failed', cause);
      const result = translateAuthError(chained);
      expect(result).toBe(AUTH_ERROR_MESSAGES.FALLBACK);
      assertNoForbiddenTerms(result, 'ChainedError');
    });
  });

  describe('4. Adversarial Injections & Forbidden Terms Attack Vectors', () => {
    const adversarialVectors: Array<{ name: string; input: any; expectedMessage?: string }> = [
      {
        name: 'Injected gserviceaccount and internal-error with real auth code',
        input: 'Firebase: internal-error in auth/user-not-found at gserviceaccount',
        expectedMessage: AUTH_ERROR_MESSAGES.USER_NOT_FOUND,
      },
      {
        name: 'Supabase and Brevo SMTP injection with invalid phone code',
        input: {
          code: 'auth/invalid-phone-number',
          message: 'Supabase AuthApiError: failed sending via Brevo SMTP server',
        },
        // Delivery / SMTP Failures branch checks hasInMsg('smtp', 'brevo', ...) first
        // If Brevo/SMTP is in message, it resolves to SMTP_OR_DELIVERY_FAILURE safely
        // which contains zero forbidden terms
      },
      {
        name: 'All forbidden terms concatenated in string',
        input: FORBIDDEN_AUTH_TERMS.join(' '),
        // Matches smtp/brevo in first branch safely
        expectedMessage: AUTH_ERROR_MESSAGES.SMTP_OR_DELIVERY_FAILURE,
      },
      {
        name: 'All forbidden terms in JSON error payload',
        input: JSON.stringify({
          code: 'internal-error',
          message: 'firebase recaptcha auth/ supabase authapierror rate limit brevo smtp googleapis securetoken jwk jwt bearer postgres psql',
        }),
        // Matches smtp/brevo in first branch safely
        expectedMessage: AUTH_ERROR_MESSAGES.SMTP_OR_DELIVERY_FAILURE,
      },
      {
        name: 'Malformed JSON string starting with { and forbidden words',
        input: '{ "code": "auth/user-not-found", "forbidden": "supabase postgres jwt" }',
        expectedMessage: AUTH_ERROR_MESSAGES.USER_NOT_FOUND,
      },
      {
        name: 'Corrupted JSON string starting with { but invalid syntax',
        input: '{ code: auth/invalid-phone-number, "internal-error": true }',
        // Should parse message fallback and extract auth/invalid-phone-number
        expectedMessage: AUTH_ERROR_MESSAGES.INVALID_PHONE_NUMBER,
      },
      {
        name: 'Stack trace injection containing securetoken and googleapis',
        input: new Error('Firebase: Error (auth/quota-exceeded). https://securetoken.googleapis.com/v1/token'),
        expectedMessage: AUTH_ERROR_MESSAGES.QUOTA_EXCEEDED,
      },
      {
        name: 'SQL injection attempt in auth message',
        input: {
          code: "auth/user-not-found' OR '1'='1'; DROP TABLE users; --",
          message: 'SELECT * FROM users WHERE psql postgres internal-error',
        },
      },
      {
        name: 'Case variation of forbidden terms: FiReBaSe ReCaPtChA InTeRnAl-ErRoR',
        input: 'FiReBaSe: ReCaPtChA InTeRnAl-ErRoR Occurred',
        // Matches recaptcha keyword safely
        expectedMessage: AUTH_ERROR_MESSAGES.CAPTCHA_CHECK_FAILED,
      },
      {
        name: 'Unicode / zero-width characters inside error code',
        input: 'auth/\u200Buser-not-found',
      },
      {
        name: 'Long 100k character string with embedded auth code',
        input: 'A'.repeat(50000) + 'auth/popup-closed-by-user' + 'B'.repeat(50000),
        expectedMessage: AUTH_ERROR_MESSAGES.POPUP_CLOSED_BY_USER,
      },
    ];

    it.each(adversarialVectors)('sanitizes vector [$name] with zero leakage', ({ name, input, expectedMessage }) => {
      const result = translateAuthError(input);
      assertNoForbiddenTerms(result, `Adversarial Vector: ${name}`);

      if (expectedMessage) {
        expect(result).toBe(expectedMessage);
      }
    });

    it('fuzzes 1000 randomized permutations of forbidden terms, random strings, and error codes', () => {
      const authCodes = [
        'auth/invalid-phone-number',
        'auth/missing-phone-number',
        'auth/invalid-verification-code',
        'auth/code-expired',
        'auth/missing-verification-code',
        'auth/session-expired',
        'auth/invalid-verification-id',
        'auth/captcha-check-failed',
        'auth/quota-exceeded',
        'auth/too-many-requests',
        'auth/popup-closed-by-user',
        'auth/popup-blocked',
        'auth/cancelled-popup-request',
        'auth/account-exists-with-different-credential',
        'auth/credential-already-in-use',
        'auth/user-disabled',
        'auth/user-not-found',
        'auth/operation-not-allowed',
        'auth/unauthorized-domain',
        'auth/requires-recent-login',
        'auth/web-storage-unsupported',
        'auth/network-request-failed',
        'auth/wrong-password',
        'auth/invalid-credential',
        'auth/weak-password',
        'auth/internal-error',
      ];

      const noiseWords = [
        'error', 'failure', 'exception', 'stack', 'undefined', 'null', 'token',
        '0xDEADBEEF', '127.0.0.1', 'localhost', 'admin', 'root', 'DROP TABLE',
        '<script>alert(1)</script>', '{{7*7}}', '%s%s%s', '\0', '\n\r\t',
      ];

      for (let i = 0; i < 1000; i++) {
        const forbiddenTerm = FORBIDDEN_AUTH_TERMS[i % FORBIDDEN_AUTH_TERMS.length];
        const code = authCodes[i % authCodes.length];
        const noise = noiseWords[i % noiseWords.length];

        // Format in various ways: string, object, Error, JSON
        let candidate: any;
        const mode = i % 4;
        if (mode === 0) {
          candidate = `Prefix ${noise} ${forbiddenTerm} (${code}) suffix ${noise}`;
        } else if (mode === 1) {
          candidate = {
            code: `${code}`,
            message: `${forbiddenTerm} ${noise}`,
            detail: `${forbiddenTerm}`,
          };
        } else if (mode === 2) {
          candidate = new Error(`${forbiddenTerm} occurred in ${code} with ${noise}`);
        } else {
          candidate = JSON.stringify({
            code,
            message: `Notice: ${forbiddenTerm} ${noise}`,
          });
        }

        const output = translateAuthError(candidate);
        assertNoForbiddenTerms(output, `Fuzz iteration ${i} [mode ${mode}]`);
      }
    });
  });

  describe('5. Exhaustive Firebase Auth Code Resolution Matrix', () => {
    const codeMatrix: Array<{ code: string; expected: string }> = [
      { code: 'auth/invalid-phone-number', expected: AUTH_ERROR_MESSAGES.INVALID_PHONE_NUMBER },
      { code: 'auth/missing-phone-number', expected: AUTH_ERROR_MESSAGES.MISSING_PHONE_NUMBER },
      { code: 'auth/invalid-verification-code', expected: AUTH_ERROR_MESSAGES.INVALID_VERIFICATION_CODE },
      { code: 'auth/code-expired', expected: AUTH_ERROR_MESSAGES.CODE_EXPIRED },
      { code: 'auth/missing-verification-code', expected: AUTH_ERROR_MESSAGES.MISSING_VERIFICATION_CODE },
      { code: 'auth/session-expired', expected: AUTH_ERROR_MESSAGES.SESSION_EXPIRED },
      { code: 'auth/invalid-verification-id', expected: AUTH_ERROR_MESSAGES.SESSION_EXPIRED },
      { code: 'auth/captcha-check-failed', expected: AUTH_ERROR_MESSAGES.CAPTCHA_CHECK_FAILED },
      { code: 'auth/invalid-app-credential', expected: AUTH_ERROR_MESSAGES.CAPTCHA_CHECK_FAILED },
      { code: 'auth/app-not-authorized', expected: AUTH_ERROR_MESSAGES.CAPTCHA_CHECK_FAILED },
      { code: 'auth/app-not-verified', expected: AUTH_ERROR_MESSAGES.CAPTCHA_CHECK_FAILED },
      { code: 'auth/quota-exceeded', expected: AUTH_ERROR_MESSAGES.QUOTA_EXCEEDED },
      { code: 'auth/too-many-requests', expected: AUTH_ERROR_MESSAGES.RATE_LIMIT },
      { code: 'auth/popup-closed-by-user', expected: AUTH_ERROR_MESSAGES.POPUP_CLOSED_BY_USER },
      { code: 'auth/popup-blocked', expected: AUTH_ERROR_MESSAGES.POPUP_BLOCKED },
      { code: 'auth/cancelled-popup-request', expected: AUTH_ERROR_MESSAGES.CANCELLED_POPUP_REQUEST },
      { code: 'auth/account-exists-with-different-credential', expected: AUTH_ERROR_MESSAGES.ACCOUNT_EXISTS_WITH_DIFFERENT_CREDENTIAL },
      { code: 'auth/credential-already-in-use', expected: AUTH_ERROR_MESSAGES.CREDENTIAL_ALREADY_IN_USE },
      { code: 'auth/phone-number-already-exists', expected: AUTH_ERROR_MESSAGES.CREDENTIAL_ALREADY_IN_USE },
      { code: 'auth/email-already-in-use', expected: AUTH_ERROR_MESSAGES.USER_ALREADY_EXISTS },
      { code: 'auth/user-disabled', expected: AUTH_ERROR_MESSAGES.USER_DISABLED },
      { code: 'auth/user-not-found', expected: AUTH_ERROR_MESSAGES.USER_NOT_FOUND },
      { code: 'auth/operation-not-allowed', expected: AUTH_ERROR_MESSAGES.OPERATION_NOT_ALLOWED },
      { code: 'auth/unauthorized-domain', expected: AUTH_ERROR_MESSAGES.UNAUTHORIZED_DOMAIN },
      { code: 'auth/requires-recent-login', expected: AUTH_ERROR_MESSAGES.REQUIRES_RECENT_LOGIN },
      { code: 'auth/web-storage-unsupported', expected: AUTH_ERROR_MESSAGES.STORAGE_UNSUPPORTED },
      { code: 'auth/network-request-failed', expected: AUTH_ERROR_MESSAGES.NETWORK_ERROR },
      { code: 'auth/timeout', expected: AUTH_ERROR_MESSAGES.NETWORK_ERROR },
      { code: 'auth/wrong-password', expected: AUTH_ERROR_MESSAGES.INVALID_CREDENTIALS },
      { code: 'auth/invalid-credential', expected: AUTH_ERROR_MESSAGES.INVALID_CREDENTIALS },
      { code: 'auth/invalid-login-credentials', expected: AUTH_ERROR_MESSAGES.INVALID_CREDENTIALS },
      { code: 'auth/invalid-email', expected: AUTH_ERROR_MESSAGES.INVALID_CREDENTIALS },
      { code: 'auth/weak-password', expected: AUTH_ERROR_MESSAGES.WEAK_PASSWORD },
      { code: 'auth/internal-error', expected: AUTH_ERROR_MESSAGES.FALLBACK },
    ];

    it.each(codeMatrix)('maps $code correctly via { code } object', ({ code, expected }) => {
      const result = translateAuthError({ code });
      expect(result).toBe(expected);
      assertNoForbiddenTerms(result, `Code matrix object: ${code}`);
    });

    it.each(codeMatrix)('maps $code correctly via Firebase Error instance message', ({ code, expected }) => {
      const err = new Error(`Firebase: Error (${code}).`);
      const result = translateAuthError(err);
      expect(result).toBe(expected);
      assertNoForbiddenTerms(result, `Code matrix Error instance: ${code}`);
    });

    it.each(codeMatrix)('maps $code correctly via serialized JSON string', ({ code, expected }) => {
      const jsonStr = JSON.stringify({ code, message: `Sample message for ${code}` });
      const result = translateAuthError(jsonStr);
      expect(result).toBe(expected);
      assertNoForbiddenTerms(result, `Code matrix JSON: ${code}`);
    });
  });

  describe('6. Distinctness and Helpfulness of User Messages', () => {
    it('ensures distinct error scenarios have helpful, actionable messages', () => {
      const allMessages = Object.entries(AUTH_ERROR_MESSAGES);
      expect(allMessages.length).toBeGreaterThanOrEqual(25);

      // Verify no message is empty or trivial
      for (const [key, msg] of allMessages) {
        expect(typeof msg).toBe('string');
        expect(msg.length).toBeGreaterThan(10); // All messages must be helpful sentences
        expect(msg.endsWith('.')).toBe(true); // Proper punctuation
        assertNoForbiddenTerms(msg, `AUTH_ERROR_MESSAGES.${key}`);
      }
    });

    it('ensures critical categories have distinct non-identical messages', () => {
      // Phone vs OTP vs Rate Limit vs Network vs Captcha vs OAuth
      const distinctCategories = [
        AUTH_ERROR_MESSAGES.INVALID_PHONE_NUMBER,
        AUTH_ERROR_MESSAGES.INVALID_VERIFICATION_CODE,
        AUTH_ERROR_MESSAGES.CODE_EXPIRED,
        AUTH_ERROR_MESSAGES.CAPTCHA_CHECK_FAILED,
        AUTH_ERROR_MESSAGES.RATE_LIMIT,
        AUTH_ERROR_MESSAGES.QUOTA_EXCEEDED,
        AUTH_ERROR_MESSAGES.POPUP_CLOSED_BY_USER,
        AUTH_ERROR_MESSAGES.ACCOUNT_EXISTS_WITH_DIFFERENT_CREDENTIAL,
        AUTH_ERROR_MESSAGES.USER_DISABLED,
        AUTH_ERROR_MESSAGES.USER_NOT_FOUND,
        AUTH_ERROR_MESSAGES.NETWORK_ERROR,
        AUTH_ERROR_MESSAGES.STORAGE_UNSUPPORTED,
        AUTH_ERROR_MESSAGES.INVALID_CREDENTIALS,
        AUTH_ERROR_MESSAGES.FALLBACK,
      ];

      const uniqueSet = new Set(distinctCategories);
      expect(uniqueSet.size).toBe(distinctCategories.length);
    });
  });
});
