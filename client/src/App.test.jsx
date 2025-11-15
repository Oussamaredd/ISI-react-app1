import { render, screen } from "@testing-library/react";
import { test, expect } from "vitest";
import App from "./App";

test("renders app", () => {
  render(<App />);
  expect(screen.getByText(/all tickets/i)).toBeInTheDocument();
});
