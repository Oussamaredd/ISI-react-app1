export const MIN_PASSWORD_LENGTH = 8;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type LoginFieldErrors = {
  email: string | null;
  password: string | null;
};

export const normalizeLoginEmail = (value: string) => value.trim();

export const getLoginEmailError = (value: string) => {
  const normalizedEmail = normalizeLoginEmail(value);

  if (normalizedEmail.length === 0) {
    return "Enter your EcoTrack email.";
  }

  if (!EMAIL_PATTERN.test(normalizedEmail)) {
    return "Enter a valid email address.";
  }

  return null;
};

export const getLoginPasswordError = (value: string) => {
  if (value.length === 0) {
    return "Enter your password.";
  }

  if (value.length < MIN_PASSWORD_LENGTH) {
    return `Use at least ${MIN_PASSWORD_LENGTH} characters.`;
  }

  return null;
};

export const getLoginFieldErrors = ({
  email,
  password
}: {
  email: string;
  password: string;
}): LoginFieldErrors => {
  return {
    email: getLoginEmailError(email),
    password: getLoginPasswordError(password)
  };
};

export const isLoginFormValid = (errors: LoginFieldErrors) =>
  errors.email === null && errors.password === null;
