import { describe, it, expect } from 'vitest';
import {
  bookingFormInputSchema,
  cancelBookingInputSchema,
  feedbackFormInputSchema,
  problemDetailsSchema,
} from '@/api/schemas';

describe('Zod Validation Schemas', () => {
  describe('bookingFormInputSchema', () => {
    it('validates correct booking form input', () => {
      const validData = {
        fullName: 'Sarah Jenkins',
        phoneNumber: '+91 98765 12345',
        serviceId: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
        locationAddress: '123 Maple Street, Solapur 413001',
        problemDescription: 'AC cooling stopped completely and making unusual buzzing noise.',
        requestedDate: '2026-08-20',
        slotId: 'slot_20260820_1100',
        slotStartTime: '2026-08-20T11:00:00+05:30',
        slotEndTime: '2026-08-20T13:00:00+05:30',
      };
      const result = bookingFormInputSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('rejects short names (<2 chars)', () => {
      const invalidData = {
        fullName: 'J',
        phoneNumber: '9876543210',
        serviceId: 'service-1',
        locationAddress: '123 Main St, Solapur',
        problemDescription: 'Washing machine not spinning at all.',
        requestedDate: '2026-08-20',
        slotId: 'slot1',
        slotStartTime: '09:00',
        slotEndTime: '11:00',
      };
      const result = bookingFormInputSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('fullName');
      }
    });

    it('rejects invalid phone numbers (<10 digits)', () => {
      const invalidData = {
        fullName: 'Sarah Jenkins',
        phoneNumber: '12345',
        serviceId: 'service-1',
        locationAddress: '123 Main St, Solapur',
        problemDescription: 'Washing machine not spinning at all.',
        requestedDate: '2026-08-20',
        slotId: 'slot1',
        slotStartTime: '09:00',
        slotEndTime: '11:00',
      };
      const result = bookingFormInputSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('phoneNumber');
      }
    });

    it('rejects problem descriptions under 10 chars', () => {
      const invalidData = {
        fullName: 'Sarah Jenkins',
        phoneNumber: '9876543210',
        serviceId: 'service-1',
        locationAddress: '123 Main St, Solapur',
        problemDescription: 'Broken',
        requestedDate: '2026-08-20',
        slotId: 'slot1',
        slotStartTime: '09:00',
        slotEndTime: '11:00',
      };
      const result = bookingFormInputSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('problemDescription');
      }
    });
  });

  describe('cancelBookingInputSchema', () => {
    it('accepts valid cancellation reason', () => {
      const result = cancelBookingInputSchema.safeParse({
        cancellationReason: 'Technician no longer needed.',
      });
      expect(result.success).toBe(true);
    });

    it('rejects reason under 3 characters', () => {
      const result = cancelBookingInputSchema.safeParse({
        cancellationReason: 'No',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('feedbackFormInputSchema', () => {
    it('accepts valid 1-5 rating with optional comment', () => {
      const result = feedbackFormInputSchema.safeParse({
        rating: 5,
        comment: 'Excellent service!',
      });
      expect(result.success).toBe(true);
    });

    it('rejects rating 0 or rating > 5', () => {
      const resultZero = feedbackFormInputSchema.safeParse({ rating: 0 });
      const resultSix = feedbackFormInputSchema.safeParse({ rating: 6 });
      expect(resultZero.success).toBe(false);
      expect(resultSix.success).toBe(false);
    });
  });

  describe('problemDetailsSchema', () => {
    it('parses standard RFC 7807 409 conflict payload with alternatives', () => {
      const conflictPayload = {
        type: 'https://api.repairreach.in/problems/slot-unavailable',
        title: 'Selected slot is no longer available',
        status: 409,
        code: 'SLOT_UNAVAILABLE',
        detail: 'The slot was just confirmed by another customer.',
        alternatives: [
          {
            slotId: 'slot_2',
            startTime: '2026-08-20T14:00:00+05:30',
            endTime: '2026-08-20T16:00:00+05:30',
            label: '2:00 PM - 4:00 PM',
          },
        ],
      };
      const result = problemDetailsSchema.safeParse(conflictPayload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.code).toBe('SLOT_UNAVAILABLE');
        expect(result.data.alternatives).toHaveLength(1);
      }
    });
  });
});
