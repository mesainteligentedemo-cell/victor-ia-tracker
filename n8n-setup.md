# 🤖 Victor IA — Automatización n8n para Tracker

**Configuración completa de webhooks, alertas y registro automático**

---

## 1. ESTRUCTURA DE AUTOMATIZACIÓN

```
┌─────────────────────────────────────────────────────┐
│              USUARIO INICIA SESIÓN                  │
│           (Abre Claude Code / VSCode)               │
└──────────────────┬──────────────────────────────────┘
                   │
                   ▼
        ┌──────────────────────────┐
        │  N8N WEBHOOK #1          │
        │  "Sesión Iniciada"       │
        │  - ID sesión             │
        │  - Timestamp inicio      │
        │  - Usuario               │
        └────────────┬─────────────┘
                     │
        ┌────────────▼────────────┐
        │  CREAR REGISTRO AUTOMÁTICO    │
        │  - s131 (próximo ID)     │
        │  - Status: "En progreso" │
        │  - Tags: ["sesion-init"] │
        └────────────┬─────────────┘
                     │
        ┌────────────▼──────────────┐
        │  DURANTE LA SESIÓN        │
        │  (Trabajo real)           │
        │  - Detectar cambios       │
        │  - Capturar código/assets │
        │  - Asignar agentes        │
        └────────────┬──────────────┘
                     │
        ┌────────────▼──────────────┐
        │  N8N WEBHOOK #2           │
        │  "Tarea Completada"       │
        │  - Actualizar registro    │
        │  - Agregar tags/agentes   │
        │  - Subir a tracker        │
        └────────────┬──────────────┘
                     │
        ┌────────────▼──────────────┐
        │  N8N WEBHOOK #3           │
        │  "Sesión Finalizada"      │
        │  - Cerrando registro      │
        │  - Generar resumen        │
        │  - Notificación           │
        └──────────────────────────┘
```

---

## 2. WEBHOOKS N8N (3 Flujos Principales)

### 2.1 WEBHOOK #1 — "Sesión Iniciada"

**URL**: `https://n8n.srv1013903.hstgr.cloud/webhook/tracker-session-init`

**Trigger**: Cuando el usuario dice "sesión iniciada" o `/inicio`

**Payload**:
```json
{
  "event": "session_init",
  "timestamp": "2026-06-20T10:30:00Z",
  "user": "pablo@victor-ia.com",
  "session_id": "sess_20260620_103000",
  "project": "Victor IA App",
  "client": "Victor IA",
  "category": "Desarrollo"
}
```

**Acciones en n8n**:
1. Generar ID registro: s131, s132, s133...
2. Crear registro en tracker_live.html con:
   - `id`, `dateKey`, `hora`, `status: "En progreso"`
   - `project`, `client`, `category`
   - `tags: ["sesion-init", "auto"]`
   - `agentes: []` (se llena después)
3. Enviar Telegram a @pablo_victor_ia: "✅ Sesión iniciada — ID: s131"
4. Almacenar session_id en variable para referencia

---

### 2.2 WEBHOOK #2 — "Tarea Completada/Archivo Generado"

**URL**: `https://n8n.srv1013903.hstgr.cloud/webhook/tracker-task-complete`

**Trigger**: Cuando se completa código/asset/tarea

**Payload**:
```json
{
  "event": "task_complete",
  "session_id": "sess_20260620_103000",
  "task_desc": "Crear formulario de contacto Costa Negra",
  "task_type": "feature",
  "duration_minutes": 45,
  "agentes": ["web-4o", "vercel-deploy-perfecto"],
  "files_created": ["ContactForm.tsx", "ContactForm.test.tsx"],
  "git_commit": "feat: Add contact form",
  "status": "completed"
}
```

**Acciones en n8n**:
1. Buscar registro en tracker por session_id
2. Actualizar campos:
   - `desc`: task_desc
   - `dur`: duration_minutes / 60
   - `durSec`: (duration_minutes / 60) * 3600
   - `agentes`: lista de agentes usados
   - `status`: "Completado"
3. Generar tags automáticos:
   - "completado", "feature", "auto"
   - Por proyecto: "costa-negra", etc.
4. Hacer commit al archivo tracker_live.html
5. Enviar notificación Telegram: "✅ Tarea completa: s131 · 45min · 3 archivos"

---

### 2.3 WEBHOOK #3 — "Sesión Finalizada"

**URL**: `https://n8n.srv1013903.hstgr.cloud/webhook/tracker-session-end`

**Trigger**: Cuando el usuario dice "sesión finalizada" o `/fin`

**Payload**:
```json
{
  "event": "session_end",
  "session_id": "sess_20260620_103000",
  "timestamp_end": "2026-06-20T12:30:00Z",
  "total_duration": "2h 0m",
  "tasks_completed": 3,
  "files_generated": 12,
  "commits": 5
}
```

**Acciones en n8n**:
1. Generar resumen de sesión:
   - Total horas: 2.0h
   - Registros creados: 3 (s131, s132, s133)
   - Agentes únicos usados: 5
   - Proyectos tocados: 1
2. Crear entrada final en tracker:
   - `id: s134`, `status: "Completado"`
   - `desc: "Sesión finalizada — 3 tareas, 2h, 5 agentes"`
   - `agentes: ["gerente-ia"]`
3. Subir cambios a GitHub:
   - `git add tracker_live.html`
   - `git commit -m "docs: Sesión completada — 3 tareas"`
   - `git push origin master`
4. Notificación final (Telegram + Email):
   ```
   ✅ SESIÓN COMPLETA
   └─ ID: sess_20260620_103000
   └─ Duración: 2h 0m
   └─ Registros: 3 (s131-s133)
   └─ Agentes: 5 únicos
   └─ Deploy: ✅ GitHub + Vercel
   ```

---

## 3. ALERTAS AUTOMÁTICAS

### 3.1 Alerta: "Falta Agente"

**Trigger**: Si `agentes: []` está vacío por > 5 min

**Acción**:
```
⚠️  ALERTA: Registro s131 sin agentes asignados
    ├─ Descripción: "Crear formulario..."
    ├─ Duración: 45 min
    ├─ Agentes recomendados: ["web-4o", "vercel-deploy"]
    └─ Acción: /asignar-agentes s131 web-4o vercel-deploy
```

**Enviar a**: Telegram + Email

---

### 3.2 Alerta: "Falta Tag"

**Trigger**: Si `tags: []` está vacío por > 3 min

**Acción**:
```
⚠️  ALERTA: Registro s131 sin tags
    ├─ Categoría: "Desarrollo"
    ├─ Proyecto: "Costa Negra"
    ├─ Tags sugeridos: ["dev", "costa-negra", "completado"]
    └─ Acción: Auto-completado (confirmar)
```

---

### 3.3 Alerta: "Sesión Larga"

**Trigger**: Sesión > 4 horas sin break

**Acción**:
```
⏰ ALERTA: Sesión larga detectada
    ├─ Duración: 4h 30m
    ├─ Registros: 6
    ├─ Recomendación: Tomar descanso
    └─ Auto-pausa en 5 min si no hay actividad
```

---

## 4. PROTOCOLO VACIADO TOTAL AUTOMÁTICO

### 4.1 Al Inicio de Sesión

```
AUTOMÁTICO:
├─ Crear registro "Sesión iniciada - {hora}"
├─ Generar ID único (s131, s132, etc.)
├─ Capturar proyecto/cliente actual
├─ Status: "En progreso"
└─ Esperar actividad
```

### 4.2 Durante Sesión

```
AUTOMÁTICO CADA 15 MIN:
├─ Verificar cambios en archivos
├─ Capturar commits de Git
├─ Detectar agentes usados
├─ Actualizar durSec en tiempo real
└─ Mantener registro vivo
```

### 4.3 Al Finalizar Sesión

```
AUTOMÁTICO:
├─ Marcar registro como "Completado"
├─ Calcular duración total
├─ Listar todos los agentes usados
├─ Generar resumen en Telegram
├─ Push a GitHub + Vercel deploy
└─ Cerrar sesión
```

---

## 5. CONFIGURACIÓN PASO A PASO

### Paso 1: Crear Workflows en n8n

**En n8n dashboard**:

```
NEW WORKFLOW → "Victor IA Tracker"
├─ WORKFLOW 1: "Session Init"
│  ├─ Webhook trigger
│  ├─ HTTP request → POST tracker_live.html
│  ├─ Telegram notify
│  └─ Store variables
│
├─ WORKFLOW 2: "Task Complete"
│  ├─ Webhook trigger
│  ├─ Search record by session_id
│  ├─ Update tracker (dur, agentes, tags)
│  ├─ Git commit
│  ├─ Telegram notify
│  └─ Update dashboard
│
└─ WORKFLOW 3: "Session End"
   ├─ Webhook trigger
   ├─ Generate summary
   ├─ Git push
   ├─ Telegram notify
   ├─ Email notify
   └─ Vercel redeploy
```

### Paso 2: Configurar Webhooks

**En cada workflow**:

1. Copiar URL webhook
2. Guardar en `webhook_urls.json`:
   ```json
   {
     "session_init": "https://n8n.srv1013903.hstgr.cloud/webhook/tracker-session-init",
     "task_complete": "https://n8n.srv1013903.hstgr.cloud/webhook/tracker-task-complete",
     "session_end": "https://n8n.srv1013903.hstgr.cloud/webhook/tracker-session-end"
   }
   ```

### Paso 3: Integración con Claude Code

**En CLAUDE.md**:

```markdown
## PROTOCOLO AUTOMATIZACIÓN N8N (ACTIVO)

Cada sesión se registra automáticamente:

1. **Inicio**: POST a webhook #1
   - curl -X POST https://n8n.srv1013903.hstgr.cloud/webhook/tracker-session-init \
     -d '{"user":"pablo","project":"..."}'

2. **Durante**: Webhooks #2 capturan tareas
   - Automático al completar features

3. **Fin**: POST a webhook #3
   - curl -X POST https://n8n.srv1013903.hstgr.cloud/webhook/tracker-session-end \
     -d '{"session_id":"..."}'
```

---

## 6. ALERTAS EN TELEGRAM

**Bot Token**: Almacenado en n8n secrets

**Mensajes**:

```
✅ SESIÓN INICIADA
└─ Proyecto: Costa Negra
└─ Inicio: 10:30 AM
└─ ID: s131

⚙️ TAREA DETECTADA
└─ "Crear formulario de contacto"
└─ Duración: 45 min
└─ Agentes: web-4o, vercel-deploy
└─ Archivos: 3

✅ SESIÓN FINALIZADA
└─ Duración: 2h 0m
└─ Registros: 3 (s131-s133)
└─ Agentes: 5 únicos
└─ Deploy: ✅ GitHub

⚠️  ALERTA: Falta asignar agentes
└─ Registro: s131
└─ Acción: /asignar-agentes s131 web-4o
```

---

## 7. SCRIPTS DE DISPARO MANUAL

**Si el usuario quiere disparar webhooks manualmente**:

```bash
# Inicio de sesión
curl -X POST https://n8n.srv1013903.hstgr.cloud/webhook/tracker-session-init \
  -H "Content-Type: application/json" \
  -d '{
    "user": "pablo",
    "project": "Victor IA App",
    "client": "Victor IA",
    "category": "Desarrollo"
  }'

# Tarea completada
curl -X POST https://n8n.srv1013903.hstgr.cloud/webhook/tracker-task-complete \
  -H "Content-Type: application/json" \
  -d '{
    "session_id": "sess_20260620_103000",
    "task_desc": "Crear formulario de contacto",
    "duration_minutes": 45,
    "agentes": ["web-4o", "vercel-deploy-perfecto"],
    "status": "completed"
  }'

# Fin de sesión
curl -X POST https://n8n.srv1013903.hstgr.cloud/webhook/tracker-session-end \
  -H "Content-Type: application/json" \
  -d '{
    "session_id": "sess_20260620_103000",
    "total_duration": "2h 0m",
    "tasks_completed": 3
  }'
```

---

## 8. INTEGRACIÓN FUTURA

### Phase 1 (Ahora): Webhooks básicos
- ✅ Crear/actualizar registros
- ✅ Notificaciones Telegram
- ✅ Auto push a GitHub

### Phase 2 (Próx. 2 semanas): IA Predictiva
- [ ] Machine Learning: predecir duración de tareas
- [ ] Alertas inteligentes: "Esta tarea va larga"
- [ ] Recomendaciones: "Considera usar agente X"

### Phase 3 (Próx. mes): Dashboard Real-time
- [ ] WebSocket para actualizaciones en vivo
- [ ] Tabla de sesiones activas
- [ ] Analytics por agente, proyecto, cliente

---

## 9. CHECKLIST DE IMPLEMENTACIÓN

- [ ] Crear 3 workflows en n8n
- [ ] Copiar URLs webhook a webhook_urls.json
- [ ] Configurar Telegram bot en n8n secrets
- [ ] Configurar GitHub token en n8n secrets
- [ ] Probar webhook #1 (sesión init)
- [ ] Probar webhook #2 (task complete)
- [ ] Probar webhook #3 (session end)
- [ ] Integrar en CLAUDE.md protocolo
- [ ] Crear botones en tracker para "Iniciar sesión" / "Finalizar"
- [ ] Documentar en memoria

---

**Status**: 🟢 **LISTO PARA IMPLEMENTAR**  
**Próximo paso**: Opción D — Protocolo de Sesiones

---

*Configuración: n8n.srv1013903.hstgr.cloud*  
*Webhooks: 3 flujos automáticos*  
*Alertas: Telegram + Email*  
*Tracking: 100% automático*