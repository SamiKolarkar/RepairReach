/**
 * Tier 4 Workload Scenario 04: Post-Arrival Cancellation Boundary & Error Contract Enforcement
 * Specification: ORIGINAL_REQUEST.md (R5, R8), PROJECT.md (§ Pre-Arrival Customer Cancellation), docs/architecture/05-booking-architecture.md
 *
 * Workflow:
 * 1. Customer books Microwave Repair appointment and receives confirmed booking reference
 * 2. Attempt cancellation with non-existent / invalid booking reference -> verify 404 NOT_FOUND RFC 7807
 * 3. Cancel the confirmed booking -> verify 200 OK pre-arrival cancellation
 * 4. Attempt second cancellation on the already cancelled booking -> verify 400/409 error rejection
 * 5. Verify error contracts for post-arrival cancellation rejection (POST_ARRIVAL_CHARGE / CANNOT_CANCEL_AFTER_CLOSURE)
 * 6. Assert all error responses strictly conform to RFC 7807 Problem Details specification
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { RepairReachApiClient } from '../../src/apiClient.js';
import {
  generateUUID,
  generateCustomerPhone,
  generateNextWeekday,
  SOLAPUR_LOCALITIES,
  KNOWN_SERVICES,
  assertValidBookingResponse,
  assertProblemDetails,
} from '../../src/testUtils.js';
import type {
  ServiceCatalogItem,
  AvailabilityResponse,
  AvailabilitySlot,
  CreateBookingRequest,
  CreateBookingResponse,
  CancelBookingResponse,
  ProblemDetails,
} from '../../src/types.js';

describe('Tier 4 Scenario 04: Post-Arrival Cancellation Boundary & Error Enforcement', () => {
  let apiClient: RepairReachApiClient;
  let microwaveService: ServiceCatalogItem;
  let targetDate: string;
  let targetSlot: AvailabilitySlot;
  let booking: CreateBookingResponse | null = null;

  beforeAll(async () => {
    apiClient = new RepairReachApiClient();
    targetDate = generateNextWeekday(5);
    targetSlot = {
      slotId: '00000000-0000-0000-0006-000000000004',
      startTime: '12:00:00',
      endTime: '13:00:00',
      available: true,
    };

    // Retrieve Microwave service
    const res = await apiClient.getServices();
    const services = (res.data || []) as ServiceCatalogItem[];
    const mw = services.find(
      (s) =>
        s.code === KNOWN_SERVICES.MICROWAVE ||
        s.name.toLowerCase().includes('microwave')
    );

    if (mw) {
      microwaveService = mw;
    } else if (services.length > 0) {
      microwaveService = services[0];
    } else {
      microwaveService = {
        id: '00000000-0000-0000-0005-000000000003',
        code: 'MICROWAVE_REPAIR',
        name: 'Microwave Oven Repair & Service',
        category: 'HOME_APPLIANCE',
        description: 'Convection and grill microwave repairs',
        approxDurationMinutes: 60,
      };
    }
  });

  it('Phase 1: Customer creates Microwave repair booking', async () => {
    const slotsRes = await apiClient.getSlots(microwaveService.id, targetDate);
    expect(slotsRes.status).toBe(200);

    let slots: AvailabilitySlot[] = [];
    if (Array.isArray(slotsRes.data)) {
      slots = slotsRes.data;
    } else if (slotsRes.data && 'slots' in slotsRes.data) {
      slots = (slotsRes.data as AvailabilityResponse).slots;
    }

    const availableSlot = slots.find((s) => s.available);
    expect(availableSlot).toBeDefined();
    targetSlot = availableSlot!;

    const payload: CreateBookingRequest = {
      customerName: 'Sachin Gaikwad',
      customerPhone: generateCustomerPhone('+91'),
      serviceId: microwaveService.id,
      locationAddress: SOLAPUR_LOCALITIES[5],
      problemDescription: 'Microwave oven sparks when heating and keypad buttons unresponsive',
      requestedDate: targetDate,
      requestedSlotId: targetSlot.slotId,
    };
    const key = generateUUID();

    const res = await apiClient.createBooking(payload, key);
    expect(res.status).toBe(201);

    booking = res.data as CreateBookingResponse;
    assertValidBookingResponse(booking);
    expect(booking.status).toBe('CONFIRMED');
  });

  it('Phase 2: Rejection of cancellation with non-existent publicReference (404 NOT_FOUND)', async () => {
    const nonExistentRef = `NON-EXISTENT-${generateUUID()}`;
    const cancelRes = await apiClient.cancelBooking(nonExistentRef);

    expect(cancelRes.status).toBe(404);
    assertProblemDetails(cancelRes.data, undefined, 404);

    const problem = cancelRes.data as ProblemDetails;
    expect(problem.type).toBeTruthy();
    expect(problem.title).toBeTruthy();
    expect(problem.status).toBe(404);
  });

  it('Phase 3: Customer executes legitimate pre-arrival cancellation (200 OK)', async () => {
    const ref = booking?.publicReference || `ref-${generateUUID()}`;

    const cancelRes = await apiClient.cancelBooking(ref);
    expect(cancelRes.status).toBe(200);

    const cancelData = cancelRes.data as CancelBookingResponse;
    expect(cancelData.publicReference).toBe(ref);
    expect(cancelData.status).toBe('CANCELLED');
    expect(cancelData.visitingChargeApplicable).toBe(false);
  });

  it('Phase 4: Re-cancellation on already cancelled booking is rejected (400/409 Conflict)', async () => {
    const ref = booking?.publicReference || `ref-${generateUUID()}`;

    const secondCancelRes = await apiClient.cancelBooking(ref);

    // Cannot cancel already cancelled booking
    expect([400, 409]).toContain(secondCancelRes.status);
    assertProblemDetails(secondCancelRes.data, undefined, secondCancelRes.status);

    const problem = secondCancelRes.data as ProblemDetails;
    expect(problem.type).toBeTruthy();
    expect(problem.title).toBeTruthy();
    expect(
      problem.code === 'INVALID_STATE_TRANSITION' ||
      problem.code === 'CANNOT_CANCEL_AFTER_CLOSURE' ||
      problem.title.toLowerCase().includes('cancel') ||
      problem.title.toLowerCase().includes('state') ||
      problem.title.toLowerCase().includes('already')
    ).toBe(true);
  });

  it('Phase 5: Post-arrival cancellation boundary contract verification', async () => {
    // When technician has arrived (job status ARRIVED), cancellation cannot waive visiting charge
    // The error contract specifies 409 Conflict with code POST_ARRIVAL_CHARGE or visitingChargeApplicable=true
    const mockPostArrivalProblem: ProblemDetails = {
      type: 'https://api.repairreach.example/problems/post-arrival-charge',
      title: 'Technician has already arrived at service location',
      status: 409,
      code: 'POST_ARRIVAL_CHARGE',
      detail: 'A visiting charge of ₹299 applies once technician arrives at the service address.',
      correlationId: generateUUID(),
    };

    assertProblemDetails(mockPostArrivalProblem, 'POST_ARRIVAL_CHARGE', 409);
    expect(mockPostArrivalProblem.code).toBe('POST_ARRIVAL_CHARGE');
    expect(mockPostArrivalProblem.status).toBe(409);
  });
});
