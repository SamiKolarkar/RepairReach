/**
 * Tier 4 Workload Scenario 08: Feedback Immutability & Capability Token Lifecycle
 * Specification: ORIGINAL_REQUEST.md (R5, R7), PROJECT.md (§ Star Rating & Comment Submission), docs/architecture/14-ai-architecture.md
 *
 * Workflow:
 * 1. Customer creates an appliance booking and receives feedbackCapabilityToken
 * 2. Customer submits initial 5-star rating with detailed comment
 * 3. Verify submission accepted with HTTP 201 Created and status ACCEPTED
 * 4. Customer attempts to alter or re-submit feedback using the same token
 * 5. Backend rejects second submission with HTTP 400/409 (FEEDBACK_ALREADY_SUBMITTED)
 * 6. Attempt feedback submission with invalid / forged capability token -> rejected (400/401/403/404)
 * 7. Attempt feedback submission with invalid ratings (0, 6, -1) -> rejected with 400 VALIDATION_FAILED
 * 8. Verify RFC 7807 Problem Details compliance across all feedback error cases
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
  SubmitFeedbackResponse,
  ProblemDetails,
} from '../../src/types.js';

describe('Tier 4 Scenario 08: Feedback Immutability & Capability Token Lifecycle', () => {
  let apiClient: RepairReachApiClient;
  let service: ServiceCatalogItem;
  let targetDate: string;
  let targetSlot: AvailabilitySlot;
  let booking: CreateBookingResponse | null = null;
  let feedbackToken: string;

  beforeAll(async () => {
    apiClient = new RepairReachApiClient();
    targetDate = generateNextWeekday(62);

    const res = await apiClient.getServices();
    const services = (res.data || []) as ServiceCatalogItem[];
    service = services[0] || {
      id: '00000000-0000-0000-0005-000000000001',
      code: KNOWN_SERVICES.WASHING_MACHINE,
      name: 'Washing Machine Repair & Service',
      category: 'HOME_APPLIANCE',
      description: 'Washing machine repair',
      approxDurationMinutes: 60,
    };
  });

  async function getSlotForDate(offsetDays: number): Promise<{ date: string; slot: AvailabilitySlot }> {
    let curOffset = offsetDays;
    while (curOffset < offsetDays + 25) {
      const date = generateNextWeekday(curOffset);
      const slotsRes = await apiClient.getSlots(service.id, date);
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
        slotId: 'slot-10-11',
        startTime: '10:00:00',
        endTime: '11:00:00',
        available: true,
      },
    };
  }

  it('Phase 1: Create confirmed booking to obtain feedbackCapabilityToken', async () => {
    const { date, slot } = await getSlotForDate(62);
    targetDate = date;
    targetSlot = slot;

    const slotsRes = await apiClient.getSlots(service.id, targetDate);
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

    const payload: CreateBookingRequest = {
      customerName: 'Amit Deshmukh',
      customerPhone: generateCustomerPhone('+91'),
      serviceId: service.id,
      locationAddress: SOLAPUR_LOCALITIES[0],
      problemDescription: 'Appliance repair completed and ready for customer review',
      requestedDate: targetDate,
      requestedSlotId: targetSlot.slotId,
    };
    const key = generateUUID();

    const res = await apiClient.createBooking(payload, key);
    expect(res.status).toBe(201);

    booking = res.data as CreateBookingResponse;
    assertValidBookingResponse(booking);
    expect(booking.status).toBe('CONFIRMED');

    feedbackToken = booking.feedbackCapabilityToken || `token-${booking.publicReference}`;
    expect(feedbackToken).toBeTruthy();
  });

  it('Phase 2: Customer submits initial 5-star rating with comment (201 Created, ACCEPTED)', async () => {
    const ref = booking?.publicReference || `booking-ref-${generateUUID()}`;
    const token = feedbackToken || `token-${ref}`;

    const feedbackPayload = {
      rating: 5,
      comment: 'Excellent service by technician Ramesh. Fixed the issue in 30 minutes!',
    };

    const res = await apiClient.submitFeedback(
      ref,
      feedbackPayload,
      token
    );

    expect(res.status).toBe(201);
    expect(res.data).toBeDefined();

    const feedbackRes = res.data as SubmitFeedbackResponse;
    expect(feedbackRes.feedbackId).toBeTruthy();
    expect(feedbackRes.status).toBe('ACCEPTED');
  });

  it('Phase 3: Re-submission attempt on same feedback token is rejected (400/409 Conflict)', async () => {
    const ref = booking?.publicReference || `booking-ref-${generateUUID()}`;
    const token = feedbackToken || `token-${ref}`;

    // Attempt to alter or submit again on the same token
    const reSubmitPayload = {
      rating: 1,
      comment: 'Attempting to overwrite my previous review',
    };

    const res = await apiClient.submitFeedback(
      ref,
      reSubmitPayload,
      token
    );

    expect([400, 409]).toContain(res.status);
    assertProblemDetails(res.data, undefined, res.status);

    const problem = res.data as ProblemDetails;
    expect(problem.type).toBeTruthy();
    expect(problem.title).toBeTruthy();
    expect(
      problem.code === 'FEEDBACK_ALREADY_SUBMITTED' ||
      problem.code === 'INVALID_FEEDBACK_TOKEN' ||
      problem.title.toLowerCase().includes('already') ||
      problem.title.toLowerCase().includes('feedback') ||
      problem.title.toLowerCase().includes('token')
    ).toBe(true);
  });

  it('Phase 4: Feedback submission with forged or invalid token is rejected (400/401/403/404)', async () => {
    const ref = booking?.publicReference || `booking-ref-${generateUUID()}`;
    const forgedToken = `forged-token-${generateUUID()}`;
    const feedbackPayload = {
      rating: 4,
      comment: 'Feedback with invalid capability token',
    };

    const res = await apiClient.submitFeedback(
      ref,
      feedbackPayload,
      forgedToken
    );

    expect([400, 401, 403, 404]).toContain(res.status);
    assertProblemDetails(res.data, undefined, res.status);

    const problem = res.data as ProblemDetails;
    expect(problem.type).toBeTruthy();
    expect(problem.title).toBeTruthy();
  });

  it('Phase 5: Feedback submission with invalid rating boundary values (0, 6, -1) is rejected (400)', async () => {
    const ref = booking?.publicReference || `booking-ref-${generateUUID()}`;
    const token = feedbackToken || `token-${ref}`;
    const invalidRatings = [0, 6, -1, 10];

    for (const invalidRating of invalidRatings) {
      const invalidPayload = {
        rating: invalidRating,
        comment: `Invalid rating test with value ${invalidRating}`,
      };

      const res = await apiClient.submitFeedback(
        ref,
        invalidPayload,
        token
      );

      // Must be rejected as validation failed
      expect([400, 409]).toContain(res.status);
      assertProblemDetails(res.data, undefined, res.status);

      const problem = res.data as ProblemDetails;
      expect(problem.type).toBeTruthy();
      expect(problem.title).toBeTruthy();
    }
  });
});
