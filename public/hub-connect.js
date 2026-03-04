/**
 * Hub Connection Manager — shared across all pages
 * 
 * Auto-detects local vs remote (Vercel) environment and provides:
 *   HubConnection.hubUrl    — base URL for API calls ('' when local)
 *   HubConnection.isLocal   — true if running on localhost/LAN
 *   HubConnection.ready     — Promise that resolves when connection info is available
 *   HubConnection.fetch()   — fetch wrapper that prepends hubUrl
 *   HubConnection.connectSocket() — returns Socket.IO connection to Hub
 *
 * Usage in pages:
 *   <script src="/hub-connect.js"></script>
 *   <script>
 *     HubConnection.ready.then(() => {
 *       const socket = HubConnection.connectSocket();
 *       HubConnection.fetch('/api/submissions').then(r => r.json()).then(console.log);
 *     });
 *   </script>
 */

const HubConnection = (() => {
  const hostname = window.location.hostname;
  const isLocal = ['localhost', '127.0.0.1'].includes(hostname) ||
    hostname.startsWith('192.168.') ||
    hostname.startsWith('10.') ||
    hostname.startsWith('172.');

  let hubUrl = ''; // Default: same origin (local)
  let _readyResolve;
  const ready = new Promise(resolve => { _readyResolve = resolve; });

  function init() {
    if (isLocal) {
      // Local: relative paths work, same origin
      loadSocketIO('').then(() => _readyResolve());
    } else {
      // Remote (Vercel): discover Hub URL from config
      fetch('/hub-config.json')
        .then(r => r.json())
        .then(config => {
          hubUrl = (config.hubUrl || '').replace(/\/$/, '');
          if (!hubUrl) {
            hubUrl = localStorage.getItem('hub-connect-url') || '';
          }
          if (hubUrl) {
            localStorage.setItem('hub-connect-url', hubUrl);
          }
          return loadSocketIO(hubUrl);
        })
        .then(() => _readyResolve())
        .catch(() => {
          // Fallback: try localStorage
          hubUrl = localStorage.getItem('hub-connect-url') || '';
          console.warn('[hub-connect] Could not load hub-config.json' +
            (hubUrl ? ', using cached URL: ' + hubUrl : ', no Hub URL available'));
          loadSocketIO(hubUrl).then(() => _readyResolve());
        });
    }
  }

  function loadSocketIO(baseUrl) {
    return new Promise((resolve) => {
      if (window.io) {
        resolve();
        return;
      }
      const script = document.createElement('script');
      script.src = baseUrl ? `${baseUrl}/socket.io/socket.io.js` : '/socket.io/socket.io.js';
      script.onload = resolve;
      script.onerror = () => {
        console.warn('[hub-connect] Failed to load Socket.IO from ' + script.src);
        resolve(); // Resolve anyway — page may not need Socket.IO
      };
      document.head.appendChild(script);
    });
  }

  function hubFetch(path, opts = {}) {
    const url = hubUrl ? `${hubUrl}${path}` : path;
    return fetch(url, opts);
  }

  function connectSocket(opts = {}) {
    if (!window.io) {
      console.error('[hub-connect] Socket.IO not loaded');
      return null;
    }
    return hubUrl ? io(hubUrl, opts) : io(opts);
  }

  // Auto-initialize
  init();

  return {
    get hubUrl() { return hubUrl; },
    get isLocal() { return isLocal; },
    ready,
    fetch: hubFetch,
    connectSocket
  };
})();
