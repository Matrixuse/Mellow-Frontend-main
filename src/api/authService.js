// Local backend base URL for development
// Prefer Vite env var, then a runtime injection (window.__API_URL), then the live Render URL.
const BASE_URL = (import.meta && import.meta.env && import.meta.env.VITE_API_URL)
  ? import.meta.env.VITE_API_URL.replace(/\/$/, '')
  : (typeof window !== 'undefined' && window.__API_URL) ? String(window.__API_URL).replace(/\/$/, '') : 'https://mellow-backend-main.onrender.com';
const API_URL = `${BASE_URL}/api/auth`;

async function parseJsonSafe(response) {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch (_) {
    // When server returns HTML (e.g., error page), surface a readable error
    return { message: text?.slice(0, 140) || 'Unexpected response from server' };
  }
}

export const login = async (userData) => {
    try {
      const response = await fetch(`${API_URL}/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(userData),
      });
      if (!response.ok) {
          const errorData = await parseJsonSafe(response);
          throw new Error(errorData.message || 'Login failed');
      }
      return parseJsonSafe(response);
    } catch (err) {
      // Network/CORS errors end up here
      throw new Error(err?.message || 'Network error while logging in');
    }
};

export const register = async (userData) => {
    try {
      const response = await fetch(`${API_URL}/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(userData),
      });
      if (!response.ok) {
          const errorData = await parseJsonSafe(response);
          throw new Error(errorData.message || 'Registration failed');
      }
      return parseJsonSafe(response);
    } catch (err) {
      throw new Error(err?.message || 'Network error while registering');
    }
};

