import React, { useCallback, useMemo } from 'react';
import { useParams, useOutletContext, useNavigate } from 'react-router-dom';
import PlaylistView from './PlaylistView';
import queueService from '../services/queueService';

const PlaylistPage = () => {
    const { id } = useParams();
    const outlet = useOutletContext();
    const stableOutlet = useMemo(() => outlet || {}, [outlet]);
    const navigate = useNavigate();
    
    // Play a song from a playlist, setting the queue to that playlist's songs
    const handlePlaySongFromPlaylist = useCallback((songId, playlist) => {
        if (!playlist || !playlist.songs || !Array.isArray(playlist.songs)) return;
        // Prefer using an app-level handler to play playlist without overwriting
        // the global queue. If the app provides `onUsePlaylistQueue`, call it
        // so App can manage a separate playlist-scoped queue; otherwise fall
        // back to the legacy behaviour that mutates the global queueService.
        const idx = playlist.songs.findIndex(s => String(s.id) === String(songId));
        const startIndex = idx >= 0 ? idx : 0;
        try {
            if (stableOutlet && typeof stableOutlet.onUsePlaylistQueue === 'function') {
                stableOutlet.onUsePlaylistQueue(playlist.songs, startIndex, playlist.id);
                return;
            }
        } catch (e) {
            // ignore and fallback
        }

        // Fallback: clear and populate global queueService (legacy behaviour)
        queueService.clearQueue();
        queueService.addToQueue(playlist.songs, 'end');
        if (startIndex >= 0) {
            queueService.currentIndex = startIndex;
            if (stableOutlet && typeof stableOutlet.onSelectSong === 'function') {
                stableOutlet.onSelectSong(playlist.songs[startIndex].id);
            }
        }
    }, [stableOutlet]);

    // Play entire playlist from the first song
    const handlePlayPlaylist = useCallback((playlist) => {
        if (!playlist || !playlist.songs || !Array.isArray(playlist.songs) || playlist.songs.length === 0) return;
        try {
            if (stableOutlet && typeof stableOutlet.onUsePlaylistQueue === 'function') {
                stableOutlet.onUsePlaylistQueue(playlist.songs, 0, playlist.id);
                return;
            }
        } catch (e) {}
        // Fallback: legacy behaviour
        queueService.clearQueue();
        queueService.addToQueue(playlist.songs, 'end');
        queueService.currentIndex = 0;
        if (stableOutlet && typeof stableOutlet.onSelectSong === 'function') stableOutlet.onSelectSong(playlist.songs[0].id);
    }, [stableOutlet]);

    // Handler for adding a song to the queue from a playlist context
    const handleAddToQueueFromPlaylist = useCallback((song, playlist) => {
        // Prefer forwarding to the app-level handler (via outlet) so UI state is synced and
        // playlist-aware positioning (next) is applied. If outlet handler isn't available,
        // fall back to queueService and insert 'next'.
        try {
            if (stableOutlet && typeof stableOutlet.onAddToQueue === 'function') {
                stableOutlet.onAddToQueue(song, playlist);
                return;
            }
        } catch (e) {
            // ignore and fallback
        }
        // Fallback: insert after current song
        queueService.addToQueue([song], 'next');
    }, [stableOutlet]);

    // Prefer outlet user (provided by App via Outlet context). If not available (some navigation flows),
    // fall back to reading from localStorage so the page still works after refresh/navigation.
    let user = outlet.user || null;
    if (!user) {
        try {
            const stored = localStorage.getItem('user');
            if (stored) {
                user = JSON.parse(stored);
            }
        } catch (e) {
            // ignore parse errors
        }
    }

    // If still no user, show a small prompt asking the user to connect/login.
    if (!user || !user.token) {
        return (
            <div className="h-full flex items-center justify-center p-6">
                <div className="bg-gray-900 rounded-lg border border-gray-700 p-6 text-center max-w-md">
                    <h2 className="text-xl font-semibold mb-3">Please connect to view this playlist</h2>
                    <p className="text-gray-400 mb-4">You need to be signed in to view and manage playlists.</p>
                    <div className="flex items-center justify-center gap-3">
                        <button onClick={() => navigate('/')} className="px-4 py-2 bg-blue-600 rounded-md text-white">Go to Login</button>
                        <button onClick={() => window.location.href = '/'} className="px-4 py-2 bg-transparent border border-gray-700 rounded-md text-gray-300">Home</button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <PlaylistView
            playlistId={id}
            user={user}
            onPlaySong={(songId, playlist) => handlePlaySongFromPlaylist(songId, playlist)}
            onPlayPlaylist={handlePlayPlaylist}
            onAddToQueue={handleAddToQueueFromPlaylist}
            currentSongId={outlet.currentSongId}
            isPlaying={outlet.isPlaying}
            onClose={() => navigate('/playlists')}
            isPlaylistShuffleMode={outlet.isPlaylistShuffleMode}
            setIsPlaylistShuffleMode={outlet.setIsPlaylistShuffleMode}
            onUsePlaylistQueue={stableOutlet.onUsePlaylistQueue}
        />
    );
};

export default PlaylistPage;
