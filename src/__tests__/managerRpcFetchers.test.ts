/**
 * Pins the wiring between the typed school-manager fetchers in
 * src/core/supabase.ts and the school-scoped manager_* RPCs:
 *   - each fetcher calls the right RPC name with the right args, and
 *   - every failure shape (transport error, null data, embedded
 *     {error} payload from the self-scoping RPC) collapses to null so
 *     the console renders its empty state instead of leaking/crashing.
 *
 * The supabase client is replaced at the package boundary (createClient)
 * so the real module — fetchers included — runs unmodified.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { rpcMock } = vi.hoisted(() => ({ rpcMock: vi.fn() }));
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({ rpc: rpcMock })),
}));

import {
  fetchManagerOverview,
  fetchManagerEngagement,
  fetchManagerTeacherDetail,
  fetchManagerClassDetail,
} from '../core/supabase';

beforeEach(() => {
  rpcMock.mockReset();
  rpcMock.mockResolvedValue({ data: { ok: true }, error: null });
});

describe('manager RPC fetchers — names and arguments', () => {
  it('fetchManagerOverview → manager_overview with no args', async () => {
    const data = await fetchManagerOverview();
    expect(rpcMock).toHaveBeenCalledTimes(1);
    expect(rpcMock).toHaveBeenCalledWith('manager_overview', undefined);
    expect(data).toEqual({ ok: true });
  });

  it('fetchManagerEngagement → manager_engagement with no args', async () => {
    await fetchManagerEngagement();
    expect(rpcMock).toHaveBeenCalledWith('manager_engagement', undefined);
  });

  it('fetchManagerTeacherDetail → manager_teacher_detail with p_uid', async () => {
    await fetchManagerTeacherDetail('teacher-uid-1');
    expect(rpcMock).toHaveBeenCalledWith('manager_teacher_detail', { p_uid: 'teacher-uid-1' });
  });

  it('fetchManagerClassDetail → manager_class_detail with p_class_id', async () => {
    await fetchManagerClassDetail('class-uuid-1');
    expect(rpcMock).toHaveBeenCalledWith('manager_class_detail', { p_class_id: 'class-uuid-1' });
  });
});

describe('manager RPC fetchers — failure shapes collapse to null', () => {
  it('returns null on a transport/postgrest error', async () => {
    rpcMock.mockResolvedValue({ data: null, error: { message: 'permission denied' } });
    expect(await fetchManagerOverview()).toBeNull();
  });

  it('returns null when the RPC returns no data', async () => {
    rpcMock.mockResolvedValue({ data: null, error: null });
    expect(await fetchManagerEngagement()).toBeNull();
  });

  it('returns null when the RPC self-scopes with an embedded {error} payload', async () => {
    rpcMock.mockResolvedValue({ data: { error: 'not_a_manager' }, error: null });
    expect(await fetchManagerTeacherDetail('teacher-uid-1')).toBeNull();
  });

  it('still returns real payloads after a failure (no sticky state)', async () => {
    rpcMock.mockResolvedValueOnce({ data: null, error: { message: 'boom' } });
    expect(await fetchManagerClassDetail('c1')).toBeNull();
    rpcMock.mockResolvedValueOnce({ data: { class: { id: 'c1' } }, error: null });
    expect(await fetchManagerClassDetail('c1')).toEqual({ class: { id: 'c1' } });
  });
});
