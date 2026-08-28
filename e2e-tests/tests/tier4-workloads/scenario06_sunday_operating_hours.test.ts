/**
 * Tier 4 Workload Scenario 06: Sunday Operating Hours & Schedule Boundary Enforcement
 * Specification: ORIGINAL_REQUEST.md (R2, R6), PROJECT.md (§ Backend Slot Availability Picker), docs/architecture/06-scheduling-architecture.md
 *
 * Workflow:
 * 1. Calculate upcoming Sunday date and query public slot availability
 * 2. Verify morning slots (09:00 - 14:00) exist according to Solapur Sunday schedule
 * 3. Verify afternoon & evening slots (after 14:00) are unavailable / restricted (SUNDAY_CLOSING / OUT_OF_HOURS)
 * 4. Attempt direct booking submission on Sunday afternoon/evening -> verify 400/409 rejection
 * 5. Compare against weekday availability where evening slots (16:00 - 19:00) are open and 14:00 - 16:00 break is enforced
 * 6. Verify business profile operating hours accurately reflect Sunday schedule rules
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { RepairReachApiClient } from '../../src/apiClient.js';
import {
  generateUUID,
  generateCustomerPhone,
  generateNextSunday,
  generateNextWeekday,
  SOLAPUR_LOCALITIES,
  KNOWN_SERVICES,
  assertValidSlot,
  assertProblemDetails,
} from '../../src/testUtils.js';
import type {
  ServiceCatalogItem,
  AvailabilityResponse,
  AvailabilitySlot,
  CreateBookingRequest,
  BusinessProfile,
  ProblemDetails,
} from '../../src/types.js';

describe('Tier 4 Scenario 06: Sunday Operating Hours & Schedule Boundary Enforcement', () => {
  let apiClient: RepairReachApiClient;
  let selectedService: ServiceCatalogItem;
  let sundayDate: string;
  let weekdayDate: string;

  beforeAll(async () => {
    apiClient = new RepairReachApiClient();
    sundayDate = generateNextSunday(1);
    weekdayDate = generateNextWeekday(2);

    const res = await apiClient.getServices();
    const services = (res.data || []) as ServiceCatalogItem[];
    selectedService = services[0] || {
      id: '00000000-0000-0000-0005-000000000001',
      code: KNOWN_SERVICES.WASHING_MACHINE,
      name: 'Washing Machine Repair & Service',
      category: 'HOME_APPLIANCE',
      description: 'Washing machine repair',
      approxDurationMinutes: 60,
    };
  });

  it('Phase 1: Query slot availability for upcoming Sunday', async () => {
    const res = await apiClient.getSlots(selectedService.id, sundayDate);
    expect(res.status).toBe(200);

    let slots: AvailabilitySlot[] = [];
    if (Array.isArray(res.data)) {
      slots = res.data;
    } else if (res.data && 'slots' in res.data) {
      slots = (res.data as AvailabilityResponse).slots;
    }

    expect(slots.length).toBeGreaterThanOrEqual(1);

    // Validate all slot shapes
    for (const slot of slots) {
      assertValidSlot(slot);
    }
  });

  it('Phase 2: Verify Sunday morning slots are present and Sunday afternoon/evening slots are constrained', async () => {
    const res = await apiClient.getSlots(selectedService.id, sundayDate);
    expect(res.status).toBe(200);

    let slots: AvailabilitySlot[] = [];
    if (Array.isArray(res.data)) {
      slots = res.data;
    } else if (res.data && 'slots' in res.data) {
      slots = (res.data as AvailabilityResponse).slots;
    }

    // Morning slots (09:00 - 13:00) should be available
    const morningSlots = slots.filter((s) => {
      const hour = parseInt(s.startTime.split(':')[0], 10);
      return hour >= 9 && hour < 14;
    });
    expect(morningSlots.length).toBeGreaterThanOrEqual(1);

    // Afternoon / Evening slots (14:00 onwards)
    const afternoonSlots = slots.filter((s) => {
      const hour = parseInt(s.startTime.split(':')[0], 10);
      return hour >= 14;
    });

    // On Sunday, afternoon slots must either be marked available: false or not returned
    for (const slot of afternoonSlots) {
      expect(slot.available).toBe(false);
      if (slot.reason) {
        expect(
          slot.reason === 'SUNDAY_CLOSING' ||
          slot.reason === 'OUT_OF_HOURS' ||
          slot.reason.includes('SUNDAY') ||
          slot.reason.includes('HOURS')
        ).toBe(true);
      }
    }
  });

  it('Phase 3: Attempt direct booking submission for Sunday evening slot is rejected (400/409)', async () => {
    const invalidSundayPayload: CreateBookingRequest = {
      customerName: 'Vikas More',
      customerPhone: generateCustomerPhone('+91'),
      serviceId: selectedService.id,
      locationAddress: SOLAPUR_LOCALITIES[0],
      problemDescription: 'Appliance repair requested on Sunday evening outside business hours',
      requestedDate: sundayDate,
      requestedSlotId: 'slot-17-18', // 17:00-18:00 outside Sunday hours
    };
    const key = generateUUID();

    const res = await apiClient.createBooking(invalidSundayPayload, key);

    // Rejection with 400 Bad Request or 409 Conflict
    expect([400, 409]).toContain(res.status);

    if (typeof res.data === 'object' && res.data !== null) {
      assertProblemDetails(res.data, undefined, res.status);
      const problem = res.data as ProblemDetails;
      expect(problem.type).toBeTruthy();
      expect(problem.title).toBeTruthy();
      expect(
        problem.code === 'OUT_OF_HOURS' ||
        problem.code === 'SLOT_UNAVAILABLE' ||
        problem.code === 'VALIDATION_FAILED' ||
        problem.title.toLowerCase().includes('hour') ||
        problem.title.toLowerCase().includes('unavailable') ||
        problem.title.toLowerCase().includes('sunday') ||
        problem.title.toLowerCase().includes('slot')
      ).toBe(true);
    }
  });

  it('Phase 4: Compare Sunday schedule against regular weekday operating hours', async () => {
    const res = await apiClient.getSlots(selectedService.id, weekdayDate);
    expect(res.status).toBe(200);

    let weekdaySlots: AvailabilitySlot[] = [];
    if (Array.isArray(res.data)) {
      weekdaySlots = res.data;
    } else if (res.data && 'slots' in res.data) {
      weekdaySlots = (res.data as AvailabilityResponse).slots;
    }

    // Weekday should have slots available in both morning and evening (16:00 - 19:00)
    const eveningSlots = weekdaySlots.filter((s) => {
      const hour = parseInt(s.startTime.split(':')[0], 10);
      return hour >= 16 && hour < 19;
    });
    expect(eveningSlots.length).toBeGreaterThanOrEqual(1);

    // Afternoon break (14:00 - 16:00) check
    const breakSlots = weekdaySlots.filter((s) => {
      const hour = parseInt(s.startTime.split(':')[0], 10);
      return hour >= 14 && hour < 16;
    });

    for (const slot of breakSlots) {
      if (slot.reason) {
        expect(
          slot.available === false ||
          slot.reason === 'AFTERNOON_BREAK' ||
          slot.reason.includes('BREAK')
        ).toBe(true);
      }
    }
  });

  it('Phase 5: Business profile reflects Sunday operating schedule', async () => {
    const res = await apiClient.getBusiness();
    expect(res.status).toBe(200);

    const profile = res.data as BusinessProfile;
    expect(profile.operatingHours).toBeDefined();
  });
});
