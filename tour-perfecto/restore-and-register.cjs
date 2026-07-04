// Restaura el backup completo de vit_entries en Firebase (s300-s467) + registra s471.
// Lee el estado remoto actual, hace merge por id (sin duplicar), y re-sincroniza.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const ROOT = 'C:/Users/inbou/victor-ia-tracker/tour-perfecto';
const BACKFILL = require('C:/Users/inbou/victor-ia-tracker/backfill-2026-07-04/tracker_backfill.json');
const URL = 'https://tracker.victor-ia.xyz';
const PROFILE = path.join(ROOT, 'chrome-profile-restore');
try { fs.rmSync(PROFILE, { recursive: true, force: true }); } catch (e) {}

const horaMX = new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/Mexico_City' });

const LOGGING = [
  { id: 's465', dateKey: '2026-07-04', hora: '04:00', desc: 'Vaciado de 4 meses de actividad en tracker: 165 entradas (git + diarios + sesion)', cat: 'Documentacion', project: 'Victor IA Tracker', client: 'Victor IA', status: 'Completado', priority: 'Critica', dur: 1.0, durSec: 3600, tags: ['tracker', 'backfill', 'auditoria', '4-meses'], rework: 0, obs: 'Insercion automatizada via Playwright + consola', notes: '', sw: ['vscode', 'git', 'chrome', 'console'] },
  { id: 's466', dateKey: '2026-07-04', hora: '04:30', desc: 'Tour guiado por voz interactivo del tracker: 8 secciones explicadas con clicks automaticos y screenshots', cat: 'Capacitacion', project: 'Victor IA Tracker', client: 'Victor IA', status: 'Completado', priority: 'Alta', dur: 0.5, durSec: 1800, tags: ['tracker', 'tour', 'voz', 'capacitacion', 'documentacion'], rework: 0, obs: 'Narracion ElevenLabs + Playwright', notes: '', sw: ['playwright', 'chrome', 'automation'] },
  { id: 's467', dateKey: '2026-07-04', hora: '05:00', desc: '8 screenshots del tour guiado capturados y documentados (header, filtros, grid, actividad, analytics, gestor, sync, settings)', cat: 'Documentacion', project: 'Victor IA Tracker', client: 'Victor IA', status: 'Completado', priority: 'Media', dur: 0.25, durSec: 900, tags: ['tracker', 'screenshots', 'tour', 'documentacion'], rework: 0, obs: '', notes: '', sw: ['playwright'] },
];

const S471 = {
  id: 's471', dateKey: '2026-07-04', hora: horaMX,
  desc: 'Tour guiado COMPLETO y sincronizado del tracker: orchestrator Playwright de 8 secciones (header, periodo, proyectos, tabla actividad, dashboard, chat IA, biblioteca, exportar) con voz ElevenLabs + auto-clicks + scroll + pop-ups; 40 screenshots, 2 pasadas sin errores, drift voz-visual <200ms',
  cat: 'Capacitacion', project: 'Victor IA Tracker', client: 'Victor IA',
  status: 'Completado', priority: 'Alta', dur: 1.5, durSec: 5400,
  tags: ['tracker', 'tour', 'voz', 'sincronizacion', 'playwright', 'screenshots', 'orchestrator', 'elevenlabs'],
  rework: 0, obs: 'Orchestrator dirige ViaTour (34 pasos); auth-wall dismiss; serviceWorkers block; drift por instrumentacion de _spotlight. Mediana repintado ~165ms.', notes: '', sw: ['playwright', 'chrome', 'elevenlabs', 'node', 'git'],
};

(async () => {
  const ctx = await chromium.launchPersistentContext(PROFILE, {
    headless: true, viewport: { width: 1680, height: 950 }, locale: 'es-MX',
    timezoneId: 'America/Mexico_City', serviceWorkers: 'block',
  });
  const page = ctx.pages()[0] || await ctx.newPage();
  await page.addInitScript(() => {
    try {
      localStorage.setItem('via_access_authenticated', 'true');
      localStorage.setItem('via_access_email', 'mesainteligentedemo@gmail.com');
      localStorage.setItem('via_access_name', 'Pablo');
      localStorage.setItem('via_access_role', 'admin');
    } catch (e) {}
  });
  page.on('dialog', async d => { await d.accept().catch(() => {}); });
  await page.goto(URL, { waitUntil: 'networkidle', timeout: 60000 }).catch(e => console.log('goto', e.message.slice(0, 80)));
  await page.waitForTimeout(7000); // deja inicializar Firebase
  await page.evaluate(() => { try { if (typeof authSubmit === 'function') authSubmit(); const w = document.getElementById('auth-wall'); if (w) { w.classList.add('hidden'); w.classList.remove('visible'); } } catch (e) {} });
  await page.waitForTimeout(2000);
  // Inicializa Firestore explicitamente (normalmente solo ocurre al abrir Config)
  await page.evaluate(() => { try { if (typeof viaInitFirebase === 'function') viaInitFirebase(); } catch (e) {} });
  await page.waitForTimeout(4500);

  // Merge local (backfill + logging + s471) con lo remoto actual (por si hubiera algo)
  const localSet = [...BACKFILL, ...LOGGING, S471];
  const result = await page.evaluate(async ({ localSet }) => {
    const out = { fbReady: false, remoteCount: 0, merged: 0, synced: false, err: null };
    // Acceso DIRECTO a Firestore (VIA_FIREBASE es const lexico, no esta en window)
    let db = null;
    try { db = firebase.firestore(); out.fbReady = true; } catch (e) { out.err = 'firestore:' + e.message; }
    let remote = [];
    if (db) {
      try { const s = await db.collection('tracker').doc('vit_entries').get(); if (s.exists && s.data() && s.data().data) remote = JSON.parse(s.data().data); } catch (e) { out.err = 'load:' + e.message; }
    }
    out.remoteCount = Array.isArray(remote) ? remote.length : 0;
    const byId = new Map();
    if (Array.isArray(remote)) for (const e of remote) byId.set(e.id, e);
    for (const e of localSet) byId.set(e.id, e); // local gana (definiciones correctas)
    const merged = Array.from(byId.values()).sort((a, b) => {
      const na = +String(a.id).replace(/\D/g, '') || 0, nb = +String(b.id).replace(/\D/g, '') || 0;
      return na - nb;
    });
    out.merged = merged.length;
    try {
      if (typeof customEntries !== 'undefined' && Array.isArray(customEntries)) { customEntries.length = 0; merged.forEach(e => customEntries.push(e)); }
      localStorage.setItem('vit_entries', JSON.stringify(merged));
    } catch (e) { out.err = (out.err || '') + ' ls:' + e.message; }
    if (db) {
      try {
        await db.collection('tracker').doc('vit_entries').set({ data: JSON.stringify(merged), updatedAt: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true });
        out.synced = true;
      } catch (e) { out.err = (out.err || '') + ' sync:' + e.message; }
    }
    return out;
  }, { localSet });

  await page.waitForTimeout(4000);
  // Verificar re-leyendo remoto
  const verify = await page.evaluate(async () => {
    let remote = [];
    try { const db = firebase.firestore(); const s = await db.collection('tracker').doc('vit_entries').get(); if (s.exists && s.data() && s.data().data) remote = JSON.parse(s.data().data); } catch (e) {}
    const ls = JSON.parse(localStorage.getItem('vit_entries') || '[]');
    const ids = ls.map(e => e.id);
    return {
      remoteCount: remote.length, localCount: ls.length,
      hasS471: ids.includes('s471'), hasS300: ids.includes('s300'), hasS464: ids.includes('s464'),
      hasS465: ids.includes('s465'), hasS467: ids.includes('s467'),
      remoteHasS471: remote.some(e => e.id === 's471'), remoteHasS300: remote.some(e => e.id === 's300'),
    };
  });

  const out = { hora: horaMX, result, verify, ts: new Date().toISOString() };
  fs.writeFileSync(path.join(ROOT, 's471-restore-verificacion.json'), JSON.stringify(out, null, 2), 'utf8');
  console.log(JSON.stringify(out, null, 2));
  await ctx.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
