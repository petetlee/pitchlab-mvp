# PitchLab Master Service Launcher
$env:NODE_TLS_REJECT_UNAUTHORIZED = "0"

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "🚀 Starting PitchLab Firebase Emulators & Web App" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

$projectRoot = $PSScriptRoot

# Start Static Web Server on Port 8082
$webJob = Start-Job -ScriptBlock {
    param($root)
    Set-Location "$root\frontend"
    node server.js
} -ArgumentList $projectRoot

# Start Firebase Emulators
$env:NODE_TLS_REJECT_UNAUTHORIZED = "0"
firebase emulators:start
