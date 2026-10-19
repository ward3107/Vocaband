import { describe, expect, it } from 'vitest';
import { buildClassJoinUrl, parseJoinTarget, readStudentInvite } from '../utils/classJoin';
import { renderStudentEntryCards } from '../utils/studentEntryCards';

describe('class and game entry links', () => {
  it('never truncates a class code into a game code', () => {
    expect(parseJoinTarget('ABCD2345')).toEqual({ kind: 'class', code: 'ABCD2345' });
    expect(parseJoinTarget('abcd23')).toEqual({ kind: 'game', code: 'ABCD23' });
    expect(parseJoinTarget('https://vocaband.com/?session=ABCD2345')).toBeNull();
    expect(parseJoinTarget('https://vocaband.com/student?class=ABCD23')).toEqual({
      kind: 'class',
      code: 'ABCD23',
    });
    expect(parseJoinTarget('ABCD2345xyz')).toEqual({ kind: 'class', code: 'ABCD2345XYZ' });
  });
  it.each([
    'https://vocaband.com/student?class=abcd2345',
    'vocaband.com/?class=abcd2345',
    '/student?class=ABCD2345',
    '  "https://vocaband.com/?class=ABCD2345"  ',
  ])('accepts a teacher-shared class link: %s', (input) => {
    expect(parseJoinTarget(input)).toEqual({ kind: 'class', code: 'ABCD2345' });
  });
  it('rejects ambiguous, incomplete and non-web links', () => {
    for (const value of [
      '',
      'ABC',
      'A'.repeat(21),
      'https://vocaband.com/',
      'https://vocaband.com/?class=ABCD2345&session=ABCD23',
      'javascript:alert(1)',
      'ftp://vocaband.com/?class=ABCD2345',
    ]) {
      expect(parseJoinTarget(value)).toBeNull();
    }
  });
  it('preserves assignment and activity destinations when inviting a student', () => {
    const url = new URL(
      buildClassJoinUrl('ABCD2345', {
        origin: 'https://preview.example',
        className: 'ז׳ 2 & friends',
        assignmentId: 'task-1',
        playMode: 'class-minute',
      })
    );
    expect(url.origin + url.pathname).toBe('https://preview.example/student');
    expect(Object.fromEntries(url.searchParams)).toEqual({
      class: 'ABCD2345',
      className: 'ז׳ 2 & friends',
      assignment: 'task-1',
      play: 'class-minute',
    });
  });
  it('retains a valid personal invite and ignores a malformed profile id', () => {
    const id = '5f7b1234-1111-2222-3333-123456789abc';
    expect(readStudentInvite(`?class=ABCD2345&className=Year+7&s=${id}`)).toEqual({
      code: 'ABCD2345',
      name: 'Year 7',
      studentId: id,
    });
    expect(readStudentInvite('?class=ABCD2345&s=invalid').studentId).toBeNull();
  });
  it('uses class context to support an existing six-character classroom', () => {
    expect(parseJoinTarget('ABCD23', 'class')).toEqual({ kind: 'class', code: 'ABCD23' });
    expect(readStudentInvite('?class=ABCD23').code).toBe('ABCD23');
  });
});

describe('individual entry cards', () => {
  it.each(['en', 'he', 'ar'] as const)(
    'prints personal cards in %s, with credentials separate from links',
    (language) => {
      const html = renderStudentEntryCards({
        classCode: 'ABCD2345',
        className: 'Class 7',
        language,
        students: [
          { id: 'profile-one', displayName: 'Student One', pin: 'SECRET' },
          { id: 'profile-two', displayName: '07-5-2-14', pin: 'PRVAT2' },
          { id: 'profile-three', displayName: 'No credential', pin: null },
        ],
      });
      expect(html.match(/<section class="card">/g)).toHaveLength(2);
      expect(html.match(/<svg /g)).toHaveLength(2);
      expect(html).toContain('SECRET');
      expect(html).not.toContain('No credential');
      const links = [...html.matchAll(/href="([^"]+)"/g)].map((m) => m[1].replaceAll('&amp;', '&'));
      expect(links).toHaveLength(2);
      for (const href of links) {
        const url = new URL(href);
        expect(url.searchParams.get('class')).toBe('ABCD2345');
        expect(url.searchParams.has('s')).toBe(true);
        expect(href).not.toMatch(/SECRET|PRVAT2|pin=/i);
      }
      expect(html).toContain(`dir="${language === 'en' ? 'ltr' : 'rtl'}"`);
    }
  );
  it('escapes names and class labels in the printable document', () => {
    const html = renderStudentEntryCards({
      className: '<script>alert(1)</script>',
      classCode: 'ABCD2345',
      language: 'en',
      students: [{ id: 'profile', displayName: '<img src=x onerror=alert(1)>', pin: 'ABC234' }],
    });
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('<img src=x');
    expect(html).toContain('&lt;img');
  });
});
