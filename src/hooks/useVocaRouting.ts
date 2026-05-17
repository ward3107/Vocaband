/**
 * Voca routing — teachers belong to exactly one Voca (users.subject)
 * so getEntitledVocas returns a single id and their activeVoca is
 * auto-set without showing the picker.  Admins are entitled to every
 * Voca and land on the picker until they pick one for this session.
 *
 * Pulled out of App.tsx so the gating rules (single-Voca auto-pick,
 * 2+ Voca picker redirect, dashboard-only entry-point) sit next to
 * the entitlement helper.
 */
import { useEffect } from 'react';
import type React from 'react';
import { hasTeacherAccess, type AppUser } from '../core/supabase';
import { getEntitledVocas, type VocaId } from '../core/subject';
import type { View } from '../core/views';

export function useVocaRouting(
  user: AppUser | null,
  activeVoca: VocaId | null,
  view: View,
  setActiveVoca: React.Dispatch<React.SetStateAction<VocaId | null>>,
  setView: React.Dispatch<React.SetStateAction<View>>,
): void {
  useEffect(() => {
    if (!user || !hasTeacherAccess(user)) return;
    const entitled = getEntitledVocas(user);
    if (entitled.length === 0) return;
    if (entitled.length === 1) {
      if (activeVoca !== entitled[0]) setActiveVoca(entitled[0]);
      return;
    }
    // 2+ Vocas (admin only): must pick.  If we're sitting on
    // teacher-dashboard without a pick, send to picker.  Don't redirect
    // mid-flow (create-assignment, classroom, etc.) — only the
    // dashboard entry-point triggers this.
    if (!activeVoca && view === 'teacher-dashboard') {
      setView('voca-picker');
    }
  }, [user, activeVoca, view, setActiveVoca, setView]);
}
