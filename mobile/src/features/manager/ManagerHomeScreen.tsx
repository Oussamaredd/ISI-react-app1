import { useMemo, useState } from "react";
import { View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, HelperText, Switch, Text, TextInput } from "react-native-paper";

import { planningApi } from "@api/modules/planning";
import { AppStateScreen } from "@/components/AppStateScreen";
import { InfoCard } from "@/components/InfoCard";
import { ScreenContainer } from "@/components/ScreenContainer";
import { downloadAndShareManagerReport } from "@/device/reportExports";
import { formatDateTime } from "@/lib/formatters";
import { queryKeys } from "@/lib/queryKeys";
import { useSession } from "@/providers/SessionProvider";
import type { AppTheme } from "@/theme/theme";
import { useAppTheme, useThemedStyles } from "@/theme/useAppTheme";
import {
  REPORT_KPI_OPTIONS,
  createDatePresetRange,
  formatDateInputValue,
  getManagerReportStatus,
  getManagerReportStatusLabel,
  parseDateInputValue,
  toPeriodBoundaryIso,
  type ManagerReportDatePreset,
  type ManagerReportFormat,
  validateManagerReportForm
} from "./reporting";

type StatusTone = "success" | "error" | "info";

const createStyles = (theme: AppTheme) =>
  ({
    stack: {
      gap: theme.spacing.sm
    },
    actionsRow: {
      flexDirection: "row",
      flexWrap: "wrap",
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
    choiceButton: {
      minWidth: 108
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
    helperText: {
      color: theme.colors.textMuted,
      lineHeight: 20
    },
    historyItem: {
      gap: theme.spacing.sm,
      paddingTop: theme.spacing.sm,
      borderTopWidth: 1,
      borderTopColor: theme.colors.borderSoft
    },
    historyActions: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: theme.spacing.sm
    },
    toggleRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      gap: theme.spacing.md
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

const formatReportFormatLabel = (format?: string | null) =>
  format?.trim().toLowerCase() === "csv" ? "CSV" : "PDF";

const buildReportWindowSummary = (periodStart: string, periodEnd: string) => {
  const startDate = parseDateInputValue(periodStart);
  const endDate = parseDateInputValue(periodEnd);

  if (!startDate || !endDate || startDate.getTime() > endDate.getTime()) {
    return "Choose a valid reporting window.";
  }

  const diffDays =
    Math.floor((endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000)) + 1;

  return `${formatDateInputValue(startDate)} to ${formatDateInputValue(endDate)} (${diffDays} day${
    diffDays === 1 ? "" : "s"
  })`;
};

const resolveReportMutationMessage = (params: {
  status?: string | null;
  deliveryError?: string | null;
  format: ManagerReportFormat;
  emailTo: string;
}) => {
  const normalizedStatus = getManagerReportStatus(params.status);

  if (normalizedStatus === "email_delivered") {
    return {
      tone: "success" as const,
      message: `${params.format.toUpperCase()} report generated and queued for ${params.emailTo}.`
    };
  }

  if (normalizedStatus === "email_delivery_failed") {
    return {
      tone: "info" as const,
      message:
        params.deliveryError?.trim() ||
        "Report generated, but email delivery failed. You can still download the export from history."
    };
  }

  return {
    tone: "success" as const,
    message: `${params.format.toUpperCase()} report generated successfully.`
  };
};

export function ManagerHomeScreen() {
  const theme = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const queryClient = useQueryClient();
  const { signOut } = useSession();
  const [selectedPreset, setSelectedPreset] =
    useState<ManagerReportDatePreset>("previousMonth");
  const [dateRange, setDateRange] = useState(() =>
    createDatePresetRange("previousMonth")
  );
  const [selectedKpis, setSelectedKpis] = useState<string[]>([
    ...REPORT_KPI_OPTIONS
  ]);
  const [reportFormat, setReportFormat] =
    useState<ManagerReportFormat>("pdf");
  const [sendEmail, setSendEmail] = useState(false);
  const [emailTo, setEmailTo] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [statusTone, setStatusTone] = useState<StatusTone>("info");
  const [activeDownloadId, setActiveDownloadId] = useState<string | null>(null);
  const [activeRegenerateId, setActiveRegenerateId] = useState<string | null>(
    null
  );

  const dashboardQuery = useQuery({
    queryKey: queryKeys.planningDashboard,
    queryFn: () => planningApi.getDashboard()
  });

  const reportHistoryQuery = useQuery({
    queryKey: queryKeys.planningReportHistory,
    queryFn: () => planningApi.getReportHistory()
  });

  const generateReportMutation = useMutation({
    mutationFn: planningApi.generateReport,
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.planningReportHistory
      });
    }
  });

  const regenerateReportMutation = useMutation({
    mutationFn: planningApi.regenerateReport,
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.planningReportHistory
      });
    }
  });

  const formErrors = useMemo(
    () =>
      validateManagerReportForm({
        periodStart: dateRange.periodStart,
        periodEnd: dateRange.periodEnd,
        selectedKpis,
        sendEmail,
        emailTo
      }),
    [dateRange.periodEnd, dateRange.periodStart, emailTo, selectedKpis, sendEmail]
  );

  const canSubmit = Object.keys(formErrors).length === 0;
  const reportingWindowSummary = buildReportWindowSummary(
    dateRange.periodStart,
    dateRange.periodEnd
  );
  const dashboard = dashboardQuery.data;
  const reportHistory = reportHistoryQuery.data?.reports ?? [];

  if (dashboardQuery.isLoading && reportHistoryQuery.isLoading) {
    return (
      <AppStateScreen
        title="Loading manager dashboard"
        description="EcoTrack is pulling the operational planning overview."
        isBusy
      />
    );
  }

  if (dashboardQuery.isError) {
    return (
      <AppStateScreen
        title="Manager data unavailable"
        description={
          dashboardQuery.error instanceof Error
            ? dashboardQuery.error.message
            : "Unable to load the planning dashboard."
        }
        actionLabel="Retry"
        onAction={() => {
          void dashboardQuery.refetch();
        }}
      />
    );
  }

  const toggleKpi = (kpi: string) => {
    setSelectedKpis((current) =>
      current.includes(kpi)
        ? current.filter((item) => item !== kpi)
        : [...current, kpi]
    );
  };

  const applyDatePreset = (preset: ManagerReportDatePreset) => {
    setSelectedPreset(preset);

    if (preset === "custom") {
      return;
    }

    setDateRange(createDatePresetRange(preset));
  };

  const handleGenerateReport = async () => {
    if (!canSubmit) {
      setStatusTone("error");
      setStatusMessage(
        formErrors.periodStart ||
          formErrors.periodEnd ||
          formErrors.selectedKpis ||
          formErrors.emailTo ||
          "Review the report settings before continuing."
      );
      return;
    }

    const periodStart = toPeriodBoundaryIso(dateRange.periodStart, "start");
    const periodEnd = toPeriodBoundaryIso(dateRange.periodEnd, "end");

    if (!periodStart || !periodEnd) {
      setStatusTone("error");
      setStatusMessage("Choose a valid reporting window.");
      return;
    }

    setStatusMessage("");

    try {
      const result = await generateReportMutation.mutateAsync({
        periodStart,
        periodEnd,
        selectedKpis,
        sendEmail,
        emailTo: sendEmail ? emailTo.trim().toLowerCase() : undefined,
        format: reportFormat
      });

      const nextStatus = resolveReportMutationMessage({
        status: result.status,
        deliveryError: result.deliveryError,
        format: reportFormat,
        emailTo: emailTo.trim().toLowerCase()
      });

      setStatusTone(nextStatus.tone);
      setStatusMessage(nextStatus.message);
    } catch (error) {
      setStatusTone("error");
      setStatusMessage(
        error instanceof Error ? error.message : "Failed to generate report."
      );
    }
  };

  const handleRegenerateReport = async (reportId: string) => {
    setStatusMessage("");
    setActiveRegenerateId(reportId);

    try {
      const result = await regenerateReportMutation.mutateAsync(reportId);
      const nextStatus = resolveReportMutationMessage({
        status: result.status,
        deliveryError: result.deliveryError,
        format:
          result.format?.trim().toLowerCase() === "csv" ? "csv" : "pdf",
        emailTo:
          reportHistory.find((report) => report.id === reportId)?.emailTo?.trim().toLowerCase() ??
          ""
      });

      setStatusTone(nextStatus.tone);
      setStatusMessage(
        nextStatus.tone === "success"
          ? `Report regenerated successfully. ${nextStatus.message}`
          : `Report regenerated, but follow-up is required. ${nextStatus.message}`
      );
    } catch (error) {
      setStatusTone("error");
      setStatusMessage(
        error instanceof Error ? error.message : "Failed to regenerate report."
      );
    } finally {
      setActiveRegenerateId(null);
    }
  };

  const handleDownloadReport = async (
    reportId: string,
    format: ManagerReportFormat
  ) => {
    setStatusMessage("");
    setActiveDownloadId(reportId);

    try {
      const result = await downloadAndShareManagerReport(reportId, format);
      setStatusTone("success");
      setStatusMessage(
        result.transport === "browser-download"
          ? `${result.fileName} download started.`
          : result.transport === "share-sheet"
            ? `${result.fileName} is ready to share.`
            : `${result.fileName} was downloaded to the device cache.`
      );
    } catch (error) {
      setStatusTone("error");
      setStatusMessage(
        error instanceof Error ? error.message : "Failed to download the report."
      );
    } finally {
      setActiveDownloadId(null);
    }
  };

  return (
    <ScreenContainer
      eyebrow="Manager lane"
      title="Manager"
      description="Track planning KPIs and generate monthly operational exports."
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

      <InfoCard title="Planning overview" icon="view-dashboard-outline">
        <View style={styles.stack}>
          <View style={styles.summaryRow}>
            <Text variant="bodyMedium" style={styles.summaryLabel}>
              Containers
            </Text>
            <Text variant="bodyMedium" style={styles.summaryValue}>
              {dashboard?.ecoKpis?.containers ?? 0}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text variant="bodyMedium" style={styles.summaryLabel}>
              Zones
            </Text>
            <Text variant="bodyMedium" style={styles.summaryValue}>
              {dashboard?.ecoKpis?.zones ?? 0}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text variant="bodyMedium" style={styles.summaryLabel}>
              Tours
            </Text>
            <Text variant="bodyMedium" style={styles.summaryValue}>
              {dashboard?.ecoKpis?.tours ?? 0}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text variant="bodyMedium" style={styles.summaryLabel}>
              Critical fill threshold
            </Text>
            <Text variant="bodyMedium" style={styles.summaryValue}>
              {dashboard?.thresholds?.criticalFillPercent ?? 80}%
            </Text>
          </View>
        </View>
      </InfoCard>

      <InfoCard
        title="Monthly report builder"
        icon="file-chart-outline"
        caption="Use calendar-aligned windows and KPI selection that match the planning export contract."
      >
        <View style={styles.stack}>
          <View style={styles.actionsRow}>
            {(
              [
                ["previousMonth", "Previous month"],
                ["monthToDate", "Month to date"],
                ["last30Days", "Last 30 days"],
                ["custom", "Custom"]
              ] as const
            ).map(([preset, label]) => (
              <Button
                key={preset}
                mode={selectedPreset === preset ? "contained-tonal" : "outlined"}
                style={styles.choiceButton}
                onPress={() => applyDatePreset(preset)}
              >
                {label}
              </Button>
            ))}
          </View>
          <Text variant="bodySmall" style={styles.helperText}>
            Reporting window: {reportingWindowSummary}
          </Text>
          <TextInput
            mode="outlined"
            label="Period start (YYYY-MM-DD)"
            value={dateRange.periodStart}
            onChangeText={(value) => {
              setSelectedPreset("custom");
              setDateRange((current) => ({ ...current, periodStart: value }));
            }}
            autoCapitalize="none"
          />
          <HelperText type="error" visible={Boolean(formErrors.periodStart)}>
            {formErrors.periodStart ?? " "}
          </HelperText>
          <TextInput
            mode="outlined"
            label="Period end (YYYY-MM-DD)"
            value={dateRange.periodEnd}
            onChangeText={(value) => {
              setSelectedPreset("custom");
              setDateRange((current) => ({ ...current, periodEnd: value }));
            }}
            autoCapitalize="none"
          />
          <HelperText type="error" visible={Boolean(formErrors.periodEnd)}>
            {formErrors.periodEnd ?? " "}
          </HelperText>
          <View style={styles.actionsRow}>
            {REPORT_KPI_OPTIONS.map((kpi) => (
              <Button
                key={kpi}
                mode={selectedKpis.includes(kpi) ? "contained-tonal" : "outlined"}
                onPress={() => toggleKpi(kpi)}
              >
                {kpi}
              </Button>
            ))}
          </View>
          <HelperText type="error" visible={Boolean(formErrors.selectedKpis)}>
            {formErrors.selectedKpis ?? " "}
          </HelperText>
          <View style={styles.actionsRow}>
            {(["pdf", "csv"] as const).map((format) => (
              <Button
                key={format}
                mode={reportFormat === format ? "contained-tonal" : "outlined"}
                onPress={() => setReportFormat(format)}
              >
                {format.toUpperCase()}
              </Button>
            ))}
          </View>
          <View style={styles.toggleRow}>
            <View style={styles.stack}>
              <Text variant="bodyMedium">Send a development email artifact</Text>
              <Text variant="bodySmall" style={styles.helperText}>
                The API writes the email artifact to the development outbox when delivery is enabled.
              </Text>
            </View>
            <Switch value={sendEmail} onValueChange={setSendEmail} />
          </View>
          {sendEmail ? (
            <>
              <TextInput
                mode="outlined"
                label="Recipient email"
                value={emailTo}
                onChangeText={setEmailTo}
                autoCapitalize="none"
                keyboardType="email-address"
              />
              <HelperText type="error" visible={Boolean(formErrors.emailTo)}>
                {formErrors.emailTo ?? " "}
              </HelperText>
            </>
          ) : null}
          <Button
            mode="contained"
            onPress={() => {
              void handleGenerateReport();
            }}
            loading={generateReportMutation.isPending}
            disabled={generateReportMutation.isPending}
          >
            Generate report
          </Button>
        </View>
      </InfoCard>

      <InfoCard
        title="Export history"
        icon="history"
        caption="Download or regenerate the latest planning exports from the report archive."
      >
        {reportHistoryQuery.isError ? (
          <View style={styles.stack}>
            <Text variant="bodyMedium">
              {reportHistoryQuery.error instanceof Error
                ? reportHistoryQuery.error.message
                : "Unable to load report history."}
            </Text>
            <Button
              mode="outlined"
              onPress={() => {
                void reportHistoryQuery.refetch();
              }}
            >
              Retry
            </Button>
          </View>
        ) : reportHistory.length === 0 ? (
          <Text variant="bodyMedium">No report exports found yet.</Text>
        ) : (
          <View style={styles.stack}>
            {reportHistory.slice(0, 8).map((report) => {
              const format = report.format?.trim().toLowerCase() === "csv" ? "csv" : "pdf";
              const status = getManagerReportStatus(report.status);

              return (
                <View key={report.id} style={styles.historyItem}>
                  <View style={styles.summaryRow}>
                    <Text variant="titleSmall">
                      {formatReportFormatLabel(report.format)} export
                    </Text>
                    <Text variant="bodySmall" style={styles.summaryLabel}>
                      {getManagerReportStatusLabel(status)}
                    </Text>
                  </View>
                  <Text variant="bodySmall" style={styles.helperText}>
                    Window: {formatDateInputValue(new Date(report.periodStart))} to{" "}
                    {formatDateInputValue(new Date(report.periodEnd))}
                  </Text>
                  <Text variant="bodySmall" style={styles.helperText}>
                    KPIs: {report.selectedKpis.join(", ")}
                  </Text>
                  <Text variant="bodySmall" style={styles.helperText}>
                    Created: {formatDateTime(report.createdAt)}
                  </Text>
                  {report.sendEmail ? (
                    <Text variant="bodySmall" style={styles.helperText}>
                      Recipient: {report.emailTo ?? "Unavailable"}
                    </Text>
                  ) : null}
                  <View style={styles.historyActions}>
                    <Button
                      mode="outlined"
                      onPress={() => {
                        void handleDownloadReport(report.id, format);
                      }}
                      loading={activeDownloadId === report.id}
                      disabled={activeDownloadId === report.id}
                    >
                      Download
                    </Button>
                    <Button
                      mode="contained-tonal"
                      onPress={() => {
                        void handleRegenerateReport(report.id);
                      }}
                      loading={activeRegenerateId === report.id}
                      disabled={activeRegenerateId === report.id}
                    >
                      Regenerate
                    </Button>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </InfoCard>
    </ScreenContainer>
  );
}
