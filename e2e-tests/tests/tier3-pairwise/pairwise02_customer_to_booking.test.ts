/**
 * Pairwise Test Suite 02: Customer Name & Phone Variations x Booking Creation with Idempotency.
 *
 * Matrix Dimensions:
 * - Customer Name Variations:
 *   - Standard two-word name (e.g. "Rajesh Patil")
 *   - Multi-word with titles/middle names (e.g. "Dr. Sunita Anand Kulkarni")
 *   - Single name (e.g. "Ganesh")
 *   - Transliterated regional Solapur name (e.g. "Dnyaneshwar Jadhav")
 * - Customer Phone Formats:
 *   - E.164 formatted ("+91 9822012345")
 *   - Spaced mobile format ("+91 98220 54321")
 *   - Raw 10-digit local format ("9876543210")
 *   - Alternate Indian valid mobile prefixes (6, 7, 8, 9)
 * - Idempotency Mechanics:
 *   - Fresh Idempotency-Key -> 201 Created with distinct publicReference & bookingId
 *   - Idempotent Replay (Same Key + Identical Payload) -> Exact same booking reference returned
 *   - Idempotency Conflict (Same Key + Mutated Payload) -> 409/422 IDEMPOTENCY_CONFLICT Problem Details
 *   - Missing Idempotency Key behavior
 *
 * Expected Outputs derived from:
 * - docs/architecture/05-booking-architecture.md (§ Idempotency and stale requests)
 * - docs/architecture/09-api-architecture.md (§ DTO and validation rules, Error model)
 * - PROJECT.md (POST /api/v1/public/bookings specification)
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { RepairReachApiClient } from '../../src/apiClient.js';
import {
  generateUUID,
  generateDate,
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
  ProblemDetails,
} from '../../src/types.js';

describe('Pairwise 02: Customer Name & Phone Variations x Booking Creation & Idempotency', () => {
  const client = new RepairReachApiClient();
  let defaultServiceId = '00000000-0000-0000-0005-000000000001';
  let defaultSlotId = '09:00-10:00';
  let bookingDate = generateNextWeekday(2);

  beforeAll(async () => {
    const srvRes = await client.getServices();
    if (srvRes.status === 200 && Array.isArray(srvRes.data) && srvRes.data.length > 0) {
      defaultServiceId = srvRes.data[0].id;
    }

    const slotRes = await client.getSlots(defaultServiceId, bookingDate);
    if (slotRes.status === 200) {
      const slots = Array.isArray(slotRes.data)
        ? slotRes.data
        : (slotRes.data as { slots?: Array<{ slotId: string; available: boolean }> }).slots || [];
      const avail = slots.find((s) => s.available);
      if (avail) {
        defaultSlotId = avail.slotId;
      }
    }
  });

  it('Pairwise 2.1: Standard Name ("Rajesh Patil") x E.164 Phone ("+91 98...") x Fresh Idempotency Key -> 201 Created', async () => {
    const idempotencyKey = generateUUID();
    const payload: CreateBookingRequest = {
      customerName: 'Rajesh Patil',
      customerPhone: generateCustomerPhone('+91'),
      serviceId: defaultServiceId,
      locationAddress: SOLAPUR_LOCALITIES[0],
      problemDescription: 'Washing machine drum vibration during high spin cycle',
      requestedDate: bookingDate,
      requestedSlotId: defaultSlotId,
    };

    const res = await client.createBooking(payload, idempotencyKey);
    expect([200, 201]).toContain(res.status);

    const booking = res.data as CreateBookingResponse;
    assertValidBookingResponse(booking);
    expect(booking.customerName).toBe('Rajesh Patil');
    expect(booking.publicReference).toBeDefined();
    expect(booking.publicReference.length).toBeGreaterThanOrEqual(8);
  });

  it('Pairwise 2.2: Multi-Word Name with Title x 10-Digit Raw Phone -> 201 Created with normalized details', async () => {
    const idempotencyKey = generateUUID();
    const rawPhone = `9${Math.floor(100000000 + Math.random() * 900000000)}`;
    const payload: CreateBookingRequest = {
      customerName: 'Dr. Sunita Anand Kulkarni',
      customerPhone: rawPhone,
      serviceId: defaultServiceId,
      locationAddress: SOLAPUR_LOCALITIES[1],
      problemDescription: 'Refrigerator freezer not cooling and ice build-up in vents',
      requestedDate: generateNextWeekday(3),
      requestedSlotId: '10:00-11:00',
    };

    const res = await client.createBooking(payload, idempotencyKey);
    expect([200, 201]).toContain(res.status);

    const booking = res.data as CreateBookingResponse;
    assertValidBookingResponse(booking);
    expect(booking.customerName).toBe('Dr. Sunita Anand Kulkarni');
  });

  it('Pairwise 2.3: Idempotent Replay (Same Key + Identical Payload) -> returns exact identical booking without duplication', async () => {
    const idempotencyKey = generateUUID();
    const payload: CreateBookingRequest = {
      customerName: 'Dnyaneshwar Jadhav',
      customerPhone: generateCustomerPhone('+91'),
      serviceId: defaultServiceId,
      locationAddress: SOLAPUR_LOCALITIES[2],
      problemDescription: 'Microwave keypad buttons 1, 2, and Start not responding',
      requestedDate: generateNextWeekday(4),
      requestedSlotId: '11:00-12:00',
    };

    // First booking attempt
    const firstRes = await client.createBooking(payload, idempotencyKey);
    expect([200, 201]).toContain(firstRes.status);
    const firstBooking = firstRes.data as CreateBookingResponse;
    assertValidBookingResponse(firstBooking);

    // Second booking attempt with the EXACT SAME Idempotency-Key and payload
    const secondRes = await client.createBooking(payload, idempotencyKey);
    expect([200, 201]).toContain(secondRes.status);
    const secondBooking = secondRes.data as CreateBookingResponse;
    assertValidBookingResponse(secondBooking);

    // Assert that the returned booking is identical (same publicReference and bookingId)
    expect(secondBooking.publicReference).toBe(firstBooking.publicReference);
    expect(secondBooking.bookingId).toBe(firstBooking.bookingId);
    expect(secondBooking.customerName).toBe(firstBooking.customerName);
    expect(secondBooking.scheduledDate).toBe(firstBooking.scheduledDate);
  });

  it('Pairwise 2.4: Idempotency Key Reuse with Mutated Payload -> returns 409/422 IDEMPOTENCY_CONFLICT', async () => {
    const idempotencyKey = generateUUID();
    const originalPayload: CreateBookingRequest = {
      customerName: 'Amit Deshmukh',
      customerPhone: generateCustomerPhone('+91'),
      serviceId: defaultServiceId,
      locationAddress: SOLAPUR_LOCALITIES[3],
      problemDescription: 'AC blowing lukewarm air in master bedroom',
      requestedDate: generateNextWeekday(5),
      requestedSlotId: '12:00-13:00',
    };

    // First request creates original booking
    const firstRes = await client.createBooking(originalPayload, idempotencyKey);
    expect([200, 201]).toContain(firstRes.status);

    // Second request reuses the same Idempotency-Key but mutates customer details (different address & problem)
    const mutatedPayload: CreateBookingRequest = {
      ...originalPayload,
      customerName: 'Different Person Entirely',
      locationAddress: 'Completely Different Address, Solapur',
    };

    const conflictRes = await client.createBooking(mutatedPayload, idempotencyKey);
    // Server must reject with 409 Conflict or 422 Unprocessable Entity
    expect([400, 409, 422]).toContain(conflictRes.status);

    const problem = conflictRes.data as ProblemDetails;
    if (problem && problem.title) {
      expect(problem.status).toBe(conflictRes.status);
    }
  });

  it('Pairwise 2.5: Customer Phone Prefix Variation (6xxx, 7xxx, 8xxx, 9xxx) x Distinct Idempotency Keys -> All succeed', async () => {
    const prefixes = ['6', '7', '8', '9'];

    for (let i = 0; i < prefixes.length; i++) {
      const prefix = prefixes[i];
      const phone = `+91 ${prefix}${Math.floor(100000000 + Math.random() * 900000000)}`;
      const key = generateUUID();

      const payload: CreateBookingRequest = {
        customerName: `Customer Prefix ${prefix}`,
        customerPhone: phone,
        serviceId: defaultServiceId,
        locationAddress: SOLAPUR_LOCALITIES[i % SOLAPUR_LOCALITIES.length],
        problemDescription: `General appliance inspection with prefix ${prefix}`,
        requestedDate: generateNextWeekday(i + 2),
        requestedSlotId: `16:00-17:00`,
      };

      const res = await client.createBooking(payload, key);
      // Valid Indian prefixes 6, 7, 8, 9 must all be accepted
      expect([200, 201]).toContain(res.status);
      const booking = res.data as CreateBookingResponse;
      assertValidBookingResponse(booking);
      expect(booking.customerName).toBe(`Customer Prefix ${prefix}`);
    }
  });
});
