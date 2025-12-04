import React, { useState, useRef, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { Controls, ProgressBar, VolumeControl } from './OtherComponents';
import { Music, MoreVertical } from 'lucide-react';
import nativeMediaService from '../services/nativeMediaService';
import ImageWithFallback from './ImageWithFallback';

const PlayerUI = ({ 
    currentSong, isPlaying, onPlayPause, onNext, onPrev, 
    progress, onProgressChange, duration, currentTime,
    volume, onVolumeChange,
    isShuffle, onShuffleToggle, isRepeat, onRepeatToggle,
    onAddToQueue = () => {}, onAddToPlaylist = () => {}, onShowArtist = () => {}, onReportSong = () => {}
}) => {
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef(null);
    const [dropdownStyle, setDropdownStyle] = useState(null);

    useEffect(() => {
        function handleClickOutside(e) {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                setMenuOpen(false);
            }
        }
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);

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
    
    return (
        <div className="p-4 flex flex-col h-full">
            <div className="flex-grow flex flex-col items-center justify-center text-center space-y-3 my-3 relative">
                {currentSong ? (
                    <>
                        {/* Menu button positioned at the card top-rightmost corner (transparent background) */}
                        <div ref={menuRef} className="absolute -top-3 -right-3 z-50">
                            <button aria-label="Open menu" onClick={(e) => { e.stopPropagation(); setMenuOpen(v => !v); }} className="p-2 rounded-full bg-transparent hover:bg-black/10 text-white">
                                <MoreVertical size={18} />
                            </button>
                            {menuOpen && (
                                // render dropdown as fixed positioned element so it doesn't affect layout
                                <div style={dropdownStyle} className="w-44 bg-[#15202B] border border-[#2A3942] rounded-md shadow-lg text-left py-1">
                                    <button onClick={() => { setMenuOpen(false); onAddToQueue && onAddToQueue(currentSong, 'end'); }} className="w-full text-left px-3 py-2 hover:bg-[#121a20] text-gray-100">Add to Queue</button>
                                    <button onClick={() => { setMenuOpen(false); onAddToPlaylist && onAddToPlaylist(currentSong.id); }} className="w-full text-left px-3 py-2 hover:bg-[#121a20] text-gray-100">Add to Playlist</button>
                                    <button onClick={() => { setMenuOpen(false); onShowArtist && onShowArtist(Array.isArray(currentSong.artist) ? currentSong.artist.join(', ') : (currentSong.artist || '')); }} className="w-full text-left px-3 py-2 hover:bg-[#121a20] text-gray-100">Artist</button>
                                    <button onClick={() => { setMenuOpen(false); onReportSong && onReportSong(currentSong.id); }} className="w-full text-left px-3 py-2 text-rose-400 hover:bg-[#121a20]">Report</button>
                                </div>
                            )}
                        </div>
                            <div className="relative">
                                <ImageWithFallback
                                    src={currentSong.coverUrl}
                                    alt="Album Cover"
                                    className="w-40 h-40 sm:w-48 sm:h-48 md:w-56 md:h-56 rounded-2xl shadow-md object-cover"
                                    fallback={'https://placehold.co/400x400/1F2937/FFFFFF?text=Music'}
                                />
                            </div>
                            <div>
                                <h2 className="text-base md:text-lg font-semibold truncate">{currentSong.title}</h2>
                                <p className="text-xs md:text-sm text-gray-400 truncate">{Array.isArray(currentSong.artist) ? currentSong.artist.join(', ') : (currentSong.artist || '')}</p>
                            </div>
                    </>
                ) : (
                     <div className="w-48 h-48 md:w-64 md:h-64 rounded-2xl bg-gray-700/50 border border-gray-600 flex flex-col justify-center items-center p-4">
                        <Music size={48} className="text-gray-500 mb-4"/>
                        <h2 className="text-xl font-bold">No Song Selected</h2>
                        <p className="text-gray-400 text-sm">Select a song to start playing.</p>
                    </div>
                )}
            </div>
            <div className="space-y-2">
                <ProgressBar 
                    progress={progress} 
                    onProgressChange={onProgressChange} 
                    duration={duration} 
                    currentTime={currentTime} 
                />
                <div className="w-full flex items-center justify-center">
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
                <VolumeControl volume={volume} onVolumeChange={onVolumeChange} />
            </div>
        </div>
    );
};

export default PlayerUI;

// NOTE: debug button removed to prevent accidental repeated native start calls from the WebView.
