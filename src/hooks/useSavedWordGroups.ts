/**
 * useSavedWordGroups — per-teacher persistent saved-groups store.
 *
 * Keyed by EMAIL not by auth.users UUID — so a teacher who signs in
 * via magic link AND via Google OAuth (same email, different
 * Supabase user UUIDs unless manual identity linking is on) sees
 * the same set of groups.  Migration
 * 20260501022528_saved_word_groups_by_email.sql added the
 * teacher_email column and re-keyed the RLS + indexes.
 *
 * Returns:
 *   - groups   — current list, sorted most-recent-first
 *   - loading  — true while the initial fetch is in flight
 *   - addGroup({name, wordIds}) — INSERT, returns the new group
 *   - renameGroup(id, newName) — UPDATE name only
 *   - deleteGroup(id) — DELETE
 *
 * All mutations optimistically update local state; on error the call
 * surfaces the message via console.warn (caller should already have
 * surfaced an error toast — we don't double-toast from here).
 */
import { useCallback, useEffect, useState } from "react";
import { supabase } from "../core/supabase";

export interface SavedWordGroup {
  id: string;
  name: string;
  /** word IDs — can be negative (custom words synthesized via OCR /
   *  paste / manual entry).  Stored as bigint[] in the DB. */
  words: number[];
  createdAt: string;
}

export interface UseSavedWordGroups {
  groups: SavedWordGroup[];
  loading: boolean;
  /** Insert a new group.  Returns the created row on success, null on
   *  failure (and the caller should already have surfaced an error
   *  toast — we don't double-toast from here). */
  addGroup: (input: { name: string; wordIds: number[] }) => Promise<SavedWordGroup | null>;
  /** Rename a group.  Returns true on success. */
  renameGroup: (id: string, newName: string) => Promise<boolean>;
  /** Delete a group.  Returns true on success. */
  deleteGroup: (id: string) => Promise<boolean>;
}

interface UseSavedWordGroupsParams {
  /** Optional override of the teacher's auth uid.  Kept on the
   *  interface for backwards-compatibility with existing callers
   *  that still pass it; internally the hook now keys by email
   *  (read off the active Supabase session) so this prop is only
   *  used to populate the teacher_uid column on insert (audit /
   *  debug).  Most callers can omit it. */
  teacherUid?: string | null;
}

interface DbRow {
  id: string;
  name: string;
  word_ids: number[] | string[]; // bigint[] arrives as string[] from PostgREST
  created_at: string;
}

const mapRow = (r: DbRow): SavedWordGroup => ({
  id: r.id,
  name: r.name,
  // PostgREST returns bigint[] as string[] (preserves precision).
  // Convert to number[] — our negative-id custom-word IDs are
  // Date.now()-based (13 digits, well within Number.MAX_SAFE_INTEGER).
  words: (r.word_ids as Array<string | number>).map(v => typeof v === "string" ? parseInt(v, 10) : v),
  createdAt: r.created_at,
});

const normaliseEmail = (email: string | null | undefined): string | null =>
  email ? email.trim().toLowerCase() : null;

export function useSavedWordGroups(params: UseSavedWordGroupsParams = {}): UseSavedWordGroups {
  const [groups, setGroups] = useState<SavedWordGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolvedEmail, setResolvedEmail] = useState<string | null>(null);
  const [resolvedUid, setResolvedUid] = useState<string | null>(params.teacherUid ?? null);

  // Resolve teacher email + uid from the active session.  Email is
  // the stable cross-auth-method identity (used for queries + RLS);
  // uid is just for the audit teacher_uid column.  Single round
  // trip on mount — refreshes if the prop changes.
  useEffect(() => {
    let cancelled = false;
    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      const email = normaliseEmail(data.session?.user?.email);
      const uid = params.teacherUid ?? data.session?.user?.id ?? null;
      setResolvedEmail(email);
      setResolvedUid(uid);
    });
    return () => { cancelled = true; };
  }, [params.teacherUid]);

  // Initial fetch on mount + whenever teacher email changes (logout
  // / login).
  useEffect(() => {
    if (!resolvedEmail) {
      setGroups([]);
      setLoading(true);
      return;
    }
    let cancelled = false;
    setLoading(true);
    supabase
      .from("saved_word_groups")
      .select("id, name, word_ids, created_at")
      .eq("teacher_email", resolvedEmail)
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          console.warn("[saved-groups] fetch failed:", error.message);
          setGroups([]);
        } else {
          setGroups((data ?? []).map(mapRow));
        }
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [resolvedEmail]);

  const addGroup = useCallback(async ({ name, wordIds }: { name: string; wordIds: number[] }) => {
    if (!resolvedEmail) return null;
    const trimmed = name.trim();
    if (!trimmed || wordIds.length === 0) return null;
    // teacher_uid still populated for audit — RLS now keys on email.
    const { data, error } = await supabase
      .from("saved_word_groups")
      .insert({
        teacher_uid: resolvedUid,
        teacher_email: resolvedEmail,
        name: trimmed,
        word_ids: wordIds,
      })
      .select("id, name, word_ids, created_at")
      .single();
    if (error || !data) {
      console.warn("[saved-groups] insert failed:", error?.message);
      return null;
    }
    const row = mapRow(data);
    setGroups(prev => [row, ...prev.filter(g => g.id !== row.id)]);
    return row;
  }, [resolvedEmail, resolvedUid]);

  const renameGroup = useCallback(async (id: string, newName: string) => {
    if (!resolvedEmail) return false;
    const trimmed = newName.trim();
    if (!trimmed) return false;
    const { error } = await supabase
      .from("saved_word_groups")
      .update({ name: trimmed })
      .eq("id", id)
      .eq("teacher_email", resolvedEmail);
    if (error) {
      console.warn("[saved-groups] rename failed:", error.message);
      return false;
    }
    setGroups(prev => prev.map(g => g.id === id ? { ...g, name: trimmed } : g));
    return true;
  }, [resolvedEmail]);

  const deleteGroup = useCallback(async (id: string) => {
    if (!resolvedEmail) return false;
    const { error } = await supabase
      .from("saved_word_groups")
      .delete()
      .eq("id", id)
      .eq("teacher_email", resolvedEmail);
    if (error) {
      console.warn("[saved-groups] delete failed:", error.message);
      return false;
    }
    setGroups(prev => prev.filter(g => g.id !== id));
    return true;
  }, [resolvedEmail]);

  return { groups, loading, addGroup, renameGroup, deleteGroup };
}
