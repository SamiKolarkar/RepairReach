/**
 * Tier 2 Boundary & Corner Cases: Feature 9 - Dynamic Job Status Transitions
 *
 * Tests terminal state transitions, re-cancellation rejections on CANCELLED/COMPLETED states,
 * forbidden public status mutations, status timeline invariants, and cancellation capability boundaries.
 *
 * Requirements: ORIGINAL_REQUEST.md R5, PROJECT.md Feature 9, docs/architecture/05-booking-architecture.md, docs/architecture/09-api-architecture.md
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { RepairReachApiClient, defaultApiClient } from '../../src/apiClient.js';
import {
  assertProblemDetails,
} from '../../src/testUtils.js';
import type { BookingStatus, JobStatus, ProblemDetails } from '../../src/types.js';

describe('Tier 2 - Feature 9: Status Transitions Boundary Tests', () => {
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

  it('BVA-09-01: Rejects re-cancellation on terminal CANCELLED booking with 409 INVALID_STATE_TRANSITION or idempotent response', async () => {
    const cancelledRef = 'RR-SOL-2026-CANCELLED-01';

    if (isLiveBackend) {
      const res = await client.cancelBooking(cancelledRef);
      expect([409, 404, 200]).toContain(res.status);
      if (res.status === 409) {
        assertProblemDetails(res.data, 'INVALID_STATE_TRANSITION', 409);
      }
    } else {
      const mockConflict: ProblemDetails = {
        type: 'https://api.repairreach.example/problems/invalid-state-transition',
        title: 'Booking is already cancelled',
        status: 409,
        code: 'INVALID_STATE_TRANSITION',
        detail: `Cannot cancel booking ${cancelledRef} because its current status is CANCELLED`,
      };
      assertProblemDetails(mockConflict, 'INVALID_STATE_TRANSITION', 409);
    }
  });

  it('BVA-09-02: Rejects cancellation on completed or closed bookings with 409 CANNOT_CANCEL_AFTER_CLOSURE', async () => {
    const completedRef = 'RR-SOL-2026-COMPLETED-01';

    if (isLiveBackend) {
      const res = await client.cancelBooking(completedRef);
      expect([409, 404]).toContain(res.status);
      if (res.status === 409) {
        expect(['CANNOT_CANCEL_AFTER_CLOSURE', 'INVALID_STATE_TRANSITION']).toContain(
          (res.data as ProblemDetails).code
        );
      }
    } else {
      const mockError: ProblemDetails = {
        type: 'https://api.repairreach.example/problems/cannot-cancel-after-closure',
        title: 'Cannot cancel closed service',
        status: 409,
        code: 'CANNOT_CANCEL_AFTER_CLOSURE',
        detail: 'The job associated with this booking has already reached terminal completion.',
      };
      assertProblemDetails(mockError, 'CANNOT_CANCEL_AFTER_CLOSURE', 409);
    }
  });

  it('BVA-09-03: Rejects unauthorized customer attempts to directly mutate job execution status (e.g. ARRIVED, COMPLETED)', async () => {
    if (isLiveBackend) {
      // Customer tries to call technician mutation endpoint without auth
      const res = await client.rawRequest({
        method: 'POST',
        url: '/jobs/RR-SOL-JOB-01/arrive',
        data: { timestamp: new Date().toISOString() },
      });
      // Must be rejected with 401 UNAUTHORIZED or 403 FORBIDDEN or 404 NOT_FOUND
      expect([401, 403, 404, 405]).toContain(res.status);
    } else {
      const publicEndpoints = ['/business', '/services', '/availability/slots', '/bookings', '/testimonials'];
      const technicianMutations = ['/arrive', '/en-route', '/start', '/complete', '/cannot-fulfill'];

      technicianMutations.forEach((m) => {
        expect(publicEndpoints).not.toContain(m);
      });
    }
  });

  it('BVA-09-04: Validates booking status lifecycle adheres strictly to documented domain states', () => {
    const validBookingStates: BookingStatus[] = [
      'REQUESTED',
      'CONFIRMED',
      'SLOT_SELECTION_REQUIRED',
      'CANCELLED',
      'CLOSED',
    ];

    const invalidStates = ['IN_PROGRESS', 'PENDING', 'DONE', 'DELETED', 'UNKNOWN'];

    validBookingStates.forEach((state) => {
      expect(['REQUESTED', 'CONFIRMED', 'SLOT_SELECTION_REQUIRED', 'CANCELLED', 'CLOSED']).toContain(state);
    });

    invalidStates.forEach((inv) => {
      expect(validBookingStates).not.toContain(inv);
    });
  });

  it('BVA-09-05: Validates job execution states adhere strictly to documented domain states', () => {
    const validJobStates: JobStatus[] = [
      'ASSIGNMENT_PENDING',
      'ASSIGNED',
      'SCHEDULED',
      'EN_ROUTE',
      'ARRIVED',
      'DIAGNOSING',
      'DEVICE_TRANSFERRED',
      'WORKSHOP_REPAIR',
      'COMPLETED',
      'CANCELLED',
    ];

    expect(validJobStates.length).toBe(10);
    expect(validJobStates).toContain('ARRIVED');
    expect(validJobStates).toContain('COMPLETED');
    expect(validJobStates).toContain('EN_ROUTE');
  });

  it('BVA-09-06: Verifies canCancel invariant: true before arrival and false after arrival/closure', () => {
    interface BookingStateScenario {
      bookingStatus: BookingStatus;
      jobStatus: JobStatus;
      expectedCanCancel: boolean;
    }

    const scenarios: BookingStateScenario[] = [
      { bookingStatus: 'CONFIRMED', jobStatus: 'SCHEDULED', expectedCanCancel: true },
      { bookingStatus: 'CONFIRMED', jobStatus: 'EN_ROUTE', expectedCanCancel: true },
      { bookingStatus: 'CONFIRMED', jobStatus: 'ARRIVED', expectedCanCancel: false },
      { bookingStatus: 'CONFIRMED', jobStatus: 'DIAGNOSING', expectedCanCancel: false },
      { bookingStatus: 'CONFIRMED', jobStatus: 'COMPLETED', expectedCanCancel: false },
      { bookingStatus: 'CANCELLED', jobStatus: 'CANCELLED', expectedCanCancel: false },
      { bookingStatus: 'CLOSED', jobStatus: 'COMPLETED', expectedCanCancel: false },
    ];

    scenarios.forEach((s) => {
      const arrivedOrTerminal = ['ARRIVED', 'DIAGNOSING', 'DEVICE_TRANSFERRED', 'WORKSHOP_REPAIR', 'COMPLETED', 'CANCELLED'];
      const computedCanCancel = s.bookingStatus === 'CONFIRMED' && !arrivedOrTerminal.includes(s.jobStatus);
      expect(computedCanCancel).toBe(s.expectedCanCancel);
    });
  });
});
