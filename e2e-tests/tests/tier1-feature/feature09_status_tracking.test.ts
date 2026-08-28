/**
 * Tier 1 Feature Coverage: Feature 09 - Dynamic Job Status Tracking
 * Specification: ORIGINAL_REQUEST.md (R5), PROJECT.md (§ Interface Contracts), docs/architecture/05-booking-architecture.md, 12-web-architecture.md
 *
 * Verifies real-time tracking polling endpoint, CONFIRMED initial status, timestamp milestones,
 * technician assigned information, and canCancel state flag.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { RepairReachApiClient } from '../../src/apiClient.js';
import {
  generateUUID,
  generateNextWeekday,
  generateBookingPayload,
} from '../../src/testUtils.js';
import type {
  ServiceCatalogItem,
  CreateBookingResponse,
  BookingDetailsResponse,
} from '../../src/types.js';

describe('Feature 09: Dynamic Job Status Tracking', () => {
  let apiClient: RepairReachApiClient;
  let testServiceId: string;
  let publicReference: string;
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
    return { date: generateNextWeekday(offsetDays), slotId: 'slot-16-17' };
  }

  beforeAll(async () => {
    apiClient = new RepairReachApiClient();

    const servicesRes = await apiClient.getServices();
    if (servicesRes.status === 200 && Array.isArray(servicesRes.data) && servicesRes.data.length > 0) {
      testServiceId = (servicesRes.data as ServiceCatalogItem[])[0].id;
    } else {
      testServiceId = '00000000-0000-0000-0005-000000000001';
    }

    const { date, slotId } = await getSlotForDate(31);
    testDate = date;

    const payload = generateBookingPayload(testServiceId, slotId, testDate, {
      customerName: 'Meera Deshpande',
    });

    const createRes = await apiClient.createBooking(payload, generateUUID());
    if (createRes.status === 201 || createRes.status === 200) {
      const b = createRes.data as CreateBookingResponse;
      publicReference = b.publicReference;
    } else {
      publicReference = 'RR-TRACK-TEST01';
    }
  });

  it('9.1 should report initial status CONFIRMED immediately following booking creation', async () => {
    const res = await apiClient.getBooking(publicReference);
    expect(res.status).toBe(200);

    const details = res.data as BookingDetailsResponse;
    expect(details.status).toBe('CONFIRMED');
  });

  it('9.2 should return valid timestamps or ISO date strings for tracking timeline', async () => {
    const res = await apiClient.getBooking(publicReference);
    expect(res.status).toBe(200);

    const details = res.data as BookingDetailsResponse;
    if (details.createdAt) {
      expect(new Date(details.createdAt).getTime()).not.toBeNaN();
    }
    if (details.updatedAt) {
      expect(new Date(details.updatedAt).getTime()).not.toBeNaN();
    }
  });

  it('9.3 should return consistent status without state mutation across multiple polling queries', async () => {
    const poll1 = await apiClient.getBooking(publicReference);
    const poll2 = await apiClient.getBooking(publicReference);
    const poll3 = await apiClient.getBooking(publicReference);

    expect(poll1.status).toBe(200);
    expect(poll2.status).toBe(200);
    expect(poll3.status).toBe(200);

    const data1 = poll1.data as BookingDetailsResponse;
    const data2 = poll2.data as BookingDetailsResponse;
    const data3 = poll3.data as BookingDetailsResponse;

    expect(data2.status).toBe(data1.status);
    expect(data3.status).toBe(data1.status);
    expect(data2.publicReference).toBe(data1.publicReference);
  });

  it('9.4 should provide technician assignment information field when technician is assigned', async () => {
    const res = await apiClient.getBooking(publicReference);
    expect(res.status).toBe(200);

    const details = res.data as BookingDetailsResponse;
    // technicianName is either string name or null/undefined if unassigned
    if (details.technicianName) {
      expect(typeof details.technicianName).toBe('string');
      expect(details.technicianName.length).toBeGreaterThan(0);
    }
  });

  it('9.5 should maintain boolean canCancel flag reflecting pre-arrival cancellation eligibility', async () => {
    const res = await apiClient.getBooking(publicReference);
    expect(res.status).toBe(200);

    const details = res.data as BookingDetailsResponse;
    expect(typeof details.canCancel).toBe('boolean');
    expect(details.canCancel).toBe(true);
  });

  it('9.6 should verify known status values conform to defined BookingStatus domain enum', async () => {
    const res = await apiClient.getBooking(publicReference);
    expect(res.status).toBe(200);

    const details = res.data as BookingDetailsResponse;
    const validStatuses = ['REQUESTED', 'CONFIRMED', 'SLOT_SELECTION_REQUIRED', 'CANCELLED', 'CLOSED'];
    expect(validStatuses).toContain(details.status);
  });
});
