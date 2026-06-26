/**
 * /api/log-activity.js — Victor IA Tracker · PROTOCOLO DE VACIADO TOTAL DE ACTIVIDAD
 *
 * Registra AUTOMÁTICAMENTE toda actividad (VSC, Tracker, CLI, Chat) en el tracker.
 *
 * POST /api/log-activity
 * Body: { action, description, timestamp?, source, user?, details?, cat?, project?,
 *         client?, status?, priority?, tags?, sw? }
 *
 * GET  /api/log-activity            -> últimas 50 actividades
 * GET  /api/log-activity?limit=100  -> últimas N (máx 200)
 * GET  /api/log-activity?source=VSC -> filtrado por fuente
 *
 * Persistencia: Supabase (tabla `activity_log`) si hay env vars,
 *               si no -> fallback en memoria (best-effort) + n8n mirror.
 *
 * Env: SUPABASE_URL, SUPABASE_SERVICE_KEY, N8N_WEBHOOK_URL (opcional)
 */

const SUPA_TABLE = 'activity_log';

// Fallback en memoria para entornos sin Supabase (no persiste entre cold starts,
// pero garantiza respuesta 200 y permite que el front siga funcionando).
const MEM = globalThis.__VIA_ACTIVITY_MEM__ || (globalThis.__VIA_ACTIVITY_MEM__ = []);

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function pad(n) { return String(n).padStart(2, '0'); }

// Devuelve fecha/hora en zona horaria de México (America/Mexico_City)
function nowMX() {
  const d = new Date();
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Mexico_City',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
  }).formatToParts(d).reduce((a, p) => (a[p.type] = p.value, a), {});
  return {
    dateKey: `${parts.year}-${parts.month}-${parts.day}`,
    hora: `${parts.hour === '24' ? '00' : parts.hour}:${parts.minute}:${parts.second}`,
    iso: d.toISOString()
  };
}

function makeId() {
  return 's' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
}

// Mapea un registro de actividad al shape de entrada del tracker
function buildRecord(body) {
  const t = nowMX();
  let dateKey = t.dateKey, hora = t.hora;
  // Si llega timestamp ISO del cliente, derivar dateKey/hora desde él
  if (body.timestamp) {
    try {
      const d = new Date(body.timestamp);
      if (!isNaN(d)) {
        const p = new Intl.DateTimeFormat('en-CA', {
          timeZone: 'America/Mexico_City',
          year: 'numeric', month: '2-digit', day: '2-digit',
          hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
        }).formatToParts(d).reduce((a, x) => (a[x.type] = x.value, a), {});
        dateKey = `${p.year}-${p.month}-${p.day}`;
        hora = `${p.hour === '24' ? '00' : p.hour}:${p.minute}:${p.second}`;
      }
    } catch (_) {}
  }

  const source = (body.source || 'Tracker').trim();        // VSC | Tracker | CLI
  const action = (body.action || 'event').trim();          // commit|edit|create|generate|message|click...
  const description = (body.description || body.desc || '').toString().slice(0, 500);

  // Categoría inteligente por fuente/acción
  let cat = body.cat;
  if (!cat) {
    if (source === 'VSC' || source === 'CLI') cat = 'Desarrollo';
    else if (action === 'message' || source === 'Chat') cat = 'Chat';
    else cat = 'Tracker';
  }

  const swMap = { VSC: 'VSCode', CLI: 'PowerShell', Tracker: 'Tracker', Chat: 'Tracker' };

  return {
    id: makeId(),
    dateKey,
    hora,
    desc: description,
    cat,
    source,
    action,
    project: body.project || 'Tracker Meta',
    client: body.client || 'Victor IA',
    status: body.status || 'Completado',
    priority: body.priority || 'Media',
    dur: body.dur || 'instantáneo',
    durSec: Number(body.durSec) || 0,
    details: (body.details || '').toString().slice(0, 1000),
    tags: Array.isArray(body.tags) ? body.tags
          : (body.tags ? String(body.tags).split(',').map(s => s.trim()).filter(Boolean) : [source.toLowerCase(), action]),
    user: body.user || 'Pablo',
    sw: body.sw || swMap[source] || 'Tracker',
    rework: 0,
    obs: '',
    notes: body.details || '',
    ts: t.iso,
    auto: true
  };
}

async function supaInsert(record) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return { ok: false, reason: 'no-supabase' };
  const resp = await fetch(`${url}/rest/v1/${SUPA_TABLE}`, {
    method: 'POST',
    headers: {
      'apikey': key,
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal'
    },
    body: JSON.stringify(record)
  });
  if (!resp.ok) {
    const t = await resp.text().catch(() => '');
    return { ok: false, reason: `supabase ${resp.status}: ${t.slice(0, 200)}` };
  }
  return { ok: true };
}

async function supaSelect({ limit = 50, source }) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return null;
  let q = `${url}/rest/v1/${SUPA_TABLE}?select=*&order=ts.desc&limit=${Math.min(limit, 200)}`;
  if (source) q += `&source=eq.${encodeURIComponent(source)}`;
  const resp = await fetch(q, {
    headers: { 'apikey': key, 'Authorization': `Bearer ${key}` }
  });
  if (!resp.ok) return null;
  return resp.json();
}

// Espejo no bloqueante a n8n (para que las entradas también fluyan al auto-tracker)
function mirrorN8n(record) {
  const base = process.env.N8N_WEBHOOK_URL ||
    'https://n8n.srv1013903.hstgr.cloud/webhook/auto-tracker';
  try {
    fetch(base, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'append', entry: record }),
      signal: AbortSignal.timeout ? AbortSignal.timeout(5000) : undefined
    }).catch(() => {});
  } catch (_) {}
}

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  // ── LECTURA: dashboard de actividad en vivo ──
  if (req.method === 'GET') {
    const url = new URL(req.url, 'http://x');
    const limit = parseInt(url.searchParams.get('limit') || '50', 10);
    const source = url.searchParams.get('source') || null;
    const rows = await supaSelect({ limit, source });
    if (rows) return res.status(200).json({ ok: true, count: rows.length, activities: rows, store: 'supabase' });
    // fallback memoria
    let mem = MEM.slice().reverse();
    if (source) mem = mem.filter(r => r.source === source);
    return res.status(200).json({ ok: true, count: mem.length, activities: mem.slice(0, Math.min(limit, 200)), store: 'memory' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  // ── ESCRITURA: registrar actividad ──
  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
  } catch (_) {
    return res.status(400).json({ ok: false, error: 'Invalid JSON body' });
  }

  if (!body.description && !body.desc) {
    return res.status(400).json({ ok: false, error: 'description is required' });
  }

  const record = buildRecord(body);

  // Guardar en memoria (siempre, como respaldo inmediato)
  MEM.push(record);
  if (MEM.length > 500) MEM.splice(0, MEM.length - 500);

  // Persistir en Supabase (no bloquea la confirmación si falla)
  const supa = await supaInsert(record).catch(e => ({ ok: false, reason: e.message }));

  // Espejo a n8n
  mirrorN8n(record);

  console.log(`[log-activity] ${record.dateKey} ${record.hora} [${record.source}/${record.action}] ${record.desc.slice(0, 80)}`);

  return res.status(200).json({
    ok: true,
    confirmed: true,
    id: record.id,
    stored: supa.ok ? 'supabase' : 'memory',
    record
  });
}