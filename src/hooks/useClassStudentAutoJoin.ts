import { useEffect, useRef } from 'react';
import type { AppUser } from '../core/supabase';

export type ClassStudentIdentity = Pick<AppUser, 'uid' | 'displayName' | 'avatar'>;
export const classStudentName = (student?: ClassStudentIdentity) => student?.displayName.trim().slice(0, 30) ?? '';

/** Reuses the existing JOIN/ACK path; never claims success before the server. */
export function useClassStudentAutoJoin(student: ClassStudentIdentity | undefined, sessionCode: string | undefined, join: () => void) {
  const latestJoin = useRef(join);
  const started = useRef('');
  useEffect(() => { latestJoin.current = join; });
  const uid = student?.uid;
  const name = classStudentName(student);
  useEffect(() => {
    if (!uid || !sessionCode || !name) return;
    const key = `${uid}:${sessionCode}`;
    if (started.current === key) return;
    // Scheduling lets StrictMode cancel its throwaway mount before joining.
    const timer = setTimeout(() => { started.current = key; latestJoin.current(); }, 0);
    return () => clearTimeout(timer);
  }, [uid, name, sessionCode]);
}
