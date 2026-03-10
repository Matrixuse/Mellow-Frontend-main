import apiClient from './apiClient';
import * as playlistService from './playlistService';

const BASE_URL = (import.meta && import.meta.env && import.meta.env.VITE_API_URL)
    ? import.meta.env.VITE_API_URL.replace(/\/$/, '')
    : (typeof window !== 'undefined' && window.__API_URL) ? String(window.__API_URL).replace(/\/$/, '') : 'https://mellow-backend-main.onrender.com';
const API_URL = `${BASE_URL}/api/search`;

export const searchSongsArtistsPlaylists = async (query, type = 'all', limit = 20) => {
    if (!query || query.trim().length === 0) {
        return { songs: [], artists: [], playlists: [] };
    }
    try {
        const apiPath = `/search?q=${encodeURIComponent(query)}&type=${type}&limit=${limit}`;
        const data = await apiClient.fetchWithFallback('GET', apiPath);
        return {
            songs: (data.songs || []).map(song => ({ ...song, id: song._id || song.id, coverUrl: song.coverUrl || '' })),
            artists: data.artists || [],
            playlists: (data.playlists || []).map(p => ({ ...p, id: p._id || p.id, coverUrl: p.coverUrl || '' }))
        };
    } catch (err) {
        console.warn('Search error (api fallback):', err);
        // Try a best-effort client-side / alternate endpoint fallback for playlists
        try {
            const publicPlaylists = await playlistService.searchPublicPlaylists(query);
            const playlists = (publicPlaylists || []).map(p => ({ id: p._id || p.id, title: p.title || p.name || '', coverUrl: p.coverUrl || p.cover_url || '' , ownerName: p.ownerName || p.userName || '' }));
            // extract songs and artists from returned playlists as a best-effort fallback
            const songs = [];
            const artistsSet = new Set();
            for (const pl of publicPlaylists || []) {
                if (Array.isArray(pl.songs)) {
                    for (const s of pl.songs) {
                        const song = { ...s, id: s._id || s.id || String(s.id || s._id), coverUrl: s.coverUrl || s.cover_url || s.cover || '' };
                        songs.push(song);
                        if (song.artist) artistsSet.add(song.artist);
                    }
                }
                if (pl.ownerName) artistsSet.add(pl.ownerName);
            }
            const artists = Array.from(artistsSet).map(a => ({ name: a }));
            return { songs, artists, playlists };
        } catch (fallbackErr) {
            console.error('Search fallback failed:', fallbackErr);
            return { songs: [], artists: [], playlists: [] };
        }
    }
};
