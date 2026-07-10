/**
 * build-COMPLETO.cjs
 * ─────────────────────────────────────────────────────────────────────────
 * Genera el tour guiado COMPLETO y valida cada selector CSS contra index.html.
 *
 * SALIDAS:
 *   - tour-narrations-COMPLETO.json   (todos los botones + narración + timing)
 *   - SELECTORES-VALIDADOS.json       (botón -> selector -> anchor -> línea)
 *   - tour-guiado-NARRACION-COMPLETA.txt
 *
 * VALIDACIÓN:
 *   Cada paso define un `anchor`: un fragmento literal de markup que DEBE
 *   existir en index.html. Si no existe -> el selector es "fantasma" y el
 *   build marca el paso como INVÁLIDO (y avisa en consola). Cero fantasmas.
 *
 * TIMING:
 *   Duración estimada por palabras (TTS ElevenLabs ES ≈ 2.6 palabras/seg,
 *   medido de los MP3 reales del tour v1). Timestamps acumulados. El marcado
 *   se anticipa 100ms al inicio de cada narración.
 * ─────────────────────────────────────────────────────────────────────────
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const HTML = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const HTML_LINES = HTML.split('\n');

// ── Config de timing ────────────────────────────────────────────────────
const WORDS_PER_SEC = 2.6;   // medido de MP3 reales del tour v1
const INTER_STEP_PAUSE = 0.8; // segundos de respiro entre pasos
const MARK_ANTICIPATION_MS = 100; // marcar 100ms antes de que se mencione

// ── Helper: encuentra la línea del anchor en index.html ─────────────────
function findLine(anchor) {
  for (let i = 0; i < HTML_LINES.length; i++) {
    if (HTML_LINES[i].includes(anchor)) return i + 1;
  }
  return -1;
}

function words(str) {
  return str.trim().split(/\s+/).filter(Boolean).length;
}

// ── DATASET: cada botón que la voz menciona ─────────────────────────────
// group: sección visual · tab: pestaña donde vive · needs: modal/panel a abrir
const STEPS = [
  // ═══════════════ SECCIÓN 0 — INTRO ═══════════════
  { key: 'intro', group: 'Intro', tab: 'dashboard', selector: '#topbar',
    anchor: '<div id="topbar">', label: 'Barra superior (topbar)',
    title: 'Bienvenido al Tracker Victor IA',
    narration: 'Bienvenido al Tracker de Victor IA, tu centro de control inteligente. En los próximos minutos voy a llevarte de la mano por cada botón y cada sección. Relájate, no toques nada: yo voy a resaltar con un marco dorado exactamente el control del que te esté hablando. Empecemos por la barra superior, tu punto de partida en todo momento.' },

  // ═══════════════ SECCIÓN 1 — BARRA SUPERIOR ═══════════════
  { key: 'version', group: 'Barra superior', tab: 'dashboard', selector: '#topbar .badge',
    anchor: '<span class="badge">v5.11</span>', label: 'Versión (v5.11)',
    title: 'Versión del sistema',
    narration: 'Este pequeño distintivo marca la versión del sistema: la cinco punto once. Te sirve para saber que estás en la última versión publicada y para darnos referencia si necesitas soporte.' },

  { key: 'live', group: 'Barra superior', tab: 'dashboard', selector: '#auto-live-indicator',
    anchor: 'id="auto-live-indicator"', label: 'Indicador LIVE',
    title: 'Estado LIVE',
    narration: 'El indicador LIVE en verde confirma que el auto-registro está activo y trabajando en tiempo real. Mientras lo veas encendido, el sistema está capturando y sincronizando tu actividad de forma automática.' },

  { key: 'nueva-entrada', group: 'Barra superior', tab: 'dashboard', selector: '.btn-primary-cta',
    anchor: 'class="btn-primary-cta" onclick="openAdd()"', label: '+ Entrada',
    title: 'Nueva Entrada — el botón clave',
    narration: 'Este es el botón más importante de todo el tracker: más Entrada. Cada vez que terminas una tarea, un diseño, un video o una llamada con un cliente, la registras aquí. Capturas qué hiciste, cuánto tiempo tomó, a qué proyecto y cliente pertenece, su categoría y prioridad. Recuerda la regla de oro: lo que no se registra, no se mide.' },

  { key: 'tour', group: 'Barra superior', tab: 'dashboard', selector: '#tour-start-btn',
    anchor: 'id="tour-start-btn"', label: 'Tour',
    title: 'Tour guiado con voz',
    narration: 'Este es el botón de Tour, justo el que estás usando ahora. Lanza este recorrido guiado con voz cuando lo necesites. Puedes iniciarlo o detenerlo en cualquier momento; ideal para presentarle el sistema a un cliente o a un nuevo miembro del equipo.' },

  { key: 'export', group: 'Barra superior', tab: 'dashboard', selector: 'button[onclick="exportCSV()"]',
    anchor: 'onclick="exportCSV()"', label: 'Export CSV',
    title: 'Exportar CSV',
    narration: 'El botón Exportar C S V descarga toda tu información en un archivo de hoja de cálculo. Es ideal para respaldos, para compartir con tu contador o para analizar los datos en Excel o Google Sheets.' },

  { key: 'filtros', group: 'Barra superior', tab: 'dashboard', selector: 'button[onclick="toggleSidebar()"]',
    anchor: 'onclick="toggleSidebar()"', label: 'Filtros',
    title: 'Filtros avanzados',
    narration: 'El botón de Filtros abre un panel lateral para segmentar tus datos por cualquier criterio: texto, categoría, proyecto, cliente, estado, prioridad, duración y retrabajo. Más adelante te lo muestro por dentro.' },

  { key: 'planeacion', group: 'Barra superior', tab: 'dashboard', selector: 'button[onclick="openFileModal()"]',
    anchor: 'onclick="openFileModal()"', label: 'Planeación',
    title: 'Planeación con IA',
    narration: 'Planeación es uno de los módulos más impresionantes: usa inteligencia artificial para generar cotizaciones, planear nuevos proyectos, preparar entregables y hasta pedir dummies de diseño. Incluso tiene un agente de voz que llena los formularios mientras tú hablas.' },

  { key: 'vista-cliente', group: 'Barra superior', tab: 'dashboard', selector: '#client-mode-btn',
    anchor: 'id="client-mode-btn"', label: 'Vista Cliente',
    title: 'Vista Cliente',
    narration: 'Vista Cliente activa un modo de presentación seguro: oculta tus costos internos y muestra solo los precios de venta. Perfecto para compartir la pantalla con un cliente sin exponer tus márgenes.' },

  { key: 'config', group: 'Barra superior', tab: 'dashboard', selector: 'button[onclick="showSettings()"]',
    anchor: 'onclick="showSettings()"', label: 'Config',
    title: 'Configuración',
    narration: 'El botón de Configuración abre los ajustes del sistema, donde defines preferencias, integraciones y parámetros generales del tracker.' },

  { key: 'tareas-repetitivas', group: 'Barra superior', tab: 'dashboard', selector: 'button[onclick*="actividades-repetitivas"]',
    anchor: "actividades-repetitivas.html'", label: 'Tareas Repetitivas',
    title: 'Tareas Repetitivas',
    narration: 'Tareas Repetitivas te lleva al módulo de automatizaciones: aquí registras las actividades que se repiten cada día, semana o mes, para que el sistema te ayude a no olvidarlas y a medir su costo real en tiempo.' },

  // ═══════════════ SECCIÓN 2 — SELECTOR DE PROYECTO ═══════════════
  { key: 'proyecto-bar', group: 'Selector de proyecto', tab: 'dashboard', selector: '#project-bar',
    anchor: '<div id="project-bar">', label: 'Selector de proyecto',
    title: 'Selector de proyecto',
    narration: 'Debajo de la barra superior está el selector de proyecto. Con un clic filtras absolutamente todo el tablero para ver solo la actividad, las finanzas y las métricas de un cliente o proyecto en específico. Es tu lente de enfoque.' },

  // ═══════════════ SECCIÓN 3 — PESTAÑAS PRINCIPALES ═══════════════
  { key: 'tab-dashboard', group: 'Pestañas', tab: 'dashboard', selector: "#tabs button[onclick=\"setTab('dashboard')\"]",
    anchor: "onclick=\"setTab('dashboard')\"", label: 'Tab Dashboard',
    title: 'Pestaña Dashboard',
    narration: 'Estas son las pestañas principales, el corazón de la navegación. La primera, Dashboard, es tu vista general: aquí ves de un vistazo los indicadores clave, el resumen del día y la salud de tu operación.' },

  { key: 'tab-analytics', group: 'Pestañas', tab: 'dashboard', selector: "#tabs button[onclick=\"setTab('analytics')\"]",
    anchor: "onclick=\"setTab('analytics')\"", label: 'Tab Analytics',
    title: 'Pestaña Analytics',
    narration: 'Analytics profundiza en los números: tendencias, comparativas por periodo, distribución por categoría y análisis de productividad. Es donde los datos se convierten en decisiones.' },

  { key: 'tab-finanzas', group: 'Pestañas', tab: 'dashboard', selector: "#tabs button[onclick=\"setTab('finanzas')\"]",
    anchor: "onclick=\"setTab('finanzas')\"", label: 'Tab Finanzas',
    title: 'Pestaña Finanzas',
    narration: 'La pestaña Finanzas concentra el dinero: ingresos, egresos, costos por proyecto, márgenes y cuánto te cuesta realmente cada actividad. El pulso económico de tu negocio.' },

  { key: 'tab-organigrama', group: 'Pestañas', tab: 'dashboard', selector: "#tabs button[onclick=\"setTab('organigrama')\"]",
    anchor: "onclick=\"setTab('organigrama')\"", label: 'Tab Organigrama',
    title: 'Pestaña Organigrama',
    narration: 'Organigrama muestra la estructura de tu empresa de agentes de inteligencia artificial: quién hace qué, los roles y cómo se coordinan para ejecutar el trabajo.' },

  { key: 'tab-software', group: 'Pestañas', tab: 'dashboard', selector: "#tabs button[onclick=\"setTab('software')\"]",
    anchor: "onclick=\"setTab('software')\"", label: 'Tab Software & APIs',
    title: 'Pestaña Software & APIs',
    narration: 'Software y A P Is lista todas las herramientas, licencias y conexiones que usa tu operación, con su costo y su estado. Así sabes exactamente en qué software estás invirtiendo.' },

  { key: 'tab-entradas', group: 'Pestañas', tab: 'dashboard', selector: "#tabs button[onclick=\"setTab('entradas')\"]",
    anchor: "onclick=\"setTab('entradas')\"", label: 'Tab Entradas',
    title: 'Pestaña Entradas',
    narration: 'Entradas es el registro detallado: la tabla con cada actividad que has capturado, ordenable y filtrable. Es la memoria completa y auditable de todo tu trabajo.' },

  { key: 'tab-reportes', group: 'Pestañas', tab: 'dashboard', selector: "#tabs button[onclick=\"setTab('reportes')\"]",
    anchor: "onclick=\"setTab('reportes')\"", label: 'Tab Reportes',
    title: 'Pestaña Reportes',
    narration: 'Reportes genera resúmenes listos para compartir: informes por periodo, por cliente o por proyecto, que puedes presentar o enviar sin tener que armarlos a mano.' },

  { key: 'tab-crm', group: 'Pestañas', tab: 'dashboard', selector: "#tabs button[onclick=\"setTab('crm')\"]",
    anchor: "onclick=\"setTab('crm')\"", label: 'Tab CRM',
    title: 'Pestaña CRM',
    narration: 'El C R M gestiona tus relaciones con clientes: prospectos, propuestas, clientes activos y el estado de cada relación comercial, todo en un solo lugar.' },

  { key: 'tab-apollo', group: 'Pestañas', tab: 'dashboard', selector: "#tabs button[onclick=\"setTab('apollo')\"]",
    anchor: "onclick=\"setTab('apollo')\"", label: 'Tab Prospección',
    title: 'Pestaña Prospección',
    narration: 'Prospección es tu motor de nuevos clientes: aquí buscas, filtras y calificas leads para llenar tu embudo de ventas con oportunidades reales.' },

  { key: 'tab-telemetria', group: 'Pestañas', tab: 'dashboard', selector: "#tabs button[onclick=\"setTab('telemetria')\"]",
    anchor: "onclick=\"setTab('telemetria')\"", label: 'Tab Telemetría IoT',
    title: 'Pestaña Telemetría IoT',
    narration: 'Telemetría I o T conecta sensores y dispositivos en tiempo real, para monitorear datos físicos del mundo real e integrarlos con tu operación digital.' },

  { key: 'tab-graphify', group: 'Pestañas', tab: 'dashboard', selector: "#tabs button[onclick=\"setTab('graphify')\"]",
    anchor: "onclick=\"setTab('graphify')\"", label: 'Tab Observabilidad',
    title: 'Pestaña Observabilidad',
    narration: 'Observabilidad te da rayos equis del sistema: métricas de salud, uso de tokens, rendimiento y grafos de conocimiento. Es cómo vigilamos que todo funcione fino por dentro.' },

  { key: 'tab-infra', group: 'Pestañas', tab: 'dashboard', selector: "#tabs button[onclick=\"setTab('infrastructure')\"]",
    anchor: "onclick=\"setTab('infrastructure')\"", label: 'Tab Infra',
    title: 'Pestaña Infra',
    narration: 'Infra muestra la infraestructura técnica: servidores, servicios, despliegues y el estado de cada pieza que mantiene el sistema vivo y en línea.' },

  { key: 'tab-actividad', group: 'Pestañas', tab: 'dashboard', selector: "#tabs button[onclick=\"setTab('actividad')\"]",
    anchor: "onclick=\"setTab('actividad')\"", label: 'Tab Actividad en Vivo',
    title: 'Pestaña Actividad en Vivo',
    narration: 'Actividad en Vivo es el feed en tiempo real: ves las acciones ocurriendo conforme suceden, como un monitor latiendo con el pulso de tu operación.' },

  // ═══════════════ SECCIÓN 4 — ACCIONES IA ═══════════════
  { key: 'ia-imagen', group: 'Acciones IA', tab: 'dashboard', selector: "#via-quick-actions button[onclick=\"openPopup('imagen')\"]",
    anchor: "onclick=\"openPopup('imagen')\"", label: 'Generar Imagen',
    title: 'Acción IA — Generar Imagen',
    narration: 'Pasemos a las Acciones de inteligencia artificial. La primera, Generar Imagen, crea visuales profesionales al instante con Higgsfield, desde fotos de producto hasta ilustraciones conceptuales.' },

  { key: 'ia-video', group: 'Acciones IA', tab: 'dashboard', selector: "#via-quick-actions button[onclick=\"openPopup('video')\"]",
    anchor: "onclick=\"openPopup('video')\"", label: 'Generar Video',
    title: 'Acción IA — Generar Video',
    narration: 'Generar Video produce clips y comerciales con inteligencia artificial. Describes lo que quieres y el sistema genera el video listo para usar.' },

  { key: 'ia-presentacion', group: 'Acciones IA', tab: 'dashboard', selector: "#via-quick-actions button[onclick=\"openPopup('presentacion')\"]",
    anchor: "onclick=\"openPopup('presentacion')\"", label: 'Presentación',
    title: 'Acción IA — Presentación',
    narration: 'Presentación arma decks y diapositivas animadas de forma automática, ideales para propuestas y juntas con clientes.' },

  { key: 'ia-web', group: 'Acciones IA', tab: 'dashboard', selector: "#via-quick-actions button[onclick=\"openPopup('web')\"]",
    anchor: "onclick=\"openPopup('web')\"", label: 'Web / Landing',
    title: 'Acción IA — Web / Landing',
    narration: 'Web y Landing genera sitios y páginas de aterrizaje completas a partir de una descripción, con diseño de nivel profesional listo para publicar.' },

  { key: 'ia-voice', group: 'Acciones IA', tab: 'dashboard', selector: "#via-quick-actions button[onclick=\"openPopup('voice')\"]",
    anchor: "onclick=\"openPopup('voice')\"", label: 'Voice / Speech',
    title: 'Acción IA — Voice / Speech',
    narration: 'Voice y Speech convierte texto en voz natural con ElevenLabs, para narraciones, locuciones y agentes de voz como el que me da vida a mí ahora mismo.' },

  { key: 'ia-capacitacion', group: 'Acciones IA', tab: 'dashboard', selector: "#via-quick-actions button[onclick=\"openPopup('capacitacion')\"]",
    anchor: "onclick=\"openPopup('capacitacion')\"", label: 'Capacitación',
    title: 'Acción IA — Capacitación',
    narration: 'Capacitación crea material de entrenamiento y cursos con inteligencia artificial, para formar a tu equipo o a tus clientes de manera rápida.' },

  { key: 'ia-admin', group: 'Acciones IA', tab: 'dashboard', selector: "#via-quick-actions button[onclick=\"openPopup('admin')\"]",
    anchor: "onclick=\"openPopup('admin')\"", label: 'Admin & Finanzas',
    title: 'Acción IA — Admin & Finanzas',
    narration: 'Admin y Finanzas asiste con tareas administrativas y financieras: cálculos, documentos y gestión, apoyado por inteligencia artificial.' },

  { key: 'ia-biblioteca', group: 'Acciones IA', tab: 'dashboard', selector: '#btn-biblioteca',
    anchor: 'id="btn-biblioteca"', label: 'Biblioteca',
    title: 'Acción IA — Biblioteca',
    narration: 'Biblioteca guarda todos los activos que has generado: imágenes, videos, presentaciones y más, organizados y listos para reutilizar cuando los necesites.' },

  // ═══════════════ SECCIÓN 5 — FILTROS AVANZADOS (sidebar) ═══════════════
  { key: 'sidebar', group: 'Filtros avanzados', tab: 'dashboard', selector: '#sidebar', needs: 'toggleSidebar',
    anchor: '<div id="sidebar">', label: 'Panel de filtros',
    title: 'Filtros avanzados — panel',
    narration: 'Ahora abrimos el panel de Filtros avanzados. Desde aquí segmentas todos tus datos con precisión quirúrgica. Vamos campo por campo.' },

  { key: 'f-search', group: 'Filtros avanzados', tab: 'dashboard', selector: '#f-search', needs: 'toggleSidebar',
    anchor: 'id="f-search"', label: 'Buscar texto',
    title: 'Filtro — Buscar texto',
    narration: 'Buscar texto encuentra cualquier palabra dentro de la descripción, las observaciones o las notas de tus entradas. Es tu buscador universal.' },

  { key: 'f-cat', group: 'Filtros avanzados', tab: 'dashboard', selector: '#f-cat', needs: 'toggleSidebar',
    anchor: 'id="f-cat"', label: 'Categoría',
    title: 'Filtro — Categoría',
    narration: 'El filtro de Categoría te deja aislar un tipo de trabajo: desarrollo, diseño, video, marketing, ventas y muchos más.' },

  { key: 'f-project', group: 'Filtros avanzados', tab: 'dashboard', selector: '#f-project', needs: 'toggleSidebar',
    anchor: 'id="f-project"', label: 'Proyecto',
    title: 'Filtro — Proyecto',
    narration: 'El filtro de Proyecto muestra solo las entradas de un proyecto específico, para enfocar tu análisis en un solo frente de trabajo.' },

  { key: 'f-client', group: 'Filtros avanzados', tab: 'dashboard', selector: '#f-client', needs: 'toggleSidebar',
    anchor: 'id="f-client"', label: 'Cliente',
    title: 'Filtro — Cliente',
    narration: 'El filtro de Cliente aísla toda la actividad de un cliente en particular: ideal para saber cuánto tiempo y costo has dedicado a cada cuenta.' },

  { key: 'f-status', group: 'Filtros avanzados', tab: 'dashboard', selector: '#f-status', needs: 'toggleSidebar',
    anchor: 'id="f-status"', label: 'Estado',
    title: 'Filtro — Estado',
    narration: 'El filtro de Estado separa tus tareas por su avance: completado, en progreso o en revisión. Perfecto para ver qué falta cerrar.' },

  { key: 'f-priority', group: 'Filtros avanzados', tab: 'dashboard', selector: '#f-priority', needs: 'toggleSidebar',
    anchor: 'id="f-priority"', label: 'Prioridad',
    title: 'Filtro — Prioridad',
    narration: 'El filtro de Prioridad ordena por importancia: alta, media o baja, para que enfoques primero lo que más pesa.' },

  { key: 'f-dur-min', group: 'Filtros avanzados', tab: 'dashboard', selector: '#f-dur-min', needs: 'toggleSidebar',
    anchor: 'id="f-dur-min"', label: 'Duración mínima',
    title: 'Filtro — Duración mínima',
    narration: 'La barra de Duración mínima filtra por tiempo: arrástrala para ver solo las actividades que tomaron más de cierta cantidad de minutos.' },

  { key: 'f-rework', group: 'Filtros avanzados', tab: 'dashboard', selector: '#f-rework', needs: 'toggleSidebar',
    anchor: 'id="f-rework"', label: 'Retrabajo',
    title: 'Filtro — Retrabajo',
    narration: 'El filtro de Retrabajo aísla las tareas que hubo que repetir. Es una métrica clave de calidad: menos retrabajo significa mejores procesos.' },

  // ═══════════════ SECCIÓN 6 — ESTUDIO IA (Chat IDE) ═══════════════
  { key: 'studio-sidebar', group: 'Estudio IA', tab: 'dashboard', selector: '.studio-sidebar', needs: 'openFileModal',
    anchor: 'class="studio-sidebar"', label: 'Estudio — panel de tipos',
    title: 'Estudio IA — panel izquierdo',
    narration: 'El Estudio de inteligencia artificial es un entorno estilo editor de código. En el panel izquierdo eliges el tipo de contenido y las acciones rápidas: cotizar, corregir, planear o pedir un dummy.' },

  { key: 'studio-main', group: 'Estudio IA', tab: 'dashboard', selector: '.studio-main', needs: 'openFileModal',
    anchor: 'class="studio-main"', label: 'Estudio — chat central',
    title: 'Estudio IA — chat central',
    narration: 'En el centro está el chat: aquí conversas con la inteligencia artificial, le hablas o le escribes, y ella genera el resultado en vivo mientras dialogas con ella.' },

  { key: 'studio-panel', group: 'Estudio IA', tab: 'dashboard', selector: '#studio-panel', needs: 'openFileModal',
    anchor: 'id="studio-panel"', label: 'Estudio — panel derecho',
    title: 'Estudio IA — panel derecho',
    narration: 'A la derecha aparece el panel de documento: la cotización, el formulario o la vista previa del entregable que estás generando, listo para revisar y enviar.' },

  // ═══════════════ SECCIÓN 7 — ACCESIBILIDAD ═══════════════
  { key: 'acc-panel', group: 'Accesibilidad', tab: 'dashboard', selector: '#acc-panel', needs: 'toggleAccPanel',
    anchor: 'id="acc-panel"', label: 'Panel de accesibilidad',
    title: 'Accesibilidad — panel',
    narration: 'Terminamos con el panel de Accesibilidad, porque este sistema es para todas las personas. Ábrelo desde el ícono de accesibilidad en la barra superior. Vamos por cada opción.' },

  { key: 'acc-text', group: 'Accesibilidad', tab: 'dashboard', selector: '.acc-text-btns', needs: 'toggleAccPanel',
    anchor: 'class="acc-text-btns"', label: 'Tamaño de texto',
    title: 'Accesibilidad — Tamaño de texto',
    narration: 'Tamaño de texto ajusta la letra en tres niveles: normal, grande y extra grande, para que leas cómodamente sin forzar la vista.' },

  { key: 'acc-contrast', group: 'Accesibilidad', tab: 'dashboard', selector: '.acc-toggle-row:has(#acc-chk-contrast)', needs: 'toggleAccPanel',
    anchor: 'id="acc-chk-contrast"', label: 'Alto contraste',
    title: 'Accesibilidad — Alto contraste',
    narration: 'El interruptor de Alto contraste aumenta la diferencia entre colores para mejorar la legibilidad, especialmente útil con poca luz o baja visión.' },

  { key: 'acc-anim', group: 'Accesibilidad', tab: 'dashboard', selector: '.acc-toggle-row:has(#acc-chk-anim)', needs: 'toggleAccPanel',
    anchor: 'id="acc-chk-anim"', label: 'Sin animaciones',
    title: 'Accesibilidad — Sin animaciones',
    narration: 'Sin animaciones desactiva todas las transiciones y movimientos, ideal para personas sensibles al movimiento o para equipos más lentos.' },

  { key: 'acc-cb', group: 'Accesibilidad', tab: 'dashboard', selector: '.acc-cb-grid', needs: 'toggleAccPanel',
    anchor: 'class="acc-cb-grid"', label: 'Daltonismo',
    title: 'Accesibilidad — Daltonismo',
    narration: 'El bloque de Daltonismo ofrece cinco modos de color: visión normal, deuteranopía, protanopía, tritanopía y escala de grises, adaptando la paleta a cómo ve cada persona.' },

  { key: 'acc-voice', group: 'Accesibilidad', tab: 'dashboard', selector: '#acc-voice-btn', needs: 'toggleAccPanel',
    anchor: 'id="acc-voice-btn"', label: 'Control por voz',
    title: 'Accesibilidad — Control por voz',
    narration: 'Control por voz te permite navegar el tracker hablando, sin usar el mouse ni el teclado. Perfecto para manos libres o para quien lo necesita por accesibilidad.' },

  { key: 'acc-tour', group: 'Accesibilidad', tab: 'dashboard', selector: 'button[onclick*="ViaTour"][class="acc-action-btn"]', needs: 'toggleAccPanel',
    anchor: 'if(window.ViaTour)ViaTour.start()', label: 'Tour guiado con voz',
    title: 'Accesibilidad — Tour guiado',
    narration: 'Desde aquí también puedes relanzar este Tour guiado con voz cuando quieras volver a escuchar el recorrido.' },

  { key: 'acc-commands', group: 'Accesibilidad', tab: 'dashboard', selector: 'button[onclick="showVoiceCommands()"]', needs: 'toggleAccPanel',
    anchor: 'onclick="showVoiceCommands()"', label: 'Ver comandos de voz',
    title: 'Accesibilidad — Ver comandos de voz',
    narration: 'Y Ver comandos de voz te muestra la lista completa de frases que el sistema entiende, para que domines la navegación por voz. Con esto terminamos el recorrido: ahora conoces cada botón del Tracker de Victor IA. Gracias por acompañarme.' },
];

// ── VALIDACIÓN + TIMING ─────────────────────────────────────────────────
let t = 0;
const report = { valid: 0, invalid: 0, ghosts: [] };
const outSteps = [];
const selMap = [];

STEPS.forEach((s, i) => {
  const line = findLine(s.anchor);
  const valid = line !== -1;
  if (valid) report.valid++; else { report.invalid++; report.ghosts.push({ key: s.key, selector: s.selector, anchor: s.anchor }); }

  const w = words(s.narration);
  const dur = +(w / WORDS_PER_SEC).toFixed(2);
  const start = +t.toFixed(2);
  const end = +(t + dur).toFixed(2);
  const markStart = +Math.max(0, start - MARK_ANTICIPATION_MS / 1000).toFixed(3);

  outSteps.push({
    n: i + 1, key: s.key, group: s.group, tab: s.tab,
    needs: s.needs || null,
    selector: s.selector,
    label: s.label, title: s.title,
    narration: s.narration,
    words: w,
    estDuration: dur,
    startTime: start,   // cuándo EMPIEZA a hablarse
    endTime: end,       // cuándo TERMINA de hablarse
    markStart: markStart, // marcar 100ms ANTES
    markEnd: end,
    selectorValid: valid,
    htmlLine: line
  });

  selMap.push({
    n: i + 1, key: s.key, label: s.label, group: s.group,
    selector: s.selector, anchor: s.anchor,
    exists: valid, htmlFile: 'index.html', htmlLine: line
  });

  t = end + INTER_STEP_PAUSE;
});

const totalDuration = +t.toFixed(2);

// ── ESCRIBIR tour-narrations-COMPLETO.json ──────────────────────────────
const narrationsOut = {
  meta: {
    project: 'Victor IA Tracker',
    tour: 'ViaTour COMPLETO',
    version: '5.11',
    voice: { provider: 'ElevenLabs', voiceId: 'iDEmt5MnqUotdwCIVplo', model: 'eleven_multilingual_v2' },
    totalSteps: outSteps.length,
    totalButtons: outSteps.length,
    totalWords: outSteps.reduce((a, s) => a + s.words, 0),
    totalDurationSec: totalDuration,
    totalDurationFormatted: `${Math.floor(totalDuration / 60)}m ${Math.round(totalDuration % 60)}s`,
    wordsPerSec: WORDS_PER_SEC,
    interStepPause: INTER_STEP_PAUSE,
    markAnticipationMs: MARK_ANTICIPATION_MS,
    goldenBorder: '#D4AF37',
    generated: new Date().toISOString(),
    validation: { valid: report.valid, invalid: report.invalid, ghostSelectors: report.ghosts.length }
  },
  steps: outSteps
};
fs.writeFileSync(path.join(__dirname, 'tour-narrations-COMPLETO.json'), JSON.stringify(narrationsOut, null, 2));

// ── ESCRIBIR SELECTORES-VALIDADOS.json ──────────────────────────────────
const selOut = {
  meta: {
    source: 'index.html',
    generated: new Date().toISOString(),
    total: selMap.length,
    valid: report.valid,
    invalid: report.invalid,
    ghosts: report.ghosts
  },
  selectors: selMap
};
fs.writeFileSync(path.join(__dirname, 'SELECTORES-VALIDADOS.json'), JSON.stringify(selOut, null, 2));

// ── ESCRIBIR tour-guiado-NARRACION-COMPLETA.txt ─────────────────────────
let txt = '';
txt += '════════════════════════════════════════════════════════════════\n';
txt += '  TOUR GUIADO — NARRACIÓN COMPLETA — Victor IA Tracker v5.11\n';
txt += `  ${outSteps.length} botones · ${narrationsOut.meta.totalWords} palabras · ${narrationsOut.meta.totalDurationFormatted}\n`;
txt += '════════════════════════════════════════════════════════════════\n\n';
let lastGroup = '';
outSteps.forEach(s => {
  if (s.group !== lastGroup) {
    txt += `\n──────────── ${s.group.toUpperCase()} ────────────\n\n`;
    lastGroup = s.group;
  }
  txt += `[${String(s.n).padStart(2, '0')}] ${s.title}  (${s.startTime}s → ${s.endTime}s | marca ${s.markStart}s)\n`;
  txt += `     selector: ${s.selector}  ${s.selectorValid ? '✓ validado (línea ' + s.htmlLine + ')' : '✗ FANTASMA'}\n`;
  txt += `     ${s.narration}\n\n`;
});
fs.writeFileSync(path.join(__dirname, 'tour-guiado-NARRACION-COMPLETA.txt'), txt);

// ── REPORTE EN CONSOLA ──────────────────────────────────────────────────
console.log('══════════════════════════════════════════════════════');
console.log('  BUILD COMPLETO — Tour Victor IA Tracker');
console.log('══════════════════════════════════════════════════════');
console.log(`  Botones/pasos:      ${outSteps.length}`);
console.log(`  Palabras totales:   ${narrationsOut.meta.totalWords}`);
console.log(`  Duración estimada:  ${narrationsOut.meta.totalDurationFormatted} (${totalDuration}s)`);
console.log(`  Selectores válidos: ${report.valid}/${outSteps.length}`);
console.log(`  Selectores FANTASMA: ${report.invalid}`);
if (report.ghosts.length) {
  console.log('\n  ⚠ FANTASMAS DETECTADOS:');
  report.ghosts.forEach(g => console.log(`     - [${g.key}] ${g.selector}  (anchor: ${g.anchor})`));
} else {
  console.log('\n  ✓ CERO SELECTORES FANTASMA — todos existen en index.html');
}
console.log('\n  Archivos escritos:');
console.log('     - tour-narrations-COMPLETO.json');
console.log('     - SELECTORES-VALIDADOS.json');
console.log('     - tour-guiado-NARRACION-COMPLETA.txt');
console.log('══════════════════════════════════════════════════════');
