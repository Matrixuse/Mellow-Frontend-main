import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPlaylistRecommendations } from '../api/userService';
import { FavoritesContext } from '../contexts/FavoritesContext';
import { Heart } from 'lucide-react';
import ImageWithFallback from '../components/ImageWithFallback';

import { useOutletContext } from 'react-router-dom';

const RecommendationsPage = () => {
    const outlet = useOutletContext() || {};
    const { token, onPlayPlaylist, onAddToQueue, onAddToPlaylist } = outlet;
    const navigate = useNavigate();
    const [recs, setRecs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const { isPlaylistFavorite, togglePlaylistFavorite } = useContext(FavoritesContext);

    useEffect(() => {
        const load = async () => {
            if (!token) return;
            setLoading(true);
            setError(null);
            try {
                const data = await getPlaylistRecommendations(token);
                setRecs(data || []);
            } catch (err) {
                console.error('Failed to fetch recommendations', err);
                setError(err.message || 'Failed to load recommendations');
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [token]);

    return (
        <div className="flex-1 flex flex-col h-full min-h-0 min-w-0 bg-gray-900">
            <div className="p-4 md:p-6 border-b border-gray-700 bg-gray-800/30">
                <h1 className="text-3xl font-bold text-white">Recommended Playlists</h1>
                <p className="text-gray-400 mt-1">Based on your listening history</p>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-6">
                {loading && (
                    <div className="flex items-center justify-center h-full">
                        <p className="text-gray-400">Loading recommendations...</p>
                    </div>
                )}
                {!loading && error && (
                    <div className="text-center text-red-400">{error}</div>
                )}
                {!loading && !error && recs.length === 0 && (
                    <div className="flex items-center justify-center h-full flex-col gap-4">
                        <p className="text-gray-400 text-lg">No recommendations available</p>
                        <p className="text-gray-500 text-sm">Listen to songs to receive suggestions</p>
                    </div>
                )}
                {!loading && recs.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                        {recs.map(pl => {
                            const favorited = isPlaylistFavorite(pl.id) || pl.isFavorite;
                            return (
                                <div key={pl.id} className="group cursor-pointer rounded-lg bg-gray-800/50 hover:bg-gray-700/50 p-3 transition-colors relative" onClick={() => navigate(`/playlists/${pl.id}`)}>
                                    <div className="relative mb-3 rounded-lg overflow-hidden bg-gray-800 aspect-square">
                                        <ImageWithFallback src={pl.coverUrl} alt={pl.name} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                                        <button
                                            onClick={(e) => { e.stopPropagation(); togglePlaylistFavorite(pl.id).catch(() => {}); }}
                                            className="absolute top-2 right-2 text-gray-200 hover:text-red-500 focus:outline-none"
                                        >
                                            <Heart size={18} fill={favorited ? 'currentColor' : 'none'} className={favorited ? 'text-red-500' : ''} />
                                        </button>
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="font-semibold text-sm truncate text-white group-hover:text-blue-400">{pl.name}</h3>
                                        <p className="text-xs text-gray-400 truncate">
                                            {pl.songCount} song{pl.songCount !== 1 ? 's' : ''}
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default RecommendationsPage;