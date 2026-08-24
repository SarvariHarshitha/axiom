# Installs a Windows Task Scheduler task that runs PaperForge's daily
# generation headlessly, independent of whether the app/browser is open.
# Run this in an elevated PowerShell prompt from the project root:
#   powershell -ExecutionPolicy Bypass -File scripts\install-task.ps1

$ProjectDir = Split-Path -Parent $PSScriptRoot
$NodePath = (Get-Command node).Source
$ScriptPath = Join-Path $ProjectDir "server\scheduler\run-daily.ts"
$LogPath = Join-Path $ProjectDir "data\cron.log"

$Action = New-ScheduledTaskAction -Execute $NodePath `
  -Argument "--experimental-strip-types `"$ScriptPath`"" `
  -WorkingDirectory $ProjectDir

# 00:30 IST == 19:00 UTC the previous day. Task Scheduler trigger times use
# the machine's local timezone, so this assumes the machine is set to IST;
# otherwise adjust -At accordingly (see README "Timezone" section).
$Trigger = New-ScheduledTaskTrigger -Daily -At 00:30

$Settings = New-ScheduledTaskSettingsSet -WakeToRun -StartWhenAvailable

Register-ScheduledTask -TaskName "PaperForge Daily Generation" `
  -Action $Action -Trigger $Trigger -Settings $Settings `
  -Description "Runs PaperForge's daily paper generation pipeline" -Force

Write-Host "Installed scheduled task 'PaperForge Daily Generation' (runs daily at 00:30 local time)."
Write-Host "Logs: $LogPath (redirect not configured by Task Scheduler; use Get-ScheduledTaskInfo to check run history)."
Write-Host "Note: catch-up-on-launch also covers missed runs the next time the server starts."
