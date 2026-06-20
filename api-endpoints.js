/**
 * ==========================================
 * API ENDPOINTS — THE DOOR Real Data Server
 * ==========================================
 * Express.js server que sirve datos reales en vivo
 * para los dashboards del tracker
 *
 * Ejecutar: node api-endpoints.js
 * URL: http://localhost:3456/api/...
 */

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');
const http = require('http');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(cors());
app.use(express.json());

// ==========================================
// DATA CACHE (in-memory store)
// ==========================================
let dataCache = {
  loops: { active: [], all: [], stats: {} },
  context: { tokensUsed: 0, tokenBudget: 200000 },
  projects: { clientsActive: 0, projectsCompleted: 0 },
  roadmap: { phases: [] },
  aiLayer: {},
  lastUpdated: new Date().toISOString(),
  alerts: []
};

// ==========================================
// HELPER: Read live-data.json
// ==========================================
function refreshDataCache() {
  try {
    const dataFile = path.join(__dirname, 'live-data.json');
    if (fs.existsSync(dataFile)) {
      const raw = fs.readFileSync(dataFile, 'utf-8');
      const data = JSON.parse(raw);

      // Merge con cache existente
      dataCache = {
        ...dataCache,
        ...data,
        lastUpdated: new Date().toISOString()
      };

      // Broadcast a todos los WebSocket clients
      broadcastToClients({ type: 'data-update', data: dataCache });

      return true;
    }
  } catch (err) {
    console.error('[CACHE] Error refreshing:', err);
  }
  return false;
}

// Refresh cada 5 segundos
setInterval(refreshDataCache, 5000);

// ==========================================
// WEBSOCKET CONNECTIONS
// ==========================================
const connectedClients = new Set();

wss.on('connection', (ws) => {
  console.log(`[WS] Client connected (total: ${wss.clients.size})`);
  connectedClients.add(ws);

  // Enviar datos inmediatamente al conectarse
  ws.send(JSON.stringify({
    type: 'connected',
    data: dataCache,
    timestamp: new Date().toISOString()
  }));

  ws.on('message', (message) => {
    try {
      const msg = JSON.parse(message);
      console.log(`[WS] Message from client:`, msg.type);

      // Echo back con timestamp
      ws.send(JSON.stringify({
        type: 'ack',
        requestType: msg.type,
        timestamp: new Date().toISOString()
      }));
    } catch (err) {
      console.error('[WS] Parse error:', err);
    }
  });

  ws.on('close', () => {
    connectedClients.delete(ws);
    console.log(`[WS] Client disconnected (total: ${wss.clients.size})`);
  });

  ws.on('error', (err) => {
    console.error('[WS] Error:', err);
  });
});

// Broadcast function
function broadcastToClients(message) {
  const payload = JSON.stringify({
    ...message,
    timestamp: new Date().toISOString()
  });

  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
}

// ==========================================
// REST API ENDPOINTS
// ==========================================

// GET /api/health
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    wsConnections: wss.clients.size,
    cacheLastUpdated: dataCache.lastUpdated
  });
});

// GET /api/loops/active
app.get('/api/loops/active', (req, res) => {
  res.json({
    data: dataCache.loops.active,
    stats: dataCache.loops.stats,
    timestamp: new Date().toISOString()
  });
});

// GET /api/loops/all
app.get('/api/loops/all', (req, res) => {
  res.json({
    data: dataCache.loops.all,
    count: (dataCache.loops.all || []).length,
    timestamp: new Date().toISOString()
  });
});

// GET /api/loops/:id
app.get('/api/loops/:id', (req, res) => {
  const loop = (dataCache.loops.all || []).find(l => l.id === req.params.id);
  if (!loop) return res.status(404).json({ error: 'Loop not found' });
  res.json({ data: loop, timestamp: new Date().toISOString() });
});

// GET /api/context/tokens
app.get('/api/context/tokens', (req, res) => {
  res.json({
    data: dataCache.context,
    timestamp: new Date().toISOString()
  });
});

// POST /api/context/track (Para que frontend trackee tokens)
app.post('/api/context/track', (req, res) => {
  const { tokensUsed, activeSessions, memoryBlocks } = req.body;

  if (tokensUsed !== undefined) dataCache.context.tokensUsed = tokensUsed;
  if (activeSessions !== undefined) dataCache.context.activeSessions = activeSessions;
  if (memoryBlocks !== undefined) dataCache.context.memoryBlocks = memoryBlocks;

  // Broadcast update
  broadcastToClients({ type: 'context-update', data: dataCache.context });

  res.json({
    data: dataCache.context,
    timestamp: new Date().toISOString()
  });
});

// GET /api/projects/metrics
app.get('/api/projects/metrics', (req, res) => {
  res.json({
    data: dataCache.projects,
    timestamp: new Date().toISOString()
  });
});

// GET /api/roadmap
app.get('/api/roadmap', (req, res) => {
  res.json({
    data: dataCache.roadmap,
    timestamp: new Date().toISOString()
  });
});

// GET /api/ai-layer
app.get('/api/ai-layer', (req, res) => {
  res.json({
    data: dataCache.aiLayer,
    timestamp: new Date().toISOString()
  });
});

// GET /api/data/all
app.get('/api/data/all', (req, res) => {
  res.json({
    data: dataCache,
    timestamp: new Date().toISOString()
  });
});

// ==========================================
// ALERTS & NOTIFICATIONS
// ==========================================

// GET /api/alerts
app.get('/api/alerts', (req, res) => {
  res.json({
    data: dataCache.alerts || [],
    count: (dataCache.alerts || []).length,
    timestamp: new Date().toISOString()
  });
});

// POST /api/alerts (Crear alerta)
app.post('/api/alerts', (req, res) => {
  const { type, severity, message } = req.body;

  const alert = {
    id: `alert-${Date.now()}`,
    type,
    severity,
    message,
    timestamp: new Date().toISOString(),
    read: false
  };

  dataCache.alerts = dataCache.alerts || [];
  dataCache.alerts.unshift(alert);

  // Mantener solo últimas 100 alertas
  if (dataCache.alerts.length > 100) {
    dataCache.alerts = dataCache.alerts.slice(0, 100);
  }

  // Broadcast alert
  broadcastToClients({ type: 'alert', data: alert });

  // Trigger webhook to n8n
  if (severity === 'critical') {
    sendToN8n({
      type: 'alert',
      severity,
      message,
      timestamp: alert.timestamp
    }).catch(err => console.error('[N8N] Error:', err));
  }

  res.json({ data: alert, timestamp: alert.timestamp });
});

// ==========================================
// WEBHOOK FROM N8N (Receive data)
// ==========================================
app.post('/api/webhook/n8n', (req, res) => {
  const { type, data } = req.body;

  console.log(`[N8N WEBHOOK] Received: ${type}`);

  // Update cache based on webhook data
  if (type === 'loops-update') {
    dataCache.loops = data;
  } else if (type === 'context-update') {
    dataCache.context = data;
  } else if (type === 'projects-update') {
    dataCache.projects = data;
  }

  dataCache.lastUpdated = new Date().toISOString();

  // Broadcast to all connected clients
  broadcastToClients({ type: `${type}-webhook`, data });

  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ==========================================
// SEND DATA TO N8N WEBHOOK
// ==========================================
async function sendToN8n(payload) {
  const n8nUrl = process.env.N8N_WEBHOOK_URL ||
    'https://n8n.srv1013903.hstgr.cloud/webhook/tracker-data';

  try {
    const response = await fetch(n8nUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      console.warn(`[N8N] Non-200 response: ${response.status}`);
    }
  } catch (err) {
    console.error('[N8N] Send error:', err.message);
  }
}

// ==========================================
// MONITORING & HEALTH CHECKS
// ==========================================

// Auto-detect issues and create alerts
setInterval(() => {
  // Check if loops are failing
  const failedLoops = (dataCache.loops.all || []).filter(l => {
    if (!l.attempts || l.attempts === 0) return false;
    const failRate = l.failures / l.attempts;
    return failRate > 0.1; // More than 10% failure rate
  });

  if (failedLoops.length > 0) {
    failedLoops.forEach(loop => {
      // Only create alert if we haven't already for this loop
      const existingAlert = (dataCache.alerts || []).find(
        a => a.type === 'loop-failure' && a.data?.loopId === loop.id
      );

      if (!existingAlert) {
        broadcastToClients({
          type: 'alert',
          data: {
            type: 'loop-failure',
            severity: 'warning',
            message: `Loop "${loop.name}" has high failure rate (${(loop.failures / loop.attempts * 100).toFixed(1)}%)`,
            loopId: loop.id,
            timestamp: new Date().toISOString()
          }
        });
      }
    });
  }

  // Check token budget
  if (dataCache.context) {
    const percentUsed = (dataCache.context.tokensUsed / dataCache.context.tokenBudget) * 100;
    if (percentUsed > 90) {
      broadcastToClients({
        type: 'alert',
        data: {
          type: 'budget-warning',
          severity: percentUsed > 95 ? 'critical' : 'warning',
          message: `Token budget at ${percentUsed.toFixed(1)}%`,
          timestamp: new Date().toISOString()
        }
      });
    }
  }
}, 60000); // Check every minute

// ==========================================
// START SERVER
// ==========================================
const PORT = process.env.PORT || 3456;

server.listen(PORT, () => {
  console.log(`
  ╔═══════════════════════════════════════╗
  ║  🚪 THE DOOR API Server               ║
  ║  HTTP: http://localhost:${PORT}/api/...  ║
  ║  WS:   ws://localhost:${PORT}/         ║
  ╚═══════════════════════════════════════╝

  Available endpoints:
  GET  /api/health
  GET  /api/loops/active
  GET  /api/loops/all
  GET  /api/loops/:id
  GET  /api/context/tokens
  POST /api/context/track
  GET  /api/projects/metrics
  GET  /api/roadmap
  GET  /api/ai-layer
  GET  /api/data/all
  GET  /api/alerts
  POST /api/alerts
  POST /api/webhook/n8n

  WebSocket: /
  `);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n[SERVER] Shutting down gracefully...');
  server.close(() => {
    console.log('[SERVER] Closed');
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 5000);
});

module.exports = { app, wss, dataCache };