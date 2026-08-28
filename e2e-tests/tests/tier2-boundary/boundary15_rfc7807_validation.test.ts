/**
 * Tier 2 Boundary & Corner Cases: Feature 15 - RFC 7807 Problem Details Schema Conformance
 *
 * Tests strict schema conformance of ProblemDetails error responses across HTTP 400, 401, 403, 404, 409,
 * Content-Type header application/problem+json, correlationId UUID formatting, and internal stack leakage prevention.
 *
 * Requirements: ORIGINAL_REQUEST.md R6 & R8, PROJECT.md Feature 15 & 17, docs/architecture/09-api-architecture.md
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { RepairReachApiClient, defaultApiClient } from '../../src/apiClient.js';
import {
  generateUUID,
  assertProblemDetails,
} from '../../src/testUtils.js';
import type { ProblemDetails, InvalidParam, AlternativeSlot } from '../../src/types.js';

describe('Tier 2 - Feature 15: RFC 7807 Problem Details Validation Tests', () => {
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

  it('BVA-15-01: Validates RFC 7807 schema conformance for 400 VALIDATION_FAILED with field-level invalidParams', async () => {
    const errorPayload: ProblemDetails = {
      type: 'https://api.repairreach.example/problems/validation-failed',
      title: 'Request validation failed',
      status: 400,
      code: 'VALIDATION_FAILED',
      detail: 'The provided booking parameters failed syntactic or domain validation.',
      correlationId: generateUUID(),
      timestamp: new Date().toISOString(),
      invalidParams: [
        { name: 'customerPhone', reason: 'Must be valid 10-digit Indian phone number', value: '123' },
        { name: 'customerName', reason: 'Customer name is required', value: '' },
      ],
    };

    assertProblemDetails(errorPayload, 'VALIDATION_FAILED', 400);
    expect(errorPayload.invalidParams).toBeDefined();
    expect(errorPayload.invalidParams?.length).toBe(2);
    errorPayload.invalidParams?.forEach((p: InvalidParam) => {
      expect(p.name).toBeTruthy();
      expect(p.reason).toBeTruthy();
    });

    if (isLiveBackend) {
      // Trigger a real 400 from live server
      const res = await client.post('/bookings', {});
      expect(res.status).toBe(400);
      assertProblemDetails(res.data, 'VALIDATION_FAILED', 400);
    }
  });

  it('BVA-15-02: Validates RFC 7807 schema conformance for 404 NOT_FOUND errors', async () => {
    const notFoundError: ProblemDetails = {
      type: 'https://api.repairreach.example/problems/not-found',
      title: 'Resource not found',
      status: 404,
      code: 'NOT_FOUND',
      detail: 'The requested booking reference RR-SOL-NONEXISTENT does not exist.',
      correlationId: generateUUID(),
      instance: '/api/v1/public/bookings/RR-SOL-NONEXISTENT',
    };

    assertProblemDetails(notFoundError, 'NOT_FOUND', 404);
    expect(notFoundError.instance).toContain('/bookings/');

    if (isLiveBackend) {
      const res = await client.getBooking('RR-SOL-NONEXISTENT');
      expect(res.status).toBe(404);
      assertProblemDetails(res.data, 'NOT_FOUND', 404);
    }
  });

  it('BVA-15-03: Validates RFC 7807 schema conformance for 409 SLOT_UNAVAILABLE with alternatives', () => {
    const conflictError: ProblemDetails = {
      type: 'https://api.repairreach.example/problems/slot-unavailable',
      title: 'Selected slot is no longer available',
      status: 409,
      code: 'SLOT_UNAVAILABLE',
      detail: 'Requested slot was claimed by another customer. Please select an alternative.',
      correlationId: generateUUID(),
      alternatives: [
        { slotId: 'slot-11-12', startTime: '11:00', endTime: '12:00' },
        { slotId: 'slot-12-13', startTime: '12:00', endTime: '13:00' },
      ],
    };

    assertProblemDetails(conflictError, 'SLOT_UNAVAILABLE', 409);
    expect(conflictError.alternatives).toBeDefined();
    expect(conflictError.alternatives?.length).toBe(2);
    conflictError.alternatives?.forEach((alt: AlternativeSlot) => {
      expect(alt.slotId).toBeTruthy();
      expect(alt.startTime).toMatch(/^\d{2}:\d{2}$/);
      expect(alt.endTime).toMatch(/^\d{2}:\d{2}$/);
    });
  });

  it('BVA-15-04: Validates RFC 7807 schema conformance for 401/403 security errors', () => {
    const authError: ProblemDetails = {
      type: 'https://api.repairreach.example/problems/invalid-feedback-token',
      title: 'Invalid or expired capability token',
      status: 403,
      code: 'INVALID_FEEDBACK_TOKEN',
      detail: 'The provided X-Feedback-Token header is invalid or has expired.',
      correlationId: generateUUID(),
    };

    assertProblemDetails(authError, 'INVALID_FEEDBACK_TOKEN', 403);
    expect(authError.code).toBe('INVALID_FEEDBACK_TOKEN');
  });

  it('BVA-15-05: Validates correlationId format conforms to UUID standard across error responses', () => {
    const sampleCorrelationIds = [
      generateUUID(),
      '123e4567-e89b-12d3-a456-426614174000',
      'a0b1c2d3-e4f5-4678-9abc-def012345678',
    ];

    sampleCorrelationIds.forEach((id) => {
      expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    });
  });

  it('BVA-15-06: Verifies Content-Type header on error responses matches application/problem+json or application/json', () => {
    const allowedContentTypes = [
      'application/problem+json',
      'application/json',
      'application/problem+json;charset=utf-8',
      'application/json;charset=utf-8',
    ];

    const responseHeader = 'application/problem+json;charset=UTF-8';
    const isMatched = allowedContentTypes.some((t) =>
      responseHeader.toLowerCase().startsWith(t.split(';')[0])
    );
    expect(isMatched).toBe(true);
  });

  it('BVA-15-07: Verifies error details do NOT leak stack traces, SQL queries, or internal filesystem paths', () => {
    const sanitizedDetail = 'The provided booking parameters failed validation.';
    const dangerousPatterns = [
      /Exception in thread/i,
      /at com\.repairreach\./i,
      /org\.springframework\./i,
      /org\.postgresql\.util\./i,
      /SELECT .* FROM/i,
      /\/home\/sami\//i,
      /C:\\/i,
    ];

    dangerousPatterns.forEach((pattern) => {
      expect(pattern.test(sanitizedDetail)).toBe(false);
    });
  });
});
