import React, { useEffect, useState } from 'react';
import { X, Plus } from 'lucide-react';
import { getPlaylists, createPlaylist, addSongToPlaylist } from '../api/playlistService';
import { useOutletContext } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';

const PlaylistModal = ({ token, onClose, songId, onPlaylistUpdated, allSongs: propAllSongs }) => {
    const [playlists, setPlaylists] = useState([]);
    const [loading, setLoading] = useState(false);
    const [creating, setCreating] = useState(false);
    const [adding, setAdding] = useState(false);
    const [newName, setNewName] = useState('');
    const [mobileCreateOpen, setMobileCreateOpen] = useState(false);
    const navigate = useNavigate();
    const [error, setError] = useState(null);

    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        // determine mobile by viewport width (match Tailwind md breakpoint)
        const mq = window.matchMedia('(max-width: 767px)');
        const onChange = () => setIsMobile(mq.matches);
        onChange();
        mq.addEventListener ? mq.addEventListener('change', onChange) : mq.addListener(onChange);
        return () => mq.removeEventListener ? mq.removeEventListener('change', onChange) : mq.removeListener(onChange);
    }, []);

    const outlet = useOutletContext() || {};
    // Prefer explicit prop when PlaylistModal is opened from App; otherwise fall back to outlet context
    const allSongs = propAllSongs || outlet.allSongs || outlet.songs || [];

    useEffect(() => {
        if (!token) return;
        setLoading(true);
        getPlaylists(token)
            .then((data) => setPlaylists(data || []))
            .catch(err => setError(err.message || 'Failed to load playlists'))
            .finally(() => setLoading(false));
    }, [token]);

    const handleCreate = async () => {
        if (!newName.trim()) return;
        setCreating(true);
        try {
            const created = await createPlaylist({ name: newName.trim() }, token);
            setPlaylists(prev => [created, ...prev]);
            setNewName('');
            onPlaylistUpdated && onPlaylistUpdated(created);
        } catch (err) {
            setError(err.message || 'Failed to create playlist');
        } finally {
            setCreating(false);
        }
    };

    const handleAdd = async (playlistId) => {
        // Client-side sanity check: do we have this song in the current library?
        if (!songId) {
            alert('No song specified to add.');
            return;
        }

        const found = allSongs && allSongs.find(s => String(s.id) === String(songId));
        if (!found) {
            // give a clearer message and don't blindly call the API
            alert('Song not found in your library. The server may not have the song record.');
            console.warn('PlaylistModal: attempted to add missing songId to playlist', { songId, playlistId, allSongsLength: (allSongs || []).length });
            return;
        }

        try {
            setAdding(true);
            await addSongToPlaylist(playlistId, songId, token);
            // Optionally update UI: notify parent with the playlistId so it can refresh
            setToast({ type: 'success', message: 'Song added to playlist' });
            onPlaylistUpdated && onPlaylistUpdated({ playlistId, songId });
            // Slight delay so user sees toast, then close
            setTimeout(() => {
                onClose && onClose();
            }, 700);
        } catch (err) {
            // if the backend returned a structured error, log it for debugging
            console.error('Failed to add song to playlist', { playlistId, songId, err });
            const msg = err && err.message ? err.message : String(err || 'Unknown error');
            if (msg.toLowerCase().includes('song not found')) {
                setToast({ type: 'error', message: 'Failed: song not found on server' });
            } else {
                setToast({ type: 'error', message: 'Failed: ' + msg });
            }
        } finally {
            setAdding(false);
        }
    };

    const [toast, setToast] = useState(null);
    useEffect(() => {
        if (!toast) return;
        const t = setTimeout(() => setToast(null), 3000);
        return () => clearTimeout(t);
    }, [toast]);

    return (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-60 p-0">
            {/* modal container: on mobile take full screen, on desktop keep centered modal */}
            <div className={`${isMobile ? 'h-full w-full overflow-auto' : 'flex items-center justify-center h-full'}`}>
                <div className={`${isMobile ? 'w-full h-full p-4' : 'w-full max-w-sm md:max-w-md p-4'} bg-gray-900 border border-gray-700 ${isMobile ? '' : 'rounded-lg shadow-lg'} mx-0 md:mx-4`}> 
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-lg font-semibold">{isMobile ? 'Create New Playlist' : 'Add to Playlist'}</h3>
                        <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={18} /></button>
                    </div>

                    {/* Create section */}
                    <div className="mb-4">
                        <label className="text-sm text-gray-300">Create new playlist</label>
                        {isMobile ? (
                            // Mobile: show a single button that reveals a small input when clicked
                            <div className="mt-3">
                                {!mobileCreateOpen ? (
                                    // navigate to playlists page for full create UI (include add song if present)
                                    <button onClick={() => {
                                        const qp = songId ? `?add=${encodeURIComponent(songId)}` : '';
                                        onClose && onClose();
                                        navigate(`/playlists${qp}`);
                                    }} className="w-full px-4 py-3 bg-green-600 rounded-md text-white">Create Playlist</button>
                                ) : (
                                    <div className="flex items-center gap-2">
                                        <input value={newName} onChange={(e) => setNewName(e.target.value)} className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white" placeholder="Playlist name" />
                                        <button onClick={async () => { await handleCreate(); setMobileCreateOpen(false); }} disabled={creating} className="px-3 py-2 bg-green-600 rounded-md text-white">Create</button>
                                        <button onClick={() => { setMobileCreateOpen(false); setNewName(''); }} className="px-3 py-2 text-gray-400">Cancel</button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className={`mt-3 flex ${isMobile ? 'flex-col' : 'flex-col sm:flex-row sm:items-center'} gap-3`}>
                                <input
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    className="w-full px-3 py-3 bg-gray-800 border border-gray-700 rounded-md text-white placeholder-gray-400"
                                    placeholder="Playlist name"
                                />
                                    <button
                                    onClick={handleCreate}
                                    disabled={creating}
                                    className={`w-full ${isMobile ? '' : 'sm:w-auto'} flex items-center justify-center gap-2 px-4 py-3 bg-green-600 rounded-full text-white hover:bg-green-500`}
                                >
                                    <Plus size={14} />
                                    <span className={`hidden sm:inline`}>Create</span>
                                </button>
                            </div>
                        )}
                    </div>

                    <div>
                        <h4 className="text-sm font-medium text-gray-200 mb-2">Your Playlists</h4>
                        {loading ? (
                            <p className="text-gray-400">Loading...</p>
                        ) : playlists.length === 0 ? (
                            <p className="text-gray-400">No playlists yet. Create one above.</p>
                        ) : (
                            <div className={`space-y-3 ${isMobile ? '' : 'max-h-64 md:max-h-72 overflow-y-auto pr-2'}`}>
                                        {playlists.map(pl => (
                                    <div key={pl.id} className={`${isMobile ? 'flex items-center justify-between p-4' : 'flex items-center justify-between p-3'} bg-gray-800 rounded-md`}>
                                        <div className="flex items-center gap-3 min-w-0">
                                            <img src={pl.coverUrl || 'https://placehold.co/80x80/1F2937/FFFFFF?text=P'} alt={pl.name} className="w-10 h-10 rounded-md object-cover" />
                                            <div className="flex-1 min-w-0">
                                                <div className="text-sm font-semibold truncate">{pl.name}</div>
                                                <div className="text-xs text-gray-400">{pl.songs ? pl.songs.length : 0} songs</div>
                                            </div>
                                        </div>
                                        <div className="ml-3 flex items-center gap-2">
                                            <button onClick={() => handleAdd(pl.id)} disabled={!token || adding} className={`px-3 py-1 ${adding ? 'bg-blue-400' : 'bg-blue-600'} disabled:opacity-60 rounded-full text-white text-sm`}>{adding ? 'Adding...' : 'Add'}</button>
                                            {/* Delete button removed from modal per request */}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                        {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
                    </div>
                    {/* Toast */}
                    {toast && (
                        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-md ${toast.type === 'success' ? 'bg-green-600' : 'bg-rose-600'} text-white`}>{toast.message}</div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PlaylistModal;
