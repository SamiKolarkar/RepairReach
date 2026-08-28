/**
 * Pairwise Test Suite 05: Feedback Token Lifecycle x Submission x Invalidation.
 *
 * Matrix Dimensions:
 * - Star Rating Values: 5-star (enthusiastic), 3-star (neutral), 1-star (severe complaint)
 * - Feedback Comment Content: Detailed comment vs Omitted/Empty comment (optional field)
 * - Capability Token State:
 *   1. Fresh valid token -> 201 ACCEPTED
 *   2. Used/Replayed token -> 400/409/422 FEEDBACK_ALREADY_SUBMITTED or INVALID_FEEDBACK_TOKEN
 *   3. Forged/Invalid token -> 400/401/403/404 INVALID_FEEDBACK_TOKEN
 *   4. Missing token header -> 400/401 VALIDATION_FAILED or UNAUTHORIZED
 * - Boundary Validation: Rating < 1, Rating > 5, non-integer rating -> 400 VALIDATION_FAILED
 * - Immutability: Customer feedback once accepted cannot be overwritten
 *
 * Expected Outputs derived from:
 * - docs/architecture/14-ai-architecture.md (§ Original feedback, Separation of records)
 * - docs/architecture/09-api-architecture.md (§ POST /api/v1/public/jobs/{jobReference}/feedback)
 * - PROJECT.md (Feedback Domain and Error Codes)
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { RepairReachApiClient } from '../../src/apiClient.js';
import {
  generateUUID,
  generateNextWeekday,
  generateCustomerPhone,
  assertValidBookingResponse,
  assertProblemDetails,
  SOLAPUR_LOCALITIES,
} from '../../src/testUtils.js';
import type {
  CreateBookingRequest,
  CreateBookingResponse,
  SubmitFeedbackRequest,
  SubmitFeedbackResponse,
  ProblemDetails,
} from '../../src/types.js';

describe('Pairwise 05: Feedback Token Lifecycle x Submission x Invalidation', () => {
  const client = new RepairReachApiClient();
  let defaultServiceId = '00000000-0000-0000-0005-000000000001';

  beforeAll(async () => {
    const srvRes = await client.getServices();
    if (srvRes.status === 200 && Array.isArray(srvRes.data) && srvRes.data.length > 0) {
      defaultServiceId = srvRes.data[0].id;
    }
  });

  async function createTestBookingWithToken(): Promise<{
    publicReference: string;
    token: string;
  }> {
    const key = generateUUID();
    const payload: CreateBookingRequest = {
      customerName: 'Feedback Tester',
      customerPhone: generateCustomerPhone('+91'),
      serviceId: defaultServiceId,
      locationAddress: SOLAPUR_LOCALITIES[0],
      problemDescription: 'Feedback lifecycle check',
      requestedDate: generateNextWeekday(2),
      requestedSlotId: '09:00-10:00',
    };

    const res = await client.createBooking(payload, key);
    const booking = res.data as CreateBookingResponse;
    const token = booking.feedbackCapabilityToken || `fb-token-${generateUUID()}`;
    const publicRef = booking.publicReference || `RR-${generateUUID().substring(0, 8)}`;
    return { publicReference: publicRef, token };
  }

  it('Pairwise 5.1: 5-Star Rating with Positive Comment x Valid Capability Token -> 201 ACCEPTED', async () => {
    const { publicReference, token } = await createTestBookingWithToken();

    const feedbackPayload: SubmitFeedbackRequest = {
      rating: 5,
      comment: 'Excellent service! Ramesh arrived right on time and fixed the washing machine noise in under 45 minutes.',
    };

    const res = await client.submitFeedback(publicReference, feedbackPayload, token);
    expect([200, 201]).toContain(res.status);

    const data = res.data as SubmitFeedbackResponse;
    expect(data.status).toBe('ACCEPTED');
    expect(data.feedbackId).toBeDefined();
    expect(data.submittedAt).toBeDefined();
  });

  it('Pairwise 5.2: 1-Star Rating with Complaint x Valid Capability Token -> 201 ACCEPTED (stored immutably)', async () => {
    const { publicReference, token } = await createTestBookingWithToken();

    const feedbackPayload: SubmitFeedbackRequest = {
      rating: 1,
      comment: 'Water leakage persisted immediately after technician left. Extremely disappointed.',
    };

    const res = await client.submitFeedback(publicReference, feedbackPayload, token);
    expect([200, 201]).toContain(res.status);

    const data = res.data as SubmitFeedbackResponse;
    expect(data.status).toBe('ACCEPTED');
    expect(data.feedbackId).toBeDefined();
  });

  it('Pairwise 5.3: 3-Star Rating without Comment (Optional Field Omitted) -> 201 ACCEPTED', async () => {
    const { publicReference, token } = await createTestBookingWithToken();

    const feedbackPayload: SubmitFeedbackRequest = {
      rating: 3,
    };

    const res = await client.submitFeedback(publicReference, feedbackPayload, token);
    expect([200, 201]).toContain(res.status);

    const data = res.data as SubmitFeedbackResponse;
    expect(data.status).toBe('ACCEPTED');
  });

  it('Pairwise 5.4: Replay Attack / Token Invalidation: Submitting second feedback with used token -> Rejected with 400/409/422', async () => {
    const { publicReference, token } = await createTestBookingWithToken();

    // First submission succeeds
    const firstRes = await client.submitFeedback(
      publicReference,
      { rating: 4, comment: 'First review submitted' },
      token
    );
    expect([200, 201]).toContain(firstRes.status);

    // Second submission with the SAME token must be rejected
    const secondRes = await client.submitFeedback(
      publicReference,
      { rating: 2, comment: 'Attempting to overwrite first review' },
      token
    );
    expect([400, 403, 409, 422]).toContain(secondRes.status);

    const problem = secondRes.data as ProblemDetails;
    if (problem && problem.title) {
      expect(problem.status).toBe(secondRes.status);
    }
  });

  it('Pairwise 5.5: Forged / Arbitrary Capability Token -> RFC 7807 INVALID_FEEDBACK_TOKEN Error', async () => {
    const { publicReference } = await createTestBookingWithToken();
    const forgedToken = `forged-capability-token-${generateUUID()}`;

    const res = await client.submitFeedback(
      publicReference,
      { rating: 5, comment: 'Trying forged token' },
      forgedToken
    );

    expect([400, 401, 403, 404, 422]).toContain(res.status);
    const problem = res.data as ProblemDetails;
    if (problem && problem.title) {
      expect(problem.status).toBe(res.status);
    }
  });

  it('Pairwise 5.6: Rating Boundary Violations (Rating < 1 or Rating > 5) -> RFC 7807 400 VALIDATION_FAILED', async () => {
    const { publicReference, token } = await createTestBookingWithToken();

    const invalidRatings = [0, 6, -1, 10, 2.5];

    for (const invalidRating of invalidRatings) {
      const res = await client.submitFeedback(
        publicReference,
        { rating: invalidRating, comment: `Invalid rating test ${invalidRating}` },
        token
      );

      expect([400, 422]).toContain(res.status);
      const problem = res.data as ProblemDetails;
      if (problem && problem.title) {
        expect(problem.status).toBe(res.status);
      }
    }
  });
});
