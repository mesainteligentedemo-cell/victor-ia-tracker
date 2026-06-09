# GRAPHIFY 3D Dashboard — Ejemplos de Uso

## Ejemplo 1: Ver la Arquitectura Completa

1. Abrir Victor IA Tracker: `https://victor-ia-tracker.vercel.app/`
2. Hacer click en tab "GRAPHIFY · OBSERVABILIDAD"
3. La escena 3D carga automáticamente
4. Ver:
   - Claude AI (core verde al centro)
   - Plataformas (VS Code, Vercel, Claude Code) en azul
   - Agentes (Explore, Plan, Code Review, CSS Auditor) en púrpura
   - Skills, MCPs, Bases de datos y APIs distribuidos en 3D

---

## Ejemplo 2: Interactuar con la Escena 3D

### Rotar la Escena
```
1. Mover cursor sobre el gráfico 3D
2. Presionar y mantener botón izquierdo del ratón
3. Mover ratón horizontalmente → escena rota en Y
4. Mover ratón verticalmente → escena rota en X
5. Soltar botón
```

**Resultado:** Escena rota fluidamente en la dirección del movimiento

### Zoom In/Out
```
1. Posicionar cursor sobre el gráfico 3D
2. Rotar rueda del mouse hacia arriba → zoom IN (camera se aleja)
3. Rotar rueda del mouse hacia abajo → zoom OUT (camera se acerca)
```

**Resultado:** Cámara se mueve entre 50 y 200 unidades Z

### Hover en Nodo
```
1. Mover cursor sobre cualquier nodo (esfera)
2. Ver cambio visual inmediato
```

**Cambios visuales:**
- Nodo brilla más (emissive intensity 0.3 → 0.8)
- Halo glow se hace más brillante (opacity 0.15 → 0.4)
- Cursor cambia de `grab` a `pointer`

### Click en Nodo
```
1. Hacer click en cualquier nodo
2. Abrir DevTools (F12) → Console
3. Ver output:
   "Claude AI (ai, Active)"
   "VS Code (platform, Active)"
```

**Resultado:** Información del componente en console.log

---

## Ejemplo 3: Filtrar Datos por Rango de Fechas

1. En sección "Filtros Interactivos":
   - Campo "Desde": Cambiar a `2026-05-15`
   - Campo "Hasta": Cambiar a `2026-06-08`
2. Click en botón "Aplicar"
3. Ver cambios:
   - Gráfico 3D se actualiza (solo entradas en rango)
   - Tabla de períodos muestra solo esas fechas
   - KPIs recalculan

**Caso de uso:** Analizar período específico de trabajo (e.g., última semana)

---

## Ejemplo 4: Filtrar por Cliente

1. En "Filtros Interactivos":
   - Cliente: Seleccionar `Victor IA` (o cliente específico)
2. Click "Aplicar"
3. Resultado:
   - Solo mostrará datos de ese cliente
   - Tabla filtra automáticamente
   - Estadísticas recalculan solo para ese cliente

**Nota:** Si selecciona "todos", se muestran todos los clientes

---

## Ejemplo 5: Filtrar por Proyecto

1. En "Filtros Interactivos":
   - Proyecto: Seleccionar `Tracker` (o proyecto específico)
2. Click "Aplicar"
3. Resultado:
   - Escena 3D actualizada
   - Nodos de proyecto se resaltan
   - Flujo de tokens recalculado para ese proyecto

**Caso de uso:** Analizar costos y tokens de un proyecto específico

---

## Ejemplo 6: Analizar KPI Cards

En la parte superior de GRAPHIFY verá 4 tarjetas principales:

### Tarjeta 1: Ahorro Neto (Verde)
```
AHORRO NETO
$0.44

Interpretación: Se ahorró $0.44 vs baseline de costos
```

### Tarjeta 2: Eficiencia (Ámbar)
```
EFICIENCIA
31%

Interpretación: 31% más eficiente que baseline
```

### Tarjeta 3: Costo Total (Azul)
```
COSTO TOTAL
$1.2847

Interpretación: Costo total de todas las operaciones en período
```

### Tarjeta 4: Tokens (Púrpura)
```
TOKENS (M)
0.67

Interpretación: 0.67 millones de tokens utilizados
```

**Hover:** Las tarjetas suben y muestran sombra al pasar el cursor (feedback visual)

---

## Ejemplo 7: Interpretar Tabla de Períodos

```
Fecha        | Costo USD | Tokens | Acciones
2026-06-02   | $0.3521   | 354.2k | 12
2026-06-01   | $0.2155   | 215.5k | 8
2026-05-31   | $0.1842   | 184.2k | 6
```

**Lectura:**
- Línea 1: En fecha 2026-06-02 se gastaron $0.35 en 354k tokens con 12 entradas
- Línea 2: Día anterior fue más barato ($0.21)
- Ordenado más reciente primero (descendente)

**Hover:** Fila se ilumina en amber
**Click:** (Deprecado) muestra alerta con detalles

---

## Ejemplo 8: Analizar Estadísticas por Categoría

Abajo aparecerán tarjetas como:

```
DEVELOPMENT          │  DESIGN              │  TESTING
Acciones: 45         │  Acciones: 28        │  Acciones: 12
Costo: $0.64         │  Costo: $0.38        │  Costo: $0.18
Tokens: 640k         │  Tokens: 380k        │  Tokens: 180k
```

**Interpretación:**
- Development consumió más recursos (45 acciones, $0.64)
- Categoría con border izquierdo de color
- Color = tipo de categoría (naranja, azul, púrpura, etc)

**Hover:** Tarjeta sube y muestra sombra

---

## Ejemplo 9: Leer Flujo de Tokens

```
Input Tokens:  ███░░░░░░ 68.5% (0.35M) →  Output Tokens:  ░░░████████ 31.5% (0.16M)

TOTAL TOKENS: 0.51M  |  COSTO TOTAL: $0.0847  |  AVG TOKEN COST: $0.000165
```

**Interpretación:**
- Input (solicitudes enviadas) = 68.5% del tráfico
- Output (respuestas recibidas) = 31.5% del tráfico
- Relación 2.17:1 (input:output)
- Costo promedio por millón de tokens: $0.0165

**Caso de uso:** Entender balance de request/response. Si output es muy alto puede haber logs/responses verbosos.

---

## Ejemplo 10: Agregar Nuevo Componente MCP

### Escenario: Necesitas agregar "Stripe" como MCP nuevo

**Paso 1: Editar index.html (línea ~13519)**

```javascript
// EN: init3DGraph(entries)
// BUSCAR: mcp: [

mcp: [
  { name: 'HubSpot', type: 'mcp', pos: [-120, 35, 0] },
  { name: 'Figma', type: 'mcp', pos: [0, 35, 120] },
  { name: 'Google Drive', type: 'mcp', pos: [120, 35, 0] },
  { name: 'After Effects', type: 'mcp', pos: [0, 35, -120] },
  { name: 'Higgsfield', type: 'mcp', pos: [-60, 35, 60] },
  // AGREGAR:
  { name: 'Stripe', type: 'mcp', pos: [60, 35, -60] }
],
```

**Paso 2: Guardar y recargar**

La próxima vez que abras GRAPHIFY verás a Stripe como nodo naranja en (60, 35, -60)

---

## Ejemplo 11: Cambiar Color de Skill

### Escenario: Quieres que "figma-use" sea púrpura en lugar de naranja

**Buscar línea ~13380 donde se crean skills:**

Antes (no hace falta editar aquí, se toma del colors global):
```javascript
{ name: 'figma-use', type: 'skill', color: '#f97316' }
```

**En lugar de eso, editar colors object (línea ~13457):**

```javascript
const colors = {
  // ...
  skill: 0xf97316,  // CAMBIAR a: 0xc084fc (púrpura)
  // ...
};
```

**Resultado:** Todos los skills ahora serán púrpura.

**Nota:** Si quieres que solo figma sea diferente, necesitarías lógica especial en `createNode()`.

---

## Ejemplo 12: Aumentar Velocidad de Rotación Auto

### Escenario: La escena rota muy lentamente, quieres que gire más rápido

**Buscar línea ~13669:**

```javascript
if (!isDragging) {
  mainGroup.rotation.y += 0.0005;  // CAMBIAR a: 0.002
}
```

**Resultado:** Escena rota 4x más rápido (~6° por segundo en lugar de 1.7°)

---

## Ejemplo 13: Entender Conexiones 3D

En el gráfico verá líneas conectando nodos:

```
Claude AI (verde) ──────→ VS Code (azul)
Claude AI ──────────────→ Explore Agent (púrpura)
Claude AI ────────────────→ HubSpot (naranja)
```

**Significado:**
- Verde: Conexión a Platforms (input principal)
- Púrpura: Conexión a Agents (procesamiento)
- Naranja: Conexión a MCPs (integraciones externas)

**Opacidad de línea** = intensidad de flujo:
- 0.4 = fuerte (platforms)
- 0.3 = medio (agents)
- 0.25 = débil (MCPs)

---

## Ejemplo 14: Monitorear Performance en Vivo

En DevTools Console, ejecutar:

```javascript
// Ver FPS
let lastTime = performance.now();
let frames = 0;
setInterval(() => {
  frames++;
  let now = performance.now();
  if (now >= lastTime + 1000) {
    console.log('FPS:', frames);
    frames = 0;
    lastTime = now;
  }
}, 0);
```

**Resultado:**
- MacBook M1: ~140 FPS
- Windows i7: ~110 FPS
- iPad Air: ~60 FPS
- Pixel 6: ~30-45 FPS

Si cae < 30 FPS → reduce geometría (Icosahedron subdivisiones de 4 a 2)

---

## Ejemplo 15: Exportar Datos de la Tabla

Aunque no hay botón de export nativo, en console puedes:

```javascript
// Copiar tabla como CSV
const table = document.querySelector('table');
const rows = Array.from(table.querySelectorAll('tr'));
const csv = rows.map(r => 
  Array.from(r.querySelectorAll('td,th'))
    .map(c => c.textContent)
    .join(',')
).join('\n');
console.log(csv);
// Copiar output y pegar en Excel/Google Sheets
```

**Resultado:** Tabla en formato CSV listo para pegar

---

## Ejemplo 16: Caso Real: Analizar Proyecto "Victor IA Website"

### Pasos:

1. **Filtrar por proyecto:**
   - Proyecto: "Victor IA Website"
   - Click Aplicar

2. **Leer KPIs:**
   - ¿Cuánto costo? (Tarjeta azul)
   - ¿Qué eficiencia? (Tarjeta ámbar)

3. **Analizar categorías:**
   - ¿Cuál categoría costó más? (Card más brillante)

4. **Check token flow:**
   - ¿Ratio input:output?
   - ¿Promedio cost/token?

5. **Examinar escena 3D:**
   - ¿Qué componentes se usaron? (Nodos más brillantes)
   - ¿Qué MCP fue crítico? (Mayor glow)

**Conclusión:** Ahora sabes exactamente qué costó, cuánto y qué tecnologías se involucraron.

---

## Ejemplo 17: Cambiar Rango de Zoom

### Escenario: Quieres poder hacer zoom más lejos

**Editar línea ~13677:**

```javascript
camera.position.z = Math.max(50, Math.min(200, camera.position.z));
//                            ↑                   ↑
//                        min: 50            max: 200
// CAMBIAR a:
camera.position.z = Math.max(20, Math.min(500, camera.position.z));
//                            ↑                   ↑
//                       min: 20            max: 500
```

**Resultado:** Puedes hacer zoom mucho más in y out

---

## Ejemplo 18: Agregar Animación a Nuevo Elemento

Si agregas una nueva sección HTML:

```javascript
// En render(), antes de return section:

section.style.animation = 'fadeIn 0.6s ease-out 0.2s both';
// o
section.style.animation = 'slideInLeft 0.8s ease-out 0.3s both';
```

Opciones disponibles:
- `fadeIn` — aparición suave
- `slideInLeft` — entra desde izquierda
- `pulseGlow` — parpadeo de luz

---

## Ejemplo 19: Debug: Qué Entry Fue Seleccionada

En console:

```javascript
// Ver filtros actuales
GraphifyUI.state.filters

// Resultado típico:
{
  dateFrom: '2026-05-05',
  dateTo: '2026-06-02',
  client: 'Victor IA',
  project: 'Tracker',
  category: 'Development'
}
```

---

## Ejemplo 20: Performance Tweak para Móvil

Si ves lag en iPad/Pixel:

```javascript
// En init3DGraph(), línea ~13474, cambiar geometría:

// ANTES:
const geometry = new THREE.IcosahedronGeometry(size, 4);

// DESPUÉS (menos polígonos):
const geometry = new THREE.IcosahedronGeometry(size, 2);
```

También desabilitar sombras:

```javascript
renderer.shadowMap.enabled = false;  // En lugar de true
```

**Resultado:** +40 FPS en dispositivos móviles

---

## Tips & Tricks

### Ocultar UI innecesaria en presentación
```javascript
// En console:
document.getElementById('view-graphify').querySelector('[style*="Filtros"]').style.display = 'none';
```

### Hacer screenshot de la escena 3D
```javascript
// En console (despues de renderizar):
renderer.render(scene, camera);
const link = document.createElement('a');
link.href = renderer.domElement.toDataURL();
link.download = 'graphify-screenshot.png';
link.click();
```

### Pausar auto-rotación
```javascript
// En console:
isDragging = true;  // Simula que estás draggeando
// No más auto-rotación hasta que liberes el ratón
```

---

**Última actualización:** 2026-06-09  
**Próximas mejoras:** WebSocket real-time, modal de detalles, export mejorado
