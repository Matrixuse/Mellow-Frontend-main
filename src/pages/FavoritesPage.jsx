import React, { useState, useEffect, useContext, useMemo } from 'react';
import { Heart, Play, Pause, X, ChevronDown, MoreVertical, Search } from 'lucide-react';
import ImageWithFallback from '../components/ImageWithFallback';
import { getFavoriteSongs, getFavoritePlaylists, toggleFavoriteSong, toggleFavoritePlaylist } from '../api/favoritesService';
import { getPlaylistById } from '../api/playlistService';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { FavoritesContext } from '../contexts/FavoritesContext';

const FavoritesPage = () => {
    const outlet = useOutletContext() || {};
    const { token, onSelectSong, currentSongId, isPlaying, onAddToQueue, onAddToPlaylist } = outlet;
    const navigate = useNavigate();

    const [activeTab, setActiveTab] = useState('songs');
    const [favoriteSongs, setFavoriteSongs] = useState([]);
    const [favoritePlaylists, setFavoritePlaylists] = useState([]);
    const [loadingSongs, setLoadingSongs] = useState(false);
    const [loadingPlaylists, setLoadingPlaylists] = useState(false);
    const [menuOpenSongId, setMenuOpenSongId] = useState(null);
    const [menuOpenPlaylistId, setMenuOpenPlaylistId] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    const favoritesCtx = useContext(FavoritesContext);

    // Safe selector: call outlet handler if present, otherwise dispatch fallback event
    const safeSelectSong = (song) => {
        try {
            if (typeof onSelectSong === 'function') return onSelectSong(song.id || song, { source: 'favorites' });
            const evt = new CustomEvent('play-song-from-favorites', { detail: song });
            window.dispatchEvent(evt);
        } catch (e) {}
    };

    const loadFavorites = async () => {
        try {
            setLoadingSongs(true);
            const songs = await getFavoriteSongs(token);
            setFavoriteSongs(songs || []);
        } catch (err) {
            // fallback to context ids if API is missing
            if (favoritesCtx && Array.isArray(favoritesCtx.favoriteSongIds) && favoritesCtx.favoriteSongIds.length > 0) {
                const fetched = [];
                for (const sid of favoritesCtx.favoriteSongIds) {
                    try {
                        const res = await fetch(`${import.meta.env.VITE_API_URL || 'https://mellow-backend-main.onrender.com'}/api/songs/${sid}`, { headers: { Authorization: `Bearer ${token}` } });
                        if (res.ok) {
                            const s = await res.json();
                            fetched.push({ ...s, id: s._id || s.id });
                        }
                    } catch (e) { /* ignore */ }
                }
                setFavoriteSongs(fetched);
            } else {
                setFavoriteSongs([]);
            }
        } finally {
            setLoadingSongs(false);
        }

        try {
            setLoadingPlaylists(true);
            const playlists = await getFavoritePlaylists(token);
            if (Array.isArray(playlists) && playlists.length === 0 && favoritesCtx && Array.isArray(favoritesCtx.favoritePlaylistIds) && favoritesCtx.favoritePlaylistIds.length > 0) {
                const fetched = [];
                for (const pid of favoritesCtx.favoritePlaylistIds) {
                    try {
                        const p = await getPlaylistById(pid, token);
                        if (p) fetched.push({ ...p, id: p._id || p.id });
                    } catch (e) { /* ignore */ }
                }
                setFavoritePlaylists(fetched);
            } else {
                setFavoritePlaylists(playlists || []);
            }
        } catch (err) {
            if (favoritesCtx && Array.isArray(favoritesCtx.favoritePlaylistIds) && favoritesCtx.favoritePlaylistIds.length > 0) {
                const fetched = [];
                for (const pid of favoritesCtx.favoritePlaylistIds) {
                    try {
                        const p = await getPlaylistById(pid, token);
                        if (p) fetched.push({ ...p, id: p._id || p.id });
                    } catch (e) { /* ignore */ }
                }
                setFavoritePlaylists(fetched);
            } else {
                setFavoritePlaylists([]);
            }
        } finally {
            setLoadingPlaylists(false);
        }
    };

    useEffect(() => {
        if (token) loadFavorites();
    }, [token]);

    useEffect(() => {
        if (!favoritesCtx) return;
        // refresh lists when context ids change
        loadFavorites();
    }, [favoritesCtx && favoritesCtx.favoriteSongIds, favoritesCtx && favoritesCtx.favoritePlaylistIds]);

    const handleRemoveFavoriteSong = async (songId) => {
        try {
            await toggleFavoriteSong(songId, token);
            setFavoriteSongs(prev => prev.filter(s => String(s.id) !== String(songId)));
        } catch (err) {
            console.error('Failed to remove favorite:', err);
        }
    };

    const handleRemoveFavoritePlaylist = async (playlistId) => {
        try {
            await toggleFavoritePlaylist(playlistId, token);
            setFavoritePlaylists(prev => prev.filter(p => String(p.id) !== String(playlistId)));
        } catch (err) {
            console.error('Failed to remove favorite playlist:', err);
        }
    };

    const filteredFavoriteSongs = useMemo(() => {
        if (!searchTerm.trim()) return favoriteSongs;
        const term = searchTerm.toLowerCase();
        return favoriteSongs.filter(song => (song.title || '').toLowerCase().includes(term) || (Array.isArray(song.artist) ? song.artist.join(' ').toLowerCase().includes(term) : (song.artist || '').toLowerCase().includes(term)));
    }, [favoriteSongs, searchTerm]);

    return (
        <div className="flex-1 flex flex-col h-full min-h-0 min-w-0 bg-gray-900">
            <div className="p-2 md:p-3 border-b border-gray-500 bg-gray-600/30">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                        <Heart className="text-red-500" size={20} fill="currentColor" />
                        <h3 className="text-lg font-semibold text-white">Your Favorites</h3>
                    </div>
                    {activeTab === 'songs' && (
                        <div className="relative w-45">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                            <input
                                type="text"
                                placeholder="Search favorites..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-40 bg-gray-800/40 text-white rounded py-2 pl-10 pr-3 text-sm focus:outline-none focus:bg-gray-800"
                                autoComplete="off"
                            />
                            {searchTerm && (
                                <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white">
                                    <X size={16} />
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <div className="flex border-b border-gray-400 bg-gray-500/20">
                <button
                    onClick={() => setActiveTab('songs')}
                    className={`flex-1 py-3 px-4 text-center font-semibold transition-colors ${activeTab === 'songs' ? 'border-b-2 border-blue-500 text-blue-400' : 'text-gray-400 hover:text-white'}`}
                >
                    Favorite Songs
                </button>
                <button
                    onClick={() => setActiveTab('playlists')}
                    className={`flex-1 py-3 px-4 text-center font-semibold transition-colors ${activeTab === 'playlists' ? 'border-b-2 border-blue-500 text-blue-400' : 'text-gray-400 hover:text-white'}`}
                >
                    Favorite Playlists
                </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-3 md:p-4 pb-24 md:pb-32">
                <div className="max-w-4xl mx-auto">
                    {activeTab === 'songs' ? (
                        loadingSongs ? (
                            <div className="flex items-center justify-center h-full">
                                <p className="text-gray-400">Loading favorite songs...</p>
                            </div>
                        ) : filteredFavoriteSongs.length === 0 ? (
                            <div className="flex items-center justify-center h-full flex-col gap-3">
                                <Heart size={36} className="text-gray-500" />
                                <p className="text-gray-400 text-base">{searchTerm ? 'No songs match your search' : 'No favorite songs yet'}</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {filteredFavoriteSongs.map((song) => {
                                    const isCurrent = String(song.id) === String(currentSongId);
                                    return (
                                        <div key={song.id} onClick={() => safeSelectSong(song)} className={`flex items-center bg-gray-800/50 rounded-lg p-2 transition-colors cursor-pointer ${isCurrent ? 'bg-blue-700' : 'hover:bg-gray-700/50'}`}>
                                            <div className="relative w-7 h-7 rounded-md overflow-hidden flex-shrink-0 mr-3">
                                                <ImageWithFallback src={song.coverUrl} alt={song.title} className="w-full h-full object-cover" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-medium text-sm truncate text-white">{song.title}</h3>
                                                <p className="text-xs text-gray-400 truncate">{Array.isArray(song.artist) ? song.artist.join(', ') : song.artist}</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button onClick={(e) => { e.stopPropagation(); safeSelectSong(song); }} className="p-2 text-gray-300 hover:text-white" aria-label="Play">
                                                    {isCurrent && isPlaying ? <Pause size={16} /> : <Play size={16} />}
                                                </button>
                                                <div className="relative song-menu">
                                                    <button onClick={(e) => { e.stopPropagation(); setMenuOpenSongId(menuOpenSongId === song.id ? null : song.id); }} className="p-2 text-gray-400 hover:text-white transition-colors" aria-label="More options">
                                                        <MoreVertical size={16} />
                                                    </button>
                                                    {menuOpenSongId === song.id && (
                                                        <div className="absolute right-0 top-full mt-1 w-40 bg-gray-800 rounded-md shadow-lg border border-gray-700 z-10">
                                                            <button onClick={(e) => { e.stopPropagation(); if (onAddToPlaylist) onAddToPlaylist(song.id); setMenuOpenSongId(null); }} className="w-full text-left px-3 py-2 text-sm text-white hover:bg-gray-700 flex items-center gap-2"><ChevronDown size={14} />Add to Playlist</button>
                                                            <button onClick={(e) => { e.stopPropagation(); if (onAddToQueue) onAddToQueue(song); setMenuOpenSongId(null); }} className="w-full text-left px-3 py-2 text-sm text-white hover:bg-gray-700 flex items-center gap-2"><Play size={14} className="rotate-90" />Add to Queue</button>
                                                            <button onClick={(e) => { e.stopPropagation(); handleRemoveFavoriteSong(song.id); setMenuOpenSongId(null); }} className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-gray-700 flex items-center gap-2"><Heart size={14} />Remove</button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )
                    ) : (
                        loadingPlaylists ? (
                            <div className="flex items-center justify-center h-full">
                                <p className="text-gray-400">Loading favorite playlists...</p>
                            </div>
                        ) : favoritePlaylists.length === 0 ? (
                            <div className="flex items-center justify-center h-full flex-col gap-3">
                                <Heart size={36} className="text-gray-500" />
                                <p className="text-gray-400 text-base">No favorite playlists yet</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {favoritePlaylists.map((playlist) => (
                                    <div key={playlist.id} onClick={() => navigate(`/playlists/${playlist.id}`)} className="flex items-center bg-gray-800/50 rounded-lg p-2 hover:bg-gray-700/50 transition-colors cursor-pointer">
                                        <div className="relative w-10 h-10 rounded-md overflow-hidden flex-shrink-0 mr-3">
                                            <ImageWithFallback src={playlist.coverUrl} alt={playlist.name} className="w-full h-full object-cover" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-medium text-sm truncate text-white">{playlist.name}</h3>
                                            <p className="text-xs text-gray-400 truncate">{playlist.owner || 'Unknown'}</p>
                                            <p className="text-xs text-gray-500">{playlist.songs ? playlist.songs.length : 0} song{playlist.songs && playlist.songs.length !== 1 ? 's' : ''}</p>
                                        </div>
                                        <div className="relative playlist-menu">
                                            <button onClick={(e) => { e.stopPropagation(); setMenuOpenPlaylistId(menuOpenPlaylistId === playlist.id ? null : playlist.id); }} className="p-2 text-gray-400 hover:text-white transition-colors" aria-label="More options"><MoreVertical size={16} /></button>
                                            {menuOpenPlaylistId === playlist.id && (
                                                <div className="absolute right-0 top-full mt-1 w-48 bg-gray-800 rounded-md shadow-lg border border-gray-700 z-10">
                                                    <button onClick={() => { handleRemoveFavoritePlaylist(playlist.id); setMenuOpenPlaylistId(null); }} className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-gray-700 flex items-center gap-2"><Heart size={14} />Remove</button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )
                    )}
                </div>
            </div>
        </div>
    );
};

export default FavoritesPage;
