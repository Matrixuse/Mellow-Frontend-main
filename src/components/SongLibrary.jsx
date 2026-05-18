import React, { useState, useRef, useEffect, useContext, useMemo } from 'react';
import { Play, MoreVertical } from 'lucide-react';
import { useOutletContext } from 'react-router-dom';
import { Link } from 'react-router-dom';
import ImageWithFallback from './ImageWithFallback';
import { FavoritesContext } from '../contexts/FavoritesContext';
import { getQuickPicks } from '../utils/quickPicksAlgorithm';

const DEFAULT_ARTIST_IMAGE = '/artists/kk.png';

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
        keywords: ['classical', 'traditional', 'lata', 'rafi', 'kishore', 'mukesh', 'bhajan', 'devotional', 'carnatic', 'hindustani']
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
        color: 'bg-red-500', 
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
        color: 'bg-indigo-500', 
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
        color: 'bg-red-600', 
        keywords: ['hollywood', 'english', 'western', 'pop', 'rock', 'foreign', 'international', 'bollywood english', 'bollywood mix']
    }
];

const TopArtists = () => (
    <div className="mb-5">
        <h3 className="text-l font-semibold mb-2 mt-2">Top Artists</h3>
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
            <h3 className="text-l font-semibold mb-2">Your Mood</h3>
            
            {/* Mood Cards - Single Row with Images */}
            <div className="grid grid-flow-col auto-cols-[9.25rem] sm:auto-cols-[10.25rem] gap-3 overflow-x-auto custom-scrollbar-h pb-4">
                {moodCategories.map((mood) => (
                    <Link 
                        key={mood.name} 
                        to={`/mood/${encodeURIComponent(mood.name)}`}
                        className="group relative rounded-lg cursor-pointer transition-all duration-300 flex flex-col p-3 bg-gray-800/50 hover:bg-gray-700/80"
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

// Quick Picks Component - Smart recommendations based on listening history
const QuickPicksSection = ({ songs, currentSongId, isPlaying, onSelectSong, openMenuId, setOpenMenuId, handlers }) => {
    const quickPickSongs = useMemo(() => {
        return getQuickPicks(songs, 24);
    }, [songs]);

    if (!quickPickSongs || quickPickSongs.length === 0) {
        return null;
    }

    const QuickPickMenu = ({ song }) => {
        const ref = useRef(null);
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

        const isOpen = openMenuId === `quickpick-${song.id}`;
        const fav = isSongFavorite(song.id);

        return (
            <div ref={ref} className="relative inline-block">
                <button aria-label="Open song menu" onClick={(e) => { e.stopPropagation(); setOpenMenuId(prev => prev === `quickpick-${song.id}` ? null : `quickpick-${song.id}`); }} className="p-1 rounded-full bg-transparent hover:bg-transparent focus:outline-none focus:ring-0 active:bg-transparent text-white">
                    <MoreVertical size={14} />
                </button>
                {isOpen && (
                    <div className="absolute right-0 top-full mt-2 w-40 max-w-xs bg-gray-800 border border-gray-700 rounded-md shadow-lg text-left py-0.5 z-50">
                        <button onClick={(e) => { e.stopPropagation(); setOpenMenuId(null); handlers.onAddToQueue && handlers.onAddToQueue(song, 'end'); }} className="w-full text-left px-3 py-2 hover:bg-[#121a20] text-gray-100 text-xs">Add to Queue</button>
                        <button onClick={(e) => { e.stopPropagation(); setOpenMenuId(null); handlers.onAddToPlaylist && handlers.onAddToPlaylist(song.id); }} className="w-full text-left px-3 py-2 hover:bg-[#121a20] text-gray-100 text-xs">Add to Playlist</button>
                        <button onClick={(e) => { e.stopPropagation(); setOpenMenuId(null); toggleSongFavorite(song.id).catch(() => {}); }} className="w-full text-left px-3 py-2 hover:bg-[#121a20] text-gray-100 text-xs">{fav ? 'Remove Favourite' : 'Add Favourite'}</button>
                        <button onClick={(e) => { e.stopPropagation(); setOpenMenuId(null); handlers.onShowArtist && handlers.onShowArtist(Array.isArray(song.artist) ? song.artist.join(', ') : (song.artist || '')); }} className="w-full text-left px-3 py-2 hover:bg-[#121a20] text-gray-100 text-xs">Artist</button>
                        <button onClick={(e) => { e.stopPropagation(); setOpenMenuId(null); handlers.onReportSong && handlers.onReportSong(song.id); }} className="w-full text-left px-3 py-2 text-rose-400 hover:bg-[#121a20] text-xs">Report</button>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="mb-5">
            <h3 className="text-l font-semibold mb-3">Quick Picks</h3>
            
            {/* Mobile view: 3 columns x 3 rows, left-right scrolling */}
            <div className="md:hidden grid grid-flow-col auto-cols-[6rem] grid-rows-3 gap-1 overflow-x-auto custom-scrollbar-h pb-3">
                {quickPickSongs.map((song) => {
                    const isActive = currentSongId === song.id && isPlaying;
                    return (
                        <div 
                            key={song.id} 
                            onClick={() => onSelectSong(song.id)}
                            className={`group relative mt-0.5 ml-0.5 mr-0.5 rounded-lg cursor-pointer transition-all duration-300 overflow-hidden ${isActive ? 'ring-2 ring-blue-400' : ''}`}
                        >
                            <ImageWithFallback
                                src={song.coverUrl}
                                fallback={DEFAULT_ARTIST_IMAGE}
                                alt={song.title}
                                className="w-full h-auto aspect-square rounded-lg object-cover"
                            />
                            {/* Title overlay on mobile */}
                            <div className="absolute inset-0 flex items-end justify-start bg-gradient-to-t from-black/80 to-transparent p-2 rounded-lg">
                                <h4 className={`text-xs font-semibold truncate line-clamp-2 ${isActive ? 'text-blue-300' : 'text-white'}`}>{song.title}</h4>
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
            <div className="hidden md:grid grid-flow-col auto-cols-[20rem] grid-rows-4 gap-1 overflow-x-auto custom-scrollbar-h pb-2">
                {quickPickSongs.map((song) => {
                    const isActive = currentSongId === song.id && isPlaying;
                    return (
                        <div 
                            key={song.id} 
                            onClick={() => onSelectSong(song.id)}
                            className={`group relative p-1.5 rounded-lg cursor-pointer transition-all duration-300 flex items-center gap-2 ${isActive ? 'bg-blue-900/40' : 'bg-gray-800/50 hover:bg-gray-700/80'}`}
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
                                <h4 className={`text-xs font-semibold truncate ${isActive ? 'text-blue-300' : 'text-white'}`}>{song.title}</h4>
                                <p className="text-xs text-gray-400 truncate max-w-[full]">{Array.isArray(song.artist) ? song.artist[0] : (song.artist || '')}</p>
                            </div>
                            <div className="flex-shrink-0 flex items-center gap-1">
                                {/* <div className={`w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center shadow-lg transform transition-all duration-300 ${isActive ? 'opacity-100 translate-y-0' : 'opacity-0 group-hover:opacity-100'}`}>
                                    <Play size={12} className="text-white fill-current" />
                                </div> */}
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
    };

    // Manage one open menu at a time using openMenuId at parent scope
    const [openMenuId, setOpenMenuId] = useState(null);

    const SongMenu = ({ song, className }) => {
        const ref = useRef(null);
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

        const isOpen = openMenuId === song.id;
        const fav = isSongFavorite(song.id);

        return (
            <div ref={ref} className={`relative inline-block ${className || ''}`}>
                <button aria-label="Open song menu" onClick={(e) => { e.stopPropagation(); setOpenMenuId(prev => prev === song.id ? null : song.id); }} className="p-2 rounded-full bg-transparent hover:bg-transparent focus:outline-none focus:ring-0 active:bg-transparent text-white">
                    <MoreVertical size={16} />
                </button>
                {isOpen && (
                    // narrower dropdown and tighter padding
                    <div className="absolute right-0 top-full mt-2 w-40 max-w-xs bg-gray-800 border border-gray-700 rounded-md shadow-lg text-left py-0.5 z-50">
                        <button onClick={(e) => { e.stopPropagation(); setOpenMenuId(null); handlers.onAddToQueue && handlers.onAddToQueue(song, 'end'); }} className="w-full text-left px-3 py-2 hover:bg-[#121a20] text-gray-100">Add to Queue</button>
                        <button onClick={(e) => { e.stopPropagation(); setOpenMenuId(null); handlers.onAddToPlaylist && handlers.onAddToPlaylist(song.id); }} className="w-full text-left px-3 py-2 hover:bg-[#121a20] text-gray-100">Add to Playlist</button>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setOpenMenuId(null);
                                toggleSongFavorite(song.id).catch(() => {});
                            }}
                            className="w-full text-left px-3 py-2 hover:bg-[#121a20] text-gray-100"
                        >
                            {fav ? 'Remove Favourite' : 'Add Favourite'}
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); setOpenMenuId(null); handlers.onShowArtist && handlers.onShowArtist(Array.isArray(song.artist) ? song.artist.join(', ') : (song.artist || '')); }} className="w-full text-left px-3 py-2 hover:bg-[#121a20] text-gray-100">Artist</button>
                        <button onClick={(e) => { e.stopPropagation(); setOpenMenuId(null); handlers.onReportSong && handlers.onReportSong(song.id); }} className="w-full text-left px-3 py-2 text-rose-400 hover:bg-[#121a20]">Report</button>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div>
            {/* Mobile order: Recently Uploaded then Top Artists */}
            <div className="md:hidden">
                {/* Quick Picks Section - Mobile */}
                <QuickPicksSection songs={songs} currentSongId={currentSongId} isPlaying={isPlaying} onSelectSong={onSelectSong} openMenuId={openMenuId} setOpenMenuId={setOpenMenuId} handlers={handlers} />
                
                <h3 className="text-l font-semibold mb-2 mt-2">Most Popular</h3>
                {songs.length === 0 ? (
                    <div className="text-center text-gray-400 mt-10">
                        <p>Song not found.</p>
                    </div>
                ) : (
                    <>
                        {/* Mobile: horizontal bars list limited to 5 items */}
                        <div className="md:hidden space-y-2.5">
                            {songs.slice(0, 4).map((song) => {
                                        const isActive = currentSongId === song.id && isPlaying;
                                        return (
                                        <div key={song.id} className={`w-full flex items-center gap-2 p-1 rounded-md transition ${isActive ? 'bg-blue-900/30' : 'bg-gray-800/60 hover:bg-gray-700/80'}`}>
                                            <button onClick={() => onSelectSong(song.id)} className="flex items-center gap-2 flex-1 text-left min-w-0">
                                                <ImageWithFallback
                                                    src={song.coverUrl}
                                                    fallback={DEFAULT_ARTIST_IMAGE}
                                                    alt={song.title}
                                                    className="w-8 h-8 rounded-md object-cover flex-shrink-0"
                                                />
                                                <div className="flex-1 text-left min-w-0">
                                                    <div className={`text-sm font-semibold truncate ${isActive ? 'text-blue-300' : 'text-white'}`}>{song.title}</div>
                                                    <div className="text-xs text-gray-400 truncate">{Array.isArray(song.artist) ? song.artist.join(', ') : (song.artist || '')}</div>
                                                </div>
                                            </button>
                                            {isActive && (
                                                <Play className="text-blue-400" size={16} />
                                            )}
                                            <SongMenu song={song} className="ml-2" />
                                        </div>
                                    );
                            })}
                        </div>
                        {/* Desktop/tablet: horizontal card scroller with 4 rows, 2 columns left-right scroll */}
                        <div className="hidden md:grid grid-rows-4 grid-flow-col auto-cols-[6rem] sm:auto-cols-[6rem] gap-3 overflow-x-auto custom-scrollbar-h pb-4">
                            {songs.slice(0, 8).map((song) => {
                                const isActive = currentSongId === song.id && isPlaying;
                                const { isSongFavorite, toggleSongFavorite } = useContext(FavoritesContext);
                                const fav = isSongFavorite(song.id);
                                return (
                                    <div 
                                        key={song.id} 
                                        onClick={() => onSelectSong(song.id)}
                                        className={`group relative p-4 rounded-lg cursor-pointer transition-all duration-300 flex flex-col ${isActive ? 'bg-blue-900/30' : 'bg-gray-800/50 hover:bg-gray-700/80'}`}
                                    >
                                        <div className="relative mb-3">
                                            <ImageWithFallback
                                                src={song.coverUrl}
                                                fallback={DEFAULT_ARTIST_IMAGE}
                                                alt={song.title}
                                                className="w-full h-auto aspect-square rounded-md object-cover"
                                            />
                                            <div className={`absolute bottom-2 right-14 w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center shadow-lg transform transition-all duration-300 ${isActive ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0'}`}>
                                                <Play size={24} className="text-white fill-current" />
                                            </div>
                                        </div>
                                        {/* Card content row: title/artist on left, three-dots menu aligned to the right corner of the title area */}
                                        <div className="flex items-center justify-between mt-2">
                                            <div className="flex-1 min-w-0">
                                                <h4 className={`text-sm font-semibold truncate ${isActive ? 'text-blue-300' : 'text-white'}`}>{song.title}</h4>
                                                <p className="text-xs text-gray-400 truncate">{Array.isArray(song.artist) ? song.artist.join(', ') : (song.artist || '')}</p>
                                            </div>
                                            <div className="ml-3 flex-shrink-0">
                                                <SongMenu song={song} onAddToQueue={handlers.onAddToQueue} onAddToPlaylist={handlers.onAddToPlaylist} onReport={handlers.onReportSong} />
                                            </div>
                                        </div>
                                        {/* Keep mobile ThreeDots inside card for mobile layout */}
                                        <div className="md:hidden mt-2">
                                            <SongMenu song={song} />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </>
                )}
                {/* Top Artists visible on mobile below Recently Uploaded */}
                <div className="mt-6">
                    <TopArtists />
                </div>
                
                {/* Your Mood section on mobile - below Recently Uploaded */}
                <div className="mt-6">
                    <YourMood />
                </div>
            </div>
            {/* Desktop/Tablet order: Top Artists, Recently Uploaded, then Your Mood */}
            <div className="hidden md:block">
                <TopArtists />
                
                {/* Quick Picks Section - Desktop */}
                <QuickPicksSection songs={songs} currentSongId={currentSongId} isPlaying={isPlaying} onSelectSong={onSelectSong} openMenuId={openMenuId} setOpenMenuId={setOpenMenuId} handlers={handlers} />
                
                <div className="mt-3">
                    <h3 className="text-xl font-semibold mb-2">Most Popular</h3>
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
                                    className="group relative bg-gray-800/50 hover:bg-gray-700/80 p-2 rounded-lg cursor-pointer transition-all duration-300 flex flex-col"
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
                                    {/* Card content row: title/artist on left, three-dots menu outside on right (desktop) */}
                                    <div className="flex items-center justify-between mt-2">
                                        <div className="flex-1 min-w-0 ml-1">
                                            <h4 className="text-sm font-semibold text-white truncate">{song.title}</h4>
                                            <p className="text-xs text-gray-400 truncate">{Array.isArray(song.artist) ? song.artist.join(', ') : (song.artist || '')}</p>
                                        </div>
                                        <div className="hidden md:block flex-shrink-0">
                                            {/* Place SongMenu inside the card to the right of the song title on desktop */}
                                            <SongMenu song={song} />
                                        </div>
                                    </div>
                                    {/* Keep mobile ThreeDots inside card for mobile layout */}
                                    <div className="md:hidden mt-2">
                                        <SongMenu song={song} />
                                    </div>
                                </div>
                            );
                            })}
                        </div>
                    )}
                </div>
                
                {/* Your Mood section on desktop - below Recently Uploaded */}
                <div className="mt-6">
                    <YourMood />
                </div>
            </div>
        </div>
    );
};

export default SongLibrary;





