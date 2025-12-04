// Local backend base URL for development
// Prefer Vite env var, then runtime window injection, then the live Render URL.
const BASE_URL = (import.meta && import.meta.env && import.meta.env.VITE_API_URL)
  ? import.meta.env.VITE_API_URL.replace(/\/$/, '')
  : (typeof window !== 'undefined' && window.__API_URL) ? String(window.__API_URL).replace(/\/$/, '') : 'https://mellow-backend-main.onrender.com';
const API_URL = `${BASE_URL}/api/playlists`;

async function parseJsonSafe(response) {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch (_) {
    return { message: text?.slice(0, 140) || 'Unexpected response from server' };
  }
}

// Get user's playlists
export const getPlaylists = async (token) => {
  if (!token) {
    console.warn('Authentication token not found, cannot fetch playlists.');
    return [];
  }

  const response = await fetch(API_URL, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  if (!response.ok) {
    const errorData = await parseJsonSafe(response);
    throw new Error(errorData.message || 'Failed to fetch playlists');
  }

  const data = await response.json();
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
  return data;
};

// Get playlist by ID with songs
export const getPlaylistById = async (playlistId, token) => {
  if (!token) {
    throw new Error('Authentication token not found');
  }

  const response = await fetch(`${API_URL}/${playlistId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  if (!response.ok) {
    const errorData = await parseJsonSafe(response);
    throw new Error(errorData.message || 'Failed to fetch playlist');
  }

  const data = await response.json();
  if (data) {
    if (Array.isArray(data.songs)) {
      data.songs = data.songs.map(s => ({
        ...s,
        id: s.id || s._id || (s._id && s._id.$oid) || String(s.id || s._id || (s._id && s._id.$oid)),
        coverUrl: s.coverUrl || s.cover_url || s.cover || ''
      }));
    }
    data.coverUrl = data.coverUrl || data.cover_url || '';
  }
  return data;
};

// Create new playlist
export const createPlaylist = async (playlistData, token) => {
  if (!token) {
    throw new Error('Authentication token not found');
  }

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(playlistData)
  });

  if (!response.ok) {
    const errorData = await parseJsonSafe(response);
    throw new Error(errorData.message || 'Failed to create playlist');
  }

  return response.json();
};

// Update playlist
export const updatePlaylist = async (playlistId, playlistData, token) => {
  if (!token) {
    throw new Error('Authentication token not found');
  }

  const response = await fetch(`${API_URL}/${playlistId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(playlistData)
  });

  if (!response.ok) {
    const errorData = await parseJsonSafe(response);
    throw new Error(errorData.message || 'Failed to update playlist');
  }

  return response.json();
};

// Delete playlist
export const deletePlaylist = async (playlistId, token) => {
  if (!token) {
    throw new Error('Authentication token not found');
  }

  const response = await fetch(`${API_URL}/${playlistId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  if (!response.ok) {
    const errorData = await parseJsonSafe(response);
    throw new Error(errorData.message || 'Failed to delete playlist');
  }

  return response.json();
};

// Add song to playlist
export const addSongToPlaylist = async (playlistId, songId, token) => {
  if (!token) {
    throw new Error('Authentication token not found');
  }

  const response = await fetch(`${API_URL}/${playlistId}/songs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ songId })
  });

  if (!response.ok) {
    const errorData = await parseJsonSafe(response);
    throw new Error(errorData.message || 'Failed to add song to playlist');
  }

  return response.json();
};

// Remove song from playlist
export const removeSongFromPlaylist = async (playlistId, songId, token) => {
  if (!token) {
    throw new Error('Authentication token not found');
  }

  const response = await fetch(`${API_URL}/${playlistId}/songs/${songId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  if (!response.ok) {
    const errorData = await parseJsonSafe(response);
    throw new Error(errorData.message || 'Failed to remove song from playlist');
  }

  return response.json();
};

// Reorder songs in playlist
export const reorderPlaylistSongs = async (playlistId, songIds, token) => {
  if (!token) {
    throw new Error('Authentication token not found');
  }

  const response = await fetch(`${API_URL}/${playlistId}/songs/reorder`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ songIds })
  });

  if (!response.ok) {
    const errorData = await parseJsonSafe(response);
    throw new Error(errorData.message || 'Failed to reorder playlist songs');
  }

  return response.json();
};
