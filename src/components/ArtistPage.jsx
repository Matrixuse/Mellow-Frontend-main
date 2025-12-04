import React from 'react';
import { useParams, Link, useOutletContext } from 'react-router-dom';
import { ArrowLeft, Play } from 'lucide-react';
import ImageWithFallback from './ImageWithFallback';
import { Footer } from './OtherComponents';

const ArtistPage = () => {
    // Hum yahan 'useOutletContext' se saara data (props) le rahe hain
    const { allSongs, onSelectSong, currentSongId, isPlaying } = useOutletContext();
    // Params ko ab top level par call kiya gaya hai
    const { artistName: encodedArtistName } = useParams();
    const artistName = decodeURIComponent(encodedArtistName);
    
    if (!allSongs) {
        return <div className="text-center p-10">Loading artist songs...</div>;
    }

    // --- YAHAN HUMNE FILTER LOGIC THEEK KIYA HAI ---
    // Hum ab song.artist ko ek array ki tarah handle kar rahe hain
    const artistSongs = allSongs.filter(song => {
        if (!song.artist) return false; // Agar artist field hi nahi hai, toh filter out kar do

        const songArtists = Array.isArray(song.artist)
            ? song.artist
            : song.artist.split(',').map(artist => artist.trim());

        return songArtists.some(art => art.toLowerCase().includes(artistName.toLowerCase()));
    });

    return (
        <div className="flex-grow p-4 flex flex-col min-h-0 min-w-0">
            {/* Header jismein "Back" button aur Artist ka naam hoga */}
            <div className="flex items-center gap-4 mb-4 flex-shrink-0">
                <Link to="/" className="p-2 rounded-full bg-gray-800 hover:bg-gray-700">
                    <ArrowLeft size={24} />
                </Link>
                <h1 className="text-3xl font-bold">{artistName}</h1>
            </div>

            {/* Scrollable area jismein gaane aur footer honge */}
            <div className="flex-grow overflow-y-auto custom-scrollbar">
                {artistSongs.length > 0 ? (
                    <>
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-6 xl:grid-cols-6 gap-4">
                            {artistSongs.map((song) => (
                                <div 
                                    key={song.id} 
                                    onClick={() => onSelectSong(song.id)}
                                    className="group relative bg-gray-800/50 hover:bg-gray-700/80 p-3 rounded-lg cursor-pointer"
                                >
                                    <div className="relative mb-4">
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

