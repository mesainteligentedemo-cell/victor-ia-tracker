import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  console.log('🔍 Verificando estructura del tracker...\n');

  await page.goto('https://tracker.victor-ia.xyz/', { waitUntil: 'load', timeout: 30000 });

  const structure = await page.evaluate(() => {
    const buttons = [];

    // Buscar todos los via-qa-btn
    document.querySelectorAll('.via-qa-btn').forEach(btn => {
      buttons.push({
        text: btn.textContent.trim(),
        id: btn.id,
        onclick: btn.getAttribute('onclick'),
        class: btn.className
      });
    });

    // Buscar los modales/overlays
    const overlays = [];
    document.querySelectorAll('[id*="qa-"], [class*="qa2-overlay"]').forEach(overlay => {
      overlays.push({
        id: overlay.id,
        class: overlay.className.substring(0, 50)
      });
    });

    return { buttons, overlays, totalButtons: buttons.length, totalOverlays: overlays.length };
  });

  console.log('📌 BOTONES ENCONTRADOS:');
  console.log('═'.repeat(60));
  structure.buttons.forEach((btn, i) => {
    console.log(`${i+1}. ${btn.text}`);
    if (btn.id) console.log(`   ID: ${btn.id}`);
    if (btn.onclick) console.log(`   onclick: ${btn.onclick.substring(0, 60)}`);
    console.log();
  });

  console.log('\n📋 MODALES/OVERLAYS DISPONIBLES:');
  console.log('═'.repeat(60));
  structure.overlays.slice(0, 10).forEach(overlay => {
    console.log(`- ${overlay.id || overlay.class}`);
  });

  await browser.close();
})();