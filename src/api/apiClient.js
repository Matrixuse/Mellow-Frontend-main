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
  if (!base) return path;
  return `${base.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
}

export async function fetchWithFallback(method, apiPath, { body = null, token = null, headers = {} } = {}) {
  const candidates = [];
  const configured = getConfiguredBase();

  // If we're running the frontend on a local host, prefer localhost backend first.
  const isLocalHost = (typeof window !== 'undefined') && (['localhost', '127.0.0.1', '::1'].includes(window.location.hostname));
  if (isLocalHost) {
    candidates.push('http://localhost:5000');
    if (configured) candidates.push(configured);
    candidates.push('');
  } else {
    // default: try configured host (prod or env override), then localhost, then relative
    candidates.push(configured);
    candidates.push('http://localhost:5000');
    candidates.push('');
  }

  let lastErr = null;
  for (const base of candidates) {
    const url = base ? joinUrl(base, `api${apiPath.startsWith('/') ? apiPath : `/${apiPath}`}`) : joinUrl('', `api${apiPath.startsWith('/') ? apiPath : `/${apiPath}`}`);
    try {
      const opts = { method, headers: { ...(headers || {}) } };
      if (body) {
        opts.body = typeof body === 'string' ? body : JSON.stringify(body);
        opts.headers['Content-Type'] = opts.headers['Content-Type'] || 'application/json';
      }
      if (token) opts.headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(url, opts);
      // parse body once for all branches
      const parsed = await parseResponseOnce(res);
      if (res.ok) {
        return parsed;
      }
      // if 404 try next candidate, otherwise surface parsed error
      if (res.status === 404) {
        lastErr = parsed;
        continue;
      }
      throw new Error(parsed && parsed.message ? parsed.message : `Request failed: ${res.status}`);
    } catch (err) {
      // network error or parse error — remember and continue to next candidate
      lastErr = err;
      continue;
    }
  }

  // all candidates exhausted
  throw new Error(lastErr && lastErr.message ? lastErr.message : 'All API hosts failed');
}

export default { fetchWithFallback };
