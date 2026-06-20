/**
 * ==========================================
 * THE DOOR: 4 Dashboards v2 — WebSocket Edition
 * ==========================================
 * Real-time updates via WebSocket (no polling)
 * Conecta automáticamente al API server
 */

// ==========================================
// DATA STATE (shared across all dashboards)
// ==========================================
let doorDashboardState = {
  loops: { active: [], all: [], stats: {} },
  context: { tokensUsed: 0, tokenBudget: 200000 },
  projects: {},
  roadmap: { phases: [] },
  aiLayer: {},
  alerts: [],
  wsConnected: false,
  lastUpdate: null
};

// ==========================================
// WEBSOCKET SETUP
// ==========================================
function initWebSocket() {
  if (doorDashboardState.wsConnected && window.TrackerWS) {
    return; // Already connected
  }

  // Esperar a que websocket-client.js cargue
  if (!window.TrackerWS) {
    setTimeout(initWebSocket, 500);
    return;
  }

  console.log('[DOOR] Setting up WebSocket listeners...');

  // Listen for data updates
  window.TrackerWS.on('data-update', (data) => {
    doorDashboardState = {
      ...doorDashboardState,
      ...data,
      lastUpdate: new Date().toISOString()
    };
    console.log('[DOOR] Data updated via WebSocket');
    updateAllDashboards();
  });

  // Listen for specific updates
  window.TrackerWS.on('loops', (loops) => {
    doorDashboardState.loops = loops;
    renderLoopDashboard();
  });

  window.TrackerWS.on('context', (context) => {
    doorDashboardState.context = context;
    renderContextDashboard();
  });

  window.TrackerWS.on('projects', (projects) => {
    doorDashboardState.projects = projects;
    renderColeMedin();
  });

  // Listen for alerts
  window.TrackerWS.on('alert', (alert) => {
    doorDashboardState.alerts.unshift(alert);
    if (doorDashboardState.alerts.length > 50) {
      doorDashboardState.alerts = doorDashboardState.alerts.slice(0, 50);
    }
    console.warn('[DOOR] New alert:', alert.message);
    showAlertNotification(alert);
  });

  // Listen for connection status
  window.TrackerWS.on('connected', (data) => {
    doorDashboardState = { ...doorDashboardState, ...data, wsConnected: true };
    updateAllDashboards();
    showNotification('Connected to The Door API ✅', 'success');
  });

  doorDashboardState.wsConnected = true;
}

// ==========================================
// 1. THE DOOR — AI Layer Explorer
// ==========================================
async function renderTheDoor() {
  const content = document.getElementById('view-the-door');
  if (!content) return;

  const aiLayer = doorDashboardState.aiLayer || {};

  content.innerHTML = `
    <div style="display:grid;gap:24px">
      <div style="border-bottom:1px solid rgba(255,170,23,.15);padding-bottom:20px">
        <h2 style="font-size:18px;font-weight:600;margin-bottom:8px;color:var(--amber)">🚪 THE DOOR — Agent Architecture</h2>
        <p style="font-size:12px;color:var(--bone2);line-height:1.6">
          Agent = Model + Harness + AI Layer<br>
          <span style="color:var(--green)">🟢 Connected via WebSocket — Real-time updates</span>
        </p>
      </div>

      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px">
        <!-- Layer 1: Model -->
        <div style="background:var(--surface);border:1px solid rgba(255,170,23,.15);border-radius:4px;padding:20px">
          <h3 style="font-size:12px;color:var(--amber);font-weight:600;text-transform:uppercase;letter-spacing:.12em;margin-bottom:12px">📌 THE MODEL</h3>
          <div style="font-size:12px;color:var(--bone2);line-height:1.8">
            <div><strong style="color:var(--bone)">Name:</strong> ${aiLayer.model?.name || 'Claude Haiku 4.5'}</div>
            <div><strong style="color:var(--bone)">Context:</strong> ${aiLayer.model?.context || '200k tokens'}</div>
            <div><strong style="color:var(--bone)">Thinking:</strong> ${aiLayer.model?.thinking || 'enabled'}</div>
            <div style="margin-top:8px;padding-top:8px;border-top:1px solid rgba(255,170,23,.1);color:var(--green)">✅ ${aiLayer.model?.status || 'Active'}</div>
          </div>
        </div>

        <!-- Layer 2: Harness -->
        <div style="background:var(--surface);border:1px solid rgba(255,170,23,.15);border-radius:4px;padding:20px">
          <h3 style="font-size:12px;color:var(--amber);font-weight:600;text-transform:uppercase;letter-spacing:.12em;margin-bottom:12px">⚙️ THE HARNESS</h3>
          <div style="font-size:12px;color:var(--bone2);line-height:1.8">
            <div><strong style="color:var(--bone)">Rules:</strong> ${aiLayer.harness?.rules || 'CLAUDE.md (127 rules)'}</div>
            <div><strong style="color:var(--bone)">Memory:</strong> ${aiLayer.harness?.memory || 'MEMORY.md (155 skills)'}</div>
            <div><strong style="color:var(--bone)">Skills:</strong> ${aiLayer.harness?.skills || '155 skills'}</div>
            <div style="margin-top:8px;padding-top:8px;border-top:1px solid rgba(255,170,23,.1);color:var(--green)">✅ ${aiLayer.harness?.status || 'Active'}</div>
          </div>
        </div>

        <!-- Layer 3: AI Layer (Building) -->
        <div style="background:var(--surface);border:2px solid rgba(255,170,23,.25);border-radius:4px;padding:20px;grid-column:1/-1">
          <h3 style="font-size:12px;color:var(--amber);font-weight:600;text-transform:uppercase;letter-spacing:.12em;margin-bottom:12px">🔴 THE AI LAYER (Building)</h3>
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;font-size:12px;color:var(--bone2)">
            <div>
              <strong style="color:var(--bone)">Rules Registry</strong><br>
              <span style="color:var(--blue)">Q3 2026 — Planned</span>
            </div>
            <div>
              <strong style="color:var(--bone)">Skills Meta-Router</strong><br>
              <span style="color:var(--blue)">Q3 2026 — Planned</span>
            </div>
            <div>
              <strong style="color:var(--bone)">Hooks Registry</strong><br>
              <span style="color:var(--blue)">Q3 2026 — Planned</span>
            </div>
            <div>
              <strong style="color:var(--bone)">LSP Integration</strong><br>
              <span style="color:var(--blue)">Q4 2026 — Planned</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Status Bar -->
      <div style="background:rgba(255,170,23,.05);border:1px solid rgba(255,170,23,.15);border-radius:4px;padding:12px;display:flex;justify-content:space-between;align-items:center;font-size:11px">
        <div style="color:var(--bone2)">Last updated: ${doorDashboardState.lastUpdate ? new Date(doorDashboardState.lastUpdate).toLocaleTimeString('es-MX') : 'Waiting...'}</div>
        <div style="color:${doorDashboardState.wsConnected ? 'var(--green)' : 'var(--red)'}">
          ${doorDashboardState.wsConnected ? '🟢 WebSocket Connected' : '🔴 Disconnected'}
        </div>
      </div>
    </div>
  `;
}

// ==========================================
// 2. LOOP DASHBOARD
// ==========================================
async function renderLoopDashboard() {
  const content = document.getElementById('view-loop-dashboard');
  if (!content) return;

  const loops = doorDashboardState.loops;
  const stats = loops.stats || {};

  content.innerHTML = `
    <div style="display:grid;gap:20px">
      <div style="border-bottom:1px solid rgba(255,170,23,.15);padding-bottom:16px">
        <h2 style="font-size:18px;font-weight:600;margin-bottom:8px;color:var(--amber)">🔄 LOOP DASHBOARD — Real-time Status</h2>
        <p style="font-size:12px;color:var(--bone2)">WebSocket: Updates in real-time as loops execute</p>
      </div>

      <!-- KPIs -->
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px">
        <div style="background:var(--surface);border:1px solid rgba(255,170,23,.08);padding:16px;border-radius:4px">
          <div style="font-size:10px;color:var(--bone2);text-transform:uppercase;letter-spacing:.12em;font-weight:600;margin-bottom:8px">Active Loops</div>
          <div style="font-size:28px;font-weight:600;color:var(--amber)">${loops.active?.length || 0}</div>
          <div style="font-size:11px;color:${loops.active?.length > 0 ? 'var(--green)' : 'var(--red)'};margin-top:8px">${loops.active?.length > 0 ? '✓ Running' : '⚠ Check'}</div>
        </div>
        <div style="background:var(--surface);border:1px solid rgba(255,170,23,.08);padding:16px;border-radius:4px">
          <div style="font-size:10px;color:var(--bone2);text-transform:uppercase;letter-spacing:.12em;font-weight:600;margin-bottom:8px">Success Rate</div>
          <div style="font-size:28px;font-weight:600;color:var(--amber)">${stats.totalAttempts > 0 ? ((stats.successCount / stats.totalAttempts) * 100).toFixed(1) : '0'}%</div>
          <div style="font-size:11px;color:var(--bone2);margin-top:8px">${stats.successCount || 0}/${stats.totalAttempts || 0}</div>
        </div>
        <div style="background:var(--surface);border:1px solid rgba(255,170,23,.08);padding:16px;border-radius:4px">
          <div style="font-size:10px;color:var(--bone2);text-transform:uppercase;letter-spacing:.12em;font-weight:600;margin-bottom:8px">Avg Uptime</div>
          <div style="font-size:28px;font-weight:600;color:var(--amber)">${stats.avgUptime || '0'}%</div>
          <div style="font-size:11px;color:var(--bone2);margin-top:8px">All loops</div>
        </div>
      </div>

      <!-- Loops Table -->
      <div style="overflow-x:auto">
        <table style="width:100%;border-collapse:collapse;font-size:12px">
          <thead>
            <tr style="border-bottom:1px solid rgba(255,170,23,.15);background:var(--surface)">
              <th style="padding:12px;text-align:left;color:var(--amber);font-weight:600;text-transform:uppercase;letter-spacing:.12em;font-size:10px">Loop Name</th>
              <th style="padding:12px;text-align:left;color:var(--amber);font-weight:600;text-transform:uppercase;letter-spacing:.12em;font-size:10px">Status</th>
              <th style="padding:12px;text-align:left;color:var(--amber);font-weight:600;text-transform:uppercase;letter-spacing:.12em;font-size:10px">Last Run</th>
              <th style="padding:12px;text-align:left;color:var(--amber);font-weight:600;text-transform:uppercase;letter-spacing:.12em;font-size:10px">Uptime</th>
              <th style="padding:12px;text-align:left;color:var(--amber);font-weight:600;text-transform:uppercase;letter-spacing:.12em;font-size:10px">Success</th>
            </tr>
          </thead>
          <tbody>
            ${(loops.all || []).map(loop => `
              <tr style="border-bottom:1px solid var(--border)">
                <td style="padding:12px;color:var(--bone);font-weight:500">${loop.name || 'N/A'}</td>
                <td style="padding:12px">
                  <span style="background:${loop.status === 'active' ? 'rgba(74,222,128,.1)' : 'rgba(107,114,128,.1)'};color:${loop.status === 'active' ? 'var(--green)' : 'var(--bone2)'};padding:4px 8px;border-radius:2px;font-size:11px;font-weight:600">
                    ${(loop.status || 'unknown').toUpperCase()}
                  </span>
                </td>
                <td style="padding:12px;color:var(--bone2)">${loop.lastRun ? new Date(loop.lastRun).toLocaleTimeString('es-MX') : 'N/A'}</td>
                <td style="padding:12px;color:var(--green);font-weight:600">${loop.uptime || '0%'}</td>
                <td style="padding:12px;color:var(--bone2)">${loop.success || 0}/${loop.attempts || 0}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

// ==========================================
// 3. CONTEXT DASHBOARD
// ==========================================
async function renderContextDashboard() {
  const content = document.getElementById('view-context-dashboard');
  if (!content) return;

  const ctx = doorDashboardState.context;
  const percentUsed = (ctx.tokensUsed / ctx.tokenBudget) * 100;

  content.innerHTML = `
    <div style="display:grid;gap:20px">
      <div style="border-bottom:1px solid rgba(255,170,23,.15);padding-bottom:16px">
        <h2 style="font-size:18px;font-weight:600;margin-bottom:8px;color:var(--amber)">📊 CONTEXT DASHBOARD — Token Management</h2>
        <p style="font-size:12px;color:var(--bone2)">Real-time token budget tracking</p>
      </div>

      <!-- Token Meter -->
      <div style="background:var(--surface);border:1px solid rgba(255,170,23,.15);border-radius:4px;padding:24px">
        <div style="margin-bottom:16px">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
            <div style="font-size:12px;font-weight:600;color:var(--bone)">Token Usage</div>
            <div style="font-size:12px;color:var(--amber);font-weight:600">${(ctx.tokensUsed || 0).toLocaleString('es-MX')} / ${(ctx.tokenBudget || 200000).toLocaleString('es-MX')}</div>
          </div>
          <div style="width:100%;height:12px;background:var(--surface2);border-radius:2px;overflow:hidden;border:1px solid rgba(255,170,23,.15)">
            <div style="width:${Math.min(percentUsed, 100)}%;height:100%;background:${percentUsed > 90 ? 'var(--red)' : 'linear-gradient(90deg,var(--amber),rgba(255,170,23,.6))'};transition:width .3s"></div>
          </div>
          <div style="margin-top:8px;font-size:11px;color:var(--bone2)">
            ${percentUsed.toFixed(1)}% used · ${(ctx.tokenBudget - ctx.tokensUsed).toLocaleString('es-MX')} tokens remaining
          </div>
        </div>
      </div>

      <!-- Metrics -->
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px">
        <div style="background:var(--surface);border:1px solid rgba(255,170,23,.08);padding:16px;border-radius:4px">
          <div style="font-size:10px;color:var(--bone2);text-transform:uppercase;letter-spacing:.12em;font-weight:600;margin-bottom:8px">Active Sessions</div>
          <div style="font-size:24px;font-weight:600;color:var(--amber)">${ctx.activeSessions || 0}</div>
        </div>
        <div style="background:var(--surface);border:1px solid rgba(255,170,23,.08);padding:16px;border-radius:4px">
          <div style="font-size:10px;color:var(--bone2);text-transform:uppercase;letter-spacing:.12em;font-weight:600;margin-bottom:8px">Memory Blocks</div>
          <div style="font-size:24px;font-weight:600;color:var(--amber)">${ctx.memoryBlocks || 0}</div>
        </div>
        <div style="background:var(--surface);border:1px solid rgba(255,170,23,.08);padding:16px;border-radius:4px">
          <div style="font-size:10px;color:var(--bone2);text-transform:uppercase;letter-spacing:.12em;font-weight:600;margin-bottom:8px">Compression</div>
          <div style="font-size:24px;font-weight:600;color:var(--green)">${ctx.compressionScore || 'A+'}</div>
        </div>
      </div>
    </div>
  `;
}

// ==========================================
// 4. COLE MEDIN
// ==========================================
async function renderColeMedin() {
  const content = document.getElementById('view-cole-medin');
  if (!content) return;

  const roadmap = doorDashboardState.roadmap.phases || [];
  const projects = doorDashboardState.projects || {};

  content.innerHTML = `
    <div style="display:grid;gap:20px">
      <div style="border-bottom:1px solid rgba(255,170,23,.15);padding-bottom:16px">
        <h2 style="font-size:18px;font-weight:600;margin-bottom:8px;color:var(--amber)">📈 COLE MEDIN — Public Roadmap</h2>
        <p style="font-size:12px;color:var(--bone2)">Scale faster. Transparency first. Velocity matters.</p>
      </div>

      <!-- Metrics -->
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px">
        <div style="background:var(--surface);border:1px solid rgba(255,170,23,.08);padding:16px;border-radius:4px">
          <div style="font-size:10px;color:var(--bone2);text-transform:uppercase;letter-spacing:.12em;font-weight:600;margin-bottom:4px">Projects</div>
          <div style="font-size:24px;font-weight:600;color:var(--amber)">${projects.projectsCompleted || 12}</div>
          <div style="font-size:10px;color:var(--green);margin-top:4px">+${projects.projectsCompletedThisMonth || 3} this month</div>
        </div>
        <div style="background:var(--surface);border:1px solid rgba(255,170,23,.08);padding:16px;border-radius:4px">
          <div style="font-size:10px;color:var(--bone2);text-transform:uppercase;letter-spacing:.12em;font-weight:600;margin-bottom:4px">Skills</div>
          <div style="font-size:24px;font-weight:600;color:var(--amber)">${projects.skillsBuilt || 155}</div>
          <div style="font-size:10px;color:var(--green);margin-top:4px">+${projects.skillsBuiltThisYear || 30} this year</div>
        </div>
        <div style="background:var(--surface);border:1px solid rgba(255,170,23,.08);padding:16px;border-radius:4px">
          <div style="font-size:10px;color:var(--bone2);text-transform:uppercase;letter-spacing:.12em;font-weight:600;margin-bottom:4px">Clients</div>
          <div style="font-size:24px;font-weight:600;color:var(--amber)">${projects.clientsActive || 6}</div>
          <div style="font-size:10px;color:var(--green);margin-top:4px">+${projects.clientsPending || 2} pending</div>
        </div>
        <div style="background:var(--surface);border:1px solid rgba(255,170,23,.08);padding:16px;border-radius:4px">
          <div style="font-size:10px;color:var(--bone2);text-transform:uppercase;letter-spacing:.12em;font-weight:600;margin-bottom:4px">Velocity</div>
          <div style="font-size:24px;font-weight:600;color:var(--amber)">${projects.deliverySpeedMultiplier || 3.2}x</div>
          <div style="font-size:10px;color:var(--green);margin-top:4px">faster than Q1</div>
        </div>
      </div>

      <!-- Roadmap Phases -->
      <div style="background:var(--surface);border:1px solid rgba(255,170,23,.15);border-radius:4px;padding:20px">
        <h3 style="font-size:12px;color:var(--amber);font-weight:600;text-transform:uppercase;letter-spacing:.12em;margin-bottom:16px">Public Roadmap</h3>
        ${roadmap.map(phase => `
          <div style="border-left:3px solid ${phase.status === 'completed' ? 'var(--green)' : phase.status === 'in-progress' ? 'var(--amber)' : 'rgba(255,170,23,.3)'};padding-left:16px;margin-bottom:16px">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
              <div style="font-weight:600;color:var(--bone)">${phase.quarter}</div>
              <span style="font-size:10px;background:${phase.status === 'completed' ? 'rgba(74,222,128,.1);color:var(--green)' : phase.status === 'in-progress' ? 'rgba(255,170,23,.1);color:var(--amber)' : 'rgba(107,114,128,.1);color:var(--bone2)'};padding:2px 8px;border-radius:2px;font-weight:600">
                ${phase.status.replace('-', ' ').toUpperCase()}
              </span>
              <span style="font-size:10px;color:var(--bone2);margin-left:auto">${phase.completion}% done</span>
            </div>
            <ul style="font-size:11px;color:var(--bone2);margin-left:16px;list-style:disc;line-height:1.6">
              ${(phase.items || []).map(item => `<li>${item}</li>`).join('')}
            </ul>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

// ==========================================
// HELPER FUNCTIONS
// ==========================================
function updateAllDashboards() {
  const currentTab = document.body.className.match(/tab-(\S+)/)?.[1];

  if (currentTab === 'the-door') renderTheDoor();
  else if (currentTab === 'loop-dashboard') renderLoopDashboard();
  else if (currentTab === 'context-dashboard') renderContextDashboard();
  else if (currentTab === 'cole-medin') renderColeMedin();
}

function showNotification(message, type = 'info') {
  console.log(`[DOOR] ${type.toUpperCase()}: ${message}`);
  // Aquí se podría agregar un toast notification visual
}

function showAlertNotification(alert) {
  console.warn(`[DOOR] ALERT [${alert.severity}]: ${alert.message}`);
  // Trigger visual notification (Telegram, email, etc via n8n)
}

// ==========================================
// INITIALIZATION
// ==========================================
function initDoorDashboards() {
  console.log('[DOOR] Initializing with WebSocket...');

  // Init WebSocket
  initWebSocket();

  // Render all dashboards with initial data
  setTimeout(() => {
    renderTheDoor();
    renderLoopDashboard();
    renderContextDashboard();
    renderColeMedin();
  }, 500);
}

// Hook into setTab
if (typeof setTab === 'function') {
  const originalSetTab = setTab;
  setTab = function(tab) {
    originalSetTab(tab);
    if (['the-door', 'loop-dashboard', 'context-dashboard', 'cole-medin'].includes(tab)) {
      updateAllDashboards();
    }
  };
}

// Init on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initDoorDashboards);
} else {
  initDoorDashboards();
}

console.log('[DOOR v2] WebSocket Edition Loaded');