import React, { useState, useRef, useEffect, useContext, useMemo } from 'react';
import { ArrowLeft, Play, MoreVertical } from 'lucide-react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { Link } from 'react-router-dom';
import ImageWithFallback from '../components/ImageWithFallback';
import { FavoritesContext } from '../contexts/FavoritesContext';
import { getQuickPicks, getListeningHistory } from '../utils/quickPicksAlgorithm';
import { getAllVibeCards, getVibeSuggestions } from '../utils/vibeMatching';


const DEFAULT_ARTIST_IMAGE = '/artists/default.png';

// CSS to hide scrollbars for specific containers
const hideScrollbarCSS = `
.hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; -webkit-overflow-scrolling: touch; }
.hide-scrollbar::-webkit-scrollbar { display: none; width: 0; height: 0; }
`;


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

// Last Played: show the latest 24 unique songs in four rows of horizontal bars.
const ListenAgainSection = ({ songs = [], onSelectSong, renderSongMenu }) => {
    const history = getListeningHistory();
    if (!Array.isArray(history) || history.length === 0) return null;

    const seen = new Set();
    const recentSongs = [];
    for (const entry of history) {
        const id = String(entry.songId || entry.id || '');
        if (!id || seen.has(id)) continue;
        seen.add(id);
        const song = songs.find(item => String(item.id) === id);
        if (song) recentSongs.push(song);
        if (recentSongs.length === 24) break;
    }

    if (recentSongs.length === 0) return null;

    return (
        <section className="mb-8 mt-2">
            <h3 className="text-2xl font-semibold mb-3">Last played</h3>
            <div className="grid grid-flow-col grid-rows-4 auto-cols-[minmax(20rem,1fr)] gap-2 overflow-x-auto hide-scrollbar pb-1 mr-3">
                {recentSongs.map((song) => (
                    <div
                        role="button"
                        tabIndex={0}
                        key={song.id}
                        onClick={() => onSelectSong && onSelectSong(song.id)}
                        onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') onSelectSong && onSelectSong(song.id); }}
                        className="flex items-center gap-3 min-w-0 h-12 px-1 text-left bg-[#212121] hover:bg-[#282828] rounded cursor-pointer"
                    >
                        <ImageWithFallback
                            src={song.coverUrl || song.cover}
                            fallback={DEFAULT_ARTIST_IMAGE}
                            alt={song.title}
                            className="w-10 h-10 rounded object-cover flex-shrink-0"
                        />
                        <span className="min-w-0 flex-1">
                            <span className="block text-sm font-semibold text-white truncate">{song.title}</span>
                            <span className="block text-xs text-gray-400 truncate">{Array.isArray(song.artist) ? song.artist[0] : song.artist}</span>
                        </span>
                        <span className="text-xs text-gray-400 flex-shrink-0">
                            {formatSecondsToDuration(song.duration ?? song.durationSeconds ?? song.duration_seconds ?? song.metadata?.duration)}
                        </span>
                        <Play size={15} className="text-gray-300 flex-shrink-0" />
                        {renderSongMenu && renderSongMenu(song)}
                    </div>
                ))}
            </div>
        </section>
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
            <div className="mb-10">
                <h3 className="text-2xl font-semibold mb-3">Listen Continously</h3>
                <div className="flex items-center justify-center h-56 bg-[#1f1f1f]/50 rounded-md p-4 text-gray-400 text-sm">
                    No long songs available yet. Play a longer track to see recommendations here.
                </div>
            </div>
        );
    }
    
    return (
        <div className="mb-10">
            <h3 className="text-2xl font-semibold mb-3">Listen Continously</h3>

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


const RecentsPage = ({ songs, onSelectSong, currentSongId, isPlaying, onAddToQueue = () => {} }) => {
    // get handlers from outlet context (App provides playlist/report/artist handlers)
    const outlet = useOutletContext() || {};
    const navigate = useNavigate();
    const librarySongs = Array.isArray(songs) && songs.length > 0 ? songs : (outlet.allSongs || []);
    const selectSong = onSelectSong || outlet.onSelectSong;
    const activeSongId = currentSongId || outlet.currentSongId;
    const playing = isPlaying ?? outlet.isPlaying;
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
                <button
                    type="button"
                    ref={buttonRef}
                    aria-label="Open song menu"
                    onClick={(event) => { event.stopPropagation(); setOpenMenuId(prev => prev === song.id ? null : song.id); }}
                    className="p-1 text-gray-300 hover:text-white flex-shrink-0"
                >
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
        <div className="h-full min-h-0 overflow-y-auto custom-scrollbar">
            <style>{hideScrollbarCSS}</style>
            {/* Mobile layout: Listen Again -> Quick Picks -> Most Popular -> Popular Artists -> Your Mood -> Long to Listen */}
            <div className="md:hidden ml-3">
                <ListenAgainSection songs={librarySongs} onSelectSong={selectSong} renderSongMenu={(song) => <SongMenu song={song} />} />
                <div className="mt-6">
                    <LongToListenSection songs={librarySongs} onSelectSong={selectSong} />
                </div>
            </div>

            {/* Desktop layout: Listen Again -> Popular Artists -> Quick Picks -> Most Popular -> Your Mood */}
            <div className="hidden ml-20 md:block">
                <br />
                <br />
                <br />
                <ListenAgainSection songs={librarySongs} onSelectSong={selectSong} renderSongMenu={(song) => <SongMenu song={song} />} />
                <div className="mt-6">
                    <LongToListenSection songs={librarySongs} onSelectSong={selectSong} />
                </div>
            </div>
        </div>
    );
};

export default RecentsPage;