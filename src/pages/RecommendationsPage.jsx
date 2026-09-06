import React, { useState, useEffect, useContext, useMemo, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getPlaylistRecommendations } from '../api/userService';
import { FavoritesContext } from '../contexts/FavoritesContext';
import { Heart, MoreVertical, Play } from 'lucide-react';
import ImageWithFallback from '../components/ImageWithFallback';
import { Loader } from '../components/OtherComponents';
import { useOutletContext } from 'react-router-dom';
import { getQuickPicks } from '../utils/quickPicksAlgorithm';

const DEFAULT_ARTIST_IMAGE = '/artists/default.png';

// Mood categories with keywords for filtering
const moodCategories = [
    { 
        name: 'Chill', 
        imageUrl: '/moods/chill.jpg', 
        color: 'bg-blue-500',
        keywords: ['chill', 'relaxing', 'ambient', 'indie', 'acoustic', 'folk', 'peaceful', 'calm', 'mellow', 'soft']
    },
    { 
        name: 'Romantic', 
        imageUrl: '/moods/romantic.jpg', 
        color: 'bg-rose-500', 
        keywords: ['romantic', 'love', 'couple', 'valentine', 'wedding', 'proposal', 'intimate', 'passionate', 'sweet', 'tender']
    },
    { 
        name: 'Smooth', 
        imageUrl: '/moods/smooth.jpg', 
        color: 'bg-pink-500', 
        keywords: ['romantic', 'smooth', 'soft', 'melodious', 'arijit', 'atif', 'mohit', 'sonu', 'udit', 'love']
    },
    { 
        name: 'Hollywood Mix', 
        imageUrl: '/moods/hollywoodmix.jpg', 
        color: 'bg-blue-600',
        keywords: ['hollywood', 'english', 'western', 'pop', 'rock', 'foreign', 'international', 'bollywood english', 'bollywood mix']
    },
    { 
        name: 'Hip Hop Mix', 
        imageUrl: '/moods/hiphop.jpg', 
        color: 'bg-blue-500',
        keywords: ['hip hop', 'rap', 'trap', 'urban', 'street', 'gangsta', 'freestyle', 'beat', 'rhyme', 'flow']
    },
    { 
        name: 'Soft & HeartBreak', 
        imageUrl: '/moods/heartbreak.jpg', 
        color: 'bg-purple-500', 
        keywords: ['sad', 'emotional', 'melancholy', 'heartbreak', 'depressing', 'tearful', 'gloomy', 'sorrowful', 'soft', 'gentle']
    },
    { 
        name: 'Party', 
        imageUrl: '/moods/party.jpg', 
        color: 'bg-blue-500',
        keywords: ['party', 'dance', 'energetic', 'upbeat', 'club', 'remix', 'electronic', 'bollywood', 'item', 'peppy']
    }
];


// Your Mood component
const YourMood = () => {
    return (
        <div className="mb-8">
            <h3 className="text-2xl font-bold mb-5">Your Mood</h3>
            
            {/* Mood Cards - Single Row with Images */}
            <div className="grid grid-flow-col auto-cols-[9.25rem] sm:auto-cols-[10.25rem] gap-3 overflow-x-auto custom-scrollbar-h pb-4">
                {moodCategories.map((mood) => (
                    <Link 
                        key={mood.name} 
                        to={`/mood/${encodeURIComponent(mood.name)}`}
                        className="group relative cursor-pointer transition-all duration-300 flex flex-col p-3 bg-[#1f1f1f]/50 hover:bg-[#282828]/80"
                    >
                        <div className="relative mb-3">
                            <img 
                                src={mood.imageUrl} 
                                alt={mood.name} 
                                className="w-full h-auto aspect-square rounded-md object-cover" 
                                onError={(e) => { e.target.onerror = null; e.target.src='https://placehold.co/400x400/1F2937/FFFFFF?text=' + mood.name.charAt(0); }}
                            />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 rounded-md flex items-center justify-center transition-all duration-300">
                                <div className="w-12 h-12 bg-white/0 group-hover:bg-white/20 rounded-full flex items-center justify-center transition-all duration-300">
                                    <Play size={24} className="text-white fill-current opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                </div>
                            </div>
                        </div>
                        <div className="flex flex-col justify-start flex-grow">
                            <h4 className="text-sm font-semibold text-white truncate">{mood.name}</h4>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
};

// Helper: parse duration strings like "mm:ss" or "hh:mm:ss" into seconds
const parseDurationToSeconds = (dur) => {
    if (!dur) return 0;
    try {
        const parts = String(dur).split(':').map(p => parseInt(p, 10));
        if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
        if (parts.length === 2) return parts[0] * 60 + parts[1];
        return Number(parts[0]) || 0;
    } catch (e) { return 0; }
};

// Helper: format seconds to hh:mm:ss or mm:ss
const formatSecondsToDuration = (sec) => {
    if (sec === undefined || sec === null) return '0:00';
    const totalSeconds = parseDurationToSeconds(sec);
    if (!totalSeconds || isNaN(totalSeconds)) return '0:00';
    const total = Math.round(totalSeconds);
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    const pad = (n) => n.toString().padStart(2, '0');
    if (h > 0) return `${h}:${pad(m)}:${pad(s)}`;
    return `${m}:${pad(s)}`;
};


// Quick Picks Component - Smart recommendations based on listening history
const QuickPicksSection = ({ songs, currentSongId, isPlaying, onSelectSong, openMenuId, setOpenMenuId, handlers }) => {
    const quickPickSongs = useMemo(() => {
        const picks = getQuickPicks(songs, 24);
        if (Array.isArray(picks) && picks.length > 0) {
            return picks;
        }
        return Array.isArray(songs) ? songs.slice(0, 24) : [];
    }, [songs]);

    if (!Array.isArray(quickPickSongs) || quickPickSongs.length === 0) {
        return (
            <div className="mb-5">
                <h3 className="text-2xl font-bold mb-3">Quick picks</h3>
                <p className="text-gray-400 text-sm">Quick Picks are being generated for you. Please play a song to improve recommendations.</p>
            </div>
        );
    }

    const QuickPickMenu = ({ song }) => {
        const ref = useRef(null);
        const buttonRef = useRef(null);
        const [menuStyle, setMenuStyle] = useState({});
        const { isSongFavorite, toggleSongFavorite } = useContext(FavoritesContext);

        useEffect(() => {
            function onDocClick(e) {
                if (ref.current && !ref.current.contains(e.target)) {
                    setOpenMenuId(prev => (prev === `quickpick-${song.id}` ? null : prev));
                }
            }
            document.addEventListener('click', onDocClick);
            return () => document.removeEventListener('click', onDocClick);
        }, [song.id]);

        useEffect(() => {
            if (!openMenuId || openMenuId !== `quickpick-${song.id}` || !buttonRef.current) {
                setMenuStyle({});
                return;
            }

            const rect = buttonRef.current.getBoundingClientRect();
            const menuWidth = 176;
            const menuHeight = 220;
            const margin = 12;

            let left = rect.right - menuWidth;
            let top = rect.bottom + 8;

            if (left < margin) left = margin;
            if (left + menuWidth > window.innerWidth - margin) left = window.innerWidth - menuWidth - margin;

            if (window.innerHeight - rect.bottom < menuHeight + 24) {
                top = rect.top - menuHeight - 8;
            }

            if (top < margin) top = margin;
            if (top + menuHeight > window.innerHeight - margin) top = window.innerHeight - menuHeight - margin;

            setMenuStyle({ position: 'fixed', left: `${left}px`, top: `${top}px`, width: '11rem', zIndex: 2000, opacity: 1, backgroundColor: 'rgb(31, 31, 31)', boxShadow: '0 18px 48px rgba(0,0,0,0.75)', border: '1px solid rgba(148,163,184,0.2)' });
        }, [openMenuId, song.id]);

        const isOpen = openMenuId === `quickpick-${song.id}`;
        const fav = isSongFavorite(song.id);

        return (
            <div ref={ref} className="relative inline-block">
                <button
                    ref={buttonRef}
                    type="button"
                    aria-label="Open song menu"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpenMenuId(prev => prev === `quickpick-${song.id}` ? null : `quickpick-${song.id}`); }}
                    onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
                    onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
                    className="p-1 rounded-full bg-transparent hover:bg-transparent focus:outline-none focus:ring-0 active:bg-transparent text-white"
                >
                    <MoreVertical size={14} />
                </button>
                {isOpen && (
                    <div
                        onClick={(e) => e.stopPropagation()}
                        onMouseDown={(e) => e.stopPropagation()}
                        onPointerDown={(e) => e.stopPropagation()}
                        style={menuStyle}
                        className="overflow-hidden rounded-md text-left py-0.5 z-[2000]"
                    >
                        <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpenMenuId(null); handlers.onAddToQueue && handlers.onAddToQueue(song, 'end'); }} className="w-full text-left px-3 py-2 hover:bg-[#282828] text-gray-100 text-xs" style={{ backgroundColor: 'rgb(31, 31, 31)', color: '#fff', opacity: 1 }}>Add to Queue</button>
                        <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpenMenuId(null); handlers.onAddToPlaylist && handlers.onAddToPlaylist(song.id); }} className="w-full text-left px-3 py-2 hover:bg-[#282828] text-gray-100 text-xs" style={{ backgroundColor: 'rgb(31, 31, 31)', color: '#fff', opacity: 1 }}>Add to Playlist</button>
                        <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpenMenuId(null); toggleSongFavorite(song.id).catch(() => {}); }} className="w-full text-left px-3 py-2 hover:bg-[#282828] text-gray-100 text-xs" style={{ backgroundColor: 'rgb(31, 31, 31)', color: '#fff', opacity: 1 }}>{fav ? 'Remove Favourite' : 'Add Favourite'}</button>
                        <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpenMenuId(null); handlers.onShowArtist && handlers.onShowArtist(Array.isArray(song.artist) ? song.artist.join(', ') : (song.artist || '')); }} className="w-full text-left px-3 py-2 hover:bg-[#282828] text-gray-100 text-xs" style={{ backgroundColor: 'rgb(31, 31, 31)', color: '#fff', opacity: 1 }}>Artist</button>
                        <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpenMenuId(null); handlers.onReportSong && handlers.onReportSong(song.id); }} className="w-full text-left px-3 py-2 text-rose-400 hover:bg-[#282828] text-xs" style={{ backgroundColor: 'rgb(31, 31, 31)', color: '#fca5a5', opacity: 1 }}>Report</button>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="mb-5">
            <h3 className="text-2xl font-bold mb-4">Quick picks</h3>
            
            {/* Mobile view: 3 columns x 3 rows, left-right scrolling */}
            <div className="md:hidden grid grid-flow-col auto-cols-[6rem] grid-rows-3 gap-1 overflow-x-auto overflow-y-hidden custom-scrollbar-h pb-3">
                {quickPickSongs.map((song) => {
                    const isActive = currentSongId === song.id && isPlaying;
                    return (
                        <div 
                            key={song.id} 
                            onClick={() => onSelectSong(song.id)}
                            className={`group relative mt-0.5 ml-0.5 mr-0.5 rounded-lg cursor-pointer transition-all duration-300 overflow-hidden ${isActive ? 'ring-2 ring-red-400' : ''}`}
                        >
                            <ImageWithFallback
                                src={song.coverUrl}
                                fallback={DEFAULT_ARTIST_IMAGE}
                                alt={song.title}
                                className="w-full h-auto aspect-square rounded-lg object-cover"
                            />
                            {/* Title overlay on mobile */}
                            <div className="absolute inset-0 flex items-end justify-start bg-gradient-to-t from-black/80 to-transparent p-2 rounded-lg">
                                <h4 className={`text-xs font-semibold truncate line-clamp-2 ${isActive ? 'text-red-300' : 'text-white'}`}>{song.title}</h4>
                            </div>
                            {/* Play button on hover */}
                            <div className={`absolute bottom-1 right-1 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center shadow-lg transform transition-all duration-300 ${isActive ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0'}`}>
                                <Play size={12} className="text-white fill-current" />
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Desktop/Tablet view: 4 rows horizontal bars, scrollable with artist names and menu */}
            <div className="hidden md:grid grid-flow-col auto-cols-[20rem] grid-rows-4 gap-1 overflow-x-auto overflow-y-hidden custom-scrollbar-h pb-2">
                {quickPickSongs.map((song) => {
                    const isActive = currentSongId === song.id && isPlaying;
                    return (
                        <div 
                            key={song.id} 
                            onClick={() => onSelectSong(song.id)}
                            className={`group relative p-1.5 rounded-lg cursor-pointer transition-all duration-300 flex items-center gap-2 ${isActive ? 'bg-blue-900/40' : 'bg-[#1f1f1f]/50 hover:bg-[#282828]/80'}`}
                        >
                            <div className="relative flex-shrink-0 w-10 h-10">
                                <ImageWithFallback
                                    src={song.coverUrl}
                                    fallback={DEFAULT_ARTIST_IMAGE}
                                    alt={song.title}
                                    className="w-full h-full rounded-md object-cover"
                                />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h4 className={`text-xs font-semibold truncate ${isActive ? 'text-red-300' : 'text-white'}`}>{song.title}</h4>
                                <span className="flex gap-2">
                                    <p className="text-xs text-gray-400 truncate max-w-[full]">{Array.isArray(song.artist) ? song.artist[0] : (song.artist || '')}</p>
                                    <p className='text-xs justify-center items-center'>•</p>
                                    <p className="text-xs text-gray-400 truncate">{formatSecondsToDuration(song.duration ?? song.durationSeconds ?? song.duration_seconds ?? song.metadata?.duration)}</p>
                                </span>
                            </div>
                            <div className="flex-shrink-0 flex items-center gap-1">
                                <div className={`w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center shadow-lg transform transition-all duration-300 ${isActive ? 'opacity-100 translate-y-0' : 'opacity-0 group-hover:opacity-100'}`}>
                                    <Play size={12} className="text-white fill-current" />
                                </div>
                                <QuickPickMenu song={song} />
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

const RecommendationsPage = ({ songs, onSelectSong, currentSongId, isPlaying, onAddToQueue = () => {} }) => {
    const outlet = useOutletContext() || {};
    const { token, onPlayPlaylist, onAddToQueue: outletAddToQueue, onAddToPlaylist } = outlet;
    const availableSongs = Array.isArray(songs) ? songs : (Array.isArray(outlet.allSongs) ? outlet.allSongs : []);
    const navigate = useNavigate();
    const [recs, setRecs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const { isPlaylistFavorite, togglePlaylistFavorite } = useContext(FavoritesContext);
    const handlers = {
        onAddToQueue: onAddToQueue || outletAddToQueue,
        onAddToPlaylist: outlet.onAddToPlaylist,
        onShowArtist: outlet.onShowArtist,
        onReportSong: outlet.onReportSong,
        onSearchBarClick: outlet.onSearchBarClick,
    };

    // Manage one open menu at a time using openMenuId at parent scope
    const [openMenuId, setOpenMenuId] = useState(null);

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

    const SongMenu = ({ song, className }) => {
        const ref = useRef(null);
        const buttonRef = useRef(null);
        const [menuStyle, setMenuStyle] = useState({});
        const { isSongFavorite, toggleSongFavorite } = useContext(FavoritesContext);

        useEffect(() => {
            function onDocClick(e) {
                if (ref.current && !ref.current.contains(e.target)) {
                    // use functional updater to avoid reading outer `openMenuId`
                    setOpenMenuId(prev => (prev === song.id ? null : prev));
                }
            }
            document.addEventListener('click', onDocClick);
            return () => document.removeEventListener('click', onDocClick);
        }, [song.id]);

        useEffect(() => {
            if (!openMenuId || openMenuId !== song.id || !buttonRef.current) {
                setMenuStyle({});
                return;
            }

            const rect = buttonRef.current.getBoundingClientRect();
            const menuWidth = 160;
            const menuHeight = 210;
            let left = rect.right - menuWidth;
            let top = rect.bottom + 8;

            if (left < 8) left = 8;
            if (left + menuWidth > window.innerWidth - 8) left = window.innerWidth - menuWidth - 8;

            if (window.innerHeight - rect.bottom < menuHeight + 20) {
                top = rect.top - menuHeight - 8;
            }

            if (top < 8) top = 8;
            if (top + menuHeight > window.innerHeight - 8) top = window.innerHeight - menuHeight - 8;

            setMenuStyle({ position: 'fixed', left: `${left}px`, top: `${top}px`, width: '10rem', zIndex: 1000 });
        }, [openMenuId, song.id]);

        const isOpen = openMenuId === song.id;
        const fav = isSongFavorite(song.id);

        return (
            <div ref={ref} className={`relative inline-block ${className || ''}`}>
                <button ref={buttonRef} aria-label="Open song menu" onClick={(e) => { e.stopPropagation(); setOpenMenuId(prev => prev === song.id ? null : song.id); }} className="p-2 rounded-full bg-transparent hover:bg-transparent focus:outline-none focus:ring-0 active:bg-transparent text-white">
                    <MoreVertical size={16} />
                </button>
                {isOpen && (
                    // narrower dropdown and tighter padding
                    <div style={menuStyle} className="bg-[#1f1f1f] border border-gray-700 rounded-md shadow-lg text-left py-0.5 z-50">
                        <button onClick={(e) => { e.stopPropagation(); setOpenMenuId(null); handlers.onAddToQueue && handlers.onAddToQueue(song, 'end'); }} className="w-full text-left px-3 py-2 hover:bg-[#282828] text-gray-100">Add to Queue</button>
                        <button onClick={(e) => { e.stopPropagation(); setOpenMenuId(null); handlers.onAddToPlaylist && handlers.onAddToPlaylist(song.id); }} className="w-full text-left px-3 py-2 hover:bg-[#282828] text-gray-100">Add to Playlist</button>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setOpenMenuId(null);
                                toggleSongFavorite(song.id).catch(() => {});
                            }}
                            className="w-full text-left px-3 py-2 hover:bg-[#282828] text-gray-100"
                        >
                            {fav ? 'Remove Favourite' : 'Add Favourite'}
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); setOpenMenuId(null); handlers.onShowArtist && handlers.onShowArtist(Array.isArray(song.artist) ? song.artist.join(', ') : (song.artist || '')); }} className="w-full text-left px-3 py-2 hover:bg-[#282828] text-gray-100">Artist</button>
                        <button onClick={(e) => { e.stopPropagation(); setOpenMenuId(null); handlers.onReportSong && handlers.onReportSong(song.id); }} className="w-full text-left px-3 py-2 text-rose-400 hover:bg-[#282828]">Report</button>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="flex-1 flex flex-col h-full min-h-0 min-w-0 bg-[#0f0f0f]">
            <div className="p-4 md:p-6 border-b border-gray-700 bg-[#1f1f1f]/30">
                <h1 className="text-3xl font-semibold text-white">That's for you</h1>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-6">
                {loading && (
                    <div className="flex items-center justify-center h-full">
                        <Loader />
                    </div>
                )}
                {!loading && error && (
                    <div className="text-center text-red-400">{error}</div>
                )}
                {!loading && !error && recs.length === 0 && availableSongs.length === 0 && (
                    <div className="flex items-center justify-center h-full flex-col gap-4">
                        <p className="text-gray-400 text-lg">No recommendations available now</p>
                        <p className="text-gray-500 text-sm">Listen to songs to receive suggestions</p>
                    </div>
                )}
                {!loading && !error && (availableSongs.length > 0 || recs.length > 0) && (
                    <>
                    <div className="md:hidden">
                        <QuickPicksSection songs={availableSongs} currentSongId={currentSongId} isPlaying={isPlaying} onSelectSong={onSelectSong} openMenuId={openMenuId} setOpenMenuId={setOpenMenuId} handlers={handlers} />
                        <h3 className="text-2xl font-bold mb-3 mt-2">Mix for you</h3>
                        {(
                        <div className="grid grid-rows-5 grid-flow-col auto-cols-[18rem] gap-1.5 overflow-x-auto overflow-y-hidden pb-2">
                          {availableSongs.slice(0, 50).map((song) => {
                            const isActive = currentSongId === song.id && isPlaying;
                            return (
                                <div 
                                    key={song.id} 
                                    onClick={() => onSelectSong(song.id)}
                                    className={`flex items-center p-1 gap-2 rounded-md cursor-pointer transition-all duration-300 ${isActive ? 'bg-blue-900/30' : 'bg-[#0f0f0f]/80 hover:bg-[#282828]/80'}`}>
                                    <div className="relative flex-shrink-0">
                                        <ImageWithFallback
                                            src={song.coverUrl}
                                            fallback={DEFAULT_ARTIST_IMAGE}
                                            alt={song.title}
                                            className="w-10 h-10 rounded-md object-cover"
                                        />
                                        {isActive && (
                                            <Play className="absolute inset-0 m-auto text-red-400" size={16} />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className={`text-sm font-semibold truncate ${isActive ? 'text-red-300' : 'text-white'}`}>{song.title}</h4>
                                        <p className="text-xs text-gray-400 truncate">{Array.isArray(song.artist) ? song.artist.join(', ') : (song.artist || '')}</p>
                                    </div>
                                    <SongMenu song={song} className="flex-shrink-0" />
                                </div>
                            );
                          })}
                        </div>
                        )}
                        <div className="mt-4">
                            <YourMood />
                        </div>
                    </div>

            {/* Desktop layout: Listen Again -> Popular Artists -> Quick Picks -> Most Popular -> Your Mood */}
            <div className="hidden ml-20 md:block">
                <QuickPicksSection songs={availableSongs} currentSongId={currentSongId} isPlaying={isPlaying} onSelectSong={onSelectSong} openMenuId={openMenuId} setOpenMenuId={setOpenMenuId} handlers={handlers} />

                <div className="mt-3">
                    <h3 className="text-2xl font-bold mb-5">Mix for you</h3>
                    {(
                        <div className="grid grid-rows-2 grid-flow-col auto-cols-[9rem] sm:auto-cols-[9rem] gap-2 overflow-x-auto custom-scrollbar-h pb-4">
                            {availableSongs.slice(0, 50).map((song) => {
                                return (
                                <div 
                                    key={song.id} 
                                    onClick={() => onSelectSong(song.id)}
                                    className="group relative bg-[#1f1f1f]/50 hover:bg-[#282828]/80 p-2 rounded-lg cursor-pointer transition-all duration-300 flex flex-col"
                                >
                                    <div className="relative mb-1">
                                        <ImageWithFallback
                                            src={song.coverUrl}
                                            fallback={DEFAULT_ARTIST_IMAGE}
                                            alt={song.title}
                                            className="w-full h-auto aspect-square rounded-md object-cover"
                                        />
                                        <div className={`absolute bottom-2 right-14 w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center shadow-lg transform transition-all duration-300 ${currentSongId === song.id && isPlaying ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0'}`}>
                                            <Play size={24} className="text-white fill-current" />
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between mt-2">
                                        <div className="flex-1 min-w-0 ml-1">
                                            <h4 className="text-sm font-semibold text-white truncate">{song.title}</h4>
                                            <p className="text-xs text-gray-400 truncate">{Array.isArray(song.artist) ? song.artist.join(', ') : (song.artist || '')}</p>
                                        </div>
                                        <div className="hidden md:block flex-shrink-0">
                                            <SongMenu song={song} />
                                        </div>
                                    </div>
                                    <div className="md:hidden mt-2">
                                        <SongMenu song={song} />
                                    </div>
                                </div>
                            );
                            })}
                        </div>
                    )}
                </div>

                <div className="mt-6">
                    <YourMood />
                </div>
            </div>


                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                        {recs.map(pl => {
                            const favorited = isPlaylistFavorite(pl.id) || pl.isFavorite;
                            return (
                                <div key={pl.id} className="group cursor-pointer rounded-lg bg-[#1f1f1f]/50 hover:bg-[#282828]/50 p-3 transition-colors relative" onClick={() => navigate(`/playlists/${pl.id}`)}>
                                    <div className="relative mb-3 rounded-lg overflow-hidden bg-[#1f1f1f] aspect-square">
                                        <ImageWithFallback src={pl.coverUrl} alt={pl.name} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                                        <button
                                            onClick={(e) => { e.stopPropagation(); togglePlaylistFavorite(pl.id).catch(() => {}); }}
                                            className="absolute top-2 right-2 text-gray-200 hover:text-red-500 focus:outline-none"
                                        >
                                            <Heart size={18} fill={favorited ? 'currentColor' : 'none'} className={favorited ? 'text-red-500' : ''} />
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
                    </>
                )}
            </div>
        </div>
    );
};

export default RecommendationsPage;