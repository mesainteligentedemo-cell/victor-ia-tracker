# N8N Orchestrator — Configuración Integrada

## Overview
Sistema completo de orquestación que conecta Control Maestro → n8n → APIs (Higgsfield, ElevenLabs, web-4o) → Supabase → Biblioteca.

## Flujo Principal

```
User → Control Maestro (control-maestro.html)
  ↓ POST /api/create
  ↓ jobId generado
  → n8n Webhook ({action}/{tipo})
  → Orquestador n8n
  ├─→ [Imagen] Higgsfield text2image
  ├─→ [Video] Higgsfield image2video
  ├─→ [Voice] ElevenLabs TTS
  ├─→ [Presentación] HyperFrames (interno)
  ├─→ [Web] web-4o (interno)
  └─→ Almacenar en Supabase
  → Biblioteca.html (actualiza cada 30s)
```

## Variables de Entorno Requeridas

En Vercel/Hosting:
```env
# Higgsfield
HIGGSFIELD_ID=tu_id
HIGGSFIELD_SECRET=tu_secret

# ElevenLabs
ELEVENLABS_API_KEY=sk_87d5a7899d6c489c94232248c4880a0c4fe317adb3701e67
ELEVENLABS_VOICE_ID=iDEmt5MnqUotdwCIVplo

# Supabase
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# N8N
N8N_WEBHOOK_URL=https://n8n.srv1013903.hstgr.cloud/webhook/c285fc03-6b3a-40be-b605-085e8336d492
```

## Endpoints N8N

### 1. Webhook de Imagen
**URL:** `/webhook/c285fc03-6b3a-40be-b605-085e8336d492/imagen`

**Payload esperado:**
```json
{
  "jobId": "imagen-1719999999999-abc12",
  "type": "imagen",
  "prompt": "Una persona saltando bajo la lluvia",
  "aspect_ratio": "1:1",
  "modelo": "flux-pro",
  "estilo": "realista",
  "cantidad": 1,
  "tipo_seleccionado": "general",
  "ref_images": 0
}
```

**Workflow n8n:**
1. Trigger: Webhook POST
2. Validar payload
3. Loop para cada imagen (cantidad)
4. Call Higgsfield API: POST /v1/text2image/soul
5. Poll hasta completar (45s max)
6. Guardar en Supabase: tabla tracker_results
7. Enviar webhook de notificación (opcional)

---

### 2. Webhook de Video
**URL:** `/webhook/.../video`

**Payload:**
```json
{
  "jobId": "video-1719999999999-def34",
  "type": "video",
  "prompt": "Un paracaidista saltando de un avión",
  "duracion": "10",
  "aspect_ratio": "16:9",
  "resolucion": "1080p",
  "velocidad": "normal",
  "extras": [],
  "tipo_seleccionado": "general",
  "ref_images": 0
}
```

**Workflow n8n:**
1. Trigger: Webhook POST
2. Generar imagen con descripción (Higgsfield text2image)
3. Poll imagen hasta completar
4. Generar video con imagen como base (Higgsfield image2video)
5. Poll video hasta completar (puede tomar 5-10 min)
6. Guardar resultado en Supabase
7. Webhook final de confirmación

---

### 3. Webhook de Voice
**URL:** `/webhook/.../voice`

**Payload:**
```json
{
  "jobId": "voice-1719999999999-ghi56",
  "type": "voice",
  "texto": "Bienvenido a Victor IA",
  "voz": "iDEmt5MnqUotdwCIVplo",
  "idioma": "es-MX",
  "tono": "profesional",
  "acento": "mx",
  "velocidad": 1.0,
  "extras": [],
  "tipo_seleccionado": "vo"
}
```

**Workflow n8n:**
1. Trigger: Webhook POST
2. Validar parámetros
3. Call ElevenLabs TTS API
4. Guardar MP3 en Supabase Storage
5. Actualizar tracker_results con URL
6. Webhook de confirmación

---

### 4. Webhook de Presentación
**URL:** `/webhook/.../presentacion`

**Payload:**
```json
{
  "jobId": "presentacion-1719999999999-jkl78",
  "type": "presentacion",
  "prompt": "Propuesta de Victor IA para cliente X",
  "formato": "16:9",
  "slides": 10,
  "idioma": "es",
  "diseno": "luxury-dark",
  "color_primario": "#FFAA17",
  "extras": [],
  "tipo_seleccionado": "propuesta",
  "ref_assets": 0
}
```

**Workflow n8n:**
1. Trigger: Webhook POST
2. Generar outline con Claude (si no está hecho)
3. Generar cada slide:
   - Contenido con Claude (título, bullets)
   - Imagen con Higgsfield (para slides que la necesitan)
   - HTML con HyperFrames template
4. Compilar HTML completo
5. Guardar en Supabase Storage
6. Actualizar tracker_results

---

### 5. Webhook de Web
**URL:** `/webhook/.../web`

**Payload:**
```json
{
  "jobId": "web-1719999999999-mno90",
  "type": "web",
  "prompt": "Landing page para vender curso de videografía",
  "diseno": "luxury-dark",
  "stack": "nextjs",
  "paginas": "home, about, cursos, contacto",
  "features": ["newsletter", "testimonios", "FAQ"],
  "tipo_seleccionado": "landing",
  "ref_assets": 0
}
```

**Workflow n8n:**
1. Trigger: Webhook POST
2. Generar estructura Next.js con web-4o skill
3. Crear componentes React
4. Generar imágenes necesarias con Higgsfield
5. Compilar proyecto
6. Deploy a Vercel (si auto-deploy habilitado)
7. Guardar URL en Supabase
8. Webhook de confirmación

---

### 6. Webhook de Capacitación
**URL:** `/webhook/.../capacitacion`

**Payload:**
```json
{
  "jobId": "capacitacion-1719999999999-pqr12",
  "type": "capacitacion",
  "prompt": "Módulo de ventas para timeshare",
  "nivel": "intermedio",
  "idioma": "es",
  "duracion": "45min",
  "publico": "vendedores",
  "extras": ["quiz", "certificado"],
  "tipo_seleccionado": "modulo",
  "ref_docs": 0
}
```

**Workflow n8n:**
1. Trigger: Webhook POST
2. Generar contenido (texto, videos, recursos)
3. Crear HTML interactivo
4. Generar video intro (Higgsfield)
5. Generar voice over (ElevenLabs)
6. Compilar módulo completo
7. Guardar en Supabase
8. Actualizar tracker_results

---

## Estructura Supabase

### Tabla: `tracker_results`

```sql
CREATE TABLE tracker_results (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  job_id VARCHAR(100) NOT NULL UNIQUE,
  action VARCHAR(50) NOT NULL,
  result_url TEXT,
  result_type VARCHAR(50),
  metadata JSONB,
  status VARCHAR(50) DEFAULT 'processing',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_job_id ON tracker_results(job_id);
CREATE INDEX idx_action ON tracker_results(action);
CREATE INDEX idx_created_at ON tracker_results(created_at DESC);
CREATE INDEX idx_status ON tracker_results(status);
```

---

## Integración con Control Maestro

1. **Usuario abre:** `control-maestro.html`
2. **Click en acción:** Abre modal con formulario
3. **Submit:** POST /api/create
4. **API responde:** `{ jobId, status: 'queued', action }`
5. **Job agregado a cola** (localStorage)
6. **n8n procesa** en background
7. **Resultado guardado** en Supabase
8. **Biblioteca actualiza** automáticamente (cada 30s)
9. **Usuario ve resultado** en biblioteca.html

---

## Flujo de Errores

Si falla un webhook n8n:
1. Log de error en n8n
2. Reintentos automáticos (3x, exponencial backoff)
3. Si persiste: marca status como "failed" en Supabase
4. Usuario ve "❌ Falló" en cola + biblioteca

---

## URLs Públicas

- **Panel Maestro:** `https://tracker.victor-ia.xyz/control-maestro.html`
- **Biblioteca:** `https://tracker.victor-ia.xyz/biblioteca.html`
- **API Create:** `https://tracker.victor-ia.xyz/api/create`
- **API Biblioteca:** `https://tracker.victor-ia.xyz/api/biblioteca`
- **N8N Webhooks:** `https://n8n.srv1013903.hstgr.cloud/webhook/c285fc03.../[imagen|video|voice|presentacion|web|capacitacion]`

---

## Testing

### Test Manual de Imagen

```bash
curl -X POST https://tracker.victor-ia.xyz/api/create \
  -H "Content-Type: application/json" \
  -d '{
    "action": "imagen",
    "voice_input": "Un atardecer en la playa",
    "config": {
      "imagen-aspect": "landscape",
      "imagen-estilo": "realista",
      "imagen-cantidad": "1"
    },
    "files": []
  }'
```

Respuesta esperada:
```json
{
  "jobId": "imagen-1719999999999-abc12",
  "status": "queued",
  "action": "imagen",
  "message": "Generando 1 imagen(es) con flux-pro"
}
```

---

## Monitoreo

- **Panel de n8n:** https://n8n.srv1013903.hstgr.cloud (ver executions)
- **Logs Vercel:** Deploy logs en consola
- **Supabase Monitoring:** Dashboard de tabla tracker_results
- **Queue en Control Maestro:** Muestra trabajos en progreso

---

## Roadmap Futuro

- [ ] Queue persistente en Supabase (vs localStorage)
- [ ] Webhooks de progreso (% completitud en video)
- [ ] Caché de imágenes/videos similares
- [ ] Batch processing (multi-imagen en 1 job)
- [ ] Webhooks POST a cliente cuando termina job
- [ ] Integración con Stripe (pago por generación)
- [ ] Admin dashboard para manage jobs