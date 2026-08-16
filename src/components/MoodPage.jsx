import React, { useCallback, useState, useRef, useEffect } from 'react';
import { useParams, Link, useOutletContext, useNavigate } from 'react-router-dom';
import { ArrowLeft, Play, Shuffle, Search, X, MoreVertical, Bookmark, Plus } from 'lucide-react';
import ImageWithFallback from './ImageWithFallback';
import SongContextMenu from './SongContextMenu';
import { Footer } from './OtherComponents';
import { getPlaylists, createPlaylist, addSongToPlaylist, deletePlaylist } from '../api/playlistService';
import { detectSongMood } from '../utils/moodDetection';

const MoodPage = () => {
    const navigate = useNavigate();
    const outlet = useOutletContext() || {};
    const { 
        allSongs, 
        onSelectSong, 
        currentSongId, 
        isPlaying,
        setIsUsingMoodQueue,
        setMoodQueue,
        setMoodQueueIndex,
        onAddToQueue,
        onAddToPlaylist,
        isMoodShuffleMode,
        setIsMoodShuffleMode
    } = outlet;
    const { moodName: encodedMoodName } = useParams();
    const moodName = decodeURIComponent(encodedMoodName);
    const [searchOpen, setSearchOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const searchInputRef = useRef(null);
    const scrollContainerRef = useRef(null);
    const [isHeaderExpanded, setIsHeaderExpanded] = useState(true);
    const [moodMenuOpen, setMoodMenuOpen] = useState(false);
    const [isSaved, setIsSaved] = useState(false);
    
    if (!allSongs) {
        return <div className="text-center p-10">Loading mood songs...</div>;
    }

    const getMoodSongs = (mood) => {
        if (!mood) return allSongs || [];
        const normalizedMood = (mood || '').toLowerCase();
        
        return (allSongs || []).filter(song => {
            if (song.moods && Array.isArray(song.moods) && song.moods.length > 0) {
                const lowerMoods = song.moods.map(m => String(m || '').toLowerCase());
                if (lowerMoods.includes(normalizedMood)) return true;
            }
            
            // Use AI mood detection for Old is Gold and Hollywood Mix
            const detectedMoods = detectSongMood(song);
            if (detectedMoods.map(m => m.toLowerCase()).includes(normalizedMood)) {
                return true;
            }
            
            const title = (song.title || '').toLowerCase();
            const artistField = song?.artist;
            const artistString = Array.isArray(artistField)
                ? artistField.join(', ').toLowerCase()
                : (artistField || '').toLowerCase();
            
            const moodKeywords = {
                'Punjabi': ['punjabi', 'bhangra', 'gurdas', 'diljit', 'ammy', 'sidhu', 'shubh', 'guru', 'baadshah', 'honey singh'],
                'Traditional': ['classical', 'traditional', 'lata', 'rafi', 'kishore', 'mukesh', 'carnatic', 'hindustani'],
                'Smooth': ['romantic', 'smooth', 'soft', 'melodious', 'arijit', 'atif', 'mohit', 'sonu', 'udit', 'love'],
                'Party': ['party', 'dance', 'energetic', 'upbeat', 'club', 'remix', 'electronic', 'bollywood', 'item', 'peppy'],
                'Chill': ['chill', 'relaxing', 'ambient', 'indie', 'acoustic', 'folk', 'peaceful', 'calm', 'mellow', 'soft'],
                'Hip Hop Mix': ['hip hop', 'rap', 'trap', 'urban', 'street', 'gangsta', 'freestyle', 'beat', 'rhyme', 'flow'],
                'Romantic': ['romantic', 'love', 'couple', 'valentine', 'wedding', 'proposal', 'intimate', 'passionate', 'sweet', 'tender'],
                'Soft & HeartBreak': ['sad', 'emotional', 'melancholy', 'heartbreak', 'depressing', 'tearful', 'gloomy', 'sorrowful', 'soft', 'gentle'],
                'Old is Gold': ['old', 'classic', 'vintage', 'golden', 'evergreen', 'retro', 'timeless', 'nostalgia', 'rafi', 'kishore', 'lata', 'mukesh', 'md', 'raj', 'anand', 'kalyanji'],
                'Hollywood Mix': ['hollywood', 'english', 'western', 'pop', 'rock', 'foreign', 'international', 'bollywood english', 'bollywood mix'], 
                'Spiritual / Bhakti': ['bhakti', 'bhajan', 'devotional', 'kirtan', 'spiritual', 'mantra']
            };
            
            const keywords = moodKeywords[mood] || moodKeywords[Object.keys(moodKeywords).find(k => k.toLowerCase() === normalizedMood)] || [];
            return keywords.some(keyword => 
                title.includes(keyword.toLowerCase()) || 
                artistString.includes(keyword.toLowerCase())
            );
        });
    };

    const moodSongs = getMoodSongs(moodName);

    // Filter songs by local search term when search is open
    const filteredSongs = (searchTerm && searchTerm.trim().length > 0)
        ? moodSongs.filter(song => {
            const q = searchTerm.toLowerCase();
            const title = (song.title || '').toLowerCase();
            const artistField = song?.artist;
            const artistString = Array.isArray(artistField) ? artistField.join(', ').toLowerCase() : (artistField || '').toLowerCase();
            return title.includes(q) || artistString.includes(q);
        })
        : moodSongs;

    const handleSelectSong = useCallback((songId) => {
        const selectedSongInMood = moodSongs.find(s => String(s.id) === String(songId));
        const selectedIndex = moodSongs.findIndex(s => String(s.id) === String(songId));
        
        try {
            // eslint-disable-next-line no-console
            console.debug('🎵 MOOD PAGE: User clicked to play song', {
                songId,
                moodName,
                selectedIndex,
                moodSongsCount: moodSongs.length,
                selectedSongTitle: selectedSongInMood ? selectedSongInMood.title : 'NOT FOUND',
                isMoodShuffleMode
            });
        } catch (e) {}
        
        // Set mood queue BEFORE calling onSelectSong to ensure state is ready
        if (setIsUsingMoodQueue && setMoodQueue && setMoodQueueIndex) {
            setIsUsingMoodQueue(true);
            
            // Always store the ORIGINAL mood songs order in the queue
            // handleNext will handle shuffle logic based on isMoodShuffleMode
            setMoodQueue(moodSongs);
            setMoodQueueIndex(selectedIndex >= 0 ? selectedIndex : 0);
            
            try {
                // eslint-disable-next-line no-console
                console.debug('🎵 MOOD PAGE: Mood queue activated', {
                    moodName,
                    moodQueueSize: moodSongs.length,
                    selectedIndex,
                    isMoodShuffleMode
                });
            } catch (e) {}
        }
        
        if (typeof onSelectSong === 'function') {
            // Play the song - App.jsx will handle finding it in global songs
            onSelectSong(songId, { queue: moodSongs, source: 'mood' });
        }
    }, [moodSongs, moodName, onSelectSong, setIsUsingMoodQueue, setMoodQueue, setMoodQueueIndex]);

    const handleNavigateToArtist = useCallback((artist) => {
        navigate(`/artist/${encodeURIComponent(artist)}`);
    }, [navigate]);

    const handleReport = useCallback((song) => {
        console.log('Report song:', song);
    }, []);

    const handleToggleShuffle = useCallback(() => {
        setIsMoodShuffleMode(prev => !prev);
    }, [setIsMoodShuffleMode]);

    useEffect(() => {
        let cancelled = false;
        const checkSaved = async () => {
            const token = outlet?.user?.token || (typeof localStorage !== 'undefined' ? JSON.parse(localStorage.getItem('user') || 'null')?.token : null);
            if (!token) {
                setIsSaved(false);
                return;
            }

            try {
                const existing = await getPlaylists(token);
                if (cancelled) return;
                const normalizedName = `${moodName} Mood Mix`.trim().toLowerCase();
                setIsSaved((existing || []).some((playlist) => String(playlist?.name || '').trim().toLowerCase() === normalizedName));
            } catch (error) {
                if (!cancelled) setIsSaved(false);
            }
        };

        checkSaved();
        return () => {
            cancelled = true;
        };
    }, [moodName, outlet]);

    const handleSaveMoodAsPlaylist = useCallback(async () => {
        const token = outlet?.user?.token || (typeof localStorage !== 'undefined' ? JSON.parse(localStorage.getItem('user') || 'null')?.token : null);

        if (!token) {
            alert('Please login to save playlists.');
            return;
        }

        if (!moodSongs.length) {
            alert('No songs available to save for this mood yet.');
            return;
        }

        try {
            const existing = await getPlaylists(token);
            const normalizedName = `${moodName} Mood Mix`.trim().toLowerCase();
            const existingPlaylist = (existing || []).find((playlist) => String(playlist?.name || '').trim().toLowerCase() === normalizedName);

            if (existingPlaylist) {
                const playlistId = existingPlaylist.id || existingPlaylist._id;
                if (playlistId) {
                    await deletePlaylist(playlistId, token);
                }
                setIsSaved(false);
                setMoodMenuOpen(false);
                return;
            }

            const created = await createPlaylist({
                name: `${moodName} Mood Mix`,
                description: `Auto-generated playlist for ${moodName}`,
                isPublic: false
            }, token);

            const playlistId = created?.id || created?._id;
            if (!playlistId) {
                throw new Error('Playlist was created but no ID was returned.');
            }

            for (const song of moodSongs) {
                if (!song?.id) continue;
                await addSongToPlaylist(playlistId, song.id, token);
            }

            setIsSaved(true);
            setMoodMenuOpen(false);
            navigate('/playlists');
        } catch (error) {
            console.error('Failed to save mood as playlist:', error);
            alert('Could not save this mood as a playlist. Please try again.');
        }
    }, [moodSongs, moodName, navigate, outlet]);

    useEffect(() => {
        if (searchOpen && searchInputRef.current) {
            try { searchInputRef.current.focus(); } catch {}
        }
    }, [searchOpen]);

    useEffect(() => {
        const handleScroll = () => {
            if (scrollContainerRef.current) {
                const scrollTop = scrollContainerRef.current.scrollTop;
                setIsHeaderExpanded(scrollTop < 50);
            }
        };

        const container = scrollContainerRef.current;
        if (container) {
            container.addEventListener('scroll', handleScroll);
            return () => container.removeEventListener('scroll', handleScroll);
        }
    }, []);

    const toggleSearch = useCallback(() => {
        setSearchOpen(v => {
            const next = !v;
            if (!next) setSearchTerm('');
            return next;
        });
    }, []);

    const getMoodImageUrl = (mood) => {
        const moodImageMap = {
            'Punjabi': '/moods/punjabi.jpg',
            'Traditional': '/moods/traditional.jpg',
            'Smooth': '/moods/smooth.jpg',
            'Party': '/moods/party.jpg',
            'Chill': '/moods/chill.jpg',
            'Hip Hop Mix': '/moods/hiphop.jpg',
            'Romantic': '/moods/romantic.jpg',
            'Soft & HeartBreak': '/moods/softheartbreak.jpg',
            'Old is Gold': '/moods/oldgold.jpg',
            'Hollywood Mix': '/moods/hollywood.jpg',
            'Spiritual / Bhakti': '/moods/bhakti.jpg'
        };
        return moodImageMap[mood] || '/moods/default.jpg';
    };

    return (
        <div className="flex-grow flex flex-col min-h-0 min-w-0">
            {/* Expandable Header */}
            <div className={`flex-shrink-0 transition-all duration-300 ${isHeaderExpanded ? 'bg-gray-900/80 p-6' : 'bg-gray-900/80 p-3'}`}>
                {/* Compact Header (always visible) */}
                <div className="flex items-center gap-3 mb-0">
                    <Link to="/" className="p-2 rounded-full bg-gray-900 hover:bg-gray-700 flex-shrink-0">
                        <ArrowLeft size={20} />
                    </Link>
                    {isHeaderExpanded ? (
                        <h1 className="flex-1"></h1>
                    ) : (
                        <h1 className="text-xl font-bold flex-1">{moodName}</h1>
                    )}
                    <div className="flex items-center gap-2">
                        {/* Search toggle button */}
                        {moodSongs.length > 0 && (
                            <button onClick={toggleSearch} className="p-2 rounded-full bg-gray-900 hover:bg-gray-700 flex-shrink-0">
                                {searchOpen ? <X size={18} /> : <Search size={18} />}
                            </button>
                        )}
                        {/* Shuffle toggle button */}
                        {moodSongs.length > 0 && (
                            <button 
                                onClick={handleToggleShuffle}
                                className={`p-2 rounded-full transition-all flex-shrink-0 ${
                                    isMoodShuffleMode 
                                        ? 'bg-blue-900 shadow-lg shadow-blue-500/50 animate-pulse' 
                                        : 'bg-gray-900 hover:bg-gray-500'
                                }`}
                                title={isMoodShuffleMode ? "Shuffle is on - songs will play randomly" : "Shuffle is off - click to turn on"}
                            >
                                <Shuffle size={20} className="text-white" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Expanded Header Content */}
                {isHeaderExpanded && moodSongs.length > 0 && (
                    <div className="mt-4 flex gap-4 items-end">
                        <ImageWithFallback
                            src={getMoodImageUrl(moodName)}
                            alt={moodName}
                            className="w-24 h-24 rounded-lg object-cover shadow-lg"
                            fallback={'https://placehold.co/400x400/1F2937/FFFFFF?text=Music'}
                        />
                        <div className="flex-1">
                            <h2 className="text-xl font-bold mb-3">{moodName}</h2>
                            <div className="flex items-center gap-5">
                                <button
                                    onClick={() => {
                                        if (moodSongs.length > 0) {
                                            handleSelectSong(moodSongs[0].id);
                                        }
                                    }}
                                    className="w-12 h-12 bg-blue-600 hover:bg-blue-700 rounded-full flex items-center justify-center shadow-lg transition-colors"
                                >
                                    <Play size={24} className="text-white fill-current" />
                                </button>
                                
                                {/* Mood Menu */}
                                <div className="relative">
                                    <button
                                        onClick={() => setMoodMenuOpen(!moodMenuOpen)}
                                        className="p-2 rounded-full bg-gray-800 hover:bg-gray-700 transition-colors"
                                    >
                                        <MoreVertical size={20} className="text-white" />
                                    </button>
                                    {moodMenuOpen && (
                                        <div className="absolute right-0 bottom-full mb-2 w-40 bg-gray-800 rounded-lg shadow-lg z-20">
                                            <button
                                                onClick={() => {
                                                    handleToggleShuffle();
                                                    setMoodMenuOpen(false);
                                                }}
                                                className="w-full text-left px-4 py-2 hover:bg-gray-700 rounded-t-lg flex items-center gap-2 text-white transition-colors"
                                            >
                                                <Shuffle size={16} />
                                                <span>Shuffle</span>
                                            </button>
                                            <button
                                                onClick={async () => {
                                                    await handleSaveMoodAsPlaylist();
                                                }}
                                                className="w-full text-left px-4 py-2 hover:bg-gray-700 flex items-center gap-2 text-white transition-colors"
                                            >
                                                <Bookmark size={16} className={isSaved ? 'fill-current text-blue-400' : ''} />
                                                <span>{isSaved ? 'Already Saved' : 'Save'}</span>
                                            </button>
                                            <button
                                                onClick={() => {
                                                    if (onAddToQueue && moodSongs.length > 0) {
                                                        onAddToQueue(moodSongs);
                                                    }
                                                    setMoodMenuOpen(false);
                                                }}
                                                className="w-full text-left px-4 py-2 hover:bg-gray-700 rounded-b-lg flex items-center gap-2 text-white transition-colors"
                                            >
                                                <Plus size={16} />
                                                <span>Add to Queue</span>
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Search bar shown when toggled */}
            {searchOpen && (
                <div className="flex-shrink-0 bg-gray-900/80 px-4 pb-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <input
                            ref={searchInputRef}
                            type="text"
                            placeholder={`Search within ${moodName} mood...`}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-gray-800/40 text-white rounded-full py-2 pl-10 pr-3 text-sm focus:outline-none focus:bg-gray-800"
                            autoComplete="off"
                        />
                        {searchTerm && (
                            <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white">
                                <X size={16} />
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Songs Grid/List */}
            <hr className='h-px bg-gray-500'/>
            <div ref={scrollContainerRef} className="flex-grow overflow-y-auto custom-scrollbar p-4 pb-24 md:pb-28">
                {filteredSongs.length > 0 ? (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-6 gap-2">
                            {filteredSongs.map((song) => {
                                const isActive = currentSongId === song.id && isPlaying;
                                return (
                                    <div 
                                        key={song.id} 
                                        role="button"
                                        tabIndex={0}
                                        onClick={() => handleSelectSong(song.id)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' || e.key === ' ') {
                                                e.preventDefault();
                                                handleSelectSong(song.id);
                                            }
                                        }}
                                        className={`group relative p-1 md:p-2 transition-colors cursor-pointer ${isActive ? 'bg-blue-900/30' : 'bg-gray-900/50 hover:bg-gray-700/80'}`}
                                    >
                                        <div className="relative md:mb-1 flex gap-3 md:flex-col md:gap-0 items-start min-w-0 w-full">
                                            <div onClick={() => handleSelectSong(song.id)} className="cursor-pointer flex-shrink-0 md:w-full">
                                                <ImageWithFallback
                                                    src={song.coverUrl}
                                                    alt={song.title}
                                                    className="w-10 h-10 md:w-full md:h-auto md:aspect-square rounded-md object-cover"
                                                    fallback={'https://placehold.co/400x400/1F2937/FFFFFF?text=Music'}
                                                />
                                            </div>
                                            <div className="flex-1 min-w-0 mt-1 overflow-hidden md:flex-grow-0 md:w-full md:pr-5">
                                                <h4 className={`text-sm font-semibold truncate overflow-hidden whitespace-nowrap text-ellipsis ${isActive ? 'text-blue-300' : 'text-white'}`}>
                                                    {song.title}
                                                </h4>
                                                <p className="text-xs text-gray-400 truncate overflow-hidden whitespace-nowrap text-ellipsis">
                                                    {Array.isArray(song.artist) ? song.artist.join(', ') : (song.artist || '')}
                                                </p>
                                            </div>
                                            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex-shrink-0 md:absolute md:right-2 md:bottom-2 md:top-auto md:translate-y-0 md:opacity-100 md:group-hover:opacity-100 md:transition-opacity md:z-10">
                                                <SongContextMenu
                                                    song={song}
                                                    onAddToQueue={onAddToQueue}
                                                    onAddToPlaylist={onAddToPlaylist}
                                                    onNavigateToArtist={handleNavigateToArtist}
                                                    onReport={handleReport}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        <Footer onDeveloperClick={() => {}} /> 
                    </>
                ) : (
                    <div className="text-center text-gray-400 py-10">
                        <p className="text-lg">No songs found for {moodName} mood.</p>
                        <p className="text-sm mt-2">Try uploading songs with this mood tag.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MoodPage;
