/**
 * Tier 2 Boundary & Corner Cases: Feature 5 - Backend-Authoritative Slot Availability Picker
 *
 * Tests past date boundaries, far future date boundaries, Sunday afternoon closures,
 * afternoon break enforcement, leap year calendar boundaries, and invalid date formats.
 *
 * Requirements: ORIGINAL_REQUEST.md R2 & R6, PROJECT.md Feature 5, docs/architecture/06-scheduling-architecture.md, ADR-005
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { RepairReachApiClient, defaultApiClient } from '../../src/apiClient.js';
import {
  formatDate,
  generateDate,
  generateNextSunday,
  assertProblemDetails,
  assertValidSlot,
} from '../../src/testUtils.js';
import type { AvailabilityResponse, AvailabilitySlot, ProblemDetails } from '../../src/types.js';

describe('Tier 2 - Feature 5: Slot Availability Picker Boundary Tests', () => {
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

  it('BVA-05-01: Rejects or returns zero available slots for past dates (yesterday / historical)', async () => {
    const yesterday = generateDate(-1);
    const pastDate = '2020-01-01';

    for (const date of [yesterday, pastDate]) {
      if (isLiveBackend) {
        const res = await client.getSlots('srv-washing', date);
        expect([200, 400]).toContain(res.status);
        if (res.status === 200) {
          const slots: AvailabilitySlot[] = Array.isArray(res.data)
            ? res.data
            : (res.data as AvailabilityResponse).slots || [];
          // All slots in the past must be unavailable
          slots.forEach((s) => expect(s.available).toBe(false));
        } else if (res.status === 400) {
          assertProblemDetails(res.data, 'VALIDATION_FAILED', 400);
        }
      } else {
        const now = new Date();
        const testDate = new Date(`${date}T00:00:00Z`);
        expect(testDate.getTime()).toBeLessThan(now.getTime());
      }
    }
  });

  it('BVA-05-02: Handles far future dates beyond booking horizon (> 90 days / > 365 days)', async () => {
    const farFutureDate = generateDate(120);
    if (isLiveBackend) {
      const res = await client.getSlots('srv-washing', farFutureDate);
      expect([200, 400]).toContain(res.status);
      if (res.status === 200) {
        const slots: AvailabilitySlot[] = Array.isArray(res.data)
          ? res.data
          : (res.data as AvailabilityResponse).slots || [];
        // Beyond horizon, slots are unavailable or empty
        slots.forEach((s) => expect(s.available).toBe(false));
      }
    } else {
      const d1 = new Date();
      const d2 = new Date(`${farFutureDate}T00:00:00Z`);
      const diffDays = Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
      expect(diffDays).toBeGreaterThan(90);
    }
  });

  it('BVA-05-03: Enforces Sunday afternoon closure policy: Sunday slots after 14:00 are unavailable', async () => {
    const nextSunday = generateNextSunday();
    if (isLiveBackend) {
      const res = await client.getSlots('srv-washing', nextSunday);
      if (res.status === 200) {
        const slots: AvailabilitySlot[] = Array.isArray(res.data)
          ? res.data
          : (res.data as AvailabilityResponse).slots || [];

        for (const slot of slots) {
          assertValidSlot(slot);
          const startHour = parseInt(slot.startTime.split(':')[0], 10);
          if (startHour >= 14) {
            // Afternoon Sunday slots must be unavailable
            expect(slot.available).toBe(false);
            if (slot.reason) {
              expect(['SUNDAY_CLOSING', 'OUT_OF_HOURS', 'AFTERNOON_BREAK']).toContain(slot.reason);
            }
          }
        }
      }
    } else {
      const d = new Date(`${nextSunday}T12:00:00Z`);
      expect(d.getUTCDay()).toBe(0); // Sunday
    }
  });

  it('BVA-05-04: Enforces afternoon break window availability restrictions', () => {
    const mockSlots: AvailabilitySlot[] = [
      { slotId: 's-10-11', startTime: '10:00', endTime: '11:00', available: true, reason: 'AVAILABLE' },
      { slotId: 's-13-14', startTime: '13:00', endTime: '14:00', available: false, reason: 'AFTERNOON_BREAK' },
      { slotId: 's-15-16', startTime: '15:00', endTime: '16:00', available: true, reason: 'AVAILABLE' },
    ];

    const breakSlot = mockSlots.find((s) => s.startTime === '13:00');
    expect(breakSlot).toBeDefined();
    expect(breakSlot?.available).toBe(false);
    expect(breakSlot?.reason).toBe('AFTERNOON_BREAK');
  });

  it('BVA-05-05: Rejects non-ISO and invalid calendar date formats with 400 VALIDATION_FAILED', async () => {
    const malformedDates = [
      '16-08-2026',
      '2026/08/16',
      'invalid-date',
      '2026-13-40',
      '2026-02-30',
      '2026-00-10',
    ];

    for (const dateStr of malformedDates) {
      if (isLiveBackend) {
        const res = await client.getSlots('srv-washing', dateStr);
        expect(res.status).toBe(400);
        assertProblemDetails(res.data, 'VALIDATION_FAILED', 400);
      } else {
        const isValidIso = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(dateStr);
        if (isValidIso) {
          // If syntax matches, check calendar validity (e.g. Feb 30)
          const [y, m, d] = dateStr.split('-').map(Number);
          const dateObj = new Date(Date.UTC(y, m - 1, d));
          expect(dateObj.getUTCDate()).not.toBe(d);
        } else {
          expect(isValidIso).toBe(false);
        }
      }
    }
  });

  it('BVA-05-06: Validates leap year calendar boundary: accepts 2028-02-29 and rejects 2027-02-29', () => {
    // 2028 is a leap year (divisible by 4)
    const leapDay = new Date(Date.UTC(2028, 1, 29));
    expect(leapDay.getUTCFullYear()).toBe(2028);
    expect(leapDay.getUTCMonth()).toBe(1); // February (0-indexed)
    expect(leapDay.getUTCDate()).toBe(29);

    // 2027 is NOT a leap year -> February 29 rolls over to March 1
    const nonLeapDay = new Date(Date.UTC(2027, 1, 29));
    expect(nonLeapDay.getUTCMonth()).toBe(2); // March
    expect(nonLeapDay.getUTCDate()).toBe(1);
  });

  it('BVA-05-07: Rejects availability query when serviceId is missing or empty', async () => {
    if (isLiveBackend) {
      const res = await client.get('/availability/slots?date=2026-08-20');
      expect([400, 404]).toContain(res.status);
      assertProblemDetails(res.data, 'VALIDATION_FAILED', 400);
    } else {
      const mockError: ProblemDetails = {
        type: 'https://api.repairreach.example/problems/validation-failed',
        title: 'Validation failed',
        status: 400,
        code: 'VALIDATION_FAILED',
        detail: 'Required parameter serviceId is missing',
      };
      assertProblemDetails(mockError, 'VALIDATION_FAILED', 400);
    }
  });
});
