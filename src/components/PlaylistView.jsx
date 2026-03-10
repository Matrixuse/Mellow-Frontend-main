import React, { useState, useEffect, useContext } from 'react';
import { ArrowLeft, Play, MoreVertical, Trash2, Music, Shuffle, Lock, Globe, Heart, Pin } from 'lucide-react';
import { FavoritesContext } from '../contexts/FavoritesContext';
import { getPlaylistById, removeSongFromPlaylist, reorderPlaylistSongs, togglePlaylistVisibility } from '../api/playlistService';
import { togglePinPlaylist } from '../api/userService';
import { Link, useNavigate } from 'react-router-dom';
import ImageWithFallback from './ImageWithFallback';

const PlaylistView = ({ playlistId, user, onPlaySong, onPlayPlaylist, onAddToQueue, currentSongId, isPlaying, onClose, isPlaylistShuffleMode, setIsPlaylistShuffleMode, onUsePlaylistQueue }) => {
    const navigate = useNavigate();
    const { isPlaylistFavorite, togglePlaylistFavorite } = useContext(FavoritesContext);
    const [isFav, setIsFav] = useState(false);
    const [playlist, setPlaylist] = useState(null);
    const [followingMap, setFollowingMap] = useState({});
    const currentUserId = (() => {
        try {
            const u = JSON.parse(localStorage.getItem('user') || '{}');
            return u && u.id ? String(u.id) : null;
        } catch { return null; }
    })();
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [toast, setToast] = useState(null);
    const [expandedMenu, setExpandedMenu] = useState(null);
    const [isDragging, setIsDragging] = useState(false);
    const [draggedIndex, setDraggedIndex] = useState(null);
    const [draggedSongId, setDraggedSongId] = useState(null);
    const [query, setQuery] = useState('');

    const [isPinned, setIsPinned] = useState(false);

    
    // Use prop-passed shuffle state if available, otherwise fall back to local state
    const isShuffleMode = isPlaylistShuffleMode !== undefined ? isPlaylistShuffleMode : false;
    const handleToggleShuffleMode = (newState) => {
        if (setIsPlaylistShuffleMode) {
            setIsPlaylistShuffleMode(newState);
        }
    };

    const loadPlaylist = async () => {
        // reset favorite state when loading a new playlist
        setIsFav(false);
        try {
            setIsLoading(true);
            setError(null);
            const playlistData = await getPlaylistById(playlistId, user.token);
            // Normalize song id field so components can rely on `id`
            if (playlistData && Array.isArray(playlistData.songs)) {
                playlistData.songs = playlistData.songs.map(s => ({
                    ...s,
                    id: s.id || s._id || (s._id && s._id.$oid) || String(s.id || s._id || s._id && s._id.$oid)
                }));
            }
            setPlaylist(playlistData);
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        let mounted = true;
        const doLoad = async () => {
            if (!playlistId || !user?.token) return;
            try {
                setIsLoading(true);
                setError(null);
                const playlistData = await getPlaylistById(playlistId, user.token);
                if (!mounted) return;
                if (playlistData && Array.isArray(playlistData.songs)) {
                    playlistData.songs = playlistData.songs.map(s => ({
                        ...s,
                        id: s.id || s._id || (s._id && s._id.$oid) || String(s.id || s._id || s._id && s._id.$oid)
                    }));
                }
                setPlaylist(playlistData);
                // update favorite banner after loading from server
                if (playlistData && playlistData.id) {
                    setIsFav(isPlaylistFavorite(playlistData.id) || !!playlistData.isFavorite);
                }
            } catch (err) {
                if (!mounted) return;
                setError(err.message);
            } finally {
                if (!mounted) return;
                setIsLoading(false);
            }
        };

        doLoad();
        return () => { mounted = false; };
    }, [playlistId, user?.token]);

    // update pinned status whenever playlist or storage changes
    useEffect(() => {
        const updatePinned = () => {
            try {
                const stored = localStorage.getItem('pinnedPlaylists');
                if (stored && playlist && playlist.id) {
                    const arr = JSON.parse(stored);
                    setIsPinned(arr.some(id => String(id) === String(playlist.id)));
                } else {
                    setIsPinned(false);
                }
            } catch {
                setIsPinned(false);
            }
        };
        updatePinned();
        const onStorage = (e) => {
            if (e.key === 'pinnedPlaylists') {
                updatePinned();
            }
        };
        window.addEventListener('storage', onStorage);
        return () => window.removeEventListener('storage', onStorage);
    }, [playlist]);


    // synchronize favorite flag when playlist object or context changes
    useEffect(() => {
        if (playlist && playlist.id) {
            setIsFav(isPlaylistFavorite(playlist.id) || !!playlist.isFavorite);
        }
    }, [playlist, isPlaylistFavorite]);

    const handleRemoveSong = async (songId) => {
        if (!window.confirm('Remove this song from playlist?')) {
            return;
        }

        try {
            await removeSongFromPlaylist(playlistId, songId, user.token);
            setPlaylist(prev => ({
                ...prev,
                songs: prev.songs.filter(song => song.id !== songId),
                songCount: prev.songCount - 1
            }));
            setToast({ type: 'success', message: 'Song removed from playlist' });
        } catch (err) {
            setError(err.message);
        } finally {
            setExpandedMenu(null);
        }
    };

    const handleToggleVisibility = async () => {
        if (!user?.token || !playlistId) {
            console.error('Toggle failed: Missing user token or playlistId', { 
                hasUser: !!user, 
                hasToken: !!user?.token, 
                playlistId 
            });
            setToast({ type: 'error', message: 'Not authenticated' });
            return;
        }
        
        try {
            const result = await togglePlaylistVisibility(playlistId, user.token);
            setPlaylist(prev => ({
                ...prev,
                isPublic: result.isPublic
            }));
            setToast({ 
                type: 'success', 
                message: `Playlist is now ${result.isPublic ? 'public' : 'private'}` 
            });
        } catch (err) {
            console.error('Toggle visibility error:', err);
            setError(err.message);
            setToast({ type: 'error', message: err.message });
        }
    };

    const handleTogglePin = async () => {
        if (!user?.token || !playlistId) {
            setToast({ type: 'error', message: 'Not authenticated' });
            return;
        }
        try {
            const result = await togglePinPlaylist(playlistId, user.token);
            // update local storage copy
            try {
                const stored = localStorage.getItem('pinnedPlaylists');
                let arr = [];
                if (stored) {
                    arr = JSON.parse(stored);
                }
                if (result.pinned) {
                    if (!arr.some(id => String(id) === String(playlistId))) {
                        arr.push(playlistId);
                    }
                } else {
                    arr = arr.filter(id => String(id) !== String(playlistId));
                }
                localStorage.setItem('pinnedPlaylists', JSON.stringify(arr));
            } catch {}
            setIsPinned(result.pinned);
            setToast({ type: 'success', message: result.pinned ? 'Pinned playlist' : 'Unpinned playlist' });
        } catch (err) {
            setToast({ type: 'error', message: 'Failed to toggle pin: ' + (err.message || err) });
            console.error('Toggle pin error:', err);
        }
    };

    // load following list for display toggle
    useEffect(() => {
        const token = user && user.token;
        if (!token) return;
        import('../api/userService').then(m => {
            m.getFollowing(token).then(list => {
                const map = {};
                list.forEach(u => { map[String(u.id)] = true; });
                setFollowingMap(map);
            }).catch(() => {});
        }).catch(() => {});
    }, [user]);

    // auto-hide toast
    useEffect(() => {
        if (!toast) return;
        const id = setTimeout(() => setToast(null), 2500);
        return () => clearTimeout(id);
    }, [toast]);

    const handlePlaySong = (songId) => {
        // Prefer direct app-level playlist queue handler when available so the
        // app can manage playlist-scoped queues consistently.
        const startIndex = playlist.songs.findIndex(s => String(s.id) === String(songId));
        if (onUsePlaylistQueue && typeof onUsePlaylistQueue === 'function') {
            try {
                onUsePlaylistQueue(playlist.songs, startIndex >= 0 ? startIndex : 0, playlist.id);
                return;
            } catch (e) {
                // fallback to onPlaySong below
            }
        }
        if (onPlaySong) {
            // Always pass the original playlist order - handleNext in App.jsx will handle shuffle
            onPlaySong(songId, playlist);
        }
    };

    // playlist 'play all' handler removed; parent handles playing playlists.

    const handleDragStart = (e, index, songId) => {
        setIsDragging(true);
        setDraggedIndex(index);
        setDraggedSongId(songId);
        e.dataTransfer.effectAllowed = 'move';
        // set a simple text payload so drop works cross-browser
        e.dataTransfer.setData('text/plain', String(songId));
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDragEnd = () => {
        setIsDragging(false);
        setDraggedIndex(null);
        setDraggedSongId(null);
    };

    const handleDrop = async (e, dropIndex) => {
        e.preventDefault();
        
        if (draggedIndex === null || draggedIndex === dropIndex) {
            return;
        }

        try {
            // Create new order
            const newSongs = [...playlist.songs];
            const draggedSong = newSongs[draggedIndex];
            newSongs.splice(draggedIndex, 1);
            newSongs.splice(dropIndex, 0, draggedSong);

            // Update local state immediately for better UX
            setPlaylist(prev => ({
                ...prev,
                songs: newSongs
            }));

            // Send to server
            const songIds = newSongs.map(song => song.id);
            await reorderPlaylistSongs(playlistId, songIds, user.token);
        } catch (err) {
            setError(err.message);
            // Reload playlist to restore correct order
            loadPlaylist();
        }
    };

    if (isLoading) {
        return (
            <div className="flex-grow p-4 flex flex-col min-h-0 min-w-0">
                <div className="text-center py-10">
                    <div className="text-gray-400">Loading playlist...</div>
                </div>
            </div>
        );
    }

    if (error || !playlist) {
        return (
            <div className="flex-grow p-4 flex flex-col min-h-0 min-w-0">
                <div className="text-center py-10">
                    <div className="text-red-400 mb-4">{error || 'Playlist not found'}</div>
                    <Link to="/" className="text-blue-400 hover:text-blue-300">
                        Back to Library
                    </Link>
                </div>
            </div>
        );
    }

    // filtered list for search
    const filtered = (playlist && playlist.songs) ? playlist.songs.filter(s => {
        const q = (query || '').toString().trim().toLowerCase();
        if (!q) return true;
        const title = (s.title || '').toString().trim().toLowerCase();
        const artists = (Array.isArray(s.artist) ? s.artist.join(' ') : (s.artist || '')).toString().trim().toLowerCase();
        return title.includes(q) || artists.includes(q);
    }) : [];

    return (
        <div className="flex-grow p-4 flex flex-col min-h-0 min-w-0">
            {/* Header */}
                <div className="flex items-center gap-4 mb-6 flex-shrink-0">
                {/* back button: always visible */}
                <button onClick={onClose} className="inline-flex p-2 rounded-full bg-gray-800 hover:bg-gray-700 mr-2">
                    <ArrowLeft size={24} />
                </button>
                    <div className="flex-1 flex flex-col">
                    <div className="flex items-center gap-2">
                        <h1 className="text-lg md:text-lg font-bold mb-2">{playlist.name}</h1>
                        {playlist.owner && (
                            <div className="flex items-center gap-2">
                                {playlist.owner !== currentUserId && (
                                    <button
                                        onClick={async (e) => {
                                            e.stopPropagation();
                                            const token = user && user.token;
                                            if (!token) return;
                                            try {
                                                const us = await import('../api/userService');
                                                if (followingMap[playlist.owner]) {
                                                    await us.unfollowUser(playlist.owner, token);
                                                    setFollowingMap(prev => ({ ...prev, [playlist.owner]: false }));
                                                } else {
                                                    await us.followUser(playlist.owner, token);
                                                    setFollowingMap(prev => ({ ...prev, [playlist.owner]: true }));
                                                }
                                            } catch (err) {
                                                console.error('follow toggle error', err);
                                            }
                                        }}
                                        className="text-xs text-blue-400 hover:text-blue-200"
                                    >{followingMap[playlist.owner] ? 'Unfollow' : 'Follow'}</button>
                                )}
                            </div>
                        )}
                        {/* removed inline heart button - replaced by action grid on the right */}
                    </div>
                    {playlist.description && (
                        <p className="text-gray-400">{playlist.description}</p>
                    )}
                    <p className="text-sm md:text-sm text-gray-500">
                        {playlist.songCount} song{playlist.songCount !== 1 ? 's' : ''}
                    </p>
                </div>
                {/* Action grid: 2x2 (Shuffle | Favorite) / (Public/Private | Pin) */}
                <div className="ml-auto grid grid-cols-2 gap-2">
                    {/* Top-left: Public / Private (was bottom-left) */}
                    <button
                        onClick={handleToggleVisibility}
                        className={`p-2 rounded-full transition-all ${playlist.isPublic ? 'bg-green-600 hover:bg-green-500 shadow-lg shadow-green-500/30' : 'bg-gray-600 hover:bg-gray-500'}`}
                        title={playlist.isPublic ? "Make private" : "Make public"}
                    >
                        {playlist.isPublic ? (
                            <Globe size={24} className="text-white" />
                        ) : (
                            <Lock size={24} className="text-white" />
                        )}
                    </button>

                    {/* Top-right: Pin (was top-right Favorite) */}
                    <button
                        onClick={(e) => { e.stopPropagation(); handleTogglePin(); }}
                        disabled={!user?.token}
                        title={isPinned ? "Unpin playlist" : "Pin playlist"}
                        className={`p-2 rounded-full transition-all ${!user?.token ? 'bg-gray-500 cursor-not-allowed opacity-50' : isPinned ? 'bg-green-600 hover:bg-green-500 shadow-lg shadow-green-500/30' : 'bg-gray-600 hover:bg-gray-500'}`}
                    >
                        <Pin size={24} className="text-white" />
                    </button>

                    {/* Bottom-left: Shuffle (was top-left) */}
                    {playlist.songs && playlist.songs.length > 0 ? (
                        <button
                            onClick={() => handleToggleShuffleMode(!isShuffleMode)}
                            className={`p-2 rounded-full transition-all ${isShuffleMode ? 'bg-blue-600 shadow-lg shadow-blue-500/50 animate-pulse' : 'bg-gray-600 hover:bg-gray-500'}`}
                            title={isShuffleMode ? "Shuffle is on - songs will play randomly" : "Shuffle is off - click to turn on"}
                        >
                            <Shuffle size={24} className="text-white" />
                        </button>
                    ) : (
                        <div />
                    )}

                    {/* Bottom-right: Favorite (was bottom-right Pin) */}
                    <button
                        onClick={(e) => { e.stopPropagation(); (async () => {
                            try {
                                const newState = await togglePlaylistFavorite(playlist.id);
                                setIsFav(newState);
                                setToast({ type: 'success', message: newState ? 'Added playlist to favorites' : 'Removed playlist from favorites' });
                            } catch (err) {
                                console.error('favorite toggle error:', err);
                                setToast({ type: 'error', message: err.message || 'Failed to update favorite' });
                            }
                        })(); }}
                        disabled={!user?.token}
                        title={isFav ? 'Unfavorite playlist' : 'Favorite playlist'}
                        className={`p-2 rounded-full transition-all ${!user?.token ? 'bg-gray-500 cursor-not-allowed opacity-50' : isFav ? 'bg-red-600 hover:bg-red-500 shadow-lg shadow-red-500/30' : 'bg-gray-600 hover:bg-gray-500'}`}
                    >
                        <Heart size={20} className="text-white" fill={isFav ? 'currentColor' : 'none'} strokeWidth={isFav ? 0 : 2} />
                    </button>
                </div>
            </div>

            {/* Thin search bar for filtering songs in this playlist */}
            <div className="mb-4">
                <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search in playlist"
                    className="w-full max-w-md px-3 py-1 text-sm bg-gray-800 border border-gray-700 rounded-sm placeholder-gray-500 h-8"
                />
            </div>

            {/* Error Display */}
            {error && (
                <div className="text-red-400 text-sm mb-4 p-3 bg-red-900/20 rounded-lg">
                    {error}
                </div>
            )}

            {/* Songs List */}
            <div className="flex-grow overflow-y-auto custom-scrollbar">
                {playlist.songs.length === 0 ? (
                    <div className="text-center py-16">
                        <Music size={64} className="mx-auto mb-4 text-gray-600" />
                        <h3 className="text-xl font-semibold mb-2">Empty Playlist</h3>
                        <p className="text-gray-400">Add some songs to get started!</p>
                    </div>
                ) : (
                    <div>
                        {filtered.length === 0 && (
                            <div className="text-center py-8 text-gray-400">No songs match "{query}"</div>
                        )}
                        {/* Desktop: grid of cards */}
                        <div className="hidden md:grid md:grid-cols-5 md:gap-4 md:auto-rows-fr md:justify-items-center">
                            {filtered.map((song, index) => {
                                const isActive = currentSongId === song.id && isPlaying;
                                return (
                                    <div key={song.id} className={`w-full max-w-[170px] rounded-lg p-2 flex flex-col cursor-pointer ${isDragging ? '' : 'transition-colors'} ${isActive ? 'bg-blue-900/30 ring-2 ring-blue-600' : 'bg-gray-800 hover:bg-gray-700'} ${draggedSongId === song.id ? 'opacity-50' : ''}`} onClick={() => handlePlaySong(song.id)} draggable onDragStart={(e) => handleDragStart(e, index, song.id)} onDragOver={handleDragOver} onDragEnd={handleDragEnd} onDrop={(e) => handleDrop(e, index)}>
                                        <ImageWithFallback src={song.coverUrl} alt={song.title} className="w-full h-24 object-cover rounded-md mb-2" fallback={'https://placehold.co/400x400/1F2937/FFFFFF?text=Music'} />
                                        <div className="flex-1">
                                            <h4 className={`text-sm md:text-base font-semibold truncate ${isActive ? 'text-blue-300' : 'text-white'}`}>{song.title}</h4>
                                            <p className="text-xs md:text-sm text-gray-400">{Array.isArray(song.artist) ? song.artist.join(', ') : song.artist}</p>
                                        </div>
                                        <div className="mt-2 flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <button onClick={(e) => { e.stopPropagation(); handlePlaySong(song.id); }} className="px-2 py-1 bg-blue-600 rounded-md text-white flex items-center gap-2 text-sm"><Play size={12}/>Play</button>
                                            </div>
                                            <div className="relative">
                                                <button onClick={(e) => { e.stopPropagation(); setExpandedMenu(expandedMenu === song.id ? null : song.id); }} className="p-1 rounded-full hover:bg-gray-700"><MoreVertical size={14} /></button>
                                                {expandedMenu === song.id && (
                                                    <div className="absolute right-0 top-10 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-10 min-w-[140px]">
                                                        <button onClick={(e) => { e.stopPropagation(); if (onAddToQueue) { onAddToQueue(song, playlist); setToast({ type: 'success', message: 'Added to queue' }); } else { setToast({ type: 'error', message: 'Queue action not available' }); } setExpandedMenu(null); }} className="w-full text-left px-2 py-2 text-sm text-gray-200 hover:bg-gray-700 flex items-center gap-2"><Play size={14}/>Add to queue</button>
                                                        <button onClick={(e) => { e.stopPropagation(); handleRemoveSong(song.id); }} className="w-full text-left px-2 py-2 text-sm text-red-400 hover:bg-gray-700 flex items-center gap-2"><Trash2 size={14}/>Remove</button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Mobile: vertical list with horizontal bars and 3-dot menu */}
                        <div className="md:hidden space-y-2">
                            {filtered.map((song, index) => (
                                <div key={song.id} className={`flex items-center gap-2 rounded-lg px-2 py-1 ${isDragging ? '' : ''} ${currentSongId === song.id && isPlaying ? 'bg-blue-900/30' : 'bg-gray-800'} ${draggedSongId === song.id ? 'opacity-50' : ''}`} onClick={() => handlePlaySong(song.id)} draggable onDragStart={(e) => handleDragStart(e, index, song.id)} onDragOver={handleDragOver} onDragEnd={handleDragEnd} onDrop={(e) => handleDrop(e, index)}>
                                    <ImageWithFallback src={song.coverUrl} alt={song.title} className="w-10 h-9 rounded-md object-cover" fallback={'https://placehold.co/160x160/1F2937/FFFFFF?text=♪'} />
                                    <div className="flex-1 min-w-0">
                                        <div className="font-medium text-xs md:text-base text-white truncate">{song.title}</div>
                                        <div className="text-[11px] text-gray-400 truncate">{Array.isArray(song.artist) ? song.artist.join(', ') : song.artist}</div>
                                    </div>
                                    <div className="relative">
                                        <button onClick={(e) => { e.stopPropagation(); setExpandedMenu(expandedMenu === song.id ? null : song.id); }} className="p-2 rounded-full hover:bg-gray-700"><MoreVertical size={18} /></button>
                                        {expandedMenu === song.id && (
                                            <div className="absolute right-0 top-10 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-10 min-w-[160px]">
                                                <button onClick={(e) => { e.stopPropagation(); if (onAddToQueue) { onAddToQueue(song, playlist); setToast({ type: 'success', message: 'Added to queue' }); } else { setToast({ type: 'error', message: 'Queue action not available' }); } setExpandedMenu(null); }} className="w-full text-left px-3 py-2 text-sm text-gray-200 hover:bg-gray-700 flex items-center gap-2"><Play size={14}/>Add to queue</button>
                                                <button onClick={(e) => { e.stopPropagation(); handleRemoveSong(song.id); }} className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-gray-700 flex items-center gap-2"><Trash2 size={14}/>Remove</button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
            {toast && (
                <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-md ${toast.type === 'success' ? 'bg-green-600' : 'bg-rose-600'} text-white`}>{toast.message}</div>
            )}
        </div>
    );
};

export default PlaylistView;
