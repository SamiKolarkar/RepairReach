import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { apiClient, parseProblemDetails } from '@/api/client';
import { auth } from '@/lib/firebase';

vi.mock('@/lib/firebase', () => ({
  auth: {
    currentUser: null,
  },
}));

describe('apiClient request interceptor', () => {
  const mockGetIdToken = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (auth as { currentUser: any }).currentUser = null;
  });

  const getRequestInterceptor = () => {
    const handlers = (apiClient.interceptors.request as any).handlers;
    return handlers[handlers.length - 1]?.fulfilled;
  };

  it('attaches Bearer token when auth.currentUser is logged in', async () => {
    mockGetIdToken.mockResolvedValue('mock-firebase-id-token-xyz');
    (auth as { currentUser: any }).currentUser = {
      uid: 'test-user-uid',
      getIdToken: mockGetIdToken,
    };

    const interceptor = getRequestInterceptor();
    const config = { headers: {} } as InternalAxiosRequestConfig;

    const result = await interceptor(config);

    expect(mockGetIdToken).toHaveBeenCalledTimes(1);
    expect(result.headers.Authorization).toBe('Bearer mock-firebase-id-token-xyz');
  });

  it('transparently refreshes token on subsequent requests via getIdToken()', async () => {
    mockGetIdToken.mockResolvedValueOnce('refreshed-token-123');
    (auth as { currentUser: any }).currentUser = {
      uid: 'test-user-uid',
      getIdToken: mockGetIdToken,
    };

    const interceptor = getRequestInterceptor();
    const config = { headers: {} } as InternalAxiosRequestConfig;

    const result = await interceptor(config);

    expect(mockGetIdToken).toHaveBeenCalledTimes(1);
    expect(result.headers.Authorization).toBe('Bearer refreshed-token-123');
  });

  it('does not attach Authorization header when auth.currentUser is null', async () => {
    (auth as { currentUser: any }).currentUser = null;

    const interceptor = getRequestInterceptor();
    const config = { headers: {} } as InternalAxiosRequestConfig;

    const result = await interceptor(config);

    expect(result.headers.Authorization).toBeUndefined();
  });

  it('proceeds gracefully without Authorization header if getIdToken throws', async () => {
    mockGetIdToken.mockRejectedValue(new Error('Token refresh failed'));
    (auth as { currentUser: any }).currentUser = {
      uid: 'test-user-uid',
      getIdToken: mockGetIdToken,
    };

    const interceptor = getRequestInterceptor();
    const config = { headers: {} } as InternalAxiosRequestConfig;

    const result = await interceptor(config);

    expect(result.headers.Authorization).toBeUndefined();
  });
});

describe('apiClient response interceptor', () => {
  const getResponseErrorInterceptor = () => {
    const handlers = (apiClient.interceptors.response as any).handlers;
    return handlers[handlers.length - 1]?.rejected;
  };

  it('transforms AxiosError into ProblemDetails on rejection', async () => {
    const errorInterceptor = getResponseErrorInterceptor();
    const mockAxiosError = {
      isAxiosError: true,
      name: 'AxiosError',
      message: 'Request failed with status code 401',
      response: {
        status: 401,
        statusText: 'Unauthorized',
        headers: {},
        config: {} as any,
        data: {
          type: 'https://repairreach.com/errors/unauthorized',
          title: 'Unauthorized',
          status: 401,
          code: 'AUTH_REQUIRED',
          detail: 'Valid Firebase ID token is required.',
          correlationId: 'corr-401-abc',
        },
      },
    } as unknown as AxiosError;

    await expect(errorInterceptor(mockAxiosError)).rejects.toEqual({
      type: 'https://repairreach.com/errors/unauthorized',
      title: 'Unauthorized',
      status: 401,
      code: 'AUTH_REQUIRED',
      detail: 'Valid Firebase ID token is required.',
      instance: undefined,
      correlationId: 'corr-401-abc',
      timestamp: undefined,
      invalidParams: undefined,
      alternatives: undefined,
    });
  });
});

describe('api/client parseProblemDetails', () => {
  it('parses complete RFC 7807 problem details from AxiosError response', () => {
    const mockAxiosError = {
      isAxiosError: true,
      name: 'AxiosError',
      message: 'Request failed with status code 409',
      response: {
        status: 409,
        statusText: 'Conflict',
        headers: {},
        config: {} as any,
        data: {
          type: 'https://repairreach.com/errors/slot-conflict',
          title: 'Slot Already Booked',
          status: 409,
          code: 'SLOT_UNAVAILABLE',
          detail: 'The selected time slot is no longer available.',
          instance: '/api/v1/customer/bookings',
          correlationId: 'corr-409-xyz',
          timestamp: '2026-08-25T14:30:00Z',
          invalidParams: [{ name: 'slotId', reason: 'Already reserved' }],
          alternatives: [
            { slotId: 'slot_2', startTime: '2026-08-25T11:00:00+05:30', endTime: '2026-08-25T13:00:00+05:30', label: '11:00 AM - 1:00 PM' },
          ],
        },
      },
    } as unknown as AxiosError;

    const result = parseProblemDetails(mockAxiosError);

    expect(result).toEqual({
      type: 'https://repairreach.com/errors/slot-conflict',
      title: 'Slot Already Booked',
      status: 409,
      code: 'SLOT_UNAVAILABLE',
      detail: 'The selected time slot is no longer available.',
      instance: '/api/v1/customer/bookings',
      correlationId: 'corr-409-xyz',
      timestamp: '2026-08-25T14:30:00Z',
      invalidParams: [{ name: 'slotId', reason: 'Already reserved' }],
      alternatives: [
        { slotId: 'slot_2', startTime: '2026-08-25T11:00:00+05:30', endTime: '2026-08-25T13:00:00+05:30', label: '11:00 AM - 1:00 PM' },
      ],
    });
  });

  it('handles Axios network errors when response is undefined', () => {
    const networkError = {
      isAxiosError: true,
      name: 'AxiosError',
      message: 'Network Error',
      code: 'ERR_NETWORK',
      status: undefined,
      response: undefined,
    } as unknown as AxiosError;

    const result = parseProblemDetails(networkError);

    expect(result).toEqual({
      title: 'Network Error',
      status: 500,
      code: 'ERR_NETWORK',
      detail: 'Network Error',
    });
  });

  it('sanitizes generic Error instances without leaking error.message', () => {
    const sensitiveError = new Error('Database password failed at 192.168.1.1:5432');
    const result = parseProblemDetails(sensitiveError);

    expect(result).toEqual({
      title: 'Unexpected Error',
      status: 500,
      code: 'UNEXPECTED_ERROR',
      detail: 'An unexpected error occurred. Please try again.',
    });
    expect(result.detail).not.toContain('Database password');
    expect(result.detail).not.toContain('192.168.1.1');
  });

  it('handles null and undefined safely with fallback detail', () => {
    expect(parseProblemDetails(null)).toEqual({
      title: 'Unexpected Error',
      status: 500,
      code: 'UNEXPECTED_ERROR',
      detail: 'An unexpected error occurred. Please try again.',
    });

    expect(parseProblemDetails(undefined)).toEqual({
      title: 'Unexpected Error',
      status: 500,
      code: 'UNEXPECTED_ERROR',
      detail: 'An unexpected error occurred. Please try again.',
    });
  });

  it('passes through object that already has detail property', () => {
    const customProblem = {
      title: 'Validation Error',
      status: 400,
      code: 'INVALID_INPUT',
      detail: 'The provided email is invalid.',
    };

    expect(parseProblemDetails(customProblem)).toEqual(customProblem);
  });
});
