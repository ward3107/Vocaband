# Release continuation after controlled dependency refresh

The metadata-only refresh controller can disable an old queued auto-merge, update a verified Dependabot Patch/Minor branch, approve execution of its canonical PR workflows and perform a normal exact-SHA merge after the real required checks pass. GitHub suppresses ordinary push-triggered workflows for changes made with GITHUB_TOKEN, so Vocaband needs an explicit continuation to its existing main checks and deployment workflows.

`Continue merged dependency release` preserves the existing canonical PR-completion route and also accepts successful completion of the registered `Refresh trusted Dependabot CI` workflow. The controller route does not depend on `pull_request.auto_merge`, which can legitimately be null after a controlled REST merge.

The new route requires all of the following before it dispatches anything:

- The actual controller workflow ID/path, same-repository main source, successful refresh job and source ancestry on trusted main must match. The inline controller implementation is pinned by SHA256; its activated repository policy must also match the journal fingerprint.
- The trusted refresh-job logs must contain a concrete merged outcome for the exact current main SHA and the canonical digest of that run's bot-authored journal. A bot comment alone, another job's logs, a pending update or a successful inspection with nothing merged cannot authorize a release.
- Every original dependency commit is reconstructed and verified as a signed Dependabot Patch/Minor commit. Every controlled merge must be signed, authored by GitHub Actions, committed by web-flow, have the exact recorded parents and use a base on trusted main. Major, unknown and human changes are rejected.
- The actual PR must be merged by GitHub Actions, retain its exact verified head and have a current approval from that bot on that head. The main squash merge must descend directly from the controller source commit.

The existing release sequence then dispatches `ci.yml` and `ci-e2e.yml` on exact current main, waits for their actual successful results, and dispatches the existing Fly and Cloudflare workflows. Those deployment workflows independently enforce `require-ci.cjs` before accessing their existing credentials. The bridge adds no credentials, repository checkout, artifact execution, status/check synthesis, deployment code or CI exception.

All bridge completions share one repository-wide concurrency group. Existing real canonical workflow runs are reused by workflow ID, path, SHA, branch, actor and event, including failures. Main advancement is rechecked before and after every dispatch, so a superseded dependency merge cannot deploy over a newer commit.

If the controller dies after the merge but before its final outcome and journal digest are emitted, this route deliberately has insufficient proof and does not continue automatically. Inspect that exact merged PR and controller run, then perform an explicitly reviewed recovery through the canonical main workflows; do not substitute a passing status or relax a check. Changing the controller implementation also requires updating its pinned bridge hash and running the metadata guard tests in the same maintenance PR.

Local guard tests cover native PR completions and controller completions, signature/ancestry/classification failures, forged journals, wrong workflows/jobs, stale reviews, duplicates, main races and failed main CI. A passing local test is not a live production deployment result.

The release bridge serializes completions with GitHub's native `queue: max` (up to 100 pending runs), so a later unrelated CI completion does not replace a waiting controller-release event. Every queued event still verifies the current main SHA before dispatch; superseded commits remain held. If the native queue reaches its documented bound, further events can be canceled and require reviewed recovery.
