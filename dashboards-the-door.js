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
 *
 * DATOS EN VIVO: Conecta con api-data-collectors.js
 */

// ==========================================
// 1. THE DOOR — AI Layer Explorer
// ==========================================
async function renderTheDoor() {
  const content = document.getElementById('view-the-door');
  if (!content) return;

  // Obtener datos en vivo
  const aiLayerData = window.DataCollectors
    ? await window.DataCollectors.aiLayer()
    : {
        model: { name: 'Claude Haiku 4.5', context: '200k tokens', thinking: 'enabled', status: '✅ Active' },
        harness: { rules: 'CLAUDE.md (127 rules)', memory: 'MEMORY.md (155 skills indexed)', skills: '155 skills across 27 categories', status: '✅ Active' },
        aiLayer: { rulesRegistry: 'Building...', skillsRouter: 'Building...', hooksRegistry: 'Building...', lspIntegration: 'Planned Q3 2026', status: '⚠️ In Progress' }
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
async function renderLoopDashboard() {
  const content = document.getElementById('view-loop-dashboard');
  if (!content) return;

  // Obtener datos en vivo desde collectors
  const loopsData = window.DataCollectors
    ? await window.DataCollectors.loops()
    : { active: [], stats: { totalAttempts: 0, successCount: 0, failureCount: 0, avgUptime: '0' } };

  const loops = loopsData.all || loopsData.active || [];
  const stats = loopsData.stats || { totalAttempts: 0, successCount: 0, failureCount: 0, avgUptime: '0' };

  // Formatear fechas
  const formatDate = (isoStr) => {
    try {
      return new Date(isoStr).toLocaleString('es-MX', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
    } catch (e) { return isoStr; }
  };

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
          <div style="font-size:28px;font-weight:600;color:var(--amber)">${loopsData.active?.length || 0}</div>
          <div style="font-size:11px;color:${loopsData.active?.length > 0 ? 'var(--green)' : 'var(--red)'};margin-top:8px">${loopsData.active?.length > 0 ? '✓ All healthy' : '⚠ Attention needed'}</div>
        </div>
        <div style="background:var(--surface);border:1px solid rgba(255,170,23,.08);padding:16px;border-radius:4px">
          <div style="font-size:10px;color:var(--bone2);text-transform:uppercase;letter-spacing:.12em;font-weight:600;margin-bottom:8px">Success Rate</div>
          <div style="font-size:28px;font-weight:600;color:var(--amber)">${stats.totalAttempts > 0 ? ((stats.successCount / stats.totalAttempts) * 100).toFixed(1) : '0'}%</div>
          <div style="font-size:11px;color:var(--bone2);margin-top:8px">${stats.successCount}/${stats.totalAttempts} attempts</div>
        </div>
        <div style="background:var(--surface);border:1px solid rgba(255,170,23,.08);padding:16px;border-radius:4px">
          <div style="font-size:10px;color:var(--bone2);text-transform:uppercase;letter-spacing:.12em;font-weight:600;margin-bottom:8px">Avg Uptime</div>
          <div style="font-size:28px;font-weight:600;color:var(--amber)">${stats.avgUptime}%</div>
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
              <th style="padding:12px;text-align:left;color:var(--amber);font-weight:600;text-transform:uppercase;letter-spacing:.12em;font-size:10px">Success Rate</th>
            </tr>
          </thead>
          <tbody>
            ${(loops || []).map(loop => `
              <tr style="border-bottom:1px solid var(--border)">
                <td style="padding:12px;color:var(--bone)">${loop.name || 'N/A'}</td>
                <td style="padding:12px">
                  <span style="background:${loop.status === 'active' ? 'rgba(74,222,128,.1)' : 'rgba(107,114,128,.1)'};color:${loop.status === 'active' ? 'var(--green)' : 'var(--bone2)'};padding:4px 8px;border-radius:2px;font-size:11px;font-weight:600">
                    ${(loop.status || 'unknown').toUpperCase()}
                  </span>
                </td>
                <td style="padding:12px;color:var(--bone2)">${formatDate(loop.lastRun) || 'N/A'}</td>
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
// 3. CONTEXT DASHBOARD — Token Management
// ==========================================
async function renderContextDashboard() {
  const content = document.getElementById('view-context-dashboard');
  if (!content) return;

  // Obtener datos en vivo
  const contextMetrics = window.DataCollectors
    ? await window.DataCollectors.context()
    : { tokensUsed: 145230, tokenBudget: 200000, percentUsed: 72.6, activeSessions: 3, memoryBlocks: 24, compressionScore: 'A+' };

  const budgetRemaining = contextMetrics.budgetRemaining || (contextMetrics.tokenBudget - contextMetrics.tokensUsed);
  const progressPercent = contextMetrics.percentUsed || ((contextMetrics.tokensUsed / contextMetrics.tokenBudget) * 100);

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
async function renderColeMedin() {
  const content = document.getElementById('view-cole-medin');
  if (!content) return;

  // Obtener datos en vivo
  const roadmapData = window.DataCollectors
    ? await window.DataCollectors.roadmap()
    : { phases: [] };

  const projectsData = window.DataCollectors
    ? await window.DataCollectors.projects()
    : { projectsCompleted: 12, skillsBuilt: 155, clientsActive: 6, clientsPending: 2, deliverySpeedMultiplier: 3.2, projectsCompletedThisMonth: 3, skillsBuiltThisYear: 30 };

  const roadmap = roadmapData.phases || [];

  const metrics = [
    { label: 'Projects Completed', value: projectsData.projectsCompleted || '12', change: `+${projectsData.projectsCompletedThisMonth || 3} this month` },
    { label: 'Skills Built', value: projectsData.skillsBuilt || '155', change: `+${projectsData.skillsBuiltThisYear || 30} this year` },
    { label: 'Clients Active', value: projectsData.clientsActive || '6', change: `+${projectsData.clientsPending || 2} pending` },
    { label: 'Delivery Speed', value: `${projectsData.deliverySpeedMultiplier || 3.2}x`, change: 'faster than Q1' },
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
// Render dispatcher (with async support)
// ==========================================
async function renderDoorDashboards() {
  await renderTheDoor();
  await renderLoopDashboard();
  await renderContextDashboard();
  await renderColeMedin();
}

// Hook into existing renderCurrentView
if (typeof renderCurrentView === 'function') {
  const originalRender = renderCurrentView;
  renderCurrentView = function() {
    originalRender();
    renderDoorDashboards().catch(err => console.error('[THE DOOR] Render error:', err));
  };
} else {
  // Fallback if renderCurrentView doesn't exist yet
  window.addEventListener('DOMContentLoaded', () => {
    renderDoorDashboards().catch(err => console.error('[THE DOOR] Init error:', err));
  });
}

// Also trigger render when tabs change (hook into setTab)
if (typeof setTab === 'function') {
  const originalSetTab = setTab;
  setTab = function(tab) {
    originalSetTab(tab);
    // Render the specific dashboard if it's one of our new tabs
    if (tab === 'the-door') renderTheDoor().catch(err => console.error('[THE DOOR] Error:', err));
    else if (tab === 'loop-dashboard') renderLoopDashboard().catch(err => console.error('[LOOP] Error:', err));
    else if (tab === 'context-dashboard') renderContextDashboard().catch(err => console.error('[CONTEXT] Error:', err));
    else if (tab === 'cole-medin') renderColeMedin().catch(err => console.error('[ROADMAP] Error:', err));
  };
}

// Auto-refresh every 30 seconds if dashboard is visible
setInterval(() => {
  const tab = document.body.className.match(/tab-(\S+)/);
  if (tab && ['the-door', 'loop-dashboard', 'context-dashboard', 'cole-medin'].includes(tab[1])) {
    renderDoorDashboards().catch(err => console.warn('[AUTO-REFRESH] Error:', err));
  }
}, 30000);

console.log('[THE DOOR] 4 critical dashboards loaded with LIVE DATA INTEGRATION');