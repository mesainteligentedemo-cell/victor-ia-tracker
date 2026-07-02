/**
 * /api/create — Victor IA Tracker · Endpoint de Acciones IA
 *
 * Recibe payload de los 7 popups y despacha al agente correspondiente.
 * POST /api/create
 * Body: { action, voice_input, config, files }
 * Returns: { jobId, status, message }
 */

import {
  generateImage,
  generateVoice,
  generateText,
  submitVideoFromImage,
  safeJson,
} from './_lib/generators.js';

// Permite polling server-side de Higgsfield hasta ~60s (limite Vercel Pro/Hobby).
export const config = { maxDuration: 60 };

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

  // Guardar estado inicial en Supabase (mientras se genera)
  await sbInsert({
    job_id: jobId,
    action,
    result_url: '',
    result_type: 'pending',
    metadata: { prompt: voice_input.slice(0, 200), config },
    status: 'processing'
  });

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
  // Mapea aspect_ratio del popup -> enum de tamaño de Higgsfield Soul.
  const ar = String(config.aspect_ratio || '1:1');
  const aspect = ar.startsWith('16') || ar.startsWith('4:3') || ar.includes('16:9')
    ? 'landscape'
    : (ar.startsWith('9') || ar.startsWith('2:3') || ar.includes('9:16'))
      ? 'portrait'
      : 'square';

  // Generación REAL server-side vía Higgsfield (submit + poll hasta ~48s).
  const gen = await generateImage({ description: voice_input, aspect, timeoutMs: 48000 });

  if (gen.url) {
    // Éxito: guardamos la URL final -> aparece en biblioteca.html de inmediato.
    await sbUpdate(jobId, {
      result_url: gen.url,
      result_type: 'image',
      status: 'completed'
    });
    return { message: 'Imagen generada', url: gen.url, resultUrl: gen.url, status: 'completed' };
  }

  // No terminó dentro del límite: guardamos el request_id para poder completar
  // vía /api/asset-status (polling) o /api/webhook-result (n8n). No es un fallo.
  await sbUpdate(jobId, {
    result_type: 'pending',
    status: 'processing',
    metadata: { prompt: voice_input.slice(0, 200), config, hf_request_id: gen.request_id }
  });
  // Aviso opcional a n8n (no bloquea si no responde).
  notifyN8n('imagen', { jobId, type: 'imagen', prompt: voice_input, hf_request_id: gen.request_id });
  return { message: 'Imagen en proceso (render largo)', status: 'processing', request_id: gen.request_id };
}

async function dispatchVideo({ voice_input, config, files, jobId }) {
  // Higgsfield image2video (DoP). 1) crear un frame con Soul, 2) animarlo.
  // El render de video tarda minutos -> guardamos el POSTER como result_url para
  // que aparezca YA en la biblioteca, y dejamos el request_id del video en
  // metadata para que /api/asset-status lo actualice al MP4 final.
  const duration = parseInt(config.duracion) || 5;

  // Frame origen: usa la primera imagen de referencia si viene; si no, genera una.
  let posterUrl = null;
  const firstRef = Array.isArray(files) && files[0];
  if (typeof firstRef === 'string' && /^https?:\/\//.test(firstRef)) {
    posterUrl = firstRef; // ya es URL usable
  } else {
    const img = await generateImage({ description: voice_input, aspect: 'landscape', timeoutMs: 26000 });
    posterUrl = img.url || null;
  }

  if (!posterUrl) {
    // El frame origen aún renderiza: no bloqueamos. Queda en proceso.
    await sbUpdate(jobId, { result_type: 'pending', status: 'processing' });
    return { message: 'Video en proceso (preparando frame origen)', status: 'processing' };
  }

  // Lanzar el video (no esperamos el render completo — no cabe en 60s).
  let videoReqId = null;
  try {
    const v = await submitVideoFromImage({ description: voice_input, imageUrl: posterUrl, duration });
    videoReqId = v.request_id;
  } catch (e) {
    console.warn('[create] video submit falló, se guarda solo poster:', e.message);
  }

  await sbUpdate(jobId, {
    result_url: posterUrl,               // visible YA en biblioteca (poster)
    result_type: 'video',
    status: videoReqId ? 'processing' : 'completed',
    metadata: {
      prompt: voice_input.slice(0, 200),
      config,
      poster: posterUrl,
      hf_video_request_id: videoReqId,   // asset-status upgrade poster -> MP4
    },
  });

  return {
    message: videoReqId ? `Video en render (~${duration}s) · aparece en Biblioteca` : 'Poster listo (video no disponible)',
    url: posterUrl,
    poster: posterUrl,
    request_id: videoReqId,
    status: 'processing',
  };
}

async function dispatchPresentacion({ voice_input, config, files, jobId }) {
  // MVP: outline de slides (OpenRouter) + portada visual (Higgsfield).
  // El artefacto visible es la portada; el guion de slides va en metadata.
  const slides = parseInt(config.slides) || 8;
  const idioma = config.idioma || 'es';
  const diseno = config.diseno || 'luxury-dark';

  const [outline, cover] = await Promise.all([
    generateText({
      system: 'Eres un experto en presentaciones ejecutivas. Devuelve SOLO JSON válido.',
      prompt: `Crea el esqueleto de una presentación de ${slides} slides en ${idioma} sobre: "${voice_input}". ` +
        `Formato JSON: {"titulo":"...","slides":[{"titulo":"...","puntos":["...","..."]}]}. Exactamente ${slides} slides.`,
      maxTokens: 1800,
      json: true,
    }).catch(e => { console.warn('[create] presentacion outline:', e.message); return null; }),
    generateImage({
      description: `Elegant ${diseno} presentation cover slide about ${voice_input}, cinematic, premium, minimalist typography space`,
      aspect: 'landscape',
      timeoutMs: 40000,
    }).catch(e => { console.warn('[create] presentacion cover:', e.message); return { url: null }; }),
  ]);

  const outlineObj = typeof outline === 'string' ? safeJson(outline) : outline;

  await sbUpdate(jobId, {
    result_url: cover?.url || '',
    result_type: 'presentacion',
    status: cover?.url ? 'completed' : 'processing',
    metadata: {
      prompt: voice_input.slice(0, 200),
      config,
      cover: cover?.url || null,
      cover_request_id: cover?.request_id || null,
      outline: outlineObj || { titulo: voice_input.slice(0, 80), slides: [] },
      slides_count: slides,
    },
  });

  return {
    message: `Presentación creada · ${slides} slides · ${diseno}`,
    url: cover?.url || null,
    status: cover?.url ? 'completed' : 'processing',
  };
}

async function dispatchWeb({ voice_input, config, files, jobId }) {
  // MVP: copy/estructura del sitio (OpenRouter) + hero visual (Higgsfield).
  // El artefacto visible es el hero; el blueprint (secciones, copy) va en metadata.
  const diseno = config.diseno || 'luxury-dark';
  const tipo = config.tipo_seleccionado || 'landing';

  const [blueprint, hero] = await Promise.all([
    generateText({
      system: 'Eres un diseñador web y copywriter. Devuelve SOLO JSON válido.',
      prompt: `Diseña la estructura de una ${tipo} estilo ${diseno} para: "${voice_input}". ` +
        `Formato JSON: {"nombre":"...","tagline":"...","secciones":[{"titulo":"...","copy":"..."}],"cta":"...","paleta":["#..","#.."]}.`,
      maxTokens: 1800,
      json: true,
    }).catch(e => { console.warn('[create] web blueprint:', e.message); return null; }),
    generateImage({
      description: `${diseno} website hero section mockup for ${voice_input}, modern UI, premium, high fidelity, dribbble quality`,
      aspect: 'landscape',
      timeoutMs: 40000,
    }).catch(e => { console.warn('[create] web hero:', e.message); return { url: null }; }),
  ]);

  const bp = typeof blueprint === 'string' ? safeJson(blueprint) : blueprint;

  await sbUpdate(jobId, {
    result_url: hero?.url || '',
    result_type: 'web',
    status: hero?.url ? 'completed' : 'processing',
    metadata: {
      prompt: voice_input.slice(0, 200),
      config,
      hero: hero?.url || null,
      hero_request_id: hero?.request_id || null,
      blueprint: bp || { nombre: voice_input.slice(0, 60), secciones: [] },
    },
  });

  return {
    message: `Blueprint + hero de ${tipo} listos · ${diseno}`,
    url: hero?.url || null,
    status: hero?.url ? 'completed' : 'processing',
  };
}

async function dispatchVoice({ voice_input, config, jobId }) {
  // Generación REAL de audio vía ElevenLabs (server-side).
  const idioma = (config.idioma || 'es-MX').slice(0, 2);
  const gen = await generateVoice({ text: voice_input, language: idioma });
  await sbUpdate(jobId, {
    result_url: gen.dataUrl,
    result_type: 'audio',
    status: 'completed'
  });
  return { message: 'Audio generado', url: gen.dataUrl, status: 'completed' };
}

async function dispatchCapacitacion({ voice_input, config, files, jobId }) {
  // MVP bundle: portada visual + guion+quiz (OpenRouter) + narración de intro (ElevenLabs).
  // Artefacto visible: portada. El bundle (guion, quiz, audio) va en metadata.
  const nivel = config.nivel || 'intermedio';
  const idioma = (config.idioma || 'es-MX').slice(0, 2);
  const publico = config.publico || 'equipo';

  // 1) Guion + quiz en paralelo con la portada.
  const [lesson, cover] = await Promise.all([
    generateText({
      system: 'Eres un diseñador instruccional experto. Devuelve SOLO JSON válido.',
      prompt: `Crea un módulo de capacitación nivel ${nivel} para ${publico} en idioma ${idioma} sobre: "${voice_input}". ` +
        `Formato JSON: {"titulo":"...","intro":"un párrafo de introducción para narrar en voz alta (max 60 palabras)",` +
        `"objetivos":["...","..."],"secciones":[{"titulo":"...","contenido":"..."}],` +
        `"quiz":[{"pregunta":"...","opciones":["a","b","c","d"],"correcta":0}]}. Incluye 4 preguntas de quiz.`,
      maxTokens: 2200,
      json: true,
    }).catch(e => { console.warn('[create] capacitacion lesson:', e.message); return null; }),
    generateImage({
      description: `Professional training course cover about ${voice_input}, ${nivel} level, clean educational design, premium`,
      aspect: 'landscape',
      timeoutMs: 34000,
    }).catch(e => { console.warn('[create] capacitacion cover:', e.message); return { url: null }; }),
  ]);

  const lessonObj = (typeof lesson === 'string' ? safeJson(lesson) : lesson) || {
    titulo: voice_input.slice(0, 80), intro: voice_input.slice(0, 200), objetivos: [], secciones: [], quiz: [],
  };

  // 2) Narración de la intro (best-effort; no bloquea el bundle si falla).
  let audioDataUrl = null;
  const introText = (lessonObj.intro || voice_input).slice(0, 500);
  try {
    const voice = await generateVoice({ text: introText, language: idioma });
    audioDataUrl = voice.dataUrl;
  } catch (e) {
    console.warn('[create] capacitacion voz:', e.message);
  }

  await sbUpdate(jobId, {
    result_url: cover?.url || '',
    result_type: 'capacitacion',
    status: cover?.url ? 'completed' : 'processing',
    metadata: {
      prompt: voice_input.slice(0, 200),
      config,
      cover: cover?.url || null,
      cover_request_id: cover?.request_id || null,
      lesson: lessonObj,
      quiz: lessonObj.quiz || [],
      audio_intro: audioDataUrl,   // base64 mp3 de la introducción
    },
  });

  return {
    message: `Capacitación creada · ${nivel} · ${(lessonObj.quiz || []).length} preguntas`,
    url: cover?.url || null,
    status: cover?.url ? 'completed' : 'processing',
  };
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
   SUPABASE — insert / update de tracker_results
─────────────────────────────────────────────────────────────────── */
function sbCfg() {
  return { url: process.env.SUPABASE_URL, key: process.env.SUPABASE_SERVICE_KEY };
}

async function sbInsert(record) {
  const { url, key } = sbCfg();
  if (!url || !key) { console.warn('[create] Supabase no configurado (insert)'); return; }
  try {
    const r = await fetch(`${url}/rest/v1/tracker_results`, {
      method: 'POST',
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify(record)
    });
    if (!r.ok) console.warn('[create] Supabase insert', r.status, (await r.text()).slice(0, 200));
  } catch (e) { console.warn('[create] Supabase insert error:', e.message); }
}

async function sbUpdate(jobId, patch) {
  const { url, key } = sbCfg();
  if (!url || !key) { console.warn('[create] Supabase no configurado (update)'); return; }
  try {
    const r = await fetch(`${url}/rest/v1/tracker_results?job_id=eq.${encodeURIComponent(jobId)}`, {
      method: 'PATCH',
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify(patch)
    });
    if (!r.ok) console.warn('[create] Supabase update', r.status, (await r.text()).slice(0, 200));
  } catch (e) { console.warn('[create] Supabase update error:', e.message); }
}

/* ───────────────────────────────────────────────────────────────────
   NOTIFY N8N — Webhook de dispatch (no bloquea si falla)
   NOTA: el webhook n8n escucha en la URL base (sin subpath). Enviar a
   `${base}/${action}` da 404 — por eso ahora la imagen se genera
   directamente en dispatchImagen y n8n queda solo como aviso opcional.
─────────────────────────────────────────────────────────────────── */
async function notifyN8n(action, payload) {
  const webhookBase = process.env.N8N_WEBHOOK_URL ||
    'https://n8n.srv1013903.hstgr.cloud/webhook/c285fc03-6b3a-40be-b605-085e8336d492';

  try {
    const resp = await fetch(webhookBase, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ...payload }),
      signal: AbortSignal.timeout ? AbortSignal.timeout(8000) : undefined
    });
    if (!resp.ok) {
      console.warn(`[create] n8n webhook responded ${resp.status}`);
    }
  } catch (e) {
    // No bloquear si n8n no responde — el job queda loggeado
    console.warn(`[create] n8n notify failed (non-fatal):`, e.message);
  }
}
