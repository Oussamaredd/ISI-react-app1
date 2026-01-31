import { screen, waitForElementToBeRemoved } from '@testing-library/react';
import { vi, beforeEach, afterEach } from 'vitest';
import Dashboard from '../pages/Dashboard';
import { renderWithProviders } from './test-utils';

const authSuccess = {
  ok: true,
  status: 200,
  json: async () => ({ authenticated: true, user: { name: 'Test User' } }),
  text: async () => JSON.stringify({ authenticated: true, user: { name: 'Test User' } })
};

beforeEach(() => {
  vi.spyOn(global, 'fetch').mockResolvedValue(authSuccess as Response);
});

afterEach(() => {
  vi.restoreAllMocks();
});


describe('Dashboard Component', () => {
  test('renders dashboard header', async () => {
    renderWithProviders(<Dashboard />);

    await waitForElementToBeRemoved(() => screen.getByText(/Loading/i));

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Welcome, Test User!')).toBeInTheDocument();
  });

  test('renders navigation links', async () => {
    renderWithProviders(<Dashboard />);

    await waitForElementToBeRemoved(() => screen.getByText(/Loading/i));

    expect(screen.getByText(/View Tickets/i)).toBeInTheDocument();
    expect(screen.getByText(/Create Ticket/i)).toBeInTheDocument();
  });
});
