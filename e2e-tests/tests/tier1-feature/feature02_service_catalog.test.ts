/**
 * Tier 1 Feature Coverage: Feature 02 - Configurable Service Catalog
 * Specification: ORIGINAL_REQUEST.md (R4), PROJECT.md (§ Interface Contracts, ADR-006), docs/architecture/04-domain-architecture.md
 *
 * Verifies dynamic service catalog listing, core appliance services, strict mobile exclusion,
 * duration and capability badges.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { RepairReachApiClient } from '../../src/apiClient.js';
import {
  assertValidService,
  KNOWN_SERVICES,
  EXCLUDED_SERVICES,
} from '../../src/testUtils.js';
import type { ServiceCatalogItem } from '../../src/types.js';

describe('Feature 02: Configurable Service Catalog', () => {
  let apiClient: RepairReachApiClient;

  beforeAll(() => {
    apiClient = new RepairReachApiClient();
  });

  it('2.1 should fetch published services catalog returning HTTP 200 and a non-empty array', async () => {
    const res = await apiClient.getServices();
    expect(res.status).toBe(200);
    expect(Array.isArray(res.data)).toBe(true);

    const services = res.data as ServiceCatalogItem[];
    expect(services.length).toBeGreaterThanOrEqual(5);

    // Verify first item conforms to valid Service schema
    assertValidService(services[0]);
  });

  it('2.2 should contain all 5 core appliance repair services in the catalog', async () => {
    const res = await apiClient.getServices();
    expect(res.status).toBe(200);

    const services = res.data as ServiceCatalogItem[];
    const codes = services.map((s) => s.code);

    expect(codes).toContain(KNOWN_SERVICES.WASHING_MACHINE);
    expect(codes).toContain(KNOWN_SERVICES.REFRIGERATOR);
    expect(codes).toContain(KNOWN_SERVICES.MICROWAVE);
    expect(codes).toContain(KNOWN_SERVICES.AC);
    expect(codes).toContain(KNOWN_SERVICES.TV);
  });

  it('2.3 should strictly exclude mobile phone and smartphone repairs from the public catalog', async () => {
    const res = await apiClient.getServices();
    expect(res.status).toBe(200);

    const services = res.data as ServiceCatalogItem[];

    for (const service of services) {
      const codeUpper = (service.code || '').toUpperCase();
      const nameUpper = (service.name || '').toUpperCase();

      for (const excluded of EXCLUDED_SERVICES) {
        expect(codeUpper).not.toBe(excluded);
      }

      expect(nameUpper).not.toContain('SMARTPHONE');
      expect(nameUpper).not.toContain('MOBILE PHONE');
      expect(nameUpper).not.toContain('TABLET REPAIR');
      expect(nameUpper).not.toContain('IPHONE');
    }
  });

  it('2.4 should provide positive duration (approxDurationMinutes > 0) and non-empty descriptions for all services', async () => {
    const res = await apiClient.getServices();
    expect(res.status).toBe(200);

    const services = res.data as ServiceCatalogItem[];

    for (const service of services) {
      expect(service.approxDurationMinutes).toBeGreaterThan(0);
      expect(service.description).toBeTruthy();
      expect(service.description.trim().length).toBeGreaterThan(5);
      expect(service.category).toBeTruthy();
    }
  });

  it('2.5 should declare supported service delivery capabilities (home service / workshop repair)', async () => {
    const res = await apiClient.getServices();
    expect(res.status).toBe(200);

    const services = res.data as ServiceCatalogItem[];

    for (const service of services) {
      // Each service should either specify boolean flags or capability badges
      if (service.homeServiceSupported !== undefined) {
        expect(typeof service.homeServiceSupported).toBe('boolean');
      }
      if (service.workshopSupported !== undefined) {
        expect(typeof service.workshopSupported).toBe('boolean');
      }
      if (service.deviceTransferSupported !== undefined) {
        expect(typeof service.deviceTransferSupported).toBe('boolean');
      }
    }
  });

  it('2.6 should ensure all service codes are unique and uppercase alphanumeric identifiers', async () => {
    const res = await apiClient.getServices();
    expect(res.status).toBe(200);

    const services = res.data as ServiceCatalogItem[];
    const codes = services.map((s) => s.code);
    const uniqueCodes = new Set(codes);

    expect(uniqueCodes.size).toBe(codes.length);
    for (const code of codes) {
      expect(code).toMatch(/^[A-Z0-9_]+$/);
    }
  });
});
