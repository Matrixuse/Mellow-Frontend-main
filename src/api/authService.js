import apiClient from './apiClient';

async function parseJsonSafe(response) {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch (_) {
    return { message: text?.slice(0, 140) || 'Unexpected response from server' };
  }
}

export const login = async (userData) => {
  try {
    const data = await apiClient.fetchWithFallback('POST', '/auth/login', { body: userData });
    return data;
  } catch (err) {
    const message = err?.message || 'Network error while logging in';
    throw new Error(message);
  }
};

export const register = async (userData) => {
  try {
    const data = await apiClient.fetchWithFallback('POST', '/auth/register', { body: userData });
    return data;
  } catch (err) {
    const message = err?.message || 'Network error while registering';
    throw new Error(message);
  }
};

