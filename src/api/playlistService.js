import apiClient from './apiClient';

// Get user's playlists
export const getPlaylists = async (token) => {
  if (!token) {
    // no token: nothing to fetch
    return [];
  }
  const data = await apiClient.fetchWithFallback('GET', '/playlists', { token }).catch(err => { throw err; });
  if (Array.isArray(data)) {
    return data.map(pl => ({
      ...pl,
      coverUrl: pl.coverUrl || pl.cover_url || '',
      songs: Array.isArray(pl.songs) ? pl.songs.map(s => ({
        ...s,
        id: s.id || s._id || (s._id && s._id.$oid) || String(s.id || s._id || (s._id && s._id.$oid)),
        coverUrl: s.coverUrl || s.cover_url || s.cover || ''
      })) : []
    }));
  }
  return data || [];
};

// Get playlist by ID with songs
export const getPlaylistById = async (playlistId, token) => {
  if (!token) throw new Error('Authentication token not found');
  const data = await apiClient.fetchWithFallback('GET', `/playlists/${playlistId}`, { token });
  if (data) {
    if (Array.isArray(data.songs)) {
      data.songs = data.songs.map(s => ({
        ...s,
        id: s.id || s._id || (s._id && s._id.$oid) || String(s.id || s._id || (s._id && s._id.$oid)),
        coverUrl: s.coverUrl || s.cover_url || s.cover || ''
      }));
    }
    data.coverUrl = data.coverUrl || data.cover_url || '';
    data.isFavorite = !!data.isFavorite;
    data.owner = data.owner || data.userId || null;
    data.ownerName = data.ownerName || data.userName || null;
  }
  return data;
};

// Create new playlist
export const createPlaylist = async (playlistData, token) => {
  if (!token) throw new Error('Authentication token not found');
  return apiClient.fetchWithFallback('POST', '/playlists', { body: playlistData, token });
};

// Update playlist
export const updatePlaylist = async (playlistId, playlistData, token) => {
  if (!token) throw new Error('Authentication token not found');
  return apiClient.fetchWithFallback('PUT', `/playlists/${playlistId}`, { body: playlistData, token });
};

// Delete playlist
export const deletePlaylist = async (playlistId, token) => {
  if (!token) throw new Error('Authentication token not found');
  return apiClient.fetchWithFallback('DELETE', `/playlists/${playlistId}`, { token });
};

// Add song to playlist
export const addSongToPlaylist = async (playlistId, songId, token) => {
  if (!token) throw new Error('Authentication token not found');
  return apiClient.fetchWithFallback('POST', `/playlists/${playlistId}/songs`, { body: { songId }, token });
};

// Remove song from playlist
export const removeSongFromPlaylist = async (playlistId, songId, token) => {
  if (!token) throw new Error('Authentication token not found');
  return apiClient.fetchWithFallback('DELETE', `/playlists/${playlistId}/songs/${songId}`, { token });
};

// Reorder songs in playlist
export const reorderPlaylistSongs = async (playlistId, songIds, token) => {
  if (!token) throw new Error('Authentication token not found');
  return apiClient.fetchWithFallback('PUT', `/playlists/${playlistId}/songs/reorder`, { body: { songIds }, token });
};

// Toggle playlist visibility (public/private)
export const togglePlaylistVisibility = async (playlistId, token) => {
  if (!token) throw new Error('Authentication token not found');
  return apiClient.fetchWithFallback('PATCH', `/playlists/${playlistId}/toggle-visibility`, { token });
};

// Search public playlists
export const searchPublicPlaylists = async (query) => {
  if (!query || !query.trim()) return [];
  const data = await apiClient.fetchWithFallback('GET', `/playlists/search/public?q=${encodeURIComponent(query)}`);
  return Array.isArray(data) ? data : [];
};
