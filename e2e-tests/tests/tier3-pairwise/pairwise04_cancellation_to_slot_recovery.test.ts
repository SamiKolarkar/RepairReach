/**
 * Pairwise Test Suite 04: Booking Cancellation x Immediate Slot Re-availability Verification.
 *
 * Matrix Dimensions:
 * - Service Offerings: Washing Machine Repair vs Refrigerator Repair
 * - Slot Recovery Lifecycle:
 *   1. Initial State: Slot S is available
 *   2. Booking Created: Slot S is reserved (available === false)
 *   3. Pre-Arrival Cancellation: POST /bookings/{ref}/cancel -> status === 'CANCELLED', visitingChargeApplicable === false
 *   4. Slot Recovery: Slot S immediately returns to available === true
 *   5. Second Booking: A different customer successfully books the recovered slot S
 * - Corner Conditions:
 *   - Redundant Cancellation: Cancelling an already-cancelled booking handled safely
 *   - Non-existent Reference Cancellation: Returns RFC 7807 404 NOT_FOUND
 *
 * Expected Outputs derived from:
 * - docs/architecture/05-booking-architecture.md (§ Transition contract, Customer cancellation authority)
 * - docs/architecture/06-scheduling-architecture.md (§ Domain API: releaseReservation)
 * - PROJECT.md (POST /api/v1/public/bookings/{publicReference}/cancel specification)
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { RepairReachApiClient } from '../../src/apiClient.js';
import {
  generateUUID,
  generateNextWeekday,
  generateCustomerPhone,
  assertValidBookingResponse,
  assertProblemDetails,
  KNOWN_SERVICES,
  SOLAPUR_LOCALITIES,
} from '../../src/testUtils.js';
import type {
  ServiceCatalogItem,
  CreateBookingRequest,
  CreateBookingResponse,
  CancelBookingResponse,
  AvailabilityResponse,
  AvailabilitySlot,
  ProblemDetails,
} from '../../src/types.js';

describe('Pairwise 04: Booking Cancellation x Immediate Slot Recovery', () => {
  const client = new RepairReachApiClient();
  let defaultServiceId = '00000000-0000-0000-0005-000000000001';
  let refrigeratorServiceId = '00000000-0000-0000-0005-000000000002';

  beforeAll(async () => {
    const res = await client.getServices();
    if (res.status === 200 && Array.isArray(res.data)) {
      const washing = res.data.find((s) => s.code === KNOWN_SERVICES.WASHING_MACHINE || s.name.toLowerCase().includes('washing'));
      if (washing) defaultServiceId = washing.id;

      const fridge = res.data.find((s) => s.code === KNOWN_SERVICES.REFRIGERATOR || s.name.toLowerCase().includes('refrigerator'));
      if (fridge) refrigeratorServiceId = fridge.id;
    }
  });

  function extractSlots(data: AvailabilityResponse | AvailabilitySlot[] | ProblemDetails): AvailabilitySlot[] {
    if (Array.isArray(data)) return data;
    if (data && typeof data === 'object' && 'slots' in data && Array.isArray((data as AvailabilityResponse).slots)) {
      return (data as AvailabilityResponse).slots;
    }
    return [];
  }

  it('Pairwise 4.1: Full Slot Recovery Cycle: Book Slot -> Verify Unavailable -> Cancel -> Verify Restored -> Re-book by 2nd Customer', async () => {
    const bookingDate = generateNextWeekday(2);
    const targetSlotId = '10:00-11:00';

    // Step 1: Customer A books the slot
    const keyA = generateUUID();
    const payloadA: CreateBookingRequest = {
      customerName: 'Customer Alpha',
      customerPhone: generateCustomerPhone('+91'),
      serviceId: defaultServiceId,
      locationAddress: SOLAPUR_LOCALITIES[0],
      problemDescription: 'Washing machine error during spin cycle',
      requestedDate: bookingDate,
      requestedSlotId: targetSlotId,
    };

    const bookResA = await client.createBooking(payloadA, keyA);
    expect([200, 201]).toContain(bookResA.status);
    const bookingA = bookResA.data as CreateBookingResponse;
    assertValidBookingResponse(bookingA);

    // Step 2: Query availability - the slot should now be unavailable or reserved
    const slotCheck1 = await client.getSlots(defaultServiceId, bookingDate);
    if (slotCheck1.status === 200) {
      const slots = extractSlots(slotCheck1.data);
      const bookedSlot = slots.find((s) => s.slotId === targetSlotId);
      if (bookedSlot) {
        expect(bookedSlot.available).toBe(false);
      }
    }

    // Step 3: Customer A cancels the booking pre-arrival
    const cancelRes = await client.cancelBooking(bookingA.publicReference);
    expect(cancelRes.status).toBe(200);
    const cancelData = cancelRes.data as CancelBookingResponse;
    expect(cancelData.status).toBe('CANCELLED');
    expect(cancelData.visitingChargeApplicable).toBe(false);

    // Step 4: Query availability immediately - the slot must be restored to available: true
    const slotCheck2 = await client.getSlots(defaultServiceId, bookingDate);
    if (slotCheck2.status === 200) {
      const slots = extractSlots(slotCheck2.data);
      const recoveredSlot = slots.find((s) => s.slotId === targetSlotId);
      if (recoveredSlot) {
        expect(recoveredSlot.available).toBe(true);
      }
    }

    // Step 5: Customer B successfully books the newly recovered slot
    const keyB = generateUUID();
    const payloadB: CreateBookingRequest = {
      customerName: 'Customer Beta',
      customerPhone: generateCustomerPhone('+91'),
      serviceId: defaultServiceId,
      locationAddress: SOLAPUR_LOCALITIES[1],
      problemDescription: 'Washing machine water inlet valve leaking',
      requestedDate: bookingDate,
      requestedSlotId: targetSlotId,
    };

    const bookResB = await client.createBooking(payloadB, keyB);
    expect([200, 201]).toContain(bookResB.status);
    const bookingB = bookResB.data as CreateBookingResponse;
    assertValidBookingResponse(bookingB);
    expect(bookingB.publicReference).not.toBe(bookingA.publicReference);
  });

  it('Pairwise 4.2: Redundant Cancellation on already CANCELLED booking -> Handled safely without state corruption', async () => {
    const bookingDate = generateNextWeekday(3);
    const key = generateUUID();
    const payload: CreateBookingRequest = {
      customerName: 'Rohit Kulkarni',
      customerPhone: generateCustomerPhone('+91'),
      serviceId: defaultServiceId,
      locationAddress: SOLAPUR_LOCALITIES[2],
      problemDescription: 'General checkup',
      requestedDate: bookingDate,
      requestedSlotId: '11:00-12:00',
    };

    const bookRes = await client.createBooking(payload, key);
    expect([200, 201]).toContain(bookRes.status);
    const booking = bookRes.data as CreateBookingResponse;

    // First cancellation
    const firstCancel = await client.cancelBooking(booking.publicReference);
    expect(firstCancel.status).toBe(200);

    // Second cancellation on the same reference
    const secondCancel = await client.cancelBooking(booking.publicReference);
    // Should either return 200 (idempotent cancellation) or 400/409 (already cancelled)
    expect([200, 400, 409]).toContain(secondCancel.status);
    expect(secondCancel.status).not.toBe(500);
  });

  it('Pairwise 4.3: Non-Existent Booking Reference Cancellation -> RFC 7807 404 NOT_FOUND', async () => {
    const fakeRef = `RR-CANCEL-UNKNOWN-${generateUUID()}`;

    const res = await client.cancelBooking(fakeRef);
    expect(res.status).toBe(404);

    const problem = res.data as ProblemDetails;
    if (res.data && typeof res.data === 'object') {
      assertProblemDetails(problem, 'NOT_FOUND', 404);
    }
  });

  it('Pairwise 4.4: Tracking View after Cancellation reflects CANCELLED state and canCancel=false', async () => {
    const bookingDate = generateNextWeekday(4);
    const key = generateUUID();
    const payload: CreateBookingRequest = {
      customerName: 'Meera Kulkarni',
      customerPhone: generateCustomerPhone('+91'),
      serviceId: defaultServiceId,
      locationAddress: SOLAPUR_LOCALITIES[3],
      problemDescription: 'Door latch broken',
      requestedDate: bookingDate,
      requestedSlotId: '16:00-17:00',
    };

    const bookRes = await client.createBooking(payload, key);
    expect([200, 201]).toContain(bookRes.status);
    const booking = bookRes.data as CreateBookingResponse;

    // Cancel booking
    const cancelRes = await client.cancelBooking(booking.publicReference);
    expect(cancelRes.status).toBe(200);

    // Query tracking endpoint
    const trackRes = await client.getBooking(booking.publicReference);
    expect(trackRes.status).toBe(200);
    const details = trackRes.data as { status: string; canCancel: boolean };

    expect(details.status).toBe('CANCELLED');
    expect(details.canCancel).toBe(false);
  });

  it('Pairwise 4.5: Refrigerator Service Slot Recovery x Evening Window', async () => {
    const bookingDate = generateNextWeekday(5);
    const targetSlotId = '17:00-18:00';
    const key = generateUUID();

    const payload: CreateBookingRequest = {
      customerName: 'Vijay Shinde',
      customerPhone: generateCustomerPhone('+91'),
      serviceId: refrigeratorServiceId,
      locationAddress: SOLAPUR_LOCALITIES[4],
      problemDescription: 'Refrigerator condenser fan making grinding sound',
      requestedDate: bookingDate,
      requestedSlotId: targetSlotId,
    };

    const bookRes = await client.createBooking(payload, key);
    expect([200, 201]).toContain(bookRes.status);
    const booking = bookRes.data as CreateBookingResponse;

    // Cancel
    const cancelRes = await client.cancelBooking(booking.publicReference);
    expect(cancelRes.status).toBe(200);

    // Verify slot can be booked again
    const key2 = generateUUID();
    const payload2: CreateBookingRequest = {
      customerName: 'Sachin Patil',
      customerPhone: generateCustomerPhone('+91'),
      serviceId: refrigeratorServiceId,
      locationAddress: SOLAPUR_LOCALITIES[5],
      problemDescription: 'Thermostat knob loose',
      requestedDate: bookingDate,
      requestedSlotId: targetSlotId,
    };

    const rebookRes = await client.createBooking(payload2, key2);
    expect([200, 201]).toContain(rebookRes.status);
  });
});
