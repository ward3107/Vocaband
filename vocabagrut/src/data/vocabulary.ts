import type { VocabWord } from '../core/types';

// Seed set of Bagrut vocabulary, tagged by the MoE Curriculum 2020 bands
// (I / II / III). In production this becomes the official Inspectorate band
// lists for the current exam period (updated per moed). Module E tests
// Bands I, II & III (Core 1); 3-point work stays within Bands I–II.
// `frequency` reflects how often a word recurs across past papers and
// drives study prioritisation.
export const VOCAB: VocabWord[] = [
  {
    id: 'v-acquire',
    word: 'acquire',
    partOfSpeech: 'verb',
    definition: 'to get or obtain something, especially a skill or knowledge',
    he: 'לרכוש, להשיג',
    ar: 'يكتسب، يحصل على',
    example: 'Students acquire new vocabulary by reading widely.',
    level: 4,
    band: 'III',
    frequency: 'high',
  },
  {
    id: 'v-significant',
    word: 'significant',
    partOfSpeech: 'adjective',
    definition: 'large or important enough to have an effect or be noticed',
    he: 'משמעותי, חשוב',
    ar: 'مهم، ذو دلالة',
    example: 'The study found a significant rise in screen time among teenagers.',
    level: 4,
    band: 'III',
    frequency: 'high',
  },
  {
    id: 'v-furthermore',
    word: 'furthermore',
    partOfSpeech: 'connector',
    definition: 'in addition to what has been said (used to add a point)',
    he: 'יתר על כן, בנוסף',
    ar: 'علاوة على ذلك',
    example: 'The plan is expensive. Furthermore, it may not even work.',
    level: 5,
    band: 'III',
    frequency: 'high',
  },
  {
    id: 'v-environment',
    word: 'environment',
    partOfSpeech: 'noun',
    definition: 'the natural world, or the conditions someone lives in',
    he: 'סביבה',
    ar: 'بيئة',
    example: 'Plastic waste is a serious threat to the environment.',
    level: 3,
    band: 'I',
    frequency: 'high',
  },
  {
    id: 'v-overcome',
    word: 'overcome',
    partOfSpeech: 'verb',
    definition: 'to successfully deal with or control a problem',
    he: 'להתגבר על',
    ar: 'يتغلّب على',
    example: 'She overcame her fear of public speaking.',
    level: 4,
    band: 'II',
    frequency: 'medium',
  },
  {
    id: 'v-nevertheless',
    word: 'nevertheless',
    partOfSpeech: 'connector',
    definition: 'in spite of what has just been said',
    he: 'אף על פי כן',
    ar: 'مع ذلك',
    example: 'The task was hard; nevertheless, they finished on time.',
    level: 5,
    band: 'III',
    frequency: 'medium',
  },
  {
    id: 'v-benefit',
    word: 'benefit',
    partOfSpeech: 'noun',
    definition: 'a helpful or good effect',
    he: 'תועלת, יתרון',
    ar: 'فائدة، منفعة',
    example: 'Regular exercise has many health benefits.',
    level: 3,
    band: 'II',
    frequency: 'high',
  },
  {
    id: 'v-reluctant',
    word: 'reluctant',
    partOfSpeech: 'adjective',
    definition: 'unwilling and hesitant to do something',
    he: 'מהסס, לא מוכן',
    ar: 'متردد، غير راغب',
    example: 'He was reluctant to admit that he was wrong.',
    level: 5,
    band: 'III',
    frequency: 'medium',
  },
];

export const wordsForLevel = (level: 3 | 4 | 5): VocabWord[] =>
  VOCAB.filter((w) => w.level <= level);
