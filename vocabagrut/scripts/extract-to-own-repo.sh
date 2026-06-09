#!/usr/bin/env bash
#
# Promote vocabagrut/ into its own standalone repository.
#
# Usage (run from the Vocaband repo root, clean working tree):
#   bash vocabagrut/scripts/extract-to-own-repo.sh <new-repo-git-url> [branch]
#
# Example:
#   bash vocabagrut/scripts/extract-to-own-repo.sh git@github.com:ward3107/vocabagrut.git main
#
# The target repo must already exist and be EMPTY (no initial commit).
set -euo pipefail

REMOTE_URL="${1:-}"
BRANCH="${2:-main}"
PREFIX="vocabagrut"
SPLIT_BRANCH="vocabagrut-split-$$"

if [[ -z "$REMOTE_URL" ]]; then
  echo "Usage: $0 <new-repo-git-url> [branch]" >&2
  exit 1
fi

if [[ ! -d "$PREFIX" ]]; then
  echo "Error: run this from the repo root (no ./$PREFIX directory found)." >&2
  exit 1
fi

echo "→ Splitting $PREFIX/ into $SPLIT_BRANCH ..."
git subtree split --prefix="$PREFIX" -b "$SPLIT_BRANCH"

echo "→ Pushing $SPLIT_BRANCH to $REMOTE_URL ($BRANCH) ..."
git push "$REMOTE_URL" "$SPLIT_BRANCH:$BRANCH"

echo "→ Cleaning up local split branch ..."
git branch -D "$SPLIT_BRANCH"

echo "✓ Done. Clone your new repo and develop there:"
echo "    git clone $REMOTE_URL"
