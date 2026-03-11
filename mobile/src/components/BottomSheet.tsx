import type { PropsWithChildren, ReactNode } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { IconButton, Portal, Surface, Text } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { AppTheme } from "@/theme/theme";
import { useThemedStyles } from "@/theme/useAppTheme";

type BottomSheetProps = PropsWithChildren<{
  visible: boolean;
  title: string;
  subtitle?: string;
  onDismiss: () => void;
  footer?: ReactNode;
}>;

const createStyles = (theme: AppTheme) =>
  ({
    root: {
      ...StyleSheet.absoluteFillObject,
      justifyContent: "flex-end"
    },
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: theme.colors.overlay
    },
    sheet: {
      borderTopLeftRadius: theme.shape.lg,
      borderTopRightRadius: theme.shape.lg,
      backgroundColor: theme.colors.surface,
      borderTopWidth: 1,
      borderLeftWidth: 1,
      borderRightWidth: 1,
      borderColor: theme.colors.borderSoft,
      maxHeight: "86%"
    },
    handleWrap: {
      alignItems: "center",
      paddingTop: theme.spacing.sm,
      paddingBottom: theme.spacing.xs
    },
    handle: {
      width: 56,
      height: 5,
      borderRadius: theme.shape.pill,
      backgroundColor: theme.colors.borderStrong
    },
    header: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: theme.spacing.md,
      paddingHorizontal: theme.spacing.lg,
      paddingBottom: theme.spacing.sm
    },
    titleBlock: {
      flex: 1,
      gap: theme.spacing.xs
    },
    title: {
      color: theme.colors.onSurface,
      fontWeight: "700"
    },
    subtitle: {
      color: theme.colors.textMuted,
      lineHeight: 20
    },
    body: {
      paddingHorizontal: theme.spacing.lg
    },
    bodyContent: {
      gap: theme.spacing.md,
      paddingBottom: theme.spacing.lg
    },
    footer: {
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.sm,
      borderTopWidth: 1,
      borderTopColor: theme.colors.borderSoft
    }
  }) satisfies Record<string, object>;

export function BottomSheet({
  visible,
  title,
  subtitle,
  onDismiss,
  footer,
  children
}: BottomSheetProps) {
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();

  if (!visible) {
    return null;
  }

  return (
    <Portal>
      <View style={styles.root} pointerEvents="box-none">
        <Pressable style={styles.backdrop} onPress={onDismiss} />
        <Surface
          style={[
            styles.sheet,
            {
              paddingBottom: Math.max(insets.bottom, 18)
            }
          ]}
          elevation={4}
        >
          <View style={styles.handleWrap}>
            <View style={styles.handle} />
          </View>
          <View style={styles.header}>
            <View style={styles.titleBlock}>
              <Text variant="titleLarge" style={styles.title}>
                {title}
              </Text>
              {subtitle ? (
                <Text variant="bodySmall" style={styles.subtitle}>
                  {subtitle}
                </Text>
              ) : null}
            </View>
            <IconButton icon="close" onPress={onDismiss} />
          </View>
          <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
            {children}
          </ScrollView>
          {footer ? <View style={styles.footer}>{footer}</View> : null}
        </Surface>
      </View>
    </Portal>
  );
}
