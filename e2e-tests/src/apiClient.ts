/**
 * Typed Axios API Client for RepairReach Public REST Endpoints.
 * Implements methods for all public capabilities defined in PROJECT.md and docs/architecture/09-api-architecture.md.
 */

import axios, {
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  AxiosError,
} from 'axios';
import { API_BASE_URL, TIMEOUT } from './config.js';
import type {
  BusinessProfile,
  ServiceCatalogItem,
  AvailabilityResponse,
  AvailabilitySlot,
  CreateBookingRequest,
  CreateBookingResponse,
  BookingDetailsResponse,
  CancelBookingResponse,
  SubmitFeedbackRequest,
  SubmitFeedbackResponse,
  Testimonial,
  ProblemDetails,
  ApiResponse,
} from './types.js';

export interface ApiClientConfig {
  baseUrl?: string;
  timeout?: number;
  headers?: Record<string, string>;
}

export class RepairReachApiClient {
  private client: AxiosInstance;
  public readonly baseUrl: string;

  constructor(config?: ApiClientConfig) {
    this.baseUrl = config?.baseUrl || API_BASE_URL;
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: config?.timeout || TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json, application/problem+json',
        ...(config?.headers || {}),
      },
      // Do not throw on 4xx/5xx so E2E tests can assert on status codes directly
      validateStatus: () => true,
    });
  }

  /**
   * Helper to format an AxiosResponse into our typed ApiResponse
   */
  private formatResponse<T>(res: AxiosResponse<T>): ApiResponse<T> {
    const headers: Record<string, string> = {};
    for (const [key, value] of Object.entries(res.headers)) {
      if (typeof value === 'string') {
        headers[key.toLowerCase()] = value;
      } else if (Array.isArray(value)) {
        headers[key.toLowerCase()] = value.join(', ');
      }
    }

    return {
      status: res.status,
      statusText: res.statusText,
      headers,
      data: res.data,
      raw: res,
    };
  }

  // ==========================================
  // Public Endpoint Methods
  // ==========================================

  /**
   * GET /api/v1/public/business
   * Retrieves public business profile, operating hours, and contact channels.
   */
  async getBusiness(): Promise<ApiResponse<BusinessProfile>> {
    const res = await this.client.get<BusinessProfile>('/business');
    return this.formatResponse(res);
  }

  /**
   * GET /api/v1/public/services
   * Retrieves published service catalog items (excluding mobile repairs).
   */
  async getServices(): Promise<ApiResponse<ServiceCatalogItem[]>> {
    const res = await this.client.get<ServiceCatalogItem[]>('/services');
    return this.formatResponse(res);
  }

  /**
   * GET /api/v1/public/availability/slots?serviceId=...&date=...
   * Calculates backend-authoritative slot availability for a given service and date.
   */
  async getSlots(
    serviceId: string,
    date: string
  ): Promise<ApiResponse<AvailabilityResponse | AvailabilitySlot[]>> {
    const res = await this.client.get<AvailabilityResponse | AvailabilitySlot[]>(
      '/availability/slots',
      {
        params: {
          serviceId,
          date,
        },
      }
    );
    return this.formatResponse(res);
  }

  /**
   * POST /api/v1/public/bookings
   * Creates an appliance repair booking transactionally with Idempotency-Key header.
   */
  async createBooking(
    bookingData: CreateBookingRequest,
    idempotencyKey?: string
  ): Promise<ApiResponse<CreateBookingResponse | ProblemDetails>> {
    const headers: Record<string, string> = {};
    if (idempotencyKey) {
      headers['Idempotency-Key'] = idempotencyKey;
    }

    const res = await this.client.post<CreateBookingResponse | ProblemDetails>(
      '/bookings',
      bookingData,
      { headers }
    );
    return this.formatResponse(res);
  }

  /**
   * GET /api/v1/public/bookings/{publicReference}
   * Retrieves booking tracking information by unguessable public reference.
   */
  async getBooking(
    publicReference: string
  ): Promise<ApiResponse<BookingDetailsResponse | ProblemDetails>> {
    const res = await this.client.get<BookingDetailsResponse | ProblemDetails>(
      `/bookings/${encodeURIComponent(publicReference)}`
    );
    return this.formatResponse(res);
  }

  /**
   * POST /api/v1/public/bookings/{publicReference}/cancel
   * Submits pre-arrival customer cancellation.
   */
  async cancelBooking(
    publicReference: string
  ): Promise<ApiResponse<CancelBookingResponse | ProblemDetails>> {
    const res = await this.client.post<CancelBookingResponse | ProblemDetails>(
      `/bookings/${encodeURIComponent(publicReference)}/cancel`
    );
    return this.formatResponse(res);
  }

  /**
   * POST /api/v1/public/jobs/{jobReference}/feedback
   * Submits star rating (1-5) and comment using capability token.
   * Can be called with either (jobRef, token, rating, comment) or (jobRef, requestObject, token)
   */
  async submitFeedback(
    jobReference: string,
    tokenOrData: string | SubmitFeedbackRequest,
    ratingOrToken?: number | string,
    comment?: string
  ): Promise<ApiResponse<SubmitFeedbackResponse | ProblemDetails>> {
    let payload: SubmitFeedbackRequest;
    let token: string | undefined;

    if (typeof tokenOrData === 'object') {
      payload = tokenOrData;
      token = typeof ratingOrToken === 'string' ? ratingOrToken : undefined;
    } else {
      token = tokenOrData;
      payload = {
        rating: typeof ratingOrToken === 'number' ? ratingOrToken : 5,
        comment,
      };
    }

    const headers: Record<string, string> = {};
    if (token) {
      headers['X-Feedback-Token'] = token;
    }

    const res = await this.client.post<SubmitFeedbackResponse | ProblemDetails>(
      `/jobs/${encodeURIComponent(jobReference)}/feedback`,
      payload,
      { headers }
    );
    return this.formatResponse(res);
  }

  /**
   * GET /api/v1/public/testimonials
   * Retrieves curated testimonials / public review items.
   */
  async getTestimonials(): Promise<ApiResponse<Testimonial[] | ProblemDetails>> {
    const res = await this.client.get<Testimonial[] | ProblemDetails>('/testimonials');
    return this.formatResponse(res);
  }

  // ==========================================
  // Generic / Raw Helpers
  // ==========================================

  /**
   * Execute raw HTTP request against configured base URL
   */
  async rawRequest<T = unknown>(config: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const res = await this.client.request<T>(config);
    return this.formatResponse(res);
  }

  /**
   * Execute custom GET request
   */
  async get<T = unknown>(
    url: string,
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<T>> {
    const res = await this.client.get<T>(url, config);
    return this.formatResponse(res);
  }

  /**
   * Execute custom POST request
   */
  async post<T = unknown>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<T>> {
    const res = await this.client.post<T>(url, data, config);
    return this.formatResponse(res);
  }

  /**
   * Type guard to check if an object is an RFC 7807 ProblemDetails
   */
  static isProblemDetails(data: unknown): data is ProblemDetails {
    if (!data || typeof data !== 'object') return false;
    const obj = data as Record<string, unknown>;
    return (
      typeof obj.type === 'string' &&
      typeof obj.title === 'string' &&
      typeof obj.status === 'number'
    );
  }

  /**
   * Helper to extract ProblemDetails from an error or response
   */
  static extractProblemDetails(resOrError: unknown): ProblemDetails | null {
    if (!resOrError) return null;

    // Direct ApiResponse object
    if (typeof resOrError === 'object' && 'data' in resOrError) {
      const data = (resOrError as ApiResponse<unknown>).data;
      if (RepairReachApiClient.isProblemDetails(data)) {
        return data;
      }
    }

    // Direct ProblemDetails object
    if (RepairReachApiClient.isProblemDetails(resOrError)) {
      return resOrError;
    }

    // AxiosError
    if (axios.isAxiosError(resOrError)) {
      const data = resOrError.response?.data;
      if (RepairReachApiClient.isProblemDetails(data)) {
        return data;
      }
    }

    return null;
  }
}

// Export singleton default instance for easy imports
export const defaultApiClient = new RepairReachApiClient();
export default defaultApiClient;
