// ============================================================
// FIX FECHAS FUTURAS — pegar en la consola (F12) de https://tracker.victor-ia.xyz
// Repara CUALQUIER entrada en localStorage['vit_entries'] con dateKey futuro
// (posterior a HOY) o con hora/fecha malformada. Sincroniza a Firebase y recarga.
// Regla: si dateKey > hoy  ->  se recorta a HOY (clamp). Nunca genera fechas futuras.
// Las entradas base con fecha futura vivían en el array SEED (index.html) y ya
// fueron corregidas en el código; este script cubre datos custom en el navegador.
// ============================================================
(function () {
  const pad = n => String(n).padStart(2, '0');
  const now = new Date();
  const TODAY = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const reDate = /^\d{4}-\d{2}-\d{2}$/;
  const reTime = /^\d{2}:\d{2}$/;

  let es;
  try { es = JSON.parse(localStorage.getItem('vit_entries') || '[]'); }
  catch (e) { console.error('vit_entries corrupto/no parseable:', e); return; }

  const changed = [];
  for (const e of es) {
    let dk = String(e.dateKey || '');
    let hr = String(e.hora || '');
    let fixed = false;

    // normalizar dateKey malformado (recorta cualquier parte de tiempo, pad)
    if (!reDate.test(dk)) {
      const m = dk.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
      if (m) { dk = `${m[1]}-${pad(m[2])}-${pad(m[3])}`; fixed = true; }
    }
    // clamp de fecha futura -> HOY
    if (reDate.test(dk) && dk > TODAY) { dk = TODAY; fixed = true; }
    // normalizar hora malformada
    if (!reTime.test(hr)) {
      const t = hr.match(/(\d{1,2}):(\d{2})/);
      hr = t ? `${pad(t[1])}:${pad(t[2])}` : '09:00';
      fixed = true;
    }
    if (fixed) {
      changed.push(`${e.id}: ${e.dateKey} ${e.hora} -> ${dk} ${hr}`);
      e.dateKey = dk; e.hora = hr;
    }
  }

  localStorage.setItem('vit_entries', JSON.stringify(es));
  try { if (window.VIA_FIREBASE && VIA_FIREBASE.sync) VIA_FIREBASE.sync('vit_entries', es); } catch (e) {}

  console.log('FIX FECHAS FUTURAS — HOY =', TODAY);
  console.log('Entradas custom en este navegador:', es.length);
  console.log('Corregidas:', changed.length);
  if (changed.length) console.log(changed.join('\n'));
  else console.log('No había fechas futuras/malformadas en vit_entries de este navegador.');
  console.log('Recarga la página (F5) para ver el resultado.');
})();
