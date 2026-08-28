import { apiClient } from './client';
import * as T from './types';
import {
  businessProfileResponseSchema,
  servicesResponseSchema,
  availabilitySlotsResponseSchema,
  bookingConfirmationResponseSchema,
  bookingTrackingResponseSchema,
  cancelBookingResponseSchema,
  feedbackResponseSchema,
  testimonialsResponseSchema,
  reviewsResponseSchema,
} from './schemas';

/**
 * Fetch business profile, operating hours, phone, WhatsApp contact
 */
export async function getBusinessProfile(): Promise<T.BusinessProfile> {
  const response = await apiClient.get('/public/business');
  // If response is nested or flat, schema handles or passes through
  const parsed = businessProfileResponseSchema.safeParse(response.data);
  if (parsed.success) {
    return parsed.data;
  }
  return response.data as T.BusinessProfile;
}

/**
 * Fetch published service catalog (AC, TV, Washing Machine, Refrigerator, Microwave)
 */
export async function getServices(): Promise<T.ServiceOffering[]> {
  const response = await apiClient.get('/public/services');
  if (Array.isArray(response.data)) {
    return response.data as T.ServiceOffering[];
  }
  const parsed = servicesResponseSchema.safeParse(response.data);
  if (parsed.success) {
    return parsed.data.services;
  }
  if (response.data && Array.isArray((response.data as { services?: unknown[] }).services)) {
    return (response.data as { services: T.ServiceOffering[] }).services;
  }
  return [];
}

/**
 * Fetch backend-calculated dynamic availability slots for a date & service
 */
export async function getAvailabilitySlots(
  serviceId: string,
  date: string
): Promise<T.AvailabilitySlotsResponse> {
  const response = await apiClient.get('/public/availability/slots', {
    params: { serviceId, date },
  });
  const parsed = availabilitySlotsResponseSchema.safeParse(response.data);
  if (parsed.success) {
    return parsed.data;
  }
  return response.data as T.AvailabilitySlotsResponse;
}

/**
 * Submit an idempotent booking request with client-generated UUID Idempotency-Key
 */
export async function createBooking(
  payload: T.CreateBookingRequest,
  idempotencyKey: string
): Promise<T.BookingConfirmationResponse> {
  const response = await apiClient.post('/customer/bookings', payload, {
    headers: {
      'Idempotency-Key': idempotencyKey,
    },
  });
  const parsed = bookingConfirmationResponseSchema.safeParse(response.data);
  if (parsed.success) {
    return parsed.data;
  }
  return response.data as T.BookingConfirmationResponse;
}

/**
 * Lookup live tracking info and status timeline by public reference
 */
export async function getBookingByReference(
  publicReference: string
): Promise<T.BookingTrackingResponse> {
  const response = await apiClient.get(`/customer/bookings/${encodeURIComponent(publicReference)}`);
  const parsed = bookingTrackingResponseSchema.safeParse(response.data);
  if (parsed.success) {
    return parsed.data;
  }
  return response.data as T.BookingTrackingResponse;
}

/**
 * Pre-arrival customer booking cancellation
 */
export async function cancelBooking(
  publicReference: string,
  payload: T.CancelBookingRequest,
  idempotencyKey?: string
): Promise<T.CancelBookingResponse> {
  const headers: Record<string, string> = {};
  if (idempotencyKey) {
    headers['Idempotency-Key'] = idempotencyKey;
  }

  const response = await apiClient.post(
    `/customer/bookings/${encodeURIComponent(publicReference)}/cancel`,
    payload,
    { headers }
  );
  const parsed = cancelBookingResponseSchema.safeParse(response.data);
  if (parsed.success) {
    return parsed.data;
  }
  return response.data as T.CancelBookingResponse;
}

/**
 * Submit customer feedback & star rating with capability token
 */
export async function submitFeedback(
  jobReferenceOrPublicRef: string,
  payload: T.SubmitFeedbackRequest,
  idempotencyKey?: string
): Promise<T.FeedbackResponse> {
  const headers: Record<string, string> = {};
  if (idempotencyKey) {
    headers['Idempotency-Key'] = idempotencyKey;
  }
  if (payload.feedbackToken) {
    headers['X-Feedback-Token'] = payload.feedbackToken;
  }

  const response = await apiClient.post(
    `/public/jobs/${encodeURIComponent(jobReferenceOrPublicRef)}/feedback`,
    payload,
    { headers }
  );
  const parsed = feedbackResponseSchema.safeParse(response.data);
  if (parsed.success) {
    return parsed.data;
  }
  return response.data as T.FeedbackResponse;
}

/**
 * Fetch curated public testimonials
 */
export async function getTestimonials(): Promise<T.Testimonial[]> {
  const response = await apiClient.get('/public/testimonials');
  if (Array.isArray(response.data)) {
    return response.data as T.Testimonial[];
  }
  const parsed = testimonialsResponseSchema.safeParse(response.data);
  if (parsed.success) {
    return parsed.data.testimonials;
  }
  if (response.data && Array.isArray((response.data as { testimonials?: unknown[] }).testimonials)) {
    return (response.data as { testimonials: T.Testimonial[] }).testimonials;
  }
  return [];
}

/**
 * Fetch synced Google Reviews (or empty state if not configured)
 */
export async function getGoogleReviews(): Promise<T.ReviewsResponse> {
  const response = await apiClient.get('/public/reviews');
  const parsed = reviewsResponseSchema.safeParse(response.data);
  if (parsed.success) {
    return parsed.data;
  }
  return response.data as T.ReviewsResponse;
}
