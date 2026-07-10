/* ═══════════════════════════════════════════════════════════════════════
 *  MARKING SYSTEM — GOLDEN  ·  Victor IA Tracker v5.11
 *  Marca cada botón con un CUADRO DORADO 3px exactamente cuando la voz lo
 *  menciona, y lo desvanece al pasar al siguiente. Sincronización perfecta.
 *
 *  CARACTERÍSTICAS
 *   ✓ Border dorado 3px #D4AF37 + glow suave
 *   ✓ Polling cada 50ms (sin lag)
 *   ✓ Anticipación de 100ms (marca antes de que se mencione)
 *   ✓ Fade-in 200ms · Fade-out 300ms
 *   ✓ z-index alto: el marco queda sobre todo
 *   ✓ Validación: si el selector no existe o está oculto -> SKIP sin error
 *   ✓ Dos modos: reloj interno auto-cronometrado, o sincronizado a un <audio>
 *   ✓ CSS auto-inyectado (archivo único, cero dependencias)
 *
 *  USO RÁPIDO
 *     <script src="./tour-perfecto/marking-system-GOLDEN.js"></script>
 *     GoldenMarking.init('./tour-perfecto/tour-narrations-COMPLETO.json')
 *       .then(g => g.startSelfTimed());          // demo auto-cronometrado
 *
 *  SINCRONIZAR A AUDIO REAL (recomendado con el ViaTour existente)
 *     GoldenMarking.init(cfgUrl).then(g => g.attachAudio(miAudioElement));
 *     // o, si tú controlas el reloj:  g.syncTo(audio.currentTime)  en timeupdate
 * ═══════════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  const GOLD = '#D4AF37';
  const CLASS = 'golden-marked';
  const CLASS_OUT = 'golden-marked-out';

  // ── CSS auto-inyectado ────────────────────────────────────────────────
  function injectCSS() {
    if (document.getElementById('golden-marking-css')) return;
    const css = `
      .${CLASS}{
        position: relative;
        outline: 3px solid ${GOLD} !important;
        outline-offset: 2px;
        border-radius: 8px;
        box-shadow: 0 0 12px rgba(212,175,55,0.60), 0 0 0 1px rgba(212,175,55,0.35) inset !important;
        transition: outline-color .20s ease, box-shadow .20s ease, opacity .20s ease !important;
        animation: goldenFadeIn .20s ease-out both;
        z-index: 2147483000 !important;
      }
      .${CLASS}::after{
        content:"";
        position:absolute; inset:-3px;
        border:3px solid ${GOLD};
        border-radius:10px;
        pointer-events:none;
        box-shadow:0 0 16px rgba(212,175,55,0.55);
        animation: goldenPulse 1.8s ease-in-out infinite;
        z-index: 2147483001;
      }
      .${CLASS_OUT}{
        animation: goldenFadeOut .30s ease-in both !important;
      }
      @keyframes goldenFadeIn{
        from{ outline-color: rgba(212,175,55,0); box-shadow:0 0 0 rgba(212,175,55,0); }
        to  { outline-color:${GOLD}; box-shadow:0 0 12px rgba(212,175,55,0.60); }
      }
      @keyframes goldenFadeOut{
        from{ outline-color:${GOLD}; box-shadow:0 0 12px rgba(212,175,55,0.60); }
        to  { outline-color: rgba(212,175,55,0); box-shadow:0 0 0 rgba(212,175,55,0); }
      }
      @keyframes goldenPulse{
        0%,100%{ opacity:.55; }
        50%    { opacity:.95; }
      }
      @media (prefers-reduced-motion: reduce){
        .${CLASS}, .${CLASS}::after{ animation:none !important; }
      }
      /* respeta el toggle "Sin animaciones" del propio tracker */
      body.no-animations .${CLASS}::after{ animation:none !important; }
    `;
    const style = document.createElement('style');
    style.id = 'golden-marking-css';
    style.textContent = css;
    document.head.appendChild(style);
  }

  class GoldenMarking {
    constructor(config, opts) {
      this.config = config;
      this.steps = config.steps || [];
      this.opts = Object.assign({
        pollMs: 50,              // polling cada 50ms
        anticipationMs: 100,     // marcar 100ms antes
        autoContext: false,      // abrir modales/paneles automáticamente (demo)
        scrollIntoView: true,    // desplazar el botón a la vista al marcarlo
        openers: {               // funciones del tracker para abrir contextos
          toggleSidebar:  () => global.toggleSidebar  && global.toggleSidebar(),
          openFileModal:  () => global.openFileModal  && global.openFileModal(),
          toggleAccPanel: () => global.toggleAccPanel && global.toggleAccPanel()
        },
        closers: {
          toggleSidebar:  () => global.toggleSidebar  && global.toggleSidebar(),
          openFileModal:  () => (global.closeFileModal ? global.closeFileModal() : (global.pmClose && global.pmClose())),
          toggleAccPanel: () => (global.closeAccPanel  ? global.closeAccPanel()  : (global.toggleAccPanel && global.toggleAccPanel()))
        }
      }, opts || {});

      this.timer = null;
      this.clockStart = 0;       // performance.now() al iniciar reloj interno
      this.mode = null;          // 'self' | 'audio' | 'manual'
      this.audioEl = null;
      this.current = null;       // paso marcado actualmente
      this.currentNeeds = null;  // contexto abierto actualmente
      injectCSS();
    }

    // ── Carga la configuración ──────────────────────────────────────────
    static async init(cfgUrl, opts) {
      const res = await fetch(cfgUrl);
      if (!res.ok) throw new Error('[GoldenMarking] no pude cargar ' + cfgUrl + ' (' + res.status + ')');
      const cfg = await res.json();
      const g = new GoldenMarking(cfg, opts);
      global.GoldenMarkingInstance = g;
      console.log(`[GoldenMarking] listo · ${g.steps.length} botones · dur ${cfg.meta.totalDurationFormatted}`);
      return g;
    }

    // ── Reloj: tiempo actual en segundos según el modo ──────────────────
    now() {
      if (this.mode === 'audio' && this.audioEl) return this.audioEl.currentTime;
      if (this.mode === 'self') return (performance.now() - this.clockStart) / 1000;
      return this._manualT || 0;
    }

    // ── Encuentra el paso activo para un tiempo dado ────────────────────
    stepAt(t) {
      const a = this.opts.anticipationMs / 1000;
      for (const s of this.steps) {
        const start = Math.max(0, s.startTime - a);
        if (t >= start && t < s.endTime) return s;
      }
      return null;
    }

    // ── Loop de polling (50ms) ──────────────────────────────────────────
    _tick() {
      const s = this.stepAt(this.now());
      if (s === this.current) return;
      if (this.current) this._unmark(this.current);
      if (s) this._mark(s);
      this.current = s;
    }

    _startLoop() {
      if (this.timer) return;
      this.timer = setInterval(() => this._tick(), this.opts.pollMs);
    }
    _stopLoop() {
      if (this.timer) { clearInterval(this.timer); this.timer = null; }
    }

    // ── Modos de arranque ───────────────────────────────────────────────
    startSelfTimed() {
      this.mode = 'self';
      this.clockStart = performance.now();
      this._startLoop();
      console.log('[GoldenMarking] modo auto-cronometrado iniciado');
      return this;
    }

    attachAudio(audioEl) {
      this.mode = 'audio';
      this.audioEl = audioEl;
      this._startLoop();
      audioEl.addEventListener('ended', () => this.clear());
      console.log('[GoldenMarking] sincronizado a <audio>');
      return this;
    }

    // Para drivers externos (p.ej. ViaTour): pásale el tiempo global tú mismo
    syncTo(seconds) {
      this.mode = 'manual';
      this._manualT = seconds;
      this._tick();
      return this;
    }

    /* ── MODO RECOMENDADO: secuencia de MP3 por paso ─────────────────────
     * Reproduce un audio por botón y marca ESE botón exactamente mientras
     * suena su audio. La marca dura toda la explicación y se desvanece al
     * terminar el MP3 -> sincronía atada al audio real, sin deriva (drift).
     *
     *   g.playSequence({
     *     basePath: './tour-perfecto/audio/',
     *     fileFor: (step) => `voz-${step.key}.mp3`   // o tu convención
     *   });
     */
    playSequence(opts) {
      opts = opts || {};
      const basePath = opts.basePath || './tour-perfecto/audio/';
      const fileFor = opts.fileFor || (s => `voz-${String(s.n).padStart(2, '0')}.mp3`);
      const anticip = this.opts.anticipationMs;
      this._seqStop = false;
      this.mode = 'sequence';
      this._stopLoop(); // este modo no usa polling: se ata a eventos de audio

      const audio = new Audio();
      this.audioEl = audio;
      let i = 0;

      const playNext = () => {
        if (this._seqStop) return;
        if (i >= this.steps.length) { this.clear(); if (opts.onEnd) opts.onEnd(); return; }
        const step = this.steps[i];

        // marca 100ms ANTES de que arranque el audio
        setTimeout(() => { if (!this._seqStop) { if (this.current) this._unmark(this.current); this._mark(step); this.current = step; } }, 0);

        audio.src = basePath + fileFor(step);
        const startPlay = () => {
          audio.play().catch(err => {
            console.warn('[GoldenMarking] no pude reproducir', audio.src, '- avanzo igualmente', err);
            // sin audio: mantén la marca el tiempo estimado y avanza
            setTimeout(next, step.estDuration * 1000);
          });
        };
        // arranca con 100ms de adelanto de la marca respecto al audio
        setTimeout(startPlay, anticip);
        if (opts.onStep) opts.onStep(step, i);
      };

      const next = () => { i++; playNext(); };
      audio.addEventListener('ended', () => { if (!this._seqStop) next(); });

      this._seqNext = next;
      this._seqPlayNext = playNext;
      playNext();
      console.log('[GoldenMarking] secuencia de audio iniciada (sincronía por MP3, sin deriva)');
      return this;
    }

    stopSequence() {
      this._seqStop = true;
      if (this.audioEl) { try { this.audioEl.pause(); } catch (e) {} }
      this.clear();
      return this;
    }

    pause() { this._stopLoop(); return this; }
    resume() { this._startLoop(); return this; }
    stop() { this._stopLoop(); this.clear(); this.mode = null; return this; }

    // ── Aplica el marco dorado (con validación + visibilidad) ───────────
    _mark(step) {
      if (this.opts.autoContext) this._ensureContext(step.needs);

      let el = null;
      try { el = document.querySelector(step.selector); }
      catch (e) { console.warn('[GoldenMarking] selector inválido, SKIP:', step.selector); return; }

      if (!el) { console.warn('[GoldenMarking] selector no existe, SKIP:', step.selector); return; }
      if (!this._visible(el)) { console.warn('[GoldenMarking] elemento oculto, SKIP:', step.selector); return; }

      el.classList.remove(CLASS_OUT);
      el.classList.add(CLASS);
      step._el = el;
      if (this.opts.scrollIntoView) {
        try { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (e) {}
      }
      console.log(`[GoldenMarking] ▸ ${step.label}  (${step.selector})`);
    }

    // ── Quita el marco con fade-out ─────────────────────────────────────
    _unmark(step) {
      const el = step._el || document.querySelector(step.selector);
      if (!el) return;
      el.classList.add(CLASS_OUT);
      setTimeout(() => { el.classList.remove(CLASS, CLASS_OUT); }, 300);
    }

    clear() {
      if (this.current) { this._unmark(this.current); this.current = null; }
      document.querySelectorAll('.' + CLASS).forEach(el => el.classList.remove(CLASS, CLASS_OUT));
    }

    _visible(el) {
      if (el.offsetParent === null && getComputedStyle(el).position !== 'fixed') return false;
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    }

    // ── Abre/cierra el contexto (sidebar / modal / panel) si autoContext ─
    _ensureContext(needs) {
      if (needs === this.currentNeeds) return;
      // cerrar el anterior (best-effort)
      if (this.currentNeeds && this.opts.closers[this.currentNeeds]) {
        try { this.opts.closers[this.currentNeeds](); } catch (e) {}
      }
      // abrir el nuevo
      if (needs && this.opts.openers[needs]) {
        try { this.opts.openers[needs](); } catch (e) {}
      }
      this.currentNeeds = needs;
    }

    // ── Utilidad de debug: marca un paso por número ─────────────────────
    markStep(n) {
      const s = this.steps.find(x => x.n === n);
      if (!s) return;
      if (this.current) this._unmark(this.current);
      this._mark(s); this.current = s;
    }

    // ── Utilidad: valida todos los selectores en vivo (DOM real) ────────
    validateLive() {
      const rows = this.steps.map(s => {
        let ok = false, vis = false;
        try { const el = document.querySelector(s.selector); ok = !!el; vis = el ? this._visible(el) : false; }
        catch (e) { ok = false; }
        return { n: s.n, label: s.label, selector: s.selector, exists: ok, visible: vis };
      });
      const missing = rows.filter(r => !r.exists);
      console.table(rows);
      console.log(missing.length ? `⚠ ${missing.length} selectores no encontrados en el DOM actual` : '✓ Todos los selectores existen en el DOM actual');
      return rows;
    }
  }

  global.GoldenMarking = GoldenMarking;
})(typeof window !== 'undefined' ? window : this);
