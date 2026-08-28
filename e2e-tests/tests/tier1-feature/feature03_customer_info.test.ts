/**
 * Tier 1 Feature Coverage: Feature 03 - Customer Information Capture & Validation
 * Specification: ORIGINAL_REQUEST.md (R2), PROJECT.md (§ Interface Contracts), docs/architecture/09-api-architecture.md
 *
 * Verifies customer full name and phone number validation, Indian phone format checking,
 * length constraints, and RFC 7807 validation error reporting.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { RepairReachApiClient } from '../../src/apiClient.js';
import {
  generateUUID,
  generateCustomerPhone,
  generateInvalidPhone,
  generateDate,
  generateBookingPayload,
  assertProblemDetails,
} from '../../src/testUtils.js';
import type { CreateBookingRequest, ServiceCatalogItem, ProblemDetails } from '../../src/types.js';

describe('Feature 03: Customer Information Capture & Validation', () => {
  let apiClient: RepairReachApiClient;
  let testServiceId: string;
  let testSlotId: string;
  let testDate: string;

  beforeAll(async () => {
    apiClient = new RepairReachApiClient();
    testDate = generateDate(3);

    // Fetch a real service ID to use in validation tests
    const servicesRes = await apiClient.getServices();
    if (servicesRes.status === 200 && Array.isArray(servicesRes.data) && servicesRes.data.length > 0) {
      testServiceId = (servicesRes.data as ServiceCatalogItem[])[0].id;
    } else {
      testServiceId = '00000000-0000-0000-0005-000000000001';
    }

    testSlotId = 'slot-10-11';
  });

  it('3.1 should accept booking payload with valid customer name and 10-digit Indian phone number', async () => {
    const validPhone = generateCustomerPhone('+91');
    const payload = generateBookingPayload(testServiceId, testSlotId, testDate, {
      customerName: 'Rajesh Patil',
      customerPhone: validPhone,
    });

    const idempotencyKey = generateUUID();
    const res = await apiClient.createBooking(payload, idempotencyKey);

    // Should either succeed (201) or fail on slot availability (409), but NOT fail on validation (400)
    expect(res.status).not.toBe(400);
    if (res.status === 400) {
      const pd = res.data as ProblemDetails;
      expect(pd.code).not.toBe('VALIDATION_FAILED');
    }
  });

  it('3.2 should reject booking payload with empty or missing customer name with HTTP 400 ProblemDetails', async () => {
    const payload = generateBookingPayload(testServiceId, testSlotId, testDate, {
      customerName: '',
    });

    const idempotencyKey = generateUUID();
    const res = await apiClient.createBooking(payload, idempotencyKey);

    expect(res.status).toBe(400);
    const pd = res.data as ProblemDetails;
    assertProblemDetails(pd, 'VALIDATION_FAILED', 400);
  });

  it('3.3 should reject booking payload with invalid short phone number with HTTP 400 ProblemDetails', async () => {
    const shortPhone = generateInvalidPhone('short'); // e.g. '98220'
    const payload = generateBookingPayload(testServiceId, testSlotId, testDate, {
      customerPhone: shortPhone,
    });

    const idempotencyKey = generateUUID();
    const res = await apiClient.createBooking(payload, idempotencyKey);

    expect(res.status).toBe(400);
    const pd = res.data as ProblemDetails;
    assertProblemDetails(pd, 'VALIDATION_FAILED', 400);
  });

  it('3.4 should reject booking payload with alphanumeric / corrupted phone number with HTTP 400 ProblemDetails', async () => {
    const corruptedPhone = generateInvalidPhone('letters'); // e.g. '9822ABC123'
    const payload = generateBookingPayload(testServiceId, testSlotId, testDate, {
      customerPhone: corruptedPhone,
    });

    const idempotencyKey = generateUUID();
    const res = await apiClient.createBooking(payload, idempotencyKey);

    expect(res.status).toBe(400);
    const pd = res.data as ProblemDetails;
    assertProblemDetails(pd, 'VALIDATION_FAILED', 400);
  });

  it('3.5 should reject booking payload with excessively long phone number with HTTP 400 ProblemDetails', async () => {
    const tooLongPhone = generateInvalidPhone('too_long'); // e.g. '98220123456789012'
    const payload = generateBookingPayload(testServiceId, testSlotId, testDate, {
      customerPhone: tooLongPhone,
    });

    const idempotencyKey = generateUUID();
    const res = await apiClient.createBooking(payload, idempotencyKey);

    expect(res.status).toBe(400);
    const pd = res.data as ProblemDetails;
    assertProblemDetails(pd, 'VALIDATION_FAILED', 400);
  });

  it('3.6 should accept customer names containing standard unicode characters, apostrophes, and spaces', async () => {
    const validNames = [
      "Dr. Ramesh D'souza",
      'Priya Sharma-Kulkarni',
      'Amitabh Deshmukh Rao',
    ];

    for (const name of validNames) {
      const payload = generateBookingPayload(testServiceId, testSlotId, testDate, {
        customerName: name,
        customerPhone: generateCustomerPhone('+91'),
      });

      const res = await apiClient.createBooking(payload, generateUUID());
      expect(res.status).not.toBe(400);
    }
  });
});
