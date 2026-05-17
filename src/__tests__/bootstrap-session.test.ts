/**
 * Characterization test for the bootstrap_student_session RPC mapper.
 *
 * This pins the contract between the SQL function and the React layer:
 *   - status enum: 'ok' | 'needs-class-code' | 'pending-approval' | 'class-not-found'
 *   - shape of each branch's response
 *   - snake_case → camelCase mapping for nested rows
 *
 * If you change the JSON shape returned by the RPC, expect these to fail.
 * That's the point — the test is the source of truth for the wire format.
 *
 * What this does NOT test:
 *   - The RPC's branch logic itself. That's an integration concern — run
 *     `supabase db reset && npx vitest --run` against a local stack, or
 *     add a Playwright suite that exercises each entry path.
 *   - The legacy useAuthRestore.ts fallback paths. Those stay in place
 *     until production metrics confirm 100% RPC adoption.
 */
import { describe, it, expect } from 'vitest';
import { mapBootstrapResponse, type BootstrapResult } from '../core/bootstrap';

// ─── status: 'ok' (happy path) ────────────────────────────────────────────

describe('mapBootstrapResponse — status: ok', () => {
  const happyResponse = {
    status: 'ok',
    user: {
      uid:           'student-uid-1',
      email:         'kid@example.com',
      role:          'student',
      display_name:  'Yael',
      class_code:    'ABCD12',
      avatar:        '🦊',
      badges:        ['first_win'],
      xp:            120,
      streak:        3,
    },
    class: {
      id:           'class-uuid',
      name:         'Grade 5',
      code:         'ABCD12',
      teacher_uid:  'teacher-uid',
      avatar:       '🏫',
      subject:      'english',
      school_name:  null,
      school_logo_url: null,
    },
    assignments: [
      {
        id: 'a1', class_id: 'class-uuid', word_ids: [1, 2], words: null,
        title: 'Week 1', deadline: null, allowed_modes: ['classic'],
        sentences: [], sentence_difficulty: 2,
        created_at: '2026-05-01T00:00:00Z', subject: 'english',
      },
    ],
    progress: [
      {
        id: 'p1', student_name: 'Yael', student_uid: 'student-uid-1',
        assignment_id: 'a1', class_code: 'ABCD12', score: 850,
        mode: 'classic', completed_at: '2026-05-10T12:00:00Z',
        mistakes: [], avatar: '🦊', play_count: 2,
      },
    ],
    daily_missions: [
      {
        user_uid: 'student-uid-1', mission_date: '2026-05-17',
        mission_type: 'master_words', target: 5, progress: 2,
        completed: false, xp_reward: 20, completed_at: null,
      },
    ],
    pet_state: {
      active_days: 7,
      last_active_date: '2026-05-16',
      days_since_last_active: 1,
    },
    unseen_rewards: [
      {
        id: 'r1', teacher_uid: 'teacher-uid', teacher_name: 'Ms Levi',
        reward_type: 'badge', reward_value: '🎯 Perfect Score',
        reason: 'great work', created_at: '2026-05-15T08:00:00Z',
      },
    ],
  };

  it('returns status ok and a populated user', () => {
    const r = mapBootstrapResponse(happyResponse);
    expect(r.status).toBe('ok');
    expect(r.user?.uid).toBe('student-uid-1');
    expect(r.user?.role).toBe('student');
    expect(r.user?.classCode).toBe('ABCD12');
  });

  it('maps class row to camelCase ClassData', () => {
    const r = mapBootstrapResponse(happyResponse);
    expect(r.class?.id).toBe('class-uuid');
    expect(r.class?.teacherUid).toBe('teacher-uid');
    expect(r.class?.subject).toBe('english');
  });

  it('maps assignments array to AssignmentData', () => {
    const r = mapBootstrapResponse(happyResponse);
    expect(r.assignments).toHaveLength(1);
    expect(r.assignments[0].classId).toBe('class-uuid');
    expect(r.assignments[0].wordIds).toEqual([1, 2]);
    expect(r.assignments[0].allowedModes).toEqual(['classic']);
  });

  it('maps progress array to ProgressData', () => {
    const r = mapBootstrapResponse(happyResponse);
    expect(r.progress).toHaveLength(1);
    expect(r.progress[0].studentUid).toBe('student-uid-1');
    expect(r.progress[0].score).toBe(850);
    expect(r.progress[0].playCount).toBe(2);
  });

  it('maps daily missions with snake_case → camelCase', () => {
    const r = mapBootstrapResponse(happyResponse);
    expect(r.dailyMissions).toHaveLength(1);
    expect(r.dailyMissions[0].missionType).toBe('master_words');
    expect(r.dailyMissions[0].xpReward).toBe(20);
    expect(r.dailyMissions[0].completed).toBe(false);
  });

  it('maps pet_state to PetState', () => {
    const r = mapBootstrapResponse(happyResponse);
    expect(r.petState?.activeDays).toBe(7);
    expect(r.petState?.lastActiveDate).toBe('2026-05-16');
    expect(r.petState?.daysSinceLastActive).toBe(1);
  });

  it('maps unseen rewards array', () => {
    const r = mapBootstrapResponse(happyResponse);
    expect(r.unseenRewards).toHaveLength(1);
    expect(r.unseenRewards[0].rewardType).toBe('badge');
    expect(r.unseenRewards[0].teacherName).toBe('Ms Levi');
  });

  it('does NOT include pendingProfile on ok status', () => {
    const r = mapBootstrapResponse(happyResponse);
    expect(r.pendingProfile).toBeUndefined();
  });
});

// ─── status: 'needs-class-code' (OAuth first-login, no fallback) ──────────

describe('mapBootstrapResponse — status: needs-class-code', () => {
  it('returns the status with empty arrays and null user', () => {
    const r = mapBootstrapResponse({ status: 'needs-class-code' });
    expect(r.status).toBe('needs-class-code');
    expect(r.user).toBeNull();
    expect(r.class).toBeNull();
    expect(r.assignments).toEqual([]);
    expect(r.progress).toEqual([]);
    expect(r.dailyMissions).toEqual([]);
    expect(r.petState).toBeNull();
    expect(r.unseenRewards).toEqual([]);
    expect(r.pendingProfile).toBeUndefined();
  });
});

// ─── status: 'pending-approval' (student in approval queue) ───────────────

describe('mapBootstrapResponse — status: pending-approval', () => {
  const pendingResponse = {
    status: 'pending-approval',
    pending_profile: {
      id:           'profile-uuid',
      display_name: 'Noam',
      class_code:   'XYZ789',
    },
  };

  it('surfaces the pending profile in camelCase', () => {
    const r = mapBootstrapResponse(pendingResponse);
    expect(r.status).toBe('pending-approval');
    expect(r.pendingProfile).toEqual({
      id:          'profile-uuid',
      displayName: 'Noam',
      classCode:   'XYZ789',
    });
  });

  it('leaves user/class null and arrays empty', () => {
    const r = mapBootstrapResponse(pendingResponse);
    expect(r.user).toBeNull();
    expect(r.class).toBeNull();
    expect(r.assignments).toEqual([]);
    expect(r.progress).toEqual([]);
  });

  it('omits pendingProfile when the field is missing', () => {
    const r = mapBootstrapResponse({ status: 'pending-approval' });
    expect(r.status).toBe('pending-approval');
    expect(r.pendingProfile).toBeUndefined();
  });
});

// ─── status: 'class-not-found' (orphan class_code on users row) ───────────

describe('mapBootstrapResponse — status: class-not-found', () => {
  it('returns user without class data', () => {
    const r = mapBootstrapResponse({
      status: 'class-not-found',
      user: {
        uid: 'u1', email: 'k@x.com', role: 'student',
        display_name: 'K', class_code: 'DEAD01',
        avatar: null, badges: null,
      },
      class: null,
      assignments: [],
      progress: [],
      daily_missions: [],
      pet_state: null,
      unseen_rewards: [],
    });
    expect(r.status).toBe('class-not-found');
    expect(r.user?.uid).toBe('u1');
    expect(r.class).toBeNull();
    expect(r.assignments).toEqual([]);
  });
});

// ─── Defensive: malformed / partial RPC responses ────────────────────────

describe('mapBootstrapResponse — defensive parsing', () => {
  it('treats null input as needs-class-code with empty arrays', () => {
    const r: BootstrapResult = mapBootstrapResponse(null);
    expect(r.status).toBe('needs-class-code');
    expect(r.user).toBeNull();
    expect(r.assignments).toEqual([]);
    expect(r.progress).toEqual([]);
  });

  it('handles missing arrays as empty arrays (does not throw)', () => {
    const r = mapBootstrapResponse({ status: 'ok' });
    expect(r.assignments).toEqual([]);
    expect(r.progress).toEqual([]);
    expect(r.dailyMissions).toEqual([]);
    expect(r.unseenRewards).toEqual([]);
  });

  it('coerces non-array array fields to empty arrays', () => {
    const r = mapBootstrapResponse({
      status: 'ok',
      assignments: 'not-an-array',
      progress: null,
      daily_missions: { not: 'an array' },
      unseen_rewards: undefined,
    });
    expect(r.assignments).toEqual([]);
    expect(r.progress).toEqual([]);
    expect(r.dailyMissions).toEqual([]);
    expect(r.unseenRewards).toEqual([]);
  });

  it('propagates unknown status values verbatim', () => {
    // The mapper trusts the wire format — unknown statuses propagate so
    // the discriminated union catches them at the callsite. We do NOT
    // silently coerce to a known value, which would hide RPC-side bugs.
    const r = mapBootstrapResponse({ status: 'something-else' });
    expect(r.status).toBe('something-else');
  });
});
