import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';

import AgentTourPage from '../pages/AgentTourPage';
import CitizenReportPage from '../pages/CitizenReportPage';
import ManagerPlanningPage from '../pages/ManagerPlanningPage';
import { apiClient } from '../services/api';
import { renderWithProviders } from './test-utils';

vi.mock('../hooks/useCitizen', async () => {
  const actual = await vi.importActual<typeof import('../hooks/useCitizen')>('../hooks/useCitizen');
  return {
    ...actual,
    useCreateCitizenReport: vi.fn(),
  };
});

vi.mock('../hooks/useAgentTours', () => ({
  useAgentTour: vi.fn(),
  useAnomalyTypes: vi.fn(),
  useReportAnomaly: vi.fn(),
  useStartAgentTour: vi.fn(),
  useTourActivity: vi.fn(),
  useValidateTourStop: vi.fn(),
}));

vi.mock('../hooks/usePlanning', () => ({
  useCreatePlannedTour: vi.fn(),
  useOptimizeTourPlan: vi.fn(),
  usePlanningAgents: vi.fn(),
  usePlanningZones: vi.fn(),
}));

describe('E2E key journeys (citizen/agent/manager)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('covers citizen report keyboard submission journey', async () => {
    const { useCreateCitizenReport } = await import('../hooks/useCitizen');

    const mutateAsync = vi.fn().mockResolvedValue({
      confirmationMessage: 'Report submitted and queued for dispatch.',
    });
    (useCreateCitizenReport as Mock).mockReturnValue({ mutateAsync, isPending: false });
    vi.spyOn(apiClient, 'get').mockResolvedValue({
      containers: [{ id: 'container-1', code: 'CTR-001', label: 'Harbor Front' }],
    });

    const user = userEvent.setup();
    const { container } = renderWithProviders(<CitizenReportPage />);

    expect(await screen.findByRole('heading', { name: /Report Overflowing Container/i })).toBeInTheDocument();

    await user.tab();
    expect(screen.getByLabelText(/Container/i)).toHaveFocus();
    await user.tab();
    expect(screen.getByLabelText(/Description/i)).toHaveFocus();

    await user.selectOptions(screen.getByLabelText(/Container/i), 'container-1');
    await user.type(screen.getByLabelText(/Description/i), 'Container is full and spilling near sidewalk.');
    await user.type(screen.getByLabelText(/Latitude/i), '36.8123');
    await user.type(screen.getByLabelText(/Longitude/i), '10.1932');
    await user.type(screen.getByLabelText(/Photo URL/i), 'https://example.com/container.jpg');

    await user.click(screen.getByRole('button', { name: /Submit Report/i }));

    expect(mutateAsync).toHaveBeenCalledWith({
      containerId: 'container-1',
      description: 'Container is full and spilling near sidewalk.',
      latitude: '36.8123',
      longitude: '10.1932',
      photoUrl: 'https://example.com/container.jpg',
    });
    expect(await screen.findByRole('status')).toHaveTextContent(/queued for dispatch/i);
    expect(container.querySelector('[class*="sm:grid-cols-2"]')).toBeTruthy();
  }, 15000);

  it('covers agent start, validate, and anomaly reporting journey', async () => {
    const agentHooks = await import('../hooks/useAgentTours');

    const startTour = vi.fn().mockResolvedValue({ firstActiveStopId: 'stop-1' });
    const validateStop = vi.fn().mockResolvedValue({ nextStopId: 'stop-2' });
    const reportAnomaly = vi.fn().mockResolvedValue({ managerAlertTriggered: true });

    (agentHooks.useAgentTour as Mock).mockReturnValue({
      isLoading: false,
      data: {
        id: 'tour-1',
        name: 'North Zone Round',
        status: 'assigned',
        zoneName: 'North Zone',
        stops: [
          {
            id: 'stop-1',
            stopOrder: 1,
            status: 'active',
            containerId: 'container-1',
            containerCode: 'CTR-001',
            containerLabel: 'North Hub',
          },
        ],
        itinerary: [{ stopId: 'stop-1', order: 1, latitude: '36.81', longitude: '10.19' }],
      },
    });
    (agentHooks.useStartAgentTour as Mock).mockReturnValue({
      mutate: startTour,
      mutateAsync: startTour,
      isPending: false,
    });
    (agentHooks.useValidateTourStop as Mock).mockReturnValue({ mutateAsync: validateStop, isPending: false });
    (agentHooks.useAnomalyTypes as Mock).mockReturnValue({
      data: { anomalyTypes: [{ id: 'blocked', label: 'Blocked container access' }] },
    });
    (agentHooks.useReportAnomaly as Mock).mockReturnValue({ mutateAsync: reportAnomaly, isPending: false });
    (agentHooks.useTourActivity as Mock).mockReturnValue({ data: { activity: [] } });

    const user = userEvent.setup();
    renderWithProviders(<AgentTourPage />);

    expect(await screen.findByRole('heading', { name: /North Zone Round/i })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Start Tour/i }));
    expect(startTour).toHaveBeenCalledWith('tour-1');

    await user.type(screen.getByLabelText(/Volume \(liters\)/i), '120');
    await user.click(screen.getByRole('button', { name: /Validate Stop/i }));

    expect(validateStop).toHaveBeenCalledWith(
      expect.objectContaining({
        tourId: 'tour-1',
        stopId: 'stop-1',
        volumeLiters: 120,
      }),
    );
    expect(
      await screen.findByText(/collection validated\. the route advanced to the next stop\./i),
    ).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText(/Anomaly type/i), 'blocked');
    await user.type(screen.getByLabelText(/^Comments$/i), 'Road blocked by parked vehicle');
    await user.click(screen.getByRole('button', { name: /Report Anomaly/i }));

    expect(reportAnomaly).toHaveBeenCalledWith(
      expect.objectContaining({
        tourId: 'tour-1',
        anomalyTypeId: 'blocked',
      }),
    );
    expect(
      await screen.findByText(/anomaly reported and escalated to the manager queue\./i),
    ).toBeInTheDocument();
  }, 20000);

  it('covers manager optimization and assignment journey', async () => {
    const planningHooks = await import('../hooks/usePlanning');

    const optimizeRoute = vi.fn().mockResolvedValue({
      route: [
        {
          id: 'container-1',
          code: 'CTR-001',
          label: 'North Hub',
          fillLevelPercent: 88,
          order: 1,
        },
      ],
    });
    const createTour = vi.fn().mockResolvedValue({ id: 'tour-1' });
    const resetOptimization = vi.fn();

    (planningHooks.usePlanningZones as Mock).mockReturnValue({
      data: { zones: [{ id: 'zone-1', name: 'North Zone' }] },
      isLoading: false,
      isError: false,
    });
    (planningHooks.usePlanningAgents as Mock).mockReturnValue({
      data: { agents: [{ id: 'agent-1', displayName: 'Alex Agent', email: 'agent@example.com' }] },
      isLoading: false,
      isError: false,
    });
    (planningHooks.useOptimizeTourPlan as Mock).mockReturnValue({
      mutateAsync: optimizeRoute,
      isPending: false,
      data: { metrics: { totalDistanceKm: 8.4, estimatedDurationMinutes: 65 } },
      reset: resetOptimization,
    });
    (planningHooks.useCreatePlannedTour as Mock).mockReturnValue({ mutateAsync: createTour, isPending: false });

    const user = userEvent.setup();
    const { container } = renderWithProviders(<ManagerPlanningPage />);

    expect(await screen.findByRole('heading', { name: /Tour Planning Wizard/i })).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText(/^Zone$/i), 'zone-1');
    await user.selectOptions(screen.getByLabelText(/Assign agent/i), 'agent-1');
    await user.click(screen.getByRole('button', { name: /Run Optimization/i }));

    expect(optimizeRoute).toHaveBeenCalledWith(
      expect.objectContaining({
        zoneId: 'zone-1',
      }),
    );

    await waitFor(() => {
      expect(screen.getByText(/CTR-001 - North Hub/i)).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /Create Planned Tour/i }));

    expect(createTour).toHaveBeenCalledWith(
      expect.objectContaining({
        zoneId: 'zone-1',
        assignedAgentId: 'agent-1',
        orderedContainerIds: ['container-1'],
      }),
    );
    expect(await screen.findByRole('status')).toHaveTextContent(/created and assigned successfully/i);
    expect(screen.getByRole('button', { name: /Tour Created/i })).toBeDisabled();
    expect(container.querySelector('[class*="sm:grid-cols-2"]')).toBeTruthy();
  }, 15000);

  it('clears a stale route when planning inputs change after optimization', async () => {
    const planningHooks = await import('../hooks/usePlanning');

    const optimizeRoute = vi.fn().mockResolvedValue({
      route: [
        {
          id: 'container-1',
          code: 'CTR-001',
          label: 'North Hub',
          fillLevelPercent: 88,
          order: 1,
        },
      ],
    });
    const resetOptimization = vi.fn();

    (planningHooks.usePlanningZones as Mock).mockReturnValue({
      data: { zones: [{ id: 'zone-1', name: 'North Zone' }] },
      isLoading: false,
      isError: false,
    });
    (planningHooks.usePlanningAgents as Mock).mockReturnValue({
      data: { agents: [] },
      isLoading: false,
      isError: false,
    });
    (planningHooks.useOptimizeTourPlan as Mock).mockReturnValue({
      mutateAsync: optimizeRoute,
      isPending: false,
      data: { metrics: { totalDistanceKm: 8.4, estimatedDurationMinutes: 65 } },
      reset: resetOptimization,
    });
    (planningHooks.useCreatePlannedTour as Mock).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    });

    const user = userEvent.setup();
    renderWithProviders(<ManagerPlanningPage />);

    await user.selectOptions(screen.getByLabelText(/^Zone$/i), 'zone-1');
    await user.click(screen.getByRole('button', { name: /Run Optimization/i }));

    expect(await screen.findByText(/CTR-001 - North Hub/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Create Planned Tour/i })).toBeEnabled();

    await user.clear(screen.getByLabelText(/Fill threshold/i));
    await user.type(screen.getByLabelText(/Fill threshold/i), '85');

    await waitFor(() => {
      expect(screen.queryByText(/CTR-001 - North Hub/i)).not.toBeInTheDocument();
    });
    expect(resetOptimization).toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /Create Planned Tour/i })).toBeDisabled();
  }, 15000);

  it('explains when nearby tours reserve part of the route for the selected schedule', async () => {
    const planningHooks = await import('../hooks/usePlanning');

    (planningHooks.usePlanningZones as Mock).mockReturnValue({
      data: { zones: [{ id: 'zone-1', name: 'North Zone' }] },
      isLoading: false,
      isError: false,
    });
    (planningHooks.usePlanningAgents as Mock).mockReturnValue({
      data: { agents: [] },
      isLoading: false,
      isError: false,
    });
    (planningHooks.useOptimizeTourPlan as Mock).mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue({
        route: [
          {
            id: 'container-1',
            code: 'CTR-001',
            label: 'North Hub',
            fillLevelPercent: 88,
            order: 1,
          },
        ],
        metrics: {
          deferredForNearbyTours: 2,
        },
      }),
      isPending: false,
      data: { metrics: { totalDistanceKm: 8.4, estimatedDurationMinutes: 65 } },
      reset: vi.fn(),
    });
    (planningHooks.useCreatePlannedTour as Mock).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    });

    const user = userEvent.setup();
    renderWithProviders(<ManagerPlanningPage />);

    await user.selectOptions(screen.getByLabelText(/^Zone$/i), 'zone-1');
    await user.click(screen.getByRole('button', { name: /Run Optimization/i }));

    expect(await screen.findByRole('status')).toHaveTextContent(
      /2 matching containers were skipped because they are already planned on nearby tours/i,
    );
  }, 15000);

  it('shows a helpful error when optimization fails', async () => {
    const planningHooks = await import('../hooks/usePlanning');

    (planningHooks.usePlanningZones as Mock).mockReturnValue({
      data: { zones: [{ id: 'zone-1', name: 'North Zone' }] },
      isLoading: false,
      isError: false,
    });
    (planningHooks.usePlanningAgents as Mock).mockReturnValue({
      data: { agents: [] },
      isLoading: false,
      isError: false,
    });
    (planningHooks.useOptimizeTourPlan as Mock).mockReturnValue({
      mutateAsync: vi.fn().mockRejectedValue(new Error('Optimization service unavailable.')),
      isPending: false,
      data: undefined,
      reset: vi.fn(),
    });
    (planningHooks.useCreatePlannedTour as Mock).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    });

    const user = userEvent.setup();
    renderWithProviders(<ManagerPlanningPage />);

    await user.selectOptions(screen.getByLabelText(/^Zone$/i), 'zone-1');
    await user.click(screen.getByRole('button', { name: /Run Optimization/i }));

    expect(await screen.findByRole('status')).toHaveTextContent(
      /optimization service unavailable/i,
    );
    expect(screen.queryByRole('button', { name: /Create Planned Tour/i })).toBeDisabled();
  }, 15000);
});
