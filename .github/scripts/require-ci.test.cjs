'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const gate = require('./require-ci.cjs');
const pass = { id: 1, head_sha: 'abc', head_branch: 'main', event: 'push', status: 'completed', conclusion: 'success' };

test('only a completed successful push on this main commit passes', () => {
  assert.equal(gate.state([pass], 'abc'), 'success');
  for (const conclusion of ['failure', 'cancelled', 'skipped', 'neutral', 'timed_out']) {
    assert.equal(gate.state([{ ...pass, conclusion }], 'abc'), 'failure');
  }
  for (const runs of [[], [{ ...pass, head_sha: 'old' }], [{ ...pass, head_branch: 'other' }], [{ ...pass, event: 'pull_request' }], [{ ...pass, status: 'in_progress' }]]) {
    assert.equal(gate.state(runs, 'abc'), 'pending');
  }
  assert.equal(gate.state([pass, { ...pass, id: 2, conclusion: 'failure' }], 'abc'), 'failure');
});

function fixture(runs = [pass], sha = 'abc') {
  const workflows = [];
  return {
    workflows,
    context: { ref: 'refs/heads/main', sha: 'abc', repo: { owner: 'test', repo: 'test' } },
    core: { info() {} }, sleep: async () => {}, attempts: 1,
    github: { rest: {
      git: { getRef: async () => ({ data: { object: { sha } } }) },
      actions: { listWorkflowRuns: async args => { workflows.push(args.workflow_id); return { data: { workflow_runs: runs } }; } },
    } },
  };
}

test('deployment requires both workflows', async () => {
  const f = fixture();
  await gate(f);
  assert.deepEqual(f.workflows, ['ci.yml', 'ci-e2e.yml']);
});
test('missing checks, failed checks, stale revisions and other branches block', async () => {
  await assert.rejects(gate(fixture([])), /wait window/);
  await assert.rejects(gate(fixture([{ ...pass, conclusion: 'failure' }])), /did not succeed/);
  await assert.rejects(gate(fixture([pass], 'new')), /stale/);
  const f = fixture(); f.context.ref = 'refs/heads/other';
  await assert.rejects(gate(f), /must use main/);
});
test('main advancing during verification blocks deployment', async () => {
  const f = fixture(); let calls = 0;
  f.github.rest.git.getRef = async () => ({ data: { object: { sha: ++calls === 1 ? 'abc' : 'new' } } });
  await assert.rejects(gate(f), /Main advanced/);
});


test('canonical main dispatch by the bot or owner can satisfy the gate', async () => {
  const options = { repository: 'test/test', workflow: 'ci.yml' };
  const dispatched = { ...pass, event: 'workflow_dispatch', head_repository: { full_name: 'test/test' },
    path: '.github/workflows/ci.yml', actor: { login: 'github-actions[bot]' } };
  assert.equal(gate.state([dispatched], 'abc', options), 'success');
  assert.equal(gate.state([{ ...dispatched, actor: { login: 'test' } }], 'abc', options), 'success');
  for (const run of [
    { ...dispatched, actor: { login: 'outside-user' } },
    { ...dispatched, head_repository: { full_name: 'outside/fork' } },
    { ...dispatched, path: '.github/workflows/other.yml' },
    { ...dispatched, head_branch: 'other' },
    { ...dispatched, head_sha: 'old' },
  ]) assert.equal(gate.state([run], 'abc', options), 'pending');
  assert.equal(gate.state([dispatched], 'abc'), 'pending');
  assert.equal(gate.state([pass, { ...dispatched, id: 2, conclusion: 'failure' }], 'abc', options), 'failure');
});

test('both canonical dispatch workflows are checked without filtering out dispatch events', async () => {
  const f = fixture(); const requests = [];
  f.github.rest.actions.listWorkflowRuns = async args => {
    requests.push(args);
    return { data: { workflow_runs: [{ ...pass, event: 'workflow_dispatch',
      head_repository: { full_name: 'test/test' }, path: '.github/workflows/' + args.workflow_id,
      actor: { login: 'github-actions[bot]' } }] } };
  };
  await gate(f);
  assert.deepEqual(requests.map(args => args.workflow_id), ['ci.yml', 'ci-e2e.yml']);
  assert.ok(requests.every(args => !Object.hasOwn(args, 'event')));
});
