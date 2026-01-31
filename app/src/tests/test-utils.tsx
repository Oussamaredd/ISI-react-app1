import React, { ReactElement, ReactNode, useEffect } from "react";
import {
  MemoryRouter,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import { render, RenderOptions } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "../hooks/useAuth";

type RouterOptions = {
  route?: string;
  initialEntries?: string[];
  path?: string;
  withProviders?: boolean;
};

export const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

const LocationTracker = ({
  onChange,
}: {
  onChange: (loc: ReturnType<typeof useLocation>) => void;
}) => {
  const location = useLocation();

  useEffect(() => {
    onChange(location);
  }, [location, onChange]);

  return null;
};

export function renderWithRouter(
  ui: ReactElement,
  {
    route = "/",
    initialEntries = [route],
    path,
    withProviders = false,
  }: RouterOptions = {},
  renderOptions?: Omit<RenderOptions, "wrapper">
) {
  let lastLocation: ReturnType<typeof useLocation> | null = null;
  const queryClient = withProviders ? createTestQueryClient() : null;

  const Wrapper = ({ children }: { children: ReactNode }) => {
    const content = withProviders && queryClient ? (
      <QueryClientProvider client={queryClient}>
        <AuthProvider>{children}</AuthProvider>
      </QueryClientProvider>
    ) : (
      children
    );

    return (
      <MemoryRouter initialEntries={initialEntries}>
        <LocationTracker onChange={(loc) => (lastLocation = loc)} />
        {path ? (
          <Routes>
            <Route path={path} element={content as ReactElement} />
          </Routes>
        ) : (
          content
        )}
      </MemoryRouter>
    );
  };

  const renderResult = render(ui, { wrapper: Wrapper, ...renderOptions });
  return { ...renderResult, getLocation: () => lastLocation, queryClient };
}

export function renderWithProviders(
  ui: ReactElement,
  options?: Omit<RouterOptions, "withProviders">,
  renderOptions?: Omit<RenderOptions, "wrapper">
) {
  return renderWithRouter(ui, { ...options, withProviders: true }, renderOptions);
}
