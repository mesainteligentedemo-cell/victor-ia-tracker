// Registra la entrada s471 en el tracker (localStorage vit_entries + Firebase sync)
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const ROOT = 'C:/Users/inbou/victor-ia-tracker/tour-perfecto';
const URL = 'https://tracker.victor-ia.xyz';
const PROFILE = path.join(ROOT, 'chrome-profile-s471');
try { fs.rmSync(PROFILE, { recursive: true, force: true }); } catch (e) {}

const horaMX = new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/Mexico_City' });

const S471 = {
  id: 's471', dateKey: '2026-07-04', hora: horaMX,
  desc: 'Tour guiado COMPLETO y sincronizado del tracker: orchestrator Playwright de 8 secciones (header, período, proyectos, tabla actividad, dashboard, chat IA, biblioteca, exportar) con voz ElevenLabs + auto-clicks + scroll + pop-ups; 40 screenshots, 2 pasadas sin errores, drift voz-visual <200ms',
  cat: 'Capacitacion', project: 'Victor IA Tracker', client: 'Victor IA',
  status: 'Completado', priority: 'Alta', dur: 1.5, durSec: 5400,
  tags: ['tracker', 'tour', 'voz', 'sincronizacion', 'playwright', 'screenshots', 'orchestrator', 'elevenlabs'],
  rework: 0,
  obs: 'Orchestrator dirige el motor ViaTour (34 pasos); auth-wall dismiss; serviceWorkers block; drift medido por instrumentacion de _spotlight (mismo callback que la voz). Mediana repintado ~165ms.',
  notes: '', sw: ['playwright', 'chrome', 'elevenlabs', 'node', 'git'],
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
  await page.waitForTimeout(6000);
  await page.evaluate(() => { try { if (typeof authSubmit === 'function') authSubmit(); const w = document.getElementById('auth-wall'); if (w) { w.classList.remove('visible'); w.classList.add('hidden'); } } catch (e) {} });
  await page.waitForTimeout(2000);

  const pre = await page.evaluate(() => { try { return JSON.parse(localStorage.getItem('vit_entries') || '[]').length; } catch (e) { return -1; } });

  const res = await page.evaluate((entry) => {
    const out = { path: null, before: 0, after: 0, existed: false, firebase: false };
    let cur = [];
    try { cur = JSON.parse(localStorage.getItem('vit_entries') || '[]'); } catch (e) {}
    out.before = cur.length;
    if (cur.some(e => e.id === entry.id)) { out.existed = true; out.after = cur.length; return out; }
    // Ruta preferida: usar el estado y guardado propios de la app
    try {
      if (typeof customEntries !== 'undefined' && Array.isArray(customEntries) && typeof saveCustomEntries === 'function') {
        customEntries.push(entry);
        saveCustomEntries();
        out.path = 'saveCustomEntries';
      } else { throw new Error('no app state'); }
    } catch (e) {
      cur.push(entry);
      localStorage.setItem('vit_entries', JSON.stringify(cur));
      try { if (window.VIA_FIREBASE && VIA_FIREBASE.sync) VIA_FIREBASE.sync('vit_entries', cur); } catch (_) {}
      out.path = 'localStorage+sync';
    }
    try { if (window.VIA_FIREBASE && VIA_FIREBASE.push) { VIA_FIREBASE.push('entries', Object.assign({}, entry, { ts: new Date().toISOString() })); out.firebase = true; } } catch (_) {}
    try { out.after = JSON.parse(localStorage.getItem('vit_entries') || '[]').length; } catch (_) {}
    return out;
  }, S471);

  await page.waitForTimeout(3500); // dar tiempo al sync de Firestore
  await page.reload({ waitUntil: 'networkidle' }).catch(() => {});
  await page.waitForTimeout(4000);
  const verify = await page.evaluate(() => {
    let es = [];
    try { es = JSON.parse(localStorage.getItem('vit_entries') || '[]'); } catch (e) {}
    const s = es.find(e => e.id === 's471');
    return { total: es.length, hasS471: !!s, s471: s ? { id: s.id, hora: s.hora, status: s.status, dur: s.dur } : null };
  });

  const out = { pre, res, verify, hora: horaMX, ts: new Date().toISOString() };
  fs.writeFileSync(path.join(ROOT, 's471-verificacion.json'), JSON.stringify(out, null, 2), 'utf8');
  console.log(JSON.stringify(out, null, 2));
  await ctx.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
