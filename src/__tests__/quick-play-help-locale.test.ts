import { describe, it, expect } from 'vitest';
import { quickPlayT } from '../locales/student/quick-play';

const HELP_KEYS = [
  'helpButtonAria', 'helpMenuTitle',
  'helpCantHearWord', 'helpCantHearTip',
  'helpGameFrozen', 'helpReconnecting',
  'helpCantRead', 'helpShowTeacher',
  'helpHandRaisedToast', 'helpHandRaisedStatePill',
] as const;

describe('quick-play help locale keys', () => {
  it.each(['en', 'he', 'ar', 'ru'] as const)('has all help keys populated in %s', (lang) => {
    for (const key of HELP_KEYS) {
      const value = (quickPlayT[lang] as unknown as Record<string, unknown>)[key];
      expect(value, `${lang}.${key} missing`).toBeTypeOf('string');
      expect((value as string).length, `${lang}.${key} empty`).toBeGreaterThan(0);
    }
  });
});
