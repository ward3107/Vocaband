/**
 * Dev-only preview that mounts the teacher-dashboard floating
 * affordances (projector toggle, theme picker, projector prompt
 * banner) and the trial / plan-status banner against fake AppUser
 * data, so the layout-vs-mobile issues can be inspected without
 * logging in as a real teacher.
 *
 * Entry: http://localhost:5174/dev/teacher-affordances
 *
 * Gated behind `import.meta.env.DEV` in main.tsx — never ships to
 * production.
 */
import { useState } from "react";
import { Palette, Tv2, Sparkles, Crown } from "lucide-react";
import { LanguageProvider } from "../hooks/useLanguage";
import { isPro, isTrialing, getTrialDaysLeft, freshTrialEndsAt } from "../core/plan";
import type { AppUser } from "../core/supabase";

type PlanScenario = "trialing-12" | "trialing-1" | "expired-free" | "pro" | "no-trial";

function buildUser(scenario: PlanScenario): AppUser {
  const base: AppUser = {
    uid: "preview-teacher",
    email: "teacher@example.com",
    role: "teacher",
    displayName: "Ms. Cohen",
    plan: "free",
  };
  switch (scenario) {
    case "trialing-12":
      return { ...base, trialEndsAt: new Date(Date.now() + 12 * 86400000).toISOString() };
    case "trialing-1":
      return { ...base, trialEndsAt: new Date(Date.now() + 1 * 86400000).toISOString() };
    case "expired-free":
      return { ...base, trialEndsAt: new Date(Date.now() - 1 * 86400000).toISOString() };
    case "pro":
      return { ...base, plan: "pro", trialEndsAt: null };
    case "no-trial":
      // Mirrors a grandfathered teacher whose row predates the trial
      // feature — `trialEndsAt` is null and they're on free.
      return { ...base, trialEndsAt: null };
  }
}

export default function TeacherAffordancesPreview() {
  const [scenario, setScenario] = useState<PlanScenario>("trialing-12");
  const [presentationOn, setPresentationOn] = useState(false);

  const user = buildUser(scenario);
  const trialing = isTrialing(user);
  const daysLeft = getTrialDaysLeft(user);
  const pro = isPro(user);

  return (
    <LanguageProvider>
      <div
        className="relative min-h-screen p-4 sm:p-6"
        style={{
          background:
            "radial-gradient(140% 100% at 100% 0%, #F3EBFF 0%, #F6F4FF 40%, #FAF7FF 100%)",
        }}
      >
        <div className="max-w-2xl mx-auto">
          <div className="rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 mb-4 text-xs font-bold text-amber-900">
            DEV preview — pick a plan scenario to see the new compact trial chip (top-right). The projector prompt has been removed; the live dashboard now auto-enables Presentation Mode on F11 / fullscreen.
          </div>

          {/* Scenario picker */}
          <div className="mb-4 rounded-2xl bg-white border border-indigo-500/[0.10] p-4 shadow-sm">
            <div className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#8B5CF6] mb-2">Plan scenario</div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs font-bold">
              {([
                ["trialing-12", "Trial · 12d"],
                ["trialing-1",  "Trial · 1d"],
                ["expired-free", "Expired free"],
                ["pro", "Pro"],
                ["no-trial", "No trial set"],
              ] as Array<[PlanScenario, string]>).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setScenario(id)}
                  className={`px-3 py-2 rounded-lg border ${scenario === id ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-[#4A3B7A] border-indigo-200"}`}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="mt-3 text-[11px] text-stone-500 leading-relaxed">
              Resolved: <code>plan={user.plan}</code>, <code>trialEndsAt={String(user.trialEndsAt)}</code>,
              isPro=<strong>{String(pro)}</strong>, isTrialing=<strong>{String(trialing)}</strong>,
              daysLeft=<strong>{String(daysLeft)}</strong>.
            </div>
            <div className="mt-3 text-[11px] text-stone-500">
              Fresh trial would expire: {new Date(freshTrialEndsAt()).toLocaleDateString()}
            </div>
          </div>

          {/* === Compact trial / upgrade chip (mirrors live) === */}
          {pro && !trialing && (
            <div className="mb-4 rounded-xl border border-indigo-500/[0.10] bg-white p-3 text-xs font-bold text-[#1F1147]">
              ✨ Pro plan — no chip shown on the live dashboard.
            </div>
          )}
          {trialing && daysLeft !== null && (
            <div className="mb-4 flex justify-end">
              <div className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-3 py-1.5 text-xs sm:text-sm font-bold text-white shadow-sm shadow-orange-500/30">
                <Sparkles size={14} />
                <span>You have {daysLeft} {daysLeft === 1 ? "day" : "days"} of Pro left</span>
                <a href="#" onClick={(e) => e.preventDefault()} className="inline-flex items-center gap-1 rounded-full bg-white/25 px-2 py-0.5 text-[11px] font-bold hover:bg-white/40">
                  <Crown size={12} /> Upgrade
                </a>
              </div>
            </div>
          )}
          {!pro && !trialing && (
            <div className="mb-4 flex justify-end">
              <div className="inline-flex items-center gap-2 rounded-full bg-slate-800 px-3 py-1.5 text-xs sm:text-sm font-bold text-white shadow-sm">
                <Crown size={14} className="text-amber-400" />
                <span>Pro trial has ended</span>
                <a href="#" onClick={(e) => e.preventDefault()} className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-2 py-0.5 text-[11px] font-bold">
                  <Crown size={12} /> Upgrade
                </a>
              </div>
            </div>
          )}

          {/* Spacer so the bottom floating buttons don't overlap the
              scenario picker on short pages. */}
          <div className="h-[60vh]" />
        </div>

        {/* === Floating theme circle (bottom-right, mirrors live) === */}
        <button
          type="button"
          aria-label="Change theme (preview)"
          className="fixed bottom-5 right-5 sm:bottom-6 sm:right-6 z-30 w-12 h-12 rounded-full border border-stone-200 bg-white shadow-lg flex items-center justify-center text-[#4A3B7A]"
        >
          <Palette size={20} />
        </button>

        {/* === Floating projector circle (bottom-right, mirrors live) === */}
        <button
          type="button"
          onClick={() => setPresentationOn((v) => !v)}
          aria-label="Toggle presentation mode (preview)"
          className="fixed bottom-5 right-20 sm:bottom-6 sm:right-[5.5rem] z-30 w-12 h-12 rounded-full border shadow-lg flex items-center justify-center"
          style={{
            background: presentationOn ? "#6366F1" : "#FFFFFF",
            color: presentationOn ? "#FFFFFF" : "#4A3B7A",
            borderColor: presentationOn ? "#6366F1" : "#E5E7EB",
          }}
        >
          <Tv2 size={20} />
        </button>

        {/* Projector prompt removed — the live dashboard now auto-enables
            Presentation Mode on fullscreen entry instead.  The Tv2 toggle
            below is the always-on manual control. */}
      </div>
    </LanguageProvider>
  );
}
