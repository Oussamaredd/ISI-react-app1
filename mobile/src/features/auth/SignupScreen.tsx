import { useEffect, useState } from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { Button, HelperText, TextInput } from "react-native-paper";

import { useSession } from "@/providers/SessionProvider";
import type { AppTheme } from "@/theme/theme";
import { useAppTheme, useThemedStyles } from "@/theme/useAppTheme";
import { AuthScreenLayout } from "./AuthScreenLayout";
import {
  MIN_PASSWORD_LENGTH,
  getLoginEmailError,
  getLoginPasswordError,
  normalizeLoginEmail
} from "./loginValidation";

const MIN_DISPLAY_NAME_LENGTH = 2;

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
  errorHelper: {
    marginTop: -2
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

export function SignupScreen() {
  const theme = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const { authState, isLoading, signUp } = useSession();
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const [displayNameTouched, setDisplayNameTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [confirmPasswordTouched, setConfirmPasswordTouched] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const normalizedDisplayName = displayName.trim();
  const rawEmailError = getLoginEmailError(email);
  const rawPasswordError = getLoginPasswordError(password);
  const rawDisplayNameError =
    normalizedDisplayName.length > 0 &&
    normalizedDisplayName.length < MIN_DISPLAY_NAME_LENGTH
      ? `Use at least ${MIN_DISPLAY_NAME_LENGTH} characters or leave it blank.`
      : null;
  const rawConfirmPasswordError =
    confirmPassword.length === 0
      ? "Confirm your password."
      : confirmPassword !== password
        ? "Passwords do not match."
        : null;
  const emailError = emailTouched ? rawEmailError : null;
  const passwordError = passwordTouched ? rawPasswordError : null;
  const displayNameError =
    displayNameTouched ? rawDisplayNameError : null;
  const confirmPasswordError = confirmPasswordTouched
    ? rawConfirmPasswordError
    : null;
  const isBusy = isSubmitting || isLoading;

  useEffect(() => {
    if (authState === "authenticated") {
      router.replace("/");
    }
  }, [authState]);

  const handleSubmit = async () => {
    setEmailTouched(true);
    setDisplayNameTouched(true);
    setPasswordTouched(true);
    setConfirmPasswordTouched(true);
    setErrorMessage(null);

    if (
      rawEmailError ||
      rawPasswordError ||
      rawDisplayNameError ||
      rawConfirmPasswordError
    ) {
      return;
    }

    const normalizedEmail = normalizeLoginEmail(email);
    setEmail(normalizedEmail);
    setIsSubmitting(true);

    try {
      await signUp({
        email: normalizedEmail,
        password,
        ...(normalizedDisplayName ? { displayName: normalizedDisplayName } : {})
      });
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to create your account."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthScreenLayout
      title="Create account"
      subtitle={`Citizen signup is self-service. Passwords need at least ${MIN_PASSWORD_LENGTH} characters.`}
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
          returnKeyType="next"
          value={email}
          onBlur={() => setEmailTouched(true)}
          onChangeText={(value) => {
            setEmail(value);
            if (errorMessage) {
              setErrorMessage(null);
            }
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

        <TextInput
          mode="outlined"
          label="Display name (optional)"
          autoCapitalize="words"
          autoComplete="name"
          value={displayName}
          onBlur={() => setDisplayNameTouched(true)}
          onChangeText={(value) => {
            setDisplayName(value);
            if (errorMessage) {
              setErrorMessage(null);
            }
          }}
          error={Boolean(displayNameError)}
          outlineColor={theme.colors.borderSoft}
          activeOutlineColor={theme.colors.primary}
          style={styles.input}
        />
        {displayNameError ? (
          <HelperText type="error" style={styles.fieldHelper} visible>
            {displayNameError}
          </HelperText>
        ) : null}

        <TextInput
          mode="outlined"
          label="Password"
          secureTextEntry={!isPasswordVisible}
          autoComplete="new-password"
          autoCorrect={false}
          textContentType="newPassword"
          importantForAutofill="yes"
          returnKeyType="next"
          value={password}
          onBlur={() => setPasswordTouched(true)}
          onChangeText={(value) => {
            setPassword(value);
            if (errorMessage) {
              setErrorMessage(null);
            }
          }}
          error={Boolean(passwordError)}
          outlineColor={theme.colors.borderSoft}
          activeOutlineColor={theme.colors.primary}
          style={styles.input}
          right={
            <TextInput.Icon
              icon={isPasswordVisible ? "eye-off-outline" : "eye-outline"}
              onPress={() => setIsPasswordVisible((current) => !current)}
              forceTextInputFocus={false}
            />
          }
        />
        {passwordError ? (
          <HelperText type="error" style={styles.fieldHelper} visible>
            {passwordError}
          </HelperText>
        ) : null}

        <TextInput
          mode="outlined"
          label="Confirm password"
          secureTextEntry={!isPasswordVisible}
          autoComplete="new-password"
          autoCorrect={false}
          textContentType="newPassword"
          importantForAutofill="yes"
          returnKeyType="done"
          value={confirmPassword}
          onBlur={() => setConfirmPasswordTouched(true)}
          onChangeText={(value) => {
            setConfirmPassword(value);
            if (errorMessage) {
              setErrorMessage(null);
            }
          }}
          onSubmitEditing={() => {
            void handleSubmit();
          }}
          error={Boolean(confirmPasswordError)}
          outlineColor={theme.colors.borderSoft}
          activeOutlineColor={theme.colors.primary}
          style={styles.input}
        />
        {confirmPasswordError ? (
          <HelperText type="error" style={styles.fieldHelper} visible>
            {confirmPasswordError}
          </HelperText>
        ) : null}

        {errorMessage ? (
          <HelperText type="error" style={styles.errorHelper} visible>
            {errorMessage}
          </HelperText>
        ) : null}
      </View>

      <Button
        mode="contained"
        onPress={() => {
          void handleSubmit();
        }}
        loading={isBusy}
        disabled={isBusy}
        style={styles.submitButton}
        contentStyle={styles.submitButtonContent}
      >
        Create account
      </Button>

      <View style={styles.footerActions}>
        <Button mode="text" compact onPress={() => router.replace("/login")}>
          Back to sign in
        </Button>
      </View>
    </AuthScreenLayout>
  );
}
