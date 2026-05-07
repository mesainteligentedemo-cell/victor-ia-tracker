// Victor IA — Widget Embeddable
// Uso: <script src="https://victor-ia-tracker.vercel.app/widget/embed.js" data-agent-id="TU_AGENT_ID"></script>
(function(){
  var s = document.currentScript || document.querySelector('script[data-agent-id]');
  var agentId = s ? (s.getAttribute('data-agent-id') || 'AGENT_ID_AQUI') : 'AGENT_ID_AQUI';
  var iframe = document.createElement('iframe');
  var sourceUrl = encodeURIComponent(window.location.href);
  var pageTitle = encodeURIComponent(document.title);
  iframe.src = 'https://victor-ia-tracker.vercel.app/widget/?agent=' + encodeURIComponent(agentId)
    + '&source=' + sourceUrl + '&page_title=' + pageTitle;

  function isMobile(){ return window.innerWidth <= 768; }

  function applyFrameStyles(open){
    var mob = isMobile();
    if(mob && open){
      iframe.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;border:none;z-index:2147483647;background:transparent;pointer-events:all;touch-action:auto;';
    } else if(mob){
      iframe.style.cssText = 'position:fixed;bottom:0;right:0;width:70px;height:70px;border:none;z-index:2147483647;background:transparent;pointer-events:all;touch-action:auto;transition:none;';
    } else {
      iframe.style.cssText = 'position:fixed;bottom:0;right:0;width:420px;height:'+(open?'700':'110')+'px;border:none;z-index:2147483647;background:transparent;pointer-events:all;touch-action:auto;transition:height .3s ease;';
    }
  }

  applyFrameStyles(false);
  iframe.allow = 'microphone';
  iframe.id = 'via-embed-frame';
  document.body.appendChild(iframe);

  // ── TRACKING ─────────────────────────────────────────────────
  var viaPageStart = Date.now();
  var viaClicks = [];
  var viaMaxScroll = 0;

  function viaGetScrollDepth(){
    var docH = document.documentElement.scrollHeight - window.innerHeight;
    return docH > 0 ? Math.min(100, Math.round((window.scrollY / docH) * 100)) : 100;
  }

  function viaPushTracking(){
    var frame = document.getElementById('via-embed-frame');
    if(!frame || !frame.contentWindow) return;
    viaMaxScroll = Math.max(viaMaxScroll, viaGetScrollDepth());
    frame.contentWindow.postMessage({
      type: 'VIA_TRACKING',
      slug: window.location.pathname,
      url: window.location.href,
      title: document.title,
      timeOnPage: Math.round((Date.now() - viaPageStart) / 1000),
      scrollDepth: viaMaxScroll,
      clicks: viaClicks.slice(-30)
    }, '*');
  }

  document.addEventListener('click', function(e){
    var docH = document.documentElement.scrollHeight;
    var docW = document.documentElement.scrollWidth;
    viaClicks.push({
      x: Math.round(e.clientX / window.innerWidth * 100),
      y: Math.round((e.clientY + window.scrollY) / (docH || 1) * 100),
      tag: e.target.tagName.toLowerCase(),
      text: (e.target.innerText || e.target.alt || e.target.title || '').trim().substring(0, 60),
      t: Math.round((Date.now() - viaPageStart) / 1000)
    });
    if(viaClicks.length > 60) viaClicks.shift();
    viaPushTracking();
  }, true);

  window.addEventListener('scroll', function(){
    viaMaxScroll = Math.max(viaMaxScroll, viaGetScrollDepth());
  }, {passive:true});

  // Enviar tracking cada 20s y al inicio
  setTimeout(viaPushTracking, 1000);
  setInterval(viaPushTracking, 20000);

  // Escuchar mensajes del iframe
  window.addEventListener('message', function(e){
    if(!e.data) return;
    if(e.data.type === 'VIA_RESIZE'){
      applyFrameStyles(e.data.open);
      iframe.style.pointerEvents = 'all';
    }
    if(e.data.type === 'VIA_GET_TRACKING') viaPushTracking();
  });
})();
