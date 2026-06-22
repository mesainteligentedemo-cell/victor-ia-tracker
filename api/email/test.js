/**
 * /api/email/test — Envío de email de prueba del Tracker Victor IA
 *
 * GET  /api/email/test?to=correo@dominio.com
 * POST /api/email/test   { "to": "correo@dominio.com", "subject": "...", "html": "..." }
 *
 * Estrategia de envío (en orden de preferencia):
 *   1) Resend  — si RESEND_API_KEY está configurada (envío directo).
 *   2) n8n     — si N8N_EMAIL_WEBHOOK_URL o N8N_WEBHOOK_URL está configurada
 *                (reenvía el payload de email al workflow de n8n).
 *
 * Devuelve siempre JSON con { ok, via, to, ... } para diagnóstico claro.
 *
 * Env (Vercel → Settings → Environment Variables):
 *   RESEND_API_KEY          (opcional) — re_...
 *   EMAIL_FROM              (opcional) — "Victor IA Tracker <info@victor-ia.com.mx>"
 *   N8N_EMAIL_WEBHOOK_URL   (opcional) — webhook n8n dedicado a email
 *   N8N_WEBHOOK_URL         (opcional) — webhook n8n genérico (fallback)
 */

const DEFAULT_TO = 'mesainteligentedemo@gmail.com';
const DEFAULT_FROM = process.env.EMAIL_FROM || 'Victor IA Tracker <info@victor-ia.com.mx>';

function buildTestEmail(to) {
  const now = new Date().toISOString();
  const subject = 'Prueba de email — Victor IA Tracker';
  const html = `<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8"></head>
<body style="margin:0;background:#070809;font-family:'Space Grotesk',Arial,sans-serif;color:#f4f4f4;">
  <div style="max-width:560px;margin:0 auto;padding:40px 28px;">
    <div style="border:1px solid #FFAA17;border-radius:14px;padding:32px;background:#0d0e10;">
      <h1 style="margin:0 0 12px;font-size:20px;color:#FFAA17;letter-spacing:.03em;">Victor IA Tracker</h1>
      <p style="margin:0 0 18px;font-size:15px;line-height:1.6;color:#cfcfcf;">
        Este es un <strong>email de prueba</strong> enviado desde el endpoint
        <code style="color:#FFAA17;">/api/email/test</code>. Si lo recibes, el envío de
        correos del tracker está funcionando correctamente.
      </p>
      <table style="width:100%;font-size:13px;color:#9a9a9a;border-top:1px solid #222;padding-top:14px;">
        <tr><td style="padding:4px 0;">Destinatario</td><td style="text-align:right;color:#f4f4f4;">${to}</td></tr>
        <tr><td style="padding:4px 0;">Generado</td><td style="text-align:right;color:#f4f4f4;">${now}</td></tr>
      </table>
    </div>
    <p style="text-align:center;font-size:11px;color:#555;margin-top:18px;">Victor IA · Envío automatizado · No responder</p>
  </div>
</body></html>`;
  const text = `Victor IA Tracker — Email de prueba\n\nEste es un email de prueba enviado desde /api/email/test.\nSi lo recibes, el envio de correos del tracker funciona.\n\nDestinatario: ${to}\nGenerado: ${now}`;
  return { subject, html, text };
}

async function sendViaResend({ to, from, subject, html, text }) {
  const resp = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ from, to: [to], subject, html, text })
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    const err = new Error(data?.message || `Resend error ${resp.status}`);
    err.status = resp.status;
    err.detail = data;
    throw err;
  }
  return { id: data.id || null };
}

async function sendViaN8n({ to, from, subject, html, text, webhookUrl }) {
  const resp = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'email',
      source: 'tracker-api',
      timestamp: new Date().toISOString(),
      email: { to, from, subject, html, text }
    })
  });
  if (!resp.ok) {
    const body = await resp.text().catch(() => '');
    const err = new Error(`n8n webhook error ${resp.status}: ${body.slice(0, 200)}`);
    err.status = resp.status;
    throw err;
  }
  return { forwarded: true };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  // Resolver destinatario / contenido desde query (GET) o body (POST)
  const q = req.query || {};
  const body = req.method === 'POST' ? (req.body || {}) : {};
  const to = (body.to || q.to || DEFAULT_TO).toString().trim();
  const from = (body.from || DEFAULT_FROM).toString().trim();

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) {
    return res.status(400).json({ ok: false, error: `Destinatario inválido: ${to}` });
  }

  const base = buildTestEmail(to);
  const subject = (body.subject || base.subject).toString();
  const html = (body.html || base.html).toString();
  const text = (body.text || base.text).toString();

  const resendKey = process.env.RESEND_API_KEY;
  const n8nUrl = process.env.N8N_EMAIL_WEBHOOK_URL || process.env.N8N_WEBHOOK_URL;

  try {
    if (resendKey) {
      const r = await sendViaResend({ to, from, subject, html, text });
      return res.status(200).json({ ok: true, via: 'resend', to, from, id: r.id });
    }
    if (n8nUrl) {
      await sendViaN8n({ to, from, subject, html, text, webhookUrl: n8nUrl });
      return res.status(200).json({ ok: true, via: 'n8n', to, from });
    }
    // Ningún proveedor configurado — diagnóstico claro, no un 500 silencioso.
    return res.status(503).json({
      ok: false,
      via: 'none',
      to,
      error: 'No hay proveedor de email configurado.',
      fix: 'Agrega RESEND_API_KEY (y EMAIL_FROM) o N8N_EMAIL_WEBHOOK_URL en Vercel → Settings → Environment Variables, luego redeploy.'
    });
  } catch (err) {
    console.error('[email/test] Error:', err.message, err.detail || '');
    return res.status(err.status || 500).json({
      ok: false,
      via: resendKey ? 'resend' : 'n8n',
      to,
      error: err.message || 'Error enviando email'
    });
  }
}
