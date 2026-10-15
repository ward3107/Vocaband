# Safe dependency updates

## Activation

This pull request prepares checks; it does not activate repository settings.
Protect `main` with a ruleset that requires pull requests, an up-to-date branch, and the following successful checks:

- `Typecheck + tests + build`
- `Playwright smoke`
- `Playwright auth suite`
- `Quick Play projector + WebKit`
- `Browser test gate`

Apply the rule to administrators and bots; do not give update bots a bypass. Keep automatic merging disabled during rollout. Check names must match GitHub's displayed names after their first run. A skipped, missing, cancelled, or pending check is not evidence of a passing test.

## Update procedure

Dependabot opens bounded weekly update PRs. Review each update separately, keep the lockfile in the same PR as its manifest, and merge only after the checks pass on the latest revision. Major versions and changes to framework, authentication, payment, database, or deployment packages need explicit review of release notes and affected user journeys. Existing security checks must remain enabled; a vulnerable dependency needs a fix, not an ignored failure.

Before merging, open the hosting preview and verify the home page, navigation, and the site's main user action on desktop and mobile. Use test accounts and test data for any submission. Build and unit checks alone do not prove production integrations work.

## Publication and recovery

Configure the hosting provider to publish production only from the protected branch. Check that native Git integrations and other deploy hooks cannot publish unreviewed branches. After release, verify the production URL and primary user journey. Record the previous working deployment before release; if verification fails, restore that deployment using the host's rollback control, then revert the offending update through a reviewed PR. Database migrations and external side effects need their own recovery plan.

Postdeployment monitoring and automatic rollback are not installed by this PR: they require a verified production URL, health contract, and hosting access.

## Repository-specific notes

The existing protection requires only the combined CI check and permits administrator bypass. Add all three browser checks and Browser test gate and apply protection to administrators. The Playwright container now follows the exact lockfile version. Fly dependency manifest/lockfile changes trigger deployment. Both Actions deployment workflows require successful CI and E2E workflow runs on the exact current main commit, refuse stale/manual non-main releases, and serialize publication. Cloudflare's separate native Git integration can still bypass this Actions gate until configured in its dashboard. Existing advisory security scans remain advisory. The frontend and backend still deploy independently; this PR does not make a cross-provider release atomic.

Browser test gate runs even when a prerequisite fails or a browser job is skipped. Require it: GitHub can otherwise accept a skipped individual required job, which is not proof that the browser tests ran.
