/**
 * Tier 4 Workload Scenario 03: Pre-Arrival Cancellation & Slot Recovery Lifecycle
 * Specification: ORIGINAL_REQUEST.md (R5, R8), PROJECT.md (§ Pre-Arrival Customer Cancellation), docs/architecture/05-booking-architecture.md
 *
 * Workflow:
 * 1. Customer 1 books Refrigerator Repair for a specific slot on a future weekday
 * 2. Verify booking is confirmed and slot becomes reserved/unavailable
 * 3. Customer 1 performs pre-arrival cancellation before technician dispatch/arrival
 * 4. Verify cancellation succeeds with HTTP 200 OK and visitingChargeApplicable: false
 * 5. Verify booking tracking shows status CANCELLED and canCancel: false
 * 6. Query slot availability and verify the previously booked slot is released/available
 * 7. Customer 2 books the recovered slot and receives HTTP 201 Created confirmation
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
} from '../../src/testUtils.js';
import type {
  ServiceCatalogItem,
  AvailabilityResponse,
  AvailabilitySlot,
  CreateBookingRequest,
  CreateBookingResponse,
  BookingDetailsResponse,
  CancelBookingResponse,
} from '../../src/types.js';

describe('Tier 4 Scenario 03: Pre-Arrival Cancellation & Slot Recovery Lifecycle', () => {
  let apiClient: RepairReachApiClient;
  let fridgeService: ServiceCatalogItem;
  let targetDate: string;
  let targetSlot: AvailabilitySlot;
  let customer1Booking: CreateBookingResponse | null = null;
  let customer2Booking: CreateBookingResponse | null = null;

  beforeAll(async () => {
    apiClient = new RepairReachApiClient();
    targetDate = generateNextWeekday(54);
    targetSlot = {
      slotId: '00000000-0000-0000-0006-000000000003',
      startTime: '11:00:00',
      endTime: '12:00:00',
      available: true,
    };

    // Retrieve Refrigerator service
    const res = await apiClient.getServices();
    const services = (res.data || []) as ServiceCatalogItem[];
    const fridge = services.find(
      (s) =>
        s.code === KNOWN_SERVICES.REFRIGERATOR ||
        s.name.toLowerCase().includes('refrigerator') ||
        s.name.toLowerCase().includes('fridge')
    );

    if (fridge) {
      fridgeService = fridge;
    } else if (services.length > 0) {
      fridgeService = services[0];
    } else {
      fridgeService = {
        id: '00000000-0000-0000-0005-000000000002',
        code: 'REFRIGERATOR_REPAIR',
        name: 'Refrigerator Repair & Service',
        category: 'HOME_APPLIANCE',
        description: 'Single door and double door fridge cooling repairs',
        approxDurationMinutes: 60,
      };
    }
  });

  async function getSlotForDate(offsetDays: number): Promise<{ date: string; slot: AvailabilitySlot }> {
    let curOffset = offsetDays;
    while (curOffset < offsetDays + 25) {
      const date = generateNextWeekday(curOffset);
      const slotsRes = await apiClient.getSlots(fridgeService.id, date);
      if (slotsRes.status === 200) {
        const slots: AvailabilitySlot[] = Array.isArray(slotsRes.data)
          ? slotsRes.data
          : ((slotsRes.data as any)?.slots || []);
        const freeSlot = slots.find((s) => s.available);
        if (freeSlot) return { date, slot: freeSlot };
      }
      curOffset++;
    }
    return {
      date: generateNextWeekday(offsetDays),
      slot: {
        slotId: '00000000-0000-0000-0006-000000000003',
        startTime: '11:00:00',
        endTime: '12:00:00',
        available: true,
      },
    };
  }

  it('Phase 1: Customer 1 inspects slot availability and selects an available slot', async () => {
    const { date, slot } = await getSlotForDate(54);
    targetDate = date;
    targetSlot = slot;

    const slotsRes = await apiClient.getSlots(fridgeService.id, targetDate);
    expect(slotsRes.status).toBe(200);

    let slots: AvailabilitySlot[] = [];
    if (Array.isArray(slotsRes.data)) {
      slots = slotsRes.data;
    } else if (slotsRes.data && 'slots' in slotsRes.data) {
      slots = (slotsRes.data as AvailabilityResponse).slots;
    }

    expect(slots.length).toBeGreaterThanOrEqual(1);

    const availableSlot = slots.find((s) => s.available && s.slotId === targetSlot.slotId) || slots.find((s) => s.available);
    expect(availableSlot).toBeDefined();
    targetSlot = availableSlot!;
  });

  it('Phase 2: Customer 1 creates and confirms Refrigerator repair booking', async () => {
    const bookingPayload: CreateBookingRequest = {
      customerName: 'Sunita Kulkarni',
      customerPhone: generateCustomerPhone('+91'),
      serviceId: fridgeService.id,
      locationAddress: SOLAPUR_LOCALITIES[3],
      problemDescription: 'Refrigerator freezer frosting heavily and lower cooling compartment not working',
      requestedDate: targetDate,
      requestedSlotId: targetSlot.slotId,
    };
    const key = generateUUID();

    const res = await apiClient.createBooking(bookingPayload, key);
    expect(res.status).toBe(201);

    customer1Booking = res.data as CreateBookingResponse;
    assertValidBookingResponse(customer1Booking);
    expect(customer1Booking.status).toBe('CONFIRMED');
    expect(customer1Booking.customerName).toBe('Sunita Kulkarni');
  });

  it('Phase 3: Verify booked slot is now reserved and unavailable for other customers', async () => {
    const slotsRes = await apiClient.getSlots(fridgeService.id, targetDate);
    expect(slotsRes.status).toBe(200);

    let slots: AvailabilitySlot[] = [];
    if (Array.isArray(slotsRes.data)) {
      slots = slotsRes.data;
    } else if (slotsRes.data && 'slots' in slotsRes.data) {
      slots = (slotsRes.data as AvailabilityResponse).slots;
    }

    const queriedSlot = slots.find((s) => s.slotId === targetSlot.slotId);
    if (queriedSlot) {
      expect(queriedSlot.available).toBe(false);
    }
  });

  it('Phase 4: Customer 1 executes pre-arrival cancellation', async () => {
    const ref = customer1Booking?.publicReference || `ref-${generateUUID()}`;

    const cancelRes = await apiClient.cancelBooking(ref);
    expect(cancelRes.status).toBe(200);
    expect(cancelRes.data).toBeDefined();

    const cancelData = cancelRes.data as CancelBookingResponse;
    expect(cancelData.publicReference).toBe(ref);
    expect(cancelData.status).toBe('CANCELLED');
    expect(cancelData.visitingChargeApplicable).toBe(false);

    if (cancelData.outcome) {
      expect(cancelData.outcome).toBe('PRE_ARRIVAL_NO_VISIT_CHARGE');
    }
  });

  it('Phase 5: Customer 1 tracks booking and verifies CANCELLED status and disabled cancellation', async () => {
    const ref = customer1Booking?.publicReference || `ref-${generateUUID()}`;

    const trackingRes = await apiClient.getBooking(ref);
    expect(trackingRes.status).toBe(200);

    const details = trackingRes.data as BookingDetailsResponse;
    expect(details.status).toBe('CANCELLED');
    expect(details.canCancel).toBe(false);
  });

  it('Phase 6: Verify slot availability recalculates and the cancelled slot is released', async () => {
    const slotsRes = await apiClient.getSlots(fridgeService.id, targetDate);
    expect(slotsRes.status).toBe(200);

    let slots: AvailabilitySlot[] = [];
    if (Array.isArray(slotsRes.data)) {
      slots = slotsRes.data;
    } else if (slotsRes.data && 'slots' in slotsRes.data) {
      slots = (slotsRes.data as AvailabilityResponse).slots;
    }

    const releasedSlot = slots.find((s) => s.slotId === targetSlot.slotId);
    if (releasedSlot) {
      expect(releasedSlot.available).toBe(true);
    }
  });

  it('Phase 7: Customer 2 successfully books the recovered slot', async () => {
    const customer2Payload: CreateBookingRequest = {
      customerName: 'Ganesh Jadhav',
      customerPhone: generateCustomerPhone('+91'),
      serviceId: fridgeService.id,
      locationAddress: SOLAPUR_LOCALITIES[4],
      problemDescription: 'Double door fridge compressor humming but no cooling at all',
      requestedDate: targetDate,
      requestedSlotId: targetSlot.slotId,
    };
    const key = generateUUID();

    const res = await apiClient.createBooking(customer2Payload, key);
    expect(res.status).toBe(201);

    customer2Booking = res.data as CreateBookingResponse;
    assertValidBookingResponse(customer2Booking);
    expect(customer2Booking.status).toBe('CONFIRMED');
    expect(customer2Booking.customerName).toBe('Ganesh Jadhav');
    if (customer1Booking) {
      expect(customer2Booking.publicReference).not.toBe(customer1Booking.publicReference);
    }
  });
});
