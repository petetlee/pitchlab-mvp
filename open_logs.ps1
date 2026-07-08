# PitchLab Log Helper
# Run this to quickly open the latest frontend logs and project folder

$projectRoot = "c:\Users\petet\.gemini\antigravity\scratch\Pitchlab-AntiGravity"
$frontendDir = Join-Path $projectRoot "frontend"

# Find latest startup log
$latestLog = Get-ChildItem -Path $frontendDir -Filter "startup_v*.log" | Sort-Object LastWriteTime -Descending | Select-Object -First 1

if ($latestLog) {
    Write-Host "Opening latest log: $($latestLog.Name)" -ForegroundColor Cyan
    notepad.exe $latestLog.FullName
} else {
    Write-Host "No startup logs found in $frontendDir" -ForegroundColor Yellow
}

Write-Host "Opening project directory..." -ForegroundColor Green
explorer.exe $projectRoot
