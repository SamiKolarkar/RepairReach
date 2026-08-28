import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from '@/context/AuthProvider';
import type { User } from 'firebase/auth';

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

const TestConsumer: React.FC = () => {
  const { user, loading, token, isPhoneVerified, signOut, getIdToken } = useAuth();
  return (
    <div>
      <div data-testid="loading">{loading ? 'loading' : 'ready'}</div>
      <div data-testid="user">{user ? user.uid : 'anonymous'}</div>
      <div data-testid="token">{token || 'no-token'}</div>
      <div data-testid="phone-verified">{isPhoneVerified ? 'verified' : 'unverified'}</div>
      <button onClick={() => signOut()} data-testid="signout-btn">Sign Out</button>
      <button onClick={() => getIdToken(true)} data-testid="refresh-btn">Refresh Token</button>
    </div>
  );
};

describe('AuthProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthCallback = null;
  });

  it('renders loading state initially and transitions to ready when auth state resolves', async () => {
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    expect(screen.getByTestId('loading').textContent).toBe('loading');

    act(() => {
      if (mockAuthCallback) {
        mockAuthCallback(null);
      }
    });

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('ready');
      expect(screen.getByTestId('user').textContent).toBe('anonymous');
      expect(screen.getByTestId('token').textContent).toBe('no-token');
      expect(screen.getByTestId('phone-verified').textContent).toBe('unverified');
    });
  });

  it('correctly sets user, token, and isPhoneVerified=true for phone authenticated user', async () => {
    const mockUser = {
      uid: 'phone-user-123',
      phoneNumber: '+919876543210',
      providerData: [{ providerId: 'phone' }],
      getIdToken: vi.fn().mockResolvedValue('sample-id-token-abc'),
    } as unknown as User;

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await act(async () => {
      if (mockAuthCallback) {
        await mockAuthCallback(mockUser);
      }
    });

    expect(screen.getByTestId('loading').textContent).toBe('ready');
    expect(screen.getByTestId('user').textContent).toBe('phone-user-123');
    expect(screen.getByTestId('token').textContent).toBe('sample-id-token-abc');
    expect(screen.getByTestId('phone-verified').textContent).toBe('verified');
  });

  it('correctly sets isPhoneVerified=false for Google OAuth user without phone', async () => {
    const mockGoogleUser = {
      uid: 'google-user-456',
      phoneNumber: null,
      providerData: [{ providerId: 'google.com' }],
      getIdToken: vi.fn().mockResolvedValue('google-token-xyz'),
    } as unknown as User;

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await act(async () => {
      if (mockAuthCallback) {
        await mockAuthCallback(mockGoogleUser);
      }
    });

    expect(screen.getByTestId('loading').textContent).toBe('ready');
    expect(screen.getByTestId('user').textContent).toBe('google-user-456');
    expect(screen.getByTestId('token').textContent).toBe('google-token-xyz');
    expect(screen.getByTestId('phone-verified').textContent).toBe('unverified');
  });

  it('calls signOut and unmount unsubscribes listener', async () => {
    const { unmount } = render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    act(() => {
      screen.getByTestId('signout-btn').click();
    });

    expect(mockSignOut).toHaveBeenCalledTimes(1);

    unmount();
    expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
  });
});
