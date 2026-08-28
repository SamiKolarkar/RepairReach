import { describe, it, expect } from 'vitest';
import {
  translateAuthError,
  AUTH_ERROR_MESSAGES,
  FORBIDDEN_AUTH_TERMS,
} from '@/lib/authErrorTranslator';

describe('Milestone 2 Security Challenger: authErrorTranslator Adversarial Verification', () => {
  // Hard Invariant Check: Result must be a non-empty string and NEVER contain any forbidden term (case-insensitive)
  function assertStrictSanitization(output: string, contextDescription: string) {
    expect(typeof output).toBe('string');
    expect(output.trim().length).toBeGreaterThan(0);
    const lowerOutput = output.toLowerCase();

    for (const term of FORBIDDEN_AUTH_TERMS) {
      const lowerTerm = term.toLowerCase();
      if (lowerOutput.includes(lowerTerm)) {
        throw new Error(
          `SECURITY BREACH: Forbidden term "${term}" leaked into user output for context: ${contextDescription}. Output was: "${output}"`
        );
      }
    }
  }

  describe('1. Deeply Nested Error Objects & Complex Payloads', () => {
    it('handles 3-level nested error object without leaking or throwing', () => {
      const nested = {
        error: {
          error: {
            message: 'Firebase: Error (auth/invalid-verification-code).',
          },
        },
      };
      const result = translateAuthError(nested);
      assertStrictSanitization(result, '3-level nested error');
      // When nested beyond top-level properties (code, message, error as string), plain object returns fallback
      expect(result).toBe(AUTH_ERROR_MESSAGES.FALLBACK);
    });

    it('handles 10-level deeply nested object tree', () => {
      let current: any = { message: 'Deep error with gserviceaccount and psql tokens' };
      for (let i = 0; i < 10; i++) {
        current = { error: current, level: i };
      }
      const result = translateAuthError(current);
      assertStrictSanitization(result, '10-level nested error');
      expect(result).toBe(AUTH_ERROR_MESSAGES.FALLBACK);
    });

    it('handles Axios-like response error payload with nested data', () => {
      const axiosError = {
        name: 'AxiosError',
        message: 'Request failed with status code 400',
        response: {
          status: 400,
          data: {
            code: 'auth/invalid-phone-number',
            message: 'Firebase: Invalid phone number passed to auth/api',
          },
        },
      };
      const result = translateAuthError(axiosError);
      assertStrictSanitization(result, 'Axios error structure');
      expect(result).toBe(AUTH_ERROR_MESSAGES.FALLBACK);
    });

    it('extracts top-level error property when it is a string code', () => {
      const err = { error: 'auth/invalid-phone-number' };
      const result = translateAuthError(err);
      assertStrictSanitization(result, 'Top-level error as string code');
      expect(result).toBe(AUTH_ERROR_MESSAGES.INVALID_PHONE_NUMBER);
    });

    it('extracts top-level errorCode property when present', () => {
      const err = { errorCode: 'auth/quota-exceeded' };
      const result = translateAuthError(err);
      assertStrictSanitization(result, 'Top-level errorCode');
      expect(result).toBe(AUTH_ERROR_MESSAGES.QUOTA_EXCEEDED);
    });

    it('extracts top-level detail or error_description property', () => {
      const err1 = { detail: 'Incorrect verification code. auth/invalid-verification-code' };
      const result1 = translateAuthError(err1);
      assertStrictSanitization(result1, 'Top-level detail');
      expect(result1).toBe(AUTH_ERROR_MESSAGES.INVALID_VERIFICATION_CODE);

      const err2 = { error_description: 'auth/popup-closed-by-user' };
      const result2 = translateAuthError(err2);
      assertStrictSanitization(result2, 'Top-level error_description');
      expect(result2).toBe(AUTH_ERROR_MESSAGES.POPUP_CLOSED_BY_USER);
    });
  });

  describe('2. Stringified JSON Payloads & Injection Attacks', () => {
    it('parses valid JSON with code and sanitizes forbidden terms in extra fields', () => {
      const json = JSON.stringify({
        code: 'auth/invalid-verification-code',
        message: 'Forbidden supabase postgres jwt leaked here',
        secret: 'bearer eyJhbGciOi...',
      });
      const result = translateAuthError(json);
      assertStrictSanitization(result, 'JSON with forbidden terms');
      expect(result).toBe(AUTH_ERROR_MESSAGES.INVALID_VERIFICATION_CODE);
    });

    it('handles JSON with only forbidden terms without throwing or leaking', () => {
      const json = JSON.stringify({
        message: 'postgres database error in gserviceaccount with psql',
      });
      const result = translateAuthError(json);
      assertStrictSanitization(result, 'JSON with database errors');
      expect(result).toBe(AUTH_ERROR_MESSAGES.FALLBACK);
    });

    it('handles corrupted JSON string starting with { but unparseable', () => {
      const malformed = '{ "code": "auth/user-not-found", "unclosed": ';
      const result = translateAuthError(malformed);
      assertStrictSanitization(result, 'Malformed unclosed JSON');
      expect(result).toBe(AUTH_ERROR_MESSAGES.USER_NOT_FOUND);
    });

    it('handles JSON array string', () => {
      const jsonArr = '["auth/invalid-phone-number", "firebase"]';
      const result = translateAuthError(jsonArr);
      assertStrictSanitization(result, 'JSON array string');
      expect(result).toBe(AUTH_ERROR_MESSAGES.INVALID_PHONE_NUMBER);
    });

    it('handles stringified empty JSON object "{}" as delivery failure', () => {
      const result = translateAuthError('{}');
      assertStrictSanitization(result, 'Empty JSON string "{}"');
      expect(result).toBe(AUTH_ERROR_MESSAGES.SMTP_OR_DELIVERY_FAILURE);
    });

    it('handles whitespace-padded "{}" as delivery failure', () => {
      const result = translateAuthError('   {}   ');
      assertStrictSanitization(result, 'Whitespace padded "{}"');
      expect(result).toBe(AUTH_ERROR_MESSAGES.SMTP_OR_DELIVERY_FAILURE);
    });
  });

  describe('3. Non-standard, Mixed-Case Codes & Exotic Types', () => {
    it('handles mixed-case auth codes: Auth/Too-Many-Requests', () => {
      const result = translateAuthError({ code: 'Auth/Too-Many-Requests' });
      assertStrictSanitization(result, 'Mixed-case Auth/Too-Many-Requests');
      expect(result).toBe(AUTH_ERROR_MESSAGES.RATE_LIMIT);
    });

    it('handles uppercase auth codes: AUTH/QUOTA-EXCEEDED', () => {
      const result = translateAuthError({ code: 'AUTH/QUOTA-EXCEEDED' });
      assertStrictSanitization(result, 'Uppercase AUTH/QUOTA-EXCEEDED');
      expect(result).toBe(AUTH_ERROR_MESSAGES.QUOTA_EXCEEDED);
    });

    it('handles mixed-case auth code in message: "Error (Auth/Invalid-Phone-Number)."', () => {
      const result = translateAuthError(new Error('Firebase: Error (Auth/Invalid-Phone-Number).'));
      assertStrictSanitization(result, 'Mixed-case in error message');
      expect(result).toBe(AUTH_ERROR_MESSAGES.INVALID_PHONE_NUMBER);
    });

    it('handles prototype-polluted object without throwing or leaking', () => {
      const protoPolluted = Object.create({
        forbidden: 'jwt-token-secret',
        code: 'auth/wrong-password',
      });
      protoPolluted.message = 'Polluted prototype payload';

      const result = translateAuthError(protoPolluted);
      assertStrictSanitization(result, 'Prototype polluted object');
      expect(result).toBe(AUTH_ERROR_MESSAGES.INVALID_CREDENTIALS);
    });

    it('handles Object.create(null) cleanly', () => {
      const nullProto = Object.create(null);
      nullProto.code = 'auth/code-expired';
      const result = translateAuthError(nullProto);
      assertStrictSanitization(result, 'Object.create(null)');
      expect(result).toBe(AUTH_ERROR_MESSAGES.CODE_EXPIRED);
    });

    it('handles proxy object throwing on unexpected property access', () => {
      const target = { code: 'auth/user-disabled' };
      const proxy = new Proxy(target, {
        get(t, prop) {
          if (prop === 'message') {
            throw new Error('Access denied to message property');
          }
          return (t as any)[prop];
        },
      });

      // translateAuthError accesses errObj.code first, then errObj.message
      // If a property throws, the outer call should either catch or we test behavior
      try {
        const result = translateAuthError(proxy);
        assertStrictSanitization(result, 'Proxy object');
      } catch (err: any) {
        expect(err.message).toContain('Access denied to message property');
      }
    });

    it('handles Symbols, BigInts, functions, and undefined/null', () => {
      expect(translateAuthError(null)).toBe(AUTH_ERROR_MESSAGES.FALLBACK);
      expect(translateAuthError(undefined)).toBe(AUTH_ERROR_MESSAGES.FALLBACK);
      expect(translateAuthError(Symbol('forbidden-jwt'))).toBe(AUTH_ERROR_MESSAGES.FALLBACK);
      expect(translateAuthError(12345678901234567890n)).toBe(AUTH_ERROR_MESSAGES.FALLBACK);
      expect(translateAuthError(() => 'auth/user-not-found')).toBe(AUTH_ERROR_MESSAGES.FALLBACK);
    });
  });

  describe('4. Exhaustive Verification of All 19 Forbidden Terms in All Casings', () => {
    const allForbiddenTerms = [
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
    ];

    it('verifies that FORBIDDEN_AUTH_TERMS contains exactly all 19 forbidden terms', () => {
      expect(FORBIDDEN_AUTH_TERMS.length).toBe(19);
      for (const term of allForbiddenTerms) {
        expect(FORBIDDEN_AUTH_TERMS).toContain(term);
      }
    });

    for (const term of allForbiddenTerms) {
      it(`sanitizes forbidden term "${term}" in lower, upper, and mixed casings`, () => {
        const casings = [
          term.toLowerCase(),
          term.toUpperCase(),
          term.split('').map((c, i) => (i % 2 === 0 ? c.toUpperCase() : c.toLowerCase())).join(''),
        ];

        for (const variant of casings) {
          // 1. As standalone string
          const out1 = translateAuthError(variant);
          assertStrictSanitization(out1, `Standalone string: ${variant}`);

          // 2. In error message property
          const out2 = translateAuthError({ message: `Fatal exception: ${variant} occurred during auth` });
          assertStrictSanitization(out2, `Message property: ${variant}`);

          // 3. In Error instance
          const out3 = translateAuthError(new Error(`System exception at ${variant}`));
          assertStrictSanitization(out3, `Error instance: ${variant}`);

          // 4. Combined with valid auth code
          const out4 = translateAuthError({
            code: 'auth/invalid-phone-number',
            message: `Trace: ${variant} auth/invalid-phone-number`,
          });
          assertStrictSanitization(out4, `Combined with valid code: ${variant}`);

          // 5. In JSON string
          const out5 = translateAuthError(JSON.stringify({ error: variant, detail: `Detail: ${variant}` }));
          assertStrictSanitization(out5, `JSON payload: ${variant}`);
        }
      });
    }
  });

  describe('5. DOM Leak Verification & Fallback Resilience', () => {
    it('guarantees every constant in AUTH_ERROR_MESSAGES is strictly free of forbidden terms', () => {
      for (const [key, message] of Object.entries(AUTH_ERROR_MESSAGES)) {
        assertStrictSanitization(message, `AUTH_ERROR_MESSAGES.${key}`);
      }
    });

    it('returns a safe fallback message for unrecognized internal errors', () => {
      const internalErrors = [
        new Error('Unhandled database query error in PostgreSQL: relation "users" does not exist'),
        'INTERNAL_SERVER_ERROR: psql connect failed at 127.0.0.1:5432',
        { code: 'SQLSTATE[08006]', message: 'PostgreSQL connection failed' },
        { error: 'gserviceaccount key expired' },
        'Bearer token signature invalid: jwk key missing',
      ];

      for (const err of internalErrors) {
        const result = translateAuthError(err);
        assertStrictSanitization(result, 'Internal error fallback');
        expect(result).toBe(AUTH_ERROR_MESSAGES.FALLBACK);
      }
    });

    it('ensures catastrophic regex backtracking (ReDoS) does not occur with pathological strings', () => {
      const start = Date.now();
      // Pathological string repeating 'auth/' and dashes/letters
      const pathological = 'auth/'.repeat(5000) + 'invalid-phone-number' + '!'.repeat(5000);
      const result = translateAuthError(pathological);
      const elapsed = Date.now() - start;

      assertStrictSanitization(result, 'Pathological ReDoS string');
      expect(elapsed).toBeLessThan(1000); // Must complete in well under 1 second
    });

    it('handles 1MB large string payload without crashing or freezing', () => {
      const start = Date.now();
      const largeString = 'A'.repeat(500000) + ' auth/user-disabled ' + 'B'.repeat(500000);
      const result = translateAuthError(largeString);
      const elapsed = Date.now() - start;

      assertStrictSanitization(result, '1MB large string');
      expect(result).toBe(AUTH_ERROR_MESSAGES.USER_DISABLED);
      expect(elapsed).toBeLessThan(2000);
    });
  });
});
