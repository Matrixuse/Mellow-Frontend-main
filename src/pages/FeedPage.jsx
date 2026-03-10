import React, { useState, useEffect } from 'react';
import ImageWithFallback from '../components/ImageWithFallback';
import { useOutletContext } from 'react-router-dom';
import queueService from '../services/queueService';

// Recents: show recently played songs for the current user (session-local)
const FeedPage = () => {
    const outlet = useOutletContext() || {};
    const { onPlaySong, songs: allSongs = [] } = outlet;
    const [recents, setRecents] = useState([]);

    useEffect(() => {
        // Try persistent storage first, fall back to in-memory queueService history
        let ids = [];
        try {
            const raw = localStorage.getItem('recentlyPlayed');
            if (raw) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed)) ids = parsed;
            }
        } catch (e) {
            ids = [];
        }

        if (!ids || ids.length === 0) {
            // queueService keeps recent ids in memory as a fallback
            ids = Array.isArray(queueService._recentlyPlayed) ? [...queueService._recentlyPlayed] : [];
        }

        // Show newest first
        ids = ids.slice().reverse();

        // Build map of songs from available songs in outlet/context
        const map = {};
        (allSongs || []).forEach(s => { if (s && s.id) map[s.id] = s; });

        // Map ids to song objects when possible. If song object missing, skip.
        const entries = ids.map(id => map[id]).filter(Boolean);
        setRecents(entries);
    }, [allSongs]);

    return (
        <div className="flex-1 flex flex-col h-full min-h-0 min-w-0 bg-gray-900">
            <div className="p-2 md:p-4 border-b border-gray-700 bg-gray-800/30">
                <h1 className="text-lg ml-2 font-bold text-white">Recents</h1>
                <p className="text-gray-400 mt-1 ml-2">Songs you've listened recently</p>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-6">
                {recents.length === 0 && (
                    <div className="flex items-center justify-center h-full flex-col gap-4">
                        <p className="text-gray-400 text-lg">No recently played songs</p>
                    </div>
                )}
                {recents.length > 0 && (
                    <ul className="space-y-4">
                        {recents.map(song => (
                            <li key={song.id} className="flex items-center gap-3 bg-gray-800/50 p-3 rounded-lg hover:bg-gray-700/50 cursor-pointer" onClick={() => { if (onPlaySong) onPlaySong(song.id); }}>
                                <div className="w-12 h-12">
                                    <ImageWithFallback src={song.coverUrl} alt={song.title} className="w-full h-full object-cover rounded" fallback="https://placehold.co/80x80/1F2937/FFFFFF?text=♪" />
                                </div>
                                <div className="flex-1">
                                    <div className="text-white font-semibold truncate">{song.title}</div>
                                    <div className="text-gray-400 text-xs truncate">{Array.isArray(song.artist) ? song.artist.join(', ') : song.artist}</div>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
};

export default FeedPage;