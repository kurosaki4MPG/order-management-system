#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

run_step() {
  local label="$1"
  shift

  printf '\n==> %s\n' "$label"
  "$@"
}

run_step "Install dependencies" npm ci
run_step "Run lint" npm run lint
run_step "Run unit tests" npm run test
run_step "Run npm audit" npm audit --audit-level=high --omit=dev
run_step "Scan for committed secrets" bash -lc '
  if git grep -nE '"'"'AKIA[0-9A-Z]{16}|ASIA[0-9A-Z]{16}|ghp_[A-Za-z0-9]{36}|github_pat_[A-Za-z0-9_]{82}|xox[baprs]-[A-Za-z0-9-]+|-----BEGIN (RSA|EC|OPENSSH|PRIVATE) KEY-----'"'"' -- src infra e2e .github scripts package.json package-lock.json next.config.ts eslint.config.mjs postcss.config.mjs tsconfig.json playwright.config.ts vitest.config.mts cdk.json; then
    echo "Potential secret-like content found."
    exit 1
  fi
'
run_step "Run production build" npm run build
