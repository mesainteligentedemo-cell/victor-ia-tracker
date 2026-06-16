/**
 * /api/webhook-result — Webhook para recibir resultados de n8n
 * n8n envía aquí cuando termina de generar un activo
 * POST /api/webhook-result
 * Body: { jobId, action, result_url, result_type, metadata }
 */

import fetch from 'node-fetch';

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

  const { jobId, action, result_url, result_type, metadata = {} } = body;

  if (!jobId || !action || !result_url) {
    return res.status(400).json({ error: 'jobId, action, result_url are required' });
  }

  const ts = new Date().toISOString();
  console.log(`[webhook-result] ${ts} — jobId=${jobId} action=${action}`);

  try {
    // Guardar en Supabase
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.warn('[webhook-result] Supabase no configurado, loggeando solo');
      return res.status(200).json({
        ok: true,
        message: 'Result logged (Supabase not configured)',
        jobId
      });
    }

    const payload = {
      job_id: jobId,
      action,
      result_url,
      result_type: result_type || 'media',
      metadata: metadata || {},
      created_at: ts,
      status: 'completed'
    };

    // Insertar en tabla tracker_results
    const insertResp = await fetch(`${supabaseUrl}/rest/v1/tracker_results`, {
      method: 'POST',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(payload)
    });

    if (!insertResp.ok) {
      const errText = await insertResp.text();
      console.error('[webhook-result] Supabase insert failed:', insertResp.status, errText);
      // No bloquear si Supabase falla
    } else {
      const saved = await insertResp.json();
      console.log('[webhook-result] Guardado en Supabase:', saved[0]?.id);
    }

    return res.status(200).json({
      ok: true,
      message: 'Result received and saved',
      jobId
    });

  } catch (err) {
    console.error('[webhook-result] Error:', err.message);
    return res.status(500).json({
      error: err.message,
      jobId
    });
  }
}
