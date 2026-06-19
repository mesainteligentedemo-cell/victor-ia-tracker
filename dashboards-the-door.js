/**
 * ==========================================
 * THE DOOR: 4 Critical Dashboards
 * ==========================================
 * - AI Layer Explorer (THE DOOR)
 * - Loop Dashboard (automation state)
 * - Context Dashboard (token management)
 * - Cole Medin (Public Roadmap + Metrics)
 *
 * Inyectable en tracker_live.html
 * Carga automáticamente sin romper tabs existentes
 */

// ==========================================
// 1. THE DOOR — AI Layer Explorer
// ==========================================
function renderTheDoor() {
  const content = document.getElementById('view-the-door');
  if (!content) return;

  const aiLayerData = {
    model: {
      name: 'Claude Haiku 4.5',
      context: '200k tokens',
      thinking: 'enabled',
      status: '✅ Active'
    },
    harness: {
      rules: 'CLAUDE.md (127 rules)',
      memory: 'MEMORY.md (155 skills indexed)',
      skills: '155 skills across 27 categories',
      status: '✅ Active'
    },
    aiLayer: {
      rulesRegistry: 'Building...',
      skillsRouter: 'Building...',
      hooksRegistry: 'Building...',
      lspIntegration: 'Planned Q3 2026',
      status: '⚠️ In Progress'
    }
  };

  content.innerHTML = `
    <div style="display:grid;gap:24px">

      <!-- Header -->
      <div style="border-bottom:1px solid rgba(255,170,23,.15);padding-bottom:20px">
        <h2 style="font-size:18px;font-weight:600;margin-bottom:8px;color:var(--amber)">🚪 THE DOOR</h2>
        <p style="font-size:12px;color:var(--bone2);line-height:1.6">
          Agent = Model + Harness + AI Layer<br>
          Your system is 80% complete. The Door makes the AI Layer <strong>explicit and visible</strong>.
        </p>
      </div>

      <!-- Architecture Layers -->
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px">

        <!-- Layer 1: Model -->
        <div style="background:var(--surface);border:1px solid rgba(255,170,23,.15);border-radius:4px;padding:20px">
          <h3 style="font-size:12px;color:var(--amber);font-weight:600;text-transform:uppercase;letter-spacing:.12em;margin-bottom:12px">
            📌 THE MODEL
          </h3>
          <div style="font-size:12px;color:var(--bone2);line-height:1.8">
            <div><strong style="color:var(--bone)">Name:</strong> ${aiLayerData.model.name}</div>
            <div><strong style="color:var(--bone)">Context:</strong> ${aiLayerData.model.context}</div>
            <div><strong style="color:var(--bone)">Thinking:</strong> ${aiLayerData.model.thinking}</div>
            <div style="margin-top:8px;padding-top:8px;border-top:1px solid rgba(255,170,23,.1);color:var(--green)">
              ${aiLayerData.model.status}
            </div>
          </div>
        </div>

        <!-- Layer 2: Harness -->
        <div style="background:var(--surface);border:1px solid rgba(255,170,23,.15);border-radius:4px;padding:20px">
          <h3 style="font-size:12px;color:var(--amber);font-weight:600;text-transform:uppercase;letter-spacing:.12em;margin-bottom:12px">
            ⚙️ THE HARNESS
          </h3>
          <div style="font-size:12px;color:var(--bone2);line-height:1.8">
            <div><strong style="color:var(--bone)">Rules:</strong> ${aiLayerData.harness.rules}</div>
            <div><strong style="color:var(--bone)">Memory:</strong> ${aiLayerData.harness.memory}</div>
            <div><strong style="color:var(--bone)">Skills:</strong> ${aiLayerData.harness.skills}</div>
            <div style="margin-top:8px;padding-top:8px;border-top:1px solid rgba(255,170,23,.1);color:var(--green)">
              ${aiLayerData.harness.status}
            </div>
          </div>
        </div>

        <!-- Layer 3: AI Layer (What's Missing) -->
        <div style="background:var(--surface);border:2px solid rgba(255,170,23,.25);border-radius:4px;padding:20px;grid-column:1/-1">
          <h3 style="font-size:12px;color:var(--amber);font-weight:600;text-transform:uppercase;letter-spacing:.12em;margin-bottom:12px">
            🔴 THE AI LAYER (To Build)
          </h3>
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;font-size:12px;color:var(--bone2);line-height:1.8">
            <div>
              <strong style="color:var(--bone)">Rules Registry</strong><br>
              ${aiLayerData.aiLayer.rulesRegistry}
            </div>
            <div>
              <strong style="color:var(--bone)">Skills Meta-Router</strong><br>
              ${aiLayerData.aiLayer.skillsRouter}
            </div>
            <div>
              <strong style="color:var(--bone)">Hooks Registry</strong><br>
              ${aiLayerData.aiLayer.hooksRegistry}
            </div>
            <div>
              <strong style="color:var(--bone)">LSP Integration (VSCode)</strong><br>
              ${aiLayerData.aiLayer.lspIntegration}
            </div>
          </div>
          <div style="margin-top:12px;padding-top:12px;border-top:1px solid rgba(255,170,23,.2);color:var(--amber);font-weight:600">
            ${aiLayerData.aiLayer.status}
          </div>
        </div>

      </div>

      <!-- Next Steps -->
      <div style="background:rgba(255,170,23,.05);border:1px solid rgba(255,170,23,.15);border-radius:4px;padding:16px">
        <h4 style="font-size:11px;color:var(--amber);font-weight:600;text-transform:uppercase;letter-spacing:.12em;margin-bottom:8px">🎯 Next Phase</h4>
        <ol style="font-size:12px;color:var(--bone2);line-height:1.8;margin-left:16px">
          <li>Create ai-layer.md (definición explícita)</li>
          <li>Build rules-index.md (mapeo de CLAUDE.md)</li>
          <li>Implement skills-meta-router.md</li>
          <li>Build hooks-registry.md</li>
          <li>LSP VSCode extension integration</li>
        </ol>
      </div>

    </div>
  `;
}

// ==========================================
// 2. LOOP DASHBOARD — Automation State
// ==========================================
function renderLoopDashboard() {
  const content = document.getElementById('view-loop-dashboard');
  if (!content) return;

  // Simulated loop data (will connect to real /loop status)
  const loops = [
    { name: 'blog-daily-master', status: 'active', lastRun: '2026-06-19 08:00:15', nextRun: '2026-06-20 08:00:00', uptime: '99.7%', attempts: 47, success: 46, failures: 1 },
    { name: 'tracker-sync', status: 'active', lastRun: '2026-06-19 17:45:22', nextRun: '2026-06-19 18:00:00', uptime: '100%', attempts: 320, success: 320, failures: 0 },
    { name: 'graphify-maintenance', status: 'idle', lastRun: '2026-06-17 02:00:01', nextRun: '2026-06-24 02:00:00', uptime: '99.2%', attempts: 12, success: 11, failures: 1 },
  ];

  content.innerHTML = `
    <div style="display:grid;gap:20px">

      <!-- Header -->
      <div style="border-bottom:1px solid rgba(255,170,23,.15);padding-bottom:16px">
        <h2 style="font-size:18px;font-weight:600;margin-bottom:8px;color:var(--amber)">🔄 LOOP DASHBOARD</h2>
        <p style="font-size:12px;color:var(--bone2)">Real-time monitoring of active automation loops</p>
      </div>

      <!-- KPIs -->
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px">
        <div style="background:var(--surface);border:1px solid rgba(255,170,23,.08);padding:16px;border-radius:4px">
          <div style="font-size:10px;color:var(--bone2);text-transform:uppercase;letter-spacing:.12em;font-weight:600;margin-bottom:8px">Active Loops</div>
          <div style="font-size:28px;font-weight:600;color:var(--amber)">2</div>
          <div style="font-size:11px;color:var(--green);margin-top:8px">✓ All healthy</div>
        </div>
        <div style="background:var(--surface);border:1px solid rgba(255,170,23,.08);padding:16px;border-radius:4px">
          <div style="font-size:10px;color:var(--bone2);text-transform:uppercase;letter-spacing:.12em;font-weight:600;margin-bottom:8px">Success Rate</div>
          <div style="font-size:28px;font-weight:600;color:var(--amber)">99.6%</div>
          <div style="font-size:11px;color:var(--bone2);margin-top:8px">408/410 attempts</div>
        </div>
        <div style="background:var(--surface);border:1px solid rgba(255,170,23,.08);padding:16px;border-radius:4px">
          <div style="font-size:10px;color:var(--bone2);text-transform:uppercase;letter-spacing:.12em;font-weight:600;margin-bottom:8px">Avg Response</div>
          <div style="font-size:28px;font-weight:600;color:var(--amber)">12.4s</div>
          <div style="font-size:11px;color:var(--bone2);margin-top:8px">Last 30 days</div>
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
              <th style="padding:12px;text-align:left;color:var(--amber);font-weight:600;text-transform:uppercase;letter-spacing:.12em;font-size:10px">Success Rate</th>
            </tr>
          </thead>
          <tbody>
            ${loops.map(loop => `
              <tr style="border-bottom:1px solid var(--border)">
                <td style="padding:12px;color:var(--bone)">${loop.name}</td>
                <td style="padding:12px">
                  <span style="background:${loop.status === 'active' ? 'rgba(74,222,128,.1)' : 'rgba(107,114,128,.1)'};color:${loop.status === 'active' ? 'var(--green)' : 'var(--bone2)'};padding:4px 8px;border-radius:2px;font-size:11px;font-weight:600">
                    ${loop.status.toUpperCase()}
                  </span>
                </td>
                <td style="padding:12px;color:var(--bone2)">${loop.lastRun}</td>
                <td style="padding:12px;color:var(--green);font-weight:600">${loop.uptime}</td>
                <td style="padding:12px;color:var(--bone2)">${loop.success}/${loop.attempts}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

    </div>
  `;
}

// ==========================================
// 3. CONTEXT DASHBOARD — Token Management
// ==========================================
function renderContextDashboard() {
  const content = document.getElementById('view-context-dashboard');
  if (!content) return;

  // Simulated context data
  const contextMetrics = {
    tokensUsed: 145230,
    tokenBudget: 200000,
    percentUsed: 72.6,
    activeSessions: 3,
    memoryBlocks: 24,
    projectContext: 'Victor IA App',
    compressionScore: 'A+'
  };

  const budgetRemaining = contextMetrics.tokenBudget - contextMetrics.tokensUsed;
  const progressPercent = (contextMetrics.tokensUsed / contextMetrics.tokenBudget) * 100;

  content.innerHTML = `
    <div style="display:grid;gap:20px">

      <!-- Header -->
      <div style="border-bottom:1px solid rgba(255,170,23,.15);padding-bottom:16px">
        <h2 style="font-size:18px;font-weight:600;margin-bottom:8px;color:var(--amber)">📊 CONTEXT DASHBOARD</h2>
        <p style="font-size:12px;color:var(--bone2)">Token budget tracking and memory compression</p>
      </div>

      <!-- Token Meter -->
      <div style="background:var(--surface);border:1px solid rgba(255,170,23,.15);border-radius:4px;padding:24px">
        <div style="margin-bottom:16px">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
            <div style="font-size:12px;font-weight:600;color:var(--bone)">Token Usage</div>
            <div style="font-size:12px;color:var(--amber);font-weight:600">${contextMetrics.tokensUsed.toLocaleString()} / ${contextMetrics.tokenBudget.toLocaleString()}</div>
          </div>
          <!-- Progress bar -->
          <div style="width:100%;height:12px;background:var(--surface2);border-radius:2px;overflow:hidden;border:1px solid rgba(255,170,23,.15)">
            <div style="width:${progressPercent}%;height:100%;background:linear-gradient(90deg,var(--amber),rgba(255,170,23,.6));transition:width .3s"></div>
          </div>
          <div style="margin-top:8px;font-size:11px;color:var(--bone2)">
            ${contextMetrics.percentUsed.toFixed(1)}% used · ${budgetRemaining.toLocaleString()} tokens remaining
          </div>
        </div>
      </div>

      <!-- Metrics Grid -->
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px">
        <div style="background:var(--surface);border:1px solid rgba(255,170,23,.08);padding:16px;border-radius:4px">
          <div style="font-size:10px;color:var(--bone2);text-transform:uppercase;letter-spacing:.12em;font-weight:600;margin-bottom:8px">Active Sessions</div>
          <div style="font-size:24px;font-weight:600;color:var(--amber)">${contextMetrics.activeSessions}</div>
          <div style="font-size:11px;color:var(--bone2);margin-top:8px">Memory contexts</div>
        </div>
        <div style="background:var(--surface);border:1px solid rgba(255,170,23,.08);padding:16px;border-radius:4px">
          <div style="font-size:10px;color:var(--bone2);text-transform:uppercase;letter-spacing:.12em;font-weight:600;margin-bottom:8px">Memory Blocks</div>
          <div style="font-size:24px;font-weight:600;color:var(--amber)">${contextMetrics.memoryBlocks}</div>
          <div style="font-size:11px;color:var(--bone2);margin-top:8px">Loaded in context</div>
        </div>
        <div style="background:var(--surface);border:1px solid rgba(255,170,23,.08);padding:16px;border-radius:4px">
          <div style="font-size:10px;color:var(--bone2);text-transform:uppercase;letter-spacing:.12em;font-weight:600;margin-bottom:8px">Compression</div>
          <div style="font-size:24px;font-weight:600;color:var(--green)">${contextMetrics.compressionScore}</div>
          <div style="font-size:11px;color:var(--bone2);margin-top:8px">Context efficiency</div>
        </div>
      </div>

      <!-- Context Trimmer Recommendations -->
      <div style="background:rgba(255,170,23,.05);border:1px solid rgba(255,170,23,.15);border-radius:4px;padding:16px">
        <h4 style="font-size:11px;color:var(--amber);font-weight:600;text-transform:uppercase;letter-spacing:.12em;margin-bottom:12px">💡 Optimization Opportunities</h4>
        <ul style="font-size:12px;color:var(--bone2);line-height:1.8;margin-left:16px;list-style:disc">
          <li>Prune old memory blocks (older than 30 days) — potential 15-20% savings</li>
          <li>Archive completed project diaries → separate archive DB</li>
          <li>Compress skills inventory index (currently 4.2MB)</li>
        </ul>
      </div>

    </div>
  `;
}

// ==========================================
// 4. COLE MEDIN — Public Roadmap + Metrics
// ==========================================
function renderColeMedin() {
  const content = document.getElementById('view-cole-medin');
  if (!content) return;

  const roadmap = [
    { phase: 'Q2 2026', status: 'completed', items: ['155 Skills Integration', 'Deep Learning System', 'Harness Engineering'] },
    { phase: 'Q3 2026', status: 'in-progress', items: ['The Door (AI Layer)', 'Loop Dashboard', 'Context Compression', 'Public Roadmap'] },
    { phase: 'Q4 2026', status: 'planned', items: ['Customer Discovery Loop', 'Beta Release Gate', 'Metrics Dashboard', 'Playbook Generator'] },
  ];

  const metrics = [
    { label: 'Projects Completed', value: '12', change: '+3 this month' },
    { label: 'Skills Built', value: '155', change: '+30 this year' },
    { label: 'Clients Active', value: '6', change: '+2 pending' },
    { label: 'Delivery Speed', value: '3.2x', change: 'faster than Q1' },
  ];

  content.innerHTML = `
    <div style="display:grid;gap:20px">

      <!-- Header -->
      <div style="border-bottom:1px solid rgba(255,170,23,.15);padding-bottom:16px">
        <h2 style="font-size:18px;font-weight:600;margin-bottom:8px;color:var(--amber)">📈 COLE MEDIN — Scale & Transparency</h2>
        <p style="font-size:12px;color:var(--bone2)">Public Roadmap + Metrics + Customer Discovery Loop</p>
      </div>

      <!-- Key Metrics -->
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px">
        ${metrics.map(m => `
          <div style="background:var(--surface);border:1px solid rgba(255,170,23,.08);padding:16px;border-radius:4px">
            <div style="font-size:10px;color:var(--bone2);text-transform:uppercase;letter-spacing:.12em;font-weight:600;margin-bottom:4px">${m.label}</div>
            <div style="font-size:28px;font-weight:600;color:var(--amber)">${m.value}</div>
            <div style="font-size:11px;color:var(--green);margin-top:8px">📈 ${m.change}</div>
          </div>
        `).join('')}
      </div>

      <!-- Public Roadmap -->
      <div style="background:var(--surface);border:1px solid rgba(255,170,23,.15);border-radius:4px;padding:20px">
        <h3 style="font-size:12px;color:var(--amber);font-weight:600;text-transform:uppercase;letter-spacing:.12em;margin-bottom:16px">🗺️ Public Roadmap</h3>
        <div style="display:grid;gap:16px">
          ${roadmap.map(phase => `
            <div style="border-left:3px solid ${phase.status === 'completed' ? 'var(--green)' : phase.status === 'in-progress' ? 'var(--amber)' : 'rgba(255,170,23,.3)'};padding-left:16px">
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
                <div style="font-weight:600;color:var(--bone)">${phase.phase}</div>
                <span style="font-size:10px;background:${phase.status === 'completed' ? 'rgba(74,222,128,.1);color:var(--green)' : phase.status === 'in-progress' ? 'rgba(255,170,23,.1);color:var(--amber)' : 'rgba(107,114,128,.1);color:var(--bone2)'};padding:2px 8px;border-radius:2px;font-weight:600">
                  ${phase.status.replace('-', ' ').toUpperCase()}
                </span>
              </div>
              <ul style="font-size:12px;color:var(--bone2);margin-left:16px;list-style:disc;line-height:1.6">
                ${phase.items.map(item => `<li>${item}</li>`).join('')}
              </ul>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Cole Medin Principles -->
      <div style="background:rgba(255,170,23,.05);border:1px solid rgba(255,170,23,.15);border-radius:4px;padding:16px">
        <h4 style="font-size:11px;color:var(--amber);font-weight:600;text-transform:uppercase;letter-spacing:.12em;margin-bottom:12px">🎯 Cole Medin Methodology</h4>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:12px;font-size:12px;color:var(--bone2);line-height:1.7">
          <div>
            <strong style="color:var(--bone)">Fail Faster</strong><br>
            Ship beta → gather data → iterate
          </div>
          <div>
            <strong style="color:var(--bone)">Lean Context</strong><br>
            Only ship-critical info; trim rest
          </div>
          <div>
            <strong style="color:var(--bone)">Customer First</strong><br>
            Discovery loop before build
          </div>
          <div>
            <strong style="color:var(--bone)">Metrics-Driven</strong><br>
            Every decision: measure → decide → iterate
          </div>
        </div>
      </div>

    </div>
  `;
}

// ==========================================
// Render dispatcher
// ==========================================
function renderDoorDashboards() {
  renderTheDoor();
  renderLoopDashboard();
  renderContextDashboard();
  renderColeMedin();
}

// Hook into existing renderCurrentView
if (typeof renderCurrentView === 'function') {
  const originalRender = renderCurrentView;
  renderCurrentView = function() {
    originalRender();
    renderDoorDashboards();
  };
} else {
  // Fallback if renderCurrentView doesn't exist yet
  window.addEventListener('DOMContentLoaded', renderDoorDashboards);
}

// Also trigger render when tabs change (hook into setTab)
if (typeof setTab === 'function') {
  const originalSetTab = setTab;
  setTab = function(tab) {
    originalSetTab(tab);
    // Render the specific dashboard if it's one of our new tabs
    if (tab === 'the-door') renderTheDoor();
    else if (tab === 'loop-dashboard') renderLoopDashboard();
    else if (tab === 'context-dashboard') renderContextDashboard();
    else if (tab === 'cole-medin') renderColeMedin();
  };
}

console.log('[THE DOOR] 4 critical dashboards loaded successfully');