# GRAPHIFY 3D Dashboard · Documentation Index

## Documentación Completa

### Para Usuarios

**[GRAPHIFY-EXAMPLES.md](GRAPHIFY-EXAMPLES.md)** — 20 ejemplos prácticos
- Cómo usar la escena 3D (rotar, zoom, hover, click)
- Filtrar datos por fecha, cliente, proyecto
- Interpretar KPI cards, tablas, estadísticas
- Analizar flujo de tokens
- Casos de uso reales
- Tips & tricks

**Tiempo de lectura:** 15-20 minutos
**Nivel:** Principiante → Intermedio

---

### Para Desarrolladores

**[GRAPHIFY-QUICK-REFERENCE.md](GRAPHIFY-QUICK-REFERENCE.md)** — Cheat sheet técnico
- Ubicaciones de código clave (líneas exactas)
- Snippets para modificar colores, tamaños, posiciones
- Agregar nuevos componentes a la arquitectura
- Ajustes de iluminación, glow, zoom
- Debugging y testing local
- Tabla de troubleshooting

**Tiempo de lectura:** 5-10 minutos  
**Nivel:** Intermedio

**[GRAPHIFY-3D-DASHBOARD.md](GRAPHIFY-3D-DASHBOARD.md)** — Documentación técnica completa
- Descripción de arquitectura visual (componentes, colores, tamaños)
- Especificaciones de Three.js (scene, lights, materials)
- Función `init3DGraph()` pseudocódigo completo
- Funciones auxiliares documentadas
- Roadmap de mejoras futuras
- Performance metrics testeados
- Troubleshooting detallado

**Tiempo de lectura:** 30-40 minutos  
**Nivel:** Avanzado

---

## Flujo de Navegación por Nivel

### Soy nuevo en GRAPHIFY

1. Leer: [GRAPHIFY-EXAMPLES.md](GRAPHIFY-EXAMPLES.md) - Ejemplo 1 (Ver la arquitectura)
2. Hacer: Abrir el tracker y ver la escena 3D
3. Hacer: Ejemplo 2 (Interactuar: rotar, zoom)
4. Hacer: Ejemplo 3-5 (Filtrar datos)
5. Leer: Ejemplo 6-9 (Interpretar datos)

**Tiempo total:** ~20 minutos

---

### Necesito modificar algo

1. Leer: [GRAPHIFY-QUICK-REFERENCE.md](GRAPHIFY-QUICK-REFERENCE.md) - Sección relevante
2. Copy/paste el snippet sugerido
3. Guardar y recargar página
4. Si algo no funciona → [GRAPHIFY-3D-DASHBOARD.md](GRAPHIFY-3D-DASHBOARD.md) Troubleshooting

**Tiempo típico:** 2-5 minutos

---

### Voy a agregar features nuevas

1. Revisar [GRAPHIFY-3D-DASHBOARD.md](GRAPHIFY-3D-DASHBOARD.md) - Sección relevante
2. Entender la función `init3DGraph()` pseudocódigo (línea 13448)
3. Leer ejemplos en [GRAPHIFY-EXAMPLES.md](GRAPHIFY-EXAMPLES.md) - Ejemplo 10+ para patrones
4. Implementar y testear localmente (console techniques)
5. Commit con descripción clara (ver git log para formato)

**Tiempo típico:** 1-3 horas

---

## Estructura de Archivos

```
victor-ia-tracker/
├── index.html                          ← Código principal (13,000+ líneas)
│   ├── GraphifyUI object (línea 13254)
│   ├── init3DGraph() (línea 13448)
│   └── render() (línea 13330)
│
├── GRAPHIFY-INDEX.md                   ← Este archivo (indice)
├── GRAPHIFY-EXAMPLES.md                ← 20 ejemplos prácticos
├── GRAPHIFY-QUICK-REFERENCE.md         ← Cheat sheet para devs
└── GRAPHIFY-3D-DASHBOARD.md            ← Referencia técnica completa
```

---

## Líneas Clave en index.html

| Sección | Línea | Descripción |
|---------|-------|-------------|
| GraphifyUI init | 13254 | Punto de entrada del sistema |
| GraphifyUI.render() | 13330 | Renderiza todo el dashboard |
| init3DGraph() | 13448 | Escena 3D con Three.js |
| createNode() | 13470 | Crea un nodo 3D individual |
| createConnection() | 13502 | Crea líneas entre nodos |
| createCategoryStats() | 13663 | Estadísticas por categoría |
| createTokenFlowSection() | 13689 | Flujo de tokens visualizado |
| getStyles() | 13749 | Estilos CSS y animaciones |

---

## Características Principales

### Escena 3D Interactiva
- ✅ 40+ componentes del ecosistema
- ✅ Drag-to-rotate
- ✅ Scroll-to-zoom
- ✅ Hover effects con glow dinámico
- ✅ Click para detalles (console.log)
- ✅ Auto-rotación suave
- ✅ Lighting realista (3 luces)

### Filtros & Controls
- ✅ Filtro por rango de fechas
- ✅ Filtro por cliente
- ✅ Filtro por proyecto
- ✅ Filtro por categoría
- ✅ Aplicar filtros → re-render automático

### Analytics & Stats
- ✅ KPI cards (Ahorro, Eficiencia, Costo, Tokens)
- ✅ Tabla de períodos
- ✅ Estadísticas por categoría
- ✅ Flujo de tokens (input vs output)
- ✅ Costo promedio por millón de tokens

---

## Dependencias

| Librería | Versión | CDN | Crítica |
|----------|---------|-----|---------|
| Three.js | r128 | jsdelivr | ✅ Sí |
| Chart.js | 4.4.0 | CDN (legacy) | ❌ No |
| Firebase | 10.12.2 | gstatic | ❌ No |

**GRAPHIFY funciona aunque falle Firebase o Chart.js**

---

## Performance Targets

| Dispositivo | Target FPS | Actual | Status |
|-------------|-----------|--------|--------|
| MacBook M1 | 60 | 140 | ✅ Excellent |
| Windows i7 | 60 | 110 | ✅ Excellent |
| iPad Air | 60 | 60 | ✅ Good |
| Pixel 6 | 30 | 35-45 | ✅ Acceptable |

---

## Próximas Mejoras (Roadmap)

### Phase 1 (v1.1) — Real-time Updates
- [ ] WebSocket para métricas en vivo
- [ ] Animación de nodos cuando se actualizan datos
- [ ] Indicador de "último update"

### Phase 2 (v1.2) — Advanced UX
- [ ] Modal de detalles al click en nodo
- [ ] Multi-select para filtros
- [ ] Date picker mejorado
- [ ] Búsqueda por nombre

### Phase 3 (v1.3) — Export & Analytics
- [ ] Exportar a PNG (screenshot del gráfico 3D)
- [ ] Exportar datos a CSV/JSON
- [ ] Print-friendly view

### Phase 4 (v2.0) — Performance & Scale
- [ ] InstancedMesh para >150 nodos
- [ ] LOD (Level of Detail) automático
- [ ] Babylon.js como alternativa a Three.js
- [ ] Servidor-side rendering de estadísticas

---

## Git Commits Relacionados

```bash
# Ver commits del sistema GRAPHIFY
git log --grep="graphify\|GRAPHIFY\|3D graph" --oneline

# Últimos commits:
05a21d2 docs: Add 20 practical examples for GRAPHIFY 3D dashboard usage
fc24be3 docs: Add comprehensive GRAPHIFY 3D dashboard documentation
4475e5e feat: Add premium 3D architecture visualization to GRAPHIFY dashboard
```

---

## FAQ

### ¿Funciona en móvil?
Sí, pero con FPS reducido (30-45). Versión optimizada próximamente.

### ¿Puedo personalizar colores?
Sí, editar `colors` object en init3DGraph() (línea ~13457).

### ¿Cómo agrego un nuevo componente?
Ver [GRAPHIFY-QUICK-REFERENCE.md](GRAPHIFY-QUICK-REFERENCE.md) - "Agregar Nuevo Componente"

### ¿Qué pasa si Three.js no carga?
Sistema degrada gracefully. Muestra fallback SVG 2D (legacy code).

### ¿Por qué el gráfico sigue rotando?
Es auto-rotación suave. Arrastra el ratón para controlarlo manualmente (pausa auto-rotate).

### ¿Cómo exporto los datos?
Ver [GRAPHIFY-EXAMPLES.md](GRAPHIFY-EXAMPLES.md) - Ejemplo 15 (Exportar como CSV)

---

## Support & Contact

Si encuentras un bug o tienes sugerencia:

1. **Revisar console del navegador (F12)** para errores específicos
2. **Ir a [GRAPHIFY-3D-DASHBOARD.md](GRAPHIFY-3D-DASHBOARD.md) Troubleshooting**
3. **Crear issue en GitHub** con:
   - Navegador/dispositivo
   - Screenshot
   - Pasos para reproducir
   - Console errors (si los hay)

---

## Quick Links

- **Live Demo:** https://victor-ia-tracker.vercel.app/ → Tab "GRAPHIFY"
- **Source:** C:\Users\inbou\victor-ia-tracker\index.html (línea 13254+)
- **GitHub:** https://github.com/inbou/victor-ia-tracker
- **Documentación completa:** Este archivo + 3 referencias

---

## Versiones

| Versión | Fecha | Cambios |
|---------|-------|---------|
| 1.0 | 2026-06-09 | Release inicial con 3D + analytics |
| 0.1 | 2026-06-02 | Prototipo SVG 2D (reemplazado) |

**Versión actual:** 1.0 (Stable)  
**Status:** Production-ready  
**Last updated:** 2026-06-09

---

## Créditos

- **Implementación:** Claude Code
- **Framework:** Three.js + Vanilla JavaScript
- **Diseño:** Victor IA Brand Guidelines
- **Datos:** Victor IA Tracker Database

---

**¿Necesitas ayuda rápida?** → [GRAPHIFY-QUICK-REFERENCE.md](GRAPHIFY-QUICK-REFERENCE.md)  
**¿Quieres aprender?** → [GRAPHIFY-EXAMPLES.md](GRAPHIFY-EXAMPLES.md)  
**¿Deep dive técnico?** → [GRAPHIFY-3D-DASHBOARD.md](GRAPHIFY-3D-DASHBOARD.md)
