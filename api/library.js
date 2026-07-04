/**
 * /api/library — Cargar assets de tracker_results desde Supabase
 *
 * GET /api/library?action=imagen&limit=50&offset=0
 *
 * Devuelve assets generados (imágenes, videos, voces, presentaciones, web)
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://oemegqzcdxzfctxbizyna.supabase.co';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', 'https://tracker.victor-ia.xyz');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Cache-Control', 'no-store, max-age=60');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Parámetros
    const action = req.query.action || null; // imagen, video, voz, presentacion, web, capacitacion
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;
    const search = req.query.search || null;
    const status = req.query.status || 'completed'; // completed, processing, pending

    // Construir query
    let query = supabase
      .from('tracker_results')
      .select('id, uuid, job_id, action, result_url, result_type, metadata, status, created_at', {
        count: 'exact'
      })
      .eq('status', status)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Filtrar por action si se proporciona
    if (action) {
      query = query.eq('action', action);
    }

    // Ejecutar query
    const { data, count, error } = await query;

    if (error) {
      console.error('[library] Supabase error:', error);
      return res.status(500).json({ error: 'Database error', details: error.message });
    }

    // Procesar datos
    const assets = (data || []).map(item => ({
      id: item.id,
      uuid: item.uuid,
      jobId: item.job_id,
      action: item.action,
      type: item.result_type,
      url: item.result_url,
      metadata: item.metadata || {},
      status: item.status,
      createdAt: item.created_at,
      // Generar thumbnail URL si es imagen o video
      thumbnailUrl: generateThumbnailUrl(item.result_url, item.result_type),
      // Metadata útil para mostrar
      title: generateTitle(item),
      description: generateDescription(item)
    }));

    return res.status(200).json({
      ok: true,
      total: count,
      limit,
      offset,
      assets,
      filters: {
        action: action || 'todos',
        status
      }
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
