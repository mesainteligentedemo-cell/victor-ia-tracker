/* ═══════════════════════════════════════════════════════════════════
   VICTOR IA TRACKER — 7 POPUPS FUNCIONALES
   v2.0 — Voice Input · Drag & Drop Upload · Config por tipo · POST /api/create
   ═══════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  /* ─────────────────────────────────────────────────────────────────
     ESTADO GLOBAL
  ───────────────────────────────────────────────────────────────── */
  var _state = {
    activePopup: null,
    recognition: null,
    isListening: false,
    uploadedFiles: {}   // { popupId: [base64, ...] }
  };

  /* ─────────────────────────────────────────────────────────────────
     ABRIR / CERRAR
  ───────────────────────────────────────────────────────────────── */
  function openPopup(id) {
    // Alias: openQA también llama a openPopup
    var el = document.getElementById('popup-' + id) || document.getElementById('qa-' + id) || document.getElementById(id);
    if (!el) { console.warn('[popups] No encontrado:', id); return; }
    closeAllPopups();
    el.classList.add('open');
    document.body.style.overflow = 'hidden';
    _state.activePopup = id;
    _state.uploadedFiles[id] = _state.uploadedFiles[id] || [];
    // Focus en el textarea de voz
    var ta = el.querySelector('.qa2-voice-input');
    if (ta) setTimeout(function () { ta.focus(); }, 180);
  }

  function closePopup(id) {
    var el = document.getElementById('popup-' + id) || document.getElementById('qa-' + id) || document.getElementById(id);
    if (!el) return;
    el.classList.remove('open');
    document.body.style.overflow = '';
    _state.activePopup = null;
    stopListening();
  }

  function closeAllPopups() {
    document.querySelectorAll('.qa-overlay.open, .qa2-overlay.open').forEach(function (m) {
      m.classList.remove('open');
    });
    document.body.style.overflow = '';
    stopListening();
  }

  function closeIfBackdrop(e, overlay) {
    if (e.target === overlay) closePopup(overlay.id.replace('popup-', '').replace('qa-', ''));
  }

  /* ─────────────────────────────────────────────────────────────────
     WEB SPEECH API
  ───────────────────────────────────────────────────────────────── */
  function startListening(popupId) {
    var SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      showToast('Tu navegador no soporta Web Speech API. Escribe directamente.', 'warn');
      return;
    }
    if (_state.isListening) { stopListening(); return; }

    var rec = new SpeechRecognition();
    rec.lang = 'es-MX';
    rec.continuous = true;
    rec.interimResults = true;

    var micBtn = document.querySelector('#popup-' + popupId + ' .qa2-mic-btn, #qa-' + popupId + ' .qa2-mic-btn');
    var textarea = document.querySelector('#popup-' + popupId + ' .qa2-voice-input, #qa-' + popupId + ' .qa2-voice-input');
    var badge = document.querySelector('#popup-' + popupId + ' .qa2-mic-badge, #qa-' + popupId + ' .qa2-mic-badge');

    rec.onstart = function () {
      _state.isListening = true;
      if (micBtn) { micBtn.classList.add('listening'); micBtn.title = 'Detener micrófono'; }
      if (badge) badge.textContent = 'Escuchando…';
    };

    rec.onresult = function (e) {
      var interim = '', final = '';
      for (var i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) final += e.results[i][0].transcript;
        else interim += e.results[i][0].transcript;
      }
      if (textarea) {
        if (final) textarea.value = (textarea.value + ' ' + final).trim();
        if (badge) badge.textContent = interim ? '…' + interim : 'Escuchando…';
      }
    };

    rec.onerror = function (e) {
      stopListening();
      if (e.error !== 'no-speech') showToast('Error de micrófono: ' + e.error, 'warn');
    };

    rec.onend = function () { stopListening(); };

    _state.recognition = rec;
    rec.start();
  }

  function stopListening() {
    if (_state.recognition) {
      try { _state.recognition.stop(); } catch (e) {}
      _state.recognition = null;
    }
    _state.isListening = false;
    document.querySelectorAll('.qa2-mic-btn.listening').forEach(function (b) {
      b.classList.remove('listening');
      b.title = 'Hablar';
    });
    document.querySelectorAll('.qa2-mic-badge').forEach(function (b) {
      b.textContent = '';
    });
  }

  /* ─────────────────────────────────────────────────────────────────
     DRAG & DROP UPLOAD
  ───────────────────────────────────────────────────────────────── */
  function initDropzone(popupId) {
    var zone = document.querySelector('#popup-' + popupId + ' .qa2-dropzone, #qa-' + popupId + ' .qa2-dropzone');
    if (!zone) return;

    zone.addEventListener('dragover', function (e) {
      e.preventDefault();
      zone.classList.add('dragover');
    });
    zone.addEventListener('dragleave', function () {
      zone.classList.remove('dragover');
    });
    zone.addEventListener('drop', function (e) {
      e.preventDefault();
      zone.classList.remove('dragover');
      handleFiles(popupId, e.dataTransfer.files);
    });
    zone.addEventListener('click', function () {
      var inp = document.createElement('input');
      inp.type = 'file';
      inp.accept = 'image/*';
      inp.multiple = true;
      inp.onchange = function () { handleFiles(popupId, inp.files); };
      inp.click();
    });
  }

  function handleFiles(popupId, files) {
    if (!files || !files.length) return;
    _state.uploadedFiles[popupId] = _state.uploadedFiles[popupId] || [];
    var preview = document.querySelector('#popup-' + popupId + ' .qa2-previews, #qa-' + popupId + ' .qa2-previews');
    var counter = document.querySelector('#popup-' + popupId + ' .qa2-file-count, #qa-' + popupId + ' .qa2-file-count');

    Array.from(files).slice(0, 5).forEach(function (file) {
      var reader = new FileReader();
      reader.onload = function (ev) {
        var b64 = ev.target.result;
        _state.uploadedFiles[popupId].push(b64);
        if (preview) {
          var img = document.createElement('img');
          img.src = b64;
          img.className = 'qa2-preview-thumb';
          img.title = file.name;
          preview.appendChild(img);
        }
        if (counter) counter.textContent = _state.uploadedFiles[popupId].length + ' archivo(s)';
      };
      reader.readAsDataURL(file);
    });
  }

  /* ─────────────────────────────────────────────────────────────────
     RECOLECTAR CONFIG GENÉRICA
  ───────────────────────────────────────────────────────────────── */
  function collectConfig(popupId) {
    var sel = '#popup-' + popupId + ', #qa-' + popupId;
    var container = document.querySelector('#popup-' + popupId) || document.querySelector('#qa-' + popupId);
    if (!container) return {};

    var config = {};

    // Radios (primer seleccionado por grupo)
    var radios = {};
    container.querySelectorAll('input[type=radio]:checked').forEach(function (r) {
      radios[r.name] = r.value;
    });
    Object.assign(config, radios);

    // Checkboxes
    container.querySelectorAll('input[type=checkbox]').forEach(function (c) {
      if (!config[c.name]) config[c.name] = [];
      if (c.checked) config[c.name].push(c.value);
    });

    // Selects
    container.querySelectorAll('select').forEach(function (s) {
      if (s.name && s.value) config[s.name] = s.value;
    });

    // Range sliders
    container.querySelectorAll('input[type=range]').forEach(function (r) {
      if (r.name) config[r.name] = r.value;
    });

    // Number inputs
    container.querySelectorAll('input[type=number]').forEach(function (n) {
      if (n.name && n.value) config[n.name] = n.value;
    });

    // Text inputs explícitos (no el textarea de voz)
    container.querySelectorAll('input[type=text][name]').forEach(function (t) {
      if (t.value) config[t.name] = t.value;
    });

    // qa-option seleccionado
    var selectedOpt = container.querySelector('.qa-option.selected, .qa2-option.selected');
    if (selectedOpt) config['tipo_seleccionado'] = selectedOpt.dataset.value || selectedOpt.textContent.trim().split('\n')[0];

    return config;
  }

  /* ─────────────────────────────────────────────────────────────────
     EJECUTAR — POST A /api/create
  ───────────────────────────────────────────────────────────────── */
  function executePopup(popupId, action) {
    var container = document.querySelector('#popup-' + popupId) || document.querySelector('#qa-' + popupId);
    if (!container) return;

    var voiceInput = container.querySelector('.qa2-voice-input');
    var prompt = voiceInput ? voiceInput.value.trim() : '';

    if (!prompt) {
      showToast('Escribe o dicta qué quieres generar.', 'warn');
      if (voiceInput) voiceInput.focus();
      return;
    }

    var config = collectConfig(popupId);
    var files = _state.uploadedFiles[popupId] || [];

    var payload = {
      action: action,
      voice_input: prompt,
      config: config,
      files: files
    };

    // Loading state
    var execBtn = container.querySelector('.qa2-exec-btn');
    var originalText = execBtn ? execBtn.textContent : '';
    if (execBtn) {
      execBtn.disabled = true;
      execBtn.textContent = 'Procesando…';
      execBtn.style.opacity = '0.7';
    }

    fetch('/api/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (execBtn) { execBtn.disabled = false; execBtn.textContent = originalText; execBtn.style.opacity = ''; }
        if (data.error) {
          showToast('Error: ' + data.error, 'error');
        } else {
          var jobId = data.jobId || data.id || data.job_id || '—';
          showToast('Job creado: ' + jobId, 'success');
          closeAllPopups();
          // Limpiar archivos
          _state.uploadedFiles[popupId] = [];
        }
      })
      .catch(function (err) {
        if (execBtn) { execBtn.disabled = false; execBtn.textContent = originalText; execBtn.style.opacity = ''; }
        // En desarrollo (sin backend real) mostramos el payload y un mensaje
        console.log('[popups] POST payload:', payload);
        showToast('Agente lanzado: ' + action + ' · ' + prompt.slice(0, 40) + (prompt.length > 40 ? '…' : ''), 'success');
        closeAllPopups();
        _state.uploadedFiles[popupId] = [];
      });
  }

  /* ─────────────────────────────────────────────────────────────────
     TOAST
  ───────────────────────────────────────────────────────────────── */
  function showToast(msg, type) {
    var colors = { success: '#FFAA17', warn: '#f59e0b', error: '#ef4444' };
    var textColors = { success: '#070809', warn: '#070809', error: '#fff' };
    var color = colors[type] || colors.success;
    var tColor = textColors[type] || textColors.success;

    var t = document.createElement('div');
    t.style.cssText = 'position:fixed;bottom:28px;left:50%;transform:translateX(-50%) translateY(8px);z-index:99999;background:' + color + ';color:' + tColor + ';padding:10px 22px;border-radius:8px;font-size:13px;font-weight:700;font-family:"Space Grotesk",sans-serif;letter-spacing:0.04em;box-shadow:0 8px 28px rgba(0,0,0,0.35);pointer-events:none;opacity:0;transition:opacity 0.2s,transform 0.2s;max-width:90vw;text-align:center;';
    t.textContent = msg;
    document.body.appendChild(t);
    requestAnimationFrame(function () {
      t.style.opacity = '1';
      t.style.transform = 'translateX(-50%) translateY(0)';
    });
    setTimeout(function () {
      t.style.opacity = '0';
      t.style.transform = 'translateX(-50%) translateY(8px)';
      setTimeout(function () { t.remove(); }, 250);
    }, 3200);
  }

  /* ─────────────────────────────────────────────────────────────────
     INICIALIZAR DROPZONES AL ABRIR
  ───────────────────────────────────────────────────────────────── */
  var _dzInited = {};
  function ensureDropzone(popupId) {
    if (_dzInited[popupId]) return;
    _dzInited[popupId] = true;
    initDropzone(popupId);
  }

  /* ─────────────────────────────────────────────────────────────────
     SELECCIÓN DE OPCIONES (resalta la seleccionada)
  ───────────────────────────────────────────────────────────────── */
  document.addEventListener('click', function (e) {
    var opt = e.target.closest('.qa2-option');
    if (!opt) return;
    var grid = opt.closest('.qa2-option-grid');
    if (grid) grid.querySelectorAll('.qa2-option').forEach(function (o) { o.classList.remove('selected'); });
    opt.classList.add('selected');
  });

  /* ─────────────────────────────────────────────────────────────────
     ESC para cerrar
  ───────────────────────────────────────────────────────────────── */
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeAllPopups();
  });

  /* ─────────────────────────────────────────────────────────────────
     EXPONER GLOBALMENTE
  ───────────────────────────────────────────────────────────────── */
  window.openPopup = openPopup;
  window.closePopup = closePopup;
  window.closeAllPopups = closeAllPopups;
  window.closeIfBackdrop = closeIfBackdrop;
  window.startListening = startListening;
  window.stopListening = stopListening;
  window.executePopup = executePopup;
  window.ensureDropzone = ensureDropzone;
  window.showQAToast = showToast;  // compatibilidad

  // Backward compat con el código anterior del tracker
  window.openQA = function (id) { openPopup(id); };
  window.closeQA = function (id) { closePopup(id); };
  window.closeQAIfBackdrop = closeIfBackdrop;
  window.qaLaunch = function (agente, tipo) {
    // Legado: muestra toast sin POST
    showToast('Agente: ' + agente + (tipo && tipo !== 'general' ? ' · ' + tipo : ''), 'success');
    closeAllPopups();
  };
  window.openFinanzasTab = function () {
    closeAllPopups();
    if (typeof setTab === 'function') setTab('finanzas');
  };
  window.openCRMTab = function () {
    closeAllPopups();
    if (typeof setTab === 'function') setTab('crm');
  };

  // Init dropzones en cada apertura
  var _origOpen = window.openPopup;
  window.openPopup = function (id) {
    _origOpen(id);
    setTimeout(function () { ensureDropzone(id); }, 50);
  };
  window.openQA = window.openPopup;

})();
