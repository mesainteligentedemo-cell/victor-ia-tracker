/**
 * /api/email/send — Envío de email real (con CC y adjuntos) del Tracker Victor IA
 *
 * POST /api/email/send
 * {
 *   "to": "correo@dominio.com",
 *   "cc": ["otro@dominio.com"],            // opcional
 *   "subject": "...",
 *   "html": "...",
 *   "text": "...",                          // opcional
 *   "attachments": [                        // opcional (Resend)
 *     { "filename": "reporte.pdf", "content": "<base64>" }
 *   ]
 * }
 *
 * Usa el MISMO RESEND_API_KEY / EMAIL_FROM que /api/email/test.
 * SEGURIDAD: solo permite destinatarios de la allowlist (anti open-relay).
 */

const DEFAULT_FROM = process.env.EMAIL_FROM || 'Victor IA <info@victor-ia.com.mx>';

const ALLOWED_RECIPIENTS = [
  'mesainteligentedemo@gmail.com',
  'chrisoria16@gmail.com',
  'eldudemateos@gmail.com'
];
const ALLOWED_DOMAINS = ['victor-ia.com.mx', 'victor-ia.xyz'];

function isAllowed(addr) {
  const a = String(addr || '').trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(a)) return false;
  if (ALLOWED_RECIPIENTS.includes(a)) return true;
  const domain = a.split('@')[1];
  return ALLOWED_DOMAINS.includes(domain);
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed. Use POST.' });
  }

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    return res.status(503).json({ ok: false, error: 'RESEND_API_KEY no configurada en este proyecto.' });
  }

  const body = req.body || {};
  const to = String(body.to || '').trim();
  const subject = String(body.subject || '').trim();
  const html = body.html ? String(body.html) : null;
  const text = body.text ? String(body.text) : null;

  if (!to || !subject || (!html && !text)) {
    return res.status(400).json({ ok: false, error: 'Faltan campos: to, subject y html o text.' });
  }
  if (!isAllowed(to)) {
    return res.status(403).json({ ok: false, error: `Destinatario no permitido: ${to}` });
  }

  const cc = Array.isArray(body.cc) ? body.cc.filter(isAllowed) : [];

  // Adjuntos: validar forma y límite de tamaño total (~15 MB base64)
  let attachments;
  if (Array.isArray(body.attachments) && body.attachments.length > 0) {
    attachments = [];
    let totalLen = 0;
    for (const att of body.attachments.slice(0, 5)) {
      if (!att || !att.filename || !att.content) continue;
      const content = String(att.content);
      totalLen += content.length;
      if (totalLen > 15 * 1024 * 1024) {
        return res.status(413).json({ ok: false, error: 'Adjuntos exceden 15 MB.' });
      }
      attachments.push({ filename: String(att.filename).slice(0, 120), content });
    }
    if (attachments.length === 0) attachments = undefined;
  }

  const payload = {
    from: String(body.from || DEFAULT_FROM),
    to: [to],
    subject,
    ...(html ? { html } : {}),
    ...(text ? { text } : {}),
    ...(cc.length ? { cc } : {}),
    ...(attachments ? { attachments } : {})
  };

  try {
    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      console.error('[email/send] Resend error:', resp.status, data);
      return res.status(resp.status).json({ ok: false, error: data?.message || `Resend error ${resp.status}` });
    }
    return res.status(200).json({ ok: true, via: 'resend', to, cc, id: data.id || null, attachments: attachments ? attachments.length : 0 });
  } catch (err) {
    console.error('[email/send] Error:', err.message);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
