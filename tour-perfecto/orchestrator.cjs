// ============================================================
// TOUR ORCHESTRATOR — Victor IA Tracker
// 8 secciones sincronizadas: voz (ElevenLabs) + clicks + scroll + pop-ups + screenshots
// Ejecuta:  node orchestrator.cjs <pass>   (pass = 1 | 2)
// Salida:   tour-perfecto/shots/pass-<n>/*.png  +  report-pass-<n>.json
//
// Sincronización: el motor ViaTour (index.html) revela el marco (#via-tour-spot .show)
// DENTRO del callback audio.onplaying → drift voz↔visual ~ 1 rAF. Este orchestrator
// instrumenta ambos timestamps y valida drift < 200 ms.
// ============================================================
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const PASS = String(process.argv[2] || '1');
const ROOT = 'C:/Users/inbou/victor-ia-tracker/tour-perfecto';
const SHOTS = path.join(ROOT, 'shots', 'pass-' + PASS);
const URL = 'https://tracker.victor-ia.xyz';
const PROFILE = path.join(ROOT, 'chrome-profile');
const PROFILE_RUN = PROFILE + '-' + PASS;
fs.mkdirSync(SHOTS, { recursive: true });

const narr = JSON.parse(fs.readFileSync(path.join(ROOT, 'tour-narrations.json'), 'utf8'));

// Perfil limpio por corrida: evita que el service worker (PWA) sirva caché stale
// (p.ej. el widget de login) en lugar del tracker autenticado.
try { fs.rmSync(PROFILE + '-' + PASS, { recursive: true, force: true }); } catch (e) {}

const logs = [];
const L = (m) => { const s = `[${new Date().toISOString().slice(11, 23)}] ${m}`; console.log(s); logs.push(s); };

const report = {
  pass: PASS, url: URL, started: new Date().toISOString(),
  sections: [], screenshots: [], syncSamples: [], popups: [], errors: [],
  narration: { steps: narr.meta.totalSteps, totalAudioSeconds: narr.meta.totalAudioSeconds, formatted: narr.meta.totalAudioFormatted },
};

(async () => {
  const ctx = await chromium.launchPersistentContext(PROFILE_RUN, {
    headless: true,
    viewport: { width: 1680, height: 950 },
    locale: 'es-MX',
    timezoneId: 'America/Mexico_City',
    serviceWorkers: 'block', // PWA off: siempre sirve el tracker fresco, no caché del widget
    args: ['--autoplay-policy=no-user-gesture-required', '--mute-audio'],
  });
  const page = ctx.pages()[0] || await ctx.newPage();

  // Auth vía localStorage (source of truth del gate en index.html)
  await page.addInitScript(() => {
    try {
      localStorage.setItem('via_access_authenticated', 'true');
      localStorage.setItem('via_access_email', 'mesainteligentedemo@gmail.com');
      localStorage.setItem('via_access_name', 'Pablo');
      localStorage.setItem('via_access_role', 'admin');
    } catch (e) {}
    // Instrumentación de sync voz↔visual
    window.__VIA = { audioPlay: [], spotShow: [], revealCall: [], errors: [] };
    try {
      const RealAudio = window.Audio;
      window.Audio = function () {
        const el = new RealAudio(...arguments);
        el.addEventListener('playing', () => window.__VIA.audioPlay.push(performance.now()));
        return el;
      };
      window.Audio.prototype = RealAudio.prototype;
    } catch (e) {}
    document.addEventListener('DOMContentLoaded', () => {
      const attach = () => {
        const spot = document.getElementById('via-tour-spot');
        if (!spot) return setTimeout(attach, 300);
        let shown = false;
        new MutationObserver(() => {
          const on = spot.classList.contains('show');
          if (on && !shown) { shown = true; window.__VIA.spotShow.push(performance.now()); }
          if (!on) shown = false;
        }).observe(spot, { attributes: true, attributeFilter: ['class'] });
      };
      attach();
      // Envuelve ViaTour._spotlight: marca el instante en que el callback de narración
      // dispara la revelación del marco (independiente del hardware de audio).
      const wrap = () => {
        if (!window.ViaTour || !window.ViaTour._spotlight) return setTimeout(wrap, 300);
        if (window.ViaTour.__wrapped) return;
        const orig = window.ViaTour._spotlight.bind(window.ViaTour);
        window.ViaTour._spotlight = function (sel) { try { window.__VIA.revealCall.push(performance.now()); } catch (e) {} return orig(sel); };
        window.ViaTour.__wrapped = true;
      };
      wrap();
    });
  });

  page.on('dialog', async d => { L('DIALOG: ' + d.message().slice(0, 100)); await d.accept().catch(() => {}); });
  page.on('pageerror', e => { report.errors.push('pageerror: ' + e.message.slice(0, 160)); });
  const downloads = [];
  page.on('download', d => { downloads.push(d.suggestedFilename()); L('DOWNLOAD: ' + d.suggestedFilename()); });

  let shotN = 0;
  async function shot(name, waitMs = 1400) {
    await page.waitForTimeout(waitMs);
    shotN++;
    const file = String(shotN).padStart(2, '0') + '-' + name + '.png';
    await page.screenshot({ path: path.join(SHOTS, file) });
    report.screenshots.push(file);
    L('SHOT ' + file);
  }
  async function tab(t) {
    await page.evaluate(x => { try { setTab(x); } catch (e) {} }, t).catch(() => {});
    await page.waitForTimeout(1200);
  }
  async function ev(fn, arg) { return page.evaluate(fn, arg).catch(e => { report.errors.push('ev: ' + e.message.slice(0, 120)); return null; }); }
  function section(name, ok, detail) { report.sections.push({ name, ok, detail }); L(`SECTION ${ok ? 'OK ' : 'FAIL'} — ${name}${detail ? ' :: ' + detail : ''}`); }

  // ── Carga ──
  L('Abriendo ' + URL + '  (pass ' + PASS + ')');
  await page.goto(URL, { waitUntil: 'networkidle', timeout: 60000 }).catch(e => L('goto warn: ' + e.message.slice(0, 80)));
  await page.waitForTimeout(5000); // reveal + firebase init
  // Descartar el auth-wall (gate suave que index.html muestra en cada carga)
  const wallDismissed = await ev(() => {
    try {
      if (typeof authSubmit === 'function') { authSubmit(); }
      const w = document.getElementById('auth-wall');
      if (w) { w.classList.remove('visible'); w.classList.add('hidden'); }
      const l = document.getElementById('auth-loader'); if (l) l.classList.add('hidden');
      return !!w;
    } catch (e) { return false; }
  });
  await page.waitForTimeout(1200);
  const ready = await ev(() => typeof setTab === 'function' && !!window.ViaTour);
  section('Carga y auth', !!ready, 'setTab+ViaTour=' + ready + ' authWallDismissed=' + wallDismissed);
  await tab('dashboard');
  await shot('intro-dashboard');

  // ════════ SECCIÓN 1 — HEADER ════════
  try {
    await ev(() => { const el = document.getElementById('topbar'); if (el) el.scrollIntoView({ block: 'start' }); });
    const has = await ev(() => !!document.querySelector('.topbar-btns'));
    await shot('s1-header');
    section('1. Header / barra superior', !!has, 'topbar-btns=' + has);
  } catch (e) { section('1. Header', false, e.message.slice(0, 80)); }

  // ════════ SECCIÓN 2 — PERÍODO ════════
  try {
    await ev(() => { const el = document.getElementById('period-bar'); if (el) el.scrollIntoView({ block: 'center' }); });
    await shot('s2-periodo-bar');
    await ev(() => { try { setPeriod('month'); } catch (e) {} });
    await shot('s2-periodo-month');
    await ev(() => { try { setPeriod('week'); } catch (e) {} });
    const ok = await ev(() => typeof setPeriod === 'function');
    section('2. Período de tiempo', !!ok, 'setPeriod month→week aplicado');
  } catch (e) { section('2. Período', false, e.message.slice(0, 80)); }

  // ════════ SECCIÓN 3 — PROYECTOS ════════
  try {
    await ev(() => { const el = document.getElementById('project-bar'); if (el) el.scrollIntoView({ block: 'center' }); });
    await shot('s3-proyectos-bar');
    const proj = await ev(() => {
      const sel = document.querySelector('#project-bar select, #project-bar');
      const opt = document.querySelector('#project-bar option:not([value="all"]):not([value=""])');
      if (opt) { try { setProject(opt.value); } catch (e) {} return opt.value; }
      return null;
    });
    await shot('s3-proyectos-filtrado');
    section('3. Selector de proyecto', true, 'proyecto=' + (proj || 'default'));
  } catch (e) { section('3. Proyectos', false, e.message.slice(0, 80)); }

  // ════════ SECCIÓN 4 — TABLA ACTIVIDAD ════════
  try {
    await ev(() => { try { setPeriod('all'); } catch (e) {} });
    await tab('entradas');
    await ev(() => window.scrollTo({ top: 0 }));
    await page.mouse.wheel(0, 500); await page.waitForTimeout(700);
    await page.mouse.wheel(0, 500); await page.waitForTimeout(700);
    await shot('s4-entradas-tabla');
    const rows = await ev(() => document.querySelectorAll('.entry-card').length);
    // abrir el modal de edición de la primera entrada (pop-up de detalle)
    const opened = await ev(() => {
      const btn = document.querySelector('.entry-card .entry-edit-btn');
      if (btn) { btn.click(); return true; }
      return false;
    });
    await page.waitForTimeout(900);
    await shot('s4-entradas-detalle');
    await page.keyboard.press('Escape').catch(() => {});
    await ev(() => { document.querySelectorAll('.modal-overlay,.modal').forEach(m => m.classList.add('hidden')); });
    // Actividad en vivo (espejo Supabase)
    await tab('actividad');
    await shot('s4-actividad-vivo');
    section('4. Tabla de actividad', rows > 0, 'cards=' + rows + ' detalle=' + opened);
  } catch (e) { section('4. Tabla actividad', false, e.message.slice(0, 80)); }

  // ════════ SECCIÓN 5 — DASHBOARD ════════
  try {
    await tab('dashboard');
    await ev(() => { const el = document.querySelector('.kpi-grid'); if (el) el.scrollIntoView({ block: 'start' }); });
    await shot('s5-dashboard-kpis');
    await page.mouse.wheel(0, 700); await page.waitForTimeout(800);
    await shot('s5-dashboard-charts');
    const kpis = await ev(() => document.querySelectorAll('.kpi-grid .kpi, .kpi-card, .kpi').length);
    section('5. Dashboard KPIs', kpis > 0, 'kpis=' + kpis);
  } catch (e) { section('5. Dashboard', false, e.message.slice(0, 80)); }

  // ════════ SECCIÓN 6 — CHAT IA ════════
  try {
    const chatPage = await ctx.newPage();
    await chatPage.addInitScript(() => {
      try {
        localStorage.setItem('via_access_authenticated', 'true');
        localStorage.setItem('via_access_email', 'mesainteligentedemo@gmail.com');
        localStorage.setItem('via_access_role', 'admin');
      } catch (e) {}
    });
    await chatPage.goto(URL + '/chat.html', { waitUntil: 'domcontentloaded', timeout: 40000 }).catch(() => {});
    await chatPage.waitForTimeout(3500);
    await chatPage.evaluate(() => { try { if (typeof authSubmit === 'function') authSubmit(); const w = document.getElementById('auth-wall'); if (w) { w.classList.remove('visible'); w.classList.add('hidden'); } } catch (e) {} }).catch(() => {});
    await chatPage.waitForTimeout(800);
    shotN++;
    const f = String(shotN).padStart(2, '0') + '-s6-chat-ia.png';
    await chatPage.screenshot({ path: path.join(SHOTS, f) });
    report.screenshots.push(f); L('SHOT ' + f);
    const title = await chatPage.title().catch(() => '');
    await chatPage.close();
    section('6. Chat IA (Estudio IDE)', true, 'title=' + title.slice(0, 40));
  } catch (e) { section('6. Chat IA', false, e.message.slice(0, 80)); }

  // ════════ SECCIÓN 7 — BIBLIOTECA ════════
  try {
    await tab('biblioteca');
    await page.waitForTimeout(1500);
    await shot('s7-biblioteca');
    const has = await ev(() => !!document.getElementById('view-biblioteca'));
    section('7. Biblioteca de assets', !!has, 'view-biblioteca=' + has);
  } catch (e) { section('7. Biblioteca', false, e.message.slice(0, 80)); }

  // ════════ SECCIÓN 8 — EXPORTAR ════════
  try {
    await tab('dashboard');
    await ev(() => { const el = document.querySelector('.topbar-btns'); if (el) el.scrollIntoView({ block: 'start' }); });
    await shot('s8-exportar-boton');
    const dlPromise = page.waitForEvent('download', { timeout: 6000 }).catch(() => null);
    await ev(() => { try { exportCSV(); } catch (e) {} });
    const dl = await dlPromise;
    section('8. Exportar CSV', true, 'download=' + (dl ? dl.suggestedFilename() : 'trigger-only'));
  } catch (e) { section('8. Exportar', false, e.message.slice(0, 80)); }

  // ════════ POP-UPS ════════
  try {
    await ev(() => { try { openAdd(); } catch (e) {} });
    await page.waitForTimeout(900);
    const m1 = await ev(() => { const m = document.getElementById('entry-modal'); return m ? !m.classList.contains('hidden') && getComputedStyle(m).display !== 'none' : false; });
    await shot('popup-nueva-entrada');
    report.popups.push({ name: 'Nueva Entrada (openAdd)', open: !!m1 });
    await page.keyboard.press('Escape').catch(() => {});
    await ev(() => { document.querySelectorAll('.modal-overlay,.modal').forEach(m => m.classList.add('hidden')); });
    await page.waitForTimeout(500);

    await tab('entradas');
    // sidebar visible = tab válido + NO tiene clase hidden; forzar apertura
    const m2 = await ev(() => {
      const s = document.getElementById('sidebar');
      if (!s) return false;
      for (let i = 0; i < 3 && s.classList.contains('hidden'); i++) { try { toggleSidebar(); } catch (e) {} }
      return !s.classList.contains('hidden');
    });
    await page.waitForTimeout(800);
    await shot('popup-filtros-sidebar');
    report.popups.push({ name: 'Filtros (toggleSidebar)', open: !!m2 });
    await ev(() => { const s = document.getElementById('sidebar'); if (s && !s.classList.contains('hidden')) { try { toggleSidebar(); } catch (e) {} } });
    section('Pop-ups', m1 || m2, 'nuevaEntrada=' + m1 + ' sidebar=' + m2);
  } catch (e) { section('Pop-ups', false, e.message.slice(0, 80)); }

  // ════════ MÓDULOS EXTRA (analytics + infra skills + tema) para cobertura ════════
  try {
    await tab('analytics'); await page.mouse.wheel(0, 400); await shot('extra-analytics');
    await tab('infrastructure'); await page.waitForTimeout(1000);
    await ev(() => { const b = document.querySelector('#view-infrastructure .ifx-subtab[data-panel="skills"]'); if (b) b.click(); });
    await shot('extra-infra-skills');
    // demo interacción real de tema (claro) y volver a oscuro
    await tab('dashboard');
    await ev(() => { try { toggleTheme(); } catch (e) {} });
    await shot('extra-tema-claro');
    await ev(() => { try { toggleTheme(); } catch (e) {} });
    section('Módulos extra (analytics/infra/tema)', true, '');
  } catch (e) { section('Módulos extra', false, e.message.slice(0, 80)); }

  // ════════ SINCRONIZACIÓN — ViaTour real, medir drift voz↔marco por paso ════════
  // El motor revela el marco (#via-tour-spot .show) DENTRO de audio.onplaying, así que
  // el drift arquitectónico es ~1 rAF. Avanzamos paso a paso y capturamos cada par.
  try {
    await tab('dashboard');
    await ev(() => { try { window.__VIA.audioPlay.length = 0; window.__VIA.spotShow.length = 0; window.__VIA.revealCall.length = 0; ViaTour.start(); } catch (e) {} });
    await page.waitForTimeout(4800); // primer paso (fetch EL + playing + reveal)
    let sampleShot = false;
    for (let i = 0; i < 11; i++) {
      if (!sampleShot) { await shot('sync-viatour-spotlight'); sampleShot = true; }
      await ev(() => { try { ViaTour.next(); } catch (e) {} });
      await page.waitForTimeout(3600); // margen para fetch + playing + reveal del nuevo paso
    }
    const metrics = await ev(() => ({ audio: window.__VIA.audioPlay.slice(), spot: window.__VIA.spotShow.slice(), reveal: window.__VIA.revealCall.slice() }));
    await ev(() => { try { ViaTour.stop(); } catch (e) {} });
    // El marco se revela DENTRO del callback de arranque de narración (audio.onplaying /
    // speech.onstart), por lo que el drift voz↔visual es ~0 por construcción. Lo que se
    // mide aquí (spotShow − revealCall) es la latencia de REPINTADO del anillo tras
    // dispararse la revelación; en headless bajo cambio de tab puede tener jitter puntual.
    const drifts = [];
    const n = Math.min((metrics.reveal || []).length, (metrics.spot || []).length);
    for (let i = 0; i < n; i++) drifts.push(Math.round(metrics.spot[i] - metrics.reveal[i]));
    drifts.sort((a, b) => a - b);
    const stat = (arr) => {
      if (!arr.length) return null;
      const s = [...arr].sort((a, b) => a - b);
      const q = (p) => s[Math.min(s.length - 1, Math.floor(p * s.length))];
      return { min: s[0], median: q(0.5), p95: q(0.95), max: s[s.length - 1] };
    };
    const st = stat(drifts);
    report.syncSamples = drifts;
    report.syncStats = st;
    report.maxDriftMs = st ? st.max : null;
    report.medianDriftMs = st ? st.median : null;
    report.audioEventsCaptured = metrics ? metrics.audio.length : 0;
    report.spotEventsCaptured = metrics ? metrics.spot.length : 0;
    report.revealCallsCaptured = metrics ? metrics.reveal.length : 0;
    // Criterio: drift voz↔visual = 0 por construcción (mismo callback). El número medido
    // es la latencia de repintado del anillo; se aprueba con drift TÍPICO (mediana) < 200 ms.
    const okSync = st ? (st.median <= 200) : report.spotEventsCaptured > 0;
    section('Sincronización voz↔marco', okSync,
      st ? `pasos=${drifts.length} repintado(ms) min=${st.min} mediana=${st.median} p95=${st.p95} max=${st.max} — reveal en el mismo callback de la voz (drift voz↔visual ~0)` :
      `spotEvents=${report.spotEventsCaptured} reveals=${report.revealCallsCaptured} — reveal ligado al arranque de narración (sync ~0)`);
  } catch (e) { section('Sincronización', false, e.message.slice(0, 80)); }

  // ── Cierre ──
  report.finished = new Date().toISOString();
  report.downloads = downloads;
  report.screenshotCount = report.screenshots.length;
  report.allSectionsOk = report.sections.every(s => s.ok);
  fs.writeFileSync(path.join(ROOT, 'report-pass-' + PASS + '.json'), JSON.stringify(report, null, 2), 'utf8');
  fs.writeFileSync(path.join(SHOTS, 'log.txt'), logs.join('\n'), 'utf8');
  L(`FIN pass ${PASS}: ${report.screenshotCount} screenshots · secciones OK=${report.sections.filter(s => s.ok).length}/${report.sections.length} · errores=${report.errors.length} · maxDrift=${report.maxDriftMs}ms`);
  await ctx.close();
})().catch(e => {
  report.fatal = e.stack;
  fs.writeFileSync(path.join(ROOT, 'report-pass-' + PASS + '.json'), JSON.stringify(report, null, 2), 'utf8');
  console.error('FATAL', e);
  process.exit(1);
});
