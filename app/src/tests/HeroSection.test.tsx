import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import HeroSection from "../components/landing/sections/HeroSection";
import { renderWithRouter } from "./test-utils";

const navigateToSection = vi.fn();

vi.mock("../hooks/useLandingSectionScroll", () => ({
  useLandingSectionNavigation: () => navigateToSection,
}));

describe("HeroSection", () => {
  test("renders the primary landing actions and navigates to the how-it-works section", () => {
    renderWithRouter(<HeroSection />);

    expect(
      screen.getByRole("heading", { name: /Faster waste collection with one control center\./i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Smart waste operations platform/i)).toBeInTheDocument();

    const getStartedLink = screen.getByRole("link", { name: /Get Started/i });
    expect(getStartedLink).toHaveAttribute("href", "/login");

    fireEvent.click(screen.getByRole("button", { name: /See How It Works/i }));

    expect(navigateToSection).toHaveBeenCalledWith("how-it-works");
  });
});
