import { describe, it, expect } from 'vitest';
import { mapUser, mapClass, mapAssignment, mapProgress, mapUserToDb } from '../supabase';

describe('mapUser', () => {
  it('maps a database row to AppUser', () => {
    const row = {
      uid: 'abc123',
      email: 'teacher@school.com',
      role: 'teacher',
      display_name: 'Ms Smith',
      class_code: null,
      avatar: null,
      badges: null,
    };
    const user = mapUser(row);
    expect(user.uid).toBe('abc123');
    expect(user.displayName).toBe('Ms Smith');
    expect(user.badges).toEqual([]);
  });
});

describe('mapUserToDb', () => {
  it('omits undefined fields', () => {
    const result = mapUserToDb({ uid: 'abc123', displayName: 'Jo' });
    expect(result).toHaveProperty('display_name', 'Jo');
    expect(result).not.toHaveProperty('email');
    expect(result).not.toHaveProperty('role');
  });
});

describe('mapClass', () => {
  it('maps a database row to ClassData', () => {
    const row = { id: 'uuid-1', name: 'Math 101', code: 'ABC123', teacher_uid: 'uid-1' };
    const cls = mapClass(row);
    expect(cls.teacherUid).toBe('uid-1');
    expect(cls.code).toBe('ABC123');
  });
});

describe('mapAssignment', () => {
  it('defaults word_ids to empty array when null', () => {
    const row = {
      id: 'uuid-2',
      class_id: 'uuid-1',
      word_ids: null,
      words: null,
      title: 'Week 1',
      deadline: null,
      allowed_modes: null,
    };
    const assignment = mapAssignment(row);
    expect(assignment.wordIds).toEqual([]);
  });
});

describe('mapProgress', () => {
  it('maps a database row to ProgressData', () => {
    const row = {
      id: 'uuid-3',
      student_name: 'Alice',
      student_uid: 'uid-2',
      assignment_id: 'uuid-2',
      class_code: 'ABC123',
      score: 850,
      mode: 'flashcard',
      completed_at: '2025-01-01T00:00:00Z',
      mistakes: [1, 2],
      avatar: '🦊',
    };
    const progress = mapProgress(row);
    expect(progress.studentName).toBe('Alice');
    expect(progress.score).toBe(850);
    expect(progress.mistakes).toEqual([1, 2]);
  });
});
