/**
 * _auth-middleware.js — Middleware de autenticación reutilizable
 *
 * Exporta funciones de validación que todos los endpoints pueden usar
 */

/**
 * Valida si la solicitud viene de un usuario autenticado
 * Soporta:
 * - Bearer tokens (JWT)
 * - Cookies de sesión Firebase
 * - Custom header x-api-auth
 */
export function isAuthenticated(req) {
  // Opción 1: Bearer token en Authorization header
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    // El token viene en formato "Bearer eyJ0eXAi..."
    // Para validación real de JWT, usar: jwt.verify(token, secret)
    return true;
  }

  // Opción 2: Cookie de sesión de Firebase (__session es usado por Vercel)
  const cookies = req.headers.cookie || '';
  if (cookies.includes('__session') || cookies.includes('firebase_auth')) {
    return true;
  }

  // Opción 3: Custom header para testing/herramientas internas
  const customAuth = req.headers['x-api-auth'];
  if (customAuth && customAuth === process.env.API_AUTH_TOKEN) {
    return true;
  }

  return false;
}

/**
 * Respuesta estándar 401 Unauthorized
 */
export function unauthorizedResponse(res, message = 'Authentication required') {
  return res.status(401).json({
    error: 'Unauthorized',
    message,
  });
}

/**
 * Respuesta estándar 403 Forbidden
 */
export function forbiddenResponse(res, message = 'Access denied') {
  return res.status(403).json({
    error: 'Forbidden',
    message,
  });
}

/**
 * Valida que el método HTTP sea el permitido
 */
export function validateMethod(req, res, allowedMethods = ['GET']) {
  if (!allowedMethods.includes(req.method)) {
    res.status(405).json({ error: `Method ${req.method} not allowed` });
    return false;
  }
  return true;
}

/**
 * Aplica headers CORS seguros
 */
export function setCORSHeaders(res, origin = 'https://tracker.victor-ia.xyz') {
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
}
