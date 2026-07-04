// Screenshot de validacion: las 3 entradas corregidas (s465-s467) visibles con su hora real
const { chromium } = require('playwright');
const path = require('path');
const OUT = 'C:/Users/inbou/victor-ia-tracker/backfill-2026-07-04/tour';

(async () => {
  const ctx = await chromium.launchPersistentContext(path.join(OUT, 'chrome-profile'), {
    headless: true, viewport: { width: 1680, height: 4200 },
    locale: 'es-MX', timezoneId: 'America/Cancun'
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
  await page.goto('https://tracker.victor-ia.xyz/?cb=' + Date.now(), { waitUntil: 'networkidle', timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(6000);
  await page.evaluate(() => {
    ['auth-wall', 'auth-loader'].forEach(id => { const el = document.getElementById(id); if (el) el.remove(); });
  }).catch(() => {});
  await page.evaluate(() => { try { setTab('entradas'); } catch (e) {} }).catch(() => {});
  await page.waitForTimeout(2000);
  // buscar "guiado" no cubre s465; usamos "tour" ni tampoco. Sin filtro: scroll a la tarjeta de s465.
  const found = await page.evaluate(() => {
    const nodes = [...document.querySelectorAll('#content *')];
    const el = nodes.find(n => n.children.length === 0 && /Vaciado de 4 meses/i.test(n.textContent || ''));
    if (!el) return false;
    el.scrollIntoView({ block: 'center' });
    return true;
  });
  console.log('CARD s465 visible:', found);
  await page.waitForTimeout(1500);
  const rows = await page.evaluate(() => {
    const es = JSON.parse(localStorage.getItem('vit_entries') || '[]');
    return es.filter(e => ['s465', 's466', 's467'].includes(e.id)).map(e => `${e.id} ${e.dateKey} ${e.hora}`);
  });
  console.log('LOCALSTORAGE:', JSON.stringify(rows));
  await page.screenshot({ path: path.join(OUT, 'tracker-fixed.png'), fullPage: true });
  console.log('SCREENSHOT OK: tracker-fixed.png');
  await ctx.close();
})().catch(e => { console.error(e); process.exit(1); });
