# ============================================================
# BULK POST -> https://tracker.victor-ia.xyz/api/log-activity
# Inserta las 165 entradas en la tabla activity_log (Supabase) + espejo n8n.
# USO: pwsh/powershell -> ejecutar este archivo. No requiere auth (endpoint CORS *).
# ============================================================
$ErrorActionPreference = "Stop"
$json = Get-Content -Raw -Encoding UTF8 "tracker_FINAL.json"
$entries = $json | ConvertFrom-Json
$url = "https://tracker.victor-ia.xyz/api/log-activity"
$ok = 0; $fail = 0
foreach ($e in $entries) {
  # timestamp ISO (Mexico UTC-6) para que el API derive dateKey/hora exactos
  $ts = "{0}T{1}:00-06:00" -f $e.dateKey, $e.hora
  $body = @{
    description = $e.desc
    timestamp   = $ts
    source      = "Backfill"
    action      = "import"
    cat         = $e.cat
    project     = $e.project
    client      = $e.client
    status      = $e.status
    priority    = $e.priority
    dur         = $e.dur
    durSec      = $e.durSec
    tags        = $e.tags
    sw          = ($e.sw -join ", ")
    details     = ("id=" + $e.id + "; rework=" + $e.rework + "; " + $e.obs + " " + $e.notes)
  } | ConvertTo-Json -Depth 6 -Compress
  try {
    Invoke-RestMethod -Uri $url -Method Post -ContentType "application/json; charset=utf-8" -Body ([System.Text.Encoding]::UTF8.GetBytes($body)) | Out-Null
    $ok++
    Write-Host ("OK  {0} {1} {2} {3}" -f $e.id, $e.dateKey, $e.hora, $e.project)
  } catch {
    $fail++
    Write-Host ("FAIL {0}: {1}" -f $e.id, $_.Exception.Message) -ForegroundColor Red
  }
  Start-Sleep -Milliseconds 120
}
Write-Host ("`nHECHO. Insertadas OK: {0}  Fallidas: {1}  Total: {2}" -f $ok, $fail, $entries.Count) -ForegroundColor Green
