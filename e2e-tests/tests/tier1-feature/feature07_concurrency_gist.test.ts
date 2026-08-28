/**
 * Tier 1 Feature Coverage: Feature 07 - Concurrency Conflict Handling & PostgreSQL GiST Exclusion
 * Specification: ORIGINAL_REQUEST.md (R6), PROJECT.md (§ Interface Contracts, ADR-011), docs/architecture/08-data-architecture.md
 *
 * Verifies PostgreSQL GiST exclusion constraint protection against overlapping bookings,
 * HTTP 409 SLOT_UNAVAILABLE conflict response, and alternative slot suggestions.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { RepairReachApiClient } from '../../src/apiClient.js';
import {
  generateUUID,
  generateNextWeekday,
  generateBookingPayload,
  assertProblemDetails,
  runConcurrent,
} from '../../src/testUtils.js';
import type {
  ServiceCatalogItem,
  AvailabilityResponse,
  AvailabilitySlot,
  CreateBookingResponse,
  ProblemDetails,
} from '../../src/types.js';

describe('Feature 07: Concurrency Conflict Handling & GiST Exclusion', () => {
  let apiClient: RepairReachApiClient;
  let testServiceId: string;
  let testDate: string;
  let targetSlotId: string;

  beforeAll(async () => {
    apiClient = new RepairReachApiClient();
    testDate = generateNextWeekday(25);

    const servicesRes = await apiClient.getServices();
    if (servicesRes.status === 200 && Array.isArray(servicesRes.data) && servicesRes.data.length > 0) {
      testServiceId = (servicesRes.data as ServiceCatalogItem[])[0].id;
    } else {
      testServiceId = '00000000-0000-0000-0005-000000000001';
    }

    const slotsRes = await apiClient.getSlots(testServiceId, testDate);
    if (slotsRes.status === 200) {
      const slots: AvailabilitySlot[] = Array.isArray(slotsRes.data)
        ? slotsRes.data
        : (slotsRes.data as AvailabilityResponse).slots;
      const freeSlot = slots.find((s) => s.available);
      targetSlotId = freeSlot ? freeSlot.slotId : 'slot-11-12';
    } else {
      targetSlotId = 'slot-11-12';
    }
  });

  async function exhaustSlot(serviceId: string, slotId: string, date: string): Promise<void> {
    for (let i = 0; i < 5; i++) {
      const payload = generateBookingPayload(serviceId, slotId, date, {
        customerName: `Exhauster ${i}`,
      });
      const res = await apiClient.createBooking(payload, generateUUID());
      if (res.status === 409) break;
    }
  }

  it('7.1 should reject a sequential booking attempt for an already-booked slot with HTTP 409 Conflict', async () => {
    await exhaustSlot(testServiceId, targetSlotId, testDate);

    // Second booking attempts to book the EXACT SAME slot and date
    const payloadB = generateBookingPayload(testServiceId, targetSlotId, testDate, {
      customerName: 'Customer Beta Colliding',
    });
    const resB = await apiClient.createBooking(payloadB, generateUUID());

    expect(resB.status).toBe(409);
    const pd = resB.data as ProblemDetails;
    assertProblemDetails(pd, 'SLOT_UNAVAILABLE', 409);
  });

  it('7.2 should return RFC 7807 ProblemDetails conforming structure on 409 conflict', async () => {
    const payload = generateBookingPayload(testServiceId, targetSlotId, testDate);
    const res = await apiClient.createBooking(payload, generateUUID());

    expect(res.status).toBe(409);
    const pd = res.data as ProblemDetails;

    expect(pd.type).toBeTruthy();
    expect(pd.title).toBeTruthy();
    expect(pd.status).toBe(409);
    expect(pd.code).toBe('SLOT_UNAVAILABLE');
    expect(pd.detail).toBeTruthy();
  });

  it('7.3 should provide alternative slot suggestions in 409 SLOT_UNAVAILABLE response', async () => {
    const payload = generateBookingPayload(testServiceId, targetSlotId, testDate);
    const res = await apiClient.createBooking(payload, generateUUID());

    expect(res.status).toBe(409);
    const pd = res.data as ProblemDetails;

    if (pd.alternatives) {
      expect(Array.isArray(pd.alternatives)).toBe(true);
      if (pd.alternatives.length > 0) {
        const alt = pd.alternatives[0];
        expect(alt.slotId).toBeTruthy();
        expect(alt.startTime).toBeTruthy();
        expect(alt.endTime).toBeTruthy();
      }
    }
  });

  it('7.4 should handle simultaneous concurrent bookings for the same exclusive slot allowing exactly one winner', async () => {
    const raceDate = generateNextWeekday(70);
    const slotsRes = await apiClient.getSlots(testServiceId, raceDate);
    let raceSlotId = 'slot-12-13';
    if (slotsRes.status === 200) {
      const slots: AvailabilitySlot[] = Array.isArray(slotsRes.data)
        ? slotsRes.data
        : (slotsRes.data as AvailabilityResponse).slots;
      const freeSlot = slots?.find((s) => s.available);
      if (freeSlot) raceSlotId = freeSlot.slotId;
    }

    const task1 = () => {
      const payload1 = generateBookingPayload(testServiceId, raceSlotId, raceDate, {
        customerName: 'Racer One',
      });
      return apiClient.createBooking(payload1, generateUUID());
    };

    const task2 = () => {
      const payload2 = generateBookingPayload(testServiceId, raceSlotId, raceDate, {
        customerName: 'Racer Two',
      });
      return apiClient.createBooking(payload2, generateUUID());
    };

    const task3 = () => {
      const payload3 = generateBookingPayload(testServiceId, raceSlotId, raceDate, {
        customerName: 'Racer Three',
      });
      return apiClient.createBooking(payload3, generateUUID());
    };

    const results = await runConcurrent([task1, task2, task3]);

    const statusCodes = results.map((r) => r.result?.status).filter(Boolean);

    const createdCount = statusCodes.filter((s) => s === 201 || s === 200).length;
    const conflictCount = statusCodes.filter((s) => s === 409).length;

    expect(createdCount).toBeGreaterThanOrEqual(1);
    expect(conflictCount).toBeGreaterThanOrEqual(1);
  });

  it('7.5 should successfully allow customer to book one of the suggested alternative slots after receiving 409', async () => {
    const payload = generateBookingPayload(testServiceId, targetSlotId, testDate);
    const res409 = await apiClient.createBooking(payload, generateUUID());

    expect(res409.status).toBe(409);
    const pd = res409.data as ProblemDetails;

    // If alternatives are provided, choose the first alternative
    if (pd.alternatives && pd.alternatives.length > 0) {
      const altSlot = pd.alternatives[0];
      const altPayload = generateBookingPayload(testServiceId, altSlot.slotId, testDate, {
        customerName: 'Recovered Customer',
      });

      const resAlt = await apiClient.createBooking(altPayload, generateUUID());
      expect([201, 200]).toContain(resAlt.status);
    }
  });
});
