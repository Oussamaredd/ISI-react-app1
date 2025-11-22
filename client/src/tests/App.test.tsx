// client/src/tests/App.test.tsx
import { render, screen } from "@testing-library/react";
import App from "../App";

test("renders navigation buttons", () => {
  render(<App />);
  expect(screen.getByText(/tickets list/i)).toBeInTheDocument();
  expect(screen.getByText(/create ticket/i)).toBeInTheDocument();
});
