'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const text = fs.readFileSync(path.join(__dirname, '../workflows/dependabot-main-dispatch.yml'), 'utf8').replace(/\r\n/g, '\n');
const script = text.split('          script: |\n')[1].split('\n').map(line => line.startsWith('            ') ? line.slice(12) : line).join('\n');
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
const bridge = new AsyncFunction('github', 'context', 'core', 'setTimeout', script);
const HEAD = 'a'.repeat(40), MAIN = 'b'.repeat(40);
function fixture() {
  const f = {
    dispatched: [], messages: [], calls: [], polls: 0,
    context: { repo: { owner: 'owner', repo: 'app' }, payload: { workflow_run: {
      event: 'pull_request', conclusion: 'success', path: '.github/workflows/ci-e2e.yml',
      head_repository: { full_name: 'owner/app' }, head_sha: HEAD,
    } } },
    pr: { number: 42, user: { login: 'dependabot[bot]', type: 'Bot' },
      base: { ref: 'main', repo: { full_name: 'owner/app' } },
      head: { sha: HEAD, repo: { full_name: 'owner/app' } },
      auto_merge: { enabled_by: { login: 'github-actions[bot]' } },
      merged: true, state: 'closed', merged_by: { login: 'github-actions[bot]' }, merge_commit_sha: MAIN },
    commits: [{ author: { login: 'dependabot[bot]' }, commit: { message: 'updated-dependencies:\n- dependency-name: example\n  update-type: version-update:semver-patch\n' } }],
    reviews: [{ user: { login: 'github-actions[bot]' }, state: 'APPROVED', commit_id: HEAD }],
    runs: {}, main: MAIN,
  };
  const markers = { associated() {}, commits() {}, reviews() {} };
  f.run = (workflow, overrides = {}) => ({ id: 100, head_sha: MAIN, head_branch: 'main',
    head_repository: { full_name: 'owner/app' }, path: '.github/workflows/' + workflow,
    event: 'workflow_dispatch', actor: { login: 'github-actions[bot]' }, status: 'completed', conclusion: 'success', ...overrides });
  f.github = { paginate: async (method) => {
    f.calls.push('paginate');
    if (method === markers.associated) return [{ number: 42 }];
    if (method === markers.commits) return structuredClone(f.commits);
    if (method === markers.reviews) return structuredClone(f.reviews);
    throw new Error('Unexpected metadata method');
  }, rest: {
    repos: { listPullRequestsAssociatedWithCommit: markers.associated },
    pulls: { listCommits: markers.commits, listReviews: markers.reviews,
      get: async () => { f.calls.push('pull'); f.polls++; return { data: structuredClone(f.getPR ? f.getPR() : f.pr) }; } },
    git: { getRef: async () => { f.calls.push('main'); return { data: { object: { sha: typeof f.main === 'function' ? f.main() : f.main } } }; } },
    actions: {
      listWorkflowRuns: async args => { f.calls.push('runs:' + args.workflow_id);
        return { data: { workflow_runs: f.getRuns ? f.getRuns(args.workflow_id) : (f.runs[args.workflow_id] || []) } }; },
      createWorkflowDispatch: async args => {
        assert.equal(args.ref, 'main'); f.calls.push('dispatch:' + args.workflow_id);
        if (['fly-deploy.yml', 'cloudflare-deploy.yml'].includes(args.workflow_id)) {
          for (const workflow of ['ci.yml', 'ci-e2e.yml']) {
            const runs = f.getRuns ? f.getRuns(workflow) : f.runs[workflow];
            assert.ok(runs.some(run => run.status === 'completed' && run.conclusion === 'success'));
          }
        }
        f.dispatched.push(args.workflow_id); f.runs[args.workflow_id] = [f.run(args.workflow_id)];
      },
    },
  } };
  f.core = { info: message => f.messages.push(message) };
  f.execute = () => bridge(f.github, f.context, f.core, resolve => resolve());
  return f;
}

test('patch/minor bot merge dispatches canonical checks before gated releases', async () => {
  const f = fixture();
  f.commits[0].commit.message += '  update-type: version-update:semver-minor\n';
  await f.execute();
  assert.deepEqual(f.dispatched, ['ci.yml', 'ci-e2e.yml', 'fly-deploy.yml', 'cloudflare-deploy.yml']);
  assert.ok(!text.includes('actions/checkout') && !text.includes('secrets.'));
});

test('Major and unclassified commit metadata never dispatch', async () => {
  for (const message of ['update-type: version-update:semver-major\n', 'unclassified',
    'update-type: version-update:semver-patch\nupdate-type: version-update:semver-major\n']) {
    const f = fixture(); f.commits[0].commit.message = message; await f.execute();
    assert.deepEqual(f.dispatched, []);
  }
});

test('foreign or failed source workflows, main dispatch completions, and humans are ignored', async () => {
  const mutations = [
    f => { f.context.payload.workflow_run.conclusion = 'failure'; },
    f => { f.context.payload.workflow_run.event = 'workflow_dispatch'; },
    f => { f.context.payload.workflow_run.head_repository.full_name = 'outside/fork'; },
    f => { f.context.payload.workflow_run.path = '.github/workflows/untrusted.yml'; },
    f => { f.pr.user.login = 'human'; },
    f => { f.pr.head.repo.full_name = 'outside/fork'; },
    f => { f.pr.base.ref = 'other'; },
    f => { f.pr.auto_merge.enabled_by.login = 'human'; },
    f => { f.pr.merged_by.login = 'human'; },
    f => { f.reviews[0].commit_id = 'old'; },
    f => { f.pr.head.sha = 'old'; },
  ];
  for (const mutate of mutations) { const f = fixture(); mutate(f); await f.execute(); assert.deepEqual(f.dispatched, []); }
});

test('native merge can settle after the source CI completion', async () => {
  const f = fixture(); f.getPR = () => f.polls < 3 ? { ...f.pr, merged: false, state: 'open' } : f.pr;
  await f.execute(); assert.equal(f.dispatched.length, 4); assert.ok(f.polls >= 3);
});

test('a still-open update or a superseded main commit does not deploy', async () => {
  const pending = fixture(); pending.pr.merged = false; pending.pr.state = 'open'; await pending.execute();
  assert.deepEqual(pending.dispatched, []);
  const stale = fixture(); stale.main = 'c'.repeat(40); await stale.execute(); assert.deepEqual(stale.dispatched, []);
});

test('existing canonical runs deduplicate completion events and retries', async () => {
  const f = fixture();
  for (const workflow of ['ci.yml', 'ci-e2e.yml', 'fly-deploy.yml', 'cloudflare-deploy.yml']) f.runs[workflow] = [f.run(workflow)];
  await f.execute(); assert.deepEqual(f.dispatched, []);
});

test('CI failures stay failures and never dispatch deployments', async () => {
  for (const conclusion of ['failure', 'cancelled', 'timed_out', 'skipped']) {
    const f = fixture(); f.runs['ci.yml'] = [f.run('ci.yml', { conclusion })];
    await assert.rejects(f.execute(), /Canonical main CI did not succeed/);
    assert.ok(!f.dispatched.includes('fly-deploy.yml') && !f.dispatched.includes('cloudflare-deploy.yml'));
  }
});

test('pending canonical checks must actually pass before releases are dispatched', async () => {
  const f = fixture(); let reads = 0;
  f.runs['ci.yml'] = [f.run('ci.yml')]; f.runs['ci-e2e.yml'] = [f.run('ci-e2e.yml')];
  f.getRuns = workflow => {
    if (workflow === 'ci-e2e.yml' && ++reads < 3) return [f.run(workflow, { status: 'in_progress', conclusion: null })];
    return f.runs[workflow] || [];
  };
  await f.execute(); assert.deepEqual(f.dispatched, ['fly-deploy.yml', 'cloudflare-deploy.yml']);
});

test('foreign dispatches cannot satisfy or deduplicate canonical main CI', async () => {
  const f = fixture(); f.runs['ci.yml'] = [f.run('ci.yml', { head_repository: { full_name: 'outside/fork' } })];
  await f.execute(); assert.ok(f.dispatched.includes('ci.yml'));
});

test('main advancing before/during dispatch fences off stale releases', async () => {
  const f = fixture(); let reads = 0; f.main = () => ++reads < 3 ? MAIN : 'c'.repeat(40);
  await assert.rejects(f.execute(), /Main advanced/);
  assert.ok(!f.dispatched.includes('fly-deploy.yml') && !f.dispatched.includes('cloudflare-deploy.yml'));
});
