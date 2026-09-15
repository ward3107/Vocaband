import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import { configuration, runConnections } from './connections.mjs';

const base = { TEST_JWT: 'local-fixture', TARGET: 'http://127.0.0.1:1234' };
test('rejects missing/production targets and invalid numeric inputs', () => {
  for (const env of [{TEST_JWT:'x'}, {...base,TARGET:'https://vocaband.com'}, {...base,CONNECTIONS:'0'}, {...base,CONNECTIONS:'12oops'}, {...base,TARGET:'https://stage.example'}]) assert.throws(() => configuration(env));
});
test('rejects production absolute DNS names even with matching staging approval', () => {
  for (const target of ['https://vocaband.com.', 'https://www.vocaband.com.']) {
    assert.throws(() => configuration({ ...base, TARGET: target, STAGING_ORIGIN: target }), /Production target/);
  }
});
async function fixture(mode, fn) {
  const http = createServer();
  const io = new Server(http);
  if (mode === 'reject') io.use((_socket,next) => next(new Error('denied')));
  if (mode === 'slow-auth') io.use((_socket,next) => setTimeout(next, 80));
  if (mode === 'drop') io.on('connection', socket => setTimeout(() => socket.disconnect(true), 100));
  await new Promise(resolve => http.listen(0,'127.0.0.1',resolve));
  try { await fn({ target: `http://127.0.0.1:${http.address().port}`, token:'fixture',connections:4,holdMs:250,batch:1,rampDelayMs:30,timeoutMs:500,maxP95Ms:500 }); }
  finally { await new Promise(resolve => io.close(resolve)); }
}
test('holds all sockets together after ramp and passes a healthy server', () => fixture('ok', async config => {
  const r = await runConnections(config);
  assert.equal(r.pass,true); assert.equal(r.minimumConcurrentDuringHold,4);
  assert.equal(r.unexpectedDisconnects,0);
}));
test('authentication rejections fail with no invented latency', () => fixture('reject', async config => {
  const r = await runConnections(config);
  assert.equal(r.pass,false); assert.equal(r.rejected,4); assert.equal(r.connectMs.p95,null);
}));
test('separates transport setup from delayed namespace authentication', () => fixture('slow-auth', async config => {
  const r = await runConnections(config);
  assert.equal(r.pass, true);
  assert.equal(r.connectionPhasesMs.transport.count, 4);
  assert.equal(r.connectionPhasesMs.namespaceAuthentication.count, 4);
  assert.ok(r.connectionPhasesMs.namespaceAuthentication.p50 >= 70);
  assert.ok(r.connectMs.p50 >= r.connectionPhasesMs.namespaceAuthentication.p50);
}));
test('successful handshakes followed by dropped sockets fail', () => fixture('drop', async config => {
  const r = await runConnections(config);
  assert.equal(r.connected,4); assert.equal(r.pass,false); assert.equal(r.unexpectedDisconnects,4);
}));
