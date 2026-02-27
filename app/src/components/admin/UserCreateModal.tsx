import { useMemo, useState, type FormEvent } from 'react';
import { Shield, UserPlus, X } from 'lucide-react';

import { useCreateUser } from '../../hooks/adminHooks';
import { Button } from '../Button';
import { Input } from '../Input';

type Role = {
  id: string;
  name: string;
  description?: string | null;
};

type UserCreateModalProps = {
  onClose: () => void;
  roles: Role[];
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function UserCreateModal({ onClose, roles }: UserCreateModalProps) {
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);
  const [isActive, setIsActive] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const { mutateAsync: createUser, isPending } = useCreateUser();

  const roleSummary = useMemo(() => {
    if (selectedRoleIds.length === 0) {
      return 'No roles selected';
    }

    const selected = roles
      .filter((role) => selectedRoleIds.includes(role.id))
      .map((role) => role.name);
    return selected.join(', ');
  }, [roles, selectedRoleIds]);

  const handleClose = () => {
    if (!isPending) {
      onClose();
    }
  };

  const toggleRole = (roleId: string) => {
    setSelectedRoleIds((previous) =>
      previous.includes(roleId)
        ? previous.filter((id) => id !== roleId)
        : [...previous, roleId],
    );
  };

  const validateForm = () => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      return 'Email is required.';
    }

    if (!EMAIL_REGEX.test(normalizedEmail)) {
      return 'Please enter a valid email address.';
    }

    if (password.trim().length < 8) {
      return 'Password must be at least 8 characters long.';
    }

    if (selectedRoleIds.length === 0) {
      return 'Select at least one role.';
    }

    return '';
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage('');

    const validationError = validateForm();
    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    try {
      await createUser({
        email: email.trim().toLowerCase(),
        displayName: displayName.trim() || undefined,
        password: password.trim(),
        roleIds: selectedRoleIds,
        isActive,
      });
      onClose();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to create user.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="ops-admin-modal-overlay" onClick={handleClose} />

        <div className="ops-admin-modal-panel inline-block w-full max-w-lg p-6 my-8 overflow-hidden text-left align-middle transition-all transform">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <UserPlus className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900">Add User</h3>
                <p className="text-sm text-gray-500">Create a local account and assign initial roles.</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              disabled={isPending}
              className="ops-admin-icon-btn"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                <Input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="name@company.com"
                  autoComplete="email"
                  disabled={isPending}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Display Name (optional)</label>
                <Input
                  type="text"
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  placeholder="Full name"
                  autoComplete="name"
                  disabled={isPending}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                <Input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="At least 8 characters"
                  autoComplete="new-password"
                  disabled={isPending}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Initial Roles</label>
                <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-2 space-y-2">
                  {roles.map((role) => (
                    <label
                      key={role.id}
                      className="flex items-start p-2 rounded-md hover:bg-gray-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedRoleIds.includes(role.id)}
                        onChange={() => toggleRole(role.id)}
                        disabled={isPending}
                        className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-800">
                        <span className="inline-flex items-center">
                          <Shield className="w-3 h-3 mr-1 text-gray-400" />
                          {role.name}
                        </span>
                        {role.description ? (
                          <span className="block text-xs text-gray-500">{role.description}</span>
                        ) : null}
                      </span>
                    </label>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-1">{roleSummary}</p>
              </div>

              <div className="flex items-center">
                <input
                  id="new-user-active"
                  type="checkbox"
                  checked={isActive}
                  onChange={(event) => setIsActive(event.target.checked)}
                  disabled={isPending}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                />
                <label htmlFor="new-user-active" className="ml-2 text-sm text-gray-700">
                  User is active
                </label>
              </div>

              {errorMessage ? (
                <p className="text-sm text-red-600" role="alert">
                  {errorMessage}
                </p>
              ) : null}
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <Button type="button" variant="secondary" onClick={handleClose} disabled={isPending}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={isPending} className="flex items-center space-x-2">
                {isPending ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : null}
                <span>{isPending ? 'Creating...' : 'Create User'}</span>
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
