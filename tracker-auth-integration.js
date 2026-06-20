/**
 * ==========================================
 * TRACKER AUTH INTEGRATION
 * ==========================================
 * Integrate Firebase Auth with THE DOOR Tracker
 * Add this to tracker_live.html before closing </body>
 */

(function() {
  const TRACKER_VERSION = '2.0.0 (Firebase)';

  // Initialize Firebase Auth
  if (typeof firebase !== 'undefined') {
    const auth = firebase.auth();

    // Monitor auth state
    auth.onAuthStateChanged((user) => {
      if (user) {
        // User is logged in
        updateAuthUI(user);
      } else {
        // User is not logged in
        showLoginPrompt();
      }
    });

    // Update UI with user info
    function updateAuthUI(user) {
      // Store in localStorage for tracker access
      localStorage.setItem('via_access_uid', user.uid);
      localStorage.setItem('via_access_email', user.email);
      localStorage.setItem('via_access_name', user.displayName || 'User');
      localStorage.setItem('via_access_photo', user.photoURL || '');

      // Fetch user role from database (or set default)
      fetchUserRole(user.uid);

      // Create/show auth header
      createAuthHeader(user);
    }

    // Fetch user role from backend
    async function fetchUserRole(uid) {
      try {
        const token = await firebase.auth().currentUser.getIdToken();
        const response = await fetch('/api/auth/me', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        if (data.user) {
          localStorage.setItem('via_access_role', data.user.role);
        }
      } catch (error) {
        console.log('Role fetch (optional):', error);
        localStorage.setItem('via_access_role', 'viewer');
      }
    }

    // Create auth header with user menu
    function createAuthHeader(user) {
      const existingHeader = document.getElementById('tracker-auth-header');
      if (existingHeader) return;

      const header = document.createElement('div');
      header.id = 'tracker-auth-header';
      header.innerHTML = `
        <style>
          #tracker-auth-header {
            position: fixed;
            top: 0;
            right: 0;
            z-index: 10000;
            background: rgba(7, 8, 9, 0.95);
            border-left: 1px solid rgba(248, 247, 245, 0.07);
            border-bottom: 1px solid rgba(248, 247, 245, 0.07);
            padding: 12px 20px;
            display: flex;
            align-items: center;
            gap: 16px;
            font-family: 'Space Grotesk', sans-serif;
            color: #F8F7F5;
            font-size: 12px;
          }
          .auth-user-info {
            display: flex;
            align-items: center;
            gap: 8px;
          }
          .auth-avatar {
            width: 32px;
            height: 32px;
            border-radius: 50%;
            background: #FFAA17;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 600;
            color: #070809;
          }
          .auth-name {
            max-width: 150px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
          .auth-role {
            opacity: 0.65;
            font-size: 10px;
            text-transform: uppercase;
            padding: 2px 6px;
            background: rgba(255, 170, 23, 0.1);
            border-radius: 2px;
          }
          .auth-buttons {
            display: flex;
            gap: 8px;
          }
          .auth-btn {
            padding: 6px 12px;
            border: 1px solid rgba(248, 247, 245, 0.2);
            background: transparent;
            color: #F8F7F5;
            border-radius: 2px;
            cursor: pointer;
            font-size: 11px;
            transition: all 0.2s;
          }
          .auth-btn:hover {
            background: rgba(255, 170, 23, 0.1);
            border-color: #FFAA17;
          }
          .auth-btn.logout {
            color: #f87171;
            border-color: #f87171;
          }
          .auth-btn.logout:hover {
            background: rgba(248, 113, 113, 0.1);
          }
        </style>

        <div class="auth-user-info">
          <div class="auth-avatar">${(user.displayName || 'U').charAt(0).toUpperCase()}</div>
          <div>
            <div class="auth-name" title="${user.displayName || user.email}">${user.displayName || user.email}</div>
            <div class="auth-role" id="auth-role-badge">VIEWER</div>
          </div>
        </div>

        <div class="auth-buttons">
          <button class="auth-btn" onclick="window.location.href='/admin-dashboard.html'" title="Admin Panel">Admin</button>
          <button class="auth-btn logout" onclick="handleLogout()" title="Logout">Logout</button>
        </div>
      `;

      document.body.appendChild(header);

      // Update role badge
      const roleElement = document.getElementById('auth-role-badge');
      if (roleElement) {
        const role = localStorage.getItem('via_access_role') || 'viewer';
        roleElement.textContent = role.toUpperCase();
      }
    }

    // Logout handler
    window.handleLogout = async function() {
      try {
        await auth.signOut();
        localStorage.clear();
        window.location.href = '/login.html';
      } catch (error) {
        console.error('Logout error:', error);
        window.location.href = '/login.html';
      }
    };

    // Show login prompt for unauthenticated users
    function showLoginPrompt() {
      const promptHTML = `
        <style>
          #tracker-login-prompt {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            z-index: 10001;
            background: #0E0F12;
            border: 1px solid rgba(248, 247, 245, 0.07);
            border-radius: 8px;
            padding: 32px;
            text-align: center;
            font-family: 'Space Grotesk', sans-serif;
            color: #F8F7F5;
            max-width: 400px;
            width: 90%;
            box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5);
          }
          #tracker-login-prompt h2 {
            color: #FFAA17;
            font-size: 24px;
            margin-bottom: 12px;
          }
          #tracker-login-prompt p {
            color: rgba(248, 247, 245, 0.65);
            font-size: 14px;
            margin-bottom: 24px;
            line-height: 1.6;
          }
          #tracker-login-prompt .prompt-buttons {
            display: flex;
            gap: 12px;
            justify-content: center;
          }
          #tracker-login-prompt .prompt-btn {
            padding: 10px 20px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-weight: 600;
            font-size: 12px;
            transition: all 0.2s;
          }
          #tracker-login-prompt .prompt-btn-primary {
            background: #FFAA17;
            color: #070809;
          }
          #tracker-login-prompt .prompt-btn-primary:hover {
            opacity: 0.9;
          }
          #tracker-login-prompt .prompt-btn-secondary {
            background: transparent;
            color: #FFAA17;
            border: 1px solid #FFAA17;
          }
          #tracker-login-prompt .prompt-btn-secondary:hover {
            background: rgba(255, 170, 23, 0.1);
          }
        </style>

        <div id="tracker-login-prompt">
          <h2>🚪 THE DOOR</h2>
          <p>Sign in to access the monitoring dashboard and real-time data.</p>
          <div class="prompt-buttons">
            <button class="prompt-btn prompt-btn-primary" onclick="window.location.href='/login.html'">Sign In</button>
            <button class="prompt-btn prompt-btn-secondary" onclick="continuAsGuest()">Continue as Guest</button>
          </div>
        </div>
      `;

      // Only show if not already showing
      if (!document.getElementById('tracker-login-prompt')) {
        const container = document.createElement('div');
        container.innerHTML = promptHTML;
        document.body.appendChild(container);
      }
    }

    // Continue as guest (viewer mode)
    window.continuAsGuest = function() {
      localStorage.setItem('via_access_role', 'viewer');
      localStorage.setItem('via_access_name', 'Guest');
      localStorage.setItem('via_access_email', 'guest@localhost');

      const prompt = document.getElementById('tracker-login-prompt');
      if (prompt) prompt.remove();

      // Reload to show guest view
      location.reload();
    };
  }

  // Get ID token for API calls
  window.getAuthToken = async function() {
    try {
      if (typeof firebase !== 'undefined' && firebase.auth().currentUser) {
        return await firebase.auth().currentUser.getIdToken();
      }
    } catch (error) {
      console.error('Token error:', error);
    }
    return null;
  };

  // Make authenticated API call
  window.fetchAPI = async function(endpoint, options = {}) {
    const token = await window.getAuthToken();
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return fetch(endpoint, {
      ...options,
      headers
    });
  };

  console.log(`[Tracker] Auth Integration v${TRACKER_VERSION} loaded`);
})();
