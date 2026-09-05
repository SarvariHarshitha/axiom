#!/usr/bin/env bash
# Installs a macOS/Linux cron entry that runs Axiom's daily generation
# headlessly, independent of whether the app/browser is open.
# Safe to re-run: it replaces any existing Axiom line rather than duplicating it.
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
NODE_BIN="$(command -v node)"
CRON_EXPR="${1:-30 0 * * *}"
MARKER="# axiom-daily"

CRON_LINE="${CRON_EXPR} cd ${PROJECT_DIR} && TZ=Asia/Kolkata ${NODE_BIN} --experimental-strip-types server/scheduler/run-daily.ts >> ${PROJECT_DIR}/data/cron.log 2>&1 ${MARKER}"

TMP_CRON="$(mktemp)"
crontab -l 2>/dev/null | grep -v "${MARKER}" > "${TMP_CRON}" || true
echo "${CRON_LINE}" >> "${TMP_CRON}"
crontab "${TMP_CRON}"
rm -f "${TMP_CRON}"

echo "Installed cron job:"
echo "  ${CRON_LINE}"
echo ""
echo "Note: Axiom's catch-up-on-launch also covers missed runs (e.g. laptop"
echo "asleep at the scheduled time) the next time the server starts."
