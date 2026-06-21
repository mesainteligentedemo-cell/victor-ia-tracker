/**
 * /api/loops/execute — Victor IA Tracker · Ejecución REAL de loops
 * ================================================================
 * Vercel Serverless Function (ESM). Conecta el botón "Ejecutar ahora" del
 * tracker con la ejecución real de loops.
 *
 * Vercel NO tiene Python ni los scripts del harness, así que esta función
 * DELEGA al backend de loops (Express en Railway/host con loop-runner.py),
 * definido en la env var LOOPS_BACKEND_URL.
 *   LOOPS_BACKEND_URL = https://<host-del-orchestration-server>
 *   -> POST {LOOPS_BACKEND_URL}/api/loops/execute  (api/loops.js)
 *
 * Body: { loopId, loopType: "skills"|"harness", goal? }
 * Resp: { success, status, logs, duration, timestamp, runId, loopId, loopType, score }
 */

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
  } catch (e) {
    return res.status(400).json({ success: false, error: 'Invalid JSON body' });
  }

  const { loopId, loopType, goal } = body;
  if (!loopId || !loopType || !['skills', 'harness'].includes(loopType)) {
    return res.status(400).json({
      success: false,
      error: 'loopId y loopType ("skills"|"harness") son requeridos',
    });
  }

  const backend = (process.env.LOOPS_BACKEND_URL || '').replace(/\/$/, '');
  if (!backend) {
    return res.status(503).json({
      success: false,
      status: 'error',
      loopId,
      loopType,
      logs: 'LOOPS_BACKEND_URL no configurada. Define la env var en Vercel apuntando al servidor Express (orchestration-server.js) que ejecuta loop-runner.py.',
      duration: 0,
      timestamp: new Date().toISOString(),
    });
  }

  try {
    const r = await fetch(`${backend}/api/loops/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ loopId, loopType, goal }),
    });
    const data = await r.json();
    return res.status(r.ok ? 200 : r.status).json(data);
  } catch (err) {
    return res.status(502).json({
      success: false,
      status: 'error',
      loopId,
      loopType,
      logs: `No se pudo contactar el backend de loops: ${String(err.message || err)}`,
      duration: 0,
      timestamp: new Date().toISOString(),
    });
  }
}