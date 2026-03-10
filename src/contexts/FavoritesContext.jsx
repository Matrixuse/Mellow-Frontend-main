import React, { createContext, useState, useEffect, useCallback } from 'react';
import {
    getFavoriteSongs,
    getFavoritePlaylists,
    toggleFavoriteSong,
    toggleFavoritePlaylist
} from '../api/favoritesService';
import { getPlaylistById } from '../api/playlistService';

export const FavoritesContext = createContext({
    favoriteSongIds: [],
    favoritePlaylistIds: [],
    isSongFavorite: () => false,
    isPlaylistFavorite: () => false,
    toggleSongFavorite: async () => {},
    togglePlaylistFavorite: async () => {},
    refreshFavorites: async () => {}
});

export const FavoritesProvider = ({ children, token }) => {
    // token passed from caller (App) to avoid separate auth context
    const [favoriteSongIds, setFavoriteSongIds] = useState([]);
    const [favoritePlaylistIds, setFavoritePlaylistIds] = useState([]);

    const loadFavorites = useCallback(async () => {
        console.debug('FavoritesContext.loadFavorites start', { token });
        if (!token) {
            setFavoriteSongIds([]);
            setFavoritePlaylistIds([]);
            return;
        }
        try {
            const songs = await getFavoriteSongs(token);
            console.debug('FavoritesContext.loadFavorites fetched songs', { count: (songs || []).length });
            setFavoriteSongIds((songs || []).map(s => String(s.id)));
        } catch (err) {
            console.error('Error loading favorite songs', err);
            setFavoriteSongIds([]);
        }
        try {
            const playlists = await getFavoritePlaylists(token);
            console.debug('FavoritesContext.loadFavorites fetched playlists', { count: (playlists || []).length });
            // Merge server playlists with any local optimistic overrides
            const serverIds = (playlists || []).map(p => String(p.id));
            try {
                const raw = localStorage.getItem('local_favorite_playlists');
                const overrides = raw ? JSON.parse(raw) : [];
                console.debug('FavoritesContext.loadFavorites local overrides', { overrides });
                const merged = Array.from(new Set([...(serverIds || []), ...(overrides || []).map(String)]));
                console.debug('FavoritesContext.loadFavorites merged ids', { merged });
                setFavoritePlaylistIds(merged);
            } catch (e) {
                setFavoritePlaylistIds(serverIds);
            }
        } catch (err) {
            console.error('Error loading favorite playlists', err);
            // If server failed, still try local overrides so UI can reflect optimistic favorites
            try {
                const raw = localStorage.getItem('local_favorite_playlists');
                const overrides = raw ? JSON.parse(raw) : [];
                console.debug('FavoritesContext.loadFavorites server failed, using overrides', { overrides });
                setFavoritePlaylistIds((overrides || []).map(String));
            } catch (e) {
                setFavoritePlaylistIds([]);
            }
        }
    }, [token]);

    useEffect(() => {
        loadFavorites();
    }, [loadFavorites]);

    const isSongFavorite = useCallback(
        (songId) => {
            if (songId === undefined || songId === null) return false;
            return favoriteSongIds.includes(String(songId));
        },
        [favoriteSongIds]
    );

    const isPlaylistFavorite = useCallback(
        (playlistId) => {
            if (playlistId === undefined || playlistId === null) return false;
            return favoritePlaylistIds.includes(String(playlistId));
        },
        [favoritePlaylistIds]
    );

    const toggleSongFavorite = useCallback(
        async (songId) => {
            if (!token) return false;
            try {
                const result = await toggleFavoriteSong(songId, token);
                setFavoriteSongIds(prev => {
                    const asStr = String(songId);
                    if (result.isFavorited) {
                        return [...new Set([...(prev || []).map(String), asStr])];
                    } else {
                        return (prev || []).map(String).filter(id => id !== asStr);
                    }
                });
                return result.isFavorited;
            } catch (err) {
                console.error('toggleSongFavorite failed', err);
                throw err;
            }
        },
        [token]
    );

    const togglePlaylistFavorite = useCallback(
        async (playlistId) => {
            console.debug('togglePlaylistFavorite called', { playlistId });
            if (!token) {
                console.warn('togglePlaylistFavorite: no token present');
                return false;
            }

            const asStr = String(playlistId);
            const currentlyHas = favoritePlaylistIds.includes(asStr);
            // Optimistic update: add or remove locally while the server call proceeds
            setFavoritePlaylistIds(prev => {
                const prevArr = (prev || []).map(String);
                if (currentlyHas) {
                    return prevArr.filter(id => id !== asStr);
                }
                return [...new Set([...prevArr, asStr])];
            });
            // Persist optimistic choice immediately to local overrides so other pages
            // (which may refresh immediately) can pick it up.
            try {
                const raw = localStorage.getItem('local_favorite_playlists');
                const current = raw ? JSON.parse(raw) : [];
                const setCurrent = Array.isArray(current) ? current.map(String) : [];
                if (!currentlyHas) {
                    if (!setCurrent.includes(asStr)) {
                        setCurrent.push(asStr);
                        localStorage.setItem('local_favorite_playlists', JSON.stringify(setCurrent));
                    }
                } else {
                    const next = setCurrent.filter(id => id !== asStr);
                    localStorage.setItem('local_favorite_playlists', JSON.stringify(next));
                }
            } catch (e) {
                console.warn('Failed to write local_favorite_playlists', e);
            }

            try {
                const result = await toggleFavoritePlaylist(playlistId, token);
                console.debug('togglePlaylistFavorite result', result);

                // Reconcile local state with server response
                setFavoritePlaylistIds(prev => {
                    const asStr2 = String(playlistId);
                    if (result && result.isFavorited) {
                        return [...new Set([...(prev || []).map(String), asStr2])];
                    }
                    return (prev || []).map(String).filter(id => id !== asStr2);
                });

                // If favorited, fetch playlist songs and optimistically add them
                if (result && result.isFavorited) {
                    try {
                        const playlist = await getPlaylistById(playlistId, token);
                        if (playlist && Array.isArray(playlist.songs)) {
                            const newSongIds = playlist.songs.map(s => String(s.id || s._id || (s._id && s._id.$oid) || s.id || s._id));
                            const toAdd = newSongIds.filter(id => !favoriteSongIds.includes(id));
                            if (toAdd.length > 0) {
                                setFavoriteSongIds(prev => [...new Set([...(prev || []).map(String), ...toAdd])]);
                                // Persist on server in background
                                (async () => {
                                    for (const sid of toAdd) {
                                        try { await toggleFavoriteSong(sid, token); } catch (e) { /* ignore */ }
                                    }
                                })();
                            }
                        }
                    } catch (err) {
                        console.error('Failed to add playlist songs to favorites:', err);
                    }
                }

                // Refresh authoritative server state (non-blocking for UX)
                try { await loadFavorites(); } catch (e) { /* ignore */ }
                return Boolean(result && result.isFavorited);
            } catch (err) {
                // Server call failed; persist optimistic choice locally so UI still reflects user's action
                const asStr = String(playlistId);
                setFavoritePlaylistIds(prev => {
                    // If it was already present before optimistic add, remove it; otherwise keep it added
                    const has = (prev || []).map(String).includes(asStr);
                    // keep whatever optimistic state is currently in `prev`
                    return prev || [];
                });
                // On server failure we already persisted optimistic choice earlier; nothing more to do.
                console.warn('togglePlaylistFavorite server call failed — optimistic state persisted locally');
                console.warn('togglePlaylistFavorite failed, using local override', err);
                // return optimistic success so UI updates (we already updated state above)
                return true;
            }
        },
        [token, loadFavorites, favoriteSongIds]
    );

    const refreshFavorites = loadFavorites;

    // Debug: log favorites state changes to help trace UI updates
    useEffect(() => {
        console.debug('Favorites state updated', {
            favoriteSongIds,
            favoritePlaylistIds
        });
    }, [favoriteSongIds, favoritePlaylistIds]);

    return (
        <FavoritesContext.Provider value={{
            favoriteSongIds,
            favoritePlaylistIds,
            isSongFavorite,
            isPlaylistFavorite,
            toggleSongFavorite,
            togglePlaylistFavorite,
            refreshFavorites
        }}>
            {children}
        </FavoritesContext.Provider>
    );
};