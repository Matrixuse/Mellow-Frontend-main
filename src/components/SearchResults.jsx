import React, { useState, useRef, useEffect } from 'react';
import { Play, MoreVertical, Search, Home, List, X } from 'lucide-react';
import ImageWithFallback from './ImageWithFallback';

const SearchResults = ({ 
    songs = [], 
    onSelectSong, 
    currentSongId, 
    isPlaying, 
    onAddToQueue,
    onAddToPlaylist,
    onClose,
    initialSearchTerm = '',
    onNavigateHome = () => {},
    onNavigatePlaylists = () => {}
}) => {
    const [hoveredSongId, setHoveredSongId] = useState(null);
    const [searchTerm, setSearchTerm] = useState(initialSearchTerm);
    const containerRef = useRef(null);
    
    // Filter songs based on search term
    const filteredSongs = searchTerm.trim() === '' 
        ? songs 
        : songs.filter(song => {
            const title = (song.title || '').toLowerCase();
            const artists = Array.isArray(song.artist) 
                ? song.artist.map(a => (a || '').toLowerCase()).join(' ')
                : (song.artist || '').toLowerCase();
            const searchLower = searchTerm.toLowerCase();
            return title.includes(searchLower) || artists.includes(searchLower);
        });

    const handlePlayClick = (song, e) => {
        e.stopPropagation();
        onSelectSong(song.id);
    };

    const handleMoreClick = (song, e) => {
        e.stopPropagation();
        // Could open a context menu here
    };

    return (
        <div className="fixed inset-0 bg-gray-900 z-50 md:static overflow-hidden flex flex-col">
            <div className="h-full flex flex-col">
                {/* Search bar - mobile only */}
                <div className="md:hidden p-4 bg-gray-900 border-b border-gray-700">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input 
                            type="text" 
                            placeholder="Search songs or artists..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            autoComplete="off"
                            className="w-full bg-gray-700/60 text-white rounded-full py-2 pl-10 pr-4 text-sm focus:outline-none focus:bg-gray-700"
                        />
                        {searchTerm && (
                            <button 
                                onClick={() => setSearchTerm('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                                aria-label="Clear search"
                            >
                                <X size={18} />
                            </button>
                        )}
                    </div>
                </div>

                {/* Songs grid - 3 columns on mobile, 6 on desktop */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-6 pb-24 md:pb-0">
                    {filteredSongs && filteredSongs.length > 0 ? (
                        <div className="grid grid-cols-3 md:grid-cols-6 gap-4 md:gap-6">
                            {filteredSongs.map((song) => (
                                <div
                                    key={song.id}
                                    onMouseEnter={() => setHoveredSongId(song.id)}
                                    onMouseLeave={() => setHoveredSongId(null)}
                                    onClick={() => onSelectSong(song.id)}
                                    className="group cursor-pointer"
                                >
                                    <div className="relative mb-3 rounded-lg overflow-hidden bg-gray-800 aspect-square">
                                        <ImageWithFallback
                                            src={song.coverUrl}
                                            alt={song.title}
                                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                        />
                                        
                                        {/* Play button on hover or when playing */}
                                        {(hoveredSongId === song.id || (isPlaying && currentSongId === song.id)) && (
                                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                                <button
                                                    onClick={(e) => handlePlayClick(song, e)}
                                                    className="bg-blue-600 text-white rounded-full p-3 hover:bg-blue-500 transition-colors"
                                                    aria-label="Play"
                                                >
                                                    <Play size={20} fill="currentColor" />
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {/* Song info */}
                                    <div className="min-w-0">
                                        <h3 className="font-semibold text-sm truncate text-white group-hover:text-blue-400">
                                            {song.title}
                                        </h3>
                                        <p className="text-xs text-gray-400 truncate">
                                            {Array.isArray(song.artist) ? song.artist.join(', ') : song.artist}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="h-full flex items-center justify-center text-gray-400">
                            <p>No songs found</p>
                        </div>
                    )}
                </div>
                {/* Bottom nav for mobile - custom implementation */}
                <div className="md:hidden border-t border-gray-700 bg-gray-900">
                    <div className="h-14 flex items-center">
                        <div className="w-full flex items-center justify-between px-4">
                            <button 
                                onClick={onNavigateHome} 
                                aria-label="Home"
                                className="flex flex-col items-center text-gray-300 hover:text-white"
                            >
                                <Home className="w-5 h-5" />
                                <span className="text-[10px] mt-0.5">Home</span>
                            </button>
                            <button 
                                onClick={() => {}} 
                                aria-label="Search"
                                className="flex flex-col items-center text-white"
                            >
                                <Search className="w-5 h-5 scale-110" />
                                <span className="text-[10px] mt-0.5 font-semibold">Search</span>
                            </button>
                            <button 
                                onClick={onNavigatePlaylists} 
                                aria-label="Playlists"
                                className="flex flex-col items-center text-gray-300 hover:text-white"
                            >
                                <List className="w-5 h-5" />
                                <span className="text-[10px] mt-0.5">Playlists</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SearchResults;
