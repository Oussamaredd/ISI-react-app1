import { describe, expect, it } from "vitest";

import {
  MIN_PASSWORD_LENGTH,
  getLoginEmailError,
  getLoginFieldErrors,
  getLoginPasswordError,
  isLoginFormValid,
  normalizeLoginEmail
} from "../features/auth/loginValidation";

describe("loginValidation", () => {
  it("trims email input before validation", () => {
    expect(normalizeLoginEmail("  citizen@ecotrack.dev  ")).toBe("citizen@ecotrack.dev");
  });

  it("returns field errors for empty or malformed credentials", () => {
    expect(getLoginEmailError("")).toBe("Enter your EcoTrack email.");
    expect(getLoginEmailError("citizen")).toBe("Enter a valid email address.");
    expect(getLoginPasswordError("")).toBe("Enter your password.");
    expect(getLoginPasswordError("1234567")).toBe(
      `Use at least ${MIN_PASSWORD_LENGTH} characters.`
    );

    expect(getLoginFieldErrors({ email: "", password: "" })).toEqual({
      email: "Enter your EcoTrack email.",
      password: "Enter your password."
    });

    expect(getLoginFieldErrors({ email: "citizen", password: "1234567" })).toEqual({
      email: "Enter a valid email address.",
      password: `Use at least ${MIN_PASSWORD_LENGTH} characters.`
    });
  });

  it("accepts a valid email and password combination", () => {
    const errors = getLoginFieldErrors({
      email: "operator@ecotrack.dev",
      password: "securepass"
    });

    expect(errors).toEqual({
      email: null,
      password: null
    });
    expect(isLoginFormValid(errors)).toBe(true);
  });
});
