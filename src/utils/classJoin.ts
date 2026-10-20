/** Class invites identify a classroom, never authenticate a student. */
// New classes use eight characters; migration 008 also permits existing
// six-to-twenty-character codes. Keep those invitations usable.
const CLASS_CODE = /^[A-Z0-9]{6,20}$/;
const GAME_CODE = /^[A-HJ-NP-Z2-9]{6}$/;
const STUDENT_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const LAST_CLASS_KEY = 'vocaband_last_class';

export type JoinTarget = { kind: 'class' | 'game'; code: string };

export function parseJoinTarget(raw: string, preferred?: JoinTarget['kind']): JoinTarget | null {
  const input = raw
    .trim()
    .replace(/^["'`]+|["'`]+$/g, '')
    .trim();
  let candidate = input.toUpperCase();
  let expected: JoinTarget['kind'] | undefined = preferred;
  if (/[/?=&.]/.test(input)) {
    try {
      const url = new URL(
        input.startsWith('/') ? input : input.includes('://') ? input : `https://${input}`,
        'https://vocaband.com'
      );
      if (!['http:', 'https:'].includes(url.protocol)) return null;
      if (url.searchParams.has('class') === url.searchParams.has('session')) return null;
      expected = url.searchParams.has('class') ? 'class' : 'game';
      candidate = (url.searchParams.get(expected === 'class' ? 'class' : 'session') ?? '')
        .trim()
        .toUpperCase();
    } catch {
      return null;
    }
  }
  // Never truncate a classroom code into a different game's six-character
  // code. URL parameters disambiguate legacy six-character class invites.
  if (expected === 'class')
    return CLASS_CODE.test(candidate) ? { kind: 'class', code: candidate } : null;
  if (expected === 'game')
    return GAME_CODE.test(candidate) ? { kind: 'game', code: candidate } : null;
  if (GAME_CODE.test(candidate)) return { kind: 'game', code: candidate };
  if (CLASS_CODE.test(candidate)) return { kind: 'class', code: candidate };
  return null;
}

export function readStudentInvite(search: string) {
  const params = new URLSearchParams(search);
  const target = parseJoinTarget(params.get('class') ?? '', 'class');
  const studentId = params.get('s');
  return {
    code: target?.kind === 'class' ? target.code : '',
    // This label is presentation only. Class membership still comes from
    // the existing PIN flow and server-side authorization.
    name: (params.get('className') ?? '').trim().slice(0, 100),
    studentId: studentId && STUDENT_ID.test(studentId) ? studentId : null,
  };
}

export function buildClassJoinUrl(
  code: string,
  options: {
    origin?: string;
    className?: string;
    studentId?: string;
    assignmentId?: string;
    playMode?: string;
  } = {}
): string {
  const origin =
    options.origin ??
    (typeof window !== 'undefined' && /^https?:$/.test(window.location.protocol)
      ? window.location.origin
      : 'https://vocaband.com');
  const url = new URL('/student', origin);
  url.searchParams.set('class', code);
  if (options.className) url.searchParams.set('className', options.className.slice(0, 100));
  if (options.studentId) url.searchParams.set('s', options.studentId);
  if (options.assignmentId) url.searchParams.set('assignment', options.assignmentId);
  if (options.playMode) url.searchParams.set('play', options.playMode);
  return url.toString();
}

export function readLastClass(): { code: string; name: string } | null {
  try {
    const saved = JSON.parse(localStorage.getItem(LAST_CLASS_KEY) ?? 'null');
    if (!saved || typeof saved.code !== 'string' || !CLASS_CODE.test(saved.code)) return null;
    return {
      code: saved.code,
      name: typeof saved.name === 'string' ? saved.name.slice(0, 100) : '',
    };
  } catch {
    return null;
  }
}

/** Preserve a personal invite if it was scanned in the game dialog. */
export function resolveClassJoinDestination(raw: string): string | null {
  const target = parseJoinTarget(raw);
  if (target?.kind !== 'class') return null;
  let search = '';
  try {
    const input = raw
      .trim()
      .replace(/^["'`]+|["'`]+$/g, '')
      .trim();
    search = new URL(
      input.startsWith('/') ? input : input.includes('://') ? input : `https://${input}`,
      'https://vocaband.com'
    ).search;
  } catch {
    /* A bare classroom code needs no URL context. */
  }
  const invite = readStudentInvite(search);
  const params = new URLSearchParams(search);
  return buildClassJoinUrl(target.code, {
    className: invite.name,
    studentId: invite.studentId ?? undefined,
    assignmentId: params.get('assignment')?.slice(0, 100),
    playMode: params.get('play') === 'class-minute' ? 'class-minute' : undefined,
  });
}

export function rememberClass(code: string, name: string) {
  try {
    // A shared classroom computer can remember the classroom, but this
    // shortcut must not retain a student's name, profile id, PIN or token.
    localStorage.setItem(LAST_CLASS_KEY, JSON.stringify({ code, name }));
  } catch {
    /* Private mode / full storage must not prevent login. */
  }
}
