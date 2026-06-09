import { useLanguage } from '../hooks/useLanguage';
import { t } from '../i18n/strings';
import { passagesForLevel } from '../data/reading';
import { BackBar } from '../components/ui';
import PassageCard from '../components/PassageCard';
import type { UnitLevel } from '../core/types';

export default function ReadingView({ level, onBack }: { level: UnitLevel; onBack: () => void }) {
  const { language } = useLanguage();
  const passages = passagesForLevel(level);
  return (
    <div>
      <BackBar onBack={onBack} title={t(language, 'pillar_reading')} />
      {passages.map((p) => <PassageCard key={p.id} passage={p} />)}
    </div>
  );
}
