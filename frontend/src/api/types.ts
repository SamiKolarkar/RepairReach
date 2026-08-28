// ==========================================
// 1. Shared & RFC 7807 Error Types
// ==========================================

export interface InvalidParam {
  name: string;
  reason: string;
}

export interface AlternativeSlot {
  slotId: string;
  startTime: string;
  endTime: string;
  label?: string;
}

export interface ProblemDetails {
  type?: string;
  title: string;
  status: number;
  code: string;
  detail: string;
  instance?: string;
  correlationId?: string;
  timestamp?: string;
  invalidParams?: InvalidParam[];
  alternatives?: AlternativeSlot[];
}

// ==========================================
// 2. Business Profile Types
// ==========================================

export interface WorkingHours {
  weekday: string;
  sunday: string;
  afternoonBreak: string;
}

export interface VisitingCharge {
  amount: number;
  currency: string;
  formatted: string;
}

export interface BusinessProfile {
  businessName: string;
  tagline?: string;
  city: string;
  state: string;
  phone: string;
  whatsappNumber: string;
  email?: string;
  address: string;
  workingHours: WorkingHours;
  visitingCharge: VisitingCharge;
  timezone: string;
}

// ==========================================
// 3. Service Catalog Types
// ==========================================

export type ServiceCategory =
  | 'HOME_APPLIANCE'
  | 'ELECTRONICS'
  | 'COMMERCIAL_APPLIANCE';

export interface ServiceOffering {
  id: string;
  code: string;
  name: string;
  description: string;
  category: ServiceCategory;
  baseDurationMinutes: number;
  supportsHomeService: boolean;
  supportsWorkshopRepair: boolean;
  priceEstimate?: string;
  displayOrder?: number;
}

export interface ServicesResponse {
  services: ServiceOffering[];
}

// ==========================================
// 4. Availability & Slot Types
// ==========================================

export interface TimeSlot {
  slotId: string;
  startTime: string; // ISO-8601 string or HH:mm
  endTime: string;   // ISO-8601 string or HH:mm
  label?: string;    // e.g. "9:00 AM - 11:00 AM"
  available: boolean; // Retained for compatibility, should always be true
}

export interface AvailabilitySlotsResponse {
  date: string;
  serviceId: string;
  slots: TimeSlot[];
}

// ==========================================
// 5. Booking Creation Types
// ==========================================

export type BookingState =
  | 'REQUESTED'
  | 'SLOT_SELECTION_REQUIRED'
  | 'CONFIRMED'
  | 'CANCELLED'
  | 'CLOSED';

export interface CreateBookingRequest {
  fullName: string;
  phoneNumber: string;
  serviceId: string;
  locationAddress: string;
  problemDescription: string;
  requestedDate: string;
  slotId: string;
  slotStartTime: string;
  slotEndTime: string;
}

export interface BookingConfirmationResponse {
  publicReference: string;
  bookingId: string;
  capabilityToken: string;
  feedbackCapabilityToken?: string;
  status: BookingState;
  customer: {
    fullName: string;
    phoneNumber: string;
  };
  service: {
    serviceId: string;
    serviceName: string;
  };
  scheduledSlot: {
    date: string;
    startTime: string;
    endTime: string;
    formatted?: string;
  };
  serviceLocation: string;
  problemDescription: string;
  cancellationPolicy?: string;
  createdAt: string;
}

// ==========================================
// 6. Booking Tracking Types
// ==========================================

export type JobState =
  | 'ASSIGNMENT_PENDING'
  | 'ASSIGNED'
  | 'SCHEDULED'
  | 'EN_ROUTE'
  | 'ARRIVED'
  | 'DIAGNOSING'
  | 'DEVICE_TRANSFERRED'
  | 'WORKSHOP_REPAIR'
  | 'COMPLETED'
  | 'UNABLE_TO_SERVE';

export interface BookingTrackingResponse {
  publicReference: string;
  bookingState: BookingState;
  jobStatus: JobState;
  customerName: string;
  customerPhone: string;
  serviceName: string;
  serviceLocation: string;
  problemDescription: string;
  scheduledDate: string;
  scheduledTimeRange?: string;
  scheduledStartTime: string;
  scheduledEndTime: string;
  technician?: {
    assigned: boolean;
    technicianName?: string;
    technicianPhone?: string;
  };
  timeline?: {
    bookedAt?: string | null;
    scheduledAt?: string | null;
    enRouteAt?: string | null;
    arrivedAt?: string | null;
    completedAt?: string | null;
  };
  canCancel: boolean;
  canCancelWithoutCharge: boolean;
  visitingChargeAmount: number;
  feedbackCapabilityToken?: string;
  updatedAt: string;
}

// ==========================================
// 7. Cancellation Types
// ==========================================

export interface CancelBookingRequest {
  cancellationReason: string;
  capabilityToken?: string;
}

export interface CancelBookingResponse {
  publicReference: string;
  status: 'CANCELLED';
  cancellationOutcome?: 'PRE_ARRIVAL_NO_VISIT_CHARGE' | 'POST_ARRIVAL_VISIT_CHARGE_APPLICABLE';
  visitingChargeApplicable: boolean;
  chargeAmount?: number;
  cancelledAt: string;
  message: string;
}

// ==========================================
// 8. Feedback & Review Types
// ==========================================

export interface SubmitFeedbackRequest {
  rating: number;
  comment?: string;
  feedbackToken?: string;
}

export interface FeedbackResponse {
  feedbackId: string;
  status: 'ACCEPTED';
  rating: number;
  comment?: string;
  submittedAt: string;
  message: string;
  googleReviewUrl?: string;
}

// ==========================================
// 9. Testimonials & Google Reviews Types
// ==========================================

export interface Testimonial {
  id: string;
  customerName: string;
  rating: number;
  reviewText: string;
  serviceType: string;
  location?: string;
  displayOrder?: number;
  date?: string;
}

export interface TestimonialsResponse {
  testimonials: Testimonial[];
}

export interface GoogleReviewItem {
  authorName: string;
  rating: number;
  reviewText?: string;
  reviewDate?: string;
  authorPhotoUrl?: string;
}

export interface ReviewsResponse {
  configured: boolean;
  averageRating?: number;
  totalReviewCount?: number;
  reviews: GoogleReviewItem[];
}
