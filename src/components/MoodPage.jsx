import React, { useCallback, useState } from 'react';
import { useParams, Link, useOutletContext, useNavigate } from 'react-router-dom';
import { ArrowLeft, Play, Shuffle } from 'lucide-react';
import ImageWithFallback from './ImageWithFallback';
import SongContextMenu from './SongContextMenu';
import { Footer } from './OtherComponents';

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
            
            const title = (song.title || '').toLowerCase();
            const artistField = song?.artist;
            const artistString = Array.isArray(artistField)
                ? artistField.join(', ').toLowerCase()
                : (artistField || '').toLowerCase();
            
            const moodKeywords = {
                'Punjabi': ['punjabi', 'bhangra', 'gurdas', 'diljit', 'ammy', 'sidhu', 'shubh', 'guru', 'baadshah', 'honey singh'],
                'Traditional': ['classical', 'traditional', 'lata', 'rafi', 'kishore', 'mukesh', 'bhajan', 'devotional', 'carnatic', 'hindustani'],
                'Smooth': ['romantic', 'smooth', 'soft', 'melodious', 'arijit', 'atif', 'mohit', 'sonu', 'udit', 'love'],
                'Party': ['party', 'dance', 'energetic', 'upbeat', 'club', 'remix', 'electronic', 'bollywood', 'item', 'peppy'],
                'Chill': ['chill', 'relaxing', 'ambient', 'indie', 'acoustic', 'folk', 'peaceful', 'calm', 'mellow', 'soft'],
                'Hip Hop Mix': ['hip hop', 'rap', 'trap', 'urban', 'street', 'gangsta', 'freestyle', 'beat', 'rhyme', 'flow'],
                'Romantic': ['romantic', 'love', 'couple', 'valentine', 'wedding', 'proposal', 'intimate', 'passionate', 'sweet', 'tender'],
                'Soft & HeartBreak': ['sad', 'emotional', 'melancholy', 'heartbreak', 'depressing', 'tearful', 'gloomy', 'sorrowful', 'soft', 'gentle']
            };
            
            const keywords = moodKeywords[mood] || moodKeywords[Object.keys(moodKeywords).find(k => k.toLowerCase() === normalizedMood)] || [];
            return keywords.some(keyword => 
                title.includes(keyword.toLowerCase()) || 
                artistString.includes(keyword.toLowerCase())
            );
        });
    };

    const moodSongs = getMoodSongs(moodName);

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
            onSelectSong(songId);
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

    return (
        <div className="flex-grow p-4 flex flex-col min-h-0 min-w-0">
            <div className="flex items-center gap-3 mb-3 flex-shrink-0">
                <Link to="/" className="p-2 rounded-full bg-gray-800 hover:bg-gray-700">
                    <ArrowLeft size={24} />
                </Link>
                <h1 className="text-2xl font-bold flex-1">{moodName} Mood</h1>
                {/* Shuffle toggle button in top right */}
                {moodSongs.length > 0 && (
                    <button 
                        onClick={handleToggleShuffle}
                        className={`p-2 rounded-full transition-all ${
                            isMoodShuffleMode 
                                ? 'bg-blue-600 shadow-lg shadow-blue-500/50 animate-pulse' 
                                : 'bg-gray-600 hover:bg-gray-500'
                        }`}
                        title={isMoodShuffleMode ? "Shuffle is on - songs will play randomly" : "Shuffle is off - click to turn on"}
                    >
                        <Shuffle size={24} className="text-white" />
                    </button>
                )}
            </div>

            <div className="flex-grow overflow-y-auto custom-scrollbar">
                {moodSongs.length > 0 ? (
                    <>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                            {moodSongs.map((song) => (
                                <div 
                                    key={song.id} 
                                    className="group relative bg-gray-800/50 hover:bg-gray-700/80 p-2 rounded-lg cursor-pointer"
                                >
                                    <div className="relative mb-4">
                                        <div onClick={() => handleSelectSong(song.id)} className="cursor-pointer">
                                            <ImageWithFallback
                                                src={song.coverUrl}
                                                alt={song.title}
                                                className="w-full h-auto aspect-square rounded-md object-cover"
                                                fallback={'https://placehold.co/400x400/1F2937/FFFFFF?text=Music'}
                                            />
                                            <div className={`absolute bottom-2 right-2 w-9 h-9 bg-blue-600 rounded-full flex items-center justify-center shadow-lg ${currentSongId === song.id && isPlaying ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                                                <Play size={18} className="text-white fill-current" />
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
                                    <h4 className="text-sm font-semibold text-white truncate">{song.title}</h4>
                                    <p className="text-xs text-gray-400 truncate">{Array.isArray(song.artist) ? song.artist.join(', ') : (song.artist || '')}</p>
                                </div>
                            ))}
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
