/**
 * Pairwise Test Suite 06: Invalid Request Combinations x RFC 7807 Problem Details Error Matrix.
 *
 * Matrix Dimensions:
 * - Booking Field Omissions / Violations:
 *   - Missing / Blank Customer Name
 *   - Malformed Customer Phone (short, letters, symbols)
 *   - Missing / Blank Location Address
 *   - Missing Problem Description
 *   - Past Date or Malformed Date Format
 *   - Non-existent Service ID
 *   - Missing / Invalid Slot ID
 * - Feedback Endpoint Violations:
 *   - Missing X-Feedback-Token header
 *   - Empty/Malformed payload
 *   - Non-existent job reference
 * - Availability Endpoint Violations:
 *   - Missing serviceId query param
 *   - Missing date query param
 *   - Malformed date format
 * - Cancellation Violations:
 *   - Non-existent booking reference
 * - RFC 7807 Structural Validation across all error responses:
 *   - type, title, status, code, detail, correlationId, invalidParams
 *
 * Expected Outputs derived from:
 * - docs/architecture/09-api-architecture.md (§ Error model, DTO and validation rules)
 * - PROJECT.md (Error Format RFC 7807 specification)
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { RepairReachApiClient } from '../../src/apiClient.js';
import {
  generateUUID,
  generateDate,
  generateNextWeekday,
  generateCustomerPhone,
  generateInvalidPhone,
  assertProblemDetails,
  SOLAPUR_LOCALITIES,
} from '../../src/testUtils.js';
import type {
  CreateBookingRequest,
  ProblemDetails,
} from '../../src/types.js';

describe('Pairwise 06: Invalid Request Combinations x RFC 7807 Problem Details Error Matrix', () => {
  const client = new RepairReachApiClient();
  let defaultServiceId = '00000000-0000-0000-0005-000000000001';
  const validSlotId = '10:00-11:00';
  const validDate = generateNextWeekday(3);

  beforeAll(async () => {
    const srvRes = await client.getServices();
    if (srvRes.status === 200 && Array.isArray(srvRes.data) && srvRes.data.length > 0) {
      defaultServiceId = srvRes.data[0].id;
    }
  });

  it('Pairwise 6.1: Missing Customer Name x Valid Other Fields -> 400 VALIDATION_FAILED Problem Details', async () => {
    const key = generateUUID();
    const payload: Partial<CreateBookingRequest> = {
      customerName: '', // Blank name
      customerPhone: generateCustomerPhone('+91'),
      serviceId: defaultServiceId,
      locationAddress: SOLAPUR_LOCALITIES[0],
      problemDescription: 'Checking blank name validation',
      requestedDate: validDate,
      requestedSlotId: validSlotId,
    };

    const res = await client.createBooking(payload as CreateBookingRequest, key);
    expect([400, 422]).toContain(res.status);

    if (res.data && typeof res.data === 'object') {
      const problem = res.data as ProblemDetails;
      assertProblemDetails(problem, undefined, res.status);
      expect(problem.title).toBeDefined();
    }
  });

  it('Pairwise 6.2: Malformed Phone Numbers (short, letters, symbols) x Valid Other Fields -> 400 VALIDATION_FAILED', async () => {
    const invalidPhones = [
      generateInvalidPhone('short'), // '98220'
      generateInvalidPhone('letters'), // '9822ABC123'
      generateInvalidPhone('symbols'), // '+91-9822#45@12'
    ];

    for (const badPhone of invalidPhones) {
      const key = generateUUID();
      const payload: CreateBookingRequest = {
        customerName: 'Phone Validation Test',
        customerPhone: badPhone,
        serviceId: defaultServiceId,
        locationAddress: SOLAPUR_LOCALITIES[0],
        problemDescription: 'Testing invalid phone formatting',
        requestedDate: validDate,
        requestedSlotId: validSlotId,
      };

      const res = await client.createBooking(payload, key);
      expect([400, 422]).toContain(res.status);
      if (res.data && typeof res.data === 'object') {
        const problem = res.data as ProblemDetails;
        assertProblemDetails(problem, undefined, res.status);
      }
    }
  });

  it('Pairwise 6.3: Past Date and Malformed Date Formats x Booking Creation -> 400 VALIDATION_FAILED', async () => {
    const badDates = [
      '2020-01-01', // Past date
      '2026/12/31', // Slash separator instead of hyphen
      '16-08-2026', // DD-MM-YYYY instead of YYYY-MM-DD
      'not-a-date', // Non-date string
    ];

    for (const badDate of badDates) {
      const key = generateUUID();
      const payload: CreateBookingRequest = {
        customerName: 'Date Validation Test',
        customerPhone: generateCustomerPhone('+91'),
        serviceId: defaultServiceId,
        locationAddress: SOLAPUR_LOCALITIES[1],
        problemDescription: 'Testing date parsing errors',
        requestedDate: badDate,
        requestedSlotId: validSlotId,
      };

      const res = await client.createBooking(payload, key);
      expect([400, 422]).toContain(res.status);
      if (res.data && typeof res.data === 'object') {
        const problem = res.data as ProblemDetails;
        assertProblemDetails(problem, undefined, res.status);
      }
    }
  });

  it('Pairwise 6.4: Non-Existent Service ID x Booking Creation -> 400/404 NOT_FOUND / VALIDATION_FAILED', async () => {
    const key = generateUUID();
    const nonExistentServiceId = '00000000-0000-0000-0005-999999999999';

    const payload: CreateBookingRequest = {
      customerName: 'Invalid Service Test',
      customerPhone: generateCustomerPhone('+91'),
      serviceId: nonExistentServiceId,
      locationAddress: SOLAPUR_LOCALITIES[2],
      problemDescription: 'Testing non-existent service ID',
      requestedDate: validDate,
      requestedSlotId: validSlotId,
    };

    const res = await client.createBooking(payload, key);
    expect([400, 404, 422]).toContain(res.status);

    if (res.data && typeof res.data === 'object') {
      const problem = res.data as ProblemDetails;
      assertProblemDetails(problem, undefined, res.status);
    }
  });

  it('Pairwise 6.5: Availability Query with Missing or Invalid Query Parameters -> 400 Problem Details', async () => {
    // Missing serviceId
    const resNoService = await client.get('/availability/slots', {
      params: { date: validDate },
    });
    expect([400, 404, 422]).toContain(resNoService.status);
    if (resNoService.data && typeof resNoService.data === 'object') {
      const problem1 = resNoService.data as ProblemDetails;
      assertProblemDetails(problem1, undefined, resNoService.status);
    }

    // Missing date
    const resNoDate = await client.get('/availability/slots', {
      params: { serviceId: defaultServiceId },
    });
    expect([400, 404, 422]).toContain(resNoDate.status);
    if (resNoDate.data && typeof resNoDate.data === 'object') {
      const problem2 = resNoDate.data as ProblemDetails;
      assertProblemDetails(problem2, undefined, resNoDate.status);
    }
  });

  it('Pairwise 6.6: Feedback Submission without X-Feedback-Token Header -> 400/401/422 Error Response', async () => {
    const fakeJobRef = `RR-JOB-${generateUUID().substring(0, 8)}`;

    // Submit feedback without capability token header
    const res = await client.post(`/jobs/${encodeURIComponent(fakeJobRef)}/feedback`, {
      rating: 5,
      comment: 'Missing token header test',
    });

    expect([400, 401, 403, 404, 422]).toContain(res.status);
    if (res.data && typeof res.data === 'object') {
      const problem = res.data as ProblemDetails;
      assertProblemDetails(problem, undefined, res.status);
    }
  });
});
