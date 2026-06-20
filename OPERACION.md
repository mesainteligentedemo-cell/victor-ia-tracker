# OPERACION.md — Guía de Operación 24/7
## Victor IA Tracker — Sistema de Seguimiento Interno

> Versión: 1.1.0 | Última actualización: 2026-06-20 | Responsable: Pablo (Victor IA)

---

## 1. Resumen del Sistema

**Victor IA Tracker** es el panel de control interno de la operación. Registra todo el trabajo real: sesiones de código, chats productivos, diseño, video, automatización, reuniones con clientes. Es la fuente de verdad sobre cómo se usa el tiempo.

**Arquitectura en una línea:** Un archivo HTML autocontenido (`tracker_live.html`) embebe el array de datos `SEED` con todas las entradas. El dashboard (`dashboard.html`) lee esos datos para visualizarlos. El sistema no necesita servidor para operar — funciona abriendo el HTML directo en el browser.

### Archivos críticos

| Archivo | Ruta absoluta | Descripción |
|---|---|---|
| App principal | `C:\Users\inbou\victor-ia-tracker\tracker_live.html` | Contiene el array SEED — toda la data vive aquí |
| Fuente de verdad (.agents) | `C:\Users\inbou\.agents\tracker_live.html` | Copia primaria — editar aquí, copiar al tracker |
| Dashboard analytics | `C:\Users\inbou\victor-ia-tracker\dashboard.html` | Visualizaciones Chart.js |
| Index / Landing | `C:\Users\inbou\victor-ia-tracker\index.html` | Entrada principal (1MB, incluye todo el sistema) |
| Login | `C:\Users\inbou\victor-ia-tracker\login.html` | Auth guard |
| API server | `C:\Users\inbou\victor-ia-tracker\api-endpoints.js` | Express server para endpoints |
| Tests | `C:\Users\inbou\victor-ia-tracker\tests.js` | Suite de pruebas |
| Backups Firestore | `C:\Users\inbou\victor-ia-tracker\firestore-backups\` | Backups JSON generados por migración |

### URLs del sistema

- **Producción:** `tracker.victor-ia.xyz` (vía Vercel)
- **Vercel:** `victor-ia-tracker.vercel.app`
- **Local dev:** `http://localhost:8000` (via `npm run dev` o `npm start`)

---

## 2. Monitoreo Diario — Qué Revisar

Tiempo estimado: **5 minutos**. Hacer cada mañana antes de iniciar trabajo.

### 1. Verificar entradas del día anterior
Abrir `C:\Users\inbou\victor-ia-tracker\tracker_live.html` en el browser. Buscar registros con `dateKey` del día anterior. Si hubo trabajo real y no hay registros → agregar ahora (ver Sección 5).

### 2. Verificar que el dashboard carga
Abrir `C:\Users\inbou\victor-ia-tracker\dashboard.html`. Si las gráficas aparecen, todo bien. Si no → ver Sección 6, "Gráficas no aparecen".

### 3. Verificar backups
Revisar que `C:\Users\inbou\victor-ia-tracker\firestore-backups\` tiene al menos el último backup. Si el sistema de backup automático no está configurado, hacer backup manual copiando `tracker_live.html` con fecha:

```powershell
$date = Get-Date -Format "yyyy-MM-dd"
Copy-Item "C:\Users\inbou\.agents\tracker_live.html" "C:\Users\inbou\victor-ia-tracker\firestore-backups\tracker-backup-$date.html"
```

### 4. Verificar ID secuencial más reciente
En el archivo `C:\Users\inbou\.agents\tracker_live.html`, buscar el último `id:'s###'` para saber qué número usar en la próxima entrada. Al 2026-06-20, el último ID conocido es **s145**. Los nuevos registros deben ser s146, s147, etc.

### 5. Verificar GitHub
```powershell
cd C:\Users\inbou\victor-ia-tracker
git status
git log --oneline -5
```
Si hay cambios sin commitear y son importantes → hacer commit.

---

## 3. Checklist Diario

Completar cada mañana (menos de 5 min):

- [ ] Backup confirmado en `firestore-backups\` (o creado manualmente)
- [ ] Dashboard `dashboard.html` carga sin errores de consola
- [ ] Entradas del día anterior registradas en SEED
- [ ] IDs secuenciales — el último ID registrado es `s[número]`
- [ ] `tracker_live.html` abre en browser sin pantalla en blanco
- [ ] `C:\Users\inbou\.agents\tracker_live.html` está sincronizado con la versión del tracker

---

## 4. Checklist Semanal

Completar cada lunes (menos de 15 min):

- [ ] Ejecutar suite de tests: `npm test` — 0 errores
- [ ] Revisar tendencias en `dashboard.html` (semana vs semana anterior)
- [ ] Verificar que `tracker.victor-ia.xyz` responde (abrir en browser)
- [ ] Verificar que GitHub está actualizado: `git log --oneline -10` y `git push` si hay commits locales
- [ ] Limpiar backups en `firestore-backups\` si hay más de 30 archivos — conservar los últimos 30
- [ ] Revisar que los últimos 5 registros del SEED tienen todos los campos obligatorios correctos
- [ ] Verificar que `C:\Users\inbou\.agents\tracker_live.html` es la versión más reciente

```powershell
# Limpieza de backups viejos (conservar los últimos 30)
$backups = Get-ChildItem "C:\Users\inbou\victor-ia-tracker\firestore-backups\tracker-backup-*.html" | Sort-Object LastWriteTime
if ($backups.Count -gt 30) {
    $toDelete = $backups | Select-Object -First ($backups.Count - 30)
    $toDelete | Remove-Item -Confirm:$false
    Write-Host "Eliminados $($toDelete.Count) backups viejos"
}
```

---

## 5. Agregar una Entrada Nueva — Guía Paso a Paso

### Dónde editar
La **fuente de verdad** es `C:\Users\inbou\.agents\tracker_live.html`. Editar ahí, luego copiar al tracker del proyecto.

### Paso 1: Encontrar el último ID

Buscar en el archivo `id:'s` para encontrar el último número secuencial usado:

```powershell
Select-String -Path "C:\Users\inbou\.agents\tracker_live.html" -Pattern "id:'s\d+'" | Select-Object -Last 5
```

Si el último es `s145`, el nuevo será `s146`.

### Paso 2: Encontrar dónde insertar

Buscar el cierre del array SEED. En el archivo, ir al final y buscar:

```
];
```

Insertar el nuevo objeto **justo antes** de ese `];`, después de la coma del objeto anterior.

### Paso 3: Copiar esta plantilla y rellenar

```javascript
{
  id: 's146',
  dateKey: '2026-06-20',
  hora: '10:30',
  desc: 'Descripción exacta de lo que se hizo — ser específico',
  cat: 'Código',
  project: 'Victor IA Website',
  client: 'Victor IA',
  status: 'Completado',
  priority: 'Media',
  dur: 1.5,
  durSec: 5400,
  tags: ['feature', 'tracker'],
  rework: 0,
  obs: '',
  notes: 'Notas adicionales si aplica',
  sw: ['claude', 'vs code'],
  agentes: ['agente-maestro']
},
```

### Campos obligatorios vs opcionales

| Campo | Obligatorio | Valores posibles | Notas |
|---|---|---|---|
| `id` | Si | `'s001'` a `'s999'` | Secuencial, sin saltar |
| `dateKey` | Si | `'YYYY-MM-DD'` | Fecha del trabajo real |
| `hora` | Si | `'HH:MM'` | 24h, hora de inicio |
| `desc` | Si | string | Descripción concreta, no genérica |
| `cat` | Si | Ver lista abajo | Categoría de actividad |
| `project` | Si | string | Nombre del proyecto exacto |
| `client` | Si | string | Cliente o "Victor IA" si es interno |
| `status` | Si | `'Completado'`, `'En progreso'`, `'Pausado'` | Estado real |
| `priority` | Si | `'Alta'`, `'Media'`, `'Baja'` | Prioridad del trabajo |
| `dur` | Si | número decimal | Duración en horas (ej: `1.5` = 1h 30min) |
| `durSec` | Si | número entero | `dur * 3600` — calcular siempre así |
| `tags` | No | array de strings | Etiquetas libres |
| `rework` | No | `0` o `1` | 1 si fue trabajo de corrección/retrabajo |
| `obs` | No | string | Observaciones |
| `notes` | No | string | Notas detalladas |
| `sw` | No | array de strings | Software usado |
| `agentes` | No | array de strings | Agentes IA usados |

### Categorías disponibles (`cat`)

```
'Código'          → Desarrollo, programación
'Diseño'          → UI/UX, brandbook, visual
'Video'           → Producción de video, edición
'Investigación'   → Research, análisis
'Reunión'         → Calls, juntas con clientes
'Automatización'  → n8n, scripts, pipelines
'Marketing'       → Copy, SEO, contenido
'Administración'  → Finanzas, operación interna
'Propuesta'       → Decks, cotizaciones
'Tracking'        → Registro de actividad (meta)
```

### Cómo calcular durSec

```
dur = 1.5 horas   →   durSec = 1.5 * 3600 = 5400
dur = 0.5 horas   →   durSec = 0.5 * 3600 = 1800
dur = 2.0 horas   →   durSec = 2.0 * 3600 = 7200
dur = 0.25 horas  →   durSec = 0.25 * 3600 = 900
```

### Ejemplo de entrada bien formada (real del sistema)

```javascript
{
  id: 's001',
  dateKey: '2026-05-15',
  hora: '09:00',
  desc: 'Análisis de arquitectura',
  cat: 'Investigación',
  project: 'Propuesta Aldo',
  client: 'VTC (capacitación)',
  status: 'Completado',
  priority: 'Alta',
  dur: 0.8,
  durSec: 2880,
  tags: ['done', 'propuesta-aldo', 'urgent'],
  rework: 0,
  obs: '',
  notes: '',
  sw: ['google drive', 'claude'],
  agentes: ['agente-maestro', 'auditor-ia']
},
```

### Paso 4: Sincronizar archivos

Después de editar `.agents\tracker_live.html`, copiar al proyecto:

```powershell
Copy-Item "C:\Users\inbou\.agents\tracker_live.html" "C:\Users\inbou\victor-ia-tracker\tracker_live.html"
```

---

## 6. Resolver Problemas Comunes

### Problema: El tracker no carga (pantalla en blanco)

**Causas frecuentes:**
- El array SEED tiene un objeto mal formado (coma faltante, comilla sin cerrar, llave desbalanceada)
- Error de JavaScript bloqueante

**Diagnóstico:**
1. Abrir `tracker_live.html` en Chrome/Edge
2. Presionar `F12` → pestaña **Console**
3. Leer el error exacto — normalmente dice `Unexpected token` con número de línea
4. Ir a esa línea en el archivo con un editor de texto

**Solución rápida:**
```powershell
# Buscar el último objeto del SEED para verificar que tiene coma al final
$content = Get-Content "C:\Users\inbou\.agents\tracker_live.html" -Raw
$lastId = [regex]::Matches($content, "id:'s\d+'") | Select-Object -Last 1
Write-Host "Ultimo ID encontrado: $($lastId.Value)"
```

**Señales de objeto mal formado:**
- Falta `,` después del `}` del penúltimo objeto
- String con apóstrofe sin escapar: `'O'Reilly'` (rompe el parser) → usar `"O'Reilly"`
- Array sin cerrar: `tags: ['done', 'feat'` (falta el `]`)

---

### Problema: Gráficas no aparecen en dashboard.html

**Causas:**
- Sin conexión a internet (Chart.js se carga desde CDN)
- Caché corrupta del browser
- Error de JavaScript en la página

**Solución:**
1. Verificar conexión a internet
2. Limpiar caché: `Ctrl + Shift + R` (hard reload)
3. Abrir `F12` → Console → ver errores específicos
4. Si el error es `Chart is not defined` → sin internet. Descargar Chart.js localmente como alternativa

---

### Problema: Backup falla o no existe carpeta

**Verificar carpeta:**
```powershell
Test-Path "C:\Users\inbou\victor-ia-tracker\firestore-backups"
# Si retorna False:
New-Item -ItemType Directory "C:\Users\inbou\victor-ia-tracker\firestore-backups"
```

**Backup manual inmediato:**
```powershell
$date = Get-Date -Format "yyyy-MM-dd_HHmm"
Copy-Item "C:\Users\inbou\.agents\tracker_live.html" `
  "C:\Users\inbou\victor-ia-tracker\firestore-backups\tracker-backup-$date.html"
Write-Host "Backup creado: tracker-backup-$date.html"
```

**Verificar Python instalado:**
```powershell
python --version
# Si no está instalado: winget install Python.Python.3
```

---

### Problema: Hay IDs duplicados o saltados

**Detectar duplicados:**
```powershell
$content = Get-Content "C:\Users\inbou\.agents\tracker_live.html" -Raw
$ids = [regex]::Matches($content, "id:'(s\d+)'") | ForEach-Object { $_.Groups[1].Value }
$duplicates = $ids | Group-Object | Where-Object { $_.Count -gt 1 }
if ($duplicates) {
    Write-Host "IDs duplicados encontrados:"
    $duplicates | ForEach-Object { Write-Host "  $($_.Name) — $($_.Count) veces" }
} else {
    Write-Host "Sin duplicados. Total entradas: $($ids.Count)"
}
```

**Solución:** Renumerar manualmente el objeto duplicado con el siguiente ID disponible.

---

### Problema: Dashboard muestra datos desactualizados

El archivo `dashboard.html` tiene su propio conjunto de datos en `const trackerData`. **No se sincroniza automáticamente** con `tracker_live.html`.

**Para actualizar:**
1. Abrir `C:\Users\inbou\victor-ia-tracker\dashboard.html` en editor de texto
2. Buscar `const trackerData` o `const kpiData`
3. Actualizar los valores manualmente con los datos reales del SEED
4. Guardar y recargar el browser

---

### Problema: El sitio en `tracker.victor-ia.xyz` no responde

1. Verificar el estado en [vercel.com/dashboard](https://vercel.com/dashboard)
2. Forzar redeploy si es necesario:
```powershell
cd C:\Users\inbou\victor-ia-tracker
git commit --allow-empty -m "fix: force redeploy"
git push
```
3. Si el problema persiste → revisar `vercel.json` y logs en el dashboard de Vercel

---

### Problema: Error al ejecutar `npm test`

```powershell
cd C:\Users\inbou\victor-ia-tracker
npm install   # reinstalar dependencias
npm test      # reintentar
```

Si falla con error de módulos ES:
```powershell
node --version  # Verificar que es Node 18+ (requerido por "type": "module")
```

---

## 7. Estructura de Archivos (Rutas Absolutas)

```
C:\Users\inbou\victor-ia-tracker\
├── tracker_live.html          → App principal · SEED array aquí (160+ entradas)
├── dashboard.html             → Dashboard analytics con Chart.js
├── index.html                 → Landing principal (1MB — sistema completo)
├── login.html                 → Auth guard (Firebase)
├── signup.html                → Registro de usuarios
├── admin-dashboard.html       → Panel de administración
├── harness.html               → Vista del harness de orquestación
├── organigrama.html           → Organigrama Victor IA
├── api-endpoints.js           → Express server (51 endpoints)
├── auth-firebase.js           → Módulo de autenticación
├── db-client.js               → Cliente de base de datos
├── tests.js                   → Suite de pruebas (npm test)
├── package.json               → Config Node.js v1.1.0
├── vercel.json                → Config de deploy Vercel
├── .env.local                 → Variables de entorno (NO commitear)
├── firestore-backups\         → Backups JSON y HTML
│   ├── tracker-backup-*.html  → Backups del tracker_live
│   └── migration-report-*.json → Reportes de migración
├── .github\                   → Config CI/CD
└── node_modules\              → Dependencias (no tocar)

C:\Users\inbou\.agents\
└── tracker_live.html          → FUENTE DE VERDAD (editar aqui primero)
```

---

## 8. Comandos de Referencia Rápida

```powershell
# --- DESARROLLO LOCAL ---

# Servidor local (Python, más simple)
cd C:\Users\inbou\victor-ia-tracker
python -m http.server 8000
# Abrir: http://localhost:8000/tracker_live.html

# Servidor local (Node, con CORS)
npm start
# Abrir: http://localhost:8000

# API server (Express, para endpoints)
npm run analytics
# Corre en: http://localhost:3000/api

# --- TESTING ---

# Ejecutar suite de pruebas
npm test

# Verificar y lintear
npm run verify

# Recolectar datos en vivo (GSC, etc.)
npm run collect

# --- GIT / DEPLOY ---

# Ver estado de cambios
git status
git log --oneline -10

# Commit y push (trigger deploy automático en Vercel)
git add tracker_live.html dashboard.html
git commit -m "feat: registros sesion 2026-06-20"
git push

# Forzar redeploy sin cambios
git commit --allow-empty -m "fix: force redeploy"
git push

# --- BACKUP MANUAL ---

# Backup con fecha y hora
$date = Get-Date -Format "yyyy-MM-dd_HHmm"
Copy-Item "C:\Users\inbou\.agents\tracker_live.html" `
  "C:\Users\inbou\victor-ia-tracker\firestore-backups\tracker-backup-$date.html"

# Listar backups existentes (más recientes primero)
Get-ChildItem "C:\Users\inbou\victor-ia-tracker\firestore-backups\tracker-backup-*.html" |
  Sort-Object LastWriteTime -Descending |
  Select-Object Name, LastWriteTime, Length

# Restaurar backup específico (reemplaza el tracker_live actual)
# PRECAUCIÓN: hacer backup del actual primero
Copy-Item "C:\Users\inbou\victor-ia-tracker\firestore-backups\tracker-backup-2026-06-20_1030.html" `
  "C:\Users\inbou\.agents\tracker_live.html"

# --- SINCRONIZAR .agents ↔ tracker ---

# Copiar de .agents al proyecto
Copy-Item "C:\Users\inbou\.agents\tracker_live.html" `
  "C:\Users\inbou\victor-ia-tracker\tracker_live.html"

# Copiar de proyecto a .agents (si se editó en el proyecto)
Copy-Item "C:\Users\inbou\victor-ia-tracker\tracker_live.html" `
  "C:\Users\inbou\.agents\tracker_live.html"

# --- DIAGNÓSTICO ---

# Contar entradas en SEED
Select-String -Path "C:\Users\inbou\.agents\tracker_live.html" -Pattern "id:'s\d+'" |
  Measure-Object | Select-Object Count

# Ver último ID registrado
Select-String -Path "C:\Users\inbou\.agents\tracker_live.html" -Pattern "id:'s\d+'" |
  Select-Object -Last 3

# Verificar integridad básica del JSON/JS (sin errores de sintaxis)
node -e "
const fs = require('fs');
const content = fs.readFileSync('tracker_live.html', 'utf8');
const match = content.match(/const SEED\s*=\s*(\[[\s\S]*?\]);/);
if (match) { eval('const d = ' + match[1]); console.log('OK — entradas:', d.length); }
else { console.log('ERROR: SEED no encontrado'); }
" 2>&1

# Limpiar backups viejos (conservar últimos 30)
$backups = Get-ChildItem "C:\Users\inbou\victor-ia-tracker\firestore-backups\tracker-backup-*.html" |
  Sort-Object LastWriteTime
if ($backups.Count -gt 30) {
    $toDelete = $backups | Select-Object -First ($backups.Count - 30)
    $toDelete | Remove-Item -Confirm:$false
    Write-Host "Eliminados $($toDelete.Count) backups"
}
```

---

## 9. Estado del Sistema al 2026-06-20

| Componente | Estado | Notas |
|---|---|---|
| SEED array | Operativo | 160 entradas · último ID: s145 |
| tracker_live.html | Operativo | 14,086 líneas |
| dashboard.html | Operativo | Chart.js requiere internet |
| index.html | Operativo | 1MB — sistema completo embebido |
| Login/Auth | Operativo | Firebase Auth + localStorage guard |
| API server | Manual | `npm run analytics` para iniciar |
| Deploy Vercel | Operativo | tracker.victor-ia.xyz |
| Backups automáticos | Manual | Hacer backup manual antes de cambios grandes |
| health-check.py | No existe | Pendiente crear |
| validator.py | No existe | Usar el snippet de node en Sección 8 mientras tanto |
| auto-backup.py | No existe | Usar comando PowerShell de Sección 8 |

---

## 10. Contacto y Soporte

| Campo | Valor |
|---|---|
| Responsable | Pablo — Victor IA |
| Email | mesainteligentedemo@gmail.com |
| Dominio tracker | tracker.victor-ia.xyz |
| Vercel dashboard | vercel.com/dashboard |
| Soporte técnico avanzado | Claude Code (Anthropic) — abrir sesión nueva y describir el problema con el mensaje de error exacto |
| GitHub | Revisar `.github/` para workflows CI/CD |

---

> Este documento describe el sistema tal como existe al 2026-06-20. Si se agregan scripts (health-check.py, validator.py, auto-backup.py), actualizar la Sección 8 con los comandos exactos.
