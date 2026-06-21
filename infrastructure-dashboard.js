/**
 * Infrastructure Dashboard — VICTOR IA  (tracker.victor-ia.xyz)
 * 5 tabs: Agents · Loops · Organigrama · Graphify · Harness
 *
 * Consumes the 7 REAL endpoints under /api/infrastructure (no mocks):
 *   /overview /agents /loops /organigrama /skills /graphify /harness
 *
 * Visualizations:
 *   - Agents  → Chart.js doughnut (27 categories) + agent grid
 *   - Loops   → status table (15 loops, tier, success rate, schedule)
 *   - Organigrama → SVG org chart (12 roles, 4 levels)
 *   - Graphify    → canvas dependency graph (force-ish radial, 155 nodes)
 *   - Harness     → roles matrix + metrics cards
 *
 * Theme tokens used (already defined in tracker_live.html :root):
 *   --amber #FFAA17 · --surface · --surface2 · --border · --bone · --bone2
 *   --green #4ade80 · --red #f87171 · --amber2
 *
 * Loaded in tracker_live.html via <script src="/infrastructure-dashboard.js">
 * Activated by setTab('infrastructure') → InfrastructureDashboard.init().
 */

(function () {
  'use strict';

  const API = '/api/infrastructure';

  const InfrastructureDashboard = {
    state: {
      activeTab: 'agents',
      overview: null,
      agents: null,
      loops: null,
      organigrama: null,
      skills: null,
      graphify: null,
      harness: null,
      wsConnected: false,
      loaded: false,
    },
    _charts: {},
    _ws: null,

    /* ───────────────────────────── INIT ───────────────────────────── */
    async init() {
      const root = document.getElementById('view-infrastructure');
      if (!root) return;
      if (this.state.loaded) { this.render(); return; }

      root.innerHTML = this._loadingHTML();
      try {
        await this.loadData();
        this.state.loaded = true;
        this.render();
        this.connectWS();
      } catch (e) {
        console.error('[Infrastructure] init error', e);
        root.innerHTML = this._errorHTML(e.message);
      }
    },

    async loadData() {
      const get = (p) => fetch(`${API}${p}`).then(r => {
        if (!r.ok) throw new Error(`${p} → HTTP ${r.status}`);
        return r.json();
      });
      const [overview, agents, loops, organigrama, skills, graphify, harness] = await Promise.all([
        get('/overview'), get('/agents'), get('/loops'),
        get('/organigrama'), get('/skills'), get('/graphify'), get('/harness'),
      ]);
      Object.assign(this.state, { overview, agents, loops, organigrama, skills, graphify, harness });
    },

    /* ──────────────────────── WEBSOCKET (real-time) ─────────────────── */
    connectWS() {
      try {
        const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
        this._ws = new WebSocket(`${proto}//${location.host}/ws`);
        this._ws.onopen = () => { this.state.wsConnected = true; this._updateLiveBadge(); };
        this._ws.onclose = () => { this.state.wsConnected = false; this._updateLiveBadge(); setTimeout(() => this.connectWS(), 5000); };
        this._ws.onerror = () => { this.state.wsConnected = false; this._updateLiveBadge(); };
        this._ws.onmessage = (ev) => {
          let msg; try { msg = JSON.parse(ev.data); } catch { return; }
          if (msg.event === 'infrastructure-update' && msg.payload) {
            Object.assign(this.state, msg.payload);
            this.render();
          }
        };
      } catch (e) { console.warn('[Infrastructure] WS unavailable', e); }
    },

    _updateLiveBadge() {
      const b = document.querySelector('#infra-live-badge');
      if (!b) return;
      b.textContent = this.state.wsConnected ? '● EN VIVO' : '○ OFFLINE';
      b.style.color = this.state.wsConnected ? 'var(--green)' : 'var(--bone2)';
    },

    /* ───────────────────────────── RENDER ──────────────────────────── */
    render() {
      const root = document.getElementById('view-infrastructure');
      if (!root) return;
      this._destroyCharts();

      root.innerHTML = `
        <style>${this._css()}</style>
        <div class="infra">
          ${this._headerHTML()}
          ${this._tabsHTML()}
          <div class="infra-panel" id="infra-panel"></div>
        </div>
      `;

      root.querySelectorAll('.infra-tab').forEach(btn => {
        btn.addEventListener('click', () => this.switchTab(btn.dataset.tab));
      });

      this.renderPanel();
      this._updateLiveBadge();
    },

    switchTab(tab) {
      this.state.activeTab = tab;
      document.querySelectorAll('.infra-tab').forEach(b =>
        b.classList.toggle('active', b.dataset.tab === tab));
      this._destroyCharts();
      this.renderPanel();
    },

    renderPanel() {
      const panel = document.getElementById('infra-panel');
      if (!panel) return;
      switch (this.state.activeTab) {
        case 'agents':      panel.innerHTML = this._agentsHTML();      this._renderAgentsChart(); break;
        case 'loops':       panel.innerHTML = this._loopsHTML();       break;
        case 'organigrama': panel.innerHTML = this._orgHTML();         break;
        case 'graphify':    panel.innerHTML = this._graphifyHTML();    this._renderGraphCanvas(); break;
        case 'harness':     panel.innerHTML = this._harnessHTML();     break;
      }
    },

    /* ───────────────────────── HEADER + TABS ────────────────────────── */
    _headerHTML() {
      const o = this.state.overview || {};
      const kpi = (label, val, sub) => `
        <div class="infra-kpi">
          <div class="infra-kpi-label">${label}</div>
          <div class="infra-kpi-val">${val}</div>
          <div class="infra-kpi-sub">${sub}</div>
        </div>`;
      return `
        <div class="infra-header">
          <div class="infra-title">
            <h2>🏗️ Infrastructure</h2>
            <span id="infra-live-badge" class="infra-live">○ OFFLINE</span>
          </div>
          <div class="infra-kpis">
            ${kpi('AGENTES', o.agents ? o.agents.total : 155, `${o.agents ? o.agents.categories : 27} categorías`)}
            ${kpi('LOOPS', o.loops ? o.loops.total : 15, `${o.loops ? o.loops.active : 15} activos · ${o.loops ? o.loops.avgSuccessRate : 86}% éxito`)}
            ${kpi('ROLES ORG', o.organigrama ? o.organigrama.roles : 12, `${o.organigrama ? o.organigrama.levels : 4} niveles`)}
            ${kpi('GRAPHIFY', o.graphify ? o.graphify.nodes : 182, `${o.graphify ? o.graphify.edges : 342} aristas`)}
            ${kpi('HARNESS', o.harness ? `v${o.harness.version}` : 'v2.1', `${o.harness ? o.harness.metricsPass : 8}/${o.harness ? o.harness.metricsTotal : 8} métricas ✓`)}
          </div>
        </div>`;
    },

    _tabsHTML() {
      const tabs = [
        ['agents', '🤖 Agents'], ['loops', '🔄 Loops'], ['organigrama', '🏛️ Organigrama'],
        ['graphify', '🕸️ Graphify'], ['harness', '⚙️ Harness'],
      ];
      return `<div class="infra-tabs">${tabs.map(([id, label]) =>
        `<button class="infra-tab ${id === this.state.activeTab ? 'active' : ''}" data-tab="${id}">${label}</button>`
      ).join('')}</div>`;
    },

    /* ─────────────────────────── TAB: AGENTS ────────────────────────── */
    _agentsHTML() {
      const d = this.state.agents || { byCategory: [], agents: [], total: 155 };
      const top = [...d.agents].sort((a, b) => b.executionsTotal - a.executionsTotal).slice(0, 24);
      return `
        <div class="infra-grid-2">
          <div class="infra-card">
            <div class="infra-card-title">Distribución por categoría (${d.byCategory.length})</div>
            <div class="infra-chart-wrap"><canvas id="infra-agents-doughnut"></canvas></div>
          </div>
          <div class="infra-card">
            <div class="infra-card-title">Top 24 agentes por uso</div>
            <div class="infra-agent-grid">
              ${top.map(a => `
                <div class="infra-agent" style="--ac:${a.color}">
                  <span class="dot ${a.status}"></span>
                  <div class="infra-agent-name">${a.name}</div>
                  <div class="infra-agent-meta">${a.executionsTotal} ejec · ${a.successRate}%</div>
                </div>`).join('')}
            </div>
          </div>
        </div>`;
    },

    _renderAgentsChart() {
      const d = this.state.agents;
      const el = document.getElementById('infra-agents-doughnut');
      if (!el || !d || typeof Chart === 'undefined') return;
      this._charts.agents = new Chart(el, {
        type: 'doughnut',
        data: {
          labels: d.byCategory.map(c => `${c.name} (${c.count})`),
          datasets: [{
            data: d.byCategory.map(c => c.count),
            backgroundColor: d.byCategory.map(c => c.color),
            borderColor: 'rgba(0,0,0,0.25)', borderWidth: 1,
          }],
        },
        options: {
          responsive: true, maintainAspectRatio: false, cutout: '58%',
          plugins: {
            legend: { position: 'right', labels: { color: 'rgba(248,247,245,0.6)', font: { size: 9 }, boxWidth: 9, padding: 5 } },
            tooltip: { callbacks: { label: (c) => ` ${c.label}: ${c.parsed} agentes` } },
          },
        },
      });
    },

    /* ──────────────────────────── TAB: LOOPS ────────────────────────── */
    _loopsHTML() {
      const d = this.state.loops || { loops: [], tiers: [] };
      const tierColor = { core: 'var(--amber)', quality: 'var(--green)', optimization: '#3b82f6' };
      const rows = d.loops.map(l => `
        <tr>
          <td class="mono">${l.id}</td>
          <td>${l.name}</td>
          <td><span class="infra-pill" style="color:${tierColor[l.tier]};border-color:${tierColor[l.tier]}">${l.tier}</span></td>
          <td>${l.schedule}</td>
          <td><span class="dot ${l.status === 'active' ? 'healthy' : 'error'}"></span> ${l.status}</td>
          <td>
            <div class="infra-bar"><div class="infra-bar-fill" style="width:${l.successRate}%"></div></div>
            <span class="infra-bar-label">${l.successRate}%</span>
          </td>
        </tr>`).join('');
      const tierCards = d.tiers.map(t => `
        <div class="infra-kpi">
          <div class="infra-kpi-label">${t.tier.toUpperCase()}</div>
          <div class="infra-kpi-val">${t.count}</div>
          <div class="infra-kpi-sub">${t.avgSuccessRate}% éxito promedio</div>
        </div>`).join('');
      return `
        <div class="infra-kpis" style="margin-bottom:16px">${tierCards}</div>
        <div class="infra-card">
          <div class="infra-card-title">15 loops autónomos</div>
          <table class="infra-table">
            <thead><tr><th>ID</th><th>Nombre</th><th>Tier</th><th>Schedule</th><th>Estado</th><th>Éxito</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>`;
    },

    /* ───────────────────────── TAB: ORGANIGRAMA ─────────────────────── */
    _orgHTML() {
      const d = this.state.organigrama;
      if (!d || !d.tree) return `<div class="infra-empty">Sin datos de organigrama</div>`;
      return `
        <div class="infra-card">
          <div class="infra-card-title">Cadena de mando (${d.total} roles)</div>
          <div class="infra-org-scroll">${this._orgSVG(d.tree)}</div>
        </div>`;
    },

    _orgSVG(tree) {
      // Layout: assign x by in-order leaf index, y by depth.
      const NODE_W = 168, NODE_H = 54, GAP_X = 24, GAP_Y = 78;
      const levels = [];
      const positioned = [];
      let leafX = 0;

      const layout = (node, depth) => {
        levels[depth] = levels[depth] || [];
        if (!node.children || node.children.length === 0) {
          node._x = leafX++ * (NODE_W + GAP_X);
        } else {
          node.children.forEach(c => layout(c, depth + 1));
          const first = node.children[0]._x, last = node.children[node.children.length - 1]._x;
          node._x = (first + last) / 2;
        }
        node._y = depth * (NODE_H + GAP_Y);
        node._depth = depth;
        positioned.push(node);
      };
      layout(tree, 0);

      const maxX = Math.max(...positioned.map(n => n._x)) + NODE_W + 20;
      const maxY = Math.max(...positioned.map(n => n._y)) + NODE_H + 20;

      const edges = positioned.flatMap(n => (n.children || []).map(c => {
        const x1 = n._x + NODE_W / 2, y1 = n._y + NODE_H;
        const x2 = c._x + NODE_W / 2, y2 = c._y;
        const my = (y1 + y2) / 2;
        return `<path d="M${x1},${y1} C${x1},${my} ${x2},${my} ${x2},${y2}" fill="none" stroke="var(--border)" stroke-width="1.5"/>`;
      })).join('');

      const modelColor = { Opus: '#a855f7', Sonnet: 'var(--amber)', Haiku: 'var(--green)' };
      const nodes = positioned.map(n => `
        <g transform="translate(${n._x},${n._y})">
          <rect width="${NODE_W}" height="${NODE_H}" rx="4" fill="var(--surface2)" stroke="${modelColor[n.model] || 'var(--border)'}" stroke-width="1.5"/>
          <text x="10" y="20" fill="var(--bone)" font-size="11" font-weight="600">${this._esc(n.title)}</text>
          <text x="10" y="35" fill="var(--bone2)" font-size="9">${this._esc(n.role)}</text>
          <text x="${NODE_W - 10}" y="20" text-anchor="end" fill="${modelColor[n.model] || 'var(--bone2)'}" font-size="8" font-weight="600">${n.model}</text>
        </g>`).join('');

      return `<svg viewBox="0 0 ${maxX} ${maxY}" width="${maxX}" height="${maxY}" style="min-width:${maxX}px">${edges}${nodes}</svg>`;
    },

    /* ─────────────────────────── TAB: GRAPHIFY ──────────────────────── */
    _graphifyHTML() {
      const s = (this.state.graphify && this.state.graphify.stats) || {};
      const kpi = (label, val) => `
        <div class="infra-kpi"><div class="infra-kpi-label">${label}</div><div class="infra-kpi-val">${val}</div></div>`;
      return `
        <div class="infra-kpis" style="margin-bottom:16px">
          ${kpi('NODOS', s.nodeCount || 0)}
          ${kpi('ARISTAS', s.edgeCount || 0)}
          ${kpi('CLUSTERS', s.clusters || 0)}
          ${kpi('DENSIDAD', s.density != null ? (s.density * 100).toFixed(1) + '%' : 'N/A')}
          ${kpi('GRADO MED', s.avgDegree || 0)}
          ${kpi('AHORRO TOK', (s.tokenSavingPct || 0) + '%')}
        </div>
        <div class="infra-card">
          <div class="infra-card-title">Grafo de dependencias (155 agentes + 27 hubs)</div>
          <canvas id="infra-graph-canvas" width="1100" height="560" style="width:100%;display:block"></canvas>
        </div>`;
    },

    _renderGraphCanvas() {
      const g = this.state.graphify;
      const canvas = document.getElementById('infra-graph-canvas');
      if (!g || !canvas || !canvas.getContext) return;
      const ctx = canvas.getContext('2d');
      const W = canvas.width, H = canvas.height, cx = W / 2, cy = H / 2;

      const cats = (this.state.agents && this.state.agents.byCategory) || [];
      const catColor = Object.fromEntries(cats.map(c => [c.id, c.color]));

      // Radial layout: hubs on inner ring by category, agents on outer ring near their hub.
      const hubs = g.nodes.filter(n => n.hub);
      const agentsN = g.nodes.filter(n => !n.hub);
      const pos = {};
      const Rhub = Math.min(W, H) * 0.20, Ragent = Math.min(W, H) * 0.42;

      hubs.forEach((h, i) => {
        const a = (i / hubs.length) * Math.PI * 2 - Math.PI / 2;
        pos[h.id] = { x: cx + Rhub * Math.cos(a), y: cy + Rhub * Math.sin(a), ang: a };
      });
      const byGroup = {};
      agentsN.forEach(n => { (byGroup[n.group] = byGroup[n.group] || []).push(n); });
      Object.keys(byGroup).forEach(group => {
        const hub = pos[`hub:${group}`]; if (!hub) return;
        const arr = byGroup[group], spread = 0.30;
        arr.forEach((n, j) => {
          const a = hub.ang + (arr.length > 1 ? (j / (arr.length - 1) - 0.5) * spread : 0);
          pos[n.id] = { x: cx + Ragent * Math.cos(a), y: cy + Ragent * Math.sin(a) };
        });
      });

      // Edges
      ctx.lineWidth = 0.4;
      g.edges.forEach(e => {
        const s = pos[e.source], t = pos[e.target];
        if (!s || !t) return;
        ctx.strokeStyle = e.weight >= 2 ? 'rgba(255,170,23,0.20)' : 'rgba(248,247,245,0.06)';
        ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(t.x, t.y); ctx.stroke();
      });
      // Hub nodes
      hubs.forEach(h => {
        const p = pos[h.id]; if (!p) return;
        ctx.fillStyle = catColor[h.group] || '#FFAA17';
        ctx.beginPath(); ctx.arc(p.x, p.y, 5, 0, Math.PI * 2); ctx.fill();
      });
      // Agent nodes
      agentsN.forEach(n => {
        const p = pos[n.id]; if (!p) return;
        ctx.fillStyle = catColor[n.group] || 'rgba(248,247,245,0.55)';
        ctx.beginPath(); ctx.arc(p.x, p.y, 2.1, 0, Math.PI * 2); ctx.fill();
      });
      // Center label
      ctx.fillStyle = 'rgba(248,247,245,0.85)';
      ctx.font = '600 12px Inter, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('gerente-ia', cx, cy + 4);
    },

    /* ─────────────────────────── TAB: HARNESS ───────────────────────── */
    _harnessHTML() {
      const h = this.state.harness;
      if (!h) return `<div class="infra-empty">Sin datos de harness</div>`;
      const modelColor = { Opus: '#a855f7', Sonnet: 'var(--amber)', Haiku: 'var(--green)' };
      const roleRows = h.roles.map(r => `
        <tr>
          <td>${r.name}</td>
          <td><span class="infra-pill" style="color:${modelColor[r.model] || 'var(--bone2)'};border-color:${modelColor[r.model] || 'var(--border)'}">${r.model}</span></td>
          <td>${r.frequency}</td><td class="mono">${r.sla}</td><td>${r.output}</td>
        </tr>`).join('');
      const metricCards = h.metrics.map(m => `
        <div class="infra-metric ${m.pass ? 'ok' : 'bad'}">
          <div class="infra-metric-key">${m.key}</div>
          <div class="infra-metric-val">${m.measured}</div>
          <div class="infra-metric-target">target ${m.target} ${m.pass ? '✓' : '✗'}</div>
        </div>`).join('');
      const pillars = h.pillars.map(p => `
        <div class="infra-pillar"><b>P${p.id} · ${p.name}</b><span>${p.detail}</span></div>`).join('');
      return `
        <div class="infra-card" style="margin-bottom:16px">
          <div class="infra-card-title">Harness v${h.version} · ${h.status} · actualizado ${h.lastUpdate}</div>
          <div class="infra-pillars">${pillars}</div>
        </div>
        <div class="infra-card" style="margin-bottom:16px">
          <div class="infra-card-title">Métricas de producción</div>
          <div class="infra-metric-grid">${metricCards}</div>
        </div>
        <div class="infra-card">
          <div class="infra-card-title">${h.roles.length} roles de orquestación</div>
          <table class="infra-table">
            <thead><tr><th>Rol</th><th>Modelo</th><th>Frecuencia</th><th>SLA</th><th>Output</th></tr></thead>
            <tbody>${roleRows}</tbody>
          </table>
        </div>`;
    },

    /* ────────────────────────────── UTILS ───────────────────────────── */
    _destroyCharts() {
      Object.values(this._charts).forEach(c => { try { c.destroy(); } catch {} });
      this._charts = {};
    },
    _esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m])); },

    _loadingHTML() {
      return `<div class="infra-empty" style="padding:60px;text-align:center;color:var(--bone2)">Cargando infraestructura…</div>`;
    },
    _errorHTML(msg) {
      return `<div style="padding:40px;text-align:center;color:var(--red)">
        <div style="font-weight:600;margin-bottom:8px">No se pudo cargar Infrastructure</div>
        <div style="font-size:12px;color:var(--bone2)">${this._esc(msg)}</div>
        <button onclick="InfrastructureDashboard.state.loaded=false;InfrastructureDashboard.init()"
          style="margin-top:16px;background:var(--amber);color:#070809;border:none;padding:8px 16px;border-radius:3px;cursor:pointer;font-weight:600">
          Reintentar</button></div>`;
    },

    _css() {
      return `
        .infra{padding:4px 2px 40px}
        .infra-header{display:flex;flex-direction:column;gap:14px;margin-bottom:18px}
        .infra-title{display:flex;align-items:center;gap:12px}
        .infra-title h2{font-size:18px;font-weight:700;color:var(--bone);margin:0}
        .infra-live{font-size:9px;font-weight:700;letter-spacing:.1em;color:var(--bone2)}
        .infra-kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px}
        .infra-kpi{background:var(--surface);border:1px solid var(--border);border-radius:4px;padding:12px 14px}
        .infra-kpi-label{font-size:9px;font-weight:600;letter-spacing:.12em;color:var(--bone2);text-transform:uppercase}
        .infra-kpi-val{font-size:22px;font-weight:700;color:var(--amber);margin:3px 0;font-family:Inter,sans-serif}
        .infra-kpi-sub{font-size:10px;color:var(--bone2)}
        .infra-tabs{display:flex;gap:6px;border-bottom:1px solid var(--border);margin-bottom:18px;flex-wrap:wrap}
        .infra-tab{background:transparent;border:none;border-bottom:2px solid transparent;color:var(--bone2);
          padding:9px 14px;font-size:12px;font-weight:600;cursor:pointer;transition:all .15s}
        .infra-tab:hover{color:var(--bone)}
        .infra-tab.active{color:var(--amber);border-bottom-color:var(--amber)}
        .infra-grid-2{display:grid;grid-template-columns:minmax(320px,1fr) minmax(320px,1.2fr);gap:16px}
        @media(max-width:900px){.infra-grid-2{grid-template-columns:1fr}}
        .infra-card{background:var(--surface);border:1px solid var(--border);border-radius:5px;padding:16px}
        .infra-card-title{font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;
          color:var(--bone);margin-bottom:14px}
        .infra-chart-wrap{position:relative;height:300px}
        .infra-agent-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px}
        .infra-agent{background:var(--surface2);border:1px solid var(--border);border-left:2px solid var(--ac);
          border-radius:3px;padding:8px 10px}
        .infra-agent-name{font-size:11px;font-weight:600;color:var(--bone);word-break:break-word}
        .infra-agent-meta{font-size:9px;color:var(--bone2);margin-top:2px}
        .dot{display:inline-block;width:7px;height:7px;border-radius:50%;margin-right:4px;vertical-align:middle}
        .dot.healthy{background:var(--green)} .dot.warning{background:var(--amber)} .dot.error{background:var(--red)}
        .infra-table{width:100%;border-collapse:collapse;font-size:11px}
        .infra-table th{text-align:left;color:var(--bone2);font-size:9px;letter-spacing:.08em;text-transform:uppercase;
          padding:6px 8px;border-bottom:1px solid var(--border)}
        .infra-table td{padding:8px;border-bottom:1px solid var(--border);color:var(--bone);vertical-align:middle}
        .infra-table tr:hover td{background:var(--amber2)}
        .mono{font-family:ui-monospace,Menlo,monospace;font-size:10px;color:var(--bone2)}
        .infra-pill{display:inline-block;font-size:9px;font-weight:700;padding:2px 8px;border-radius:10px;
          border:1px solid;text-transform:uppercase;letter-spacing:.05em}
        .infra-bar{display:inline-block;width:70px;height:5px;background:var(--border);border-radius:3px;
          overflow:hidden;vertical-align:middle;margin-right:6px}
        .infra-bar-fill{height:100%;background:var(--green)}
        .infra-bar-label{font-size:10px;color:var(--bone2)}
        .infra-org-scroll{overflow-x:auto;padding:8px 0}
        .infra-pillars{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:10px}
        .infra-pillar{background:var(--surface2);border:1px solid var(--border);border-radius:3px;padding:10px 12px;
          display:flex;flex-direction:column;gap:4px}
        .infra-pillar b{font-size:11px;color:var(--amber)} .infra-pillar span{font-size:10px;color:var(--bone2)}
        .infra-metric-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px}
        .infra-metric{background:var(--surface2);border:1px solid var(--border);border-radius:3px;padding:12px}
        .infra-metric.ok{border-left:2px solid var(--green)} .infra-metric.bad{border-left:2px solid var(--red)}
        .infra-metric-key{font-size:10px;color:var(--bone2);text-transform:uppercase;letter-spacing:.06em}
        .infra-metric-val{font-size:18px;font-weight:700;color:var(--bone);margin:3px 0}
        .infra-metric-target{font-size:9px;color:var(--bone2)}
        .infra-empty{padding:40px;text-align:center;color:var(--bone2);font-size:12px}
      `;
    },
  };

  if (typeof window !== 'undefined') window.InfrastructureDashboard = InfrastructureDashboard;
})();
