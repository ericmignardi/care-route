import { describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderComponent } from "../../test/render";
import { API, HttpResponse, http, problem, server } from "../../test/server";
import { candidates, visit } from "../../test/fixtures";
import { AssignCaregiverModal } from "./AssignCaregiverModal";

function eligibility() {
  return http.get(`${API}/visits/eligible-caregivers`, () => HttpResponse.json(candidates));
}

function open(overrides: Partial<Parameters<typeof AssignCaregiverModal>[0]> = {}) {
  const onAssigned = vi.fn();
  const onClose = vi.fn();
  renderComponent(
    <AssignCaregiverModal
      open
      visit={visit}
      onClose={onClose}
      onAssigned={onAssigned}
      {...overrides}
    />,
  );
  return { onAssigned, onClose };
}

/**
 * The assign screen is the product's signature interaction, and the property worth
 * testing is a negative one: it does not evaluate a single rule in the browser. Every
 * refusal these tests assert on is a string the server sent.
 */
describe("assign flow", () => {
  it("shows every caregiver the server evaluated, with a reason on each refusal", async () => {
    server.use(eligibility());
    open();

    expect(await screen.findByText("Marcus LeBlanc")).toBeInTheDocument();
    expect(screen.getByText("3 caregivers evaluated. 1 can take this visit.")).toBeInTheDocument();

    // Blocked caregivers are listed, not hidden — the reason is the actionable part.
    expect(screen.getByText("Priya Raman")).toBeInTheDocument();
    expect(screen.getByText("Missing: NURSING")).toBeInTheDocument();

    // And a caregiver failing two rules shows both, not just the first.
    expect(screen.getByText("Tom Alcott")).toBeInTheDocument();
    expect(screen.getByText("Only available Tuesdays 08:00-16:00")).toBeInTheDocument();
    expect(screen.getByText("Booked 09:00-11:00")).toBeInTheDocument();
  });

  it("assigns an eligible caregiver and hands the updated visit back", async () => {
    const assigned = { ...visit, caregiver: { id: "cg-marcus", firstName: "Marcus", lastName: "LeBlanc" } };
    server.use(
      eligibility(),
      http.post(`${API}/visits/${visit.id}/assign`, () => HttpResponse.json(assigned)),
    );
    const { onAssigned } = open();

    await userEvent.click(await screen.findByRole("button", { name: /Marcus LeBlanc/ }));
    await userEvent.click(screen.getByRole("button", { name: "Assign to Marcus LeBlanc" }));

    await waitFor(() => expect(onAssigned).toHaveBeenCalledWith(assigned));
  });

  it("surfaces the server's refusal when a blocked caregiver is tried anyway", async () => {
    server.use(
      eligibility(),
      http.post(`${API}/visits/${visit.id}/assign`, () =>
        problem(422, "Missing: NURSING", "CAREGIVER_MISSING_SKILL"),
      ),
    );
    const { onAssigned } = open();

    // Clicking a blocked row attempts the assignment rather than disabling the control.
    // The UI is a courtesy; the server is the authority, and this is where that shows.
    await userEvent.click(await screen.findByRole("button", { name: /Priya Raman/ }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Cannot assign this visit");
    expect(alert).toHaveTextContent("Missing: NURSING");
    expect(alert).toHaveTextContent("CAREGIVER_MISSING_SKILL");
    expect(onAssigned).not.toHaveBeenCalled();
  });
});
