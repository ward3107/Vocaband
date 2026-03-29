import { describe, it, expect } from 'vitest';
import { mapUser, mapClass, mapAssignment, mapProgress, mapUserToDb, mapProgressToDb } from '../core/supabase';

// ─── mapUser ─────────────────────────────────────────────────────────────────

describe('mapUser', () => {
  it('maps all fields from DB row to AppUser', () => {
    const row = {
      uid: 'abc123',
      email: 'teacher@school.com',
      role: 'teacher',
      display_name: 'Ms Smith',
      class_code: 'XYZ999',
      avatar: '🦁',
      badges: ['first_win'],
    };
    const user = mapUser(row);
    expect(user.uid).toBe('abc123');
    expect(user.email).toBe('teacher@school.com');
    expect(user.role).toBe('teacher');
    expect(user.displayName).toBe('Ms Smith');
    expect(user.classCode).toBe('XYZ999');
    expect(user.avatar).toBe('🦁');
    expect(user.badges).toEqual(['first_win']);
  });

  it('defaults badges to empty array when null', () => {
    const row = {
      uid: 'abc123',
      email: null,
      role: 'student',
      display_name: 'Jo',
      class_code: null,
      avatar: null,
      badges: null,
    };
    expect(mapUser(row).badges).toEqual([]);
  });

  it('defaults badges to empty array when undefined', () => {
    const row = {
      uid: 'abc123',
      email: null,
      role: 'student',
      display_name: 'Jo',
      class_code: null,
      avatar: null,
    };
    expect(mapUser(row).badges).toEqual([]);
  });

  it('preserves an existing badges array', () => {
    const row = {
      uid: 'u1',
      email: null,
      role: 'student',
      display_name: 'Alice',
      class_code: null,
      avatar: null,
      badges: ['badge1', 'badge2'],
    };
    expect(mapUser(row).badges).toEqual(['badge1', 'badge2']);
  });
});

// ─── mapUserToDb ─────────────────────────────────────────────────────────────

describe('mapUserToDb', () => {
  it('always includes uid', () => {
    const result = mapUserToDb({ uid: 'abc123' });
    expect(result).toHaveProperty('uid', 'abc123');
  });

  it('omits undefined optional fields', () => {
    const result = mapUserToDb({ uid: 'abc123', displayName: 'Jo' });
    expect(result).toHaveProperty('display_name', 'Jo');
    expect(result).not.toHaveProperty('email');
    expect(result).not.toHaveProperty('role');
    expect(result).not.toHaveProperty('class_code');
    expect(result).not.toHaveProperty('avatar');
    expect(result).not.toHaveProperty('badges');
  });

  it('includes a defined email', () => {
    const result = mapUserToDb({ uid: 'u1', email: 'a@b.com' });
    expect(result).toHaveProperty('email', 'a@b.com');
  });

  it('includes defined classCode as class_code', () => {
    const result = mapUserToDb({ uid: 'u1', classCode: 'ABC123' });
    expect(result).toHaveProperty('class_code', 'ABC123');
  });

  it('includes null values when explicitly provided', () => {
    const result = mapUserToDb({ uid: 'u1', email: undefined, avatar: undefined });
    expect(result).not.toHaveProperty('email');
    expect(result).not.toHaveProperty('avatar');
  });
});

// ─── mapClass ────────────────────────────────────────────────────────────────

describe('mapClass', () => {
  it('maps all fields correctly', () => {
    const row = { id: 'uuid-1', name: 'Math 101', code: 'ABC123', teacher_uid: 'uid-1' };
    const cls = mapClass(row);
    expect(cls.id).toBe('uuid-1');
    expect(cls.name).toBe('Math 101');
    expect(cls.code).toBe('ABC123');
    expect(cls.teacherUid).toBe('uid-1');
  });
});

// ─── mapAssignment ───────────────────────────────────────────────────────────

describe('mapAssignment', () => {
  it('maps all fields correctly', () => {
    const row = {
      id: 'uuid-2',
      class_id: 'uuid-1',
      word_ids: [1, 2, 3],
      words: null,
      title: 'Week 1',
      deadline: '2025-06-01',
      allowed_modes: ['classic', 'spelling'],
    };
    const a = mapAssignment(row);
    expect(a.id).toBe('uuid-2');
    expect(a.classId).toBe('uuid-1');
    expect(a.wordIds).toEqual([1, 2, 3]);
    expect(a.title).toBe('Week 1');
    expect(a.deadline).toBe('2025-06-01');
    expect(a.allowedModes).toEqual(['classic', 'spelling']);
  });

  it('defaults word_ids to [] when null', () => {
    const row = {
      id: 'uuid-2',
      class_id: 'uuid-1',
      word_ids: null,
      words: null,
      title: 'Week 2',
      deadline: null,
      allowed_modes: null,
    };
    expect(mapAssignment(row).wordIds).toEqual([]);
  });
});

// ─── mapProgress ─────────────────────────────────────────────────────────────

describe('mapProgress', () => {
  it('maps all fields correctly', () => {
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
    const p = mapProgress(row);
    expect(p.id).toBe('uuid-3');
    expect(p.studentName).toBe('Alice');
    expect(p.studentUid).toBe('uid-2');
    expect(p.assignmentId).toBe('uuid-2');
    expect(p.classCode).toBe('ABC123');
    expect(p.score).toBe(850);
    expect(p.mode).toBe('flashcard');
    expect(p.completedAt).toBe('2025-01-01T00:00:00Z');
    expect(p.mistakes).toEqual([1, 2]);
    expect(p.avatar).toBe('🦊');
  });

  it('preserves null/undefined for optional fields', () => {
    const row = {
      id: 'uuid-4',
      student_name: 'Bob',
      student_uid: undefined,
      assignment_id: 'uuid-2',
      class_code: 'XYZ',
      score: 0,
      mode: 'classic',
      completed_at: '2025-01-02T00:00:00Z',
      mistakes: null,
      avatar: null,
    };
    const p = mapProgress(row);
    expect(p.studentUid).toBeUndefined();
    expect(p.mistakes).toBeNull();
    expect(p.avatar).toBeNull();
  });
});

// ─── mapProgressToDb ─────────────────────────────────────────────────────────

describe('mapProgressToDb', () => {
  it('maps all fields to snake_case', () => {
    const input = {
      studentName: 'Alice',
      studentUid: 'uid-2',
      assignmentId: 'uuid-2',
      classCode: 'ABC123',
      score: 850,
      mode: 'classic',
      completedAt: '2025-01-01T00:00:00Z',
      mistakes: [1, 2],
      avatar: '🦊',
    };
    const result = mapProgressToDb(input);
    expect(result.student_name).toBe('Alice');
    expect(result.student_uid).toBe('uid-2');
    expect(result.assignment_id).toBe('uuid-2');
    expect(result.class_code).toBe('ABC123');
    expect(result.score).toBe(850);
    expect(result.mode).toBe('classic');
    expect(result.completed_at).toBe('2025-01-01T00:00:00Z');
    expect(result.mistakes).toEqual([1, 2]);
    expect(result.avatar).toBe('🦊');
  });

  it('round-trips with mapProgress', () => {
    const dbRow = {
      id: 'uuid-5',
      student_name: 'Charlie',
      student_uid: 'uid-3',
      assignment_id: 'uuid-6',
      class_code: 'TEST1',
      score: 500,
      mode: 'spelling',
      completed_at: '2025-03-01T12:00:00Z',
      mistakes: [],
      avatar: '🐼',
    };
    const mapped = mapProgress(dbRow);
    const { id: _id, ...withoutId } = mapped;
    const backToDb = mapProgressToDb(withoutId);
    expect(backToDb.student_name).toBe(dbRow.student_name);
    expect(backToDb.score).toBe(dbRow.score);
    expect(backToDb.mode).toBe(dbRow.mode);
  });
});
