import { useLanguage } from '../hooks/useLanguage';
import { t } from '../i18n/strings';
import { promptsForLevel } from '../data/writing';
import { BackBar } from '../components/ui';
import PromptEditor from '../components/PromptEditor';
import type { UnitLevel } from '../core/types';

export default function WritingView({ level, onBack }: { level: UnitLevel; onBack: () => void }) {
  const { language } = useLanguage();
  const prompts = promptsForLevel(level);
  return (
    <div>
      <BackBar onBack={onBack} title={t(language, 'pillar_writing')} />
      {prompts.map((p) => <PromptEditor key={p.id} prompt={p} />)}
    </div>
  );
}
