
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

    const toggleSearch = () => {

        setSearchOpen(prev => {

            const next = !prev;

            if (!next) setSearchTerm('');

            return next;

        });

    };

    return (

        <div className="flex-grow flex flex-col min-h-0">

            {/* HERO HEADER */}

            <div className="relative w-full h-[130rem] md:h-[340px] overflow-hidden">

                <ImageWithFallback
                    src={artistCandidates}
                    alt={artistName}
                    className="absolute inset-0 w-full h-full object-cover"
                />

                {/* TOP BUTTONS */}

                <div className="absolute top-4 left-4 right-4 flex justify-between z-10">

                    <Link
                        to="/"
                        className="p-2 rounded-full bg-black/0 backdrop-blur hover:bg-black/0"
                    >
                        <ArrowLeft size={20} className="text-white"/>
                    </Link>

                    {/* Right side: either icons or expanded search input */}
                    {searchOpen ? (
                        <div className="flex items-center gap-3 w-full ml-4">
                            <div className="flex-1">
                                <div className="relative">
                                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
                                    <input
                                        ref={searchInputRef}
                                        type="text"
                                        placeholder={`Search ${artistName}`}
                                        value={searchTerm}
                                        onChange={e => setSearchTerm(e.target.value)}
                                        className="w-full bg-black/80 text-white rounded-full py-1 pl-8 pr-10 focus:outline-none"
                                    />
                                    {searchTerm && (
                                        <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-white"><X size={14} /></button>
                                    )}
                                </div>
                            </div>

                            <button onClick={toggleSearch} className="p-2 rounded-full bg-black/40 hover:bg-black/60">
                                <X size={18} />
                            </button>

                            <button
                                onClick={handleToggleShuffle}
                                className={`p-2 rounded-full ${
                                    isArtistShuffleMode ? 'bg-blue-600' : 'bg-black/40 hover:bg-black/60'
                                }`}
                            >
                                <Shuffle size={20} />
                            </button>
                            <button onClick={toggleFollow} className={`ml-2 px-3 py-1.5 rounded-full text-sm font-semibold transition-colors ${following ? 'bg-white text-black' : 'bg-blue-600 text-white'}`}>
                                {following ? 'Following' : 'Follow'}
                            </button>
                        </div>
                    ) : (
                        <div className="flex gap-3">
                            <button
                                onClick={toggleSearch}
                                className="p-2 rounded-full bg-black/40 backdrop-blur hover:bg-black/60"
                            >
                                <Search size={20} />
                            </button>

                            <button
                                onClick={handleToggleShuffle}
                                className={`p-2 rounded-full ${
                                    isArtistShuffleMode ? 'bg-blue-600' : 'bg-black/40 hover:bg-black/60'
                                }`}
                            >
                                <Shuffle size={20} />
                            </button>
                        </div>
                    )}

                </div>

                {/* ARTIST NAME + FOLLOW BUTTON */}

                <div className="absolute bottom-6 left-6 z-10">
                    <div className="flex items-center gap-4">
                            <h1 className={`text-3xl md:text-3xl lg:text-6xl font-extrabold text-white drop-shadow-lg truncate`}>{artistName}</h1>
                            <div className="ml-4">
                                <button onClick={toggleFollow} className={`px-3 py-1 rounded-full text-sm font-semibold transition-colors ${following ? 'bg-black text-white' : 'bg-blue-600 text-white'}`}>
                                    {following ? 'Following' : 'Follow'}
                                </button>
                            </div>
                    </div>
                </div>

            </div>

            {/* search input is now rendered inline in the hero top area when opened */}

            {/* SONG GRID */}

            <div className="flex-grow overflow-y-auto p-4">

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
