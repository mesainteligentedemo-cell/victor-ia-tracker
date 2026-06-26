<#
.SYNOPSIS
  PROTOCOLO DE VACIADO TOTAL — Auto-logger de actividad para Victor IA Tracker.

.DESCRIPTION
  Registra automáticamente actividad en el tracker vía /api/log-activity.
  Tres modos:
    1) -InstallHook   Instala un hook git post-commit en el repo actual (o -RepoPath)
                      que registra cada commit automáticamente.
    2) -Commit        Registra el commit MÁS RECIENTE del repo actual (lo llama el hook).
    3) -Action/-Desc  Registro manual de cualquier actividad (VSC/CLI).

.PARAMETER Endpoint
  URL del endpoint. Default: https://victor-ia-tracker.vercel.app/api/log-activity

.EXAMPLE
  # Instalar el hook de git en el repo actual:
  .\auto-logger.ps1 -InstallHook

.EXAMPLE
  # Registrar manualmente una acción:
  .\auto-logger.ps1 -Action edit -Desc "Edité index.html: nueva sección" -Source VSC

.EXAMPLE
  # Registrar el último commit (usado por el hook):
  .\auto-logger.ps1 -Commit
#>

param(
    [switch]$InstallHook,
    [switch]$Commit,
    [string]$Action = "event",
    [string]$Desc = "",
    [string]$Details = "",
    [ValidateSet("VSC","CLI","Tracker")]
    [string]$Source = "CLI",
    [string]$Project = "Tracker Meta",
    [string]$Client = "Victor IA",
    [string]$RepoPath = (Get-Location).Path,
    [string]$Endpoint = "https://victor-ia-tracker.vercel.app/api/log-activity"
)

function Send-Activity {
    param(
        [string]$Action, [string]$Description, [string]$Details,
        [string]$Source, [string]$Project, [string]$Client,
        [string]$Cat = $null, [string]$Sw = $null, [string[]]$Tags = $null
    )
    $payload = @{
        action      = $Action
        description = $Description
        details     = $Details
        source      = $Source
        timestamp   = (Get-Date).ToString("o")
        user        = "Pablo"
        project     = $Project
        client      = $Client
    }
    if ($Cat)  { $payload.cat = $Cat }
    if ($Sw)   { $payload.sw  = $Sw }
    if ($Tags) { $payload.tags = $Tags }

    $json = $payload | ConvertTo-Json -Compress
    try {
        $resp = Invoke-RestMethod -Uri $Endpoint -Method Post -Body $json `
                    -ContentType "application/json" -TimeoutSec 10
        Write-Host "[auto-logger] OK -> $($resp.id) ($($resp.stored))" -ForegroundColor Green
        return $true
    } catch {
        Write-Host "[auto-logger] FALLO: $($_.Exception.Message)" -ForegroundColor Yellow
        return $false
    }
}

# ── MODO 1: Instalar hook git post-commit ──
if ($InstallHook) {
    $gitDir = Join-Path $RepoPath ".git"
    if (-not (Test-Path $gitDir)) {
        Write-Host "No es un repo git: $RepoPath" -ForegroundColor Red
        exit 1
    }
    $hooksDir = Join-Path $gitDir "hooks"
    if (-not (Test-Path $hooksDir)) { New-Item -ItemType Directory -Path $hooksDir | Out-Null }

    $scriptPath = $MyInvocation.MyCommand.Path
    $hookFile = Join-Path $hooksDir "post-commit"

    # El hook llama a PowerShell con este mismo script en modo -Commit
    $hookBody = @"
#!/bin/sh
# Victor IA Tracker — auto-logger post-commit hook (PROTOCOLO DE VACIADO TOTAL)
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$scriptPath" -Commit -RepoPath "$RepoPath" >/dev/null 2>&1 &
exit 0
"@
    Set-Content -Path $hookFile -Value $hookBody -Encoding ASCII
    Write-Host "Hook post-commit instalado en: $hookFile" -ForegroundColor Green
    Write-Host "Cada 'git commit' en este repo se registrará automáticamente en el tracker." -ForegroundColor Cyan
    exit 0
}

# ── MODO 2: Registrar el commit más reciente ──
if ($Commit) {
    Push-Location $RepoPath
    try {
        $hash    = (git rev-parse --short HEAD 2>$null)
        $msg     = (git log -1 --pretty=%s 2>$null)
        $author  = (git log -1 --pretty=%an 2>$null)
        $files   = (git diff-tree --no-commit-id --name-only -r HEAD 2>$null)
        $branch  = (git rev-parse --abbrev-ref HEAD 2>$null)
        if (-not $hash) { Write-Host "No hay commits." -ForegroundColor Yellow; Pop-Location; exit 0 }

        $fileList = if ($files) { ($files -split "`n" | Where-Object { $_ } ) -join ", " } else { "(sin archivos)" }
        $repoName = Split-Path $RepoPath -Leaf

        $desc = "Commit ${hash}: $msg"
        $det  = "Repo: $repoName | Branch: $branch | Archivos: $fileList | Autor: $author"

        Send-Activity -Action "commit" -Description $desc -Details $det `
            -Source "CLI" -Project $Project -Client $Client `
            -Cat "Desarrollo" -Sw "Git" -Tags @("git","commit",$repoName) | Out-Null
    } finally {
        Pop-Location
    }
    exit 0
}

# ── MODO 3: Registro manual ──
if (-not $Desc) {
    Write-Host "Falta -Desc. Usa -InstallHook, -Commit, o -Action/-Desc." -ForegroundColor Red
    exit 1
}
$cat = if ($Source -eq "VSC" -or $Source -eq "CLI") { "Desarrollo" } else { "Tracker" }
$sw  = if ($Source -eq "VSC") { "VSCode" } elseif ($Source -eq "CLI") { "PowerShell" } else { "Tracker" }
Send-Activity -Action $Action -Description $Desc -Details $Details `
    -Source $Source -Project $Project -Client $Client -Cat $cat -Sw $sw | Out-Null