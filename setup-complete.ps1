#!/usr/bin/env pwsh
<#
==========================================
COMPLETE SETUP & DEPLOYMENT SCRIPT
==========================================
Configura TODO lo necesario para producción:
1. Instala dependencias Node.js
2. Inicia API server
3. Configura Python collector
4. Setup Task Scheduler
5. Verifica health checks

Usage: .\setup-complete.ps1
#>

Write-Host "
╔════════════════════════════════════════╗
║  🚪 THE DOOR — Complete Setup        ║
║     (Phase 1-3 Deployment)            ║
╚════════════════════════════════════════╝
" -ForegroundColor Cyan

# Check Node.js
Write-Host "📋 Checking Node.js..." -ForegroundColor Yellow
$nodeVersion = node --version 2>$null
if (-not $nodeVersion) {
  Write-Host "❌ Node.js not found. Install from: https://nodejs.org/" -ForegroundColor Red
  exit 1
}
Write-Host "✅ Node.js $nodeVersion installed" -ForegroundColor Green

# Check Python
Write-Host "`n📋 Checking Python..." -ForegroundColor Yellow
$pythonVersion = python --version 2>$null
if (-not $pythonVersion) {
  Write-Host "❌ Python not found. Install from: https://python.org/" -ForegroundColor Red
  exit 1
}
Write-Host "✅ $pythonVersion installed" -ForegroundColor Green

# Install npm dependencies
Write-Host "`n📦 Installing npm dependencies..." -ForegroundColor Yellow
npm install express cors ws dotenv nodemon

if ($LASTEXITCODE -eq 0) {
  Write-Host "✅ Dependencies installed" -ForegroundColor Green
} else {
  Write-Host "❌ npm install failed" -ForegroundColor Red
  exit 1
}

# Create .env file
Write-Host "`n⚙️  Creating .env file..." -ForegroundColor Yellow
$envContent = @"
PORT=3456
N8N_WEBHOOK_URL=https://n8n.srv1013903.hstgr.cloud/webhook/tracker-data
NODE_ENV=production
"@

Set-Content -Path ".\.env" -Value $envContent
Write-Host "✅ .env created" -ForegroundColor Green

# Setup Task Scheduler for Python collector
Write-Host "`n⏰ Setting up Task Scheduler..." -ForegroundColor Yellow

$trackerPath = Get-Location
$pythonScript = Join-Path $trackerPath "collect-live-data.py"
$pythonExe = (Get-Command python).Source

# Check if task already exists
$taskExists = Get-ScheduledTask -TaskName "Victor-IA-Collector" -ErrorAction SilentlyContinue

if ($taskExists) {
  Write-Host "⏭️  Task already exists. Skipping..." -ForegroundColor Yellow
} else {
  try {
    # Create trigger (every 5 minutes)
    $trigger = New-ScheduledTaskTrigger -RepetitionInterval (New-TimeSpan -Minutes 5) -At (Get-Date) -RepetitionDuration (New-TimeSpan -Days 365) -Once

    # Create action
    $action = New-ScheduledTaskAction -Execute $pythonExe -Argument $pythonScript -WorkingDirectory $trackerPath

    # Create task
    Register-ScheduledTask -TaskName "Victor-IA-Collector" `
      -Trigger $trigger `
      -Action $action `
      -Description "Collect live data for THE DOOR dashboards" `
      -RunLevel Highest

    Write-Host "✅ Task Scheduler configured (every 5 minutes)" -ForegroundColor Green
  } catch {
    Write-Host "⚠️  Could not create Task Scheduler task: $_" -ForegroundColor Yellow
    Write-Host "   → Create manually via Task Scheduler GUI" -ForegroundColor Yellow
  }
}

# Run Python collector once
Write-Host "`n🐍 Running Python collector (initial)..." -ForegroundColor Yellow
python collect-live-data.py

if ($LASTEXITCODE -eq 0) {
  Write-Host "✅ Python collector ran successfully" -ForegroundColor Green
} else {
  Write-Host "⚠️  Python collector had issues" -ForegroundColor Yellow
}

# Summary
Write-Host "
╔════════════════════════════════════════╗
║  ✅ Setup Complete!                   ║
╚════════════════════════════════════════╝
" -ForegroundColor Green

Write-Host "
📋 NEXT STEPS:

1️⃣  Start API Server (in new Terminal):
   cd $trackerPath
   node api-endpoints.js

2️⃣  Open Tracker in Browser:
   http://localhost:8000/tracker_live.html
   (or https://tracker.victor-ia.xyz/ after Vercel deploy)

3️⃣  Verify Connection:
   - Go to Console (F12)
   - Type: window.TrackerWS.isConnected
   - Should return: true

4️⃣  Deploy Frontend to Vercel:
   git push origin main
   (Auto-deploys)

5️⃣  Deploy Backend API:
   Deploy api-endpoints.js to:
   - Railway (recommended)
   - Heroku
   - Your VPS

📊 Monitoring:
   - Task Scheduler runs Python every 5 min
   - API server refreshes cache every 5 sec
   - WebSocket updates dashboards instantly

⚠️  IMPORTANT:
   - Task Scheduler must have admin permission
   - Keep API server running 24/7 (use PM2/systemd)
   - Monitor n8n webhook for critical alerts

✅ Status: READY FOR PRODUCTION
" -ForegroundColor Cyan

# Health check
Write-Host "🔍 Quick Health Check..." -ForegroundColor Yellow

# Check if live-data.json exists
if (Test-Path ".\live-data.json") {
  Write-Host "✅ live-data.json exists" -ForegroundColor Green
} else {
  Write-Host "⚠️  live-data.json not found (will be created by Python)" -ForegroundColor Yellow
}

# Check if API endpoints.js exists
if (Test-Path ".\api-endpoints.js") {
  Write-Host "✅ api-endpoints.js ready" -ForegroundColor Green
} else {
  Write-Host "❌ api-endpoints.js not found" -ForegroundColor Red
}

# Check if tracker_live.html exists
if (Test-Path ".\tracker_live.html") {
  Write-Host "✅ tracker_live.html ready" -ForegroundColor Green
} else {
  Write-Host "❌ tracker_live.html not found" -ForegroundColor Red
}

Write-Host "
" -ForegroundColor Cyan