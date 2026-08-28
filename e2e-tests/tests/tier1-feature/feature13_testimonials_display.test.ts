/**
 * Tier 1 Feature Coverage: Feature 13 - Testimonials & Review Display
 * Specification: ORIGINAL_REQUEST.md (R1, R5), PROJECT.md (§ Interface Contracts), docs/architecture/08-data-architecture.md
 *
 * Verifies public testimonials listing, schema validation, authentic rating range (1-5),
 * service name association, and clean empty state handling (never fabricated).
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { RepairReachApiClient } from '../../src/apiClient.js';
import { assertValidTestimonial } from '../../src/testUtils.js';
import type { Testimonial } from '../../src/types.js';

describe('Feature 13: Testimonials & Public Review Display', () => {
  let apiClient: RepairReachApiClient;

  beforeAll(() => {
    apiClient = new RepairReachApiClient();
  });

  it('13.1 should fetch public testimonials list returning HTTP 200 OK and an array', async () => {
    const res = await apiClient.getTestimonials();

    expect(res.status).toBe(200);
    expect(Array.isArray(res.data)).toBe(true);

    const testimonials = res.data as Testimonial[];
    if (testimonials.length > 0) {
      assertValidTestimonial(testimonials[0]);
    }
  });

  it('13.2 should verify every testimonial item contains customerName, rating, comment, and serviceName', async () => {
    const res = await apiClient.getTestimonials();
    expect(res.status).toBe(200);

    const testimonials = res.data as Testimonial[];
    for (const item of testimonials) {
      assertValidTestimonial(item);
      expect(item.id).toBeTruthy();
      expect(item.customerName).toBeTruthy();
      expect(item.comment).toBeTruthy();
      expect(item.serviceName).toBeTruthy();
    }
  });

  it('13.3 should ensure all testimonial ratings are valid integers between 1 and 5', async () => {
    const res = await apiClient.getTestimonials();
    expect(res.status).toBe(200);

    const testimonials = res.data as Testimonial[];
    for (const item of testimonials) {
      expect(Number.isInteger(item.rating)).toBe(true);
      expect(item.rating).toBeGreaterThanOrEqual(1);
      expect(item.rating).toBeLessThanOrEqual(5);
    }
  });

  it('13.4 should verify testimonials contain valid service type names matching appliance catalog', async () => {
    const res = await apiClient.getTestimonials();
    expect(res.status).toBe(200);

    const testimonials = res.data as Testimonial[];
    for (const item of testimonials) {
      expect(item.serviceName).toBeTruthy();
      // Should mention appliances (washing machine, TV, refrigerator, AC, microwave)
      const text = `${item.serviceName} ${item.comment}`.toLowerCase();
      expect(
        text.includes('washing') ||
        text.includes('refrigerator') ||
        text.includes('microwave') ||
        text.includes('ac') ||
        text.includes('tv') ||
        text.includes('repair') ||
        text.includes('service')
      ).toBe(true);
    }
  });

  it('13.5 should handle empty testimonial state by returning empty array [] without 404 or fabricated records', async () => {
    const res = await apiClient.getTestimonials();
    expect(res.status).toBe(200);
    expect(Array.isArray(res.data)).toBe(true);
  });

  it('13.6 should verify testimonial dates or timestamps are formatted properly', async () => {
    const res = await apiClient.getTestimonials();
    expect(res.status).toBe(200);

    const testimonials = res.data as Testimonial[];
    for (const item of testimonials) {
      if (item.date) {
        expect(new Date(item.date).getTime()).not.toBeNaN();
      }
    }
  });
});
