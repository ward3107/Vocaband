/**
 * pet-evolution.test.ts — pure-function tests for the activity-driven
 * pet companion's stage + mood logic.
 *
 * The corresponding SQL in supabase/migrations/20260606_pet_evolution.sql
 * encodes the same thresholds; if these tests pass and the SQL targets
 * match, the pet ages consistently between client display and the
 * server's record_pet_activity RPC.
 */
import { describe, it, expect } from 'vitest';
import {
  petStageFor,
  petMoodFor,
  PET_STAGES,
} from '../hooks/usePetEvolution';

describe('petStageFor — activity-driven stage thresholds', () => {
  it('starts at egg for 0 days', () => {
    expect(petStageFor(0).stage).toBe('egg');
  });

  it('stays at egg through day 1', () => {
    expect(petStageFor(1).stage).toBe('egg');
  });

  it('promotes to baby at day 2', () => {
    expect(petStageFor(2).stage).toBe('baby');
  });

  it('stays at baby through day 3', () => {
    expect(petStageFor(3).stage).toBe('baby');
  });

  it('promotes to child at day 4', () => {
    expect(petStageFor(4).stage).toBe('child');
  });

  it('stays at child through day 7', () => {
    expect(petStageFor(7).stage).toBe('child');
  });

  it('promotes to teen at day 8', () => {
    expect(petStageFor(8).stage).toBe('teen');
  });

  it('stays at teen through day 14', () => {
    expect(petStageFor(14).stage).toBe('teen');
  });

  it('promotes to adult at day 15', () => {
    expect(petStageFor(15).stage).toBe('adult');
  });

  it('stays at adult forever — 100 days still adult', () => {
    expect(petStageFor(100).stage).toBe('adult');
  });

  it('thresholds in PET_STAGES are monotonic — each minDays > the previous', () => {
    for (let i = 1; i < PET_STAGES.length; i++) {
      expect(PET_STAGES[i].minDays).toBeGreaterThan(PET_STAGES[i - 1].minDays);
    }
  });

  it('every stage has an emoji', () => {
    for (const s of PET_STAGES) {
      expect(s.emoji).toMatch(/.{1,4}/); // non-empty (any unicode chars)
    }
  });

  it('adult is the only stage with infinite nextThreshold', () => {
    const adultEntries = PET_STAGES.filter(s => s.nextThreshold === Infinity);
    expect(adultEntries).toHaveLength(1);
    expect(adultEntries[0].stage).toBe('adult');
  });
});

describe('petMoodFor — days-since-last-active thresholds', () => {
  it('happy when student played today', () => {
    expect(petMoodFor(0)).toBe('happy');
  });

  it('happy after a single day off (grace period)', () => {
    expect(petMoodFor(1)).toBe('happy');
  });

  it('neutral after 2 days off', () => {
    expect(petMoodFor(2)).toBe('neutral');
  });

  it('sad after 3 days off', () => {
    expect(petMoodFor(3)).toBe('sad');
  });

  it('very-sad after 4 days off', () => {
    expect(petMoodFor(4)).toBe('very-sad');
  });

  it('very-sad after a week off', () => {
    expect(petMoodFor(7)).toBe('very-sad');
  });

  it('handles negative days (defensive — clock skew) by treating as today', () => {
    // Implementation choice: treat anything ≤0 as "happy"
    expect(petMoodFor(-1)).toBe('happy');
  });
});
