import DevEntitlementsSection from "./DevEntitlementsSection";

interface Props {
  showToast: (msg: string, type?: "success" | "error" | "info") => void;
}

/** "DB overview & actions" tab: every mutation goes through an admin RPC that
 *  re-checks is_admin() server-side and is audit-logged. No raw SQL.
 *  School management + seeding + the per-school roster drill-down now live in
 *  their own "Schools" tab. */
export default function DevDatabasePanel({ showToast }: Props) {
  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h3 className="text-white/80 font-black text-base uppercase tracking-widest">Teachers &amp; entitlements</h3>
        <DevEntitlementsSection showToast={showToast} />
      </section>
    </div>
  );
}
