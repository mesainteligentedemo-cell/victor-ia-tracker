/**
 * /api/library — Cargar assets de tracker_results desde Supabase
 *
 * GET /api/library?action=imagen&limit=50&offset=0&status=completed
 *   action  : imagen | video | presentacion | web | voice | capacitacion | admin (opcional)
 *   status  : completed | processing | pending | all  (default: all)
 *   limit   : 1..200 (default 100)
 *   offset  : paginación
 *
 * Devuelve TODOS los assets generados por el tracker (imágenes, videos,
 * voces, presentaciones, web, capacitación, admin/finanzas).
 *
 * NOTA: usa REST directo de Supabase (mismo patrón que asset-status.js,
 * biblioteca.js y create.js) con SUPABASE_URL + SUPABASE_SERVICE_KEY.
 * NO usa @supabase/supabase-js (no está instalado -> causaba
 * FUNCTION_INVOCATION_FAILED / HTTP 500).
 */

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store, max-age=30');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Parámetros
  const action = req.query.action || null; // imagen, video, voice, presentacion, web, capacitacion, admin
  const limit = Math.min(parseInt(req.query.limit) || 100, 200);
  const offset = parseInt(req.query.offset) || 0;
  // 'all' (o 'todos') => no filtrar por status; así se ven TODOS los assets.
  const status = req.query.status || 'all';
  const filterByStatus = status && status !== 'all' && status !== 'todos';

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

  // Sin credenciales -> devolver galería vacía (no romper la UI)
  if (!supabaseUrl || !supabaseKey) {
    return res.status(200).json({
      ok: true,
      total: 0,
      limit,
      offset,
      assets: [],
      counts: {},
      filters: { action: action || 'todos', status },
      note: 'Supabase no configurado (SUPABASE_URL / SUPABASE_SERVICE_KEY)'
    });
  }

  try {
    const select = 'id,job_id,action,result_url,result_type,metadata,status,created_at';
    let url = `${supabaseUrl}/rest/v1/tracker_results` +
      `?select=${encodeURIComponent(select)}` +
      `&order=created_at.desc` +
      `&limit=${limit}&offset=${offset}`;

    if (filterByStatus) {
      url += `&status=eq.${encodeURIComponent(status)}`;
    }
    if (action) {
      url += `&action=eq.${encodeURIComponent(action)}`;
    }

    const dbRes = await fetch(url, {
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        Prefer: 'count=exact'
      }
    });

    if (!dbRes.ok) {
      const details = await dbRes.text().catch(() => '');
      console.error('[library] Supabase REST error:', dbRes.status, details);
      return res.status(500).json({ error: 'Database error', status: dbRes.status, details });
    }

    const data = await dbRes.json();

    // Total desde Content-Range: "0-99/1234"
    let total = Array.isArray(data) ? data.length : 0;
    const range = dbRes.headers.get('content-range');
    if (range && range.includes('/')) {
      const parsed = parseInt(range.split('/')[1], 10);
      if (!isNaN(parsed)) total = parsed;
    }

    const assets = (Array.isArray(data) ? data : []).map(item => {
      const canonical = normalizeAction(item.action);
      return {
        id: item.id,
        jobId: item.job_id,
        action: canonical,
        rawAction: item.action,
        type: item.result_type,
        fileType: fileTypeOf(item),
        url: item.result_url || null,
        metadata: item.metadata || {},
        status: item.status,
        createdAt: item.created_at,
        thumbnailUrl: generateThumbnailUrl(item.result_url, canonical, item.result_type),
        title: generateTitle(item, canonical),
        description: generateDescription(item, canonical)
      };
    });

    // Conteos por categoría (sobre lo que se trajo en esta página)
    const counts = {};
    assets.forEach(a => { counts[a.action] = (counts[a.action] || 0) + 1; });

    return res.status(200).json({
      ok: true,
      total,
      limit,
      offset,
      assets,
      counts,
      filters: { action: action || 'todos', status }
    });
  } catch (e) {
    console.error('[library] Error:', e);
    return res.status(500).json({ error: 'Internal server error', message: e.message });
  }
}

/* ── Helpers ─────────────────────────────────────────────────────── */

// Normaliza variantes de action a una clave canónica.
function normalizeAction(a) {
  const k = String(a || '').toLowerCase();
  if (k === 'voz' || k === 'speech' || k === 'audio' || k === 'tts') return 'voice';
  if (k === 'imagenes' || k === 'image' || k === 'img') return 'imagen';
  if (k === 'videos') return 'video';
  if (k === 'landing' || k === 'website') return 'web';
  if (k === 'presentation' || k === 'deck' || k === 'slides') return 'presentacion';
  if (k === 'training' || k === 'curso') return 'capacitacion';
  if (k === 'finanzas' || k === 'reporte' || k === 'admin-finanzas') return 'admin';
  return k || 'otros';
}

// Etiqueta de tipo de archivo para la tarjeta (JPG, MP4, MP3, HTML…).
function fileTypeOf(item) {
  const url = item.result_url || '';
  const type = String(item.result_type || '').toLowerCase();
  const act = normalizeAction(item.action);

  if (url.startsWith('data:audio') || type === 'audio' || act === 'voice') return 'MP3';
  if (type === 'video' || act === 'video') return 'MP4';
  if (type === 'image' || act === 'imagen') return 'IMG';
  if (act === 'web') return 'WEB';
  if (act === 'presentacion') return 'DECK';
  if (act === 'capacitacion') return 'CURSO';
  if (act === 'admin') return 'DOC';

  // fallback: extensión de la URL
  const m = url.split('?')[0].match(/\.([a-z0-9]{2,5})$/i);
  if (m) return m[1].toUpperCase();
  return type ? type.toUpperCase() : '—';
}

function generateThumbnailUrl(url, action, type) {
  const placeholders = {
    voice: emojiThumb('🎙️'),
    admin: emojiThumb('💰'),
    presentacion: emojiThumb('📊'),
    capacitacion: emojiThumb('📚'),
    web: emojiThumb('🌐'),
    video: emojiThumb('🎬'),
    imagen: emojiThumb('🖼️'),
    otros: emojiThumb('📦')
  };

  if (!url || url === 'EMPTY' || url === 'pending' || url.startsWith('data:audio')) {
    return placeholders[action] || placeholders.otros;
  }

  // URLs de imagen/video con poster (CloudFront/Higgsfield) -> usar directo.
  if (/^https?:\/\//.test(url)) return url;

  // data:image -> usar directo
  if (url.startsWith('data:image')) return url;

  return placeholders[action] || placeholders.otros;
}

function emojiThumb(emoji) {
  return 'data:image/svg+xml,' + encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300">` +
    `<rect fill="#0b0c0e" width="400" height="300"/>` +
    `<text x="200" y="160" text-anchor="middle" dominant-baseline="middle" font-size="90">${emoji}</text>` +
    `</svg>`
  );
}

function firstWords(str, n = 8) {
  if (!str) return '';
  const words = String(str).trim().split(/\s+/).slice(0, n).join(' ');
  return words.length < String(str).trim().length ? words + '…' : words;
}

function generateTitle(item, action) {
  const meta = item.metadata || {};
  const cfg = meta.config || {};
  const prompt = meta.prompt || '';

  switch (action) {
    case 'imagen':
      return firstWords(prompt) || 'Imagen';
    case 'video':
      return firstWords(prompt) || `Video (${cfg.duracion || '?'}s)`;
    case 'voice':
      return firstWords(prompt) || `Voz (${cfg.idioma || 'es'})`;
    case 'presentacion':
      return (meta.outline && meta.outline.titulo) || firstWords(prompt) || 'Presentación';
    case 'web':
      return (meta.blueprint && meta.blueprint.nombre) || firstWords(prompt) || 'Web / Landing';
    case 'capacitacion':
      return (meta.lesson && meta.lesson.titulo) || firstWords(prompt) || 'Capacitación';
    case 'admin':
      return `Reporte ${cfg.tipo_reporte || cfg.tipo_seleccionado || ''}`.trim() || firstWords(prompt) || 'Admin & Finanzas';
    default:
      return firstWords(prompt) || item.action || 'Asset';
  }
}

function generateDescription(item, action) {
  const meta = item.metadata || {};
  const cfg = meta.config || {};
  let date = '';
  try { date = new Date(item.created_at).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' }); }
  catch { date = item.created_at || ''; }

  switch (action) {
    case 'imagen':
      return `${cfg.modelo || cfg.aspect_ratio || 'AI'} · ${date}`;
    case 'video':
      return `${cfg.duracion || '?'}s · ${date}`;
    case 'voice':
      return `${cfg.idioma || 'Español'} · ${date}`;
    case 'presentacion':
      return `${meta.slides_count || cfg.slides || '?'} slides · ${date}`;
    case 'web':
      return `${cfg.tipo_seleccionado || cfg.diseno || 'landing'} · ${date}`;
    case 'capacitacion':
      return `${cfg.nivel || 'curso'} · ${date}`;
    case 'admin':
      return `${cfg.formato || 'reporte'} · ${date}`;
    default:
      return date;
  }
}
