// /api/chat.js — Vercel serverless: proxy streaming a OpenRouter (Claude Haiku)
// Frontend: POST { messages: [{role:'user'|'assistant', content:'...'}] }
// Respuesta: SSE → data: {"text":"..."} ... data: [DONE]
// Requiere env var OPENROUTER_API_KEY en Vercel.

export const config = { maxDuration: 60 };

const OR_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'anthropic/claude-haiku-4.5';

const SYSTEM_PROMPT =
  'Eres Victor IA, asistente experto de la plataforma Victor IA. ' +
  'Tienes acceso a datos de 10 sitios, 135 posts de blog, y todo sobre la ' +
  'infraestructura de Victor IA. Responde con autoridad y ayuda al usuario.';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const key = process.env.OPENROUTER_API_KEY;
  if (!key) return res.status(500).json({ error: 'OPENROUTER_API_KEY no configurada' });

  // Sanitizar historial: solo user/assistant con contenido string, máx 30 turnos
  const history = (Array.isArray(req.body?.messages) ? req.body.messages : [])
    .filter(m => (m?.role === 'user' || m?.role === 'assistant') && typeof m?.content === 'string')
    .slice(-30);

  if (!history.length || history[history.length - 1].role !== 'user') {
    return res.status(400).json({ error: 'Se requiere al menos un mensaje de usuario' });
  }

  // Headers SSE
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.status(200);

  const send = (obj) => res.write(`data: ${JSON.stringify(obj)}\n\n`);
  const done = () => { res.write('data: [DONE]\n\n'); res.end(); };

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
        stream: true,
        messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...history],
      }),
    });

    if (!upstream.ok) {
      const err = await upstream.text().catch(() => '');
      send({ error: `OpenRouter ${upstream.status}: ${err.slice(0, 300)}` });
      return done();
    }

    const reader = upstream.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done: finished, value } = await reader.read();
      if (finished) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const t = line.trim();
        if (!t.startsWith('data: ')) continue; // ignora comentarios/keep-alive
        const raw = t.slice(6).trim();
        if (raw === '[DONE]') return done();
        let chunk;
        try { chunk = JSON.parse(raw); } catch { continue; }
        const text = chunk.choices?.[0]?.delta?.content;
        if (typeof text === 'string' && text) send({ text });
      }
    }
    done();
  } catch (e) {
    try { send({ error: `Error de conexión: ${e.message}` }); done(); } catch (_) {}
  }
}