// /api/asset-status.js — poll a Higgsfield request_id for completion (videos)
// GET /api/asset-status?id=<request_id>
// Respuesta: { ok, status, url }

import { hfPoll } from './_lib/generators.js';

export const config = { maxDuration: 30 };

export default async function handler(req, res) {
  const id = req.query?.id || (req.url && new URL(req.url, 'http://x').searchParams.get('id'));
  if (!id) return res.status(400).json({ ok: false, error: 'Falta id' });

  try {
    const r = await hfPoll(id);
    return res.status(200).json({ ok: true, status: r.url ? 'completed' : (r.status || 'in_progress'), url: r.url || null });
  } catch (e) {
    return res.status(200).json({ ok: false, status: 'in_progress', error: e.message });
  }
}