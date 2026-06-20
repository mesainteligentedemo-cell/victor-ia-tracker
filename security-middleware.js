/**
 * ==========================================
 * SECURITY MIDDLEWARE — Phase 9
 * ==========================================
 * HTTPS, rate limiting, headers, etc.
 */

import rateLimit from 'express-rate-limit';
import helmet from 'helmet';

/**
 * Rate limiting
 */

// General rate limit: 100 requests per 15 minutes
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.user?.role === 'admin', // Admins bypass
  keyGenerator: (req) => req.user?.id || req.ip
});

// Login rate limit: 5 attempts per 15 minutes
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many login attempts, please try again later',
  skip: (req) => req.method !== 'POST'
});

// API rate limit: 1000 requests per minute
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 1000,
  message: 'API rate limit exceeded',
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Security headers
 */
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      scriptSrc: ["'self'", "https://cdn.jsdelivr.net"],
      imageSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://tracker.victor-ia.xyz"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: []
    }
  },
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  xssFilter: true,
  noSniff: true,
  xssFilter: true
});

/**
 * CORS configuration
 */
export function corsMiddleware(req, res, next) {
  const allowedOrigins = [
    'https://tracker.victor-ia.xyz',
    'https://localhost:3456',
    'http://localhost:3456',
    'http://localhost:8000',
    process.env.ALLOWED_ORIGIN || ''
  ].filter(Boolean);

  const origin = req.headers.origin;

  if (allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  }

  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Max-Age', '3600');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }

  next();
}

/**
 * HTTPS redirect
 */
export function httpsRedirect(req, res, next) {
  if (process.env.NODE_ENV === 'production') {
    if (req.header('x-forwarded-proto') !== 'https') {
      return res.redirect(301, `https://${req.header('host')}${req.url}`);
    }
  }
  next();
}

/**
 * Request logging (security)
 */
export function logRequest(req, res, next) {
  const startTime = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const log = {
      timestamp: new Date().toISOString(),
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: duration + 'ms',
      ip: req.ip,
      userAgent: req.get('user-agent'),
      userId: req.user?.id || 'anonymous'
    };

    // Log suspicious activity
    if (res.statusCode === 401 || res.statusCode === 403) {
      console.warn('[SECURITY]', JSON.stringify(log));
    }

    // Log slow requests
    if (duration > 5000) {
      console.warn('[SLOW REQUEST]', JSON.stringify(log));
    }
  });

  next();
}

/**
 * Input validation & sanitization
 */
export function validateInput(req, res, next) {
  // Check for SQL injection patterns
  const sqlPatterns = /('|(\\|")|(--|#)|(\*)|(\bor\b|\band\b|\bunion\b|\bselect\b|\bfrom\b|\bwhere\b)/gi;

  const checkValue = (val) => {
    if (typeof val === 'string' && sqlPatterns.test(val)) {
      console.warn(`[SQL INJECTION ATTEMPT] ${req.path} - ${val}`);
      return false;
    }
    return true;
  };

  // Check query parameters
  for (const key in req.query) {
    if (!checkValue(req.query[key])) {
      return res.status(400).json({ error: 'Invalid input detected' });
    }
  }

  // Check body
  if (req.body && typeof req.body === 'object') {
    for (const key in req.body) {
      if (!checkValue(req.body[key])) {
        return res.status(400).json({ error: 'Invalid input detected' });
      }
    }
  }

  next();
}

/**
 * IP whitelist (optional)
 */
export function ipWhitelist(whitelist = []) {
  return (req, res, next) => {
    if (whitelist.length === 0) {
      return next(); // No whitelist, allow all
    }

    const clientIp = req.ip || req.connection.remoteAddress;

    if (whitelist.includes(clientIp)) {
      return next();
    }

    console.warn(`[IP BLOCKED] ${clientIp} - ${req.path}`);
    res.status(403).json({ error: 'Access denied' });
  };
}

/**
 * Request size limit
 */
export function requestSizeLimit(req, res, next) {
  const maxSize = 1024 * 1024; // 1MB
  const size = parseInt(req.headers['content-length'], 10);

  if (size > maxSize) {
    return res.status(413).json({ error: 'Request too large' });
  }

  next();
}

/**
 * Security check before update/delete
 */
export async function requireConfirmation(req, res, next) {
  if (['PUT', 'DELETE'].includes(req.method)) {
    const confirmHeader = req.headers['x-confirm-action'];

    if (!confirmHeader) {
      return res.status(400).json({
        error: 'Confirmation required',
        message: 'Please send X-Confirm-Action header',
        action: `${req.method} ${req.path}`
      });
    }
  }

  next();
}

/**
 * Error handling
 */
export function errorHandler(err, req, res, next) {
  console.error('[ERROR]', err);

  // Don't expose internal errors
  const isDev = process.env.NODE_ENV === 'development';

  res.status(err.status || 500).json({
    error: isDev ? err.message : 'Internal server error',
    ...(isDev && { stack: err.stack })
  });
}

/**
 * Combine all security middlewares
 */
export function applySecurity(app) {
  // HTTPS redirect
  app.use(httpsRedirect);

  // Security headers
  app.use(securityHeaders);

  // CORS
  app.use(corsMiddleware);

  // Request logging
  app.use(logRequest);

  // Request size limit
  app.use(requestSizeLimit);

  // Input validation
  app.use(validateInput);

  // Rate limiting
  app.use(generalLimiter);

  console.log('✅ Security middleware applied');
}

export default {
  generalLimiter,
  loginLimiter,
  apiLimiter,
  securityHeaders,
  corsMiddleware,
  httpsRedirect,
  logRequest,
  validateInput,
  ipWhitelist,
  requestSizeLimit,
  requireConfirmation,
  errorHandler,
  applySecurity
};