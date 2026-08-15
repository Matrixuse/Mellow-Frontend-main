// Centralized API client with fallback strategy for dev/production
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

function getCandidateBases() {
  const configured = getConfiguredBase();
  const isLocalHost = (typeof window !== 'undefined') && (['localhost', '127.0.0.1', '::1'].includes(window.location.hostname));

  const candidates = isLocalHost
    ? ['http://localhost:5000', 'http://localhost:5001', configured]
    : [configured, 'http://localhost:5000', 'http://localhost:5001'];

  return [...new Set(candidates.filter(Boolean))];
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

      const res = await fetch(url, opts);
      const parsed = await parseResponseOnce(res);

      if (res.ok) return parsed;

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