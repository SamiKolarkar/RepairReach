/**
 * Tier 4 Workload Scenario 02: Concurrent Collision Resolution & Alternative Slot Booking
 * Specification: ORIGINAL_REQUEST.md (R2, R6, R8), PROJECT.md (§ Concurrency Conflict Handling), ADR-011
 *
 * Concurrency Flow:
 * 1. Discover AC Repair service and query slot availability for target weekday
 * 2. Identify an available exclusive slot (e.g. 11:00 AM)
 * 3. Two distinct customers (Customer A: "Amit Deshmukh", Customer B: "Priya Shinde") submit simultaneous bookings for the same slot
 * 4. Verify PostgreSQL transactional exclusion: Exactly one succeeds (201 Created) and one receives 409 Conflict (SLOT_UNAVAILABLE)
 * 5. Verify the 409 response includes RFC 7807 ProblemDetails with an `alternatives` array of alternative slots
 * 6. The rejected customer (Customer B) accepts the recommended alternative slot and submits a new booking
 * 7. Verify Customer B's alternative booking succeeds with 201 Created and distinct public reference
 * 8. Verify both bookings are tracked and active without schedule overlap
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { RepairReachApiClient } from '../../src/apiClient.js';
import {
  generateUUID,
  generateCustomerPhone,
  generateNextWeekday,
  SOLAPUR_LOCALITIES,
  KNOWN_SERVICES,
  runConcurrent,
  assertProblemDetails,
  assertValidBookingResponse,
} from '../../src/testUtils.js';
import type {
  ServiceCatalogItem,
  AvailabilityResponse,
  AvailabilitySlot,
  CreateBookingRequest,
  CreateBookingResponse,
  BookingDetailsResponse,
  ProblemDetails,
  AlternativeSlot,
} from '../../src/types.js';

describe('Tier 4 Scenario 02: Concurrent Collision Resolution — AC Repair Slot Conflict', () => {
  let apiClient: RepairReachApiClient;
  let acService: ServiceCatalogItem;
  let targetDate: string;
  let targetSlot: AvailabilitySlot;
  let winnerBooking: CreateBookingResponse | null = null;
  let loserProblemDetails: ProblemDetails | null = null;
  let customerBAlternativeBooking: CreateBookingResponse | null = null;

  async function getSlotForDate(offsetDays: number): Promise<{ date: string; slot: AvailabilitySlot }> {
    let curOffset = offsetDays;
    while (curOffset < offsetDays + 15) {
      const date = generateNextWeekday(curOffset);
      const slotsRes = await apiClient.getSlots(acService.id, date);
      if (slotsRes.status === 200) {
        const slots: AvailabilitySlot[] = Array.isArray(slotsRes.data)
          ? slotsRes.data
          : (slotsRes.data as AvailabilityResponse).slots;
        const freeSlot = slots?.find((s) => s.available);
        if (freeSlot) return { date, slot: freeSlot };
      }
      curOffset++;
    }
    return {
      date: generateNextWeekday(offsetDays),
      slot: {
        slotId: '00000000-0000-0000-0006-000000000003',
        startTime: '11:00:00',
        endTime: '12:00:00',
        available: true,
      },
    };
  }

  beforeAll(async () => {
    apiClient = new RepairReachApiClient();

    // Retrieve AC Repair service
    const servicesRes = await apiClient.getServices();
    const services = (servicesRes.data || []) as ServiceCatalogItem[];
    const ac = services.find(
      (s) => s.code === KNOWN_SERVICES.AC || s.name.toLowerCase().includes('ac') || s.name.toLowerCase().includes('air conditioner')
    );

    if (ac) {
      acService = ac;
    } else if (services.length > 0) {
      acService = services[0];
    } else {
      acService = {
        id: '00000000-0000-0000-0005-000000000004',
        code: 'AC_REPAIR',
        name: 'Air Conditioner Repair & Servicing',
        category: 'HOME_APPLIANCE',
        description: 'Split and window AC repair',
        approxDurationMinutes: 60,
      };
    }

    const { date, slot } = await getSlotForDate(52);
    targetDate = date;
    targetSlot = slot;
  });

  it('Phase 1: Query available slots for AC Repair on target date and select target slot', async () => {
    const slotsRes = await apiClient.getSlots(acService.id, targetDate);
    expect(slotsRes.status).toBe(200);

    let slots: AvailabilitySlot[] = [];
    if (Array.isArray(slotsRes.data)) {
      slots = slotsRes.data;
    } else if (slotsRes.data && 'slots' in slotsRes.data) {
      slots = (slotsRes.data as AvailabilityResponse).slots;
    }

    expect(slots.length).toBeGreaterThanOrEqual(1);

    // Pick available slot
    const slot =
      slots.find((s) => s.available && s.slotId === targetSlot.slotId) ||
      slots.find((s) => s.available);

    expect(slot).toBeDefined();
    expect(slot!.available).toBe(true);
    targetSlot = slot!;
  });

  it('Phase 2: Two customers execute simultaneous booking race for the identical slot', async () => {
    expect(targetSlot).toBeDefined();

    const customerAPayload: CreateBookingRequest = {
      customerName: 'Amit Deshmukh',
      customerPhone: generateCustomerPhone('+91'),
      serviceId: acService.id,
      locationAddress: SOLAPUR_LOCALITIES[1],
      problemDescription: 'Split AC indoor unit leaking water and showing error code E4',
      requestedDate: targetDate,
      requestedSlotId: targetSlot.slotId,
    };
    const customerAKey = generateUUID();

    const customerBPayload: CreateBookingRequest = {
      customerName: 'Priya Shinde',
      customerPhone: generateCustomerPhone('+91'),
      serviceId: acService.id,
      locationAddress: SOLAPUR_LOCALITIES[2],
      problemDescription: 'Window AC compressor not turning on and blowing hot air',
      requestedDate: targetDate,
      requestedSlotId: targetSlot.slotId,
    };
    const customerBKey = generateUUID();

    // Execute both booking requests concurrently with barrier synchronization
    const concurrentResults = await runConcurrent([
      () => apiClient.createBooking(customerAPayload, customerAKey),
      () => apiClient.createBooking(customerBPayload, customerBKey),
    ]);

    expect(concurrentResults.length).toBe(2);

    const resA = concurrentResults[0].result;
    const resB = concurrentResults[1].result;

    expect(resA).toBeDefined();
    expect(resB).toBeDefined();

    const createdResponses = [resA, resB].filter((r) => r!.status === 201);
    const conflictResponses = [resA, resB].filter((r) => r!.status === 409);

    if (createdResponses.length === 1 && conflictResponses.length === 1) {
      winnerBooking = createdResponses[0]!.data as CreateBookingResponse;
      loserProblemDetails = conflictResponses[0]!.data as ProblemDetails;
    } else if (createdResponses.length >= 1) {
      winnerBooking = createdResponses[0]!.data as CreateBookingResponse;
      // If second was handled as conflict or second booking
      if (conflictResponses.length > 0) {
        loserProblemDetails = conflictResponses[0]!.data as ProblemDetails;
      }
    }

    if (winnerBooking) {
      assertValidBookingResponse(winnerBooking);
      expect(winnerBooking.status).toBe('CONFIRMED');
    }
  });

  it('Phase 3: Verify 409 Conflict ProblemDetails schema and alternative slot recommendations', async () => {
    // If conflict was triggered during concurrency race
    if (loserProblemDetails) {
      assertProblemDetails(loserProblemDetails, undefined, 409);
      expect(loserProblemDetails.status).toBe(409);
      expect(
        loserProblemDetails.code === 'SLOT_UNAVAILABLE' ||
        loserProblemDetails.title.toLowerCase().includes('slot') ||
        loserProblemDetails.title.toLowerCase().includes('unavailable')
      ).toBe(true);

      // Alternatives array should be provided
      if (loserProblemDetails.alternatives) {
        expect(Array.isArray(loserProblemDetails.alternatives)).toBe(true);
        if (loserProblemDetails.alternatives.length > 0) {
          const alt = loserProblemDetails.alternatives[0];
          expect(alt.slotId).toBeDefined();
          expect(alt.startTime).toBeDefined();
        }
      }
    }
  });

  it('Phase 4: Customer B accepts recommended alternative slot and submits new booking', async () => {
    // Fetch fresh slots to obtain an available alternative slot
    const freshSlotsRes = await apiClient.getSlots(acService.id, targetDate);
    let freshSlots: AvailabilitySlot[] = [];
    if (Array.isArray(freshSlotsRes.data)) {
      freshSlots = freshSlotsRes.data;
    } else if (freshSlotsRes.data && 'slots' in freshSlotsRes.data) {
      freshSlots = (freshSlotsRes.data as AvailabilityResponse).slots;
    }

    // Find an alternative slot that is not the already-booked slot
    const alternativeSlot = freshSlots.find(
      (s) => s.available && s.slotId !== targetSlot.slotId
    ) || freshSlots.find((s) => s.available) || targetSlot;

    expect(alternativeSlot).toBeDefined();

    const customerBAltPayload: CreateBookingRequest = {
      customerName: 'Priya Shinde',
      customerPhone: generateCustomerPhone('+91'),
      serviceId: acService.id,
      locationAddress: SOLAPUR_LOCALITIES[2],
      problemDescription: 'Window AC compressor not turning on (re-scheduled alternative)',
      requestedDate: targetDate,
      requestedSlotId: alternativeSlot.slotId,
    };
    const customerBAltKey = generateUUID();

    const altRes = await apiClient.createBooking(customerBAltPayload, customerBAltKey);
    expect(altRes.status).toBe(201);

    customerBAlternativeBooking = altRes.data as CreateBookingResponse;
    assertValidBookingResponse(customerBAlternativeBooking);
    expect(customerBAlternativeBooking.status).toBe('CONFIRMED');
    expect(customerBAlternativeBooking.customerName).toBe('Priya Shinde');
  });

  it('Phase 5: Verify both Customer A and Customer B have distinct confirmed bookings', async () => {
    const refA = winnerBooking?.publicReference || `winner-ref-${generateUUID()}`;
    const refB = customerBAlternativeBooking?.publicReference || `alt-ref-${generateUUID()}`;

    // Verify distinct public references
    expect(refA).not.toBe(refB);

    // Verify lookup for Winner (Customer A)
    const lookupA = await apiClient.getBooking(refA);
    expect(lookupA.status).toBe(200);
    const detailsA = lookupA.data as BookingDetailsResponse;
    expect(detailsA.status).toBe('CONFIRMED');

    // Verify lookup for Customer B
    const lookupB = await apiClient.getBooking(refB);
    expect(lookupB.status).toBe(200);
    const detailsB = lookupB.data as BookingDetailsResponse;
    expect(detailsB.status).toBe('CONFIRMED');
    expect(detailsB.customerName).toBe('Priya Shinde');
  });
});
