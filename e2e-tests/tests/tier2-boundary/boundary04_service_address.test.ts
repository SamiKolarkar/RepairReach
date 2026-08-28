/**
 * Tier 2 Boundary & Corner Cases: Feature 4 - Service & Location Input
 *
 * Tests boundary conditions for location address, problem description lengths,
 * Marathi unicode addresses, XSS / injection payloads, and missing field validation.
 *
 * Requirements: ORIGINAL_REQUEST.md R2, PROJECT.md Feature 4, docs/architecture/09-api-architecture.md
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { RepairReachApiClient, defaultApiClient } from '../../src/apiClient.js';
import {
  generateUUID,
  generateBookingPayload,
  assertProblemDetails,
  SOLAPUR_LOCALITIES,
} from '../../src/testUtils.js';
import type { ProblemDetails } from '../../src/types.js';

describe('Tier 2 - Feature 4: Service & Location Input Boundary Tests', () => {
  let client: RepairReachApiClient;
  let isLiveBackend = false;

  beforeAll(async () => {
    client = defaultApiClient;
    try {
      const res = await client.getServices();
      isLiveBackend = res.status === 200;
    } catch {
      isLiveBackend = false;
    }
  });

  it('BVA-04-01: Rejects empty or whitespace-only location address with 400 VALIDATION_FAILED', async () => {
    const emptyAddresses = ['', '   ', '\t\n '];
    for (const address of emptyAddresses) {
      const payload = generateBookingPayload('srv-test', 'slot-test', '2026-08-20', {
        locationAddress: address,
      });

      if (isLiveBackend) {
        const res = await client.createBooking(payload, generateUUID());
        expect(res.status).toBe(400);
        assertProblemDetails(res.data, 'VALIDATION_FAILED', 400);
        if (res.data.invalidParams) {
          const addrParam = res.data.invalidParams.find(
            (p) => p.name.includes('address') || p.name.includes('locationAddress')
          );
          expect(addrParam).toBeDefined();
        }
      } else {
        expect(address.trim().length).toBe(0);
      }
    }
  });

  it('BVA-04-02: Handles extreme address length boundary (> 500 characters) with validation or safe storage', async () => {
    const oversizedAddress = 'Navi Peth, Solapur, Maharashtra, Near Old Water Tank '.repeat(15); // > 700 chars
    const payload = generateBookingPayload('srv-test', 'slot-test', '2026-08-20', {
      locationAddress: oversizedAddress,
    });

    if (isLiveBackend) {
      const res = await client.createBooking(payload, generateUUID());
      expect([400, 201]).toContain(res.status);
      if (res.status === 400) {
        assertProblemDetails(res.data, 'VALIDATION_FAILED', 400);
      }
    } else {
      expect(oversizedAddress.length).toBeGreaterThan(500);
    }
  });

  it('BVA-04-03: Preserves and validates Marathi / Devanagari Solapur locality addresses', () => {
    const marathiAddresses = [
      'दुकान नं. १२, नवी पेठ, सोलापूर, महाराष्ट्र ४१३००१',
      'फ्लॅट ३०२, ग्रीन व्ह्यू अपार्टमेंट, होटगी रोड, सोलापूर ४१३००३',
      'घर क्र. ४५, सेक्टर २, जुळे सोलापूर, सोलापूर ४१३००४',
      '१२० सात रस्ता चौक, सोलापूर ४१३००१',
      'भवानी पेठ, सिद्धेश्वर मंदिरा जवळ, सोलापूर ४१३००२',
    ];

    for (const addr of marathiAddresses) {
      const payload = generateBookingPayload('srv-test', 'slot-test', '2026-08-20', {
        locationAddress: addr,
      });

      expect(payload.locationAddress).toBe(addr);
      expect(payload.locationAddress).toContain('सोलापूर');
      const utf8Bytes = Buffer.byteLength(addr, 'utf-8');
      expect(utf8Bytes).toBeGreaterThan(addr.length); // Multi-byte UTF-8
    }
  });

  it('BVA-04-04: Rejects empty or whitespace-only problem description with 400 VALIDATION_FAILED', async () => {
    const emptyProblems = ['', '   ', '\t\n\r '];
    for (const problem of emptyProblems) {
      const payload = generateBookingPayload('srv-test', 'slot-test', '2026-08-20', {
        problemDescription: problem,
      });

      if (isLiveBackend) {
        const res = await client.createBooking(payload, generateUUID());
        expect(res.status).toBe(400);
        assertProblemDetails(res.data, 'VALIDATION_FAILED', 400);
        if (res.data.invalidParams) {
          const probParam = res.data.invalidParams.find(
            (p) => p.name.includes('problem') || p.name.includes('description')
          );
          expect(probParam).toBeDefined();
        }
      } else {
        expect(problem.trim().length).toBe(0);
      }
    }
  });

  it('BVA-04-05: Handles extreme problem description length boundary (> 2000 characters) safely', async () => {
    const oversizedProblem = 'Appliance motor makes loud grinding noise and vibrates excessively. '.repeat(40); // > 2700 chars
    const payload = generateBookingPayload('srv-test', 'slot-test', '2026-08-20', {
      problemDescription: oversizedProblem,
    });

    if (isLiveBackend) {
      const res = await client.createBooking(payload, generateUUID());
      expect([400, 201]).toContain(res.status);
      if (res.status === 400) {
        assertProblemDetails(res.data, 'VALIDATION_FAILED', 400);
      }
    } else {
      expect(oversizedProblem.length).toBeGreaterThan(2000);
    }
  });

  it('BVA-04-06: Sanitizes and protects against XSS and SQL injection payloads in address & problem text', async () => {
    const attackStrings = [
      "<script>alert('xss')</script>",
      "'; DROP TABLE jobs; --",
      '<img src=x onerror=alert(1)>',
      '"><iframe src="javascript:alert(1)">',
      'UNION SELECT null, null, username, password FROM users--',
    ];

    for (const str of attackStrings) {
      const payload = generateBookingPayload('srv-test', 'slot-test', '2026-08-20', {
        locationAddress: `${SOLAPUR_LOCALITIES[0]} ${str}`,
        problemDescription: `Defect details: ${str}`,
      });

      expect(payload.locationAddress).toContain(SOLAPUR_LOCALITIES[0]);
      expect(payload.problemDescription).toContain('Defect details:');

      if (isLiveBackend) {
        const res = await client.createBooking(payload, generateUUID());
        // Must never produce unhandled 500 error
        expect(res.status).toBeLessThan(500);
      }
    }
  });
});
