import axios, { AxiosError } from 'axios';
import { ProblemDetails } from './types';
import { auth } from '@/lib/firebase';

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api/v1',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json, application/problem+json',
  },
});

apiClient.interceptors.request.use(async (config) => {
  if (auth?.currentUser) {
    try {
      const token = await auth.currentUser.getIdToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch {
      // If token retrieval fails, proceed without Authorization header
    }
  }
  return config;
});

export function parseProblemDetails(error: unknown): ProblemDetails {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<Record<string, unknown>>;
    if (axiosError.response?.data && typeof axiosError.response.data === 'object') {
      const data = axiosError.response.data;
      return {
        type: (data.type as string) || undefined,
        title: (data.title as string) || axiosError.response.statusText || 'Request Failed',
        status: (data.status as number) || axiosError.response.status,
        code: (data.code as string) || (data.errorCode as string) || `HTTP_${axiosError.response.status}`,
        detail: (data.detail as string) || (data.message as string) || 'An error occurred while processing your request.',
        instance: (data.instance as string) || undefined,
        correlationId: (data.correlationId as string) || (data.requestId as string) || undefined,
        timestamp: (data.timestamp as string) || undefined,
        invalidParams: Array.isArray(data.invalidParams) ? data.invalidParams : undefined,
        alternatives: Array.isArray(data.alternatives) ? data.alternatives : undefined,
      };
    }
    return {
      title: 'Network Error',
      status: axiosError.status || 500,
      code: axiosError.code || 'NETWORK_ERROR',
      detail: axiosError.message || 'Unable to communicate with the server. Please check your internet connection.',
    };
  }

  if (error && typeof error === 'object' && 'detail' in error) {
    return error as ProblemDetails;
  }

  return {
    title: 'Unexpected Error',
    status: 500,
    code: 'UNEXPECTED_ERROR',
    detail: 'An unexpected error occurred. Please try again.',
  };
}

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const problem = parseProblemDetails(error);
    return Promise.reject(problem);
  }
);
