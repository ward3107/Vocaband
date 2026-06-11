// @vitest-environment jsdom
//
// AnalyticsView ↔ get_teacher_class_analytics wiring. Renders the view with
// EMPTY allScores and a mocked RPC response, so every number on screen can
// only have come from the server-side aggregates — proving the RPC path is
// live and the empty-state gate recognises RPC data. Also covers the
// struggling-student shaping (avg < 70 from total/count buckets).
import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from "vitest";
import { render, screen, cleanup, waitFor, fireEvent } from "@testing-library/react";

vi.mock("../core/supabase", () => ({
  supabase: { rpc: vi.fn() },
  performUserLogout: vi.fn(),
}));
// Word lookups pull the vocabulary dataset — stub to keep the test hermetic.
vi.mock("../data/wordLookup", () => ({
  buildWordIdSubjectMap: () => new Map<number, string>(),
  lookupDisplayWord: (id: number) => ({ id, primary: `word-${id}`, secondary: "", subject: "english" }),
}));
// Display-only children with their own data dependencies — not under test.
vi.mock("../components/TopAppBar", () => ({ default: () => null }));
vi.mock("../components/dashboard/TeacherRewardModal", () => ({ default: () => null }));
vi.mock("../components/analytics/ClassPatternsSection", () => ({ ClassPatternsSection: () => null }));

import AnalyticsView from "../views/AnalyticsView";
import { supabase } from "../core/supabase";
import { LanguageProvider } from "../hooks/useLanguage";
import type { ClassData } from "../core/supabase";

const CLASS: ClassData = { id: "c1", name: "Grade 6 — Bluebirds", code: "SKY42", teacherUid: "t1" };

// Maya: 120/2 = 60 avg → struggling. Daniel: 450/5 = 90 avg → fine.
const RPC_ROW = {
  class_code: "SKY42",
  student_count: 2,
  total_attempts: 7,
  total_score: 570,
  students: [
    { uid: "u-maya", name: "Maya", avatar: "🦄", total: 120, count: 2 },
    { uid: "u-dan", name: "Daniel", avatar: "🦊", total: 450, count: 5 },
  ],
  mistakes: [{ word_id: 7, count: 4 }, { word_id: 9, count: 1 }],
  modes: [{ mode: "flashcards", count: 4, total: 350 }, { mode: "quiz", count: 3, total: 220 }],
};

function renderView() {
  return render(
    <LanguageProvider>
      <AnalyticsView
        user={{ displayName: "Ms. Cohen" }}
        classes={[CLASS]}
        allScores={[]}
        teacherAssignments={[]}
        setView={() => {}}
        selectedClass={null}
        setSelectedClass={() => {}}
        selectedWords={[]}
        setSelectedWords={() => {}}
        embedded
      />
    </LanguageProvider>,
  );
}

beforeEach(() => {
  (supabase.rpc as Mock).mockReset();
  (supabase.rpc as Mock).mockImplementation((fn: string) => {
    if (fn === "get_teacher_class_analytics") return Promise.resolve({ data: [RPC_ROW], error: null });
    if (fn === "list_students_in_class") return Promise.resolve({ data: [], error: null });
    return Promise.resolve({ data: null, error: null });
  });
});

afterEach(cleanup);

describe("AnalyticsView RPC wiring", () => {
  it("requests the teacher's class codes from get_teacher_class_analytics", async () => {
    renderView();
    await waitFor(() => {
      expect(supabase.rpc).toHaveBeenCalledWith(
        "get_teacher_class_analytics",
        expect.objectContaining({ p_class_codes: ["SKY42"] }),
      );
    });
  });

  it("renders class-card stats from the RPC aggregates even with no client rows", async () => {
    renderView();
    // Class card: name + student_count (2) + attempts (7) + avg (81%).
    const card = await screen.findByText("Grade 6 — Bluebirds", { selector: "h3" });
    expect(card).toBeTruthy();
    expect(await screen.findByText("7")).toBeTruthy();
    expect(await screen.findByText("81%")).toBeTruthy();
  });

  it("surfaces struggling students computed from the RPC buckets", async () => {
    renderView();
    // Open the class detail; Maya (avg 60) is struggling, Daniel (90) is not.
    const card = await screen.findByText("Grade 6 — Bluebirds", { selector: "h3" });
    fireEvent.click(card.closest("button")!);
    expect(await screen.findByText("Maya")).toBeTruthy();
    expect(screen.getByText("60%")).toBeTruthy();
    expect(screen.queryByText("Daniel")).toBeNull();
  });
});
