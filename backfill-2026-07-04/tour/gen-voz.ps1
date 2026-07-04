# Genera narracion en espanol (8 secciones del tour) via ElevenLabs
$ErrorActionPreference = "Continue"
$key = "sk_87d5a7899d6c489c94232248c4880a0c4fe317adb3701e67"
$voice = "iDEmt5MnqUotdwCIVplo"
$out = "C:\Users\inbou\victor-ia-tracker\backfill-2026-07-04\tour"

$secciones = [ordered]@{
  "voz-01-header" = "Bienvenido al tracker de actividad de Victor IA. Este es el centro de registro de todo el trabajo de la empresa. Aqui registramos cada accion: codigo, disenio, video, reuniones y operaciones, con hora exacta y campos completos. En la barra superior tienes las pestanias principales: Dashboard, Analytics, Entradas, Reportes, CRM y Actividad en Vivo."
  "voz-02-filtros" = "Estos son los filtros y la busqueda. El selector de periodo te deja ver hoy, la semana, el mes o un rango personalizado. El filtro de proyecto aisla por ejemplo Victor IA Tracker o Costa Negra. El de cliente separa el trabajo facturable por cuenta. Categoria distingue entre feature, fix, documentacion o capacitacion. Y estado muestra solo lo completado, en progreso o pendiente. Tambien puedes buscar texto libre en descripciones, observaciones y notas."
  "voz-03-grid" = "Este es el grid principal de entradas. Cada fila es una actividad registrada con su identificador secuencial, la fecha, la hora exacta, la descripcion del trabajo, la categoria, el proyecto, el cliente, el estado, la prioridad, la duracion en horas y las etiquetas. Al hacer clic en una fila se abren los detalles completos, incluyendo observaciones, notas y el software utilizado. Acabamos de cargar ciento sesenta y cinco entradas nuevas que cubren cuatro meses de actividad."
  "voz-04-actividad" = "Esta es la tabla de Actividad en Vivo. Es un espejo de Supabase: cada log que entra por el endpoint api log activity se guarda en la tabla activity log y se refleja aqui en tiempo real. Sirve como respaldo independiente del navegador y como fuente para auditorias."
  "voz-05-analytics" = "Este es el panel de Analytics. Aqui ves el total de horas trabajadas del periodo, los proyectos activos con su porcentaje de dedicacion, y la distribucion por categorias de trabajo. Los indicadores clave se recalculan automaticamente con cada entrada nueva, y puedes hacer clic en cualquier proyecto para aislarlo."
  "voz-06-gestor" = "Asi se gestionan los datos. El boton mas entrada abre el formulario de nueva actividad con todos los campos obligatorios: descripcion, categoria, proyecto, cliente, estado, prioridad, duracion y etiquetas. Cada fila del grid tiene acciones de editar y eliminar. Todo cambio se guarda al instante en el navegador y se sincroniza a la nube."
  "voz-07-sync" = "Sobre la sincronizacion: los datos se replican automaticamente. Primero a Firestore, en el documento tracker, y ademas cada entrada dispara un webhook hacia n8n que la envia a Supabase. Asi el tracker tiene triple respaldo: navegador, Firebase y Supabase."
  "voz-08-settings" = "Por ultimo, la configuracion. Desde aqui se administra la conexion con Firebase, el estado de la sincronizacion y las preferencias de la aplicacion. Con esto termina el tour: ya conoces el registro, los filtros, el grid, la actividad en vivo, los analytics, la gestion de datos y la sincronizacion. Todo listo para seguir registrando cada actividad de Victor IA."
}

$i = 0
foreach ($k in $secciones.Keys) {
  $i++
  $body = @{ text = $secciones[$k]; model_id = "eleven_multilingual_v2"; voice_settings = @{ stability = 0.5; similarity_boost = 0.75 } } | ConvertTo-Json -Depth 4
  $file = Join-Path $out "$k.mp3"
  try {
    Invoke-RestMethod -Uri "https://api.elevenlabs.io/v1/text-to-speech/$voice" -Method Post `
      -Headers @{ "xi-api-key" = $key } -ContentType "application/json; charset=utf-8" `
      -Body ([System.Text.Encoding]::UTF8.GetBytes($body)) -OutFile $file
    Write-Host "OK  $k.mp3"
  } catch {
    Write-Host "FAIL $k : $($_.Exception.Message)"
  }
  Start-Sleep -Milliseconds 400
}
Write-Host "Narracion completa: $i secciones"