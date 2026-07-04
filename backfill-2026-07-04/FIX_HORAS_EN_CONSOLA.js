// ============================================================
// FIX HORAS s465-s467 — pegar en la consola (F12) de https://tracker.victor-ia.xyz
// Corrige las 3 entradas nuevas con hora futura -> hora REAL del reloj al momento de ejecutar.
// Las 165 entradas historicas (s300-s464) NO se tocan.
// ============================================================
(function () {
  const IDS = ['s465', 's466', 's467'];
  const d = new Date();
  const pad = n => String(n).padStart(2, '0');
  const hora = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  const dateKey = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  const es = JSON.parse(localStorage.getItem('vit_entries') || '[]');
  const changed = [];
  for (const e of es) {
    if (IDS.includes(e.id)) {
      changed.push(`${e.id}: ${e.hora} -> ${hora}`);
      e.hora = hora;
      e.dateKey = dateKey;
    }
  }
  localStorage.setItem('vit_entries', JSON.stringify(es));
  try { if (window.VIA_FIREBASE && VIA_FIREBASE.sync) VIA_FIREBASE.sync('vit_entries', es); } catch (e) {}
  console.log('FIX OK.', changed.length ? changed.join(' | ') : 'No se encontraron s465-s467 en este navegador (nada que corregir).');
  console.log('Total entradas:', es.length, '| Recarga la pagina (F5) para ver el cambio.');
})();
