# Tour Guiado COMPLETO + Marcado GOLDEN — Victor IA Tracker v5.11

Sistema de tour guiado con **voz sincronizada** y **cuadro dorado (border 3px #D4AF37)**
que resalta cada botón *exactamente* cuando la narración lo menciona.

- **53 botones** cubiertos · **100% de los selectores validados contra `index.html`** · **0 fantasmas**.
- Marcado con **anticipación de 100 ms**, **fade-in 200 ms / fade-out 300 ms**, **polling 50 ms**.
- Skip seguro: si un selector no existe o está oculto, se omite **sin lanzar error**.

---

## 1. Archivos entregados

| Archivo | Qué es |
|---|---|
| `tour-narrations-COMPLETO.json` | Los 53 botones: narración, selector validado, `startTime`/`endTime`/`markStart`, línea en `index.html`. |
| `marking-system-GOLDEN.js` | El motor de marcado dorado (CSS auto-inyectado, cero dependencias). |
| `tour-guiado-NARRACION-COMPLETA.txt` | Todo el texto que dice la voz, por sección, con tiempos y validación. |
| `SELECTORES-VALIDADOS.json` | Mapa botón → selector → anchor → archivo/línea (`exists: true/false`). |
| `test-GOLDEN.html` | Demo visual autónoma: reproduce el recorrido con los selectores reales (×6). |
| `build-COMPLETO.cjs` | Regenera el JSON + valida todos los selectores contra `index.html`. |
| `gen-audio-COMPLETO.cjs` | Genera un MP3 por botón (voz Victor) y **re-sincroniza los timestamps con la duración real**. |

---

## 2. Verlo funcionar en 10 segundos (sin tocar el tracker)

Abre `tour-perfecto/test-GOLDEN.html` en el navegador y pulsa **▶ Demo rápido**.
El cuadro dorado salta de botón en botón usando los mismos selectores que `index.html`.
El botón **Validar selectores** imprime en consola una tabla `exists/visible` de los 53.

---

## 3. Integración en `index.html` (producción)

Antes de `</body>`:

```html
<script src="./tour-perfecto/marking-system-GOLDEN.js"></script>
```

### Modo A — RECOMENDADO: secuencia de MP3 (sincronía sin deriva)

Cada botón se marca *mientras suena su propio audio* → coordinación al milisegundo.

```js
// 1) Genera los audios y re-sincroniza timestamps:  node tour-perfecto/gen-audio-COMPLETO.cjs
// 2) Lanza el tour:
GoldenMarking.init('./tour-perfecto/tour-narrations-COMPLETO.json', { autoContext: true })
  .then(g => g.playSequence({ basePath: './tour-perfecto/audio-completo/' }));
```

`autoContext: true` abre solo el panel/modal que hace falta (Filtros, Planeación,
Accesibilidad) justo antes de marcar sus botones y lo cierra al salir de esa sección.

### Modo B — Reloj interno (sin audio, para probar el timing)

```js
GoldenMarking.init('./tour-perfecto/tour-narrations-COMPLETO.json')
  .then(g => g.startSelfTimed());
```

### Modo C — Enganchar al ViaTour existente (tú controlas el reloj)

Si ya reproduces audio por tu cuenta, en cada `timeupdate` pásale el tiempo global:

```js
audio.addEventListener('timeupdate', () => g.syncTo(tiempoGlobalEnSegundos));
// o marca por paso directamente al cambiar de step:
g.markStep(n);
```

---

## 4. Sincronización — cómo se garantiza

Por cada botón el JSON define:

- `startTime` → cuándo **empieza** a hablarse (segundos, timeline global).
- `endTime` → cuándo **termina** de hablarse.
- `markStart` = `startTime − 0.1` → el marco aparece **100 ms antes**.

El motor hace *polling cada 50 ms* y activa el paso cuyo intervalo
`[markStart, endTime)` contiene el tiempo actual. La marca dura **toda** la
explicación y se desvanece (fade-out 300 ms) al pasar al siguiente botón.

En **Modo A** el reloj es el `currentTime` real de cada MP3 → cero deriva
acumulada aunque la narración dure distinto de lo estimado.

---

## 5. Estilo del marcado (exacto a lo pedido)

```
outline: 3px solid #D4AF37;   box-shadow: 0 0 12px rgba(212,175,55,.60);
fade-in 200ms · fade-out 300ms · pulse suave · z-index 2147483000
```

Respeta el toggle **“Sin animaciones”** del tracker (`body.no-animations`) y
`prefers-reduced-motion`.

---

## 6. Validación (cero errores)

```bash
node tour-perfecto/build-COMPLETO.cjs
#  -> Selectores válidos: 53/53   ·   Selectores FANTASMA: 0
```

El build falla-ruidoso si algún `anchor` no aparece en `index.html`, de modo que
**ningún selector fantasma** puede colarse. En vivo, `g.validateLive()` vuelve a
comprobar cada selector contra el DOM real y devuelve una tabla `exists/visible`.

> Nota: los MP3 `audio/voz-step-01…34.mp3` son del tour v1 (34 pasos). El tour
> COMPLETO (53 botones) usa audios nuevos en `audio-completo/` que produce
> `gen-audio-COMPLETO.cjs`. Requiere `ffprobe` (FFmpeg) para medir duraciones;
> si no está, usa la duración estimada por palabras.
