/**
 * Tier 4 Workload Scenario 07: Mobile Category Exclusion Enforcement
 * Specification: ORIGINAL_REQUEST.md (R4), PROJECT.md (§ Configurable Service Catalog), ADR-006
 *
 * Workflow:
 * 1. Fetch public service catalog and inspect all offerings
 * 2. Assert strict exclusion: Zero services offering mobile phone, smartphone, or tablet repairs
 * 3. Attempt direct slot availability lookup with excluded/invalid mobile service ID -> verify 404/400 ProblemDetails
 * 4. Attempt direct booking submission with excluded mobile service ID -> verify 400/404 ProblemDetails
 * 5. Verify RFC 7807 Problem Details compliance on all excluded category rejections
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { RepairReachApiClient } from '../../src/apiClient.js';
import {
  generateUUID,
  generateCustomerPhone,
  generateNextWeekday,
  SOLAPUR_LOCALITIES,
  EXCLUDED_SERVICES,
  assertProblemDetails,
} from '../../src/testUtils.js';
import type {
  ServiceCatalogItem,
  CreateBookingRequest,
  ProblemDetails,
} from '../../src/types.js';

describe('Tier 4 Scenario 07: Mobile Category Exclusion Enforcement', () => {
  let apiClient: RepairReachApiClient;
  let targetDate: string;

  beforeAll(() => {
    apiClient = new RepairReachApiClient();
    targetDate = generateNextWeekday(3);
  });

  it('Phase 1: Public service catalog strictly excludes mobile and smartphone repair offerings', async () => {
    const res = await apiClient.getServices();
    expect(res.status).toBe(200);
    expect(Array.isArray(res.data)).toBe(true);

    const services = res.data as ServiceCatalogItem[];
    expect(services.length).toBeGreaterThanOrEqual(1);

    const mobileKeywords = [
      'mobile',
      'smartphone',
      'smart phone',
      'cellphone',
      'cell phone',
      'iphone',
      'android phone',
      'ipad',
      'tablet',
    ];

    for (const service of services) {
      const codeLower = (service.code || '').toLowerCase();
      const nameLower = (service.name || '').toLowerCase();
      const descLower = (service.description || '').toLowerCase();
      const catLower = (service.category || '').toLowerCase();

      for (const keyword of mobileKeywords) {
        expect(codeLower).not.toContain(keyword);
        expect(nameLower).not.toContain(keyword);
        expect(descLower).not.toContain(keyword);
        expect(catLower).not.toContain(keyword);
      }
    }
  });

  it('Phase 2: Direct availability query for excluded mobile service ID is rejected (404/400)', async () => {
    for (const excludedCode of EXCLUDED_SERVICES) {
      const res = await apiClient.getSlots(excludedCode, targetDate);

      // Must not return 200 with available slots for an excluded category
      expect([400, 404]).toContain(res.status);

      if (typeof res.data === 'object' && res.data !== null) {
        assertProblemDetails(res.data, undefined, res.status);
        const problem = res.data as ProblemDetails;
        expect(problem.type).toBeTruthy();
        expect(problem.title).toBeTruthy();
        expect(
          problem.code === 'NOT_FOUND' ||
          problem.code === 'VALIDATION_FAILED' ||
          problem.title.toLowerCase().includes('not found') ||
          problem.title.toLowerCase().includes('service') ||
          problem.title.toLowerCase().includes('invalid')
        ).toBe(true);
      }
    }
  });

  it('Phase 3: Direct booking submission for excluded mobile phone repair is rejected (400/404)', async () => {
    const mobileBookingPayload: CreateBookingRequest = {
      customerName: 'Sachin Gaikwad',
      customerPhone: generateCustomerPhone('+91'),
      serviceId: '00000000-0000-0000-0005-000000000099', // Non-existent/mobile ID
      locationAddress: SOLAPUR_LOCALITIES[0],
      problemDescription: 'Smartphone screen cracked and battery draining rapidly',
      requestedDate: targetDate,
      requestedSlotId: 'slot-10-11',
    };
    const key = generateUUID();

    const res = await apiClient.createBooking(mobileBookingPayload, key);

    expect([400, 404]).toContain(res.status);

    if (typeof res.data === 'object' && res.data !== null) {
      assertProblemDetails(res.data, undefined, res.status);
      const problem = res.data as ProblemDetails;
      expect(problem.type).toBeTruthy();
      expect(problem.title).toBeTruthy();
      expect(problem.status).toBe(res.status);
      expect(
        problem.code === 'NOT_FOUND' ||
        problem.code === 'VALIDATION_FAILED' ||
        problem.title.toLowerCase().includes('service') ||
        problem.title.toLowerCase().includes('not found') ||
        problem.title.toLowerCase().includes('invalid')
      ).toBe(true);
    }
  });
});
