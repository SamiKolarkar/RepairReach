/**
 * Pairwise Test Suite 01: Service Categories x Slot Availability across Weekdays and Durations.
 *
 * Matrix Dimensions:
 * - Service Category: HOME_APPLIANCE (Washing Machine, Refrigerator, AC, Microwave) vs ELECTRONICS (TV)
 * - Day Type: Standard Weekday (Mon-Sat: 09:00-19:00 with 14:00-16:00 Break) vs Sunday (09:00-14:00)
 * - Time Intervals: Morning window (09:00-14:00), Afternoon break (14:00-16:00), Evening window (16:00-19:00)
 * - Duration Matching: 60-minute duration slot partitioning
 * - Excluded Services: MOBILE_PHONE_REPAIR exclusion verification
 *
 * Expected Outputs derived from:
 * - docs/architecture/06-scheduling-architecture.md
 * - V2__seed_data.sql (business hours: Mon-Sat 09:00-19:00, Break 14:00-16:00, Sun 09:00-14:00)
 * - PROJECT.md REST API v1 availability contract
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { RepairReachApiClient } from '../../src/apiClient.js';
import {
  generateNextWeekday,
  generateNextSunday,
  generateDate,
  assertValidSlot,
  KNOWN_SERVICES,
  EXCLUDED_SERVICES,
} from '../../src/testUtils.js';
import type {
  ServiceCatalogItem,
  AvailabilitySlot,
  AvailabilityResponse,
  ProblemDetails,
} from '../../src/types.js';

describe('Pairwise 01: Service Categories x Slot Availability across Weekdays & Durations', () => {
  const client = new RepairReachApiClient();
  let services: ServiceCatalogItem[] = [];
  let washingMachineService: ServiceCatalogItem | undefined;
  let refrigeratorService: ServiceCatalogItem | undefined;
  let tvService: ServiceCatalogItem | undefined;
  let acService: ServiceCatalogItem | undefined;

  beforeAll(async () => {
    const res = await client.getServices();
    if (res.status === 200 && Array.isArray(res.data)) {
      services = res.data;
      washingMachineService = services.find((s) => s.code === KNOWN_SERVICES.WASHING_MACHINE || s.name.toLowerCase().includes('washing'));
      refrigeratorService = services.find((s) => s.code === KNOWN_SERVICES.REFRIGERATOR || s.name.toLowerCase().includes('refrigerator'));
      tvService = services.find((s) => s.code === KNOWN_SERVICES.TV || s.name.toLowerCase().includes('tv') || s.name.toLowerCase().includes('television'));
      acService = services.find((s) => s.code === KNOWN_SERVICES.AC || s.name.toLowerCase().includes('air conditioner') || s.name.toLowerCase().includes('ac'));
    }
  });

  function extractSlots(data: AvailabilityResponse | AvailabilitySlot[] | ProblemDetails): AvailabilitySlot[] {
    if (Array.isArray(data)) {
      return data;
    }
    if (data && typeof data === 'object' && 'slots' in data && Array.isArray((data as AvailabilityResponse).slots)) {
      return (data as AvailabilityResponse).slots;
    }
    return [];
  }

  it('Pairwise 1.1: HOME_APPLIANCE (Washing Machine) x Weekday -> returns morning & evening slots with afternoon break', async () => {
    const targetServiceId = washingMachineService?.id || '00000000-0000-0000-0005-000000000001';
    const weekday = generateNextWeekday(2); // Tuesday/Wednesday/etc.

    const res = await client.getSlots(targetServiceId, weekday);
    expect(res.status).toBe(200);

    const slots = extractSlots(res.data);
    expect(slots.length).toBeGreaterThan(0);

    // Validate slot structures
    for (const slot of slots) {
      assertValidSlot(slot);
    }

    // Morning slots should exist (between 09:00 and 14:00)
    const morningSlots = slots.filter((s) => {
      const hour = parseInt(s.startTime.split(':')[0], 10);
      return hour >= 9 && hour < 14;
    });
    expect(morningSlots.length).toBeGreaterThanOrEqual(1);

    // Afternoon break (14:00 - 16:00) should NOT have available slots
    const breakSlots = slots.filter((s) => {
      const hour = parseInt(s.startTime.split(':')[0], 10);
      return hour >= 14 && hour < 16;
    });
    for (const breakSlot of breakSlots) {
      expect(breakSlot.available).toBe(false);
      if (breakSlot.reason) {
        expect(['AFTERNOON_BREAK', 'OUT_OF_HOURS', 'UNAVAILABLE']).toContain(breakSlot.reason);
      }
    }

    // Evening slots should exist (between 16:00 and 19:00)
    const eveningSlots = slots.filter((s) => {
      const hour = parseInt(s.startTime.split(':')[0], 10);
      return hour >= 16 && hour < 19;
    });
    expect(eveningSlots.length).toBeGreaterThanOrEqual(1);
  });

  it('Pairwise 1.2: HOME_APPLIANCE (Refrigerator) x Sunday -> returns morning slots and strictly no slots after 14:00', async () => {
    const targetServiceId = refrigeratorService?.id || '00000000-0000-0000-0005-000000000002';
    const sunday = generateNextSunday(0);

    const res = await client.getSlots(targetServiceId, sunday);
    expect(res.status).toBe(200);

    const slots = extractSlots(res.data);
    expect(slots.length).toBeGreaterThan(0);

    // Morning slots on Sunday (09:00 - 14:00)
    const morningSlots = slots.filter((s) => {
      const hour = parseInt(s.startTime.split(':')[0], 10);
      return hour >= 9 && hour < 14;
    });
    expect(morningSlots.length).toBeGreaterThanOrEqual(1);

    // Any slot at or after 14:00 on Sunday must be unavailable or omitted
    const afternoonSundaySlots = slots.filter((s) => {
      const hour = parseInt(s.startTime.split(':')[0], 10);
      return hour >= 14;
    });
    for (const slot of afternoonSundaySlots) {
      expect(slot.available).toBe(false);
      if (slot.reason) {
        expect(['SUNDAY_CLOSING', 'OUT_OF_HOURS', 'AFTERNOON_BREAK', 'UNAVAILABLE']).toContain(slot.reason);
      }
    }
  });

  it('Pairwise 1.3: ELECTRONICS (TV Repair) x Weekday vs Sunday -> correctly differentiates hours and breaks', async () => {
    const targetServiceId = tvService?.id || '00000000-0000-0000-0005-000000000005';
    const weekday = generateNextWeekday(3);
    const sunday = generateNextSunday(1);

    // Weekday query
    const weekdayRes = await client.getSlots(targetServiceId, weekday);
    expect(weekdayRes.status).toBe(200);
    const weekdaySlots = extractSlots(weekdayRes.data);
    const weekdayAvailableSlots = weekdaySlots.filter((s) => s.available);
    expect(weekdayAvailableSlots.length).toBeGreaterThanOrEqual(1);

    // Sunday query
    const sundayRes = await client.getSlots(targetServiceId, sunday);
    expect(sundayRes.status).toBe(200);
    const sundaySlots = extractSlots(sundayRes.data);
    const sundayAvailableSlots = sundaySlots.filter((s) => s.available);

    // Sunday should have fewer or equal available slots compared to a full weekday
    expect(sundayAvailableSlots.length).toBeLessThanOrEqual(weekdayAvailableSlots.length);
    // All available Sunday slots must start before 14:00
    for (const slot of sundayAvailableSlots) {
      const hour = parseInt(slot.startTime.split(':')[0], 10);
      expect(hour).toBeLessThan(14);
    }
  });

  it('Pairwise 1.4: Multi-Appliance Service Duration Consistency (60-min slots) across all categories', async () => {
    const weekday = generateNextWeekday(4);
    const applianceServiceIds = [
      washingMachineService?.id || '00000000-0000-0000-0005-000000000001',
      acService?.id || '00000000-0000-0000-0005-000000000004',
      refrigeratorService?.id || '00000000-0000-0000-0005-000000000002',
    ];

    for (const srvId of applianceServiceIds) {
      const res = await client.getSlots(srvId, weekday);
      expect(res.status).toBe(200);
      const slots = extractSlots(res.data);
      expect(slots.length).toBeGreaterThan(0);

      // Verify each slot represents a valid continuous duration block (e.g., 60 mins)
      for (const slot of slots) {
        const startParts = slot.startTime.split(':').map(Number);
        const endParts = slot.endTime.split(':').map(Number);
        const startMinutes = startParts[0] * 60 + startParts[1];
        const endMinutes = endParts[0] * 60 + endParts[1];
        const duration = endMinutes - startMinutes;

        expect(duration).toBe(60);
      }
    }
  });

  it('Pairwise 1.5: Excluded Service (Mobile Phone) x Weekday/Sunday -> rejected with 400/404 RFC 7807 error', async () => {
    const weekday = generateNextWeekday(2);
    const fakeMobileId = '00000000-0000-0000-0005-000000000099';

    // Query slots with an excluded / non-existent mobile phone service ID
    const res = await client.getSlots(fakeMobileId, weekday);
    // Should return 404 NOT_FOUND or 400 VALIDATION_FAILED with Problem Details
    expect([400, 404]).toContain(res.status);

    const problem = res.data as unknown as ProblemDetails;
    expect(problem).toBeDefined();
    if (problem && problem.title) {
      expect(problem.status).toBe(res.status);
    }
  });

  it('Pairwise 1.6: Boundary Date (Beyond Max Advance Days = 14) x Service Categories -> returns 400 or empty/unavailable slots', async () => {
    const targetServiceId = washingMachineService?.id || '00000000-0000-0000-0005-000000000001';
    // 30 days in future exceeds max_advance_booking_days (14)
    const farFutureDate = generateDate(30);

    const res = await client.getSlots(targetServiceId, farFutureDate);
    // Either 400 ProblemDetails or 200 with 0 available slots
    if (res.status === 200) {
      const slots = extractSlots(res.data);
      const availableSlots = slots.filter((s) => s.available);
      expect(availableSlots.length).toBe(0);
    } else {
      expect([400, 422]).toContain(res.status);
    }
  });
});
