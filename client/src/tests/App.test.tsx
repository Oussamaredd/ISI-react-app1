// client/src/tests/App.test.tsx
import { render, screen } from "@testing-library/react";
import App from "../App";

test("renders navigation buttons", async () => {
  render(<App />);

  // Wait for the app to finish loading and show the main nav
  expect(await screen.findByText(/tickets list/i)).toBeInTheDocument();
  expect(await screen.findByText(/create ticket/i)).toBeInTheDocument();
});
