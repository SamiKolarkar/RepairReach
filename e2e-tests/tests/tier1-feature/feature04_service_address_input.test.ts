/**
 * Tier 1 Feature Coverage: Feature 04 - Service Address & Problem Description Input
 * Specification: ORIGINAL_REQUEST.md (R2), PROJECT.md (§ Interface Contracts), docs/architecture/09-api-architecture.md
 *
 * Verifies address input, Solapur landmarks/pincodes, problem description capture,
 * multiline text support, and validation rules.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { RepairReachApiClient } from '../../src/apiClient.js';
import {
  generateUUID,
  generateDate,
  generateBookingPayload,
  assertProblemDetails,
  SOLAPUR_LOCALITIES,
} from '../../src/testUtils.js';
import type { ServiceCatalogItem, ProblemDetails } from '../../src/types.js';

describe('Feature 04: Service Address & Problem Description Input', () => {
  let apiClient: RepairReachApiClient;
  let testServiceId: string;
  let testSlotId: string;
  let testDate: string;

  beforeAll(async () => {
    apiClient = new RepairReachApiClient();
    testDate = generateDate(3);

    const servicesRes = await apiClient.getServices();
    if (servicesRes.status === 200 && Array.isArray(servicesRes.data) && servicesRes.data.length > 0) {
      testServiceId = (servicesRes.data as ServiceCatalogItem[])[0].id;
    } else {
      testServiceId = '00000000-0000-0000-0005-000000000001';
    }

    testSlotId = 'slot-10-11';
  });

  it('4.1 should reject booking payload with missing or whitespace-only location address with HTTP 400 ProblemDetails', async () => {
    const payload = generateBookingPayload(testServiceId, testSlotId, testDate, {
      locationAddress: '   ',
    });

    const res = await apiClient.createBooking(payload, generateUUID());
    expect(res.status).toBe(400);

    const pd = res.data as ProblemDetails;
    assertProblemDetails(pd, 'VALIDATION_FAILED', 400);
  });

  it('4.2 should reject booking payload with missing or empty problem description with HTTP 400 ProblemDetails', async () => {
    const payload = generateBookingPayload(testServiceId, testSlotId, testDate, {
      problemDescription: '',
    });

    const res = await apiClient.createBooking(payload, generateUUID());
    expect(res.status).toBe(400);

    const pd = res.data as ProblemDetails;
    assertProblemDetails(pd, 'VALIDATION_FAILED', 400);
  });

  it('4.3 should accept detailed Solapur addresses with local landmarks and pincode (413001-413008)', async () => {
    for (const address of SOLAPUR_LOCALITIES) {
      const payload = generateBookingPayload(testServiceId, testSlotId, testDate, {
        locationAddress: address,
      });

      const res = await apiClient.createBooking(payload, generateUUID());
      // Must not fail address validation (not 400)
      expect(res.status).not.toBe(400);
    }
  });

  it('4.4 should accept multiline problem descriptions with special characters and carriage returns', async () => {
    const complexProblem = `1. Washing machine drum making loud screeching noise during spin cycle.\n2. Water is leaking from the bottom left corner near the drain pipe.\n3. Error code 'E02' appearing on the digital LED display.\nSpecial Note: Available only after 10:30 AM.`;

    const payload = generateBookingPayload(testServiceId, testSlotId, testDate, {
      problemDescription: complexProblem,
    });

    const res = await apiClient.createBooking(payload, generateUUID());
    expect(res.status).not.toBe(400);
  });

  it('4.5 should reject booking request with non-existent or invalid UUID serviceId with HTTP 400 or 404 ProblemDetails', async () => {
    const invalidServiceId = '00000000-0000-0000-0000-000000000000';
    const payload = generateBookingPayload(invalidServiceId, testSlotId, testDate);

    const res = await apiClient.createBooking(payload, generateUUID());
    expect([400, 404]).toContain(res.status);

    const pd = res.data as ProblemDetails;
    expect(pd.type).toBeDefined();
    expect(pd.title).toBeDefined();
  });

  it('4.6 should reject booking request with malformed / non-UUID string serviceId with HTTP 400 ProblemDetails', async () => {
    const malformedServiceId = 'invalid-service-identifier';
    const payload = generateBookingPayload(malformedServiceId, testSlotId, testDate);

    const res = await apiClient.createBooking(payload, generateUUID());
    expect(res.status).toBe(400);

    const pd = res.data as ProblemDetails;
    assertProblemDetails(pd, undefined, 400);
  });
});
