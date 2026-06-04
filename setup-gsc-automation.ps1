# Setup GSC Data Fetcher — 2 veces al día automáticamente
# Ejecutar como ADMIN
# powershell -ExecutionPolicy Bypass -File setup-gsc-automation.ps1

param(
    [switch]$Remove = $false
)

$TaskName = "Victor-IA-GSC-Fetcher"
$TaskPath = "\Victor IA\GSC\"
$FullTaskName = "$TaskPath$TaskName"
$ScriptPath = "C:\Users\inbou\victor-ia-tracker\fetch-gsc-data.py"
$PythonPath = "python"  # O la ruta completa si no está en PATH
$LogPath = "C:\Users\inbou\victor-ia-tracker\gsc-fetch-log.txt"

Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  Victor IA — Google Search Console Data Fetcher Setup      ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Verificar si se ejecuta como admin
if (-not ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
    Write-Host "❌ Este script debe ejecutarse como ADMINISTRADOR" -ForegroundColor Red
    Write-Host "   Abre PowerShell como Admin y ejecuta de nuevo." -ForegroundColor Yellow
    exit 1
}

if ($Remove) {
    Write-Host "🗑️  Removiendo tareas programadas..." -ForegroundColor Yellow

    # Remover tareas
    try {
        Get-ScheduledTask -TaskName "$TaskName-Morning" -ErrorAction Stop | Unregister-ScheduledTask -Confirm:$false
        Write-Host "   ✅ Removida: Morning task" -ForegroundColor Green
    } catch { }

    try {
        Get-ScheduledTask -TaskName "$TaskName-Afternoon" -ErrorAction Stop | Unregister-ScheduledTask -Confirm:$false
        Write-Host "   ✅ Removida: Afternoon task" -ForegroundColor Green
    } catch { }

    Write-Host ""
    Write-Host "✅ Tareas removidas" -ForegroundColor Green
    exit 0
}

# Verificar Python
Write-Host "🔍 Verificando Python..." -ForegroundColor Cyan
$PythonCheck = & python --version 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Python no está instalado o no está en PATH" -ForegroundColor Red
    Write-Host "   Instala Python desde: https://www.python.org/downloads/" -ForegroundColor Yellow
    exit 1
}
Write-Host "   ✅ $PythonCheck" -ForegroundColor Green

# Verificar librerías Python
Write-Host ""
Write-Host "🔍 Verificando librerías Python..." -ForegroundColor Cyan
$LibsNeeded = @(
    "google-api-python-client",
    "google-auth-oauthlib",
    "google-auth-httplib2"
)

foreach ($lib in $LibsNeeded) {
    $installed = & pip show $lib 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   ✅ $lib" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  Instalando $lib..." -ForegroundColor Yellow
        & pip install $lib | Out-Null
        Write-Host "   ✅ $lib instalado" -ForegroundColor Green
    }
}

# Verificar archivo de script
Write-Host ""
Write-Host "🔍 Verificando archivos..." -ForegroundColor Cyan
if (-not (Test-Path $ScriptPath)) {
    Write-Host "❌ No encontrado: $ScriptPath" -ForegroundColor Red
    exit 1
}
Write-Host "   ✅ Script encontrado: $ScriptPath" -ForegroundColor Green

# Crear folder en Task Scheduler
Write-Host ""
Write-Host "📋 Configurando Task Scheduler..." -ForegroundColor Cyan

# Acción principal: ejecutar Python script y guardar log
$Action = New-ScheduledTaskAction -Execute "python" -Argument "`"$ScriptPath`"" -WorkingDirectory "C:\Users\inbou\victor-ia-tracker"

# Trigger 1: Cada día a las 08:00 (Morning)
$TriggerMorning = New-ScheduledTaskTrigger -Daily -At "08:00AM"

# Trigger 2: Cada día a las 14:00 (Afternoon)
$TriggerAfternoon = New-ScheduledTaskTrigger -Daily -At "14:00PM"

# Configuración de la tarea
$Settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable `
    -RunOnlyIfNetworkAvailable `
    -ExecutionTimeLimit (New-TimeSpan -Hours 1)

# Crear tarea 1 (Morning)
Write-Host "   📅 Creando: GSC Fetch — 08:00 AM"
try {
    Remove-ScheduledTask -TaskName "$TaskName-Morning" -ErrorAction SilentlyContinue -Confirm:$false
} catch { }

Register-ScheduledTask `
    -TaskName "$TaskName-Morning" `
    -Action $Action `
    -Trigger $TriggerMorning `
    -Settings $Settings `
    -Description "Fetch real Google Search Console data for Victor IA (Morning)" `
    -User "SYSTEM" | Out-Null

Write-Host "      ✅ Creada: $TaskName-Morning" -ForegroundColor Green

# Crear tarea 2 (Afternoon)
Write-Host "   📅 Creando: GSC Fetch — 14:00 PM"
try {
    Remove-ScheduledTask -TaskName "$TaskName-Afternoon" -ErrorAction SilentlyContinue -Confirm:$false
} catch { }

Register-ScheduledTask `
    -TaskName "$TaskName-Afternoon" `
    -Action $Action `
    -Trigger $TriggerAfternoon `
    -Settings $Settings `
    -Description "Fetch real Google Search Console data for Victor IA (Afternoon)" `
    -User "SYSTEM" | Out-Null

Write-Host "      ✅ Creada: $TaskName-Afternoon" -ForegroundColor Green

# Resumen
Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║  ✅ SETUP COMPLETADO                                       ║" -ForegroundColor Green
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Tareas programadas:" -ForegroundColor Cyan
Write-Host "   • Morning:   08:00 AM" -ForegroundColor Yellow
Write-Host "   • Afternoon: 14:00 PM (2:00 PM)" -ForegroundColor Yellow
Write-Host ""
Write-Host "⚙️  Próximos pasos:" -ForegroundColor Cyan
Write-Host "   1. Crea credenciales OAuth2 en Google Cloud:" -ForegroundColor White
Write-Host "      https://console.cloud.google.com/" -ForegroundColor Gray
Write-Host ""
Write-Host "   2. Habilita 'Google Search Console API'" -ForegroundColor White
Write-Host ""
Write-Host "   3. Crea 'OAuth 2.0 credentials' (Desktop app)" -ForegroundColor White
Write-Host ""
Write-Host "   4. Descarga JSON → renombra a 'credentials.json'" -ForegroundColor White
Write-Host "      Pon en: C:\Users\inbou\victor-ia-tracker\" -ForegroundColor Gray
Write-Host ""
Write-Host "   5. Ejecuta el script UNA VEZ manualmente:" -ForegroundColor White
Write-Host "      python C:\Users\inbou\victor-ia-tracker\fetch-gsc-data.py" -ForegroundColor Gray
Write-Host ""
Write-Host "   6. Se abrirá navegador para autorizar con Google" -ForegroundColor White
Write-Host "      Usa: mesainteligentedemo@gmail.com" -ForegroundColor Gray
Write-Host ""
Write-Host "📊 Dashboard en vivo:" -ForegroundColor Cyan
Write-Host "   https://tracker.victor-ia.xyz/actividades-repetitivas.html?tab=seo" -ForegroundColor Green
Write-Host ""
Write-Host "🔄 Para remover las tareas:" -ForegroundColor Yellow
Write-Host "   powershell -ExecutionPolicy Bypass -File setup-gsc-automation.ps1 -Remove" -ForegroundColor Gray
Write-Host ""
