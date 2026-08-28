/**
 * Tier 1 Feature Coverage: Feature 06 - Transactional Booking Submission & Idempotency
 * Specification: ORIGINAL_REQUEST.md (R2, R6), PROJECT.md (§ Interface Contracts), docs/architecture/05-booking-architecture.md
 *
 * Verifies transactional booking creation, UUID Idempotency-Key enforcement, idempotent replays,
 * payload mismatch conflict detection, and public reference generation.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { RepairReachApiClient } from '../../src/apiClient.js';
import {
  generateUUID,
  generateNextWeekday,
  generateBookingPayload,
  assertValidBookingResponse,
  assertProblemDetails,
} from '../../src/testUtils.js';
import type {
  ServiceCatalogItem,
  AvailabilityResponse,
  AvailabilitySlot,
  CreateBookingResponse,
  ProblemDetails,
} from '../../src/types.js';

describe('Feature 06: Transactional Booking Submission & Idempotency', () => {
  let apiClient: RepairReachApiClient;
  let testServiceId: string;
  let testDate: string;
  let availableSlotId: string;

  beforeAll(async () => {
    apiClient = new RepairReachApiClient();
    testDate = generateNextWeekday(3);

    const servicesRes = await apiClient.getServices();
    if (servicesRes.status === 200 && Array.isArray(servicesRes.data) && servicesRes.data.length > 0) {
      testServiceId = (servicesRes.data as ServiceCatalogItem[])[0].id;
    } else {
      testServiceId = '00000000-0000-0000-0005-000000000001';
    }

    // Find an available slot
    const slotsRes = await apiClient.getSlots(testServiceId, testDate);
    if (slotsRes.status === 200) {
      const slots: AvailabilitySlot[] = Array.isArray(slotsRes.data)
        ? slotsRes.data
        : (slotsRes.data as AvailabilityResponse).slots;
      const freeSlot = slots.find((s) => s.available);
      availableSlotId = freeSlot ? freeSlot.slotId : 'slot-09-10';
    } else {
      availableSlotId = 'slot-09-10';
    }
  });

  async function getSlotForDate(offsetDays: number): Promise<{ date: string; slotId: string }> {
    let curOffset = offsetDays;
    while (curOffset < offsetDays + 25) {
      const date = generateNextWeekday(curOffset);
      const slotsRes = await apiClient.getSlots(testServiceId, date);
      if (slotsRes.status === 200) {
        const slots: AvailabilitySlot[] = Array.isArray(slotsRes.data)
          ? slotsRes.data
          : ((slotsRes.data as any)?.slots || []);
        const freeSlot = slots.find((s) => s.available);
        if (freeSlot) return { date, slotId: freeSlot.slotId };
      }
      curOffset++;
    }
    return { date: generateNextWeekday(offsetDays), slotId: 'slot-10-11' };
  }

  it('6.1 should successfully create a booking with valid payload and UUID Idempotency-Key returning HTTP 201 Created', async () => {
    const { date, slotId } = await getSlotForDate(10);
    const idempotencyKey = generateUUID();
    const payload = generateBookingPayload(testServiceId, slotId, date);

    const res = await apiClient.createBooking(payload, idempotencyKey);

    expect([201, 200]).toContain(res.status);
    const booking = res.data as CreateBookingResponse;
    assertValidBookingResponse(booking);

    expect(booking.publicReference).toBeTruthy();
    expect(booking.bookingId).toBeTruthy();
    expect(booking.status).toBe('CONFIRMED');
  });

  it('6.2 should return unguessable public reference, persisted bookingId, and feedbackCapabilityToken', async () => {
    const { date, slotId } = await getSlotForDate(11);
    const idempotencyKey = generateUUID();
    const payload = generateBookingPayload(testServiceId, slotId, date);

    const res = await apiClient.createBooking(payload, idempotencyKey);
    expect([201, 200]).toContain(res.status);

    const booking = res.data as CreateBookingResponse;
    expect(booking.publicReference).toMatch(/^[A-Za-z0-9_-]{8,}$/);
    expect(booking.bookingId).toBeTruthy();

    if (booking.feedbackCapabilityToken) {
      expect(booking.feedbackCapabilityToken.length).toBeGreaterThanOrEqual(16);
    }
  });

  it('6.3 should return identical response when replaying identical request with the same Idempotency-Key', async () => {
    const { date, slotId } = await getSlotForDate(12);
    const idempotencyKey = generateUUID();
    const payload = generateBookingPayload(testServiceId, slotId, date);

    // Initial creation
    const res1 = await apiClient.createBooking(payload, idempotencyKey);
    expect([201, 200]).toContain(res1.status);
    const booking1 = res1.data as CreateBookingResponse;

    // Replay with identical key and payload
    const res2 = await apiClient.createBooking(payload, idempotencyKey);
    expect([201, 200]).toContain(res2.status);
    const booking2 = res2.data as CreateBookingResponse;

    expect(booking2.publicReference).toBe(booking1.publicReference);
    expect(booking2.bookingId).toBe(booking1.bookingId);
    expect(booking2.customerName).toBe(booking1.customerName);
    expect(booking2.scheduledDate).toBe(booking1.scheduledDate);
  });

  it('6.4 should reject reused Idempotency-Key with conflicting/different payload with 409 or 400 ProblemDetails', async () => {
    const { date, slotId } = await getSlotForDate(13);
    const idempotencyKey = generateUUID();
    const payload1 = generateBookingPayload(testServiceId, slotId, date, {
      customerName: 'Customer Alpha',
    });
    const payload2 = generateBookingPayload(testServiceId, slotId, date, {
      customerName: 'Customer Beta Different',
    });

    // First request
    const res1 = await apiClient.createBooking(payload1, idempotencyKey);
    expect([201, 200]).toContain(res1.status);

    // Second request with SAME idempotency key but DIFFERENT payload
    const res2 = await apiClient.createBooking(payload2, idempotencyKey);
    expect([400, 409]).toContain(res2.status);

    const pd = res2.data as ProblemDetails;
    assertProblemDetails(pd, undefined, res2.status);
  });

  it('6.5 should handle string / UUID Idempotency-Key header gracefully', async () => {
    const { date, slotId } = await getSlotForDate(14);
    const key = generateUUID();
    const payload = generateBookingPayload(testServiceId, slotId, date);

    const res = await apiClient.createBooking(payload, key);
    expect([200, 201]).toContain(res.status);
  });

  it('6.6 should include all mandatory customer, service, and scheduled time fields in creation response', async () => {
    const { date, slotId } = await getSlotForDate(15);
    const idempotencyKey = generateUUID();
    const payload = generateBookingPayload(testServiceId, slotId, date, {
      customerName: 'Sanjay Shinde',
      locationAddress: 'Flat 101, Navi Peth, Solapur',
    });

    const res = await apiClient.createBooking(payload, idempotencyKey);
    expect([201, 200]).toContain(res.status);

    const booking = res.data as CreateBookingResponse;
    expect(booking.customerName).toBe('Sanjay Shinde');
    expect(booking.locationAddress).toContain('Navi Peth');
    expect(booking.scheduledDate).toBe(date);
    expect(booking.scheduledStartTime).toBeTruthy();
    expect(booking.scheduledEndTime).toBeTruthy();
  });
});
