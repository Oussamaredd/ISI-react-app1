export type PlanningDraftStatusTone = "success" | "error" | "info";

export type RoutePoint = {
  id: string;
  code: string;
  label: string;
  fillLevelPercent: number;
  order: number;
};

export type PlanningDraftMetrics = {
  totalDistanceKm?: number;
  estimatedDurationMinutes?: number;
  selectedContainerCount?: number;
  maxContainerCount?: number;
  algorithmsApplied?: string[];
  optimizationTimedOut?: boolean;
};

export type PlanningDraftState = {
  name: string;
  zoneId: string;
  scheduledFor: string;
  fillThresholdPercent: number;
  assignedAgentId: string;
  orderedRoute: RoutePoint[];
  lastCreatedTourId: string | null;
  planCreated: boolean;
  statusMessage: string;
  statusTone: PlanningDraftStatusTone;
  optimizationMetrics: PlanningDraftMetrics | null;
};

export type PlanningDraftAction =
  | { type: "set-name"; value: string }
  | { type: "set-zone"; value: string }
  | { type: "set-scheduled-for"; value: string }
  | { type: "set-fill-threshold"; value: number }
  | { type: "set-assigned-agent"; value: string }
  | { type: "set-ordered-route"; value: RoutePoint[] }
  | { type: "move-route-item"; index: number; direction: -1 | 1 }
  | { type: "set-created-tour"; value: string | null }
  | { type: "set-plan-created"; value: boolean }
  | { type: "set-status"; message: string; tone: PlanningDraftStatusTone }
  | { type: "clear-status" }
  | { type: "reset-optimization" }
  | { type: "set-optimization-metrics"; value: PlanningDraftMetrics | null }
  | { type: "hydrate"; value: Partial<PlanningDraftState> }
  | { type: "reset"; value: PlanningDraftState };

export const createPlanningDraftState = (scheduledFor: string): PlanningDraftState => ({
  name: "Daily Optimized Tour",
  zoneId: "",
  scheduledFor,
  fillThresholdPercent: 70,
  assignedAgentId: "",
  orderedRoute: [],
  lastCreatedTourId: null,
  planCreated: false,
  statusMessage: "",
  statusTone: "success",
  optimizationMetrics: null,
});

const remapOrder = (items: RoutePoint[]) =>
  items.map((item, index) => ({
    ...item,
    order: index + 1,
  }));

export const planningDraftReducer = (
  state: PlanningDraftState,
  action: PlanningDraftAction,
): PlanningDraftState => {
  switch (action.type) {
    case "set-name":
      return {
        ...state,
        name: action.value,
        planCreated: false,
      };
    case "set-zone":
      return {
        ...state,
        zoneId: action.value,
        orderedRoute: [],
        planCreated: false,
        optimizationMetrics: null,
      };
    case "set-scheduled-for":
      return {
        ...state,
        scheduledFor: action.value,
        orderedRoute: [],
        planCreated: false,
        optimizationMetrics: null,
      };
    case "set-fill-threshold":
      return {
        ...state,
        fillThresholdPercent: action.value,
        orderedRoute: [],
        planCreated: false,
        optimizationMetrics: null,
      };
    case "set-assigned-agent":
      return {
        ...state,
        assignedAgentId: action.value,
        planCreated: false,
      };
    case "set-ordered-route":
      return {
        ...state,
        orderedRoute: remapOrder(action.value),
      };
    case "move-route-item": {
      const nextIndex = action.index + action.direction;
      if (nextIndex < 0 || nextIndex >= state.orderedRoute.length) {
        return state;
      }

      const nextRoute = [...state.orderedRoute];
      const [item] = nextRoute.splice(action.index, 1);
      if (!item) {
        return state;
      }
      nextRoute.splice(nextIndex, 0, item);

      return {
        ...state,
        orderedRoute: remapOrder(nextRoute),
        planCreated: false,
      };
    }
    case "set-created-tour":
      return {
        ...state,
        lastCreatedTourId: action.value,
      };
    case "set-plan-created":
      return {
        ...state,
        planCreated: action.value,
      };
    case "set-status":
      return {
        ...state,
        statusMessage: action.message,
        statusTone: action.tone,
      };
    case "clear-status":
      return {
        ...state,
        statusMessage: "",
      };
    case "reset-optimization":
      return {
        ...state,
        orderedRoute: [],
        planCreated: false,
        lastCreatedTourId: null,
        optimizationMetrics: null,
      };
    case "set-optimization-metrics":
      return {
        ...state,
        optimizationMetrics: action.value,
      };
    case "hydrate":
      return {
        ...state,
        ...action.value,
      };
    case "reset":
      return action.value;
    default:
      return state;
  }
};
