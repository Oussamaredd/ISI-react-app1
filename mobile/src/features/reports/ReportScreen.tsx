import type { ComponentType } from "react";
import {
  startTransition,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import { Animated, Image, Platform, Pressable, StyleSheet, Vibration, View } from "react-native";
import { router } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Button,
  Chip,
  HelperText,
  IconButton,
  RadioButton,
  Searchbar,
  Text,
  TextInput
} from "react-native-paper";

import { citizenApi, type CitizenReportResponse } from "@api/modules/citizen";
import { containersApi, type ContainerOption } from "@api/modules/containers";
import { AppStateScreen } from "@/components/AppStateScreen";
import { BottomSheet } from "@/components/BottomSheet";
import { InfoCard } from "@/components/InfoCard";
import { ScreenContainer } from "@/components/ScreenContainer";
import { captureCurrentLocation, type CapturedLocation } from "@/device/location";
import {
  captureCameraPhoto,
  resolvePhotoPreviewAspectRatio,
  type CapturedPhoto
} from "@/device/media";
import {
  buildCapturedPhotoDataUrl,
  buildMapRegion,
  citizenReportTypes,
  DEFAULT_CITIZEN_REPORT_TYPE,
  findRecentDuplicateHistoryItem,
  formatRelativeReportTime,
  hasContainerCoordinates,
  mergeContainerCollections,
  resolveNearestContainer,
  type CitizenReportType
} from "@/lib/citizenReports";
import { formatCoordinates, formatDistanceMeters } from "@/lib/formatters";
import { bearingDegrees, rankContainersByDistance, toCoordinateNumber } from "@/lib/geo";
import { queryKeys } from "@/lib/queryKeys";
import { useSession } from "@/providers/SessionProvider";
import type { AppTheme } from "@/theme/theme";
import { useAppTheme, useThemedStyles } from "@/theme/useAppTheme";

type MapRegion = {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
};

type NativeMapController = {
  animateToRegion?: (region: MapRegion, duration?: number) => void;
};

type NativeMapModule = {
  default: ComponentType<any>;
  Marker: ComponentType<any>;
};

type LocationSource = "gps" | "camera" | "container";
type PrimerState =
  | {
      action: "location" | "camera";
      origin: "discover" | "composer";
    }
  | null;

type SubmitSuccessState = {
  response: CitizenReportResponse;
  container: ContainerOption;
  location: CapturedLocation | null;
  photo: CapturedPhoto | null;
};

type NearbyMapIndicator = ContainerOption & {
  distanceMeters: number;
  bearing: number;
  rank: number;
  leftPercent: number;
  topPercent: number;
};

const HIGHLIGHTED_NEARBY_LIMIT = 5;

const clampPercent = (value: number, min = 10, max = 90) =>
  Math.min(Math.max(value, min), max);

// Native-only map rendering for the installed mobile app.
const nativeMapModule: NativeMapModule | null =
  Platform.OS === "web"
    ? null
    : ((require("react-native-maps") as NativeMapModule) satisfies NativeMapModule); // eslint-disable-line @typescript-eslint/no-require-imports

const NativeMapView = nativeMapModule?.default ?? null;
const NativeMarker = nativeMapModule?.Marker ?? null;

const createStyles = (theme: AppTheme) =>
  ({
    stack: { gap: theme.spacing.sm },
    actionRow: { flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.sm },
    actionButton: { minWidth: 150 },
    muted: { color: theme.colors.textMuted, lineHeight: 20 },
    chipRow: { flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.xs },
    chipMeta: { color: theme.colors.textMuted },
    mapNote: { color: theme.colors.textMuted, lineHeight: 20 },
    searchList: { gap: theme.spacing.sm },
    searchCard: {
      gap: theme.spacing.xs,
      padding: theme.spacing.md,
      borderRadius: theme.shape.md,
      borderWidth: 1,
      borderColor: theme.colors.borderSoft,
      backgroundColor: theme.colors.surface
    },
    searchPressed: { opacity: 0.9 },
    mapFrame: {
      overflow: "hidden",
      borderRadius: theme.shape.lg,
      borderWidth: 1,
      borderColor: theme.colors.borderSoft,
      backgroundColor: theme.colors.surfaceMuted
    },
    map: { width: "100%", height: 320 },
    mapFallback: {
      gap: theme.spacing.md,
      minHeight: 220,
      justifyContent: "center",
      padding: theme.spacing.lg
    },
    mapControls: {
      position: "absolute",
      top: theme.spacing.md,
      right: theme.spacing.md,
      gap: theme.spacing.xs
    },
    mapStatusRow: {
      position: "absolute",
      top: theme.spacing.md,
      left: theme.spacing.md,
      flexDirection: "row",
      flexWrap: "wrap",
      gap: theme.spacing.xs
    },
    mapStatusPill: {
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: 6,
      borderRadius: theme.shape.pill,
      borderWidth: 1,
      borderColor: theme.colors.borderSoft,
      backgroundColor: theme.colors.surfaceElevated
    },
    mapStatusText: {
      color: theme.colors.onSurface,
      fontWeight: "700"
    },
    mapIndicatorLayer: {
      ...StyleSheet.absoluteFillObject
    },
    mapIndicatorCard: {
      position: "absolute",
      width: 36,
      height: 36,
      borderRadius: theme.shape.pill,
      borderWidth: 1,
      borderColor: theme.colors.borderSoft,
      backgroundColor: theme.colors.surfaceElevated,
      alignItems: "center",
      justifyContent: "center",
      shadowColor: theme.colors.shadow,
      shadowOffset: {
        width: 0,
        height: 4
      },
      shadowOpacity: theme.dark ? 0.16 : 0.08,
      shadowRadius: 10,
      elevation: 2
    },
    mapIndicatorSelected: {
      borderColor: theme.colors.primary,
      backgroundColor: theme.colors.primarySurface
    },
    mapIndicatorPulse: {
      ...StyleSheet.absoluteFillObject,
      borderRadius: theme.shape.pill,
      backgroundColor: theme.colors.success
    },
    mapIndicatorPressed: {
      opacity: 0.92
    },
    mapIndicatorArrow: {
      color: theme.colors.success
    },
    mapIndicatorBadge: {
      position: "absolute",
      top: -5,
      right: -5,
      minWidth: 16,
      height: 16,
      borderRadius: theme.shape.pill,
      paddingHorizontal: 4,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.primaryStrong
    },
    mapIndicatorBadgeText: {
      color: theme.colors.onPrimary,
      fontSize: 10,
      fontWeight: "700"
    },
    mapIndicatorLabelWrap: {
      position: "absolute",
      top: 42,
      alignSelf: "center",
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: theme.shape.pill,
      backgroundColor: theme.colors.overlay
    },
    mapIndicatorLabel: {
      color: theme.colors.onPrimary,
      fontSize: 10,
      fontWeight: "700"
    },
    legendRow: { flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.sm },
    legendItem: { flexDirection: "row", alignItems: "center", gap: theme.spacing.xs },
    legendSwatch: { width: 12, height: 12, borderRadius: theme.shape.pill },
    selectedCard: {
      gap: theme.spacing.sm,
      padding: theme.spacing.md,
      borderRadius: theme.shape.md,
      borderWidth: 1,
      borderColor: theme.colors.primary,
      backgroundColor: theme.colors.primarySurface
    },
    selectedTitle: { color: theme.colors.onSurface, fontWeight: "700" },
    warningCard: {
      gap: theme.spacing.xs,
      padding: theme.spacing.md,
      borderRadius: theme.shape.md,
      borderWidth: 1,
      borderColor: theme.colors.warning,
      backgroundColor: theme.colors.surface
    },
    warningTitle: { color: theme.colors.onSurface, fontWeight: "700" },
    nearbyList: { gap: theme.spacing.sm },
    nearbyCard: {
      gap: theme.spacing.xs,
      padding: theme.spacing.md,
      borderRadius: theme.shape.md,
      borderWidth: 1,
      borderColor: theme.colors.borderSoft,
      backgroundColor: theme.colors.surface
    },
    nearbySelected: {
      borderColor: theme.colors.primary,
      backgroundColor: theme.colors.primarySurface
    },
    nearbyPressed: { opacity: 0.92 },
    nearbyHeader: { flexDirection: "row", justifyContent: "space-between", gap: theme.spacing.md },
    nearbyIdentity: { flexDirection: "row", alignItems: "flex-start", gap: theme.spacing.sm, flex: 1 },
    nearbyRankBadge: {
      minWidth: 28,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: theme.shape.pill,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.surfaceMuted
    },
    nearbyRankText: {
      color: theme.colors.primaryStrong,
      fontWeight: "700"
    },
    nearbyTitle: { flex: 1, color: theme.colors.onSurface, fontWeight: "700" },
    nearbyDistance: { color: theme.colors.primaryStrong, fontWeight: "700" },
    reportTypeList: { gap: theme.spacing.sm },
    reportTypeRow: {
      flexDirection: "row",
      gap: theme.spacing.sm,
      alignItems: "center",
      padding: theme.spacing.md,
      borderRadius: theme.shape.md,
      borderWidth: 1,
      borderColor: theme.colors.borderSoft,
      backgroundColor: theme.colors.surface
    },
    reportTypeCopy: { flex: 1, gap: 4 },
    reportTypeLabel: { color: theme.colors.onSurface, fontWeight: "700" },
    locationCard: {
      gap: theme.spacing.sm,
      padding: theme.spacing.md,
      borderRadius: theme.shape.md,
      borderWidth: 1,
      borderColor: theme.colors.borderSoft,
      backgroundColor: theme.colors.surfaceMuted
    },
    photoPreview: {
      width: "100%",
      borderRadius: theme.shape.md,
      backgroundColor: theme.colors.surfaceMuted
    },
    footerActions: { flexDirection: "row", gap: theme.spacing.sm },
    footerButton: { flex: 1 },
    successCard: {
      gap: theme.spacing.sm,
      padding: theme.spacing.md,
      borderRadius: theme.shape.md,
      borderWidth: 1,
      borderColor: theme.colors.success,
      backgroundColor: theme.colors.surface
    }
  }) satisfies Record<string, object>;

const resolveMarkerColor = (
  container: ContainerOption,
  selectedContainerId: string | null,
  nearbyContainerIds: Set<string>,
  theme: AppTheme
) => {
  if (container.id === selectedContainerId) {
    return theme.colors.primaryStrong;
  }

  if (nearbyContainerIds.has(container.id)) {
    return theme.colors.success;
  }

  return theme.colors.textMuted;
};

export function ReportScreen() {
  const theme = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const queryClient = useQueryClient();
  const mapRef = useRef<NativeMapController | null>(null);
  const { isAuthenticated, isLoading: isSessionLoading } = useSession();
  const [selectedContainerId, setSelectedContainerId] = useState<string | null>(null);
  const [searchText, setSearchText] = useState("");
  const [mapRegion, setMapRegion] = useState<MapRegion | null>(null);
  const [capturedLocation, setCapturedLocation] = useState<CapturedLocation | null>(null);
  const [locationSource, setLocationSource] = useState<LocationSource>("container");
  const [reportType, setReportType] = useState<CitizenReportType>(DEFAULT_CITIZEN_REPORT_TYPE);
  const [description, setDescription] = useState("");
  const [photoEvidence, setPhotoEvidence] = useState<CapturedPhoto | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isComposerVisible, setIsComposerVisible] = useState(false);
  const [activePrimer, setActivePrimer] = useState<PrimerState>(null);
  const [hasSeenLocationPrimer, setHasSeenLocationPrimer] = useState(false);
  const [hasSeenCameraPrimer, setHasSeenCameraPrimer] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [isCapturingPhoto, setIsCapturingPhoto] = useState(false);
  const [lastSubmission, setLastSubmission] = useState<SubmitSuccessState | null>(null);
  const deferredSearch = useDeferredValue(searchText.trim());

  const containersQuery = useQuery({
    queryKey: queryKeys.containers("available"),
    queryFn: () => containersApi.list({ page: 1, pageSize: 80 })
  });
  const searchQuery = useQuery({
    queryKey: queryKeys.containerLookup("available", deferredSearch),
    queryFn: () => containersApi.list({ page: 1, pageSize: 10, search: deferredSearch }),
    enabled: deferredSearch.length >= 2
  });
  const historyPreviewQuery = useQuery({
    queryKey: queryKeys.citizenHistory(1, 12),
    queryFn: () => citizenApi.getHistory(1, 12),
    enabled: isAuthenticated
  });

  const baseContainers = useMemo(() => containersQuery.data?.containers ?? [], [containersQuery.data]);
  const searchContainers = useMemo(() => searchQuery.data?.containers ?? [], [searchQuery.data]);
  const mapContainers = useMemo(
    () => mergeContainerCollections(baseContainers, searchContainers).filter(hasContainerCoordinates),
    [baseContainers, searchContainers]
  );
  const selectedContainer = useMemo(
    () => mapContainers.find((container) => container.id === selectedContainerId) ?? null,
    [mapContainers, selectedContainerId]
  );
  const nearbyContainers = useMemo(() => {
    if (capturedLocation) {
      return rankContainersByDistance(capturedLocation, mapContainers, 5);
    }

    return selectedContainer ? rankContainersByDistance(selectedContainer, mapContainers, 5) : [];
  }, [capturedLocation, mapContainers, selectedContainer]);
  const nearbyContainerIds = useMemo(
    () => new Set(nearbyContainers.map((container) => container.id)),
    [nearbyContainers]
  );
  const highlightedMapContainers = useMemo(() => {
    if (capturedLocation) {
      return mergeContainerCollections(
        selectedContainer ? [selectedContainer] : [],
        nearbyContainers.slice(0, HIGHLIGHTED_NEARBY_LIMIT)
      );
    }

    return selectedContainer ? [selectedContainer] : [];
  }, [capturedLocation, nearbyContainers, selectedContainer]);
  const duplicateHistoryItem = useMemo(
    () =>
      findRecentDuplicateHistoryItem(historyPreviewQuery.data?.history ?? [], selectedContainerId),
    [historyPreviewQuery.data?.history, selectedContainerId]
  );
  const nearbyMapIndicators = useMemo<NearbyMapIndicator[]>(() => {
    if (!capturedLocation) {
      return [];
    }

    return nearbyContainers
      .slice(0, HIGHLIGHTED_NEARBY_LIMIT)
      .map((container, index) => {
        const bearing = bearingDegrees(capturedLocation, container);
        if (bearing == null) {
          return null;
        }

        const radiusX = 40 - (index % 2) * 3;
        const radiusY = 36 - (index % 2) * 3;
        const radians = (bearing * Math.PI) / 180;
        const leftPercent = clampPercent(50 + Math.sin(radians) * radiusX, 12, 88);
        const topPercent = clampPercent(50 - Math.cos(radians) * radiusY, 14, 86);

        return {
          ...container,
          bearing,
          rank: index + 1,
          leftPercent,
          topPercent
        };
      })
      .filter((container): container is NearbyMapIndicator => Boolean(container));
  }, [capturedLocation, nearbyContainers]);
  const photoPreviewAspectRatio = resolvePhotoPreviewAspectRatio(photoEvidence);

  useEffect(() => {
    if (mapRegion || mapContainers.length === 0) {
      return;
    }

    const nearestMatch = capturedLocation ? resolveNearestContainer(mapContainers, capturedLocation) : null;
    const initialContainer = nearestMatch ?? mapContainers[0];
    const nextRegion = buildMapRegion(initialContainer);

    if (nextRegion) {
      setMapRegion(nextRegion);
      setSelectedContainerId((currentValue) => currentValue ?? initialContainer.id);
    }
  }, [capturedLocation, mapContainers, mapRegion]);

  const centerMapOnUserPosition = (
    location: CapturedLocation,
    containersToHighlight: ContainerOption[]
  ) => {
    const latitude = toCoordinateNumber(location.latitude);
    const longitude = toCoordinateNumber(location.longitude);

    if (latitude == null || longitude == null) {
      return;
    }

    const nearbyPoints = containersToHighlight
      .slice(0, HIGHLIGHTED_NEARBY_LIMIT)
      .map((container) => ({
        latitude: toCoordinateNumber(container.latitude),
        longitude: toCoordinateNumber(container.longitude)
      }))
      .filter(
        (
          point
        ): point is {
          latitude: number;
          longitude: number;
        } => point.latitude != null && point.longitude != null
      );

    const latitudeDelta =
      nearbyPoints.length > 0
        ? Math.max(0.018, ...nearbyPoints.map((point) => Math.abs(point.latitude - latitude) * 2.8))
        : 0.018;
    const longitudeDelta =
      nearbyPoints.length > 0
        ? Math.max(
            0.018,
            ...nearbyPoints.map((point) => Math.abs(point.longitude - longitude) * 2.8)
          )
        : 0.018;

    const nextRegion = {
      latitude,
      longitude,
      latitudeDelta,
      longitudeDelta
    };

    setMapRegion(nextRegion);
    mapRef.current?.animateToRegion?.(nextRegion, 240);
  };

  const focusContainer = (
    container: ContainerOption,
    source: LocationSource,
    options?: {
      recenterMap?: boolean;
    }
  ) => {
    const shouldRecenterMap = options?.recenterMap ?? true;

    setSelectedContainerId(container.id);
    setLocationSource(source);
    setErrorMessage(null);

    if (shouldRecenterMap) {
      const nextRegion = buildMapRegion(container);
      if (nextRegion) {
        setMapRegion(nextRegion);
        mapRef.current?.animateToRegion?.(nextRegion, 240);
      }
    }

    Vibration.vibrate(10);
  };

  const runGpsCapture = async (origin: "discover" | "composer") => {
    setIsLocating(true);
    setErrorMessage(null);

    try {
      const location = await captureCurrentLocation();
      setCapturedLocation(location);
      const nearestMatches = rankContainersByDistance(
        location,
        mapContainers,
        HIGHLIGHTED_NEARBY_LIMIT
      );

      centerMapOnUserPosition(location, nearestMatches);

      if (origin === "discover") {
        setLocationSource("gps");

        const nearestContainer = nearestMatches[0] ?? resolveNearestContainer(mapContainers, location);
        if (nearestContainer) {
          focusContainer(nearestContainer, "gps", { recenterMap: false });
        }

        setStatusMessage(
          nearestMatches.length > 0
            ? `GPS active. Map centered on your position with ${nearestMatches.length} nearby containers highlighted.`
            : "GPS active. Map centered on your position."
        );
      } else {
        setStatusMessage(
          nearestMatches.length > 0
            ? `Location refreshed. Map centered on your position with ${nearestMatches.length} nearby containers highlighted.`
            : "Location refreshed."
        );
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to capture your location.");
    } finally {
      setIsLocating(false);
    }
  };

  const runCameraCapture = async (origin: "discover" | "composer") => {
    setIsCapturingPhoto(true);
    setErrorMessage(null);

    try {
      const location = await captureCurrentLocation();
      const photo = await captureCameraPhoto();

      if (!photo) {
        setStatusMessage("Photo capture canceled.");
        return;
      }

      setCapturedLocation(location);
      setPhotoEvidence(photo);
      const nearestMatches = rankContainersByDistance(
        location,
        mapContainers,
        HIGHLIGHTED_NEARBY_LIMIT
      );

      centerMapOnUserPosition(location, nearestMatches);

      if (origin === "discover") {
        setLocationSource("camera");

        const nearestContainer = nearestMatches[0] ?? resolveNearestContainer(mapContainers, location);
        if (nearestContainer) {
          focusContainer(nearestContainer, "camera", { recenterMap: false });
        }

        setStatusMessage(
          nearestMatches.length > 0
            ? "Photo evidence captured. Map centered on your position with nearby containers highlighted."
            : "Photo evidence captured with live coordinates."
        );
      } else {
        setStatusMessage("Photo evidence captured with refreshed location.");
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to capture photo evidence.");
    } finally {
      setIsCapturingPhoto(false);
    }
  };

  const handleGpsLocation = () => {
    if (!hasSeenLocationPrimer) {
      setActivePrimer({ action: "location", origin: "discover" });
      return;
    }

    void runGpsCapture("discover");
  };

  const handleComposerLocationRefresh = () => {
    if (!hasSeenLocationPrimer) {
      setActivePrimer({ action: "location", origin: "composer" });
      return;
    }

    void runGpsCapture("composer");
  };

  const handleCameraCapture = () => {
    if (!hasSeenCameraPrimer) {
      setActivePrimer({ action: "camera", origin: "discover" });
      return;
    }

    void runCameraCapture("discover");
  };

  const handleComposerCameraCapture = () => {
    if (!hasSeenCameraPrimer) {
      setActivePrimer({ action: "camera", origin: "composer" });
      return;
    }

    void runCameraCapture("composer");
  };

  const handleContinuePrimer = () => {
    const currentPrimer = activePrimer;
    setActivePrimer(null);

    if (currentPrimer?.action === "location") {
      setHasSeenLocationPrimer(true);
      void runGpsCapture(currentPrimer.origin);
    }

    if (currentPrimer?.action === "camera") {
      setHasSeenCameraPrimer(true);
      void runCameraCapture(currentPrimer.origin);
    }
  };

  const handleSearchSelection = (container: ContainerOption) => {
    focusContainer(container, "container");
    startTransition(() => setSearchText(""));
  };

  const createReportMutation = useMutation({
    mutationFn: async () => {
      if (!selectedContainer) {
        throw new Error("Select a mapped container before submitting.");
      }

      if (duplicateHistoryItem) {
        throw new Error(
          `This container was already reported ${formatRelativeReportTime(
            duplicateHistoryItem.reportedAt
          )}.`
        );
      }

      const resolvedLocation = capturedLocation ?? (await captureCurrentLocation());
      setCapturedLocation(resolvedLocation);
      setLocationSource("gps");

      const response = await citizenApi.createReport({
        containerId: selectedContainer.id,
        reportType,
        description: description.trim() || undefined,
        latitude: resolvedLocation.latitude,
        longitude: resolvedLocation.longitude,
        photoUrl: buildCapturedPhotoDataUrl(photoEvidence) ?? undefined
      });

      return {
        response,
        container: selectedContainer,
        location: resolvedLocation,
        photo: photoEvidence
      };
    },
    onSuccess: (result) => {
      setLastSubmission(result);
      setStatusMessage("Report sent. History and challenge points are refreshing.");
      setErrorMessage(null);
      setDescription("");
      setPhotoEvidence(null);
      setReportType(DEFAULT_CITIZEN_REPORT_TYPE);
      setIsComposerVisible(false);
      Vibration.vibrate(20);

      void queryClient.invalidateQueries({ queryKey: queryKeys.citizenProfile });
      void queryClient.invalidateQueries({ queryKey: queryKeys.citizenChallenges });
      void queryClient.invalidateQueries({ queryKey: queryKeys.citizenHistoryBase });
    },
    onError: (error) => {
      setErrorMessage(error instanceof Error ? error.message : "Unable to submit the report.");
    }
  });

  if (isSessionLoading || (containersQuery.isLoading && !containersQuery.data)) {
    return (
      <AppStateScreen
        title="Loading report flow"
        description="EcoTrack is syncing your citizen session and mapped containers."
        isBusy
      />
    );
  }

  if (!isAuthenticated) {
    return (
      <AppStateScreen
        title="Authentication required"
        description="Citizen reporting is available only after sign-in."
        actionLabel="Go to login"
        onAction={() => router.replace("/login")}
      />
    );
  }

  if (containersQuery.isError && !containersQuery.data) {
    return (
      <AppStateScreen
        title="Containers unavailable"
        description={
          containersQuery.error instanceof Error
            ? containersQuery.error.message
            : "Unable to load mapped containers."
        }
        actionLabel="Retry"
        onAction={() => {
          void containersQuery.refetch();
        }}
      />
    );
  }

  return (
    <ScreenContainer
      eyebrow="Report"
      title="Report"
      description="Map, select, submit."
    >
      <InfoCard title="Actions">
        <View style={styles.stack}>
          <View style={styles.actionRow}>
            <Button
              mode="contained"
              icon="crosshairs-gps"
              style={styles.actionButton}
              loading={isLocating}
              onPress={handleGpsLocation}
            >
              Use GPS
            </Button>
            <Button
              mode="outlined"
              icon="camera-outline"
              style={styles.actionButton}
              loading={isCapturingPhoto}
              onPress={handleCameraCapture}
            >
              Add photo
            </Button>
            <Button
              mode="contained-tonal"
              icon="alert-circle-outline"
              style={styles.actionButton}
              disabled={!selectedContainer}
              onPress={() => setIsComposerVisible(true)}
            >
              Report issue
            </Button>
          </View>
          <Text variant="bodySmall" style={styles.mapNote}>
            Enable GPS to center the map on your position and highlight up to 5 nearby
            containers. You can still search and report without location.
          </Text>
          {statusMessage ? (
            <HelperText type="info" visible>
              {statusMessage}
            </HelperText>
          ) : null}
        </View>
      </InfoCard>

      <InfoCard title="Find container">
        <View style={styles.stack}>
          <Searchbar
            placeholder="Search container code or label"
            value={searchText}
            onChangeText={setSearchText}
          />
          {!deferredSearch && nearbyContainers.length > 0 ? (
            <>
              <Text variant="bodySmall" style={styles.chipMeta}>
                Nearby shortcuts follow your GPS ranking.
              </Text>
              <View style={styles.chipRow}>
                {nearbyContainers.slice(0, HIGHLIGHTED_NEARBY_LIMIT).map((container, index) => (
                  <Chip
                    key={container.id}
                    icon="crosshairs-gps"
                    onPress={() => focusContainer(container, "container", { recenterMap: false })}
                  >
                    {`${index + 1}. ${container.code}`}
                  </Chip>
                ))}
              </View>
            </>
          ) : null}
          {searchQuery.isFetching ? (
            <Text variant="bodySmall">Searching mapped containers...</Text>
          ) : null}
          {deferredSearch.length >= 2 && searchContainers.length > 0 ? (
            <View style={styles.searchList}>
              {searchContainers.map((container) => (
                <Pressable
                  key={container.id}
                  onPress={() => handleSearchSelection(container)}
                  style={({ pressed }) => [styles.searchCard, pressed ? styles.searchPressed : null]}
                >
                  <Text variant="titleMedium">{container.code} - {container.label}</Text>
                  <Text variant="bodySmall" style={styles.muted}>
                    {container.zoneName ? `${container.zoneName} - ` : ""}
                    {container.status ?? "available"}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : null}
          {deferredSearch.length >= 2 &&
          !searchQuery.isFetching &&
          !searchQuery.isError &&
          searchContainers.length === 0 ? (
            <HelperText type="info" visible>
              No mapped container matched that search.
            </HelperText>
          ) : null}
          <Text variant="bodySmall" style={styles.muted}>
            GPS keeps the map centered on you. Nearby markers and arrows track the 5 closest
            containers.
          </Text>
        </View>
      </InfoCard>

      <View style={styles.mapFrame}>
        {NativeMapView && NativeMarker && mapRegion ? (
          <View>
            <NativeMapView
              ref={mapRef}
              initialRegion={mapRegion}
              style={styles.map}
              showsUserLocation={Boolean(capturedLocation)}
            >
              {highlightedMapContainers.map((container) => (
                <NativeMarker
                  key={container.id}
                  coordinate={{
                    latitude: toCoordinateNumber(container.latitude) ?? 0,
                    longitude: toCoordinateNumber(container.longitude) ?? 0
                  }}
                  title={`${container.code} - ${container.label}`}
                  description={container.zoneName ?? undefined}
                  pinColor={resolveMarkerColor(
                    container,
                    selectedContainerId,
                    nearbyContainerIds,
                    theme
                  )}
                  onPress={() => focusContainer(container, "container")}
                />
              ))}
            </NativeMapView>
            <View style={styles.mapStatusRow} pointerEvents="box-none">
              {capturedLocation ? (
                <>
                  <View style={styles.mapStatusPill}>
                    <Text variant="labelSmall" style={styles.mapStatusText}>
                      You are centered
                    </Text>
                  </View>
                  <View style={styles.mapStatusPill}>
                    <Text variant="labelSmall" style={styles.mapStatusText}>
                      {`${nearbyMapIndicators.length} nearby`}
                    </Text>
                  </View>
                </>
              ) : (
                <View style={styles.mapStatusPill}>
                  <Text variant="labelSmall" style={styles.mapStatusText}>
                    Search or enable GPS
                  </Text>
                </View>
              )}
            </View>
            {capturedLocation && nearbyMapIndicators.length > 0 ? (
              <View pointerEvents="box-none" style={styles.mapIndicatorLayer}>
                {nearbyMapIndicators.map((container) => (
                  <Pressable
                    key={`indicator-${container.id}`}
                    onPress={() => focusContainer(container, "container", { recenterMap: false })}
                    style={({ pressed }) => [
                      styles.mapIndicatorCard,
                      container.id === selectedContainerId ? styles.mapIndicatorSelected : null,
                      {
                        left: `${container.leftPercent}%`,
                        top: `${container.topPercent}%`,
                        transform: [{ translateX: -18 }, { translateY: -18 }]
                      },
                      pressed ? styles.mapIndicatorPressed : null
                    ]}
                  >
                    <MaterialCommunityIcons
                      name="arrow-up-bold-circle"
                      size={20}
                      style={[
                        styles.mapIndicatorArrow,
                        {
                          transform: [{ rotate: `${container.bearing}deg` }]
                        }
                      ]}
                    />
                    <View style={styles.mapIndicatorBadge}>
                      <Text style={styles.mapIndicatorBadgeText}>{container.rank}</Text>
                    </View>
                    {container.id === selectedContainerId ? (
                      <View style={styles.mapIndicatorLabelWrap}>
                        <Text style={styles.mapIndicatorLabel}>
                          {`${container.code} • ${formatDistanceMeters(container.distanceMeters)}`}
                        </Text>
                      </View>
                    ) : null}
                  </Pressable>
                ))}
              </View>
            ) : null}
            <View style={styles.mapControls}>
              <IconButton
                icon="crosshairs-gps"
                mode="contained-tonal"
                loading={isLocating}
                onPress={handleGpsLocation}
              />
              <IconButton
                icon="alert-circle-outline"
                mode="contained"
                disabled={!selectedContainer}
                onPress={() => setIsComposerVisible(true)}
              />
            </View>
          </View>
        ) : (
          <View style={styles.mapFallback}>
            <Text variant="titleMedium">Map preview requires the installed app.</Text>
            <Text variant="bodyMedium" style={styles.muted}>
              Search and nearby suggestions still work, but the native marker view is available on
              the mobile app.
            </Text>
          </View>
        )}
      </View>

      {selectedContainer ? (
        <InfoCard title="Selected container">
          <View style={styles.selectedCard}>
            <Text variant="titleMedium" style={styles.selectedTitle}>
              {selectedContainer.code} - {selectedContainer.label}
            </Text>
            <Text variant="bodyMedium" style={styles.muted}>
              {selectedContainer.zoneName ? `${selectedContainer.zoneName} - ` : ""}
              {selectedContainer.status ?? "available"} -{" "}
              {formatCoordinates(selectedContainer.latitude, selectedContainer.longitude)}
            </Text>
            <Text variant="bodyMedium" style={styles.muted}>
              Selection source: {locationSource.toUpperCase()}
              {capturedLocation
                ? ` - Device position ${formatCoordinates(
                    capturedLocation.latitude,
                    capturedLocation.longitude
                  )}`
                : ""}
            </Text>
            <View style={styles.actionRow}>
              <Button mode="contained" onPress={() => setIsComposerVisible(true)}>
                Report issue
              </Button>
              <Button mode="outlined" onPress={() => router.push("/(tabs)/history")}>
                History
              </Button>
            </View>
          </View>
        </InfoCard>
      ) : (
        <InfoCard title="Selection required">
          <HelperText type="info" visible>
            Select a mapped container before opening the report composer.
          </HelperText>
        </InfoCard>
      )}

      {duplicateHistoryItem ? (
        <InfoCard title="Duplicate blocked">
          <View style={styles.warningCard}>
            <Text variant="titleMedium" style={styles.warningTitle}>
              Already reported recently
            </Text>
            <Text variant="bodyMedium" style={styles.muted}>
              This container was already reported{" "}
              {formatRelativeReportTime(duplicateHistoryItem.reportedAt)}. Wait until the one-hour
              window expires.
            </Text>
          </View>
        </InfoCard>
      ) : null}

      <InfoCard title="Nearby containers">
        <View style={styles.nearbyList}>
          {nearbyContainers.length > 0 ? (
            nearbyContainers.map((container, index) => (
              <Pressable
                key={container.id}
                onPress={() => focusContainer(container, "container", { recenterMap: false })}
                style={({ pressed }) => [
                  styles.nearbyCard,
                  container.id === selectedContainerId ? styles.nearbySelected : null,
                  pressed ? styles.nearbyPressed : null
                ]}
              >
                <View style={styles.nearbyHeader}>
                  <View style={styles.nearbyIdentity}>
                    <View style={styles.nearbyRankBadge}>
                      <Text variant="labelLarge" style={styles.nearbyRankText}>
                        {index + 1}
                      </Text>
                    </View>
                    <Text variant="titleMedium" style={styles.nearbyTitle}>
                      {container.code} - {container.label}
                    </Text>
                  </View>
                  <Text variant="labelLarge" style={styles.nearbyDistance}>
                    {formatDistanceMeters(container.distanceMeters)}
                  </Text>
                </View>
                <Text variant="bodySmall" style={styles.muted}>
                  {container.zoneName ? `${container.zoneName} - ` : ""}
                  {container.status ?? "available"}
                </Text>
              </Pressable>
            ))
          ) : (
            <Text variant="bodyMedium" style={styles.muted}>
              Use GPS to rank nearby mapped containers around your current position.
            </Text>
          )}
        </View>
      </InfoCard>

      {errorMessage ? (
        <InfoCard title="Error">
          <HelperText type="error" visible>
            {errorMessage}
          </HelperText>
        </InfoCard>
      ) : null}

      {lastSubmission ? (
        <InfoCard title="Sent">
          <View style={styles.successCard}>
            <Text variant="titleMedium">
              {lastSubmission.container.code} - {lastSubmission.container.label}
            </Text>
            <Text variant="bodyMedium" style={styles.muted}>
              {lastSubmission.response.confirmationMessage}
            </Text>
            <View style={styles.chipRow}>
              <Chip>+{lastSubmission.response.gamification.pointsAwarded} points</Chip>
              <Chip>
                {lastSubmission.response.managerNotificationQueued
                  ? "Manager notified"
                  : "Notification queued"}
              </Chip>
              <Chip>
                {lastSubmission.location
                  ? formatCoordinates(
                      lastSubmission.location.latitude,
                      lastSubmission.location.longitude
                    )
                  : "No coordinates"}
              </Chip>
            </View>
            <View style={styles.actionRow}>
              <Button mode="contained" onPress={() => router.push("/(tabs)/history")}>
                View history
              </Button>
              <Button mode="outlined" onPress={() => router.push("/(tabs)/challenges")}>
                View challenges
              </Button>
            </View>
          </View>
        </InfoCard>
      ) : null}

      <BottomSheet
        visible={isComposerVisible}
        title="Signaler un probleme"
        subtitle={
          selectedContainer
            ? `${selectedContainer.code} - ${selectedContainer.label}`
            : "Select a mapped container first"
        }
        onDismiss={() => setIsComposerVisible(false)}
        footer={
          <View style={styles.footerActions}>
            <Button
              mode="outlined"
              style={styles.footerButton}
              onPress={() => setIsComposerVisible(false)}
            >
              Cancel
            </Button>
            <Button
              mode="contained"
              style={styles.footerButton}
              loading={createReportMutation.isPending}
              disabled={!selectedContainer || Boolean(duplicateHistoryItem)}
              onPress={() => createReportMutation.mutate()}
            >
              Send report
            </Button>
          </View>
        }
      >
        {duplicateHistoryItem ? (
          <View style={styles.warningCard}>
            <Text variant="titleSmall" style={styles.warningTitle}>
              Duplicate prevented before submit
            </Text>
            <Text variant="bodyMedium" style={styles.muted}>
              Wait until the one-hour window expires before sending another report for this
              container.
            </Text>
          </View>
        ) : null}
        <View style={styles.reportTypeList}>
          <View style={styles.locationCard}>
            <Text variant="titleMedium">Location evidence</Text>
            <Text variant="bodySmall" style={styles.muted}>
              {capturedLocation
                ? `Current device position: ${formatCoordinates(
                    capturedLocation.latitude,
                    capturedLocation.longitude
                  )}`
                : "No device position yet. You can refresh it now or the app will request it when sending the report."}
            </Text>
            <Button
              mode="outlined"
              icon="crosshairs-gps"
              loading={isLocating}
              onPress={handleComposerLocationRefresh}
            >
              Refresh location
            </Button>
          </View>
          {citizenReportTypes.map((item) => (
            <Pressable
              key={item.value}
              onPress={() => setReportType(item.value)}
              style={styles.reportTypeRow}
            >
              <RadioButton
                value={item.value}
                status={reportType === item.value ? "checked" : "unchecked"}
              />
              <View style={styles.reportTypeCopy}>
                <Text variant="titleMedium" style={styles.reportTypeLabel}>
                  {item.label}
                </Text>
                <Text variant="bodySmall" style={styles.muted}>
                  {item.helper}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>
        <TextInput
          mode="outlined"
          label="Additional details"
          multiline
          numberOfLines={4}
          value={description}
          onChangeText={setDescription}
          placeholder="Optional context for operations"
        />
        <View style={styles.stack}>
          <Text variant="titleMedium">Photo evidence</Text>
          <Button
            mode="outlined"
            icon="camera-outline"
            loading={isCapturingPhoto}
            onPress={handleComposerCameraCapture}
          >
            {photoEvidence ? "Retake photo" : "Capture photo"}
          </Button>
          {photoEvidence ? (
            <>
              <Image
                source={{ uri: photoEvidence.uri }}
                resizeMode="cover"
                style={[styles.photoPreview, { aspectRatio: photoPreviewAspectRatio }]}
              />
              <Text variant="bodySmall" style={styles.muted}>
                Coordinates:{" "}
                {capturedLocation
                  ? formatCoordinates(capturedLocation.latitude, capturedLocation.longitude)
                  : "Captured when submitting"}
              </Text>
            </>
          ) : null}
        </View>
      </BottomSheet>

      <BottomSheet
        visible={activePrimer !== null}
        title={activePrimer?.action === "camera" ? "Camera permission" : "Location permission"}
        subtitle={activePrimer?.action === "camera" ? "Photo access" : "Location access"}
        onDismiss={() => setActivePrimer(null)}
        footer={
          <View style={styles.footerActions}>
            <Button
              mode="outlined"
              style={styles.footerButton}
              onPress={() => setActivePrimer(null)}
            >
              Not now
            </Button>
            <Button mode="contained" style={styles.footerButton} onPress={handleContinuePrimer}>
              Continue
            </Button>
          </View>
        }
      >
        <Text variant="bodyMedium">
          {activePrimer?.action === "camera"
            ? "Allow camera to add a photo."
            : "Allow location to center the map on your position and highlight nearby containers."}
        </Text>
      </BottomSheet>
    </ScreenContainer>
  );
}
