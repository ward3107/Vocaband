// @vitest-environment jsdom
//
// ConfirmDialog is the single guard in front of EVERY destructive admin action
// (delete class/word/set, bulk delete, demote, remove teacher…). These tests
// pin the safety contract: the confirm button stays disabled until the typed
// phrase matches / a required reason is given, and the (trimmed) reason is what
// reaches onConfirm.
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, within } from "@testing-library/react";
import ConfirmDialog from "../views/developer/ConfirmDialog";

afterEach(cleanup);

const noop = () => {};

describe("ConfirmDialog", () => {
  it("names the dialog and fields for assistive technology", () => {
    render(<ConfirmDialog open title="Delete class" body="Cannot be undone" confirmPhrase="CLASS" reason={{ required: true }} onConfirm={noop} onCancel={noop} />);
    const dialog = screen.getByRole("dialog", { name: "Delete class" });
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    expect(screen.getByLabelText(/Type CLASS to confirm/)).toBeTruthy();
    expect(screen.getByRole("textbox", { name: /Reason/ }).getAttribute("aria-required")).toBe("true");
  });

  it("keeps keyboard focus in the dialog and restores the opener", () => {
    const opener = document.createElement("button");
    document.body.append(opener);
    opener.focus();
    const { unmount } = render(<ConfirmDialog open title="Delete?" onConfirm={noop} onCancel={noop} />);
    const dialog = screen.getByRole("dialog");
    expect(document.activeElement).toBe(dialog);
    const buttons = within(dialog).getAllByRole("button");
    buttons[buttons.length - 1].focus();
    fireEvent.keyDown(document.activeElement!, { key: "Tab" });
    expect(document.activeElement).toBe(buttons[0]);
    fireEvent.keyDown(document.activeElement!, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(buttons[buttons.length - 1]);
    unmount();
    expect(document.activeElement).toBe(opener);
    opener.remove();
  });

  it("renders nothing when closed", () => {
    render(<ConfirmDialog open={false} title="Danger Zone" onConfirm={noop} onCancel={noop} />);
    expect(screen.queryByText("Danger Zone")).toBeNull();
  });

  it("shows the title + body when open", () => {
    render(<ConfirmDialog open title="Delete this class?" body={<>bye bye</>} onConfirm={noop} onCancel={noop} />);
    expect(screen.queryByText("Delete this class?")).not.toBeNull();
    expect(screen.queryByText("bye bye")).not.toBeNull();
  });

  it("gates confirm behind an exact typed phrase", () => {
    const onConfirm = vi.fn();
    const { container } = render(
      <ConfirmDialog open title="Delete?" confirmPhrase="BMK4QD" confirmLabel="Delete it" onConfirm={onConfirm} onCancel={noop} />,
    );
    const confirm = screen.getByRole("button", { name: "Delete it" }) as HTMLButtonElement;
    const phraseInput = container.querySelector("input") as HTMLInputElement;

    expect(confirm.disabled).toBe(true);                         // gated initially
    fireEvent.change(phraseInput, { target: { value: "bmk4qd" } });
    expect(confirm.disabled).toBe(true);                         // case-sensitive, still gated
    fireEvent.change(phraseInput, { target: { value: "BMK4QD" } });
    expect(confirm.disabled).toBe(false);                        // exact match unlocks

    fireEvent.click(confirm);
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onConfirm).toHaveBeenCalledWith("");                  // no reason field → empty string
  });

  it("requires a reason when reason.required, and passes it trimmed", () => {
    const onConfirm = vi.fn();
    const { container } = render(
      <ConfirmDialog open title="Remove teacher?" reason={{ required: true }} confirmLabel="Remove" onConfirm={onConfirm} onCancel={noop} />,
    );
    const confirm = screen.getByRole("button", { name: "Remove" }) as HTMLButtonElement;
    const reason = container.querySelector("textarea") as HTMLTextAreaElement;

    expect(confirm.disabled).toBe(true);                         // required reason missing
    fireEvent.change(reason, { target: { value: "   ticket #42   " } });
    expect(confirm.disabled).toBe(false);
    fireEvent.click(confirm);
    expect(onConfirm).toHaveBeenCalledWith("ticket #42");        // trimmed
  });

  it("calls onCancel from the Cancel button", () => {
    const onCancel = vi.fn();
    render(<ConfirmDialog open title="X" confirmLabel="Go" onConfirm={noop} onCancel={onCancel} />);
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("shows a working state and blocks confirm while busy", () => {
    render(<ConfirmDialog open title="X" busy confirmLabel="Go" onConfirm={noop} onCancel={noop} />);
    expect(screen.queryByText("Go")).toBeNull();                 // label swaps to "Working…"
    const working = screen.getByRole("button", { name: "Working…" }) as HTMLButtonElement;
    expect(working.disabled).toBe(true);
  });
});
