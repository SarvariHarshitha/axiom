.PHONY: dev generate schedule schedule-wake build install

install:
	npm install

dev: install
	npm run dev

generate: install
	npm run generate

build: install
	npm run build

schedule:
	@if [ "$$(uname)" = "Darwin" ] || [ "$$(uname)" = "Linux" ]; then \
		bash scripts/install-cron.sh; \
	else \
		echo "On Windows, run scripts/install-task.ps1 in PowerShell instead."; \
	fi

# macOS only: also wakes the machine from sleep at the scheduled time (plain
# cron/launchd never fire while a Mac is actually asleep). Requires sudo.
schedule-wake:
	@if [ "$$(uname)" = "Darwin" ]; then \
		bash scripts/install-wake-schedule-macos.sh; \
	else \
		echo "schedule-wake is macOS-only (uses pmset). Use 'make schedule' on Linux, or Task Scheduler's WakeToRun on Windows (see scripts/install-task.ps1)."; \
	fi
