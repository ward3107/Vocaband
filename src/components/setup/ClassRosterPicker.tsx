/**
 * ClassRosterPicker — "load players from a class" dropdown for the
 * single-device classroom modes (Hot Seat, Vocab Wheel).
 *
 * Picking a class fetches its authoritative roster via the same
 * `teacher_view_roster` RPC the dashboard roster modal uses — so the
 * list includes students who have never played a game, unlike the
 * progress-derived `classStudents` prefill.  The fetched names are
 * handed back to the parent which fills the players textarea, keeping
 * the list fully editable after the auto-fill.
 *
 * That RPC only returns structured-roster students (those created via
 * the coded-roster flow, `roster_created = TRUE`).  Classes whose
 * students self-joined by class code or Google OAuth aren't in that
 * table, so the RPC comes back empty and the teacher would have to
 * type every name.  To cover those classes, the parent can pass
 * `fallbackNamesByCode` — the progress-derived names per class code —
 * which we use whenever the RPC returns nothing (or errors).
 *
 * When `initialClassId` is set (the mode was launched from a class
 * card) the roster loads automatically on mount so the teacher lands
 * on a ready-to-start screen.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, AlertTriangle, Users } from 'lucide-react';
import { supabase } from '../../core/supabase';
import { useLanguage, type Language } from '../../hooks/useLanguage';

export interface RosterClassOption {
  id: string;
  name: string;
  code: string;
  avatar?: string | null;
}

interface ClassRosterPickerProps {
  classes: RosterClassOption[];
  /** Pre-select + auto-load this class on mount (the class the teacher
   *  launched the mode from).  Ignored if not in `classes`. */
  initialClassId?: string | null;
  /** Called with the roster's display names (never with an empty list —
   *  an empty roster shows the "no students yet" hint instead so it
   *  can't wipe names the teacher already typed). */
  onNamesLoaded: (names: string[]) => void;
  /** Progress-derived student names keyed by class code.  Used as a
   *  fallback when `teacher_view_roster` returns no structured-roster
   *  students (self-join / Google classes), so those teachers still get
   *  an auto-filled list instead of typing every name. */
  fallbackNamesByCode?: Record<string, string[]>;
  /** Match the host mode's theme colour. */
  accent?: 'orange' | 'violet';
}

type Status = 'idle' | 'loading' | 'done' | 'empty' | 'error';

const STRINGS: Record<Language, {
  label: string;
  placeholder: string;
  loading: string;
  loaded: (n: number) => string;
  empty: string;
  error: string;
}> = {
  en: {
    label: 'Load players from a class',
    placeholder: 'Choose a class…',
    loading: 'Loading students…',
    loaded: (n) => `${n} student${n === 1 ? '' : 's'} loaded — edit the list below if needed`,
    empty: 'No students in this class yet.',
    error: "Couldn't load the class list. Try again.",
  },
  he: {
    label: 'טעינת שחקנים מכיתה',
    placeholder: 'בחר כיתה…',
    loading: 'טוען תלמידים…',
    loaded: (n) => `נטענו ${n} תלמידים — אפשר לערוך את הרשימה למטה`,
    empty: 'אין עדיין תלמידים בכיתה הזו.',
    error: 'לא הצלחנו לטעון את רשימת הכיתה. נסה שוב.',
  },
  ar: {
    label: 'تحميل اللاعبين من صف',
    placeholder: 'اختر صفًا…',
    loading: 'جارٍ تحميل الطلاب…',
    loaded: (n) => `تم تحميل ${n} طالبًا — يمكنك تعديل القائمة أدناه`,
    empty: 'لا يوجد طلاب في هذا الصف بعد.',
    error: 'لم نتمكن من تحميل قائمة الصف. حاول مرة أخرى.',
  },
  ru: {
    label: 'Load players from a class',
    placeholder: 'Choose a class…',
    loading: 'Loading students…',
    loaded: (n) => `${n} student${n === 1 ? '' : 's'} loaded — edit the list below if needed`,
    empty: 'No students in this class yet.',
    error: "Couldn't load the class list. Try again.",
  },
};

const ACCENT_FOCUS: Record<NonNullable<ClassRosterPickerProps['accent']>, string> = {
  orange: 'focus:border-orange-400',
  violet: 'focus:border-violet-400',
};

export default function ClassRosterPicker({
  classes,
  initialClassId,
  onNamesLoaded,
  fallbackNamesByCode,
  accent = 'violet',
}: ClassRosterPickerProps) {
  const { language, dir } = useLanguage();
  const t = STRINGS[language] || STRINGS.en;

  // Lazily pre-select the launching class so the auto-load effect below
  // doesn't need a setState of its own.
  const [selectedId, setSelectedId] = useState(() =>
    initialClassId && classes.some((c) => c.id === initialClassId) ? initialClassId : '',
  );
  const [status, setStatus] = useState<Status>('idle');
  const [loadedCount, setLoadedCount] = useState(0);

  // Per-class cache so flipping between two classes doesn't refetch.
  const cacheRef = useRef(new Map<string, string[]>());
  // Latest-callback ref keeps loadClass stable across parent re-renders
  // (the parent rebuilds its props bag every render).
  const onNamesLoadedRef = useRef(onNamesLoaded);
  useEffect(() => {
    onNamesLoadedRef.current = onNamesLoaded;
  });
  const classesRef = useRef(classes);
  useEffect(() => {
    classesRef.current = classes;
  });
  const fallbackRef = useRef(fallbackNamesByCode);
  useEffect(() => {
    fallbackRef.current = fallbackNamesByCode;
  });

  // De-duplicate + numeric-aware sort, shared by the RPC result and the
  // progress-derived fallback so both render in a stable, sensible order.
  const normalizeNames = (raw: string[]): string[] =>
    Array.from(new Set(raw.map((n) => n.trim()).filter((n) => n.length > 0)))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  const loadClass = useCallback(async (classId: string) => {
    const cls = classesRef.current.find((c) => c.id === classId);
    if (!cls) return;
    const fallback = normalizeNames(fallbackRef.current?.[cls.code] ?? []);
    const cached = cacheRef.current.get(cls.code);
    if (cached) {
      setStatus(cached.length > 0 ? 'done' : 'empty');
      setLoadedCount(cached.length);
      if (cached.length > 0) onNamesLoadedRef.current(cached);
      return;
    }
    setStatus('loading');
    try {
      const { data, error } = await supabase.rpc('teacher_view_roster', {
        p_class_code: cls.code,
      });
      if (error) throw error;
      let names = normalizeNames(
        ((data ?? []) as Array<Record<string, unknown>>).map(
          (r) => (r.display_name as string) ?? '',
        ),
      );
      // No structured roster for this class (self-join / Google) — fall
      // back to the names we already know from the progress table so the
      // teacher isn't left typing the whole list by hand.
      if (names.length === 0) names = fallback;
      cacheRef.current.set(cls.code, names);
      setLoadedCount(names.length);
      if (names.length > 0) {
        setStatus('done');
        onNamesLoadedRef.current(names);
      } else {
        setStatus('empty');
      }
    } catch {
      // The RPC failed (e.g. a class the teacher can't roster-read) — still
      // offer the progress-derived names rather than dead-ending on error.
      if (fallback.length > 0) {
        cacheRef.current.set(cls.code, fallback);
        setLoadedCount(fallback.length);
        setStatus('done');
        onNamesLoadedRef.current(fallback);
      } else {
        setStatus('error');
      }
    }
  }, []);

  // Auto-load the launching class once on mount.
  const didInitRef = useRef(false);
  useEffect(() => {
    if (didInitRef.current) return;
    didInitRef.current = true;
    if (selectedId) void loadClass(selectedId);
  }, [selectedId, loadClass]);

  if (classes.length === 0) return null;

  return (
    <div>
      <div className="flex items-center gap-1.5 mb-2">
        <Users size={14} className="text-stone-600" />
        <label htmlFor="class-roster-picker" className="text-sm font-bold text-stone-700">
          {t.label}
        </label>
      </div>
      <select
        id="class-roster-picker"
        value={selectedId}
        onChange={(e) => {
          const id = e.target.value;
          setSelectedId(id);
          if (id) void loadClass(id);
          else setStatus('idle');
        }}
        dir={dir}
        className={`w-full rounded-lg border-2 border-stone-200 ${ACCENT_FOCUS[accent]} focus:outline-none px-3 py-2.5 text-sm font-semibold text-stone-800 bg-white`}
      >
        <option value="">{t.placeholder}</option>
        {classes.map((c) => (
          <option key={c.id} value={c.id}>
            {c.avatar ? `${c.avatar} ` : ''}{c.name}
          </option>
        ))}
      </select>
      {status === 'loading' && (
        <p className="mt-1.5 flex items-center gap-1.5 text-xs font-semibold text-stone-600">
          <Loader2 size={14} className="animate-spin" />
          {t.loading}
        </p>
      )}
      {status === 'done' && (
        <p className="mt-1.5 text-xs font-semibold text-emerald-700">{t.loaded(loadedCount)}</p>
      )}
      {status === 'empty' && (
        <p className="mt-1.5 text-xs font-semibold text-stone-500">{t.empty}</p>
      )}
      {status === 'error' && (
        <p className="mt-1.5 flex items-start gap-1.5 text-xs font-semibold text-rose-600">
          <AlertTriangle size={14} className="shrink-0 mt-0.5" />
          <span>{t.error}</span>
        </p>
      )}
    </div>
  );
}
