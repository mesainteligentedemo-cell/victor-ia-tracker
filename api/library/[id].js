/**
 * /api/library/:id — Operaciones sobre un asset individual de tracker_results
 *
 * DELETE /api/library/:id
 *   Elimina el registro con id = :id de la tabla tracker_results en Supabase.
 *   Responde { ok:true, deleted:id }.
 *
 * NOTA: usa REST directo de Supabase (mismo patrón que library.js / create.js)
 * con SUPABASE_URL + SUPABASE_SERVICE_KEY. NO usa @supabase/supabase-js.
 */

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'DELETE') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  // id viene de la ruta dinámica /api/library/[id]
  const id = req.query.id;
  if (!id) {
    return res.status(400).json({ ok: false, error: 'id requerido' });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ ok: false, error: 'Supabase no configurado' });
  }

  try {
    const url = `${supabaseUrl}/rest/v1/tracker_results?id=eq.${encodeURIComponent(id)}`;
    const dbRes = await fetch(url, {
      method: 'DELETE',
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation'
      }
    });

    if (!dbRes.ok) {
      const details = await dbRes.text().catch(() => '');
      console.error('[library/:id] Supabase DELETE error:', dbRes.status, details);
      return res.status(500).json({ ok: false, error: 'Database error', status: dbRes.status, details });
    }

    const deleted = await dbRes.json().catch(() => []);
    if (Array.isArray(deleted) && deleted.length === 0) {
      return res.status(404).json({ ok: false, error: 'Asset no encontrado', id });
    }

    return res.status(200).json({ ok: true, deleted: id, rows: Array.isArray(deleted) ? deleted.length : 0 });
  } catch (e) {
    console.error('[library/:id] Error:', e);
    return res.status(500).json({ ok: false, error: 'Internal server error', message: e.message });
  }
}