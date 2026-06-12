import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Search, CornerDownLeft, User, GraduationCap, School as SchoolIcon, ArrowRight } from "lucide-react";
import {
  callAdminRpcCached, type DevUserSearchResult, type DevClass, type DevSchool,
} from "./devShared";

type NavItem = { id: string; label: string };

interface Props {
  open: boolean;
  onClose: () => void;
  navItems: NavItem[];
  onGotoTab: (id: string) => void;
  onOpenPerson: (u: DevUserSearchResult) => void;
  showToast: (msg: string, type?: "success" | "error" | "info") => void;
}

type Result =
  | { kind: "cmd"; id: string; label: string }
  | { kind: "user"; user: DevUserSearchResult }
  | { kind: "class"; cls: DevClass }
  | { kind: "school"; school: DevSchool };

const SECTION: Record<Result["kind"], string> = { cmd: "Go to", user: "People", class: "Classes", school: "Schools" };
const ICON: Record<Result["kind"], typeof User> = { cmd: ArrowRight, user: User, class: GraduationCap, school: SchoolIcon };

function keyFor(r: Result): string {
  if (r.kind === "cmd") return `cmd-${r.id}`;
  if (r.kind === "user") return `u-${r.user.uid}`;
  if (r.kind === "class") return `c-${r.cls.id}`;
  return `s-${r.school.id}`;
}
function primaryFor(r: Result): string {
  if (r.kind === "cmd") return r.label;
  if (r.kind === "user") return r.user.display_name || r.user.email || r.user.uid;
  if (r.kind === "class") return r.cls.name;
  return r.school.name;
}
function secondaryFor(r: Result): string | undefined {
  if (r.kind === "user") return r.user.role;
  if (r.kind === "class") return r.cls.code;
  if (r.kind === "school") return `${r.school.students} students`;
  return undefined;
}

/**
 * ⌘K command palette — fuzzy jump across the whole admin surface. Always offers
 * tab navigation; once you type 2+ chars it also searches users, classes and
 * schools in one round-trip. Arrow keys + Enter, or click.
 */
export default function CommandPalette({ open, onClose, navItems, onGotoTab, onOpenPerson, showToast }: Props) {
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [users, setUsers] = useState<DevUserSearchResult[]>([]);
  const [classes, setClasses] = useState<DevClass[]>([]);
  const [schools, setSchools] = useState<DevSchool[]>([]);
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset palette state when it closes
    if (!open) { setQuery(""); setUsers([]); setClasses([]); setSchools([]); setActive(0); }
  }, [open]);

  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(query), 220);
    return () => window.clearTimeout(t);
  }, [query]);

  useEffect(() => {
    if (!open) return;
    const q = debounced.trim();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- clear stale results below the 2-char search floor
    if (q.length < 2) { setUsers([]); setClasses([]); setSchools([]); return; }
    let cancelled = false;
    void Promise.all([
      callAdminRpcCached<DevUserSearchResult[]>("admin_search_users", { p_query: q, p_limit: 6 }, showToast),
      callAdminRpcCached<DevClass[]>("admin_list_classes", { p_query: q, p_limit: 6 }, showToast),
      callAdminRpcCached<DevSchool[]>("admin_list_schools", {}, showToast),
    ]).then(([u, c, s]) => {
      if (cancelled) return;
      setUsers(u ?? []);
      setClasses(c ?? []);
      setSchools((s ?? []).filter((sc) => sc.name.toLowerCase().includes(q.toLowerCase())).slice(0, 5));
      setActive(0);
    });
    return () => { cancelled = true; };
  }, [open, debounced, showToast]);

  const results = useMemo<Result[]>(() => {
    const q = query.trim().toLowerCase();
    const cmds = navItems.filter((n) => !q || n.label.toLowerCase().includes(q));
    return [
      ...cmds.map((c) => ({ kind: "cmd", id: c.id, label: c.label }) as Result),
      ...users.map((user) => ({ kind: "user", user }) as Result),
      ...classes.map((cls) => ({ kind: "class", cls }) as Result),
      ...schools.map((school) => ({ kind: "school", school }) as Result),
    ];
  }, [navItems, query, users, classes, schools]);

  const select = useCallback((r: Result | undefined) => {
    if (!r) return;
    if (r.kind === "cmd") onGotoTab(r.id);
    else if (r.kind === "user") onOpenPerson(r.user);
    else if (r.kind === "class") onGotoTab("classes");
    else onGotoTab("schools");
    onClose();
  }, [onGotoTab, onOpenPerson, onClose]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); onClose(); }
      else if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, results.length - 1)); }
      else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
      else if (e.key === "Enter") { e.preventDefault(); select(results[active]); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, results, active, select, onClose]);

  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-idx="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[110] flex items-start justify-center p-4 pt-[12vh]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" />
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: -8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 340, damping: 30 }}
            className="relative w-full max-w-xl rounded-2xl bg-slate-900 border border-white/15 shadow-2xl overflow-hidden"
          >
            <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10">
              <Search className="w-5 h-5 text-white/40" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search users, classes, schools… or jump to a tab"
                className="flex-1 bg-transparent text-white placeholder-white/30 text-lg focus:outline-none"
              />
              <kbd className="text-white/30 text-xs font-mono border border-white/15 rounded px-1.5 py-0.5">esc</kbd>
            </div>

            <div ref={listRef} className="max-h-[56vh] overflow-y-auto p-2">
              {results.length === 0 && (
                <p className="px-4 py-6 text-white/40 text-base text-center">
                  {query.trim().length < 2 ? "Type to search people, classes & schools." : "No matches."}
                </p>
              )}
              {results.map((r, i) => {
                const showHeader = i === 0 || results[i - 1].kind !== r.kind;
                const Icon = ICON[r.kind];
                const isActive = i === active;
                const secondary = secondaryFor(r);
                return (
                  <div key={keyFor(r)}>
                    {showHeader && (
                      <div className="px-4 pt-3 pb-1 text-[10px] font-black uppercase tracking-widest text-white/30">{SECTION[r.kind]}</div>
                    )}
                    <button
                      type="button"
                      data-idx={i}
                      onMouseEnter={() => setActive(i)}
                      onClick={() => select(r)}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-left rounded-xl ${isActive ? "bg-teal-600 text-white" : "text-white/70 hover:bg-white/5"}`}
                    >
                      <Icon className="w-4 h-4 shrink-0 opacity-80" />
                      <span className="flex-1 min-w-0 truncate font-bold text-base">{primaryFor(r)}</span>
                      {secondary && <span className={`text-sm truncate shrink-0 ${isActive ? "text-white/70" : "text-white/40"}`}>{secondary}</span>}
                      {isActive && <CornerDownLeft className="w-3.5 h-3.5 shrink-0" />}
                    </button>
                  </div>
                );
              })}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
