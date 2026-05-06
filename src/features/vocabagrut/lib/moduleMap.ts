// Single source of truth for Bagrut module metadata.  Server `server.ts`
// duplicates the relevant subset (passage_words, writing_words, model) so
// that one file stays the canonical reference — see the comment at the top
// of the generate-bagrut endpoint.

import type { BagrutModule } from '../types';

export interface ModuleSpec {
  module: BagrutModule;
  label: string;            // English display label, e.g. "Module B"
  hebrewLabel: string;      // e.g. "מודול ב"
  pointTrack: 3 | 4 | 5;    // Bagrut point program this module belongs to
  cefr: string;             // approximate CEFR level
  gradeBand: string;        // e.g. "7–8"
  passageWords: { min: number; max: number };  // reading passage word count
  writingWords: { min: number; max: number };  // student writing target
  writingLines: number;     // ruled-line count in PDF writing box
  timeMinutes: number;      // suggested seat time
  available: boolean;       // false = "coming soon" tile in v1
}

export const MODULE_SPECS: Record<BagrutModule, ModuleSpec> = {
  A: {
    module: 'A',
    label: 'Module A',
    hebrewLabel: 'מודול א',
    pointTrack: 3,
    cefr: 'A2',
    gradeBand: '7',
    passageWords: { min: 120, max: 160 },
    writingWords: { min: 50, max: 70 },
    writingLines: 16,
    timeMinutes: 60,
    available: true,
  },
  B: {
    module: 'B',
    label: 'Module B',
    hebrewLabel: 'מודול ב',
    pointTrack: 3,
    cefr: 'A2/B1',
    gradeBand: '7–8',
    passageWords: { min: 180, max: 240 },
    writingWords: { min: 70, max: 100 },
    writingLines: 18,
    timeMinutes: 75,
    available: true,
  },
  C: {
    module: 'C',
    label: 'Module C',
    hebrewLabel: 'מודול ג',
    pointTrack: 4,
    cefr: 'B1',
    gradeBand: '8–9',
    passageWords: { min: 280, max: 340 },
    writingWords: { min: 100, max: 120 },
    writingLines: 22,
    timeMinutes: 90,
    available: true,
  },
  D: {
    module: 'D',
    label: 'Module D',
    hebrewLabel: 'מודול ד',
    pointTrack: 5,
    cefr: 'B1+/B2',
    gradeBand: '9 / HS',
    passageWords: { min: 300, max: 380 },
    writingWords: { min: 150, max: 200 },
    writingLines: 28,
    timeMinutes: 90,
    available: false,
  },
  E: {
    module: 'E',
    label: 'Module E',
    hebrewLabel: 'מודול ה',
    pointTrack: 5,
    cefr: 'B2',
    gradeBand: 'HS',
    passageWords: { min: 380, max: 450 },
    writingWords: { min: 180, max: 250 },
    writingLines: 32,
    timeMinutes: 105,
    available: false,
  },
};

export const AVAILABLE_MODULES: BagrutModule[] = ['A', 'B', 'C'];
export const COMING_SOON_MODULES: BagrutModule[] = ['D', 'E'];
