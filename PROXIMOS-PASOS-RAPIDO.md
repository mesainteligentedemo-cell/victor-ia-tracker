# 🚀 PRÓXIMOS PASOS — Victor IA Sistema Listo para Setup Final

**Estado:** Todos los archivos creados ✅ | Setup parcial automatizado ✅  
**Tiempo restante:** ~45 minutos  
**Dificultad:** Fácil (solo copiar/pegar)

---

## 📋 RESUMEN DE LO COMPLETADO

✅ **Capa 1: Interfaces** (control-maestro.html, biblioteca.html, config-dashboard.html)  
✅ **Capa 2: APIs** (/api/create.js, /api/biblioteca.js, helpers)  
✅ **Capa 3: Documentación** (5 guías completas)  
✅ **Capa 4: Scripts de Setup** (automatizado, testing)  
✅ **Capa 5: Workflows N8N** (JSONs listos para importar)  

⏳ **Pendiente:** Configurar en Supabase, Vercel, N8N (15-30 min cada uno)

---

## 🎯 PASO 1: SUPABASE (10 minutos)

### 1.1 Ir a Supabase
```
https://app.supabase.com
→ Selecciona tu proyecto
→ SQL Editor (izquierda)
→ New Query
```

### 1.2 Copiar y ejecutar SQL
```
Archivo: SUPABASE-SETUP.sql (en esta carpeta)
1. Abre SUPABASE-SETUP.sql
2. Copia TODO el contenido
3. En Supabase SQL Editor → pega
4. Click "RUN" (arriba)
5. Espera a que aparezca "✓"
```

**Resultado esperado:**
```
✓ Table created
✓ Indexes created
✓ RLS policies created
```

✅ **VERIFICACIÓN:**
- Supabase → Table Editor → tracker_results
- Deberías ver tabla vacía con columnas correctas

---

## 🎯 PASO 2: VERCEL (10 minutos)

### 2.1 Ir a Vercel
```
https://vercel.com
→ Projects → victor-ia-tracker
→ Settings (pestaña)
→ Environment Variables
```

### 2.2 Agregar variables
**Archivo:** `.env.example` (en esta carpeta)

Para CADA línea en .env.example:
1. Click "Add New" (botón azul)
2. Name: `HIGGSFIELD_ID`
3. Value: `[tu valor aquí]`
4. Click "Save"

**Variables a agregar:**
```
HIGGSFIELD_ID                = [Tu ID de Higgsfield]
HIGGSFIELD_SECRET            = [Tu Secret de Higgsfield]
ELEVENLABS_API_KEY           = sk_87d5a7899d6c489c94232248c4880a0c4fe317adb3701e67
ELEVENLABS_VOICE_ID          = iDEmt5MnqUotdwCIVplo
SUPABASE_URL                 = https://[tu-proyecto].supabase.co
SUPABASE_SERVICE_KEY         = [Tu service key de Supabase]
N8N_WEBHOOK_URL              = https://n8n.srv1013903.hstgr.cloud/webhook/c285fc03-6b3a-40be-b605-085e8336d492
```

✅ **VERIFICACIÓN:**
- Vercel muestra todas las variables
- Click "Redeploy" (arriba)
- Espera a que rebuild termine (verás checkmark verde)

---

## 🎯 PASO 3: N8N WORKFLOWS (15 minutos)

### 3.1 Ir a N8N
```
https://n8n.srv1013903.hstgr.cloud
→ Workflows
→ +Workflow
→ "Import from file"
```

### 3.2 Importar primer workflow (Imagen)
```
1. Click "+ Workflow"
2. Click "Import from file"
3. Selecciona: n8n-workflow-imagen.json
4. Click "Open"
```

### 3.3 Configurar credenciales (IMPORTANTE!)
El workflow se importa pero **FALTA agregar credenciales reales:**

**En el canvas, busca nodos naranja** (problemas):

#### Higgsfield (aparecerá 2 veces)
1. Click en el nodo naranja "Higgsfield Text2Image"
2. En el panel derecho, busca campo "Authorization"
3. Reemplaza:
   - `HIGGSFIELD_ID` → tu ID real
   - `HIGGSFIELD_SECRET` → tu secret real
   
Ejemplo correcto:
```
Authorization: Key abc123def456:xyz789uvw012
```

#### Supabase
1. Click en nodo "Save to Supabase"
2. Campos a actualizar:
   - URL: https://[TU-PROYECTO].supabase.co/rest/v1/tracker_results
   - apikey: [TU-SERVICE-KEY]
   - Authorization: Bearer [TU-SERVICE-KEY]

### 3.4 Activar workflow
1. Arriba a la derecha: "Save" (azul)
2. Luego: "Activate" (verde, aparece después de guardar)
3. ¿Ves "Active" en rojo arriba? ✅ Listo

### 3.5 Repetir para OTROS workflows
N8N **aún no tiene workflows para video, voice, presentación, web, capacitación**

**Próximo paso (futuro):**
- Workflows básicos para video/voice/etc. pueden ser copias modificadas del de imagen
- O crear manualmente en N8N (5 min cada uno)

Para MVP: **El de imagen es el más importante**, prueba ese primero.

---

## 🎯 PASO 4: TESTING (5 minutos)

### 4.1 Test automático
```
Terminal:
python3 test-sistema.py

Resultado esperado:
[TEST 1] Checking frontends...
  OK: control-maestro.html
  OK: biblioteca.html
  OK: config-dashboard.html

[TEST 2] Checking /api/biblioteca...
  OK: Total assets = 0

[TEST 3] Testing /api/create...
  OK: jobId = imagen-1726087...

[RESULT] 3 passed, 0 failed
```

### 4.2 Test manual (¡lo más importante!)
1. Abre: `https://tracker.victor-ia.xyz/control-maestro.html`
2. Click: **"🖼️ Generar Imagen"**
3. Escribe: `"Un atardecer hermoso en la playa"`
4. Selecciona:
   - Proporción: Horizontal
   - Estilo: Realista
   - Cantidad: 1
5. Click: **"Generar Imagen"**
6. **ESPERA 45-60 segundos** (la IA está trabajando)
7. Abre: `https://tracker.victor-ia.xyz/biblioteca.html`
8. ¿Ves una nueva imagen? ✅ **¡ÉXITO!**

---

## ⚠️ Si algo falla...

### Error: "jobId is undefined"
→ Vercel env vars no están configuradas
→ Solución: Revisar Paso 2, redeploy

### Error: "Supabase connection failed"
→ Service key incorrecta
→ Solución: Copiar SUPABASE_SERVICE_KEY exacto desde Supabase Console

### Error: "N8N webhook not responding"
→ Workflow no está activo
→ Solución: En N8N, buscar workflow, click "Activate" (debe estar verde)

### Imagen no aparece después de 60s
→ N8N workflow no está activo o falla silenciosa
→ Solución:
   1. N8N Dashboard → Executions
   2. Busca la ejecución más reciente
   3. Haz click → ver logs detallados
   4. Fija el error

---

## 📞 Recursos Rápidos

| Problema | URL |
|----------|-----|
| Supabase issues | https://app.supabase.com → Logs (abajo) |
| Vercel issues | https://vercel.com → victor-ia-tracker → Deployments → logs |
| N8N issues | https://n8n.srv1013903.hstgr.cloud → Executions → detalles |
| Control Maestro | https://tracker.victor-ia.xyz/control-maestro.html |
| Biblioteca | https://tracker.victor-ia.xyz/biblioteca.html |

---

## 🎉 ÉXITO = Cuando...

✅ Supabase tabla `tracker_results` existe  
✅ Vercel env vars están todos configurados  
✅ N8N workflow "Imagen" está activo (verde)  
✅ Puedes generar una imagen desde Control Maestro  
✅ Imagen aparece en Biblioteca después de 60s  

**Si todo ✅ → ¡Listo para PRODUCCIÓN!**

---

## 📖 Documentación Detallada (Si necesitas más info)

- **SETUP-COMPLETE-SYSTEM.md** — Overview completo
- **GO-LIVE-CHECKLIST.md** — Checklist exhaustivo
- **n8n-workflows-setup-guide.md** — Setup N8N detallado
- **ARQUITECTURA-VISUAL.txt** — Diagrama del sistema

---

## 🚀 Después del Setup...

Una vez que funcione el workflow de imagen:

### Workflows adicionales (similar a imagen):
- **Video:** Igual pero con image2video al final
- **Voice:** Igual pero llamando a ElevenLabs TTS
- **Presentación:** Loop para múltiples slides
- **Web:** Llamar a web-4o skill
- **Capacitación:** Combinar múltiples assets

### Monitoreo a largo plazo:
- Revisar N8N Executions cada día (primeras 2 semanas)
- Revisar Vercel logs si hay errors
- Monitorear cuota de Higgsfield/ElevenLabs

---

## ⏱️ Timeline Total

- Paso 1 (Supabase): **10 min**
- Paso 2 (Vercel): **10 min**  
- Paso 3 (N8N): **15 min** (+ redeploy Vercel = 5 min)
- Paso 4 (Testing): **5 min**
- **Total: ~45 minutos**

---

**¿Listo? ¡Comienza con PASO 1!** 👇