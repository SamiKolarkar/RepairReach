import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import * as AuthContextModule from '@/context/AuthProvider';

vi.mock('@/context/AuthProvider', () => ({
  useAuth: vi.fn(),
}));

describe('ProtectedRoute component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading spinner when auth state is loading', () => {
    vi.mocked(AuthContextModule.useAuth).mockReturnValue({
      user: null,
      loading: true,
      token: null,
      isPhoneVerified: false,
      signOut: vi.fn(),
      getIdToken: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={['/book']}>
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>
      </MemoryRouter>
    );

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getAllByText('Checking authentication...')[0]).toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('redirects unauthenticated user (user is null) to /login', () => {
    vi.mocked(AuthContextModule.useAuth).mockReturnValue({
      user: null,
      loading: false,
      token: null,
      isPhoneVerified: false,
      signOut: vi.fn(),
      getIdToken: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={['/book']}>
        <Routes>
          <Route
            path="/book"
            element={
              <ProtectedRoute>
                <div>Protected Content</div>
              </ProtectedRoute>
            }
          />
          <Route path="/login" element={<div>Login Page</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Login Page')).toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('renders children when user is authenticated', () => {
    vi.mocked(AuthContextModule.useAuth).mockReturnValue({
      user: { uid: 'user_123', phoneNumber: '+919876543210' } as any,
      loading: false,
      token: 'valid-token',
      isPhoneVerified: true,
      signOut: vi.fn(),
      getIdToken: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={['/book']}>
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>
      </MemoryRouter>
    );

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
    expect(screen.queryByText('Login Page')).not.toBeInTheDocument();
  });
});
