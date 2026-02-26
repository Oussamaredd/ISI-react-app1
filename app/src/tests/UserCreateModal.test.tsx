import { fireEvent, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { UserCreateModal } from '../components/admin/UserCreateModal';
import { renderWithProviders } from './test-utils';

const mockMutateAsync = vi.fn();

vi.mock('../hooks/adminHooks', () => ({
  useCreateUser: () => ({
    mutateAsync: mockMutateAsync,
    isPending: false,
  }),
}));

describe('UserCreateModal', () => {
  it('shows validation error when submitting empty form', async () => {
    renderWithProviders(
      <UserCreateModal
        onClose={vi.fn()}
        roles={[{ id: 'role-citizen', name: 'citizen', description: 'Citizen role' }]}
      />,
      { route: '/app/admin', withAuthProvider: false },
    );

    fireEvent.click(screen.getByRole('button', { name: /Create User/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/Email is required/i);
    expect(mockMutateAsync).not.toHaveBeenCalled();
  });

  it('submits normalized payload for valid form input', async () => {
    const handleClose = vi.fn();
    mockMutateAsync.mockResolvedValueOnce({ id: 'user-1' });

    renderWithProviders(
      <UserCreateModal
        onClose={handleClose}
        roles={[{ id: 'role-agent', name: 'agent', description: 'Agent role' }]}
      />,
      { route: '/app/admin', withAuthProvider: false },
    );

    fireEvent.change(screen.getByPlaceholderText(/name@company.com/i), {
      target: { value: 'NEW.USER@EXAMPLE.COM' },
    });
    fireEvent.change(screen.getByPlaceholderText(/Full name/i), {
      target: { value: 'New User' },
    });
    fireEvent.change(screen.getByPlaceholderText(/At least 8 characters/i), {
      target: { value: 'strongpass123' },
    });
    fireEvent.click(screen.getByRole('checkbox', { name: /agent/i }));
    fireEvent.click(screen.getByRole('button', { name: /^Create User$/i }));

    expect(mockMutateAsync).toHaveBeenCalledWith({
      email: 'new.user@example.com',
      displayName: 'New User',
      password: 'strongpass123',
      roleIds: ['role-agent'],
      isActive: true,
    });
    await waitFor(() => {
      expect(handleClose).toHaveBeenCalled();
    });
  });
});
