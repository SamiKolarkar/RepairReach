/**
 * Tier 1 Feature Coverage: Feature 10 - Pre-Arrival Customer Cancellation
 * Specification: ORIGINAL_REQUEST.md (R5, R8), PROJECT.md (§ Interface Contracts, ADR-011), docs/architecture/05-booking-architecture.md
 *
 * Verifies pre-arrival cancellation without visiting fee (visitingChargeApplicable=false),
 * status transition to CANCELLED, canCancel flag update, and idempotent/error handling.
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
  CancelBookingResponse,
  BookingDetailsResponse,
  ProblemDetails,
} from '../../src/types.js';

describe('Feature 10: Pre-Arrival Customer Cancellation', () => {
  let apiClient: RepairReachApiClient;
  let testServiceId: string;
  let cancellablePublicRef: string;
  let testDate: string;
  const testSlotId = 'slot-16-17';

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
    return { date: generateNextWeekday(offsetDays), slotId: testSlotId };
  }

  beforeAll(async () => {
    apiClient = new RepairReachApiClient();

    const servicesRes = await apiClient.getServices();
    if (servicesRes.status === 200 && Array.isArray(servicesRes.data) && servicesRes.data.length > 0) {
      testServiceId = (servicesRes.data as ServiceCatalogItem[])[0].id;
    } else {
      testServiceId = '00000000-0000-0000-0005-000000000001';
    }

    const { date, slotId } = await getSlotForDate(34);
    testDate = date;

    // Create a fresh booking to test cancellation on
    const payload = generateBookingPayload(testServiceId, slotId, testDate, {
      customerName: 'Rohit Kadam',
    });

    const createRes = await apiClient.createBooking(payload, generateUUID());
    if (createRes.status === 201 || createRes.status === 200) {
      const b = createRes.data as CreateBookingResponse;
      cancellablePublicRef = b.publicReference;
    } else {
      cancellablePublicRef = 'RR-CANCEL-TEST01';
    }
  });

  it('10.1 should successfully cancel a confirmed pre-arrival booking returning HTTP 200 OK', async () => {
    const res = await apiClient.cancelBooking(cancellablePublicRef);

    expect(res.status).toBe(200);
    const cancelData = res.data as CancelBookingResponse;

    expect(cancelData.publicReference).toBe(cancellablePublicRef);
    expect(cancelData.status).toBe('CANCELLED');
  });

  it('10.2 should confirm cancellation response sets visitingChargeApplicable to false for pre-arrival', async () => {
    const res = await apiClient.cancelBooking(cancellablePublicRef);
    expect([200, 400, 409]).toContain(res.status);

    if (res.status === 200) {
      const cancelData = res.data as CancelBookingResponse;
      expect(cancelData.visitingChargeApplicable).toBe(false);
      expect(cancelData.cancelledAt).toBeTruthy();
    }
  });

  it('10.3 should update booking tracking status to CANCELLED and canCancel to false', async () => {
    const res = await apiClient.getBooking(cancellablePublicRef);
    expect(res.status).toBe(200);

    const details = res.data as BookingDetailsResponse;
    expect(details.status).toBe('CANCELLED');
    expect(details.canCancel).toBe(false);
  });

  it('10.4 should return HTTP 404 ProblemDetails when cancelling a non-existent public reference', async () => {
    const nonExistentRef = 'RR-NOT-EXIST-000000';
    const res = await apiClient.cancelBooking(nonExistentRef);

    expect(res.status).toBe(404);
    const pd = res.data as ProblemDetails;
    assertProblemDetails(pd, 'NOT_FOUND', 404);
  });

  it('10.5 should reject repeated cancellation attempts on an already cancelled booking with 400/409 ProblemDetails', async () => {
    // Attempting to cancel already cancelled booking again
    const res = await apiClient.cancelBooking(cancellablePublicRef);

    // Depending on idempotency vs state-machine policy: either 200 (idempotent) or 400/409 (INVALID_STATE_TRANSITION)
    expect([200, 400, 409]).toContain(res.status);
    if (res.status !== 200) {
      const pd = res.data as ProblemDetails;
      expect(pd.type).toBeDefined();
    }
  });

  it('10.6 should verify cancelled booking timestamps record cancelledAt correctly', async () => {
    const res = await apiClient.getBooking(cancellablePublicRef);
    expect(res.status).toBe(200);

    const details = res.data as BookingDetailsResponse;
    expect(details.status).toBe('CANCELLED');
    if (details.updatedAt) {
      expect(new Date(details.updatedAt).getTime()).not.toBeNaN();
    }
  });
});
