import React from 'react';
import { X, Play, Pause, SkipForward, SkipBack } from 'lucide-react';

const RelatedModal = ({ isOpen, onClose, currentSong, isPlaying, onPlayPause, onNext, onPrev, relatedSongs = [] }) => {
    if (!isOpen) return null;

    const songs = Array.isArray(relatedSongs) ? relatedSongs : [];

    return (
        <div className="fixed inset-0 bg-black/40 md:hidden z-50 animate-in fade-in duration-300">
            <div className="fixed inset-0 top-0 bg-gradient-to-b from-gray-900 to-gray-950 z-50 flex flex-col slide-in-from-bottom duration-300 rounded-t-3xl max-h-screen">
                {/* Mini Player Bar at Top */}
                <div className="bg-gradient-to-b from-gray-800 to-gray-900 border-b border-gray-700 p-3 flex items-center justify-between flex-shrink-0">
                    <button onClick={onClose} className="p-2 hover:bg-gray-700 rounded-full">
                        <X size={20} className="text-white" />
                    </button>
                    <div className="flex-1 text-center">
                        <h3 className="text-xs font-bold text-white uppercase">RELATED</h3>
                    </div>
                    <div className="w-10" />
                </div>

                {/* Current Song Mini Display */}
                {currentSong && (
                    <div className="bg-gray-800/50 px-3 py-2 border-b border-gray-700 flex items-center gap-2 flex-shrink-0">
                        <img 
                            src={currentSong.coverUrl} 
                            alt={currentSong.title} 
                            className="w-12 h-12 rounded object-cover flex-shrink-0"
                            onError={(e) => { e.target.onerror = null; e.target.src='https://placehold.co/200x200/1F2937/FFFFFF?text=Music'; }}
                        />
                        <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold text-white truncate">{currentSong.title}</div>
                            <div className="text-xs text-gray-400 truncate">{Array.isArray(currentSong.artist) ? currentSong.artist.join(', ') : (currentSong.artist || '')}</div>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                            <button onClick={onPrev} className="p-1 hover:bg-gray-700 rounded-full text-gray-300">
                                <SkipBack size={16} />
                            </button>
                            <button onClick={onPlayPause} className="p-1 bg-blue-600 hover:bg-blue-500 rounded-full text-white">
                                {isPlaying ? <Pause size={16} /> : <Play size={16} />}
                            </button>
                            <button onClick={onNext} className="p-1 hover:bg-gray-700 rounded-full text-gray-300">
                                <SkipForward size={16} />
                            </button>
                        </div>
                    </div>
                )}

                {/* Related Songs List */}
                <div className="flex-1 overflow-y-auto custom-scrollbar px-3 py-4">
                    {songs.length > 0 ? (
                        <div className="space-y-2">
                            <h4 className="text-xs font-bold text-gray-400 uppercase mb-3">Related songs</h4>
                            {songs.map((song, index) => (
                                <div key={`${song.id}-${index}`} className="flex items-center gap-2 p-2 rounded hover:bg-gray-700/30 transition-colors">
                                    <img 
                                        src={song.coverUrl} 
                                        alt={song.title} 
                                        className="w-10 h-10 rounded object-cover flex-shrink-0"
                                        onError={(e) => { e.target.onerror = null; e.target.src='https://placehold.co/200x200/1F2937/FFFFFF?text=Music'; }}
                                    />
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm font-medium text-white truncate">{song.title}</div>
                                        <div className="text-xs text-gray-400 truncate">{Array.isArray(song.artist) ? song.artist.join(', ') : (song.artist || '')}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex items-center justify-center h-32">
                            <p className="text-gray-400 text-sm">No related songs found</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default RelatedModal;
