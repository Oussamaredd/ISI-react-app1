import type { PropsWithChildren } from "react";
import { useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { PaperProvider } from "react-native-paper";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { CitizenMenuProvider } from "@/providers/CitizenMenuProvider";
import { ReactQueryLifecycleProvider } from "@/providers/ReactQueryLifecycleProvider";
import { SessionProvider } from "@/providers/SessionProvider";
import type { AppTheme } from "@/theme/theme";

type AppProvidersProps = PropsWithChildren<{
  theme: AppTheme;
}>;

export function AppProviders({ children, theme }: AppProvidersProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: 1,
            staleTime: 30_000
          }
        }
      })
  );

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <ReactQueryLifecycleProvider>
            <SessionProvider>
              <PaperProvider theme={theme}>
                <CitizenMenuProvider>{children}</CitizenMenuProvider>
              </PaperProvider>
            </SessionProvider>
          </ReactQueryLifecycleProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
