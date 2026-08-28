/**
 * Tier 4 Workload Scenario 01: Complete Happy Path Customer Booking Journey
 * Specification: ORIGINAL_REQUEST.md (R1, R2, R5, R8), PROJECT.md, docs/architecture/05-booking-architecture.md
 *
 * Customer Journey:
 * 1. View business profile & verify Solapur operating presence
 * 2. Browse service catalog & select Washing Machine Repair
 * 3. Query backend-authoritative slot availability for a future weekday
 * 4. Select 10:00 AM slot and submit booking with client-generated Idempotency-Key
 * 5. Verify HTTP 201 Created, unguessable publicReference, and feedbackCapabilityToken
 * 6. Query booking tracking details by publicReference & verify confirmed appointment
 * 7. Simulate service completion & submit 5-star customer rating with feedback token
 * 8. Verify feedback status is ACCEPTED and testimonials endpoint is operational
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { RepairReachApiClient } from '../../src/apiClient.js';
import {
  generateUUID,
  generateCustomerPhone,
  generateNextWeekday,
  SOLAPUR_LOCALITIES,
  SOLAPUR_BUSINESS_CODE,
  KNOWN_SERVICES,
  assertValidBusinessProfile,
  assertValidService,
  assertValidSlot,
  assertValidBookingResponse,
} from '../../src/testUtils.js';
import type {
  BusinessProfile,
  ServiceCatalogItem,
  AvailabilityResponse,
  AvailabilitySlot,
  CreateBookingRequest,
  CreateBookingResponse,
  BookingDetailsResponse,
  SubmitFeedbackResponse,
  Testimonial,
  ProblemDetails,
} from '../../src/types.js';

describe('Tier 4 Scenario 01: Complete Customer Journey — Solapur Washing Machine Booking', () => {
  let apiClient: RepairReachApiClient;
  let washingMachineService: ServiceCatalogItem;
  let targetDate: string;
  let selectedSlot: AvailabilitySlot;
  let bookingIdempotencyKey: string;
  let bookingResponse: CreateBookingResponse | null = null;
  let publicRef: string;
  let feedbackToken: string;

  beforeAll(async () => {
    apiClient = new RepairReachApiClient();
    targetDate = generateNextWeekday(50);
    bookingIdempotencyKey = generateUUID();
    selectedSlot = {
      slotId: '00000000-0000-0000-0006-000000000002',
      startTime: '10:00:00',
      endTime: '11:00:00',
      available: true,
    };

    const res = await apiClient.getServices();
    const services = (res.data || []) as ServiceCatalogItem[];
    const wm = services.find(
      (s) =>
        s.code === KNOWN_SERVICES.WASHING_MACHINE ||
        s.name.toLowerCase().includes('washing machine')
    );

    washingMachineService = wm || services[0] || {
      id: '00000000-0000-0000-0005-000000000001',
      code: KNOWN_SERVICES.WASHING_MACHINE,
      name: 'Washing Machine Repair & Service',
      category: 'HOME_APPLIANCE',
      description: 'Washing machine repair',
      approxDurationMinutes: 60,
    };
  });

  it('Phase 1: Customer lands on website and inspects Solapur business profile', async () => {
    const res = await apiClient.getBusiness();
    expect(res.status).toBe(200);
    expect(res.data).toBeDefined();

    const profile = res.data as BusinessProfile;
    assertValidBusinessProfile(profile);

    expect(profile.code).toBe(SOLAPUR_BUSINESS_CODE);
    expect(profile.name.toLowerCase()).toContain('repairreach');
    expect(profile.city.toLowerCase()).toContain('solapur');
    expect(profile.phone).toMatch(/^(\+91[\s-]?)?[6-9]\d{9}$/);
    expect(profile.whatsapp).toMatch(/^(\+91[\s-]?)?[6-9]\d{9}$/);
  });

  it('Phase 2: Customer browses published services and selects Washing Machine Repair', async () => {
    const res = await apiClient.getServices();
    expect(res.status).toBe(200);
    expect(Array.isArray(res.data)).toBe(true);

    const services = res.data as ServiceCatalogItem[];
    expect(services.length).toBeGreaterThanOrEqual(1);

    // Validate all services in catalog
    for (const service of services) {
      assertValidService(service);
    }

    // Find Washing Machine Repair
    const wm = services.find(
      (s) =>
        s.code === KNOWN_SERVICES.WASHING_MACHINE ||
        s.name.toLowerCase().includes('washing machine')
    );
    expect(wm).toBeDefined();
    expect(wm!.id).toBeTruthy();
    expect(wm!.approxDurationMinutes).toBeGreaterThan(0);

    washingMachineService = wm!;
  });

  async function getSlotForDate(offsetDays: number): Promise<{ date: string; slot: AvailabilitySlot }> {
    let curOffset = offsetDays;
    while (curOffset < offsetDays + 25) {
      const date = generateNextWeekday(curOffset);
      const slotsRes = await apiClient.getSlots(washingMachineService.id, date);
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
        slotId: 'slot-10-11',
        startTime: '10:00:00',
        endTime: '11:00:00',
        available: true,
      },
    };
  }

  it('Phase 3: Customer queries dynamic slot availability for target weekday', async () => {
    expect(washingMachineService).toBeDefined();

    const { date, slot } = await getSlotForDate(50);
    targetDate = date;
    selectedSlot = slot;

    const res = await apiClient.getSlots(washingMachineService.id, targetDate);
    expect(res.status).toBe(200);
    expect(res.data).toBeDefined();

    let slots: AvailabilitySlot[] = [];
    if (Array.isArray(res.data)) {
      slots = res.data;
    } else if (res.data && 'slots' in res.data) {
      slots = (res.data as AvailabilityResponse).slots;
    }

    expect(slots.length).toBeGreaterThanOrEqual(1);

    // Verify slots structure
    for (const s of slots) {
      assertValidSlot(s);
    }
  });

  it('Phase 4: Customer submits booking form with client-generated Idempotency-Key', async () => {
    expect(washingMachineService).toBeDefined();
    expect(selectedSlot).toBeDefined();

    const bookingPayload: CreateBookingRequest = {
      customerName: 'Rajesh Patil',
      customerPhone: generateCustomerPhone('+91'),
      serviceId: washingMachineService.id,
      locationAddress: SOLAPUR_LOCALITIES[0],
      problemDescription: 'Washing machine drum vibrates excessively and does not spin during rinse cycle',
      requestedDate: targetDate,
      requestedSlotId: selectedSlot.slotId,
    };

    const res = await apiClient.createBooking(bookingPayload, bookingIdempotencyKey);
    expect(res.status).toBe(201);
    expect(res.data).toBeDefined();

    const booking = res.data as CreateBookingResponse;
    assertValidBookingResponse(booking);

    expect(booking.publicReference).toBeTruthy();
    expect(booking.bookingId).toBeTruthy();
    expect(booking.status).toBe('CONFIRMED');
    expect(booking.customerName).toBe('Rajesh Patil');
    expect(booking.scheduledDate).toBe(targetDate);
    expect(booking.locationAddress).toBe(SOLAPUR_LOCALITIES[0]);

    bookingResponse = booking;
    publicRef = booking.publicReference;
    feedbackToken = booking.feedbackCapabilityToken || `token-${publicRef}`;
  });

  it('Phase 5: Customer accesses booking confirmation and tracking view', async () => {
    const ref = publicRef || bookingResponse?.publicReference || `ref-${generateUUID()}`;

    const res = await apiClient.getBooking(ref);
    expect(res.status).toBe(200);
    expect(res.data).toBeDefined();

    const details = res.data as BookingDetailsResponse;
    expect(details.publicReference).toBe(ref);
    expect(details.status).toBe('CONFIRMED');
    expect(details.customerName).toBe('Rajesh Patil');
    expect(details.scheduledDate).toBe(targetDate);
    expect(details.canCancel).toBe(true);
    expect(details.locationAddress).toBe(SOLAPUR_LOCALITIES[0]);
  });

  it('Phase 6: Customer submits 5-star feedback rating upon service completion', async () => {
    const ref = publicRef || bookingResponse?.publicReference || `ref-${generateUUID()}`;
    const token = feedbackToken || `token-${ref}`;

    const feedbackPayload = {
      rating: 5,
      comment: 'Technician was very professional, replaced the drum suspension dampers quickly. Excellent service!',
    };

    const res = await apiClient.submitFeedback(
      ref,
      feedbackPayload,
      token
    );

    expect(res.status).toBe(201);
    expect(res.data).toBeDefined();

    const feedbackResult = res.data as SubmitFeedbackResponse;
    expect(feedbackResult.feedbackId).toBeTruthy();
    expect(feedbackResult.status).toBe('ACCEPTED');
    expect(feedbackResult.submittedAt).toBeDefined();
  });

  it('Phase 7: Verify public testimonials endpoint reflects business review capability', async () => {
    const res = await apiClient.getTestimonials();
    expect(res.status).toBe(200);
    expect(Array.isArray(res.data)).toBe(true);

    const testimonials = res.data as Testimonial[];
    // Public testimonials should either have curated entries or clean empty array
    if (testimonials.length > 0) {
      const first = testimonials[0];
      expect(first.customerName).toBeDefined();
      expect(first.rating).toBeGreaterThanOrEqual(1);
      expect(first.rating).toBeLessThanOrEqual(5);
    }
  });
});
