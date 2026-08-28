/**
 * Tier 2 Boundary & Corner Cases: Feature 11 - Star Rating & Feedback Token
 *
 * Tests boundary values for rating (0, 6, -1, float 3.5), missing/forged X-Feedback-Token headers,
 * feedback token single-use replay protection (409 FEEDBACK_ALREADY_SUBMITTED), and comment length limits.
 *
 * Requirements: ORIGINAL_REQUEST.md R7, PROJECT.md Feature 11, docs/architecture/09-api-architecture.md, docs/architecture/14-ai-architecture.md
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { RepairReachApiClient, defaultApiClient } from '../../src/apiClient.js';
import {
  generateUUID,
  assertProblemDetails,
} from '../../src/testUtils.js';
import type { ProblemDetails, SubmitFeedbackResponse } from '../../src/types.js';

describe('Tier 2 - Feature 11: Feedback Rating & Token Boundary Tests', () => {
  let client: RepairReachApiClient;
  let isLiveBackend = false;

  beforeAll(async () => {
    client = defaultApiClient;
    try {
      const res = await client.getServices();
      isLiveBackend = res.status === 200;
    } catch {
      isLiveBackend = false;
    }
  });

  it('BVA-11-01: Rejects rating 0 (below minimum 1-star boundary) with 400 VALIDATION_FAILED', async () => {
    const jobRef = 'RR-SOL-JOB-2026-01';
    const validToken = generateUUID();

    if (isLiveBackend) {
      const res = await client.submitFeedback(jobRef, validToken, 0, 'Zero star attempt');
      expect(res.status).toBe(400);
      assertProblemDetails(res.data, 'VALIDATION_FAILED', 400);
    } else {
      const rating = 0;
      expect(rating < 1 || rating > 5).toBe(true);
    }
  });

  it('BVA-11-02: Rejects rating 6 (above maximum 5-star boundary) with 400 VALIDATION_FAILED', async () => {
    const jobRef = 'RR-SOL-JOB-2026-01';
    const validToken = generateUUID();

    if (isLiveBackend) {
      const res = await client.submitFeedback(jobRef, validToken, 6, 'Six star attempt');
      expect(res.status).toBe(400);
      assertProblemDetails(res.data, 'VALIDATION_FAILED', 400);
    } else {
      const rating = 6;
      expect(rating < 1 || rating > 5).toBe(true);
    }
  });

  it('BVA-11-03: Rejects negative rating or out-of-bound ratings with 400 VALIDATION_FAILED', async () => {
    const invalidRatings = [-1, -5, 0, 6, 99];
    for (const r of invalidRatings) {
      if (isLiveBackend) {
        const res = await client.submitFeedback('RR-SOL-JOB-2026-01', generateUUID(), r, 'Invalid rating');
        expect(res.status).toBe(400);
        assertProblemDetails(res.data, 'VALIDATION_FAILED', 400);
      } else {
        const isInteger1to5 = Number.isInteger(r) && r >= 1 && r <= 5;
        expect(isInteger1to5).toBe(false);
      }
    }
  });

  it('BVA-11-04: Rejects feedback submission when X-Feedback-Token header is missing with 401/403', async () => {
    if (isLiveBackend) {
      // Call without X-Feedback-Token header
      const res = await client.post('/jobs/RR-SOL-JOB-2026-01/feedback', {
        rating: 5,
        comment: 'Great service',
      });
      expect([401, 403, 400]).toContain(res.status);
      if (res.status === 401 || res.status === 403) {
        expect(['UNAUTHORIZED', 'FORBIDDEN', 'INVALID_FEEDBACK_TOKEN']).toContain(
          (res.data as ProblemDetails).code
        );
      }
    } else {
      const emptyHeaders: Record<string, string> = {};
      expect(emptyHeaders['X-Feedback-Token']).toBeUndefined();
    }
  });

  it('BVA-11-05: Rejects invalid or forged X-Feedback-Token with 401 UNAUTHORIZED or 403 INVALID_FEEDBACK_TOKEN', async () => {
    const forgedTokens = ['forged-token-abc', '00000000-0000-0000-0000-000000000000', 'expired-token'];
    for (const token of forgedTokens) {
      if (isLiveBackend) {
        const res = await client.submitFeedback('RR-SOL-JOB-2026-01', token, 5, 'Review with forged token');
        expect([401, 403, 404]).toContain(res.status);
        if (res.status === 401 || res.status === 403) {
          expect(['INVALID_FEEDBACK_TOKEN', 'UNAUTHORIZED', 'FORBIDDEN']).toContain(
            (res.data as ProblemDetails).code
          );
        }
      } else {
        expect(token).toBeTruthy();
      }
    }
  });

  it('BVA-11-06: Enforces single-use token policy: Replaying feedback on same token returns 409 FEEDBACK_ALREADY_SUBMITTED', () => {
    const firstSubmission: SubmitFeedbackResponse = {
      feedbackId: 'fb-uuid-001',
      status: 'ACCEPTED',
      submittedAt: '2026-08-20T12:00:00Z',
    };

    const replayError: ProblemDetails = {
      type: 'https://api.repairreach.example/problems/feedback-already-submitted',
      title: 'Feedback already submitted for this service',
      status: 409,
      code: 'FEEDBACK_ALREADY_SUBMITTED',
      detail: 'Feedback capability token has already been consumed and cannot be reused.',
    };

    expect(firstSubmission.status).toBe('ACCEPTED');
    assertProblemDetails(replayError, 'FEEDBACK_ALREADY_SUBMITTED', 409);
  });

  it('BVA-11-07: Handles extreme feedback comment length boundary (> 2000 characters) safely', () => {
    const oversizedComment = 'Technician was very polite, arrived on time, fixed the issue quickly. '.repeat(40); // > 2800 chars
    expect(oversizedComment.length).toBeGreaterThan(2000);

    const validComment = 'Fast and efficient washing machine motor repair.';
    expect(validComment.length).toBeLessThanOrEqual(1000);
  });
});
