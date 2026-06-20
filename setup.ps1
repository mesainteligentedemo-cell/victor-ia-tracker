#!/usr/bin/env pwsh
<#
Complete setup for THE DOOR production deployment
#>

Write-Host "`nTHE DOOR - Complete Setup`n" -ForegroundColor Cyan

# Check Node.js
Write-Host "[1/5] Checking Node.js..." -ForegroundColor Yellow
$nodeVersion = node --version 2>$null
if (-not $nodeVersion) {
  Write-Host "ERROR: Node.js not found. Install from: https://nodejs.org/" -ForegroundColor Red
  exit 1
}
Write-Host "[OK] Node.js $nodeVersion installed" -ForegroundColor Green

# Check Python
Write-Host "[2/5] Checking Python..." -ForegroundColor Yellow
$pythonVersion = python --version 2>$null
if (-not $pythonVersion) {
  Write-Host "ERROR: Python not found. Install from: https://python.org/" -ForegroundColor Red
  exit 1
}
Write-Host "[OK] $pythonVersion installed" -ForegroundColor Green

# Install npm dependencies
Write-Host "[3/5] Installing npm dependencies..." -ForegroundColor Yellow
npm install express cors ws dotenv nodemon

if ($LASTEXITCODE -eq 0) {
  Write-Host "[OK] Dependencies installed" -ForegroundColor Green
} else {
  Write-Host "ERROR: npm install failed" -ForegroundColor Red
  exit 1
}

# Create .env file
Write-Host "[4/5] Creating .env file..." -ForegroundColor Yellow
$envContent = @"
PORT=3456
N8N_WEBHOOK_URL=https://n8n.srv1013903.hstgr.cloud/webhook/tracker-data
NODE_ENV=production
"@

Set-Content -Path ".\.env" -Value $envContent
Write-Host "[OK] .env created" -ForegroundColor Green

# Setup Task Scheduler
Write-Host "[5/5] Setting up Task Scheduler..." -ForegroundColor Yellow

$trackerPath = Get-Location
$pythonScript = Join-Path $trackerPath "collect-live-data.py"
$pythonExe = (Get-Command python).Source

$taskExists = Get-ScheduledTask -TaskName "Victor-IA-Collector" -ErrorAction SilentlyContinue

if ($taskExists) {
  Write-Host "[SKIP] Task already exists" -ForegroundColor Yellow
} else {
  try {
    $trigger = New-ScheduledTaskTrigger -RepetitionInterval (New-TimeSpan -Minutes 5) -At (Get-Date) -RepetitionDuration (New-TimeSpan -Days 365) -Once
    $action = New-ScheduledTaskAction -Execute $pythonExe -Argument $pythonScript -WorkingDirectory $trackerPath

    Register-ScheduledTask -TaskName "Victor-IA-Collector" `
      -Trigger $trigger `
      -Action $action `
      -Description "Collect live data for THE DOOR dashboards" `
      -RunLevel Highest

    Write-Host "[OK] Task Scheduler configured (every 5 minutes)" -ForegroundColor Green
  } catch {
    Write-Host "[WARN] Could not create Task Scheduler task: $_" -ForegroundColor Yellow
  }
}

# Run Python collector once
Write-Host "`nRunning Python collector (initial)..." -ForegroundColor Yellow
python collect-live-data.py

Write-Host "`n" -ForegroundColor Cyan
Write-Host "SETUP COMPLETE!" -ForegroundColor Green
Write-Host "`nNEXT STEPS:`n" -ForegroundColor Cyan

Write-Host "1. Start API Server (New Terminal/PowerShell):" -ForegroundColor Yellow
Write-Host "   cd $trackerPath`n   node api-endpoints.js`n" -ForegroundColor Gray

Write-Host "2. Verify Setup:" -ForegroundColor Yellow
Write-Host "   .\verify-deployment.ps1`n" -ForegroundColor Gray

Write-Host "3. Deploy to Vercel:" -ForegroundColor Yellow
Write-Host "   git push origin main`n" -ForegroundColor Gray

Write-Host "4. Monitor Status:" -ForegroundColor Yellow
Write-Host "   Open: https://tracker.victor-ia.xyz/" -ForegroundColor Gray
Write-Host "   Console (F12): window.TrackerWS.isConnected`n" -ForegroundColor Gray
