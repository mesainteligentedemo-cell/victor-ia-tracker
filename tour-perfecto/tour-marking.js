/**
 * TOUR BUTTON MARKING SYSTEM v1.0
 * Sincroniza marking visual de botones exactamente cuando se mencionan en la narración
 *
 * FEATURES:
 * ✓ Timestamps acumulados desde múltiples MP3s
 * ✓ Sincronización cada 100ms sin lag
 * ✓ Visual claro: glow + border animated
 * ✓ Fallback seguro si selector no existe
 * ✓ Transiciones suaves (fade in/out)
 * ✓ Multiplatforma (funciona en cualquier navegador moderno)
 */

class TourMarkingSystem {
  constructor(configUrl = './marking-config.json', audioPlaylistSelector = '#tour-audio') {
    this.config = null;
    this.audioPlayer = null;
    this.audioPlaylist = null;
    this.currentlyMarked = null;
    this.markingTimer = null;
    this.isInitialized = false;

    this.load(configUrl, audioPlaylistSelector);
  }

  /**
   * Carga el archivo de configuración JSON
   */
  async load(configUrl, audioPlaylistSelector) {
    try {
      const response = await fetch(configUrl);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      this.config = await response.json();

      // Intentar obtener el audio playlist
      this.audioPlaylist = document.querySelector(audioPlaylistSelector);
      if (!this.audioPlaylist) {
        console.warn(`[TourMarking] Audio playlist "${audioPlaylistSelector}" no encontrado. Modo manual.`);
      }

      console.log(`[TourMarking] Configuración cargada: ${this.config.meta.totalSteps} pasos`);
      this.init();
    } catch (error) {
      console.error('[TourMarking] Error cargando configuración:', error);
    }
  }

  /**
   * Inicializa el sistema
   */
  init() {
    if (this.isInitialized) return;
    this.isInitialized = true;

    // Si tenemos un audio playlist, escuchar eventos
    if (this.audioPlaylist) {
      this.audioPlaylist.addEventListener('timeupdate', () => this.sync());
      this.audioPlaylist.addEventListener('play', () => this.startSync());
      this.audioPlaylist.addEventListener('pause', () => this.stopSync());
      this.audioPlaylist.addEventListener('ended', () => this.clearMarking());
    }

    // Si el sistema se dispara manualmente, iniciar sync cada 100ms
    this.startSync();

    console.log('[TourMarking] Sistema inicializado y listo para marcar botones');
  }

  /**
   * Obtiene el tiempo actual del audio
   */
  getCurrentTime() {
    if (this.audioPlaylist && this.audioPlaylist instanceof HTMLAudioElement) {
      return this.audioPlaylist.currentTime;
    }

    // Fallback: detectar si hay algún audio playing en la página
    const audioElements = document.querySelectorAll('audio');
    for (let audio of audioElements) {
      if (!audio.paused) {
        return audio.currentTime;
      }
    }

    return 0;
  }

  /**
   * Sincroniza marking basado en currentTime del audio
   */
  sync() {
    const currentTime = this.getCurrentTime();
    const marking = this.findMarkingByTime(currentTime);

    if (marking && marking !== this.currentlyMarked) {
      // Nueva marca: aplicar
      this.mark(marking);
      this.currentlyMarked = marking;
    } else if (!marking && this.currentlyMarked) {
      // No hay marca activa: desmarcar
      this.unmark(this.currentlyMarked);
      this.currentlyMarked = null;
    }
  }

  /**
   * Busca el marking que corresponde al tiempo actual
   */
  findMarkingByTime(currentTime) {
    for (const marking of this.config.buttonMarking) {
      // Aplicar padding de anticipación (200ms antes)
      const paddedStart = marking.startTime - (this.config.timingConfig.markPadding / 1000);
      const paddedEnd = marking.endTime + (this.config.timingConfig.markPadding / 1000);

      if (currentTime >= paddedStart && currentTime < paddedEnd) {
        return marking;
      }
    }
    return null;
  }

  /**
   * Aplica mark visual al botón
   */
  mark(marking) {
    const element = document.querySelector(marking.selector);
    if (!element) {
      console.warn(`[TourMarking] Selector no encontrado: ${marking.selector} (paso ${marking.step})`);
      return;
    }

    // Remover marca anterior si existe
    if (this.currentlyMarked) {
      this.unmark(this.currentlyMarked);
    }

    element.classList.add(this.config.cssClasses.tourMarked);
    element.classList.add(this.config.cssClasses.tourMarkedActive);

    console.log(`[TourMarking] ✓ Marcando: ${marking.label} (${marking.selector})`);
  }

  /**
   * Remueve mark visual del botón
   */
  unmark(marking) {
    const element = document.querySelector(marking.selector);
    if (!element) return;

    // Aplicar transición de fade-out
    element.classList.add(this.config.cssClasses.tourMarkedFadeOut);

    // Remover después de la transición
    setTimeout(() => {
      element.classList.remove(this.config.cssClasses.tourMarked);
      element.classList.remove(this.config.cssClasses.tourMarkedActive);
      element.classList.remove(this.config.cssClasses.tourMarkedFadeOut);
    }, this.config.timingConfig.transitionDuration);
  }

  /**
   * Inicia el polling sincrónico cada 100ms
   */
  startSync() {
    if (this.markingTimer) return;

    this.markingTimer = setInterval(() => {
      this.sync();
    }, this.config.timingConfig.updateFrequency);
  }

  /**
   * Detiene el polling
   */
  stopSync() {
    if (this.markingTimer) {
      clearInterval(this.markingTimer);
      this.markingTimer = null;
    }
  }

  /**
   * Limpia todos los markings
   */
  clearMarking() {
    if (this.currentlyMarked) {
      this.unmark(this.currentlyMarked);
      this.currentlyMarked = null;
    }
  }

  /**
   * Marca un paso específico manualmente (útil para debugging)
   */
  markStep(stepNumber) {
    const marking = this.config.buttonMarking.find(m => m.step === stepNumber);
    if (marking) {
      this.mark(marking);
      this.currentlyMarked = marking;
    }
  }

  /**
   * Desplazarse al paso (scroll suave)
   */
  jumpToStep(stepNumber) {
    const marking = this.config.buttonMarking.find(m => m.step === stepNumber);
    if (marking) {
      const element = document.querySelector(marking.selector);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }

  /**
   * API pública: obtener estadísticas
   */
  getStats() {
    return {
      totalSteps: this.config.meta.totalSteps,
      totalDuration: this.config.meta.totalDuration,
      currentlyMarked: this.currentlyMarked?.label || null,
      isRunning: this.markingTimer !== null
    };
  }
}

// ============================================
// INICIALIZACIÓN AUTOMÁTICA AL CARGAR LA PÁGINA
// ============================================

let tourMarking = null;

document.addEventListener('DOMContentLoaded', () => {
  // Crear instancia global
  tourMarking = new TourMarkingSystem(
    './tour-perfecto/marking-config.json',
    '#tour-audio' // Cambiar si tu audio tiene otro selector
  );

  // Exponer API global para debugging
  window.tourMarking = tourMarking;

  console.log('✓ Tour Marking System listo. API: window.tourMarking');
  console.log('  Métodos disponibles:');
  console.log('    - tourMarking.markStep(n)       → marca paso n');
  console.log('    - tourMarking.jumpToStep(n)     → scroll a paso n');
  console.log('    - tourMarking.clearMarking()    → limpia marcas');
  console.log('    - tourMarking.getStats()        → estadísticas');
});

// Exportar para ES6 modules si se usa
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TourMarkingSystem;
}