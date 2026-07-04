// ============================================================
// Extrae los 33 pasos REALES del tour ViaTour desde index.html
// y genera tour-narrations.json (fuente de verdad, sin transcripcion manual).
// ============================================================
const fs = require('fs');
const path = require('path');

const ROOT = 'C:/Users/inbou/victor-ia-tracker';
const HTML = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const OUT = path.join(ROOT, 'tour-perfecto');

// 1) Aislar el array STEPS = [ ... ];
const startMarker = 'var STEPS = [';
const s = HTML.indexOf(startMarker);
if (s < 0) throw new Error('No se encontro STEPS');
// buscar el cierre "\n  ];" a partir de s
const endMarker = '\n  ];';
const e = HTML.indexOf(endMarker, s);
if (e < 0) throw new Error('No se encontro cierre de STEPS');
const arrText = HTML.slice(s + startMarker.length - 1, e + 4); // incluye [ ... ];
// arrText es "[ ... ];"  -> evaluar
let STEPS;
// eslint-disable-next-line no-eval
STEPS = eval(arrText.replace(/;\s*$/, ''));

// 2) Metadatos de acciones interactivas reales (de TOUR_ACTIONS)
const ACTION_DESC = {
  theme:      'Alterna el tema visual (oscuro <-> claro) con toggleTheme(), y lo revierte a los 3.5s.',
  finMonth:   'Cambia el filtro de periodo a "este mes" con setPeriod("month"); recalcula finanzas en vivo.',
  sidebar:    'Abre el panel lateral de filtros avanzados con toggleSidebar().',
  skillSearch:'Escribe "video" letra por letra en #ifx-search-input y filtra los 226 skills en vivo.',
  runLoop:    'Hace clic en "Ejecutar ahora" (.lpf-btn.run) del primer loop y corre su checklist.'
};

// 3) Construir estructura enriquecida
const steps = STEPS.map((st, i) => ({
  n: i + 1,
  id: 'step-' + String(i + 1).padStart(2, '0'),
  tab: st.tab,
  ifx: st.ifx || null,
  selector: st.sel,
  title: st.title,
  action: st.act || null,
  actionDesc: st.act ? (ACTION_DESC[st.act] || '') : null,
  narration: st.say,
  words: st.say.trim().split(/\s+/).length,
  audioFile: 'voz-step-' + String(i + 1).padStart(2, '0') + '.mp3'
}));

const doc = {
  meta: {
    project: 'Victor IA Tracker',
    tour: 'ViaTour',
    version: '5.11',
    voice: { provider: 'ElevenLabs', voiceId: 'iDEmt5MnqUotdwCIVplo', model: 'eleven_multilingual_v2' },
    totalSteps: steps.length,
    totalWords: steps.reduce((a, b) => a + b.words, 0),
    source: 'index.html -> var STEPS (extraido, no transcrito)',
    generated: new Date().toISOString(),
    interactiveActions: Object.keys(ACTION_DESC).length,
    description: 'Tour guiado sincronizado: voz ElevenLabs + auto-clicks + scroll + spotlight. ' +
                 'El marco (spotlight) aparece EXACTAMENTE cuando arranca el audio (evento onplaying); ' +
                 'las acciones reales se disparan ~1.6s despues para que el usuario oiga la intencion.'
  },
  steps
};

fs.writeFileSync(path.join(OUT, 'tour-narrations.json'), JSON.stringify(doc, null, 2), 'utf8');
console.log('OK tour-narrations.json ->', steps.length, 'pasos,', doc.meta.totalWords, 'palabras');
steps.filter(s => s.action).forEach(s => console.log('  [interactivo]', s.id, s.action, '->', s.title));