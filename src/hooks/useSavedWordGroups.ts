/**
 * useSavedWordGroups — per-teacher persistent saved-groups store.
 *
 * Replaces the old localStorage-keyed 'vocaband-saved-groups' that
 * disappeared on logout / device change.  Now backed by the
 * `public.saved_word_groups` Supabase table (see migration
 * 20260430073933_saved_word_groups.sql) with RLS so each teacher
 * only sees their own groups.
 *
 * Returns:
 *   - groups   — current list, sorted most-recent-first
 *   - loading  — true while the initial fetch is in flight
 *   - addGroup({name, wordIds}) — INSERT, returns the new group
 *   - renameGroup(id, newName) — UPDATE name only
 *   - deleteGroup(id) — DELETE
 *
 * All mutations optimistically update local state; on error the call
 * surfaces the message via showToast (passed through useToast in the
 * caller).  No automatic refetch — Supabase Realtime is overkill for
 * this low-volume per-teacher list.
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
  /** Teacher's auth uid.  When null/undefined, the hook reads it from
   *  the active Supabase session on mount.  Most callers can omit
   *  this and rely on the session-derived value. */
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

export function useSavedWordGroups(params: UseSavedWordGroupsParams = {}): UseSavedWordGroups {
  const [groups, setGroups] = useState<SavedWordGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolvedUid, setResolvedUid] = useState<string | null>(params.teacherUid ?? null);

  // Resolve teacher uid from the session if the caller didn't supply
  // one.  Single round trip on mount.
  useEffect(() => {
    if (params.teacherUid) {
      setResolvedUid(params.teacherUid);
      return;
    }
    let cancelled = false;
    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      setResolvedUid(data.session?.user?.id ?? null);
    });
    return () => { cancelled = true; };
  }, [params.teacherUid]);

  // Initial fetch on mount + whenever teacher changes
  useEffect(() => {
    if (!resolvedUid) {
      setGroups([]);
      setLoading(true);
      return;
    }
    let cancelled = false;
    setLoading(true);
    supabase
      .from("saved_word_groups")
      .select("id, name, word_ids, created_at")
      .eq("teacher_uid", resolvedUid)
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
  }, [resolvedUid]);

  const addGroup = useCallback(async ({ name, wordIds }: { name: string; wordIds: number[] }) => {
    if (!resolvedUid) return null;
    const trimmed = name.trim();
    if (!trimmed || wordIds.length === 0) return null;
    const { data, error } = await supabase
      .from("saved_word_groups")
      .insert({ teacher_uid: resolvedUid, name: trimmed, word_ids: wordIds })
      .select("id, name, word_ids, created_at")
      .single();
    if (error || !data) {
      console.warn("[saved-groups] insert failed:", error?.message);
      return null;
    }
    const row = mapRow(data);
    setGroups(prev => [row, ...prev.filter(g => g.id !== row.id)]);
    return row;
  }, [resolvedUid]);

  const renameGroup = useCallback(async (id: string, newName: string) => {
    if (!resolvedUid) return false;
    const trimmed = newName.trim();
    if (!trimmed) return false;
    const { error } = await supabase
      .from("saved_word_groups")
      .update({ name: trimmed })
      .eq("id", id)
      .eq("teacher_uid", resolvedUid);
    if (error) {
      console.warn("[saved-groups] rename failed:", error.message);
      return false;
    }
    setGroups(prev => prev.map(g => g.id === id ? { ...g, name: trimmed } : g));
    return true;
  }, [resolvedUid]);

  const deleteGroup = useCallback(async (id: string) => {
    if (!resolvedUid) return false;
    const { error } = await supabase
      .from("saved_word_groups")
      .delete()
      .eq("id", id)
      .eq("teacher_uid", resolvedUid);
    if (error) {
      console.warn("[saved-groups] delete failed:", error.message);
      return false;
    }
    setGroups(prev => prev.filter(g => g.id !== id));
    return true;
  }, [resolvedUid]);

  return { groups, loading, addGroup, renameGroup, deleteGroup };
}
