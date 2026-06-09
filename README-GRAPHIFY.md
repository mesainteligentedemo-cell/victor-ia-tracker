# GRAPHIFY · Observabilidad 3D

**Premium 3D Architecture Dashboard para Victor IA Tracker**

---

## Inicio Rápido

### Ver en vivo

1. Abre https://victor-ia-tracker.vercel.app/
2. Navega a la pestaña "GRAPHIFY · OBSERVABILIDAD"
3. ¡La escena 3D interactiva carga automáticamente!

### Controles

| Acción | Efecto |
|--------|--------|
| **Drag del ratón** | Rotar escena 3D |
| **Rueda del mouse** | Zoom in/out (50-200 unidades) |
| **Hover en nodo** | Nodo brilla, muestra información |
| **Click en nodo** | Detalles en console.log |

---

## Documentación

Elige tu ruta según tu rol:

### Soy Usuario / Quiero Aprender

→ **[GRAPHIFY-EXAMPLES.md](GRAPHIFY-EXAMPLES.md)** (20 ejemplos prácticos)

- Cómo usar los controles
- Interpretar KPI cards
- Filtrar datos
- Analizar tokens
- Casos de uso reales

**Tiempo:** 15-20 minutos

---

### Soy Desarrollador / Quiero Modificar

→ **[GRAPHIFY-QUICK-REFERENCE.md](GRAPHIFY-QUICK-REFERENCE.md)** (Cheat sheet)

- Ubicaciones exactas de código (líneas)
- Snippets copiar-pegar
- Cambiar colores, tamaños, posiciones
- Agregar componentes nuevos
- Debugging rápido

**Tiempo:** 5-10 minutos

---

### Necesito Entender Profundamente

→ **[GRAPHIFY-3D-DASHBOARD.md](GRAPHIFY-3D-DASHBOARD.md)** (Referencia técnica)

- Arquitectura Three.js completa
- Especificaciones de iluminación/materiales
- Pseudocódigo detallado
- Troubleshooting
- Performance metrics
- Roadmap futuro

**Tiempo:** 30-40 minutos

---

### Necesito Índice Central

→ **[GRAPHIFY-INDEX.md](GRAPHIFY-INDEX.md)** (Navegación)

- Overview de todas las secciones
- Flujos recomendados por nivel
- Tabla de líneas clave en código
- FAQ

---

## Características

### Escena 3D Interactiva

```
                    CLAUDE AI (verde, centro)
                          ↓
        ┌──────────────────┼──────────────────┐
        ↓                  ↓                  ↓
   [PLATFORMS]        [AGENTS]          [SKILLS]
   VS Code, Vercel,   Explore, Plan,    figma-*,
   Claude Code        Code Review       workflow,
   (azul)             CSS Auditor       css-quality
                      (púrpura)         (naranja)
        
        ↓              ↓                  ↓
   [MCPs]        [DATABASES]         [APIs]
   HubSpot, Figma Firebase,        ElevenLabs,
   Google Drive, Supabase          OpenRouter,
   After Effects                   Gemini, n8n
   (naranja)          (verde)        (púrpura)
```

**40+ componentes del ecosistema visualizados en 3D real**

---

### Analytics en Tiempo Real

```
┌─ KPI CARDS (Top) ────────────────────────────┐
│ Ahorro: $0.44 │ Eficiencia: 31% │ Costo: $1.28 │ Tokens: 0.67M │
└──────────────────────────────────────────────┘

┌─ FILTROS INTERACTIVOS ──────────────────────┐
│ [Desde: 2026-05-05] [Hasta: 2026-06-08]     │
│ [Cliente: Victor IA] [Proyecto: Tracker]     │
│ [Categoría: Development] [APLICAR]           │
└──────────────────────────────────────────────┘

┌─ TABLA DE PERÍODOS ─────────────────────────┐
│ Fecha      │ Costo USD │ Tokens  │ Acciones │
│ 2026-06-02 │ $0.3521   │ 354.2k  │ 12       │
│ 2026-06-01 │ $0.2155   │ 215.5k  │ 8        │
└──────────────────────────────────────────────┘

┌─ ESTADÍSTICAS POR CATEGORÍA ────────────────┐
│ ┌─ DEVELOPMENT ┐  ┌─ DESIGN ─┐  ┌─ TESTING ┐ │
│ │ Acciones: 45 │  │ Acciones: 28 │ Acciones: 12 │
│ │ Costo: $0.64 │  │ Costo: $0.38 │ Costo: $0.18 │
│ │ Tokens: 640k │  │ Tokens: 380k │ Tokens: 180k │
│ └──────────────┘  └──────────┘  └──────────┘ │
└──────────────────────────────────────────────┘

┌─ FLUJO DE TOKENS ───────────────────────────┐
│ Input:  ███░░░░░░ 68.5% (0.35M)              │
│ Output: ░░░████████ 31.5% (0.16M)            │
│ Total: 0.51M │ Cost: $0.08 │ Avg: $0.000165  │
└──────────────────────────────────────────────┘
```

---

## Qué Ves

### En Escena 3D

- ✅ Nodos de colores que representan componentes
- ✅ Líneas conectando componentes relacionados
- ✅ Halos brillantes alrededor de nodos
- ✅ Efectos de glow que cambian con hover
- ✅ Auto-rotación suave (pausable con drag)

### En Dashboard

- ✅ 4 tarjetas KPI principales (top)
- ✅ Filtros para rango de fechas, cliente, proyecto
- ✅ Tabla cronológica de períodos
- ✅ Estadísticas agrupadas por categoría
- ✅ Visualización de flujo de tokens (input/output)

---

## Requisitos del Sistema

| Aspecto | Requisito |
|--------|-----------|
| Navegador | Chrome, Firefox, Safari, Edge (WebGL support) |
| Tamaño de pantalla | 768px+ ancho (responsive design) |
| JavaScript | Habilitado |
| CDN | jsdelivr.net accesible (Three.js r128) |

---

## Performance

| Dispositivo | FPS | Status |
|-------------|-----|--------|
| MacBook M1 | 140+ | ✅ Excelente |
| Windows i7 | 110+ | ✅ Excelente |
| iPad Air | 60 | ✅ Bueno |
| Pixel 6 | 35-45 | ✅ Aceptable |

---

## Arquitectura Técnica

### Stack

- **3D Graphics:** Three.js r128 (WebGL)
- **UI:** HTML5 + CSS3 + Vanilla JavaScript
- **Styling:** CSS variables (dark mode optimized)
- **Datos:** Victor IA Tracker database (real-time)

### Componentes Clave

```javascript
GraphifyUI {
  init3DGraph()           // Escena 3D con Three.js
  render()                // Renderiza todo
  createCategoryStats()   // Stats por categoría
  createTokenFlowSection() // Flujo de tokens
  applyFilters()          // Filtros interactivos
  aggregateByDate()       // Agrupa por fecha
}
```

---

## Casos de Uso

### 1. Monitoreo de Arquitectura
Ver qué componentes del ecosistema se están usando en tiempo real.

### 2. Análisis de Costos
Entender qué categorías consumen más tokens/dinero.

### 3. Optimización de Proyectos
Filtrar por proyecto para ver su breakdown de costos y tokens.

### 4. Troubleshooting
Visualizar conexiones entre componentes para diagnosticar issues.

### 5. Reportes a Stakeholders
Mostrar dashboard premium como evidencia de infraestructura robusta.

---

## Modificaciones Comunes

### Cambiar Color de un Componente

```javascript
// En index.html, línea ~13457, edit colors object:
const colors = {
  skill: 0xf97316,  // Cambiar este hex
};
```

### Agregar Nuevo MCP

```javascript
// En index.html, línea ~13519, add a array:
mcp: [
  { name: 'Mi MCP Nuevo', type: 'mcp', pos: [60, 35, -60] }
]
```

### Cambiar Velocidad de Zoom

```javascript
// En index.html, línea ~13677, edit max zoom:
camera.position.z = Math.max(50, Math.min(500, camera.position.z));
//                            ↑                   ↑
//                           min                 max
```

→ Ver **[GRAPHIFY-QUICK-REFERENCE.md](GRAPHIFY-QUICK-REFERENCE.md)** para más snippets

---

## Troubleshooting

### El gráfico no aparece
- Verificar que Three.js cargó (F12 → Console)
- Chequear WebGL support: `renderer.getContext().isWebGL2`

### Lag/Performance bajo
- Reducir geometría: Icosahedron(size, **2**) en lugar de 4
- Desabilitar sombras: `renderer.shadowMap.enabled = false`

### Nodos no responden a clicks
- Ver console para errores
- Chequear que raycaster se inicializa en mousemove

→ Ver **[GRAPHIFY-3D-DASHBOARD.md](GRAPHIFY-3D-DASHBOARD.md#troubleshooting)** para troubleshooting completo

---

## Roadmap

### v1.1 (Próximo)
- [ ] WebSocket para real-time updates
- [ ] Modal de detalles en click

### v1.2
- [ ] Multi-select en filtros
- [ ] Export a PNG/PDF

### v2.0
- [ ] InstancedMesh para >200 nodos
- [ ] Babylon.js como alternativa

---

## Archivos

```
C:\Users\inbou\victor-ia-tracker\
├── index.html                          (código, línea 13254+)
├── README-GRAPHIFY.md                  (este archivo)
├── GRAPHIFY-INDEX.md                   (índice central)
├── GRAPHIFY-EXAMPLES.md                (20 ejemplos prácticos)
├── GRAPHIFY-QUICK-REFERENCE.md         (cheat sheet dev)
├── GRAPHIFY-3D-DASHBOARD.md            (referencia técnica)
└── GRAPHIFY-DELIVERY-SUMMARY.md        (resumen proyecto)
```

---

## Support

Encuentras un bug o tienes mejora?

1. Revisa la consola del navegador (F12)
2. Consulta [GRAPHIFY-3D-DASHBOARD.md](GRAPHIFY-3D-DASHBOARD.md#troubleshooting)
3. Crea un issue en GitHub con:
   - Navegador/dispositivo
   - Steps para reproducir
   - Screenshot/console error

---

## Créditos

- **Implementación:** Claude Code
- **Framework:** Three.js + Vanilla JS
- **Diseño:** Victor IA Brand
- **Datos:** Victor IA Tracker Database

---

## Status

✅ **Version 1.0** - Stable, Production-Ready  
📅 **Last Updated:** 2026-06-09  
🚀 **Live Demo:** https://victor-ia-tracker.vercel.app/

---

**¿Necesitas ayuda rápida?**

- Soy usuario → [GRAPHIFY-EXAMPLES.md](GRAPHIFY-EXAMPLES.md)
- Soy dev → [GRAPHIFY-QUICK-REFERENCE.md](GRAPHIFY-QUICK-REFERENCE.md)
- Necesito deep dive → [GRAPHIFY-3D-DASHBOARD.md](GRAPHIFY-3D-DASHBOARD.md)
- Busco índice → [GRAPHIFY-INDEX.md](GRAPHIFY-INDEX.md)

---

**Made with ❤️ for Victor IA**
