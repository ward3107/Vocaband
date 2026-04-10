import { test, expect } from '@playwright/test';
import { TEST_CLASS, TEST_STUDENT_USER, TEST_TEACHER, TEST_ASSIGNMENT, TEST_PROGRESS } from '../fixtures/test-data';

/**
 * Schema validation tests — verify the E2E test mock data
 * matches the actual Supabase database schema.
 *
 * These tests don't hit the DB — they validate that our mock data
 * has the correct shape so E2E tests don't silently pass with wrong data.
 */

// Columns that MUST exist on each table (from schema.sql + migrations)
const USERS_COLUMNS = [
  'uid', 'email', 'role', 'display_name', 'class_code', 'avatar', 'badges',
  // Added in 20260417_add_missing_columns.sql:
  'xp', 'streak', 'unlocked_avatars', 'unlocked_themes', 'power_ups', 'active_theme',
];

const CLASSES_COLUMNS = [
  'id', 'name', 'teacher_uid', 'code',
];

const ASSIGNMENTS_COLUMNS = [
  'id', 'class_id', 'word_ids', 'words', 'title', 'deadline', 'created_at', 'allowed_modes',
  // Added in 20260417_add_missing_columns.sql:
  'sentences', 'sentence_difficulty',
];

const PROGRESS_COLUMNS = [
  'id', 'student_name', 'student_uid', 'assignment_id', 'class_code',
  'score', 'mode', 'completed_at', 'mistakes', 'avatar',
];

const STUDENT_PROFILES_COLUMNS = [
  'id', 'unique_id', 'display_name', 'class_code', 'email', 'status',
  'auth_uid', 'xp', 'avatar', 'badges', 'joined_at', 'approved_at', 'approved_by',
];

test.describe('Schema Validation', () => {

  test('TEST_CLASS has all required DB columns', () => {
    const classKeys = Object.keys(TEST_CLASS);
    for (const col of CLASSES_COLUMNS) {
      expect(classKeys, `Missing column '${col}' in TEST_CLASS`).toContain(col);
    }
  });

  test('TEST_CLASS does not use wrong column names', () => {
    // Common mistake: using 'title' instead of 'name' for classes
    expect(Object.keys(TEST_CLASS)).not.toContain('title');
  });

  test('TEST_STUDENT_USER has all required DB columns', () => {
    const userKeys = Object.keys(TEST_STUDENT_USER);
    for (const col of USERS_COLUMNS) {
      expect(userKeys, `Missing column '${col}' in TEST_STUDENT_USER`).toContain(col);
    }
  });

  test('TEST_TEACHER has all required DB columns', () => {
    const teacherKeys = Object.keys(TEST_TEACHER);
    for (const col of USERS_COLUMNS) {
      expect(teacherKeys, `Missing column '${col}' in TEST_TEACHER`).toContain(col);
    }
  });

  test('TEST_ASSIGNMENT has all required DB columns', () => {
    const assignmentKeys = Object.keys(TEST_ASSIGNMENT);
    for (const col of ASSIGNMENTS_COLUMNS) {
      expect(assignmentKeys, `Missing column '${col}' in TEST_ASSIGNMENT`).toContain(col);
    }
  });

  test('TEST_STUDENT_USER role is valid enum value', () => {
    expect(['teacher', 'student', 'admin']).toContain(TEST_STUDENT_USER.role);
  });

  test('TEST_TEACHER role is valid enum value', () => {
    expect(['teacher', 'student', 'admin']).toContain(TEST_TEACHER.role);
  });

  test('TEST_ASSIGNMENT sentence_difficulty is valid range', () => {
    expect(TEST_ASSIGNMENT.sentence_difficulty).toBeGreaterThanOrEqual(1);
    expect(TEST_ASSIGNMENT.sentence_difficulty).toBeLessThanOrEqual(4);
  });

  test('TEST_CLASS code is exactly 6 characters', () => {
    expect(TEST_CLASS.code).toHaveLength(6);
  });

  test('TEST_ASSIGNMENT word_ids are positive integers', () => {
    for (const id of TEST_ASSIGNMENT.word_ids) {
      expect(id).toBeGreaterThan(0);
      expect(Number.isInteger(id)).toBe(true);
    }
  });
});
