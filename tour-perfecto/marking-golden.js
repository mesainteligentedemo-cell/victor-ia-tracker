/**
 * MARKING SYSTEM — Golden Border Synchronization
 * Sincronización voz↔visual perfecta
 * Polling cada 50ms para máxima precisión
 */

class TourGoldenMarking {
  constructor(configPath = './tour-perfecto/marking-config.json') {
    this.config = { markings: [], meta: {} }; // nunca null — evita TypeError pre-fetch
    this.currentMarking = null;
    this.audioElement = null;
    this.isPlaying = false;
    this.pollingInterval = null;
    this.markingStates = new Map();
    this.externalControl = false; // true cuando tour-player.js dirige los markings
    this._audioRetries = 0;
    this.loadConfig(configPath);
    this.init();
  }

  async loadConfig(path) {
    try {
      const response = await fetch(path);
      this.config = await response.json();
      console.log('[TourMarking] Config loaded:', this.config.meta);
    } catch (e) {
      console.error('[TourMarking] Config load failed:', e.message);
      this.config = { markings: [], meta: {} };
    }
  }

  init() {
    document.addEventListener('DOMContentLoaded', () => this.setupAudio());
    window.addEventListener('load', () => this.setupAudio());
    this.setupAudio(); // Intentar setup inmediatamente
  }

  setupAudio() {
    // Buscar elemento de audio del tour
    const selectors = [
      '#tour-audio',
      'audio[id*="tour"]',
      'audio[class*="tour"]',
      'audio',
    ];

    for (const sel of selectors) {
      const audio = document.querySelector(sel);
      if (audio && !this.audioElement) {
        this.audioElement = audio;
        this.attachAudioListeners();
        console.log('[TourMarking] Audio found:', sel);
        break;
      }
    }

    if (!this.audioElement) {
      // Máximo 20 reintentos (10s) — evita polling infinito si no hay <audio>
      if (this._audioRetries < 20) {
        this._audioRetries++;
        setTimeout(() => this.setupAudio(), 500);
      } else {
        console.warn('[TourMarking] No se encontró elemento de audio tras 20 intentos');
      }
    }
  }

  attachAudioListeners() {
    if (!this.audioElement) return;

    // NOTA: en modo externalControl (tour-player.js) los markings los dirige
    // el player paso a paso; el time-sync interno se desactiva por completo.
    this.audioElement.addEventListener('play', () => {
      if (this.externalControl) return;
      this.isPlaying = true;
      this.startPolling();
    });

    this.audioElement.addEventListener('pause', () => {
      if (this.externalControl) return;
      this.isPlaying = false;
      this.stopPolling();
      this.clearAllMarkings();
    });

    this.audioElement.addEventListener('ended', () => {
      if (this.externalControl) return;
      this.isPlaying = false;
      this.stopPolling();
      this.clearAllMarkings();
    });

    this.audioElement.addEventListener('timeupdate', () => {
      if (this.externalControl) return;
      if (this.isPlaying) this.sync();
    });
  }

  startPolling() {
    if (this.pollingInterval) clearInterval(this.pollingInterval);
    // Polling cada 50ms para sincronización super precisa
    this.pollingInterval = setInterval(() => this.sync(), 50);
  }

  stopPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }

  sync() {
    if (this.externalControl) return;
    if (!this.audioElement || !this.config || !this.config.markings) return;

    const currentTime = this.audioElement.currentTime;
    const marking = this.findMarkingByTime(currentTime);

    if (marking && marking.id !== this.currentMarking?.id) {
      // Cambio de marking
      if (this.currentMarking) this.unmarkElement(this.currentMarking);
      this.markElement(marking);
      this.currentMarking = marking;
    } else if (!marking && this.currentMarking) {
      // Ya no hay marking
      this.unmarkElement(this.currentMarking);
      this.currentMarking = null;
    } else if (marking && marking.id === this.currentMarking?.id) {
      // Mismo marking, solo actualizar estado
      this.updateMarkingState(marking, currentTime);
    }
  }

  findMarkingByTime(currentTime) {
    if (!this.config.markings) return null;

    for (const marking of this.config.markings) {
      const { startTime, endTime } = marking;
      if (currentTime >= startTime && currentTime <= endTime) {
        return marking;
      }
    }
    return null;
  }

  markElement(marking) {
    const el = document.querySelector(marking.selector);
    if (!el) {
      console.warn(`[TourMarking] Selector no encontrado: ${marking.selector}`);
      return;
    }

    // Aviso útil en debug: elemento presente pero no visible
    if (el.offsetParent === null && el.tagName !== 'BODY') {
      console.warn(`[TourMarking] Elemento oculto (se marca igual): ${marking.selector}`);
    }

    // Limpiar clases anteriores
    el.classList.remove('exiting');

    // Aplicar marking
    el.classList.add('tour-marked');
    el.classList.add('entering');
    el.setAttribute('data-marking-id', marking.id);

    // Scroll suave si es necesario
    if (marking.scroll !== false) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    // Guardar estado (incluye timer para poder cancelarlo en unmark)
    const state = { el, marking, state: 'entering', enterTimer: null };
    this.markingStates.set(marking.id, state);

    // Cambiar a active después de la entrada
    state.enterTimer = setTimeout(() => {
      state.enterTimer = null;
      // Solo si el marking sigue vigente (evita re-agregar 'active' tras unmark)
      if (this.markingStates.get(marking.id) !== state) return;
      el.classList.remove('entering');
      el.classList.add('active');
      state.state = 'active';
    }, 200);
  }

  unmarkElement(marking) {
    // Usar el elemento guardado (el selector podría resolver a otro nodo si
    // la UI se re-renderizó); fallback a querySelector.
    const stored = this.markingStates.get(marking.id);
    const el = (stored && stored.el) || document.querySelector(marking.selector);
    if (stored && stored.enterTimer) {
      clearTimeout(stored.enterTimer); // evita que 'active' reaparezca post-unmark
      stored.enterTimer = null;
    }
    this.markingStates.delete(marking.id);
    if (!el) return;

    el.classList.remove('active', 'entering');
    el.classList.add('exiting');

    // Remover después de la animación
    setTimeout(() => {
      el.classList.remove('tour-marked', 'exiting', 'active', 'entering');
      el.removeAttribute('data-marking-id');
      el.removeAttribute('data-progress');
    }, 300);
  }

  updateMarkingState(marking, currentTime) {
    const state = this.markingStates.get(marking.id);
    if (!state) return;

    const { el, startTime, endTime } = marking;
    const progress = (currentTime - startTime) / (endTime - startTime);

    // Actualizar atributo de progreso (útil para debug)
    el.setAttribute('data-progress', Math.round(progress * 100));
  }

  clearAllMarkings() {
    for (const [id, state] of this.markingStates) {
      const { el } = state;
      if (state.enterTimer) { clearTimeout(state.enterTimer); state.enterTimer = null; }
      el.classList.remove('tour-marked', 'entering', 'active', 'exiting');
      el.removeAttribute('data-marking-id');
      el.removeAttribute('data-progress');
    }
    this.markingStates.clear();
    this.currentMarking = null;
  }

  // API Pública — usada por tour-player.js (un marking activo a la vez)
  markStep(stepId) {
    const marking = this.config.markings?.find(m => m.step === stepId);
    if (marking) {
      if (this.currentMarking && this.currentMarking.id !== marking.id) {
        this.unmarkElement(this.currentMarking); // nunca dos marcados a la vez
      }
      this.markElement(marking);
      this.currentMarking = marking;
    } else {
      console.warn(`[TourMarking] markStep: paso ${stepId} no existe en config`);
    }
  }

  jumpToStep(stepId) {
    const marking = this.config.markings?.find(m => m.step === stepId);
    if (marking) {
      const el = document.querySelector(marking.selector);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        this.markElement(marking);
      }
    }
  }

  getStats() {
    if (!this.audioElement) {
      return { error: 'Audio not found' };
    }
    return {
      currentTime: this.audioElement.currentTime.toFixed(2),
      duration: this.audioElement.duration.toFixed(2),
      isPlaying: this.isPlaying,
      currentMarking: this.currentMarking?.id || null,
      totalMarkings: this.config.markings?.length || 0,
    };
  }

  // Debug
  enableDebug() {
    document.body.classList.add('tour-debug');
    console.log('[TourMarking] Debug mode enabled');
  }

  disableDebug() {
    document.body.classList.remove('tour-debug');
    console.log('[TourMarking] Debug mode disabled');
  }

  // Auto-start si hay autoplay
  autoStart() {
    if (this.audioElement?.autoplay) {
      this.audioElement.play().catch(e => console.warn('[TourMarking] Autoplay blocked:', e.message));
    }
  }
}

// Inicializar globalmente
window.tourGoldenMarking = null;

document.addEventListener('DOMContentLoaded', () => {
  window.tourGoldenMarking = new TourGoldenMarking('./tour-perfecto/marking-config.json');
  console.log('[TourMarking] Initialized. Use window.tourGoldenMarking for control.');

  // Alias público
  window.tourMarking = window.tourGoldenMarking;
});

// Export para módulos
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TourGoldenMarking;
}