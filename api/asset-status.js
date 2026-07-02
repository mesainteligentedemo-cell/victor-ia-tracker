// /api/asset-status.js — poll a Higgsfield request_id for completion (videos)
// GET /api/asset-status?id=<request_id>[&job=<job_id>]
// Si se pasa `job`, cuando el video termina se hace PATCH en Supabase para
// reemplazar el poster por el MP4 final (result_url) y marcar completed.
// Respuesta: { ok, status, url }

import { hfPoll } from './_lib/generators.js';

export const config = { maxDuration: 30 };

async function finalizeInSupabase(jobId, url, type) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !supabaseKey || !jobId || !url) return;
  const patch = { result_url: url, status: 'completed' };
  if (type) patch.result_type = type; // solo forzamos tipo si el cliente lo indica (video)
  try {
    await fetch(`${supabaseUrl}/rest/v1/tracker_results?job_id=eq.${encodeURIComponent(jobId)}`, {
      method: 'PATCH',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify(patch),
    });
  } catch (e) {
    console.warn('[asset-status] finalize error:', e.message);
  }
}

export default async function handler(req, res) {
  const params = req.query || (req.url ? Object.fromEntries(new URL(req.url, 'http://x').searchParams) : {});
  const id = params.id;
  const job = params.job || null;
  const type = params.type || null; // 'video' fuerza result_type; si no, se preserva
  if (!id) return res.status(400).json({ ok: false, error: 'Falta id' });

  try {
    const r = await hfPoll(id);
    const done = !!r.url;
    if (done && job) await finalizeInSupabase(job, r.url, type);
    return res.status(200).json({ ok: true, status: done ? 'completed' : (r.status || 'in_progress'), url: r.url || null });
  } catch (e) {
    return res.status(200).json({ ok: false, status: 'in_progress', error: e.message });
  }
}