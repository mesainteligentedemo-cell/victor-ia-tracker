// api/_lib/generators.js — shared helpers for Higgsfield + ElevenLabs
// Used by /api/chat.js (tool execution) and /api/asset-status.js (video polling).

const HF_BASE = 'https://platform.higgsfield.ai';
const EL_BASE = 'https://api.elevenlabs.io';
const OR_URL = 'https://openrouter.ai/api/v1/chat/completions';
const OR_MODEL = 'anthropic/claude-opus-4-8';

// ---- Higgsfield defaults (verified against platform.higgsfield.ai) ----------
// Soul text2image: prompt + width_and_height (fixed enum) + enhance_prompt.
// style_id is OPTIONAL — when omitted the API picks a valid default style.
// Valid width_and_height values (subset we use):
const HF_WH = {
  landscape: '2048x1536',
  portrait: '1536x2048',
  square: '1536x1536',
};
// DoP image2video: prompt + model + input_images[{type:'image_url',image_url}]
// motions are auto-assigned by the API when omitted.

function hfHeaders() {
  const id = process.env.HIGGSFIELD_ID;
  const secret = process.env.HIGGSFIELD_SECRET;
  if (!id || !secret) throw new Error('HIGGSFIELD_ID / HIGGSFIELD_SECRET no configuradas');
  return {
    'Authorization': `Key ${id}:${secret}`,
    'Content-Type': 'application/json',
  };
}

function randSeed() {
  return Math.floor(Math.random() * 1_000_000) + 1;
}

// Try to dig a media URL out of a Higgsfield jobset/status payload, whatever the shape.
function extractUrl(obj) {
  if (!obj || typeof obj !== 'object') return null;
  // jobs[0].results.raw.url | results.min.url
  const jobs = obj.jobs || obj.job_set?.jobs || obj.jobset?.jobs;
  if (Array.isArray(jobs)) {
    for (const j of jobs) {
      const r = j?.results || j?.result;
      const u = r?.raw?.url || r?.min?.url || r?.url || j?.url;
      if (typeof u === 'string') return u;
    }
  }
  const r = obj.results || obj.result;
  const u = r?.raw?.url || r?.min?.url || r?.url || obj.url || obj.output_url;
  return typeof u === 'string' ? u : null;
}

// Status string out of any shape.
function extractStatus(obj) {
  const jobs = obj?.jobs || obj?.job_set?.jobs;
  const js = Array.isArray(jobs) && jobs[0] ? jobs[0].status : null;
  return (obj?.status || js || '').toLowerCase();
}

// Submit a Higgsfield generation. Body shape is { params: {...} }.
// Returns { request_id (job-set id), raw }.
async function hfSubmit(path, input) {
  const resp = await fetch(`${HF_BASE}${path}`, {
    method: 'POST',
    headers: hfHeaders(),
    body: JSON.stringify({ params: input }),
  });
  const text = await resp.text();
  let data; try { data = JSON.parse(text); } catch { data = { raw: text }; }
  if (!resp.ok) {
    throw new Error(`Higgsfield ${path} ${resp.status}: ${text.slice(0, 240)}`);
  }
  const request_id = data.id || data.request_id || data.job_set?.id || null;
  return { request_id, data };
}

// Poll a Higgsfield job-set once. Returns { status, url, raw }.
async function hfPoll(requestId) {
  const resp = await fetch(`${HF_BASE}/v1/job-sets/${requestId}`, { headers: hfHeaders() });
  if (!resp.ok) {
    const t = await resp.text().catch(() => '');
    throw new Error(`Poll ${resp.status}: ${t.slice(0, 160)}`);
  }
  const data = await resp.json();
  return { status: extractStatus(data) || 'in_progress', url: extractUrl(data), raw: data };
}

// Poll until terminal or timeout (ms). Returns { status, url }.
async function hfWait(requestId, { timeoutMs = 45000, intervalMs = 2500 } = {}) {
  const deadline = Date.now() + timeoutMs;
  let last = { status: 'in_progress', url: null };
  while (Date.now() < deadline) {
    last = await hfPoll(requestId);
    if (last.url) return { status: 'completed', url: last.url };
    if (['failed', 'nsfw', 'error'].includes(last.status)) {
      return { status: last.status, url: null };
    }
    if (last.status === 'completed' && last.url) return last;
    await new Promise(r => setTimeout(r, intervalMs));
  }
  return last; // probably still in_progress -> caller keeps polling client-side
}

// ---- Public: generate image (inline, waits up to timeout) --------------------
async function generateImage({ description, aspect = 'landscape', timeoutMs = 40000 }) {
  const input = {
    prompt: description,
    width_and_height: HF_WH[aspect] || HF_WH.landscape,
    enhance_prompt: true,
    seed: randSeed(),
    style_strength: 1,
    // style_id omitted on purpose -> API uses a valid default style
  };
  const { request_id } = await hfSubmit('/v1/text2image/soul', input);
  if (!request_id) throw new Error('Higgsfield no devolvió request_id (imagen)');
  const res = await hfWait(request_id, { timeoutMs });
  return { type: 'image', request_id, status: res.status, url: res.url };
}

// ---- Public: generate video --------------------------------------------------
// DoP needs a source image. We first make an image from the description,
// then animate it. Returns request_id so the client can poll to completion.
async function generateVideo({ description, duration = 5 }) {
  // Shorter image wait so the whole request fits within Vercel's 60s limit.
  const img = await generateImage({ description, aspect: 'landscape', timeoutMs: 28000 });
  if (!img.url) {
    // Image (source frame) not ready yet -> client polls its job-set, then
    // can request the video. We return the image request_id as a fallback asset.
    return {
      type: 'video', stage: 'image_pending',
      status: 'in_progress', request_id: img.request_id, url: null, poster: null,
    };
  }
  const input = {
    prompt: description,
    model: duration >= 8 ? 'dop-preview' : 'dop-turbo',
    enhance_prompt: true,
    seed: randSeed(),
    input_images: [{ type: 'image_url', image_url: img.url }],
    check_nsfw: true,
  };
  const { request_id } = await hfSubmit('/v1/image2video/dop', input);
  if (!request_id) throw new Error('Higgsfield no devolvió request_id (video)');
  // DoP rendering takes minutes -> return immediately, client polls /api/asset-status.
  return {
    type: 'video',
    request_id,
    poster: img.url,
    status: 'in_progress',
    url: null,
  };
}

// ---- Public: ElevenLabs voice ------------------------------------------------
// Returns a data URL (base64 mp3) so the frontend can play it with no extra route.
async function generateVoice({ text, language = 'es' }) {
  const key = process.env.ELEVENLABS_API_KEY;
  const voiceId = process.env.ELEVENLABS_VOICE_ID;
  if (!key || !voiceId) throw new Error('ELEVENLABS_API_KEY / ELEVENLABS_VOICE_ID no configuradas');

  const resp = await fetch(`${EL_BASE}/v1/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: {
      'xi-api-key': key,
      'Content-Type': 'application/json',
      'Accept': 'audio/mpeg',
    },
    body: JSON.stringify({
      text,
      model_id: 'eleven_multilingual_v2',
      voice_settings: { stability: 0.5, similarity_boost: 0.85, style: 0.2, use_speaker_boost: true },
    }),
  });
  if (!resp.ok) {
    const errText = await resp.text().catch(() => '');
    throw new Error(`ElevenLabs ${resp.status}: ${errText.slice(0, 240)}`);
  }
  const buf = Buffer.from(await resp.arrayBuffer());
  return { type: 'voice', mime: 'audio/mpeg', dataUrl: `data:audio/mpeg;base64,${buf.toString('base64')}`, bytes: buf.length };
}

// ---- Public: OpenRouter text (outlines, quiz JSON, copy) ---------------------
// Returns the assistant text string. Throws if the key is missing or the call fails.
async function generateText({ system, prompt, maxTokens = 1500, json = false }) {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error('OPENROUTER_API_KEY no configurada');
  const messages = [];
  if (system) messages.push({ role: 'system', content: system });
  messages.push({ role: 'user', content: prompt });
  const resp = await fetch(OR_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://tracker.victor-ia.xyz',
      'X-Title': 'Victor IA Tracker',
    },
    body: JSON.stringify({
      model: OR_MODEL,
      max_tokens: maxTokens,
      stream: false,
      messages,
      ...(json ? { response_format: { type: 'json_object' } } : {}),
    }),
  });
  if (!resp.ok) {
    const t = await resp.text().catch(() => '');
    throw new Error(`OpenRouter ${resp.status}: ${t.slice(0, 240)}`);
  }
  const data = await resp.json();
  return (data?.choices?.[0]?.message?.content || '').trim();
}

// Best-effort JSON parse: strips ```json fences and trailing prose.
function safeJson(str, fallback = null) {
  if (!str) return fallback;
  let s = str.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  try { return JSON.parse(s); } catch {}
  const m = s.match(/[\{\[][\s\S]*[\}\]]/);
  if (m) { try { return JSON.parse(m[0]); } catch {} }
  return fallback;
}

// ---- Public: submit a Higgsfield video (image->video) WITHOUT waiting --------
// Given an existing source image URL, kicks off DoP and returns { request_id }.
// The client / poller upgrades poster -> final MP4 via /api/asset-status.
async function submitVideoFromImage({ description, imageUrl, duration = 5 }) {
  const input = {
    prompt: description,
    model: duration >= 8 ? 'dop-preview' : 'dop-turbo',
    enhance_prompt: true,
    seed: randSeed(),
    input_images: [{ type: 'image_url', image_url: imageUrl }],
    check_nsfw: true,
  };
  const { request_id } = await hfSubmit('/v1/image2video/dop', input);
  if (!request_id) throw new Error('Higgsfield no devolvió request_id (video)');
  return { request_id };
}

export {
  generateImage,
  generateVideo,
  generateVoice,
  generateText,
  submitVideoFromImage,
  safeJson,
  hfPoll,
};