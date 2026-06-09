// @vitest-environment jsdom
//
// Covers the new B7/roster surface + the riskiest path (bulk hard-delete) on the
// admin Classes panel, with the RPC layer mocked. ConfirmDialog (the typed-phrase
// guard) is the REAL component here, so the bulk test also exercises the gate.
import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";

vi.mock("../views/developer/devShared", () => ({
  callAdminRpc: vi.fn(),
  callAdminRpcCached: vi.fn(),
  invalidateAdminRpcCache: vi.fn(),
}));

import DevClassesPanel from "../views/developer/DevClassesPanel";
import { callAdminRpc, callAdminRpcCached } from "../views/developer/devShared";

const mkClass = (over: Record<string, unknown>) => ({
  id: "c", name: "Class", code: "AAA111", teacher_uid: "t1", teacher_name: "Ariella",
  teacher_email: "a@x.edu", pending_teacher_email: null, school_name: null,
  student_count: 0, assignment_count: 0, archived_at: null, ...over,
});

const ACTIVE1 = mkClass({ id: "c1", name: "Grade 7 — Set 2", code: "BMK4QD", student_count: 3, assignment_count: 2 });
const ACTIVE2 = mkClass({ id: "c2", name: "Grade 8 — Set 3", code: "XT9PLZ", student_count: 1, assignment_count: 1 });
const ARCHIVED = mkClass({ id: "c3", name: "Old 2024 class", code: "ZZ9999", archived_at: "2026-06-01T00:00:00Z" });

const ROSTER = {
  class: { id: "c1", name: "Grade 7 — Set 2", code: "BMK4QD", teacher_uid: null, teacher_name: null, teacher_email: null, pending_teacher_email: null, school_name: null, archived_at: null },
  students: [{ display_name: "Noa K.", pin: "4821", grade: 7, branch: 2, status: "approved", avatar: "🦊" }],
  named_count: 0,
};

beforeEach(() => {
  (callAdminRpcCached as Mock).mockReset();
  (callAdminRpc as Mock).mockReset();
  (callAdminRpcCached as Mock).mockImplementation((fn: string) =>
    Promise.resolve(fn === "admin_list_classes" ? [ACTIVE1, ACTIVE2, ARCHIVED] : null));
  (callAdminRpc as Mock).mockImplementation((fn: string) => {
    if (fn === "admin_class_roster") return Promise.resolve(ROSTER);
    if (fn === "admin_delete_class") return Promise.resolve({ success: true });
    return Promise.resolve(null);
  });
});
afterEach(cleanup);

describe("DevClassesPanel", () => {
  it("shows active classes and hides archived ones until the Archived filter", async () => {
    render(<DevClassesPanel showToast={() => {}} />);
    expect(await screen.findByText("Grade 7 — Set 2")).toBeTruthy();
    expect(screen.queryByText("Old 2024 class")).toBeNull();      // archived hidden by default

    fireEvent.click(screen.getByRole("button", { name: "Archived" }));
    expect(await screen.findByText("Old 2024 class")).toBeTruthy();
    expect(screen.queryByText("Grade 7 — Set 2")).toBeNull();     // active hidden under Archived
  });

  it("loads + renders the student roster when a class is expanded", async () => {
    render(<DevClassesPanel showToast={() => {}} />);
    fireEvent.click(await screen.findByText("Grade 7 — Set 2"));
    expect(await screen.findByText("Noa K.")).toBeTruthy();
    expect((callAdminRpc as Mock).mock.calls.some((c) => c[0] === "admin_class_roster")).toBe(true);
  });

  it("bulk-deletes each selected class via admin_delete_class (typed-DELETE gated)", async () => {
    const { container } = render(<DevClassesPanel showToast={() => {}} />);
    await screen.findByText("Grade 7 — Set 2");

    const checkboxes = screen.getAllByRole("checkbox");
    expect(checkboxes).toHaveLength(2);                            // only the 2 active classes
    fireEvent.click(checkboxes[0]);
    fireEvent.click(checkboxes[1]);

    fireEvent.click(screen.getByRole("button", { name: "Delete 2" })); // open confirm
    const phrase = container.querySelector("input.font-mono") as HTMLInputElement;
    fireEvent.change(phrase, { target: { value: "DELETE" } });          // unlock the guard
    const confirmButtons = screen.getAllByRole("button", { name: "Delete 2" });
    fireEvent.click(confirmButtons[confirmButtons.length - 1]);         // dialog confirm

    await waitFor(() => {
      const deletes = (callAdminRpc as Mock).mock.calls.filter((c) => c[0] === "admin_delete_class");
      expect(deletes).toHaveLength(2);
    });
  });
});
