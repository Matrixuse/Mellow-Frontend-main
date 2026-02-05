import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Shuffle, Search, Home, List, X, ChevronDown, Globe, Lock } from 'lucide-react';
import ImageWithFallback from './ImageWithFallback';
import PlayerUI from './PlayerUI';
import { searchPublicPlaylists } from '../api/playlistService';

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
    onNavigatePlaylists = () => {},
    onPlayPause,
    onNext,
    onPrev,
    allSongs = [],
    isPlayerInitialized = false,
    isShuffle = false,
    onShuffleToggle = () => {},
    onTogglePlayerExpand = () => {},
    currentSong: propCurrentSong,
    progress = 0,
    onProgressChange = () => {},
    duration = 0,
    currentTime = 0,
    volume = 1,
    onVolumeChange = () => {},
    isRepeat = false,
    onRepeatToggle = () => {}
}) => {
    const [hoveredSongId, setHoveredSongId] = useState(null);
    const [searchTerm, setSearchTerm] = useState(initialSearchTerm);
    const [audioProgress, setAudioProgress] = useState(0);
    const [showExpandedPlayer, setShowExpandedPlayer] = useState(false);
    const [publicPlaylists, setPublicPlaylists] = useState([]);
    const [loadingPlaylists, setLoadingPlaylists] = useState(false);
    const containerRef = useRef(null);
    const audioRef = useRef(null);

    // Get current song from allSongs or from prop
    const currentSong = propCurrentSong || allSongs.find(s => String(s.id) === String(currentSongId));
    
    // Search public playlists
    useEffect(() => {
        if (searchTerm.trim().length > 0) {
            setLoadingPlaylists(true);
            searchPublicPlaylists(searchTerm)
                .then(results => setPublicPlaylists(results || []))
                .catch(err => {
                    console.error('Failed to search playlists:', err);
                    setPublicPlaylists([]);
                })
                .finally(() => setLoadingPlaylists(false));
        } else {
            setPublicPlaylists([]);
        }
    }, [searchTerm]);
    
    // Update audio progress
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const updateProgress = () => {
            if (audio.duration) {
                setAudioProgress(audio.currentTime / audio.duration);
            }
        };

        audio.addEventListener('timeupdate', updateProgress);
        return () => audio.removeEventListener('timeupdate', updateProgress);
    }, []);
    
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

    const handleMiniPlayerClick = () => {
        setShowExpandedPlayer(true);
    };

    const handleCloseExpandedPlayer = () => {
        setShowExpandedPlayer(false);
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
                <div className={`flex-1 overflow-y-auto custom-scrollbar p-4 md:p-6 ${currentSong && isPlaying ? 'pb-40 md:pb-20' : 'pb-24 md:pb-0'}`}>
                    {/* Public Playlists Section */}
                    {publicPlaylists.length > 0 && (
                        <div className="mb-8">
                            <h2 className="text-xl font-bold mb-4 text-white flex items-center gap-2">
                                <Globe size={20} />
                                Public Playlists
                            </h2>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                                {publicPlaylists.map((playlist) => (
                                    <div
                                        key={playlist.id}
                                        className="group cursor-pointer rounded-lg bg-gray-800/50 hover:bg-gray-700/50 p-3 transition-colors"
                                    >
                                        <div className="relative mb-3 rounded-lg overflow-hidden bg-gray-800 aspect-square">
                                            <ImageWithFallback
                                                src={playlist.coverUrl}
                                                alt={playlist.name}
                                                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                            />
                                        </div>
                                        <div className="min-w-0">
                                            <h3 className="font-semibold text-sm truncate text-white group-hover:text-blue-400">
                                                {playlist.name}
                                            </h3>
                                            <p className="text-xs text-gray-400 truncate">
                                                {playlist.owner}
                                            </p>
                                            <p className="text-xs text-gray-500">
                                                {playlist.songCount} song{playlist.songCount !== 1 ? 's' : ''}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Songs Section */}
                    {filteredSongs && filteredSongs.length > 0 ? (
                        <div>
                            {publicPlaylists.length > 0 && (
                                <h2 className="text-xl font-bold mb-4 text-white">Songs</h2>
                            )}
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
                        </div>
                    ) : (
                        !publicPlaylists.length && (
                            <div className="h-full flex items-center justify-center text-gray-400">
                                <p>No songs found</p>
                            </div>
                        )
                    )}
                </div>
                
                {/* Compact mobile player (matches MobilePlayerBar) */}
                {currentSong && isPlayerInitialized && !showExpandedPlayer && (
                    <div className="fixed bottom-14 left-0 right-0 bg-gray-800 border-t border-gray-700 p-2 z-40 md:hidden">
                        <div onClick={handleMiniPlayerClick} className="w-full flex items-center gap-2 cursor-pointer" role="button" tabIndex={0}>
                            <img src={currentSong.coverUrl} alt={currentSong.title} className="w-9 h-9 rounded-md object-cover flex-shrink-0" onError={(e) => { e.target.onerror = null; e.target.src='https://placehold.co/200x200/1F2937/FFFFFF?text=Music'; }} />
                            <div className="flex-1 min-w-0 text-left">
                                <div className="text-sm font-semibold truncate text-white">{currentSong.title}</div>
                                <div className="text-xs text-gray-400 truncate">{Array.isArray(currentSong.artist) ? currentSong.artist.join(', ') : (currentSong.artist || '')}</div>
                            </div>
                            <button onClick={(e) => { e.stopPropagation(); onShuffleToggle(); }} className={`p-2 transition-colors ${isShuffle ? 'text-blue-400' : 'text-gray-400'}`} title="Shuffle">
                                <Shuffle className="w-5 h-5" />
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); if (typeof onPlayPause === 'function') onPlayPause(); }} className="bg-blue-600 text-white rounded-full p-2 hover:bg-blue-500">
                                {isPlaying ? <Pause size={18} className="text-white" /> : <Play size={18} className="text-white" />}
                            </button>
                        </div>
                    </div>
                )}

                {/* Expanded Full Player Modal */}
                {currentSong && isPlayerInitialized && showExpandedPlayer && (
                    <div className="fixed inset-0 bg-gray-900 z-50 md:hidden flex flex-col">
                        {/* Header with close button */}
                        <div className="p-4 border-b border-gray-700 flex items-center justify-between">
                            <div className="flex-1" />
                            <h2 className="flex-1 text-center font-semibold text-white">Now Playing</h2>
                            <button onClick={handleCloseExpandedPlayer} className="p-2 rounded-full hover:bg-gray-800">
                                <ChevronDown size={24} className="text-white" />
                            </button>
                        </div>
                        {/* Player UI content */}
                        <div className="flex-1 overflow-y-auto">
                            <PlayerUI
                                currentSong={currentSong}
                                isPlaying={isPlaying}
                                onPlayPause={onPlayPause}
                                onNext={onNext}
                                onPrev={onPrev}
                                progress={progress}
                                onProgressChange={onProgressChange}
                                duration={duration}
                                currentTime={currentTime}
                                volume={volume}
                                onVolumeChange={onVolumeChange}
                                isShuffle={isShuffle}
                                onShuffleToggle={onShuffleToggle}
                                isRepeat={isRepeat}
                                onRepeatToggle={onRepeatToggle}
                            />
                        </div>
                    </div>
                )}
                
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
