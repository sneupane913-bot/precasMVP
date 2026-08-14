#!/usr/bin/env bash
#
# THE WHOLE GATE, IN ONE COMMAND.
#
# There are two rules about running these suites that nobody should have to
# remember, and both have already produced false results on this project:
#
#   1. Every server-backed suite needs a FRESHLY STARTED server. The per IP
#      throttles are real, so a suite that inherits a used bucket reports
#      throttling as failure and somebody spends an hour "fixing" a product
#      that was never broken.
#
#   2. It must be `next dev`, never `next start`. `next start` sets
#      NODE_ENV=production, which correctly disables the `dev:` sign-in token,
#      and then every assertion fails for the wrong reason.
#
# This script encodes both. Run it from the project root.
#
#   bash qa/run-all.sh
#
set -uo pipefail

PORT="${QA_BASE_PORT:-3200}"
FAILED=0
PASSED_SUITES=0

# Suites that read the source and need nothing running. Fast, so they go first:
# if the copy is wrong or a feature has no door, there is no point booting a
# server at all.
STATIC=(reachable-check copy-check header-check route-check)

# Suites that drive a running server.
SERVER=(
  walk-check
  pilot-check
  model-check
  rules-check
  journey-check
  lifecycle-check
  adversarial-check
  fraud-check
  tenant-check
  backoffice-check
  backoffice-ui-check
  ai-check
)

line() { printf '%s\n' "-------------------------------------------------------------"; }

echo
echo "============================================================="
echo " PreCAS Practice: the full gate"
echo "============================================================="
echo

line
echo " Static suites (no server needed)"
line

# The AI contract suite runs the rules rather than reading them, so it comes
# first: if the contract is broken there is no point going further.
printf '  %-24s ' "contract-check"
if OUT=$(node --experimental-strip-types --no-warnings qa/contract-check.mjs 2>&1); then
  echo "$OUT" | grep -E 'passed' | tail -1
  PASSED_SUITES=$((PASSED_SUITES + 1))
else
  echo "FAILED"
  echo "$OUT" | grep -E 'FAIL' | head -5
  FAILED=$((FAILED + 1))
fi

for suite in "${STATIC[@]}"; do
  printf '  %-24s ' "$suite"
  if OUT=$(node "qa/$suite.js" 2>&1); then
    echo "$OUT" | grep -E 'passed' | tail -1
    PASSED_SUITES=$((PASSED_SUITES + 1))
  else
    echo "FAILED"
    echo "$OUT" | grep -E 'FAIL' | head -6
    FAILED=$((FAILED + 1))
  fi
done

echo
line
echo " Server suites (a fresh server for each, ~25s each to compile)"
line

for suite in "${SERVER[@]}"; do
  PORT=$((PORT + 1))
  npx next dev -p "$PORT" >"/tmp/qa-$suite.log" 2>&1 &
  SRV=$!

  # Wait for it to answer rather than sleeping a fixed guess.
  for _ in $(seq 1 40); do
    if curl -s -o /dev/null "http://127.0.0.1:$PORT/" 2>/dev/null; then break; fi
    sleep 1
  done

  printf '  %-24s ' "$suite"
  if OUT=$(QA_PORT="$PORT" node "qa/$suite.js" 2>&1); then
    echo "$OUT" | grep -E 'passed|steps walked|bugs' | tail -1
    PASSED_SUITES=$((PASSED_SUITES + 1))
  else
    echo "FAILED"
    echo "$OUT" | grep -E 'FAIL|BUG' | head -8
    FAILED=$((FAILED + 1))
  fi

  kill "$SRV" 2>/dev/null
  wait "$SRV" 2>/dev/null
  sleep 1
done

echo
line
echo " Types and build"
line
printf '  %-24s ' "tsc --noEmit"
if npx tsc --noEmit >/tmp/qa-tsc.log 2>&1; then
  echo "clean"
  PASSED_SUITES=$((PASSED_SUITES + 1))
else
  echo "FAILED"
  head -10 /tmp/qa-tsc.log
  FAILED=$((FAILED + 1))
fi

printf '  %-24s ' "next build"
if npx next build >/tmp/qa-build.log 2>&1; then
  echo "clean"
  PASSED_SUITES=$((PASSED_SUITES + 1))
else
  echo "FAILED"
  grep -E 'Error|error' /tmp/qa-build.log | head -10
  FAILED=$((FAILED + 1))
fi

echo
echo "============================================================="
if [ "$FAILED" -eq 0 ]; then
  echo " ALL GREEN. $PASSED_SUITES checks passed."
  echo
  echo " This is NOT a release. The automated suites drive the API and read"
  echo " server-rendered HTML. Not one of them loads the JavaScript, and every"
  echo " defect the client has found himself lived in client state."
  echo " Do the browser pass in docs/TEST-PLAN.md section 1.2 before saying"
  echo " anything is finished."
else
  echo " $FAILED SUITE(S) RED. Do not ship."
  echo
  echo " Before believing the product is broken, check the two traps:"
  echo "   - did the suite get a fresh server?"
  echo "   - is a per IP throttle being reported as a failure?"
  echo " Both have wasted a session on this project before."
fi
echo "============================================================="
echo

exit "$FAILED"
