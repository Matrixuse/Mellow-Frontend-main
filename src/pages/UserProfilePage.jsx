import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getUserProfile, followUser, unfollowUser, getFollowing } from '../api/userService';
import { FavoritesContext } from '../contexts/FavoritesContext';
import { Heart } from 'lucide-react';
import ImageWithFallback from '../components/ImageWithFallback';

import { useOutletContext } from 'react-router-dom';

const UserProfilePage = () => {
    const outlet = useOutletContext() || {};
    const { token } = outlet;
    const { id } = useParams();
    const navigate = useNavigate();
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [isFollowing, setIsFollowing] = useState(false);
    const { isPlaylistFavorite, togglePlaylistFavorite } = useContext(FavoritesContext);

    useEffect(() => {
        const load = async () => {
            if (!id || !token) return;
            setLoading(true);
            try {
                const data = await getUserProfile(id, token);
                setProfile(data);
            } catch (err) {
                console.error('Failed to load user profile', err);
                setError(err.message || 'Failed to load profile');
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [id, token]);

    useEffect(() => {
        const checkFollow = async () => {
            if (!token) return;
            try {
                const list = await getFollowing(token);
                setIsFollowing(list.some(u => String(u.id) === String(id)));
            } catch (err) {
                console.error('Failed to fetch following list', err);
            }
        };
        checkFollow();
    }, [id, token]);

    const handleFollowToggle = async () => {
        if (!token) return;
        try {
            if (isFollowing) {
                await unfollowUser(id, token);
                setIsFollowing(false);
            } else {
                await followUser(id, token);
                setIsFollowing(true);
            }
        } catch (err) {
            console.error('Follow toggle error', err);
        }
    };

    const isMe = (() => {
        try {
            const stored = localStorage.getItem('user');
            if (stored) {
                const u = JSON.parse(stored);
                return u && String(u.id) === String(id);
            }
        } catch {};
        return false;
    })();

    return (
        <div className="flex-1 flex flex-col h-full min-h-0 min-w-0 bg-[#0f0f0f]">
            <div className="p-6 border-b border-gray-700 bg-[#1f1f1f]/30 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white">{profile ? profile.name : 'Profile'}</h1>
                    {profile && profile.playlists && (
                        <p className="text-gray-400 mt-1">
                            {profile.playlists.length} public playlist{profile.playlists.length !== 1 ? 's' : ''}
                        </p>
                    )}
                </div>
                {!isMe && token && (
                    <button
                        onClick={handleFollowToggle}
                        className={`px-4 py-2 rounded-full text-white ${isFollowing ? 'bg-blue-600' : 'bg-blue-600'}`}
                    >{isFollowing ? 'Unfollow' : 'Follow'}</button>
                )}
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-6">
                {loading && (
                    <div className="flex items-center justify-center h-full">
                        <p className="text-gray-400">Loading profile...</p>
                    </div>
                )}
                {!loading && error && (
                    <div className="text-center text-red-400">{error}</div>
                )}
                {!loading && profile && (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                        {profile.playlists.map(pl => {
                            const fav = isPlaylistFavorite(pl.id) || pl.isFavorite;
                            return (
                                <div key={pl.id} className="group cursor-pointer rounded-lg bg-[#1f1f1f]/50 hover:bg-[#282828]/50 p-3 transition-colors relative" onClick={() => navigate(`/playlists/${pl.id}`)}>
                                    <div className="relative mb-3 rounded-lg overflow-hidden bg-[#1f1f1f] aspect-square">
                                        <ImageWithFallback src={pl.coverUrl} alt={pl.name} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                                        <button
                                            onClick={(e) => { e.stopPropagation(); togglePlaylistFavorite(pl.id).catch(() => {}); }}
                                            className="absolute top-2 right-2 text-gray-200 hover:text-red-500 focus:outline-none"
                                        >
                                            <Heart size={18} fill={fav ? 'currentColor' : 'none'} className={fav ? 'text-red-500' : ''} />
                                        </button>
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="font-semibold text-sm truncate text-white group-hover:text-red-400">{pl.name}</h3>
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

export default UserProfilePage;