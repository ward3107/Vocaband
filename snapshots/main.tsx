/* Snapshot harness — renders the REAL admin dashboard with the Supabase RPC
 * layer stubbed to realistic sample data, so screenshots show the actual
 * components + styles (not a mockup). Dev/preview only; never shipped. */
import { createRoot } from "react-dom/client";
import "../src/index.css";
import { supabase, type AppUser } from "../src/core/supabase";
import DeveloperDashboardView from "../src/views/DeveloperDashboardView";

const micro = (usd: number) => Math.round(usd * 1_000_000);

// 30 days of believable AI spend (a gentle wave + a couple of spikes).
const byDay = Array.from({ length: 30 }, (_, i) => {
  const d = new Date(2026, 4, 9 + i);
  const base = 1.0 + Math.sin(i / 3) * 0.5 + (i > 22 ? 0.8 : 0);
  const calls = Math.round(120 + Math.sin(i / 2) * 40 + (i > 22 ? 70 : 0));
  return { day: d.toISOString().slice(0, 10), calls, cost_micro: micro(Math.max(0.3, base)) };
});

const USERS = [
  { uid: "u_ariella", email: "ariella.katz@telaviv-bilingual.edu", display_name: "Ariella Katz", role: "teacher", plan: "pro", trial_ends_at: null, school_id: "s1", school_name: "Tel Aviv Bilingual", first_seen_at: "2026-01-12", consent_given_at: "2026-01-12", last_activity_at: "2026-06-07", classes: [ { id: "c1", name: "Grade 7 — Set 2", code: "BMK4QD", student_count: 28 }, { id: "c2", name: "Grade 8 — Set 3", code: "XT9PLZ", student_count: 24 } ] },
  { uid: "u_dan", email: "dan.levi@haifa-science.edu", display_name: "Dan Levi", role: "teacher", plan: "free", trial_ends_at: "2026-06-12", school_id: "s2", school_name: "Haifa Science", first_seen_at: "2026-05-29", consent_given_at: "2026-05-29", last_activity_at: "2026-06-08", classes: [ { id: "c4", name: "Grade 9 — Set 3", code: "KP38RA", student_count: 19 } ] },
  { uid: "u_maya", email: "maya.b@telaviv-bilingual.edu", display_name: "Maya Bar", role: "teacher", plan: "school", trial_ends_at: null, school_id: "s1", school_name: "Tel Aviv Bilingual", first_seen_at: "2026-02-03", consent_given_at: "2026-02-03", last_activity_at: "2026-06-06", classes: [] },
  { uid: "u_noa", email: null, display_name: "Noa S. (07-5-2-14)", role: "student", plan: null, trial_ends_at: null, school_id: "s1", school_name: "Tel Aviv Bilingual", first_seen_at: "2026-03-01", consent_given_at: null, last_activity_at: "2026-06-08", classes: [] },
];

const CLASSES = [
  { id: "c1", name: "Grade 7 — Set 2", code: "BMK4QD", teacher_uid: "u_ariella", teacher_name: "Ariella Katz", teacher_email: "ariella.katz@telaviv-bilingual.edu", pending_teacher_email: null, school_name: "Tel Aviv Bilingual", student_count: 28, assignment_count: 6 },
  { id: "c2", name: "Grade 8 — Set 3", code: "XT9PLZ", teacher_uid: "u_ariella", teacher_name: "Ariella Katz", teacher_email: "ariella.katz@telaviv-bilingual.edu", pending_teacher_email: null, school_name: "Tel Aviv Bilingual", student_count: 24, assignment_count: 9 },
  { id: "c4", name: "Grade 9 — Set 3", code: "KP38RA", teacher_uid: "u_dan", teacher_name: "Dan Levi", teacher_email: "dan.levi@haifa-science.edu", pending_teacher_email: null, school_name: "Haifa Science", student_count: 19, assignment_count: 4 },
  { id: "c5", name: "Grade 9 — Custom: Bagrut prep", code: "QH72MN", teacher_uid: null, teacher_name: null, teacher_email: null, pending_teacher_email: "new.teacher@haifa-science.edu", school_name: "Haifa Science", student_count: 0, assignment_count: 0 },
  { id: "c6", name: "Grade 6 — Set 1 (pilot)", code: "RT5WZA", teacher_uid: "u_maya", teacher_name: "Maya Bar", teacher_email: "maya.b@telaviv-bilingual.edu", pending_teacher_email: null, school_name: "Tel Aviv Bilingual", student_count: 31, assignment_count: 12 },
];

const SCHOOLS = [
  { id: "s1", name: "Tel Aviv Bilingual", school_code: "TLV", created_at: "2026-01-10", teachers: 6, students: 142, classes: 9, managers: ["principal@telaviv-bilingual.edu"] },
  { id: "s2", name: "Haifa Science", school_code: "HAI", created_at: "2026-02-20", teachers: 4, students: 88, classes: 5, managers: [] },
];

const ENTITLEMENTS = USERS.filter((u) => u.role === "teacher").map((u) => ({
  email: u.email, uid: u.uid, role: u.role, plan: u.plan, trial_ends_at: u.trial_ends_at,
  school_id: u.school_id, school_name: u.school_name, ai_enabled: u.plan !== "free", ai_disabled: false, allowlisted: true, signed_up: true,
}));

const has = (s: string | null | undefined, q: string) => (s ?? "").toLowerCase().includes(q.toLowerCase());

const RPC: Record<string, (a: Record<string, unknown>) => unknown> = {
  admin_dashboard_overview: () => ({ teachers: 128, students: 3402, managers: 3, admins: 2, classes: 210, schools: 14, ai_cost_micro_today: micro(1.9), ai_cost_micro_7d: micro(12), ai_cost_micro_30d: micro(42.35), ai_calls_30d: 5120 }),
  admin_ai_usage: () => ({ days: 30, by_day: byDay, by_action: [ { action: "ocr_image", calls: 1840, cost_micro: micro(18.2) }, { action: "ai_generate_sentences", calls: 1520, cost_micro: micro(11.4) }, { action: "translation_batch", calls: 980, cost_micro: micro(6.1) }, { action: "ai_topic_words", calls: 520, cost_micro: micro(4.0) }, { action: "audio_generation", calls: 260, cost_micro: micro(2.65) } ], top_teachers: [ { teacher_uid: "u_ariella", email: "ariella.katz@telaviv-bilingual.edu", calls: 410, cost_micro: micro(7.8) }, { teacher_uid: "u_maya", email: "maya.b@telaviv-bilingual.edu", calls: 300, cost_micro: micro(5.1) } ] }),
  admin_search_users: (a) => { const q = String(a.p_query ?? ""); return USERS.filter((u) => has(u.display_name, q) || has(u.email, q) || has(u.uid, q)); },
  admin_list_classes: (a) => { const q = String(a.p_query ?? ""); return q ? CLASSES.filter((c) => has(c.name, q) || has(c.code, q) || has(c.teacher_email, q) || has(c.teacher_name, q)) : CLASSES; },
  admin_list_schools: () => SCHOOLS,
  admin_list_entitlements: () => ENTITLEMENTS,
};

// Stub the singleton client's rpc; components never hit the network.
(supabase as unknown as { rpc: (fn: string, args: Record<string, unknown>) => Promise<unknown> }).rpc =
  (fn, args) => Promise.resolve({ data: RPC[fn] ? RPC[fn](args ?? {}) : { success: true }, error: null });

const user = { uid: "u_admin", email: "admin@vocaband.com", role: "admin", display_name: "Admin" } as unknown as AppUser;

createRoot(document.getElementById("root")!).render(
  <DeveloperDashboardView user={user} setView={() => {}} showToast={() => {}} />,
);
