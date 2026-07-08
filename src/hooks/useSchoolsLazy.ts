/**
 * useSchoolsLazy — defer the ~330 kB Israeli school registry out of the
 * initial bundle, mirroring useVocabularyLazy.
 *
 * data/israel-schools.ts holds ~5,090 Ministry-of-Education schools. Only the
 * teacher sign-up screen needs it (the "select your school" dropdown), so it
 * must never load on the public landing / student paths. Pass `shouldLoad`
 * true once the teacher-signup screen mounts; the hook fires the dynamic
 * import, caches it at module level, and resolves.
 *
 * Usage:
 *   const schools = useSchoolsLazy(showTeacherSignup);
 *   const results = schools?.searchSchools(query) ?? [];
 */
import { useEffect, useState } from 'react';
import type { IsraelSchool } from '../data/israel-schools';

export interface SchoolsModule {
  ISRAEL_SCHOOLS: IsraelSchool[];
  searchSchools: (query: string, limit?: number) => IsraelSchool[];
  getSchoolById: (id: number) => IsraelSchool | undefined;
}

let cached: SchoolsModule | null = null;
let inFlight: Promise<SchoolsModule> | null = null;

async function loadSchools(): Promise<SchoolsModule> {
  if (cached) return cached;
  if (inFlight) return inFlight;
  inFlight = (async () => {
    const mod = await import('../data/israel-schools');
    cached = {
      ISRAEL_SCHOOLS: mod.ISRAEL_SCHOOLS,
      searchSchools: mod.searchSchools,
      getSchoolById: mod.getSchoolById,
    };
    return cached;
  })();
  return inFlight;
}

export function useSchoolsLazy(shouldLoad: boolean): SchoolsModule | null {
  const [schools, setSchools] = useState<SchoolsModule | null>(cached);

  useEffect(() => {
    if (!shouldLoad) return;
    if (cached) {
      setSchools(cached);
      return;
    }
    let cancelled = false;
    loadSchools().then((mod) => {
      if (!cancelled) setSchools(mod);
    });
    return () => {
      cancelled = true;
    };
  }, [shouldLoad]);

  return schools;
}
