// API helpers for user-related endpoints: history, recommendations, follows, feed, profiles
import apiClient from './apiClient';

const BASE_URL = (import.meta && import.meta.env && import.meta.env.VITE_API_URL)
  ? import.meta.env.VITE_API_URL.replace(/\/$/, '')
  : (typeof window !== 'undefined' && window.__API_URL) ? String(window.__API_URL).replace(/\/$/, '') : 'https://mellow-backend-main.onrender.com';
const API_URL = `${BASE_URL}/api`;

async function parseJsonSafe(response) {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch (_) {
    // strip HTML tags if present so error messages aren't full HTML pages
    const stripped = text.replace(/<[^>]+>/g, '').trim();
    return { message: stripped.slice(0, 200) || 'Unexpected response from server' };
  }
}

function requireToken(token) {
  if (!token) {
    throw new Error('Authentication token not provided');
  }
}

export const addListenHistory = async (songId, token) => {
  requireToken(token);
  const res = await fetch(`${API_URL}/users/history`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ songId })
  });
  if (!res.ok) {
    const err = await parseJsonSafe(res);
    throw new Error(err.message || 'Failed to add history');
  }
  return res.json();
};

export const followUser = async (userId, token) => {
  requireToken(token);
  const res = await fetch(`${API_URL}/users/${userId}/follow`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) {
    const err = await parseJsonSafe(res);
    throw new Error(err.message || 'Failed to follow user');
  }
  return res.json();
};

export const unfollowUser = async (userId, token) => {
  requireToken(token);
  const res = await fetch(`${API_URL}/users/${userId}/unfollow`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) {
    const err = await parseJsonSafe(res);
    throw new Error(err.message || 'Failed to unfollow user');
  }
  return res.json();
};

export const getFollowing = async (token) => {
  requireToken(token);
  const res = await fetch(`${API_URL}/users/following`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) {
    const err = await parseJsonSafe(res);
    throw new Error(err.message || 'Failed to fetch following list');
  }
  return res.json();
};

export const getFeed = async (token) => {
  requireToken(token);
  const res = await fetch(`${API_URL}/users/feed`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) {
    const err = await parseJsonSafe(res);
    throw new Error(err.message || 'Failed to fetch feed');
  }
  return res.json();
};

export const getUserProfile = async (userId, token) => {
  requireToken(token);
  const res = await fetch(`${API_URL}/users/${userId}/profile`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) {
    const err = await parseJsonSafe(res);
    throw new Error(err.message || 'Failed to fetch user profile');
  }
  return res.json();
};

export const getPlaylistRecommendations = async (token) => {
  requireToken(token);
  const res = await fetch(`${API_URL}/recommendations/playlists`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) {
    const err = await parseJsonSafe(res);
    throw new Error(err.message || 'Failed to fetch recommendations');
  }
  const data = await res.json();
  // normalize shape similar to playlistService
  return Array.isArray(data) ? data.map(pl => ({
    ...pl,
    id: pl.id || pl._id,
    coverUrl: pl.coverUrl || pl.cover_url || '',
    songCount: pl.songCount || (Array.isArray(pl.songs) ? pl.songs.length : 0)
  })) : data;
};

export const getListenHistory = async (token, limit = 50) => {
  requireToken(token);
  const res = await fetch(`${API_URL}/users/history?limit=${encodeURIComponent(limit)}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  // If server doesn't support GET history (404), return unsupported marker
  if (res.status === 404) {
    return { unsupported: true };
  }
  if (!res.ok) {
    const err = await parseJsonSafe(res);
    throw new Error(err.message || 'Failed to fetch listen history');
  }
  return res.json();
};

export const togglePinPlaylist = async (playlistId, token) => {
  requireToken(token);
  return apiClient.fetchWithFallback('POST', '/users/pin-playlist', { body: { playlistId }, token });
};
