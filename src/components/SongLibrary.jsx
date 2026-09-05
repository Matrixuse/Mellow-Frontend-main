import React, { useState, useRef, useEffect, useContext, useMemo } from 'react';
import { Play, MoreVertical } from 'lucide-react';
import { useLocation, useNavigate, useOutletContext } from 'react-router-dom';
import { Link } from 'react-router-dom';
import ImageWithFallback from './ImageWithFallback';
import { FavoritesContext } from '../contexts/FavoritesContext';
import { getQuickPicks, getListeningHistory } from '../utils/quickPicksAlgorithm';
import { getAllVibeCards, getVibeSuggestions } from '../utils/vibeMatching';

const DEFAULT_ARTIST_IMAGE = '/artists/default.png';

// CSS to hide scrollbars for specific containers
const hideScrollbarCSS = `
.hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; -webkit-overflow-scrolling: touch; }
.hide-scrollbar::-webkit-scrollbar { display: none; width: 0; height: 0; }
`;

const topArtists = [
    { name: 'KK', imageUrl: '/artists/kk.png' },
    { name: 'Arijit Singh', imageUrl: '/artists/arijit.png' },
    { name: 'Shreya Ghoshal', imageUrl: '/artists/shreya.png' },
    { name: 'Pritam', imageUrl: '/artists/pritam.png' },
    { name: 'Palak Muchhal', imageUrl: '/artists/palak.png' },
    { name: 'A.R. Rahman', imageUrl: '/artists/arrahman.png' },
    { name: 'Lata Mangeshkar', imageUrl: '/artists/lata.png' },
    { name: 'Yo Yo Honey Singh', imageUrl: '/artists/honeysingh.png' },
    { name: 'Talwiinder', imageUrl: '/artists/talwiinder.png' },
    { name: 'Sunidhi Chauhan', imageUrl: '/artists/sunidhichauhan.png' },
    { name: 'Mohit Chauhan', imageUrl: '/artists/mohitchauhan.png' },
    { name: 'Sonu Nigam', imageUrl: '/artists/sonunigam.png' },
    { name: 'Sachin-Jigar', imageUrl: '/artists/sachinjigar.png' },
    { name: 'Neha Kakkar', imageUrl: '/artists/nehakakkar.png' },
    { name: 'Atif Aslam', imageUrl: '/artists/atifaslam.png' },
    { name: 'Udit Narayan', imageUrl: '/artists/uditnarayan.png' },
    { name: 'Vishal-Shekhar', imageUrl: '/artists/vishalshekhar.png' },
    { name: 'Shubh', imageUrl: '/artists/shubh.png' },
    { name: 'Guru Randhawa', imageUrl: '/artists/gururandhawa.png' },
    { name: 'Badshah', imageUrl: '/artists/baadshah.png' },
];

const libraryOptions = [
    { label: 'Energise', target: 'Workout & Gym' },
    { label: 'Romance', target: 'Romance or Date Night' },
    { label: 'Global', target: 'Global' },
    { label: 'Relax', target: 'Relaxing' },
    { label: 'Feel good', target: 'Feel Good' },
    { label: 'Sleep', target: 'Deep Sleep' },
    { label: 'Party', target: 'Party' },
    { label: 'Work out', target: 'Workout & Gym' },
    { label: 'Focus', target: 'Focus & Work' },
];

// Mood categories with keywords for filtering
const moodCategories = [
    { 
        name: 'Punjabi', 
        imageUrl: '/moods/punjabi.jpg', 
        color: 'bg-orange-500', 
        keywords: ['punjabi', 'bhangra', 'gurdas', 'diljit', 'ammy', 'sidhu', 'shubh', 'guru', 'baadshah', 'honey singh']
    },
    { 
        name: 'Traditional', 
        imageUrl: '/moods/traditional.jpg', 
        color: 'bg-green-500', 
        keywords: ['classical', 'traditional', 'lata', 'rafi', 'kishore', 'mukesh', 'carnatic', 'hindustani']
    },
    { 
        name: 'Smooth', 
        imageUrl: '/moods/smooth.jpg', 
        color: 'bg-pink-500', 
        keywords: ['romantic', 'smooth', 'soft', 'melodious', 'arijit', 'atif', 'mohit', 'sonu', 'udit', 'love']
    },
    { 
        name: 'Party', 
        imageUrl: '/moods/party.jpg', 
        color: 'bg-blue-500',
        keywords: ['party', 'dance', 'energetic', 'upbeat', 'club', 'remix', 'electronic', 'bollywood', 'item', 'peppy']
    },
    { 
        name: 'Chill', 
        imageUrl: '/moods/chill.jpg', 
        color: 'bg-blue-500',
        keywords: ['chill', 'relaxing', 'ambient', 'indie', 'acoustic', 'folk', 'peaceful', 'calm', 'mellow', 'soft']
    },
    { 
        name: 'Hip Hop Mix', 
        imageUrl: '/moods/hiphop.jpg', 
        color: 'bg-blue-500',
        keywords: ['hip hop', 'rap', 'trap', 'urban', 'street', 'gangsta', 'freestyle', 'beat', 'rhyme', 'flow']
    },
    { 
        name: 'Romantic', 
        imageUrl: '/moods/romantic.jpg', 
        color: 'bg-rose-500', 
        keywords: ['romantic', 'love', 'couple', 'valentine', 'wedding', 'proposal', 'intimate', 'passionate', 'sweet', 'tender']
    },
    { 
        name: 'Soft & HeartBreak', 
        imageUrl: '/moods/heartbreak.jpg', 
        color: 'bg-purple-500', 
        keywords: ['sad', 'emotional', 'melancholy', 'heartbreak', 'depressing', 'tearful', 'gloomy', 'sorrowful', 'soft', 'gentle']
    },
    { 
        name: 'Old is Gold', 
        imageUrl: '/moods/oldisgold.jpg', 
        color: 'bg-yellow-600', 
        keywords: ['old', 'classic', 'vintage', 'golden', 'evergreen', 'retro', 'timeless', 'nostalgia', 'rafi', 'kishore', 'lata', 'mukesh', 'md', 'raj', 'anand', 'kalyanji']
    },
    { 
        name: 'Hollywood Mix', 
        imageUrl: '/moods/hollywoodmix.jpg', 
        color: 'bg-blue-600',
        keywords: ['hollywood', 'english', 'western', 'pop', 'rock', 'foreign', 'international', 'bollywood english', 'bollywood mix']
    }
    ,{ 
        name: 'Spiritual / Bhakti',
        imageUrl: '/moods/bhakti.jpg',
        color: 'bg-emerald-500',
        keywords: ['bhakti', 'bhajan', 'devotional', 'kirtan', 'spiritual', 'mantra']
    }
];

const TopArtists = () => (
    <div className="mb-5">
        <h3 className="text-2xl font-bold mb-5 mt-2">Popular Artists</h3>
    <div className="grid grid-flow-col auto-cols-[7.5rem] sm:auto-cols-[11rem] gap-5 overflow-x-auto custom-scrollbar-h pb-4">
            {topArtists.map((artist) => (
                <Link to={`/artist/${encodeURIComponent(artist.name)}`} key={artist.name} className="flex flex-col items-center gap-3 cursor-pointer group">
                    <img
                        src={artist.imageUrl}
                        alt={artist.name}
                        className="w-24 h-24 sm:w-40 sm:h-40 rounded-full object-cover shadow-lg transition-transform duration-300"
                        onError={(e) => { e.target.onerror = null; e.target.src='/artists/kk.png'; }}
                    />
                    <div className="text-center">
                        <p className="text-sm sm:text-base font-semibold truncate w-full">{artist.name}</p>
                        <p className="text-xs sm:text-sm text-gray-400 truncate">Artist</p>
                    </div>
                </Link>
            ))}
        </div>
    </div>
);

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

const MatchYourVibe = ({ songs = [] }) => {
    const vibeCards = useMemo(() => getAllVibeCards(), []);

    return (
        <div className="mb-6">
            <h3 className="text-2xl font-bold mb-3">Match your Vibe</h3>
            <div className="grid grid-flow-col auto-cols-[9.25rem] sm:auto-cols-[10.25rem] gap-3 overflow-x-auto custom-scrollbar-h pb-4">
                {vibeCards.map((vibe) => {
                    const totalMatches = getVibeSuggestions(songs, vibe.name, 40).length;
                    return (
                        <Link
                            key={vibe.id}
                            to={`/vibe/${encodeURIComponent(vibe.name)}`}
                            className="group relative cursor-pointer transition-all duration-300 flex flex-col p-3 bg-[#1f1f1f]/50 hover:bg-[#282828]/80"
                        >
                            <div className="relative mb-3">
                                <img
                                    src={vibe.imageUrl}
                                    alt={vibe.name}
                                    className="w-full h-auto aspect-square rounded-md object-cover"
                                    onError={(e) => { e.target.onerror = null; e.target.src='https://placehold.co/400x400/1F2937/FFFFFF?text=' + vibe.name.charAt(0); }}
                                />
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 rounded-md flex items-center justify-center transition-all duration-300">
                                    <div className="w-12 h-12 bg-white/0 group-hover:bg-white/20 rounded-full flex items-center justify-center transition-all duration-300">
                                        <Play size={24} className="text-white fill-current opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                    </div>
                                </div>
                            </div>
                            <div className="flex flex-col justify-start flex-grow">
                                <h4 className="text-sm font-semibold text-white truncate">{vibe.name}</h4>
                                <p className="text-[11px] text-gray-400">{totalMatches} matches</p>
                            </div>
                        </Link>
                    );
                })}
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

// Listen Again section: shows recent history with a fixed 'Start playing' tile then recent songs
const ListenAgainSection = ({ songs = [], onSelectSong, onSearchBarClick }) => {
    const history = getListeningHistory();
    if (!Array.isArray(history) || history.length === 0) return null;

    // Build unique recent song list mapped to current library
    const seen = new Set();
    const recentSongs = [];
    for (const entry of history) {
        const id = String(entry.songId);
        if (seen.has(id)) continue;
        seen.add(id);
        const s = songs.find(x => String(x.id) === id);
        if (s) recentSongs.push(s);
        if (recentSongs.length >= 20) break;
    }

    if (recentSongs.length === 0) return null;

    const firstRow = recentSongs.slice(0, 10);
    const squareRow = recentSongs.slice(0, 8);

    return (
        <div className="mb-2 mt-2">
            <h3 className="text-2xl font-bold mb-3">Listen again</h3>
            <div className="flex items-start gap-4">
                {/* Scrollable rectangular cards - only this part scrolls horizontally (hidden scrollbar) */}
                <div className="flex gap-3 overflow-x-auto pb-1 hide-scrollbar h-40 items-stretch">
                    {firstRow.map((song) => (
                        <div
                            key={song.id}
                            onClick={() => onSelectSong(song.id)}
                            className="flex flex-col justify-between flex-shrink-0 w-40 h-40 bg-[#0f0f0f]/50 rounded-lg cursor-pointer"
                        >
                            <div className="flex flex-col items-center gap-2 h-full">
                                <ImageWithFallback
                                    src={song.coverUrl || song.cover}
                                    fallback={DEFAULT_ARTIST_IMAGE}
                                    alt={song.title}
                                    className="w-full h-20 mt-3 mb-2 rounded-md object-cover"
                                />
                                <div className="w-full min-w-0 text-center">
                                    <h4 className="text-sm font-semibold truncate">{song.title}</h4>
                                    <p className="text-xs text-gray-400 truncate">{Array.isArray(song.artist) ? song.artist[0] : song.artist}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

// Long to Listen: songs longer than 10 minutes (show up to 8)
const LongToListenSection = ({ songs = [], onSelectSong }) => {
    if (!Array.isArray(songs) || songs.length === 0) return null;
    
    // Filter songs longer than 10 minutes (600 seconds)
    // Handle both string "mm:ss" format and numeric seconds
    const longSongs = songs.filter(s => {
        // Try multiple field names for duration
        let dur = s.duration ?? s.durationSeconds ?? s.duration_seconds;
        
        // If still no duration, try to parse from player metadata (if available)
        if (!dur && s.metadata?.duration) {
            dur = s.metadata.duration;
        }
        
        let seconds = 0;
        
        if (typeof dur === 'number') {
            seconds = dur;
        } else if (typeof dur === 'string' && dur.includes(':')) {
            const parts = dur.split(':').map(p => parseInt(p, 10));
            if (parts.length === 3) seconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
            else if (parts.length === 2) seconds = parts[0] * 60 + parts[1];
            else seconds = Number(parts[0]) || 0;
        } else if (dur) {
            seconds = Number(dur) || 0;
        }
        
        // If duration is still 0 or very small, it's likely not set properly
        // So we'll include it in the list with a note that user should play it
        return seconds > 600; // 10 minutes = 600 seconds
    }).slice(0, 8);
    
    if (longSongs.length === 0) {
        return (
            <div className="mb-5">
                <h3 className="text-2xl font-bold mb-3">Long to Listen</h3>
                <div className="flex items-center justify-center h-56 bg-[#1f1f1f]/50 rounded-md p-4 text-gray-400 text-sm">
                    No long songs available yet. Play a longer track to see recommendations here.
                </div>
            </div>
        );
    }
    
    return (
        <div className="mb-3">
            <h3 className="text-2xl font-bold mb-3">Long to Listen</h3>

            {/* Square row of long songs (hidden scrollbar) */}
            <div className="flex gap-3 overflow-x-auto mt-3 hide-scrollbar h-52 items-stretch">
                {longSongs.map(song => {
                    const dur = song.duration ?? song.durationSeconds;
                    return (
                        <div key={song.id} onClick={() => onSelectSong(song.id)} className="flex flex-col justify-between flex-shrink-0 w-40 h-50 bg-[#1f1f1f]/50 rounded-md p-2 cursor-pointer">
                            <ImageWithFallback src={song.coverUrl || song.cover} fallback={DEFAULT_ARTIST_IMAGE} alt={song.title} className="w-full h-30 rounded-md object-cover" />
                            <div className="min-w-0">
                                <h5 className="text-sm font-semibold truncate">{song.title}</h5>
                                <div className="flex items-start justify-between gap-1 mt-1">
                                    <p className="text-[12px] text-gray-400 truncate">{Array.isArray(song.artist) ? song.artist[0] : song.artist}</p>
                                    <p className="text-[12px] text-gray-400 truncate">{formatSecondsToDuration(dur)}</p>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export const LibraryOptions = () => (
    <nav aria-label="Explore categories" className="flex w-max min-w-full justify-center gap-2 items-center overflow-x-auto hide-scrollbar no-scrollbar">
        {libraryOptions.map((option) => (
            <LibraryOptionLink key={option.label} option={option} />
        ))}
    </nav>
);

const LibraryOptionLink = ({ option }) => {
    const location = useLocation();
    const active = location.pathname === `/library/${encodeURIComponent(option.label)}`;

    return (
        <Link
            to={`/library/${encodeURIComponent(option.label)}`}
            aria-current={active ? 'page' : undefined}
            className={`shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium text-white transition-colors focus:outline-none focus:bg-slate-100 focus:text-black ${active ? 'bg-[#5f5f5f]' : 'bg-[#1f1f1f]/80 hover:bg-[#282828]'}`}
        >
            {option.label}
        </Link>
    );
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
                                <p className="text-xs text-gray-400 truncate max-w-[full]">{Array.isArray(song.artist) ? song.artist[0] : (song.artist || '')}</p>
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


const SongLibrary = ({ songs, onSelectSong, currentSongId, isPlaying, onAddToQueue = () => {} }) => {
    // get handlers from outlet context (App provides playlist/report/artist handlers)
    const outlet = useOutletContext() || {};
    const handlers = {
        onAddToQueue: onAddToQueue || outlet.onAddToQueue,
        onAddToPlaylist: outlet.onAddToPlaylist,
        onShowArtist: outlet.onShowArtist,
        onReportSong: outlet.onReportSong,
        onSearchBarClick: outlet.onSearchBarClick,
    };

    // Manage one open menu at a time using openMenuId at parent scope
    const [openMenuId, setOpenMenuId] = useState(null);

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
        <div>
            <style>{hideScrollbarCSS}</style>
            {/* Mobile layout: Listen Again -> Quick Picks -> Most Popular -> Popular Artists -> Your Mood -> Long to Listen */}
            <div className="md:hidden">
                <QuickPicksSection songs={songs} currentSongId={currentSongId} isPlaying={isPlaying} onSelectSong={onSelectSong} openMenuId={openMenuId} setOpenMenuId={setOpenMenuId} handlers={handlers} />
                <ListenAgainSection songs={songs} onSelectSong={onSelectSong} onSearchBarClick={handlers.onSearchBarClick} />

                <h3 className="text-2xl font-bold mb-3 mt-2">Most Popular</h3>
                {songs.length === 0 ? (
                    <div className="text-center text-gray-400 mt-10">
                        <p>Song not found.</p>
                    </div>
                ) : (
                    <div className="grid grid-rows-5 grid-flow-col auto-cols-[18rem] gap-1.5 overflow-x-auto overflow-y-hidden pb-2">
                        {songs.slice(0, 25).map((song) => {
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
                    <TopArtists />
                </div>
                <div className="mt-4">
                    <MatchYourVibe songs={songs} />
                </div>
                <div className="mt-4">
                    <YourMood />
                </div>
                <div className="mt-6">
                    <LongToListenSection songs={songs} onSelectSong={onSelectSong} />
                </div>
            </div>

            {/* Desktop layout: Listen Again -> Popular Artists -> Quick Picks -> Most Popular -> Your Mood */}
            <div className="hidden ml-20 md:block">
                <ListenAgainSection songs={songs} onSelectSong={onSelectSong} onSearchBarClick={handlers.onSearchBarClick} />
                <TopArtists />
                <QuickPicksSection songs={songs} currentSongId={currentSongId} isPlaying={isPlaying} onSelectSong={onSelectSong} openMenuId={openMenuId} setOpenMenuId={setOpenMenuId} handlers={handlers} />

                <div className="mt-3">
                    <h3 className="text-2xl font-bold mb-5">Most Popular</h3>
                    {songs.length === 0 ? (
                        <div className="text-center text-gray-400 mt-10">
                            <p>Song not found.</p>
                        </div>
                    ) : (
                        <div className="grid grid-rows-2 grid-flow-col auto-cols-[9rem] sm:auto-cols-[9rem] gap-2 overflow-x-auto custom-scrollbar-h pb-4">
                            {songs.map((song) => {
                                const { isSongFavorite, toggleSongFavorite } = useContext(FavoritesContext);
                                const fav = isSongFavorite(song.id);
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
                    <MatchYourVibe songs={songs} />
                </div>
                <div className="mt-6">
                    <YourMood />
                </div>
                <div className="mt-6">
                    <LongToListenSection songs={songs} onSelectSong={onSelectSong} />
                </div>
            </div>
        </div>
    );
};

export default SongLibrary;