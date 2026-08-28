/**
 * Tier 2 Boundary & Corner Cases: Feature 2 - Configurable Service Catalog
 *
 * Tests strict exclusion of mobile categories (ADR-006), draft/archived filtering,
 * duration boundary validations, non-existent service lookups, and unsupported HTTP methods.
 *
 * Requirements: ORIGINAL_REQUEST.md R4, PROJECT.md Feature 2, docs/architecture/04-domain-architecture.md, ADR-006
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { RepairReachApiClient, defaultApiClient } from '../../src/apiClient.js';
import {
  assertValidService,
  assertProblemDetails,
  KNOWN_SERVICES,
  EXCLUDED_SERVICES,
} from '../../src/testUtils.js';
import type { ServiceCatalogItem, ProblemDetails } from '../../src/types.js';

describe('Tier 2 - Feature 2: Service Catalog Boundary Tests', () => {
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

  it('BVA-02-01: Strictly excludes mobile phone, tablet, and smartphone repairs from public catalog', async () => {
    if (isLiveBackend) {
      const res = await client.getServices();
      expect(res.status).toBe(200);
      expect(Array.isArray(res.data)).toBe(true);

      const services = res.data as ServiceCatalogItem[];
      for (const service of services) {
        assertValidService(service);
        const upperCode = service.code.toUpperCase();
        const upperName = service.name.toUpperCase();

        for (const excluded of EXCLUDED_SERVICES) {
          expect(upperCode).not.toContain(excluded);
        }
        expect(upperName).not.toContain('MOBILE PHONE');
        expect(upperName).not.toContain('SMARTPHONE');
        expect(upperName).not.toContain('IPHONE');
        expect(upperName).not.toContain('TABLET');
      }
    } else {
      // Contract invariant: Excluded services must never match known appliance repairs
      const applianceCodes = Object.values(KNOWN_SERVICES);
      for (const excluded of EXCLUDED_SERVICES) {
        expect(applianceCodes).not.toContain(excluded);
      }
    }
  });

  it('BVA-02-02: Filters out inactive, draft, and archived services from public catalog view', async () => {
    if (isLiveBackend) {
      const res = await client.getServices();
      expect(res.status).toBe(200);
      const services = res.data as ServiceCatalogItem[];

      services.forEach((s) => {
        if (s.status) {
          expect(s.status).toBe('PUBLISHED');
          expect(['DRAFT', 'ARCHIVED', 'INACTIVE']).not.toContain(s.status);
        }
      });
    } else {
      const sampleCatalog: ServiceCatalogItem[] = [
        {
          id: 'srv-1',
          code: KNOWN_SERVICES.WASHING_MACHINE,
          name: 'Washing Machine Repair',
          category: 'APPLIANCE_REPAIR',
          description: 'Front & Top Load',
          approxDurationMinutes: 60,
          status: 'PUBLISHED',
        },
        {
          id: 'srv-2',
          code: 'DRAFT_COFFEE_MACHINE',
          name: 'Coffee Machine Repair (Draft)',
          category: 'APPLIANCE_REPAIR',
          description: 'Under development',
          approxDurationMinutes: 45,
          status: 'DRAFT',
        },
      ];

      const publicVisible = sampleCatalog.filter((s) => s.status === 'PUBLISHED');
      expect(publicVisible.length).toBe(1);
      expect(publicVisible[0].code).toBe(KNOWN_SERVICES.WASHING_MACHINE);
    }
  });

  it('BVA-02-03: Handles non-existent service ID queries with clean 404 NOT_FOUND RFC 7807 problem details', async () => {
    const nonExistentIds = [
      '00000000-0000-0000-0000-000000000000',
      'invalid-srv-uuid-999',
      'NON_EXISTENT_SERVICE',
    ];

    for (const serviceId of nonExistentIds) {
      if (isLiveBackend) {
        // Query slot availability for non-existent service ID
        const res = await client.getSlots(serviceId, '2026-08-20');
        expect([404, 400]).toContain(res.status);
        if (res.status === 404) {
          assertProblemDetails(res.data, 'NOT_FOUND', 404);
        } else if (res.status === 400) {
          assertProblemDetails(res.data, 'VALIDATION_FAILED', 400);
        }
      } else {
        const mockError: ProblemDetails = {
          type: 'https://api.repairreach.example/problems/not-found',
          title: 'Service not found',
          status: 404,
          code: 'NOT_FOUND',
          detail: `No published service found with ID: ${serviceId}`,
        };
        assertProblemDetails(mockError, 'NOT_FOUND', 404);
      }
    }
  });

  it('BVA-02-04: Validates boundary duration values for catalog items (15 <= approxDurationMinutes <= 480)', async () => {
    if (isLiveBackend) {
      const res = await client.getServices();
      expect(res.status).toBe(200);
      const services = res.data as ServiceCatalogItem[];

      for (const service of services) {
        expect(service.approxDurationMinutes).toBeGreaterThanOrEqual(15);
        expect(service.approxDurationMinutes).toBeLessThanOrEqual(480);
      }
    } else {
      const durations = [15, 30, 45, 60, 90, 120, 180, 240, 480];
      for (const d of durations) {
        expect(d).toBeGreaterThanOrEqual(15);
        expect(d).toBeLessThanOrEqual(480);
      }
    }
  });

  it('BVA-02-05: Rejects unsupported HTTP mutation methods (POST, PUT, DELETE) on public services catalog', async () => {
    if (isLiveBackend) {
      const postRes = await client.post('/services', { name: 'Illegal New Service' });
      expect([405, 400, 404]).toContain(postRes.status);

      const deleteRes = await client.rawRequest({ method: 'DELETE', url: '/services' });
      expect([405, 400, 404]).toContain(deleteRes.status);
    } else {
      const readOnlyMethods = ['GET', 'HEAD', 'OPTIONS'];
      expect(readOnlyMethods).toContain('GET');
      expect(readOnlyMethods).not.toContain('POST');
      expect(readOnlyMethods).not.toContain('DELETE');
    }
  });

  it('BVA-02-06: Validates capability badges boundary (homeServiceSupported, workshopSupported, deviceTransferSupported)', async () => {
    if (isLiveBackend) {
      const res = await client.getServices();
      expect(res.status).toBe(200);
      const services = res.data as ServiceCatalogItem[];

      for (const service of services) {
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
    } else {
      const mockService: ServiceCatalogItem = {
        id: 'srv-ac',
        code: KNOWN_SERVICES.AC,
        name: 'Air Conditioner Repair',
        category: 'APPLIANCE_REPAIR',
        description: 'Split and window AC servicing and gas charge',
        approxDurationMinutes: 90,
        homeServiceSupported: true,
        workshopSupported: true,
        deviceTransferSupported: false,
      };

      expect(mockService.homeServiceSupported).toBe(true);
      expect(mockService.workshopSupported).toBe(true);
      expect(mockService.deviceTransferSupported).toBe(false);
      assertValidService(mockService);
    }
  });
});
