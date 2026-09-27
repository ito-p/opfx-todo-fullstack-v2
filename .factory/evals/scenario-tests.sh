#!/usr/bin/env bash
# Blocks when a Scenario title from the change's delta specs does not appear anywhere under test/, tests/ or src/.
# Reads the active change, or its archived copy once archive.sh has run (R2 runs the evals after archive).
# Disabled by default (not executable). Enable with: chmod +x .factory/evals/scenario-tests.sh
set -euo pipefail
change="${1:?change}"; missing=0
dir="openspec/changes/$change/specs"
if [ ! -d "$dir" ]; then dir=$(ls -d openspec/changes/archive/*-"$change"/specs 2>/dev/null | tail -n 1 || true); fi
[ -n "$dir" ] && [ -d "$dir" ] || { echo "no delta specs for change $change (active or archived)" >&2; exit 1; }
while IFS= read -r t; do
  grep -rqF -- "$t" test tests src 2>/dev/null || { echo "no test mentions scenario: $t" >&2; missing=$((missing+1)); }
done < <(grep -rh '^#### Scenario:' "$dir" 2>/dev/null | sed -E 's/^#### Scenario: *//')
[ "$missing" -eq 0 ]
