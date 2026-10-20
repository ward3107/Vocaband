import type { Language } from '../hooks/useLanguage';
import { studentInviteT } from '../locales/student-invite';
import { buildClassJoinUrl } from './classJoin';

export type StudentInviteMode = 'both' | 'link' | 'pin';

/** The PIN is message text only; the classroom URL never authenticates a student. */
export function buildStudentInviteMessage({
  className,
  classCode,
  studentId,
  studentName,
  pin,
  language,
  mode,
}: {
  className: string;
  classCode: string;
  studentId: string;
  studentName: string;
  pin: string | null;
  language: Language;
  mode: StudentInviteMode;
}): string {
  const t = studentInviteT[language];
  const content = pin ? mode : 'link';
  const lines = [`🎓 ${studentName} · ${className}`];
  if (content !== 'pin') {
    lines.push(buildClassJoinUrl(classCode, { className, studentId }));
  }
  lines.push(`🏫 ${t.classCode}: ${classCode}`);
  if (content !== 'link') lines.push(`🔑 ${t.personalPin}: ${pin}`);
  lines.push('', t[`${content}Steps`], t.keep);
  return lines.join('\n');
}
