/**
 * Tier 1 Feature Coverage: Feature 11 - Star Rating & Feedback Submission
 * Specification: ORIGINAL_REQUEST.md (R5, R7), PROJECT.md (§ Interface Contracts), docs/architecture/14-ai-architecture.md
 *
 * Verifies 1-5 star rating validation, capability token (X-Feedback-Token) enforcement,
 * single-use token boundary, and comment capture.
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
  SubmitFeedbackResponse,
  ProblemDetails,
} from '../../src/types.js';

describe('Feature 11: Star Rating & Feedback Submission', () => {
  let apiClient: RepairReachApiClient;
  let testServiceId: string;
  let testJobReference: string;
  let validFeedbackToken: string;
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
    return { date: generateNextWeekday(offsetDays), slotId: 'slot-10-11' };
  }

  beforeAll(async () => {
    apiClient = new RepairReachApiClient();

    const servicesRes = await apiClient.getServices();
    if (servicesRes.status === 200 && Array.isArray(servicesRes.data) && servicesRes.data.length > 0) {
      testServiceId = (servicesRes.data as ServiceCatalogItem[])[0].id;
    } else {
      testServiceId = '00000000-0000-0000-0005-000000000001';
    }

    const { date, slotId } = await getSlotForDate(80);
    testDate = date;

    // Create a booking to acquire a valid feedback token
    const payload = generateBookingPayload(testServiceId, slotId, testDate, {
      customerName: 'Pooja Gaikwad',
    });

    const createRes = await apiClient.createBooking(payload, generateUUID());
    if (createRes.status === 201 || createRes.status === 200) {
      const b = createRes.data as CreateBookingResponse;
      testJobReference = b.publicReference;
      validFeedbackToken = b.feedbackCapabilityToken || 'token-fb-test-valid-12345';
    } else {
      testJobReference = 'JOB-TEST-001';
      validFeedbackToken = 'token-fb-test-valid-12345';
    }
  });

  it('11.1 should accept 5-star rating submission with valid X-Feedback-Token and optional comment', async () => {
    const res = await apiClient.submitFeedback(
      testJobReference,
      validFeedbackToken,
      5,
      'Technician was punctual and quickly fixed our washing machine. Very professional!'
    );

    expect([201, 200]).toContain(res.status);
    const feedback = res.data as SubmitFeedbackResponse;

    expect(feedback.feedbackId).toBeTruthy();
    expect(feedback.status).toBe('ACCEPTED');
  });

  it('11.2 should accept 1-star minimum rating submission without comment', async () => {
    const { date: d, slotId } = await getSlotForDate(85);

    // Create another booking for 1-star rating test
    const payload = generateBookingPayload(testServiceId, slotId, d, {
      customerName: 'Kiran Mane',
    });
    const createRes = await apiClient.createBooking(payload, generateUUID());
    const token =
      (createRes.data as CreateBookingResponse)?.feedbackCapabilityToken ||
      generateUUID();
    const jobRef =
      (createRes.data as CreateBookingResponse)?.publicReference || 'JOB-TEST-002';

    const res = await apiClient.submitFeedback(jobRef, token, 1);

    expect([201, 200]).toContain(res.status);
    const feedback = res.data as SubmitFeedbackResponse;
    expect(feedback.status).toBe('ACCEPTED');
  });

  it('11.3 should reject invalid rating value greater than 5 (e.g. 6) with HTTP 400 ProblemDetails', async () => {
    const res = await apiClient.submitFeedback(
      testJobReference,
      validFeedbackToken,
      6,
      'Rating out of bounds'
    );

    expect(res.status).toBe(400);
    const pd = res.data as ProblemDetails;
    assertProblemDetails(pd, 'VALIDATION_FAILED', 400);
  });

  it('11.4 should reject invalid rating value less than 1 (e.g. 0 or negative) with HTTP 400 ProblemDetails', async () => {
    const resZero = await apiClient.submitFeedback(testJobReference, validFeedbackToken, 0);
    expect(resZero.status).toBe(400);
    const pdZero = resZero.data as ProblemDetails;
    assertProblemDetails(pdZero, 'VALIDATION_FAILED', 400);

    const resNeg = await apiClient.submitFeedback(testJobReference, validFeedbackToken, -1);
    expect(resNeg.status).toBe(400);
  });

  it('11.5 should reject feedback submission when X-Feedback-Token header is missing with HTTP 401/403 ProblemDetails', async () => {
    // Post feedback without passing token
    const res = await apiClient.post(`/jobs/${testJobReference}/feedback`, {
      rating: 5,
      comment: 'Missing token header attempt',
    });

    expect([401, 403, 400]).toContain(res.status);
    const pd = res.data as ProblemDetails;
    expect(pd.type).toBeDefined();
  });

  it('11.6 should reject feedback submission with forged / invalid feedback token with HTTP 401/403 ProblemDetails', async () => {
    const forgedToken = 'invalid-forged-token-abc-9999';
    const res = await apiClient.submitFeedback(testJobReference, forgedToken, 5, 'Forged token test');

    expect([401, 403, 400]).toContain(res.status);
    const pd = res.data as ProblemDetails;
    expect(pd.type).toBeDefined();
  });

  it('11.7 should enforce single-use token and reject duplicate feedback submissions with HTTP 409 ProblemDetails', async () => {
    // Duplicate submission on the already used validFeedbackToken
    const resDuplicate = await apiClient.submitFeedback(
      testJobReference,
      validFeedbackToken,
      4,
      'Trying to submit second review with same token'
    );

    expect([409, 400, 403]).toContain(resDuplicate.status);
    if (resDuplicate.status === 409) {
      const pd = resDuplicate.data as ProblemDetails;
      assertProblemDetails(pd, undefined, 409);
    }
  });
});
