import { fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import LoginPage from '../pages/auth/LoginPage';
import { renderWithRouter } from './test-utils';

const mockLogin = vi.fn();

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({
    login: mockLogin,
  }),
}));

vi.mock('../services/authApi', () => ({
  authApi: {
    login: vi.fn(),
  },
}));

const authApiModule = await import('../services/authApi');
const mockAuthApiLogin = vi.mocked(authApiModule.authApi.login);

describe('LoginPage', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockLogin.mockReset();
    mockAuthApiLogin.mockReset();
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('API unavailable')));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  test('keeps credential inputs enabled while the health check is degraded', async () => {
    renderWithRouter(<LoginPage />, { route: '/login', path: '/login' });

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);

    expect(emailInput).toBeEnabled();
    expect(passwordInput).toBeEnabled();

    await waitFor(() => {
      expect(
        screen.getByText(/having trouble reaching the api/i),
      ).toBeInTheDocument();
    });

    expect(emailInput).toBeEnabled();
    expect(passwordInput).toBeEnabled();
  });

  test('shows an inline error instead of navigating away when google sign-in cannot reach the API', async () => {
    renderWithRouter(<LoginPage />, { route: '/login', path: '/login' });

    fireEvent.click(screen.getByRole('button', { name: /continue with google/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/still reconnecting to the sign-in service/i),
      ).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: /continue with google/i })).toBeEnabled();
  });

  test('does not call email sign-in while the API is still degraded', async () => {
    renderWithRouter(<LoginPage />, { route: '/login', path: '/login' });

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'a@admin.fr' },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'password123' },
    });

    await waitFor(() => {
      expect(
        screen.getByText(/having trouble reaching the api/i),
      ).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/still reconnecting to the sign-in service/i),
      ).toBeInTheDocument();
    });

    expect(mockAuthApiLogin).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeEnabled();
  });
});
