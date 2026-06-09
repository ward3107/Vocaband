import { useMemo } from 'react';
import { useLanguage } from '../hooks/useLanguage';
import { t } from '../i18n/strings';
import { wordsForLevel } from '../data/vocabulary';
import { useCustomWords } from '../hooks/useCustomWords';
import { BackBar } from '../components/ui';
import WordFlow from '../components/WordFlow';
import type { UnitLevel } from '../core/types';

// The standalone Vocabulary pillar is the shared word-flow, with the
// student's own custom words mixed in after the curriculum set.
export default function VocabularyView({ level, onBack }: { level: UnitLevel; onBack: () => void }) {
  const { language } = useLanguage();
  const { words: custom } = useCustomWords();
  const words = useMemo(() => [...wordsForLevel(level), ...custom], [level, custom]);
  return (
    <div>
      <BackBar onBack={onBack} title={t(language, 'pillar_vocabulary')} />
      <WordFlow words={words} />
    </div>
  );
}
