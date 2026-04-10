/** Centralized seed data for E2E tests */

export const TEST_SUPABASE_URL = 'https://test-project.supabase.co';

export const TEST_CLASS = {
  id: 'class-001',
  code: 'TEST01',
  name: 'Test English Class',  // DB column is 'name', not 'title'
  teacher_uid: 'teacher-uid-001',
};

export const TEST_TEACHER = {
  uid: 'teacher-uid-001',
  email: 'teacher@test.com',
  display_name: 'Ms. Teacher',
  role: 'teacher',
  class_code: null,
  avatar: null,
  badges: [],
  xp: 0,
  streak: 0,
  unlocked_avatars: [],
  unlocked_themes: [],
  power_ups: {},
  active_theme: 'default',
};

export const TEST_STUDENTS = [
  { id: 'student-001', display_name: 'Alice', xp: 150, status: 'approved', avatar: '🦊' },
  { id: 'student-002', display_name: 'Bob', xp: 80, status: 'approved', avatar: '🦁' },
  { id: 'student-003', display_name: 'Charlie', xp: 200, status: 'approved', avatar: '🐯' },
];

export const TEST_STUDENT_USER = {
  uid: 'student-uid-001',
  email: null,
  display_name: 'Alice',
  role: 'student',
  class_code: 'TEST01',
  avatar: '🦊',
  badges: ['🌟 First Steps'],
  xp: 150,
  streak: 3,
  unlocked_avatars: [],
  unlocked_themes: [],
  power_ups: {},
  active_theme: 'default',
};

export const TEST_ASSIGNMENT = {
  id: 'assignment-001',
  class_id: 'class-001',
  title: 'Week 1 Vocabulary',
  word_ids: [1, 2, 3, 4, 5],
  words: null,
  deadline: '2026-12-31T23:59:59Z',
  allowed_modes: ['classic', 'spelling', 'matching', 'true-false', 'flashcards'],
  sentences: [],              // DB column: TEXT[] DEFAULT '{}'
  sentence_difficulty: 2,      // DB column: INTEGER DEFAULT 2
  created_at: '2026-01-01T00:00:00Z',
};

export const TEST_PROGRESS: any[] = [];

export const FAKE_AUTH_SESSION = {
  access_token: 'fake-access-token-for-testing',
  refresh_token: 'fake-refresh-token',
  token_type: 'bearer',
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  user: {
    id: 'student-uid-001',
    aud: 'authenticated',
    role: 'authenticated',
    email: null,
    app_metadata: { provider: 'anonymous' },
    user_metadata: {},
    created_at: '2026-01-01T00:00:00Z',
  },
};

export const FAKE_TEACHER_SESSION = {
  ...FAKE_AUTH_SESSION,
  user: {
    ...FAKE_AUTH_SESSION.user,
    id: 'teacher-uid-001',
    email: 'teacher@test.com',
    app_metadata: { provider: 'google' },
    user_metadata: { full_name: 'Ms. Teacher' },
  },
};
