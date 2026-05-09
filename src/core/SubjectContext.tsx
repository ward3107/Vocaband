/**
 * SubjectContext — exposes the teacher's currently-active Voca to any
 * descendant of the teacher render tree without prop drilling.  A
 * single provider wraps the teacher branch in App.tsx; leaf components
 * that branch on subject (dashboard sections, class card labels,
 * gradebook word-lookup, the Hebrew solo-launch strip, etc.) read the
 * context via `useSubject()` instead of accepting a `subject` prop.
 *
 * Why context, not route params or prop drilling: the app uses
 * imperative `setView` everywhere — there's no router on the dashboard
 * surface — so a route-param approach would require a separate router
 * migration.  Prop drilling would force every intermediate component to
 * accept and forward a `subject` prop even when it doesn't care.  A
 * single provider with a memoised value lets only the leaves that
 * actually branch read from it, and keeps the branching deep where it
 * belongs.
 */

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { type VocaId } from "./subject";

interface SubjectContextValue {
  subject: VocaId;
  /** Subjects the current user is entitled to.  Lets components decide
   *  whether to show subject-switching affordances. */
  entitled: readonly VocaId[];
  setSubject: (next: VocaId | null) => void;
}

const SubjectContext = createContext<SubjectContextValue | null>(null);

interface SubjectProviderProps {
  subject: VocaId;
  entitled: readonly VocaId[];
  setSubject: (next: VocaId | null) => void;
  children: ReactNode;
}

export function SubjectProvider({
  subject,
  entitled,
  setSubject,
  children,
}: SubjectProviderProps) {
  const value = useMemo<SubjectContextValue>(
    () => ({ subject, entitled, setSubject }),
    [subject, entitled, setSubject],
  );
  return (
    <SubjectContext.Provider value={value}>{children}</SubjectContext.Provider>
  );
}

/**
 * Read the active subject.  Throws if used outside a SubjectProvider so
 * misuse stays loud — the dashboard tree should always be wrapped.  Use
 * `useSubjectOptional()` for the rare component that legitimately renders
 * before subject is decided (e.g. the picker itself).
 */
export function useSubject(): VocaId {
  const ctx = useContext(SubjectContext);
  if (!ctx) {
    throw new Error(
      "useSubject must be used inside a SubjectProvider (typically wrapping the teacher render branch).",
    );
  }
  return ctx.subject;
}

export function useSubjectContext(): SubjectContextValue {
  const ctx = useContext(SubjectContext);
  if (!ctx) {
    throw new Error(
      "useSubjectContext must be used inside a SubjectProvider.",
    );
  }
  return ctx;
}

export function useSubjectOptional(): VocaId | null {
  return useContext(SubjectContext)?.subject ?? null;
}
