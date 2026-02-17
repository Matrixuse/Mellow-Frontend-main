import React, { useState, useRef, useEffect } from 'react';
import { Play, MoreVertical } from 'lucide-react';
import { useOutletContext } from 'react-router-dom';
import { Link } from 'react-router-dom';
import ImageWithFallback from './ImageWithFallback';

const topArtists = [
    { name: 'KK', imageUrl: '/artists/KK.png' },
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
    }
];

const TopArtists = () => (
    <div className="mb-8">
        <h3 className="text-xl font-bold mb-4">Top Artists</h3>
    <div className="grid grid-flow-col auto-cols-[7.5rem] sm:auto-cols-[11rem] gap-5 overflow-x-auto custom-scrollbar-h pb-4">
            {topArtists.map((artist) => (
                <Link to={`/artist/${encodeURIComponent(artist.name)}`} key={artist.name} className="flex flex-col items-center gap-3 cursor-pointer group">
                    <img
                        src={artist.imageUrl}
                        alt={artist.name}
                        className="w-24 h-24 sm:w-40 sm:h-40 rounded-full object-cover shadow-lg transition-transform duration-300"
                        onError={(e) => { e.target.onerror = null; e.target.src=`https://placehold.co/200x200/4A5568/FFFFFF?text=${artist.name.charAt(0)}`; }}
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
            <h3 className="text-xl font-bold mb-4">Your Mood</h3>
            
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
                <h3 className="text-xl font-bold mb-4">Most Popular</h3>
                {songs.length === 0 ? (
                    <div className="text-center text-gray-400 mt-10">
                        <p>Song not found.</p>
                    </div>
                ) : (
                    <>
                        {/* Mobile: horizontal bars list limited to 5 items */}
                        <div className="md:hidden space-y-2.5">
                            {songs.slice(0, 5).map((song) => {
                                        const isActive = currentSongId === song.id && isPlaying;
                                        return (
                                        <div key={song.id} className={`w-full flex items-center gap-2 p-1 rounded-md transition ${isActive ? 'bg-blue-900/30' : 'bg-gray-800/60 hover:bg-gray-700/80'}`}>
                                            <button onClick={() => onSelectSong(song.id)} className="flex items-center gap-2 flex-1 text-left">
                                                <ImageWithFallback src={song.coverUrl} alt={song.title} className={`w-8 h-8 rounded-md object-cover ${isActive ? 'ring-2 ring-blue-500' : ''}`} fallback={'https://placehold.co/200x200/1F2937/FFFFFF?text=Music'} />
                                                <div className="flex-1 text-left">
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
                        {/* Desktop/tablet: horizontal card scroller with menu aligned to the right of the title */}
                        <div className="hidden md:grid grid-rows-2 grid-flow-col auto-cols-[9rem] sm:auto-cols-[10rem] gap-3 overflow-x-auto custom-scrollbar-h pb-4">
                            {songs.map((song) => {
                                const isActive = currentSongId === song.id && isPlaying;
                                return (
                                    <div 
                                        key={song.id} 
                                        onClick={() => onSelectSong(song.id)}
                                        className={`group relative p-4 rounded-lg cursor-pointer transition-all duration-300 flex flex-col ${isActive ? 'bg-blue-900/30' : 'bg-gray-800/50 hover:bg-gray-700/80'}`}
                                    >
                                        <div className="relative mb-3">
                                            <ImageWithFallback src={song.coverUrl} alt={song.title} className="w-full h-auto aspect-square rounded-md object-cover" fallback={'https://placehold.co/400x400/1F2937/FFFFFF?text=Music'} />
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
                
                <div className="mt-6">
                    <h3 className="text-xl font-bold mb-4">Most Popular</h3>
                    {songs.length === 0 ? (
                        <div className="text-center text-gray-400 mt-10">
                            <p>Song not found.</p>
                        </div>
                    ) : (
                        <div className="grid grid-rows-2 grid-flow-col auto-cols-[9rem] sm:auto-cols-[10rem] gap-3 overflow-x-auto custom-scrollbar-h pb-4">
                            {songs.map((song) => (
                                <div 
                                    key={song.id} 
                                    onClick={() => onSelectSong(song.id)}
                                    className="group relative bg-gray-800/50 hover:bg-gray-700/80 p-4 rounded-lg cursor-pointer transition-all duration-300 flex flex-col"
                                >
                                    <div className="relative mb-3">
                                        <ImageWithFallback src={song.coverUrl} alt={song.title} className="w-full h-auto aspect-square rounded-md object-cover" fallback={'https://placehold.co/400x400/1F2937/FFFFFF?text=Music'} />
                                        <div className={`absolute bottom-2 right-14 w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center shadow-lg transform transition-all duration-300 ${currentSongId === song.id && isPlaying ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0'}`}>
                                            <Play size={24} className="text-white fill-current" />
                                        </div>
                                    </div>
                                    {/* Card content row: title/artist on left, three-dots menu outside on right (desktop) */}
                                    <div className="flex items-center justify-between mt-2">
                                        <div className="flex-1 min-w-0">
                                            <h4 className="text-sm font-semibold text-white truncate">{song.title}</h4>
                                            <p className="text-xs text-gray-400 truncate">{Array.isArray(song.artist) ? song.artist.join(', ') : (song.artist || '')}</p>
                                        </div>
                                        <div className="hidden md:block ml-3 flex-shrink-0">
                                            {/* Place SongMenu inside the card to the right of the song title on desktop */}
                                            <SongMenu song={song} />
                                        </div>
                                    </div>
                                    {/* Keep mobile ThreeDots inside card for mobile layout */}
                                    <div className="md:hidden mt-2">
                                        <SongMenu song={song} />
                                    </div>
                                </div>
                            ))}
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





