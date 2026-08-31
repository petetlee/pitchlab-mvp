# PitchLab Permanent Self-Healing Launcher
$ErrorActionPreference = "Continue"

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "     PitchLab Engine - Self-Healing Startup & Verification   " -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

$projectRoot = "C:\Users\petet\.gemini\antigravity\scratch\Pitchlab-AntiGravity"
Set-Location $projectRoot

# 1. Clean up any existing processes on required ports
Write-Host "[1/5] Checking and clearing conflicting ports (8082, 4000, 5001, 8080)..." -ForegroundColor Yellow
$ports = @(8082, 4000, 5001, 8080, 9099)
foreach ($port in $ports) {
    $connections = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    if ($connections) {
        foreach ($conn in $connections) {
            try {
                Stop-Process -Id $conn.OwningProcess -Force -ErrorAction SilentlyContinue
                Write-Host "  Cleared process $($conn.OwningProcess) on port $port" -ForegroundColor Gray
            } catch {}
        }
    }
}

$env:NODE_TLS_REJECT_UNAUTHORIZED = "0"

# 2. Start Firebase Emulators
Write-Host "[2/5] Starting Firebase Emulators..." -ForegroundColor Yellow
$emuScript = @"
`$env:NODE_TLS_REJECT_UNAUTHORIZED='0'
Set-Location '$projectRoot'
firebase emulators:start --project demo-pitchlab --import=./firebase_export --export-on-exit
"@
$emuFile = "$projectRoot\scratch_start_emu.ps1"
Set-Content -Path $emuFile -Value $emuScript
Start-Process powershell.exe -ArgumentList "-ExecutionPolicy", "Bypass", "-NoExit", "-File", "$emuFile" -WindowStyle Minimized

# 3. Start Web App Server
Write-Host "[3/5] Starting Frontend Web Server (Port 8082)..." -ForegroundColor Yellow
$webScript = @"
`$env:NODE_TLS_REJECT_UNAUTHORIZED='0'
Set-Location '$projectRoot\frontend'
node server.js
"@
$webFile = "$projectRoot\scratch_start_web.ps1"
Set-Content -Path $webFile -Value $webScript
Start-Process powershell.exe -ArgumentList "-ExecutionPolicy", "Bypass", "-NoExit", "-File", "$webFile" -WindowStyle Minimized

# 4. Wait & Verify Endpoints
Write-Host "[4/5] Waiting for services to initialize..." -ForegroundColor Yellow
$maxRetries = 20
$webReady = $false
$emuReady = $false

for ($i = 1; $i -le $maxRetries; $i++) {
    Start-Sleep -Seconds 1
    if (-not $webReady) {
        try {
            $resp = Invoke-WebRequest -Uri "http://localhost:8082" -UseBasicParsing -TimeoutSec 2 -ErrorAction SilentlyContinue
            if ($resp.StatusCode -eq 200) { $webReady = $true }
        } catch {}
    }
    if (-not $emuReady) {
        try {
            $resp = Invoke-WebRequest -Uri "http://localhost:4000" -UseBasicParsing -TimeoutSec 2 -ErrorAction SilentlyContinue
            if ($resp.StatusCode -eq 200) { $emuReady = $true }
        } catch {}
    }
    if ($webReady -and $emuReady) { break }
    Write-Host "  Waiting ($i/$maxRetries)... Web Ready: $webReady, Firebase Ready: $emuReady" -ForegroundColor Gray
}

Write-Host ""
if ($webReady) {
    Write-Host "✅ Web Server is LIVE at http://localhost:8082" -ForegroundColor Green
} else {
    Write-Host "⚠️ Web Server not responding on http://localhost:8082 yet" -ForegroundColor Red
}

if ($emuReady) {
    Write-Host "✅ Firebase Emulators are LIVE at http://localhost:4000" -ForegroundColor Green
} else {
    Write-Host "⚠️ Firebase Emulators not responding on http://localhost:4000 yet" -ForegroundColor Red
}

# 5. Open in Chrome
Write-Host "[5/5] Opening http://localhost:8082 in Google Chrome..." -ForegroundColor Yellow
$chromePath = "C:\Program Files\Google\Chrome\Application\chrome.exe"
if (Test-Path $chromePath) {
    Start-Process $chromePath "http://localhost:8082"
} else {
    Start-Process "http://localhost:8082"
}

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "           PitchLab Engine Started Successfully!            " -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Cyan
