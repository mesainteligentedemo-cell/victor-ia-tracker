/**
 * /api/email/debug — Diagnóstico de variables de entorno de email
 *
 * GET /api/email/debug
 *
 * Devuelve qué variables de entorno VE realmente la function en Vercel,
 * sin exponer los valores secretos. Sirve para confirmar si Vercel está
 * pasando RESEND_API_KEY / EMAIL_FROM a las serverless functions.
 */
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-store');

  return res.status(200).json({
    ok: true,
    runtime: 'node',
    node_version: process.version,
    has_resend_key: !!process.env.RESEND_API_KEY,
    resend_key_length: process.env.RESEND_API_KEY?.length || 0,
    resend_key_prefix: process.env.RESEND_API_KEY ? process.env.RESEND_API_KEY.slice(0, 3) : null,
    has_email_from: !!process.env.EMAIL_FROM,
    email_from_value: process.env.EMAIL_FROM || 'undefined',
    has_n8n_email_webhook: !!process.env.N8N_EMAIL_WEBHOOK_URL,
    has_n8n_webhook: !!process.env.N8N_WEBHOOK_URL,
    // Lista de claves de env que contienen estas palabras (sin valores),
    // para detectar errores de mayúsculas/minúsculas o nombres mal escritos.
    matching_env_keys: Object.keys(process.env).filter((k) =>
      /resend|email|n8n/i.test(k)
    ),
    vercel_env: process.env.VERCEL_ENV || 'unknown'
  });
}