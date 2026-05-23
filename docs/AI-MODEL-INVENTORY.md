# AI Model Version Inventory

> Audit M-7 (2026-05-23): explicit per-call-site model pinning.
> Updated whenever a model string in code changes.

GDPR Art. 35 DPIA requires "innovative technology" disclosure to be
specific.  EU AI Act Art. 50 requires AI-generated content
transparency.  Both are easier when we keep the model strings
deliberately pinned and listed in one place.

This file is the **inventory**, not the source of truth — the model
strings are still set inline at the call sites because that's where
they're tunable per feature.  When a string here drifts from what's
in the code, treat the code as authoritative and update this doc.

## Inventory

| Provider | Model | Pinned to | Used by | Source location |
|---|---|---|---|---|
| **Google** | Gemini 2.5 Flash | `gemini-2.5-flash` | Translation + AI Lesson Builder text generation + AI Lesson questions | `server.ts:2817`, `server.ts:4144`, `server.ts:4386` |
| **Google** | Gemini 2.5 Flash-Lite | `gemini-2.5-flash-lite` | OCR + sentence generation + distractor generation (~half the cost per token of `gemini-2.5-flash`, similar quality on schema-validated tasks) | `server.ts:2433`, `server.ts:3506`, `server.ts:3799` |
| **Google** | Cloud Text-to-Speech (Studio-O) | `en-US-Studio-O` | Word + phrase pronunciation MP3s (runtime fallback for custom words + batch generator for the 9,159-word corpus) | `tts-common.ts:20-24` |
| **Anthropic** | Claude Haiku 4.5 | `claude-haiku-4-5-20251001` | Vocabagrut (Bagrut-style mock exam generator) | `server.ts:3965` |

## Why pinning matters

Without explicit version pinning, the provider can roll a new model
underneath us at any time.  For Vocaband, that means:

- **Behavioural drift** — a new model may format JSON differently,
  truncate at different lengths, or refuse different prompts.
  Worksheets that used to generate cleanly might suddenly fail
  schema validation.
- **Cost drift** — provider's "default" alias can silently switch to
  a more expensive tier.  At our scale (~$50-100/month AI spend) a
  3× jump is noticeable.
- **Compliance drift** — GDPR + EU AI Act transparency obligations
  require us to publish *which* model produced student-facing text.
  If we said "Gemini" and the provider quietly shipped a Gemini-3
  beta, our disclosure becomes inaccurate.

By pinning the exact version string at each call site (rather than
using `gemini-pro` or `claude-latest`), we get explicit control.
A provider deprecation gives us a deprecation warning + window;
silent upgrades are impossible.

## Process when changing a model

1. Update the model string at the call site (search for the old
   model name across `server.ts` + `tts-common.ts` to catch
   sibling uses).
2. Update this inventory table.
3. Update `src/config/privacy-config.ts → THIRD_PARTY_REGISTRY`
   notes if the new model has different data-handling terms.
4. Bump `PRIVACY_POLICY_VERSION` ONLY if the change is material
   (different vendor, different region, different training-on-data
   posture).  A minor version bump within the same provider's same
   product line usually doesn't qualify.
5. Note the change in the next release's CHANGELOG / release notes
   so teachers know the underlying AI changed.

## Why no drift-detection automation today

We considered a daily cron that compares the model strings in code
against a baseline manifest and fires a Sentry alert on drift.
Deferred because:

- Code is the baseline; CI would catch a Git commit that changes a
  model string just as well as a separate manifest would.
- Manual review at PR time is more useful than a synthetic alert
  for a change the engineer obviously knew about (they typed it).
- The real risk is the *provider* silently changing what a pinned
  string maps to — and only the provider can detect that.  Their
  release notes are the source of truth; we monitor them
  out-of-band.

If we ever ship per-user-visible "AI model: …" badges (EU AI Act
Art. 50 readiness), the inventory above becomes the data backing
those badges and the drift-detection question gets revisited.
