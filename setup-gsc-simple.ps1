# Setup GSC Data Fetcher - Versión Simplificada
# Ejecutar como ADMINISTRADOR
# powershell -ExecutionPolicy Bypass -File setup-gsc-simple.ps1

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  Victor IA - Google Search Console Setup" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# Verificar si se ejecuta como admin
$isAdmin = [bool]([System.Security.Principal.WindowsIdentity]::GetCurrent().Groups -match "S-1-5-32-544")
if (-not $isAdmin) {
    Write-Host "ERROR: Este script debe ejecutarse como ADMINISTRADOR" -ForegroundColor Red
    Write-Host "Abre PowerShell como Admin y intenta de nuevo." -ForegroundColor Yellow
    exit 1
}

$TaskName1 = "Victor-IA-GSC-Morning"
$TaskName2 = "Victor-IA-GSC-Afternoon"
$ScriptPath = "C:\Users\inbou\victor-ia-tracker\fetch-gsc-simple.py"
$PythonExe = "python"

Write-Host "Creating Task 1: Morning (08:00 AM)" -ForegroundColor Green
$action1 = New-ScheduledTaskAction -Execute $PythonExe -Argument $ScriptPath
$trigger1 = New-ScheduledTaskTrigger -Daily -At 08:00AM
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries

Register-ScheduledTask -TaskName $TaskName1 -Action $action1 -Trigger $trigger1 -Settings $settings -Force | Out-Null
Write-Host "✅ Tarea 1 creada: $TaskName1" -ForegroundColor Green

Write-Host ""
Write-Host "Creating Task 2: Afternoon (14:00 PM)" -ForegroundColor Green
$trigger2 = New-ScheduledTaskTrigger -Daily -At 14:00PM
Register-ScheduledTask -TaskName $TaskName2 -Action $action1 -Trigger $trigger2 -Settings $settings -Force | Out-Null
Write-Host "✅ Tarea 2 creada: $TaskName2" -ForegroundColor Green

Write-Host ""
Write-Host "============================================================" -ForegroundColor Green
Write-Host "✅ SETUP COMPLETADO" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Tareas creadas:" -ForegroundColor Cyan
Write-Host "  • $TaskName1 @ 08:00 AM" -ForegroundColor Yellow
Write-Host "  • $TaskName2 @ 14:00 PM" -ForegroundColor Yellow
Write-Host ""
Write-Host "El script se ejecutara automaticamente 2 veces al dia." -ForegroundColor White
Write-Host ""
