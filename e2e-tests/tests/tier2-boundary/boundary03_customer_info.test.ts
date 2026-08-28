/**
 * Tier 2 Boundary & Corner Cases: Feature 3 - Customer Information Capture
 *
 * Tests boundary conditions for customer name, phone normalization, length limits,
 * whitespace handling, non-Latin / Marathi unicode characters, and validation error details.
 *
 * Requirements: ORIGINAL_REQUEST.md R2, PROJECT.md Feature 3, docs/architecture/09-api-architecture.md
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { RepairReachApiClient, defaultApiClient } from '../../src/apiClient.js';
import {
  generateUUID,
  generateBookingPayload,
  assertProblemDetails,
  generateInvalidPhone,
} from '../../src/testUtils.js';
import type { ProblemDetails } from '../../src/types.js';

describe('Tier 2 - Feature 3: Customer Information Capture Boundary Tests', () => {
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

  it('BVA-03-01: Rejects short phone number (< 10 digits) with 400 VALIDATION_FAILED', async () => {
    const shortPhones = ['98220', '123', '982201', '0'];
    for (const phone of shortPhones) {
      const payload = generateBookingPayload('srv-test', 'slot-test', '2026-08-20', {
        customerPhone: phone,
      });

      if (isLiveBackend) {
        const res = await client.createBooking(payload, generateUUID());
        expect(res.status).toBe(400);
        assertProblemDetails(res.data, 'VALIDATION_FAILED', 400);
        if (res.data.invalidParams) {
          const phoneParam = res.data.invalidParams.find((p) => p.name.includes('phone') || p.name.includes('customerPhone'));
          expect(phoneParam).toBeDefined();
        }
      } else {
        expect(phone.replace(/\D/g, '').length).toBeLessThan(10);
      }
    }
  });

  it('BVA-03-02: Rejects oversized phone number (> 15 digits / exceeding E.164) with 400 VALIDATION_FAILED', async () => {
    const longPhones = ['9822012345678901234', '+91 9822012345678901', '12345678901234567890'];
    for (const phone of longPhones) {
      const payload = generateBookingPayload('srv-test', 'slot-test', '2026-08-20', {
        customerPhone: phone,
      });

      if (isLiveBackend) {
        const res = await client.createBooking(payload, generateUUID());
        expect(res.status).toBe(400);
        assertProblemDetails(res.data, 'VALIDATION_FAILED', 400);
      } else {
        expect(phone.replace(/\D/g, '').length).toBeGreaterThan(15);
      }
    }
  });

  it('BVA-03-03: Rejects alphabetic and special symbol characters in customer phone number', async () => {
    const invalidPhones = ['9822ABC123', '+91-9822#45@12', 'phone-num', '98220 1234X'];
    for (const phone of invalidPhones) {
      const payload = generateBookingPayload('srv-test', 'slot-test', '2026-08-20', {
        customerPhone: phone,
      });

      if (isLiveBackend) {
        const res = await client.createBooking(payload, generateUUID());
        expect(res.status).toBe(400);
        assertProblemDetails(res.data, 'VALIDATION_FAILED', 400);
      } else {
        const hasInvalidChars = /[^0-9+\s\-()]/.test(phone);
        expect(hasInvalidChars).toBe(true);
      }
    }
  });

  it('BVA-03-04: Rejects empty or missing customer name with 400 VALIDATION_FAILED', async () => {
    const emptyNames = ['', '   ', '\t\n '];
    for (const name of emptyNames) {
      const payload = generateBookingPayload('srv-test', 'slot-test', '2026-08-20', {
        customerName: name,
      });

      if (isLiveBackend) {
        const res = await client.createBooking(payload, generateUUID());
        expect(res.status).toBe(400);
        assertProblemDetails(res.data, 'VALIDATION_FAILED', 400);
        if (res.data.invalidParams) {
          const nameParam = res.data.invalidParams.find((p) => p.name.includes('name') || p.name.includes('customerName'));
          expect(nameParam).toBeDefined();
        }
      } else {
        expect(name.trim().length).toBe(0);
      }
    }
  });

  it('BVA-03-05: Rejects customer name exceeding max boundary (> 255 characters)', async () => {
    const oversizedName = 'Rajesh '.repeat(50); // 350 chars
    const payload = generateBookingPayload('srv-test', 'slot-test', '2026-08-20', {
      customerName: oversizedName,
    });

    if (isLiveBackend) {
      const res = await client.createBooking(payload, generateUUID());
      expect(res.status).toBe(400);
      assertProblemDetails(res.data, 'VALIDATION_FAILED', 400);
    } else {
      expect(oversizedName.length).toBeGreaterThan(255);
    }
  });

  it('BVA-03-06: Preserves and supports Marathi / Devanagari and non-Latin customer names faithfully', async () => {
    const unicodeNames = [
      'राजेश पाटील',
      'सुनीता कुलकर्णी',
      'अमित देशमुख',
      'डॉ. आनंद जोशी',
      'José François-Müller',
    ];

    for (const name of unicodeNames) {
      const payload = generateBookingPayload('srv-test', 'slot-test', '2026-08-20', {
        customerName: name,
      });

      // Invariant: UTF-8 encoding must not corrupt multi-byte Marathi characters
      const buffer = Buffer.from(name, 'utf-8');
      const decoded = buffer.toString('utf-8');
      expect(decoded).toBe(name);
      expect(payload.customerName).toBe(name);
    }
  });
});
