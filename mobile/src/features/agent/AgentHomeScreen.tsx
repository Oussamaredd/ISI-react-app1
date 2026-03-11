import { useMemo, useState } from "react";
import { View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, HelperText, RadioButton, SegmentedButtons, Text, TextInput } from "react-native-paper";

import { toursApi } from "@api/modules/tours";
import { AppStateScreen } from "@/components/AppStateScreen";
import { InfoCard } from "@/components/InfoCard";
import { ScreenContainer } from "@/components/ScreenContainer";
import {
  captureCurrentLocation,
  type CapturedLocation
} from "@/device/location";
import { formatCoordinates, formatDateTime } from "@/lib/formatters";
import { queryKeys } from "@/lib/queryKeys";
import { useSession } from "@/providers/SessionProvider";
import type { AppTheme } from "@/theme/theme";
import { useAppTheme, useThemedStyles } from "@/theme/useAppTheme";
import {
  describeAgentActivity,
  normalizeOperationalStatus,
  resolveActiveTourStop,
  resolveNextTourStop
} from "./agentActivity";

type StatusTone = "success" | "error" | "info";
type AnomalySeverity = "low" | "medium" | "high" | "critical";

const createStyles = (theme: AppTheme) =>
  ({
    stack: {
      gap: theme.spacing.sm
    },
    summaryRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      gap: theme.spacing.md
    },
    summaryLabel: {
      color: theme.colors.textMuted
    },
    summaryValue: {
      flexShrink: 1,
      textAlign: "right",
      color: theme.colors.onSurface,
      fontWeight: "600"
    },
    inlineActions: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: theme.spacing.sm
    },
    statusPanel: {
      gap: theme.spacing.xs,
      padding: theme.spacing.md,
      borderRadius: theme.shape.md,
      borderWidth: 1
    },
    statusText: {
      color: theme.colors.onSurface,
      lineHeight: 20
    },
    noteText: {
      color: theme.colors.textMuted,
      lineHeight: 20
    },
    stopTitle: {
      color: theme.colors.onSurface,
      fontWeight: "700"
    },
    activityItem: {
      gap: theme.spacing.xs,
      paddingTop: theme.spacing.sm,
      borderTopWidth: 1,
      borderTopColor: theme.colors.borderSoft
    },
    activityMeta: {
      color: theme.colors.textMuted
    }
  }) satisfies Record<string, object>;

const resolveStatusPanelStyle = (theme: AppTheme, tone: StatusTone) => {
  if (tone === "success") {
    return {
      borderColor: theme.colors.success,
      backgroundColor: theme.colors.primarySurface
    };
  }

  if (tone === "error") {
    return {
      borderColor: theme.colors.error,
      backgroundColor: theme.colors.errorContainer
    };
  }

  return {
    borderColor: theme.colors.primarySoft,
    backgroundColor: theme.colors.surfaceMuted
  };
};

export function AgentHomeScreen() {
  const theme = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const queryClient = useQueryClient();
  const { signOut } = useSession();
  const [volumeLiters, setVolumeLiters] = useState("");
  const [validationNotes, setValidationNotes] = useState("");
  const [capturedLocation, setCapturedLocation] = useState<CapturedLocation | null>(null);
  const [anomalyTypeId, setAnomalyTypeId] = useState("");
  const [anomalySeverity, setAnomalySeverity] = useState<AnomalySeverity>("medium");
  const [anomalyComments, setAnomalyComments] = useState("");
  const [anomalyPhotoUrl, setAnomalyPhotoUrl] = useState("");
  const [isCapturingLocation, setIsCapturingLocation] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [statusTone, setStatusTone] = useState<StatusTone>("info");

  const tourQuery = useQuery({
    queryKey: queryKeys.agentTour,
    queryFn: () => toursApi.getAssignedTour(),
    retry: false
  });

  const anomalyTypesQuery = useQuery({
    queryKey: queryKeys.agentAnomalyTypes,
    queryFn: () => toursApi.getAnomalyTypes(),
    staleTime: 5 * 60_000
  });

  const activityQuery = useQuery({
    queryKey: queryKeys.agentTourActivity(tourQuery.data?.id),
    queryFn: () => toursApi.getTourActivity(tourQuery.data!.id),
    enabled: Boolean(tourQuery.data?.id),
    staleTime: 15_000
  });

  const startTourMutation = useMutation({
    mutationFn: (tourId: string) => toursApi.startTour(tourId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.agentTour }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.agentTourActivity(tourQuery.data?.id)
        })
      ]);
    }
  });

  const validateStopMutation = useMutation({
    mutationFn: toursApi.validateStop,
    onSuccess: async (_, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.agentTour }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.agentTourActivity(variables.tourId)
        })
      ]);
    }
  });

  const reportAnomalyMutation = useMutation({
    mutationFn: toursApi.reportAnomaly,
    onSuccess: async (_, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.agentTour }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.agentTourActivity(variables.tourId)
        })
      ]);
    }
  });

  const tour = tourQuery.data ?? null;
  const stops = tour?.stops ?? [];
  const routeSummary = tour?.routeSummary ?? null;
  const activeStop = resolveActiveTourStop(stops);
  const nextStop = resolveNextTourStop(stops, activeStop);
  const activityRows = activityQuery.data?.activity ?? [];
  const anomalyTypes = anomalyTypesQuery.data?.anomalyTypes ?? [];
  const normalizedTourStatus = normalizeOperationalStatus(tour?.status);
  const parsedVolume = Number(volumeLiters);
  const canStartTour =
    Boolean(tour?.id) &&
    normalizedTourStatus !== "in_progress" &&
    normalizedTourStatus !== "completed";

  const validationError = useMemo(() => {
    if (!volumeLiters.trim()) {
      return "Enter the collected volume in liters.";
    }

    if (!Number.isFinite(parsedVolume) || parsedVolume < 0 || !Number.isInteger(parsedVolume)) {
      return "Volume must be a whole number of liters.";
    }

    return null;
  }, [parsedVolume, volumeLiters]);

  if (tourQuery.isLoading) {
    return (
      <AppStateScreen
        title="Loading agent route"
        description="EcoTrack is loading the assigned route, stops, and recent activity."
        isBusy
      />
    );
  }

  if (tourQuery.isError) {
    return (
      <AppStateScreen
        title="Agent route unavailable"
        description={
          tourQuery.error instanceof Error
            ? tourQuery.error.message
            : "Unable to load the assigned route."
        }
        actionLabel="Retry"
        onAction={() => {
          void tourQuery.refetch();
        }}
      />
    );
  }

  const handleStartTour = async () => {
    if (!tour?.id) {
      return;
    }

    setStatusMessage("");

    try {
      const response = await startTourMutation.mutateAsync(tour.id);
      setStatusTone("success");
      setStatusMessage(
        response.firstActiveStopId
          ? "Tour started. EcoTrack marked the first stop as active."
          : "Tour started. No pending stops remain on this route."
      );
    } catch (error) {
      setStatusTone("error");
      setStatusMessage(
        error instanceof Error ? error.message : "Unable to start the assigned tour."
      );
    }
  };

  const handleCaptureLocation = async () => {
    setStatusMessage("");
    setIsCapturingLocation(true);

    try {
      const nextLocation = await captureCurrentLocation();
      setCapturedLocation(nextLocation);
      setStatusTone("info");
      setStatusMessage("Live device location attached to the active stop.");
    } catch (error) {
      setStatusTone("error");
      setStatusMessage(
        error instanceof Error
          ? error.message
          : "Unable to capture the device location."
      );
    } finally {
      setIsCapturingLocation(false);
    }
  };

  const handleValidateStop = async () => {
    if (!tour?.id || !activeStop) {
      setStatusTone("error");
      setStatusMessage("No active stop is available for validation.");
      return;
    }

    if (validationError) {
      setStatusTone("error");
      setStatusMessage(validationError);
      return;
    }

    setStatusMessage("");

    try {
      const result = await validateStopMutation.mutateAsync({
        tourId: tour.id,
        stopId: activeStop.id,
        containerId: activeStop.containerId,
        volumeLiters: parsedVolume,
        latitude: capturedLocation?.latitude,
        longitude: capturedLocation?.longitude,
        notes: validationNotes.trim() || undefined
      });

      setVolumeLiters("");
      setValidationNotes("");
      setCapturedLocation(null);
      setStatusTone("success");
      setStatusMessage(
        result.alreadyValidated
          ? "This stop was already validated. EcoTrack refreshed the latest route state."
          : result.nextStopId
            ? "Stop validated. EcoTrack advanced the route to the next stop."
            : "Stop validated. All scheduled stops are complete for this tour."
      );
    } catch (error) {
      setStatusTone("error");
      setStatusMessage(
        error instanceof Error ? error.message : "Unable to validate the active stop."
      );
    }
  };

  const handleReportAnomaly = async () => {
    if (!tour?.id) {
      setStatusTone("error");
      setStatusMessage("No active tour is available for anomaly reporting.");
      return;
    }

    if (!anomalyTypeId) {
      setStatusTone("error");
      setStatusMessage("Choose an anomaly type before sending the report.");
      return;
    }

    setStatusMessage("");

    try {
      const result = await reportAnomalyMutation.mutateAsync({
        tourId: tour.id,
        anomalyTypeId,
        tourStopId: activeStop?.id,
        comments: anomalyComments.trim() || undefined,
        photoUrl: anomalyPhotoUrl.trim() || undefined,
        severity: anomalySeverity
      });

      setAnomalyComments("");
      setAnomalyPhotoUrl("");
      setStatusTone(result.managerAlertTriggered ? "success" : "info");
      setStatusMessage(
        result.managerAlertTriggered
          ? "Anomaly reported. EcoTrack queued the manager alert."
          : "Anomaly reported successfully."
      );
    } catch (error) {
      setStatusTone("error");
      setStatusMessage(
        error instanceof Error ? error.message : "Unable to report the anomaly."
      );
    }
  };

  return (
    <ScreenContainer
      eyebrow="Agent lane"
      title={tour?.name ?? "Agent"}
      description={tour?.zoneName ?? "Start tours, validate stops, and escalate route anomalies."}
      actions={
        <Button mode="outlined" onPress={() => void signOut()}>
          Sign out
        </Button>
      }
    >
      {statusMessage ? (
        <InfoCard title="Status" icon="information-outline">
          <View
            style={[
              styles.statusPanel,
              resolveStatusPanelStyle(theme, statusTone)
            ]}
          >
            <Text variant="bodyMedium" style={styles.statusText}>
              {statusMessage}
            </Text>
          </View>
        </InfoCard>
      ) : null}

      <InfoCard title="Assigned tour" icon="map-marker-path">
        {tour ? (
          <View style={styles.stack}>
            <View style={styles.summaryRow}>
              <Text variant="bodyMedium" style={styles.summaryLabel}>
                Status
              </Text>
              <Text variant="bodyMedium" style={styles.summaryValue}>
                {tour.status}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text variant="bodyMedium" style={styles.summaryLabel}>
                Scheduled
              </Text>
              <Text variant="bodyMedium" style={styles.summaryValue}>
                {formatDateTime(tour.scheduledFor ?? null)}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text variant="bodyMedium" style={styles.summaryLabel}>
                Stops
              </Text>
              <Text variant="bodyMedium" style={styles.summaryValue}>
                {routeSummary?.totalStops ?? stops.length} total /{" "}
                {routeSummary?.remainingStops ??
                  stops.filter(
                    (stop) =>
                      normalizeOperationalStatus(stop.status) !== "completed"
                  ).length}{" "}
                remaining
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text variant="bodyMedium" style={styles.summaryLabel}>
                Distance
              </Text>
              <Text variant="bodyMedium" style={styles.summaryValue}>
                {routeSummary?.totalDistanceKm ?? 0} km
              </Text>
            </View>
            {canStartTour ? (
              <Button
                mode="contained"
                onPress={() => {
                  void handleStartTour();
                }}
                loading={startTourMutation.isPending}
                disabled={startTourMutation.isPending}
              >
                Start tour
              </Button>
            ) : null}
          </View>
        ) : (
          <View style={styles.stack}>
            <Text variant="bodyMedium">
              No active or pending tour is assigned to this agent right now.
            </Text>
            <Button
              mode="outlined"
              onPress={() => {
                void tourQuery.refetch();
              }}
            >
              Refresh
            </Button>
          </View>
        )}
      </InfoCard>

      <InfoCard
        title="Active stop validation"
        icon="check-decagram-outline"
        caption="Validation uses the live tour-stop API and can include device GPS coordinates."
      >
        {activeStop ? (
          <View style={styles.stack}>
            <Text variant="titleMedium" style={styles.stopTitle}>
              {activeStop.containerCode} - {activeStop.containerLabel}
            </Text>
            <Text variant="bodyMedium">
              ETA: {formatDateTime(activeStop.eta ?? null)}
            </Text>
            <Text variant="bodyMedium">
              Coordinates: {formatCoordinates(activeStop.latitude, activeStop.longitude)}
            </Text>
            {nextStop ? (
              <Text variant="bodyMedium">
                Next stop: {nextStop.containerCode} - {nextStop.containerLabel}
              </Text>
            ) : null}
            <TextInput
              mode="outlined"
              label="Collected volume (liters)"
              value={volumeLiters}
              onChangeText={setVolumeLiters}
              keyboardType="number-pad"
            />
            <HelperText type="error" visible={Boolean(validationError)}>
              {validationError ?? " "}
            </HelperText>
            <TextInput
              mode="outlined"
              label="Field notes (optional)"
              value={validationNotes}
              onChangeText={setValidationNotes}
              multiline
            />
            <View style={styles.inlineActions}>
              <Button
                mode="outlined"
                onPress={() => {
                  void handleCaptureLocation();
                }}
                loading={isCapturingLocation}
                disabled={isCapturingLocation}
              >
                Attach live location
              </Button>
              {capturedLocation ? (
                <Button
                  mode="text"
                  onPress={() => {
                    setCapturedLocation(null);
                  }}
                >
                  Clear location
                </Button>
              ) : null}
            </View>
            {capturedLocation ? (
              <Text variant="bodySmall" style={styles.noteText}>
                Attached GPS:{" "}
                {formatCoordinates(capturedLocation.latitude, capturedLocation.longitude)}
              </Text>
            ) : null}
            <Button
              mode="contained"
              onPress={() => {
                void handleValidateStop();
              }}
              loading={validateStopMutation.isPending}
              disabled={validateStopMutation.isPending}
            >
              Validate stop
            </Button>
          </View>
        ) : (
          <Text variant="bodyMedium">
            No active stop is available. Start the tour or wait for the route to advance.
          </Text>
        )}
      </InfoCard>

      <InfoCard
        title="Anomaly report"
        icon="alert-circle-outline"
        caption="Direct image upload is still out of scope for mobile anomaly reports, so photo evidence remains URL-based."
      >
        <View style={styles.stack}>
          {anomalyTypesQuery.isError ? (
            <Text variant="bodyMedium">
              {anomalyTypesQuery.error instanceof Error
                ? anomalyTypesQuery.error.message
                : "Unable to load anomaly types."}
            </Text>
          ) : anomalyTypes.length === 0 ? (
            <Text variant="bodyMedium">
              EcoTrack did not return any active anomaly types.
            </Text>
          ) : (
            <RadioButton.Group
              value={anomalyTypeId}
              onValueChange={setAnomalyTypeId}
            >
              <View style={styles.stack}>
                {anomalyTypes.map((anomalyType) => (
                  <RadioButton.Item
                    key={anomalyType.id}
                    value={anomalyType.id}
                    label={anomalyType.label}
                  />
                ))}
              </View>
            </RadioButton.Group>
          )}
          <SegmentedButtons
            value={anomalySeverity}
            onValueChange={(value) =>
              setAnomalySeverity(value as AnomalySeverity)
            }
            buttons={[
              { value: "low", label: "Low" },
              { value: "medium", label: "Med" },
              { value: "high", label: "High" },
              { value: "critical", label: "Critical" }
            ]}
          />
          <TextInput
            mode="outlined"
            label="Comments (optional)"
            value={anomalyComments}
            onChangeText={setAnomalyComments}
            multiline
          />
          <TextInput
            mode="outlined"
            label="Photo URL (optional)"
            value={anomalyPhotoUrl}
            onChangeText={setAnomalyPhotoUrl}
            autoCapitalize="none"
            keyboardType="url"
          />
          <Button
            mode="contained-tonal"
            onPress={() => {
              void handleReportAnomaly();
            }}
            loading={reportAnomalyMutation.isPending}
            disabled={reportAnomalyMutation.isPending || anomalyTypes.length === 0}
          >
            Report anomaly
          </Button>
        </View>
      </InfoCard>

      <InfoCard
        title="Recent activity"
        icon="history"
        caption="The field activity feed reflects the same route events stored by the platform."
      >
        <View style={styles.stack}>
          {activityQuery.isLoading ? (
            <Text variant="bodyMedium">Syncing recent route activity.</Text>
          ) : activityRows.length === 0 ? (
            <Text variant="bodyMedium">No activity recorded yet.</Text>
          ) : (
            activityRows.slice(0, 6).map((activity) => {
              const description = describeAgentActivity(activity);

              return (
                <View key={activity.id} style={styles.activityItem}>
                  <Text variant="titleSmall" style={styles.stopTitle}>
                    {description.title}
                  </Text>
                  <Text variant="bodySmall" style={styles.activityMeta}>
                    {formatDateTime(activity.createdAt)}
                    {activity.actorDisplayName
                      ? ` - ${activity.actorDisplayName}`
                      : ""}
                  </Text>
                  <Text variant="bodyMedium">{description.summary}</Text>
                </View>
              );
            })
          )}
        </View>
      </InfoCard>
    </ScreenContainer>
  );
}
