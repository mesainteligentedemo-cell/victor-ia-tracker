// /api/chat.js — Vercel serverless: chat con OpenRouter (Claude Haiku 4.5)
// Frontend: POST { message: "...", conversationHistory: [{role, content}, ...] }
// Respuesta: { ok: true, response: "...", id: "..." }
// Error:     { ok: false, error: "..." }
// Requiere env var OPENROUTER_API_KEY en Vercel.
//
// Compat: también acepta el formato antiguo { messages: [...] } por si algún
// cliente lo sigue usando.

export const config = { maxDuration: 60 };

const OR_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'anthropic/claude-haiku-4.5';

const SYSTEM_PROMPT =
  'Eres Victor IA, asistente experto de la plataforma Victor IA. ' +
  'Tienes acceso a datos de 10 sitios, 135 posts de blog, y todo sobre la ' +
  'infraestructura de Victor IA. Responde con autoridad, en español, de forma ' +
  'clara y útil. Si no sabes algo, dilo honestamente.';

function makeId() {
  return 'msg_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const key = process.env.OPENROUTER_API_KEY;
  if (!key) {
    return res.status(500).json({ ok: false, error: 'OPENROUTER_API_KEY no configurada' });
  }

  // --- Parsear body (puede llegar como objeto ya parseado o como string) ---
  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  body = body || {};

  // --- Construir historial de mensajes ---
  let history = [];

  if (Array.isArray(body.messages)) {
    // Formato antiguo: { messages: [{role, content}, ...] }
    history = body.messages;
  } else {
    // Formato nuevo: { message, conversationHistory }
    const prior = Array.isArray(body.conversationHistory) ? body.conversationHistory : [];
    history = [...prior];
    if (typeof body.message === 'string' && body.message.trim()) {
      history.push({ role: 'user', content: body.message });
    }
  }

  // Sanitizar: solo user/assistant con contenido string, máx 30 turnos
  history = history
    .filter(m => (m?.role === 'user' || m?.role === 'assistant') && typeof m?.content === 'string')
    .map(m => ({ role: m.role, content: m.content }))
    .slice(-30);

  if (!history.length || history[history.length - 1].role !== 'user') {
    return res.status(400).json({ ok: false, error: 'Se requiere al menos un mensaje de usuario' });
  }

  try {
    const upstream = await fetch(OR_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://tracker.victor-ia.xyz',
        'X-Title': 'Victor IA Chat',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 2048,
        stream: false,
        messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...history],
      }),
    });

    if (!upstream.ok) {
      const errText = await upstream.text().catch(() => '');
      return res.status(502).json({
        ok: false,
        error: `OpenRouter ${upstream.status}: ${errText.slice(0, 300)}`,
      });
    }

    const data = await upstream.json();
    const response = data?.choices?.[0]?.message?.content;

    if (typeof response !== 'string' || !response.trim()) {
      return res.status(502).json({
        ok: false,
        error: 'Respuesta vacía del modelo',
      });
    }

    return res.status(200).json({
      ok: true,
      response: response.trim(),
      id: data?.id || makeId(),
    });
  } catch (e) {
    return res.status(500).json({ ok: false, error: `Error de conexión: ${e.message}` });
  }
}