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
  ProgressBar,
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
import {
  captureCurrentLocation,
  captureCurrentLocationIfAvailable,
  type CapturedLocation
} from "@/device/location";
import {
  captureCameraPhoto,
  resolvePhotoPreviewAspectRatio,
  type CapturedPhoto
} from "@/device/media";
import {
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
import {
  bearingDegrees,
  clusterViewportTargets,
  projectCoordinateToViewport,
  rankContainersByDistance,
  toCoordinateNumber
} from "@/lib/geo";
import { queryKeys } from "@/lib/queryKeys";
import { useSession } from "@/providers/SessionProvider";
import type { AppTheme } from "@/theme/theme";
import { useAppTheme, useThemedStyles } from "@/theme/useAppTheme";
import {
  buildCameraStatusMessage,
  buildCitizenReportPayload,
  buildGpsStatusMessage,
  PHOTO_CAPTURE_CANCELED_STATUS,
  PHOTO_LOCATION_UNAVAILABLE_STATUS,
  REPORT_SENT_STATUS,
  shouldShowStatusMessage
} from "./reportFlow";

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
  leftPercent: number;
  topPercent: number;
  travelX: number;
  travelY: number;
  isVisible: boolean;
};

type OffscreenIndicatorCluster = {
  primaryIndicator: NearbyMapIndicator;
  indicators: NearbyMapIndicator[];
  leftPercent: number;
  topPercent: number;
};

type MapPopupState = {
  container: ContainerOption;
  fillLabel: string;
  fillColor: string;
  leftPercent: number;
  topPercent: number;
};

type NativeMapPressEvent = {
  nativeEvent?: {
    action?: string;
  };
};

const HIGHLIGHTED_NEARBY_LIMIT = 5;
const MAP_POPUP_WIDTH = 168;
const MAP_POPUP_CARD_MIN_HEIGHT = 40;
const MAP_POPUP_CARET_SIZE = 14;
const MAP_POPUP_VERTICAL_OFFSET = MAP_POPUP_CARD_MIN_HEIGHT + MAP_POPUP_CARET_SIZE / 2;
const MAP_VIEWPORT_PADDING = {
  horizontal: 12,
  vertical: 14
};
const USER_FOCUS_BASE_RADIUS_METERS = 100;
const INDICATOR_TRAVEL_DISTANCE = 4;
const INDICATOR_CLUSTER_THRESHOLD = 8;
const MAP_REGION_EPSILON = 0.00005;

const metersToLatitudeDelta = (meters: number) => meters / 111_320;

const metersToLongitudeDelta = (meters: number, latitude: number) => {
  const latitudeRadians = (latitude * Math.PI) / 180;
  const metersPerDegree = 111_320 * Math.max(Math.cos(latitudeRadians), 0.2);

  return meters / metersPerDegree;
};

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
    muted: { color: theme.colors.textMuted, lineHeight: 20 },
    chipRow: { flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.xs },
    chipMeta: { color: theme.colors.textMuted },
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
    mapPopupLayer: {
      ...StyleSheet.absoluteFillObject
    },
    mapPopupCard: {
      position: "absolute",
      width: MAP_POPUP_WIDTH,
      minHeight: MAP_POPUP_CARD_MIN_HEIGHT,
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: theme.shape.pill,
      borderWidth: 1,
      borderColor: theme.colors.borderSoft,
      backgroundColor: theme.colors.surfaceElevated,
      shadowColor: theme.colors.shadow,
      shadowOffset: {
        width: 0,
        height: 6
      },
      shadowOpacity: theme.dark ? 0.24 : 0.12,
      shadowRadius: 14,
      elevation: 4
    },
    mapPopupTitle: {
      flex: 1,
      color: theme.colors.onSurface,
      fontWeight: "700"
    },
    mapPopupPill: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: theme.shape.pill
    },
    mapPopupPillText: {
      color: theme.colors.onPrimary,
      fontWeight: "700"
    },
    mapPopupCaret: {
      position: "absolute",
      bottom: -(MAP_POPUP_CARET_SIZE / 2),
      left: "50%",
      width: MAP_POPUP_CARET_SIZE,
      height: MAP_POPUP_CARET_SIZE,
      borderRadius: 3,
      backgroundColor: theme.colors.surfaceElevated,
      borderRightWidth: 1,
      borderBottomWidth: 1,
      borderColor: theme.colors.borderSoft,
      transform: [{ translateX: -(MAP_POPUP_CARET_SIZE / 2) }, { rotate: "45deg" }]
    },
    mapIndicatorLayer: {
      ...StyleSheet.absoluteFillObject
    },
    mapIndicatorCard: {
      position: "absolute",
      width: 40,
      height: 40,
      borderRadius: theme.shape.pill,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "transparent"
    },
    mapIndicatorPulse: {
      position: "absolute",
      width: 22,
      height: 22,
      borderRadius: theme.shape.pill,
      backgroundColor: theme.colors.success
    },
    mapIndicatorPressed: {
      opacity: 0.92
    },
    mapIndicatorArrow: {
      color: theme.colors.success,
      textShadowColor: theme.dark ? "rgba(9, 15, 28, 0.48)" : "rgba(9, 15, 28, 0.22)",
      textShadowOffset: {
        width: 0,
        height: 4
      },
      textShadowRadius: 10
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
    fillPanel: {
      gap: theme.spacing.xs,
      padding: theme.spacing.sm,
      borderRadius: theme.shape.md,
      borderWidth: 1,
      borderColor: theme.colors.borderSoft,
      backgroundColor: theme.colors.surface
    },
    fillPanelCompact: {
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.sm
    },
    fillHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      gap: theme.spacing.sm
    },
    fillTitle: {
      color: theme.colors.onSurface,
      fontWeight: "700"
    },
    fillPill: {
      minWidth: 60,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: theme.shape.pill,
      alignItems: "center",
      justifyContent: "center"
    },
    fillPillText: {
      color: theme.colors.onPrimary,
      fontWeight: "700"
    },
    fillProgress: {
      height: 10,
      borderRadius: theme.shape.pill,
      backgroundColor: theme.colors.surfaceMuted
    },
    fillMeta: {
      color: theme.colors.textMuted,
      lineHeight: 18
    },
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

const normalizeFillLevelPercent = (value?: number | null) => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  return Math.min(Math.max(Math.round(value), 0), 100);
};

const resolveContainerFillPresentation = (
  container: ContainerOption,
  theme: AppTheme
) => {
  const percent = normalizeFillLevelPercent(container.fillLevelPercent);

  if (percent == null) {
    return {
      color: theme.colors.textMuted,
      helperText: "Fill telemetry unavailable for this container.",
      label: "Fill unavailable",
      progress: 0,
      summary: "Fill unknown"
    };
  }

  if (percent > 75) {
    return {
      color: theme.colors.error,
      helperText: "High fill level. This container likely needs urgent pickup.",
      label: `${percent}% full`,
      progress: percent / 100,
      summary: `${percent}% full - high fill`
    };
  }

  if (percent >= 50) {
    return {
      color: theme.colors.warning,
      helperText: "Medium fill level. Capacity is getting limited.",
      label: `${percent}% full`,
      progress: percent / 100,
      summary: `${percent}% full - medium fill`
    };
  }

  return {
    color: theme.colors.success,
    helperText: "Low fill level. This container still has available capacity.",
    label: `${percent}% full`,
    progress: percent / 100,
    summary: `${percent}% full - low fill`
  };
};

const resolveMarkerColor = (
  container: ContainerOption,
  selectedContainerId: string | null,
  nearbyContainerIds: Set<string>,
  theme: AppTheme
) => {
  const fillPresentation = resolveContainerFillPresentation(container, theme);

  if (fillPresentation.color !== theme.colors.textMuted) {
    return fillPresentation.color;
  }

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
  const mapRegionRef = useRef<MapRegion | null>(null);
  const indicatorPulse = useRef(new Animated.Value(0)).current;
  const indicatorAnimationRef = useRef<Animated.CompositeAnimation | null>(null);
  const { isAuthenticated, isLoading: isSessionLoading } = useSession();
  const [selectedContainerId, setSelectedContainerId] = useState<string | null>(null);
  const [activeMapCalloutId, setActiveMapCalloutId] = useState<string | null>(null);
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
  const selectedContainerFill = useMemo(
    () =>
      selectedContainer ? resolveContainerFillPresentation(selectedContainer, theme) : null,
    [selectedContainer, theme]
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
  const isMapCenteredOnUser = useMemo(() => {
    const latitude = toCoordinateNumber(capturedLocation?.latitude);
    const longitude = toCoordinateNumber(capturedLocation?.longitude);

    if (latitude == null || longitude == null || !mapRegion) {
      return false;
    }

    return (
      Math.abs(mapRegion.latitude - latitude) <= mapRegion.latitudeDelta * 0.12 &&
      Math.abs(mapRegion.longitude - longitude) <= mapRegion.longitudeDelta * 0.12
    );
  }, [capturedLocation, mapRegion]);
  const nearbyMapIndicators = useMemo<NearbyMapIndicator[]>(() => {
    if (!capturedLocation || !mapRegion) {
      return [];
    }

    const viewportOrigin = {
      latitude: String(mapRegion.latitude),
      longitude: String(mapRegion.longitude)
    };

    return nearbyContainers
      .slice(0, HIGHLIGHTED_NEARBY_LIMIT)
      .map((container) => {
        const bearing =
          bearingDegrees(viewportOrigin, container) ?? bearingDegrees(capturedLocation, container);
        const projection = projectCoordinateToViewport(mapRegion, container, MAP_VIEWPORT_PADDING);

        if (bearing == null || projection == null) {
          return null;
        }

        const directionRadians = (bearing * Math.PI) / 180;

        return {
          ...container,
          bearing,
          leftPercent: projection.leftPercent,
          topPercent: projection.topPercent,
          travelX: Math.sin(directionRadians) * INDICATOR_TRAVEL_DISTANCE,
          travelY: -Math.cos(directionRadians) * INDICATOR_TRAVEL_DISTANCE,
          isVisible: projection.isVisible
        };
      })
      .filter((container): container is NearbyMapIndicator => Boolean(container));
  }, [capturedLocation, mapRegion, nearbyContainers]);
  const offscreenNearbyIndicators = useMemo(
    () => nearbyMapIndicators.filter((container) => !container.isVisible),
    [nearbyMapIndicators]
  );
  const offscreenIndicatorClusters = useMemo<OffscreenIndicatorCluster[]>(
    () =>
      clusterViewportTargets(offscreenNearbyIndicators, INDICATOR_CLUSTER_THRESHOLD).map(
        (cluster) => ({
          primaryIndicator: cluster.primaryItem,
          indicators: cluster.items,
          leftPercent: cluster.leftPercent,
          topPercent: cluster.topPercent
        })
      ),
    [offscreenNearbyIndicators]
  );
  const activeMapPopup = useMemo<MapPopupState | null>(() => {
    if (!mapRegion || !activeMapCalloutId) {
      return null;
    }

    const container =
      (selectedContainer?.id === activeMapCalloutId
        ? selectedContainer
        : mapContainers.find((item) => item.id === activeMapCalloutId)) ?? null;

    if (!container) {
      return null;
    }

    const projection = projectCoordinateToViewport(mapRegion, container, {
      horizontal: 22,
      vertical: 24
    });

    if (!projection?.isVisible) {
      return null;
    }

    const fillPresentation = resolveContainerFillPresentation(container, theme);

    return {
      container,
      fillLabel: fillPresentation.label,
      fillColor: fillPresentation.color,
      leftPercent: projection.rawLeftPercent,
      topPercent: projection.rawTopPercent
    };
  }, [activeMapCalloutId, mapContainers, mapRegion, selectedContainer, theme]);
  const photoPreviewAspectRatio = resolvePhotoPreviewAspectRatio(photoEvidence);
  const pulseScale = indicatorPulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.35]
  });
  const pulseOpacity = indicatorPulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.24, 0]
  });
  const directionalTravel = indicatorPulse.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [-0.35, 1, -0.35]
  });
  const indicatorScale = indicatorPulse.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 1.06, 1]
  });

  useEffect(() => {
    mapRegionRef.current = mapRegion;
  }, [mapRegion]);

  useEffect(() => {
    if (mapRegion || mapContainers.length === 0) {
      return;
    }

    const nearestMatch = capturedLocation ? resolveNearestContainer(mapContainers, capturedLocation) : null;
    const initialContainer = nearestMatch ?? mapContainers[0];
    const nextRegion = buildMapRegion(initialContainer);

    if (nextRegion) {
      commitMapRegion(nextRegion);
      setSelectedContainerId((currentValue) => currentValue ?? initialContainer.id);
    }
  }, [capturedLocation, mapContainers, mapRegion]);

  useEffect(() => {
    indicatorAnimationRef.current?.stop();
    indicatorPulse.stopAnimation();

    if (!capturedLocation || offscreenIndicatorClusters.length === 0) {
      indicatorPulse.setValue(0);
      indicatorAnimationRef.current = null;
      return;
    }

    const nextAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(indicatorPulse, {
          duration: 950,
          toValue: 1,
          useNativeDriver: true
        }),
        Animated.timing(indicatorPulse, {
          duration: 950,
          toValue: 0,
          useNativeDriver: true
        })
      ])
    );

    indicatorAnimationRef.current = nextAnimation;
    nextAnimation.start();

    return () => {
      nextAnimation.stop();
      indicatorPulse.stopAnimation();
      indicatorPulse.setValue(0);
      indicatorAnimationRef.current = null;
    };
  }, [capturedLocation, indicatorPulse, offscreenIndicatorClusters.length]);

  const commitMapRegion = (nextRegion: MapRegion) => {
    const currentRegion = mapRegionRef.current;

    if (
      currentRegion &&
      Math.abs(currentRegion.latitude - nextRegion.latitude) <= MAP_REGION_EPSILON &&
      Math.abs(currentRegion.longitude - nextRegion.longitude) <= MAP_REGION_EPSILON &&
      Math.abs(currentRegion.latitudeDelta - nextRegion.latitudeDelta) <= MAP_REGION_EPSILON &&
      Math.abs(currentRegion.longitudeDelta - nextRegion.longitudeDelta) <= MAP_REGION_EPSILON
    ) {
      return;
    }

    mapRegionRef.current = nextRegion;
    setMapRegion(nextRegion);
  };

  const handleMapRegionChangeComplete = (nextRegion: MapRegion) => {
    commitMapRegion(nextRegion);
  };

  const handleMapPress = (event?: NativeMapPressEvent) => {
    if (event?.nativeEvent?.action && event.nativeEvent.action !== "press") {
      return;
    }

    setActiveMapCalloutId(null);
  };

  const centerMapOnUserPosition = (
    location: CapturedLocation,
    _containersToHighlight: ContainerOption[]
  ) => {
    const latitude = toCoordinateNumber(location.latitude);
    const longitude = toCoordinateNumber(location.longitude);

    if (latitude == null || longitude == null) {
      return;
    }

    const baseLatitudeDelta = metersToLatitudeDelta(USER_FOCUS_BASE_RADIUS_METERS * 2);
    const baseLongitudeDelta = metersToLongitudeDelta(USER_FOCUS_BASE_RADIUS_METERS * 2, latitude);

    const nextRegion = {
      latitude,
      longitude,
      latitudeDelta: baseLatitudeDelta,
      longitudeDelta: baseLongitudeDelta
    };

    commitMapRegion(nextRegion);
    mapRef.current?.animateToRegion?.(nextRegion, 240);
  };

  const focusContainer = (
    container: ContainerOption,
    source: LocationSource,
    options?: {
      recenterMap?: boolean;
      showMapCallout?: boolean;
    }
  ) => {
    const shouldRecenterMap = options?.recenterMap ?? true;
    const shouldShowMapCallout = options?.showMapCallout ?? false;

    setSelectedContainerId(container.id);
    setLocationSource(source);
    setErrorMessage(null);
    setActiveMapCalloutId(shouldShowMapCallout ? container.id : null);

    if (shouldRecenterMap) {
      const nextRegion = buildMapRegion(container);
      if (nextRegion) {
        commitMapRegion(nextRegion);
        mapRef.current?.animateToRegion?.(nextRegion, 240);
      }
    }

    Vibration.vibrate(10);
  };

  const runGpsCapture = async (origin: "discover" | "composer") => {
    setIsLocating(true);
    setErrorMessage(null);
    setStatusMessage(null);

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
          focusContainer(nearestContainer, "gps", {
            recenterMap: false,
            showMapCallout: true
          });
        }

        setStatusMessage(
          buildGpsStatusMessage(origin, nearestMatches.length)
        );
      } else {
        setStatusMessage(buildGpsStatusMessage(origin, nearestMatches.length));
      }
    } catch (error) {
      setStatusMessage(null);
      setErrorMessage(error instanceof Error ? error.message : "Unable to capture your location.");
    } finally {
      setIsLocating(false);
    }
  };

  const runCameraCapture = async (origin: "discover" | "composer") => {
    setIsCapturingPhoto(true);
    setErrorMessage(null);
    setStatusMessage(null);

    try {
      const photo = await captureCameraPhoto();

      if (!photo) {
        setStatusMessage(PHOTO_CAPTURE_CANCELED_STATUS);
        return;
      }

      setPhotoEvidence(photo);

      const location = await captureCurrentLocationIfAvailable();
      if (!location) {
        setStatusMessage(PHOTO_LOCATION_UNAVAILABLE_STATUS);
        return;
      }

      setCapturedLocation(location);
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

        setStatusMessage(buildCameraStatusMessage(origin, nearestMatches.length));
      } else {
        setStatusMessage(buildCameraStatusMessage(origin, nearestMatches.length));
      }
    } catch (error) {
      setStatusMessage(null);
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

    if (capturedLocation) {
      const cachedNearestMatches = rankContainersByDistance(
        capturedLocation,
        mapContainers,
        HIGHLIGHTED_NEARBY_LIMIT
      );
      const nearestContainer =
        cachedNearestMatches[0] ?? resolveNearestContainer(mapContainers, capturedLocation);

      centerMapOnUserPosition(capturedLocation, cachedNearestMatches);
      setLocationSource("gps");
      setStatusMessage(
        cachedNearestMatches.length > 0
          ? `Map recentered on your position with ${cachedNearestMatches.length} nearby containers.`
          : "Map recentered on your position."
      );

      if (nearestContainer) {
        focusContainer(nearestContainer, "gps", {
          recenterMap: false,
          showMapCallout: true
        });
      }
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
    focusContainer(container, "container", { showMapCallout: true });
    startTransition(() => setSearchText(""));
  };

  const createReportMutation = useMutation({
    mutationFn: async () => {
      setStatusMessage(null);

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

      const response = await citizenApi.createReport(
        buildCitizenReportPayload({
          containerId: selectedContainer.id,
          description,
          location: resolvedLocation,
          photoEvidence,
          reportType
        })
      );

      return {
        response,
        container: selectedContainer,
        location: resolvedLocation,
        photo: photoEvidence
      };
    },
    onSuccess: (result) => {
      setLastSubmission(result);
      setStatusMessage(REPORT_SENT_STATUS);
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
      setStatusMessage(null);
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
                    onPress={() =>
                      focusContainer(container, "container", { showMapCallout: true })
                    }
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
        </View>
      </InfoCard>

      <View style={styles.mapFrame}>
        {NativeMapView && NativeMarker && mapRegion ? (
          <View>
            <NativeMapView
              ref={mapRef}
              initialRegion={mapRegion}
              onRegionChangeComplete={(nextRegion: MapRegion) =>
                handleMapRegionChangeComplete(nextRegion)
              }
              onPress={handleMapPress}
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
                  pinColor={resolveMarkerColor(
                    container,
                    selectedContainerId,
                    nearbyContainerIds,
                    theme
                  )}
                  onPress={() =>
                    focusContainer(container, "container", { showMapCallout: true })
                  }
                />
              ))}
            </NativeMapView>
            <View style={styles.mapStatusRow} pointerEvents="box-none">
              {capturedLocation ? (
                <>
                  <View style={styles.mapStatusPill}>
                    <Text variant="labelSmall" style={styles.mapStatusText}>
                      {isMapCenteredOnUser ? "You are centered" : "GPS ready"}
                    </Text>
                  </View>
                  <View style={styles.mapStatusPill}>
                    <Text variant="labelSmall" style={styles.mapStatusText}>
                      {offscreenNearbyIndicators.length > 0
                        ? `${offscreenNearbyIndicators.length} offscreen`
                        : `${nearbyContainers.length} nearby visible`}
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
            {activeMapPopup ? (
              <View pointerEvents="none" style={styles.mapPopupLayer}>
                <View
                  style={[
                    styles.mapPopupCard,
                    {
                      left: `${activeMapPopup.leftPercent}%`,
                      top: `${activeMapPopup.topPercent}%`,
                      transform: [
                        { translateX: -(MAP_POPUP_WIDTH / 2) },
                        { translateY: -MAP_POPUP_VERTICAL_OFFSET }
                      ]
                    }
                  ]}
                >
                  <Text numberOfLines={1} variant="titleSmall" style={styles.mapPopupTitle}>
                    {activeMapPopup.container.code}
                  </Text>
                  <View
                    style={[
                      styles.mapPopupPill,
                      {
                        backgroundColor: activeMapPopup.fillColor
                      }
                    ]}
                  >
                    <Text variant="labelLarge" style={styles.mapPopupPillText}>
                      {activeMapPopup.fillLabel}
                    </Text>
                  </View>
                  <View style={styles.mapPopupCaret} />
                </View>
              </View>
            ) : null}
            {capturedLocation && offscreenIndicatorClusters.length > 0 ? (
              <View pointerEvents="box-none" style={styles.mapIndicatorLayer}>
                {offscreenIndicatorClusters.map((cluster, index) => (
                  <Pressable
                    key={`indicator-${cluster.primaryIndicator.id}`}
                    hitSlop={8}
                    onPress={() =>
                      focusContainer(cluster.primaryIndicator, "container", {
                        showMapCallout: true
                      })
                    }
                    style={({ pressed }) => [
                      styles.mapIndicatorCard,
                      {
                        left: `${cluster.leftPercent}%`,
                        top: `${cluster.topPercent}%`,
                        zIndex: offscreenIndicatorClusters.length - index,
                        transform: [{ translateX: -20 }, { translateY: -20 }]
                      },
                      pressed ? styles.mapIndicatorPressed : null
                    ]}
                  >
                    <Animated.View
                      pointerEvents="none"
                      style={[
                        styles.mapIndicatorPulse,
                        {
                          opacity: pulseOpacity,
                          transform: [{ scale: pulseScale }]
                        }
                      ]}
                    />
                    <Animated.View
                      style={{
                        alignItems: "center",
                        justifyContent: "center",
                        transform: [
                          {
                            translateX: Animated.multiply(
                              directionalTravel,
                              cluster.primaryIndicator.travelX
                            )
                          },
                          {
                            translateY: Animated.multiply(
                              directionalTravel,
                              cluster.primaryIndicator.travelY
                            )
                          },
                          { scale: indicatorScale }
                        ]
                      }}
                    >
                      <MaterialCommunityIcons
                        name="arrow-up-bold-circle"
                        size={cluster.primaryIndicator.id === selectedContainerId ? 22 : 20}
                        style={[
                          styles.mapIndicatorArrow,
                          {
                            color:
                              cluster.primaryIndicator.id === selectedContainerId
                                ? theme.colors.primaryStrong
                                : theme.colors.success,
                            transform: [{ rotate: `${cluster.primaryIndicator.bearing}deg` }]
                          }
                        ]}
                      />
                    </Animated.View>
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
              {selectedContainer.status ?? "available"}
            </Text>
            {selectedContainerFill ? (
              <View style={styles.fillPanel}>
                <View style={styles.fillHeader}>
                  <Text variant="labelLarge" style={styles.fillTitle}>
                    Container progress
                  </Text>
                  <View
                    style={[
                      styles.fillPill,
                      {
                        backgroundColor: selectedContainerFill.color
                      }
                    ]}
                  >
                    <Text variant="labelLarge" style={styles.fillPillText}>
                      {selectedContainerFill.label}
                    </Text>
                  </View>
                </View>
                <ProgressBar
                  progress={selectedContainerFill.progress}
                  color={selectedContainerFill.color}
                  style={styles.fillProgress}
                />
                <Text variant="bodySmall" style={styles.fillMeta}>
                  {selectedContainerFill.helperText}
                </Text>
              </View>
            ) : null}
            <Text variant="bodyMedium" style={styles.muted}>
              Location -{" "}
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

      {shouldShowStatusMessage(statusMessage, errorMessage) ? (
        <InfoCard title="Status">
          <HelperText type="info" visible>
            {statusMessage}
          </HelperText>
        </InfoCard>
      ) : null}

      <InfoCard title="Nearby containers">
        <View style={styles.nearbyList}>
          {nearbyContainers.length > 0 ? (
            nearbyContainers.map((container, index) => {
              const fillPresentation = resolveContainerFillPresentation(container, theme);

              return (
                <Pressable
                  key={container.id}
                  onPress={() =>
                    focusContainer(container, "container", { showMapCallout: true })
                  }
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
                    {container.status ?? "available"} - {fillPresentation.summary}
                  </Text>
                  <View style={[styles.fillPanel, styles.fillPanelCompact]}>
                    <View style={styles.fillHeader}>
                      <Text variant="labelLarge" style={styles.fillTitle}>
                        Container progress
                      </Text>
                      <View
                        style={[
                          styles.fillPill,
                          {
                            backgroundColor: fillPresentation.color
                          }
                        ]}
                      >
                        <Text variant="labelLarge" style={styles.fillPillText}>
                          {fillPresentation.label}
                        </Text>
                      </View>
                    </View>
                    <ProgressBar
                      progress={fillPresentation.progress}
                      color={fillPresentation.color}
                      style={styles.fillProgress}
                    />
                  </View>
                </Pressable>
              );
            })
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
