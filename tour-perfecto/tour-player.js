/**
 * TOUR PLAYER — Secuencial MP3 Playlist (63 pasos)
 * Reproduce voz-step-01.mp3 → voz-step-63.mp3 en orden
 * Sincroniza con marking-golden.js para marking dorado automático
 */

class TourPlayer {
  constructor(configPath = './tour-perfecto/marking-config.json', audioDir = './tour-perfecto/audio') {
    this.configPath = configPath;
    this.audioDir = audioDir;
    this.config = null;
    this.currentStep = 0;
    this.isPlaying = false;
    this.currentAudio = null;
    this.accumulatedTime = 0;
    this.init();
  }

  async init() {
    try {
      const response = await fetch(this.configPath);
      this.config = await response.json();
      console.log('[TourPlayer] Config loaded:', this.config.meta);
    } catch (e) {
      console.error('[TourPlayer] Config load failed:', e);
    }
  }

  async play() {
    if (this.isPlaying) return;
    this.isPlaying = true;
    this.currentStep = 1;
    this.accumulatedTime = 0;
    console.log('[TourPlayer] Starting tour (63 steps)...');
    await this.playNextStep();
  }

  async playNextStep() {
    if (this.currentStep > 63) {
      console.log('[TourPlayer] Tour finished!');
      this.isPlaying = false;
      return;
    }

    const stepPad = this.currentStep.toString().padStart(2, '0');
    const mp3File = `${this.audioDir}/voz-step-${stepPad}.mp3`;

    console.log(`[TourPlayer] Step ${this.currentStep}/63: ${mp3File}`);

    // Crear elemento de audio temporal
    const audio = new Audio();
    audio.src = mp3File;
    audio.preload = 'metadata';

    audio.addEventListener('canplaythrough', () => {
      console.log(`[TourPlayer] Step ${this.currentStep} duration: ${audio.duration.toFixed(2)}s`);

      // Actualizar marking-config con duración real
      if (this.config && window.tourMarking) {
        const marking = this.config.markings.find(m => m.step === this.currentStep);
        if (marking) {
          marking.startTime = this.accumulatedTime;
          marking.endTime = this.accumulatedTime + audio.duration;
        }
      }

      // Reproducir
      audio.play().catch(e => console.warn('[TourPlayer] Play failed:', e));
    });

    audio.addEventListener('ended', async () => {
      console.log(`[TourPlayer] Step ${this.currentStep} ended`);
      this.accumulatedTime += audio.duration;
      this.currentStep++;

      // Delay antes del siguiente paso (transición suave)
      await new Promise(resolve => setTimeout(resolve, 500));

      // Reproducir siguiente
      await this.playNextStep();
    });

    audio.addEventListener('error', (e) => {
      console.error(`[TourPlayer] Error loading step ${this.currentStep}:`, e);
      this.currentStep++;
      this.playNextStep();
    });

    // Guardar referencia
    this.currentAudio = audio;
  }

  pause() {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.isPlaying = false;
      console.log('[TourPlayer] Paused');
    }
  }

  stop() {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
    }
    this.isPlaying = false;
    this.currentStep = 0;
    this.accumulatedTime = 0;
    console.log('[TourPlayer] Stopped');
  }
}

// Instancia global
window.tourPlayer = null;

document.addEventListener('DOMContentLoaded', () => {
  window.tourPlayer = new TourPlayer('./tour-perfecto/marking-config.json', './tour-perfecto/audio');
  console.log('[TourPlayer] Initialized. Use window.tourPlayer.play() to start');
});

// Exportar para módulos
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TourPlayer;
}
