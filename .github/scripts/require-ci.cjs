'use strict';

const WORKFLOWS = ['ci.yml', 'ci-e2e.yml'];

function state(runs, sha, { repository, workflow } = {}) {
  const matches = runs.filter(run => {
    if (run.head_sha !== sha || run.head_branch !== 'main') return false;
    if (run.event === 'push') return true;
    // Dispatches are an explicit exception to GITHUB_TOKEN trigger suppression.
    // Accept only the canonical main workflow from this repository and a trusted
    // dispatcher; PR/fork runs remain insufficient for production.
    return run.event === 'workflow_dispatch' && repository && workflow &&
      run.head_repository?.full_name === repository &&
      run.path === '.github/workflows/' + workflow &&
      ['github-actions[bot]', repository.split('/')[0]].includes(run.actor?.login);
  });
  matches.sort((a, b) => b.id - a.id);
  const latest = matches[0];
  if (!latest || latest.status !== 'completed') return 'pending';
  return latest.conclusion === 'success' ? 'success' : 'failure';
}

async function requireCI({ github, context, core, sleep = ms => new Promise(resolve => setTimeout(resolve, ms)), attempts = 75 }) {
  if (context.ref !== 'refs/heads/main') {
    throw new Error('Production deployments must use main.');
  }
  for (let attempt = 0; attempt < attempts; attempt++) {
    const main = await github.rest.git.getRef({ ...context.repo, ref: 'heads/main' });
    if (main.data.object.sha !== context.sha) throw new Error('A newer main commit exists; refusing a stale deployment.');
    let ready = true;
    for (const workflow of WORKFLOWS) {
      const response = await github.rest.actions.listWorkflowRuns({
        ...context.repo, workflow_id: workflow, head_sha: context.sha,
        branch: 'main', per_page: 100,
      });
      const result = state(response.data.workflow_runs, context.sha, {
        repository: context.repo.owner + '/' + context.repo.repo, workflow,
      });
      if (result === 'failure') throw new Error(workflow + ' did not succeed on this main commit.');
      if (result !== 'success') ready = false;
    }
    if (ready) {
      // Recheck after API reads; never publish a known stale revision.
      const current = await github.rest.git.getRef({ ...context.repo, ref: 'heads/main' });
      if (current.data.object.sha !== context.sha) throw new Error('Main advanced while checking CI.');
      core.info('CI and browser workflows passed for ' + context.sha);
      return;
    }
    if (attempt + 1 < attempts) await sleep(20000);
  }
  throw new Error('CI or browser checks did not succeed within the deployment wait window.');
}

module.exports = requireCI;
module.exports.state = state;
