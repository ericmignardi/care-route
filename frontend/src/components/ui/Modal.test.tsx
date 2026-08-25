import { useState } from "react";
import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderComponent } from "../../test/render";
import { Button } from "./Button";
import { Modal } from "./Modal";

function Harness() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>Open the dialog</Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Assign caregiver">
        <Button onClick={() => undefined}>Inside first</Button>
        <Button onClick={() => undefined}>Inside last</Button>
      </Modal>
    </>
  );
}

/**
 * The focus trap, which `useFocusTrap` shares with the navigation drawer. Worth its own
 * test because every part of it fails silently: nothing throws when Tab escapes to the
 * page underneath, or when focus is left on a node that has just been unmounted.
 */
describe("modal focus handling", () => {
  it("moves focus inside on open, cycles within, and hands it back on Esc", async () => {
    renderComponent(<Harness />);

    const trigger = screen.getByRole("button", { name: "Open the dialog" });
    await userEvent.click(trigger);

    // The close button is the first focusable node in the panel.
    const close = screen.getByRole("button", { name: "Close" });
    expect(close).toHaveFocus();

    await userEvent.tab();
    expect(screen.getByRole("button", { name: "Inside first" })).toHaveFocus();
    await userEvent.tab();
    expect(screen.getByRole("button", { name: "Inside last" })).toHaveFocus();

    // Past the last control, Tab wraps to the first rather than leaving the dialog.
    await userEvent.tab();
    expect(close).toHaveFocus();

    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });
});
