/**
 * MARKING SYSTEM — Golden Border Synchronization
 * Sincronización voz↔visual perfecta
 * Polling cada 50ms para máxima precisión
 */

class TourGoldenMarking {
  constructor(configPath = './tour-perfecto/marking-config.json') {
    this.config = null;
    this.currentMarking = null;
    this.audioElement = null;
    this.isPlaying = false;
    this.pollingInterval = null;
    this.markingStates = new Map();
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
      setTimeout(() => this.setupAudio(), 500);
    }
  }

  attachAudioListeners() {
    if (!this.audioElement) return;

    this.audioElement.addEventListener('play', () => {
      this.isPlaying = true;
      this.startPolling();
    });

    this.audioElement.addEventListener('pause', () => {
      this.isPlaying = false;
      this.stopPolling();
      this.clearAllMarkings();
    });

    this.audioElement.addEventListener('ended', () => {
      this.isPlaying = false;
      this.stopPolling();
      this.clearAllMarkings();
    });

    this.audioElement.addEventListener('timeupdate', () => {
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
    if (!this.audioElement || !this.config.markings) return;

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

    // Guardar estado
    this.markingStates.set(marking.id, { el, marking, state: 'entering' });

    // Cambiar a active después de la entrada
    setTimeout(() => {
      el.classList.remove('entering');
      el.classList.add('active');
      if (this.markingStates.has(marking.id)) {
        const state = this.markingStates.get(marking.id);
        state.state = 'active';
      }
    }, 200);
  }

  unmarkElement(marking) {
    const el = document.querySelector(marking.selector);
    if (!el) return;

    el.classList.remove('active', 'entering');
    el.classList.add('exiting');

    // Remover después de la animación
    setTimeout(() => {
      el.classList.remove('tour-marked', 'exiting');
      el.removeAttribute('data-marking-id');
    }, 300);

    this.markingStates.delete(marking.id);
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
      el.classList.remove('tour-marked', 'entering', 'active', 'exiting');
      el.removeAttribute('data-marking-id');
      el.removeAttribute('data-progress');
    }
    this.markingStates.clear();
    this.currentMarking = null;
  }

  // API Pública
  markStep(stepId) {
    const marking = this.config.markings?.find(m => m.step === stepId);
    if (marking) {
      this.markElement(marking);
      this.currentMarking = marking;
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