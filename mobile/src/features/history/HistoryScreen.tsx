import { useState } from "react";
import { Image, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { Button, Chip, Text } from "react-native-paper";

import { citizenApi } from "@api/modules/citizen";
import { AppStateScreen } from "@/components/AppStateScreen";
import { InfoCard } from "@/components/InfoCard";
import { ScreenContainer } from "@/components/ScreenContainer";
import {
  citizenReportTypes,
  formatCitizenReportTypeLabel,
  formatRelativeReportTime,
  type CitizenReportType
} from "@/lib/citizenReports";
import { formatCoordinates, formatDateTime } from "@/lib/formatters";
import { queryKeys } from "@/lib/queryKeys";
import type { AppTheme } from "@/theme/theme";
import { useThemedStyles } from "@/theme/useAppTheme";

type HistoryFilter = "all" | CitizenReportType;

const createStyles = (theme: AppTheme) =>
  ({
    chipRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: theme.spacing.xs
    },
    chip: {
      backgroundColor: theme.colors.surfaceMuted
    },
    timelineList: {
      gap: theme.spacing.md
    },
    timelineCard: {
      gap: theme.spacing.sm,
      paddingLeft: theme.spacing.md,
      borderLeftWidth: 3,
      borderLeftColor: theme.colors.primary
    },
    timelineHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      gap: theme.spacing.sm
    },
    timelineTitle: {
      flex: 1,
      color: theme.colors.onSurface,
      fontWeight: "700"
    },
    timelineMeta: {
      color: theme.colors.textMuted,
      lineHeight: 20
    },
    timelineStatus: {
      alignSelf: "flex-start",
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: 4,
      borderRadius: theme.shape.pill,
      backgroundColor: theme.colors.primarySurface
    },
    timelineStatusText: {
      color: theme.colors.primaryStrong,
      fontWeight: "700"
    },
    paginationRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: theme.spacing.sm
    },
    paginationButton: {
      flex: 1,
      minWidth: 120
    },
    photoEvidence: {
      width: "100%",
      height: 180,
      borderRadius: theme.shape.md
    }
  }) satisfies Record<string, object>;

export function HistoryScreen() {
  const styles = useThemedStyles(createStyles);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<HistoryFilter>("all");
  const pageSize = 8;
  const historyQuery = useQuery({
    queryKey: queryKeys.citizenHistory(page, pageSize),
    queryFn: () => citizenApi.getHistory(page, pageSize)
  });

  if (historyQuery.isLoading) {
    return (
      <AppStateScreen
        title="Loading history"
        description="EcoTrack is fetching your citizen report history."
        isBusy
      />
    );
  }

  if (historyQuery.isError) {
    return (
      <AppStateScreen
        title="History unavailable"
        description={
          historyQuery.error instanceof Error
            ? historyQuery.error.message
            : "Unable to load citizen history."
        }
        actionLabel="Retry"
        onAction={() => {
          void historyQuery.refetch();
        }}
      />
    );
  }

  if (!historyQuery.data) {
    return (
      <AppStateScreen
        title="History unavailable"
        description="The citizen history endpoint returned no payload."
      />
    );
  }

  const history = historyQuery.data.history;
  const pagination = historyQuery.data.pagination;
  const filteredHistory = history.filter((item) => filter === "all" || item.reportType === filter);

  return (
    <ScreenContainer
      eyebrow="History"
      title="History"
      description="Reports and status."
    >
      <InfoCard title="Filters">
        <View style={styles.chipRow}>
          <Chip selected={filter === "all"} style={styles.chip} onPress={() => setFilter("all")}>
            All
          </Chip>
          {citizenReportTypes.map((item) => (
            <Chip
              key={item.value}
              selected={filter === item.value}
              style={styles.chip}
              onPress={() => setFilter(item.value)}
            >
              {item.label}
            </Chip>
          ))}
        </View>
      </InfoCard>

      {filteredHistory.length === 0 ? (
        <InfoCard
          title="No reports"
        >
          <Text variant="bodyMedium">Create a report or change the filter.</Text>
        </InfoCard>
      ) : (
        <InfoCard title="Timeline">
          <View style={styles.timelineList}>
            {filteredHistory.map((item) => (
              <View key={item.id} style={styles.timelineCard}>
                <View style={styles.timelineHeader}>
                  <Text variant="titleMedium" style={styles.timelineTitle}>
                    {item.containerCode ?? "Container"}
                    {item.containerLabel ? ` - ${item.containerLabel}` : ""}
                  </Text>
                  <Text variant="bodySmall" style={styles.timelineMeta}>
                    {formatRelativeReportTime(item.reportedAt)}
                  </Text>
                </View>
                <View style={styles.timelineStatus}>
                  <Text variant="labelLarge" style={styles.timelineStatusText}>
                    {formatCitizenReportTypeLabel(item.reportType)} | {item.status}
                  </Text>
                </View>
                <Text variant="bodyMedium">{item.description}</Text>
                <Text variant="bodySmall" style={styles.timelineMeta}>
                  Reported: {formatDateTime(item.reportedAt)}
                </Text>
                <Text variant="bodySmall" style={styles.timelineMeta}>
                  Location: {formatCoordinates(item.latitude, item.longitude)}
                </Text>
                {item.photoUrl ? (
                  <Image source={{ uri: item.photoUrl }} style={styles.photoEvidence} resizeMode="cover" />
                ) : null}
              </View>
            ))}
          </View>
        </InfoCard>
      )}

      <InfoCard title="Pages">
        <Text variant="bodyMedium">
          Page {pagination.page} of {Math.max(1, Math.ceil(pagination.total / pagination.pageSize))}
        </Text>
        <View style={styles.paginationRow}>
          <Button
            mode="outlined"
            style={styles.paginationButton}
            disabled={page <= 1}
            onPress={() => setPage((currentPage) => Math.max(1, currentPage - 1))}
          >
            Previous
          </Button>
          <Button
            mode="outlined"
            style={styles.paginationButton}
            disabled={!pagination.hasNext}
            onPress={() => setPage((currentPage) => currentPage + 1)}
          >
            Next
          </Button>
        </View>
      </InfoCard>
    </ScreenContainer>
  );
}
