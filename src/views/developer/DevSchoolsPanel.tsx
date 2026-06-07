import { useState } from "react";
import DevSchoolsSection from "./DevSchoolsSection";
import DevSchoolSeedSection from "./DevSchoolSeedSection";
import DevSchoolDetail from "./DevSchoolDetail";
import type { DevSchool } from "./devShared";

interface Props {
  showToast: (msg: string, type?: "success" | "error" | "info") => void;
}

/**
 * "Schools" tab: one home for everything school-shaped. The list view manages
 * schools (create, assign principal, delete) and seeds coded classes; tapping a
 * school opens its drill-down — principal, teachers and the generated students.
 */
export default function DevSchoolsPanel({ showToast }: Props) {
  const [open, setOpen] = useState<DevSchool | null>(null);

  if (open) {
    return <DevSchoolDetail school={open} onBack={() => setOpen(null)} showToast={showToast} />;
  }

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h3 className="text-white/80 font-black text-base uppercase tracking-widest">Schools</h3>
        <p className="text-white/40 text-xs">Tap a school to see its principal, teachers and the students generated for it.</p>
        <DevSchoolsSection showToast={showToast} onOpen={setOpen} />
      </section>
      <section className="space-y-3">
        <h3 className="text-white/80 font-black text-base uppercase tracking-widest">Seed classes &amp; coded students</h3>
        <DevSchoolSeedSection showToast={showToast} />
      </section>
    </div>
  );
}
