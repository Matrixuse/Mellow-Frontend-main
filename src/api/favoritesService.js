import apiClient from './apiClient';

const BASE_URL = (import.meta && import.meta.env && import.meta.env.VITE_API_URL)
    ? import.meta.env.VITE_API_URL.replace(/\/$/, '')
    : (typeof window !== 'undefined' && window.__API_URL) ? String(window.__API_URL).replace(/\/$/, '') : 'https://mellow-backend-main.onrender.com';
const API_URL = `${BASE_URL}/api/favorites`;

// Toggle favorite song
export const toggleFavoriteSong = async (songId, token) => {
    if (!token) {
        throw new Error('Authentication token not found');
    }
    return apiClient.fetchWithFallback('POST', `/favorites/songs/${songId}`, { token });
};

// Toggle favorite playlist
export const toggleFavoritePlaylist = async (playlistId, token) => {
    if (!token) {
        throw new Error('Authentication token not found');
    }
    return apiClient.fetchWithFallback('POST', `/favorites/playlists/${playlistId}`, { token });
};

// Get user's favorite songs
export const getFavoriteSongs = async (token) => {
    if (!token) {
        throw new Error('Authentication token not found');
    }
    const data = await apiClient.fetchWithFallback('GET', '/favorites/songs', { token });
    return (Array.isArray(data) ? data : []).map(song => ({ ...song, id: song._id || song.id, coverUrl: song.coverUrl || '' }));
};

// Get user's favorite playlists
export const getFavoritePlaylists = async (token) => {
    if (!token) {
        throw new Error('Authentication token not found');
    }
    const data = await apiClient.fetchWithFallback('GET', '/favorites/playlists', { token });
    return (Array.isArray(data) ? data : []).map(playlist => ({ ...playlist, id: playlist._id || playlist.id, coverUrl: playlist.coverUrl || '' }));
};

// Check if a song is favorited
export const isSongFavorited = async (songId, token) => {
    if (!token) {
        throw new Error('Authentication token not found');
    }
    try {
        const data = await apiClient.fetchWithFallback('GET', `/favorites/songs/${songId}/is-favorited`, { token });
        return Boolean(data && data.isFavorited);
    } catch (err) {
        console.error('Failed to check favorite status', err);
        return false;
    }
};

// Check if a playlist is favorited
export const isPlaylistFavorited = async (playlistId, token) => {
    if (!token) {
        throw new Error('Authentication token not found');
    }
    try {
        const data = await apiClient.fetchWithFallback('GET', `/favorites/playlists/${playlistId}/is-favorited`, { token });
        return Boolean(data && data.isFavorited);
    } catch (err) {
        console.error('Failed to check favorite status', err);
        return false;
    }
};
