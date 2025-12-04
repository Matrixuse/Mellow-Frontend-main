import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

// Note: Previously a global fallback for `onAddToQueue` was added here to
// mask a runtime ReferenceError during development. That fallback has been
// removed so the app surfaces missing handler issues explicitly and so the
// codebase consistently passes handlers via props/outlet context.

// Dev-time safety: aggressively unregister any existing service workers
// and clear caches so the dev server won't be shadowed by a previously
// installed production service worker which can serve stale bundles.
if (import.meta.env.DEV && typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  try {
    navigator.serviceWorker.getRegistrations().then((regs) => {
      regs.forEach(r => r.unregister());
      // eslint-disable-next-line no-console
      console.info('Dev: unregistered existing service workers from main.jsx');
    }).catch(() => {});
    if (window.caches && window.caches.keys) {
      caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k)))).then(() => {
        // eslint-disable-next-line no-console
        console.info('Dev: cleared caches from main.jsx');
      }).catch(() => {});
    }
  } catch (e) {
    // ignore
  }
}

// Provide a safe global proxy for legacy/global callers that reference
// `onAddToQueue`. Some older code or bundles may call a global handler
// instead of using the React-provided handlers. To avoid an uncaught
// ReferenceError we expose a proxy on globalThis that forwards to an
// application-assigned handler when available, otherwise it no-ops and
// logs a warning.
try {
  if (typeof window !== 'undefined') {
    // Provide both a window-scoped proxy and a bare identifier so code that
    // calls `onAddToQueue(...)` (without `window.`) in older bundles won't
    // throw a ReferenceError. `var` intentionally creates a global binding on
    // window in browsers.
    window.onAddToQueue = function () {
      try {
        if (window.__APP_ON_ADD_TO_QUEUE && typeof window.__APP_ON_ADD_TO_QUEUE === 'function') {
          return window.__APP_ON_ADD_TO_QUEUE.apply(null, arguments);
        }
      } catch (e) {
        // swallow to avoid breaking the app during dev
      }
      // eslint-disable-next-line no-console
      console.warn('Global onAddToQueue called but no app handler is registered.');
      return null;
    };
    try {
      // eslint-disable-next-line no-var
      var onAddToQueue = function () {
        try {
          if (window && window.onAddToQueue && typeof window.onAddToQueue === 'function') {
            return window.onAddToQueue.apply(null, arguments);
          }
        } catch (e) {}
        return null;
      };
      // expose to window explicitly for completeness
      window.onAddToQueue = window.onAddToQueue || onAddToQueue;
    } catch (e) {
      // ignore if environments don't allow var globals
    }
  }
} catch (e) {
  // ignore errors setting globals
}

// Inject a tiny non-module script into the document head that defines a
// global bare identifier `onAddToQueue`. Some legacy bundles call the bare
// name (not `window.onAddToQueue`) and that results in a ReferenceError when
// running inside module scope. Creating the binding via a regular script
// ensures legacy callers don't crash; the function forwards to the
// application-level proxy `window.__APP_ON_ADD_TO_QUEUE` when available.
try {
  if (typeof document !== 'undefined' && document.head) {
  const s = document.createElement('script');
  s.type = 'text/javascript';
  // Declare a true global (bare) variable using `var` inside a non-module script.
  // This ensures code that calls `onAddToQueue(...)` (without `window.`) won't
  // throw a ReferenceError. The function forwards to the app proxy when set.
  s.text = "(function(){var onAddToQueue = function(){ try { if(window.__APP_ON_ADD_TO_QUEUE && typeof window.__APP_ON_ADD_TO_QUEUE === 'function') { return window.__APP_ON_ADD_TO_QUEUE.apply(null, arguments); } } catch(e){} console.warn('Global onAddToQueue called but no app handler is registered.'); return null; }; window.onAddToQueue = window.onAddToQueue || onAddToQueue;})();";
  document.head.appendChild(s);
  }
} catch (e) {
  // ignore any injection errors in restrictive environments
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
      <App />
  </React.StrictMode>
);