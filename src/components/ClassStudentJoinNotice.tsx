import { useLanguage } from '../hooks/useLanguage';
import { classLiveT } from '../locales/class-live';
import type { ClassStudentIdentity } from '../hooks/useClassStudentAutoJoin';

export default function ClassStudentJoinNotice({ student }: { student?: ClassStudentIdentity }) {
  const { language } = useLanguage();
  if (!student) return null;
  return <p role="status" className="mb-3 rounded-xl bg-violet-50 p-3 text-base font-bold text-violet-950">{classLiveT[language].identity(student.displayName)}</p>;
}
