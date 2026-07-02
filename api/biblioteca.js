/**
 * /api/biblioteca — Lista todos los activos generados
 * GET /api/biblioteca?filter=imagen&limit=50
 * Returns: { ok, assets, total }
 */

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { filter = '', limit = '50', offset = '0' } = req.query;
  const limitNum = Math.min(parseInt(limit) || 50, 200);
  const offsetNum = parseInt(offset) || 0;

  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return res.status(200).json({
        ok: false,
        assets: [],
        total: 0,
        message: 'Faltan variables SUPABASE_URL y/o SUPABASE_SERVICE_KEY en Vercel',
        missing: {
          SUPABASE_URL: !supabaseUrl,
          SUPABASE_SERVICE_KEY: !supabaseKey
        }
      });
    }

    // Construir query
    let query = `select=*&order=created_at.desc`;

    if (filter && filter !== 'todos') {
      query += `&action=eq.${encodeURIComponent(filter)}`;
    }

    query += `&limit=${limitNum}&offset=${offsetNum}`;

    // Fetch desde Supabase
    const resp = await fetch(
      `${supabaseUrl}/rest/v1/tracker_results?${query}`,
      {
        method: 'GET',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!resp.ok) {
      const err = await resp.text();
      console.error('[biblioteca] Supabase query failed:', resp.status, err);
      return res.status(200).json({
        ok: false,
        assets: [],
        total: 0,
        message: `Supabase respondio ${resp.status}. Revisa SUPABASE_URL (proyecto correcto) y SUPABASE_SERVICE_KEY.`,
        supabaseStatus: resp.status,
        supabaseError: (err || '').slice(0, 300)
      });
    }

    const assets = await resp.json();

    // Contar total
    const countResp = await fetch(
      `${supabaseUrl}/rest/v1/tracker_results?select=count()`,
      {
        method: 'GET',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'count=exact'
        }
      }
    );

    let total = assets.length;
    if (countResp.ok) {
      total = parseInt(countResp.headers.get('content-range')?.split('/')[1] || assets.length);
    }

    return res.status(200).json({
      ok: true,
      assets: assets.map(a => ({
        id: a.id,
        jobId: a.job_id,
        action: a.action,
        url: a.result_url,
        type: a.result_type,
        metadata: a.metadata,
        createdAt: a.created_at,
        status: a.status
      })),
      total,
      count: assets.length,
      hasMore: offsetNum + assets.length < total
    });

  } catch (err) {
    console.error('[biblioteca] Error:', err.message);
    return res.status(500).json({
      error: err.message,
      assets: [],
      total: 0
    });
  }
}
