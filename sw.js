const CACHE='vit-v5';
self.addEventListener('install',e=>{ self.skipWaiting(); });
self.addEventListener('activate',e=>{
  e.waitUntil(
    caches.keys().then(ks=>Promise.all(ks.map(k=>caches.delete(k)))).then(()=>self.clients.claim())
  );
});
self.addEventListener('fetch',e=>{
  const req=e.request;
  if(req.method!=='GET'){return;}
  const isHTML = req.mode==='navigate' ||
    (req.headers.get('accept')||'').includes('text/html');
  if(isHTML){
    // Network-first para HTML: siempre la versión más reciente (mata el caché viejo).
    e.respondWith(
      fetch(req).then(resp=>{
        const clone=resp.clone();
        caches.open(CACHE).then(c=>c.put(req,clone));
        return resp;
      }).catch(()=>caches.match(req).then(c=>c||caches.match('/')))
    );
    return;
  }
  // Cache-first solo para assets estáticos.
  e.respondWith(
    caches.match(req).then(cached=>{
      const net=fetch(req).then(resp=>{
        if(resp&&resp.ok){const clone=resp.clone();caches.open(CACHE).then(c=>c.put(req,clone));}
        return resp;
      }).catch(()=>cached);
      return cached||net;
    })
  );
});
