// ============================================================
// FIX FINAL s465-s467 — Hora Cancun 04:00 AM (EST, UTC-5), 2026-07-04
// Corrige hora=04:00 y dateKey=2026-07-04 SOLO para s465, s466, s467.
// Historicas (s300-s464) intactas. Screenshot: tracker-cancun-fixed.png
// Ejecutar: node victor-ia-tracker/backfill-2026-07-04/tour/fix-horas-cancun.cjs
// ============================================================
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const OUT = 'C:/Users/inbou/victor-ia-tracker/backfill-2026-07-04/tour';
const URL = 'https://tracker.victor-ia.xyz';
const IDS = ['s465', 's466', 's467'];
const HORA = '04:00';
const DATEKEY = '2026-07-04';

const logLines = [];
function log(m) { const l = `[${new Date().toISOString()}] ${m}`; console.log(l); logLines.push(l); }

(async () => {
  log(`OBJETIVO: ${IDS.join(', ')} -> ${DATEKEY} ${HORA} (America/Cancun UTC-5)`);

  const ctx = await chromium.launchPersistentContext(path.join(OUT, 'chrome-profile'), {
    headless: true,
    viewport: { width: 1680, height: 950 },
    locale: 'es-MX',
    timezoneId: 'America/Cancun'
  });
  const page = ctx.pages()[0] || await ctx.newPage();

  const consoleErrors = [];
  page.on('pageerror', e => consoleErrors.push('PAGEERROR: ' + e.message.slice(0, 200)));
  page.on('console', m => { if (m.type() === 'error') consoleErrors.push('CONSOLE: ' + m.text().slice(0, 200)); });
  page.on('dialog', async d => { log('DIALOG: ' + d.message().slice(0, 120)); await d.accept(); });

  await page.addInitScript(() => {
    try {
      localStorage.setItem('via_access_authenticated', 'true');
      localStorage.setItem('via_access_email', 'mesainteligentedemo@gmail.com');
      localStorage.setItem('via_access_name', 'Pablo');
      localStorage.setItem('via_access_role', 'admin');
    } catch (e) {}
  });

  log('Abriendo ' + URL);
  await page.goto(URL, { waitUntil: 'networkidle', timeout: 60000 }).catch(e => log('goto warn: ' + e.message));
  await page.waitForTimeout(5000);

  // ── ANTES ──
  const before = await page.evaluate((ids) => {
    const es = JSON.parse(localStorage.getItem('vit_entries') || '[]');
    const pick = id => { const e = es.find(x => x.id === id); return e ? { id: e.id, dateKey: e.dateKey, hora: e.hora, durSec: e.durSec, dur: e.dur } : null; };
    return { total: es.length, nuevas: ids.map(pick), s300: pick('s300'), s380: pick('s380'), s464: pick('s464') };
  }, IDS);
  log('ANTES: ' + JSON.stringify(before));

  // ── FIX: hora 04:00 + dateKey 2026-07-04 + durSec = dur*3600 si aplica ──
  const res = await page.evaluate(({ ids, hora, dateKey }) => {
    const es = JSON.parse(localStorage.getItem('vit_entries') || '[]');
    const changed = [];
    for (const e of es) {
      if (ids.includes(e.id)) {
        const c = { id: e.id, horaAntes: e.hora, horaDespues: hora };
        e.hora = hora;
        e.dateKey = dateKey;
        if (typeof e.dur === 'number' && e.durSec !== e.dur * 3600) {
          c.durSecAntes = e.durSec; e.durSec = e.dur * 3600; c.durSecDespues = e.durSec;
        }
        changed.push(c);
      }
    }
    localStorage.setItem('vit_entries', JSON.stringify(es));
    try { if (window.VIA_FIREBASE && VIA_FIREBASE.sync) VIA_FIREBASE.sync('vit_entries', es); } catch (e) {}
    return { changed, total: es.length };
  }, { ids: IDS, hora: HORA, dateKey: DATEKEY });
  log('FIX APLICADO: ' + JSON.stringify(res));
  await page.waitForTimeout(3000);

  // ── RELOAD + VALIDACION (equivale a location.reload()) ──
  await page.reload({ waitUntil: 'networkidle' }).catch(() => {});
  await page.waitForTimeout(5000);

  const after = await page.evaluate((ids) => {
    const es = JSON.parse(localStorage.getItem('vit_entries') || '[]');
    const idsAll = es.map(x => x.id);
    const pick = id => { const e = es.find(x => x.id === id); return e ? { id: e.id, dateKey: e.dateKey, hora: e.hora } : null; };
    const historicas = es.filter(x => /^s(3\d\d|4[0-5]\d|46[0-4])$/.test(x.id)).length;
    return { total: es.length, duplicados: idsAll.length - new Set(idsAll).size, historicasCount: historicas, nuevas: ids.map(pick), s300: pick('s300'), s380: pick('s380'), s464: pick('s464') };
  }, IDS);
  log('DESPUES: ' + JSON.stringify(after));

  // Validaciones
  const problems = [];
  for (const n of after.nuevas) {
    if (!n) { problems.push('entrada nueva faltante'); continue; }
    if (n.hora !== HORA) problems.push(`${n.id} hora=${n.hora} esperada=${HORA}`);
    if (n.dateKey !== DATEKEY) problems.push(`${n.id} dateKey=${n.dateKey} esperada=${DATEKEY}`);
  }
  for (const k of ['s300', 's380', 's464']) {
    const b = before[k] ? { id: before[k].id, dateKey: before[k].dateKey, hora: before[k].hora } : null;
    if (JSON.stringify(b) !== JSON.stringify(after[k])) problems.push(`historica ${k} CAMBIO: ${JSON.stringify(b)} -> ${JSON.stringify(after[k])}`);
  }
  if (after.total !== before.total) problems.push(`total cambio ${before.total} -> ${after.total}`);
  if (after.duplicados > 0) problems.push(`duplicados: ${after.duplicados}`);
  log('ERRORES CONSOLA: ' + (consoleErrors.length ? JSON.stringify(consoleErrors) : 'ninguno'));
  log('PROBLEMAS: ' + (problems.length ? JSON.stringify(problems) : 'NINGUNO — validacion OK'));

  // ── SCREENSHOT ──
  await page.evaluate(t => { try { setTab(t); } catch (e) {} }, 'entradas').catch(() => {});
  await page.waitForTimeout(2500);
  await page.screenshot({ path: path.join(OUT, 'tracker-cancun-fixed.png') });
  log('SCREENSHOT: tracker-cancun-fixed.png');

  fs.writeFileSync(path.join(OUT, 'log-fix-cancun.txt'), logLines.join('\n'), 'utf8');
  fs.writeFileSync(path.join(OUT, 'fix-cancun-verificacion.json'),
    JSON.stringify({ objetivo: { hora: HORA, dateKey: DATEKEY, tz: 'America/Cancun' }, before, res, after, consoleErrors, problems }, null, 2), 'utf8');
  await ctx.close();
  log('LISTO.');
  process.exit(problems.length ? 2 : 0);
})().catch(e => {
  logLines.push('FATAL: ' + e.stack);
  fs.writeFileSync(path.join(OUT, 'log-fix-cancun.txt'), logLines.join('\n'), 'utf8');
  console.error(e);
  process.exit(1);
});