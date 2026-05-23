# Incident evidence directory

> Seeded so on-call doesn't have to `mkdir` under pressure.  See
> `docs/INCIDENT-RESPONSE.md` for the full runbook.

When an incident starts:

1. Create a sub-directory `<YYYY-MM-DD>-<short-name>/` here (e.g.
   `2026-05-22-rls-regression/`).
2. Drop every artefact into it: screenshots, log dumps (run through
   `scrubPii` first — see `src/utils/scrubPii.ts`), affected-user
   ID lists, the vendor's advisory PDF if it's a supply-chain
   incident.
3. Once the post-mortem is written in `docs/postmortems/<same-name>.md`,
   leave this directory in place — it's the chain-of-custody record.

⚠️ **Do NOT commit raw logs containing un-scrubbed PII.**  Either
gitignore the sub-directory if the artefacts can't be safely
scrubbed, or keep them out of git entirely and reference them by
path in a private vault.  Scrubbed-and-redacted artefacts are
fine to commit.
