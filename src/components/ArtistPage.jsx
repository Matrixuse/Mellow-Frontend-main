import React, { useCallback, useState } from 'react';
import { useParams, Link, useOutletContext, useNavigate } from 'react-router-dom';
import { ArrowLeft, Play, Shuffle } from 'lucide-react';
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
    
    const { artistName: encodedArtistName } = useParams();
    const artistName = decodeURIComponent(encodedArtistName);
    
    if (!allSongs) {
        return <div className="text-center p-10">Loading artist songs...</div>;
    }

    const artistSongs = allSongs.filter(song => {
        if (!song.artist) return false;

        const songArtists = Array.isArray(song.artist)
            ? song.artist
            : song.artist.split(',').map(artist => artist.trim());

        return songArtists.some(art => art.toLowerCase().includes(artistName.toLowerCase()));
    });

    const handleSelectSong = useCallback((songId) => {
        if (setIsUsingArtistQueue && setArtistQueue && setArtistQueueIndex) {
            setIsUsingArtistQueue(true);
            
            // Always store the ORIGINAL artist songs order in the queue
            // handleNext will handle shuffle logic based on isArtistShuffleMode
            const selectedIndex = artistSongs.findIndex(s => String(s.id) === String(songId));
            setArtistQueue(artistSongs);
            setArtistQueueIndex(selectedIndex >= 0 ? selectedIndex : 0);
        }
        
        if (typeof onSelectSong === 'function') {
            onSelectSong(songId);
        }
    }, [artistSongs, onSelectSong, setIsUsingArtistQueue, setArtistQueue, setArtistQueueIndex]);

    const handleNavigateToArtist = useCallback((artist) => {
        navigate(`/artist/${encodeURIComponent(artist)}`);
    }, [navigate]);

    const handleReport = useCallback((song) => {
        console.log('Report song:', song);
    }, []);

    const handleToggleShuffle = useCallback(() => {
        setIsArtistShuffleMode(prev => !prev);
    }, [setIsArtistShuffleMode]);

    return (
        <div className="flex-grow p-4 flex flex-col min-h-0 min-w-0">
            <div className="flex items-center gap-4 mb-4 flex-shrink-0">
                <Link to="/" className="p-2 rounded-full bg-gray-800 hover:bg-gray-700">
                    <ArrowLeft size={24} />
                </Link>
                <h1 className="text-3xl font-bold flex-1">{artistName}</h1>
                {/* Shuffle toggle button in top right */}
                {artistSongs.length > 0 && (
                    <button 
                        onClick={handleToggleShuffle}
                        className={`p-2 rounded-full transition-all ${
                            isArtistShuffleMode 
                                ? 'bg-blue-600 shadow-lg shadow-blue-500/50 animate-pulse' 
                                : 'bg-gray-600 hover:bg-gray-500'
                        }`}
                        title={isArtistShuffleMode ? "Shuffle is on - songs will play randomly" : "Shuffle is off - click to turn on"}
                    >
                        <Shuffle size={24} className="text-white" />
                    </button>
                )}
            </div>

            <div className="flex-grow overflow-y-auto custom-scrollbar">
                {artistSongs.length > 0 ? (
                    <>
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-6 xl:grid-cols-6 gap-4">
                            {artistSongs.map((song) => (
                                <div 
                                    key={song.id} 
                                    className="group relative bg-gray-800/50 hover:bg-gray-700/80 p-3 rounded-lg cursor-pointer"
                                >
                                    <div className="relative mb-4">
                                        <div onClick={() => handleSelectSong(song.id)} className="cursor-pointer">
                                            <ImageWithFallback
                                                src={song.coverUrl}
                                                alt={song.title}
                                                className="w-full h-auto aspect-square rounded-md object-cover"
                                                fallback={'https://placehold.co/400x400/1F2937/FFFFFF?text=Music'}
                                            />
                                            <div className={`absolute bottom-2 right-2 w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center shadow-lg ${currentSongId === song.id && isPlaying ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                                                <Play size={20} className="text-white fill-current" />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="absolute bottom-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                        <SongContextMenu
                                            song={song}
                                            onAddToQueue={onAddToQueue}
                                            onAddToPlaylist={onAddToPlaylist}
                                            onNavigateToArtist={handleNavigateToArtist}
                                            onReport={handleReport}
                                        />
                                    </div>
                                    <h4 className="text-xs font-semibold text-white truncate">{song.title}</h4>
                                    <p className="text-xs text-gray-400 truncate">{Array.isArray(song.artist) ? song.artist.join(', ') : (song.artist || '')}</p>
                                </div>
                            ))}
                        </div>
                        <Footer onDeveloperClick={() => {}} /> 
                    </>
                ) : (
                    <p className="text-center text-gray-400 mt-10">No songs found for this artist.</p>
                )}
            </div>
        </div>
    );
};

export default ArtistPage;

