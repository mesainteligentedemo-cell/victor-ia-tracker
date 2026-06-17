/**
 * /api/create — Victor IA Tracker · Endpoint de Acciones IA
 *
 * Recibe payload de los 7 popups y despacha al agente correspondiente.
 * POST /api/create
 * Body: { action, voice_input, config, files }
 * Returns: { jobId, status, message }
 */

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  } catch (e) {
    return res.status(400).json({ error: 'Invalid JSON body' });
  }

  const { action, voice_input, config = {}, files = [] } = body;

  if (!action) return res.status(400).json({ error: 'action is required' });
  if (!voice_input || !voice_input.trim()) {
    return res.status(400).json({ error: 'voice_input is required' });
  }

  // Generar Job ID único
  const jobId = `${action}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const ts = new Date().toISOString();

  // Log en servidor (visible en Vercel Functions logs)
  console.log(`[create] ${ts} — action=${action} jobId=${jobId}`);
  console.log(`[create] prompt="${voice_input.slice(0, 120)}…"`);
  console.log(`[create] config=`, JSON.stringify(config));
  console.log(`[create] files=${files.length}`);

  // Guardar estado inicial en Supabase (mientras n8n procesa)
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

  if (supabaseUrl && supabaseKey) {
    const initialRecord = {
      job_id: jobId,
      action,
      result_url: '',
      result_type: 'pending',
      metadata: { prompt: voice_input.slice(0, 200), config },
      status: 'processing'
    };

    fetch(`${supabaseUrl}/rest/v1/tracker_results`, {
      method: 'POST',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(initialRecord)
    }).catch(e => console.warn('[create] Could not save initial record:', e.message));
  }

  // ── Routing por acción ─────────────────────────────────────────────
  try {
    let result;

    switch (action) {
      case 'imagen':
        result = await dispatchImagen({ voice_input, config, files, jobId });
        break;
      case 'video':
        result = await dispatchVideo({ voice_input, config, files, jobId });
        break;
      case 'presentacion':
        result = await dispatchPresentacion({ voice_input, config, files, jobId });
        break;
      case 'web':
        result = await dispatchWeb({ voice_input, config, files, jobId });
        break;
      case 'voice':
        result = await dispatchVoice({ voice_input, config, jobId });
        break;
      case 'capacitacion':
        result = await dispatchCapacitacion({ voice_input, config, files, jobId });
        break;
      case 'admin':
        result = await dispatchAdmin({ voice_input, config, jobId });
        break;
      default:
        return res.status(400).json({ error: `Unknown action: ${action}` });
    }

    return res.status(200).json({
      jobId,
      status: 'queued',
      action,
      message: result.message || 'Job creado correctamente',
      ...result
    });

  } catch (err) {
    console.error(`[create] Error en action=${action}:`, err.message);
    return res.status(500).json({
      error: err.message,
      jobId,
      status: 'failed'
    });
  }
}

/* ───────────────────────────────────────────────────────────────────
   DISPATCHERS — cada uno puede llamar a un webhook n8n, API externa,
   o Firestore. Por ahora retornan un objeto de confirmación.
─────────────────────────────────────────────────────────────────── */

async function dispatchImagen({ voice_input, config, files, jobId }) {
  // TODO: llamar a Higgsfield MCP o webhook n8n
  const n8nPayload = {
    jobId,
    type: 'imagen',
    prompt: voice_input,
    aspect_ratio: config.aspect_ratio || '1:1',
    modelo: config.modelo || 'flux-pro',
    estilo: config.estilo || 'realista',
    cantidad: parseInt(config.cantidad) || 1,
    tipo_seleccionado: config.tipo_seleccionado || 'general',
    ref_images: files.length
  };
  await notifyN8n('imagen', n8nPayload);
  return { message: `Generando ${n8nPayload.cantidad} imagen(es) con ${n8nPayload.modelo}` };
}

async function dispatchVideo({ voice_input, config, files, jobId }) {
  const n8nPayload = {
    jobId,
    type: 'video',
    prompt: voice_input,
    duracion: config.duracion || '10',
    aspect_ratio: config.aspect_ratio || '16:9',
    resolucion: config.resolucion || '1080p',
    velocidad: config.velocidad || 'normal',
    extras: config.extras || [],
    tipo_seleccionado: config.tipo_seleccionado || 'general',
    ref_images: files.length
  };
  await notifyN8n('video', n8nPayload);
  return { message: `Generando video ${n8nPayload.duracion}s · ${n8nPayload.resolucion}` };
}

async function dispatchPresentacion({ voice_input, config, files, jobId }) {
  const n8nPayload = {
    jobId,
    type: 'presentacion',
    prompt: voice_input,
    formato: config.formato || '16:9',
    slides: parseInt(config.slides) || 10,
    idioma: config.idioma || 'es',
    diseno: config.diseno || 'luxury-dark',
    color_primario: config.color_primario || '#FFAA17',
    extras: config.extras || [],
    tipo_seleccionado: config.tipo_seleccionado || 'propuesta',
    ref_assets: files.length
  };
  await notifyN8n('presentacion', n8nPayload);
  return { message: `Creando presentación de ${n8nPayload.slides} slides · ${n8nPayload.diseno}` };
}

async function dispatchWeb({ voice_input, config, files, jobId }) {
  const n8nPayload = {
    jobId,
    type: 'web',
    prompt: voice_input,
    diseno: config.diseno || 'luxury-dark',
    stack: config.stack || 'nextjs',
    paginas: config.paginas || '',
    features: config.features || [],
    tipo_seleccionado: config.tipo_seleccionado || 'landing',
    ref_assets: files.length
  };
  await notifyN8n('web', n8nPayload);
  return { message: `Creando sitio ${n8nPayload.tipo_seleccionado} con ${n8nPayload.stack}` };
}

async function dispatchVoice({ voice_input, config, jobId }) {
  const n8nPayload = {
    jobId,
    type: 'voice',
    texto: voice_input,
    voz: config.voz || 'iDEmt5MnqUotdwCIVplo',
    idioma: config.idioma || 'es-MX',
    tono: config.tono || 'profesional',
    acento: config.acento || 'mx',
    velocidad: parseFloat(config.velocidad) || 1.0,
    extras: config.extras || [],
    tipo_seleccionado: config.tipo_seleccionado || 'vo'
  };
  await notifyN8n('voice', n8nPayload);
  return { message: `Generando audio · voz Victor · ${n8nPayload.idioma}` };
}

async function dispatchCapacitacion({ voice_input, config, files, jobId }) {
  const n8nPayload = {
    jobId,
    type: 'capacitacion',
    prompt: voice_input,
    nivel: config.nivel || 'intermedio',
    idioma: config.idioma || 'es',
    duracion: config.duracion || '45min',
    publico: config.publico || 'vendedores',
    extras: config.extras || [],
    tipo_seleccionado: config.tipo_seleccionado || 'modulo',
    ref_docs: files.length
  };
  await notifyN8n('capacitacion', n8nPayload);
  return { message: `Creando ${n8nPayload.tipo_seleccionado} de capacitación · ${n8nPayload.nivel}` };
}

async function dispatchAdmin({ voice_input, config, jobId }) {
  const n8nPayload = {
    jobId,
    type: 'admin',
    prompt: voice_input,
    tipo_reporte: config.tipo_reporte || 'semanal',
    formato: config.formato || 'html',
    metricas: config.metricas || [],
    tipo_seleccionado: config.tipo_seleccionado || 'reporte'
  };
  await notifyN8n('admin', n8nPayload);
  return { message: `Generando reporte ${n8nPayload.tipo_reporte} en formato ${n8nPayload.formato}` };
}

/* ───────────────────────────────────────────────────────────────────
   NOTIFY N8N — Webhook de dispatch (no bloquea si falla)
─────────────────────────────────────────────────────────────────── */
async function notifyN8n(action, payload) {
  const webhookBase = process.env.N8N_WEBHOOK_URL ||
    'https://n8n.srv1013903.hstgr.cloud/webhook/c285fc03-6b3a-40be-b605-085e8336d492';

  try {
    const resp = await fetch(`${webhookBase}/${action}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout ? AbortSignal.timeout(8000) : undefined
    });
    if (!resp.ok) {
      console.warn(`[create] n8n webhook ${action} responded ${resp.status}`);
    }
  } catch (e) {
    // No bloquear si n8n no responde — el job queda loggeado
    console.warn(`[create] n8n notify failed (non-fatal):`, e.message);
  }
}
