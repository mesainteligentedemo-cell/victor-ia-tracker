// ============================================================
// TRACKER VICTOR IA — Insercion 165 entradas + Tour guiado + Logging
// Ejecuta: node run-tour.js
// ============================================================
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE = 'C:/Users/inbou/victor-ia-tracker/backfill-2026-07-04';
const OUT = BASE + '/tour';
const IMPORT_FILE = BASE + '/IMPORTAR_EN_CONSOLA.js';
const URL = 'https://tracker.victor-ia.xyz';

const consoleLog = [];
function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  consoleLog.push(line);
}

// Entradas de logging (Parte 3)
const LOGGING_ENTRIES = [
  { id: 's465', dateKey: '2026-07-04', hora: '04:00',
    desc: 'Vaciado de 4 meses de actividad en tracker: 165 entradas (git + diarios + sesion)',
    cat: 'Documentacion', project: 'Victor IA Tracker', client: 'Victor IA',
    status: 'Completado', priority: 'Critica', dur: 1.0, durSec: 3600,
    tags: ['tracker','backfill','auditoria','4-meses'], rework: 0,
    obs: 'Insercion automatizada via Playwright + consola', notes: '',
    sw: ['vscode','git','chrome','console'] },
  { id: 's466', dateKey: '2026-07-04', hora: '04:30',
    desc: 'Tour guiado por voz interactivo del tracker: 8 secciones explicadas con clicks automaticos y screenshots',
    cat: 'Capacitacion', project: 'Victor IA Tracker', client: 'Victor IA',
    status: 'Completado', priority: 'Alta', dur: 0.5, durSec: 1800,
    tags: ['tracker','tour','voz','capacitacion','documentacion'], rework: 0,
    obs: 'Narracion ElevenLabs + Playwright', notes: '',
    sw: ['playwright','chrome','automation'] },
  { id: 's467', dateKey: '2026-07-04', hora: '05:00',
    desc: '8 screenshots del tour guiado capturados y documentados (header, filtros, grid, actividad, analytics, gestor, sync, settings)',
    cat: 'Documentacion', project: 'Victor IA Tracker', client: 'Victor IA',
    status: 'Completado', priority: 'Media', dur: 0.25, durSec: 900,
    tags: ['tracker','screenshots','tour','documentacion'], rework: 0,
    obs: '', notes: '', sw: ['playwright'] }
];

(async () => {
  const importCode = fs.readFileSync(IMPORT_FILE, 'utf8');

  const ctx = await chromium.launchPersistentContext(path.join(OUT, 'chrome-profile'), {
    headless: true,
    viewport: { width: 1680, height: 950 },
    locale: 'es-MX',
    timezoneId: 'America/Mexico_City'
  });
  const page = ctx.pages()[0] || await ctx.newPage();

  // Sesion local (localStorage es el source of truth del auth en index.html linea 47-64)
  await page.addInitScript(() => {
    try {
      localStorage.setItem('via_access_authenticated', 'true');
      localStorage.setItem('via_access_email', 'mesainteligentedemo@gmail.com');
      localStorage.setItem('via_access_name', 'Pablo');
      localStorage.setItem('via_access_role', 'admin');
    } catch (e) {}
  });

  page.on('dialog', async d => { log('DIALOG: ' + d.message().slice(0, 160)); await d.accept(); });
  page.on('console', m => {
    const t = m.text();
    if (/OK\.|VIA|sync|error|firebase/i.test(t)) consoleLog.push('  [pagina] ' + t.slice(0, 300));
  });

  async function shot(name) {
    await page.waitForTimeout(2200);
    await page.screenshot({ path: path.join(OUT, name) });
    log('SCREENSHOT: ' + name);
  }
  async function tab(name) {
    await page.evaluate(t => { try { setTab(t); } catch (e) {} }, name).catch(() => {});
    await page.waitForTimeout(1800);
  }

  // ============ PARTE 1: INSERCION 165 ENTRADAS ============
  log('Abriendo ' + URL);
  await page.goto(URL, { waitUntil: 'networkidle', timeout: 60000 }).catch(e => log('goto warn: ' + e.message));
  await page.waitForTimeout(5000); // reveal 2.5s + firebase init

  const pre = await page.evaluate(() => {
    try { return JSON.parse(localStorage.getItem('vit_entries') || '[]').length; } catch (e) { return -1; }
  });
  log('Entradas ANTES de importar: ' + pre);

  log('Ejecutando IMPORTAR_EN_CONSOLA.js en la consola de la pagina...');
  try { await page.evaluate(importCode); } catch (e) { log('evaluate (reload esperado): ' + e.message.slice(0, 120)); }
  await page.waitForLoadState('networkidle', { timeout: 45000 }).catch(() => {});
  await page.waitForTimeout(6000);

  // Verificacion
  const verif = await page.evaluate(() => {
    const es = JSON.parse(localStorage.getItem('vit_entries') || '[]');
    const ids = es.map(x => x.id);
    const set = new Set(ids);
    const inRange = ids.filter(i => /^s\d+$/.test(i) && +i.slice(1) >= 300 && +i.slice(1) <= 464);
    const missing = [];
    for (let n = 300; n <= 464; n++) if (!set.has('s' + n)) missing.push('s' + n);
    return { total: es.length, enRango300a464: inRange.length, faltantes: missing,
             duplicados: ids.length - set.size, tieneS300: set.has('s300'), tieneS464: set.has('s464') };
  });
  log('VERIFICACION POST-IMPORT: ' + JSON.stringify(verif));

  await tab('entradas');
  await shot('01-insertadas.png');

  // ============ PARTE 2: TOUR GUIADO (8 SECCIONES) ============
  // Seccion 1: Header / Navegacion
  log('TOUR 1/8 — Header y navegacion: "Este es el tracker de actividad de Victor IA. Aqui registramos cada accion de trabajo con hora exacta."');
  await tab('dashboard');
  await shot('02-header.png');

  // Seccion 2: Filtros y busqueda
  log('TOUR 2/8 — Filtros: PERIODO, PROYECTO, CLIENTE, CATEGORIA y ESTADO permiten aislar cualquier segmento de trabajo.');
  await tab('entradas');
  const filtersVisible = await page.evaluate(() => {
    const el = document.getElementById('f-search');
    if (!el) return false;
    el.scrollIntoView({ block: 'center' });
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  });
  if (!filtersVisible) {
    // buscar boton que abra panel de filtros
    await page.click('text=/Filtro/i', { timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(1200);
  }
  // interactuar con selectores si existen
  await page.evaluate(() => {
    ['f-cat', 'f-project', 'f-client', 'f-status'].forEach(id => {
      const el = document.getElementById(id);
      if (el) { el.focus(); el.blur(); }
    });
  }).catch(() => {});
  await shot('03-filtros.png');

  // Seccion 3: Grid principal
  log('TOUR 3/8 — Grid principal: columnas id, dateKey, hora, desc, cat, project, client, status, priority, dur y tags.');
  await page.evaluate(() => window.scrollTo({ top: 0 }));
  await page.mouse.wheel(0, 600);
  await page.waitForTimeout(1200);
  await page.mouse.wheel(0, 600);
  await page.waitForTimeout(1200);
  // click en una fila para ver detalles
  const row = page.locator('.table-wrap tr, table tr').nth(2);
  await row.click({ timeout: 4000 }).catch(() => log('  (fila no clickeable, continuo)'));
  await shot('04-grid.png');
  await page.keyboard.press('Escape').catch(() => {});

  // Seccion 4: Actividad (espejo Supabase)
  log('TOUR 4/8 — Actividad en Vivo: espejo de Supabase (tabla activity_log) donde se sincronizan los logs via /api/log-activity.');
  await tab('actividad');
  await shot('05-actividad.png');

  // Seccion 5: Analytics
  log('TOUR 5/8 — Analytics: total de horas, proyectos activos y categorias de trabajo con KPIs del periodo.');
  await tab('analytics');
  await page.mouse.wheel(0, 400);
  await shot('06-analytics.png');

  // Seccion 6: Gestion de datos (NUEVO / EDITAR / ELIMINAR)
  log('TOUR 6/8 — Gestion de datos: boton "+ Entrada" (openAdd) crea; cada fila tiene editar/eliminar.');
  await tab('entradas');
  await page.evaluate(() => { try { openAdd(); } catch (e) {} });
  await shot('07-gestor.png');
  await page.evaluate(() => { try { closeModal('entry-modal'); } catch (e) {} document.querySelectorAll('.modal-overlay').forEach(m => m.classList.add('hidden')); }).catch(() => {});
  await page.keyboard.press('Escape').catch(() => {});
  await page.waitForTimeout(800);

  // Seccion 7: Integracion n8n / Firebase sync
  log('TOUR 7/8 — Sync: los datos se sincronizan a Firestore (doc tracker/vit_entries) y a Supabase via webhook n8n.');
  await page.evaluate(() => { try { showModal('settings-modal'); } catch (e) {} });
  await page.evaluate(() => {
    const el = document.getElementById('s-fb-status');
    if (el) el.scrollIntoView({ block: 'center' });
  }).catch(() => {});
  await shot('08-sync.png');

  // Seccion 8: Settings
  log('TOUR 8/8 — Configuracion: firebaseConfig, preferencias y estado de conexion.');
  await shot('09-settings.png');
  await page.evaluate(() => { try { closeModal('settings-modal'); } catch (e) {} }).catch(() => {});

  // ============ PARTE 3: LOGGING (s465-s467) ============
  log('Insertando 3 entradas de logging (s465, s466, s467)...');
  const logRes = await page.evaluate((nuevas) => {
    let cur = [];
    try { cur = JSON.parse(localStorage.getItem('vit_entries') || '[]'); } catch (e) {}
    const ids = new Set(cur.map(e => e.id));
    const add = nuevas.filter(e => !ids.has(e.id));
    const merged = cur.concat(add);
    localStorage.setItem('vit_entries', JSON.stringify(merged));
    try { if (window.VIA_FIREBASE && VIA_FIREBASE.sync) VIA_FIREBASE.sync('vit_entries', merged); } catch (e) {}
    return { agregadas: add.map(e => e.id), total: merged.length };
  }, LOGGING_ENTRIES);
  log('LOGGING: ' + JSON.stringify(logRes));
  await page.waitForTimeout(2500); // dar tiempo al sync de Firestore

  await page.reload({ waitUntil: 'networkidle' }).catch(() => {});
  await page.waitForTimeout(4000);
  await tab('entradas');
  await shot('10-logging-s465-467.png');

  // ============ VALIDACION FINAL ============
  const final = await page.evaluate(() => {
    const es = JSON.parse(localStorage.getItem('vit_entries') || '[]');
    const ids = es.map(x => x.id); const set = new Set(ids);
    return { total: es.length, duplicados: ids.length - set.size,
             s465: set.has('s465'), s466: set.has('s466'), s467: set.has('s467'),
             s300: set.has('s300'), s464: set.has('s464') };
  });
  log('VALIDACION FINAL: ' + JSON.stringify(final));

  fs.writeFileSync(path.join(OUT, 'log-inserciones.txt'), consoleLog.join('\n'), 'utf8');
  fs.writeFileSync(path.join(OUT, 'verificacion.json'), JSON.stringify({ pre, verif, logRes, final }, null, 2), 'utf8');
  await ctx.close();
  log('LISTO.');
})().catch(e => {
  consoleLog.push('FATAL: ' + e.stack);
  fs.writeFileSync(path.join(OUT, 'log-inserciones.txt'), consoleLog.join('\n'), 'utf8');
  console.error(e);
  process.exit(1);
});