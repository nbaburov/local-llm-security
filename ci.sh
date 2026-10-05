#!/usr/bin/env bash
# Showcase CI: what "builds and runs from a clean checkout" means for this repository.
# Called by the shared workflow in nbaburov/.github; run it locally with `bash ci.sh`.
# Every check runs in a pinned container, so the result does not depend on the machine.
set -euo pipefail
cd "$(dirname "$0")"

docker run --rm -v "$PWD":/w -v /w/node_modules -v /w/.next -w /w node:22 sh -c '
  npm ci --no-audit --no-fund && npm run lint && npm run build'
