import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderComponent } from "../../test/render";
import { API, http, problem, server } from "../../test/server";
import { LoginPage } from "./LoginPage";

describe("login form", () => {
  it("refuses the round trip when the fields are empty", async () => {
    // No /auth/login handler is registered. onUnhandledRequest is "error", so if the
    // client-side schema let this submit through, the test fails rather than passing
    // quietly — which is the only way to assert that a request did *not* happen.
    renderComponent(<LoginPage />);

    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByText("Enter your username")).toBeInTheDocument();
    expect(screen.getByText("Enter your password")).toBeInTheDocument();
    expect(screen.getByLabelText(/username/i)).toHaveAttribute("aria-invalid", "true");
  });

  it("shows the server's own sentence on a bad password rather than redirecting", async () => {
    server.use(
      http.post(`${API}/auth/login`, () => problem(401, "Invalid username or password")),
    );

    renderComponent(<LoginPage />);

    await userEvent.type(screen.getByLabelText(/username/i), "dana.coordinator");
    await userEvent.type(screen.getByLabelText(/password/i), "wrong");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));

    // /auth/login is excluded from the 401 interceptor: a bad password is an answer, not
    // an expired session, and bouncing it would swallow the message the server wrote.
    expect(await screen.findByRole("alert")).toHaveTextContent("Invalid username or password");
    expect(screen.getByRole("heading", { name: "Sign in" })).toBeInTheDocument();
  });
});
