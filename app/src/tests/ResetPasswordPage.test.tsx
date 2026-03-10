import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import ResetPasswordPage from '../pages/auth/ResetPasswordPage';

const resetPasswordMock = vi.fn();

vi.mock('../services/authApi', () => ({
  authApi: {
    resetPassword: (token: string, password: string) => resetPasswordMock(token, password),
  },
}));

describe('ResetPasswordPage', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resetPasswordMock.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('submits the query token and redirects to login after a successful reset', async () => {
    resetPasswordMock.mockResolvedValueOnce({ success: true });

    const router = createMemoryRouter(
      [
        { path: '/reset-password', element: <ResetPasswordPage /> },
        { path: '/login', element: <div>Login</div> },
      ],
      {
        initialEntries: ['/reset-password?token=second-token'],
      },
    );

    render(<RouterProvider router={router} />);

    fireEvent.change(screen.getByLabelText(/^new password$/i), {
      target: { value: 'UpdatedPass123!' },
    });
    fireEvent.change(screen.getByLabelText(/^confirm new password$/i), {
      target: { value: 'UpdatedPass123!' },
    });
    fireEvent.click(screen.getByRole('button', { name: /update password/i }));

    await waitFor(() => {
      expect(resetPasswordMock).toHaveBeenCalledWith('second-token', 'UpdatedPass123!');
    });

    await act(async () => {
      vi.advanceTimersByTime(1200);
    });

    await waitFor(() => {
      expect(screen.getByText('Login')).toBeInTheDocument();
    });
  });
});
