'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const text = fs.readFileSync(path.join(__dirname, '../workflows/dependabot-main-dispatch.yml'), 'utf8').replace(/\r\n/g, '\n');
const script = text.split('          script: |\n')[1].split('\n').map(line => line.startsWith('            ') ? line.slice(12) : line).join('\n');
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
const bridge = new AsyncFunction('github', 'context', 'core', 'setTimeout', 'require', script);
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
  f.workflowIDs = { 'ci.yml': 1, 'ci-e2e.yml': 2, 'fly-deploy.yml': 3, 'cloudflare-deploy.yml': 4 };
  f.run = (workflow, overrides = {}) => ({ id: 100, workflow_id: f.workflowIDs[workflow], head_sha: MAIN, head_branch: 'main',
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
      getWorkflow: async args => ({ data: { id: f.workflowIDs[args.workflow_id], path: '.github/workflows/' + args.workflow_id, state: 'active' } }),
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
  f.execute = () => bridge(f.github, f.context, f.core, resolve => resolve(), require);
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

const SOURCE = 'c'.repeat(40), ROOT = 'd'.repeat(40), ORIGINAL_BASE = 'e'.repeat(40);
const controllerPath = '.github/workflows/dependabot-refresh.yml';
const sha256 = value => require('node:crypto').createHash('sha256').update(value).digest('hex');
const stable = value => value && typeof value === 'object' ? Array.isArray(value) ? value.map(stable)
  : Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])])) : value;
const canonical = value => JSON.stringify(stable(value)).replace(/[\u007f-\uffff]/g, char => `\\u${char.charCodeAt(0).toString(16).padStart(4, '0')}`);
const helperText = fs.readFileSync(path.join(__dirname, '../workflows/dependabot-refresh.yml'), 'utf8').replace(/\r\n/g, '\n');
const runtime = helperText.split('\n        run: |\n')[1].split('\n').map(line => line.startsWith('          ') ? line.slice(10) : line).join('\n');

function controllerFixture() {
  const f = fixture();
  f.pr.auto_merge = null; // Exact-SHA REST merge deliberately has no queued request.
  f.context.payload.workflow_run = { id: 900, workflow_id: 77, event: 'workflow_run',
    path: controllerPath, head_sha: SOURCE, head_branch: 'main', status: 'completed', conclusion: 'success',
    actor: { login: 'github-actions[bot]' }, head_repository: { full_name: 'owner/app' } };
  f.actualSource = structuredClone(f.context.payload.workflow_run);
  f.registered = { id: 77, path: controllerPath, state: 'active' };
  f.jobs = { total_count: 1, jobs: [{ id: 901, run_id: 900, name: 'refresh', head_sha: SOURCE, status: 'completed', conclusion: 'success' }] };
  f.policy = { repository: 'owner/app', default_branch: 'main', enabled: true, native_run_approval_authorized: true,
    controller_path: controllerPath, ci_continuation: 'native_run_approval', unicode: 'CI — مرحبا' };
  // This digest is calculated independently using Python's canonical serializer.
  f.policyFingerprint = '35967b974a59bd9cdff782f41479d7e19c86d33ba6c844080b04b345aff49d0c';
  f.journal = { repository: 'owner/app', pr: 42, head: HEAD, controller_run_id: 900, controller_sha: SOURCE,
    policy_sha256: f.policyFingerprint, captured_auto_actor: 'github-actions[bot]', disable_requested: true,
    auto_disabled: true, original_base: ORIGINAL_BASE, bot_commits: [ROOT], root_bot_head: ROOT,
    merges: [{ old: ROOT, base: SOURCE, new: HEAD }], pending_update: null };
  f.commentActor = 'github-actions[bot]';
  f.commitMap = {
    [ROOT]: { sha: ROOT, author: { login: 'dependabot[bot]' }, committer: { login: 'web-flow' },
      commit: { message: 'update-type: version-update:semver-minor\n', verification: { verified: true } }, parents: [{ sha: ORIGINAL_BASE }] },
    [HEAD]: { sha: HEAD, author: { login: 'github-actions[bot]' }, committer: { login: 'web-flow' },
      commit: { message: 'Merge main', verification: { verified: true } }, parents: [{ sha: ROOT }, { sha: SOURCE }] },
    [MAIN]: { sha: MAIN, parents: [{ sha: SOURCE }] },
  };
  f.originalCommits = [ROOT]; f.offMain = new Set();
  f.definition = () => 'jobs:\n  refresh:\n    env:\n      REFRESH_POLICY_JSON: >-\n        ' + JSON.stringify(f.policy) +
    '\n    steps:\n      - shell: python\n        run: |\n' + runtime.split('\n').map((line, index, all) => index === all.length - 1 && !line ? '' : '          ' + line).join('\n');
  f.logs = () => '2026-10-24T19:00:00Z CONTROLLED_REFRESH_RECORD ' + sha256(canonical(f.journal)) +
    '\n2026-10-24T19:00:01Z ' + JSON.stringify({ stage: 'merged', head: HEAD, merge_sha: MAIN }) + '\n';
  f.commits = [structuredClone(f.commitMap[ROOT]), structuredClone(f.commitMap[HEAD])];
  const listComments = () => {};
  const paginate = f.github.paginate;
  f.github.paginate = async (method, args) => method === listComments
    ? [{ id: 80, user: { login: f.commentActor }, body: '<!-- dependabot-controlled-refresh-v1\n' + JSON.stringify(f.journal) + '\n-->' }]
    : paginate(method, args);
  f.github.rest.issues = { listComments };
  Object.assign(f.github.rest.repos, {
    getContent: async args => { assert.equal(args.path, controllerPath); assert.equal(args.ref, SOURCE);
      return { data: { type: 'file', encoding: 'base64', content: Buffer.from(f.definition()).toString('base64') } }; },
    compareCommitsWithBasehead: async args => {
      const [base, tip] = args.basehead.split('...');
      if (tip === ROOT) return { data: { total_commits: f.originalCommits.length, commits: f.originalCommits.map(sha => ({ sha })) } };
      return { data: { status: f.offMain.has(base) ? 'diverged' : base === tip ? 'identical' : 'ahead' } };
    },
    getCommit: async args => ({ data: structuredClone(f.commitMap[args.ref]) }),
  });
  const getWorkflow = f.github.rest.actions.getWorkflow;
  Object.assign(f.github.rest.actions, {
    getWorkflow: async args => args.workflow_id === 'dependabot-refresh.yml' ? ({ data: structuredClone(f.registered) }) : getWorkflow(args),
    getWorkflowRun: async () => ({ data: structuredClone(f.actualSource) }),
    listJobsForWorkflowRun: async () => ({ data: structuredClone(f.jobs) }),
    downloadJobLogsForWorkflowRun: async args => { assert.equal(args.job_id, 901); return { data: f.logs() }; },
  });
  return f;
}

test('verified controller REST merge continues canonical checks and gated releases without auto_merge', async () => {
  const f = controllerFixture();
  assert.equal(sha256(canonical(f.policy)), f.policyFingerprint);
  await f.execute();
  assert.deepEqual(f.dispatched, ['ci.yml', 'ci-e2e.yml', 'fly-deploy.yml', 'cloudflare-deploy.yml']);
  assert.match(text, /group: dependency-main-dispatch\n/);
  assert.ok(!text.includes('actions/checkout') && !text.includes('secrets.'));
});

test('controller completion without a merged outcome does nothing', async () => {
  const f = controllerFixture(); f.logs = () => 'inspection complete, no eligible update\n';
  await f.execute(); assert.deepEqual(f.dispatched, []);
});

test('canonical workflow completion may attribute the trusted default controller to Dependabot', async () => {
  const f = controllerFixture();
  f.context.payload.workflow_run.actor.login = 'dependabot[bot]';
  f.actualSource.actor.login = 'dependabot[bot]';
  await f.execute(); assert.equal(f.dispatched.length, 4);
});

test('unregistered, foreign, non-main and unsuccessful controllers never dispatch', async () => {
  const mutations = [
    f => { f.registered.id = 78; },
    f => { f.registered.path = '.github/workflows/other.yml'; },
    f => { f.registered.state = 'disabled'; },
    f => { f.actualSource.head_sha = ROOT; },
    f => { f.actualSource.workflow_id = 78; },
    f => { f.actualSource.head_branch = 'dependabot/branch'; },
    f => { f.actualSource.head_repository.full_name = 'outside/fork'; },
    f => { f.actualSource.conclusion = 'failure'; },
    f => { f.offMain.add(SOURCE); },
    f => { f.jobs.jobs[0].name = 'untrusted-tests'; },
    f => { f.jobs.jobs[0].head_sha = ROOT; },
    f => { f.jobs.total_count = 101; },
  ];
  for (const mutate of mutations) {
    const f = controllerFixture(); mutate(f);
    await assert.rejects(f.execute(), /Controller release proof/); assert.deepEqual(f.dispatched, []);
  }
});

test('controller source implementation and active policy are attested', async () => {
  for (const mutate of [
    f => { const original = f.definition; f.definition = () => original() + '          print("changed")\n'; },
    f => { f.policy.enabled = false; },
    f => { f.policy.native_run_approval_authorized = false; },
    f => { f.policy.repository = 'outside/fork'; },
    f => { f.policy.ci_continuation = 'dispatch'; },
  ]) {
    const f = controllerFixture(); mutate(f);
    await assert.rejects(f.execute(), /Controller release proof/); assert.deepEqual(f.dispatched, []);
  }
});

test('bot comment alone or a mismatched journal cannot authorize release', async () => {
  const mutations = [
    f => { f.commentActor = 'human'; },
    f => { f.journal.controller_run_id = 899; },
    f => { f.journal.controller_sha = ROOT; },
    f => { f.journal.policy_sha256 = 'f'.repeat(64); },
    f => { f.journal.head = ROOT; },
    f => { f.journal.captured_auto_actor = 'human'; },
    f => { f.journal.disable_requested = false; },
    f => { f.journal.auto_disabled = false; },
    f => { f.journal.pending_update = { old: ROOT, base: SOURCE }; },
    f => { f.logs = () => JSON.stringify({ stage: 'merged', head: HEAD, merge_sha: MAIN }) + '\n'; },
  ];
  for (const mutate of mutations) {
    const f = controllerFixture(); mutate(f);
    await assert.rejects(f.execute(), /Controller release proof/); assert.deepEqual(f.dispatched, []);
  }
});

test('signed original metadata rejects Major, unknown, human, omitted and off-main ancestry', async () => {
  const mutations = [
    f => { f.commitMap[ROOT].commit.message = 'update-type: version-update:semver-major\n'; },
    f => { f.commitMap[ROOT].commit.message += 'update-type: unknown\n'; },
    f => { f.commitMap[ROOT].commit.message = 'unclassified'; },
    f => { f.commitMap[ROOT].author.login = 'human'; },
    f => { f.commitMap[ROOT].commit.verification.verified = false; },
    f => { f.originalCommits.unshift('f'.repeat(40)); },
    f => { f.offMain.add(ORIGINAL_BASE); },
  ];
  for (const mutate of mutations) {
    const f = controllerFixture(); mutate(f);
    await assert.rejects(f.execute(), /Controller release proof/); assert.deepEqual(f.dispatched, []);
  }
});

test('controlled native lineage and current-main merge must match exactly', async () => {
  const mutations = [
    f => { f.commitMap[HEAD].author.login = 'human'; },
    f => { f.commitMap[HEAD].commit.verification.verified = false; },
    f => { f.commitMap[HEAD].parents.reverse(); },
    f => { f.journal.merges[0].old = SOURCE; },
    f => { f.journal.merges[0].base = ORIGINAL_BASE; },
    f => { f.commitMap[MAIN].parents[0].sha = ORIGINAL_BASE; },
    f => { f.pr.merged_by.login = 'human'; },
    f => { f.pr.merge_commit_sha = ORIGINAL_BASE; },
  ];
  for (const mutate of mutations) {
    const f = controllerFixture(); mutate(f);
    await assert.rejects(f.execute(), /Controller release proof/); assert.deepEqual(f.dispatched, []);
  }
});

test('exact-head active bot review is required for controller releases', async () => {
  for (const mutate of [
    f => { f.reviews[0].commit_id = ROOT; },
    f => { f.reviews.push({ id: 99, user: { login: 'github-actions[bot]' }, commit_id: HEAD, state: 'DISMISSED' }); },
  ]) { const f = controllerFixture(); mutate(f); await f.execute(); assert.deepEqual(f.dispatched, []); }
});

test('controller completion duplicates reuse actual canonical runs and preserve failures', async () => {
  const f = controllerFixture(); await f.execute(); await f.execute();
  assert.deepEqual(f.dispatched, ['ci.yml', 'ci-e2e.yml', 'fly-deploy.yml', 'cloudflare-deploy.yml']);
  const bad = controllerFixture(); bad.runs['ci.yml'] = [bad.run('ci.yml', { conclusion: 'failure' })];
  await assert.rejects(bad.execute(), /Canonical main CI did not succeed/);
  assert.ok(!bad.dispatched.includes('fly-deploy.yml') && !bad.dispatched.includes('cloudflare-deploy.yml'));
});

test('main advancement during controller proof or dispatch prevents stale release', async () => {
  const f = controllerFixture(); let reads = 0;
  f.main = () => ++reads < 4 ? MAIN : ORIGINAL_BASE;
  await assert.rejects(f.execute(), /Main advanced/);
  assert.ok(!f.dispatched.includes('fly-deploy.yml') && !f.dispatched.includes('cloudflare-deploy.yml'));
});

test('different registered workflow IDs cannot satisfy canonical main CI or deduplication', async () => {
  const f = controllerFixture();
  f.runs['ci.yml'] = [f.run('ci.yml', { workflow_id: 999 })];
  await f.execute(); assert.ok(f.dispatched.includes('ci.yml'));
});

test('truncated, oversized and non-refresh logs cannot establish controller proof', async () => {
  const large = controllerFixture(); large.logs = () => 'x'.repeat(4 * 1024 * 1024 + 1);
  await assert.rejects(large.execute(), /log bound/); assert.deepEqual(large.dispatched, []);
  const unknown = controllerFixture(); unknown.logs = () => '{"stage":"merged"}\n';
  await unknown.execute(); assert.deepEqual(unknown.dispatched, []);
});

test('controller registration ID is resolved dynamically from its immutable trusted path', async () => {
  const f = controllerFixture();
  f.registered.id = 123456;
  f.context.payload.workflow_run.workflow_id = 123456;
  f.actualSource.workflow_id = 123456;
  await f.execute(); assert.equal(f.dispatched.length, 4);
});

// BEGIN ACTUAL PYTHON POLICY FIXTURE
const actualVocabandPolicy = {
  "repository": "ward3107/Vocaband",
  "default_branch": "main",
  "reviewed_base_sha": "10450c4c2bc46fc1664e790edf86e82568bca2c5",
  "required_checks": [
    {
      "context": "Typecheck + tests + build",
      "integration_id": 15368
    },
    {
      "context": "Playwright smoke",
      "integration_id": 15368
    },
    {
      "context": "Playwright auth suite",
      "integration_id": 15368
    },
    {
      "context": "Quick Play projector + WebKit",
      "integration_id": 15368
    },
    {
      "context": "Browser test gate",
      "integration_id": 15368
    }
  ],
  "external_required_contexts_not_dispatched": [],
  "adapter_installation_required": false,
  "workflows": [
    {
      "id": 270117061,
      "path": ".github/workflows/ci-e2e.yml",
      "credential_free_reviewed": true,
      "reviewed_sha256": "13af1f9b318891f89840ed4ac6f6fe43218baa4f25e4e796b246e4285a8acfa9",
      "reviewed_blob_sha": "4897bdf6006944543a4fc91c771cee58c2f0fea8",
      "original_source_blob_sha": "4897bdf6006944543a4fc91c771cee58c2f0fea8",
      "required_contexts": [
        "Browser test gate",
        "Playwright auth suite",
        "Playwright smoke",
        "Quick Play projector + WebKit"
      ],
      "conditional_exceptions": [],
      "adapter_changes": [],
      "reviewed_structure_sha256": "3e2ad1a5d683203e6f9453cb37732d27dd6c28803abc009ba6fe5fe3a4d569bc",
      "name": "CI \u2014 e2e"
    },
    {
      "id": 270117062,
      "path": ".github/workflows/ci.yml",
      "credential_free_reviewed": true,
      "reviewed_sha256": "4d2db7c363287ccd4f94b095ec76b928ffcd3d47f3d512ad72152de474ff1079",
      "reviewed_blob_sha": "f1a4dc017ff43c8838ca2a7905e76999d082da24",
      "original_source_blob_sha": "f1a4dc017ff43c8838ca2a7905e76999d082da24",
      "required_contexts": [
        "Typecheck + tests + build"
      ],
      "conditional_exceptions": [],
      "adapter_changes": [],
      "reviewed_structure_sha256": "3e1bfdd8f41c8dea47d3060deb7a79818fb4f79e2696b6d3b6e203a2c7c11a20",
      "name": "CI"
    }
  ],
  "enabled": true,
  "native_run_approval_authorized": true,
  "human_authorization": "call_d8b3b03cce5c41caa13c900ad76792be",
  "rollout_gate": "actual-token proof before rollout",
  "ci_continuation": "native_run_approval",
  "controller_path": ".github/workflows/dependabot-refresh.yml",
  "dependency_path_patterns": [
    "(?:.*/)?package(?:-lock)?\\.json",
    "(?:.*/)?npm-shrinkwrap\\.json",
    "(?:.*/)?pnpm-lock\\.yaml",
    "(?:.*/)?yarn\\.lock",
    "(?:.*/)?bun\\.lockb?",
    "(?:.*/)?requirements(?:[-.][A-Za-z0-9_-]+)?\\.txt",
    "(?:.*/)?pyproject\\.toml",
    "(?:.*/)?(?:Pipfile(?:\\.lock)?|poetry\\.lock|uv\\.lock|setup\\.cfg|setup\\.py)"
  ],
  "classic_review_required": true,
  "canonical_workflow_names": [
    "CI",
    "CI \u2014 e2e"
  ]
};
const actualPythonPolicyFingerprint = "3689ca7481eab59dd1a4d714a8a33b6b32f9ac6cbf6bafb9accee2adab89b087";
test('actual active Vocaband policy matches Python canonical SHA with Unicode and regex backslashes', async () => {
  assert.equal(sha256(canonical(actualVocabandPolicy)), actualPythonPolicyFingerprint);
  const f = controllerFixture();
  f.context.repo = { owner: 'ward3107', repo: 'Vocaband' };
  f.context.payload.workflow_run.head_repository.full_name = 'ward3107/Vocaband';
  f.actualSource.head_repository.full_name = 'ward3107/Vocaband';
  f.pr.base.repo.full_name = f.pr.head.repo.full_name = 'ward3107/Vocaband';
  f.policy = structuredClone(actualVocabandPolicy);
  f.policyFingerprint = actualPythonPolicyFingerprint;
  f.journal.repository = 'ward3107/Vocaband';
  f.journal.policy_sha256 = actualPythonPolicyFingerprint;
  const originalRun = f.run;
  f.run = (workflow, overrides = {}) => originalRun(workflow, { head_repository: { full_name: 'ward3107/Vocaband' }, ...overrides });
  await f.execute();
  assert.deepEqual(f.dispatched, ['ci.yml', 'ci-e2e.yml', 'fly-deploy.yml', 'cloudflare-deploy.yml']);
});
// END ACTUAL PYTHON POLICY FIXTURE

test('pretty JSON controller policy retains the trusted canonical fingerprint', async () => {
  const f = controllerFixture();
  const originalDefinition = f.definition;
  f.definition = () => originalDefinition().replace(JSON.stringify(f.policy),
    JSON.stringify(f.policy, null, 2).replace(/\n/g, '\n        '));
  await f.execute();
  assert.deepEqual(f.dispatched, ['ci.yml', 'ci-e2e.yml', 'fly-deploy.yml', 'cloudflare-deploy.yml']);
});
test('duplicate controller JSON policy blocks remain held', async () => {
  const f = controllerFixture();
  const originalDefinition = f.definition;
  f.definition = () => originalDefinition().replace('      REFRESH_POLICY_JSON: >-\n',
    '      REFRESH_POLICY_JSON: >-\n        ' + JSON.stringify(f.policy) + '\n      REFRESH_POLICY_JSON: >-\n');
  await assert.rejects(f.execute(), /unique reviewed JSON policy block/);
  assert.deepEqual(f.dispatched, []);
});
