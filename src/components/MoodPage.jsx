import React from 'react';
import { useParams, Link, useOutletContext } from 'react-router-dom';
import { ArrowLeft, Play } from 'lucide-react';
import ImageWithFallback from './ImageWithFallback';
import { Footer } from './OtherComponents';

const MoodPage = () => {
    // Get data from outlet context safely (may be undefined when navigated directly)
    const outlet = useOutletContext() || {};
    const { allSongs, onSelectSong, currentSongId, isPlaying } = outlet;
    const { moodName: encodedMoodName } = useParams();
    const moodName = decodeURIComponent(encodedMoodName);
    
    if (!allSongs) {
        return <div className="text-center p-10">Loading mood songs...</div>;
    }

    // Filter songs based on mood (case-insensitive)
    const getMoodSongs = (mood) => {
        if (!mood) return allSongs || [];
        const normalizedMood = (mood || '').toLowerCase();
        
        return (allSongs || []).filter(song => {
            // First check if song has explicit mood tags
            if (song.moods && Array.isArray(song.moods) && song.moods.length > 0) {
                const lowerMoods = song.moods.map(m => String(m || '').toLowerCase());
                if (lowerMoods.includes(normalizedMood)) return true;
            }
            
            // Fallback to keyword matching for songs without mood tags
            const title = (song.title || '').toLowerCase();
            const artistField = song?.artist;
            const artistString = Array.isArray(artistField)
                ? artistField.join(', ').toLowerCase()
                : (artistField || '').toLowerCase();
            
            // Define keywords for each mood
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

    return (
        <div className="flex-grow p-4 flex flex-col min-h-0 min-w-0">
            {/* Header with back button and mood name */}
            <div className="flex items-center gap-3 mb-3 flex-shrink-0">
                <Link to="/" className="p-2 rounded-full bg-gray-800 hover:bg-gray-700">
                    <ArrowLeft size={24} />
                </Link>
                <h1 className="text-2xl font-bold">{moodName} Mood</h1>
            </div>

            {/* Scrollable area with songs */}
            <div className="flex-grow overflow-y-auto custom-scrollbar">
                {moodSongs.length > 0 ? (
                    <>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                            {moodSongs.map((song) => (
                                <div 
                                    key={song.id} 
                                    onClick={() => { if (typeof onSelectSong === 'function') { onSelectSong(song.id); } else { console.warn('onSelectSong not available in MoodPage'); } }}
                                    className="group relative bg-gray-800/50 hover:bg-gray-700/80 p-2 rounded-lg cursor-pointer"
                                >
                                    <div className="relative mb-4">
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
