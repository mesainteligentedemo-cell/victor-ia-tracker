# GRAPHIFY Quick Reference — Desarrollador

## Ubicaciones Clave

| Elemento | Línea | Archivo |
|----------|-------|---------|
| GraphifyUI object | 13254 | index.html |
| init3DGraph() | 13448 | index.html |
| renderTelemetria() | 12198 | index.html |
| view-graphify div | 4741 | index.html |

---

## Agregar Nuevo Componente a la Arquitectura 3D

### 1. Agregar al Array de Ecosystem

```javascript
// En init3DGraph(), dentro del objeto ecosystem

mcp: [
  { name: 'HubSpot', type: 'mcp', pos: [-120, 35, 0] },
  // NEW:
  { name: 'MyNewMCP', type: 'mcp', pos: [120, 35, 60] }
]
```

### 2. Asignar Color

```javascript
// En colors object
const colors = {
  // ...
  mcp: 0xfb923c,  // Orange para MCP
  // ...
};
```

### 3. Loop automático renderiza

El `ecosystem.mcp.forEach()` loop (línea ~13620) automáticamente crea el nodo.

---

## Cambiar Colores de Componentes

```javascript
// En init3DGraph(), línea ~13454 (colors object)
const colors = {
  ai: 0x4ade80,        // Verde
  platform: 0x60a5fa,  // Azul
  agent: 0xc084fc,     // Púrpura
  skill: 0xf97316,     // Naranja
  mcp: 0xfb923c,       // Naranja (más claro)
  automation: 0xf97316,
  database: 0x22c55e,  // Verde
  api: 0x8b5cf6,       // Púrpura
  project: 0x06b6d4,   // Cian
  cli: 0xfaf7f5        // Blanco hueso
};
```

**Nota:** Usar mismo color en `getCategoryColor()` para consistencia.

---

## Ajustar Tamaños de Nodos

```javascript
// En createNode(), línea ~13470
const sizes = {
  ai: 8,           // Core (más grande)
  platform: 5,     // Platforms
  agent: 4,        // Agents
  skill: 2.5,      // Skills (pequeño)
  mcp: 3,
  database: 3.5,
  api: 2.8,
  automation: 3,
  cli: 4
};
```

Aumentar número = nodo más grande.

---

## Modificar Posiciones 3D

```javascript
// En init3DGraph(), ecosystem object

agents: [
  { name: 'Explore', type: 'agent', pos: [-80, 15, 0] },
  //                                      ↑   ↑  ↑
  //                                      x   y  z (coordenadas 3D)
]
```

**Sistema de coordenadas:**
- **X:** Izquierda/Derecha (negativo = izquierda)
- **Y:** Arriba/Abajo (positivo = arriba)
- **Z:** Adelante/Atrás (negativo = hacia atrás)

**Centro:** (0, 0, 0)

---

## Agregar Nueva Conexión entre Nodos

```javascript
// En init3DGraph(), después de crear nodos (línea ~13600)

// Conectar platform_0 con agent_2
connections.push(createConnection(
  ecosystem.platforms[0].pos,  // from
  ecosystem.agents[2].pos,      // to
  0xc084fc,                     // color (púrpura)
  0.4                           // intensity (0-1)
));
```

---

## Cambiar Configuración de Iluminación

```javascript
// En init3DGraph(), línea ~13465

const ambLight = new THREE.AmbientLight(0xffffff, 0.4);  // Aumentar 0.4
scene.add(ambLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);  // Aumentar 0.8
dirLight.position.set(100, 150, 100);  // Posición de luz
scene.add(dirLight);

const pointLight = new THREE.PointLight(0xFFAA17, 0.5, 300);  // Amber glow
pointLight.position.set(0, 50, 0);  // Centro arriba
scene.add(pointLight);
```

---

## Ajustar Comportamiento de Glow

```javascript
// En createNode(), línea ~13481

// Mesh glow
const glowGeometry = new THREE.IcosahedronGeometry(size * 1.4, 4);  // 1.4x multiplicador
const glowMaterial = new THREE.MeshBasicMaterial({
  color: color,
  transparent: true,
  opacity: 0.15,  // Opacidad base (aumentar = más brillante)
  side: THREE.BackSide
});

// Hover effect
node.userData.mesh.material.emissiveIntensity = 0.3 + Math.sin(coreTime) * 0.3;
//                                               ↑ min            ↑ oscillation range
```

---

## Cambiar Velocidad de Auto-Rotación

```javascript
// En animation loop, línea ~13670

if (!isDragging) {
  mainGroup.rotation.y += 0.0005;  // Cambiar este valor
  //                         ↑
  //                   0.0005 = muy lento
  //                   0.001 = lento
  //                   0.005 = normal (actual)
  //                   0.01 = rápido
}
```

---

## Modificar Zoom Limits

```javascript
// En wheel event handler, línea ~13645

camera.position.z = Math.max(50, Math.min(200, camera.position.z));
//                            ↑                    ↑
//                        min zoom             max zoom
```

---

## Agregar Nueva Sección de Dashboard

```javascript
// En render(), después de createTokenFlowSection()

root.appendChild(GraphifyUI.createYourNewSection(filtered));

// Definir función:
createYourNewSection(entries) {
  const section = document.createElement('div');
  section.style.cssText = 'margin-top:24px;margin-bottom:24px';
  
  // Tu código HTML/lógica aquí
  section.innerHTML = `<div>...</div>`;
  
  return section;
}
```

---

## Usar Datos de Entries en la Escena 3D

```javascript
// init3DGraph() recibe parámetro 'entries' (ya filtrado)

init3DGraph(entries) {
  // entries es array de objetos con:
  // - input_tokens, output_tokens, cost_usd
  // - project, client, cat, dateKey
  // - durSec, team, challenge, solution, learning
  
  // Ejemplo: colorear nodo por frecuencia de uso
  entries.forEach(e => {
    const proj = e.project || 'General';
    // contar usos por proyecto, mapear a nodo
  });
}
```

---

## Limpiar Recursos (Important!)

```javascript
// Se ejecuta automáticamente cuando cambias de tab

window.cleanup3DGraph = () => {
  cancelAnimationFrame(frameId);
  window.removeEventListener('resize', onWindowResize);
  renderer.dispose();
  // También cleanup de geometrías/materials si necesario
};
```

---

## Debug: Printear Info del Nodo

```javascript
// En console del navegador mientras interactúas

// Hover para ver detalles
hoveredNode.userData  // { name, type, mesh, glow, glowMaterial }

// Ver ecosistema (en context de init3DGraph)
ecosystem  // { core, platforms, agents, skills, mcp, databases, apis }

// Ver estado de cámara
camera.position  // { x, y, z }
camera.near  // 0.1
camera.far   // 10000
```

---

## Animaciones CSS Disponibles

```css
@keyframes fadeIn { 
  from { opacity: 0; transform: translateY(10px); } 
  to { opacity: 1; transform: translateY(0); } 
}

@keyframes slideInLeft { 
  from { opacity: 0; transform: translateX(-20px); } 
  to { opacity: 1; transform: translateX(0); } 
}

@keyframes pulseGlow {
  0%, 100% { box-shadow: 0 0 10px rgba(255,170,23,0.1); }
  50% { box-shadow: 0 0 30px rgba(255,170,23,0.3); }
}
```

Usar en nuevas secciones con `animation: fadeIn 0.6s ease-out;`

---

## Estilos de Botones & Inputs

```javascript
// Template para selector/input
html += `<input 
  type="date" 
  id="gf-from" 
  style="width:100%;padding:8px;background:var(--surface);border:1px solid var(--border);color:var(--bone);font-size:10px;border-radius:3px"
>`;

// Botón aplicar
html += `<button 
  onclick="window.graphifyApplyFilters()" 
  style="width:100%;padding:8px;background:var(--amber);color:#000;border:none;font-weight:700;border-radius:3px;cursor:pointer;font-size:10px;text-transform:uppercase;letter-spacing:0.08em;transition:all 0.2s"
>Aplicar</button>`;
```

---

## Variables de Entorno

No hay env vars específicas para GRAPHIFY. Usa:

- `window.entries` - array global de entradas
- `window.customEntries` - entradas personalizadas
- `currentTab` - pestaña actual
- `allEntries` - todas las entradas (en contexto de render)

---

## Testing Local

```javascript
// En console, simular click en GRAPHIFY tab
setTab('graphify');

// Forzar render
document.getElementById('view-graphify')._graphifyLoaded = false;
GraphifyUI.load();

// Ver si hay errors
GraphifyUI.init3DGraph([
  { project: 'Test', cat: 'Development', cost_usd: 0.01, input_tokens: 100, output_tokens: 200, dateKey: '2026-06-09' }
]);
```

---

## Performance Tips

1. **Reducir geometría:** `Icosahedron(size, 2)` en lugar de 4 (menos triángulos)
2. **Desabilitar sombras:** `renderer.shadowMap.enabled = false`
3. **Usar InstancedMesh:** Si >150 nodos del mismo tipo
4. **Throttle mousemove:** Raycasting en cada move es costoso
5. **LOD (Level of Detail):** Menos detalles para nodos lejanos

---

## Common Issues & Fixes

| Problema | Causa | Solución |
|----------|-------|----------|
| Gráfico lag/stutters | Sombras muy high-res | Reducir `shadowMap.mapSize.width` a 1024 |
| Nodos no visibles | Cámara muy cerca | Aumentar `camera.position.z` en 50+ |
| Colores washed out | Lighting débil | Aumentar ambLight intensity a 0.6 |
| Texto labels no aparece | Canvas texture issue | Comentar label creation (no critical) |
| Click no detecta nodo | Raycaster error | Console: `raycaster.intersectObjects(...)` |

---

**Última actualización:** 2026-06-09  
**For detailed docs:** Ver `GRAPHIFY-3D-DASHBOARD.md`
