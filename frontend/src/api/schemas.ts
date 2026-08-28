import { z } from 'zod';

// ==========================================
// 1. Shared & RFC 7807 Error Schemas
// ==========================================

export const invalidParamSchema = z.object({
  name: z.string(),
  reason: z.string(),
});

export const alternativeSlotSchema = z.object({
  slotId: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  label: z.string().optional(),
});

export const problemDetailsSchema = z.object({
  type: z.string().optional(),
  title: z.string(),
  status: z.number().int(),
  code: z.string(),
  detail: z.string(),
  instance: z.string().optional(),
  correlationId: z.string().optional(),
  timestamp: z.string().optional(),
  invalidParams: z.array(invalidParamSchema).optional(),
  alternatives: z.array(alternativeSlotSchema).optional(),
});

// ==========================================
// 2. Business Profile Schemas
// ==========================================

export const workingHoursSchema = z.object({
  weekday: z.string(),
  sunday: z.string(),
  afternoonBreak: z.string(),
});

export const visitingChargeSchema = z.object({
  amount: z.number().positive(),
  currency: z.string().default('INR'),
  formatted: z.string().default('₹299'),
});

export const businessProfileResponseSchema = z.object({
  businessName: z.string(),
  tagline: z.string().optional(),
  city: z.string(),
  state: z.string(),
  phone: z.string(),
  whatsappNumber: z.string(),
  email: z.string().email().optional(),
  address: z.string(),
  workingHours: workingHoursSchema,
  visitingCharge: visitingChargeSchema,
  timezone: z.string().default('Asia/Kolkata'),
});

// ==========================================
// 3. Service Catalog Schemas
// ==========================================

export const serviceCategoryEnum = z.enum([
  'HOME_APPLIANCE',
  'ELECTRONICS',
  'COMMERCIAL_APPLIANCE',
]);

export const serviceOfferingSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  description: z.string(),
  category: serviceCategoryEnum,
  baseDurationMinutes: z.number().int().positive(),
  supportsHomeService: z.boolean(),
  supportsWorkshopRepair: z.boolean(),
  priceEstimate: z.string().optional(),
  displayOrder: z.number().int().default(0),
});

export const servicesResponseSchema = z.object({
  services: z.array(serviceOfferingSchema),
});

// ==========================================
// 4. Availability & Slot Schemas
// ==========================================

export const timeSlotSchema = z.object({
  slotId: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  label: z.string().optional(),
  available: z.boolean(),
});

export const availabilitySlotsResponseSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  serviceId: z.string(),
  slots: z.array(timeSlotSchema),
});

// ==========================================
// 5. Booking Form Input & Mutation Schemas
// ==========================================

export const bookingFormInputSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, 'Please enter your full name (minimum 2 characters)')
    .max(100, 'Name cannot exceed 100 characters'),
  phoneNumber: z
    .string()
    .trim()
    .min(10, 'Please enter a valid phone number (minimum 10 digits)')
    .max(15, 'Phone number cannot exceed 15 characters')
    .regex(/^[0-9+\-\s()]+$/, 'Phone number contains invalid characters'),
  serviceId: z
    .string()
    .min(1, 'Please select a service'),
  locationAddress: z
    .string()
    .trim()
    .min(5, 'Please enter a complete service address (at least 5 characters)')
    .max(500, 'Address cannot exceed 500 characters'),
  problemDescription: z
    .string()
    .trim()
    .min(10, 'Please describe the problem in at least 10 characters')
    .max(1000, 'Problem description cannot exceed 1000 characters'),
  requestedDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Please select a valid date (YYYY-MM-DD)'),
  slotId: z
    .string()
    .min(1, 'Please select an available time slot'),
  slotStartTime: z
    .string()
    .min(1, 'Slot start time is required'),
  slotEndTime: z
    .string()
    .min(1, 'Slot end time is required'),
});

export type BookingFormInput = z.infer<typeof bookingFormInputSchema>;

export const createBookingRequestSchema = z.object({
  fullName: z.string().min(2).max(100),
  phoneNumber: z.string().min(10).max(15),
  serviceId: z.string(),
  locationAddress: z.string().min(5).max(500),
  problemDescription: z.string().min(10).max(1000),
  requestedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  slotId: z.string(),
  slotStartTime: z.string(),
  slotEndTime: z.string(),
});

export const bookingStateEnum = z.enum([
  'REQUESTED',
  'SLOT_SELECTION_REQUIRED',
  'CONFIRMED',
  'CANCELLED',
  'CLOSED',
]);

export const bookingConfirmationResponseSchema = z.object({
  publicReference: z.string(),
  bookingId: z.string(),
  capabilityToken: z.string(),
  feedbackCapabilityToken: z.string().optional(),
  status: bookingStateEnum,
  customer: z.object({
    fullName: z.string(),
    phoneNumber: z.string(),
  }),
  service: z.object({
    serviceId: z.string(),
    serviceName: z.string(),
  }),
  scheduledSlot: z.object({
    date: z.string(),
    startTime: z.string(),
    endTime: z.string(),
    formatted: z.string().optional(),
  }),
  serviceLocation: z.string(),
  problemDescription: z.string(),
  cancellationPolicy: z.string().optional(),
  createdAt: z.string(),
});

// ==========================================
// 6. Booking Status & Tracking Schemas
// ==========================================

export const jobStateEnum = z.enum([
  'ASSIGNMENT_PENDING',
  'ASSIGNED',
  'SCHEDULED',
  'EN_ROUTE',
  'ARRIVED',
  'DIAGNOSING',
  'DEVICE_TRANSFERRED',
  'WORKSHOP_REPAIR',
  'COMPLETED',
  'UNABLE_TO_SERVE',
]);

export const bookingTrackingResponseSchema = z.object({
  publicReference: z.string(),
  bookingState: bookingStateEnum,
  jobStatus: jobStateEnum,
  customerName: z.string(),
  customerPhone: z.string(),
  serviceName: z.string(),
  serviceLocation: z.string(),
  problemDescription: z.string(),
  scheduledDate: z.string(),
  scheduledTimeRange: z.string().optional(),
  scheduledStartTime: z.string(),
  scheduledEndTime: z.string(),
  technician: z
    .object({
      assigned: z.boolean(),
      technicianName: z.string().optional(),
      technicianPhone: z.string().optional(),
    })
    .optional(),
  timeline: z
    .object({
      bookedAt: z.string().nullable().optional(),
      scheduledAt: z.string().nullable().optional(),
      enRouteAt: z.string().nullable().optional(),
      arrivedAt: z.string().nullable().optional(),
      completedAt: z.string().nullable().optional(),
    })
    .optional(),
  canCancel: z.boolean(),
  canCancelWithoutCharge: z.boolean().default(true),
  visitingChargeAmount: z.number().default(299.0),
  feedbackCapabilityToken: z.string().optional(),
  updatedAt: z.string(),
});

// ==========================================
// 7. Cancellation Schemas
// ==========================================

export const cancelBookingInputSchema = z.object({
  cancellationReason: z
    .string()
    .trim()
    .min(3, 'Please provide a brief cancellation reason (at least 3 characters)')
    .max(500, 'Reason cannot exceed 500 characters'),
  capabilityToken: z.string().optional(),
});

export type CancelBookingInput = z.infer<typeof cancelBookingInputSchema>;

export const cancelBookingResponseSchema = z.object({
  publicReference: z.string(),
  status: z.literal('CANCELLED'),
  cancellationOutcome: z
    .enum(['PRE_ARRIVAL_NO_VISIT_CHARGE', 'POST_ARRIVAL_VISIT_CHARGE_APPLICABLE'])
    .optional(),
  visitingChargeApplicable: z.boolean(),
  chargeAmount: z.number().default(0.0),
  cancelledAt: z.string(),
  message: z.string(),
});

// ==========================================
// 8. Feedback & Reviews Schemas
// ==========================================

export const feedbackFormInputSchema = z.object({
  rating: z
    .number()
    .int('Rating must be an integer')
    .min(1, 'Please select at least 1 star')
    .max(5, 'Rating cannot exceed 5 stars'),
  comment: z
    .string()
    .trim()
    .max(1000, 'Comment cannot exceed 1000 characters')
    .optional(),
  feedbackToken: z.string().optional(),
});

export type FeedbackFormInput = z.infer<typeof feedbackFormInputSchema>;

export const submitFeedbackRequestSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional(),
  feedbackToken: z.string().optional(),
});

export const feedbackResponseSchema = z.object({
  feedbackId: z.string(),
  status: z.literal('ACCEPTED'),
  rating: z.number().int().min(1).max(5),
  comment: z.string().optional(),
  submittedAt: z.string(),
  message: z.string(),
  googleReviewUrl: z.string().optional(),
});

// ==========================================
// 9. Testimonials & Google Reviews Schemas
// ==========================================

export const testimonialSchema = z.object({
  id: z.string(),
  customerName: z.string(),
  rating: z.number().int().min(1).max(5),
  reviewText: z.string(),
  serviceType: z.string(),
  location: z.string().default('Solapur'),
  displayOrder: z.number().int().default(0),
  date: z.string().optional(),
});

export const testimonialsResponseSchema = z.object({
  testimonials: z.array(testimonialSchema),
});

export const googleReviewItemSchema = z.object({
  authorName: z.string(),
  rating: z.number().int().min(1).max(5),
  reviewText: z.string().optional(),
  reviewDate: z.string().optional(),
  authorPhotoUrl: z.string().optional(),
});

export const reviewsResponseSchema = z.object({
  configured: z.boolean(),
  averageRating: z.number().optional(),
  totalReviewCount: z.number().int().default(0),
  reviews: z.array(googleReviewItemSchema),
});
