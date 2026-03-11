const normalizeApiBase = (value?: string) => {
  if (!value || value.trim().length === 0) {
    return null;
  }

  return value.trim().replace(/\/+$/, "").replace(/\/api$/, "");
};

export const mobileApiBase = normalizeApiBase(process.env.EXPO_PUBLIC_API_BASE_URL);

/**
 * Returns a user-facing label for the configured mobile API base.
 *
 * @returns The normalized API base when configured, or a diagnostic label when it is missing.
 */
export const getMobileApiBaseLabel = () =>
  mobileApiBase ?? "Missing EXPO_PUBLIC_API_BASE_URL";
