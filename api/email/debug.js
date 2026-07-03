/**
 * /api/email/debug — Diagnóstico de variables de entorno de email (PROTEGIDO)
 *
 * GET /api/email/debug
 *
 * Devuelve qué variables de entorno VE realmente la function en Vercel,
 * sin exponer los valores secretos. Requiere autenticación.
 */

function isAuthenticated(req) {
  // Opción 1: Bearer token
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return true;
  }

  // Opción 2: Cookie de sesión
  const cookies = req.headers.cookie || '';
  if (cookies.includes('__session') || cookies.includes('firebase_auth')) {
    return true;
  }

  // Opción 3: Custom header
  const customAuth = req.headers['x-api-auth'];
  if (customAuth === process.env.API_AUTH_TOKEN) {
    return true;
  }

  return false;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', 'https://tracker.victor-ia.xyz');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // PROTECCIÓN: Requiere autenticación
  if (!isAuthenticated(req)) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Se requiere autenticación para acceder a diagnóstico',
    });
  }

  return res.status(200).json({
    ok: true,
    runtime: 'node',
    node_version: process.version,
    has_resend_key: !!process.env.RESEND_API_KEY,
    resend_key_length: process.env.RESEND_API_KEY?.length || 0,
    has_email_from: !!process.env.EMAIL_FROM,
    has_n8n_email_webhook: !!process.env.N8N_EMAIL_WEBHOOK_URL,
    has_n8n_webhook: !!process.env.N8N_WEBHOOK_URL,
    matching_env_keys: Object.keys(process.env).filter((k) =>
      /resend|email|n8n/i.test(k)
    ),
    vercel_env: process.env.VERCEL_ENV || 'unknown'
  });
}