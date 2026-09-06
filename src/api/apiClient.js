// Centralized API client — always talks to the configured backend only
// Read response body once and return either parsed JSON or a safe message object
async function parseResponseOnce(response) {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch (_) {
    return { message: (text || '').replace(/<[^>]+>/g, '').trim() || 'Unexpected response' };
  }
}

function getConfiguredBase() {
  if (import.meta && import.meta.env && import.meta.env.VITE_API_URL) {
    return String(import.meta.env.VITE_API_URL).replace(/\/$/, '');
  }
  if (typeof window !== 'undefined' && window.__API_URL) {
    return String(window.__API_URL).replace(/\/$/, '');
  }
  // default production host
  return 'https://mellow-backend-main.onrender.com';
}

function joinUrl(base, path) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  if (!base) return normalizedPath;
  return `${base.replace(/\/$/, '')}${normalizedPath}`;
}

// Only ever use the configured backend (VITE_API_URL). No localhost fallbacks.
function getCandidateBases() {
  const configured = getConfiguredBase();
  return [configured].filter(Boolean);
}

// Token refresh state to prevent multiple simultaneous refresh attempts
let refreshPromise = null;

async function attemptTokenRefresh() {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      if (!user.refreshToken) {
        throw new Error('No refresh token available');
      }

      const candidates = getCandidateBases();
      for (const base of candidates) {
        try {
          const url = joinUrl(base, 'api/auth/refresh');
          const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken: user.refreshToken })
          });

          if (res.ok) {
            const data = await res.json();
            if (data.token) {
              // Update token in localStorage
              user.token = data.token;
              localStorage.setItem('user', JSON.stringify(user));
              return data.token;
            }
          } else if (res.status === 401) {
            // Refresh token expired, clear auth
            localStorage.removeItem('user');
            throw new Error('Refresh token expired');
          }
        } catch (err) {
          continue;
        }
      }
      throw new Error('Token refresh failed on all hosts');
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

export async function fetchWithFallback(method, apiPath, { body = null, token = null, headers = {} } = {}) {
  const candidates = getCandidateBases();
  const requestPath = `api${apiPath.startsWith('/') ? apiPath : `/${apiPath}`}`;

  let lastErr = null;
  for (const base of candidates) {
    const url = joinUrl(base, requestPath);
    try {
      const opts = { method, headers: { ...(headers || {}) } };
      if (body) {
        opts.body = typeof body === 'string' ? body : JSON.stringify(body);
        opts.headers['Content-Type'] = opts.headers['Content-Type'] || 'application/json';
      }
      if (token) opts.headers['Authorization'] = `Bearer ${token}`;

      console.debug('[api] request', { method, path: apiPath });
      const res = await fetch(url, opts);
      const parsed = await parseResponseOnce(res);

      console.debug('[api] response', { method, path: apiPath, status: res.status });

      if (res.ok) return parsed;

      // Handle 401 Unauthorized - attempt token refresh
      if (res.status === 401 && token && !apiPath.includes('/auth/')) {
        try {
          const newToken = await attemptTokenRefresh();
          if (newToken) {
            // Retry request with new token
            const retryOpts = { method, headers: { ...opts.headers } };
            retryOpts.headers['Authorization'] = `Bearer ${newToken}`;
            if (body) {
              retryOpts.body = typeof body === 'string' ? body : JSON.stringify(body);
              retryOpts.headers['Content-Type'] = retryOpts.headers['Content-Type'] || 'application/json';
            }
            const retryRes = await fetch(url, retryOpts);
            if (retryRes.ok) {
              return await parseResponseOnce(retryRes);
            }
          }
        } catch (refreshErr) {
          // Refresh failed, continue to throw original error
        }
      }

      if (res.status === 404) {
        lastErr = parsed;
        continue;
      }

      lastErr = new Error(parsed && parsed.message ? parsed.message : `Request failed: ${res.status}`);
      continue;
    } catch (err) {
      lastErr = err;
      continue;
    }
  }

  throw new Error(lastErr && lastErr.message ? lastErr.message : 'All API hosts failed');
}

export default { fetchWithFallback };