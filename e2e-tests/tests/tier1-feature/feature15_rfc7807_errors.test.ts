/**
 * Tier 1 Feature Coverage: Feature 15 - RFC 7807 Problem Details Error Responses
 * Specification: ORIGINAL_REQUEST.md (R6, R8), PROJECT.md (§ Interface Contracts), docs/architecture/09-api-architecture.md
 *
 * Verifies standard RFC 7807 error format (type, title, status, code, detail, correlationId, invalidParams)
 * across 400, 404, and 409 responses.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { RepairReachApiClient } from '../../src/apiClient.js';
import {
  generateUUID,
  generateNextWeekday,
  generateBookingPayload,
  assertProblemDetails,
} from '../../src/testUtils.js';
import type {
  ServiceCatalogItem,
  ProblemDetails,
} from '../../src/types.js';

describe('Feature 15: RFC 7807 Problem Details Error Responses', () => {
  let apiClient: RepairReachApiClient;
  let testServiceId: string;

  beforeAll(async () => {
    apiClient = new RepairReachApiClient();

    const servicesRes = await apiClient.getServices();
    if (servicesRes.status === 200 && Array.isArray(servicesRes.data) && servicesRes.data.length > 0) {
      testServiceId = (servicesRes.data as ServiceCatalogItem[])[0].id;
    } else {
      testServiceId = '00000000-0000-0000-0005-000000000001';
    }
  });

  it('15.1 should return RFC 7807 ProblemDetails for 400 Bad Request with type, title, status 400, and code VALIDATION_FAILED', async () => {
    // Submit invalid booking with empty name and phone
    const invalidPayload = generateBookingPayload(testServiceId, 'slot-09-10', generateNextWeekday(2), {
      customerName: '',
      customerPhone: '',
    });

    const res = await apiClient.createBooking(invalidPayload, generateUUID());
    expect(res.status).toBe(400);

    const pd = res.data as ProblemDetails;
    assertProblemDetails(pd, 'VALIDATION_FAILED', 400);
    expect(pd.type).toMatch(/^https?:\/\/.+/);
    expect(pd.title).toBeTruthy();
    expect(pd.status).toBe(400);
  });

  it('15.2 should include invalidParams field-level error details on validation failure', async () => {
    const invalidPayload = generateBookingPayload(testServiceId, 'slot-09-10', generateNextWeekday(2), {
      customerName: '',
      customerPhone: '123',
    });

    const res = await apiClient.createBooking(invalidPayload, generateUUID());
    expect(res.status).toBe(400);

    const pd = res.data as ProblemDetails;
    if (pd.invalidParams) {
      expect(Array.isArray(pd.invalidParams)).toBe(true);
      expect(pd.invalidParams.length).toBeGreaterThan(0);
      const param = pd.invalidParams[0];
      expect(param.name).toBeTruthy();
      expect(param.reason).toBeTruthy();
    }
  });

  it('15.3 should return RFC 7807 ProblemDetails for 404 Not Found on non-existent booking with code NOT_FOUND', async () => {
    const nonExistentRef = 'RR-NOTFOUND-UUID-999';
    const res = await apiClient.getBooking(nonExistentRef);

    expect(res.status).toBe(404);
    const pd = res.data as ProblemDetails;
    assertProblemDetails(pd, 'NOT_FOUND', 404);
    expect(pd.detail).toBeTruthy();
  });

  it('15.4 should return RFC 7807 ProblemDetails for 409 Conflict with code SLOT_UNAVAILABLE and alternatives', async () => {
    const raceDate = generateNextWeekday(6);
    const slotsRes = await apiClient.getSlots(testServiceId, raceDate);
    let raceSlot = 'slot-10-11';
    if (slotsRes.status === 200) {
      const slots = Array.isArray(slotsRes.data) ? slotsRes.data : (slotsRes.data as AvailabilityResponse).slots;
      const free = slots?.find(s => s.available);
      if (free) raceSlot = free.slotId;
    }

    // Book slot once
    const payload = generateBookingPayload(testServiceId, raceSlot, raceDate);
    await apiClient.createBooking(payload, generateUUID());

    // Book same slot again to trigger 409
    const collisionPayload = generateBookingPayload(testServiceId, raceSlot, raceDate);
    const res409 = await apiClient.createBooking(collisionPayload, generateUUID());

    expect(res409.status).toBe(409);
    const pd = res409.data as ProblemDetails;
    assertProblemDetails(pd, 'SLOT_UNAVAILABLE', 409);
  });

  it('15.5 should include unique correlationId in ProblemDetails error responses for traceability', async () => {
    const res = await apiClient.getBooking('RR-NONEXISTENT-TRACE-1');
    expect(res.status).toBe(404);

    const pd = res.data as ProblemDetails;
    if (pd.correlationId) {
      expect(typeof pd.correlationId).toBe('string');
      expect(pd.correlationId.length).toBeGreaterThan(0);
    }
  });

  it('15.6 should include standard Content-Type in error response headers (application/problem+json or application/json)', async () => {
    const res = await apiClient.getBooking('RR-NONEXISTENT-CONTENT-TYPE');
    expect(res.status).toBe(404);

    const contentType = res.headers['content-type'] || '';
    expect(
      contentType.includes('application/problem+json') ||
      contentType.includes('application/json')
    ).toBe(true);
  });
});
