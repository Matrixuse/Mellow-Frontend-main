import React, { useState, useRef, useEffect, useCallback, useContext, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Play, Pause, Shuffle, Search, Home, List, X, ChevronDown, Globe, Lock, Heart } from 'lucide-react';
// Context menus intentionally hidden in search results overlay
import { FavoritesContext } from '../contexts/FavoritesContext';
import ImageWithFallback from './ImageWithFallback';
import PlayerUI from './PlayerUI';
import { searchSongsArtistsPlaylists } from '../api/searchService';

const SearchResults = ({ 
    songs = [], 
    onSelectSong, 
    currentSongId, 
    isPlaying, 
    onAddToQueue,
    onAddToPlaylist,
    onReportSong = () => {},
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
    onRepeatToggle = () => {},
    onOpenUpNext = () => {},
    onOpenRelated = () => {}
}) => {
    const { isSongFavorite, toggleSongFavorite, isPlaylistFavorite, togglePlaylistFavorite, refreshFavorites } = useContext(FavoritesContext);
    const navigate = useNavigate();
    const location = useLocation();
    const isActive = (path) => location.pathname.startsWith(path);
    const activeHome = isActive('/');
    const activeSearch = isActive('/search');
    const activeFavs = isActive('/favorites');
    const activePlaylists = isActive('/playlists');
    const activeRecents = isActive('/recents');

    // Helper to close search overlay if open (used by bottom nav buttons)
    function closeSearchOverlayIfOpen() {
        const evt = new CustomEvent('close-search-overlay');
        window.dispatchEvent(evt);
    }

    const goHome = () => navigate('/');
    const openSearch = () => {
        navigate('/search');
        setTimeout(() => {
            const el = searchInputRef.current || document.getElementById('global-search-input');
            if (el) {
                try { el.focus(); } catch {}
                try { el.scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch {}
            }
        }, 150);
    };
    const openPlaylists = () => navigate('/playlists');
    const [hoveredSongId, setHoveredSongId] = useState(null);
    const [searchTerm, setSearchTerm] = useState(initialSearchTerm);
    const [followingMap, setFollowingMap] = useState({});
    const currentUserId = (() => {
        try {
            const u = JSON.parse(localStorage.getItem('user') || '{}');
            return u && u.id ? String(u.id) : null;
        } catch { return null; }
    })();

    // load following list for profile links
    useEffect(() => {
        const token = (() => { try { const u=JSON.parse(localStorage.getItem('user')||'{}'); return u.token; } catch { return null;} })();
        if (token) {
            import('../api/userService').then(m => {
                m.getFollowing(token).then(list => {
                    const map = {};
                    list.forEach(u => { map[String(u.id)] = true; });
                    setFollowingMap(map);
                }).catch(err => {
                    console.warn('Failed to load following list:', err);
                    console.warn('If you see 404 errors, the backend needs to be redeployed. Check Render dashboard for deployment status.');
                    setFollowingMap({});
                });
            });
        }
    }, []);
    const [audioProgress, setAudioProgress] = useState(0);
    const [showExpandedPlayer, setShowExpandedPlayer] = useState(false);
    const [searchResults, setSearchResults] = useState({ songs: [], artists: [], playlists: [] });
    const [isSearching, setIsSearching] = useState(false);
    const containerRef = useRef(null);
    const audioRef = useRef(null);
    const searchTimeoutRef = useRef(null);
    // keep a ref for the search input so we can focus it when the overlay
    // appears (mobile UX improvement)
    const searchInputRef = useRef(null);

    // Debounced search-as-you-type
    const performSearch = useCallback(async (query) => {
        if (!query || query.trim().length === 0) {
            setSearchResults({ songs: [], artists: [], playlists: [] });
            setIsSearching(false);
            return;
        }

        setIsSearching(true);
        try {
            const results = await searchSongsArtistsPlaylists(query, 'all', 30);
            setSearchResults(results);
        } catch (err) {
            console.error('Search error:', err);
            setSearchResults({ songs: [], artists: [], playlists: [] });
        } finally {
            setIsSearching(false);
        }
    }, []);

    // Handle search input with debouncing
    const handleSearchChange = useCallback((e) => {
        const query = e.target.value;
        setSearchTerm(query);

        // Clear existing timeout
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }

        // Set new timeout for debounced search
        searchTimeoutRef.current = setTimeout(() => {
            performSearch(query);
        }, 300); // 300ms debounce delay
    }, [performSearch]);

    // Initial search if initialSearchTerm provided and keep our local state
    // in sync when the prop changes.  This covers the case where the user
    // types their first character in the header; App will open the overlay
    // slightly before React has updated the searchTerm state, so the overlay
    // may mount with an empty term.  Listening for prop changes fixes that.
    useEffect(() => {
        if (initialSearchTerm) {
            setSearchTerm(initialSearchTerm);
            performSearch(initialSearchTerm);
        } else {
            // clear everything if the parent cleared the query
            setSearchTerm('');
            setSearchResults({ songs: [], artists: [], playlists: [] });
        }

        // Cleanup pending timeout on unmount or when query changes
        return () => {
            if (searchTimeoutRef.current) {
                clearTimeout(searchTimeoutRef.current);
            }
        };
    }, [initialSearchTerm, performSearch]);
    
    // Get random songs for default display
    const getRandomSongs = useCallback((count = 30) => {
        if (!allSongs || allSongs.length === 0) return [];
        const shuffled = [...allSongs].sort(() => 0.5 - Math.random());
        return shuffled.slice(0, count);
    }, [allSongs]);

    const randomSongs = useMemo(() => {
        return getRandomSongs(30);
    }, [getRandomSongs]);
    
    // Get current song from allSongs or from prop
    const currentSong = propCurrentSong || allSongs.find(s => String(s.id) === String(currentSongId));
    
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

    const handleMiniPlayerClick = () => {
        setShowExpandedPlayer(true);
    };

    // focus the search field on mount
    useEffect(() => {
        if (searchInputRef.current) {
            searchInputRef.current.focus();
        }
    }, []);

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
                            ref={searchInputRef}
                            type="text" 
                            placeholder="Search songs or artists..." 
                            value={searchTerm}
                            onChange={handleSearchChange}
                            autoComplete="off"
                            className="w-full bg-gray-700/60 text-white rounded-full py-2 pl-10 pr-4 text-sm focus:outline-none focus:bg-gray-700"
                        />
                        {searchTerm && (
                            <button 
                                onClick={() => {
                                    setSearchTerm('');
                                    setSearchResults({ songs: [], artists: [], playlists: [] });
                                }}
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
                    {isSearching && (
                        <div className="flex items-center justify-center h-full">
                            <p className="text-gray-400">Searching...</p>
                        </div>
                    )}

                    {!isSearching && (
                        <>
                            {/* Show a results header when we have a search term and at least one kind of result */}
                            {(searchTerm && (searchResults.songs.length > 0 || searchResults.artists.length > 0 || searchResults.playlists.length > 0)) && (
                                <div className="mb-4">
                                    <p className="text-sm text-gray-400">Results for "{searchTerm}"</p>
                                </div>
                            )}

                            {/* Songs Section - Card View */}
                            {searchResults.songs.length > 0 ? (
                                <div>
                                    {(searchResults.artists.length > 0 || searchResults.playlists.length > 0) && (
                                        <h2 className="text-sm font-bold text-white"></h2>
                                    )}
                                    <div className="grid grid-cols-3 gap-2">
                                    {searchResults.songs.map((song) => {
                                    const fav = isSongFavorite(song.id) || song.isFavorite;
                                    return (
                                        <div
                                            key={song.id}
                                            onClick={() => { if (typeof onSelectSong === 'function') onSelectSong(song.id, { source: 'search' }); }}
                                            role="button"
                                            tabIndex={0}
                                            className="group relative p-1 rounded-lg cursor-pointer bg-gray-800/50 hover:bg-gray-700/80 transition-colors"
                                        >
                                            <div className="relative mb-1">
                                                <ImageWithFallback
                                                    src={song.coverUrl}
                                                    alt={song.title}
                                                    className="w-full h-auto aspect-square rounded-md object-cover"
                                                    fallback={'https://placehold.co/400x400/1F2937/FFFFFF?text=Music'}
                                                />
                                                <div className="absolute bottom-1 right-1 w-7 h-7 bg-blue-600 rounded-full flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Play size={14} className="text-white fill-current" />
                                                </div>
                                            </div>
                                            <h4 className="text-xs font-semibold truncate text-white">{song.title}</h4>
                                        </div>
                                    );
                                })}
                                    </div>
                                </div>
                            ) : (!isSearching && searchTerm && searchResults.songs.length === 0 && searchResults.artists.length === 0 && searchResults.playlists.length === 0) ? (
                                <div className="h-full flex items-center justify-center text-gray-400">
                                    <p>No results found for "{searchTerm}"</p>
                                </div>
                            ) : null}

                            {/* Artists Section */}
                            {searchResults.artists.length > 0 && (
                                <div className="mb-8">
                                    <h2 className="text-sm font-bold mb-4 mt-4 text-white">Related</h2>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                        {searchResults.artists.map((artist) => (
                                            <button
                                                key={artist.name}
                                                onClick={() => { if (artist.name) navigate(`/artist/${encodeURIComponent(artist.name)}`); }}
                                                className="flex items-center gap-1 rounded-lg bg-gray-800/50 hover:bg-gray-700/50 p-2 transition-colors text-left"
                                            >
                                                <div className="w-8 h-8 rounded-md bg-gray-700 flex items-center justify-center text-blue-400 text-lg flex-shrink-0">♪</div>
                                                <div className="min-w-0 flex-1">
                                                   <h3 className="font-semibold text-xs truncate text-white">{artist.name}</h3>
                                                   <p className="text-xs text-gray-400 truncate">{artist.songCount} song{artist.songCount !== 1 ? 's' : ''}</p>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Public Playlists Section */}
                            {searchResults.playlists.length > 0 && (
                                <div className="mb-8">
                                    <h2 className="text-sm font-bold mb-4 mt-4 text-white">Playlists</h2>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                        {searchResults.playlists.map((playlist) => {
                                            return (
                                                <div 
                                                    key={playlist.id} 
                                                    onClick={() => {
                                                        try { if (typeof onClose === 'function') onClose(); } catch (e) {}
                                                        // delay navigation slightly to allow overlay to close smoothly
                                                        setTimeout(() => { try { navigate(`/playlists/${playlist.id}`); } catch (e) {} }, 120);
                                                    }}
                                                    className="flex items-center gap-2 rounded-lg bg-gray-800/50 hover:bg-gray-700/50 p-2 transition-colors cursor-pointer"
                                                    role="button"
                                                    tabIndex={0}
                                                >
                                                    <div className="w-8 h-8 rounded-md overflow-hidden bg-gray-700 flex-shrink-0">
                                                        <ImageWithFallback src={playlist.coverUrl} alt={playlist.name} className="w-full h-full object-cover" />
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <h3 className="font-semibold text-xs truncate text-white">{playlist.name}</h3>
                                                        <p className="text-xs text-gray-400 truncate">{playlist.owner || 'Unknown'}</p>
                                                    </div>
                                                    {/* context menu hidden in search results */}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {!searchTerm && !isSearching && (
                                <div>
                                    <div className="grid grid-cols-3 gap-2">
                                        {randomSongs.map((song) => {
                                            const fav = isSongFavorite(song.id) || song.isFavorite;
                                            return (
                                                <div
                                                    key={song.id}
                                                    onClick={() => { if (typeof onSelectSong === 'function') onSelectSong(song.id, { source: 'search' }); }}
                                                    role="button"
                                                    tabIndex={0}
                                                    className="group relative p-1 rounded-lg cursor-pointer bg-gray-800/50 hover:bg-gray-700/80 transition-colors"
                                                >
                                                    <div className="relative mb-1">
                                                        <ImageWithFallback
                                                            src={song.coverUrl}
                                                            alt={song.title}
                                                            className="w-full h-auto aspect-square rounded-md object-cover"
                                                            fallback={'https://placehold.co/400x400/1F2937/FFFFFF?text=Music'}
                                                        />
                                                        <div className="absolute bottom-1 right-1 w-7 h-7 bg-blue-600 rounded-full flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <Play size={14} className="text-white fill-current" />
                                                        </div>
                                                    </div>
                                                    <h4 className="text-xs font-semibold truncate text-white">{song.title}</h4>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </>
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
                                onOpenUpNext={onOpenUpNext}
                                onOpenRelated={onOpenRelated}
                            />
                        </div>
                    </div>
                )}
                
                {/* Bottom nav for mobile - custom implementation */}
                <div className="fixed bottom-0 left-0 right-0 z-30 md:hidden">
                          <div className="bg-gray-900 border-t border-gray-800 h-14 flex items-center">
                            <div className="w-full max-w-[480px] mx-auto px-4 flex items-center justify-between">
                              <button onClick={goHome} aria-label="Home" className={`flex flex-col items-center ${isActive('/') ? 'text-white' : 'text-gray-300 hover:text-white'}`}>
                                <Home className={`w-5 h-5 ${isActive('/') ? 'scale-110' : ''}`} />
                                <span className={`text-[10px] mt-0.5 ${isActive('/') ? 'text-white font-semibold' : ''}`}>Home</span>
                              </button>
                              <button onClick={openSearch} aria-label="Search" className={`flex flex-col items-center ${isActive('/search') ? 'text-white' : 'text-gray-300 hover:text-white'}`}>
                                <Search className={`w-5 h-5 ${activeSearch ? 'scale-110' : ''}`} fill={'none'} strokeWidth={2} />
                                <span className={`text-[10px] mt-0.5 ${activeSearch ? 'text-white font-semibold' : ''}`}>Search</span>
                              </button>
                              <button onClick={() => { closeSearchOverlayIfOpen(); navigate('/recents'); }} aria-label="Recents" className={`flex flex-col items-center ${activeRecents ? 'text-white' : 'text-gray-300 hover:text-white'}`}>
                                    <svg className={`w-5 h-5 ${activeRecents ? 'scale-110' : ''}`} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M3 4h3v13H3zM8.5 3h3v14h-3zM14 4h3v13h-3zM3 18h14v2H3z" />
                                    </svg>
                                    <span className={`text-[10px] mt-0.5 ${activeRecents ? 'text-white font-semibold' : ''}`}>Recents</span>
                              </button>
                              <button onClick={() => navigate('/favorites')} aria-label="Favorites" className={`flex flex-col items-center ${activeFavs ? 'text-white' : 'text-gray-300 hover:text-white'}`}>
                                <Heart className={`w-5 h-5 ${activeFavs ? 'scale-110' : ''}`} fill={activeFavs ? 'currentColor' : 'none'} strokeWidth={activeFavs ? 0 : 2} />
                                <span className={`text-[10px] mt-0.5 ${activeFavs ? 'text-white font-semibold' : ''}`}>Favs</span>
                              </button>
                              <button onClick={openPlaylists} aria-label="Playlists" className={`flex flex-col items-center ${isActive('/playlists') ? 'text-white' : 'text-gray-300 hover:text-white'}`}>
                                <List className={`w-5 h-5 ${isActive('/playlists') ? 'scale-110' : ''}`} />
                                <span className={`text-[10px] mt-0.5 ${isActive('/playlists') ? 'text-white font-semibold' : ''}`}>Your Library</span>
                              </button>
                            </div>
                           </div>
                </div>
            </div>
        </div>
    );
};

export default SearchResults;
