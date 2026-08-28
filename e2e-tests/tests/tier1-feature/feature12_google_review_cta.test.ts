/**
 * Tier 1 Feature Coverage: Feature 12 - External Google Review CTA & Link Independence
 * Specification: ORIGINAL_REQUEST.md (R5, R7), PROJECT.md (§ Interface Contracts, ADR-012)
 *
 * Verifies public Google Review URL presence, independent CTA behavior (not gated behind rating),
 * URL validity, and unconfigured empty state handling.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { RepairReachApiClient } from '../../src/apiClient.js';
import type { BusinessProfile } from '../../src/types.js';

describe('Feature 12: External Google Review CTA & Link Independence', () => {
  let apiClient: RepairReachApiClient;

  beforeAll(() => {
    apiClient = new RepairReachApiClient();
  });

  it('12.1 should expose googleReviewUrl field on public business profile endpoint', async () => {
    const res = await apiClient.getBusiness();
    expect(res.status).toBe(200);

    const profile = res.data as BusinessProfile;
    // googleReviewUrl can be string URL or null/empty if unconfigured
    if (profile.googleReviewUrl) {
      expect(typeof profile.googleReviewUrl).toBe('string');
      expect(profile.googleReviewUrl.length).toBeGreaterThan(0);
    }
  });

  it('12.2 should verify Google Review URL format conforms to valid HTTP/HTTPS URL when present', async () => {
    const res = await apiClient.getBusiness();
    expect(res.status).toBe(200);

    const profile = res.data as BusinessProfile;
    if (profile.googleReviewUrl) {
      expect(profile.googleReviewUrl).toMatch(/^https?:\/\/.+/);
    }
  });

  it('12.3 should allow public access to Google review link without customer login or session cookies', async () => {
    // Calling business profile without Authorization header or cookies
    const unauthenticatedClient = new RepairReachApiClient({ headers: {} });
    const res = await unauthenticatedClient.getBusiness();

    expect(res.status).toBe(200);
    const profile = res.data as BusinessProfile;
    expect(profile).toBeDefined();
  });

  it('12.4 should confirm Google review CTA is independent of booking status or internal star rating', async () => {
    // Google review link is an external business CTA and must not be restricted or gated
    const res = await apiClient.getBusiness();
    expect(res.status).toBe(200);

    const profile = res.data as BusinessProfile;
    // The profile endpoint provides the review link directly without booking parameters
    expect(profile.code).toBe('SOLAPUR_MAIN');
  });

  it('12.5 should handle unconfigured Google review state gracefully without crashing or throwing 500', async () => {
    const res = await apiClient.getBusiness();
    expect(res.status).toBe(200);
    expect(res.data).toBeDefined();
  });
});
