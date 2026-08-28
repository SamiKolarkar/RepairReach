/**
 * E2E Test Suite Utilities, Assertions, and Test Data Generators.
 * Provides reusable opaque-box testing helpers for all test tiers.
 */

import crypto from 'node:crypto';
import type {
  CreateBookingRequest,
  CreateBookingResponse,
  ProblemDetails,
  AvailabilitySlot,
  ServiceCatalogItem,
  BusinessProfile,
  Testimonial,
} from './types.js';
import { RepairReachApiClient } from './apiClient.js';

// ==========================================
// 1. Solapur Test Constants & Fixtures
// ==========================================

export const SOLAPUR_BUSINESS_CODE = 'SOLAPUR_MAIN';

export const KNOWN_SERVICES = {
  WASHING_MACHINE: 'WASHING_MACHINE_REPAIR',
  REFRIGERATOR: 'REFRIGERATOR_REPAIR',
  MICROWAVE: 'MICROWAVE_REPAIR',
  AC: 'AC_REPAIR',
  TV: 'TV_REPAIR',
} as const;

export const EXCLUDED_SERVICES = [
  'MOBILE_PHONE_REPAIR',
  'SMARTPHONE_REPAIR',
  'TABLET_REPAIR',
  'IPHONE_REPAIR',
  'LAPTOP_REPAIR',
] as const;

export const SOLAPUR_LOCALITIES = [
  'Shop 12, Navi Peth, Solapur, Maharashtra 413001',
  'Flat 302, Green View Apts, Hotgi Road, Solapur 413003',
  'House No. 45, Sector 2, Jule Solapur, Solapur 413004',
  '120 Saat Rasta Chowk, Solapur 413001',
  'Bhavani Peth, Near Siddheshwar Temple, Solapur 413002',
  'Ashok Chowk, Old Pune Naka, Solapur 413005',
  'Murarji Peth, Station Road, Solapur 413001',
];

export const SAMPLE_PROBLEMS = [
  'Washing machine drum does not spin during rinse cycle',
  'Refrigerator compressor running continuously but no cooling in fridge section',
  'Microwave turns on and turntable spins but food remains cold',
  'Split AC blowing ambient air with error code E4 on display',
  'Smart TV display flickers with backlight bleeding across bottom edge',
  'Appliance tripping circuit breaker immediately upon power switch on',
];

export const SAMPLE_CUSTOMER_NAMES = [
  'Rajesh Patil',
  'Amit Deshmukh',
  'Sunita Kulkarni',
  'Priya Shinde',
  'Ganesh Jadhav',
  'Sachin Gaikwad',
  'Anjali Bhosale',
  'Vikas More',
];

// ==========================================
// 2. Data Generators
// ==========================================

/**
 * Generate a standard RFC 4122 v4 UUID
 */
export function generateUUID(): string {
  return crypto.randomUUID();
}

/**
 * Generate an Indian 10-digit mobile number starting with 6, 7, 8, or 9
 */
export function generateCustomerPhone(prefix = '+91'): string {
  const firstDigit = ['9', '8', '7', '6'][Math.floor(Math.random() * 4)];
  const remainingDigits = Math.floor(100000000 + Math.random() * 900000000).toString();
  const rawNumber = `${firstDigit}${remainingDigits}`;
  return prefix ? `${prefix} ${rawNumber}` : rawNumber;
}

/**
 * Generate invalid phone numbers for boundary testing
 */
export function generateInvalidPhone(type: 'short' | 'letters' | 'symbols' | 'too_long' = 'short'): string {
  switch (type) {
    case 'short':
      return '98220';
    case 'letters':
      return '9822ABC123';
    case 'symbols':
      return '+91-9822#45@12';
    case 'too_long':
      return '98220123456789012';
    default:
      return 'invalid-phone';
  }
}

/**
 * Return formatted date string YYYY-MM-DD
 */
export function formatDate(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Generate date string offset from today by N days
 */
export function generateDate(daysOffset = 1): string {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  return formatDate(d);
}

/**
 * Generate date string for the upcoming Sunday
 */
export function generateNextSunday(weeksOffset = 0): string {
  const d = new Date();
  const day = d.getDay(); // 0 is Sunday
  const daysUntilSunday = day === 0 ? 7 : 7 - day;
  d.setDate(d.getDate() + daysUntilSunday + weeksOffset * 7);
  return formatDate(d);
}

/**
 * Generate date string for the next weekday (Monday-Saturday)
 */
export function generateNextWeekday(daysOffset = 1): string {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  if (d.getDay() === 0) {
    // If Sunday, push to Monday
    d.setDate(d.getDate() + 1);
  }
  return formatDate(d);
}

/**
 * Generate full customer information object
 */
export function generateCustomer(overrides?: Partial<CreateBookingRequest>): {
  name: string;
  phone: string;
  address: string;
  problem: string;
} {
  const name =
    overrides?.customerName ||
    SAMPLE_CUSTOMER_NAMES[Math.floor(Math.random() * SAMPLE_CUSTOMER_NAMES.length)];
  const phone = overrides?.customerPhone || generateCustomerPhone('+91');
  const address =
    overrides?.locationAddress ||
    SOLAPUR_LOCALITIES[Math.floor(Math.random() * SOLAPUR_LOCALITIES.length)];
  const problem =
    overrides?.problemDescription ||
    SAMPLE_PROBLEMS[Math.floor(Math.random() * SAMPLE_PROBLEMS.length)];

  return { name, phone, address, problem };
}

/**
 * Create a complete booking request payload
 */
export function generateBookingPayload(
  serviceId: string,
  slotId: string,
  dateStr?: string,
  overrides?: Partial<CreateBookingRequest>
): CreateBookingRequest {
  const customer = generateCustomer(overrides);
  return {
    customerName: customer.name,
    customerPhone: customer.phone,
    serviceId,
    locationAddress: customer.address,
    problemDescription: customer.problem,
    requestedDate: dateStr || generateNextWeekday(2),
    requestedSlotId: slotId,
    ...overrides,
  };
}

// ==========================================
// 3. Concurrency & Async Helpers
// ==========================================

/**
 * Delay execution for specified milliseconds
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface ConcurrentResult<T> {
  index: number;
  result?: T;
  error?: unknown;
  durationMs: number;
  status: 'fulfilled' | 'rejected';
}

/**
 * Run multiple async tasks simultaneously with synchronization barrier
 */
export async function runConcurrent<T>(
  tasks: Array<() => Promise<T>>
): Promise<Array<ConcurrentResult<T>>> {
  const startBarrier = new Promise<void>((resolve) => {
    setImmediate(resolve);
  });

  const executedTasks = tasks.map(async (task, index) => {
    await startBarrier;
    const start = performance.now();
    try {
      const result = await task();
      const durationMs = performance.now() - start;
      return {
        index,
        result,
        durationMs,
        status: 'fulfilled' as const,
      };
    } catch (error) {
      const durationMs = performance.now() - start;
      return {
        index,
        error,
        durationMs,
        status: 'rejected' as const,
      };
    }
  });

  return Promise.all(executedTasks);
}

/**
 * Poll a function until a condition is met or timeout expires
 */
export async function pollUntil<T>(
  fn: () => Promise<T>,
  predicate: (value: T) => boolean,
  options?: { timeoutMs?: number; intervalMs?: number; description?: string }
): Promise<T> {
  const timeoutMs = options?.timeoutMs || 10000;
  const intervalMs = options?.intervalMs || 500;
  const description = options?.description || 'condition to be met';
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    try {
      const value = await fn();
      if (predicate(value)) {
        return value;
      }
    } catch {
      // Continue polling
    }
    await delay(intervalMs);
  }

  throw new Error(`pollUntil timed out after ${timeoutMs}ms waiting for: ${description}`);
}

/**
 * Retry an asynchronous operation with backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options?: { maxRetries?: number; initialDelayMs?: number; factor?: number }
): Promise<T> {
  const maxRetries = options?.maxRetries ?? 3;
  let delayMs = options?.initialDelayMs ?? 300;
  const factor = options?.factor ?? 2;

  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt < maxRetries) {
        await delay(delayMs);
        delayMs *= factor;
      }
    }
  }

  throw lastError;
}

// ==========================================
// 4. Assertions & Validators
// ==========================================

/**
 * Assert that a payload conforms to RFC 7807 ProblemDetails specification
 */
export function assertProblemDetails(
  data: unknown,
  expectedCode?: string,
  expectedStatus?: number
): asserts data is ProblemDetails {
  if (!data || typeof data !== 'object') {
    throw new Error(`Expected object conforming to ProblemDetails, got: ${typeof data}`);
  }

  const pd = data as Record<string, unknown>;

  if (typeof pd.type !== 'string' || !pd.type.trim()) {
    throw new Error(`ProblemDetails missing required 'type' URI string: ${JSON.stringify(data)}`);
  }

  if (typeof pd.title !== 'string' || !pd.title.trim()) {
    throw new Error(`ProblemDetails missing required 'title' string: ${JSON.stringify(data)}`);
  }

  if (typeof pd.status !== 'number') {
    throw new Error(`ProblemDetails missing required 'status' number: ${JSON.stringify(data)}`);
  }

  if (expectedStatus !== undefined && pd.status !== expectedStatus) {
    throw new Error(`ProblemDetails status mismatch: expected ${expectedStatus}, got ${pd.status}`);
  }

  if (expectedCode !== undefined && pd.code !== expectedCode) {
    throw new Error(`ProblemDetails code mismatch: expected ${expectedCode}, got ${pd.code}`);
  }
}

/**
 * Assert that booking creation response contains all mandatory confirmed fields
 */
export function assertValidBookingResponse(
  data: unknown
): asserts data is CreateBookingResponse {
  if (!data || typeof data !== 'object') {
    throw new Error(`Expected valid CreateBookingResponse object, got ${typeof data}`);
  }

  const b = data as Record<string, unknown>;

  if (!b.publicReference || typeof b.publicReference !== 'string') {
    throw new Error(`Booking missing 'publicReference': ${JSON.stringify(b)}`);
  }

  if (!b.bookingId || typeof b.bookingId !== 'string') {
    throw new Error(`Booking missing 'bookingId': ${JSON.stringify(b)}`);
  }

  if (!b.status || typeof b.status !== 'string') {
    throw new Error(`Booking missing 'status': ${JSON.stringify(b)}`);
  }

  if (!b.customerName || typeof b.customerName !== 'string') {
    throw new Error(`Booking missing 'customerName': ${JSON.stringify(b)}`);
  }

  if (!b.serviceName || typeof b.serviceName !== 'string') {
    throw new Error(`Booking missing 'serviceName': ${JSON.stringify(b)}`);
  }

  if (!b.locationAddress || typeof b.locationAddress !== 'string') {
    throw new Error(`Booking missing 'locationAddress': ${JSON.stringify(b)}`);
  }

  if (!b.scheduledDate || typeof b.scheduledDate !== 'string') {
    throw new Error(`Booking missing 'scheduledDate': ${JSON.stringify(b)}`);
  }
}

/**
 * Assert valid availability slot shape
 */
export function assertValidSlot(slot: unknown): asserts slot is AvailabilitySlot {
  if (!slot || typeof slot !== 'object') {
    throw new Error(`Expected valid AvailabilitySlot, got ${typeof slot}`);
  }

  const s = slot as Record<string, unknown>;
  if (!s.slotId || typeof s.slotId !== 'string') {
    throw new Error(`Slot missing 'slotId': ${JSON.stringify(s)}`);
  }

  if (!s.startTime || typeof s.startTime !== 'string') {
    throw new Error(`Slot missing 'startTime': ${JSON.stringify(s)}`);
  }

  if (!s.endTime || typeof s.endTime !== 'string') {
    throw new Error(`Slot missing 'endTime': ${JSON.stringify(s)}`);
  }

  if (typeof s.available !== 'boolean') {
    throw new Error(`Slot missing boolean 'available': ${JSON.stringify(s)}`);
  }
}

/**
 * Assert valid service catalog item
 */
export function assertValidService(service: unknown): asserts service is ServiceCatalogItem {
  if (!service || typeof service !== 'object') {
    throw new Error(`Expected valid ServiceCatalogItem, got ${typeof service}`);
  }

  const s = service as Record<string, unknown>;
  if (!s.id || typeof s.id !== 'string') {
    throw new Error(`Service missing 'id': ${JSON.stringify(s)}`);
  }
  if (!s.code || typeof s.code !== 'string') {
    throw new Error(`Service missing 'code': ${JSON.stringify(s)}`);
  }
  if (!s.name || typeof s.name !== 'string') {
    throw new Error(`Service missing 'name': ${JSON.stringify(s)}`);
  }
  if (typeof s.approxDurationMinutes !== 'number') {
    throw new Error(`Service missing 'approxDurationMinutes': ${JSON.stringify(s)}`);
  }
}

/**
 * Assert valid business profile shape
 */
export function assertValidBusinessProfile(profile: unknown): asserts profile is BusinessProfile {
  if (!profile || typeof profile !== 'object') {
    throw new Error(`Expected valid BusinessProfile, got ${typeof profile}`);
  }

  const p = profile as Record<string, unknown>;
  if (!p.name || typeof p.name !== 'string') {
    throw new Error(`Business profile missing 'name': ${JSON.stringify(p)}`);
  }
  if (!p.phone || typeof p.phone !== 'string') {
    throw new Error(`Business profile missing 'phone': ${JSON.stringify(p)}`);
  }
  if (!p.whatsapp || typeof p.whatsapp !== 'string') {
    throw new Error(`Business profile missing 'whatsapp': ${JSON.stringify(p)}`);
  }
}

/**
 * Assert valid testimonial item
 */
export function assertValidTestimonial(item: unknown): asserts item is Testimonial {
  if (!item || typeof item !== 'object') {
    throw new Error(`Expected valid Testimonial, got ${typeof item}`);
  }

  const t = item as Record<string, unknown>;
  if (!t.customerName || typeof t.customerName !== 'string') {
    throw new Error(`Testimonial missing 'customerName': ${JSON.stringify(t)}`);
  }
  if (typeof t.rating !== 'number' || t.rating < 1 || t.rating > 5) {
    throw new Error(`Testimonial rating must be number between 1 and 5: ${JSON.stringify(t)}`);
  }
  if (!t.comment || typeof t.comment !== 'string') {
    throw new Error(`Testimonial missing 'comment': ${JSON.stringify(t)}`);
  }
}
