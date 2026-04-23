import { useEffect, useMemo, useState } from "react";
import { View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Button, HelperText, TextInput } from "react-native-paper";

import { authApi } from "@api/modules/auth";
import type { AppTheme } from "@/theme/theme";
import { useAppTheme, useThemedStyles } from "@/theme/useAppTheme";
import { AuthScreenLayout } from "./AuthScreenLayout";
import { MIN_PASSWORD_LENGTH } from "./loginValidation";

const createStyles = (theme: AppTheme) => ({
  inputStack: {
    gap: theme.spacing.sm
  },
  input: {
    backgroundColor: theme.colors.surface
  },
  fieldHelper: {
    marginTop: -4
  },
  submitButton: {
    borderRadius: theme.shape.pill
  },
  submitButtonContent: {
    paddingVertical: 6
  },
  footerActions: {
    alignItems: "center"
  }
});

export function ResetPasswordScreen() {
  const theme = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const params = useLocalSearchParams<{ code?: string | string[] }>();
  const codeFromParams = useMemo(() => {
    const value = params.code;
    if (Array.isArray(value)) {
      return value[0] ?? "";
    }

    return value ?? "";
  }, [params.code]);

  const [code, setCode] = useState(codeFromParams);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setCode(codeFromParams);
    setErrorMessage(null);
    setSuccessMessage(null);
  }, [codeFromParams]);

  const handleSubmit = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!code.trim()) {
      setErrorMessage("Open the password reset link again to continue.");
      return;
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
      setErrorMessage(`Use at least ${MIN_PASSWORD_LENGTH} characters for your new password.`);
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);

    try {
      await authApi.resetPassword({
        code,
        password
      });
      setSuccessMessage("Password updated successfully. Redirecting to sign in...");
      setTimeout(() => {
        router.replace("/login");
      }, 1200);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to update your password."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthScreenLayout
      title="Choose a new password"
      subtitle="Finish the recovery flow by setting a new EcoTrack password."
    >
      <View style={styles.inputStack}>
        {!codeFromParams ? (
          <TextInput
            mode="outlined"
            label="Recovery code"
            autoCapitalize="none"
            autoCorrect={false}
            value={code}
            onChangeText={(value) => {
              setCode(value);
              if (errorMessage) {
                setErrorMessage(null);
              }
            }}
            outlineColor={theme.colors.borderSoft}
            activeOutlineColor={theme.colors.primary}
            style={styles.input}
          />
        ) : null}

        <TextInput
          mode="outlined"
          label="New password"
          secureTextEntry
          autoComplete="new-password"
          autoCorrect={false}
          value={password}
          onChangeText={(value) => {
            setPassword(value);
            if (errorMessage) {
              setErrorMessage(null);
            }
          }}
          outlineColor={theme.colors.borderSoft}
          activeOutlineColor={theme.colors.primary}
          style={styles.input}
        />

        <TextInput
          mode="outlined"
          label="Confirm password"
          secureTextEntry
          autoComplete="new-password"
          autoCorrect={false}
          value={confirmPassword}
          onChangeText={(value) => {
            setConfirmPassword(value);
            if (errorMessage) {
              setErrorMessage(null);
            }
          }}
          onSubmitEditing={() => {
            void handleSubmit();
          }}
          outlineColor={theme.colors.borderSoft}
          activeOutlineColor={theme.colors.primary}
          style={styles.input}
        />

        {errorMessage ? (
          <HelperText type="error" style={styles.fieldHelper} visible>
            {errorMessage}
          </HelperText>
        ) : null}

        {successMessage ? (
          <HelperText type="info" style={styles.fieldHelper} visible>
            {successMessage}
          </HelperText>
        ) : null}
      </View>

      <Button
        mode="contained"
        onPress={() => {
          void handleSubmit();
        }}
        loading={isSubmitting}
        disabled={isSubmitting}
        style={styles.submitButton}
        contentStyle={styles.submitButtonContent}
      >
        Update password
      </Button>

      <View style={styles.footerActions}>
        <Button mode="text" compact onPress={() => router.replace("/login")}>
          Back to sign in
        </Button>
      </View>
    </AuthScreenLayout>
  );
}
