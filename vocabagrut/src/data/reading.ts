import type { ReadingPassage } from '../core/types';

// Two exam-style passages with a mix of multiple-choice, open, and HOTS
// questions — mirroring the structure of a real Bagrut reading section.
// Replace/extend with a larger bank (ideally tagged to past papers).
export const PASSAGES: ReadingPassage[] = [
  {
    id: 'r-screen-time',
    title: 'Teenagers and Screen Time',
    level: 4,
    hotsFocus: 'Inferring · Distinguishing different perspectives',
    wordCount: 168,
    source: 'Adapted exam-style text',
    text:
      'A recent study followed 2,000 teenagers for two years to learn how screen ' +
      'time affects sleep. The researchers found that students who used their ' +
      'phones in the hour before bed slept, on average, 45 minutes less than ' +
      'those who did not. Many of these students also reported feeling tired ' +
      'during morning classes.\n\n' +
      'The study did not claim that screens are the only cause of poor sleep. ' +
      'Stress, late homework, and caffeine all played a part. However, the ' +
      'researchers argued that the blue light from screens, together with the ' +
      'temptation to keep scrolling, made it harder for teenagers to "switch ' +
      'off". One scientist on the team said, "We are not telling young people ' +
      'to throw away their phones. We are simply suggesting a screen-free hour ' +
      'before sleep."\n\n' +
      'Some teenagers in the study disagreed. They felt that watching a relaxing ' +
      'video actually helped them fall asleep. The researchers admitted that ' +
      'this may be true for a small number of people, but said the overall ' +
      'pattern was clear.',
    questions: [
      {
        id: 'r-screen-q1',
        type: 'multiple-choice',
        prompt: 'According to the study, students who used phones before bed…',
        options: [
          'slept about 45 minutes less than others',
          'never felt tired in the morning',
          'stopped using their phones completely',
          'slept 45 minutes more than others',
        ],
        answerIndex: 0,
        points: 20,
      },
      {
        id: 'r-screen-q2',
        type: 'multiple-choice',
        prompt: 'The scientist quoted in the text recommends that teenagers…',
        options: [
          'throw away their phones',
          'avoid screens for an hour before sleep',
          'watch relaxing videos every night',
          'do homework late at night',
        ],
        answerIndex: 1,
        points: 20,
      },
      {
        id: 'r-screen-q3',
        type: 'open',
        prompt: 'Name TWO causes of poor sleep mentioned in the text besides screens.',
        sampleAnswer: 'Any two of: stress, late homework, caffeine.',
        points: 25,
      },
      {
        id: 'r-screen-q4',
        type: 'hots',
        prompt:
          'HOTS — Inferring: Why do you think the researchers included the opinion ' +
          'of teenagers who disagreed? Explain in your own words.',
        sampleAnswer:
          'To show the study was balanced and fair — they considered evidence ' +
          'against their conclusion before deciding the overall pattern was clear.',
        hots: 'Inferring',
        points: 35,
      },
    ],
  },
  {
    id: 'r-volunteering',
    title: 'Why Young People Volunteer',
    level: 5,
    hotsFocus: 'Explaining cause and effect',
    wordCount: 142,
    source: 'Adapted exam-style text',
    text:
      'Across the country, a growing number of high-school students choose to ' +
      'spend their free time volunteering. Some help elderly neighbours with ' +
      'shopping; others tutor younger children or clean up local parks.\n\n' +
      'Researchers who study volunteering say the reasons are not purely ' +
      'generous. Teenagers report that helping others gives them a sense of ' +
      'purpose and reduces feelings of loneliness. Moreover, volunteering looks ' +
      'good on university applications — a fact that many students openly admit.\n\n' +
      'Critics worry that if students volunteer only to improve their record, ' +
      'the value of the work is lost. Supporters disagree. They argue that ' +
      'whatever the reason, the community still benefits, and many students who ' +
      'begin volunteering for selfish reasons continue long after they no longer ' +
      'need to.',
    questions: [
      {
        id: 'r-vol-q1',
        type: 'multiple-choice',
        prompt: 'According to researchers, one personal benefit of volunteering is…',
        options: [
          'earning a high salary',
          'a reduced sense of loneliness',
          'avoiding schoolwork',
          'travelling abroad',
        ],
        answerIndex: 1,
        points: 25,
      },
      {
        id: 'r-vol-q2',
        type: 'open',
        prompt: 'Why do critics worry about students who volunteer to improve their record?',
        sampleAnswer:
          'They fear the work loses its value / becomes less meaningful if it is ' +
          'done only for self-interest rather than to help others.',
        points: 35,
      },
      {
        id: 'r-vol-q3',
        type: 'hots',
        prompt:
          'HOTS — Explaining cause and effect: Explain how the text answers the ' +
          'critics in the final paragraph.',
        sampleAnswer:
          'Supporters say the community benefits regardless of motive, and that ' +
          'students who start for selfish reasons often keep volunteering even ' +
          'when there is no longer any benefit to themselves.',
        hots: 'Explaining cause and effect',
        points: 40,
      },
    ],
  },
];

export const passagesForLevel = (level: 3 | 4 | 5): ReadingPassage[] =>
  PASSAGES.filter((p) => p.level <= level);
