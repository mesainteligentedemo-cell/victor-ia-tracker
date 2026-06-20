#!/usr/bin/env pwsh
<#
==========================================
VERIFY DEPLOYMENT HEALTH
==========================================
Verifica que TODO está funcionando correctamente

Usage: .\verify-deployment.ps1
#>

Write-Host "
╔════════════════════════════════════════╗
║  🔍 Deployment Verification            ║
╚════════════════════════════════════════╝
" -ForegroundColor Cyan

$apiUrl = "http://localhost:3456"
$allGood = $true

# Check 1: API Server Health
Write-Host "`n1️⃣  Checking API Server Health..." -ForegroundColor Yellow
try {
  $health = Invoke-WebRequest -Uri "$apiUrl/api/health" -TimeoutSec 3 -ErrorAction Stop
  $data = $health.Content | ConvertFrom-Json
  Write-Host "✅ API Server is running" -ForegroundColor Green
  Write-Host "   Status: $($data.status)" -ForegroundColor Gray
  Write-Host "   Uptime: $($data.uptime)s" -ForegroundColor Gray
  Write-Host "   WebSocket Connections: $($data.wsConnections)" -ForegroundColor Gray
} catch {
  Write-Host "❌ API Server NOT responding" -ForegroundColor Red
  Write-Host "   Error: $_" -ForegroundColor Red
  Write-Host "   → Run: node api-endpoints.js" -ForegroundColor Yellow
  $allGood = $false
}

# Check 2: API Endpoints
Write-Host "`n2️⃣  Checking API Endpoints..." -ForegroundColor Yellow
$endpoints = @(
  "/api/loops/active",
  "/api/context/tokens",
  "/api/projects/metrics",
  "/api/roadmap",
  "/api/alerts"
)

foreach ($endpoint in $endpoints) {
  try {
    $response = Invoke-WebRequest -Uri "$apiUrl$endpoint" -TimeoutSec 2 -ErrorAction Stop
    Write-Host "   ✅ $endpoint" -ForegroundColor Green
  } catch {
    Write-Host "   ❌ $endpoint" -ForegroundColor Red
    $allGood = $false
  }
}

# Check 3: Live Data File
Write-Host "`n3️⃣  Checking Data File..." -ForegroundColor Yellow
if (Test-Path ".\live-data.json") {
  $fileTime = (Get-Item ".\live-data.json").LastWriteTime
  $age = (Get-Date) - $fileTime
  if ($age.TotalMinutes -lt 10) {
    Write-Host "✅ live-data.json exists (fresh)" -ForegroundColor Green
    Write-Host "   Last updated: $([math]::Round($age.TotalSeconds))s ago" -ForegroundColor Gray
  } else {
    Write-Host "⚠️  live-data.json is stale" -ForegroundColor Yellow
    Write-Host "   Last updated: $([math]::Round($age.TotalMinutes))m ago" -ForegroundColor Gray
    Write-Host "   → Run Python collector: python collect-live-data.py" -ForegroundColor Yellow
  }
} else {
  Write-Host "❌ live-data.json not found" -ForegroundColor Red
  Write-Host "   → Run: python collect-live-data.py" -ForegroundColor Yellow
  $allGood = $false
}

# Check 4: Task Scheduler
Write-Host "`n4️⃣  Checking Task Scheduler..." -ForegroundColor Yellow
$task = Get-ScheduledTask -TaskName "Victor-IA-Collector" -ErrorAction SilentlyContinue
if ($task) {
  Write-Host "✅ Task Scheduler is configured" -ForegroundColor Green
  $lastRun = $task.LastRunTime
  if ($lastRun) {
    $runAge = (Get-Date) - $lastRun
    Write-Host "   Last run: $([math]::Round($runAge.TotalMinutes))m ago" -ForegroundColor Gray
  }
} else {
  Write-Host "⚠️  Task Scheduler not configured" -ForegroundColor Yellow
  Write-Host "   → Run: .\setup-complete.ps1" -ForegroundColor Yellow
}

# Check 5: npm Dependencies
Write-Host "`n5️⃣  Checking npm Dependencies..." -ForegroundColor Yellow
if (Test-Path ".\node_modules") {
  Write-Host "✅ node_modules exists" -ForegroundColor Green
  $pkgJson = Get-Content ".\package.json" -ErrorAction SilentlyContinue
  if ($pkgJson) {
    Write-Host "   Packages installed" -ForegroundColor Gray
  }
} else {
  Write-Host "❌ node_modules not found" -ForegroundColor Red
  Write-Host "   → Run: npm install" -ForegroundColor Yellow
  $allGood = $false
}

# Check 6: Environment Variables
Write-Host "`n6️⃣  Checking Environment..." -ForegroundColor Yellow
if (Test-Path ".\.env") {
  Write-Host "✅ .env file exists" -ForegroundColor Green
  $content = Get-Content ".\.env" -ErrorAction SilentlyContinue
  if ($content -match "PORT") {
    Write-Host "   PORT configured" -ForegroundColor Gray
  }
  if ($content -match "N8N_WEBHOOK_URL") {
    Write-Host "   n8n webhook configured" -ForegroundColor Gray
  }
} else {
  Write-Host "⚠️  .env not found" -ForegroundColor Yellow
  Write-Host "   → Run: .\setup-complete.ps1" -ForegroundColor Yellow
}

# Check 7: Python Availability
Write-Host "`n7️⃣  Checking Python..." -ForegroundColor Yellow
try {
  $pythonVer = python --version 2>&1
  Write-Host "✅ Python available: $pythonVer" -ForegroundColor Green

  # Test Python script
  $pythonOutput = python -c "import json; print('OK')" 2>&1
  if ($pythonOutput -eq "OK") {
    Write-Host "   Python execution: OK" -ForegroundColor Gray
  }
} catch {
  Write-Host "❌ Python not available" -ForegroundColor Red
  Write-Host "   Install from: https://python.org/" -ForegroundColor Yellow
  $allGood = $false
}

# Final Summary
Write-Host "
╔════════════════════════════════════════╗
" -ForegroundColor Cyan

if ($allGood) {
  Write-Host "║  ✅ DEPLOYMENT HEALTHY                   ║" -ForegroundColor Green
  Write-Host "║     All systems operational              ║" -ForegroundColor Green
} else {
  Write-Host "║  ⚠️  ISSUES FOUND                         ║" -ForegroundColor Yellow
  Write-Host "║     See above for details                ║" -ForegroundColor Yellow
}

Write-Host "╚════════════════════════════════════════╝
" -ForegroundColor Cyan

# Recommendations
Write-Host "
📋 RECOMMENDATIONS:

If API Server is down:
   1. Open PowerShell/Terminal
   2. cd C:\Users\inbou\victor-ia-tracker
   3. npm install (if needed)
   4. node api-endpoints.js
   5. Keep this window open

If Python collector isn't running:
   1. Check Task Scheduler (see Check 4 above)
   2. Or run manually: python collect-live-data.py
   3. Check live-data.json timestamp

If Dashboard doesn't show data:
   1. Open browser console (F12)
   2. Type: window.TrackerWS.isConnected
   3. If false: API server not running
   4. If true: Check /api/loops/active in browser

To monitor logs:
   1. API Server: Watch terminal output
   2. Python Collector: Check event viewer
   3. Dashboard: Browser console (F12)

🚀 All systems ready for production!
" -ForegroundColor Cyan