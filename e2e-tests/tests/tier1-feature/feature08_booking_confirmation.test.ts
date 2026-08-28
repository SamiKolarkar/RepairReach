/**
 * Tier 1 Feature Coverage: Feature 08 - Booking Confirmation & Lookup
 * Specification: ORIGINAL_REQUEST.md (R2), PROJECT.md (§ Interface Contracts), docs/architecture/05-booking-architecture.md
 *
 * Verifies lookup by unguessable public reference, verified summary card fields,
 * pre-arrival cancellation eligibility flag, and 404 handling for non-existent references.
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
  CreateBookingResponse,
  BookingDetailsResponse,
  ProblemDetails,
} from '../../src/types.js';

describe('Feature 08: Booking Confirmation & Public Reference Lookup', () => {
  let apiClient: RepairReachApiClient;
  let testServiceId: string;
  let createdPublicRef: string;
  let createdBooking: CreateBookingResponse;
  let testDate: string;

  async function getSlotForDate(offsetDays: number): Promise<{ date: string; slotId: string }> {
    let curOffset = offsetDays;
    while (curOffset < offsetDays + 15) {
      const date = generateNextWeekday(curOffset);
      const slotsRes = await apiClient.getSlots(testServiceId, date);
      if (slotsRes.status === 200) {
        const slots: AvailabilitySlot[] = Array.isArray(slotsRes.data)
          ? slotsRes.data
          : (slotsRes.data as AvailabilityResponse).slots;
        const freeSlot = slots?.find((s) => s.available);
        if (freeSlot) return { date, slotId: freeSlot.slotId };
      }
      curOffset++;
    }
    return { date: generateNextWeekday(offsetDays), slotId: 'slot-11-12' };
  }

  beforeAll(async () => {
    apiClient = new RepairReachApiClient();

    const servicesRes = await apiClient.getServices();
    if (servicesRes.status === 200 && Array.isArray(servicesRes.data) && servicesRes.data.length > 0) {
      testServiceId = (servicesRes.data as ServiceCatalogItem[])[0].id;
    } else {
      testServiceId = '00000000-0000-0000-0005-000000000001';
    }

    const { date, slotId } = await getSlotForDate(28);
    testDate = date;

    // Create a known confirmed booking to look up
    const payload = generateBookingPayload(testServiceId, slotId, testDate, {
      customerName: 'Anand Kulkarni',
      locationAddress: 'Plot 55, Jule Solapur, Solapur 413004',
      problemDescription: 'Microwave oven turntable not rotating during heating.',
    });

    const createRes = await apiClient.createBooking(payload, generateUUID());
    if (createRes.status === 201 || createRes.status === 200) {
      createdBooking = createRes.data as CreateBookingResponse;
      createdPublicRef = createdBooking.publicReference;
    } else {
      createdPublicRef = 'RR-202608-TEST01';
    }
  });

  it('8.1 should retrieve confirmed booking details using valid publicReference with HTTP 200 OK', async () => {
    const res = await apiClient.getBooking(createdPublicRef);

    expect(res.status).toBe(200);
    const details = res.data as BookingDetailsResponse;

    expect(details.publicReference).toBe(createdPublicRef);
    expect(details.status).toBeTruthy();
  });

  it('8.2 should verify confirmed booking summary card matches customer name, service name, and address', async () => {
    const res = await apiClient.getBooking(createdPublicRef);
    expect(res.status).toBe(200);

    const details = res.data as BookingDetailsResponse;
    expect(details.customerName).toBe(createdBooking?.customerName || 'Anand Kulkarni');
    expect(details.locationAddress).toContain('Solapur');
    expect(details.serviceName).toBeTruthy();
  });

  it('8.3 should confirm scheduledDate, startTime, and endTime are properly returned in confirmation view', async () => {
    const res = await apiClient.getBooking(createdPublicRef);
    expect(res.status).toBe(200);

    const details = res.data as BookingDetailsResponse;
    expect(details.scheduledDate).toBe(testDate);
    expect(details.scheduledStartTime).toBeTruthy();
    expect(details.scheduledEndTime).toBeTruthy();
  });

  it('8.4 should indicate canCancel is true for newly confirmed pre-arrival bookings', async () => {
    const res = await apiClient.getBooking(createdPublicRef);
    expect(res.status).toBe(200);

    const details = res.data as BookingDetailsResponse;
    expect(details.canCancel).toBe(true);
  });

  it('8.5 should return HTTP 404 ProblemDetails when looking up non-existent public reference', async () => {
    const nonExistentRef = 'RR-NONEXISTENT-999999';
    const res = await apiClient.getBooking(nonExistentRef);

    expect(res.status).toBe(404);
    const pd = res.data as ProblemDetails;
    assertProblemDetails(pd, 'NOT_FOUND', 404);
  });

  it('8.6 should reject path traversal or malicious characters in public reference parameter cleanly', async () => {
    const maliciousRef = '../../etc/passwd';
    const res = await apiClient.getBooking(maliciousRef);

    expect([400, 404]).toContain(res.status);
  });
});
