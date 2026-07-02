# 🚀 GO LIVE CHECKLIST — Victor IA Content Generation System

## Fase 1: Configuración Base (1 hora)

### ✅ APIs & Credenciales
- [ ] **Higgsfield**
  - [ ] ID y Secret en mano
  - [ ] Agregar a Vercel env: `HIGGSFIELD_ID`, `HIGGSFIELD_SECRET`
  - [ ] Test en `/api/create` (generar imagen de test)

- [ ] **ElevenLabs**
  - [ ] API Key: `sk_87d5a7899d6c489c94232248c4880a0c4fe317adb3701e67`
  - [ ] Voice ID: `iDEmt5MnqUotdwCIVplo`
  - [ ] Agregar a Vercel env: `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID`
  - [ ] Test generar audio de 5 segundos

- [ ] **Supabase**
  - [ ] Project URL en mano
  - [ ] Service Key generada
  - [ ] Agregar a Vercel env: `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`
  - [ ] Tabla `tracker_results` existe:
    ```sql
    CREATE TABLE tracker_results (
      id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
      job_id VARCHAR(100) NOT NULL UNIQUE,
      action VARCHAR(50),
      result_url TEXT,
      result_type VARCHAR(50),
      metadata JSONB,
      status VARCHAR(50) DEFAULT 'processing',
      created_at TIMESTAMP DEFAULT NOW()
    );
    CREATE INDEX idx_job_id ON tracker_results(job_id);
    CREATE INDEX idx_action ON tracker_results(action);
    CREATE INDEX idx_created_at ON tracker_results(created_at DESC);
    ```

- [ ] **N8N**
  - [ ] Webhook base URL confirmada
  - [ ] Agregar a Vercel env: `N8N_WEBHOOK_URL`

### ✅ Frontend Deployments
- [ ] `control-maestro.html` accesible en `/control-maestro.html`
- [ ] `biblioteca.html` accesible en `/biblioteca.html`
- [ ] `config-dashboard.html` accesible en `/config-dashboard.html`
- [ ] Todos los estilos cargan (sin errores 404)

---

## Fase 2: N8N Workflows (1.5 horas)

### ✅ Crear 6 Workflows

**Workflow 1: Generador de Imágenes**
- [ ] Crear nuevo workflow en N8N
- [ ] Trigger: Webhook POST a `/imagen`
- [ ] Steps:
  1. [ ] Validate payload (jobId, prompt)
  2. [ ] Call Higgsfield `/v1/text2image/soul`
  3. [ ] Poll status (max 20 loops, 2s interval)
  4. [ ] Save to Supabase `tracker_results`
  5. [ ] Return webhook response
- [ ] Toggle Active
- [ ] URL del webhook guardada

**Workflow 2: Generador de Videos**
- [ ] Crear nuevo workflow
- [ ] Trigger: Webhook POST a `/video`
- [ ] Steps:
  1. [ ] Validate payload
  2. [ ] Generate base image (Higgsfield text2image)
  3. [ ] Poll image completion
  4. [ ] Call Higgsfield image2video DoP
  5. [ ] Poll video (max 30 loops, 5s interval)
  6. [ ] Save to Supabase
  7. [ ] Return response
- [ ] Toggle Active

**Workflow 3: Voice Over (ElevenLabs)**
- [ ] Crear nuevo workflow
- [ ] Trigger: Webhook POST a `/voice`
- [ ] Steps:
  1. [ ] Validate payload
  2. [ ] Call ElevenLabs TTS API
  3. [ ] Convert to base64 data URL
  4. [ ] Save to Supabase
  5. [ ] Return response
- [ ] Toggle Active

**Workflow 4: Presentaciones (HyperFrames)**
- [ ] Crear nuevo workflow
- [ ] Trigger: Webhook POST a `/presentacion`
- [ ] Steps:
  1. [ ] Parse prompt → slides
  2. [ ] Loop: generar imagen por slide (Higgsfield)
  3. [ ] Compilar HTML con template
  4. [ ] Save HTML a Supabase Storage
  5. [ ] Save metadata a tracker_results
  6. [ ] Return URL
- [ ] Toggle Active

**Workflow 5: Landing Pages (web-4o)**
- [ ] Crear nuevo workflow
- [ ] Trigger: Webhook POST a `/web`
- [ ] Steps:
  1. [ ] Validate payload
  2. [ ] Call web-4o API (o generador custom)
  3. [ ] Generate assets (Higgsfield si needed)
  4. [ ] Compilar proyecto
  5. [ ] Deploy a Vercel (opcional)
  6. [ ] Save URL a Supabase
- [ ] Toggle Active

**Workflow 6: Capacitación (Módulos educativos)**
- [ ] Crear nuevo workflow
- [ ] Trigger: Webhook POST a `/capacitacion`
- [ ] Steps:
  1. [ ] Generar estructura educativa
  2. [ ] Loop: contenido + video + audio
  3. [ ] Compilar HTML interactivo
  4. [ ] Save a Supabase Storage
  5. [ ] Return URL
- [ ] Toggle Active

### ✅ Testing N8N
- [ ] Cada workflow tiene al menos 1 ejecución exitosa
- [ ] Los logs muestran status: "completed"
- [ ] Resultados aparecen en Supabase

---

## Fase 3: Testing End-to-End (1 hora)

### ✅ Test 1: Generar Imagen
1. [ ] Abrir `control-maestro.html`
2. [ ] Click "Generar Imagen" 🖼️
3. [ ] Escribir: "Un atardecer en la playa"
4. [ ] Click "Generar Imagen"
5. [ ] Esperar 45 segundos
6. [ ] Abrir `biblioteca.html`
7. [ ] Filtrar por "Imágenes"
8. [ ] Verificar imagen aparece
9. [ ] Clickear imagen → se abre en Higgsfield CDN
✅ **Criterio de éxito:** Imagen visible, URL válida, timestamp correcto

### ✅ Test 2: Generar Voice
1. [ ] Control Maestro → "Generar Voice Over" 🎤
2. [ ] Escribir: "Bienvenido a Victor IA, la plataforma de IA"
3. [ ] Idioma: Español MX
4. [ ] Tono: Profesional
5. [ ] Click "Generar Audio"
6. [ ] Esperar 5 segundos
7. [ ] Biblioteca → Filtrar "Voice"
8. [ ] Clickear audio → play en navegador
✅ **Criterio de éxito:** Audio reproduce, sin ruido, tono correcto

### ✅ Test 3: Generar Video (opcional, tarda 5-10 min)
1. [ ] Control Maestro → "Generar Video" 🎬
2. [ ] Escribir: "Un paracaidista saltando de un avión"
3. [ ] Duración: 10 segundos
4. [ ] Resolución: 1080p
5. [ ] Click "Generar Video"
6. [ ] Esperar 10 minutos
7. [ ] Biblioteca → Filtrar "Videos"
8. [ ] Video aparece con poster
✅ **Criterio de éxito:** Video procesa sin errores, URL válida

### ✅ Test 4: Queue & Stats
1. [ ] Abrir Control Maestro
2. [ ] Generar 3 imágenes diferentes (rápidamente)
3. [ ] Verificar "Cola de Generación" muestra 3 items
4. [ ] Stats muestran "Hoy: 3"
5. [ ] Después de completar, "Total: X"
✅ **Criterio de éxito:** Cola funciona, stats actualizan automáticamente

### ✅ Test 5: Supabase Monitoring
1. [ ] Supabase Console → SQL Editor
2. [ ] Query:
   ```sql
   SELECT action, COUNT(*) as total, status 
   FROM tracker_results 
   WHERE created_at > NOW() - INTERVAL '1 hour' 
   GROUP BY action, status;
   ```
3. [ ] Verificar registros coincidan con tests anteriores
4. [ ] Status: "completed"
✅ **Criterio de éxito:** BD tiene datos correctos y consistentes

---

## Fase 4: Performance & Monitoring (30 min)

### ✅ Benchmarks
- [ ] **Imagen:** < 60 segundos (total)
- [ ] **Video:** < 15 minutos (total)
- [ ] **Voice:** < 10 segundos (total)
- [ ] **API Response:** < 2 segundos (jobId creado)
- [ ] **N8N Webhook latency:** < 500ms

### ✅ Error Handling
- [ ] Generar prompt vacío → error claro
- [ ] N8N workflow desactivo → reintento visible
- [ ] Supabase service key inválida → error logged
- [ ] Higgsfield quota agotada → error con instrucciones

### ✅ Logs & Alerts
- [ ] N8N: todos los logs se guardan
- [ ] Vercel: Function logs accesibles
- [ ] Supabase: query logs disponibles
- [ ] (Futuro) Alertas Slack cuando falla workflow

---

## Fase 5: Go Live (30 min)

### ✅ Pre-Launch Review
- [ ] [ ] Equipo revisó SETUP-COMPLETE-SYSTEM.md
- [ ] [ ] Todos saben cómo usar Control Maestro
- [ ] [ ] Backup de configuración realizado
- [ ] [ ] Documentation compartida (README, links)

### ✅ Launch
1. [ ] Verificar todos los checklists anteriores: ✅
2. [ ] Ejecutar final QA en config-dashboard.html
3. [ ] Compartir links con equipo:
   - Control Maestro: `https://tracker.victor-ia.xyz/control-maestro.html`
   - Biblioteca: `https://tracker.victor-ia.xyz/biblioteca.html`
   - Config Dashboard: `https://tracker.victor-ia.xyz/config-dashboard.html`
4. [ ] Documentación compartida
5. [ ] Monitoreo activo durante primeras 24h

### ✅ Post-Launch (Primeras 24h)
- [ ] Monitor N8N execution logs cada hora
- [ ] Verificar sin errores en Vercel logs
- [ ] Banco de pruebas completado (mínimo 1 de cada tipo)
- [ ] Performance dentro de benchmarks
- [ ] Ningún usuario reporte issues

---

## 📋 Documentación a Compartir

```markdown
# Victor IA — Content Generation System

## Acceso Rápido
- **Panel de Control:** [control-maestro.html](https://tracker.victor-ia.xyz/control-maestro.html)
- **Galería de Activos:** [biblioteca.html](https://tracker.victor-ia.xyz/biblioteca.html)
- **Config Dashboard:** [config-dashboard.html](https://tracker.victor-ia.xyz/config-dashboard.html)

## Cómo Generar Contenido
1. Abre Control Maestro
2. Selecciona tipo: Imagen | Video | Voice | Presentación | Web | Capacitación
3. Completa el formulario
4. Click "Generar"
5. Espera el tiempo estimado
6. Resultado aparece en Biblioteca

## Tiempos Típicos
- Imagen: 30-45 seg
- Voice: 5-10 seg
- Video: 5-10 min
- Presentación: 2-5 min
- Web: 5-15 min

## Troubleshooting
[Ver SETUP-COMPLETE-SYSTEM.md #troubleshooting]
```

---

## 🎯 Success Criteria

Sistema está **LISTO PARA PRODUCCIÓN** cuando:

✅ Todas las fases completadas  
✅ Cero errores en testing end-to-end  
✅ Performance dentro de benchmarks  
✅ Equipo capacitado en uso  
✅ Monitoreo configurado  
✅ Documentación compartida  
✅ Backup de datos realizado  

---

## 📞 Escalación de Problemas

| Problema | Solución |
|----------|----------|
| Higgsfield error 401 | Verificar HIGGSFIELD_ID/SECRET válidos |
| N8N webhook no responde | Activar workflow en N8N dashboard |
| Imagen no aparece en BD | Verificar Supabase service key + table permissions |
| Video processing timeout | Aumentar timeout en línea 86 de /api/create |
| ElevenLabs 429 (rate limit) | Esperar 60s, upgrade plan si necesario |

---

## 🎉 LISTO PARA PRODUCCIÓN

Una vez completado este checklist, el sistema está 100% operacional y listo para uso en producción.

**Fecha de Go-Live:** [___________]  
**Responsable:** [___________]  
**Revisado por:** [___________]  