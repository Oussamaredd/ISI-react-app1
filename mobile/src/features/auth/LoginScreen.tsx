import { useEffect, useRef, useState } from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { Button, HelperText, TextInput } from "react-native-paper";

import type { AppTheme } from "@/theme/theme";
import { useAppTheme, useThemedStyles } from "@/theme/useAppTheme";
import { useSession } from "@/providers/SessionProvider";
import { AuthScreenLayout } from "./AuthScreenLayout";
import {
  getLoginFieldErrors,
  normalizeLoginEmail
} from "./loginValidation";

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
  secondaryActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: theme.spacing.sm,
    flexWrap: "wrap"
  }
});

export function LoginScreen() {
  const theme = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const { authState, isLoading, signIn } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const passwordInputRef = useRef<{ focus: () => void } | null>(null);

  const validationErrors = getLoginFieldErrors({ email, password });
  const emailError = emailTouched ? validationErrors.email : null;
  const passwordError = passwordTouched ? validationErrors.password : null;
  const isBusy = isSubmitting || isLoading;

  useEffect(() => {
    if (authState === "authenticated") {
      router.replace("/");
    }
  }, [authState]);

  const handleEmailChange = (value: string) => {
    setEmail(value);
    if (errorMessage) {
      setErrorMessage(null);
    }
  };

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    if (errorMessage) {
      setErrorMessage(null);
    }
  };

  const handleSubmit = async () => {
    setEmailTouched(true);
    setPasswordTouched(true);
    setErrorMessage(null);

    if (validationErrors.email || validationErrors.password) {
      return;
    }

    const normalizedEmail = normalizeLoginEmail(email);
    setEmail(normalizedEmail);
    setIsSubmitting(true);

    try {
      await signIn({ email: normalizedEmail, password });
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to sign in to EcoTrack."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthScreenLayout title="Sign in" subtitle="Use your EcoTrack account">
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
          blurOnSubmit={false}
          value={email}
          onBlur={() => setEmailTouched(true)}
          onChangeText={handleEmailChange}
          onSubmitEditing={() => passwordInputRef.current?.focus()}
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
          ref={(input: { focus: () => void } | null) => {
            passwordInputRef.current = input;
          }}
          mode="outlined"
          label="Password"
          secureTextEntry={!isPasswordVisible}
          autoComplete="password"
          autoCorrect={false}
          textContentType="password"
          importantForAutofill="yes"
          returnKeyType="done"
          value={password}
          onBlur={() => setPasswordTouched(true)}
          onChangeText={handlePasswordChange}
          onSubmitEditing={() => {
            void handleSubmit();
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
        Sign in
      </Button>

      <View style={styles.secondaryActions}>
        <Button mode="text" compact onPress={() => router.push("/forgot-password")}>
          Forgot password?
        </Button>
        <Button mode="text" compact onPress={() => router.push("/signup")}>
          Create account
        </Button>
      </View>
    </AuthScreenLayout>
  );
}
