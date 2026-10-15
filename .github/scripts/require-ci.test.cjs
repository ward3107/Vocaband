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
