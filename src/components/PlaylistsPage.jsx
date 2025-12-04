import React, { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate, useOutletContext } from 'react-router-dom';
import { Plus, Trash2, ArrowLeft } from 'lucide-react';
import { getPlaylists, createPlaylist, addSongToPlaylist, deletePlaylist } from '../api/playlistService';

const PlaylistsPage = () => {
    const outlet = useOutletContext() || {};
    // Prefer token from outlet context (App provides it). If missing (direct navigation/refresh),
    // fall back to localStorage so playlists page still works.
    let token = (outlet.user && outlet.user.token) ? outlet.user.token : null;
    if (!token) {
        try {
            const stored = localStorage.getItem('user');
            if (stored) {
                const parsed = JSON.parse(stored);
                token = parsed && parsed.token ? parsed.token : null;
            }
        } catch (e) {
            // ignore
        }
    }
    const navigate = useNavigate();
    const { search } = useLocation();
    const params = new URLSearchParams(search);
    const addSongId = params.get('add');

    const [playlists, setPlaylists] = useState([]);
    const [loading, setLoading] = useState(false);
    const [creating, setCreating] = useState(false);
    const [addingId, setAddingId] = useState(null);
    const [newName, setNewName] = useState('');
    const [error, setError] = useState(null);
    const [showCreate, setShowCreate] = useState(false);
    const [toast, setToast] = useState(null);
    const containerRef = useRef(null);
    const touchStartX = useRef(0);
    const touchStartY = useRef(0);
    const touchStartTime = useRef(0);

    useEffect(() => {
        if (!token) return;
        setLoading(true);
        getPlaylists(token).then(data => setPlaylists(data || [])).catch(err => setError(err.message || 'Failed to load playlists')).finally(() => setLoading(false));
    }, [token]);

    // Mobile right-swipe to go back gesture. Lightweight and only active on small screens.
    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;

        const onTouchStart = (e) => {
            if (window.innerWidth > 768) return; // only on mobile
            const t = e.touches && e.touches[0];
            if (!t) return;
            touchStartX.current = t.clientX;
            touchStartY.current = t.clientY;
            touchStartTime.current = Date.now();
        };

        const onTouchEnd = (e) => {
            if (window.innerWidth > 768) return;
            const t = (e.changedTouches && e.changedTouches[0]);
            if (!t) return;
            const dx = t.clientX - touchStartX.current;
            const dy = Math.abs(t.clientY - touchStartY.current);
            const dt = Date.now() - touchStartTime.current;
            // Recognize a right swipe: dx > 60px, mostly horizontal, and reasonably quick
            if (dx > 60 && dy < 80 && dt < 700) {
                navigate(-1);
            }
        };

        el.addEventListener('touchstart', onTouchStart, { passive: true });
        el.addEventListener('touchend', onTouchEnd, { passive: true });

        return () => {
            el.removeEventListener('touchstart', onTouchStart);
            el.removeEventListener('touchend', onTouchEnd);
        };
    }, [navigate]);

    const handleCreate = async () => {
        if (!newName.trim()) return;
        setCreating(true);
        try {
            const created = await createPlaylist({ name: newName.trim() }, token);
            setPlaylists(prev => [created, ...prev]);
            setNewName('');
            setShowCreate(false);
        } catch (err) {
            setError(err.message || 'Failed to create playlist');
        } finally {
            setCreating(false);
        }
    };

    const handleDelete = async (playlistId) => {
        if (!window.confirm('Delete this playlist? This cannot be undone.')) return;
        try {
            await deletePlaylist(playlistId, token);
            setPlaylists(prev => prev.filter(p => p.id !== playlistId));
            // If the user was on a playlist detail route, we let navigation handle it by staying here
        } catch (err) {
            alert('Failed to delete playlist: ' + (err.message || err));
        }
    };

    const handleAdd = async (playlistId) => {
        if (!addSongId) return;
        setAddingId(playlistId);
        try {
            await addSongToPlaylist(playlistId, addSongId, token);
            setToast({ type: 'success', message: 'Song added to playlist' });
            // after a short delay, go back to library
            setTimeout(() => navigate('/'), 700);
        } catch (err) {
            setToast({ type: 'error', message: 'Failed to add song: ' + (err.message || err) });
        } finally {
            setAddingId(null);
        }
    };

    return (
        <div className="p-6" ref={containerRef}>
        <div className="w-full mx-auto max-w-6xl">
                <div className="mb-6">
                            <div className="flex items-center gap-3">
                                <button onClick={() => navigate('/')} aria-label="Back to home" className="p-2 rounded-full bg-gray-800 hover:bg-gray-700 text-white shadow-md flex items-center justify-center">
                                    <ArrowLeft size={18} />
                                </button>
                                <h1 className="text-2xl font-bold">Playlists</h1>
                            </div>
                            <div className="mt-3">
                                {!showCreate ? (
                                    <button onClick={() => setShowCreate(true)} className="px-4 py-2 bg-green-600 rounded-full text-white flex items-center gap-2">
                                        <Plus size={14} />
                                        <span>Create Playlist</span>
                                    </button>
                                ) : (
                                    <div className="flex flex-col gap-2 mt-3 w-full max-w-xs">
                                        <input value={newName} onChange={(e) => setNewName(e.target.value)} className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-full text-white" placeholder="Playlist name" />
                                        <div className="flex gap-2">
                                            <button onClick={handleCreate} disabled={creating} className="flex-1 px-3 py-2 bg-green-600 rounded-full text-white">{creating ? 'Creating...' : 'Create'}</button>
                                            <button onClick={() => setShowCreate(false)} className="px-3 py-2 text-gray-400">Cancel</button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                <div>
                    <h3 className="text-lg font-medium mb-3">Your Playlists</h3>
                    {loading ? <p className="text-gray-400">Loading...</p> : playlists.length === 0 ? <p className="text-gray-400">No playlists yet.</p> : (
                        <div className="grid grid-cols-2 gap-3">
                            {playlists.map(pl => (
                                addSongId ? (
                                    <div
                                        key={pl.id}
                                        role="button"
                                        tabIndex={0}
                                        onClick={() => handleAdd(pl.id)}
                                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleAdd(pl.id); } }}
                                        className="bg-gray-800 rounded-md p-2 hover:shadow-md transition-transform transform hover:-translate-y-1 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-600"
                                    >
                                        <div className="flex flex-col items-center text-center">
                                            <img src={pl.coverUrl || 'https://placehold.co/240x240/1F2937/FFFFFF?text=P'} alt={pl.name} className="w-24 h-24 object-cover rounded-md mb-1" />
                                            <div className="text-sm font-semibold text-white truncate w-full">{pl.name}</div>
                                            <div className="text-xs text-gray-400 mb-1">{pl.songs ? pl.songs.length : 0} songs</div>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleAdd(pl.id); }}
                                                    disabled={addingId === pl.id}
                                                    className={`px-4 py-1 text-sm ${addingId === pl.id ? 'bg-blue-400' : 'bg-blue-600'} rounded-full text-white`}
                                                >{addingId === pl.id ? 'Adding...' : 'Add'}</button>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div
                                        key={pl.id}
                                        role="button"
                                        tabIndex={0}
                                        className="relative bg-gray-800 rounded-md p-1 hover:shadow-lg transition transform hover:-translate-y-1 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-600 z-30 pointer-events-auto"
                                    >
                                        <div className="flex flex-col items-start text-left">
                                            {/* Overlay to capture card click but let buttons be clickable */}
                                            <button
                                                type="button"
                                                aria-label={`Open playlist ${pl.name}`}
                                                onClick={(e) => {
                                                    try { navigate(`/playlists/${pl.id}`); } catch (err) {}
                                                    setTimeout(() => { if (window.location.pathname !== `/playlists/${pl.id}`) { window.location.href = `/playlists/${pl.id}`; } }, 150);
                                                }}
                                                className="absolute inset-0 z-10 bg-transparent border-0 p-0"
                                            />

                                            <img src={pl.coverUrl || 'https://placehold.co/240x240/1F2937/FFFFFF?text=P'} alt={pl.name} className="w-24 h-24 object-cover rounded-md mb-1 shadow-inner pointer-events-none" />
                                            <div className="w-full flex items-center justify-between">
                                                <div className="text-sm font-semibold text-white truncate pr-2">{pl.name}</div>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleDelete(pl.id); }}
                                                    title="Delete playlist"
                                                    className="px-2 py-1 bg-red-600 hover:bg-red-500 rounded-full text-white z-20 pointer-events-auto flex items-center"
                                                ><Trash2 size={14} /></button>
                                            </div>
                                            {/* song counter removed and Open button removed per request */}
                                        </div>
                                    </div>
                                )
                            ))}
                        </div>
                    )}
                    {error && <p className="text-red-400 mt-2">{error}</p>}
                </div>
            </div>
            {toast && (
                <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-md ${toast.type === 'success' ? 'bg-green-600' : 'bg-rose-600'} text-white`}>{toast.message}</div>
            )}
        </div>
    );
};

export default PlaylistsPage;
