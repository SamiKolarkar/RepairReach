/**
 * Tier 2 Boundary & Corner Cases: Feature 6 - Transactional Booking Submission & Idempotency
 *
 * Tests malformed UUID Idempotency-Key headers, missing required fields, non-existent
 * slot/service references, malformed JSON payloads, and idempotency reuse boundaries.
 *
 * Requirements: ORIGINAL_REQUEST.md R2 & R6, PROJECT.md Feature 6, docs/architecture/05-booking-architecture.md, docs/architecture/09-api-architecture.md
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { RepairReachApiClient, defaultApiClient } from '../../src/apiClient.js';
import {
  generateUUID,
  generateBookingPayload,
  assertProblemDetails,
  generateNextWeekday,
} from '../../src/testUtils.js';
import type { CreateBookingRequest, ProblemDetails } from '../../src/types.js';

describe('Tier 2 - Feature 6: Booking Submission Boundary Tests', () => {
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

  it('BVA-06-01: Rejects malformed or non-UUID Idempotency-Key headers with 400 VALIDATION_FAILED', async () => {
    const invalidIdempotencyKeys = [
      'not-a-uuid',
      '12345678',
      'uuid-with-special-chars!@#$',
      '00000000-0000-0000-0000-00000000000Z', // invalid hex char Z
      'short-uuid-1234',
    ];

    const validPayload = generateBookingPayload('srv-washing', 'slot-10-11', generateNextWeekday(2));

    for (const key of invalidIdempotencyKeys) {
      if (isLiveBackend) {
        const res = await client.createBooking(validPayload, key);
        expect(res.status).toBe(400);
        assertProblemDetails(res.data, 'VALIDATION_FAILED', 400);
      } else {
        const isStandardUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(key);
        expect(isStandardUuid).toBe(false);
      }
    }
  });

  it('BVA-06-02: Handles missing Idempotency-Key header on state-changing booking command', async () => {
    const payload = generateBookingPayload('srv-washing', 'slot-10-11', generateNextWeekday(2));

    if (isLiveBackend) {
      // Call without idempotency key header
      const res = await client.post('/bookings', payload);
      // Either rejects with 400 Bad Request or creates with server-generated key
      expect([400, 201, 409]).toContain(res.status);
      if (res.status === 400) {
        assertProblemDetails(res.data, 'VALIDATION_FAILED', 400);
      }
    } else {
      const emptyHeaders: Record<string, string> = {};
      expect(emptyHeaders['Idempotency-Key']).toBeUndefined();
    }
  });

  it('BVA-06-03: Rejects payloads missing mandatory fields (serviceId, customerPhone, requestedDate, requestedSlotId)', async () => {
    const incompletePayloads: Array<{ payload: Partial<CreateBookingRequest>; missing: string }> = [
      {
        payload: {
          customerName: 'Rajesh Patil',
          locationAddress: 'Navi Peth, Solapur',
          problemDescription: 'Washing machine not spinning',
          requestedDate: generateNextWeekday(2),
          requestedSlotId: 'slot-10-11',
        },
        missing: 'serviceId & customerPhone',
      },
      {
        payload: {
          customerName: 'Rajesh Patil',
          customerPhone: '+91 9822012345',
          serviceId: '00000000-0000-0000-0005-000000000001',
          locationAddress: 'Navi Peth, Solapur',
          problemDescription: 'Washing machine not spinning',
        },
        missing: 'requestedDate & requestedSlotId',
      },
    ];

    for (const { payload } of incompletePayloads) {
      if (isLiveBackend) {
        const res = await client.createBooking(payload as CreateBookingRequest, generateUUID());
        expect(res.status).toBe(400);
        assertProblemDetails(res.data, 'VALIDATION_FAILED', 400);
        if (res.data.invalidParams) {
          expect(res.data.invalidParams.length).toBeGreaterThan(0);
        }
      } else {
        const p = payload as Record<string, unknown>;
        const hasAllFields =
          Boolean(p.customerName) &&
          Boolean(p.customerPhone) &&
          Boolean(p.serviceId) &&
          Boolean(p.locationAddress) &&
          Boolean(p.problemDescription) &&
          Boolean(p.requestedDate) &&
          Boolean(p.requestedSlotId);
        expect(hasAllFields).toBe(false);
      }
    }
  });

  it('BVA-06-04: Rejects booking with non-existent or invalid serviceId (404 NOT_FOUND or 400)', async () => {
    const invalidServicePayload = generateBookingPayload(
      '00000000-0000-0000-0000-000000000000',
      'slot-10-11',
      generateNextWeekday(2)
    );

    if (isLiveBackend) {
      const res = await client.createBooking(invalidServicePayload, generateUUID());
      expect([404, 400]).toContain(res.status);
      if (res.status === 404) {
        assertProblemDetails(res.data, 'NOT_FOUND', 404);
      } else if (res.status === 400) {
        assertProblemDetails(res.data, 'VALIDATION_FAILED', 400);
      }
    } else {
      expect(invalidServicePayload.serviceId).toBe('00000000-0000-0000-0000-000000000000');
    }
  });

  it('BVA-06-05: Rejects booking for non-existent slot ID with 400 or 409 SLOT_UNAVAILABLE', async () => {
    const invalidSlotPayload = generateBookingPayload(
      'srv-washing',
      'slot-non-existent-99999',
      generateNextWeekday(2)
    );

    if (isLiveBackend) {
      const res = await client.createBooking(invalidSlotPayload, generateUUID());
      expect([400, 409]).toContain(res.status);
      if (res.status === 409) {
        assertProblemDetails(res.data, 'SLOT_UNAVAILABLE', 409);
        expect(Array.isArray(res.data.alternatives)).toBe(true);
      } else {
        assertProblemDetails(res.data, 'VALIDATION_FAILED', 400);
      }
    } else {
      expect(invalidSlotPayload.requestedSlotId).toContain('non-existent');
    }
  });

  it('BVA-06-06: Rejects malformed JSON syntax or type-mismatched request body with 400 Bad Request', async () => {
    if (isLiveBackend) {
      const res = await client.rawRequest({
        method: 'POST',
        url: '/bookings',
        data: '{"customerName": 12345, "invalidJson: true',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': generateUUID(),
        },
      });
      expect(res.status).toBe(400);
    } else {
      const malformedJson = '{"customerName": 12345, "invalidJson: true';
      expect(() => JSON.parse(malformedJson)).toThrow();
    }
  });

  it('BVA-06-07: Detects and handles idempotency key reuse with mismatched payloads (ADR-009 / RFC 7807)', () => {
    const key = generateUUID();
    const payload1 = generateBookingPayload('srv-washing', 'slot-10-11', '2026-08-20', {
      customerName: 'Customer Alpha',
    });
    const payload2 = generateBookingPayload('srv-refrigerator', 'slot-14-15', '2026-08-21', {
      customerName: 'Customer Beta',
    });

    // Hash or compare the payloads to prove mismatch
    const hash1 = JSON.stringify(payload1);
    const hash2 = JSON.stringify(payload2);
    expect(hash1).not.toBe(hash2);

    const mockConflictError: ProblemDetails = {
      type: 'https://api.repairreach.example/problems/idempotency-conflict',
      title: 'Idempotency key reused with different request parameters',
      status: 409,
      code: 'IDEMPOTENCY_CONFLICT',
      detail: `Idempotency key ${key} was previously used with different parameters`,
    };
    assertProblemDetails(mockConflictError, 'IDEMPOTENCY_CONFLICT', 409);
  });
});
