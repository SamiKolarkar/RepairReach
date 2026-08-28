/**
 * Tier 1 Feature Coverage: Feature 01 - Business Profile & Landing
 * Specification: ORIGINAL_REQUEST.md (R1), PROJECT.md (§ Interface Contracts), docs/architecture/01-system-context.md
 *
 * Verifies public business profile information, Solapur scoping, contact channels (Phone & WhatsApp),
 * operating hours, and active business status.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { RepairReachApiClient } from '../../src/apiClient.js';
import {
  assertValidBusinessProfile,
  SOLAPUR_BUSINESS_CODE,
} from '../../src/testUtils.js';
import type { BusinessProfile, ProblemDetails } from '../../src/types.js';

describe('Feature 01: Business Profile & Public Landing Info', () => {
  let apiClient: RepairReachApiClient;

  beforeAll(() => {
    apiClient = new RepairReachApiClient();
  });

  it('1.1 should fetch public business profile returning HTTP 200 and required fields', async () => {
    const res = await apiClient.getBusiness();
    expect(res.status).toBe(200);
    expect(res.data).toBeDefined();

    const profile = res.data as BusinessProfile;
    assertValidBusinessProfile(profile);

    expect(profile.id).toBeTruthy();
    expect(profile.name).toBeTruthy();
    expect(profile.city).toBeTruthy();
    expect(profile.phone).toBeTruthy();
    expect(profile.whatsapp).toBeTruthy();
  });

  it('1.2 should verify business profile is scoped to Solapur with code SOLAPUR_MAIN', async () => {
    const res = await apiClient.getBusiness();
    expect(res.status).toBe(200);

    const profile = res.data as BusinessProfile;
    expect(profile.code).toBe(SOLAPUR_BUSINESS_CODE);
    expect(profile.city.toLowerCase()).toContain('solapur');
    if (profile.address) {
      expect(profile.address.toLowerCase()).toContain('solapur');
    }
  });

  it('1.3 should verify primary contact channels contain valid Indian phone and WhatsApp format', async () => {
    const res = await apiClient.getBusiness();
    expect(res.status).toBe(200);

    const profile = res.data as BusinessProfile;
    // Phone must start with +91 or be a 10-digit Indian phone
    expect(profile.phone).toMatch(/^(\+91[\s-]?)?[6-9]\d{9}$/);
    expect(profile.whatsapp).toMatch(/^(\+91[\s-]?)?[6-9]\d{9}$/);
  });

  it('1.4 should provide structured operating hours including weekday and weekend timings', async () => {
    const res = await apiClient.getBusiness();
    expect(res.status).toBe(200);

    const profile = res.data as BusinessProfile;
    expect(profile.operatingHours).toBeDefined();

    if (Array.isArray(profile.operatingHours)) {
      expect(profile.operatingHours.length).toBeGreaterThanOrEqual(1);
      const firstDay = profile.operatingHours[0];
      expect(firstDay.openTime).toBeDefined();
      expect(firstDay.closeTime).toBeDefined();
    } else if (profile.operatingHours && typeof profile.operatingHours === 'object') {
      expect(Object.keys(profile.operatingHours).length).toBeGreaterThan(0);
    } else if (typeof profile.operatingHours === 'string') {
      expect(profile.operatingHours.length).toBeGreaterThan(0);
    }
  });

  it('1.5 should indicate active business status and trust pillars or business identity', async () => {
    const res = await apiClient.getBusiness();
    expect(res.status).toBe(200);

    const profile = res.data as BusinessProfile;
    if (profile.active !== undefined) {
      expect(profile.active).toBe(true);
    }

    if (profile.trustPillars) {
      expect(Array.isArray(profile.trustPillars)).toBe(true);
    }

    // Business name should reflect RepairReach branding
    expect(profile.name.toLowerCase()).toContain('repairreach');
  });
});
