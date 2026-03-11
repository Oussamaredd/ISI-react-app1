import { useState } from "react";
import { Linking, View } from "react-native";
import { router } from "expo-router";
import { Button, HelperText, Text, TextInput } from "react-native-paper";

import { authApi } from "@api/modules/auth";
import type { AppTheme } from "@/theme/theme";
import { useAppTheme, useThemedStyles } from "@/theme/useAppTheme";
import { AuthScreenLayout } from "./AuthScreenLayout";
import { getLoginEmailError, normalizeLoginEmail } from "./loginValidation";

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
  successCopy: {
    color: theme.colors.success,
    lineHeight: 20
  },
  devResetBox: {
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
    borderRadius: theme.shape.md,
    backgroundColor: theme.colors.surfaceMuted,
    borderWidth: 1,
    borderColor: theme.colors.borderSoft
  },
  devResetText: {
    color: theme.colors.textMuted,
    lineHeight: 18
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

export function ForgotPasswordScreen() {
  const theme = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const [email, setEmail] = useState("");
  const [emailTouched, setEmailTouched] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [devResetUrl, setDevResetUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const emailError = emailTouched ? getLoginEmailError(email) : null;

  const handleSubmit = async () => {
    setEmailTouched(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    setDevResetUrl(null);

    const rawEmailError = getLoginEmailError(email);
    if (rawEmailError) {
      return;
    }

    const normalizedEmail = normalizeLoginEmail(email);
    setEmail(normalizedEmail);
    setIsSubmitting(true);

    try {
      const payload = await authApi.forgotPassword(normalizedEmail);
      setSuccessMessage("If an account exists for this email, a reset link was generated.");
      setDevResetUrl(payload?.devResetUrl ?? null);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to process your password reset request."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthScreenLayout
      title="Forgot password"
      subtitle="Enter your account email and we will start the reset flow."
    >
      <View style={styles.inputStack}>
        <TextInput
          mode="outlined"
          label="Email"
          autoCapitalize="none"
          autoComplete="email"
          autoCorrect={false}
          keyboardType="email-address"
          inputMode="email"
          textContentType="emailAddress"
          importantForAutofill="yes"
          returnKeyType="done"
          value={email}
          onBlur={() => setEmailTouched(true)}
          onChangeText={(value) => {
            setEmail(value);
            if (errorMessage) {
              setErrorMessage(null);
            }
          }}
          onSubmitEditing={() => {
            void handleSubmit();
          }}
          error={Boolean(emailError)}
          outlineColor={theme.colors.borderSoft}
          activeOutlineColor={theme.colors.primary}
          style={styles.input}
        />
        {emailError ? (
          <HelperText type="error" style={styles.fieldHelper} visible>
            {emailError}
          </HelperText>
        ) : null}

        {errorMessage ? (
          <HelperText type="error" style={styles.fieldHelper} visible>
            {errorMessage}
          </HelperText>
        ) : null}

        {successMessage ? (
          <Text variant="bodyMedium" style={styles.successCopy}>
            {successMessage}
          </Text>
        ) : null}

        {devResetUrl ? (
          <View style={styles.devResetBox}>
            <Text variant="labelLarge">Development reset link</Text>
            <Text variant="bodySmall" style={styles.devResetText} selectable>
              {devResetUrl}
            </Text>
            <Button
              mode="text"
              compact
              onPress={() => {
                void Linking.openURL(devResetUrl);
              }}
            >
              Open reset link
            </Button>
          </View>
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
        Send reset link
      </Button>

      <View style={styles.footerActions}>
        <Button mode="text" compact onPress={() => router.replace("/login")}>
          Back to sign in
        </Button>
      </View>
    </AuthScreenLayout>
  );
}
