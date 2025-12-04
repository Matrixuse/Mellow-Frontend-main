import React, { useState, useEffect } from 'react';
import { Plus, MoreVertical, Play, Trash2, Music } from 'lucide-react';
import { getPlaylists, createPlaylist, deletePlaylist } from '../api/playlistService';

const PlaylistManager = ({ user, onPlayPlaylist, onSelectPlaylist, currentPlaylistId }) => {
    const [playlists, setPlaylists] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [newPlaylistName, setNewPlaylistName] = useState('');
    const [newPlaylistDescription, setNewPlaylistDescription] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [expandedPlaylist, setExpandedPlaylist] = useState(null);

    // Load playlists on component mount
    useEffect(() => {
        if (user?.token) {
            loadPlaylists();
        }
    }, [user, loadPlaylists]);

    const loadPlaylists = async () => {
        try {
            setIsLoading(true);
            setError(null);
            const playlistsData = await getPlaylists(user.token);
            setPlaylists(playlistsData);
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreatePlaylist = async (e) => {
        e.preventDefault();
        if (!newPlaylistName.trim()) return;

        try {
            setIsCreating(true);
            const playlistData = {
                name: newPlaylistName.trim(),
                description: newPlaylistDescription.trim(),
                isPublic: false
            };

            const newPlaylist = await createPlaylist(playlistData, user.token);
            setPlaylists(prev => [newPlaylist, ...prev]);
            setNewPlaylistName('');
            setNewPlaylistDescription('');
            setShowCreateForm(false);
        } catch (err) {
            setError(err.message);
        } finally {
            setIsCreating(false);
        }
    };

    const handleDeletePlaylist = async (playlistId) => {
        if (!window.confirm('Are you sure you want to delete this playlist?')) {
            return;
        }

        try {
            await deletePlaylist(playlistId, user.token);
            setPlaylists(prev => prev.filter(p => p.id !== playlistId));
        } catch (err) {
            setError(err.message);
        }
    };

    const handlePlayPlaylist = (playlist) => {
        if (onPlayPlaylist) {
            onPlayPlaylist(playlist);
        }
    };

    const handleSelectPlaylist = (playlist) => {
        if (onSelectPlaylist) {
            onSelectPlaylist(playlist);
        }
    };

    if (isLoading) {
        return (
            <div className="mb-8">
                <h3 className="text-xl font-bold mb-4">My Playlists</h3>
                <div className="text-center text-gray-400 py-4">
                    Loading playlists...
                </div>
            </div>
        );
    }

    return (
        <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold">My Playlists</h3>
                <button
                    onClick={() => setShowCreateForm(true)}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                    <Plus size={16} />
                    New Playlist
                </button>
            </div>

            {error && (
                <div className="text-red-400 text-sm mb-4 p-3 bg-red-900/20 rounded-lg">
                    {error}
                </div>
            )}

            {/* Create Playlist Form */}
            {showCreateForm && (
                <div className="mb-4 p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                    <form onSubmit={handleCreatePlaylist} className="space-y-3">
                        <div>
                            <input
                                type="text"
                                placeholder="Playlist name"
                                value={newPlaylistName}
                                onChange={(e) => setNewPlaylistName(e.target.value)}
                                className="w-full px-3 py-2 bg-gray-700 text-white rounded-md border border-gray-600 focus:border-blue-500 focus:outline-none"
                                required
                            />
                        </div>
                        <div>
                            <input
                                type="text"
                                placeholder="Description (optional)"
                                value={newPlaylistDescription}
                                onChange={(e) => setNewPlaylistDescription(e.target.value)}
                                className="w-full px-3 py-2 bg-gray-700 text-white rounded-md border border-gray-600 focus:border-blue-500 focus:outline-none"
                            />
                        </div>
                        <div className="flex gap-2">
                            <button
                                type="submit"
                                disabled={isCreating || !newPlaylistName.trim()}
                                className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                            >
                                {isCreating ? 'Creating...' : 'Create'}
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setShowCreateForm(false);
                                    setNewPlaylistName('');
                                    setNewPlaylistDescription('');
                                }}
                                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Playlists Grid */}
            {playlists.length === 0 ? (
                <div className="text-center text-gray-400 py-8">
                    <Music size={48} className="mx-auto mb-4 text-gray-600" />
                    <p className="text-lg mb-2">No playlists yet</p>
                    <p className="text-sm">Create your first playlist to organize your favorite songs!</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                    {playlists.map((playlist) => (
                        <div
                            key={playlist.id}
                            className={`group relative bg-gray-800/50 hover:bg-gray-700/80 p-4 rounded-lg cursor-pointer transition-all duration-300 ${
                                currentPlaylistId === playlist.id ? 'ring-2 ring-blue-500' : ''
                            }`}
                            onClick={() => handleSelectPlaylist(playlist)}
                        >
                            <div className="relative mb-3">
                                {playlist.coverUrl ? (
                                    <img
                                        src={playlist.coverUrl}
                                        alt={playlist.name}
                                        className="w-full h-auto aspect-square rounded-md object-cover"
                                        onError={(e) => {
                                            e.target.onerror = null;
                                            e.target.src = 'https://placehold.co/400x400/4A5568/FFFFFF?text=♪';
                                        }}
                                    />
                                ) : (
                                    <div className="w-full aspect-square rounded-md bg-gray-700 flex items-center justify-center">
                                        <Music size={32} className="text-gray-400" />
                                    </div>
                                )}
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 rounded-md flex items-center justify-center transition-all duration-300">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handlePlayPlaylist(playlist);
                                        }}
                                        className="w-12 h-12 bg-white/0 group-hover:bg-white/20 rounded-full flex items-center justify-center transition-all duration-300 opacity-0 group-hover:opacity-100"
                                    >
                                        <Play size={24} className="text-white fill-current" />
                                    </button>
                                </div>
                            </div>
                            <div className="flex flex-col justify-start flex-grow">
                                <h4 className="text-sm font-semibold text-white truncate mb-1">
                                    {playlist.name}
                                </h4>
                                <p className="text-xs text-gray-400 truncate">
                                    {playlist.songCount} song{playlist.songCount !== 1 ? 's' : ''}
                                </p>
                                {playlist.description && (
                                    <p className="text-xs text-gray-500 truncate mt-1">
                                        {playlist.description}
                                    </p>
                                )}
                            </div>
                            
                            {/* Dropdown Menu */}
                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <div className="relative">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setExpandedPlaylist(expandedPlaylist === playlist.id ? null : playlist.id);
                                        }}
                                        className="p-1 rounded-full bg-black/50 hover:bg-black/70 text-white"
                                    >
                                        <MoreVertical size={16} />
                                    </button>
                                    
                                    {expandedPlaylist === playlist.id && (
                                        <div className="absolute top-8 right-0 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-10 min-w-[120px]">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDeletePlaylist(playlist.id);
                                                    setExpandedPlaylist(null);
                                                }}
                                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-gray-700 rounded-t-lg"
                                            >
                                                <Trash2 size={14} />
                                                Delete
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default PlaylistManager;
