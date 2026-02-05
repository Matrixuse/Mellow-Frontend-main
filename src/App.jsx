import React, { useState, useEffect, useRef, useCallback, Suspense, lazy } from 'react';
// Humne yahan 'Outlet' aur 'useOutletContext' ko import kiya hai
import { Routes, Route, Link, Outlet, useOutletContext, useNavigate } from 'react-router-dom';
import AuthForm from './components/AuthForm';
import queueService from './services/queueService';
import nativeMediaService from './services/nativeMediaService';
import AudioEngine from './services/audioEngine';
import lockScreenService from './services/lockScreenService';
import PlayerUI from './components/PlayerUI';
import SongLibrary from './components/SongLibrary';
import AdminPanel from './components/Admin';
import { Loader, Footer } from './components/OtherComponents';
import { getSongs } from './api/songService';
import { User, Search, X, Play as PlayIcon, Pause as PauseIcon, ChevronDown, Shuffle } from 'lucide-react';
import QueuePanel from './components/QueuePanel';
import PlaylistModal from './components/PlaylistModal';
import PlaylistPage from './components/PlaylistPage';
import PlaylistsPage from './components/PlaylistsPage';
import FeedbackPage from './components/FeedbackPage';
import BottomNav from './components/BottomNav';
import SearchResults from './components/SearchResults';
import ProfilePage from './pages/ProfilePage';
import EqualizerPage from './pages/EqualizerPage';
import { createFuzzySearch, getFuzzySuggestions } from './utils/fuzzySearch';

// Lazy load heavy components for better initial load time
const ArtistPage = lazy(() => import('./components/ArtistPage'));
const MoodPage = lazy(() => import('./components/MoodPage'));

// No global fallbacks for handlers. Handlers should be passed explicitly via props or outlet context.

// --- Main Layout Component ---
// Yeh component left player aur right content area ka layout banata hai
const MainLayout = React.memo(({ navigate, onNavigateToProfile, onNavigateToUpdates, onNavigateToAbout, onLogout, toggleLogoutVisible, isLogoutVisible, isArtistShuffleMode, setIsArtistShuffleMode, isMoodShuffleMode, setIsMoodShuffleMode, isPlaylistShuffleMode, setIsPlaylistShuffleMode, ...props }) => (
    <div className="flex flex-col md:flex-row h-full">
        {/* Left Column desktop/tablet par hi dikhega */}
    <div className="hidden md:flex md:w-80 p-3 flex-shrink-0 flex-col bg-gray-800/30">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <Link to="/" className="flex items-center gap-3">
                        <img src="/logo.png" alt="App Logo" className="w-10 h-10 rounded-full" onError={(e) => e.target.style.display = 'none'} />
                        <h1 className="text-2xl font-bold text-gray-200">Mellow</h1>
                    </Link>
                </div>
                {/* Replace user profile area with Playlist button in the left column header (desktop) */}
                <div className="relative flex items-center gap-3">
                    <div className="hidden md:block">
                        <Link to="/playlists" className="px-3 py-2 bg-blue-600 rounded-full text-white hover:bg-blue-500">Playlists</Link>
                    </div>
                </div>
            </div>
            <div className="bg-gray-800 rounded-2xl flex flex-col shadow-2xl flex-grow">
                <PlayerUI {...props} />
            </div>
        </div>
        {/* Right Column (Yahan ab Outlet aayega jo page badlega) */}
        {/* Hum yahan 'context' ke zariye saare props neeche bhej rahe hain */}
        <div className="flex-1 flex flex-col h-full min-h-0 min-w-0">
            <Outlet context={{ ...props, onNavigateToProfile, onNavigateToUpdates, onNavigateToAbout, onLogout, toggleLogoutVisible, isLogoutVisible, isArtistShuffleMode, setIsArtistShuffleMode, isMoodShuffleMode, setIsMoodShuffleMode, isPlaylistShuffleMode, setIsPlaylistShuffleMode }} /> 
            {/* Mobile mini player bar bottom pe fixed, leave space for BottomNav */}
            <div className="md:hidden">
                <MobilePlayerBar {...props} isShuffle={props.isShuffle} onShuffleToggle={props.onShuffleToggle} isPlayerInitialized={props.isPlayerInitialized} />
                <BottomNav />
            </div>
        </div>
    </div>
));

MainLayout.displayName = 'MainLayout';

// --- Library Page Component ---
const LibraryPage = React.memo(() => {
    // Safely read the outlet context so we don't crash if it's undefined
    const context = useOutletContext() || {};
    // helpful debug logs to inspect the outlet context at runtime
    // (will show up in browser console when LibraryPage renders)
    try {
        // eslint-disable-next-line no-console
        console.debug('LibraryPage - outlet context keys:', Object.keys(context || {}));
        // eslint-disable-next-line no-console
        console.debug('LibraryPage - onAddToQueue present?', Boolean(context && context.onAddToQueue));
    } catch (e) {}
    const { filteredSongs, onSelectSong, currentSongId, isPlaying, isLoadingSongs, error, searchTerm, onSearchChange, onClearSearch, onSearchBarClick, onAdminClick, toggleLogoutVisible, isLogoutVisible, onLogout, onNavigateToProfile, onNavigateToUpdates, onNavigateToAbout, onNavigateToEqualizer, onCloseLogoutMenu } = context;

    // Safe wrapper that calls the context handler if present.
    const safeAddToQueue = (song, position = 'end') => {
        if (context && typeof context.onAddToQueue === 'function') {
            return context.onAddToQueue(song, position);
        }
        // eslint-disable-next-line no-console
        console.warn('safeAddToQueue: onAddToQueue not available in context.');
    };
    return (
        <div className="flex-grow p-4 flex flex-col min-h-0 min-w-0">
            <div className="flex-grow overflow-y-auto custom-scrollbar pb-20 md:pb-0">
                {/* Search inside scrollable area so it scrolls with content */}
                <div className="mb-4 flex items-center gap-3">
                    {/* Mobile-only user icon to the left of search with logout toggle */}
                    <div className="md:hidden relative flex-shrink-0 flex items-center gap-2">
                        <button onClick={toggleLogoutVisible} className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center overflow-hidden">
                            <img src="/customer.jpg" alt="Profile" className="w-full h-full object-cover" />
                        </button>
                        {isLogoutVisible && (
                            <div className="absolute left-0 top-14 bg-gray-900 text-white rounded-lg shadow-lg text-sm z-50 min-w-max">
                                <button onClick={onNavigateToProfile} className="w-full text-left py-2 px-4 hover:bg-gray-800 transition-colors block">Profile</button>
                                <button onClick={onNavigateToUpdates} className="w-full text-left py-2 px-4 hover:bg-gray-800 transition-colors block">Your Updates</button>
                                <button onClick={() => { onCloseLogoutMenu && onCloseLogoutMenu(); onNavigateToEqualizer && onNavigateToEqualizer(); }} className="w-full text-left py-2 px-4 hover:bg-gray-800 transition-colors block">Equalizer</button>
                                <button onClick={onNavigateToAbout} className="w-full text-left py-2 px-4 hover:bg-gray-800 transition-colors block">About</button>
                                <button onClick={onLogout} className="w-full text-left py-2 px-4 hover:bg-gray-800 transition-colors border-t border-gray-700 block">Logout</button>
                            </div>
                        )}
                    </div>
                    <div className="relative flex-1 flex items-center">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            {/* Give an id so BottomNav can focus this input when Search button pressed */}
                            <input id="global-search-input" type="text" placeholder="Search for songs or artists..." value={searchTerm} onChange={onSearchChange} onClick={onSearchBarClick} autoComplete="off" className="w-full bg-gray-700/60 text-white rounded-full py-1.5 pl-9 pr-9 text-sm" />
                            {searchTerm && (<button onClick={onClearSearch} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"><X size={20} /></button>)}
                        </div>
                        {/* Desktop: move user profile icon and 'Hi,' to the right of search */}
                        <div className="hidden md:flex items-center ml-3">
                            <span className="text-gray-300 font-medium mr-2">Hi,</span>
                            <div className="relative">
                                <div className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center cursor-pointer overflow-hidden" onClick={toggleLogoutVisible}>
                                    <img src="/customer.jpg" alt="Profile" className="w-full h-full object-cover" />
                                </div>
                                {isLogoutVisible && (
                                    <div className="absolute right-0 mt-2 w-44 bg-gray-900 text-white rounded-md shadow-lg text-sm overflow-hidden">
                                        <button onClick={onNavigateToProfile} className="w-full text-left py-2 px-4 hover:bg-gray-800 transition-colors">Profile</button>
                                        <button onClick={onNavigateToUpdates} className="w-full text-left py-2 px-4 hover:bg-gray-800 transition-colors">Your Updates</button>
                                        <button onClick={() => { onCloseLogoutMenu && onCloseLogoutMenu(); onNavigateToEqualizer && onNavigateToEqualizer(); }} className="w-full text-left py-2 px-4 hover:bg-gray-800 transition-colors">Equalizer</button>
                                        <button onClick={onNavigateToAbout} className="w-full text-left py-2 px-4 hover:bg-gray-800 transition-colors">About</button>
                                        <button onClick={onLogout} className="w-full text-left py-2 px-4 hover:bg-gray-800 transition-colors border-t border-gray-700">Logout</button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
                {isLoadingSongs ? <div className="w-full h-full flex items-center justify-center"><Loader /></div> : error ? <p className="text-red-400 text-center mt-10">Error: {error}.</p> : (
                    <>
                        <SongLibrary
                            songs={filteredSongs}
                            onSelectSong={onSelectSong}
                            currentSongId={currentSongId}
                            isPlaying={isPlaying}
                            onAddToQueue={(context && typeof context.onAddToQueue === 'function') ? context.onAddToQueue : safeAddToQueue}
                        />
                        <Footer onDeveloperClick={onAdminClick} />
                    </>
                )}
            </div>
        </div>
    );
});

LibraryPage.displayName = 'LibraryPage';

// --- Main App Component (Master Controller) ---
function App() {
    const [user, setUser] = useState(null);
    const [isInitializing, setIsInitializing] = useState(true);
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
    
    // Playlist shuffle mode
    const [isPlaylistShuffleMode, setIsPlaylistShuffleMode] = useState(false);

    const [isPlaylistOpen, setIsPlaylistOpen] = useState(false);
    const [playlistSongId, setPlaylistSongId] = useState(null);
    const [showSearchResults, setShowSearchResults] = useState(false);
    const [isPlayerInitialized, setIsPlayerInitialized] = useState(false);

    const audioRef = useRef(null);
    const currentSong = songs[currentSongIndex];

    // programmatic navigation helper for gesture handling
    const navigate = useNavigate();

    // New state for fuzzy search
    const [fuzzy, setFuzzy] = useState(null);

    // Debug effect for queue state
    useEffect(() => {
        // eslint-disable-next-line no-console
        console.log('🎵 SHUFFLE & QUEUE DEBUG:', {
            playlistMode: {
                isUsingPlaylistQueue,
                isPlaylistShuffleMode,
                playlistQueueLength: Array.isArray(playlistQueue) ? playlistQueue.length : 0,
                playlistQueueIndex
            },
            moodMode: {
                isUsingMoodQueue,
                isMoodShuffleMode,
                moodQueueLength: Array.isArray(moodQueue) ? moodQueue.length : 0,
                moodQueueIndex
            },
            artistMode: {
                isUsingArtistQueue,
                isArtistShuffleMode,
                artistQueueLength: Array.isArray(artistQueue) ? artistQueue.length : 0,
                artistQueueIndex
            },
            currentSong: {
                index: currentSongIndex,
                title: songs[currentSongIndex]?.title || 'N/A'
            }
        });
    }, [isPlaylistShuffleMode, isUsingPlaylistQueue, playlistQueue, playlistQueueIndex, isMoodShuffleMode, isUsingMoodQueue, moodQueue, moodQueueIndex, isArtistShuffleMode, isUsingArtistQueue, artistQueue, artistQueueIndex, currentSongIndex, songs]);

    // Effects
    useEffect(() => { const u = localStorage.getItem('user'); if (u) { try { setUser(JSON.parse(u)); } catch (e) { localStorage.removeItem('user'); } } setIsInitializing(false); }, []);
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
            getSongs(user.token)
                .then((data) => {
                    // normalize song objects: ensure `id` and fallback `coverUrl`
                    const normalized = Array.isArray(data) ? data.map(s => ({
                        ...s,
                        id: s.id || s._id || (s._id && s._id.$oid) || String(s.id || s._id || (s._id && s._id.$oid)),
                        coverUrl: s.coverUrl || s.cover_url || 'https://placehold.co/200x200/1F2937/FFFFFF?text=Music'
                    })) : [];
                    
                    setSongs(normalized);
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
    }, [user]);
    // Mobile-only auto-refresh every 10 minutes
    useEffect(() => {
        if (!user) return;
        const isMobile = typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches;
        if (!isMobile) return;
        const intervalId = setInterval(() => {
            getSongs(user.token)
                .then(setSongs)
                .catch(err => {
                    if (String(err.message || '').toLowerCase().includes('token expired')) {
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
                });
        }, 10 * 60 * 1000);
        return () => clearInterval(intervalId);
    }, [user]);
    useEffect(() => {
        const a = audioRef.current;
        // ensure audio engine is initialized with the primary audio element
        try {
            if (a) {
                AudioEngine.init(a);
                AudioEngine.resumeContextIfNeeded && AudioEngine.resumeContextIfNeeded();
            }
        } catch (e) {}

        if (a && currentSong) {
            // Simple audio element swap (no crossfade)
            try {
                if (a.src !== currentSong.songUrl) { a.src = currentSong.songUrl; a.load(); }
                // Start or update native media service when song changes
                (async () => {
                    try {
                        await nativeMediaService.start(currentSong, isPlaying);
                        try { lockScreenService.setMetadata(currentSong); } catch (e) { console.warn('lockScreenService.setMetadata error', e); }
                    } catch(e) { console.warn('nativeMediaService.start error', e); }
                })();
            } catch (e) {
                console.warn('AudioEngine play error, falling back', e);
                if (a.src !== currentSong.songUrl) { a.src = currentSong.songUrl; a.load(); }
            }
        }
    }, [currentSong, isPlaying]);
    useEffect(() => { const a = audioRef.current; if (a) { if (isPlaying) { a.play().catch(console.error); } else { a.pause(); } 
        // Update native notification play state
        (async () => {
            try {
                await nativeMediaService.updateIsPlaying(isPlaying);
                // Update web lock screen playback state
                try { lockScreenService.setPlaybackState(isPlaying ? 'playing' : 'paused'); } catch (e) { console.warn('lockScreenService.setPlaybackState error', e); }
                if (!isPlaying) {
                    // leave notification but mark paused; don't stop service
                }
            } catch(e) { console.warn('nativeMediaService.updateIsPlaying error', e); }
        })();
    } }, [isPlaying, currentSong]);

    

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
    const handleNext = useCallback(() => {
        try {
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
                    return;
                }
                // end of artist queue: disable artist mode and fallthrough to global queue
                setIsUsingArtistQueue(false);
                setArtistQueue([]);
                setIsArtistShuffleMode(false);
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
                    setMoodQueueIndex(nextIdx);
                    setIsPlaying(true);
                    return;
                }
                // end of mood queue: disable mood mode and fallthrough to global queue
                try {
                    // eslint-disable-next-line no-console
                    console.debug('handleNext: Reached end of mood queue, disabling mood mode');
                } catch (e) {}
                setIsUsingMoodQueue(false);
                setMoodQueue([]);
                setIsMoodShuffleMode(false);
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
                    return;
                }
            }
            if (songs.length === 0) return;
            let n = isShuffle ? Math.floor(Math.random() * songs.length) : (currentSongIndex + 1) % songs.length;
            if (isShuffle && n === currentSongIndex) return handleNext();
            setCurrentSongIndex(n);
            setIsPlaying(true);
        } catch (err) {
            console.error('handleNext error', err);
        }
    }, [songs, currentSongIndex, isShuffle, isUsingPlaylistQueue, playlistQueue, playlistQueueIndex, isPlaylistShuffleMode, isUsingArtistQueue, artistQueue, artistQueueIndex, isArtistShuffleMode, isUsingMoodQueue, moodQueue, moodQueueIndex, isMoodShuffleMode]);

    const handlePrev = useCallback(() => {
        try {
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
                // at start: disable artist mode and fall back to global queue behavior
                setIsUsingArtistQueue(false);
                setArtistQueue([]);
                setIsArtistShuffleMode(false);
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
                // at start: disable mood mode and fall back to global queue behavior
                setIsUsingMoodQueue(false);
                setMoodQueue([]);
                setIsMoodShuffleMode(false);
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
    }, [songs, currentSongIndex, isUsingPlaylistQueue, playlistQueue, playlistQueueIndex, isPlaylistShuffleMode, isUsingArtistQueue, artistQueue, artistQueueIndex, isArtistShuffleMode, isUsingMoodQueue, moodQueue, moodQueueIndex, isMoodShuffleMode]);
    // Register lockScreenService event handlers once (after handlers are defined)
    useEffect(() => {
        if (!lockScreenService.isAvailable()) return;
        lockScreenService.setEventHandlers({
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
        // cleanup: clear handlers
        return () => {
            try { lockScreenService.setEventHandlers({}); } catch (e) {}
        };
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
            // Update native media service (Android) with position in ms
            try {
                const posMs = Math.floor(pos * 1000);
                nativeMediaService.updatePosition(posMs);
            } catch (e) {
                // non-fatal
            }
            // Update web Media Session position state
            try {
                lockScreenService.setPositionState({ duration: dur, position: pos, playbackRate: audioRef.current.playbackRate || 1.0 });
            } catch (e) {}
        }
    };
    const handleSongEnd = useCallback(() => {
        if (isRepeat) {
            if (audioRef.current) {
                audioRef.current.currentTime = 0;
                audioRef.current.play();
            }
            return;
        }
        // Prioritize playlist queue over global queue
        if (isUsingPlaylistQueue && Array.isArray(playlistQueue) && playlistQueue.length > 0) {
            handleNext();
            return;
        }
        // Then check artist queue
        if (isUsingArtistQueue && Array.isArray(artistQueue) && artistQueue.length > 0) {
            handleNext();
            return;
        }
        // Then check mood queue
        if (isUsingMoodQueue && Array.isArray(moodQueue) && moodQueue.length > 0) {
            handleNext();
            return;
        }
        // Finally check global queue
        const q = queueService.getQueue();
        if (q.length > 0) {
            handleNext();
            return;
        }
        handleNext();
    }, [isRepeat, isUsingPlaylistQueue, playlistQueue, isUsingArtistQueue, artistQueue, isUsingMoodQueue, moodQueue, handleNext]);

    // Handle audio errors (missing/deleted songs from Cloudinary)
    const handleAudioError = useCallback(() => {
        if (currentSongIndex >= 0 && songs[currentSongIndex]) {
            const failedSong = songs[currentSongIndex];
            // Remove the broken song from the list silently
            setSongs(prevSongs => prevSongs.filter((_, idx) => idx !== currentSongIndex));
            // Skip to next song
            setCurrentSongIndex(prev => Math.max(0, prev - 1));
            handleNext();
        }
    }, [currentSongIndex, songs, handleNext]);
    const handleSongUploaded = (s) => setSongs(p => [...p, s]);
    const handleSelectSong = useCallback((id) => {
        // Initialize player when song is selected
        setIsPlayerInitialized(true);
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
                
                // If mood queue is active, update moodQueueIndex to match the currently playing song
                if (isUsingMoodQueue && Array.isArray(moodQueue) && moodQueue.length > 0) {
                    const moodIndexForThisSong = moodQueue.findIndex(s => String(s.id) === String(id));
                    if (moodIndexForThisSong !== -1) {
                        setMoodQueueIndex(moodIndexForThisSong);
                        try {
                            // eslint-disable-next-line no-console
                            console.debug('handleSelectSong: Updated moodQueueIndex to match playing song', {
                                songId: id,
                                newMoodQueueIndex: moodIndexForThisSong,
                                moodQueueLength: moodQueue.length,
                                songTitle: songs[i].title
                            });
                        } catch (e) {}
                    }
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
    }, [songs, currentSongIndex]);
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
    const handleSearchChange = useCallback((e) => {
        const val = e.target.value;
        setSearchTerm(val);
        // Show search results page when user types
        if (val.trim()) {
            setShowSearchResults(true);
        }
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
    
    if (isInitializing) return <div className="h-screen bg-gray-900 flex items-center justify-center"><Loader /></div>;
    
    return (
        <div className="h-screen bg-gray-900 text-white font-sans overflow-hidden">
            <Routes>
                { !user ? (
                    <Route path="*" element={<div className="flex items-center justify-center h-full"><AuthForm onLoginSuccess={handleLogin} /></div>} />
                ) : (
                    <Route path="/" element={
                        <MainLayout 
                            navigate={navigate}
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
                        />
                    }>
                        <Route index element={<LibraryPage />} />
                        <Route path="profile" element={<ProfilePage />} />
                        <Route path="artist/:artistName" element={<Suspense fallback={<div className="flex items-center justify-center h-full"><Loader /></div>}><ArtistPage /></Suspense>} />
                        <Route path="mood/:moodName" element={<Suspense fallback={<div className="flex items-center justify-center h-full"><Loader /></div>}><MoodPage /></Suspense>} />
                        <Route path="equalizer" element={<EqualizerPage />} />
                        <Route path="playlists" element={<PlaylistsPage />} />
                        <Route path="playlists/:id" element={<PlaylistPage />} />
                        <Route path="feedback" element={<FeedbackPage />} />
                    </Route>
                )}
            </Routes>
            {isAdminPanelOpen && ( <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50"><AdminPanel onClose={() => setIsAdminPanelOpen(false)} onSongUploaded={handleSongUploaded} /> </div> )}
            {/* Mobile expanded player full-screen overlay */}
            {isPlayerExpanded && (
                <div className="fixed inset-0 bg-gray-900 z-50 md:hidden">
                    <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between">
                        <Link to="/" className="flex items-center gap-3">
                            <img src="/logo.png" alt="App Logo" className="w-8 h-8 rounded-full" onError={(e) => e.target.style.display = 'none'} />
                            <h1 className="text-xl font-bold text-gray-200">Mellow</h1>
                        </Link>
                        <button onClick={() => setIsPlayerExpanded(false)} className="text-gray-300 hover:text-white p-2 rounded-full hover:bg-gray-800" aria-label="Minimize player">
                            <ChevronDown className="w-6 h-6" />
                        </button>
                    </div>
                    <div className="h-full pt-16 pb-8 px-4">
                        <div className="bg-gray-800 rounded-2xl h-full">
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
                            />
                        </div>
                    </div>
                </div>
            )}
            <audio ref={audioRef} onTimeUpdate={handleTimeUpdate} onLoadedMetadata={handleTimeUpdate} onEnded={handleSongEnd} onError={handleAudioError} />
            {isQueueOpen && (
                <QueuePanel queue={queue} onClose={() => setIsQueueOpen(false)} onPlaySongAtIndex={handlePlaySongAtIndex} onRemove={handleRemoveFromQueue} onReorder={handleReorderQueue} />
            )}
            {isPlaylistOpen && (
                <PlaylistModal token={(user && user.token) ? user.token : null} onClose={() => setIsPlaylistOpen(false)} songId={playlistSongId} onPlaylistUpdated={handlePlaylistUpdated} allSongs={songs} />
            )}
            {showSearchResults && (
                <div className="fixed inset-0 z-50 md:hidden">
                    <SearchResults 
                        songs={filteredSongs}
                        onSelectSong={handleSelectSong}
                        currentSongId={currentSong?.id}
                        isPlaying={isPlaying}
                        onAddToQueue={handleAddToQueue}
                        onAddToPlaylist={handleOpenAddToPlaylist}
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
                        onNavigatePlaylists={() => {
                            setShowSearchResults(false);
                            setSearchTerm('');
                            navigate('/playlists');
                        }}
                        onPlayPause={handlePlayPause}
                        onNext={handleNext}
                        onPrev={handlePrev}
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
                    />
                </div>
            )}
        </div>
    );
}

export default App;

// --- Mobile mini player bar component ---
const MobilePlayerBar = ({ currentSong, isPlaying, onPlayPause, onTogglePlayerExpand, isShuffle, onShuffleToggle, isPlayerInitialized }) => {
    // Hide player bar until a song has been played, then keep it visible
    if (!currentSong || !isPlayerInitialized) return null;
    return (
        <div className="fixed bottom-14 left-0 right-0 bg-gray-800 border-t border-gray-700 p-1.5 z-40 animate-in slide-in-from-bottom-2 duration-500">
            <div onClick={onTogglePlayerExpand} className="w-full flex items-center gap-2 cursor-pointer" role="button" tabIndex={0}>
                <img src={currentSong.coverUrl} alt={currentSong.title} className="w-9 h-9 rounded-md object-cover flex-shrink-0" onError={(e) => { e.target.onerror = null; e.target.src='https://placehold.co/200x200/1F2937/FFFFFF?text=Music'; }} />
                <div className="flex-1 min-w-0 text-left">
                    <div className="text-sm font-semibold truncate">{currentSong.title}</div>
                    <div className="text-xs text-gray-400 truncate">{Array.isArray(currentSong.artist) ? currentSong.artist.join(', ') : (currentSong.artist || '')}</div>
                </div>
                <button onClick={(e) => { e.stopPropagation(); onShuffleToggle(); }} className={`p-2 transition-colors ${isShuffle ? 'text-blue-400 drop-shadow-lg drop-shadow-blue-500/50' : 'text-gray-400'}`} title="Shuffle">
                    <Shuffle className="w-5 h-5" />
                </button>
                <button onClick={(e) => { e.stopPropagation(); onPlayPause(); }} className="bg-blue-600 text-white rounded-full p-2 hover:bg-blue-500">
                    {isPlaying ? <PauseIcon className="w-5 h-5" /> : <PlayIcon className="w-5 h-5" />}
                </button>
            </div>
        </div>
    );
};

