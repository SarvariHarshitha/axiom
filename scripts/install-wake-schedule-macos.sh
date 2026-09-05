#!/usr/bin/env bash
# Makes Axiom's daily generation run even if the Mac is asleep at the
# scheduled time, by:
#   1. Telling macOS's power management to WAKE the machine a few minutes
#      before the scheduled run (`pmset repeat wake`) - plain cron/launchd
#      jobs never fire while the machine is actually asleep, they only fire
#      if it happens to already be awake.
#   2. Installing a launchd agent (not cron - cron has no "catch this up on
#      wake" semantics on macOS) that runs server/scheduler/run-daily.ts at
#      that time.
#
# The Mac can still have its LID CLOSED and be plugged in; this does not
# work on battery-only for most Mac laptop models (Apple silicon Macs do
# support scheduled wake on battery, but it drains battery faster). The
# display stays off; only the CPU/network briefly wake.
#
# Safe to re-run.
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
NODE_BIN="$(command -v node)"
PLIST_LABEL="com.axiom.daily"
PLIST_DEST="${HOME}/Library/LaunchAgents/${PLIST_LABEL}.plist"

# Read schedule from .env (falls back to 00:30 IST / the plan.md default).
ENV_FILE="${PROJECT_DIR}/.env"
APP_TIMEZONE="Asia/Kolkata"
DAILY_CRON="30 0 * * *"
if [ -f "${ENV_FILE}" ]; then
  APP_TIMEZONE="$(grep -E '^APP_TIMEZONE=' "${ENV_FILE}" | tail -1 | cut -d= -f2- || true)"
  DAILY_CRON="$(grep -E '^DAILY_CRON=' "${ENV_FILE}" | tail -1 | cut -d= -f2- || true)"
  APP_TIMEZONE="${APP_TIMEZONE:-Asia/Kolkata}"
  DAILY_CRON="${DAILY_CRON:-30 0 * * *}"
fi

# Parse "MIN HOUR * * *" -> HOUR, MIN (only supports simple fixed-time crons).
MINUTE="$(echo "${DAILY_CRON}" | awk '{print $1}')"
HOUR="$(echo "${DAILY_CRON}" | awk '{print $2}')"
if ! [[ "${MINUTE}" =~ ^[0-9]+$ ]] || ! [[ "${HOUR}" =~ ^[0-9]+$ ]]; then
  echo "DAILY_CRON='${DAILY_CRON}' isn't a simple 'M H * * *' expression - edit this script's HOUR/MINUTE manually." >&2
  exit 1
fi

# Wake the machine 3 minutes early so it's fully up by the scheduled minute.
WAKE_MINUTE=$(( (10#${MINUTE} - 3 + 60) % 60 ))
WAKE_HOUR="${HOUR}"
if [ "${WAKE_MINUTE}" -gt "$(( 10#${MINUTE} ))" ]; then
  WAKE_HOUR=$(( (10#${HOUR} - 1 + 24) % 24 ))
fi
WAKE_TIME="$(printf '%02d:%02d:00' "${WAKE_HOUR}" "${WAKE_MINUTE}")"

echo "Scheduling macOS wake at ${WAKE_TIME} local time (daily), run at ${HOUR}:$(printf '%02d' "${MINUTE}") ${APP_TIMEZONE}..."
echo "This requires an admin password (pmset needs sudo):"
# "MTWRFSU" = every day of the week (M T W R F S U). pmset requires an
# explicit weekday list - it does not accept a bare time for a daily repeat.
sudo pmset repeat wake MTWRFSU "${WAKE_TIME}"

echo "Writing launchd agent to ${PLIST_DEST}..."
mkdir -p "${HOME}/Library/LaunchAgents"
sed \
  -e "s|__NODE_BIN__|${NODE_BIN}|g" \
  -e "s|__PROJECT_DIR__|${PROJECT_DIR}|g" \
  -e "s|__APP_TIMEZONE__|${APP_TIMEZONE}|g" \
  -e "s|__HOUR__|$(( 10#${HOUR} ))|g" \
  -e "s|__MINUTE__|$(( 10#${MINUTE} ))|g" \
  "${PROJECT_DIR}/scripts/com.axiom.daily.plist.template" > "${PLIST_DEST}"

launchctl unload "${PLIST_DEST}" 2>/dev/null || true
launchctl load "${PLIST_DEST}"

echo ""
echo "Done. Verify with:"
echo "  pmset -g sched                 # confirms the wake schedule"
echo "  launchctl list | grep axiom   # confirms the agent is loaded"
echo ""
echo "To remove both:"
echo "  sudo pmset repeat cancel"
echo "  launchctl unload ${PLIST_DEST} && rm ${PLIST_DEST}"
echo ""
echo "Notes:"
echo "  - Keep the lid closed but the Mac PLUGGED IN for reliable scheduled wake."
echo "  - If the Mac is fully shut down (not asleep) at wake time, it will still"
echo "    stay off - this only works from sleep, not power-off."
echo "  - catch-up-on-launch (server/scheduler/cron.ts) remains the fallback if"
echo "    the wake/launchd path is ever missed for any reason."
