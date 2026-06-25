// /api/chat.js — Vercel serverless: chat con OpenRouter (Claude Opus 4.8) + tool_use
// Tools: generate_image (Higgsfield), generate_video (Higgsfield), generate_voice (ElevenLabs)
//
// Frontend: POST { message, conversationHistory:[{role,content}] }
// Respuesta: { ok, response, id, assets:[{kind,url|dataUrl,request_id,status,poster,description}] }
//
// Env: OPENROUTER_API_KEY, HIGGSFIELD_ID, HIGGSFIELD_SECRET, ELEVENLABS_API_KEY, ELEVENLABS_VOICE_ID

import { generateImage, generateVideo, generateVoice } from './_lib/generators.js';

export const config = { maxDuration: 60 };

const OR_URL = 'https://openrouter.ai/api/v1/chat/completions';
// Claude Opus 4.8 via OpenRouter (1M context variant)
const MODEL = 'anthropic/claude-opus-4-8';

const SYSTEM_PROMPT =
  'Eres Victor IA, asistente experto y creativo de la plataforma Victor IA. ' +
  'Respondes en español, claro y con autoridad. ' +
  'Tienes herramientas reales para CREAR contenido: generar imágenes (generate_image), ' +
  'generar videos (generate_video) y generar voice overs (generate_voice). ' +
  'Cuando el usuario pida crear una imagen, un video o una locución/voz, USA la herramienta correspondiente — ' +
  'no describas el resultado, créalo. Para voz, pasa el texto exacto a leer. ' +
  'Después de invocar una herramienta, confirma brevemente qué generaste.';

// ---- Tool schema (OpenAI/OpenRouter "tools" format) --------------------------
const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'generate_image',
      description: 'Genera una imagen a partir de una descripción usando Higgsfield (modelo Soul). Úsala cuando el usuario pida crear/generar/diseñar una imagen, logo, ilustración o visual.',
      parameters: {
        type: 'object',
        properties: {
          description: { type: 'string', description: 'Descripción detallada de la imagen a generar (en inglés produce mejores resultados).' },
          aspect: { type: 'string', enum: ['landscape', 'portrait', 'square'], description: 'Relación de aspecto. Default landscape.' },
        },
        required: ['description'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'generate_video',
      description: 'Genera un video corto a partir de una descripción usando Higgsfield (image-to-video DoP). Úsala cuando el usuario pida crear/generar un video o clip.',
      parameters: {
        type: 'object',
        properties: {
          description: { type: 'string', description: 'Descripción detallada del video/escena a generar.' },
          duration: { type: 'number', description: 'Duración deseada en segundos (orientativa). Default 5.' },
        },
        required: ['description'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'generate_voice',
      description: 'Genera un voice over (locución MP3) con ElevenLabs leyendo un texto. Úsala cuando el usuario pida una voz, locución, narración o voice over.',
      parameters: {
        type: 'object',
        properties: {
          text: { type: 'string', description: 'Texto EXACTO que debe leer la voz.' },
          language: { type: 'string', description: 'Idioma del texto, ej. "es", "es-MX", "en". Default es.' },
        },
        required: ['text'],
      },
    },
  },
];

function makeId() {
  return 'msg_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

async function callOpenRouter(key, messages, withTools) {
  const resp = await fetch(OR_URL, {
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
      messages,
      ...(withTools ? { tools: TOOLS, tool_choice: 'auto' } : {}),
    }),
  });
  if (!resp.ok) {
    const t = await resp.text().catch(() => '');
    throw new Error(`OpenRouter ${resp.status}: ${t.slice(0, 300)}`);
  }
  return resp.json();
}

// Execute one tool call -> { toolResultContent (string for the model), asset (for UI) }
async function runTool(name, args) {
  try {
    if (name === 'generate_image') {
      const r = await generateImage({ description: args.description, aspect: args.aspect || 'landscape' });
      const asset = { kind: 'image', url: r.url, request_id: r.request_id, status: r.url ? 'completed' : 'in_progress', description: args.description };
      const summary = r.url ? `Imagen generada: ${r.url}` : `Imagen en proceso (request_id ${r.request_id}).`;
      return { summary, asset };
    }
    if (name === 'generate_video') {
      const r = await generateVideo({ description: args.description, duration: args.duration || 5 });
      const asset = { kind: 'video', url: r.url, poster: r.poster, request_id: r.request_id, status: r.status, description: args.description };
      const summary = r.url
        ? `Video generado: ${r.url}`
        : `Video en proceso (request_id ${r.request_id}). El cliente lo mostrará al completarse.`;
      return { summary, asset };
    }
    if (name === 'generate_voice') {
      const r = await generateVoice({ text: args.text, language: args.language || 'es' });
      const asset = { kind: 'voice', dataUrl: r.dataUrl, status: 'completed', text: args.text };
      return { summary: `Voice over generado (${(r.bytes / 1024).toFixed(0)} KB de audio MP3).`, asset };
    }
    return { summary: `Herramienta desconocida: ${name}`, asset: null };
  } catch (e) {
    return { summary: `Error al ejecutar ${name}: ${e.message}`, asset: null };
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) return res.status(500).json({ ok: false, error: 'OPENROUTER_API_KEY no configurada' });

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
  body = body || {};

  // Build history
  let history = [];
  if (Array.isArray(body.messages)) {
    history = body.messages;
  } else {
    const prior = Array.isArray(body.conversationHistory) ? body.conversationHistory : [];
    history = [...prior];
    if (typeof body.message === 'string' && body.message.trim()) {
      history.push({ role: 'user', content: body.message });
    }
  }
  history = history
    .filter(m => (m?.role === 'user' || m?.role === 'assistant') && typeof m?.content === 'string')
    .map(m => ({ role: m.role, content: m.content }))
    .slice(-30);

  if (!history.length || history[history.length - 1].role !== 'user') {
    return res.status(400).json({ ok: false, error: 'Se requiere al menos un mensaje de usuario' });
  }

  const messages = [{ role: 'system', content: SYSTEM_PROMPT }, ...history];
  const assets = [];

  try {
    // Round 1: model may request tools
    let data = await callOpenRouter(key, messages, true);
    let choice = data?.choices?.[0]?.message;
    const toolCalls = choice?.tool_calls || [];

    if (toolCalls.length) {
      // Echo the assistant turn that requested the tools
      messages.push({
        role: 'assistant',
        content: choice.content || '',
        tool_calls: toolCalls,
      });

      // Execute each tool, append tool results
      for (const tc of toolCalls) {
        let args = {};
        try { args = JSON.parse(tc.function?.arguments || '{}'); } catch { args = {}; }
        const { summary, asset } = await runTool(tc.function?.name, args);
        if (asset) assets.push(asset);
        messages.push({
          role: 'tool',
          tool_call_id: tc.id,
          content: summary,
        });
      }

      // Round 2: model writes final natural-language reply with tool results in context
      data = await callOpenRouter(key, messages, false);
      choice = data?.choices?.[0]?.message;
    }

    const response = (choice?.content || '').trim()
      || (assets.length ? 'Listo, aquí tienes el resultado.' : '');

    if (!response && !assets.length) {
      return res.status(502).json({ ok: false, error: 'Respuesta vacía del modelo' });
    }

    return res.status(200).json({
      ok: true,
      response: response || 'Listo.',
      assets,
      id: data?.id || makeId(),
    });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
}