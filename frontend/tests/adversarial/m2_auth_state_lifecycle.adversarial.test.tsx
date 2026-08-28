import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React, { useState } from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import type { User, UserInfo } from 'firebase/auth';
import { AuthProvider, useAuth } from '@/context/AuthProvider';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { apiClient, parseProblemDetails } from '@/api/client';
import { auth } from '@/lib/firebase';
import type { InternalAxiosRequestConfig, AxiosError } from 'axios';

// Mock Firebase module and auth singleton
let mockAuthCallback: ((user: User | null) => void) | null = null;
const mockSignOut = vi.fn();
const mockUnsubscribe = vi.fn();

vi.mock('@/lib/firebase', () => ({
  auth: {
    currentUser: null,
  },
  app: {},
}));

vi.mock('firebase/auth', () => ({
  onIdTokenChanged: vi.fn((_auth, callback) => {
    mockAuthCallback = callback;
    return mockUnsubscribe;
  }),
  signOut: vi.fn(() => mockSignOut()),
}));

describe('Milestone 2 Challenger: Token Lifecycle & Axios Interceptors', () => {
  const mockGetIdToken = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (auth as { currentUser: any }).currentUser = null;
  });

  const getRequestInterceptor = () => {
    const handlers = (apiClient.interceptors.request as any).handlers;
    return handlers[handlers.length - 1]?.fulfilled;
  };

  const getResponseErrorInterceptor = () => {
    const handlers = (apiClient.interceptors.response as any).handlers;
    return handlers[handlers.length - 1]?.rejected;
  };

  describe('Request Interceptor - Bearer Token Lifecycle', () => {
    it('attaches valid Bearer token when auth.currentUser is authenticated', async () => {
      mockGetIdToken.mockResolvedValue('eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.valid-token');
      (auth as { currentUser: any }).currentUser = {
        uid: 'firebase-user-123',
        getIdToken: mockGetIdToken,
      };

      const interceptor = getRequestInterceptor();
      const config: InternalAxiosRequestConfig = {
        headers: { 'X-Custom-Trace': 'trace-123' } as any,
        url: '/customer/bookings',
        method: 'post',
      };

      const modifiedConfig = await interceptor(config);

      expect(mockGetIdToken).toHaveBeenCalledTimes(1);
      expect(mockGetIdToken).toHaveBeenCalledWith(); // default no args or false
      expect(modifiedConfig.headers.Authorization).toBe('Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.valid-token');
      expect(modifiedConfig.headers['X-Custom-Trace']).toBe('trace-123'); // preserves existing headers
    });

    it('does not attach Authorization header when auth.currentUser is null (unauthenticated)', async () => {
      (auth as { currentUser: any }).currentUser = null;

      const interceptor = getRequestInterceptor();
      const config: InternalAxiosRequestConfig = {
        headers: {} as any,
        url: '/public/services',
        method: 'get',
      };

      const modifiedConfig = await interceptor(config);

      expect(modifiedConfig.headers.Authorization).toBeUndefined();
    });

    it('does not attach invalid Bearer headers when getIdToken returns empty string, null, or undefined', async () => {
      const emptyTokenValues = ['', null, undefined, false, 0];

      for (const emptyVal of emptyTokenValues) {
        mockGetIdToken.mockResolvedValueOnce(emptyVal);
        (auth as { currentUser: any }).currentUser = {
          uid: 'user-empty-token',
          getIdToken: mockGetIdToken,
        };

        const interceptor = getRequestInterceptor();
        const config: InternalAxiosRequestConfig = {
          headers: {} as any,
          url: '/customer/profile',
          method: 'get',
        };

        const modifiedConfig = await interceptor(config);

        expect(modifiedConfig.headers.Authorization).toBeUndefined();
        expect(modifiedConfig.headers.Authorization).not.toBe('Bearer ');
        expect(modifiedConfig.headers.Authorization).not.toBe('Bearer null');
        expect(modifiedConfig.headers.Authorization).not.toBe('Bearer undefined');
      }
    });

    it('handles getIdToken rejection gracefully without throwing unhandled promise rejection', async () => {
      mockGetIdToken.mockRejectedValue(new Error('Firebase Network Error: failed to refresh token'));
      (auth as { currentUser: any }).currentUser = {
        uid: 'user-failing-token',
        getIdToken: mockGetIdToken,
      };

      const interceptor = getRequestInterceptor();
      const config: InternalAxiosRequestConfig = {
        headers: {} as any,
        url: '/customer/bookings',
        method: 'get',
      };

      // Must not throw or reject
      let modifiedConfig: InternalAxiosRequestConfig | null = null;
      await expect((async () => {
        modifiedConfig = await interceptor(config);
      })()).resolves.not.toThrow();

      expect(modifiedConfig).toBeDefined();
      expect(modifiedConfig!.headers.Authorization).toBeUndefined();
    });

    it('handles concurrent/parallel requests without race conditions or header cross-contamination', async () => {
      let callCount = 0;
      mockGetIdToken.mockImplementation(async () => {
        callCount++;
        const currentCount = callCount;
        // Simulate varying network latency
        await new Promise((resolve) => setTimeout(resolve, currentCount % 2 === 0 ? 20 : 5));
        return `token-for-call-${currentCount}`;
      });

      (auth as { currentUser: any }).currentUser = {
        uid: 'concurrent-user',
        getIdToken: mockGetIdToken,
      };

      const interceptor = getRequestInterceptor();
      const requestConfigs: InternalAxiosRequestConfig[] = Array.from({ length: 10 }, (_, i) => ({
        headers: { 'X-Request-Index': `req-${i}` } as any,
        url: `/customer/slot-${i}`,
        method: 'get',
      }));

      const results = await Promise.all(requestConfigs.map((cfg) => interceptor(cfg)));

      expect(results).toHaveLength(10);
      expect(mockGetIdToken).toHaveBeenCalledTimes(10);
      results.forEach((res, i) => {
        expect(res.headers['X-Request-Index']).toBe(`req-${i}`);
        expect(typeof res.headers.Authorization).toBe('string');
        expect(res.headers.Authorization).toMatch(/^Bearer token-for-call-\d+$/);
      });
    });
  });

  describe('Response Interceptor - Error Transformation & RFC 7807', () => {
    it('transforms 401 Unauthorized Axios error into ProblemDetails RFC 7807 structure', async () => {
      const errorInterceptor = getResponseErrorInterceptor();
      const mock401Error = {
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
            title: 'Authentication Required',
            status: 401,
            code: 'FIREBASE_TOKEN_EXPIRED',
            detail: 'Your session has expired. Please refresh your token or sign in again.',
            instance: '/api/v1/customer/bookings',
            correlationId: 'corr-auth-401',
          },
        },
      } as unknown as AxiosError;

      await expect(errorInterceptor(mock401Error)).rejects.toEqual({
        type: 'https://repairreach.com/errors/unauthorized',
        title: 'Authentication Required',
        status: 401,
        code: 'FIREBASE_TOKEN_EXPIRED',
        detail: 'Your session has expired. Please refresh your token or sign in again.',
        instance: '/api/v1/customer/bookings',
        correlationId: 'corr-auth-401',
        timestamp: undefined,
        invalidParams: undefined,
        alternatives: undefined,
      });
    });

    it('transforms 403 Forbidden Axios error into ProblemDetails', async () => {
      const errorInterceptor = getResponseErrorInterceptor();
      const mock403Error = {
        isAxiosError: true,
        name: 'AxiosError',
        message: 'Request failed with status code 403',
        response: {
          status: 403,
          statusText: 'Forbidden',
          headers: {},
          config: {} as any,
          data: {
            title: 'Access Denied',
            status: 403,
            detail: 'You do not have permission to access this resource.',
          },
        },
      } as unknown as AxiosError;

      await expect(errorInterceptor(mock403Error)).rejects.toEqual({
        type: undefined,
        title: 'Access Denied',
        status: 403,
        code: 'HTTP_403',
        detail: 'You do not have permission to access this resource.',
        instance: undefined,
        correlationId: undefined,
        timestamp: undefined,
        invalidParams: undefined,
        alternatives: undefined,
      });
    });

    it('handles network disconnection (Axios error without response)', async () => {
      const errorInterceptor = getResponseErrorInterceptor();
      const networkError = {
        isAxiosError: true,
        name: 'AxiosError',
        message: 'Network Error',
        code: 'ERR_NETWORK',
        response: undefined,
      } as unknown as AxiosError;

      await expect(errorInterceptor(networkError)).rejects.toEqual({
        title: 'Network Error',
        status: 500,
        code: 'ERR_NETWORK',
        detail: 'Network Error',
      });
    });
  });
});

describe('Milestone 2 Challenger: Phone Verification State (isPhoneVerified)', () => {
  const TestPhoneConsumer: React.FC<{ onState: (state: any) => void }> = ({ onState }) => {
    const authState = useAuth();
    onState(authState);
    return <div data-testid="is-verified">{authState.isPhoneVerified ? 'VERIFIED' : 'UNVERIFIED'}</div>;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthCallback = null;
  });

  const edgeCases = [
    {
      description: 'user is null (unauthenticated)',
      user: null,
      expectedVerified: false,
    },
    {
      description: 'user with phoneNumber: null, providerData: []',
      user: { uid: 'u1', phoneNumber: null, providerData: [] },
      expectedVerified: false,
    },
    {
      description: 'user with phoneNumber: "", providerData: []',
      user: { uid: 'u2', phoneNumber: '', providerData: [] },
      expectedVerified: false,
    },
    {
      description: 'user with whitespace-only phoneNumber: "   ", providerData: []',
      user: { uid: 'u3', phoneNumber: '   ', providerData: [] },
      expectedVerified: false,
    },
    {
      description: 'user with valid Indian phone: "+919876543210", providerData: []',
      user: { uid: 'u4', phoneNumber: '+919876543210', providerData: [] },
      expectedVerified: true,
    },
    {
      description: 'user with valid Indian phone: "+919876543210", providerData: [{ providerId: "google.com" }]',
      user: { uid: 'u5', phoneNumber: '+919876543210', providerData: [{ providerId: 'google.com' }] },
      expectedVerified: true,
    },
    {
      description: 'user with phoneNumber: null, providerData with phone provider: [{ providerId: "phone" }]',
      user: { uid: 'u6', phoneNumber: null, providerData: [{ providerId: 'phone' }] },
      expectedVerified: true,
    },
    {
      description: 'user with phoneNumber: "", providerData with phone provider: [{ providerId: "phone" }]',
      user: { uid: 'u7', phoneNumber: '', providerData: [{ providerId: 'phone' }] },
      expectedVerified: true,
    },
    {
      description: 'Google OAuth user with phoneNumber: null, providerData: [{ providerId: "google.com" }]',
      user: { uid: 'u8', phoneNumber: null, providerData: [{ providerId: 'google.com' }] },
      expectedVerified: false,
    },
    {
      description: 'Google OAuth user with phoneNumber: null, multiple non-phone providers: ["google.com", "password"]',
      user: { uid: 'u9', phoneNumber: null, providerData: [{ providerId: 'google.com' }, { providerId: 'password' }] },
      expectedVerified: false,
    },
    {
      description: 'Multi-provider user with Google + Phone: ["google.com", "phone"] and phoneNumber: null',
      user: { uid: 'u10', phoneNumber: null, providerData: [{ providerId: 'google.com' }, { providerId: 'phone' }] },
      expectedVerified: true,
    },
    {
      description: 'user object with undefined providerData and undefined phoneNumber',
      user: { uid: 'u11', phoneNumber: undefined, providerData: undefined },
      expectedVerified: false,
    },
  ];

  it.each(edgeCases)('evaluates isPhoneVerified correctly for $description', async ({ user, expectedVerified }) => {
    let capturedState: any = null;

    render(
      <AuthProvider>
        <TestPhoneConsumer onState={(st) => { capturedState = st; }} />
      </AuthProvider>
    );

    const mockUserInstance = user
      ? ({
          ...user,
          getIdToken: vi.fn().mockResolvedValue('sample-token'),
        } as unknown as User)
      : null;

    await act(async () => {
      if (mockAuthCallback) {
        await mockAuthCallback(mockUserInstance);
      }
    });

    expect(screen.getByTestId('is-verified').textContent).toBe(expectedVerified ? 'VERIFIED' : 'UNVERIFIED');
    expect(capturedState.isPhoneVerified).toBe(expectedVerified);
  });
});

describe('Milestone 2 Challenger: ProtectedRoute & Navigation Redirection', () => {
  const LocationTracker: React.FC = () => {
    const location = useLocation();
    return (
      <div>
        <div data-testid="current-path">{location.pathname}</div>
        <div data-testid="current-search">{location.search}</div>
        <div data-testid="redirect-from-path">{location.state?.from?.pathname || 'none'}</div>
        <div data-testid="redirect-from-search">{location.state?.from?.search || 'none'}</div>
        <div data-testid="redirect-from-state-custom">{location.state?.from?.state?.customKey || 'none'}</div>
      </div>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading spinner and conceals protected content during loading state', () => {
    (auth as { currentUser: any }).currentUser = null;

    render(
      <MemoryRouter initialEntries={['/book']}>
        <AuthProvider>
          <ProtectedRoute>
            <div data-testid="secret-booking-form">Booking Form Content</div>
          </ProtectedRoute>
        </AuthProvider>
      </MemoryRouter>
    );

    // Initial state before onIdTokenChanged fires is loading = true
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getAllByText('Checking authentication...')[0]).toBeInTheDocument();
    expect(screen.queryByTestId('secret-booking-form')).not.toBeInTheDocument();
  });

  it('redirects unauthenticated user to /login and preserves complete location state & query params', async () => {
    render(
      <MemoryRouter initialEntries={[{ pathname: '/book', search: '?serviceId=washing-machine-repair&source=promo', state: { customKey: 'promo_2026' } }]}>
        <AuthProvider>
          <Routes>
            <Route
              path="/book"
              element={
                <ProtectedRoute>
                  <div data-testid="secret-booking-form">Booking Form Content</div>
                </ProtectedRoute>
              }
            />
            <Route
              path="/login"
              element={
                <div>
                  <div data-testid="login-page">Login Page</div>
                  <LocationTracker />
                </div>
              }
            />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    // Resolve auth with null (unauthenticated)
    await act(async () => {
      if (mockAuthCallback) {
        await mockAuthCallback(null);
      }
    });

    await waitFor(() => {
      expect(screen.getByTestId('login-page')).toBeInTheDocument();
    });

    expect(screen.queryByTestId('secret-booking-form')).not.toBeInTheDocument();
    expect(screen.getByTestId('current-path').textContent).toBe('/login');
    expect(screen.getByTestId('redirect-from-path').textContent).toBe('/book');
    expect(screen.getByTestId('redirect-from-search').textContent).toBe('?serviceId=washing-machine-repair&source=promo');
    expect(screen.getByTestId('redirect-from-state-custom').textContent).toBe('promo_2026');
  });

  it('transitions cleanly from loading spinner to authenticated protected content', async () => {
    const mockUser = {
      uid: 'authed-user-789',
      phoneNumber: '+919876543210',
      providerData: [{ providerId: 'phone' }],
      getIdToken: vi.fn().mockResolvedValue('jwt-token-xyz'),
    } as unknown as User;

    render(
      <MemoryRouter initialEntries={['/book']}>
        <AuthProvider>
          <ProtectedRoute>
            <div data-testid="secret-booking-form">Booking Form Content</div>
          </ProtectedRoute>
        </AuthProvider>
      </MemoryRouter>
    );

    // Initially shows spinner
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.queryByTestId('secret-booking-form')).not.toBeInTheDocument();

    // Resolve auth with valid user
    await act(async () => {
      if (mockAuthCallback) {
        await mockAuthCallback(mockUser);
      }
    });

    await waitFor(() => {
      expect(screen.getByTestId('secret-booking-form')).toBeInTheDocument();
    });
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});

describe('Milestone 2 Challenger: AuthProvider Token Lifecycle & Force Refresh', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthCallback = null;
  });

  const TestTokenHarness: React.FC = () => {
    const { user, token, getIdToken, signOut } = useAuth();
    const [lastRefreshedToken, setLastRefreshedToken] = useState<string | null>(null);

    return (
      <div>
        <div data-testid="token-value">{token || 'no-token'}</div>
        <div data-testid="user-id">{user?.uid || 'no-user'}</div>
        <div data-testid="refreshed-value">{lastRefreshedToken || 'none'}</div>
        <button
          data-testid="force-refresh-btn"
          onClick={async () => {
            const res = await getIdToken(true);
            setLastRefreshedToken(res);
          }}
        >
          Force Refresh
        </button>
        <button
          data-testid="standard-refresh-btn"
          onClick={async () => {
            const res = await getIdToken(false);
            setLastRefreshedToken(res);
          }}
        >
          Standard Refresh
        </button>
        <button
          data-testid="signout-btn"
          onClick={async () => {
            await signOut();
          }}
        >
          Sign Out
        </button>
      </div>
    );
  };

  it('passes forceRefresh boolean flag to auth.currentUser.getIdToken(forceRefresh)', async () => {
    const mockGetIdToken = vi.fn();
    mockGetIdToken.mockResolvedValueOnce('initial-token-1');

    const mockUser = {
      uid: 'user-refresh-test',
      phoneNumber: '+919876543210',
      getIdToken: mockGetIdToken,
    } as unknown as User;

    (auth as { currentUser: any }).currentUser = mockUser;

    render(
      <AuthProvider>
        <TestTokenHarness />
      </AuthProvider>
    );

    // Initial auth resolution
    await act(async () => {
      if (mockAuthCallback) {
        await mockAuthCallback(mockUser);
      }
    });

    expect(screen.getByTestId('token-value').textContent).toBe('initial-token-1');

    // Click Force Refresh (forceRefresh = true)
    mockGetIdToken.mockResolvedValueOnce('force-refreshed-token-2');
    await act(async () => {
      screen.getByTestId('force-refresh-btn').click();
    });

    expect(mockGetIdToken).toHaveBeenCalledWith(true);
    expect(screen.getByTestId('refreshed-value').textContent).toBe('force-refreshed-token-2');
    expect(screen.getByTestId('token-value').textContent).toBe('force-refreshed-token-2');

    // Click Standard Refresh (forceRefresh = false)
    mockGetIdToken.mockResolvedValueOnce('cached-token-3');
    await act(async () => {
      screen.getByTestId('standard-refresh-btn').click();
    });

    expect(mockGetIdToken).toHaveBeenCalledWith(false);
    expect(screen.getByTestId('refreshed-value').textContent).toBe('cached-token-3');
    expect(screen.getByTestId('token-value').textContent).toBe('cached-token-3');
  });

  it('returns null and does not throw if getIdToken fails during refresh', async () => {
    const mockGetIdToken = vi.fn();
    mockGetIdToken.mockResolvedValueOnce('initial-token');

    const mockUser = {
      uid: 'user-fail-refresh',
      getIdToken: mockGetIdToken,
    } as unknown as User;

    (auth as { currentUser: any }).currentUser = mockUser;

    render(
      <AuthProvider>
        <TestTokenHarness />
      </AuthProvider>
    );

    await act(async () => {
      if (mockAuthCallback) {
        await mockAuthCallback(mockUser);
      }
    });

    // Mock rejection during force refresh
    mockGetIdToken.mockRejectedValueOnce(new Error('Firebase auth network timeout'));

    await act(async () => {
      screen.getByTestId('force-refresh-btn').click();
    });

    // Should gracefully return null
    expect(screen.getByTestId('refreshed-value').textContent).toBe('none');
  });

  it('clears user and token state on signOut', async () => {
    const mockUser = {
      uid: 'user-signout-test',
      getIdToken: vi.fn().mockResolvedValue('token-to-be-cleared'),
    } as unknown as User;

    (auth as { currentUser: any }).currentUser = mockUser;

    render(
      <AuthProvider>
        <TestTokenHarness />
      </AuthProvider>
    );

    await act(async () => {
      if (mockAuthCallback) {
        await mockAuthCallback(mockUser);
      }
    });

    expect(screen.getByTestId('user-id').textContent).toBe('user-signout-test');
    expect(screen.getByTestId('token-value').textContent).toBe('token-to-be-cleared');

    await act(async () => {
      screen.getByTestId('signout-btn').click();
    });

    expect(mockSignOut).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('user-id').textContent).toBe('no-user');
    expect(screen.getByTestId('token-value').textContent).toBe('no-token');
  });
});
