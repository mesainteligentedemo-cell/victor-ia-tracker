# N8N Workflows Setup — Guía Paso a Paso

## Requisitos Previos

1. **Cuenta n8n:** https://n8n.srv1013903.hstgr.cloud
2. **APIs configuradas:**
   - Higgsfield ID + Secret
   - ElevenLabs API Key + Voice ID
   - Supabase URL + Service Key
   - Vercel Token (opcional, para auto-deploy)

---

## WORKFLOW 1: Generación de Imágenes

### Paso 1: Crear Workflow
1. Dashboard n8n → **+ Add Workflow**
2. Nombre: `Victor IA — Generador de Imágenes`

### Paso 2: Agregar Trigger (Webhook)
1. **Add first step** → search "Webhook"
2. Seleccionar **Webhook** trigger
3. Configurar:
   - Method: POST
   - Path: `/imagen` (se concatena con base)
   - Authentication: None
   - Click **Save**

### Paso 3: Validar Payload
1. **+ Add step** → **Switch** node
2. Expression: `{{ $json.jobId }}`
3. Routing:
   - Case 1: `exists` (valor existe)
   - Case 2: `not exists` (fallo)

### Paso 4: Generar Imagen (Higgsfield)
1. **+ Add step** → **HTTP Request** node
2. Method: POST
3. URL: `https://platform.higgsfield.ai/v1/text2image/soul`
4. Headers:
   ```
   Authorization: Key {{YOUR_ID}}:{{YOUR_SECRET}}
   Content-Type: application/json
   ```
5. Body (JSON):
   ```json
   {
     "params": {
       "prompt": "{{ $json.prompt }}",
       "width_and_height": "2048x1536",
       "enhance_prompt": true,
       "seed": "{{ $json.seed || Math.random() * 1000000 }}"
     }
   }
   ```
6. Click **Save**

### Paso 5: Extraer Request ID
1. **+ Add step** → **Set node**
2. Assign:
   - `request_id` = `{{ $json.id }}`
   - `job_id` = `{{ $json.jobId }}`
   - `action` = `imagen`
3. Click **Save**

### Paso 6: Poll hasta completar
1. **+ Add step** → **Loop** node
2. Loop config:
   - Type: While
   - Condition: `{{ $node["HTTP Request"].json.status !== 'completed' }}`
   - Max iterations: 20

3. Dentro del loop:
   - **HTTP Request** → Higgsfield status check
   - URL: `https://platform.higgsfield.ai/v1/job-sets/{{ $node["Set"].json.request_id }}`
   - Method: GET
   - Headers: mismo Authorization
   - Add delay: 2 segundos

4. Click **Save**

### Paso 7: Guardar en Supabase
1. **+ Add step** → **Postgres** (o usar HTTP para Supabase REST API)
2. Si usas HTTP:
   - Method: POST
   - URL: `{{ $node["Set"].json.supabase_url }}/rest/v1/tracker_results`
   - Headers:
     ```
     apikey: {{ $node["Set"].json.supabase_key }}
     Authorization: Bearer {{ $node["Set"].json.supabase_key }}
     Content-Type: application/json
     ```
   - Body:
     ```json
     {
       "job_id": "{{ $node["Set"].json.job_id }}",
       "action": "{{ $node["Set"].json.action }}",
       "result_url": "{{ $node["Loop"].json.results[0].raw.url }}",
       "result_type": "image",
       "status": "completed",
       "metadata": {
         "prompt": "{{ $json.prompt }}",
         "aspect_ratio": "2048x1536",
         "style": "{{ $json.estilo }}"
       }
     }
     ```

### Paso 8: Webhook Respuesta
1. **+ Add step** → **Webhook** (response)
2. Body:
   ```json
   {
     "ok": true,
     "jobId": "{{ $node["Set"].json.job_id }}",
     "status": "completed",
     "url": "{{ $node["Postgres"].json.result_url }}"
   }
   ```

### Paso 9: Guardar & Activar
1. Click **Save** (arriba)
2. Toggle **Active** para activar workflow
3. Copiar URL del webhook:
   ```
   https://n8n.srv1013903.hstgr.cloud/webhook/c285fc03-6b3a-40be-b605-085e8336d492/imagen
   ```

---

## WORKFLOW 2: Generación de Videos

### Paso 1-3: Mismo que Workflow 1
(Webhook + Validation)

### Paso 4: Generar Imagen Base
1. **HTTP Request** → text2image (igual a Workflow 1)
2. Poll hasta completar

### Paso 5: Generar Video
1. **HTTP Request** → POST `/v1/image2video/dop`
2. URL: `https://platform.higgsfield.ai/v1/image2video/dop`
3. Body:
   ```json
   {
     "params": {
       "prompt": "{{ $json.prompt }}",
       "model": "{{ $json.duracion >= 8 ? 'dop-preview' : 'dop-turbo' }}",
       "enhance_prompt": true,
       "seed": "{{ Math.random() * 1000000 }}",
       "input_images": [
         {
           "type": "image_url",
           "image_url": "{{ $node["Poll Image"].json.results[0].raw.url }}"
         }
       ],
       "check_nsfw": true
     }
   }
   ```

### Paso 6: Poll Video (más tiempo)
1. **Loop** con max 30 iteraciones
2. Interval: 5 segundos (videos toman más)
3. Timeout total: 2.5 minutos

### Paso 7-9: Guardar en Supabase + Respuesta

---

## WORKFLOW 3: Generación de Voice Over

### Paso 1-3: Webhook + Validation

### Paso 4: ElevenLabs TTS
1. **HTTP Request** → ElevenLabs API
2. Method: POST
3. URL: `https://api.elevenlabs.io/v1/text-to-speech/{{ $json.voz }}`
4. Headers:
   ```
   xi-api-key: {{ YOUR_ELEVENLABS_KEY }}
   Content-Type: application/json
   Accept: audio/mpeg
   ```
5. Body:
   ```json
   {
     "text": "{{ $json.texto }}",
     "model_id": "eleven_multilingual_v2",
     "voice_settings": {
       "stability": 0.5,
       "similarity_boost": 0.85,
       "style": 0.2,
       "use_speaker_boost": true
     }
   }
   ```

### Paso 5: Convertir Binario a Base64
1. **Function** node:
   ```javascript
   const buf = Buffer.from($json.data, 'binary');
   return { dataUrl: `data:audio/mpeg;base64,${buf.toString('base64')}` };
   ```

### Paso 6: Guardar en Supabase
1. **HTTP Request** → Supabase REST
2. Misma config que Workflow 1
3. Body:
   ```json
   {
     "job_id": "{{ $json.jobId }}",
     "action": "voice",
     "result_url": "{{ $node["Function"].json.dataUrl }}",
     "result_type": "audio/mpeg",
     "status": "completed",
     "metadata": {
       "idioma": "{{ $json.idioma }}",
       "tono": "{{ $json.tono }}",
       "voz": "{{ $json.voz }}"
     }
   }
   ```

### Paso 7-8: Respuesta

---

## WORKFLOW 4: Presentaciones (HyperFrames)

### Paso 1-3: Webhook + Validation

### Paso 4: Generar Contenido
1. **Function** node: Parse prompt → slides array
   ```javascript
   const prompt = $json.prompt;
   const slides = $json.slides || 10;
   
   return {
     title: prompt.split('—')[0]?.trim() || prompt.slice(0, 30),
     subtitle: prompt.split('—')[1]?.trim() || '',
     slides: Array.from({ length: slides }, (_, i) => ({
       num: i + 1,
       title: `Slide ${i + 1}`,
       content: `Content for slide ${i + 1}`
     }))
   };
   ```

### Paso 5: Generar Imágenes (Loop)
1. **Loop** sobre cada slide que necesita imagen
2. **HTTP Request** → Higgsfield text2image
3. URL: `https://platform.higgsfield.ai/v1/text2image/soul`

### Paso 6: Compilar HTML
1. **Function** node: Genera HTML con template
   ```javascript
   const slides = $json.slides;
   const design = $json.diseno;
   
   let html = `
     <!DOCTYPE html>
     <html>
     <head>
       <style>
         body { background: #070809; color: #F8F7F5; font-family: Space Grotesk; }
         .slide { page-break-after: always; padding: 60px; height: 100vh; }
         .slide h1 { font-size: 48px; margin-bottom: 30px; }
       </style>
     </head>
     <body>
   `;
   
   slides.forEach(slide => {
     html += `
       <div class="slide">
         <h1>${slide.title}</h1>
         <p>${slide.content}</p>
       </div>
     `;
   });
   
   html += `</body></html>`;
   return { html, slides: slides.length };
   ```

### Paso 7: Guardar HTML
1. **HTTP Request** → Supabase Storage
2. Bucket: `presentations`
3. File: `${jobId}.html`

### Paso 8: Guardar metadata en DB
1. **HTTP Request** → Supabase tracker_results
2. result_url apunta al HTML en Storage

### Paso 9: Respuesta

---

## WORKFLOW 5: Landing Pages (web-4o)

### Paso 1-3: Webhook + Validation

### Paso 4: Generar con web-4o Skill
1. **HTTP Request** → tu API que ejecuta web-4o
   ```
   POST /api/web-4o
   Body: { prompt, design, stack, features }
   ```

### Paso 5: Generar Imágenes (si necesario)
1. **Loop** sobre cada asset requerido
2. **HTTP Request** → Higgsfield

### Paso 6: Compilar Proyecto Next.js
1. **Webhook** de respuesta → código generado
2. O guardar en carpeta

### Paso 7: Deploy a Vercel (opcional)
1. **HTTP Request** → Vercel API
2. POST `/v13/deployments`
3. Headers: `Authorization: Bearer YOUR_VERCEL_TOKEN`

### Paso 8: Guardar URL en Supabase
1. **HTTP Request** → tracker_results
2. result_url = URL de Vercel deployment

---

## WORKFLOW 6: Capacitación (módulos educativos)

### Similar a Presentaciones
1. Generar outline educativo
2. Loop sobre cada sección
3. Generar videos (Higgsfield)
4. Generar voice overs (ElevenLabs)
5. Compilar HTML interactivo
6. Guardar en Supabase

---

## Verificación Post-Setup

1. **Activar todos los workflows**
2. **Test each endpoint:**
   ```bash
   curl -X POST https://n8n.srv1013903.hstgr.cloud/webhook/.../imagen \
     -H "Content-Type: application/json" \
     -d '{
       "jobId": "test-123",
       "prompt": "Un gato naranja",
       "seed": 42
     }'
   ```

3. **Verificar en Supabase:**
   - Query: `SELECT * FROM tracker_results ORDER BY created_at DESC LIMIT 5;`
   - Ver resultado_url no vacía

4. **Verificar en Biblioteca:**
   - Open: `https://tracker.victor-ia.xyz/biblioteca.html`
   - Filtra por "imagen"
   - Debe aparecer nueva entrada con imagen

---

## Troubleshooting

### Webhook no responde
- [ ] Verificar URL correcta en n8n
- [ ] Verificar method POST habilitado
- [ ] Revisar n8n execution logs

### Higgsfield falla
- [ ] Verificar ID + Secret en headers
- [ ] Verificar prompt no vacío
- [ ] Revisar status HTTP response

### Supabase no guarda
- [ ] Verificar table `tracker_results` existe
- [ ] Verificar SERVICE_KEY tiene permisos
- [ ] Revisar columnas match con payload

### ElevenLabs falla
- [ ] Verificar API Key válida
- [ ] Verificar Voice ID existe
- [ ] Revisar cuota de API no agotada

---

## URLs de Referencia

- **N8N Dashboard:** https://n8n.srv1013903.hstgr.cloud
- **Higgsfield API Docs:** https://platform.higgsfield.ai/api-docs
- **ElevenLabs API Docs:** https://elevenlabs.io/docs/api-reference
- **Supabase REST API:** https://supabase.com/docs/reference/rest
- **Control Maestro:** https://tracker.victor-ia.xyz/control-maestro.html
- **Biblioteca:** https://tracker.victor-ia.xyz/biblioteca.html
