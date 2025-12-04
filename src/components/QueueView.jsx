import React from 'react';
import { X, Play, Trash2, Music, GripVertical } from 'lucide-react';
import ImageWithFallback from './ImageWithFallback';

const QueueView = ({ queue, currentSongId, isPlaying, onPlaySong, onRemoveFromQueue, onClose }) => {
    const handleDragStart = (e, index) => {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/html', e.target.outerHTML);
        e.target.style.opacity = '0.5';
    };

    const handleDragEnd = (e) => {
        e.target.style.opacity = '1';
    };

    return (
        <div className="relative w-full max-w-2xl max-h-[80vh] bg-gray-800 rounded-lg shadow-2xl border border-gray-700">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-700">
                <h2 className="text-2xl font-bold text-white">Queue</h2>
                <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-white p-2 rounded-full hover:bg-gray-700"
                >
                    <X size={24} />
                </button>
            </div>

            {/* Queue Content */}
            <div className="p-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
                {queue.length === 0 ? (
                    <div className="text-center py-16">
                        <Music size={64} className="mx-auto mb-4 text-gray-600" />
                        <h3 className="text-xl font-semibold mb-2">Queue is Empty</h3>
                        <p className="text-gray-400">Add some songs to start playing!</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {queue.map((song, index) => (
                            <div
                                key={`${song.id}-${index}`}
                                draggable
                                onDragStart={(e) => handleDragStart(e, index)}
                                onDragEnd={handleDragEnd}
                                className={`group flex items-center gap-4 p-3 rounded-lg hover:bg-gray-700/50 transition-colors cursor-pointer ${
                                    currentSongId === song.id ? 'bg-blue-900/30' : ''
                                }`}
                                onClick={() => onPlaySong(song.id)}
                            >
                                {/* Drag Handle */}
                                <div className="text-gray-600 hover:text-gray-400 cursor-move">
                                    <GripVertical size={16} />
                                </div>

                                {/* Song Number */}
                                <div className="w-8 text-center text-sm text-gray-400 font-mono">
                                    {index + 1}
                                </div>

                                {/* Cover Image */}
                                <ImageWithFallback src={song.coverUrl} alt={song.title} className="w-12 h-12 rounded-md object-cover" fallback={'https://placehold.co/200x200/1F2937/FFFFFF?text=Music'} />

                                {/* Song Info */}
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-medium text-white truncate">
                                        {song.title}
                                    </h4>
                                    <p className="text-sm text-gray-400 truncate">
                                        {Array.isArray(song.artist) ? song.artist.join(', ') : song.artist}
                                    </p>
                                </div>

                                {/* Play Indicator */}
                                {currentSongId === song.id && isPlaying && (
                                    <div className="text-blue-400">
                                        <Play size={16} />
                                    </div>
                                )}

                                {/* Remove Button */}
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onRemoveFromQueue(song.id);
                                    }}
                                    className="p-2 rounded-full hover:bg-gray-600 opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-300"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Footer */}
            {queue.length > 0 && (
                <div className="p-6 border-t border-gray-700">
                    <div className="flex items-center justify-between text-sm text-gray-400">
                        <span>{queue.length} song{queue.length !== 1 ? 's' : ''} in queue</span>
                        <span>Total duration: --:--</span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default QueueView;
