/**
 * Pairwise Test Suite 03: Booking Creation x Status Tracking x Cancellation Eligibility Check.
 *
 * Matrix Dimensions:
 * - Service Domains: HOME_APPLIANCE (Washing Machine, Refrigerator, AC) vs ELECTRONICS (TV)
 * - Tracking Fields Verification: publicReference, status, scheduled date/time, canCancel flag
 * - Pre-Arrival Cancellation Eligibility: canCancel === true for newly created / pre-arrival bookings
 * - Tracking Reference Robustness:
 *   - Valid unguessable public reference lookup
 *   - Non-existent reference -> RFC 7807 404 NOT_FOUND
 *   - Malformed/Special characters in reference string -> Handled safely with 400/404
 *   - Information leakage prevention: No sequential IDs or unmasked private credentials in tracking view
 *
 * Expected Outputs derived from:
 * - docs/architecture/05-booking-architecture.md (§ Booking states, Customer cancellation authority)
 * - docs/architecture/09-api-architecture.md (§ Public/customer capability endpoints)
 * - PROJECT.md (GET /api/v1/public/bookings/{publicReference} specification)
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { RepairReachApiClient } from '../../src/apiClient.js';
import {
  generateUUID,
  generateNextWeekday,
  generateCustomerPhone,
  assertValidBookingResponse,
  assertProblemDetails,
  KNOWN_SERVICES,
  SOLAPUR_LOCALITIES,
} from '../../src/testUtils.js';
import type {
  ServiceCatalogItem,
  CreateBookingRequest,
  CreateBookingResponse,
  BookingDetailsResponse,
  ProblemDetails,
} from '../../src/types.js';

describe('Pairwise 03: Booking Creation x Status Tracking x Cancellation Eligibility', () => {
  const client = new RepairReachApiClient();
  let services: ServiceCatalogItem[] = [];
  let washingMachineService: ServiceCatalogItem | undefined;
  let tvService: ServiceCatalogItem | undefined;
  let acService: ServiceCatalogItem | undefined;

  beforeAll(async () => {
    const res = await client.getServices();
    if (res.status === 200 && Array.isArray(res.data)) {
      services = res.data;
      washingMachineService = services.find((s) => s.code === KNOWN_SERVICES.WASHING_MACHINE || s.name.toLowerCase().includes('washing'));
      tvService = services.find((s) => s.code === KNOWN_SERVICES.TV || s.name.toLowerCase().includes('tv'));
      acService = services.find((s) => s.code === KNOWN_SERVICES.AC || s.name.toLowerCase().includes('ac'));
    }
  });

  it('Pairwise 3.1: HOME_APPLIANCE Booking x Tracking Lookup -> Verifies CONFIRMED status & canCancel=true', async () => {
    const srvId = washingMachineService?.id || '00000000-0000-0000-0005-000000000001';
    const bookingDate = generateNextWeekday(2);
    const key = generateUUID();

    const payload: CreateBookingRequest = {
      customerName: 'Sanjay Deshpande',
      customerPhone: generateCustomerPhone('+91'),
      serviceId: srvId,
      locationAddress: SOLAPUR_LOCALITIES[0],
      problemDescription: 'Washing machine error E02 during rinse cycle',
      requestedDate: bookingDate,
      requestedSlotId: '09:00-10:00',
    };

    // Step 1: Create booking
    const createRes = await client.createBooking(payload, key);
    expect([200, 201]).toContain(createRes.status);
    const created = createRes.data as CreateBookingResponse;
    assertValidBookingResponse(created);
    expect(created.publicReference).toBeDefined();

    // Step 2: Query tracking endpoint
    const trackRes = await client.getBooking(created.publicReference);
    expect(trackRes.status).toBe(200);

    const details = trackRes.data as BookingDetailsResponse;
    expect(details.publicReference).toBe(created.publicReference);
    expect(['CONFIRMED', 'REQUESTED', 'SCHEDULED']).toContain(details.status);
    expect(details.canCancel).toBe(true);
    expect(details.customerName).toBe('Sanjay Deshpande');
    expect(details.scheduledDate).toBe(bookingDate);
    expect(details.locationAddress).toContain('Solapur');
  });

  it('Pairwise 3.2: ELECTRONICS (TV Repair) Booking x Tracking Lookup -> Verifies service reflection and unguessable reference format', async () => {
    const srvId = tvService?.id || '00000000-0000-0000-0005-000000000005';
    const bookingDate = generateNextWeekday(3);
    const key = generateUUID();

    const payload: CreateBookingRequest = {
      customerName: 'Anil Kadam',
      customerPhone: generateCustomerPhone('+91'),
      serviceId: srvId,
      locationAddress: SOLAPUR_LOCALITIES[1],
      problemDescription: 'Smart TV screen flickering with sound working normally',
      requestedDate: bookingDate,
      requestedSlotId: '11:00-12:00',
    };

    const createRes = await client.createBooking(payload, key);
    expect([200, 201]).toContain(createRes.status);
    const created = createRes.data as CreateBookingResponse;

    const trackRes = await client.getBooking(created.publicReference);
    expect(trackRes.status).toBe(200);
    const details = trackRes.data as BookingDetailsResponse;

    expect(details.serviceName.toLowerCase()).toContain('tv');
    expect(details.canCancel).toBe(true);

    // Verify publicReference is unguessable (not a sequential integer like "1" or "42")
    expect(details.publicReference.length).toBeGreaterThanOrEqual(6);
    expect(/^\d+$/.test(details.publicReference)).toBe(false);
  });

  it('Pairwise 3.3: Random UUID / Non-Existent Tracking Reference -> RFC 7807 404 NOT_FOUND response', async () => {
    const nonExistentRef = `RR-NONEXISTENT-${generateUUID()}`;

    const res = await client.getBooking(nonExistentRef);
    expect(res.status).toBe(404);

    const problem = res.data as ProblemDetails;
    if (res.data && typeof res.data === 'object') {
      assertProblemDetails(problem, 'NOT_FOUND', 404);
      expect(problem.type).toBeDefined();
      expect(problem.title).toBeDefined();
      expect(problem.detail).toBeDefined();
    }
  });

  it('Pairwise 3.4: Special Characters & Encoded Reference Strings in Tracking Lookup -> Handled gracefully with 400/404', async () => {
    const maliciousReferences = [
      '../../etc/passwd',
      '<script>alert("xss")</script>',
      'RR-1234; DROP TABLE booking;',
      'invalid/reference/with/slashes',
    ];

    for (const ref of maliciousReferences) {
      const res = await client.getBooking(ref);
      // Must not crash with 500 Internal Server Error; must return standard 400, 404, or 422
      expect([400, 404, 422]).toContain(res.status);
      expect(res.status).not.toBe(500);
    }
  });

  it('Pairwise 3.5: Multi-Service Booking Creation x Immediate Tracking State Consistency', async () => {
    const srvIds = [
      washingMachineService?.id || '00000000-0000-0000-0005-000000000001',
      acService?.id || '00000000-0000-0000-0005-000000000004',
    ];

    for (let i = 0; i < srvIds.length; i++) {
      const srvId = srvIds[i];
      const key = generateUUID();
      const payload: CreateBookingRequest = {
        customerName: `Customer Track ${i + 1}`,
        customerPhone: generateCustomerPhone('+91'),
        serviceId: srvId,
        locationAddress: SOLAPUR_LOCALITIES[i + 2],
        problemDescription: `Appliance routine maintenance test ${i + 1}`,
        requestedDate: generateNextWeekday(i + 2),
        requestedSlotId: '16:00-17:00',
      };

      const createRes = await client.createBooking(payload, key);
      expect([200, 201]).toContain(createRes.status);
      const created = createRes.data as CreateBookingResponse;

      const trackRes = await client.getBooking(created.publicReference);
      expect(trackRes.status).toBe(200);
      const details = trackRes.data as BookingDetailsResponse;

      expect(details.publicReference).toBe(created.publicReference);
      expect(details.customerName).toBe(`Customer Track ${i + 1}`);
      expect(details.canCancel).toBe(true);
    }
  });
});
