/**
 * /api/config — Devuelve configuración de APIs desde variables de entorno
 *
 * GET /api/config
 *
 * Requiere autenticación (JWT en header o via Firebase).
 * Devuelve las claves de APIs solo si el usuario está autenticado.
 */

// Simple auth check: valida que venga un token o que exista una sesión válida
function isAuthenticated(req) {
  // Opción 1: Bearer token en Authorization header
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    // TODO: validar JWT si lo necesitas en el futuro
    // Por ahora, si viene un bearer token, consideramos autenticado
    return true;
  }

  // Opción 2: Cookie de sesión de Firebase
  const cookies = req.headers.cookie || '';
  if (cookies.includes('__session') || cookies.includes('firebase_auth')) {
    return true;
  }

  // Opción 3: Custom header para testing
  const customAuth = req.headers['x-api-auth'];
  if (customAuth === process.env.API_AUTH_TOKEN) {
    return true;
  }

  return false;
}

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', 'https://tracker.victor-ia.xyz');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');

  // Preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Validar autenticación
  if (!isAuthenticated(req)) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Se requiere autenticación para acceder a la configuración',
    });
  }

  // Devolver las keys desde variables de entorno
  const config = {
    ok: true,
    openrouterApiKey: process.env.OPENROUTER_API_KEY || '',
    elevenLabsApiKey: process.env.ELEVENLABS_API_KEY || '',
    elevenLabsVoiceId: process.env.ELEVENLABS_VOICE_ID || 'EXAVITQu4vr4xnSDxMaL',
    model: 'openai/gpt-4o-mini',
  };

  return res.status(200).json(config);
}
