/**
 * /api/library — Cargar assets de tracker_results desde Supabase
 *
 * GET /api/library?action=imagen&limit=50&offset=0&status=completed
 *
 * Devuelve assets generados (imágenes, videos, voces, presentaciones, web).
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
  res.setHeader('Cache-Control', 'no-store, max-age=60');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Parámetros
  const action = req.query.action || null; // imagen, video, voz, presentacion, web, capacitacion
  const limit = Math.min(parseInt(req.query.limit) || 50, 200);
  const offset = parseInt(req.query.offset) || 0;
  const status = req.query.status || 'completed'; // completed, processing, pending

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
      filters: { action: action || 'todos', status },
      note: 'Supabase no configurado (SUPABASE_URL / SUPABASE_SERVICE_KEY)'
    });
  }

  try {
    const select = 'id,uuid,job_id,action,result_url,result_type,metadata,status,created_at';
    let url = `${supabaseUrl}/rest/v1/tracker_results` +
      `?select=${encodeURIComponent(select)}` +
      `&status=eq.${encodeURIComponent(status)}` +
      `&order=created_at.desc` +
      `&limit=${limit}&offset=${offset}`;

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

    const assets = (Array.isArray(data) ? data : []).map(item => ({
      id: item.id,
      uuid: item.uuid,
      jobId: item.job_id,
      action: item.action,
      type: item.result_type,
      url: item.result_url,
      metadata: item.metadata || {},
      status: item.status,
      createdAt: item.created_at,
      thumbnailUrl: generateThumbnailUrl(item.result_url, item.result_type),
      title: generateTitle(item),
      description: generateDescription(item)
    }));

    return res.status(200).json({
      ok: true,
      total,
      limit,
      offset,
      assets,
      filters: { action: action || 'todos', status }
    });
  } catch (e) {
    console.error('[library] Error:', e);
    return res.status(500).json({ error: 'Internal server error', message: e.message });
  }
}

function generateThumbnailUrl(url, type) {
  if (!url || url === 'EMPTY') return null;

  // Si es CloudFront, devolver directamente
  if (url.includes('cloudfront.net')) {
    return url;
  }

  // Si es data URL de audio, generar un placeholder
  if (url.startsWith('data:audio')) {
    return 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"%3E%3Crect fill="%23070809" width="400" height="300"/%3E%3Ctext x="200" y="150" fill="%23FFAA17" text-anchor="middle" dominant-baseline="middle" font-size="48" font-family="Inter"%3E🎙️%3C/text%3E%3C/svg%3E';
  }

  return url;
}

function generateTitle(item) {
  const meta = item.metadata || {};

  switch (item.action) {
    case 'imagen':
      return meta.config?.estilo || 'Imagen';
    case 'video':
      return `Video (${meta.config?.duracion || '?'}s)`;
    case 'voz':
      return `Voz (${meta.config?.idioma || 'es'})`;
    case 'presentacion':
      return 'Presentación';
    case 'web':
      return meta.config?.diseño || 'Web';
    case 'capacitacion':
      return 'Capacitación';
    default:
      return item.action;
  }
}

function generateDescription(item) {
  const meta = item.metadata || {};
  const date = new Date(item.created_at).toLocaleString('es-MX');

  switch (item.action) {
    case 'imagen':
      return `${meta.config?.modelo || 'AI'} • ${date}`;
    case 'video':
      return `${meta.config?.duracion || '?'}s • ${date}`;
    case 'voz':
      return `${meta.config?.idioma || 'Español'} • ${date}`;
    default:
      return date;
  }
}