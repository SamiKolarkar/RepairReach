import { describe, it, expect } from 'vitest';
import {
  generateUUID,
  generateCustomerPhone,
  generateInvalidPhone,
  generateDate,
  generateNextSunday,
  generateNextWeekday,
  generateBookingPayload,
  assertProblemDetails,
  assertValidSlot,
  assertValidService,
  assertValidBusinessProfile,
  assertValidTestimonial,
  KNOWN_SERVICES,
  EXCLUDED_SERVICES,
} from './testUtils.js';
import { RepairReachApiClient } from './apiClient.js';
import { getTestConfig } from './config.js';
import type { ProblemDetails, AvailabilitySlot, ServiceCatalogItem, BusinessProfile, Testimonial } from './types.js';

describe('E2E Infrastructure Smoke Tests', () => {
  it('loads test environment configuration correctly', () => {
    const config = getTestConfig();
    expect(config.backendUrl).toBeDefined();
    expect(config.frontendUrl).toBeDefined();
    expect(config.apiBasePath).toBe('/api/v1/public');
    expect(config.apiBaseUrl).toContain('/api/v1/public');
    expect(config.timeoutMs).toBeGreaterThan(0);
  });

  it('generates valid UUIDs, phone numbers, and dates', () => {
    const uuid = generateUUID();
    expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);

    const phone = generateCustomerPhone();
    expect(phone).toMatch(/^\+91 [6-9]\d{8,9}$/);

    const invalidPhone = generateInvalidPhone('short');
    expect(invalidPhone.length).toBeLessThan(10);

    const futureDate = generateDate(3);
    expect(futureDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    const nextSunday = generateNextSunday();
    const sundayObj = new Date(`${nextSunday}T12:00:00Z`);
    expect(sundayObj.getUTCDay()).toBe(0);

    const nextWeekday = generateNextWeekday();
    const weekdayObj = new Date(`${nextWeekday}T12:00:00Z`);
    expect(weekdayObj.getUTCDay()).not.toBe(0);
  });

  it('generates full booking request payloads with Solapur defaults', () => {
    const payload = generateBookingPayload('srv-washing', 'slot-10-11');
    expect(payload.serviceId).toBe('srv-washing');
    expect(payload.requestedSlotId).toBe('slot-10-11');
    expect(payload.customerName).toBeTruthy();
    expect(payload.customerPhone).toBeTruthy();
    expect(payload.locationAddress).toContain('Solapur');
    expect(payload.problemDescription).toBeTruthy();
  });

  it('verifies custom assertion helpers work accurately', () => {
    const validProblem: ProblemDetails = {
      type: 'https://api.repairreach.example/problems/slot-unavailable',
      title: 'Selected slot is no longer available',
      status: 409,
      code: 'SLOT_UNAVAILABLE',
      detail: 'Choose one of the current alternatives.',
    };
    expect(() => assertProblemDetails(validProblem, 'SLOT_UNAVAILABLE', 409)).not.toThrow();

    const validSlot: AvailabilitySlot = {
      slotId: 'slot-10-11',
      startTime: '10:00',
      endTime: '11:00',
      available: true,
    };
    expect(() => assertValidSlot(validSlot)).not.toThrow();

    const validService: ServiceCatalogItem = {
      id: 'srv-1',
      code: KNOWN_SERVICES.WASHING_MACHINE,
      name: 'Washing Machine Repair',
      category: 'APPLIANCE_REPAIR',
      description: 'Front load and top load repair',
      approxDurationMinutes: 60,
    };
    expect(() => assertValidService(validService)).not.toThrow();

    const validProfile: BusinessProfile = {
      id: 'biz-1',
      code: 'SOLAPUR_MAIN',
      name: 'RepairReach Solapur',
      city: 'Solapur',
      phone: '+91 9822012345',
      whatsapp: '+91 9822012345',
    };
    expect(() => assertValidBusinessProfile(validProfile)).not.toThrow();

    const validTestimonial: Testimonial = {
      id: 't-1',
      customerName: 'Rajesh Patil',
      rating: 5,
      comment: 'Excellent technician and timely service.',
      date: '2026-08-10',
      serviceName: 'Washing Machine Repair',
    };
    expect(() => assertValidTestimonial(validTestimonial)).not.toThrow();
  });

  it('verifies API client instantiation and method availability', () => {
    const client = new RepairReachApiClient({
      baseUrl: 'http://localhost:8080/api/v1/public',
    });
    expect(client).toBeDefined();
    expect(typeof client.getBusiness).toBe('function');
    expect(typeof client.getServices).toBe('function');
    expect(typeof client.getSlots).toBe('function');
    expect(typeof client.createBooking).toBe('function');
    expect(typeof client.getBooking).toBe('function');
    expect(typeof client.cancelBooking).toBe('function');
    expect(typeof client.submitFeedback).toBe('function');
    expect(typeof client.getTestimonials).toBe('function');
  });
});
