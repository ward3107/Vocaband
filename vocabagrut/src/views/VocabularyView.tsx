import { useLanguage } from '../hooks/useLanguage';
import { t } from '../i18n/strings';
import { wordsForLevel } from '../data/vocabulary';
import { BackBar } from '../components/ui';
import WordFlow from '../components/WordFlow';
import type { UnitLevel } from '../core/types';

// The standalone Vocabulary pillar is just the shared word-flow with a header.
export default function VocabularyView({ level, onBack }: { level: UnitLevel; onBack: () => void }) {
  const { language } = useLanguage();
  return (
    <div>
      <BackBar onBack={onBack} title={t(language, 'pillar_vocabulary')} />
      <WordFlow words={wordsForLevel(level)} />
    </div>
  );
}
