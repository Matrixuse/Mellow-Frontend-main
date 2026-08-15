// API helpers for user-related endpoints: history, recommendations, follows, feed, profiles
import apiClient from './apiClient';

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
  return apiClient.fetchWithFallback('POST', '/users/history', { body: { songId }, token });
};

export const followUser = async (userId, token) => {
  requireToken(token);
  return apiClient.fetchWithFallback('POST', `/users/${userId}/follow`, { token });
};

export const unfollowUser = async (userId, token) => {
  requireToken(token);
  return apiClient.fetchWithFallback('POST', `/users/${userId}/unfollow`, { token });
};

export const getFollowing = async (token) => {
  requireToken(token);
  return apiClient.fetchWithFallback('GET', '/users/following', { token });
};

export const getFeed = async (token) => {
  requireToken(token);
  return apiClient.fetchWithFallback('GET', '/users/feed', { token });
};

export const getUserProfile = async (userId, token) => {
  requireToken(token);
  return apiClient.fetchWithFallback('GET', `/users/${userId}/profile`, { token });
};

export const getPlaylistRecommendations = async (token) => {
  requireToken(token);
  const data = await apiClient.fetchWithFallback('GET', '/recommendations/playlists', { token });
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
  try {
    return await apiClient.fetchWithFallback('GET', `/users/history?limit=${encodeURIComponent(limit)}`, { token });
  } catch (err) {
    if (err?.message && /404|not found/i.test(err.message)) return { unsupported: true };
    throw err;
  }
};

export const togglePinPlaylist = async (playlistId, token) => {
  requireToken(token);
  return apiClient.fetchWithFallback('POST', '/users/pin-playlist', { body: { playlistId }, token });
};
