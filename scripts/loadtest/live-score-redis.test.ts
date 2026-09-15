import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createClient } from 'redis';
import { createLiveScoreStore } from '../../src/utils/liveScoreStore';

test('two server instances restore and validate the same Redis-backed live score', async () => {
  // Deliberately local-only: this integration test never accesses staging data.
  const url = process.env.LOCAL_TEST_REDIS_URL ?? 'redis://127.0.0.1:6389';
  assert.ok(['127.0.0.1', 'localhost', '[::1]'].includes(new URL(url).hostname));
  const a = createClient({ url });
  const b = createClient({ url });
  const classCode = `qa-${randomUUID()}`;
  const key = `live-score:v1:${classCode}:student:0`;
  const baselineKey = `live-score:v1:${classCode}:student:20`;
  try {
    await Promise.all([a.connect(), b.connect()]);
    const firstVM = createLiveScoreStore(a);
    const secondVM = createLiveScoreStore(b);
    assert.equal(await firstVM.join(classCode, 'student', 0), 0);
    assert.equal(await firstVM.update(classCode, 'student', 0, 10), 10);
    assert.equal(await firstVM.update(classCode, 'student', 0, 20), 20);
    assert.equal(await secondVM.join(classCode, 'student', 0), 20);
    assert.equal(await secondVM.update(classCode, 'student', 0, 30), 30);
    assert.equal(await firstVM.join(classCode, 'student', 0), 30);
    assert.equal(await firstVM.update(classCode, 'student', 0, 50), null);
    assert.equal(await firstVM.update(classCode, 'student', 0, 10), null);
    assert.deepEqual(await Promise.all([
      firstVM.update(classCode, 'student', 0, 40),
      secondVM.update(classCode, 'student', 0, 40),
    ]), [40, 40]);
    assert.equal(await firstVM.join(classCode, 'student', 0), 40);
    assert.ok((await a.ttl(key)) > 0 && (await a.ttl(key)) <= 900);
    assert.equal(await secondVM.join(classCode, 'student', 20), 0);
    await a.pExpire(key, 1);
    await new Promise(resolve => setTimeout(resolve, 20));
    assert.equal(await secondVM.update(classCode, 'student', 0, 50), null);
    assert.equal(await secondVM.join(classCode, 'student', 0), 0);
  } finally {
    if (a.isReady) await a.del([key, baselineKey]);
    for (const client of [a, b]) if (client.isOpen) client.destroy();
  }
});
