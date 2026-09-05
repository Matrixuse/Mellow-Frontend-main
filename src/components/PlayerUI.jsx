import React, { useState, useRef, useEffect, useContext } from 'react';
import { FavoritesContext } from '../contexts/FavoritesContext';
import { Capacitor } from '@capacitor/core';
import { Controls, ProgressBar, VolumeControl } from './OtherComponents';
import { ChevronDown, Music, MoreVertical } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { getPlaylists } from '../api/playlistService';
import { library } from "@fortawesome/fontawesome-svg-core";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHouse, faListUl, faHourglassHalf, faLinesLeaning, faPlay, faPlus } from '@fortawesome/free-solid-svg-icons';
import { Home } from 'lucide-react';
import nativeMediaService from '../services/nativeMediaService';
import ImageWithFallback from './ImageWithFallback';
import { useDrag } from '@use-gesture/react';
import { useSpring } from '@react-spring/web';
import '../styles/marquee.css';

library.add(faHouse, faListUl, faHourglassHalf, faLinesLeaning);

const PlayerUI = ({ 
    currentSong, isPlaying, onPlayPause, onNext, onPrev, 
    progress, onProgressChange, duration, currentTime,
    volume, onVolumeChange,
    isShuffle, onShuffleToggle, isRepeat, onRepeatToggle,
    onAddToQueue = () => {}, onAddToPlaylist = () => {}, onShowArtist = () => {}, onReportSong = () => {},
    onOpenUpNext = () => {}, onOpenRelated = () => {}, onTogglePlayerExpand,
    variant = 'desktop',
    user
}) => {
    const isMobileVariant = variant === 'mobile';
    const navigate = useNavigate();
    const token = user && user.token ? user.token : null;
    const [playlists, setPlaylists] = useState([]);
    const [loadingPlaylists, setLoadingPlaylists] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const [menuSticky, setMenuSticky] = useState(false);
    const menuRef = useRef(null);
    const [dropdownStyle, setDropdownStyle] = useState(null);
    const menuStickyRef = useRef(menuSticky);
    const containerRef = useRef(null);
    const currentFav = useContext(FavoritesContext);

    // spring for y translation (minimize gesture)
    const [{ y }, api] = useSpring(() => ({ y: 0 }));

    // attach drag only if minimize handler is available
    useDrag(({ last, movement: [, my], velocity: [, vy], direction: [, dy], event, first, active }) => {
        if (!onTogglePlayerExpand) return;
        try {
            const shouldDrag = my > 0;
            const to = shouldDrag ? Math.min(my, window.innerHeight) : 0;
            if (!last) {
                api.start({ y: to, immediate: true });
                // Only call preventDefault when the finger has moved enough to
                // indicate an intentional drag. Preventing default on every
                // touch event can block taps/clicks that should open the modal.
                if (event && event.cancelable && Math.abs(my) > 6) {
                    try { event.preventDefault(); } catch (e) {}
                }
            } else {
                const threshold = 120;
                const shouldMinimize = my > threshold || (vy > 0.8 && dy > 0);
                if (shouldMinimize) {
                    api.start({ y: window.innerHeight, immediate: false });
                    setTimeout(() => {
                        try { onTogglePlayerExpand && onTogglePlayerExpand(); } catch(e){}
                        api.start({ y: 0, immediate: true });
                    }, 180);
                } else {
                    api.start({ y: 0, immediate: false });
                }
            }
        } catch (err) { console.debug('PlayerUI drag error', err); }
    }, { target: containerRef, axis: 'y', filterTaps: true, pointer: { touch: true }, eventOptions: { passive: false } });

    useEffect(() => { menuStickyRef.current = menuSticky; }, [menuSticky]);
    useEffect(() => {
        function handleClickOutside(e) {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                if (!menuStickyRef.current) setMenuOpen(false);
            }
        }
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);

    useEffect(() => {
        let active = true;

        async function loadPlaylists() {
            if (!token) {
                setPlaylists([]);
                return;
            }

            setLoadingPlaylists(true);
            try {
                const data = await getPlaylists(token);
                if (!active) return;
                setPlaylists(Array.isArray(data) ? data : []);
            } catch (error) {
                if (!active) return;
                setPlaylists([]);
            } finally {
                if (active) setLoadingPlaylists(false);
            }
        }

        loadPlaylists();
        return () => {
            active = false;
        };
    }, [token]);

    // MusicControls integration (cordova-plugin-music-controls2)
    useEffect(() => {
        // only run on native platforms where the plugin exists
        if (!Capacitor.isNativePlatform()) return;
    console.log('PlayerUI: Capacitor native platform detected');
    console.log('PlayerUI: MusicControls available?', typeof window !== 'undefined' && !!window.MusicControls);
    const hasCapacitorNativeMedia = !!(Capacitor.Plugins && Capacitor.Plugins.NativeMedia);
        if (typeof window === 'undefined' || !window.MusicControls) {
            // still try to start the native foreground service if available
        }

        // create or update controls when currentSong changes
        try {
            if (currentSong) {
                // If the Capacitor NativeMedia plugin is available, prefer it as the single
                // source of truth for the foreground service / notification. Falling back to
                // the Cordova MusicControls plugin only when NativeMedia is not present avoids
                // having two different notification producers fighting each other (fluttering).
                const hasCapacitorNativeMedia = !!(Capacitor.Plugins && Capacitor.Plugins.NativeMedia);

                if (!hasCapacitorNativeMedia && typeof window !== 'undefined' && window.MusicControls) {
                    // Cordova path: create & subscribe only when NativeMedia isn't present
                    window.MusicControls.create({
                        track: currentSong.title || 'Unknown',
                        artist: currentSong.artist || '',
                        cover: currentSong.coverUrl || '',
                        isPlaying: !!isPlaying,
                        dismissable: false,
                        hasPrev: true,
                        hasNext: true,
                        hasClose: true
                    });

                    window.MusicControls.subscribe((action) => {
                        // plugin may send a JSON string or object
                        let message = action;
                        try {
                            if (typeof action === 'string') {
                                const parsed = JSON.parse(action);
                                message = parsed && parsed.message ? parsed.message : action;
                            } else if (action && action.message) {
                                message = action.message;
                            }
                        } catch (e) {
                            // keep original
                        }

                        // debug log
                        console.log('MusicControls action ->', message);
                        // route actions to props
                        if (typeof message === 'string') {
                            if (message.includes('play')) {
                                onPlayPause && onPlayPause(true);
                            } else if (message.includes('pause')) {
                                onPlayPause && onPlayPause(false);
                            } else if (message.includes('next')) {
                                onNext && onNext();
                            } else if (message.includes('previous')) {
                                onPrev && onPrev();
                            } else if (message.includes('destroy')) {
                                window.MusicControls.destroy();
                            }
                        }
                    });

                    window.MusicControls.listen();
                }

                // Before starting/updating native service, ensure notification permission is granted
                (async () => {
                    const checkAndRequestNotificationPermission = async () => {
                        // If not running on native, fall back to the web Notification API
                        if (!Capacitor.isNativePlatform()) {
                            try {
                                const result = await Notification.requestPermission();
                                return result === 'granted';
                            } catch (e) {
                                return false;
                            }
                        }

                        // Try dynamic import of Capacitor PushNotifications (safe if not installed)
                        try {
                            const mod = await import('@capacitor/push-notifications');
                            const PushNotifications = mod.PushNotifications || mod.default;
                            if (!PushNotifications) return false;

                            let status = await PushNotifications.checkPermissions();
                            // plugin may return { receive } or { value } or { granted }
                            let granted = (status && (status.receive === 'granted' || status.value === 'granted' || status.granted === true));
                            if (!granted) {
                                status = await PushNotifications.requestPermissions();
                                granted = (status && (status.receive === 'granted' || status.value === 'granted' || status.granted === true));
                            }
                            return !!granted;
                        } catch (e) {
                            console.warn('PushNotifications plugin not available or failed:', e);
                            // fallback to web prompt
                            try {
                                const result = await Notification.requestPermission();
                                return result === 'granted';
                            } catch (err) {
                                return false;
                            }
                        }
                    };

                    const hasPermission = await checkAndRequestNotificationPermission();
                    if (!hasPermission) {
                        console.warn('Notification permission not granted; native foreground notification may not display on Android 13+');
                        return;
                    }

                    try {
                        // Avoid starting the foreground service from UI components to
                        // prevent duplicate start requests. App-level controller (App.jsx)
                        // is responsible for starting the service when the song changes.
                        // Here we just update metadata so the notification stays in sync.
                        console.log('PlayerUI: updating native metadata via nativeMediaService', { title: currentSong.title, artist: currentSong.artist, cover: currentSong.coverUrl });
                        await nativeMediaService.updateMetadata(currentSong);
                    } catch (e) {
                        console.warn('PlayerUI: NativeMedia.updateMetadata failed', e);
                    }
                })();
            } else {
                // no song: destroy controls
                if (window.MusicControls && window.MusicControls.destroy) {
                    window.MusicControls.destroy();
                }
                try {
                    if (Capacitor.Plugins && Capacitor.Plugins.NativeMedia && Capacitor.Plugins.NativeMedia.stopService) {
                        console.log('PlayerUI: stopping NativeMedia service');
                        Capacitor.Plugins.NativeMedia.stopService();
                    }
                } catch (e) {
                    // ignore
                }
            }

            // update playing state when isPlaying toggles
            try {
                if (hasCapacitorNativeMedia) {
                    // centralize play state updates through the nativeMediaService when available
                    nativeMediaService.updateIsPlaying(!!isPlaying);
                } else if (window.MusicControls && window.MusicControls.updateIsPlaying) {
                    window.MusicControls.updateIsPlaying(!!isPlaying);
                }
            } catch (e) {
                console.warn('PlayerUI: error updating play state for native controls', e);
            }
        } catch (err) {
            // don't block the UI if plugin fails
            // console.warn('MusicControls init error', err);
        }

        return () => {
            try {
                if (window.MusicControls && window.MusicControls.destroy) {
                    window.MusicControls.destroy();
                }
            } catch (e) {}
        };
    // We intentionally only depend on `currentSong` here so metadata updates are
    // triggered only when the song (metadata) changes. Avoid updating metadata
    // on transient progress or callback identity changes which cause UI flicker.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentSong]);

    // Listen for native plugin mediaAction events (play/pause/next/prev) and route to app controls
    useEffect(() => {
        let removeListener = null;
        try {
            if (Capacitor.isNativePlatform() && Capacitor.Plugins && Capacitor.Plugins.NativeMedia && Capacitor.Plugins.NativeMedia.addListener) {
                (async () => {
                    try {
                        const l = await Capacitor.Plugins.NativeMedia.addListener('mediaAction', (info) => {
                            const action = info && info.action ? info.action : info;
                            if (action === 'play') onPlayPause && onPlayPause(true);
                            else if (action === 'pause') onPlayPause && onPlayPause(false);
                            else if (action === 'next') onNext && onNext();
                            else if (action === 'prev' || action === 'previous') onPrev && onPrev();
                        });
                        removeListener = l && l.remove ? l.remove : null;
                    } catch (e) {
                        console.warn('PlayerUI: failed to add NativeMedia.mediaAction listener', e);
                    }
                })();
            }
        } catch (e) {
            // ignore
        }
        return () => {
            try { if (removeListener) removeListener(); } catch(e){}
        };
    }, [onPlayPause, onNext, onPrev]);

    // compute dropdown position when menuOpen toggles on
    useEffect(() => {
        if (menuOpen && menuRef.current) {
            const rect = menuRef.current.getBoundingClientRect();
            const menuWidth = 176; // matches w-44 ~ 11rem = 176px
            const dropdownHeight = 160; // approximate height of the menu
            // align dropdown right edge to button right edge
            let left = rect.right - menuWidth;
            if (left < 8) left = 8;
            if (left + menuWidth > window.innerWidth - 8) left = window.innerWidth - menuWidth - 8;
            // prefer to vertically center the dropdown relative to the button
            let top = rect.top + (rect.height / 2) - (dropdownHeight / 2);
            // if centering pushes it out of viewport, fall back to below or clamp
            if (top < 8) {
                top = rect.bottom + 6; // place below
            }
            if (top + dropdownHeight > window.innerHeight - 8) {
                top = Math.max(8, window.innerHeight - dropdownHeight - 8);
            }
            setDropdownStyle({ position: 'fixed', left: `${left}px`, top: `${top}px`, zIndex: 9999 });
        } else {
            setDropdownStyle(null);
        }
    }, [menuOpen]);

    const artistName = Array.isArray(currentSong?.artist) ? currentSong.artist.join(', ') : (currentSong?.artist || '');

    if (isMobileVariant) {
        return (
            <div ref={containerRef} style={{ transform: y.to(v => `translateY(${v}px)`), touchAction: 'pan-y' }} className="h-full w-full text-white">
                <div className="relative flex h-full min-h-0 flex-col overflow-hidden rounded-lg border border-white/10 bg-[#0f0f0f] shadow-2xl">
                    <div
                        className="absolute inset-0"
                        style={currentSong ? {
                            backgroundImage: `linear-gradient(180deg, rgba(6, 12, 24, 0.35) 0%, rgba(6, 12, 24, 0.88) 55%, rgba(6, 12, 24, 1) 100%), url('${currentSong.coverUrl}')`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center'
                        } : {
                            background: 'radial-gradient(circle at top, rgba(255, 0, 0, 0.16), transparent 40%), linear-gradient(180deg, #1f1f1f 0%, #0f0f0f 100%)'
                        }}
                    />
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.18),transparent_36%),radial-gradient(circle_at_bottom,rgba(255,0,0,0.10),transparent_30%)]" />
                    <div className="relative z-10 flex h-full min-h-0 flex-col px-4 pt-4 pb-5">
                        <div className="flex items-center justify-between gap-3 w-full">
                            <div></div>
                            {/* Menu Dropdown Container moved to the right */}
                            <div ref={menuRef} className="relative z-50">
                                <button aria-label="Open menu" onClick={(e) => { e.stopPropagation(); setMenuOpen(v => !v); }} className="rounded-full p-2 bg-transparent text-white/90 hover:bg-white/10 transition-colors">
                                    <MoreVertical size={18} />
                                </button>
                                {menuOpen && (
                                <div style={dropdownStyle} className="absolute right-0 mt-2 w-44 rounded-md border border-[#3f3f3f] bg-[#1f1f1f] py-1 text-left shadow-lg">
                                    <button onClick={() => { setMenuOpen(false); onAddToQueue && onAddToQueue(currentSong, 'end'); }} className="w-full px-3 py-2 text-left text-gray-100 hover:bg-[#282828]">Add to Queue</button>
                                    <button onClick={() => { setMenuOpen(false); onAddToPlaylist && onAddToPlaylist(currentSong.id); }} className="w-full px-3 py-2 text-left text-gray-100 hover:bg-[#282828]">Add to Playlist</button>
                                    <button onClick={() => { setMenuOpen(false); const { toggleSongFavorite } = currentFav; toggleSongFavorite(currentSong.id).catch(() => {}); }} className="w-full px-3 py-2 text-left text-gray-100 hover:bg-[#282828]">{currentFav && currentFav.isSongFavorite(currentSong.id) ? 'Remove Favourite' : 'Add Favourite'}</button>
                                    <button onClick={() => { setMenuOpen(false); onShowArtist && onShowArtist(artistName); }} className="w-full px-3 py-2 text-left text-gray-100 hover:bg-[#282828]">Artist</button>
                                    <button onClick={() => { setMenuOpen(false); onReportSong && onReportSong(currentSong.id); }} className="w-full px-3 py-2 text-left text-rose-400 hover:bg-[#282828]">Report</button>
                                </div>
                                )}
                            </div>
                        </div>
                        <div className="flex-1 min-h-0 overflow-y-auto pr-1 mt-5">
                            <div className="flex min-h-full flex-col items-center justify-start">
                                {currentSong ? (
                                    <>
                                        <div className="relative w-[72%] max-w-[260px]">
                                            <div className="absolute -inset-3 rounded-lg bg-blue-500/20 blur-2xl" />
                                            <ImageWithFallback
                                                src={currentSong.coverUrl}
                                                alt="Album Cover"
                                                className="relative aspect-square w-full rounded-lg object-cover shadow-[0_20px_60px_rgba(0,0,0,0.45)]"
                                                fallback={'https://placehold.co/400x400/1F2937/FFFFFF?text=Music'}
                                            />
                                        </div>

                                        <div className="w-full text-center mt-4">
                                            <h2 className={`mobile-player-title text-lg font-bold text-white ${currentSong.title && currentSong.title.length > 30 ? 'is-long' : ''}`} style={{ overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '100%' }}>{currentSong.title}</h2>
                                            <p className="text-xs text-gray-300" style={{ maxWidth: '100%', display: 'block' }}>{artistName}</p>
                                        </div>
                                    </>
                                ) : (
                                    <div className="flex flex-1 flex-col items-center justify-center text-center">
                                        <Music size={45} className="text-gray-500" />
                                        <h2 className="text-lg font-bold text-white">Song</h2>
                                        <p className="text-xs text-gray-400">Select a song to start playing.</p>
                                    </div>
                                )}

                                <div className="w-full max-w-md px-1 mt-3">
                                    <ProgressBar
                                        progress={progress}
                                        onProgressChange={onProgressChange}
                                        duration={duration}
                                        currentTime={currentTime}
                                    />
                                </div>

                                <div className="w-full max-w-md mt-3 mb-4">
                                    <Controls
                                        isPlaying={isPlaying}
                                        onPlayPause={onPlayPause}
                                        onNext={onNext}
                                        onPrev={onPrev}
                                        isShuffle={isShuffle}
                                        onShuffleToggle={onShuffleToggle}
                                        isRepeat={isRepeat}
                                        onRepeatToggle={onRepeatToggle}
                                    />
                                </div>

                                <div className="w-full max-w-md px-1 mt-2">
                                    <VolumeControl volume={volume} onVolumeChange={onVolumeChange} />
                                </div>

                                <div className="mt-4 flex w-full max-w-md items-center justify-between rounded-xl border border-white/10 bg-black/20 px-3 py-1 backdrop-blur-sm">
                                    <button type="button" onClick={(e) => { e.stopPropagation(); console.debug('PlayerUI: UP NEXT clicked'); try { onOpenUpNext && onOpenUpNext(); } catch (err) {} }} className="text-xs uppercase tracking-[0.18em] ml-6 text-gray-200 hover:text-white active:text-white">UP NEXT</button>
                                    <div className="h-6 w-px bg-white/10" />
                                    <button type="button" onClick={(e) => { e.stopPropagation(); console.debug('PlayerUI: RELATED clicked'); try { onOpenRelated && onOpenRelated(); } catch (err) {} }} className="text-xs uppercase tracking-[0.18em] mr-6 text-gray-200 hover:text-white active:text-white">RELATED</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Desktop / sidebar variant
    useEffect(() => {
        if (isMobileVariant) return;
        if (!token) return;
        let mounted = true;
        setLoadingPlaylists(true);
        getPlaylists(token).then(data => {
            if (!mounted) return;
            setPlaylists(Array.isArray(data) ? data : []);
        }).catch(err => {
            console.warn('Failed to load playlists for sidebar', err);
            setPlaylists([]);
        }).finally(() => {
            if (mounted) setLoadingPlaylists(false);
        });
        return () => { mounted = false; };
    }, [token, isMobileVariant]);

    return (
        <div ref={containerRef} style={{ transform: y.to(v => `translateY(${v}px)`), touchAction: 'pan-y' }} className="p-4 flex flex-col h-full">
            {/* Replace user profile area with Playlist button in the left column header (desktop) */}
            <div className="relative flex flex-col items-center gap-1">
                <div className="w-full flex gap-4 px-3 py-2 rounded-lg items-center justify-center bg-transparent text-white hover:bg-blue-600">
                    <FontAwesomeIcon icon={faHouse} />
                    <Link to="/" className="w-full mt-1">Home</Link>
                </div>
                <div className="w-full flex gap-4 px-3 rounded-lg items-center justify-center py-2 bg-transparent text-white hover:bg-blue-600">
                    <FontAwesomeIcon icon={faListUl} />
                    <Link to="/recommendations" className="w-full">Recommendations</Link>
                </div>
                <div className="w-full flex gap-4 px-3 py-2 rounded-lg items-center justify-center bg-transparent text-white hover:bg-blue-600">
                    <FontAwesomeIcon icon={faHourglassHalf} />
                    <Link to="/feed" className="w-full">Recently Played</Link>
                </div>
                <div className="w-full flex gap-4 px-3 py-2 rounded-lg items-center justify-center bg-transparent text-white hover:bg-blue-600">
                    <FontAwesomeIcon icon={faLinesLeaning} />
                    <Link to="/playlists" className="w-full">Playlists</Link>
                </div>
            </div>
            <br />
            <hr />
            <br />

            <div className="w-[210px] flex gap-2 px-3 py-1 rounded-full items-center justify-center bg-[#282828] text-white hover:bg-[#3f3f3f]">
                <FontAwesomeIcon icon={faPlay} className='ml-7' />
                <Link to="/favorites" className="w-full">Liked music</Link>
            </div>

            <button 
                onClick={() => { 
                    try { 
                        navigate('/playlists?create=1'); 
                    } catch (e) { 
                        window.location.href = '/playlists?create=1'; 
                    } 
                }} 
                className='w-[210px] bg-blue-600 text-white hover:bg-blue-700 mt-2 rounded-full gap-3 py-1 px-3'>
                    <FontAwesomeIcon icon={faPlus} />
                    New Playlist
            </button>

            <div className="w-full mt-3">
                {loadingPlaylists ? (
                    <p className="text-xs text-gray-400">Loading...</p>
                ) : playlists && playlists.length > 0 ? (
                    <div className="flex flex-col gap-2 max-h-64 overflow-y-auto pr-1">
                        {playlists.map(pl => (
                            <div key={pl.id} onClick={() => { try { navigate(`/playlists/${pl.id}`); } catch (e) { window.location.href = `/playlists/${pl.id}`; } }} className="flex items-center gap-3 bg-[#1f1f1f] rounded-md p-1 cursor-pointer hover:bg-[#282828]">
                                <ImageWithFallback src={pl.coverUrl || 'https://placehold.co/240x240/1F2937/FFFFFF?text=P'} alt={pl.name} className="w-10 h-10 object-cover rounded-md" fallback={'https://placehold.co/240x240/1F2937/FFFFFF?text=P'} />
                                <div className="flex-1 min-w-0">
                                    <div className="text-sm font-medium text-white truncate">{pl.name}</div>
                                    <div className="text-[10px] text-gray-400">{pl.songCount ?? pl.songs?.length ?? ''} songs</div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-xs text-gray-400">No playlists yet.</p>
                )}
            </div>
        </div>
    );
};

export default PlayerUI;