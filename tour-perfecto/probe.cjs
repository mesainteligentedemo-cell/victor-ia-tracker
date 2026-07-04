const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const ctx = await chromium.launchPersistentContext(path.join('C:/Users/inbou/victor-ia-tracker/tour-perfecto', 'chrome-profile-probe'), {
    headless: true, viewport: { width: 1680, height: 950 },
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
  page.on('framenavigated', f => { if (f === page.mainFrame()) console.log('NAV ->', f.url()); });
  await page.goto('https://tracker.victor-ia.xyz', { waitUntil: 'networkidle', timeout: 60000 }).catch(e => console.log('goto', e.message));
  await page.waitForTimeout(6000);
  console.log('FINAL URL:', page.url());
  const state = await page.evaluate(() => ({
    ls: localStorage.getItem('via_access_authenticated'),
    bodyReveal: document.body.className,
    hasKpi: !!document.querySelector('.kpi-grid'),
    topbarVisible: (() => { const t = document.getElementById('topbar'); return t ? getComputedStyle(t).display : 'no-topbar'; })(),
    loadingVisible: (() => { const l = document.getElementById('page-loading') || document.querySelector('.loading,#loader'); return l ? getComputedStyle(l).display : 'none'; })(),
    title: document.title,
  }));
  console.log('STATE:', JSON.stringify(state, null, 2));
  await ctx.close();
})();