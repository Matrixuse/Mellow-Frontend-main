import React, { useState, useEffect, useRef, useCallback, Suspense, lazy } from 'react';
// Humne yahan 'Outlet' aur 'useOutletContext' ko import kiya hai
import { Routes, Route, Link, Outlet, useOutletContext, useNavigate, useLocation } from 'react-router-dom';
import { FavoritesProvider } from './contexts/FavoritesContext';
import apiClient from './api/apiClient';
import AuthForm from './components/AuthForm';

// Only load critical services synchronously
import queueService from './services/queueService';
import AudioEngine from './services/audioEngine';

import { useDrag } from '@use-gesture/react';
import { animated } from '@react-spring/web';
import useScopedPullToRefresh from './hooks/useScopedPullToRefresh';

// Lazy load non-critical services
let nativeMediaService = null;
let musicControlsService = null;
let lockScreenService = null;
let gestureService = null;

const loadNativeMediaService = () => {
  if (!nativeMediaService) {
    return import('./services/nativeMediaService').then(m => {
      nativeMediaService = m.default;
      return nativeMediaService;
    });
  }
  return Promise.resolve(nativeMediaService);
};

const loadMusicControlsService = () => {
  if (!musicControlsService) {
    return import('./services/musicControlsService').then(m => {
      musicControlsService = m.default;
      return musicControlsService;
    });
  }
  return Promise.resolve(musicControlsService);
};

const loadLockScreenService = () => {
  if (!lockScreenService) {
    return import('./services/lockScreenService').then(m => {
      lockScreenService = m.default;
      return lockScreenService;
    });
  }
  return Promise.resolve(lockScreenService);
};

const loadGestureService = () => {
  if (!gestureService) {
    return import('./services/gestureService').then(m => {
      gestureService = m.default;
      return gestureService;
    });
  }
  return Promise.resolve(gestureService);
};

// ⚡ LAZY LOAD COMPONENTS - Only load when route is accessed
import PlayerUI from './components/PlayerUI';
import SongLibrary, { LibraryOptions } from './components/SongLibrary';
import LibraryOption from './components/LibraryOption';
import AdminPanel from './components/Admin';
import { Loader, Footer } from './components/OtherComponents';
import { getSongs } from './api/songService';
import { Search, X, Play as PlayIcon, Pause as PauseIcon, ChevronDown, Shuffle, MoreVertical, SkipBack, SkipForward, Volume2, VolumeX, Repeat } from 'lucide-react';
import QueuePanel from './components/QueuePanel';
import PlaylistModal from './components/PlaylistModal';
import { addToListeningHistory } from './utils/quickPicksAlgorithm';
import { detectSongMood } from './utils/moodDetection';
import BottomNav from './components/BottomNav';
import SearchResults from './components/SearchResults';
import UpNextRelatedModal from './components/UpNextRelatedModal';
import SongContextMenu from './components/SongContextMenu';
import { createFuzzySearch, getFuzzySuggestions } from './utils/fuzzySearch';

const PLAYBACK_STATE_STORAGE_KEY = 'mellow_playback_state';

// ⚡ LAZY LOAD HEAVY PAGE COMPONENTS
const ArtistPage = lazy(() => import('./components/ArtistPage'));
const MoodPage = lazy(() => import('./components/MoodPage'));
const VibePage = lazy(() => import('./components/VibePage'));
const PlaylistPage = lazy(() => import('./components/PlaylistPage'));
const PlaylistsPage = lazy(() => import('./components/PlaylistsPage'));
const FeedbackPage = lazy(() => import('./components/FeedbackPage'));
const RecommendationsPage = lazy(() => import('./pages/RecommendationsPage'));
const FeedPage = lazy(() => import('./pages/FeedPage'));
const RecentsPage = lazy(() => import('./pages/RecentsPage'));
const UserProfilePage = lazy(() => import('./pages/UserProfilePage'));
const FavoritesPage = lazy(() => import('./pages/FavoritesPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const EqualizerPage = lazy(() => import('./pages/EqualizerPage'));

// Loading fallback component
const LazyLoadingFallback = () => (
  <div className="flex items-center justify-center h-full">
    <Loader />
  </div>
);

// No global fallbacks for handlers. Handlers should be passed explicitly via props or outlet context.

// --- Main Layout Component ---
// Yeh component left player aur right content area ka layout banata hai
const MainLayout = React.memo(({ navigate, onNavigateToProfile, onNavigateToUpdates, onNavigateToAbout, onNavigateToEqualizer, onCloseLogoutMenu, onLogout, toggleLogoutVisible, toggleBottomPlayerClicked, isLogoutVisible, isArtistShuffleMode, setIsArtistShuffleMode, isMoodShuffleMode, setIsMoodShuffleMode, isPlaylistShuffleMode, setIsPlaylistShuffleMode, user, ...props }) => {
    const location = useLocation();
    const isFavoritesPage = location.pathname.includes('/favorites');
    const isArtistPage = location.pathname.startsWith('/artist') || location.pathname.includes('/artist/');
    const isMoodPage = location.pathname.startsWith('/mood') || location.pathname.includes('/mood/') || location.pathname.startsWith('/vibe') || location.pathname.includes('/vibe/');
    const isProfilePage = location.pathname.startsWith('/profile') || location.pathname.includes('/profile/');
    const isPlaylistsPage = location.pathname.startsWith('/playlists') || location.pathname.includes('/playlists/');
    return (
    <div className="flex flex-col md:flex-row h-full">
        {/* Left Column desktop/tablet par hi dikhega - hide on favorites */}
        {!isFavoritesPage && (
        <div className="hidden md:flex md:w-90 p-3 flex-shrink-0 flex-col bg-[#1f1f1f]/30">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <Link to="/" className="flex items-center gap-3">
                        <img src="/logo.png" alt="App Logo" className="w-10 h-10 rounded-full" onError={(e) => e.target.style.display = 'none'} />
                        <h1 className="text-2xl font-bold text-gray-200">Mellow</h1>
                    </Link>
                </div>
            </div>
            <div className="bg-[#1f1f1f] rounded-lg flex flex-col shadow-xl flex-grow">
                {/* Forward modal open handlers from props (App supplies them). Avoid referencing
                    App-scoped setters directly here to prevent undefined reference errors. */}
                <PlayerUI {...props} user={user} onOpenUpNext={props.onOpenUpNext} onOpenRelated={props.onOpenRelated} />
            </div>
        </div>
        )}
        {/* Right Column (Yahan ab Outlet aayega jo page badlega) */}
        {/* Hum yahan 'context' ke zariye saare props neeche bhej rahe hain */}

        <div className="flex-1 flex flex-col h-full min-h-0 min-w-0">
            {!isFavoritesPage && !isArtistPage && !isMoodPage && !isProfilePage && !isPlaylistsPage && (
            <div className="md:hidden bg-[#0f0f0f] border-b border-gray-800 pt-3 pl-3 pr-3 pb-2 relative">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center">
                      <div className="w-9 h-9 rounded-full bg-[#282828] overflow-hidden cursor-pointer" onClick={toggleLogoutVisible}>
                        <img src="/customer.jpg" alt="Profile" className="w-full h-full object-cover" onError={(e) => e.target.style.display = 'none'} />
                      </div>
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <input
                            type="text"
                            id="global-search-input-mobile"
                            placeholder="Search songs or artists"
                            value={(props && props.searchTerm) ? props.searchTerm : ''}
                            onChange={(e) => { try { props && props.onSearchChange && props.onSearchChange(e); } catch (err) {} }}
                            onFocus={() => { try { props && props.onSearchBarClick && props.onSearchBarClick(); } catch (err) {} }}
                            className="w-full bg-[#1f1f1f]/40 text-white rounded-full py-2 pl-10 pr-3 text-sm focus:outline-none focus:bg-[#1f1f1f]"
                            autoComplete="off"
                        />
                        {(props && props.searchTerm) && (
                            <button onClick={() => { try { props && props.onClearSearch && props.onClearSearch(); } catch (err) {} }} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white">
                                <X size={18} />
                            </button>
                        )}
                    </div>
                  </div>
                </div>
                <div className="mt-2 overflow-x-auto no-scrollbar">
                    <LibraryOptions />
                </div>
                {isLogoutVisible && (
                    <div className="absolute left-3 top-14 w-44 bg-[#0f0f0f] text-white rounded-md shadow-lg text-sm overflow-hidden z-50">
                        <button onClick={onNavigateToProfile} className="w-full text-left py-2 px-4 hover:bg-[#1f1f1f]">Profile</button>
                        <button onClick={onNavigateToUpdates} className="w-full text-left py-2 px-4 hover:bg-[#1f1f1f]">Your Updates</button>
                        <button onClick={() => { onCloseLogoutMenu && onCloseLogoutMenu(); onNavigateToEqualizer && onNavigateToEqualizer(); }} className="w-full text-left py-2 px-4 hover:bg-[#1f1f1f]">Equalizer</button>
                        <button onClick={onNavigateToAbout} className="w-full text-left py-2 px-4 hover:bg-[#1f1f1f]">About</button>
                        <button onClick={onLogout} className="w-full text-left py-2 px-4 hover:bg-[#1f1f1f] border-t border-gray-700">Logout</button>
                    </div>
                )}
            </div>
            )}
            <Outlet context={{ ...props, token: user?.token, onNavigateToProfile, onNavigateToUpdates, onNavigateToAbout, onNavigateToEqualizer, onCloseLogoutMenu, onLogout, toggleLogoutVisible, isLogoutVisible, isArtistShuffleMode, setIsArtistShuffleMode, isMoodShuffleMode, setIsMoodShuffleMode, isPlaylistShuffleMode, setIsPlaylistShuffleMode, onPlayPause: props.onPlayPause, onSearchBarClick: props.onSearchBarClick, onSearchChange: props.onSearchChange, onClearSearch: props.onClearSearch, filteredSongs: props.filteredSongs, allSongs: props.allSongs, isPlayerExpanded: props.isPlayerExpanded, isBottomPlayerClicked: props.isBottomPlayerClicked, isLoadingSongs: props.isLoadingSongs }} />  
            {/* Mobile mini player bar bottom pe fixed, leave space for BottomNav */}
            <div className="md:hidden">
                <MobilePlayerBar {...props} isShuffle={props.isShuffle} onShuffleToggle={props.onShuffleToggle} onTogglePlayerExpand={props.onTogglePlayerExpand} isPlayerInitialized={props.isPlayerInitialized} />
                <BottomNav />
            </div>
        </div>
    </div>
    );
});

MainLayout.displayName = 'MainLayout';

// --- Library Page Component ---
const LibraryPage = React.memo(() => {
    const context = useOutletContext() || {};
    const location = useLocation();
    const selectedMood = location.pathname.startsWith('/library/')
        ? location.pathname.slice('/library/'.length)
        : '';
    const {
        filteredSongs,
        onSelectSong,
        currentSongId,
        currentSong,
        isPlaying,
        isLoadingSongs,
        error,
        searchTerm,
        onSearchChange,
        onClearSearch,
        onSearchBarClick,
        onAdminClick,
        toggleLogoutVisible,
        isLogoutVisible,
        onLogout,
        onNavigateToProfile,
        onNavigateToUpdates,
        onNavigateToAbout,
        onNavigateToEqualizer,
        onCloseLogoutMenu,
        onPlayPause,
        isBottomPlayerClicked,
        modalRelatedCache,
        modalQueueCache,
        onAddToQueue,
        onAddToPlaylist
    } = context;

    const [activeTab, setActiveTab] = useState("upnext");
    const [showQueuePanel, setShowQueuePanel] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);

    const handleRefresh = useCallback(async () => {
        // Apna refresh logic — e.g. dobara getSongs() call karo
        return new Promise((resolve) => {
            setTimeout(() => {
                setRefreshKey(prev => prev + 1);
                resolve();
            }, 1000);
        });
    }, []);

    const { scrollRef, bindPull, pull, refreshing } = useScopedPullToRefresh(handleRefresh);

    const safeAddToQueue = (song, position = 'end') => {
        if (context && typeof context.onAddToQueue === 'function') return context.onAddToQueue(song, position);
        // eslint-disable-next-line no-console
        console.warn('safeAddToQueue: onAddToQueue not available in context.');
    };

    return (
        <div className="flex-1 overflow-auto">
            <div className="sticky top-0 z-40 bg-neutral-950/95 border-b border-gray-700 backdrop-blur-md px-4 -mx-4 lg:py-3">
                <div className="hidden md:flex items-center ml-3 w-full justify-center">
                    {/* Left: Desktop search bar */}
                    <div className="flex items-center gap-2">
                        <div className="relative mr-6 w-80">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                            <input
                                id="global-search-input-desktop"
                                type="text"
                                placeholder="Search songs or artists"
                                value={searchTerm || ''}
                                onChange={(e) => { try { onSearchChange && onSearchChange(e); } catch (err) {} }}
                                // onFocus={() => { try { onSearchBarClick && onSearchBarClick(); } catch (err) {} }}
                                className="w-full bg-[#3b3939] text-white rounded-lg py-2 pl-10 pr-3 text-sm focus:outline-none focus:bg-[#1f1f1f]"
                                autoComplete="off"
                            />
                            {searchTerm && (
                                <button onClick={() => { try { onClearSearch && onClearSearch(); } catch (err) {} }} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white">
                                    <X size={18} />
                                </button>
                            )}
                        </div>
                    </div>
                    {/* Right: profile + action buttons (desktop) */}
                    <div className="flex items-center gap-3">
                        <span className="text-gray-300 font-medium">Hi,</span>
                        <div className="relative">
                            <div className="w-10 h-10 bg-[#282828] rounded-full flex items-center justify-center cursor-pointer overflow-hidden" onClick={toggleLogoutVisible}>
                                <img src="/customer.jpg" alt="Profile" className="w-full h-full object-cover" />
                            </div>
                            {isLogoutVisible && (
                                <div className="absolute right-0 mt-2 w-44 bg-[#0f0f0f] text-white rounded-md shadow-lg text-sm overflow-hidden">
                                    <button onClick={onNavigateToProfile} className="w-full text-left py-2 px-4 hover:bg-[#1f1f1f] transition-colors">Profile</button>
                                    <button onClick={onNavigateToUpdates} className="w-full text-left py-2 px-4 hover:bg-[#1f1f1f] transition-colors">Your Updates</button>
                                    <button onClick={() => { onCloseLogoutMenu && onCloseLogoutMenu(); onNavigateToEqualizer && onNavigateToEqualizer(); }} className="w-full text-left py-2 px-4 hover:bg-[#1f1f1f] transition-colors">Equalizer</button>
                                    <button onClick={onNavigateToAbout} className="w-full text-left py-2 px-4 hover:bg-[#1f1f1f] transition-colors">About</button>
                                    <button onClick={onLogout} className="w-full text-left py-2 px-4 hover:bg-[#1f1f1f] transition-colors border-t border-gray-700">Logout</button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                <div className="hidden md:block mt-2 w-full overflow-x-auto no-scrollbar justify-center place-items-center">
                    <LibraryOptions />
                </div>
            </div>

            {isLoadingSongs ? (
                <div className="w-full h-full flex items-center justify-center"><Loader /></div>
            ) : error ? (
                <p className="text-red-400 text-center mt-10">Error: {error}. Check you Internet Connection.</p>
            ) : isBottomPlayerClicked ? (
                <div className="flex-1 p-4 overflow-auto">
                    <h1 className="text-white/90 text-2xl font-bold mt-1 ml-4 mb-2">Keep Listening</h1>
                    <div className="flex flex-col lg:flex-row gap-8 mt-2">
                        {/* LEFT : Album Cover */}
                        <div className="lg:w-[55%] flex justify-center">
                            <button
                                type="button"
                                onClick={() => onPlayPause && onPlayPause()}
                                className="relative w-[380px] h-[380px] rounded-xl overflow-hidden mt-6 shadow-2xl focus:outline-none"
                                aria-label={isPlaying ? 'Pause current song' : 'Play current song'}
                            >
                                <img
                                    src={currentSong?.coverUrl || "https://placehold.co/400x400/1F2937/FFFFFF?text=Music"}
                                    alt={currentSong?.title}
                                    className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 hover:opacity-100 transition-opacity duration-200">
                                    <div className="rounded-full p-3 text-white">
                                        {isPlaying ? (
                                            <PauseIcon className="w-6 h-6" />
                                        ) : (
                                            <PlayIcon className="w-6 h-6" />
                                        )}
                                    </div>
                                </div>
                            </button>
                        </div>
                        {/* RIGHT : Up Next / Related */}
                        <div className="lg:w-[40%] bg-[#0f0f0f] rounded overflow-hidden border border-gray-800">
                            <div className="sticky top-0 bg-[#0f0f0f] z-10">
                                <div className="flex border-b border-gray-800">
                                    <button onClick={() => setActiveTab("upnext")} className={`flex-1 py-3 font-semibold text-sm transition ${activeTab === "upnext"
                                    ? "text-white border-b-2 border-white"
                                    : "text-gray-500"
                                    }`}> UP NEXT</button>
                                    <button onClick={() => setActiveTab("related")}
                                    className={`flex-1 py-3 font-semibold text-sm transition
                                    ${activeTab === "related" ? "text-white border-b-2 border-white" : "text-gray-500"}`}> RELATED
                                    </button>
                                </div>
                            </div>
                            {/* Song List */}

                            <div className="h-[480px] overflow-y-auto">
                                <div className="flex items-center justify-start gap-2 mt-2 px-3 mb-2">
                                    <p className='text-xs font-bold text-gray-400'>Playing from</p>
                                    <h3 className="text-md font-semibold text-white">Your Queue</h3>
                                    <br />
                                </div>
                                {(activeTab === "upnext" ? modalQueueCache?.slice(1) : modalRelatedCache)?.map((s, idx) => {
                                    const songDuration = getSongDuration(s);
                                    return (
                                    <div key={s?.id || idx} className="group flex items-center border-b border-gray-800 gap-3 px-3 py-2 hover:bg-[#414040] transition cursor-pointer relative" onClick={() => onSelectSong(s.id)}>
                                        <img src={ s?.coverUrl || s?.cover || "https://placehold.co/48x48" } className="w-8 h-8 object-cover rounded"/>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="truncate text-white text-sm font-medium">{s?.title || s?.name}</h3>
                                            <p className="truncate text-xs text-gray-400">{Array.isArray(s?.artist) ? s.artist.join(", ") : s?.artist}</p>
                                        </div>
                                        <span className="text-xs text-gray-400 mr-2">{formatTime(songDuration)}</span>
                                        <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                            <SongContextMenu
                                                song={s}
                                                onAddToQueue={safeAddToQueue}
                                                onAddToPlaylist={onAddToPlaylist}
                                                onNavigateToArtist={(artistName) => { window.location.href = `/artist/${encodeURIComponent(artistName)}`; }}
                                                onReport={(song) => {
                                                    const reason = prompt('Report song reason (optional):');
                                                    if (reason !== null) {
                                                        console.log('Reported song', song.id || song, 'reason:', reason);
                                                        alert('Thank you. The song has been reported.');
                                                    }
                                                }}
                                            />
                                        </div>
                                    </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <animated.div 
                    ref={scrollRef} 
                    {...bindPull()} 
                    style={{ 
                        overflowY: 'auto', 
                        touchAction: 'pan-y',
                        position: 'relative'
                    }} 
                    className="flex-1 p-2 overflow-auto"
                >
                    {/* Pull-to-refresh indicator */}
                    {refreshing && (
                        <div className="fixed top-0 left-0 right-0 flex justify-center items-center p-4 bg-[#0f0f0f]/50 z-50">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500"></div>
                        </div>
                    )}

                    {selectedMood ? (
                        <LibraryOption
                            songs={filteredSongs}
                            onSelectSong={onSelectSong}
                            currentSongId={currentSongId}
                            isPlaying={isPlaying}
                            onAddToQueue={(context && typeof context.onAddToQueue === 'function') ? context.onAddToQueue : safeAddToQueue}
                        />
                    ) : (
                        <>
                            <SongLibrary
                                key={refreshKey}
                                songs={filteredSongs}
                                onSelectSong={onSelectSong}
                                currentSongId={currentSongId}
                                isPlaying={isPlaying}
                                onAddToQueue={(context && typeof context.onAddToQueue === 'function') ? context.onAddToQueue : safeAddToQueue}
                            />
                            <Footer onDeveloperClick={onAdminClick} />
                        </>
                    )}
                </animated.div>
            )}
        </div>
    );
});

LibraryPage.displayName = 'LibraryPage';

// --- Main App Component (Master Controller) ---
function App() {
    const readStoredUser = useCallback(() => {
        try {
            const raw = localStorage.getItem('user');
            if (!raw) return null;
            const parsed = JSON.parse(raw);
            if (!parsed || typeof parsed !== 'object') return null;

            const normalizedUser = {
                ...(parsed.user || parsed),
                token: parsed.token || (parsed.user && parsed.user.token) || null,
            };

            if (!normalizedUser.token) return null;
            return normalizedUser;
        } catch (error) {
            try { localStorage.removeItem('user'); } catch (cleanupError) {}
            return null;
        }
    }, []);

    const [user, setUser] = useState(() => readStoredUser());
    const [isInitializing, setIsInitializing] = useState(() => !readStoredUser());
    const [songs, setSongs] = useState([]);
    const [currentSongIndex, setCurrentSongIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [volume, setVolume] = useState(1);
    const [duration, setDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const [isLoadingSongs, setIsLoadingSongs] = useState(true);
    const [error, setError] = useState(null);
    const [isShuffle, setIsShuffle] = useState(false);
    const [isRepeat, setIsRepeat] = useState(false);
    const [isLogoutVisible, setIsLogoutVisible] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);
    const [isPlayerExpanded, setIsPlayerExpanded] = useState(false);
    const [isBottomPlayerClicked, setIsBottomPlayerClicked] = useState(false);
    const [isPlayerEntered, setIsPlayerEntered] = useState(false);
    const [apiHealthy, setApiHealthy] = useState(true);
    const [queue, setQueue] = useState([]);
    const [isQueueOpen, setIsQueueOpen] = useState(false);
    // Playlist-scoped queue: when user plays inside a playlist we keep a
    // separate queue so that playlist navigation doesn't overwrite the
    // global `queueService` used by home/library actions.
    const [playlistQueue, setPlaylistQueue] = useState([]);
    const [isUsingPlaylistQueue, setIsUsingPlaylistQueue] = useState(false);
    const [playlistQueueIndex, setPlaylistQueueIndex] = useState(0);
    const [activePlaylistId, setActivePlaylistId] = useState(null);
    
    // Artist-scoped queue: when user plays inside an artist page
    const [artistQueue, setArtistQueue] = useState([]);
    const [isUsingArtistQueue, setIsUsingArtistQueue] = useState(false);
    const [artistQueueIndex, setArtistQueueIndex] = useState(0);
    const [isArtistShuffleMode, setIsArtistShuffleMode] = useState(false);
    
    // Mood-scoped queue: when user plays inside a mood page
    const [moodQueue, setMoodQueue] = useState([]);
    const [isUsingMoodQueue, setIsUsingMoodQueue] = useState(false);
    const [moodQueueIndex, setMoodQueueIndex] = useState(0);
    const [isMoodShuffleMode, setIsMoodShuffleMode] = useState(false);
    // Deterministic UP NEXT queue (preferred over moodQueue for playback)
    const [upNextQueue, setUpNextQueue] = useState([]); // array of song objects
    const [isUsingUpNext, setIsUsingUpNext] = useState(false);
    const [upNextIndex, setUpNextIndex] = useState(0);
    const [upNextSourceId, setUpNextSourceId] = useState(null);
    
    // UP NEXT and RELATED unified modal
    const [isUpNextRelatedModalOpen, setIsUpNextRelatedModalOpen] = useState(false);
    const [upNextRelatedModalMode, setUpNextRelatedModalMode] = useState('upnext');

    // Cached modal lists (stable per currentSong) to avoid reshuffling on every render
    const [modalRelatedCache, setModalRelatedCache] = useState([]);
    const [modalQueueCache, setModalQueueCache] = useState([]);
    const [moodQueueSourceId, setMoodQueueSourceId] = useState(null);
    
    // Playlist shuffle mode
    const [isPlaylistShuffleMode, setIsPlaylistShuffleMode] = useState(false);

    const [isPlaylistOpen, setIsPlaylistOpen] = useState(false);
    const [playlistSongId, setPlaylistSongId] = useState(null);
    const [showSearchResults, setShowSearchResults] = useState(false);
    const searchResultsRef = useRef(null);
    const [isPlayerInitialized, setIsPlayerInitialized] = useState(false);
    const [isPlaybackStateRestored, setIsPlaybackStateRestored] = useState(false);
    const playbackRestoreRef = useRef(null);

    const audioRef = useRef(null);
    const currentSong = songs[currentSongIndex];

    useEffect(() => {
        if (!showSearchResults) return undefined;

        const handleOutsideSearchClick = (event) => {
            if (window.matchMedia('(min-width: 768px)').matches && searchResultsRef.current && !searchResultsRef.current.contains(event.target)) {
                setShowSearchResults(false);
                setSearchTerm('');
            }
        };

        document.addEventListener('mousedown', handleOutsideSearchClick);
        return () => document.removeEventListener('mousedown', handleOutsideSearchClick);
    }, [showSearchResults]);

    // Component-scoped helper to safely resolve an audio URL from a song object.
    const isLegacyCloudinaryUrl = (value) => {
        return typeof value === 'string' && /cloudinary\.com/i.test(value);
    };
   
    const getSongUrl = (song) => {
        if (!song || typeof song !== 'object') return '';
        const preferredBase = (() => {
            const fromEnv = (import.meta && import.meta.env && import.meta.env.VITE_API_URL)
                ? String(import.meta.env.VITE_API_URL).replace(/\/$/, '')
                : '';
            const fromRuntime = (typeof window !== 'undefined' && window.__API_URL)
                ? String(window.__API_URL).replace(/\/$/, '')
                : '';
            return fromEnv || fromRuntime || 'https://mellow-backend-main.onrender.com';
        })();
        const normalizeStreamUrl = (value) => {
            if (!value || typeof value !== 'string') return '';
            const streamMatch = value.match(/\/api\/songs\/stream\/([^/?#]+)/i);
            if (!streamMatch) return value;
            if (/https?:\/\/(localhost|127\.0\.0\.1):(5000|5001)\//i.test(value)) {
                return `${preferredBase}/api/songs/stream/${streamMatch[1]}`;
            }
            return value;
        };
        const candidates = [
            song.songUrl,
            song.url,
            song.song_url,
            song.audioUrl,
            song.audio_url,
            song.fileUrl,
            song.file_url,
            song.file?.url,
            song.audio?.url,
            song.asset?.url,
        ];
        for (const item of candidates) {
            if (item && typeof item === 'string' && !isLegacyCloudinaryUrl(item)) {
                return normalizeStreamUrl(item);
            }
        }
        return '';
    };

    const streamRetryRef = useRef(new Set());

    const getStreamFallbackUrls = (song, failedUrl) => {
        const originalUrl = getSongUrl(song);
        const failed = String(failedUrl || originalUrl || '');
        const directCandidates = [originalUrl].filter(Boolean);
        const streamMatch = failed.match(/\/api\/songs\/stream\/([^/?#]+)/i) || String(song?.id || '').match(/(.+)/);
        const songId = streamMatch && streamMatch[1] ? streamMatch[1] : (song && song.id ? String(song.id) : '');

        if (!songId) return directCandidates;

        const configured = (import.meta && import.meta.env && import.meta.env.VITE_API_URL)
            ? String(import.meta.env.VITE_API_URL).replace(/\/$/, '')
            : '';
        const runtimeBase = (typeof window !== 'undefined' && window.__API_URL)
            ? String(window.__API_URL).replace(/\/$/, '')
            : '';

        const hostCandidates = [
            configured,
            runtimeBase || 'https://mellow-backend-main.onrender.com'
        ].filter(Boolean);

        const streamCandidates = hostCandidates.map(base => `${base}/api/songs/stream/${encodeURIComponent(songId)}`);
        const normalizedFailed = failed.trim();
        return [...new Set([...directCandidates, ...streamCandidates].filter(Boolean))]
            .filter(url => url !== normalizedFailed);
    };

    const isLocalStreamUrl = (value) => {
        if (!value || typeof value !== 'string') return false;
        return /https?:\/\/(localhost|127\.0\.0\.1):(5000|5001)\/api\/songs\/stream\//i.test(value);
    };

    const updateSongUrlEverywhere = (songId, nextUrl) => {
        if (!songId || !nextUrl) return;
        const targetId = String(songId);
        const updateList = (arr) => Array.isArray(arr)
            ? arr.map(s => (s && String(s.id) === targetId ? { ...s, songUrl: nextUrl, url: nextUrl } : s))
            : arr;

        setSongs(prev => updateList(prev));
        setQueue(prev => updateList(prev));
        setUpNextQueue(prev => updateList(prev));
        setArtistQueue(prev => updateList(prev));
        setMoodQueue(prev => updateList(prev));
        setPlaylistQueue(prev => updateList(prev));
        setModalQueueCache(prev => updateList(prev));
        setModalRelatedCache(prev => updateList(prev));
        try {
            queueService.queue = updateList(queueService.queue);
            queueService.originalQueue = updateList(queueService.originalQueue || []);
        } catch (e) {}
    };

    // Update duration across app state and queueService for a single song
    const updateDurationForSong = (songId, durationSeconds) => {
        if (!songId || !durationSeconds || durationSeconds <= 0) return;
        const updateId = String(songId);
        const updateList = (arr) => Array.isArray(arr) ? arr.map(s => s && String(s.id) === updateId ? { ...s, duration: durationSeconds } : s) : arr;
        setSongs(prev => updateList(prev));
        setQueue(prev => updateList(prev));
        setUpNextQueue(prev => updateList(prev));
        setArtistQueue(prev => updateList(prev));
        setMoodQueue(prev => updateList(prev));
        setPlaylistQueue(prev => updateList(prev));
        setModalQueueCache(prev => updateList(prev));
        setModalRelatedCache(prev => updateList(prev));
        try {
            queueService.queue = updateList(queueService.queue);
            queueService.originalQueue = updateList(queueService.originalQueue || []);
        } catch (e) {
            console.warn('Failed to update queueService with loaded duration', e);
        }
    };
    // Expose queueService for debugging in browser console (temporary)
    useEffect(() => {
        try { window.__queueService = queueService; } catch (e) {}
        return () => { try { delete window.__queueService; } catch (e) {} };
    }, []);

    // Ensure recents are recorded when the currently playing song changes
    useEffect(() => {
        if (!currentSong) return;
        try {
                const songObj = currentSong;
                const existing = JSON.parse(localStorage.getItem('recents') || '[]');
                const filtered = existing.filter(e => String(e.id) !== String(songObj.id) && String(e.songId || '') !== String(songObj.id));
            const entry = {
                id: songObj.id || songObj.songId || null,
                title: songObj.title || songObj.name || songObj.songTitle || '',
                artist: songObj.artist || songObj.artists || songObj.artistName || '',
                coverUrl: songObj.coverUrl || songObj.cover || '' ,
                playedAt: Date.now()
            };
            filtered.unshift(entry);
            const limited = filtered.slice(0, 200);
                    try {
                        localStorage.setItem('recents', JSON.stringify(limited));
                        try { console.debug('App: wrote recents (playback), count=', limited.length); } catch (e) {}
                    } catch (e) {
                        console.debug('App: localStorage write failed for recents (playback)', e && e.message);
                    }
                    try { queueService.addRecentEntry && queueService.addRecentEntry(entry); } catch (e) {}
                    try { window.dispatchEvent(new CustomEvent('recents-updated', { detail: entry })); } catch (e) {}
        } catch (e) {
            // ignore localStorage errors
        }

        // also attempt to notify backend when user is logged in
        try {
            const tok = (user && user.token) ? user.token : (() => { try { const u = JSON.parse(localStorage.getItem('user')||'{}'); return u.token; } catch { return null; } })();
            if (tok && currentSong && (currentSong.id || currentSong.songId)) {
                import('./api/userService').then(m => { m.addListenHistory(currentSong.id || currentSong.songId, tok).catch(() => {}); }).catch(() => {});
            }
        } catch (e) {}
    }, [currentSong]);

    // Write recents when playback starts (isPlaying transitions to true)
    const prevIsPlayingRef = useRef(false);
    useEffect(() => {
        const prev = prevIsPlayingRef.current;
        if (!prev && isPlaying && currentSong) {
            try {
                const songObj = currentSong;
                const existing = JSON.parse(localStorage.getItem('recents') || '[]');
                // avoid duplicate if most recent is same song
                const topId = existing && existing[0] ? (existing[0].id || existing[0].songId) : null;
                if (String(topId) !== String(songObj.id || songObj.songId)) {
                    const filtered = (Array.isArray(existing) ? existing.filter(e => String(e.id) !== String(songObj.id) && String(e.songId || '') !== String(songObj.id)) : []);
                    const entry = {
                        id: songObj.id || songObj.songId || null,
                        title: songObj.title || songObj.name || songObj.songTitle || '',
                        artist: songObj.artist || songObj.artists || songObj.artistName || '',
                        coverUrl: songObj.coverUrl || songObj.cover || '' ,
                        playedAt: Date.now()
                    };
                    filtered.unshift(entry);
                    const limited = filtered.slice(0, 200);
                    localStorage.setItem('recents', JSON.stringify(limited));
                    try { console.debug('App: wrote recents (onPlay), count=', limited.length); } catch (e) {}
                    try { window.dispatchEvent(new CustomEvent('recents-updated', { detail: entry })); } catch (e) {}
                }
            } catch (e) {
                // ignore
            }
        }
        prevIsPlayingRef.current = isPlaying;
    }, [isPlaying, currentSong]);
    
    // Utility: shuffle array copy
    const shuffleArray = (arr) => {
        const copy = Array.isArray(arr) ? arr.slice() : [];
        for (let i = copy.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [copy[i], copy[j]] = [copy[j], copy[i]];
        }
        return copy;
    };

    // Utility: extract mood tags from a song object using common fields
    const extractMoodTags = (song) => {
        if (!song || typeof song !== 'object') return [];
        const possible = [];
        const pushVal = (v) => {
            if (!v) return;
            if (Array.isArray(v)) v.forEach(x => { if (x) possible.push(String(x).toLowerCase().trim()); });
            else possible.push(String(v).toLowerCase().trim());
        };
        pushVal(song.mood);
        pushVal(song.moods);
        pushVal(song.tags);
        pushVal(song.genres);
        pushVal(song.genre);
        pushVal(song.categories);
        pushVal(song.category);
        pushVal(song.style);
        // fallback: some data uses `mood_tag` or `moodTags`
        pushVal(song.mood_tag);
        pushVal(song.moodTags);
        // remove empties and duplicates
        return [...new Set(possible.filter(Boolean))];
    };

    // Get songs that match any mood tag of the provided song (excluding itself)
    const getSongsByMood = (song, all = songs, shouldShuffle = false) => {
        if (!song) return [];
        const tags = extractMoodTags(song);
        if (!tags || tags.length === 0) {
            // fall back to same artist
            const artist = Array.isArray(song.artist) ? song.artist.join(',') : song.artist;
            if (!artist) return [];
            const matches = (all || []).filter(s => s && s.id !== song.id && ((Array.isArray(s.artist) ? s.artist.join(',') : s.artist) === artist));
            return shouldShuffle ? shuffleArray(matches) : matches;
        }
        const lowered = tags.map(t => t.toLowerCase());
        const matches = (all || []).filter(s => s && s.id !== song.id && (() => {
            const sTags = extractMoodTags(s);
            for (const t of sTags) if (lowered.includes(t)) return true;
            return false;
        })());
        return shouldShuffle ? shuffleArray(matches) : matches;
    };

    // Ensure a list has at least `n` items by filling from `all` (excluding current and existing)
    const ensureListLength = (list, n, all = songs, currentId) => {
        const out = Array.isArray(list) ? list.slice() : [];
        if (out.length >= n) return out.slice(0, n);
        const exclude = new Set((out || []).map(s => s && s.id).filter(Boolean));
        if (currentId) exclude.add(currentId);
        const pool = (all || []).filter(s => s && !exclude.has(s.id));
        const shuffled = shuffleArray(pool);
        for (let i = 0; out.length < n && i < shuffled.length; i++) out.push(shuffled[i]);
        return out.slice(0, n);
    };

    // NOTE: We intentionally do NOT create a mood-based UP NEXT queue on modal open anymore.
    // Mood queues are created when the user selects/plays a song (see `handleSelectSong`).
    // This avoids reshuffling whenever the modal is opened.

    // Compute & cache modal lists when currentSong changes or an UP NEXT queue is active.
    // If a deterministic UP NEXT queue already exists, keep it stable instead of
    // rebuilding it whenever the current track advances.
    useEffect(() => {
        if (isUsingUpNext && Array.isArray(upNextQueue) && upNextQueue.length > 0) {
            setModalQueueCache(upNextQueue);
            if (currentSong && currentSong.id) {
                const rawRelated = getSongsByMood(currentSong, songs, true);
                setModalRelatedCache(ensureListLength(rawRelated, 30, songs, currentSong.id));
            } else {
                setModalRelatedCache([]);
            }
        } else if (currentSong && currentSong.id) {
            const rawRelated = getSongsByMood(currentSong, songs, true);
            const rawQueue = getSongsByMood(currentSong, songs, true);
            const queueTail = ensureListLength(rawQueue, 29, songs, currentSong.id);
            const modalQueue = [currentSong, ...queueTail];
            setModalRelatedCache(ensureListLength(rawRelated, 30, songs, currentSong.id));
            setModalQueueCache(modalQueue);
        } else {
            setModalRelatedCache([]);
            setModalQueueCache([]);
        }
    }, [currentSong && currentSong.id, isUsingUpNext, upNextQueue, songs]);

    // programmatic navigation helper for gesture handling
    const navigate = useNavigate();
    const location = useLocation();

    // New state for fuzzy search
    const [fuzzy, setFuzzy] = useState(null);

    // Effects
    useEffect(() => {
        const storedUser = readStoredUser();
        if (storedUser) {
            setUser(prev => {
                if (prev && prev.token === storedUser.token && prev.id === storedUser.id) return prev;
                return storedUser;
            });
        } else {
            setUser(null);
        }
        setIsInitializing(false);
    }, [readStoredUser]);

    useEffect(() => {
        if (typeof window === 'undefined' || !window.localStorage) return;
        try {
            const raw = localStorage.getItem(PLAYBACK_STATE_STORAGE_KEY);
            if (raw) {
                const saved = JSON.parse(raw);
                if (saved && typeof saved === 'object') {
                    playbackRestoreRef.current = saved;
                }
            }
        } catch (e) {
            console.warn('Unable to restore playback state from storage', e);
        }
    }, []);

    useEffect(() => {
        if (isPlaybackStateRestored || !Array.isArray(songs) || songs.length === 0 || !playbackRestoreRef.current) return;

        const saved = playbackRestoreRef.current;
        const resolveQueue = (ids) => {
            if (!Array.isArray(ids)) return [];
            return ids
                .map(id => songs.find(s => String(s.id) === String(id)))
                .filter(Boolean);
        };

        try {
            if (saved.currentSongId) {
                const idx = songs.findIndex(s => String(s.id) === String(saved.currentSongId));
                if (idx !== -1) {
                    setCurrentSongIndex(idx);
                }
            }
            if (typeof saved.isPlaying === 'boolean') setIsPlaying(saved.isPlaying);
            if (typeof saved.isShuffle === 'boolean') setIsShuffle(saved.isShuffle);
            if (typeof saved.isRepeat === 'boolean') setIsRepeat(saved.isRepeat);

            const mode = saved.mode || 'global';
            if (mode === 'upnext') {
                const queue = resolveQueue(saved.upNextQueueIds);
                if (queue.length > 0) {
                    setUpNextQueue(queue);
                    setIsUsingUpNext(true);
                    setUpNextIndex(typeof saved.upNextIndex === 'number' ? saved.upNextIndex : 0);
                    setQueue(queue);
                    try {
                        queueService.clearQueue();
                        queueService.addToQueue(queue, 'end');
                        queueService.currentIndex = typeof saved.upNextIndex === 'number' ? saved.upNextIndex : 0;
                    } catch (e) {}
                }
            } else if (mode === 'playlist') {
                const queue = resolveQueue(saved.playlistQueueIds);
                if (queue.length > 0) {
                    setPlaylistQueue(queue);
                    setIsUsingPlaylistQueue(true);
                    setPlaylistQueueIndex(typeof saved.playlistQueueIndex === 'number' ? saved.playlistQueueIndex : 0);
                    setQueue(queue);
                }
            } else if (mode === 'artist') {
                const queue = resolveQueue(saved.artistQueueIds);
                if (queue.length > 0) {
                    setArtistQueue(queue);
                    setIsUsingArtistQueue(true);
                    setArtistQueueIndex(typeof saved.artistQueueIndex === 'number' ? saved.artistQueueIndex : 0);
                    setQueue(queue);
                }
            } else if (mode === 'mood') {
                const queue = resolveQueue(saved.moodQueueIds);
                if (queue.length > 0) {
                    setMoodQueue(queue);
                    setIsUsingMoodQueue(true);
                    setMoodQueueIndex(typeof saved.moodQueueIndex === 'number' ? saved.moodQueueIndex : 0);
                    setQueue(queue);
                }
            }
        } catch (e) {
            console.warn('Playback state restore failed', e);
        }

        playbackRestoreRef.current = null;
        setIsPlaybackStateRestored(true);
    }, [songs, isPlaybackStateRestored]);

    useEffect(() => {
        if (!currentSong) return;
        try {
            const state = {
                currentSongId: currentSong.id || null,
                isPlaying,
                isShuffle,
                isRepeat,
                mode: isUsingUpNext ? 'upnext' : isUsingPlaylistQueue ? 'playlist' : isUsingArtistQueue ? 'artist' : isUsingMoodQueue ? 'mood' : 'global',
                upNextQueueIds: Array.isArray(upNextQueue) ? upNextQueue.map(s => s && s.id) : [],
                upNextIndex,
                playlistQueueIds: Array.isArray(playlistQueue) ? playlistQueue.map(s => s && s.id) : [],
                playlistQueueIndex,
                artistQueueIds: Array.isArray(artistQueue) ? artistQueue.map(s => s && s.id) : [],
                artistQueueIndex,
                moodQueueIds: Array.isArray(moodQueue) ? moodQueue.map(s => s && s.id) : [],
                moodQueueIndex
            };
            localStorage.setItem(PLAYBACK_STATE_STORAGE_KEY, JSON.stringify(state));
        } catch (e) {
            console.warn('Unable to persist playback state', e);
        }
    }, [currentSong, isPlaying, isShuffle, isRepeat, isUsingUpNext, upNextQueue, upNextIndex, isUsingPlaylistQueue, playlistQueue, playlistQueueIndex, isUsingArtistQueue, artistQueue, artistQueueIndex, isUsingMoodQueue, moodQueue, moodQueueIndex]);

    // Quick API health check through the centralized API client.
    useEffect(() => {
        let mounted = true;
        apiClient.fetchWithFallback('GET', '/health')
            .then(() => { if (mounted) setApiHealthy(true); })
            .catch(() => { if (mounted) setApiHealthy(false); });
        return () => { mounted = false; };
    }, []);
    // Ensure a global bare `onAddToQueue` exists in the page global scope for
    // legacy bundles that call `onAddToQueue(...)` (without `window.`). This
    // forwards to `window.__APP_ON_ADD_TO_QUEUE` when present.
    useEffect(() => {
        try {
            if (typeof window !== 'undefined') {
                if (!window.onAddToQueue) {
                    window.onAddToQueue = function() {
                        try {
                            if (window.__APP_ON_ADD_TO_QUEUE && typeof window.__APP_ON_ADD_TO_QUEUE === 'function') {
                                return window.__APP_ON_ADD_TO_QUEUE.apply(null, arguments);
                            }
                        } catch (e) {}
                        console.warn('Global onAddToQueue called but no app handler is registered.');
                        return null;
                    };
                }
            }
        } catch (e) {
            // silent
        }
    }, [navigate]);

    // Global image error handler: replace any broken images with a placeholder
    useEffect(() => {
        const onImgError = (e) => {
            try {
                const el = e && e.target;
                if (!el) return;
                if (el.tagName && el.tagName.toLowerCase() === 'img') {
                    el.onerror = null;
                    el.src = 'https://placehold.co/200x200/1F2937/FFFFFF?text=Music';
                }
            } catch (err) {
                // ignore
            }
        };
        window.addEventListener('error', onImgError, true);
        return () => window.removeEventListener('error', onImgError, true);
    }, []);

    // Mobile edge-swipe: detect a right swipe starting from the left edge
    // and navigate back one step. This complements native swipe-back and
    // ensures the app navigates back inside PWAs/webviews where gestures
    // might not be forwarded consistently.
    useEffect(() => {
        const isMobile = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(max-width: 767px)').matches;
        if (!isMobile) return;

        let startX = 0;
        let startY = 0;
        let tracking = false;

        const onTouchStart = (e) => {
            if (!e.touches || e.touches.length !== 1) return;
            const t = e.touches[0];
            // Only start if gesture begins near left edge (within 30px)
            if (t.clientX > 30) return;
            startX = t.clientX;
            startY = t.clientY;
            tracking = true;
        };

        const onTouchMove = (e) => {
            if (!tracking || !e.touches || e.touches.length !== 1) return;
            const t = e.touches[0];
            const dx = t.clientX - startX;
            const dy = Math.abs(t.clientY - startY);
            // horizontal swipe to right with limited vertical movement
            if (dx > 100 && dy < 60) {
                tracking = false;
                try {
                    navigate(-1);
                } catch (e) {
                    window.history.back();
                }
            }
        };

        const onTouchEnd = () => { tracking = false; };

        window.addEventListener('touchstart', onTouchStart, { passive: true });
        window.addEventListener('touchmove', onTouchMove, { passive: true });
        window.addEventListener('touchend', onTouchEnd);

        return () => {
            window.removeEventListener('touchstart', onTouchStart);
            window.removeEventListener('touchmove', onTouchMove);
            window.removeEventListener('touchend', onTouchEnd);
        };
    }, [navigate]);
    useEffect(() => { 
        if (user) { 
            setIsLoadingSongs(true); 
            const normalizeId = (value) => {
                if (value === undefined || value === null || value === '') return '';
                if (typeof value === 'string') return value;
                if (typeof value === 'number') return String(value);
                if (value && typeof value === 'object' && value.$oid) return String(value.$oid);
                if (value && typeof value === 'object' && typeof value.toString === 'function') {
                    const str = String(value);
                    return str === '[object Object]' ? '' : str;
                }
                return String(value);
            };
            const parseDurationToSeconds = (dur) => {
                if (dur === undefined || dur === null || dur === '') return 0;
                if (typeof dur === 'string') {
                    const normalized = dur.trim();
                    if (normalized.includes(':')) {
                        const parts = normalized.split(':').map(p => Number(p));
                        if (parts.length === 3 && parts.every(Number.isFinite)) return parts[0] * 3600 + parts[1] * 60 + parts[2];
                        if (parts.length === 2 && parts.every(Number.isFinite)) return parts[0] * 60 + parts[1];
                        return Number(parts[0]) || 0;
                    }
                    const numeric = Number(normalized);
                    if (Number.isFinite(numeric)) {
                        return numeric > 10000 ? Math.round(numeric / 1000) : numeric;
                    }
                    return 0;
                }
                if (typeof dur === 'number' && Number.isFinite(dur)) {
                    return dur > 10000 ? Math.round(dur / 1000) : dur;
                }
                return 0;
            };
            const resolveDuration = (song) => {
                if (!song) return 0;
                const candidates = [
                    song.duration,
                    song.durationSeconds,
                    song.duration_seconds,
                    song.durationMs,
                    song.duration_ms,
                    song.durationMillis,
                    song.duration_millis,
                    song.length,
                    song.audioDuration,
                    song.metadata?.duration,
                    song.metadata?.durationSeconds,
                    song.metadata?.duration_seconds,
                    song.metadata?.durationMs,
                    song.metadata?.duration_ms
                ];
                for (const value of candidates) {
                    const parsed = parseDurationToSeconds(value);
                    if (parsed > 0) return parsed;
                }
                return 0;
            };
            const resolveSongUrl = (song) => {
                if (!song || typeof song !== 'object') return '';
                const preferredBase = (() => {
                    const fromEnv = (import.meta && import.meta.env && import.meta.env.VITE_API_URL)
                        ? String(import.meta.env.VITE_API_URL).replace(/\/$/, '')
                        : '';
                    const fromRuntime = (typeof window !== 'undefined' && window.__API_URL)
                        ? String(window.__API_URL).replace(/\/$/, '')
                        : '';
                    return fromEnv || fromRuntime || 'https://mellow-backend-main.onrender.com';
                })();
                const normalizeStreamUrl = (value) => {
                    if (!value || typeof value !== 'string') return '';
                    const streamMatch = value.match(/\/api\/songs\/stream\/([^/?#]+)/i);
                    if (!streamMatch) return value;
                    if (/https?:\/\/(localhost|127\.0\.0\.1):(5000|5001)\//i.test(value)) {
                        return `${preferredBase}/api/songs/stream/${streamMatch[1]}`;
                    }
                    return value;
                };
                const raw = song.songUrl || song.url || song.song_url || song.audioUrl || song.audio_url || song.fileUrl || song.file_url || song.file?.url || song.audio?.url || song.asset?.url || '';
                return normalizeStreamUrl(raw);
            };
            const reconcileQueueItems = (queueItems, normalizedSongs) => {
                if (!Array.isArray(queueItems) || !Array.isArray(normalizedSongs)) return queueItems;
                const songMap = new Map();
                for (const s of normalizedSongs) {
                    try {
                        const sid = s && (s.id || s._id);
                        if (sid) songMap.set(String(sid), s);
                        if (s && s.songId) songMap.set(String(s.songId), s);
                    } catch (e) {}
                }
                return queueItems.map((item) => {
                    if (!item) return item;
                    const candidates = [item.id, item.songId, item._id];
                    for (const k of candidates) {
                        if (k && songMap.has(String(k))) return songMap.get(String(k));
                    }
                    // fallback: try to match by numeric/string equality against normalizedSongs
                    const found = normalizedSongs.find(s => s && (String(s.id) === String(item.id) || String(s.id) === String(item.songId) || String(s.id) === String(item._id)));
                    return found || item;
                });
            };
            const updateQueueServiceWithSongs = (normalizedSongs) => {
                try {
                    queueService.queue = reconcileQueueItems(queueService.queue, normalizedSongs);
                    queueService.originalQueue = reconcileQueueItems(queueService.originalQueue || [], normalizedSongs);
                } catch (e) {
                    console.warn('Failed to update queueService with normalized songs', e);
                }
            };
            const getSongUrl = (song) => {
                if (!song || typeof song !== 'object') return '';
                return song.songUrl || song.url || song.song_url || song.audioUrl || song.audio_url || song.fileUrl || song.file_url || '';
            };
            const loadAudioDuration = (song) => new Promise((resolve) => {
                const songUrl = getSongUrl(song);
                if (!song || !songUrl) return resolve(0);
                const audio = new Audio();
                audio.crossOrigin = 'anonymous';
                let finished = false;
                const cleanup = () => {
                    audio.removeEventListener('loadedmetadata', onLoaded);
                    audio.removeEventListener('error', onError);
                };
                const done = (value) => {
                    if (finished) return;
                    finished = true;
                    cleanup();
                    resolve(Number.isFinite(value) && value > 0 ? Math.round(value) : 0);
                };
                const onLoaded = () => done(audio.duration);
                const onError = () => done(0);
                audio.addEventListener('loadedmetadata', onLoaded);
                audio.addEventListener('error', onError);
                audio.preload = 'metadata';
                audio.src = songUrl;
                audio.load();
                setTimeout(() => done(0), 10000);
            });
            const hydrateMissingDurations = async (songList) => {
                if (!Array.isArray(songList)) return;
                const missing = songList.filter(s => s && (!s.duration || s.duration === 0) && getSongUrl(s)).slice(0, 10);
                for (const song of missing) {
                    const loaded = await loadAudioDuration(song);
                    if (loaded > 0) {
                        const updateId = String(song.id);
                        setSongs(prev => prev.map(s => s && String(s.id) === updateId ? { ...s, duration: loaded } : s));
                        const updateList = (arr) => Array.isArray(arr) ? arr.map(s => s && String(s.id) === updateId ? { ...s, duration: loaded } : s) : arr;
                        setUpNextQueue(prev => updateList(prev));
                        setArtistQueue(prev => updateList(prev));
                        setMoodQueue(prev => updateList(prev));
                        setPlaylistQueue(prev => updateList(prev));
                        setQueue(prev => updateList(prev));
                        setModalQueueCache(prev => updateList(prev));
                        setModalRelatedCache(prev => updateList(prev));
                        try {
                            queueService.queue = updateList(queueService.queue);
                            queueService.originalQueue = updateList(queueService.originalQueue || []);
                        } catch (e) {
                            console.warn('Failed to update queueService with hydrated duration', e);
                        }
                    }
                }
            };
            const activeToken = (user && user.token) ? user.token : readStoredUser()?.token;
            if (!activeToken) {
                setSongs([]);
                setIsLoadingSongs(false);
                return;
            }

            getSongs(activeToken)
                .then((data) => {
                    // normalize song objects: ensure `id`, `coverUrl`, and parsed duration seconds
                    const normalized = Array.isArray(data) ? data.map(s => ({
                        ...s,
                        id: normalizeId(s.id || s._id || (s._id && s._id.$oid)) || String(s.id || s._id || (s._id && s._id.$oid) || ''),
                        coverUrl: s.coverUrl || s.cover_url || 'https://placehold.co/200x200/1F2937/FFFFFF?text=Music',
                        songUrl: resolveSongUrl(s),
                        duration: resolveDuration(s)
                    })) : [];
                    
                    setSongs(normalized);
                    setQueue(prev => reconcileQueueItems(prev, normalized));
                    setUpNextQueue(prev => reconcileQueueItems(prev, normalized));
                    setArtistQueue(prev => reconcileQueueItems(prev, normalized));
                    setMoodQueue(prev => reconcileQueueItems(prev, normalized));
                    setPlaylistQueue(prev => reconcileQueueItems(prev, normalized));
                    setModalQueueCache(prev => reconcileQueueItems(prev, normalized));
                    setModalRelatedCache(prev => reconcileQueueItems(prev, normalized));
                    updateQueueServiceWithSongs(normalized);
                    hydrateMissingDurations(normalized).catch(() => {});
                })
                .catch(err => {
                    if (String(err.message || '').toLowerCase().includes('token expired')) {
                        // Auto-logout on expired token
                        try { localStorage.removeItem('user'); } catch {}
                        setIsPlaying(false);
                        if (audioRef.current) audioRef.current.src = "";
                        setUser(null);
                        setSongs([]);
                        setCurrentSongIndex(0);
                        setError(null);
                    } else {
                        setError(err.message);
                    }
                })
                .finally(() => setIsLoadingSongs(false)); 
        } 
    }, [user, readStoredUser]);
    // Removed mobile-only automatic song refresh due to app background / restore issues.
    // Playback state is now persisted separately to survive reloads and app restarts.
    useEffect(() => {
        const a = audioRef.current;
        const currentSongUrl = getSongUrl(currentSong);
        if (!a || !currentSong || !currentSongUrl) return;

        try {
            AudioEngine.init(a);
        } catch (e) {
            console.warn('AudioEngine init error', e);
        }

        try {
            if (a.src !== currentSongUrl) {
                a.src = currentSongUrl;
                a.load();
                console.debug('Loading song:', currentSong.title, currentSongUrl);
            }

            if (isPlaying) {
                a.play().catch(err => {
                    if (err && err.name === 'AbortError') return;
                    if (err && err.name === 'NotAllowedError') {
                        setIsPlaying(false);
                        return;
                    }
                    console.error('Audio play error after song load:', err);
                });
            }

            // Start native media service
            (async () => {
                try {
                    const nms = await loadNativeMediaService();
                    if (nms) await nms.start(currentSong, isPlaying);
                    const lss = await loadLockScreenService();
                    if (lss) lss.setMetadata(currentSong);
                } catch(e) { console.warn('nativeMediaService.start error', e); }
            })();
        } catch (e) {
            console.error('Error loading song:', e);
        }
    }, [currentSong, isPlaying]);
    useEffect(() => { 
        const a = audioRef.current; 
        if (a) { 
            if (isPlaying) { 
                a.play().catch(err => { 
                    if (err && err.name === 'AbortError') return; 
                    if (err && err.name === 'NotAllowedError') {
                        setIsPlaying(false);
                        return;
                    }
                    console.error(err); 
                }); 
            } else { 
                a.pause(); 
            } 
        }
        // Update native notification play state
        (async () => {
            try {
                const nms = await loadNativeMediaService();
                if (nms) {
                    await nms.updateIsPlaying(isPlaying);
                    try {
                        const lss = await loadLockScreenService();
                        if (lss) lss.setPlaybackState(isPlaying ? 'playing' : 'paused');
                    } catch (e) { console.warn('lockScreenService.setPlaybackState error', e); }
                }
            } catch(e) { console.warn('nativeMediaService.updateIsPlaying error', e); }
        })();
    }, [isPlaying]);

    

    // Handlers
    const handleLogin = useCallback((d) => {
        try {
            // Backend returns { token, user: { id, name, email } }
            // Merge token with user object so we have all data in one place
            const userData = {
                ...(d.user || d),
                token: d.token || (d.user ? undefined : d.token)
            };
            setUser(userData);
        } catch (err) {
            // If React state update itself fails for any unexpected reason, log it
            // eslint-disable-next-line no-console
            console.error('setUser failed in handleLogin:', err);
        }

        try {
            // localStorage may throw if value cannot be serialized (circular refs)
            // or storage quotas are exceeded. Guard it so the app doesn't crash.
            if (typeof localStorage !== 'undefined') {
                const userData = {
                    ...(d.user || d),
                    token: d.token || (d.user ? undefined : d.token)
                };
                const serialized = JSON.stringify(userData);
                try {
                    localStorage.setItem('user', serialized);
                } catch (err) {
                    // eslint-disable-next-line no-console
                    console.error('Failed to save user to localStorage:', err);
                }
            }
        } catch (err) {
            // Fallback guard for environments where localStorage access throws
            // eslint-disable-next-line no-console
            console.error('Unexpected error while storing user:', err);
        }
    }, []);
    const handleLogout = useCallback(() => { setIsPlaying(false); if (audioRef.current) audioRef.current.src = ""; setUser(null); setSongs([]); setCurrentSongIndex(0); localStorage.removeItem('user'); }, []);
    const handlePlayPause = useCallback(() => { if (!currentSong) return; setIsPlaying(p => !p); setIsPlayerInitialized(true); }, [currentSong]);
    const handleTogglePlayerExpand = useCallback(() => setIsPlayerExpanded(p => !p), []);
    const handleExpandPlayer = useCallback(() => setIsPlayerExpanded(true), []);
    const toggleBottomPlayerClicked = useCallback(() => {
        setIsBottomPlayerClicked(v => !v);
    }, []);

    // manage enter animation state for expanded player
    useEffect(() => {
        let t;
        if (isPlayerExpanded) {
            // allow render, then mark entered to trigger CSS transition
            // slightly increased delay to better match slower gesture animation
            t = setTimeout(() => setIsPlayerEntered(true), 40);
        } else {
            setIsPlayerEntered(false);
        }
        return () => clearTimeout(t);
    }, [isPlayerExpanded]);
    const handleNext = useCallback(() => {
        try {
            // helper for verbose branch logging (temporary)
            const logBranch = (name) => {
                try {
                    // eslint-disable-next-line no-console
                    console.debug('handleNext: BRANCH', {
                        branch: name,
                        queueService: queueService.getQueue(),
                        queueServiceIndex: queueService.currentIndex,
                        upNextQueue: upNextQueue,
                        upNextIndex,
                        moodQueue: moodQueue,
                        moodQueueIndex,
                        playlistQueue: playlistQueue,
                        playlistQueueIndex,
                        artistQueue: artistQueue,
                        artistQueueIndex,
                        currentSongIndex,
                        currentSongId: currentSong && currentSong.id ? currentSong.id : null
                    });
                } catch (e) {}
            };
            try {
                // Top-level debug to trace which branch will run
                // eslint-disable-next-line no-console
                console.debug('handleNext: flags', { isUsingUpNext, upNextLen: Array.isArray(upNextQueue)?upNextQueue.length:0, upNextIndex, isUsingMoodQueue, moodLen: Array.isArray(moodQueue)?moodQueue.length:0, isUsingPlaylistQueue, playlistLen: Array.isArray(playlistQueue)?playlistQueue.length:0, queueLen: queueService.getQueue().length, isShuffle, currentSongIndex });
                // extra snapshot for debugging
                console.debug('handleNext: snapshot', {
                    currentSongId: currentSong && currentSong.id ? currentSong.id : null,
                    upNextIndex,
                    upNextQueueIds: Array.isArray(upNextQueue) ? upNextQueue.map(s => s && s.id) : [],
                    queueServiceIds: queueService.getQueue().map(s => s && s.id),
                    isShuffle,
                    isMoodShuffleMode
                });
            } catch(e) {}

            // If deterministic UP NEXT is active, force the next song to come from
            // the `upNextQueue` list by rebuilding the `queueService` from it and
            // advancing the pointer there. This avoids relying on any stale global
            // queue that may have been present in `queueService` previously.
            try {
                if (isUsingUpNext && Array.isArray(upNextQueue) && upNextQueue.length > 0) {
                    try {
                        // Rebuild queueService unconditionally from UP NEXT ordering
                        queueService.clearQueue();
                        queueService.addToQueue(upNextQueue, 'end');
                        // UP NEXT shuffle control is driven by the global `isShuffle`
                        // toggle exposed in the modal, so reflect that here so
                        // queueService.next() honors the correct behavior.
                        queueService.isShuffleMode = !!isShuffle;
                        if (!queueService.isShuffleMode) queueService.originalQueue = [...queueService.queue];

                        const currentId = currentSong && currentSong.id ? String(currentSong.id) : null;
                        const idxInUpNext = currentId ? upNextQueue.findIndex(s => String(s.id) === String(currentId)) : -1;
                        queueService.currentIndex = idxInUpNext >= 0 ? idxInUpNext : 0;

                        // Sync local UI queue state with UP NEXT ordering so the
                        // deterministic block later in this function can advance
                        // using `upNextQueue`/`upNextIndex` consistently.
                        setQueue(queueService.getQueue());
                        // keep upNextIndex aligned with service pointer
                        setUpNextIndex(typeof queueService.currentIndex === 'number' ? queueService.currentIndex : 0);
                        try { console.debug('handleNext: after rebuild sync', { queueServiceIds: queueService.getQueue().map(s=>s&&s.id), serviceIndex: queueService.currentIndex, upNextIndex }); } catch(e) {}
                    } catch (e) {
                        // non-fatal, fall through to other branches
                    }
                }
            } catch (err) { /* non-fatal */ }
            // If we're currently using a playlist-scoped queue, advance within it
            if (isUsingPlaylistQueue && Array.isArray(playlistQueue) && playlistQueue.length > 0) {
                // Use playlistQueueIndex directly (it's reliable) to determine the next index
                const currentIdx = playlistQueueIndex;
                
                // If shuffle is on, pick a random song; otherwise go to next sequential
                let nextIdx;
                if (isPlaylistShuffleMode) {
                    // Pick a random song from the queue (preferably not the current one)
                    if (playlistQueue.length > 1) {
                        do {
                            nextIdx = Math.floor(Math.random() * playlistQueue.length);
                        } while (nextIdx === currentIdx);
                    } else {
                        nextIdx = 0;
                    }
                } else {
                    nextIdx = currentIdx + 1;
                }
                
                try {
                    // eslint-disable-next-line no-console
                    console.debug('handleNext: PLAYLIST QUEUE MODE', {
                        currentIdx,
                        playlistQueueIndex,
                        nextIdx,
                        isPlaylistShuffleMode,
                        playlistQueueLength: playlistQueue.length,
                        nextSongExists: nextIdx < playlistQueue.length,
                        currentSongTitle: playlistQueue[currentIdx] ? playlistQueue[currentIdx].title : 'N/A',
                        nextSongTitle: nextIdx < playlistQueue.length ? playlistQueue[nextIdx].title : 'N/A',
                        activePlaylistId
                    });
                } catch (e) {}
                
                if (nextIdx < playlistQueue.length) {
                    const nextSong = playlistQueue[nextIdx];
                    // Ensure nextSong is available in global `songs` list
                    const globalIndex = songs.findIndex(s => String(s.id) === String(nextSong.id));
                    if (globalIndex !== -1) {
                        setCurrentSongIndex(globalIndex);
                    } else {
                        setSongs(prev => {
                            if (prev.find(s => String(s.id) === String(nextSong.id))) return prev;
                            const insertIndex = prev.length;
                            const newArr = [...prev, nextSong];
                            setTimeout(() => {
                                setCurrentSongIndex(insertIndex);
                                setIsPlaying(true);
                            }, 0);
                            return newArr;
                        });
                    }
                    setPlaylistQueueIndex(nextIdx);
                    setIsPlaying(true);
                    logBranch('PLAYLIST_QUEUE');
                    return;
                }
                // end of playlist queue: disable playlist mode and fallthrough to global queue
                setIsUsingPlaylistQueue(false);
                setPlaylistQueue([]);
                setActivePlaylistId(null);
            }

            // If we're currently using an artist-scoped queue, advance within it
            if (isUsingArtistQueue && Array.isArray(artistQueue) && artistQueue.length > 0) {
                // Use artistQueueIndex directly (it's reliable) to determine the next index
                const currentIdx = artistQueueIndex;
                
                // If shuffle is on, pick a random song; otherwise go to next sequential
                let nextIdx;
                if (isArtistShuffleMode) {
                    // Pick a random song from the queue (preferably not the current one)
                    if (artistQueue.length > 1) {
                        do {
                            nextIdx = Math.floor(Math.random() * artistQueue.length);
                        } while (nextIdx === currentIdx);
                    } else {
                        nextIdx = 0;
                    }
                } else {
                    nextIdx = currentIdx + 1;
                }
                
                if (nextIdx < artistQueue.length) {
                    const nextSong = artistQueue[nextIdx];
                    const globalIndex = songs.findIndex(s => String(s.id) === String(nextSong.id));
                    if (globalIndex !== -1) {
                        setCurrentSongIndex(globalIndex);
                    } else {
                        setSongs(prev => {
                            if (prev.find(s => String(s.id) === String(nextSong.id))) return prev;
                            const insertIndex = prev.length;
                            const newArr = [...prev, nextSong];
                            setTimeout(() => {
                                setCurrentSongIndex(insertIndex);
                                setIsPlaying(true);
                            }, 0);
                            return newArr;
                        });
                    }
                    setArtistQueueIndex(nextIdx);
                    setIsPlaying(true);
                    logBranch('ARTIST_QUEUE');
                    return;
                }
                // end of artist queue: loop back to the beginning
                const firstArtistSong = artistQueue[0];
                if (firstArtistSong) {
                    const globalIndex = songs.findIndex(s => String(s.id) === String(firstArtistSong.id));
                    if (globalIndex !== -1) {
                        setCurrentSongIndex(globalIndex);
                    } else {
                        setSongs(prev => {
                            if (prev.find(s => String(s.id) === String(firstArtistSong.id))) return prev;
                            const insertIndex = prev.length;
                            const newArr = [...prev, firstArtistSong];
                            setTimeout(() => {
                                setCurrentSongIndex(insertIndex);
                                setIsPlaying(true);
                            }, 0);
                            return newArr;
                        });
                    }
                    setArtistQueueIndex(0);
                    setIsPlaying(true);
                    return;
                }
            }

            // If we're currently using a deterministic UP NEXT queue, advance within it
            if (isUsingUpNext && Array.isArray(upNextQueue) && upNextQueue.length > 0) {
                // Determine current index by locating the currently-playing song inside upNextQueue.
                const currentSongId = currentSong && currentSong.id ? String(currentSong.id) : null;
                let currentIdx = -1;
                if (currentSongId) currentIdx = upNextQueue.findIndex(s => String(s.id) === String(currentSongId));
                if (currentIdx < 0) currentIdx = typeof upNextIndex === 'number' ? upNextIndex : 0;

                // Advance to the next item in UP NEXT (deterministic sequence)
                let nextIdx = currentIdx + 1;

                try { console.debug('handleNext: UP NEXT MODE', { currentSongId, currentIdx, nextIdx, upNextLength: upNextQueue.length, nextId: (upNextQueue[nextIdx]||{}).id }); } catch (e) {}

                if (nextIdx < upNextQueue.length) {
                    const nextSong = upNextQueue[nextIdx];
                    const globalIndex = songs.findIndex(s => String(s.id) === String(nextSong.id));
                    if (globalIndex !== -1) {
                        setCurrentSongIndex(globalIndex);
                    } else {
                        setSongs(prev => {
                            if (prev.find(s => String(s.id) === String(nextSong.id))) return prev;
                            const insertIndex = prev.length;
                            const newArr = [...prev, nextSong];
                            setTimeout(() => { setCurrentSongIndex(insertIndex); setIsPlaying(true); }, 0);
                            return newArr;
                        });
                    }
                    setUpNextIndex(nextIdx);
                    setIsPlaying(true);
                    logBranch('UP_NEXT_DETERMINISTIC');
                    try { console.debug('handleNext: selected from upNextQueue', { nextIdx, nextId: nextSong && nextSong.id, upNextQueueIds: Array.isArray(upNextQueue) ? upNextQueue.map(s=>s&&s.id) : [] }); } catch(e) {}
                    return;
                }
                // loop back to start
                const first = upNextQueue[0];
                if (first) {
                    const globalIndex = songs.findIndex(s => String(s.id) === String(first.id));
                    if (globalIndex !== -1) setCurrentSongIndex(globalIndex);
                    else setSongs(prev => { if (prev.find(s => String(s.id) === String(first.id))) return prev; const insertIndex = prev.length; const newArr = [...prev, first]; setTimeout(() => { setCurrentSongIndex(insertIndex); setIsPlaying(true); }, 0); return newArr; });
                    setUpNextIndex(0);
                    setIsPlaying(true);
                    logBranch('UP_NEXT_LOOP_START');
                    return;
                }
            }

            // If we're currently using a mood-scoped queue, advance within it
            if (isUsingMoodQueue && Array.isArray(moodQueue) && moodQueue.length > 0) {
                // Use moodQueueIndex directly (it's reliable) to determine the next index
                const currentIdx = moodQueueIndex;
                
                // If shuffle is on, pick a random song; otherwise go to next sequential
                let nextIdx;
                if (isMoodShuffleMode) {
                    // Pick a random song from the queue (preferably not the current one)
                    if (moodQueue.length > 1) {
                        do {
                            nextIdx = Math.floor(Math.random() * moodQueue.length);
                        } while (nextIdx === currentIdx);
                    } else {
                        nextIdx = 0;
                    }
                } else {
                    nextIdx = currentIdx + 1;
                }
                
                try {
                    // eslint-disable-next-line no-console
                    console.debug('handleNext: MOOD QUEUE MODE', {
                        currentIdx,
                        moodQueueIndex,
                        nextIdx,
                        isMoodShuffleMode,
                        moodQueueLength: moodQueue.length,
                        nextSongExists: nextIdx < moodQueue.length,
                        currentSongTitle: moodQueue[currentIdx] ? moodQueue[currentIdx].title : 'N/A',
                        nextSongTitle: nextIdx < moodQueue.length ? moodQueue[nextIdx].title : 'N/A'
                    });
                } catch (e) {}

                if (nextIdx < moodQueue.length) {
                    const nextSong = moodQueue[nextIdx];
                    const globalIndex = songs.findIndex(s => String(s.id) === String(nextSong.id));
                    if (globalIndex !== -1) {
                        setCurrentSongIndex(globalIndex);
                    } else {
                        setSongs(prev => {
                            if (prev.find(s => String(s.id) === String(nextSong.id))) return prev;
                            const insertIndex = prev.length;
                            const newArr = [...prev, nextSong];
                            setTimeout(() => {
                                setCurrentSongIndex(insertIndex);
                                setIsPlaying(true);
                            }, 0);
                            return newArr;
                        });
                    }
                    // update moodQueueIndex to keep the queue pointer consistent
                    setMoodQueueIndex(nextIdx);
                    setIsPlaying(true);
                    logBranch('MOOD_QUEUE');
                    return;
                }
                // end of mood queue: loop back to the beginning of UP NEXT
                // This ensures UP NEXT plays cyclically instead of falling back to global sequential
                const firstSong = moodQueue[0];
                if (firstSong) {
                    const globalIndex = songs.findIndex(s => String(s.id) === String(firstSong.id));
                    if (globalIndex !== -1) {
                        setCurrentSongIndex(globalIndex);
                    } else {
                        setSongs(prev => {
                            if (prev.find(s => String(s.id) === String(firstSong.id))) return prev;
                            const insertIndex = prev.length;
                            const newArr = [...prev, firstSong];
                            setTimeout(() => {
                                setCurrentSongIndex(insertIndex);
                                setIsPlaying(true);
                            }, 0);
                            return newArr;
                        });
                    }
                    setMoodQueueIndex(0);
                    setIsPlaying(true);
                    logBranch('MOOD_QUEUE_LOOP_START');
                    try {
                        // eslint-disable-next-line no-console
                        console.debug('handleNext: Looped UP NEXT queue back to start');
                    } catch (e) {}
                    return;
                }
            }

            const q = queueService.getQueue();
            if (q.length > 0) {
                // move queue pointer and play next queue song
                const nextSong = queueService.next();
                if (nextSong) {
                    const globalIndex = songs.findIndex(s => s.id === nextSong.id);
                    if (globalIndex !== -1) {
                        setCurrentSongIndex(globalIndex);
                    } else {
                        setSongs(prev => {
                            if (prev.find(s => s.id === nextSong.id)) return prev;
                            const insertIndex = prev.length;
                            const newArr = [...prev, nextSong];
                            setTimeout(() => {
                                setCurrentSongIndex(insertIndex);
                                setIsPlaying(true);
                                setQueue(queueService.getQueue());
                            }, 0);
                            return newArr;
                        });
                    }
                    setIsPlaying(true);
                    setQueue(queueService.getQueue());
                    logBranch('GLOBAL_QUEUE_SERVICE');
                    return;
                }
            }
            if (songs.length === 0) return;
            let n = isShuffle ? Math.floor(Math.random() * songs.length) : (currentSongIndex + 1) % songs.length;
            if (isShuffle && n === currentSongIndex) return handleNext();
            setCurrentSongIndex(n);
            setIsPlaying(true);
            logBranch('GLOBAL_FALLBACK');
        } catch (err) {
            console.error('handleNext error', err);
        }
    }, [songs, currentSongIndex, isShuffle, isUsingPlaylistQueue, playlistQueue, playlistQueueIndex, isPlaylistShuffleMode, isUsingArtistQueue, artistQueue, artistQueueIndex, isArtistShuffleMode, isUsingUpNext, upNextQueue, upNextIndex, isUsingMoodQueue, moodQueue, moodQueueIndex, isMoodShuffleMode]);

    const handlePrev = useCallback(() => {
        try {
            // If UP NEXT is active, step back inside it
            if (isUsingUpNext && Array.isArray(upNextQueue) && upNextQueue.length > 0) {
                const currentSongId = currentSong && currentSong.id ? String(currentSong.id) : null;
                const currentIdx = currentSongId ? upNextQueue.findIndex(s => String(s.id) === String(currentSongId)) : upNextIndex;
                const actualIdx = currentIdx >= 0 ? currentIdx : upNextIndex;
                // Move to the previous item in UP NEXT (deterministic sequence)
                const prevIdx = actualIdx - 1;
                if (prevIdx >= 0) {
                    const prevSong = upNextQueue[prevIdx];
                    const globalIndex = songs.findIndex(s => String(s.id) === String(prevSong.id));
                    if (globalIndex !== -1) { setCurrentSongIndex(globalIndex); }
                    else { setSongs(prev => { if (prev.find(s => String(s.id) === String(prevSong.id))) return prev; const insertIndex = prev.length; const newArr = [...prev, prevSong]; setTimeout(() => { setCurrentSongIndex(insertIndex); setIsPlaying(true); }, 0); return newArr; }); }
                    setUpNextIndex(prevIdx);
                    setIsPlaying(true);
                    return;
                }
                // loop to end
                const lastIdx = upNextQueue.length - 1;
                const last = upNextQueue[lastIdx];
                if (last) {
                    const globalIndex = songs.findIndex(s => String(s.id) === String(last.id));
                    if (globalIndex !== -1) setCurrentSongIndex(globalIndex);
                    else setSongs(prev => { if (prev.find(s => String(s.id) === String(last.id))) return prev; const insertIndex = prev.length; const newArr = [...prev, last]; setTimeout(() => { setCurrentSongIndex(insertIndex); setIsPlaying(true); }, 0); return newArr; });
                    setUpNextIndex(lastIdx);
                    setIsPlaying(true);
                    return;
                }
            }
            // If playlist-scoped queue is active, move back inside it
            if (isUsingPlaylistQueue && Array.isArray(playlistQueue) && playlistQueue.length > 0) {
                const prevIdx = playlistQueueIndex - 1;
                if (prevIdx >= 0) {
                    const prevSong = playlistQueue[prevIdx];
                    const globalIndex = songs.findIndex(s => String(s.id) === String(prevSong.id));
                    if (globalIndex !== -1) {
                        setCurrentSongIndex(globalIndex);
                    } else {
                        setSongs(prev => {
                            if (prev.find(s => String(s.id) === String(prevSong.id))) return prev;
                            const insertIndex = prev.length;
                            const newArr = [...prev, prevSong];
                            setTimeout(() => {
                                setCurrentSongIndex(insertIndex);
                                setIsPlaying(true);
                            }, 0);
                            return newArr;
                        });
                    }
                    setPlaylistQueueIndex(prevIdx);
                    setIsPlaying(true);
                    return;
                }
                // at start: disable playlist mode and fall back to global queue behavior
                setIsUsingPlaylistQueue(false);
                setPlaylistQueue([]);
                setActivePlaylistId(null);
            }

            // If artist-scoped queue is active, move back inside it
            if (isUsingArtistQueue && Array.isArray(artistQueue) && artistQueue.length > 0) {
                // Find current song position in artist queue using currentSong ID
                const currentSongId = currentSong && currentSong.id;
                const currentIdx = currentSongId 
                    ? artistQueue.findIndex(s => String(s.id) === String(currentSongId))
                    : artistQueueIndex;
                const actualIdx = currentIdx >= 0 ? currentIdx : artistQueueIndex;
                
                // If shuffle is on, pick a random song; otherwise go to previous sequential
                let prevIdx;
                if (isArtistShuffleMode) {
                    // Pick a random song from the queue (can be any song)
                    prevIdx = Math.floor(Math.random() * artistQueue.length);
                } else {
                    prevIdx = actualIdx - 1;
                }
                
                if (prevIdx >= 0) {
                    const prevSong = artistQueue[prevIdx];
                    const globalIndex = songs.findIndex(s => String(s.id) === String(prevSong.id));
                    if (globalIndex !== -1) {
                        setCurrentSongIndex(globalIndex);
                    } else {
                        setSongs(prev => {
                            if (prev.find(s => String(s.id) === String(prevSong.id))) return prev;
                            const insertIndex = prev.length;
                            const newArr = [...prev, prevSong];
                            setTimeout(() => {
                                setCurrentSongIndex(insertIndex);
                                setIsPlaying(true);
                            }, 0);
                            return newArr;
                        });
                    }
                    setArtistQueueIndex(prevIdx);
                    setIsPlaying(true);
                    return;
                }
                // at start: loop to the end of artist queue
                const lastArtistIdx = artistQueue.length - 1;
                const lastArtistSong = artistQueue[lastArtistIdx];
                if (lastArtistSong) {
                    const globalIndex = songs.findIndex(s => String(s.id) === String(lastArtistSong.id));
                    if (globalIndex !== -1) {
                        setCurrentSongIndex(globalIndex);
                    } else {
                        setSongs(prev => {
                            if (prev.find(s => String(s.id) === String(lastArtistSong.id))) return prev;
                            const insertIndex = prev.length;
                            const newArr = [...prev, lastArtistSong];
                            setTimeout(() => {
                                setCurrentSongIndex(insertIndex);
                                setIsPlaying(true);
                            }, 0);
                            return newArr;
                        });
                    }
                    setArtistQueueIndex(lastArtistIdx);
                    setIsPlaying(true);
                    return;
                }
            }

            // If mood-scoped queue is active, move back inside it
            if (isUsingMoodQueue && Array.isArray(moodQueue) && moodQueue.length > 0) {
                // Find current song position in mood queue using currentSong ID
                const currentSongId = currentSong && currentSong.id;
                const currentIdx = currentSongId 
                    ? moodQueue.findIndex(s => String(s.id) === String(currentSongId))
                    : moodQueueIndex;
                const actualIdx = currentIdx >= 0 ? currentIdx : moodQueueIndex;
                
                // If shuffle is on, pick a random song; otherwise go to previous sequential
                let prevIdx;
                if (isMoodShuffleMode) {
                    // Pick a random song from the queue (can be any song)
                    prevIdx = Math.floor(Math.random() * moodQueue.length);
                } else {
                    prevIdx = actualIdx - 1;
                }
                
                if (prevIdx >= 0) {
                    const prevSong = moodQueue[prevIdx];
                    const globalIndex = songs.findIndex(s => String(s.id) === String(prevSong.id));
                    if (globalIndex !== -1) {
                        setCurrentSongIndex(globalIndex);
                    } else {
                        setSongs(prev => {
                            if (prev.find(s => String(s.id) === String(prevSong.id))) return prev;
                            const insertIndex = prev.length;
                            const newArr = [...prev, prevSong];
                            setTimeout(() => {
                                setCurrentSongIndex(insertIndex);
                                setIsPlaying(true);
                            }, 0);
                            return newArr;
                        });
                    }
                    setMoodQueueIndex(prevIdx);
                    setIsPlaying(true);
                    return;
                }
                // at start: loop to the end of UP NEXT queue
                const lastIdx = moodQueue.length - 1;
                const lastSong = moodQueue[lastIdx];
                if (lastSong) {
                    const globalIndex = songs.findIndex(s => String(s.id) === String(lastSong.id));
                    if (globalIndex !== -1) {
                        setCurrentSongIndex(globalIndex);
                    } else {
                        setSongs(prev => {
                            if (prev.find(s => String(s.id) === String(lastSong.id))) return prev;
                            const insertIndex = prev.length;
                            const newArr = [...prev, lastSong];
                            setTimeout(() => {
                                setCurrentSongIndex(insertIndex);
                                setIsPlaying(true);
                            }, 0);
                            return newArr;
                        });
                    }
                    setMoodQueueIndex(lastIdx);
                    setIsPlaying(true);
                    return;
                }
            }

            const q = queueService.getQueue();
            if (q.length > 0) {
                const prevSong = queueService.previous();
                if (prevSong) {
                    const globalIndex = songs.findIndex(s => s.id === prevSong.id);
                    if (globalIndex !== -1) {
                        setCurrentSongIndex(globalIndex);
                    } else {
                        setSongs(prev => {
                            if (prev.find(s => s.id === prevSong.id)) return prev;
                            const insertIndex = prev.length;
                            const newArr = [...prev, prevSong];
                            setTimeout(() => {
                                setCurrentSongIndex(insertIndex);
                                setIsPlaying(true);
                                setQueue(queueService.getQueue());
                            }, 0);
                            return newArr;
                        });
                    }
                    setIsPlaying(true);
                    setQueue(queueService.getQueue());
                    return;
                }
            }
            if (songs.length === 0) return;
            setCurrentSongIndex((currentSongIndex - 1 + songs.length) % songs.length);
            setIsPlaying(true);
        } catch (err) {
            console.error('handlePrev error', err);
        }
    }, [songs, currentSongIndex, isUsingPlaylistQueue, playlistQueue, playlistQueueIndex, isPlaylistShuffleMode, isUsingArtistQueue, artistQueue, artistQueueIndex, isArtistShuffleMode, isUsingUpNext, upNextQueue, upNextIndex, isUsingMoodQueue, moodQueue, moodQueueIndex, isMoodShuffleMode]);
    // Register lockScreenService event handlers once (after handlers are defined)
    useEffect(() => {
        (async () => {
            try {
                const lss = await loadLockScreenService();
                if (!lss || !lss.isAvailable()) return;
                lss.setEventHandlers({
            onPlay: () => { setIsPlaying(true); },
            onPause: () => { setIsPlaying(false); },
            onPrevious: () => { handlePrev(); },
            onNext: () => { handleNext(); },
            onSeekBackward: (skipSec) => {
                try {
                    const a = audioRef.current; if (!a) return;
                    a.currentTime = Math.max(0, (a.currentTime || 0) - (skipSec || 10));
                    handleTimeUpdate();
                } catch (e) { console.warn('onSeekBackward handler error', e); }
            },
            onSeekForward: (skipSec) => {
                try {
                    const a = audioRef.current; if (!a) return;
                    a.currentTime = Math.min(a.duration || 0, (a.currentTime || 0) + (skipSec || 10));
                    handleTimeUpdate();
                } catch (e) { console.warn('onSeekForward handler error', e); }
            },
            onSeekTo: (seekTime) => {
                try {
                    const a = audioRef.current; if (!a) return;
                    if (typeof seekTime === 'number' && isFinite(seekTime)) {
                        a.currentTime = Math.max(0, Math.min(a.duration || 0, seekTime));
                        handleTimeUpdate();
                    }
                } catch (e) { console.warn('onSeekTo handler error', e); }
            },
            onStop: () => { setIsPlaying(false); }
        });

        const mcs = await loadMusicControlsService();
        if (mcs && mcs.isAvailable()) {
            console.debug('[App] Setting up musicControlsService event handler');
            mcs.setEventHandler((message) => {
                console.debug('[App] musicControlsService event:', message);
                if (!message || typeof message !== 'string') return;
                const action = message.toLowerCase();
                if (action.includes('play')) { setIsPlaying(true); }
                else if (action.includes('pause')) { setIsPlaying(false); }
                else if (action.includes('next')) { handleNext(); }
                else if (action.includes('prev') || action.includes('previous')) { handlePrev(); }
                else if (action.includes('toggle')) { setIsPlaying(prev => !prev); }
                else if (action.includes('destroy')) {
                    mcs.stop();
                }
            });
        } else {
            console.debug('[App] musicControlsService not available');
        }

        // cleanup: clear handlers
        return () => {
            try { lss.setEventHandlers({}); } catch (e) {}
            try { if (mcs) mcs.setEventHandler(null); } catch (e) {}
        };
            } catch (e) {
                console.warn('Error initializing lock screen / music controls services', e);
            }
        })();
    }, [handleNext, handlePrev]);
    const handleVolumeChange = useCallback((v) => { setVolume(v); if (audioRef.current) audioRef.current.volume = v; }, []);
    const handleProgressChange = useCallback((p) => { if (audioRef.current && isFinite(audioRef.current.duration)) audioRef.current.currentTime = (p / 100) * audioRef.current.duration; }, []);
    const handleTimeUpdate = () => {
        if (audioRef.current) {
            const dur = audioRef.current.duration || 0;
            const pos = audioRef.current.currentTime || 0;
            setDuration(dur);
            setCurrentTime(pos);
            setProgress((dur > 0) ? (pos / dur) * 100 : 0);
            
            // If audio just loaded (dur > 0 and we didn't have it before), update backend with duration
            if (dur > 0 && currentSongIndex >= 0 && songs[currentSongIndex]) {
                const currentSong = songs[currentSongIndex];
                const currentSongDuration = getSongDuration(currentSong);
                if (!currentSongDuration || currentSongDuration === 0) {
                    const roundedDuration = Math.round(dur);
                    updateDurationForSong(currentSong.id || currentSong._id, roundedDuration);
                    // Send duration to backend in the background (non-blocking)
                    apiClient.fetchWithFallback('POST', '/songs/update-duration', {
                        body: {
                            songId: currentSong.id || currentSong._id,
                            duration: roundedDuration
                        },
                        token: user?.token || null
                    }).catch(() => {});
                }
            }
            // Update native media service (Android) with position in ms
            try {
                if (nativeMediaService) {
                    const posMs = Math.floor(pos * 1000);
                    nativeMediaService.updatePosition(posMs);
                }
            } catch (e) {
                // non-fatal
            }
            // Update web Media Session position state
            try {
                if (lockScreenService) {
                    lockScreenService.setPositionState({ duration: dur, position: pos, playbackRate: audioRef.current.playbackRate || 1.0 });
                }
            } catch (e) {}
        }
    };
    const handleSongEnd = useCallback(() => {
        try {
            if (isRepeat) {
                if (audioRef.current) {
                    try {
                        audioRef.current.currentTime = 0;
                        setIsPlaying(true);
                    } catch (err) {
                        console.error('Repeat playback error:', err);
                    }
                }
                return;
            }

            handleNext();
        } catch (err) {
            console.error('handleSongEnd error:', err);
            try {
                handleNext();
            } catch (e) {
                console.error('handleSongEnd fallback error:', e);
            }
        }
    }, [isRepeat, handleNext]);

    // Handle audio errors (missing/deleted songs from Cloudinary)
    const handleAudioError = useCallback(() => {
        setIsPlaying(false);

        const failedSong = songs[currentSongIndex];
        const failedSrc = audioRef.current ? (audioRef.current.currentSrc || audioRef.current.src || '') : '';

        if (failedSong) {
            const retryKey = `${String(failedSong.id || '')}::${failedSrc}`;
            const alreadyRetried = streamRetryRef.current.has(retryKey);
            if (!alreadyRetried) {
                streamRetryRef.current.add(retryKey);
                const fallbackUrls = getStreamFallbackUrls(failedSong, failedSrc);
                if (fallbackUrls.length > 0) {
                    const nextUrl = fallbackUrls[0];
                    updateSongUrlEverywhere(failedSong.id, nextUrl);
                    try {
                        if (audioRef.current) {
                            audioRef.current.src = nextUrl;
                            audioRef.current.load();
                        }
                        return;
                    } catch (retryErr) {
                        console.warn('Retrying playback with fallback URL failed:', retryErr);
                    }
                }
            }
        }

        // Remove the broken song if it exists in the current position
        if (currentSongIndex >= 0 && songs[currentSongIndex]) {
            try {
                // Keep the song in the library. A provider or network failure is temporary.
                setIsPlaying(false);
            } catch (err) {
                setIsPlaying(false);
            }
        }
    }, [currentSongIndex, songs, handleNext]);
    const handleSongUploaded = (s) => setSongs(p => [...p, s]);
    const handleSelectSong = useCallback((id, options = {}) => {
        // Initialize player when song is selected
        setIsPlayerInitialized(true);
        try { AudioEngine.resumeContextIfNeeded && AudioEngine.resumeContextIfNeeded(); } catch (e) {}

        const explicitQueue = Array.isArray(options.queue) ? options.queue : null;
        if (explicitQueue && explicitQueue.length > 0) {
            const explicitIndex = explicitQueue.findIndex(s => String(s.id) === String(id));
            setIsUsingUpNext(true);
            setUpNextQueue(explicitQueue);
            setUpNextIndex(explicitIndex >= 0 ? explicitIndex : 0);
            setUpNextSourceId(options.sourceId || options.source || null);
            setIsUsingMoodQueue(true);
            setMoodQueue(explicitQueue);
            setMoodQueueIndex(explicitIndex >= 0 ? explicitIndex : 0);
            setQueue(explicitQueue);
            try {
                queueService.clearQueue();
                queueService.addToQueue(explicitQueue, 'end');
                queueService.currentIndex = explicitIndex >= 0 ? explicitIndex : 0;
            } catch (e) {}
        }
        
        // Track for Quick Picks recommendations
        const selectedSong = songs.find(s => String(s.id) === String(id));
        if (selectedSong) {
            const currentUrl = getSongUrl(selectedSong);
            if (isLocalStreamUrl(currentUrl)) {
                const fallbackUrls = getStreamFallbackUrls(selectedSong, currentUrl);
                const nextUrl = fallbackUrls.find(url => !isLocalStreamUrl(url));
                if (nextUrl && nextUrl !== currentUrl) {
                    updateSongUrlEverywhere(selectedSong.id, nextUrl);
                }
            }
        }
        if (selectedSong) {
            try { addToListeningHistory(selectedSong); } catch (e) {}
            
            // Auto-detect moods for "Old is Gold" and "Hollywood Mix"
            try {
                const detectedMoods = detectSongMood(selectedSong);
                if (detectedMoods.length > 0) {
                    // Log detected moods for analytics
                    console.debug('Moods detected for song:', { songId: id, title: selectedSong.title, moods: detectedMoods });
                }
            } catch (e) {
                console.debug('Error detecting song moods:', e && e.message);
            }
        }
        
        // record listen history
        if (user && user.token) {
            import('./api/userService').then(m => {
                m.addListenHistory(id, user.token).catch(() => {});
            }).catch(() => {});
        }
        // Also maintain a local session fallback for recents so the UI works
        // even if the backend doesn't expose a GET /users/history endpoint.
        try {
            const songObj = songs.find(s => String(s.id) === String(id)) || { id };
            const existing = JSON.parse(localStorage.getItem('recents') || '[]');
            // Remove any existing entry for this song id
            const filtered = existing.filter(e => String(e.id) !== String(songObj.id) && String(e.songId || '') !== String(songObj.id));
            const entry = {
                id: songObj.id || songObj.songId || id,
                title: songObj.title || songObj.name || songObj.songTitle || '',
                artist: songObj.artist || songObj.artists || songObj.artistName || '',
                coverUrl: songObj.coverUrl || songObj.cover || '' ,
                playedAt: Date.now()
            };
            filtered.unshift(entry);
            // limit to 200 entries
            const limited = filtered.slice(0, 200);
            try {
                localStorage.setItem('recents', JSON.stringify(limited));
                try { console.debug('App: wrote recents (select), count=', limited.length); } catch (e) {}
            } catch (e) {
                console.debug('App: localStorage write failed for recents (select)', e && e.message);
            }
            try { queueService.addRecentEntry && queueService.addRecentEntry(entry); } catch (e) {}
            try { window.dispatchEvent(new CustomEvent('recents-updated', { detail: entry })); } catch (e) {}
        } catch (e) {
            // ignore localStorage errors (e.g., private mode)
        }
        // If user manually selects a song (from home/library), clear any
        // active playlist-scoped queue so global playback continues independently.
        // NOTE: We keep mood and artist queues active to support mood/artist-scoped playback
        if (isUsingPlaylistQueue) {
            setIsUsingPlaylistQueue(false);
            setPlaylistQueue([]);
            setActivePlaylistId(null);
        }
        try {
            // eslint-disable-next-line no-console
            console.debug('handleSelectSong called', {songId: id, isUsingMoodQueue, moodQueueLength: moodQueue.length, isUsingArtistQueue, artistQueueLength: artistQueue.length});
        } catch (e) {}
        const i = songs.findIndex(s => s.id === id);
        if (i !== -1) {
            if (currentSongIndex === i) setIsPlaying(p => !p);
            else {
                setCurrentSongIndex(i);
                setIsPlaying(true);
                
                // Check if selected song is already in the current UP NEXT or mood queue
                let songFound = false;
                let foundIndex = -1;
                if (isUsingUpNext && Array.isArray(upNextQueue) && upNextQueue.length > 0) {
                    foundIndex = upNextQueue.findIndex(s => String(s.id) === String(id));
                    songFound = foundIndex !== -1;
                } else if (isUsingMoodQueue && Array.isArray(moodQueue) && moodQueue.length > 0) {
                    foundIndex = moodQueue.findIndex(s => String(s.id) === String(id));
                    songFound = foundIndex !== -1;
                }
                
                // Only create a new mood (UP NEXT) queue if the song is NOT in the current queue
                // AND the selection originated from the search results (or caller explicitly
                // indicated the source). This ensures UP NEXT is created when a user
                // explicitly searched + played a song.
                if (!songFound) {
                    try {
                        const selectedSong = songs[i];
                        if (selectedSong) {
                            // Build a deterministic UP NEXT queue (shuffled tail)
                            const raw = getSongsByMood(selectedSong, songs, true);
                            const tail = ensureListLength(raw, 29, songs, selectedSong.id);
                            const mq = [selectedSong, ...tail];
                                if (mq && mq.length > 0) {
                                // Use the dedicated upNextQueue for deterministic playback
                                setQueue(mq);
                                setUpNextQueue(mq);
                                setIsUsingUpNext(true);
                                setUpNextIndex(0);
                                setUpNextSourceId(selectedSong.id);
                                // keep moodQueue as-is for backward compatibility/visuals
                                try { console.debug('handleSelectSong: Created new UP NEXT (deterministic)', { songId: id, queueLength: mq.length, songTitle: selectedSong.title }); } catch (e) {}
                                // Ensure UP NEXT items exist in global `songs` to avoid lookup fallbacks
                                setSongs(prev => {
                                    try {
                                        const existingIds = new Set(prev.map(s => String(s.id)));
                                        const missing = mq.filter(s => s && !existingIds.has(String(s.id)));
                                        if (!missing || missing.length === 0) return prev;
                                        return [...prev, ...missing];
                                    } catch (err) { return prev; }
                                });
                                // Also seed the global queueService so its next()/previous() match UP NEXT
                                try {
                                    queueService.clearQueue();
                                    queueService.addToQueue(mq, 'end');
                                    queueService.currentIndex = 0;
                                    setQueue(queueService.getQueue());
                                } catch (err) { /* non-fatal */ }
                             }
                        }
                    } catch (e) {}
                } else {
                    // Song is in current queue, update the appropriate queue index
                    if (isUsingUpNext && Array.isArray(upNextQueue) && upNextQueue.length > 0) {
                        setUpNextIndex(foundIndex);
                    } else {
                        setMoodQueueIndex(foundIndex);
                    }
                    try {
                        // eslint-disable-next-line no-console
                        console.debug('handleSelectSong: Song found in existing queue', {
                            songId: id,
                            foundIndex,
                            usingUpNext: isUsingUpNext,
                            moodQueueLength: moodQueue.length,
                            upNextLength: upNextQueue.length
                        });
                    } catch (e) {}
                }
            }
            setSearchTerm('');
            // When user explicitly selects a song, reset queue pointer to the selected song if it's in queue
            try {
                const qIndex = queueService.getQueue().findIndex(s => String(s.id) === String(id));
                if (qIndex !== -1) {
                    queueService.currentIndex = qIndex;
                    setQueue(queueService.getQueue());
                }
            } catch (e) {}
            return;
        }

        // Song not found in global songs list. Maybe the playlist set the queue but
        // the app's `songs` array doesn't include these items yet. Try to find the
        // song in the queueService's queue and play it by injecting into `songs`.
        try {
            const q = queueService.getQueue();
            const qIndex = q.findIndex(s => String(s.id) === String(id));
                if (qIndex !== -1) {
                const queueSong = q[qIndex];
                // append to global songs list so PlayerUI can resolve metadata and src
                setSongs(prev => {
                    // Avoid duplicating if it somehow exists by id
                    if (prev.find(s => String(s.id) === String(id))) {
                        // if it already exists in the global list, play that index
                        const existingIndex = prev.findIndex(s => String(s.id) === String(id));
                        // schedule updates after state settles
                        setTimeout(() => {
                            setCurrentSongIndex(existingIndex);
                            setIsPlaying(true);
                            queueService.currentIndex = qIndex;
                            setQueue(queueService.getQueue());
                            setSearchTerm('');
                        }, 0);
                        return prev;
                    }

                    const insertIndex = prev.length;
                    const newArr = [...prev, queueSong];
                    // schedule playing the newly appended song at the correct index
                    setTimeout(() => {
                        setCurrentSongIndex(insertIndex);
                        setIsPlaying(true);
                        // update queue pointer
                        queueService.currentIndex = qIndex;
                        setQueue(queueService.getQueue());
                        setSearchTerm('');
                    }, 0);
                    return newArr;
                });
                return;
            }
        } catch (e) {
            console.warn('handleSelectSong: queue fallback failed', e);
        }
    }, [songs, currentSongIndex, isUsingUpNext, upNextQueue, upNextIndex, isUsingMoodQueue, moodQueue]);
    // Queue handler used by SongLibrary and playlist views to add a song to the queue
    // Supports two signatures:
    // - handleAddToQueue(songOrSongs, positionString)
    // - handleAddToQueue(songOrSongs, playlistObject)
    // If a playlist object is passed, we treat the addition as 'next' (play after current song).
    const handleAddToQueue = useCallback((songOrSongs, secondArg = 'end') => {
        try {
            // Determine position: if secondArg is a string, assume it's a position marker ('end','next','now')
            let position = 'end';
            if (typeof secondArg === 'string') {
                position = secondArg;
            } else if (secondArg && typeof secondArg === 'object') {
                // If a playlist object (has songs array or id), treat as playlist context -> insert 'next'
                position = 'next';
            }

            // If the internal queue is empty but there is a currently playing global song,
            // seed the queue with the current song so queue indices and "next" semantics work.
            if (queueService.isEmpty()) {
                const playing = currentSong;
                if (playing) {
                    // Ensure the current playing song appears as the first item in the queue
                    queueService.addToQueue(playing, 'end');
                    // Make sure pointer references the playing song
                    queueService.currentIndex = 0;
                }
            }

            // Finally add the requested songs
            queueService.addToQueue(songOrSongs, position);
            // sync local state for UI
            setQueue(queueService.getQueue());
        } catch (err) {
            console.error('Failed to add to queue', err);
        }
    }, [currentSong]);

    // Keep a ref to the latest handler so legacy global callers can safely
    // forward to the current implementation without causing TDZ issues.
    const addToQueueRef = useRef(null);
    useEffect(() => { addToQueueRef.current = handleAddToQueue; }, [handleAddToQueue]);

    // Handler to allow playlist pages to request a separate playlist queue
    // without modifying the global queueService.
    const handleUsePlaylistQueue = useCallback((songsArray, startIndex = 0, playlistId = null) => {
        if (!Array.isArray(songsArray) || songsArray.length === 0) return;
        // Clear global queue when entering playlist mode to avoid conflicts
        queueService.clearQueue();
        // When entering playlist mode, make the playlist the authoritative UP NEXT
        setUpNextQueue(songsArray);
        setUpNextIndex(startIndex >= 0 ? startIndex : 0);
        setUpNextSourceId(playlistId || null);
        setIsUsingUpNext(true);
        setPlaylistQueue(songsArray);
        setPlaylistQueueIndex(startIndex);
        setIsUsingPlaylistQueue(true);
        setActivePlaylistId(playlistId || null);

        // Ensure selected song is available in global songs list and play it
        const songToPlay = songsArray[startIndex];
        if (!songToPlay) return;
        const existing = songs.findIndex(s => String(s.id) === String(songToPlay.id));
        if (existing !== -1) {
            setCurrentSongIndex(existing);
            setIsPlaying(true);
            return;
        }
        setSongs(prev => {
            if (prev.find(s => String(s.id) === String(songToPlay.id))) return prev;
            const insertIndex = prev.length;
            const newArr = [...prev, songToPlay];
            setTimeout(() => {
                setCurrentSongIndex(insertIndex);
                setIsPlaying(true);
            }, 0);
            return newArr;
        });
    }, [songs]);

    // Stable UI toggles used by controls/headers etc.
    const handleShuffleToggle = useCallback(() => setIsShuffle(s => !s), []);
    const handleRepeatToggle = useCallback(() => setIsRepeat(r => !r), []);
    const toggleLogoutVisible = useCallback(() => setIsLogoutVisible(v => !v), []);

    // Open UP NEXT: if a playlist queue is active, navigate into that playlist instead
    const handleOpenUpNext = useCallback(() => {
        try {
            if (isUsingPlaylistQueue && activePlaylistId) {
                navigate(`/playlists/${activePlaylistId}`);
                return;
            }
        } catch (e) {}
        setUpNextRelatedModalMode('upnext');
        setIsUpNextRelatedModalOpen(true);
    }, [isUsingPlaylistQueue, activePlaylistId, navigate]);
    
    // Handle navigating to profile page
    const handleNavigateToProfile = useCallback(() => {
        setIsLogoutVisible(false);
        navigate('/profile');
    }, [navigate]);

    // Handle navigating to equalizer page
    const handleNavigateToEqualizer = useCallback(() => {
        setIsLogoutVisible(false);
        navigate('/equalizer');
    }, [navigate]);

    const handleCloseLogoutMenu = useCallback(() => {
        setIsLogoutVisible(false);
    }, []);

    // Handle "Your Updates" navigation (placeholder for now)
    const handleNavigateToUpdates = useCallback(() => {
        setIsLogoutVisible(false);
        // navigate('/updates'); // TODO: Create updates page when ready
        console.log('Your Updates clicked');
    }, []);

    // Handle "About" navigation (placeholder for now)
    const handleNavigateToAbout = useCallback(() => {
        setIsLogoutVisible(false);
        // navigate('/about'); // TODO: Create about page when ready
        console.log('About clicked');
    }, []);
    
    // New search handlers
    // note: setShowSearchResults is intentionally called before updating the
    // searchTerm state so that when the overlay mounts it will receive the
    // most recent value.  React may batch updates but the next effect in
    // SearchResults now also listens to prop changes which makes this more
    // reliable when the component initializes.
    const handleSearchChange = useCallback((e) => {
        const val = e.target.value;
        // if there's anything to search for, open the overlay first
        if (val.trim()) {
            setShowSearchResults(true);
        }
        setSearchTerm(val);
        // Suggestions UI is not currently rendered; we keep indexing but
        // do not store suggestion state to avoid unused-vars warnings.
    }, []);
    const handleClearSearch = useCallback(() => {
        setSearchTerm('');
        setShowSearchResults(false);
    }, []);
    const handleSearchBarClick = useCallback(() => {
        // Show all songs when clicking on search bar
        setShowSearchResults(true);
    }, []);

    // Listen for a global event so other components (e.g., SongLibrary) can open the overlay
    useEffect(() => {
        function onOpenSearch() {
            const input = document.getElementById('global-search-input-mobile')
                || document.getElementById('global-search-input-desktop');
            if (input) input.focus();
            setShowSearchResults(true);
        }
        window.addEventListener('openSearchOverlay', onOpenSearch);
        return () => window.removeEventListener('openSearchOverlay', onOpenSearch);
    }, []);

    // Handle location change to close overlays and prevent infinite refetch
    useEffect(() => {
        setShowSearchResults(false);
        setSearchTerm('');
    }, [location?.pathname]);

    // Handle browser/mobile gesture back navigation
    useEffect(() => {
        const onPopState = () => {
            // Close modals if open, or sync UI state as needed
            setIsQueueOpen(false);
            setIsPlaylistOpen(false);
            setIsPlayerExpanded(false);
            setIsAdminPanelOpen(false);
            // Optionally clear search or suggestions if desired
            // setSearchTerm(''); setSuggestions([]);
        };
        window.addEventListener('popstate', onPopState);
        return () => window.removeEventListener('popstate', onPopState);
    }, []);

    // Listen for custom event to close search overlay from navigation components
    useEffect(() => {
        function handler() {
            setShowSearchResults(false);
            setSearchTerm('');
        }
        window.addEventListener('close-search-overlay', handler);
        return () => window.removeEventListener('close-search-overlay', handler);
    }, []);

    // Register a stable global shim once. The shim forwards calls to the
    // latest handler stored in addToQueueRef. This avoids referencing the
    // handler before it's initialized and prevents frequent re-writes of the
    // global on every render.
    useEffect(() => {
        try {
            if (typeof window !== 'undefined') {
                window.__APP_ON_ADD_TO_QUEUE = (...args) => {
                    try { return addToQueueRef.current && addToQueueRef.current(...args); } catch (e) { console.error('global onAddToQueue forwarder error', e); }
                };
            }
        } catch (e) {}
        return () => {
            try {
                if (typeof window !== 'undefined' && window.__APP_ON_ADD_TO_QUEUE) {
                    try { delete window.__APP_ON_ADD_TO_QUEUE; } catch (e) { window.__APP_ON_ADD_TO_QUEUE = undefined; }
                }
            } catch (e) {}
        };
    }, []);

    const handleRemoveFromQueue = (songId) => {
        try {
            queueService.removeFromQueue(songId);
            setQueue(queueService.getQueue());
        } catch (err) {
            console.error('Failed to remove from queue', err);
        }
    };

    const handleReorderQueue = (fromIndex, toIndex) => {
        try {
            queueService.reorderQueue(fromIndex, toIndex);
            setQueue(queueService.getQueue());
        } catch (e) {
            console.error('Reorder queue failed', e);
        }
    };

    const handlePlaySongAtIndex = (index) => {
        const q = queueService.getQueue();
        if (index >= 0 && index < q.length) {
            const song = q[index];
            const globalIndex = songs.findIndex(s => s.id === song.id);
            if (globalIndex !== -1) {
                setCurrentSongIndex(globalIndex);
                setIsPlaying(true);
            } else {
                // Not in main list, append and play the queued song. Use a scheduled update
                // so we compute the correct index based on previous array length.
                setSongs(prev => {
                    if (prev.find(s => s.id === song.id)) return prev;
                    const insertIndex = prev.length;
                    const newArr = [...prev, song];
                    setTimeout(() => {
                        setCurrentSongIndex(insertIndex);
                        setIsPlaying(true);
                    }, 0);
                    return newArr;
                });
            }
        }
        setIsQueueOpen(false);
    };

    // Removed unused handleToggleQueue; use `setIsQueueOpen` and `setQueue` directly where needed.

    const handleOpenAddToPlaylist = (songId) => {
        const token = (user && user.token) ? user.token : null;
        if (!token) {
            alert('Please login to manage playlists');
            return;
        }
        setPlaylistSongId(songId);
        setIsPlaylistOpen(true);
    };

    const handlePlaylistUpdated = () => {
        // placeholder for actions after playlist changes
        console.log('Playlist updated');
    };
    
    // Build fuzzy search index when songs change
    useEffect(() => {
        if (songs && songs.length > 0) {
            setFuzzy(createFuzzySearch(songs, ['title', 'artist']));
        }
    }, [songs]);

    // Use fuzzy search for filtering
    const filteredSongs = (fuzzy && searchTerm)
        ? getFuzzySuggestions(fuzzy, searchTerm, 100)
        : songs;
    
    if (isInitializing) return <div className="h-screen bg-[#0f0f0f] flex items-center justify-center"><Loader /></div>;
    
    // determine token for favorites provider
    const token = (user && user.token) ? user.token : null;

    return (
        <div className="h-screen bg-[#0f0f0f] text-white font-sans overflow-hidden">
            {!apiHealthy && (
                <div className="w-full bg-black text-white text-center py-2 z-50">Server unreachable — Restart the App</div>
            )}
            <FavoritesProvider token={user?.token}>
                <Routes>
                    { !user ? (
                        <Route path="*" element={<div className="flex items-center justify-center h-full"><AuthForm onLoginSuccess={handleLogin} /></div>} />
                    ) : (
                        <Route path="/" element={
                                <MainLayout 
                                    navigate={navigate}
                                    isPlayerExpanded={isPlayerExpanded}
                                    onNavigateToProfile={handleNavigateToProfile}
                                    onNavigateToUpdates={handleNavigateToUpdates}
                                    onNavigateToEqualizer={handleNavigateToEqualizer}
                                    onCloseLogoutMenu={handleCloseLogoutMenu}
                                    onNavigateToAbout={handleNavigateToAbout}
                                    user={user}
                                    toggleLogoutVisible={toggleLogoutVisible}
                                    onLogoutClick={toggleLogoutVisible}
                                    isLogoutVisible={isLogoutVisible} 
                                    onLogout={handleLogout}
                                    currentSong={currentSong} 
                                    isPlaying={isPlaying} 
                                    onPlayPause={handlePlayPause} 
                                    onNext={handleNext} 
                                    onPrev={handlePrev} 
                                    progress={progress} 
                                    onProgressChange={handleProgressChange} 
                                    duration={duration} 
                                    currentTime={currentTime} 
                                volume={volume} 
                                onVolumeChange={handleVolumeChange} 
                                isShuffle={isShuffle} 
                                onShuffleToggle={handleShuffleToggle}
                                isRepeat={isRepeat} 
                                onRepeatToggle={handleRepeatToggle}
                                allSongs={songs}
                                filteredSongs={filteredSongs}
                                onSelectSong={handleSelectSong}
                                currentSongId={currentSong?.id}
                                isLoadingSongs={isLoadingSongs}
                                error={error}
                                searchTerm={searchTerm}
                                onSearchChange={handleSearchChange}
                                onClearSearch={handleClearSearch}
                                onSearchBarClick={handleSearchBarClick}
                                isPlayerInitialized={isPlayerInitialized}
                                onAdminClick={() => setIsAdminPanelOpen(true)}
                                onAddToQueue={handleAddToQueue}
                                onAddToPlaylist={(songId) => handleOpenAddToPlaylist(songId)}
                                setIsUsingPlaylistQueue={setIsUsingPlaylistQueue}
                                setPlaylistQueue={setPlaylistQueue}
                                setPlaylistQueueIndex={setPlaylistQueueIndex}
                                setIsUsingArtistQueue={setIsUsingArtistQueue}
                                setArtistQueue={setArtistQueue}
                                setArtistQueueIndex={setArtistQueueIndex}
                                onUsePlaylistQueue={handleUsePlaylistQueue}
                                isArtistShuffleMode={isArtistShuffleMode}
                                setIsArtistShuffleMode={setIsArtistShuffleMode}
                                setIsUsingMoodQueue={setIsUsingMoodQueue}
                                setMoodQueue={setMoodQueue}
                                setMoodQueueIndex={setMoodQueueIndex}
                                isMoodShuffleMode={isMoodShuffleMode}
                                setIsMoodShuffleMode={setIsMoodShuffleMode}
                                isPlaylistShuffleMode={isPlaylistShuffleMode}
                                setIsPlaylistShuffleMode={setIsPlaylistShuffleMode}
                                onShowArtist={(artistName) => {
                                    // Navigate to artist page
                                    // Using window.location to avoid importing navigate here
                                    window.location.href = `/artist/${encodeURIComponent(artistName)}`;
                                }}
                                onReportSong={(songId) => {
                                    const reason = prompt('Report song reason (optional):');
                                    if (reason !== null) {
                                        console.log('Reported song', songId, 'reason:', reason);
                                        alert('Thank you. The song has been reported.');
                                    }
                                }}
                                onTogglePlayerExpand={handleTogglePlayerExpand}
                                isBottomPlayerClicked={isBottomPlayerClicked}
                                toggleBottomPlayerClicked={toggleBottomPlayerClicked}
                                onOpenUpNext={handleOpenUpNext}
                                onOpenRelated={() => { setUpNextRelatedModalMode('related'); setIsUpNextRelatedModalOpen(true); }}
                                modalRelatedCache={modalRelatedCache}
                                modalQueueCache={modalQueueCache}
                            />
                        }>
                        <Route index element={<LibraryPage />} />
                        <Route path="profile" element={<Suspense fallback={<LazyLoadingFallback />}><ProfilePage /></Suspense>} />
                        <Route path="artist/:artistName" element={<Suspense fallback={<LazyLoadingFallback />}><ArtistPage /></Suspense>} />
                        <Route path="mood/:moodName" element={<Suspense fallback={<LazyLoadingFallback />}><MoodPage /></Suspense>} />
                        <Route path="vibe/:vibeName" element={<Suspense fallback={<LazyLoadingFallback />}><VibePage /></Suspense>} />
                        <Route path="library/:optionName" element={<LibraryPage />} />
                        <Route path="equalizer" element={<Suspense fallback={<LazyLoadingFallback />}><EqualizerPage /></Suspense>} />
                        <Route path="playlists" element={<Suspense fallback={<LazyLoadingFallback />}><PlaylistsPage /></Suspense>} />
                        <Route path="playlists/:id" element={<Suspense fallback={<LazyLoadingFallback />}><PlaylistPage /></Suspense>} />
                        <Route path="favorites" element={<Suspense fallback={<LazyLoadingFallback />}><FavoritesPage /></Suspense>} />
                        <Route path="recommendations" element={<Suspense fallback={<LazyLoadingFallback />}><RecommendationsPage /></Suspense>} />
                        <Route path="feed" element={<Suspense fallback={<LazyLoadingFallback />}><FeedPage /></Suspense>} />
                        <Route path="recents" element={<Suspense fallback={<LazyLoadingFallback />}><RecentsPage /></Suspense>} />
                        <Route path="users/:id" element={<Suspense fallback={<LazyLoadingFallback />}><UserProfilePage /></Suspense>} />
                        <Route path="feedback" element={<Suspense fallback={<LazyLoadingFallback />}><FeedbackPage /></Suspense>} />
                    </Route>
                )}
            </Routes>
            
            </FavoritesProvider>
            {user && (
                <DesktopPlayerBar
                    currentSong={currentSong}
                    isPlaying={isPlaying}
                    onPlayPause={handlePlayPause}
                    onNext={handleNext}
                    onPrev={handlePrev}
                    progress={progress}
                    onProgressChange={handleProgressChange}
                    duration={duration}
                    currentTime={currentTime}
                    volume={volume}
                    onVolumeChange={handleVolumeChange}
                    isShuffle={isShuffle}
                    onShuffleToggle={handleShuffleToggle}
                    isRepeat={isRepeat}
                    onRepeatToggle={handleRepeatToggle}
                    onAddToQueue={handleAddToQueue}
                    onAddToPlaylist={(songId) => handleOpenAddToPlaylist(songId)}
                    onShowArtist={(artistName) => { window.location.href = `/artist/${encodeURIComponent(artistName)}`; }}
                    onReportSong={(songId) => { const reason = prompt('Report song reason (optional):'); if (reason !== null) { console.log('Reported song', songId, 'reason:', reason); alert('Thank you. The song has been reported.'); } }}
                    onTogglePlayerExpand={toggleBottomPlayerClicked}
                    isPlayerInitialized={isPlayerInitialized}
                />
            )}
            {isAdminPanelOpen && ( <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50"><AdminPanel onClose={() => setIsAdminPanelOpen(false)} onSongUploaded={handleSongUploaded} /> </div> )}
            {isPlayerExpanded && (
                <div className="fixed inset-0 bg-[#0f0f0f] z-50 md:hidden" style={{ transform: isPlayerEntered ? 'translateY(0%)' : 'translateY(-100%)', transition: 'transform 260ms cubic-bezier(.2,.8,.2,1)' }}>
                    <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between">
                        <Link to="/" className="flex items-center gap-3">
                            <img src="/logo.png" alt="App Logo" className="w-8 h-8 rounded-full" onError={(e) => e.target.style.display = 'none'} />
                            <h1 className="text-xl font-bold text-gray-200">Mellow</h1>
                        </Link>
                        <button onClick={() => setIsPlayerExpanded(false)} className="text-gray-300 hover:text-white p-2 rounded-full hover:bg-[#1f1f1f]" aria-label="Minimize player">
                            <ChevronDown className="w-6 h-6" />
                        </button>
                    </div>
                    <div className="h-full pt-16 pb-8 px-4">
                        <div className="bg-[#1f1f1f] rounded-2xl h-full" style={currentSong ? { backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.6)), url('${currentSong.coverUrl}')`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}>
                            <PlayerUI 
                                currentSong={currentSong}
                                isPlaying={isPlaying}
                                onPlayPause={handlePlayPause}
                                onNext={handleNext}
                                onPrev={handlePrev}
                                progress={progress}
                                onProgressChange={handleProgressChange}
                                duration={duration}
                                currentTime={currentTime}
                                volume={volume}
                                onVolumeChange={handleVolumeChange}
                                isShuffle={isShuffle}
                                onShuffleToggle={() => setIsShuffle(!isShuffle)}
                                isRepeat={isRepeat}
                                onRepeatToggle={() => setIsRepeat(!isRepeat)}
                                onAddToQueue={handleAddToQueue}
                                onUsePlaylistQueue={handleUsePlaylistQueue}
                                onAddToPlaylist={(songId) => handleOpenAddToPlaylist(songId)}
                                onShowArtist={(artistName) => { window.location.href = `/artist/${encodeURIComponent(artistName)}`; }}
                                onReportSong={(songId) => { const reason = prompt('Report song reason (optional):'); if (reason !== null) { console.log('Reported song', songId, 'reason:', reason); alert('Thank you. The song has been reported.'); } }}
                                onOpenUpNext={handleOpenUpNext}
                                onOpenRelated={() => { setUpNextRelatedModalMode('related'); setIsUpNextRelatedModalOpen(true); }}
                                onTogglePlayerExpand={handleTogglePlayerExpand}
                                variant="mobile"
                            />
                        </div>
                    </div>
                </div>
            )}
            <audio 
                ref={audioRef} 
                onTimeUpdate={handleTimeUpdate} 
                onLoadedMetadata={handleTimeUpdate} 
                onEnded={handleSongEnd} 
                onError={handleAudioError}
                preload="auto"
                crossOrigin="anonymous"
                style={{ display: 'none' }}
            />
            {isQueueOpen && (
                <QueuePanel queue={queue} onClose={() => setIsQueueOpen(false)} onPlaySongAtIndex={handlePlaySongAtIndex} onRemove={handleRemoveFromQueue} onReorder={handleReorderQueue} />
            )}
            {isPlaylistOpen && (
                <PlaylistModal token={(user && user.token) ? user.token : null} onClose={() => setIsPlaylistOpen(false)} songId={playlistSongId} onPlaylistUpdated={handlePlaylistUpdated} allSongs={songs} />
            )}
            {showSearchResults && (
                <div ref={searchResultsRef} className="fixed inset-0 z-40 md:inset-auto md:top-20 md:left-1/2 md:w-[min(25rem,calc(100vw-2rem))] md:-translate-x-1/2 md:max-h-[70vh] md:overflow-hidden md:rounded-lg md:border md:border-gray-700 md:bg-[#0f0f0f] md:shadow-xl">
                    <SearchResults 
                        songs={filteredSongs}
                        onSelectSong={(songId, options) => {
                            handleSelectSong(songId, options);
                            setShowSearchResults(false);
                            setSearchTerm('');
                        }}
                        currentSongId={currentSong?.id}
                        isPlaying={isPlaying}
                        onAddToQueue={handleAddToQueue}
                        onAddToPlaylist={handleOpenAddToPlaylist}
                        onPlayPause={handlePlayPause}
                        onNext={handleNext}
                        onPrev={handlePrev}
                        onClose={() => {
                            setShowSearchResults(false);
                            setSearchTerm('');
                        }}
                        initialSearchTerm={searchTerm}
                        onNavigateHome={() => {
                            setShowSearchResults(false);
                            setSearchTerm('');
                            navigate('/');
                        }}
                        allSongs={songs}
                        isPlayerInitialized={isPlayerInitialized}
                        isShuffle={isShuffle}
                        onShuffleToggle={handleShuffleToggle}
                        onTogglePlayerExpand={handleTogglePlayerExpand}
                        currentSong={currentSong}
                        progress={progress}
                        onProgressChange={handleProgressChange}
                        duration={duration}
                        currentTime={currentTime}
                        volume={volume}
                        onVolumeChange={handleVolumeChange}
                        isRepeat={isRepeat}
                        onRepeatToggle={handleRepeatToggle}
                        onOpenUpNext={handleOpenUpNext}
                        onOpenRelated={() => { setUpNextRelatedModalMode('related'); setIsUpNextRelatedModalOpen(true); }}
                    />
                </div>
            )}

            {/* Listen for custom event to close search overlay from nav */}
            {/* prepare mood-based lists for modal */}
            {
                (() => {
                    return (
                        <UpNextRelatedModal 
                            isOpen={isUpNextRelatedModalOpen}
                            onClose={() => setIsUpNextRelatedModalOpen(false)}
                            currentSong={currentSong}
                            isPlaying={isPlaying}
                            onPlayPause={handlePlayPause}
                            onNext={handleNext}
                            onPrev={handlePrev}
                            currentTime={currentTime}
                            duration={duration}
                            queue={upNextRelatedModalMode === 'upnext'
                                ? (
                                    (isUsingUpNext && Array.isArray(upNextQueue) && upNextQueue.length > 0)
                                        ? upNextQueue
                                        : (isUsingMoodQueue && Array.isArray(moodQueue) && moodQueue.length > 0 ? moodQueue : modalQueueCache)
                                )
                                : queue}
                            relatedSongs={modalRelatedCache}
                            onSelectSong={handleSelectSong}
                            onAddToQueue={handleAddToQueue}
                            onAddToPlaylist={(songId) => handleOpenAddToPlaylist(songId)}
                            onShowArtist={(artistName) => { window.location.href = `/artist/${encodeURIComponent(artistName)}`; }}
                            onReportSong={(songId) => { const reason = prompt('Report song reason (optional):'); if (reason !== null) { console.log('Reported song', songId, 'reason:', reason); alert('Thank you. The song has been reported.'); } }}
                            initialTab={upNextRelatedModalMode}
                            isShuffle={isShuffle}
                            onShuffleToggle={handleShuffleToggle}
                            onTogglePlayerExpand={handleExpandPlayer}
                        />
                    );
                })()
            }
        </div>
    );
}

const parseDurationToSeconds = (dur) => {
    if (dur === undefined || dur === null || dur === '') return 0;
    if (typeof dur === 'string') {
        const trimmed = dur.trim();
        if (trimmed.includes(':')) {
            const parts = trimmed.split(':').map((part) => Number(part));
            if (parts.length === 3 && parts.every((n) => Number.isFinite(n))) {
                return parts[0] * 3600 + parts[1] * 60 + parts[2];
            }
            if (parts.length === 2 && parts.every((n) => Number.isFinite(n))) {
                return parts[0] * 60 + parts[1];
            }
        }
        const numeric = Number(trimmed);
        return Number.isFinite(numeric) ? numeric : 0;
    }
    return Number.isFinite(dur) ? dur : 0;
};

const getSongDuration = (song) => {
    if (!song) return 0;
    const candidates = [song.duration, song.durationSeconds, song.duration_seconds, song.metadata?.duration];
    for (const dur of candidates) {
        const parsed = parseDurationToSeconds(dur);
        if (parsed > 0) return parsed;
    }
    return 0;
};

const formatTime = (time) => {
    if (time === null || time === undefined || time === '') return '0:00';
    if (typeof time === 'string') {
        const trimmed = time.trim();
        const parts = trimmed.split(':').map((part) => Number(part));
        if (parts.length === 2 && parts.every((n) => Number.isFinite(n))) {
            return `${Math.floor(parts[0])}:${String(Math.floor(parts[1])).padStart(2, '0')}`;
        }
        if (parts.length === 3 && parts.every((n) => Number.isFinite(n))) {
            const totalSeconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
            const minutes = Math.floor(totalSeconds / 60);
            const seconds = Math.floor(totalSeconds % 60);
            return `${minutes}:${String(seconds).padStart(2, '0')}`;
        }
        const numeric = Number(trimmed);
        if (Number.isFinite(numeric)) time = numeric;
    }
    if (!isFinite(time) || time < 0) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

const DesktopPlayerBar = ({ currentSong, isPlaying, onPlayPause, onNext, onPrev, progress, onProgressChange, duration = 0, currentTime = 0, volume, onVolumeChange, isShuffle, onShuffleToggle, isRepeat, onRepeatToggle, onAddToQueue, onAddToPlaylist, onShowArtist, onReportSong, onOpenUpNext, onTogglePlayerExpand = () => {} }) => {
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef(null);
    const menuContainerRef = useRef(null);
    const [dropdownStyle, setDropdownStyle] = useState(null);

    const closeMenu = useCallback(() => setMenuOpen(false), []);
    const handleMenuToggle = useCallback((event) => {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        setMenuOpen((open) => !open);
    }, []);
    const handleMenuAction = useCallback((action) => (event) => {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        closeMenu();
        if (action) action();
    }, [closeMenu]);

    useEffect(() => {
        if (!menuOpen || !menuRef.current) {
            setDropdownStyle(null);
            return;
        }
        const rect = menuRef.current.getBoundingClientRect();
        const menuWidth = 176;
        const dropdownHeight = 156;
        let left = rect.right - menuWidth;
        if (left < 8) left = 8;
        if (left + menuWidth > window.innerWidth - 8) left = window.innerWidth - menuWidth - 8;
        let top = rect.top + rect.height / 2 - dropdownHeight / 2;
        if (top < 8) top = rect.bottom + 6;
        if (top + dropdownHeight > window.innerHeight - 8) {
            top = Math.max(8, window.innerHeight - dropdownHeight - 8);
        }
        setDropdownStyle({ position: 'fixed', left: `${left}px`, top: `${top}px`, zIndex: 9999 });
    }, [menuOpen]);

    useEffect(() => {
        function handleClickOutside(event) {
            if (menuContainerRef.current && !menuContainerRef.current.contains(event.target)) {
                setMenuOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    if (!currentSong) return null;

    return (
        <div className="hidden md:flex fixed bottom-0 left-0 right-0 z-50 flex-col bg-[#1f1f1f] border-t border-gray-800 shadow-xl backdrop-blur-sm">
            <input
                type="range"
                min="0"
                max="100"
                value={isFinite(duration) && duration > 0 ? Math.min((currentTime / duration) * 100, 100) : 0}
                onChange={(e) => onProgressChange(Number(e.target.value))} style={{ background: `linear-gradient(to right, #ff0000 ${isFinite(duration) && duration > 0 ? Math.min((currentTime / duration) * 100, 100) : 0}%, #4B5563 ${isFinite(duration) && duration > 0 ? Math.min((currentTime / duration) * 100, 100) : 0}%)` }}
                className="w-full h-0.5 rounded-full appearance-none cursor-pointer range-sm [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
                aria-label="Seek track"
            />
            <div className="flex items-center justify-between gap-4 px-4 py-2">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="flex items-center gap-2">
                        <button onClick={(e) => { e.stopPropagation(); onPrev(); }} className="p-2 rounded-full hover:bg-[#282828] transition-colors text-gray-300" aria-label="Previous Song">
                            <SkipBack className="w-5 h-6 sm:w-7 sm:h-7" />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); onPlayPause(); }} className="bg-blue-600 text-white rounded-full p-2 sm:p-3 hover:bg-blue-500 transition-all shadow-lg flex items-center justify-center" aria-label={isPlaying ? 'Pause' : 'Play'}>
                            {isPlaying ? <PauseIcon className="w-5.5 h-5.5 sm:w-6.5 sm:h-6.5" /> : <PlayIcon className="w-5.5 h-5.5 sm:w-6.5 sm:h-6.5" />}
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); onNext(); }} className="p-2 rounded-full hover:bg-[#282828] transition-colors text-gray-300" aria-label="Next Song">
                            <SkipForward className="w-5 h-6 sm:w-7 sm:h-7" />
                        </button>
                    </div>
                    <div className="flex items-center gap-1 ml-5 w-full max-w-2xl">
                        <span className="text-xs text-gray-400">{formatTime(currentTime)}</span>|
                        <span className="text-xs text-gray-400">{formatTime(duration)}</span>
                    </div>
                  </div>

                    <div className="flex items-center gap-3 ml-10 min-w-0 cursor-pointer" role="button" onClick={(e) => { e.stopPropagation(); try { onTogglePlayerExpand(); } catch (err) {} }}>
                        <img src={currentSong.coverUrl} alt={currentSong.title} className="w-10 h-10 object-cover flex-shrink-0" onError={(e) => { e.target.onerror = null; e.target.src = 'https://placehold.co/200x200/1F2937/FFFFFF?text=Music'; }} />
                        <div className="min-w-0 overflow-hidden">
                            <p className="text-sm font-semibold text-white truncate">{currentSong.title}</p>
                            <p className="text-xs text-gray-400 truncate">{Array.isArray(currentSong.artist) ? currentSong.artist.join(', ') : (currentSong.artist || '')}</p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => onVolumeChange(volume > 0 ? 0 : 0.5)} className="text-gray-400 hover:text-white">
                        {volume === 0 ? <VolumeX size={20} /> : <Volume2 size={20} />}
                    </button>
        <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
            style={{ background: `linear-gradient(to right, #ffffff ${volume * 100}%, #4B5563 ${volume * 100}%)` }}
            className="w-full h-1 rounded-full appearance-none cursor-pointer range-sm [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
        />
                    <button onClick={onShuffleToggle} className={`p-2 rounded-full transition-colors ${isShuffle ? 'text-red-400 bg-white/5' : 'text-gray-400 hover:bg-[#1f1f1f]'}`} aria-label="Shuffle">
                        <Shuffle className="w-5 h-5 sm:w-6 sm:h-6" />
                    </button>
                    <button onClick={onRepeatToggle} className={`p-2 rounded-full hover:bg-[#282828] transition-colors ${isRepeat ? 'text-red-400' : 'text-gray-400'}`} aria-label="Repeat">
                        <Repeat className="w-5 h-5 sm:w-6 sm:h-6" />
                    </button>
                    <div ref={menuContainerRef} className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                        <button
                            ref={menuRef}
                            type="button"
                            onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
                            onClick={handleMenuToggle}
                            className="p-2 rounded-full hover:bg-[#1f1f1f] text-gray-300"
                            aria-label="More options"
                            aria-haspopup="menu"
                            aria-expanded={menuOpen}
                        >
                            <MoreVertical className="w-5 h-5" />
                        </button>
                        {menuOpen && (
                            <div role="menu" style={dropdownStyle} className="w-44 bg-[#1f1f1f] border border-[#3f3f3f] rounded-md shadow-lg text-left py-1">
                                <button type="button" role="menuitem" onMouseDown={(e) => e.stopPropagation()} onClick={handleMenuAction(() => onAddToQueue && onAddToQueue(currentSong, 'end'))} className="w-full text-left px-3 py-2 hover:bg-[#282828] text-gray-100">Add to Queue</button>
                                <button type="button" role="menuitem" onMouseDown={(e) => e.stopPropagation()} onClick={handleMenuAction(() => onAddToPlaylist && onAddToPlaylist(currentSong.id))} className="w-full text-left px-3 py-2 hover:bg-[#282828] text-gray-100">Add to Playlist</button>
                                <button type="button" role="menuitem" onMouseDown={(e) => e.stopPropagation()} onClick={handleMenuAction(() => onShowArtist && onShowArtist(Array.isArray(currentSong.artist) ? currentSong.artist.join(', ') : (currentSong.artist || '')))} className="w-full text-left px-3 py-2 hover:bg-[#282828] text-gray-100">Artist</button>
                                <button type="button" role="menuitem" onMouseDown={(e) => e.stopPropagation()} onClick={handleMenuAction(() => onReportSong && onReportSong(currentSong.id))} className="w-full text-left px-3 py-2 text-rose-400 hover:bg-[#282828]">Report</button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- Mobile mini player bar component ---
const MobilePlayerBar = ({ currentSong, isPlaying, onPlayPause, onTogglePlayerExpand, isShuffle, onShuffleToggle, isPlayerInitialized, currentTime = 0, duration = 0 }) => {
    const barRef = useRef(null);

    useDrag(({ last, movement: [, my], velocity: [, vy], direction: [, dy] }) => {
        if (!last) return; // sirf release par decide karo
        const swipedUp = my < -60 || (vy > 0.7 && dy < 0);
        if (swipedUp) onTogglePlayerExpand();
    }, {
        target: barRef,
        axis: 'y',
        filterTaps: true,          // tap ko drag na maane
        pointer: { touch: true },
        eventOptions: { passive: false }
    });
    // Hide player bar until a song has been played, then keep it visible
    if (!currentSong || !isPlayerInitialized) return null;
    return (
        <div className="fixed bottom-14 left-0 right-0 bg-[#1f1f1f] border-t border-gray-700 z-40 animate-in slide-in-from-bottom-2 duration-500">
            {/* Thin Progress Bar at Top */}
            <div className="w-full h-0.5 bg-[#282828] overflow-hidden">
                <div 
                    className="h-full bg-blue-400 transition-all duration-100 ease-linear"
                    style={{
                        width: isFinite(duration) && duration > 0 ? `${Math.min((currentTime / duration) * 100, 100)}%` : '0%'
                    }}
                />
            </div>
            <div className="p-1.5">
            <div onClick={onTogglePlayerExpand} className="w-full flex items-center gap-2 cursor-pointer" role="button" tabIndex={0}>
                <img src={currentSong.coverUrl} alt={currentSong.title} className="w-9 h-9 rounded-md object-cover flex-shrink-0" onError={(e) => { e.target.onerror = null; e.target.src='https://placehold.co/200x200/1F2937/FFFFFF?text=Music'; }} />
                <div className="flex-1 min-w-0 text-left">
                    <div className="text-sm font-semibold truncate">{currentSong.title}</div>
                    <div className="text-xs text-gray-400 truncate">{Array.isArray(currentSong.artist) ? currentSong.artist.join(', ') : (currentSong.artist || '')}</div>
                </div>
                <button onClick={(e) => { e.stopPropagation(); onShuffleToggle(); }} className={`p-2 transition-colors ${isShuffle ? 'text-red-400 drop-shadow-lg drop-shadow-red-500/50' : 'text-gray-400'}`} title="Shuffle">
                    <Shuffle className="w-5 h-5" />
                </button>
                <button onClick={(e) => { e.stopPropagation(); onPlayPause(); }} className="bg-blue-600 text-white rounded-full p-3 hover:bg-blue-500">
                    {isPlaying ? <PauseIcon className="w-5.5 h-5.5" /> : <PlayIcon className="w-5.5 h-5.5" />}
                </button>
            </div>
            </div>
        </div>
    );
};

export default App;
