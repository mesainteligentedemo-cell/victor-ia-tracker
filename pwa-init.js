/**
 * ==========================================
 * PWA INITIALIZATION — Phase 11
 * ==========================================
 * Service worker registration + offline support
 */

(function() {
  // Register service worker
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/service-worker.js', { scope: '/' })
        .then(registration => {
          console.log('✅ Service Worker registered:', registration);

          // Check for updates every 5 minutes
          setInterval(() => {
            registration.update();
          }, 5 * 60 * 1000);

          // Notify user when update is available
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                showUpdatePrompt();
              }
            });
          });
        })
        .catch(error => {
          console.warn('❌ Service Worker registration failed:', error);
        });

      // Listen for messages from service worker
      navigator.serviceWorker.addEventListener('message', event => {
        if (event.data.type === 'SYNC_COMPLETE') {
          console.log('✅ Background sync complete:', event.data.data);
          showSyncNotification(event.data.data);
        }
      });
    });
  }

  /**
   * Show update prompt
   */
  function showUpdatePrompt() {
    const prompt = document.createElement('div');
    prompt.id = 'pwa-update-prompt';
    prompt.innerHTML = `
      <style>
        #pwa-update-prompt {
          position: fixed; bottom: 20px; right: 20px;
          background: #0E0F12; border: 1px solid rgba(255,170,23,0.3);
          border-radius: 4px; padding: 16px; z-index: 9999;
          box-shadow: 0 4px 12px rgba(0,0,0,0.5);
          font-family: 'Space Grotesk', sans-serif;
          color: #F8F7F5;
          max-width: 300px;
        }
        #pwa-update-prompt h4 {
          color: #FFAA17; font-size: 12px;
          margin-bottom: 8px; text-transform: uppercase;
          letter-spacing: 0.1em;
        }
        #pwa-update-prompt p {
          font-size: 12px; color: rgba(248,247,245,0.65);
          margin-bottom: 12px; line-height: 1.4;
        }
        #pwa-update-prompt .prompt-buttons {
          display: flex; gap: 8px;
        }
        #pwa-update-prompt button {
          flex: 1; padding: 8px 12px; font-size: 11px;
          border: none; border-radius: 2px; cursor: pointer;
          font-weight: 600; letter-spacing: 0.1em;
          transition: all 0.2s;
        }
        #pwa-update-prompt .btn-update {
          background: #FFAA17; color: #070809;
        }
        #pwa-update-prompt .btn-update:hover {
          opacity: 0.9;
        }
        #pwa-update-prompt .btn-dismiss {
          background: transparent; border: 1px solid rgba(255,170,23,0.3);
          color: #FFAA17;
        }
        #pwa-update-prompt .btn-dismiss:hover {
          background: rgba(255,170,23,0.1);
        }
      </style>
      <h4>📦 Update Available</h4>
      <p>A new version of THE DOOR is ready. Restart to get the latest features.</p>
      <div class="prompt-buttons">
        <button class="btn-update" onclick="location.reload()">Restart Now</button>
        <button class="btn-dismiss" onclick="this.parentElement.parentElement.remove()">Later</button>
      </div>
    `;
    document.body.appendChild(prompt);

    // Auto-remove after 30 seconds
    setTimeout(() => {
      const el = document.getElementById('pwa-update-prompt');
      if (el) el.remove();
    }, 30000);
  }

  /**
   * Show sync notification
   */
  function showSyncNotification(data) {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('THE DOOR', {
        body: `✅ ${data.synced} pending actions synced!`,
        icon: '/icon-192.png',
        badge: '/badge-72.png',
        tag: 'sync-complete'
      });
    }
  }

  /**
   * Install prompt (add to home screen)
   */
  let deferredPrompt;

  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    deferredPrompt = event;
    showInstallPrompt();
  });

  function showInstallPrompt() {
    const prompt = document.createElement('div');
    prompt.id = 'pwa-install-prompt';
    prompt.innerHTML = `
      <style>
        #pwa-install-prompt {
          position: fixed; top: 58px; right: 20px;
          background: #0E0F12; border: 1px solid rgba(255,170,23,0.3);
          border-radius: 4px; padding: 14px; z-index: 9998;
          box-shadow: 0 4px 12px rgba(0,0,0,0.5);
          font-family: 'Space Grotesk', sans-serif;
          color: #F8F7F5;
          max-width: 280px;
        }
        #pwa-install-prompt h4 {
          color: #FFAA17; font-size: 11px;
          margin-bottom: 6px; text-transform: uppercase;
          letter-spacing: 0.1em;
        }
        #pwa-install-prompt p {
          font-size: 11px; color: rgba(248,247,245,0.65);
          margin-bottom: 10px; line-height: 1.4;
        }
        #pwa-install-prompt .prompt-buttons {
          display: flex; gap: 6px;
        }
        #pwa-install-prompt button {
          flex: 1; padding: 6px 10px; font-size: 10px;
          border: none; border-radius: 2px; cursor: pointer;
          font-weight: 600; letter-spacing: 0.08em;
          transition: all 0.2s;
        }
        #pwa-install-prompt .btn-install {
          background: #FFAA17; color: #070809;
        }
        #pwa-install-prompt .btn-install:hover {
          opacity: 0.9;
        }
        #pwa-install-prompt .btn-dismiss {
          background: transparent; border: 1px solid rgba(255,170,23,0.2);
          color: #FFAA17;
        }
        #pwa-install-prompt .btn-dismiss:hover {
          background: rgba(255,170,23,0.08);
        }
      </style>
      <h4>📱 Install App</h4>
      <p>Add THE DOOR to your home screen for quick access.</p>
      <div class="prompt-buttons">
        <button class="btn-install" onclick="window.installApp()">Install</button>
        <button class="btn-dismiss" onclick="this.parentElement.parentElement.remove()">No</button>
      </div>
    `;
    document.body.appendChild(prompt);
  }

  // Install app handler
  window.installApp = async function() {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`User response to install prompt: ${outcome}`);
      deferredPrompt = null;

      const el = document.getElementById('pwa-install-prompt');
      if (el) el.remove();
    }
  };

  /**
   * Request notification permission
   */
  function requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
        .then(permission => {
          if (permission === 'granted') {
            console.log('✅ Notification permission granted');
          }
        });
    }
  }

  // Request permission on first visit
  if (localStorage.getItem('door-first-visit') !== 'false') {
    requestNotificationPermission();
    localStorage.setItem('door-first-visit', 'false');
  }

  /**
   * Offline/Online detection
   */
  window.addEventListener('online', () => {
    console.log('✅ Connection restored');
    showNetworkStatus(true);
    triggerBackgroundSync();
  });

  window.addEventListener('offline', () => {
    console.log('⚠️ Connection lost');
    showNetworkStatus(false);
  });

  function showNetworkStatus(isOnline) {
    const status = document.getElementById('network-status');
    if (status) {
      if (isOnline) {
        status.textContent = '🟢 Online';
        status.style.color = '#4ade80';
      } else {
        status.textContent = '🔴 Offline';
        status.style.color = '#f87171';
      }
    }
  }

  /**
   * Trigger background sync
   */
  function triggerBackgroundSync() {
    if ('serviceWorker' in navigator && 'SyncManager' in window) {
      navigator.serviceWorker.ready
        .then(registration => {
          return registration.sync.register('sync-data');
        })
        .then(() => {
          console.log('✅ Background sync registered');
        })
        .catch(err => {
          console.warn('Background sync not supported:', err);
        });
    }
  }

  console.log('✅ PWA initialization complete');
})();
