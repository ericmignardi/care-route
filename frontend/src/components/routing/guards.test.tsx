import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import { renderApp } from "../../test/render";
import { API, HttpResponse, http, server } from "../../test/server";
import { caregiver, coordinator } from "../../test/fixtures";

/**
 * Route guards are a courtesy, not a security boundary — every endpoint refuses
 * independently, and BR-7 is enforced per row on the server. What these tests protect is
 * the other half of that claim: that the guarded screen never *mounts*, so a caregiver
 * following a stale link does not watch a coordinator page fill with 403s.
 */
describe("route guards", () => {
  it("sends a signed-out visitor to the login screen", async () => {
    renderApp("/dashboard", null);

    expect(await screen.findByRole("heading", { name: /sign in/i })).toBeInTheDocument();
  });

  it("redirects a caregiver away from a coordinator route without rendering it", async () => {
    server.use(
      http.get(`${API}/visits/mine`, () => HttpResponse.json([])),
      // Deliberately absent: no /clients handler. onUnhandledRequest is "error", so if
      // the guard let ClientsPage mount, its list call would fail the test outright.
    );

    renderApp("/clients", caregiver);

    // The day-navigation control belongs to the caregiver screen and nothing else.
    expect(await screen.findByRole("button", { name: "Next day" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Clients" })).not.toBeInTheDocument();
  });

  it("lets a coordinator through to a coordinator route", async () => {
    server.use(
      http.get(`${API}/clients`, () =>
        HttpResponse.json({
          content: [],
          page: 0,
          size: 20,
          totalElements: 0,
          totalPages: 0,
          first: true,
          last: true,
        }),
      ),
    );

    renderApp("/clients", coordinator);

    expect(await screen.findByRole("heading", { name: "Clients" })).toBeInTheDocument();
  });
});
