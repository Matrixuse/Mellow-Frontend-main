import React from 'react';
import { Play, Trash2, X } from 'lucide-react';
import ImageWithFallback from './ImageWithFallback';

const QueuePanel = ({ queue, onClose, onPlaySongAtIndex, onRemove }) => {
    return (
        <div className="fixed right-4 top-20 w-80 bg-gray-900 border border-gray-700 rounded-lg shadow-2xl z-50 p-4">
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold">Queue</h3>
                <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={18} /></button>
            </div>
            {queue && queue.length > 0 ? (
                <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                    {queue.map((song, idx) => (
                        <div key={song.id || idx} draggable onDragStart={(e) => { e.dataTransfer.setData('text/plain', String(idx)); }} onDragOver={(e) => { e.preventDefault(); }} onDrop={(e) => { e.preventDefault(); const from = Number(e.dataTransfer.getData('text/plain')); const to = idx; if (!Number.isNaN(from)) onReorder && onReorder(from, to); }} className="flex items-center gap-3">
                            <ImageWithFallback src={song.coverUrl} alt={song.title} className="w-12 h-12 rounded-md object-cover" fallback={'https://placehold.co/200x200/1F2937/FFFFFF?text=Music'} />
                            <div className="flex-1">
                                <div className="text-sm font-semibold truncate">{song.title}</div>
                                <div className="text-xs text-gray-400 truncate">{Array.isArray(song.artist) ? song.artist.join(', ') : (song.artist || '')}</div>
                            </div>
                            <div className="flex-shrink-0 flex items-center gap-2">
                                <button onClick={() => onPlaySongAtIndex(idx)} className="p-2 rounded-full bg-blue-600 hover:bg-blue-500 text-white"><Play size={14} /></button>
                                <button onClick={() => onRemove(song.id)} className="p-2 rounded-full bg-transparent hover:bg-gray-800 text-gray-400"><Trash2 size={14} /></button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <p className="text-sm text-gray-400">Queue is empty</p>
            )}
        </div>
    );
};

export default QueuePanel;
