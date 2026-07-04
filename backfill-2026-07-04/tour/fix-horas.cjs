// ============================================================
// FIX TIMESTAMPS s465-s467 — usa la hora REAL del sistema (America/Mexico_City)
// Corrige horas futuras (04:00/04:30/05:00) -> hora actual exacta.
// Ejecutar desde C:\Users\inbou:  node victor-ia-tracker/backfill-2026-07-04/tour/fix-horas.cjs
// ============================================================
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const OUT = 'C:/Users/inbou/victor-ia-tracker/backfill-2026-07-04/tour';
const URL = 'https://tracker.victor-ia.xyz';
const IDS = ['s465', 's466', 's467'];

const logLines = [];
function log(m) { const l = `[${new Date().toISOString()}] ${m}`; console.log(l); logLines.push(l); }

// Hora REAL del reloj LOCAL del sistema (el que ve el usuario), formato HH:mm.
// NOTA: el sistema del usuario esta en UTC-5 (no America/Mexico_City UTC-6),
// por eso se usa la zona local de Windows, que coincide con Get-Date / su reloj.
function nowMX() {
  const d = new Date();
  const pad = n => String(n).padStart(2, '0');
  return {
    dateKey: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    hora: `${pad(d.getHours())}:${pad(d.getMinutes())}`
  };
}

(async () => {
  const t = nowMX();
  log(`HORA REAL DEL SISTEMA (MX): ${t.dateKey} ${t.hora}`);

  const ctx = await chromium.launchPersistentContext(path.join(OUT, 'chrome-profile'), {
    headless: true,
    viewport: { width: 1680, height: 950 },
    locale: 'es-MX',
    timezoneId: 'America/Mexico_City'
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

  // ── ANTES: estado de las 3 entradas + snapshot de históricas para validar que no cambien ──
  const before = await page.evaluate((ids) => {
    const es = JSON.parse(localStorage.getItem('vit_entries') || '[]');
    const pick = id => { const e = es.find(x => x.id === id); return e ? { id: e.id, dateKey: e.dateKey, hora: e.hora } : null; };
    return {
      total: es.length,
      nuevas: ids.map(pick),
      s300: pick('s300'), s380: pick('s380'), s464: pick('s464')
    };
  }, IDS);
  log('ANTES: ' + JSON.stringify(before));

  // ── FIX: hora = hora real del sistema AHORA, para las 3 nuevas. Históricas intactas. ──
  const res = await page.evaluate(({ ids, hora, dateKey }) => {
    const es = JSON.parse(localStorage.getItem('vit_entries') || '[]');
    const changed = [];
    for (const e of es) {
      if (ids.includes(e.id)) {
        changed.push({ id: e.id, horaAntes: e.hora, horaDespues: hora });
        e.hora = hora;
        e.dateKey = dateKey; // hoy real
      }
    }
    localStorage.setItem('vit_entries', JSON.stringify(es));
    try { if (window.VIA_FIREBASE && VIA_FIREBASE.sync) VIA_FIREBASE.sync('vit_entries', es); } catch (e) {}
    return { changed, total: es.length };
  }, { ids: IDS, hora: t.hora, dateKey: t.dateKey });
  log('FIX APLICADO: ' + JSON.stringify(res));
  await page.waitForTimeout(3000); // tiempo para el sync de Firestore

  // ── RELOAD + VALIDACION ──
  await page.reload({ waitUntil: 'networkidle' }).catch(() => {});
  await page.waitForTimeout(5000);

  const after = await page.evaluate((ids) => {
    const es = JSON.parse(localStorage.getItem('vit_entries') || '[]');
    const idsAll = es.map(x => x.id);
    const pick = id => { const e = es.find(x => x.id === id); return e ? { id: e.id, dateKey: e.dateKey, hora: e.hora } : null; };
    return {
      total: es.length,
      duplicados: idsAll.length - new Set(idsAll).size,
      nuevas: ids.map(pick),
      s300: pick('s300'), s380: pick('s380'), s464: pick('s464')
    };
  }, IDS);
  log('DESPUES: ' + JSON.stringify(after));

  // Validaciones programaticas
  const problems = [];
  for (const n of after.nuevas) {
    if (!n) { problems.push('entrada nueva faltante'); continue; }
    if (n.hora !== t.hora) problems.push(`${n.id} hora=${n.hora} esperada=${t.hora}`);
  }
  for (const k of ['s300', 's380', 's464']) {
    if (JSON.stringify(before[k]) !== JSON.stringify(after[k])) problems.push(`historica ${k} CAMBIO: ${JSON.stringify(before[k])} -> ${JSON.stringify(after[k])}`);
  }
  if (after.total !== before.total) problems.push(`total cambio ${before.total} -> ${after.total}`);
  if (after.duplicados > 0) problems.push(`duplicados: ${after.duplicados}`);
  log('ERRORES CONSOLA: ' + (consoleErrors.length ? JSON.stringify(consoleErrors) : 'ninguno'));
  log('PROBLEMAS: ' + (problems.length ? JSON.stringify(problems) : 'NINGUNO — validacion OK'));

  // ── SCREENSHOT: pestaña entradas ──
  await page.evaluate(t => { try { setTab(t); } catch (e) {} }, 'entradas').catch(() => {});
  await page.waitForTimeout(2500);
  await page.screenshot({ path: path.join(OUT, 'tracker-fixed.png') });
  log('SCREENSHOT: tracker-fixed.png');

  fs.writeFileSync(path.join(OUT, 'log-fix-horas.txt'), logLines.join('\n'), 'utf8');
  fs.writeFileSync(path.join(OUT, 'fix-horas-verificacion.json'),
    JSON.stringify({ horaSistema: t, before, res, after, consoleErrors, problems }, null, 2), 'utf8');
  await ctx.close();
  log('LISTO.');
  process.exit(problems.length ? 2 : 0);
})().catch(e => {
  logLines.push('FATAL: ' + e.stack);
  fs.writeFileSync(path.join(OUT, 'log-fix-horas.txt'), logLines.join('\n'), 'utf8');
  console.error(e);
  process.exit(1);
});
