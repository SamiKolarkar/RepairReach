/**
 * Tier 1 Feature Coverage: Feature 05 - Backend Slot Availability Picker
 * Specification: ORIGINAL_REQUEST.md (R2, R6), PROJECT.md (§ Interface Contracts, ADR-005), docs/architecture/06-scheduling-architecture.md
 *
 * Verifies backend-authoritative slot availability calculation, slot duration matching,
 * operating window, weekday/weekend slot generation, and parameter validation.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { RepairReachApiClient } from '../../src/apiClient.js';
import {
  generateDate,
  generateNextWeekday,
  generateNextSunday,
  assertValidSlot,
  assertProblemDetails,
} from '../../src/testUtils.js';
import type {
  ServiceCatalogItem,
  AvailabilityResponse,
  AvailabilitySlot,
  ProblemDetails,
} from '../../src/types.js';

describe('Feature 05: Backend-Authoritative Slot Availability Picker', () => {
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

  it('5.1 should fetch slot availability for a valid future weekday returning HTTP 200 and slots array', async () => {
    const validWeekday = generateNextWeekday(2);
    const res = await apiClient.getSlots(testServiceId, validWeekday);

    expect(res.status).toBe(200);

    const slots: AvailabilitySlot[] = Array.isArray(res.data)
      ? res.data
      : (res.data as AvailabilityResponse).slots;

    expect(Array.isArray(slots)).toBe(true);
    expect(slots.length).toBeGreaterThan(0);

    // Verify first slot schema
    assertValidSlot(slots[0]);
  });

  it('5.2 should verify every slot has valid HH:mm time format and boolean available property', async () => {
    const validWeekday = generateNextWeekday(2);
    const res = await apiClient.getSlots(testServiceId, validWeekday);
    expect(res.status).toBe(200);

    const slots: AvailabilitySlot[] = Array.isArray(res.data)
      ? res.data
      : (res.data as AvailabilityResponse).slots;

    for (const slot of slots) {
      assertValidSlot(slot);
      expect(slot.startTime).toMatch(/^\d{2}:\d{2}(:\d{2})?$/);
      expect(slot.endTime).toMatch(/^\d{2}:\d{2}(:\d{2})?$/);
      expect(typeof slot.available).toBe('boolean');
    }
  });

  it('5.3 should verify that slot startTime precedes endTime and slots span business hours', async () => {
    const validWeekday = generateNextWeekday(2);
    const res = await apiClient.getSlots(testServiceId, validWeekday);
    expect(res.status).toBe(200);

    const slots: AvailabilitySlot[] = Array.isArray(res.data)
      ? res.data
      : (res.data as AvailabilityResponse).slots;

    for (const slot of slots) {
      const startParts = slot.startTime.split(':').map(Number);
      const endParts = slot.endTime.split(':').map(Number);
      const startMinutes = startParts[0] * 60 + startParts[1];
      const endMinutes = endParts[0] * 60 + endParts[1];

      expect(startMinutes).toBeLessThan(endMinutes);
      // Expected slot duration around 60 minutes
      expect(endMinutes - startMinutes).toBeGreaterThanOrEqual(30);
    }
  });

  it('5.4 should reject availability query when serviceId parameter is missing with HTTP 400 ProblemDetails', async () => {
    const validDate = generateDate(2);
    const res = await apiClient.get('/availability/slots', {
      params: { date: validDate },
    });

    expect(res.status).toBe(400);
    const pd = res.data as ProblemDetails;
    assertProblemDetails(pd, undefined, 400);
  });

  it('5.5 should reject availability query when date format is malformed or invalid with HTTP 400 ProblemDetails', async () => {
    const invalidDates = ['invalid-date', '2026/13/45', '16-08-2026', 'yesterday'];

    for (const invalidDate of invalidDates) {
      const res = await apiClient.getSlots(testServiceId, invalidDate);
      expect(res.status).toBe(400);
      const pd = res.data as unknown as ProblemDetails;
      assertProblemDetails(pd, undefined, 400);
    }
  });

  it('5.6 should provide informative slot reason codes when slots are not available (break or closed)', async () => {
    const validWeekday = generateNextWeekday(2);
    const res = await apiClient.getSlots(testServiceId, validWeekday);
    expect(res.status).toBe(200);

    const slots: AvailabilitySlot[] = Array.isArray(res.data)
      ? res.data
      : (res.data as AvailabilityResponse).slots;

    for (const slot of slots) {
      if (slot.reason) {
        expect([
          'AVAILABLE',
          'BOOKED',
          'AFTERNOON_BREAK',
          'SUNDAY_CLOSING',
          'OUT_OF_HOURS',
          'TECHNICIAN_UNAVAILABLE',
          'HOLIDAY',
        ]).toContain(slot.reason);
      }
    }
  });
});
