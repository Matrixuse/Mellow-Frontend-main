
import React, { useCallback, useState, useRef, useEffect } from 'react';
import { useParams, Link, useOutletContext, useNavigate } from 'react-router-dom';
import { ArrowLeft, Play, Shuffle, Search, X } from 'lucide-react';
import ImageWithFallback from './ImageWithFallback';
import SongContextMenu from './SongContextMenu';
import { Footer } from './OtherComponents';

const ArtistPage = () => {

    const navigate = useNavigate();
    const context = useOutletContext() || {};

    const {
        allSongs,
        onSelectSong,
        currentSongId,
        isPlaying,
        setIsUsingArtistQueue,
        setArtistQueue,
        setArtistQueueIndex,
        onAddToQueue,
        onAddToPlaylist,
        isArtistShuffleMode,
        setIsArtistShuffleMode
    } = context;

    const [searchOpen, setSearchOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const searchInputRef = useRef(null);
    const scrollContainerRef = useRef(null);
    const [isHeaderExpanded, setIsHeaderExpanded] = useState(true);
    const [following, setFollowing] = useState(false);

    const { artistName: encodedArtistName } = useParams();
    const artistName = decodeURIComponent(encodedArtistName);

    if (!allSongs) {
        return <div className="text-center p-10">Loading artist songs...</div>;
    }

    const artistSongs = allSongs.filter(song => {

        if (!song.artist) return false;

        const songArtists = Array.isArray(song.artist)
            ? song.artist
            : song.artist.split(',').map(a => a.trim());

        return songArtists.some(art =>
            art.toLowerCase().includes(artistName.toLowerCase())
        );

    });

    const filteredSongs =
        searchTerm.trim().length > 0
            ? artistSongs.filter(song => {

                const q = searchTerm.toLowerCase();

                const title = (song.title || '').toLowerCase();

                const artistString = Array.isArray(song.artist)
                    ? song.artist.join(', ').toLowerCase()
                    : (song.artist || '').toLowerCase();

                return title.includes(q) || artistString.includes(q);

            })
            : artistSongs;

    const slug = artistName
        ? artistName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '')
        : 'artist';

    const artistFallback =
        artistSongs.length > 0
            ? artistSongs[0].coverUrl
            : 'https://placehold.co/400x400/1F2937/FFFFFF?text=Artist';

    // Prefer public artist images. Also try the first name variant (many files use first-name.png)
    const firstName = artistName ? String(artistName).split(' ')[0].toLowerCase().replace(/[^a-z0-9]/g, '') : '';
    const artistCandidates = [
        `/artists/${slug}.png`,
        `/artists/${slug}.jpg`,
    ];
    if (firstName && firstName !== slug) {
        artistCandidates.push(`/artists/${firstName}.png`, `/artists/${firstName}.jpg`);
    }
    // finally fall back to the first song cover or placeholder
    artistCandidates.push(artistFallback);

    // load follow state for this artist from localStorage
    useEffect(() => {
        try {
            const v = localStorage.getItem(`follow_${slug}`);
            setFollowing(v === '1');
        } catch (e) {}
    }, [slug]);

    const toggleFollow = () => {
        setFollowing(prev => {
            const next = !prev;
            try { localStorage.setItem(`follow_${slug}`, next ? '1' : '0'); } catch (e) {}
            return next;
        });
    };

    const handleSelectSong = useCallback((songId) => {

        if (setIsUsingArtistQueue && setArtistQueue && setArtistQueueIndex) {

            setIsUsingArtistQueue(true);

            const index = artistSongs.findIndex(
                s => String(s.id) === String(songId)
            );

            setArtistQueue(artistSongs);
            setArtistQueueIndex(index >= 0 ? index : 0);

        }

        if (typeof onSelectSong === 'function') {
            onSelectSong(songId);
        }

    }, [artistSongs, onSelectSong]);

    const handleNavigateToArtist = useCallback((artist) => {
        navigate(`/artist/${encodeURIComponent(artist)}`);
    }, [navigate]);

    const handleToggleShuffle = () => {
        setIsArtistShuffleMode(prev => !prev);
    };

    useEffect(() => {
        if (searchOpen && searchInputRef.current) {
            searchInputRef.current.focus();
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

    const toggleSearch = () => {

        setSearchOpen(prev => {

            const next = !prev;

            if (!next) setSearchTerm('');

            return next;

        });

    };

    return (

        <div className="flex-grow flex flex-col min-h-0 min-w-0">
            <div className={`flex-shrink-0 transition-all duration-300 ${isHeaderExpanded ? 'bg-gray-900/80 p-6' : 'bg-gray-900/80 p-3'}`}>
                <div className="flex items-center gap-3 mb-0">
                    <Link to="/" className="p-2 rounded-full bg-gray-900 hover:bg-gray-700 flex-shrink-0">
                        <ArrowLeft size={20} />
                    </Link>
                    {isHeaderExpanded ? (
                        <h1 className="flex-1"></h1>
                    ) : (
                        <h1 className="text-xl font-bold flex-1">{artistName}</h1>
                    )}
                    <div className="flex items-center gap-2">
                        {artistSongs.length > 0 && (
                            <button onClick={toggleSearch} className="p-2 rounded-full bg-gray-900 hover:bg-gray-700 flex-shrink-0">
                                {searchOpen ? <X size={18} /> : <Search size={18} />}
                            </button>
                        )}
                        {artistSongs.length > 0 && (
                            <button
                                onClick={handleToggleShuffle}
                                className={`p-2 rounded-full transition-all flex-shrink-0 ${
                                    isArtistShuffleMode ? 'bg-blue-900 shadow-lg shadow-blue-500/50 animate-pulse' : 'bg-gray-900 hover:bg-gray-500'
                                }`}
                                title={isArtistShuffleMode ? 'Shuffle is on - songs will play randomly' : 'Shuffle is off - click to turn on'}
                            >
                                <Shuffle size={20} className="text-white" />
                            </button>
                        )}
                    </div>
                </div>

                {isHeaderExpanded && artistSongs.length > 0 && (
                    <div className="mt-4 flex gap-4 items-end">
                        <ImageWithFallback
                            src={artistCandidates}
                            alt={artistName}
                            className="w-24 h-24 rounded-lg object-cover shadow-lg"
                            fallback={'https://placehold.co/400x400/1F2937/FFFFFF?text=Artist'}
                        />
                        <div className="flex-1">
                            <h2 className="text-xl font-bold mb-3">{artistName}</h2>
                            <div className="flex items-center gap-5">
                                <button
                                    onClick={() => {
                                        if (artistSongs.length > 0) {
                                            handleSelectSong(artistSongs[0].id);
                                        }
                                    }}
                                    className="w-12 h-12 bg-blue-600 hover:bg-blue-700 rounded-full flex items-center justify-center shadow-lg transition-colors"
                                >
                                    <Play size={24} className="text-white fill-current" />
                                </button>
                                <button
                                    onClick={toggleFollow}
                                    className={`px-3 py-1.5 rounded-full text-sm font-semibold transition-colors ${following ? 'bg-white text-black' : 'bg-blue-600 text-white'}`}
                                >
                                    {following ? 'Following' : 'Follow'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {searchOpen && (
                <div className="flex-shrink-0 bg-gray-900/80 px-4 pb-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <input
                            ref={searchInputRef}
                            type="text"
                            placeholder={`Search ${artistName} songs...`}
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
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

            <hr className='h-px bg-gray-500'/>

            <div ref={scrollContainerRef} className="flex-grow overflow-y-auto custom-scrollbar p-4 pb-24 md:pb-28">

                {filteredSongs.length > 0 ? (

                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">

                        {filteredSongs.map(song => {

                            const isActive =
                                currentSongId === song.id && isPlaying;

                            return (

                                <div
                                    key={song.id}
                                    className={`group relative p-3 rounded-lg cursor-pointer ${
                                        isActive
                                            ? 'bg-blue-900/30'
                                            : 'bg-gray-800/50 hover:bg-gray-700/80'
                                    }`}
                                >

                                    <div className="relative mb-3">

                                        <div onClick={() => handleSelectSong(song.id)}>

                                            <ImageWithFallback
                                                src={song.coverUrl}
                                                alt={song.title}
                                                className="w-full aspect-square rounded-md object-cover"
                                            />

                                            <div
                                                className={`absolute bottom-2 right-2 w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center ${
                                                    isActive
                                                        ? 'opacity-100'
                                                        : 'opacity-0 group-hover:opacity-100'
                                                }`}
                                            >
                                                <Play
                                                    size={18}
                                                    className="text-white fill-current"
                                                />
                                            </div>

                                        </div>

                                    </div>

                                    <div className="absolute bottom-0 right-0 opacity-0 group-hover:opacity-100">

                                        <SongContextMenu
                                            song={song}
                                            onAddToQueue={onAddToQueue}
                                            onAddToPlaylist={onAddToPlaylist}
                                            onNavigateToArtist={handleNavigateToArtist}
                                        />

                                    </div>

                                    <h4 className="text-xs font-semibold text-white truncate">
                                        {song.title}
                                    </h4>

                                    <p className="text-xs text-gray-400 truncate">
                                        {Array.isArray(song.artist)
                                            ? song.artist.join(', ')
                                            : song.artist}
                                    </p>

                                </div>

                            );

                        })}

                    </div>

                ) : (

                    <p className="text-center text-gray-400 mt-10">
                        No songs found
                    </p>

                )}

                <Footer onDeveloperClick={() => {}}/>

            </div>

        </div>

    );

};

export default ArtistPage;
