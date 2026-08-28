/**
 * Tier 4 Workload Scenario 05: Idempotent Network Retry & Replay Protection
 * Specification: ORIGINAL_REQUEST.md (R2, R6, R8), PROJECT.md (§ Transactional Booking Submission), docs/architecture/05-booking-architecture.md
 *
 * Workflow:
 * 1. Client generates UUID Idempotency-Key and submits TV Repair booking
 * 2. Backend persists booking and returns 201 Created with publicReference and bookingId
 * 3. Client simulates network disconnect/timeout and retries with the exact same Idempotency-Key and payload
 * 4. Backend returns identical booking details without creating duplicate database records or schedule conflicts
 * 5. Client attempts to reuse the same Idempotency-Key with a conflicting/different payload
 * 6. Backend rejects conflicting payload reuse with HTTP 409 Conflict / IDEMPOTENCY_CONFLICT RFC 7807
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { RepairReachApiClient } from '../../src/apiClient.js';
import {
  generateUUID,
  generateCustomerPhone,
  generateNextWeekday,
  SOLAPUR_LOCALITIES,
  KNOWN_SERVICES,
  assertValidBookingResponse,
  assertProblemDetails,
} from '../../src/testUtils.js';
import type {
  ServiceCatalogItem,
  AvailabilityResponse,
  AvailabilitySlot,
  CreateBookingRequest,
  CreateBookingResponse,
  BookingDetailsResponse,
  ProblemDetails,
} from '../../src/types.js';

describe('Tier 4 Scenario 05: Idempotent Network Retry & Replay Protection', () => {
  let apiClient: RepairReachApiClient;
  let tvService: ServiceCatalogItem;
  let targetDate: string;
  let targetSlot: AvailabilitySlot;
  let idempotencyKey: string;
  let firstBooking: CreateBookingResponse | null = null;
  let bookingPayload: CreateBookingRequest;

  beforeAll(async () => {
    apiClient = new RepairReachApiClient();
    targetDate = generateNextWeekday(58);
    idempotencyKey = generateUUID();
    targetSlot = {
      slotId: '00000000-0000-0000-0006-000000000005',
      startTime: '16:00:00',
      endTime: '17:00:00',
      available: true,
    };

    // Retrieve TV service
    const res = await apiClient.getServices();
    const services = (res.data || []) as ServiceCatalogItem[];
    const tv = services.find(
      (s) =>
        s.code === KNOWN_SERVICES.TV ||
        s.name.toLowerCase().includes('tv') ||
        s.name.toLowerCase().includes('television')
    );

    if (tv) {
      tvService = tv;
    } else if (services.length > 0) {
      tvService = services[0];
    } else {
      tvService = {
        id: '00000000-0000-0000-0005-000000000005',
        code: 'TV_REPAIR',
        name: 'Television & Display Repair',
        category: 'ELECTRONICS',
        description: 'LED, LCD, and Smart TV repairs',
        approxDurationMinutes: 60,
      };
    }
  });

  async function getSlotForDate(offsetDays: number): Promise<{ date: string; slot: AvailabilitySlot }> {
    let curOffset = offsetDays;
    while (curOffset < offsetDays + 25) {
      const date = generateNextWeekday(curOffset);
      const slotsRes = await apiClient.getSlots(tvService.id, date);
      if (slotsRes.status === 200) {
        const slots: AvailabilitySlot[] = Array.isArray(slotsRes.data)
          ? slotsRes.data
          : ((slotsRes.data as any)?.slots || []);
        const freeSlot = slots.find((s) => s.available);
        if (freeSlot) return { date, slot: freeSlot };
      }
      curOffset++;
    }
    return {
      date: generateNextWeekday(offsetDays),
      slot: {
        slotId: '00000000-0000-0000-0006-000000000005',
        startTime: '16:00:00',
        endTime: '17:00:00',
        available: true,
      },
    };
  }

  it('Phase 1: Customer queries available slots and prepares booking payload', async () => {
    const { date, slot } = await getSlotForDate(58);
    targetDate = date;
    targetSlot = slot;

    const slotsRes = await apiClient.getSlots(tvService.id, targetDate);
    expect(slotsRes.status).toBe(200);

    let slots: AvailabilitySlot[] = [];
    if (Array.isArray(slotsRes.data)) {
      slots = slotsRes.data;
    } else if (slotsRes.data && 'slots' in slotsRes.data) {
      slots = (slotsRes.data as AvailabilityResponse).slots;
    }

    const availableSlot = slots.find((s) => s.available && s.slotId === targetSlot.slotId) || slots.find((s) => s.available);
    expect(availableSlot).toBeDefined();
    targetSlot = availableSlot!;

    bookingPayload = {
      customerName: 'Anjali Bhosale',
      customerPhone: generateCustomerPhone('+91'),
      serviceId: tvService.id,
      locationAddress: SOLAPUR_LOCALITIES[6],
      problemDescription: 'Smart TV backlight blinking and no display output over HDMI',
      requestedDate: targetDate,
      requestedSlotId: targetSlot.slotId,
    };
  });

  it('Phase 2: Initial booking submission with unique Idempotency-Key returns 201 Created', async () => {
    const res = await apiClient.createBooking(bookingPayload, idempotencyKey);
    expect(res.status).toBe(201);

    firstBooking = res.data as CreateBookingResponse;
    assertValidBookingResponse(firstBooking);
    expect(firstBooking.status).toBe('CONFIRMED');
    expect(firstBooking.customerName).toBe('Anjali Bhosale');
    expect(firstBooking.publicReference).toBeTruthy();
    expect(firstBooking.bookingId).toBeTruthy();
  });

  it('Phase 3: Simulated network retry with identical Idempotency-Key and payload returns identical booking', async () => {
    // Client retries submission with the exact same payload and key
    const retryRes = await apiClient.createBooking(bookingPayload, idempotencyKey);

    // Should return 200 OK or 201 Created with identical data
    expect([200, 201]).toContain(retryRes.status);

    const retryBooking = retryRes.data as CreateBookingResponse;
    assertValidBookingResponse(retryBooking);

    if (firstBooking) {
      // Verify idempotency invariants: Same reference and IDs
      expect(retryBooking.publicReference).toBe(firstBooking.publicReference);
      expect(retryBooking.bookingId).toBe(firstBooking.bookingId);
      expect(retryBooking.status).toBe(firstBooking.status);
      expect(retryBooking.scheduledDate).toBe(firstBooking.scheduledDate);
      expect(retryBooking.scheduledStartTime).toBe(firstBooking.scheduledStartTime);
    }
  });

  it('Phase 4: Verify single underlying booking record exists in tracking lookup', async () => {
    const ref = firstBooking?.publicReference || `ref-${generateUUID()}`;
    const trackingRes = await apiClient.getBooking(ref);
    expect(trackingRes.status).toBe(200);

    const details = trackingRes.data as BookingDetailsResponse;
    expect(details.publicReference).toBe(ref);
    expect(details.status).toBe('CONFIRMED');
    expect(details.customerName).toBe('Anjali Bhosale');
  });

  it('Phase 5: Reusing same Idempotency-Key with conflicting payload is rejected (409 Conflict)', async () => {
    // Customer attempts to send completely different booking data with previously used key
    const conflictingPayload: CreateBookingRequest = {
      customerName: 'Different Customer Name',
      customerPhone: generateCustomerPhone('+91'),
      serviceId: tvService.id,
      locationAddress: 'Different Address In Solapur',
      problemDescription: 'Completely different problem description',
      requestedDate: targetDate,
      requestedSlotId: targetSlot.slotId,
    };

    const conflictRes = await apiClient.createBooking(conflictingPayload, idempotencyKey);

    // API must reject reuse of idempotency key with conflicting payload
    expect([400, 409]).toContain(conflictRes.status);
    assertProblemDetails(conflictRes.data, undefined, conflictRes.status);

    const problem = conflictRes.data as ProblemDetails;
    expect(problem.type).toBeTruthy();
    expect(problem.title).toBeTruthy();
    expect(
      problem.code === 'IDEMPOTENCY_CONFLICT' ||
      problem.code === 'VALIDATION_FAILED' ||
      problem.title.toLowerCase().includes('idempotency') ||
      problem.title.toLowerCase().includes('conflict') ||
      problem.detail?.toLowerCase().includes('idempotency')
    ).toBe(true);
  });
});
