/**
 * ═══════════════════════════════════════════════════════════════
 * TOUR PLAYER v2.0 — Secuencial MP3 Playlist (63 pasos)
 * ═══════════════════════════════════════════════════════════════
 *
 * Reproduce voz-step-01.mp3 → voz-step-63.mp3 en orden usando el
 * elemento #tour-audio (una sola instancia = política de autoplay OK).
 *
 * SINCRONIZACIÓN: en vez de depender de timestamps acumulados,
 * marca cada paso DIRECTAMENTE vía window.tourMarking.markStep(n)
 * al iniciar su MP3 — sincronización exacta, cero drift.
 *
 * ACCIONES DE UI: los pasos con uiState en marking-config.json
 * abren/cierran paneles (Planeación, Accesibilidad, Estudio IA,
 * tabs) para que el elemento marcado siempre sea VISIBLE.
 *
 * API pública (window.tourPlayer):
 *   .play()      — inicia el tour (o reanuda si estaba pausado)
 *   .toggle()    — inicia si está detenido; detiene si corre/pausa (botón TOUR)
 *   .pause()     — pausa el audio actual (reanudable)
 *   .resume()    — reanuda tras pause()
 *   .stop()      — detiene todo, limpia markings y restaura la UI
 *   .next()      — salta al siguiente paso
 *   .previous()  — regresa al paso anterior
 *   .goToStep(n) — salta a un paso específico (1-63)
 *   .getState()  — { step, total, isPlaying, isPaused }
 *
 * Convivencia con ViaTour: al iniciar, detiene ViaTour si corre;
 * si el usuario inicia ViaTour, este player se detiene solo.
 */

(function () {
  'use strict';

  class TourPlayer {
    constructor(configPath, audioDir) {
      this.configPath = configPath || './tour-perfecto/marking-config.json';
      this.audioDir = audioDir || './tour-perfecto/audio';
      this.config = null;
      this.totalSteps = 0;
      this.currentStep = 0;
      this.isPlaying = false;
      this.isPaused = false;
      this.audio = null;          // elemento #tour-audio (reutilizado)
      this.generation = 0;        // token de cancelación de cadenas async
      this.errorStreak = 0;       // errores consecutivos (abort > 5)
      this.currentUiState = 'default';
      this.ui = null;             // overlay de controles
      this._configReady = this._loadConfig();
      this._bindGlobalGuards();
    }

    /* ── Config ─────────────────────────────────────────────── */

    async _loadConfig() {
      try {
        const res = await fetch(this.configPath, { cache: 'no-cache' });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        this.config = await res.json();
        this.totalSteps = (this.config.markings && this.config.markings.length) ||
                          (this.config.meta && this.config.meta.totalSteps) || 0;
        console.log('[TourPlayer] Config loaded:', this.totalSteps, 'steps');
      } catch (e) {
        console.error('[TourPlayer] Config load failed:', e.message);
        this.config = { markings: [], meta: {} };
        this.totalSteps = 0;
      }
      return this.config;
    }

    _getMarking(step) {
      return this.config && this.config.markings
        ? this.config.markings.find(function (m) { return m.step === step; })
        : null;
    }

    /* ── Audio element (reutiliza #tour-audio) ──────────────── */

    _ensureAudio() {
      if (this.audio) return this.audio;
      let el = document.getElementById('tour-audio');
      if (!el) {
        el = document.createElement('audio');
        el.id = 'tour-audio';
        el.preload = 'auto';
        el.style.display = 'none';
        document.body.appendChild(el);
      }
      // Quitar <source> hijos: usamos .src directo por paso
      while (el.firstElementChild) el.removeChild(el.firstElementChild);
      el.preload = 'auto';
      this.audio = el;
      return el;
    }

    _mp3For(step) {
      const pad = String(step).padStart(2, '0');
      return this.audioDir + '/voz-step-' + pad + '.mp3';
    }

    /* ── Convivencia con ViaTour ────────────────────────────── */

    _stopViaTourIfRunning() {
      try {
        if (window.ViaTour && (window.ViaTour.playing || window.ViaTour.paused)) {
          window.ViaTour.stop();
          console.log('[TourPlayer] ViaTour detenido para evitar doble narración');
        }
      } catch (e) { /* noop */ }
    }

    _bindGlobalGuards() {
      const self = this;
      // Si el usuario arranca ViaTour (cualquier trigger residual), detener este player.
      // NOTA: #tour-start-btn ya NO cuenta — ahora ese botón controla ESTE player (toggle).
      document.addEventListener('click', function (e) {
        const t = e.target && e.target.closest &&
          e.target.closest('[onclick*="ViaTour.start"],[onclick*="ViaTour.toggle"]');
        if (t && (self.isPlaying || self.isPaused)) {
          console.log('[TourPlayer] ViaTour iniciado por el usuario — deteniendo TourPlayer');
          self.stop();
        }
      }, true);
      // Limpiar al salir de la página
      window.addEventListener('pagehide', function () { self.stop(); });
    }

    /* ── Acciones de UI por paso (uiState en config) ────────── */

    _applyUiState(target) {
      if (target === this.currentUiState) return;
      // 1) cerrar estado anterior
      try {
        switch (this.currentUiState) {
          case 'planModal':
            if (typeof window.closeFileModal === 'function') window.closeFileModal();
            break;
          case 'accPanel':
            if (typeof window.closeAccPanel === 'function') window.closeAccPanel();
            break;
          case 'estudio': {
            const btn = document.getElementById('estudio-min') || document.getElementById('estudio-close');
            if (btn) btn.click();
            break;
          }
        }
      } catch (e) { console.warn('[TourPlayer] Error cerrando estado UI:', e.message); }

      // 2) abrir estado nuevo
      try {
        if (target === 'planModal') {
          if (typeof window.openFileModal === 'function') window.openFileModal();
        } else if (target === 'accPanel') {
          const panel = document.getElementById('acc-panel');
          if (panel && !panel.classList.contains('open') &&
              typeof window.toggleAccPanel === 'function') {
            window.toggleAccPanel();
          }
        } else if (target === 'estudio') {
          const fab = document.getElementById('estudio-fab');
          if (fab) fab.click();
        } else if (target && target.indexOf('tab:') === 0) {
          const tab = target.slice(4);
          if (typeof window.setTab === 'function') window.setTab(tab);
          target = 'default'; // los tabs no requieren cierre posterior
        }
      } catch (e) { console.warn('[TourPlayer] Error abriendo estado UI:', e.message); }

      this.currentUiState = target || 'default';
    }

    /* ── Reproducción ───────────────────────────────────────── */

    async play() {
      if (this.isPlaying) return;
      if (this.isPaused) { this.resume(); return; }

      await this._configReady;
      if (!this.totalSteps) {
        console.error('[TourPlayer] Sin config — no se puede iniciar el tour');
        return;
      }

      this._stopViaTourIfRunning();
      this._ensureAudio();

      // marking-golden: modo control externo (desactiva su time-sync interno)
      if (window.tourMarking) window.tourMarking.externalControl = true;

      this.generation++;
      this.isPlaying = true;
      this.isPaused = false;
      this.currentStep = 1;
      this.errorStreak = 0;
      this._showUI();
      console.log('[TourPlayer] Iniciando tour (' + this.totalSteps + ' pasos)…');
      this._playStep(this.currentStep, this.generation);
    }

    _playStep(step, gen) {
      if (gen !== this.generation) return;             // cancelado
      if (step > this.totalSteps) { this._finish(); return; }

      this.currentStep = step;
      const marking = this._getMarking(step);
      const audio = this._ensureAudio();

      // 1) Preparar UI del paso (abrir panel/tab si hace falta)
      this._applyUiState((marking && marking.uiState) || 'default');

      // 2) Pequeño delay (150ms) para que el panel/modal termine su slide-in
      // Esto asegura que scrollIntoView mida el layout correctamente
      const self = this;
      setTimeout(function () {
        if (gen !== self.generation || !self.isPlaying) return;

        // 2b) Marcar el elemento (directo — cero dependencia de timestamps)
        if (window.tourMarking && marking) {
          try { window.tourMarking.markStep(step); }
          catch (e) { console.warn('[TourPlayer] markStep falló:', e.message); }
        }

        // 3) Actualizar overlay
        self._updateUI(marking);

        // 4) Reproducir el MP3 del paso
        const src = self._mp3For(step);
        console.log('[TourPlayer] Paso ' + step + '/' + self.totalSteps + ': ' + src);

        const onEnded = function () {
          cleanup();
          if (gen !== self.generation) return;
          self.errorStreak = 0;
          // transición suave de 500ms entre pasos
          setTimeout(function () {
            if (gen !== self.generation || !self.isPlaying) return;
            self._playStep(step + 1, gen);
          }, 500);
        };
        const onError = function () {
          cleanup();
          if (gen !== self.generation) return;
          self.errorStreak++;
          console.warn('[TourPlayer] MP3 no disponible (paso ' + step + '): ' + src);
          if (self.errorStreak > 5) {
            console.error('[TourPlayer] 6 errores consecutivos — abortando tour');
            self.stop();
            return;
          }
          // saltar el paso tras una pausa corta (el marking queda visible 3s)
          setTimeout(function () {
            if (gen !== self.generation || !self.isPlaying) return;
            self._playStep(step + 1, gen);
          }, 3000);
        };
        function cleanup() {
          audio.removeEventListener('ended', onEnded);
          audio.removeEventListener('error', onError);
        }

        audio.addEventListener('ended', onEnded);
        audio.addEventListener('error', onError);
        audio.src = src;
        audio.currentTime = 0;
        audio.play().catch(function (e) {
          console.warn('[TourPlayer] play() bloqueado:', e.message,
            '— haz clic en ▶ del control del tour para continuar');
        });
        self._syncPlayBtn();
      }, 150); // cierre del setTimeout(delay para UI slide-in)
    }

    pause() {
      if (!this.isPlaying) return;
      if (this.audio) this.audio.pause();
      this.isPlaying = false;
      this.isPaused = true;
      this._syncPlayBtn();
      console.log('[TourPlayer] Pausado en paso ' + this.currentStep);
    }

    resume() {
      if (!this.isPaused) return;
      this.isPlaying = true;
      this.isPaused = false;
      if (this.audio && this.audio.src && !this.audio.ended) {
        this.audio.play().catch(function (e) {
          console.warn('[TourPlayer] resume bloqueado:', e.message);
        });
      } else {
        this._playStep(this.currentStep, this.generation);
      }
      this._syncPlayBtn();
      console.log('[TourPlayer] Reanudado');
    }

    stop() {
      this.generation++;                     // cancela cualquier cadena pendiente
      if (this.audio) {
        this.audio.pause();
        this.audio.removeAttribute('src');
        try { this.audio.load(); } catch (e) { /* noop */ }
      }
      this.isPlaying = false;
      this.isPaused = false;
      this.currentStep = 0;
      this._applyUiState('default');         // cerrar paneles abiertos por el tour
      if (window.tourMarking) {
        try { window.tourMarking.clearAllMarkings(); } catch (e) { /* noop */ }
        window.tourMarking.externalControl = false;
      }
      this._hideUI();
      console.log('[TourPlayer] Detenido');
    }

    /** Toggle para el botón TOUR: si corre (o está pausado) → detener; si no → iniciar. */
    toggle() {
      if (this.isPlaying || this.isPaused) this.stop();
      else this.play();
    }

    next() { this.goToStep(this.currentStep + 1); }
    previous() { this.goToStep(this.currentStep - 1); }

    goToStep(step) {
      if (!this.isPlaying && !this.isPaused) return;
      if (step < 1) step = 1;
      if (step > this.totalSteps) { this._finish(); return; }
      this.generation++;                     // cancela el paso en curso
      if (this.audio) this.audio.pause();
      this.isPlaying = true;
      this.isPaused = false;
      this._playStep(step, this.generation);
    }

    _finish() {
      console.log('[TourPlayer] ✅ Tour completado (' + this.totalSteps + ' pasos)');
      this.stop();
    }

    getState() {
      return {
        step: this.currentStep,
        total: this.totalSteps,
        isPlaying: this.isPlaying,
        isPaused: this.isPaused,
      };
    }

    /* ── Overlay de controles (progreso + play/pause/skip) ──── */

    _showUI() {
      if (this.ui) { this.ui.root.style.display = 'flex'; return; }
      const self = this;

      const style = document.createElement('style');
      style.textContent = [
        '#tour-player-bar{position:fixed;bottom:18px;left:50%;transform:translateX(-50%);',
        'z-index:100000;display:flex;flex-direction:column;gap:6px;min-width:300px;max-width:min(560px,92vw);',
        'background:rgba(16,16,20,.94);border:1px solid #D4AF37;border-radius:14px;padding:10px 14px;',
        'box-shadow:0 8px 32px rgba(0,0,0,.5),0 0 14px rgba(212,175,55,.25);',
        'font-family:system-ui,-apple-system,Segoe UI,sans-serif;color:#f3f0e8;}',
        '#tour-player-bar .tp-row{display:flex;align-items:center;gap:10px;}',
        '#tour-player-bar .tp-label{flex:1;font-size:13px;font-weight:600;color:#E8D4A6;',
        'white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
        '#tour-player-bar .tp-count{font-size:11px;color:#b8a76a;font-variant-numeric:tabular-nums;}',
        '#tour-player-bar button{background:none;border:1px solid rgba(212,175,55,.45);color:#E8D4A6;',
        'border-radius:8px;width:30px;height:30px;font-size:13px;line-height:1;cursor:pointer;flex:none;}',
        '#tour-player-bar button:hover{background:rgba(212,175,55,.18);}',
        '#tour-player-bar .tp-progress{height:4px;border-radius:2px;background:rgba(255,255,255,.12);overflow:hidden;}',
        '#tour-player-bar .tp-progress>div{height:100%;width:0;background:linear-gradient(90deg,#B8860B,#D4AF37,#FFD700);',
        'border-radius:2px;transition:width .4s ease;}',
        '#tour-player-bar .tp-caption{font-size:11.5px;line-height:1.45;color:#cfc8b8;max-height:52px;overflow:hidden;}',
        '@media (max-width:600px){#tour-player-bar{bottom:8px;padding:8px 10px;}',
        '#tour-player-bar .tp-caption{display:none;}}',
        '@media (prefers-reduced-motion:reduce){#tour-player-bar .tp-progress>div{transition:none;}}',
      ].join('');
      document.head.appendChild(style);

      const root = document.createElement('div');
      root.id = 'tour-player-bar';
      root.setAttribute('role', 'region');
      root.setAttribute('aria-label', 'Controles del tour guiado');
      root.innerHTML =
        '<div class="tp-row">' +
          '<span class="tp-label" id="tp-label">Tour Victor IA</span>' +
          '<span class="tp-count" id="tp-count"></span>' +
          '<button id="tp-prev" title="Paso anterior" aria-label="Paso anterior">⏮</button>' +
          '<button id="tp-play" title="Pausar / Reanudar" aria-label="Pausar o reanudar">⏸</button>' +
          '<button id="tp-next" title="Siguiente paso" aria-label="Siguiente paso">⏭</button>' +
          '<button id="tp-stop" title="Terminar tour" aria-label="Terminar tour">✕</button>' +
        '</div>' +
        '<div class="tp-progress" aria-hidden="true"><div id="tp-fill"></div></div>' +
        '<div class="tp-caption" id="tp-caption" aria-live="polite"></div>';
      document.body.appendChild(root);

      root.querySelector('#tp-prev').addEventListener('click', function () { self.previous(); });
      root.querySelector('#tp-next').addEventListener('click', function () { self.next(); });
      root.querySelector('#tp-stop').addEventListener('click', function () { self.stop(); });
      root.querySelector('#tp-play').addEventListener('click', function () {
        if (self.isPlaying) self.pause();
        else if (self.isPaused) self.resume();
        else self.play();
      });

      this.ui = {
        root: root,
        label: root.querySelector('#tp-label'),
        count: root.querySelector('#tp-count'),
        fill: root.querySelector('#tp-fill'),
        caption: root.querySelector('#tp-caption'),
        playBtn: root.querySelector('#tp-play'),
      };
    }

    _updateUI(marking) {
      if (!this.ui) return;
      this.ui.label.textContent = (marking && marking.label) || ('Paso ' + this.currentStep);
      this.ui.count.textContent = this.currentStep + ' / ' + this.totalSteps;
      this.ui.fill.style.width = Math.round((this.currentStep / this.totalSteps) * 100) + '%';
      this.ui.caption.textContent = (marking && marking.narration) || '';
    }

    _syncPlayBtn() {
      if (!this.ui) return;
      this.ui.playBtn.textContent = this.isPlaying ? '⏸' : '▶';
    }

    _hideUI() {
      if (this.ui) this.ui.root.style.display = 'none';
    }
  }

  /* ── Bootstrap ────────────────────────────────────────────── */

  function boot() {
    if (window.tourPlayer instanceof TourPlayer) return;
    window.tourPlayer = new TourPlayer('./tour-perfecto/marking-config.json', './tour-perfecto/audio');
    console.log('[TourPlayer] v2.0 listo. Inicia con window.tourPlayer.play() ' +
                'o desde Accesibilidad → "Tour Completo (63 pasos)"');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot(); // el script carga con defer: el DOM ya está listo
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = TourPlayer;
  }
})();